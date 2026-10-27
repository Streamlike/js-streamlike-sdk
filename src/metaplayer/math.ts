// path: src/metaplayer/math.ts

import {MetaPlayerLayerCluster, MetaPlayerLayerItem, MetaPlayerZoomState} from "../types/metaPlayer";

/**
 * The arithmetic of the meta player, kept free of the DOM so every part of it
 * can be used — and checked — on its own.
 */

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/* ---------------- Time ---------------- */

/**
 * `mm:ss`, or `hh:mm:ss` past an hour or when `hours` is set.
 */
export function formatTime(seconds: number, hours: boolean = false): string {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return h > 0 || hours ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * `1:23.40`: a moment to the hundredth, for image-by-image work.
 */
export function formatPreciseTime(seconds: number, hours: boolean = false): string {
    const hundredths = Math.floor((Math.max(0, seconds) % 1) * 100);
    return `${formatTime(seconds, hours)}.${String(hundredths).padStart(2, '0')}`;
}

/**
 * Seconds from a number or from `hh:mm:ss.mmm`, and shorter spellings of it.
 * `0` for anything unreadable.
 */
export function parseTimecode(value?: number | string | null): number {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
    if (!value) return 0;
    const parts = String(value).trim().split(':').map(part => Number(part));
    if (parts.some(part => !Number.isFinite(part))) return 0;
    const seconds = parts.reduce((total, part) => total * 60 + part, 0);
    return seconds > 0 ? seconds : 0;
}

/* ---------------- Jog wheel ---------------- */

/**
 * Seconds of media per pixel of gesture, fitted to the duration — a 30 s clip
 * and a two-hour match are not browsed at the same pace — then held between
 * two bounds.
 */
export function secPerPx(
    duration: number,
    fine: boolean,
    min: number,
    max: number,
    pace: number,
    fineFactor: number
): number {
    const base = clamp((duration || 300) / (pace || 6000), min, max);
    return fine ? base * fineFactor : base;
}

/**
 * The momentum after `dt` seconds: exponential decay, so the wheel coasts the
 * same way whatever the frame rate.
 */
export function decay(velocity: number, dt: number, tau: number): number {
    return velocity * Math.exp(-dt / tau);
}

/* ---------------- Speed ---------------- */

/**
 * 21 notches: ten slower, normal, ten faster. Browsers usually mute the sound
 * below 0.25× and above 4×, which is their decision, not the player's.
 */
export const DEFAULT_SPEEDS = [
    0.1, 0.2, 0.25, 0.33, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
    1,
    1.1, 1.2, 1.3, 1.5, 1.75, 2, 2.5, 3, 4, 8
];

/**
 * The notch of `speeds` closest to a speed.
 */
export function nearestSpeedIndex(speeds: number[], speed: number): number {
    let best = 0;
    for (let i = 1; i < speeds.length; i++) {
        if (Math.abs(speeds[i] - speed) < Math.abs(speeds[best] - speed)) best = i;
    }
    return best;
}

/**
 * `0,50×`, `1,00×` — in the locale given.
 */
export function formatSpeed(speed: number, locale?: string, decimals: number = 2): string {
    return `${speed.toLocaleString(locale, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}×`;
}

/* ---------------- Progress reported by the player ---------------- */

/**
 * After a seek the player still announces its former position for a moment.
 */
export const STALE_PROGRESS_MS = 600;
export const STALE_PROGRESS_TOLERANCE_S = 1.2;

/**
 * Whether a position reported by the player may be trusted.
 *
 * During a gesture the local position is the truth. Just after a seek, and
 * before the first playback — where the player may ignore the seek and report
 * 0 — only a report close to the local position is believed.
 */
export function acceptsProgress(
    reported: number,
    local: number,
    msSinceSeek: number,
    gesture: boolean,
    started: boolean
): boolean {
    if (gesture) return false;
    if (!started || msSinceSeek < STALE_PROGRESS_MS) {
        return Math.abs(reported - local) < STALE_PROGRESS_TOLERANCE_S;
    }
    return true;
}

/* ---------------- Zoom ---------------- */

/**
 * How far the picture may be enlarged: up to `oversample` times the
 * definition of the stream, not of its size on screen.
 */
export function maxZoom(displayHeight: number, streamHeight: number = 1080, oversample: number = 3): number {
    return Math.max(oversample, (streamHeight / (displayHeight || streamHeight)) * oversample);
}

/**
 * The picture never leaves its frame: the translation is bounded by the zoom.
 */
export function clampPan(state: MetaPlayerZoomState, width: number, height: number): MetaPlayerZoomState {
    const maxX = Math.max(0, (width * state.scale - width) / 2);
    const maxY = Math.max(0, (height * state.scale - height) / 2);
    return {scale: state.scale, tx: clamp(state.tx, -maxX, maxX), ty: clamp(state.ty, -maxY, maxY)};
}

/**
 * Zoom around a point of the frame (`px`, `py` from its centre), which stays
 * put under the cursor or the fingers.
 */
export function zoomAround(
    from: MetaPlayerZoomState,
    px: number,
    py: number,
    wanted: number,
    max: number
): MetaPlayerZoomState {
    const scale = clamp(wanted, 1, max);
    return {
        scale,
        tx: px - (px - from.tx) * (scale / from.scale),
        ty: py - (py - from.ty) * (scale / from.scale)
    };
}

/* ---------------- Layers ---------------- */

/**
 * The time window of an item: an instant lasts `activeWindow` seconds, a
 * range lasts what it says. `null` when the item carries no time at all.
 */
export function itemWindow(item: MetaPlayerLayerItem, activeWindow: number): [number, number] | null {
    if (typeof item.from === 'number') {
        return [item.from, typeof item.to === 'number' ? Math.max(item.from, item.to) : item.from + activeWindow];
    }
    if (typeof item.at === 'number') return [item.at, item.at + activeWindow];
    if (typeof item.to === 'number') return [item.to, item.to + activeWindow];
    return null;
}

/**
 * The moment an item is placed at: the start of its window.
 */
export function itemTime(item: MetaPlayerLayerItem): number | null {
    const window = itemWindow(item, 0);
    return window ? window[0] : null;
}

/**
 * Groups the items too close to be told apart at the width shown. Greedy over
 * the sorted list: an item joins the current group when it sits less than
 * `minGapPx` from the one before.
 */
export function clusterItems(
    items: MetaPlayerLayerItem[],
    duration: number,
    widthPx: number,
    minGapPx: number = 12
): MetaPlayerLayerCluster[] {
    if (duration <= 0 || widthPx <= 0) return [];
    const timed = items
        .map(item => ({item, time: itemTime(item)}))
        .filter((entry): entry is {item: MetaPlayerLayerItem; time: number} => entry.time !== null)
        .sort((a, b) => a.time - b.time);

    const groups: {positions: number[]; items: MetaPlayerLayerItem[]}[] = [];
    for (const {item, time} of timed) {
        const position = clamp(time / duration, 0, 1);
        const last = groups[groups.length - 1];
        if (last && minGapPx > 0 && (position - last.positions[last.positions.length - 1]) * widthPx < minGapPx) {
            last.positions.push(position);
            last.items.push(item);
        } else {
            groups.push({positions: [position], items: [item]});
        }
    }
    return groups.map(({positions, items: group}) => ({
        position: positions.reduce((sum, p) => sum + p, 0) / positions.length,
        items: group
    }));
}

/**
 * The items whose window holds that position — the ones "playing" now.
 */
export function activeItems(
    items: MetaPlayerLayerItem[],
    time: number,
    activeWindow: number = 3
): MetaPlayerLayerItem[] {
    return items.filter(item => {
        const window = itemWindow(item, activeWindow);
        return window !== null && time >= window[0] && time < window[1];
    });
}

/* ---------------- Audience curve ---------------- */

/**
 * The SVG path of an audience curve: one point per slice, in a `width` ×
 * `height` box, closed along the bottom so it can be filled.
 *
 * The values are **playback counts**, not percentages: the curve is scaled
 * against its own busiest slice, so the shape shows where the views are while
 * the figures stay what they are — a number of views. `peak` overrides that
 * scale, to draw several medias against a common one.
 *
 * `smoothing` rounds the corners with a Catmull-Rom spline written as cubic
 * Bézier segments: 0 draws the straight segments between the points, 1 the
 * roundest reading of the same points.
 */
export function curvePath(
    curve: number[],
    width: number,
    height: number,
    smoothing: number = 0,
    peak?: number
): string {
    if (curve.length === 0) return '';
    const round = (value: number) => Math.round(value * 10) / 10;
    const top = peak && peak > 0 ? peak : Math.max(...curve, 0);
    // A curve with nothing in it lies flat on the floor rather than dividing by zero
    const y = (value: number) => round(top > 0 ? height - (clamp(value, 0, top) / top) * height : height);
    const step = curve.length > 1 ? width / (curve.length - 1) : width;
    const points = curve.map((value, i) => ({x: round(i * step), y: y(value)}));
    if (points.length === 1) points.push({x: round(width), y: points[0].y});

    let path = `M0,${round(height)} L${points[0].x},${points[0].y}`;
    const tension = clamp(smoothing, 0, 1) / 6;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] ?? points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;
        if (tension === 0) {
            path += ` L${p2.x},${p2.y}`;
            continue;
        }
        const c1 = {x: round(p1.x + (p2.x - p0.x) * tension), y: round(p1.y + (p2.y - p0.y) * tension)};
        const c2 = {x: round(p2.x - (p3.x - p1.x) * tension), y: round(p2.y - (p3.y - p1.y) * tension)};
        path += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
    }
    return `${path} L${round(width)},${round(height)} Z`;
}

/**
 * The audience at a point of the progress bar: **how many times that slice was
 * played**, or `null` without a curve. Never a percentage — a share of the
 * busiest moment says nothing a viewer can act on, where "watched 1 240 times"
 * does.
 */
export function curveAt(curve: number[], ratio: number): number | null {
    if (curve.length === 0) return null;
    const index = Math.round(clamp(ratio, 0, 1) * (curve.length - 1));
    const value = curve[index];
    return Number.isFinite(value) ? Math.round(Math.max(0, value)) : null;
}

/**
 * Turns the per-second playback counts of
 * `GET /analytics/engagement/{media_id}/qualities/{from}/{to}` — read on your
 * server, where the API key belongs — into the curve the meta player draws:
 * `buckets` slices of the duration, each **the mean number of playbacks of its
 * seconds**, rounded.
 *
 * The values stay playback counts. They are deliberately not scaled to a
 * percentage: the height of the curve already shows where the views are, and a
 * figure a viewer reads has to be a number of views, not a share of the busiest
 * moment of that one media.
 *
 * The report sends one entry per second actually played (`{"12": 4}`: second
 * 12 was played four times); an unreached second is simply absent, which is
 * why the duration is needed to know how long the media really is. Empty when
 * nobody watched.
 *
 * ```ts
 * // your backend answered with data.__all__ of the engagement report
 * const curve = audienceBuckets(report.data.__all__, media.metadata.global.duration);
 * ```
 */
export function audienceBuckets(
    seconds: Record<string | number, unknown>,
    duration?: number | null,
    buckets: number = 100
): number[] {
    const plays = new Map<number, number>();
    for (const [second, count] of Object.entries(seconds ?? {})) {
        const at = Number(second);
        const played = Number(count);
        if (Number.isInteger(at) && at >= 0 && Number.isFinite(played) && played > 0) plays.set(at, played);
    }
    if (plays.size === 0) return [];

    const length = Math.max(Math.floor(duration ?? 0), Math.max(...plays.keys()) + 1);
    const slices = Math.max(1, Math.min(buckets, length));
    const sums = new Array(slices).fill(0);
    const widths = new Array(slices).fill(0);
    for (let second = 0; second < length; second++) {
        const index = Math.min(slices - 1, Math.floor((second * slices) / length));
        sums[index] += plays.get(second) ?? 0;
        widths[index] += 1;
    }
    return sums.map((sum, index) => (widths[index] > 0 ? Math.round(sum / widths[index]) : 0));
}

/* ---------------- Player URL ---------------- */

/**
 * The player URL for the meta player: Streamlike's own interface off — the bar
 * drives it —, events on, and the full definition, since zooming into a
 * stream capped at a low bitrate shows nothing. Everything else of the URL,
 * its token included, is kept.
 */
export function metaPlayerUrl(url: string): string {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://cdn.streamlike.com');
    const forced: Record<string, string> = {interface: '0', controls: '0', play_button: '0', events: '1'};
    for (const [key, value] of Object.entries(forced)) parsed.searchParams.set(key, value);
    parsed.searchParams.delete('inline_throttling');
    return parsed.toString();
}
