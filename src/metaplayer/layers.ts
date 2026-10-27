// path: src/metaplayer/layers.ts

import {
    LayerRender,
    LayerShape,
    MetaPlayerLabels,
    MetaPlayerLayer,
    MetaPlayerLayerCluster,
    MetaPlayerLayerItem,
    MetaPlayerZoomState
} from "../types/metaPlayer";
import {activeItems, clamp, clusterItems, formatTime, itemTime, itemWindow} from "./math";

const HIGHLIGHT_MS = 2500;
/**
 * Lanes drawn under the progress bar. Past three the bar stops being readable.
 */
const MAX_TIMELINE_LANES = 3;
/**
 * Width of the gutter holding a lane's icon, in pixels. The track starts past
 * it, so what is clustered — and where the preview points — is measured on the
 * track, not on the whole row. Mirrors `--sl-meta-lane-gutter` in the sheet.
 */
const LANE_GUTTER_PX = 22;
const DEFAULT_ACTIVE_WINDOW_S = 3;
const DEFAULT_PREVIEW_MAX_ITEMS = 4;

/**
 * What the layers need from the player.
 */
export interface LayerHost {
    getDuration: () => number;
    seek: (seconds: number) => void;
    onSelect: (items: MetaPlayerLayerItem[], layer: MetaPlayerLayer) => void;
}

interface LayerState {
    layer: MetaPlayerLayer;
    items: MetaPlayerLayerItem[];
    /** Row of the timeline, or null when the layer does not draw there */
    timelineRow: HTMLElement | null;
    /** Plane of the stage, or null when the layer does not draw there */
    stagePlane: HTMLElement | null;
    markers: {element: HTMLElement; items: MetaPlayerLayerItem[]}[];
    shapes: {element: HTMLElement; item: MetaPlayerLayerItem; fixedSize: boolean; centred: boolean}[];
    /** Ids of the items whose shape is showing, to touch only what changes */
    showing: Set<string>;
    /** Ids of the items whose marker is lit, likewise */
    active: Set<string>;
}

/**
 * The layers of the meta player: the timeline rows under the progress bar, and
 * the shapes drawn inside the picture.
 *
 * A layer is a set of items, each placed in time (`at`, or `from` / `to`) and
 * optionally in the picture (`x`, `y`, and `w` / `h` for a box). What a layer
 * means — comments, tags, chapters, events — is the integration's business:
 * here they are drawn, clustered when too close, lit when current, and handed
 * back when clicked.
 *
 * The stage follows the zoom: its plane carries the same transform as the
 * picture, so a box framing something in the image stays on it when zooming
 * in, while a pin keeps its size on screen (`scaleWithPicture`).
 */
export class LayerSet {
    private states: LayerState[] = [];
    private preview: HTMLElement | null = null;
    private width = 0;
    private time = 0;
    private zoom: MetaPlayerZoomState = {scale: 1, tx: 0, ty: 0};
    private highlightTimer: ReturnType<typeof setTimeout> | null = null;
    private observer: ResizeObserver | null = null;

    constructor(
        private readonly prefix: string,
        private readonly timelineRoot: HTMLElement | null,
        private readonly stageRoot: HTMLElement | null,
        private readonly labels: MetaPlayerLabels,
        private readonly host: LayerHost,
        private readonly showHours: boolean = false
    ) {
        if (this.timelineRoot) {
            this.preview = document.createElement('div');
            this.preview.className = `${prefix}-preview`;
            this.preview.setAttribute('aria-hidden', 'true');
            this.preview.hidden = true;
            this.timelineRoot.appendChild(this.preview);
            this.timelineRoot.addEventListener('mouseleave', () => this.hidePreview());

            this.width = this.timelineRoot.getBoundingClientRect().width;
            if (typeof ResizeObserver !== 'undefined') {
                this.observer = new ResizeObserver(() => {
                    const width = this.timelineRoot!.getBoundingClientRect().width;
                    // Only the width changes what is clustered
                    if (Math.abs(width - this.width) < 1) return;
                    this.width = width;
                    this.renderTimeline();
                });
                this.observer.observe(this.timelineRoot);
            }
        }
    }

    /** The width the markers really have, past the icon gutter. */
    private trackWidth(): number {
        return Math.max(0, this.width - LANE_GUTTER_PX);
    }

    /**
     * A position on a track, as a fraction of the whole row, so the preview
     * points at the marker rather than at where it would sit without a gutter.
     */
    private rowFraction(position: number): number {
        if (this.width <= 0) return position;
        return (LANE_GUTTER_PX + position * this.trackWidth()) / this.width;
    }

    getLayers(): MetaPlayerLayer[] {
        return this.states.map(state => state.layer);
    }

    /**
     * Replaces the whole set of layers.
     */
    setLayers(layers: MetaPlayerLayer[]): void {
        this.states.forEach(state => {
            state.timelineRow?.remove();
            state.stagePlane?.remove();
        });
        this.states = layers.map(layer => this.build(layer));
        this.render();
    }

    /**
     * Adds a layer, or replaces the one carrying the same id.
     */
    addLayer(layer: MetaPlayerLayer): void {
        const existing = this.states.findIndex(state => state.layer.id === layer.id);
        if (existing >= 0) {
            this.states[existing].timelineRow?.remove();
            this.states[existing].stagePlane?.remove();
            this.states[existing] = this.build(layer);
        } else {
            this.states.push(this.build(layer));
        }
        this.render();
    }

    removeLayer(layerId: string): boolean {
        const index = this.states.findIndex(state => state.layer.id === layerId);
        if (index < 0) return false;
        this.states[index].timelineRow?.remove();
        this.states[index].stagePlane?.remove();
        this.states.splice(index, 1);
        this.render();
        return true;
    }

    setItems(layerId: string, items: MetaPlayerLayerItem[]): boolean {
        const state = this.states.find(entry => entry.layer.id === layerId);
        if (!state) return false;
        state.items = items;
        state.layer.items = items;
        this.render();
        return true;
    }

    getLayer(layerId: string): MetaPlayerLayer | null {
        return this.states.find(state => state.layer.id === layerId)?.layer ?? null;
    }

    toggle(layerId: string, force?: boolean): boolean {
        const state = this.states.find(entry => entry.layer.id === layerId);
        if (!state) return false;
        const visible = force ?? !(state.layer.visible ?? true);
        state.layer.visible = visible;
        this.render();
        return visible;
    }

    /**
     * Redraws everything: the timeline rows, then the stage shapes.
     */
    render(): void {
        this.renderTimeline();
        this.renderStage();
        this.applyTime(true);
        this.applyZoom();
    }

    /**
     * The playback position moved: the current items light up on the timeline
     * and show on the stage.
     */
    setTime(time: number): void {
        this.time = time;
        this.applyTime(false);
    }

    /**
     * The picture was zoomed or panned: the stage follows it, and the shapes
     * keeping their size on screen are compensated.
     */
    setZoom(state: MetaPlayerZoomState): void {
        this.zoom = state;
        this.applyZoom();
    }

    /**
     * Lights up some items of a layer for a moment — the answer to a click on
     * the timecode of a comment in a list beside the player.
     */
    highlight(layerId: string, itemIds: (string | number)[]): void {
        const wanted = new Set(itemIds.map(String));
        const lit: HTMLElement[] = [];
        for (const state of this.states) {
            if (state.layer.id !== layerId) continue;
            for (const marker of state.markers) {
                if (marker.items.some(item => wanted.has(String(item.id)))) lit.push(marker.element);
            }
            for (const shape of state.shapes) {
                if (wanted.has(String(shape.item.id))) lit.push(shape.element);
            }
        }
        this.flash(lit);
    }

    destroy(): void {
        this.observer?.disconnect();
        if (this.highlightTimer !== null) clearTimeout(this.highlightTimer);
        this.states.forEach(state => {
            state.timelineRow?.remove();
            state.stagePlane?.remove();
        });
        this.states = [];
    }

    /* ---------------- Building ---------------- */

    private build(layer: MetaPlayerLayer): LayerState {
        const items = (layer.items ?? []).map((item, index) => ({
            ...item,
            id: item.id ?? `${layer.id}-${index}`
        }));
        const render = layer.render ?? LayerRender.Timeline;
        const onTimeline = render === LayerRender.Timeline || render === LayerRender.Both;
        const onStage = render === LayerRender.Stage || render === LayerRender.Both;

        let timelineRow: HTMLElement | null = null;
        if (onTimeline && this.timelineRoot) {
            timelineRow = document.createElement('div');
            timelineRow.className = this.classes('lane', layer);
            timelineRow.setAttribute('role', 'group');
            if (layer.label) timelineRow.setAttribute('aria-label', layer.label);
            if (layer.color) timelineRow.style.setProperty('--sl-meta-layer-color', layer.color);
            // Before the preview, which must paint over the rows
            this.timelineRoot.insertBefore(timelineRow, this.preview);
        }

        let stagePlane: HTMLElement | null = null;
        if (onStage && this.stageRoot) {
            stagePlane = document.createElement('div');
            stagePlane.className = this.classes('plane', layer);
            if (layer.color) stagePlane.style.setProperty('--sl-meta-layer-color', layer.color);
            this.stageRoot.appendChild(stagePlane);
        }

        return {
            layer,
            items,
            timelineRow,
            stagePlane,
            markers: [],
            shapes: [],
            showing: new Set(),
            active: new Set()
        };
    }

    /**
     * The mark identifying a lane, in the gutter before its track: the layer's
     * `icon` — markup when it starts with `<`, text otherwise — or the first
     * letter of its label, so a lane is never anonymous.
     */
    private createLaneIcon(layer: MetaPlayerLayer): HTMLElement {
        const icon = document.createElement('span');
        icon.className = this.classes('lane-icon', layer);
        icon.setAttribute('aria-hidden', 'true');
        if (layer.label) icon.title = layer.label;
        const mark = layer.icon ?? (layer.label ? layer.label.trim().charAt(0).toUpperCase() : '\u25cf');
        if (mark.trimStart().startsWith('<')) icon.innerHTML = mark;
        else icon.textContent = mark;
        return icon;
    }

    private classes(suffix: string, layer: MetaPlayerLayer, extra?: string): string {
        const base = `${this.prefix}-${suffix} ${this.prefix}-layer-${layer.id}-${suffix}`;
        return [base, extra, layer.className].filter(Boolean).join(' ');
    }

    /* ---------------- Timeline ---------------- */

    private renderTimeline(): void {
        const duration = this.host.getDuration();
        let row = 0;
        for (const state of this.states) {
            const {layer, timelineRow} = state;
            state.markers = [];
            if (!timelineRow) continue;
            timelineRow.innerHTML = '';
            // Past three lanes the bar reads as a wall of dots and no one can
            // tell the rows apart: the extra layers keep their items and their
            // stage shapes, they simply do not take a lane.
            const room = row < MAX_TIMELINE_LANES;
            const visible = (layer.visible ?? true) && duration > 0 && state.items.length > 0 && room;
            timelineRow.hidden = !visible;
            if (!visible) continue;

            timelineRow.style.order = String(layer.row ?? row);
            row += 1;
            timelineRow.appendChild(this.createLaneIcon(layer));
            // The track itself is inset past the icon, so a marker at 0 is not
            // hidden under it and every lane starts on the same vertical line.
            const track = document.createElement('div');
            track.className = this.classes('track', layer);
            timelineRow.appendChild(track);

            // A real range is drawn as a span; the instants are clustered
            const spans = state.items.filter(item => {
                const window = itemWindow(item, 0);
                return window !== null && window[1] > window[0];
            });
            const instants = state.items.filter(item => !spans.includes(item));

            for (const item of spans) {
                const element = this.createSpan(layer, item, duration);
                track.appendChild(element);
                state.markers.push({element, items: [item]});
            }
            const clusters = (layer.cluster ?? true)
                ? clusterItems(instants, duration, this.trackWidth(), layer.minGapPx ?? 12)
                : instants
                    .filter(item => itemTime(item) !== null)
                    .map(item => ({position: clamp((itemTime(item) as number) / duration, 0, 1), items: [item]}));
            for (const cluster of clusters) {
                const element = this.createMarker(layer, cluster);
                track.appendChild(element);
                state.markers.push({element, items: cluster.items});
            }
        }
    }

    private createMarker(layer: MetaPlayerLayer, cluster: MetaPlayerLayerCluster): HTMLElement {
        const grouped = cluster.items.length > 1;
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = this.classes('marker', layer, grouped ? 'is-cluster' : undefined);
        marker.style.left = `${cluster.position * 100}%`;
        if (!grouped && cluster.items[0].color) {
            marker.style.setProperty('--sl-meta-layer-color', cluster.items[0].color as string);
        }
        if (cluster.items[0].className) marker.classList.add(cluster.items[0].className);
        if (grouped) marker.textContent = String(cluster.items.length);
        marker.setAttribute('aria-label', cluster.items.map(item => this.itemLabel(item)).join(' ; '));
        this.bindMarker(marker, layer, cluster.items, cluster.position);
        return marker;
    }

    private createSpan(layer: MetaPlayerLayer, item: MetaPlayerLayerItem, duration: number): HTMLElement {
        const window = itemWindow(item, 0) ?? [0, 0];
        const start = clamp(window[0] / duration, 0, 1);
        const end = clamp(window[1] / duration, 0, 1);
        const span = document.createElement('button');
        span.type = 'button';
        span.className = this.classes('span', layer);
        span.style.left = `${start * 100}%`;
        span.style.width = `${Math.max(0.4, (end - start) * 100)}%`;
        if (item.color) span.style.setProperty('--sl-meta-layer-color', item.color);
        if (item.className) span.classList.add(item.className);
        // No text inside the bar: at a lane's height it is unreadable, and it
        // only ever fits when the range happens to be long. A span reads the
        // way a marker does — on hover or on tap.
        span.setAttribute('aria-label', this.itemLabel(item));
        this.bindMarker(span, layer, [item], start);
        return span;
    }

    private bindMarker(
        element: HTMLElement,
        layer: MetaPlayerLayer,
        items: MetaPlayerLayerItem[],
        position: number
    ): void {
        if (layer.preview ?? true) {
            element.addEventListener('mouseenter', () => this.showPreview(layer, items, position));
            element.addEventListener('focus', () => this.showPreview(layer, items, position));
            element.addEventListener('blur', () => this.hidePreview());
        }
        element.addEventListener('click', () => this.select(layer, items));
    }

    /* ---------------- Stage ---------------- */

    private renderStage(): void {
        for (const state of this.states) {
            const {layer, stagePlane} = state;
            state.shapes = [];
            state.showing.clear();
            if (!stagePlane) continue;
            stagePlane.innerHTML = '';
            const visible = layer.visible ?? true;
            stagePlane.hidden = !visible;
            if (!visible) continue;

            for (const item of state.items) {
                // A shape needs a place in the picture
                if (typeof item.x !== 'number' || typeof item.y !== 'number') continue;
                const shape = this.createShape(layer, item);
                shape.element.hidden = true;
                stagePlane.appendChild(shape.element);
                state.shapes.push(shape);
            }
        }
    }

    private createShape(
        layer: MetaPlayerLayer,
        item: MetaPlayerLayerItem
    ): {element: HTMLElement; item: MetaPlayerLayerItem; fixedSize: boolean; centred: boolean} {
        const box = typeof item.w === 'number' && typeof item.h === 'number';
        const shape = item.shape ?? layer.shape ?? (box ? LayerShape.Box : LayerShape.Point);
        const interactive = Boolean(layer.onSelect) || (layer.seekOnSelect ?? true);
        const element = document.createElement(interactive ? 'button' : 'div');
        if (element instanceof HTMLButtonElement) element.type = 'button';
        element.className = this.classes('shape', layer, `${this.prefix}-shape-${shape}`);
        if (item.className) element.classList.add(item.className);
        if (item.color) element.style.setProperty('--sl-meta-layer-color', item.color);

        element.style.left = `${clamp(item.x ?? 0, 0, 1) * 100}%`;
        element.style.top = `${clamp(item.y ?? 0, 0, 1) * 100}%`;
        if (shape === LayerShape.Box && box) {
            element.style.width = `${clamp(item.w ?? 0, 0, 1) * 100}%`;
            element.style.height = `${clamp(item.h ?? 0, 0, 1) * 100}%`;
        }
        if (item.label) {
            const label = document.createElement('span');
            label.className = this.classes('shape-label', layer);
            label.textContent = item.label;
            element.appendChild(label);
        }
        element.setAttribute(interactive ? 'aria-label' : 'aria-hidden', interactive ? this.itemLabel(item) : 'true');
        if (interactive) element.addEventListener('click', () => this.select(layer, [item]));

        // A box frames something in the image and must follow it; a pin or a
        // label would grow out of the frame, so it keeps its size on screen.
        const fixedSize = !(layer.scaleWithPicture ?? shape === LayerShape.Box);
        // A point and a label sit on their middle, a box on its top-left corner
        const centred = shape !== LayerShape.Box;
        if (fixedSize) element.classList.add('is-fixed-size');
        return {element, item, fixedSize, centred};
    }

    /* ---------------- State ---------------- */

    private applyTime(force: boolean): void {
        let shown = false;
        for (const state of this.states) {
            const window = state.layer.activeWindow ?? DEFAULT_ACTIVE_WINDOW_S;
            const current = new Set(activeItems(state.items, this.time, window).map(item => String(item.id)));

            if (state.timelineRow && (force || !LayerSet.sameIds(current, state.active))) {
                for (const marker of state.markers) {
                    marker.element.classList.toggle(
                        'is-active',
                        marker.items.some(item => current.has(String(item.id)))
                    );
                }
            }
            if (state.stagePlane) {
                const always = state.layer.stageAlwaysVisible ?? false;
                const showing = always ? new Set(state.shapes.map(shape => String(shape.item.id))) : current;
                if (force || !LayerSet.sameIds(showing, state.showing)) {
                    for (const shape of state.shapes) {
                        shape.element.hidden = !showing.has(String(shape.item.id));
                    }
                    state.showing = showing;
                    // A shape that was hidden carries no compensation yet
                    shown = true;
                }
            }
            state.active = current;
        }
        if (shown) this.applyZoom();
    }

    private applyZoom(): void {
        if (!this.stageRoot) return;
        this.stageRoot.style.transform = `translate(${this.zoom.tx}px, ${this.zoom.ty}px) scale(${this.zoom.scale})`;
        this.stageRoot.style.setProperty('--sl-meta-zoom', String(this.zoom.scale));
        const inverse = 1 / (this.zoom.scale || 1);
        for (const state of this.states) {
            for (const shape of state.shapes) {
                if (!shape.fixedSize || shape.element.hidden) continue;
                shape.element.style.transformOrigin = shape.centred ? '' : 'top left';
                shape.element.style.transform = shape.centred
                    ? `translate(-50%, -50%) scale(${inverse})`
                    : `scale(${inverse})`;
            }
        }
    }

    /* ---------------- Selection and preview ---------------- */

    private select(layer: MetaPlayerLayer, items: MetaPlayerLayerItem[]): void {
        if (layer.seekOnSelect ?? true) {
            const time = itemTime(items[0]);
            if (time !== null) this.host.seek(time);
        }
        this.highlight(layer.id, items.map(item => item.id ?? ''));
        layer.onSelect?.(items, layer);
        this.host.onSelect(items, layer);
    }

    private flash(elements: HTMLElement[]): void {
        this.timelineRoot?.querySelectorAll('.is-highlighted')
            .forEach(element => element.classList.remove('is-highlighted'));
        this.stageRoot?.querySelectorAll('.is-highlighted')
            .forEach(element => element.classList.remove('is-highlighted'));
        elements.forEach(element => element.classList.add('is-highlighted'));
        if (this.highlightTimer !== null) clearTimeout(this.highlightTimer);
        this.highlightTimer = setTimeout(
            () => elements.forEach(element => element.classList.remove('is-highlighted')),
            HIGHLIGHT_MS
        );
    }

    private showPreview(layer: MetaPlayerLayer, items: MetaPlayerLayerItem[], position: number): void {
        if (!this.preview) return;
        const max = layer.previewMaxItems ?? DEFAULT_PREVIEW_MAX_ITEMS;
        this.preview.innerHTML = '';
        this.preview.className = this.classes('preview', layer);
        if (layer.color) this.preview.style.setProperty('--sl-meta-layer-color', layer.color);

        for (const item of items.slice(0, max)) {
            const entry = document.createElement('div');
            entry.className = `${this.prefix}-preview-item`;
            const time = itemTime(item);
            const head = [time === null ? null : formatTime(time, this.showHours), item.author]
                .filter(Boolean)
                .join(' · ');
            if (head) {
                const heading = document.createElement('div');
                heading.className = `${this.prefix}-preview-head`;
                heading.textContent = head;
                entry.appendChild(heading);
            }
            const text = item.text ?? item.label;
            if (text) {
                const body = document.createElement('div');
                body.className = `${this.prefix}-preview-text`;
                body.textContent = text;
                entry.appendChild(body);
            }
            if (entry.childElementCount > 0) this.preview.appendChild(entry);
        }
        const hidden = items.length - max;
        if (hidden > 0) {
            const more = document.createElement('div');
            more.className = `${this.prefix}-preview-more`;
            more.textContent = (this.labels.more ?? 'and {count} more').replace('{count}', String(hidden));
            this.preview.appendChild(more);
        }
        if (this.preview.childElementCount === 0) {
            this.hidePreview();
            return;
        }
        this.preview.hidden = false;
        const at = this.rowFraction(position);
        this.preview.style.left = `${at * 100}%`;
        // Aligned on the marker, without overflowing the player at either end
        this.preview.style.transform = `translateX(${-clamp(at, 0.1, 0.9) * 100}%)`;
    }

    private hidePreview(): void {
        if (this.preview) this.preview.hidden = true;
    }

    private itemLabel(item: MetaPlayerLayerItem): string {
        const time = itemTime(item);
        return [time === null ? null : formatTime(time, this.showHours), item.author, item.text ?? item.label]
            .filter(Boolean)
            .join(' · ');
    }

    private static sameIds(a: Set<string>, b: Set<string>): boolean {
        return a.size === b.size && [...a].every(id => b.has(id));
    }
}
