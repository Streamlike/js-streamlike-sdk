// path: src/metaplayer/zoom.ts

import {MetaPlayerZoomOptions, MetaPlayerZoomState} from "../types/metaPlayer";
import {clampPan, maxZoom, zoomAround} from "./math";

/**
 * Below this, a press is a click (play / pause), not a drag.
 */
const DRAG_THRESHOLD_PX = 5;
const TAP_MAX_MS = 300;
const DOUBLE_TAP_MS = 350;

/**
 * Zoom and pan inside the picture.
 *
 * The transparent overlay laid over the iframe is the only way to catch wheel,
 * drag and touch: a cross-origin iframe swallows them otherwise. The player's
 * own interface is off, so the overlay blocks nothing, and the controls sit
 * outside the zoomed element and never move.
 *
 * Mouse and fingers alike, through pointer events: one pointer pans, two
 * pinch, the wheel zooms around the cursor. A tap plays or pauses, a double
 * tap or a double click goes back to the whole picture.
 */
export class ZoomController {
    onChange: (state: MetaPlayerZoomState) => void = () => undefined;

    private state: MetaPlayerZoomState = {scale: 1, tx: 0, ty: 0};
    private readonly pointers = new Map<number, {x: number; y: number}>();
    private panFrom: {x: number; y: number; state: MetaPlayerZoomState} | null = null;
    private pinchFrom: {distance: number; state: MetaPlayerZoomState} | null = null;
    private pressedAt = 0;
    private moved = false;
    private lastTapAt = 0;
    private readonly off: (() => void)[] = [];

    constructor(
        private readonly frame: HTMLElement,
        private readonly overlay: HTMLElement,
        private readonly options: MetaPlayerZoomOptions,
        private readonly togglePlay: () => void
    ) {
        if (options.wheel ?? true) this.on('wheel', e => this.wheel(e as WheelEvent), {passive: false});
        this.on('pointerdown', e => this.down(e as PointerEvent));
        this.on('pointermove', e => this.move(e as PointerEvent));
        this.on('pointerup', e => this.up(e as PointerEvent));
        this.on('pointercancel', e => this.up(e as PointerEvent, true));
        if (options.doubleClickResets ?? true) {
            this.on('dblclick', e => {
                e.preventDefault();
                this.reset();
            });
        }
    }

    getState(): MetaPlayerZoomState {
        return this.state;
    }

    destroy(): void {
        this.off.forEach(off => off());
    }

    reset(): void {
        this.apply({scale: 1, tx: 0, ty: 0});
    }

    /**
     * Buttons and the controller: zoom around the centre of the picture.
     */
    zoomBy(factor: number): void {
        this.apply(zoomAround(this.state, 0, 0, this.state.scale * factor, this.max()));
    }

    /**
     * A framing set from the code — a saved one, or a layer item being
     * followed.
     */
    setState(state: Partial<MetaPlayerZoomState>): void {
        this.apply({
            scale: Math.max(1, state.scale ?? this.state.scale),
            tx: state.tx ?? this.state.tx,
            ty: state.ty ?? this.state.ty
        });
    }

    /**
     * Re-applies the bounds after the picture was resized, so a zoomed picture
     * does not come back off-centre.
     */
    refresh(): void {
        this.apply(this.state);
    }

    private on(type: string, handler: (e: Event) => void, options?: AddEventListenerOptions): void {
        this.overlay.addEventListener(type, handler, options);
        this.off.push(() => this.overlay.removeEventListener(type, handler, options));
    }

    private max(): number {
        return maxZoom(
            this.frame.getBoundingClientRect().height,
            this.options.streamHeight ?? 1080,
            this.options.maxOversample ?? 3
        );
    }

    private apply(state: MetaPlayerZoomState): void {
        const box = this.frame.getBoundingClientRect();
        this.state = clampPan(state, box.width, box.height);
        this.onChange(this.state);
    }

    /**
     * A point of the screen, counted from the centre of the frame.
     */
    private local(x: number, y: number): {px: number; py: number} {
        const box = this.frame.getBoundingClientRect();
        return {px: x - box.left - box.width / 2, py: y - box.top - box.height / 2};
    }

    private wheel(e: WheelEvent): void {
        e.preventDefault();
        const {px, py} = this.local(e.clientX, e.clientY);
        this.apply(zoomAround(this.state, px, py, this.state.scale * Math.exp(-e.deltaY * 0.0015), this.max()));
    }

    private down(e: PointerEvent): void {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        this.overlay.setPointerCapture?.(e.pointerId);
        this.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
        if (this.pointers.size === 1) {
            this.panFrom = {x: e.clientX, y: e.clientY, state: this.state};
            this.pressedAt = Date.now();
            this.moved = false;
        } else if (this.pointers.size === 2 && (this.options.pinch ?? true)) {
            const [a, b] = [...this.pointers.values()];
            this.pinchFrom = {distance: Math.hypot(b.x - a.x, b.y - a.y), state: this.state};
            this.panFrom = null;
            this.moved = true; // two fingers are never a tap
        }
    }

    private move(e: PointerEvent): void {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
        if (this.pinchFrom && this.pointers.size === 2) {
            const [a, b] = [...this.pointers.values()];
            const {px, py} = this.local((a.x + b.x) / 2, (a.y + b.y) / 2);
            const ratio = Math.hypot(b.x - a.x, b.y - a.y) / (this.pinchFrom.distance || 1);
            this.apply(zoomAround(this.pinchFrom.state, px, py, this.pinchFrom.state.scale * ratio, this.max()));
            return;
        }
        if (!this.panFrom) return;
        const dx = e.clientX - this.panFrom.x;
        const dy = e.clientY - this.panFrom.y;
        if (!this.moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD_PX) return;
        if (!this.moved) this.overlay.classList.add('is-panning');
        this.moved = true;
        this.apply({
            scale: this.panFrom.state.scale,
            tx: this.panFrom.state.tx + dx,
            ty: this.panFrom.state.ty + dy
        });
    }

    private up(e: PointerEvent, cancelled: boolean = false): void {
        if (!this.pointers.delete(e.pointerId)) return;
        this.overlay.releasePointerCapture?.(e.pointerId);
        if (this.pointers.size === 1) {
            // From a pinch back to one finger: it pans from where it is
            const [rest] = [...this.pointers.values()];
            this.pinchFrom = null;
            this.panFrom = {x: rest.x, y: rest.y, state: this.state};
            return;
        }
        if (this.pointers.size > 0) return;
        this.overlay.classList.remove('is-panning');
        const tap = !cancelled
            && !this.moved
            && Date.now() - this.pressedAt < TAP_MAX_MS * (e.pointerType === 'mouse' ? 3 : 1);
        this.panFrom = null;
        this.pinchFrom = null;
        if (!tap || !(this.options.clickTogglesPlay ?? true)) return;

        // Touch: a second tap soon after goes back to the whole picture, since
        // a finger has no double click of its own
        const now = Date.now();
        if (e.pointerType !== 'mouse' && (this.options.doubleClickResets ?? true) && now - this.lastTapAt < DOUBLE_TAP_MS) {
            this.lastTapAt = 0;
            this.reset();
            return;
        }
        this.lastTapAt = now;
        this.togglePlay();
    }
}
