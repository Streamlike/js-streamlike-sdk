// path: src/metaplayer/styles.ts

/**
 * Version stamped on the injected stylesheet. A sheet left in the page by
 * another version of the SDK is replaced rather than kept on its id alone.
 */
const SDK_STYLES_VERSION = '3.11.0';

/**
 * Rules applied while the player holds the fullscreen: the picture takes the
 * screen and the bar keeps its place under it.
 *
 * Emitted once per fullscreen spelling — a browser drops a whole rule as soon
 * as one selector of the list is unknown to it, so `:fullscreen` and
 * `:-webkit-full-screen` cannot share one.
 */
function _fullscreenStyles(p: string, root: string): string {
    return `
${root} { width: 100vw; height: 100vh; border-radius: 0; }
${root} .${p}-frame { flex: 1 1 auto; max-height: none; aspect-ratio: auto !important; }
${root} .${p}-controls { flex: 0 0 auto; }
`;
}

/**
 * The default stylesheet of the meta player.
 *
 * Every rule uses a single class selector so it can be overridden without
 * fighting specificity, and every colour goes through a custom property, so a
 * theme is five declarations rather than a fork of the sheet. A layer carries
 * its own colour in `--sl-meta-layer-color`.
 */
export function metaPlayerStyles(p: string): string {
    return `
.${p}, .${p} * { box-sizing: border-box; }
.${p} {
    --sl-meta-bar: #111827;
    --sl-meta-text: #ffffff;
    --sl-meta-accent: #fbbf24;
    --sl-meta-accent-text: #1f2937;
    --sl-meta-backdrop: #000000;
    --sl-meta-curve: var(--sl-meta-accent);
    --sl-meta-radius: 10px;
    /* Width of the gutter holding a lane's icon; mirrored in layers.ts */
    --sl-meta-lane-gutter: 22px;
    --sl-meta-zoom: 1;
    display: flex; flex-direction: column; width: 100%; overflow: hidden;
    border-radius: var(--sl-meta-radius); background: var(--sl-meta-backdrop); color: var(--sl-meta-text);
}

/* ---- The picture ---- */
.${p}-frame {
    position: relative; width: 100%; overflow: hidden; background: var(--sl-meta-backdrop);
    touch-action: none; user-select: none;
}
.${p}-picture { position: absolute; inset: 0; transform-origin: center center; will-change: transform; }
.${p}-picture iframe { display: block; width: 100%; height: 100%; border: 0; }
.${p}-overlay { position: absolute; inset: 0; z-index: 5; cursor: pointer; touch-action: none; }
.${p}-overlay.is-panning { cursor: grabbing; }
.${p}-zoom-reset {
    position: absolute; top: .6rem; right: .6rem; z-index: 7; width: 2.4rem; height: 2.4rem;
    border: 0; border-radius: 50%; background: rgba(0, 0, 0, .6); color: #fff;
    font: inherit; font-weight: 700; cursor: pointer;
}
.${p}-zoom-reset[hidden] { display: none; }
.${p}-zoom-reset:hover, .${p}-zoom-reset:focus-visible { background: var(--sl-meta-accent); color: var(--sl-meta-accent-text); }

/* ---- The stage: the layers drawn in the picture ---- */
/* Same transform as the picture, above the gesture overlay, transparent to the
   pointer except where a shape answers to it. */
.${p}-stage { position: absolute; inset: 0; z-index: 6; transform-origin: center center; pointer-events: none; }
.${p}-plane { position: absolute; inset: 0; }
.${p}-plane[hidden] { display: none; }
.${p}-shape {
    position: absolute; margin: 0; padding: 0; border: 0; background: none; color: var(--sl-meta-text);
    font: inherit; pointer-events: auto; cursor: pointer;
}
.${p}-shape[hidden] { display: none; }
.${p}-shape-point {
    width: 14px; height: 14px; border-radius: 50%; transform: translate(-50%, -50%);
    background: var(--sl-meta-layer-color, var(--sl-meta-accent)); box-shadow: 0 0 0 2px rgba(0, 0, 0, .45);
}
.${p}-shape-box {
    border: 2px solid var(--sl-meta-layer-color, var(--sl-meta-accent)); border-radius: 4px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .35) inset;
}
.${p}-shape-label { transform: translate(-50%, -50%); }
.${p}-shape-point .${p}-shape-label, .${p}-shape-box .${p}-shape-label {
    position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, -4px);
}
.${p}-shape-label, .${p}-shape .${p}-shape-label {
    display: block; width: max-content; max-width: 14rem; padding: .1rem .4rem; border-radius: 3px;
    background: var(--sl-meta-layer-color, var(--sl-meta-accent)); color: var(--sl-meta-accent-text);
    font-size: .72rem; font-weight: 700; line-height: 1.3;
}
/* A shape keeping its size on screen: the inverse of the zoom is written on it
   from the code, so it works with or without this sheet. */
.${p}-shape.is-fixed-size { transform: translate(-50%, -50%) scale(calc(1 / var(--sl-meta-zoom))); }
.${p}-shape.is-highlighted { outline: 2px solid var(--sl-meta-text); outline-offset: 3px; }

/* ---- The control bar ---- */
.${p}-controls {
    display: flex; flex-direction: column; gap: .5rem; padding: .5rem .7rem .7rem;
    background: var(--sl-meta-bar); color: var(--sl-meta-text);
}
.${p}-bar, .${p}-row { display: flex; align-items: center; gap: .4rem; }
.${p}-row { flex-wrap: wrap; }
.${p}-button {
    flex: 0 0 auto; min-width: 2.25rem; height: 2.25rem; padding: 0 .4rem; border: 0;
    border-radius: calc(var(--sl-meta-radius) / 2); background: transparent; color: var(--sl-meta-text);
    font: inherit; font-weight: 700; line-height: 1; cursor: pointer;
}
.${p}-button:hover { background: rgba(255, 255, 255, .12); }
.${p}-button:disabled { opacity: .4; cursor: default; }
.${p}-button-small { min-width: 1.9rem; height: 1.9rem; font-size: .85rem; }
.${p}-icon { display: block; width: 1.15rem; height: 1.15rem; margin: 0 auto; }
.${p}-button-small .${p}-icon { width: 1rem; height: 1rem; }
.${p}-button:focus-visible, .${p}-progress:focus-visible, .${p}-jog:focus-visible, .${p}-speed:focus-visible,
.${p}-marker:focus-visible, .${p}-span:focus-visible, .${p}-shape:focus-visible {
    outline: 2px solid var(--sl-meta-accent); outline-offset: 2px;
}
.${p}-time {
    flex: 0 0 auto; min-width: 3rem; font-size: .75rem; font-variant-numeric: tabular-nums;
    text-align: center; opacity: .85;
}
.${p}-group { display: inline-flex; align-items: center; gap: .15rem; }

/* ---- Progress, audience curve and timeline ---- */
.${p}-progress-area { position: relative; flex: 1 1 auto; min-width: 0; }
.${p}-peek {
    position: absolute; left: 0; right: 0; bottom: calc(100% + .25rem); z-index: 8;
    border-radius: calc(var(--sl-meta-radius) / 2); background: rgba(0, 0, 0, .55); pointer-events: none;
}
.${p}-peek.is-always { position: static; bottom: auto; background: none; }
.${p}-peek[hidden] { display: none; }
.${p}-curve { display: block; width: 100%; height: 100%; }
.${p}-curve[hidden] { display: none; }
.${p}-curve-path {
    fill: rgba(251, 191, 36, .35);
    fill: color-mix(in srgb, var(--sl-meta-curve) 35%, transparent);
    stroke: var(--sl-meta-curve); stroke-width: 1.5; vector-effect: non-scaling-stroke;
}
.${p}-curve-empty {
    position: absolute; inset: 0; display: grid; place-items: center;
    font-size: .7rem; opacity: .85; text-align: center;
}
.${p}-curve-empty[hidden] { display: none; }
.${p}-curve-cursor { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--sl-meta-text); }
.${p}-curve-cursor[hidden] { display: none; }
.${p}-curve-tooltip {
    position: absolute; bottom: calc(100% + .15rem); transform: translateX(-50%); white-space: nowrap;
    padding: .1rem .35rem; border-radius: 3px; background: var(--sl-meta-text); color: var(--sl-meta-bar);
    font-size: .7rem; font-weight: 700;
}
.${p}-curve-tooltip[hidden] { display: none; }
.${p}-progress { position: relative; height: 1rem; display: flex; align-items: center; cursor: pointer; touch-action: none; }
.${p}-progress.is-disabled { cursor: default; opacity: .5; }
.${p}-progress::before {
    content: ''; position: absolute; left: 0; right: 0; height: 4px; border-radius: 2px;
    background: rgba(255, 255, 255, .25);
}
.${p}-progress-fill {
    position: absolute; left: 0; height: 4px; border-radius: 2px;
    background: var(--sl-meta-accent); pointer-events: none;
}
.${p}-progress-thumb {
    position: absolute; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%;
    background: var(--sl-meta-accent); box-shadow: 0 0 0 2px rgba(0, 0, 0, .35); pointer-events: none;
}
.${p}-timeline { position: relative; display: flex; flex-direction: column; }
.${p}-lane { position: relative; height: 1.3rem; display: flex; align-items: center; }
.${p}-lane[hidden] { display: none; }
/* The mark that tells one lane from another at a glance. */
.${p}-lane-icon {
    flex: 0 0 var(--sl-meta-lane-gutter); width: var(--sl-meta-lane-gutter); height: 1rem;
    display: inline-flex; align-items: center; justify-content: flex-start;
    color: var(--sl-meta-layer-color, var(--sl-meta-accent));
    font-size: .68rem; font-weight: 700; line-height: 1; opacity: .9;
}
.${p}-lane-icon svg { width: .85rem; height: .85rem; display: block; fill: currentColor; }
/* The markers live here, inset past the icon, so one at 0 is not hidden under
   it and every lane starts on the same vertical line. */
.${p}-track { position: relative; flex: 1 1 auto; min-width: 0; height: 100%; }
.${p}-marker, .${p}-span {
    position: absolute; top: 50%; padding: 0; border: 2px solid var(--sl-meta-bar); border-radius: 999px;
    background: var(--sl-meta-text); color: var(--sl-meta-bar);
    font: inherit; font-size: .55rem; font-weight: 700; line-height: 1;
    transform: translate(-50%, -50%); cursor: pointer;
    transition: transform .12s ease, background-color .12s ease;
}
.${p}-marker { min-width: 10px; height: 10px; }
.${p}-marker.is-cluster { min-width: 1.1rem; height: .95rem; padding: 0 .15rem; }
.${p}-span {
    height: .5rem; padding: 0; border-radius: 3px; transform: translate(0, -50%);
    background: var(--sl-meta-layer-color, var(--sl-meta-accent));
    border-color: transparent;
}
.${p}-marker:hover, .${p}-marker:focus-visible { transform: translate(-50%, -50%) scale(1.3); z-index: 2; }
.${p}-span:hover, .${p}-span:focus-visible { filter: brightness(1.15); z-index: 2; }
.${p}-marker.is-active, .${p}-marker.is-highlighted {
    background: var(--sl-meta-layer-color, var(--sl-meta-accent)); color: var(--sl-meta-accent-text);
    box-shadow: 0 0 6px var(--sl-meta-layer-color, var(--sl-meta-accent));
}
.${p}-span.is-active, .${p}-span.is-highlighted { box-shadow: 0 0 6px var(--sl-meta-layer-color, var(--sl-meta-accent)); }
.${p}-preview {
    position: absolute; bottom: calc(100% + .35rem); z-index: 10; width: max-content; max-width: min(20rem, 90%);
    padding: .4rem .5rem; border-left: 3px solid var(--sl-meta-layer-color, var(--sl-meta-accent));
    border-radius: calc(var(--sl-meta-radius) / 2); background: #fff; color: #111827;
    box-shadow: 0 4px 16px rgba(0, 0, 0, .3); font-size: .75rem; pointer-events: none;
}
.${p}-preview[hidden] { display: none; }
.${p}-preview-item + .${p}-preview-item { margin-top: .35rem; padding-top: .35rem; border-top: 1px solid #e5e7eb; }
.${p}-preview-head { font-weight: 700; }
.${p}-preview-text { overflow-wrap: anywhere; }
.${p}-preview-more { margin-top: .25rem; font-style: italic; opacity: .7; }

/* ---- The jog wheel ---- */
.${p}-jog {
    position: relative; flex: 1 1 auto; min-width: 8rem; height: 2.6rem; overflow: hidden;
    border-radius: calc(var(--sl-meta-radius) / 2); cursor: ew-resize; touch-action: none; user-select: none;
    /* A cylinder seen from the front: darker on the edges, lighter in the middle */
    background:
        linear-gradient(90deg, rgba(0, 0, 0, .85) 0%, rgba(0, 0, 0, .55) 12%, rgba(0, 0, 0, .15) 34%,
            rgba(255, 255, 255, .12) 50%, rgba(0, 0, 0, .15) 66%, rgba(0, 0, 0, .55) 88%, rgba(0, 0, 0, .85) 100%),
        var(--sl-meta-bar);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .1), inset 0 -1px 0 rgba(0, 0, 0, .55), 0 1px 2px rgba(0, 0, 0, .4);
}
.${p}-jog-ticks {
    position: absolute; inset: 0; opacity: .55; background-repeat: repeat-x; will-change: background-position;
    background-image:
        repeating-linear-gradient(90deg, var(--sl-meta-text) 0 1px, transparent 1px 12px),
        repeating-linear-gradient(90deg, var(--sl-meta-text) 0 2px, transparent 2px 60px);
    background-size: 12px 100%, 60px 100%;
}
.${p}-jog-shade {
    position: absolute; inset: 0; pointer-events: none;
    background:
        linear-gradient(90deg, rgba(0, 0, 0, .9) 0%, transparent 22%, transparent 78%, rgba(0, 0, 0, .9) 100%),
        linear-gradient(180deg, rgba(255, 255, 255, .12) 0%, transparent 45%, rgba(0, 0, 0, .35) 100%);
}
.${p}-jog-cursor {
    position: absolute; top: .25rem; bottom: .25rem; left: 50%; width: 2px; margin-left: -1px;
    background: var(--sl-meta-accent); box-shadow: 0 0 6px var(--sl-meta-accent); pointer-events: none;
}
.${p}-jog-direction {
    position: absolute; top: 50%; transform: translateY(-50%); font-size: .62rem;
    opacity: .55; pointer-events: none;
}
.${p}-jog-direction-back { left: .5rem; }
.${p}-jog-direction-forward { right: .5rem; }
.${p}-jog-readout {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    padding: .15rem .45rem; border-radius: 3px; background: rgba(0, 0, 0, .78); color: #fff;
    font-size: .75rem; font-variant-numeric: tabular-nums; white-space: nowrap;
    opacity: 0; pointer-events: none; transition: opacity .12s ease;
}
.${p}-jog-readout.is-visible { opacity: 1; }

/* ---- Speed, zoom, volume ---- */
.${p}-speed {
    flex: 0 0 auto; min-width: 3.5rem; height: 1.9rem; padding: 0 .35rem;
    border: 1px solid rgba(255, 255, 255, .14); border-radius: calc(var(--sl-meta-radius) / 2);
    background: rgba(255, 255, 255, .08); color: var(--sl-meta-text);
    font: inherit; font-size: .75rem; font-variant-numeric: tabular-nums; cursor: ns-resize;
}
.${p}-speed:hover { background: rgba(255, 255, 255, .18); }
.${p}-speed.is-slow, .${p}-speed.is-fast { border-color: var(--sl-meta-accent); }
.${p}-speed.is-fast { background: rgba(251, 191, 36, .25); }
.${p}-volume { width: 4.5rem; accent-color: var(--sl-meta-accent); }
.${p}-layer-toggles { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; font-size: .72rem; }
.${p}-layer-toggle { display: inline-flex; align-items: center; gap: .25rem; cursor: pointer; }
.${p}-layer-toggle input { accent-color: var(--sl-meta-layer-color, var(--sl-meta-accent)); }
.${p}-help-panel {
    position: relative; margin: 0; padding: .7rem 2.2rem .7rem .9rem;
    border-radius: calc(var(--sl-meta-radius) / 2); background: rgba(255, 255, 255, .1);
    display: flex; flex-direction: column; gap: .3rem;
}
.${p}-help-panel[hidden] { display: none; }
.${p}-help-line { margin: 0; font-size: .72rem; line-height: 1.5; opacity: .85; }
.${p}-help-close { position: absolute; top: .3rem; right: .3rem; }
.${p}-hint { margin: 0; font-size: .68rem; line-height: 1.5; opacity: .7; }
.${p}-message { padding: 1rem; text-align: center; font-size: .85rem; opacity: .8; }

@media (max-width: 560px) {
    .${p}-jog { order: -1; flex-basis: 100%; }
    .${p}-volume { width: 3rem; }
    .${p}-help-line { font-size: .7rem; }
}
@media (prefers-reduced-motion: reduce) {
    .${p}-marker, .${p}-span, .${p}-jog-readout { transition: none; }
}
${_fullscreenStyles(p, `.${p}:fullscreen`)}
${_fullscreenStyles(p, `.${p}:-webkit-full-screen`)}
`;
}

/**
 * Injects the default stylesheet for a given class prefix, once per prefix.
 */
export function injectMetaPlayerStyles(p: string): void {
    const styleId = `${p}-default-styles`;
    const existing = document.getElementById(styleId);
    if (existing?.getAttribute('data-sl-version') === SDK_STYLES_VERSION) return;
    existing?.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.setAttribute('data-sl-version', SDK_STYLES_VERSION);
    style.textContent = metaPlayerStyles(p);
    document.head.appendChild(style);
}
