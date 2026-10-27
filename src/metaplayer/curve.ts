// path: src/metaplayer/curve.ts

import {MetaPlayerAudienceDisplay, MetaPlayerAudienceOptions, MetaPlayerLabels} from "../types/metaPlayer";
import {clamp, curveAt, curvePath, formatTime} from "./math";

/**
 * Width of the drawing box. The SVG is stretched over the progress bar
 * (`preserveAspectRatio="none"`), so the box is a coordinate system, not a
 * size in pixels.
 */
const VIEW_WIDTH = 1000;

/**
 * The audience curve drawn over the progress bar: which parts of the media
 * were watched most.
 *
 * It opens while the bar is hovered or touched (`peek`), or stays there
 * (`always`). Under the pointer it reads the timecode and **how many times
 * that slice was played** — a number of views, never a percentage.
 *
 * The figures are handed to the player — they come from the REST API, which
 * runs on a server, never in a browser. {@link audienceBuckets} turns the
 * per-second counts of the engagement report into the array drawn here.
 */
export class AudienceCurve {
    private readonly svg: SVGSVGElement;
    private readonly path: SVGPathElement;
    private readonly cursor: HTMLElement;
    private readonly tooltip: HTMLElement | null;
    private readonly empty: HTMLElement;

    private curve: number[] = [];
    private readonly height: number;
    private readonly always: boolean;

    constructor(
        private readonly root: HTMLElement,
        private readonly prefix: string,
        private readonly labels: MetaPlayerLabels,
        private readonly options: MetaPlayerAudienceOptions,
        private readonly showHours: boolean = false,
        private readonly locale?: string
    ) {
        this.height = options.height ?? 40;
        this.always = (options.display ?? MetaPlayerAudienceDisplay.Peek) === MetaPlayerAudienceDisplay.Always;

        root.classList.add(this.always ? 'is-always' : 'is-peek');
        root.style.height = `${this.height}px`;
        root.setAttribute('aria-hidden', 'true');

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', `${prefix}-curve`);
        this.svg.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} ${this.height}`);
        this.svg.setAttribute('preserveAspectRatio', 'none');
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute('class', `${prefix}-curve-path`);
        this.svg.appendChild(this.path);

        this.empty = document.createElement('span');
        this.empty.className = `${prefix}-curve-empty`;
        this.empty.textContent = labels.noAudience ?? 'Audience curve not available yet';

        this.cursor = document.createElement('span');
        this.cursor.className = `${prefix}-curve-cursor`;
        this.cursor.hidden = true;

        this.tooltip = (options.tooltip ?? true) ? document.createElement('span') : null;
        if (this.tooltip) {
            this.tooltip.className = `${prefix}-curve-tooltip`;
            this.tooltip.hidden = true;
        }

        root.append(this.svg, this.empty, this.cursor);
        if (this.tooltip) root.appendChild(this.tooltip);
        root.hidden = !this.always;
        this.setCurve(options.curve ?? []);
    }

    /**
     * Replaces the figures and redraws.
     */
    setCurve(curve: number[]): void {
        this.curve = Array.isArray(curve) ? curve.filter(value => Number.isFinite(value)) : [];
        const drawn = this.curve.length > 0;
        this.path.setAttribute(
            'd',
            drawn
                ? curvePath(this.curve, VIEW_WIDTH, this.height, this.options.smoothing ?? 0.6, this.options.peak)
                : ''
        );
        this.svg.style.display = drawn ? '' : 'none';
        // With nothing to draw, the panel says so rather than opening empty —
        // a curve arrives only once the media has been watched.
        this.empty.hidden = drawn;
        this.root.classList.toggle('is-empty', !drawn);
    }

    getCurve(): number[] {
        return this.curve;
    }

    /**
     * Whether there is anything to show, so the panel can be left out of the
     * layout altogether.
     */
    hasCurve(): boolean {
        return this.curve.length > 0;
    }

    /**
     * The pointer moved over the progress bar: `ratio` is where it sits, 0 to
     * 1, and `seconds` the position it stands for. `null` closes the panel.
     */
    hover(ratio: number | null, seconds: number): void {
        if (ratio === null) {
            this.root.hidden = !this.always;
            this.cursor.hidden = true;
            if (this.tooltip) this.tooltip.hidden = true;
            return;
        }
        this.root.hidden = false;
        this.cursor.hidden = false;
        this.cursor.style.left = `${ratio * 100}%`;
        if (!this.tooltip) return;

        const views = curveAt(this.curve, ratio);
        const parts = [formatTime(seconds, this.showHours)];
        if (views !== null) parts.push(this.formatViews(views));
        this.tooltip.textContent = parts.join(' · ');
        this.tooltip.hidden = false;
        // The tooltip stays inside the bar at both ends
        this.tooltip.style.left = `${clamp(ratio, 0.06, 0.94) * 100}%`;
    }

    /**
     * `1 240 vues`. The count is grouped in the player's locale, and the word
     * comes from the labels, singular or plural.
     */
    private formatViews(views: number): string {
        const count = views.toLocaleString(this.locale);
        const word = views === 1
            ? (this.labels.view ?? 'view')
            : (this.labels.views ?? 'views');
        return `${count} ${word}`;
    }

    destroy(): void {
        this.root.remove();
    }
}
