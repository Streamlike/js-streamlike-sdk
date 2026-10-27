// path: src/features/metaPlayer.ts

import {BaseOptions, Media} from "../types/api";
import {PlayerParams} from "../types/player";
import {
    LayerRender,
    MetaPlayerAudienceOptions,
    MetaPlayerController,
    MetaPlayerData,
    MetaPlayerEvents,
    MetaPlayerJogOptions,
    MetaPlayerKeyboardOptions,
    MetaPlayerLabels,
    MetaPlayerLayer,
    MetaPlayerLayerItem,
    MetaPlayerOptions,
    MetaPlayerSpeedOptions,
    MetaPlayerState,
    MetaPlayerTransportOptions,
    MetaPlayerZoomOptions,
    MetaPlayerZoomState
} from "../types/metaPlayer";
import {getWsMedia} from "../api/media";
import {embedPlayerIframe} from "../player/iframe";
import {buildUrl} from "../utils/api";
import {PlayerBridge} from "../metaplayer/bridge";
import {JogWheel, jogMarkup} from "../metaplayer/jog";
import {LayerSet} from "../metaplayer/layers";
import {AudienceCurve} from "../metaplayer/curve";
import {ZoomController} from "../metaplayer/zoom";
import {injectMetaPlayerStyles} from "../metaplayer/styles";
import {
    DEFAULT_SPEEDS,
    clamp,
    formatSpeed,
    formatTime,
    acceptsProgress,
    metaPlayerUrl,
    nearestSpeedIndex,
    parseTimecode
} from "../metaplayer/math";

const DEFAULT_PREFIX = 'sl-meta';

/**
 * Under this position, what was chosen before the first playback is the
 * beginning: there is nothing to re-apply.
 */
const START_EPSILON_S = 0.05;

/**
 * How long the speed is re-affirmed after a seek: a seek may put the player
 * back to 1×.
 */
const SPEED_REAFFIRM_MS = 200;

const DEFAULT_LABELS: Required<MetaPlayerLabels> = {
    play: 'Play',
    pause: 'Pause',
    progress: 'Position in the media',
    jog: 'Jog wheel: drag, scroll, or use the arrow keys',
    backward: 'backward',
    forward: 'forward',
    speed: 'Playback speed',
    slower: 'Slow down',
    faster: 'Speed up',
    normalSpeed: 'Back to 1×',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    zoomReset: 'Back to the whole picture',
    previousFrame: 'Previous image',
    nextFrame: 'Next image',
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    audience: 'audience',
    view: 'view',
    views: 'views',
    noAudience: 'Audience curve not available yet',
    layers: 'Layers',
    more: 'and {count} more',
    error: 'Unable to load the media.',
    help: 'Help',
    closeHelp: 'Close',
    hint: 'Jog wheel: drag or scroll (Shift: fine) · ← → 1 s, Shift 5 s, Page ±30 s, '
        + '« , » « . » one image · Space: play · '
        + 'Picture: scroll to zoom, drag to move, double click to reset'
};

const DEFAULT_TRANSPORT: Required<Omit<MetaPlayerTransportOptions, 'rememberVolume'>> & {
    rememberVolume: boolean | string
} = {
    play: true,
    progress: true,
    elapsed: true,
    remaining: true,
    volume: true,
    initialVolume: 1,
    rememberVolume: true,
    fullscreen: true,
    frameSteps: true,
    layerToggles: false,
    help: true
};

const DEFAULT_KEYBOARD: Required<MetaPlayerKeyboardOptions> = {
    step: 1,
    bigStep: 5,
    pageStep: 30,
    frameKeys: [',', '.'],
    togglePlay: true,
    homeEnd: true
};

const VOLUME_STORAGE_KEY = 'sl_meta_volume';

/**
 * Creates an element with a class and an optional text content.
 */
function _el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}


/**
 * The icons of the bar, drawn inline so they take the colour of the text and
 * need no font, no sprite and no network. A glyph would have done, except that
 * the speaker and the fullscreen arrows are emoji on most systems: coloured,
 * off-key in a dark bar, and missing outright on a machine without an emoji
 * font.
 */
const ICONS: Record<string, string> = {
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M6.5 5h3.5v14H6.5zM14 5h3.5v14H14z"/>',
    previousFrame: '<path d="M6 5h2v14H6zM19 5.5v13L9.5 12z"/>',
    nextFrame: '<path d="M16 5h2v14h-2zM5 5.5v13L14.5 12z"/>',
    volumeHigh: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/>'
        + '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    volumeLow: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/>'
        + '<path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    volumeMuted: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/>'
        + '<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    fullscreen: '<path d="M4 9V4h5v2H6v3zM15 4h5v5h-2V6h-3zM4 15h2v3h3v2H4zM18 15h2v5h-5v-2h3z"/>',
    exitFullscreen: '<path d="M9 4h2v5H6V7h3zM13 4h2v3h3v2h-5zM6 15h5v5H9v-3H6zM13 15h5v2h-3v3h-2z"/>',
    zoomIn: '<circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/>'
        + '<path d="M14.8 14.8L20 20M8 10.5h5M10.5 8v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    help: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>'
        + '<path d="M9.4 9.3a2.7 2.7 0 1 1 3.3 2.6v1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
        + '<circle cx="12.6" cy="16.6" r="1.1"/>',
    zoomOut: '<circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/>'
        + '<path d="M14.8 14.8L20 20M8 10.5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
};

/**
 * One icon, as markup. `fill` is the default, so a path needing a stroke asks
 * for it.
 */
function _icon(p: string, name: string): string {
    return `<svg class="${p}-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${ICONS[name] ?? ''}</svg>`;
}

/**
 * A button of the bar. `content` is markup — an icon — so the label is always
 * carried by `aria-label` rather than by what is drawn.
 */
function _button(className: string, content: string, label: string): HTMLButtonElement {
    const button = _el('button', className);
    button.type = 'button';
    button.innerHTML = content;
    button.setAttribute('aria-label', label);
    button.title = label;
    return button;
}

/**
 * The fullscreen API of the browser, with the WebKit spelling Safari still
 * needs. Returns null where an arbitrary element cannot be put in fullscreen —
 * an iPhone, where only a native video element can, or a document whose
 * permissions policy forbids it.
 */
function _fullscreenApi(): {
    request: (element: Element) => Promise<unknown>;
    exit: () => Promise<unknown>;
    element: () => Element | null;
    events: string[];
} | null {
    if (typeof document === 'undefined' || typeof Element === 'undefined') return null;

    const doc = document as Document & Record<string, any>;
    const proto = Element.prototype as Element & Record<string, any>;
    const request = proto.requestFullscreen ?? proto.webkitRequestFullscreen;
    const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
    const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? true;
    if (!request || !exit || !enabled) return null;

    return {
        request: element => Promise.resolve(request.call(element)),
        exit: () => Promise.resolve(exit.call(doc)),
        element: () => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null,
        events: ['fullscreenchange', 'webkitfullscreenchange']
    };
}

/**
 * Reads the volume kept from an earlier visit.
 */
function _storedVolume(key: string, fallback: number): number {
    try {
        const stored = window.localStorage.getItem(key);
        const volume = stored === null ? NaN : Number(stored);
        return Number.isFinite(volume) ? clamp(volume, 0, 1) : fallback;
    } catch {
        // Storage unavailable (private browsing…): the setting holds for the page only
        return fallback;
    }
}

function _storeVolume(key: string, volume: number): void {
    try {
        window.localStorage.setItem(key, String(volume));
    } catch {
        // Nothing to do: the setting holds for the page only
    }
}

/**
 * Builds a controller with inert methods, used when the player cannot be
 * created.
 */
function _errorController(errors: string): MetaPlayerController {
    const noop = () => undefined;
    const zoom: MetaPlayerZoomState = {scale: 1, tx: 0, ty: 0};
    return {
        res: false,
        data: null,
        errors,
        play: noop,
        pause: noop,
        togglePlay: noop,
        seek: noop,
        step: noop,
        stepFrames: noop,
        getTime: () => 0,
        getDuration: () => 0,
        getState: () => 'pause',
        setSpeed: () => 1,
        getSpeed: () => 1,
        setVolume: noop,
        getVolume: () => 1,
        toggleMute: () => false,
        zoomBy: noop,
        setZoom: noop,
        getZoom: () => zoom,
        resetZoom: noop,
        setLayerItems: () => false,
        reloadLayer: async () => false,
        toggleLayer: () => false,
        addLayer: noop,
        removeLayer: () => false,
        getLayers: () => [],
        highlight: noop,
        setAudienceCurve: noop,
        reloadAudience: async () => false,
        isFullscreen: () => false,
        toggleFullscreen: async () => false,
        on: () => () => undefined,
        off: noop,
        getElements: () => ({
            root: document.createElement('div'),
            frame: document.createElement('div'),
            picture: document.createElement('div'),
            stage: null,
            iframe: null,
            controls: null,
            timeline: null
        }),
        send: noop,
        destroy: noop
    };
}

/**
 * Builds a meta player: the Streamlike player without its own interface,
 * driven from the page by controls that know where the playback is and can put
 * things on top of it.
 *
 * What it adds to an embed, each part configurable and each element carrying a
 * class built from `classPrefix`:
 *
 * - a **jog wheel** with momentum, for browsing a long media by the second,
 * - **21 playback speeds**, from 0.1× to 8×,
 * - **zoom and pan inside the picture**, up to three times the definition of
 *   the stream, on mouse, trackpad and touch alike,
 * - **layers**: sets of items placed in time, and optionally in the picture —
 *   comments, tags, chapters, events. They are clustered on the timeline when
 *   too close, lit when current, and handed back when clicked. The ones drawn
 *   in the picture follow the zoom,
 * - the **audience curve** over the progress bar, from figures your backend
 *   reads on the REST API ({@link audienceBuckets} shapes them).
 *
 * The media still plays in the Streamlike player, with its token: nothing here
 * reads the stream.
 *
 * ```ts
 * const player = await generateMetaPlayer('player', {
 *     mediaId: 'MEDIA_ID',
 *     layers: [{
 *         id: 'comments',
 *         render: LayerRender.Timeline,
 *         items: comments.map(c => ({id: c.id, at: c.time, author: c.author, text: c.text})),
 *         onSelect: items => showComment(items[0].id)
 *     }],
 *     audience: {load: () => fetch('/api/audience').then(r => r.json())}
 * });
 * player.on('time', seconds => timecodeField.value = seconds.toFixed(2));
 * ```
 *
 * @param target The element that will host the player, or its id.
 * @param options Configuration of the player.
 * @return The controller, with `res: false` and the reason when it could not
 * be built.
 */
export async function generateMetaPlayer(
    target: string | HTMLElement,
    options: MetaPlayerOptions
): Promise<MetaPlayerController> {
    const container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!container) return _errorController('Invalid target element.');
    if (!options?.mediaId && !options?.permalink && !options?.playerUrl) {
        return _errorController('Missing media: pass mediaId, permalink or playerUrl.');
    }

    const {
        mediaId,
        permalink,
        playerUrl,
        startAt = 0,
        autostart = false,
        layers = [],
        locale,
        classPrefix = DEFAULT_PREFIX,
        injectStyles = true,
        showHours = false,
        primeOnSeek = true,
        playerParams = {},
        iframeParams,
        theme = {},
        debug = false,
        baseOptions = {}
    } = options;

    const p = classPrefix;
    const labels: Required<MetaPlayerLabels> = {...DEFAULT_LABELS, ...options.labels};
    const transport = {...DEFAULT_TRANSPORT, ...options.transport};
    const jogOptions: MetaPlayerJogOptions | false = options.jog === false ? false : (options.jog ?? {});
    const speedOptions: MetaPlayerSpeedOptions | false = options.speed === false ? false : (options.speed ?? {});
    const zoomOptions: MetaPlayerZoomOptions | false = options.zoom === false ? false : (options.zoom ?? {});
    const audienceOptions: MetaPlayerAudienceOptions | false =
        options.audience === false ? false : (options.audience ?? false);
    const keyboard: MetaPlayerKeyboardOptions | false = options.keyboard === false
        ? false
        : {...DEFAULT_KEYBOARD, ...(options.keyboard === true || options.keyboard === undefined ? {} : options.keyboard)};

    if (debug) {
        console.groupCollapsed(`%c[generateMetaPlayer]`, 'color: deepskyblue; font-weight: bold;');
        console.debug('target:', container);
        console.debug('options:', options);
    }

    /* ---------------- The media ---------------- */

    let media: Media | null = null;
    let duration = options.duration ?? 0;
    let ratio = options.ratio ?? 0;
    let fps = options.fps ?? 0;

    // Everything the controls need to know about the media comes in one call,
    // skipped when the integration already knows it all.
    if ((mediaId || permalink) && (!duration || !ratio || !fps)) {
        try {
            const response = await getWsMedia(
                mediaId ? {media_id: mediaId} : {permalink: permalink as string},
                baseOptions
            );
            if (response.res && response.data) {
                media = response.data.media;
                const global = media.metadata?.global;
                duration = duration || Number(global?.duration) || 0;
                ratio = ratio || Number(global?.ratio) || 0;
                fps = fps || Number(global?.fps) || 0;
            } else if (debug) {
                console.warn('Could not read the media:', response.errors);
            }
        } catch (error) {
            if (debug) console.warn('Could not read the media:', error);
        }
    }
    ratio = ratio || 16 / 9;
    fps = fps || 25;
    const frame = 1 / fps;

    /* ---------------- The player URL ---------------- */

    const params: PlayerParams = {...playerParams};
    if (mediaId) params.med_id = mediaId;
    else if (permalink) params.permalink = permalink;
    const start = parseTimecode(startAt);
    if (start > 0) params.tc = start;
    if (autostart) params.autostart = true;

    const src = metaPlayerUrl(playerUrl ?? buildUrl('/play', params, baseOptions));
    const iframeId = `${p}-player-${mediaId ?? permalink ?? 'media'}`;

    /* ---------------- The markup ---------------- */

    if (injectStyles) injectMetaPlayerStyles(p);

    const hasStageLayer = layers.some(layer => {
        const render = layer.render ?? LayerRender.Timeline;
        return render === LayerRender.Stage || render === LayerRender.Both;
    });
    const hasTimelineLayer = layers.some(layer => {
        const render = layer.render ?? LayerRender.Timeline;
        return render === LayerRender.Timeline || render === LayerRender.Both;
    });

    container.innerHTML = '';
    const root = _el('div', p);
    root.tabIndex = -1;
    for (const [key, value] of Object.entries({
        '--sl-meta-bar': theme.bar,
        '--sl-meta-text': theme.text,
        '--sl-meta-accent': theme.accent,
        '--sl-meta-accent-text': theme.accentText,
        '--sl-meta-backdrop': theme.backdrop,
        '--sl-meta-curve': theme.curve,
        '--sl-meta-radius': theme.radius
    })) {
        if (value) root.style.setProperty(key, value);
    }

    const frameBox = _el('div', `${p}-frame`);
    frameBox.style.aspectRatio = String(ratio);
    const picture = _el('div', `${p}-picture`);
    const overlay = _el('div', `${p}-overlay`);
    frameBox.append(picture, overlay);

    const stage = hasStageLayer ? _el('div', `${p}-stage`) : null;
    if (stage) frameBox.appendChild(stage);

    const zoomReset = zoomOptions && (zoomOptions.resetButton ?? true)
        ? _button(`${p}-zoom-reset`, '1×', labels.zoomReset)
        : null;
    if (zoomReset) {
        zoomReset.hidden = true;
        frameBox.appendChild(zoomReset);
    }
    root.appendChild(frameBox);

    const controls = _el('div', `${p}-controls`);
    const bar = _el('div', `${p}-bar`);

    const playButton = transport.play
        ? _button(`${p}-button ${p}-play`, _icon(p, 'play'), labels.play)
        : null;
    if (playButton) bar.appendChild(playButton);

    const elapsed = transport.elapsed ? _el('span', `${p}-time ${p}-elapsed`, formatTime(start, showHours)) : null;
    if (elapsed) bar.appendChild(elapsed);

    const progressArea = _el('div', `${p}-progress-area`);
    const peek = audienceOptions ? _el('div', `${p}-peek`) : null;
    if (peek) progressArea.appendChild(peek);

    const progress = transport.progress ? _el('div', `${p}-progress`) : null;
    const progressFill = progress ? _el('div', `${p}-progress-fill`) : null;
    const progressThumb = progress ? _el('div', `${p}-progress-thumb`) : null;
    if (progress && progressFill && progressThumb) {
        progress.setAttribute('role', 'slider');
        progress.tabIndex = 0;
        progress.setAttribute('aria-label', labels.progress);
        progress.setAttribute('aria-valuemin', '0');
        progress.append(progressFill, progressThumb);
        progressArea.appendChild(progress);
    }

    const timeline = hasTimelineLayer ? _el('div', `${p}-timeline`) : null;
    if (timeline) progressArea.appendChild(timeline);
    bar.appendChild(progressArea);

    const remaining = transport.remaining ? _el('span', `${p}-time ${p}-remaining`, '-:--') : null;
    if (remaining) bar.appendChild(remaining);

    let muteButton: HTMLButtonElement | null = null;
    let volumeSlider: HTMLInputElement | null = null;
    if (transport.volume) {
        const sound = _el('span', `${p}-group ${p}-sound`);
        muteButton = _button(`${p}-button ${p}-mute`, _icon(p, 'volumeHigh'), labels.mute);
        volumeSlider = _el('input', `${p}-volume`);
        volumeSlider.type = 'range';
        volumeSlider.min = '0';
        volumeSlider.max = '1';
        volumeSlider.step = '0.05';
        volumeSlider.setAttribute('aria-label', labels.volume);
        sound.append(muteButton, volumeSlider);
        bar.appendChild(sound);
    }

    const fullscreenApi = _fullscreenApi();
    const fullscreenButton = transport.fullscreen && fullscreenApi
        ? _button(`${p}-button ${p}-fullscreen`, _icon(p, 'fullscreen'), labels.fullscreen)
        : null;
    if (fullscreenButton) bar.appendChild(fullscreenButton);

    if (bar.childElementCount > 0) controls.appendChild(bar);

    const row = _el('div', `${p}-row`);
    const previousFrameButton = transport.frameSteps
        ? _button(`${p}-button ${p}-frame-previous`, _icon(p, 'previousFrame'), labels.previousFrame)
        : null;
    const nextFrameButton = transport.frameSteps
        ? _button(`${p}-button ${p}-frame-next`, _icon(p, 'nextFrame'), labels.nextFrame)
        : null;
    if (previousFrameButton) row.appendChild(previousFrameButton);

    let jogElement: HTMLElement | null = null;
    if (jogOptions) {
        jogElement = _el('div', `${p}-jog`);
        jogElement.tabIndex = 0;
        jogElement.setAttribute('role', 'slider');
        jogElement.setAttribute('aria-label', labels.jog);
        jogElement.setAttribute('aria-valuemin', '0');
        jogElement.innerHTML = jogMarkup(p, labels, jogOptions);
        row.appendChild(jogElement);
    }
    if (nextFrameButton) row.appendChild(nextFrameButton);

    const speeds = speedOptions ? (speedOptions.speeds ?? DEFAULT_SPEEDS) : DEFAULT_SPEEDS;
    let speedIndex = nearestSpeedIndex(speeds, speedOptions ? (speedOptions.initial ?? 1) : 1);
    const normalIndex = nearestSpeedIndex(speeds, 1);
    let speedButton: HTMLButtonElement | null = null;
    let slowerButton: HTMLButtonElement | null = null;
    let fasterButton: HTMLButtonElement | null = null;
    if (speedOptions) {
        const group = _el('span', `${p}-group ${p}-speeds`);
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', labels.speed);
        if (speedOptions.buttons ?? true) {
            slowerButton = _button(`${p}-button ${p}-button-small ${p}-slower`, '−', labels.slower);
            group.appendChild(slowerButton);
        }
        speedButton = _button(`${p}-speed`, '', labels.speed);
        group.appendChild(speedButton);
        if (speedOptions.buttons ?? true) {
            fasterButton = _button(`${p}-button ${p}-button-small ${p}-faster`, '+', labels.faster);
            group.appendChild(fasterButton);
        }
        row.appendChild(group);
    }

    let zoomOutButton: HTMLButtonElement | null = null;
    let zoomInButton: HTMLButtonElement | null = null;
    if (zoomOptions && (zoomOptions.buttons ?? true)) {
        const group = _el('span', `${p}-group ${p}-zooms`);
        zoomOutButton = _button(`${p}-button ${p}-button-small ${p}-zoom-out`, _icon(p, 'zoomOut'), labels.zoomOut);
        zoomInButton = _button(`${p}-button ${p}-button-small ${p}-zoom-in`, _icon(p, 'zoomIn'), labels.zoomIn);
        group.append(zoomOutButton, zoomInButton);
        row.appendChild(group);
    }
    if (row.childElementCount > 0) controls.appendChild(row);

    const toggles = transport.layerToggles && layers.length > 0 ? _el('div', `${p}-layer-toggles`) : null;
    if (toggles) {
        toggles.setAttribute('role', 'group');
        toggles.setAttribute('aria-label', labels.layers);
        controls.appendChild(toggles);
    }

    // The gestures and shortcuts used to sit under the bar at all times, which
    // is a line of small print nobody reads twice. They now open from a button.
    let helpButton: HTMLButtonElement | null = null;
    let helpPanel: HTMLElement | null = null;
    let helpClose: HTMLButtonElement | null = null;
    if (transport.help && labels.hint) {
        helpButton = _button(`${p}-button ${p}-button-small ${p}-help`, _icon(p, 'help'), labels.help);
        helpButton.setAttribute('aria-expanded', 'false');
        row.appendChild(helpButton);

        helpPanel = _el('div', `${p}-help-panel`);
        helpPanel.hidden = true;
        helpPanel.setAttribute('role', 'dialog');
        helpPanel.setAttribute('aria-label', labels.help);
        for (const line of labels.hint.split(' \u00b7 ')) {
            helpPanel.appendChild(_el('p', `${p}-help-line`, line));
        }
        helpClose = _button(`${p}-button ${p}-button-small ${p}-help-close`, '\u2715', labels.closeHelp);
        helpPanel.appendChild(helpClose);
        controls.appendChild(helpPanel);
    }

    if (controls.childElementCount > 0) root.appendChild(controls);
    container.appendChild(root);

    embedPlayerIframe(picture, src, ratio, {...iframeParams, id: iframeId}, debug);
    // The frame already carries the ratio; the picture simply fills it
    picture.style.aspectRatio = '';

    /* ---------------- State ---------------- */

    let time = start;
    let state: MetaPlayerState = 'pause';
    /**
     * The player has run at least once, so it honours a seek and reports a
     * position worth believing.
     */
    let started = false;
    /**
     * Playback started muted at the first move, only so the player accepts the
     * seek and shows the picture; it is paused as soon as it starts.
     */
    let priming = false;
    let scrubbing = false;
    let destroyed = false;
    const volumeKey = typeof transport.rememberVolume === 'string' ? transport.rememberVolume : VOLUME_STORAGE_KEY;
    let volume = transport.rememberVolume
        ? _storedVolume(volumeKey, transport.initialVolume)
        : clamp(transport.initialVolume, 0, 1);
    let muted = false;
    let zoomState: MetaPlayerZoomState = {scale: 1, tx: 0, ty: 0};
    let fullscreen = false;
    let speedTimer: ReturnType<typeof setTimeout> | null = null;

    const listeners: {[K in keyof MetaPlayerEvents]: Set<MetaPlayerEvents[K]>} = {
        ready: new Set(),
        time: new Set(),
        state: new Set(),
        speed: new Set(),
        zoom: new Set(),
        volume: new Set(),
        fullscreen: new Set(),
        select: new Set(),
        layers: new Set()
    };

    function emit<K extends keyof MetaPlayerEvents>(event: K, ...args: Parameters<MetaPlayerEvents[K]>): void {
        listeners[event].forEach(listener => {
            try {
                (listener as (...a: unknown[]) => void)(...args);
            } catch (error) {
                if (debug) console.error(`[metaPlayer] listener of "${event}" threw`, error);
            }
        });
    }

    /* ---------------- The player ---------------- */

    const bridge = new PlayerBridge(
        () => picture.querySelector('iframe'),
        debug
    );

    function send(command: (string | number)[]): void {
        bridge.send(command);
    }

    /**
     * Re-affirms the chosen speed: some players go back to 1× after a change
     * of state or a seek.
     */
    function reaffirmSpeed(): void {
        if (speedIndex !== normalIndex) send(['speed', speeds[speedIndex]]);
    }

    /**
     * Sends the sound settings. The player only takes them once loaded, so
     * what was chosen before — or kept from an earlier visit — is sent at the
     * first playback.
     */
    function applySound(): void {
        send(['volume', volume]);
        send([muted || volume === 0 ? 'mute' : 'unmute']);
    }

    /**
     * Until the player has played, the picture does not follow a seek: it is
     * started muted, then paused at once.
     */
    function prime(): void {
        if (!primeOnSeek || started || priming) return;
        priming = true;
        send(['mute']);
        send(['play']);
    }

    bridge.onState = reported => {
        state = reported;
        if (reported === 'play' && !started) {
            started = true;
            applySound();
            if (time > START_EPSILON_S) bridge.seek(time);
        }
        if (reported === 'play' && priming) {
            priming = false;
            send(['pause']);
            bridge.seek(time);
            applySound(); // the priming muted the player: give the sound back
            return; // the button is left alone: playback was never asked for
        }
        renderPlay();
        reaffirmSpeed();
        emit('state', reported);
    };

    bridge.onProgress = reported => {
        const gesture = Boolean(jog?.isActive()) || scrubbing;
        if (!acceptsProgress(reported, time, performance.now() - bridge.lastSeekSentAt, gesture, started)) return;
        setTime(reported);
    };

    /* ---------------- Transport ---------------- */

    function setTime(next: number): void {
        time = clamp(next, 0, duration || Number.POSITIVE_INFINITY);
        render();
        emit('time', time);
    }

    /**
     * The jog wheel, a step, the progress bar: the position shown moves and
     * the player is told.
     */
    function moveTo(next: number): void {
        prime();
        setTime(next);
        bridge.seek(time);
    }

    /**
     * End of a gesture: the final position, and the speed re-affirmed since a
     * seek may have dropped it.
     */
    function settle(): void {
        bridge.seek(time);
        if (speedIndex === normalIndex) return;
        if (speedTimer !== null) clearTimeout(speedTimer);
        speedTimer = setTimeout(() => reaffirmSpeed(), SPEED_REAFFIRM_MS);
    }

    function seekTo(seconds: number): void {
        moveTo(seconds);
        settle();
    }

    function togglePlay(): void {
        priming = false; // a real request to play is not a priming
        send([state === 'play' ? 'pause' : 'play']);
    }

    function step(seconds: number): void {
        // An image means a still picture
        if (state === 'play' && Math.abs(seconds) <= frame) send(['pause']);
        if (jog) jog.step(seconds);
        else seekTo(time + seconds);
    }

    function setSpeed(index: number): number {
        const next = clamp(Math.round(index), 0, speeds.length - 1);
        if (next !== speedIndex) {
            speedIndex = next;
            send(['speed', speeds[speedIndex]]);
            emit('speed', speeds[speedIndex]);
        }
        renderSpeed();
        return speeds[speedIndex];
    }

    function setVolume(value: number): void {
        volume = Math.round(clamp(value, 0, 1) * 100) / 100;
        send(['volume', volume]);
        // Raising the slider gives the sound back
        if (muted && volume > 0) {
            muted = false;
            send(['unmute']);
        } else if (!muted && volume === 0) {
            muted = true;
            send(['mute']);
        }
        if (transport.rememberVolume) _storeVolume(volumeKey, volume);
        renderVolume();
        emit('volume', volume, muted);
    }

    function toggleMute(force?: boolean): boolean {
        muted = force ?? !muted;
        if (!muted && volume === 0) {
            volume = 0.5;
            send(['volume', volume]);
            if (transport.rememberVolume) _storeVolume(volumeKey, volume);
        }
        send([muted ? 'mute' : 'unmute']);
        renderVolume();
        emit('volume', volume, muted);
        return muted;
    }

    /* ---------------- Rendering ---------------- */

    function renderPlay(): void {
        if (!playButton) return;
        const playing = state === 'play';
        playButton.innerHTML = _icon(p, playing ? 'pause' : 'play');
        const label = playing ? labels.pause : labels.play;
        playButton.setAttribute('aria-label', label);
        playButton.title = label;
    }

    function renderSpeed(): void {
        if (!speedButton) return;
        const speed = speeds[speedIndex];
        speedButton.textContent = formatSpeed(speed, locale, speedOptions ? (speedOptions.decimals ?? 2) : 2);
        speedButton.classList.toggle('is-slow', speedIndex < normalIndex);
        speedButton.classList.toggle('is-fast', speedIndex > normalIndex);
        speedButton.setAttribute('aria-label', `${labels.speed} ${speedButton.textContent} — ${labels.normalSpeed}`);
        if (slowerButton) slowerButton.disabled = speedIndex === 0;
        if (fasterButton) fasterButton.disabled = speedIndex === speeds.length - 1;
    }

    function renderVolume(): void {
        if (!muteButton || !volumeSlider) return;
        const silent = muted || volume === 0;
        muteButton.innerHTML = _icon(p, silent ? 'volumeMuted' : volume < 0.5 ? 'volumeLow' : 'volumeHigh');
        const label = silent ? labels.unmute : labels.mute;
        muteButton.setAttribute('aria-label', label);
        muteButton.setAttribute('aria-pressed', String(silent));
        muteButton.title = label;
        volumeSlider.value = String(silent ? 0 : volume);
    }

    function renderZoom(): void {
        picture.style.transform = `translate(${zoomState.tx}px, ${zoomState.ty}px) scale(${zoomState.scale})`;
        if (zoomReset) zoomReset.hidden = zoomState.scale <= 1.001;
        if (zoomOutButton) zoomOutButton.disabled = zoomState.scale <= 1;
        layerSet?.setZoom(zoomState);
    }

    function render(): void {
        if (elapsed) elapsed.textContent = formatTime(time, showHours);
        if (duration > 0) {
            const percent = clamp((time / duration) * 100, 0, 100);
            if (progressFill) progressFill.style.width = `${percent}%`;
            if (progressThumb) progressThumb.style.left = `${percent}%`;
            if (remaining) remaining.textContent = `-${formatTime(Math.max(0, duration - time), showHours)}`;
        } else if (remaining) {
            remaining.textContent = '-:--';
        }
        for (const slider of [progress, jogElement]) {
            if (!slider) continue;
            if (duration > 0) slider.setAttribute('aria-valuemax', String(Math.round(duration)));
            slider.setAttribute('aria-valuenow', String(Math.round(time)));
            slider.setAttribute('aria-valuetext', formatTime(time, showHours));
        }
        layerSet?.setTime(time);
    }

    /* ---------------- The parts ---------------- */

    const jog = jogOptions && jogElement
        ? new JogWheel(
            jogElement,
            {
                getTime: () => time,
                getDuration: () => duration,
                moveTo,
                onEnd: settle
            },
            jogOptions,
            showHours
        )
        : null;

    const zoom = zoomOptions
        ? new ZoomController(frameBox, overlay, zoomOptions, togglePlay)
        : null;
    if (zoom) {
        zoom.onChange = next => {
            zoomState = next;
            renderZoom();
            emit('zoom', next);
        };
    } else {
        // Without the zoom the overlay is only there so a click on the picture
        // reaches the page: the player's own interface is off.
        overlay.addEventListener('click', () => togglePlay());
    }

    const layerSet = timeline || stage
        ? new LayerSet(
            p,
            timeline,
            stage,
            labels,
            {
                getDuration: () => duration,
                seek: seekTo,
                onSelect: (items, layer) => emit('select', items, layer)
            },
            showHours
        )
        : null;

    const curve = peek && audienceOptions
        ? new AudienceCurve(peek, p, labels, audienceOptions, showHours, locale)
        : null;

    /* ---------------- Wiring ---------------- */

    const cleanups: (() => void)[] = [];

    function listen(node: EventTarget, type: string, handler: EventListener, opts?: AddEventListenerOptions): void {
        node.addEventListener(type, handler, opts);
        cleanups.push(() => node.removeEventListener(type, handler, opts));
    }

    /** The help bubble: opens from the button, closes on a click away or Escape. */
    if (helpButton && helpPanel && helpClose) {
        const panel = helpPanel;
        const button = helpButton;
        const close = helpClose;
        const openHelp = (open: boolean) => {
            panel.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
            if (open) close.focus();
            else button.focus();
        };
        button.addEventListener('click', event => {
            event.stopPropagation();
            openHelp(panel.hidden);
        });
        close.addEventListener('click', () => openHelp(false));
        listen(document, 'click', event => {
            if (!panel.hidden && !panel.contains(event.target as Node)) openHelp(false);
        });
        root.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !panel.hidden) {
                event.stopPropagation();
                openHelp(false);
            }
        });
    }

    playButton?.addEventListener('click', () => togglePlay());
    previousFrameButton?.addEventListener('click', () => step(-frame));
    nextFrameButton?.addEventListener('click', () => step(frame));
    slowerButton?.addEventListener('click', () => setSpeed(speedIndex - 1));
    fasterButton?.addEventListener('click', () => setSpeed(speedIndex + 1));
    speedButton?.addEventListener('click', () => setSpeed(normalIndex));
    zoomOutButton?.addEventListener('click', () => zoom?.zoomBy(1 / (zoomOptions ? (zoomOptions.step ?? 1.5) : 1.5)));
    zoomInButton?.addEventListener('click', () => zoom?.zoomBy(zoomOptions ? (zoomOptions.step ?? 1.5) : 1.5));
    zoomReset?.addEventListener('click', () => zoom?.reset());
    muteButton?.addEventListener('click', () => toggleMute());
    volumeSlider?.addEventListener('input', () => setVolume(Number(volumeSlider?.value)));

    if (speedButton && speedOptions && (speedOptions.wheel ?? true)) {
        speedButton.addEventListener('wheel', event => {
            event.preventDefault();
            setSpeed(speedIndex + (event.deltaY < 0 ? 1 : -1));
        }, {passive: false});
    }
    // The arrows set the speed here, not the position
    speedButton?.addEventListener('keydown', event => {
        const steps: Record<string, number> = {ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1};
        if (event.key in steps) setSpeed(speedIndex + steps[event.key]);
        else if (event.key === 'Home') setSpeed(normalIndex);
        else return;
        event.preventDefault();
        event.stopPropagation();
    });

    /* ---------------- The progress bar ---------------- */

    function ratioAt(clientX: number): number | null {
        const box = progress?.getBoundingClientRect();
        if (!box || box.width <= 0) return null;
        return clamp((clientX - box.left) / box.width, 0, 1);
    }

    if (progress) {
        if (duration <= 0) progress.classList.add('is-disabled');
        progress.addEventListener('pointerdown', event => {
            if (duration <= 0) return;
            scrubbing = true;
            progress.setPointerCapture?.(event.pointerId);
            const at = ratioAt(event.clientX);
            if (at !== null) moveTo(at * duration);
        });
        progress.addEventListener('pointermove', event => {
            if (!scrubbing) return;
            const at = ratioAt(event.clientX);
            if (at !== null) moveTo(at * duration);
        });
        const endScrub = (event: PointerEvent) => {
            if (!scrubbing) return;
            scrubbing = false;
            // A finger leaves no hover behind: the curve closes with the gesture
            if (event.pointerType !== 'mouse') hover(null);
            settle();
        };
        progress.addEventListener('pointerup', endScrub);
        progress.addEventListener('pointercancel', endScrub);
        progress.addEventListener('keydown', event => {
            const steps: Record<string, number> = {
                ArrowRight: event.shiftKey ? 5 : 1,
                ArrowLeft: event.shiftKey ? -5 : -1
            };
            if (!(event.key in steps)) return;
            event.preventDefault();
            event.stopPropagation();
            seekTo(time + steps[event.key]);
        });
    }

    /**
     * The pointer over the progress bar, or a finger on it: the audience curve
     * opens and reads that position.
     */
    function hover(at: number | null): void {
        curve?.hover(at, at === null ? 0 : at * duration);
    }

    if (curve && progress && duration > 0) {
        const track = (event: PointerEvent) => hover(ratioAt(event.clientX));
        progressArea.addEventListener('pointerenter', track);
        progressArea.addEventListener('pointermove', track);
        progressArea.addEventListener('pointerleave', () => hover(null));
    }

    /* ---------------- The keyboard ---------------- */

    if (keyboard) {
        root.addEventListener('keydown', event => {
            const node = event.target as HTMLElement;
            // The markers, the shapes and the speed handle their own keys
            if (node.closest(`input, textarea, select, .${p}-timeline, .${p}-stage, .${p}-speed, .${p}-progress`)) return;

            const frameKeys = keyboard.frameKeys;
            let seconds: number | null = null;
            if (event.key === 'ArrowRight') seconds = event.shiftKey ? keyboard.bigStep! : keyboard.step!;
            else if (event.key === 'ArrowLeft') seconds = -(event.shiftKey ? keyboard.bigStep! : keyboard.step!);
            else if (event.key === 'PageUp') seconds = keyboard.pageStep!;
            else if (event.key === 'PageDown') seconds = -keyboard.pageStep!;
            else if (frameKeys && event.key === frameKeys[1]) seconds = frame;
            else if (frameKeys && event.key === frameKeys[0]) seconds = -frame;

            if (seconds !== null) {
                event.preventDefault();
                step(seconds);
                return;
            }
            if (keyboard.homeEnd && (event.key === 'Home' || event.key === 'End')) {
                event.preventDefault();
                seekTo(event.key === 'Home' ? 0 : duration);
                return;
            }
            if (keyboard.togglePlay && (event.key === ' ' || event.key === 'Enter') && !node.closest('button')) {
                event.preventDefault();
                togglePlay();
            }
        });
    }

    /* ---------------- Fullscreen ---------------- */

    async function toggleFullscreen(force?: boolean): Promise<boolean> {
        if (!fullscreenApi) return false;
        const wanted = force ?? fullscreenApi.element() !== root;
        try {
            if (wanted) await fullscreenApi.request(root);
            else if (fullscreenApi.element()) await fullscreenApi.exit();
        } catch {
            // Refused: no user gesture, or forbidden by the document
        }
        return fullscreenApi.element() === root;
    }

    if (fullscreenApi) {
        const onFullscreenChange = () => {
            fullscreen = fullscreenApi.element() === root;
            root.classList.toggle('is-fullscreen', fullscreen);
            if (fullscreenButton) {
                const label = fullscreen ? labels.exitFullscreen : labels.fullscreen;
                fullscreenButton.innerHTML = _icon(p, fullscreen ? 'exitFullscreen' : 'fullscreen');
                fullscreenButton.setAttribute('aria-label', label);
                fullscreenButton.title = label;
            }
            // The frame changed size: the bounds of the pan did too
            zoom?.refresh();
            emit('fullscreen', fullscreen);
        };
        fullscreenApi.events.forEach(event => listen(document, event, onFullscreenChange));
        fullscreenButton?.addEventListener('click', () => void toggleFullscreen());
    }

    /* ---------------- Layers and audience ---------------- */

    function buildToggles(): void {
        if (!toggles || !layerSet) return;
        toggles.innerHTML = '';
        for (const layer of layerSet.getLayers()) {
            const wrapper = _el('label', `${p}-layer-toggle ${p}-layer-${layer.id}-toggle`);
            if (layer.color) wrapper.style.setProperty('--sl-meta-layer-color', layer.color);
            const checkbox = _el('input', '');
            checkbox.type = 'checkbox';
            checkbox.checked = layer.visible ?? true;
            checkbox.addEventListener('change', () => {
                layerSet.toggle(layer.id, checkbox.checked);
                emit('layers', layer);
            });
            wrapper.append(checkbox, document.createTextNode(` ${layer.label ?? layer.id}`));
            toggles.appendChild(wrapper);
        }
    }

    if (layerSet) {
        layerSet.setLayers(layers);
        buildToggles();
        // A layer fetching its items draws as soon as they arrive
        for (const layer of layers) {
            if (!layer.load) continue;
            void (async () => {
                try {
                    const items = await layer.load!();
                    if (!destroyed && Array.isArray(items)) {
                        layerSet.setItems(layer.id, items);
                        emit('layers', layer);
                    }
                } catch (error) {
                    if (debug) console.warn(`[metaPlayer] layer "${layer.id}" could not be loaded`, error);
                }
            })();
        }
    }

    const audienceLoader = audienceOptions ? audienceOptions.load : undefined;

    async function reloadAudience(): Promise<boolean> {
        if (!curve || !audienceLoader) return false;
        try {
            const next = await audienceLoader();
            if (destroyed || !Array.isArray(next)) return false;
            curve.setCurve(next);
            return true;
        } catch (error) {
            if (debug) console.warn('[metaPlayer] the audience curve could not be loaded', error);
            return false;
        }
    }

    if (curve && audienceLoader) void reloadAudience();

    /* ---------------- Ready ---------------- */

    renderPlay();
    renderSpeed();
    renderVolume();
    renderZoom();
    render();
    if (speedIndex !== normalIndex) reaffirmSpeed();

    if (debug) {
        console.debug('src:', src);
        console.debug('duration:', duration, '| ratio:', ratio, '| fps:', fps);
        console.groupEnd();
    }

    // Let the integration subscribe before the event fires
    setTimeout(() => {
        if (!destroyed) emit('ready', media);
    }, 0);

    const data: MetaPlayerData = {media, duration, ratio, fps};

    return {
        res: true,
        data,
        errors: null,
        play: () => {
            priming = false;
            send(['play']);
        },
        pause: () => send(['pause']),
        togglePlay,
        seek: seekTo,
        step: seconds => step(seconds),
        stepFrames: frames => step(frames * frame),
        getTime: () => time,
        getDuration: () => duration,
        getState: () => state,
        setSpeed: speed => setSpeed(nearestSpeedIndex(speeds, speed)),
        getSpeed: () => speeds[speedIndex],
        setVolume,
        getVolume: () => volume,
        toggleMute,
        zoomBy: factor => zoom?.zoomBy(factor),
        setZoom: next => zoom?.setState(next),
        getZoom: () => zoomState,
        resetZoom: () => zoom?.reset(),
        setLayerItems: (layerId, items) => layerSet?.setItems(layerId, items) ?? false,
        reloadLayer: async layerId => {
            const layer = layerSet?.getLayer(layerId);
            if (!layerSet || !layer?.load) return false;
            try {
                const items = await layer.load();
                if (destroyed || !Array.isArray(items)) return false;
                layerSet.setItems(layerId, items);
                emit('layers', layer);
                return true;
            } catch (error) {
                if (debug) console.warn(`[metaPlayer] layer "${layerId}" could not be reloaded`, error);
                return false;
            }
        },
        toggleLayer: (layerId, force) => {
            const reached = layerSet?.toggle(layerId, force) ?? false;
            const layer = layerSet?.getLayer(layerId);
            if (layer) {
                buildToggles();
                emit('layers', layer);
            }
            return reached;
        },
        addLayer: layer => {
            layerSet?.addLayer(layer);
            buildToggles();
            emit('layers', layer);
        },
        removeLayer: layerId => {
            const removed = layerSet?.removeLayer(layerId) ?? false;
            if (removed) buildToggles();
            return removed;
        },
        getLayers: () => layerSet?.getLayers() ?? [],
        highlight: (layerId, itemIds) => layerSet?.highlight(layerId, itemIds),
        setAudienceCurve: next => curve?.setCurve(next),
        reloadAudience,
        isFullscreen: () => fullscreen,
        toggleFullscreen,
        on: (event, listener) => {
            listeners[event].add(listener as never);
            return () => listeners[event].delete(listener as never);
        },
        off: (event, listener) => {
            listeners[event].delete(listener as never);
        },
        getElements: () => ({
            root,
            frame: frameBox,
            picture,
            stage,
            iframe: picture.querySelector('iframe'),
            controls: controls.childElementCount > 0 ? controls : null,
            timeline
        }),
        send,
        destroy: () => {
            destroyed = true;
            if (speedTimer !== null) clearTimeout(speedTimer);
            bridge.destroy();
            jog?.destroy();
            zoom?.destroy();
            layerSet?.destroy();
            curve?.destroy();
            cleanups.forEach(off => off());
            Object.values(listeners).forEach(set => set.clear());
            container.innerHTML = '';
        }
    };
}
