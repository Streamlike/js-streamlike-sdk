// path: src/metaplayer/jog.ts

import {MetaPlayerJogOptions, MetaPlayerLabels} from "../types/metaPlayer";
import {clamp, decay, formatPreciseTime, formatTime, secPerPx} from "./math";

const READOUT_HIDE_DELAY_MS = 900;

/**
 * What the jog wheel needs from the player: reading and moving the position,
 * without knowing anything about the transport.
 */
export interface JogTarget {
    getTime: () => number;
    /**
     * Duration in seconds, or 0 when unknown — the upper bound is then lifted.
     */
    getDuration: () => number;
    /**
     * Moves the position shown and asks the player for the matching seek.
     */
    moveTo: (time: number) => void;
    /**
     * End of the gesture (let go, or the momentum died): final position.
     */
    onEnd: () => void;
}

/**
 * The jog wheel: a notched cylinder turned with a finger, a drag or the mouse
 * wheel, which scrolls the media and keeps its momentum when let go, slowing
 * down. Holding the fine key scrolls finer.
 *
 * While it turns, its own position is the truth — the positions the player
 * reports come back a frame late — so the player is told where to go and its
 * reports are ignored until the gesture ends.
 */
export class JogWheel {
    private readonly ticks: HTMLElement;
    private readonly readout: HTMLElement | null;
    private readonly options: Required<Omit<MetaPlayerJogOptions, 'fineKey'>> & {fineKey: string | false};

    private fine = false;
    private offsetPx = 0;
    private velocity = 0;
    private dragging = false;
    private raf: number | null = null;
    private lastFrame = 0;
    private startTime = 0;
    /**
     * The wheel's own position while it turns.
     */
    private time = 0;
    private lastX = 0;
    private samples: {t: number; x: number}[] = [];
    private hideTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly off: (() => void)[] = [];

    constructor(
        private readonly element: HTMLElement,
        private readonly target: JogTarget,
        options: MetaPlayerJogOptions,
        private readonly showHours: boolean = false
    ) {
        this.options = {
            minSecPerPx: options.minSecPerPx ?? 0.03,
            maxSecPerPx: options.maxSecPerPx ?? 0.35,
            pace: options.pace ?? 6000,
            fineFactor: options.fineFactor ?? 0.2,
            fineKey: options.fineKey === undefined ? 'Shift' : options.fineKey,
            inertia: options.inertia ?? 0.55,
            inertiaStop: options.inertiaStop ?? 0.08,
            maxVelocity: options.maxVelocity ?? 240,
            wheelPxPerNotch: options.wheelPxPerNotch ?? 40,
            readout: options.readout ?? true,
            preciseReadout: options.preciseReadout ?? true,
            directions: options.directions ?? true
        };

        this.ticks = element.querySelector('[data-jog-ticks]') as HTMLElement;
        this.readout = element.querySelector('[data-jog-readout]');

        this.on(element, 'pointerdown', e => this.down(e as PointerEvent));
        this.on(element, 'pointermove', e => this.move(e as PointerEvent));
        this.on(element, 'pointerup', e => this.release(e as PointerEvent));
        this.on(element, 'pointercancel', e => this.release(e as PointerEvent));
        this.on(element, 'wheel', e => this.wheel(e as WheelEvent), {passive: false});

        const fineKey = this.options.fineKey;
        if (fineKey) {
            const down = (e: KeyboardEvent) => {
                if (e.key === fineKey) this.fine = true;
            };
            const up = (e: KeyboardEvent) => {
                if (e.key === fineKey) this.fine = false;
            };
            this.on(window, 'keydown', down as EventListener);
            this.on(window, 'keyup', up as EventListener);
        }
        this.paint();
    }

    /**
     * Whether a gesture or its momentum is going on, so the reports of the
     * player must be left alone.
     */
    isActive(): boolean {
        return this.dragging || this.raf !== null;
    }

    /**
     * A step from the keyboard or a button: the same rendering as a gesture,
     * without the momentum.
     */
    step(seconds: number): void {
        this.stopInertia();
        this.time = this.target.getTime();
        this.startTime = this.time;
        this.rotate(seconds / this.secPerPx());
        this.advance(seconds);
        this.showReadout();
        this.scheduleHide();
        this.target.onEnd();
    }

    destroy(): void {
        this.stopInertia();
        if (this.hideTimer !== null) clearTimeout(this.hideTimer);
        this.off.forEach(off => off());
    }

    private on(
        node: EventTarget,
        type: string,
        handler: EventListener,
        options?: AddEventListenerOptions
    ): void {
        node.addEventListener(type, handler, options);
        this.off.push(() => node.removeEventListener(type, handler, options));
    }

    private secPerPx(): number {
        const {minSecPerPx, maxSecPerPx, pace, fineFactor} = this.options;
        return secPerPx(this.target.getDuration(), this.fine, minSecPerPx, maxSecPerPx, pace, fineFactor);
    }

    private down(e: PointerEvent): void {
        e.preventDefault();
        this.element.setPointerCapture?.(e.pointerId);
        this.stopInertia(); // a press during the momentum stops it dead
        this.dragging = true;
        this.lastX = e.clientX;
        this.time = this.target.getTime();
        this.startTime = this.time;
        this.samples = [{t: performance.now(), x: e.clientX}];
        this.showReadout();
        this.element.focus({preventScroll: true});
    }

    private move(e: PointerEvent): void {
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX;
        this.lastX = e.clientX;
        this.rotate(dx);
        this.advance(dx * this.secPerPx());
        this.showReadout();

        const now = performance.now();
        this.samples.push({t: now, x: e.clientX});
        // Only the last part of the gesture gives the momentum
        while (this.samples.length > 2 && now - this.samples[0].t > 120) this.samples.shift();
    }

    private release(e: PointerEvent): void {
        if (!this.dragging) return;
        this.dragging = false;
        try {
            this.element.releasePointerCapture?.(e.pointerId);
        } catch {
            // already released
        }
        const now = performance.now();
        const first = this.samples[0];
        const elapsed = first ? (now - first.t) / 1000 : 0;
        const idle = !first || now - this.samples[this.samples.length - 1].t > 120;
        if (elapsed <= 0 || idle) {
            this.end();
            return;
        }
        this.startInertia(((e.clientX - first.x) / elapsed) * this.secPerPx());
    }

    /**
     * A notch of the mouse wheel turns a fixed step and adds momentum, so
     * notches in a row speed up.
     */
    private wheel(e: WheelEvent): void {
        e.preventDefault();
        const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!raw) return;
        const notches = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? raw : raw / 100;
        const dx = clamp(notches, -3, 3) * this.options.wheelPxPerNotch;
        const dTime = dx * this.secPerPx();
        if (!this.isActive()) {
            this.time = this.target.getTime();
            this.startTime = this.time;
        }
        this.rotate(dx);
        this.advance(dTime);
        this.showReadout();
        const injected = this.velocity + dTime * 3;
        this.stopInertia();
        this.startInertia(injected);
    }

    private startInertia(velocity: number): void {
        const {maxVelocity, inertiaStop} = this.options;
        this.velocity = clamp(velocity, -maxVelocity, maxVelocity);
        if (Math.abs(this.velocity) < inertiaStop) {
            this.end();
            return;
        }
        this.lastFrame = performance.now();
        this.raf = requestAnimationFrame(now => this.inertiaStep(now));
    }

    private inertiaStep(now: number): void {
        const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
        this.lastFrame = now;
        this.velocity = decay(this.velocity, dt, this.options.inertia);
        if (Math.abs(this.velocity) < this.options.inertiaStop) {
            this.end();
            return;
        }
        const dTime = this.velocity * dt;
        this.rotate(dTime / this.secPerPx());
        const free = this.advance(dTime);
        this.showReadout();
        if (!free) {
            this.end();
            return;
        }
        this.raf = requestAnimationFrame(t => this.inertiaStep(t));
    }

    private stopInertia(): void {
        if (this.raf !== null) cancelAnimationFrame(this.raf);
        this.raf = null;
        this.velocity = 0;
    }

    private end(): void {
        this.stopInertia();
        this.hideReadout();
        this.target.onEnd();
    }

    /**
     * `dt` seconds further; false when it hits the start or the end, which
     * cuts the momentum.
     */
    private advance(dt: number): boolean {
        const wanted = this.time + dt;
        const next = clamp(wanted, 0, this.target.getDuration() || Number.POSITIVE_INFINITY);
        this.time = next;
        this.target.moveTo(next);
        return next === wanted;
    }

    private rotate(px: number): void {
        this.offsetPx += px;
        this.paint();
    }

    private paint(): void {
        if (this.ticks) this.ticks.style.backgroundPosition = `${this.offsetPx}px 0, ${this.offsetPx}px 0`;
    }

    private showReadout(): void {
        if (!this.readout || !this.options.readout) return;
        const delta = this.time - this.startTime;
        const position = this.options.preciseReadout
            ? formatPreciseTime(this.time, this.showHours)
            : formatTime(this.time, this.showHours);
        const sign = delta > 0 ? '+' : '−';
        this.readout.textContent = Math.abs(delta) < 0.5
            ? position
            : `${position}  ${sign}${formatTime(Math.abs(delta), this.showHours)}`;
        this.readout.classList.add('is-visible');
    }

    private hideReadout(): void {
        this.readout?.classList.remove('is-visible');
    }

    private scheduleHide(): void {
        if (this.hideTimer !== null) clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => this.hideReadout(), READOUT_HIDE_DELAY_MS);
    }
}

/**
 * The markup of the wheel. The ticks layer is what scrolls; the shade and the
 * cursor give it the look of a cylinder seen from the front.
 */
export function jogMarkup(prefix: string, labels: MetaPlayerLabels, options: MetaPlayerJogOptions): string {
    const directions = (options.directions ?? true)
        ? `<span class="${prefix}-jog-direction ${prefix}-jog-direction-back" aria-hidden="true">◂ ${labels.backward ?? 'backward'}</span>
<span class="${prefix}-jog-direction ${prefix}-jog-direction-forward" aria-hidden="true">${labels.forward ?? 'forward'} ▸</span>`
        : '';
    const readout = (options.readout ?? true)
        ? `<div class="${prefix}-jog-readout" data-jog-readout aria-hidden="true"></div>`
        : '';
    return `<div class="${prefix}-jog-ticks" data-jog-ticks></div>
<div class="${prefix}-jog-shade"></div>
<div class="${prefix}-jog-cursor"></div>
${directions}
${readout}`;
}
