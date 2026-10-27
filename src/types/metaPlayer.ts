// path: src/types/metaPlayer.ts

import {BaseOptions, CallbackResponse, Media} from "./api";
import {IframeParams, PlayerParams} from "./player";

/**
 * Where a layer draws its items.
 */
export enum LayerRender {
    /**
     * Markers under the progress bar, at the time of each item.
     */
    Timeline = 'timeline',
    /**
     * Shapes inside the picture, at the coordinates of each item, while its
     * time window holds the playback position. They follow the zoom.
     */
    Stage = 'stage',
    /**
     * Both at once: a marker on the timeline and a shape in the picture.
     */
    Both = 'both'
}

/**
 * Shape used to draw an item on the stage.
 */
export enum LayerShape {
    /**
     * A dot at (`x`, `y`), with the label beside it. Default when the item
     * carries no size.
     */
    Point = 'point',
    /**
     * A rectangle from (`x`, `y`) of size (`w`, `h`). Default when the item
     * carries a size.
     */
    Box = 'box',
    /**
     * The label alone, with no marker.
     */
    Label = 'label'
}

/**
 * One item of a layer: a comment, a tag, a chapter, an event — anything that
 * happens at a moment of the media, possibly at a place in the picture.
 *
 * **Time.** `at` places an instant, `from` / `to` a range. An item with
 * neither is dropped. On the timeline a range is drawn as a span, an instant
 * as a marker. On the stage an instant is visible for `activeWindow` seconds
 * (3 by default).
 *
 * **Space.** `x` and `y` are fractions of the picture (0 → 1) from its
 * top-left corner, so they survive any player size; `w` and `h`, also
 * fractions, turn the item into a box. They are only needed by
 * {@link LayerRender.Stage}.
 */
export interface MetaPlayerLayerItem {
    /**
     * Identifier of the item, used by `highlight()` and returned by
     * `onSelect`. Defaults to the index in the list.
     */
    id?: string | number;
    /**
     * The moment of the item, in seconds.
     */
    at?: number;
    /**
     * Start of the range, in seconds. Used with `to`, instead of `at`.
     */
    from?: number;
    /**
     * End of the range, in seconds.
     */
    to?: number;
    /**
     * Horizontal position in the picture, 0 (left) to 1 (right).
     */
    x?: number;
    /**
     * Vertical position in the picture, 0 (top) to 1 (bottom).
     */
    y?: number;
    /**
     * Width of the box, as a fraction of the picture.
     */
    w?: number;
    /**
     * Height of the box, as a fraction of the picture.
     */
    h?: number;
    /**
     * Short text: drawn beside the shape on the stage, and read by screen
     * readers on the timeline marker.
     */
    label?: string;
    /**
     * Longer text, shown in the preview card of the timeline marker.
     */
    text?: string;
    /**
     * Who wrote it, shown in the preview card before the text.
     */
    author?: string;
    /**
     * Colour of this item, overriding the colour of its layer. Any CSS colour.
     */
    color?: string;
    /**
     * Shape used on the stage, overriding the one of the layer.
     */
    shape?: LayerShape;
    /**
     * Extra class added to the marker and to the stage shape.
     */
    className?: string;
    /**
     * Anything the integration wants handed back by `onSelect` — the comment
     * itself, a database row, a route to open.
     */
    data?: unknown;
}

/**
 * A group of timeline items too close together to be drawn apart, merged into
 * one marker carrying their count.
 */
export interface MetaPlayerLayerCluster {
    /**
     * Where the group sits, as a fraction of the duration (0 → 1).
     */
    position: number;
    /**
     * Items of the group, in time order.
     */
    items: MetaPlayerLayerItem[];
}

/**
 * A layer of the meta player: a named set of items drawn on the timeline, in
 * the picture, or both.
 *
 * Each layer is independent — its own data, its own colour, its own row of the
 * timeline, its own handler — and carries the class `{prefix}-layer-{id}` on
 * every element it generates, so a stylesheet can treat comments and tags
 * differently without the SDK knowing what either means.
 */
export interface MetaPlayerLayer {
    /**
     * Identifier of the layer, unique in the player. Also used in the CSS
     * classes of its elements: `{prefix}-layer-{id}`.
     */
    id: string;
    /**
     * Name of the layer, used as the accessible name of its timeline lane, on
     * the tooltip of its icon and in the layer toggles.
     */
    label?: string;
    /**
     * The mark identifying the lane, in the gutter before its track — so three
     * lanes of identical markers can still be told apart at a glance. Markup
     * when it starts with `<` (an inline `<svg>`), otherwise text: a letter or
     * a single character.
     * @default the first letter of `label`
     */
    icon?: string;
    /**
     * Where the layer draws.
     * @default LayerRender.Timeline
     */
    render?: LayerRender;
    /**
     * Draws the layer. A hidden layer keeps its items and can be brought back
     * with `showLayer()`.
     * @default true
     */
    visible?: boolean;
    /**
     * Items of the layer. Replaced wholesale by `setLayerItems()`.
     */
    items?: MetaPlayerLayerItem[];
    /**
     * Fetches the items instead of passing them. Called once when the player
     * is built, and again by `reloadLayer()`.
     */
    load?: () => MetaPlayerLayerItem[] | Promise<MetaPlayerLayerItem[]>;
    /**
     * Colour of the layer, any CSS colour. Exposed on its elements as the
     * custom property `--sl-meta-layer-color`, so the default stylesheet and
     * yours can both read it.
     * @default the accent colour of the theme
     */
    color?: string;
    /**
     * Shape used on the stage by the items that do not choose one.
     * @default LayerShape.Box for an item carrying `w` / `h`, LayerShape.Point otherwise
     */
    shape?: LayerShape;
    /**
     * Merges the timeline markers closer than `minGapPx` into one marker with
     * a count.
     * @default true
     */
    cluster?: boolean;
    /**
     * Distance in pixels below which two markers merge.
     * @default 12
     */
    minGapPx?: number;
    /**
     * How long an instant item stays "current": its marker lights up and its
     * stage shape shows, for that many seconds after its time.
     * @default 3
     */
    activeWindow?: number;
    /**
     * Row of the timeline the layer draws on, counted from the progress bar
     * down. Two layers sharing a row share its height.
     *
     * **Three lanes are drawn at most.** Past that the bar reads as a wall of
     * dots and no one can tell the rows apart; the further layers keep their
     * items and their stage shapes, they simply do not take a lane.
     * @default its rank among the visible timeline layers
     */
    row?: number;
    /**
     * Shows the preview card when a marker is hovered or focused.
     * @default true
     */
    preview?: boolean;
    /**
     * Number of items detailed in the preview card before "and N more".
     * @default 4
     */
    previewMaxItems?: number;
    /**
     * Moves the playback position to the item when a marker is clicked.
     * @default true
     */
    seekOnSelect?: boolean;
    /**
     * Scales the stage shape with the picture when zooming in. A box framing
     * something in the image must (it tracks the image), a pin marking a point
     * usually must not (it would grow out of the frame).
     * @default true for a box, false for a point or a label
     */
    scaleWithPicture?: boolean;
    /**
     * Keeps every stage shape of the layer visible whatever the position, for
     * a layer of landmarks rather than of events.
     * @default false
     */
    stageAlwaysVisible?: boolean;
    /**
     * Extra class added to every element of the layer.
     */
    className?: string;
    /**
     * Called when a marker or a stage shape is clicked, with the items it
     * stands for.
     */
    onSelect?: (items: MetaPlayerLayerItem[], layer: MetaPlayerLayer) => void;
}

/**
 * The jog wheel: a notched cylinder turned with a finger, a drag or the mouse
 * wheel, which scrolls the media and keeps its momentum when let go.
 */
export interface MetaPlayerJogOptions {
    /**
     * Seconds of media per pixel of gesture. The sensitivity is derived from
     * the duration — a 30 s clip and a two-hour match are not browsed at the
     * same pace — then held between these bounds.
     * @default 0.03
     */
    minSecPerPx?: number;
    /**
     * @default 0.35
     */
    maxSecPerPx?: number;
    /**
     * The duration the sensitivity is divided by to get seconds per pixel,
     * before the bounds apply. A longer media scrolls faster.
     * @default 6000
     */
    pace?: number;
    /**
     * Sensitivity multiplier while the fine key is held.
     * @default 0.2
     */
    fineFactor?: number;
    /**
     * Key holding the fine mode. `false` binds nothing.
     * @default "Shift"
     */
    fineKey?: string | false;
    /**
     * Decay constant of the momentum, in seconds. Higher coasts longer.
     * @default 0.55
     */
    inertia?: number;
    /**
     * Speed in seconds per second below which the wheel stops.
     * @default 0.08
     */
    inertiaStop?: number;
    /**
     * Ceiling of the momentum, in seconds per second, so the wheel stays
     * controllable.
     * @default 240
     */
    maxVelocity?: number;
    /**
     * Pixels of gesture one notch of the mouse wheel is worth.
     * @default 40
     */
    wheelPxPerNotch?: number;
    /**
     * Shows the position and the travelled distance over the wheel while it
     * turns.
     * @default true
     */
    readout?: boolean;
    /**
     * Writes the position of the readout to the hundredth of a second, for
     * image-by-image work.
     * @default true
     */
    preciseReadout?: boolean;
    /**
     * Labels the two directions on the wheel.
     * @default true
     */
    directions?: boolean;
}

/**
 * The playback speed selector: a notched readout, a pair of buttons, or both.
 */
export interface MetaPlayerSpeedOptions {
    /**
     * Available speeds, in increasing order, `1` included. The default has 21
     * notches: ten slower, normal, ten faster. Browsers usually mute the sound
     * below 0.25× and above 4×, which is their decision, not the player's.
     * @default [0.1, 0.2, 0.25, 0.33, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.5, 1.75, 2, 2.5, 3, 4, 8]
     */
    speeds?: number[];
    /**
     * Speed selected at start. Snapped to the nearest available one.
     * @default 1
     */
    initial?: number;
    /**
     * Adds the − and + buttons beside the readout, for fingers.
     * @default true
     */
    buttons?: boolean;
    /**
     * Changes the speed with the mouse wheel over the readout.
     * @default true
     */
    wheel?: boolean;
    /**
     * Number of decimals of the readout.
     * @default 2
     */
    decimals?: number;
}

/**
 * Zoom and pan inside the picture.
 *
 * It works on a cross-origin player because a transparent overlay catches the
 * gestures the iframe would otherwise swallow, and the picture is moved by a
 * CSS transform on the element holding it. The controls stay outside that
 * element and never move.
 */
export interface MetaPlayerZoomOptions {
    /**
     * How far past the definition of the stream the picture may be enlarged:
     * 3 means three times its pixels, not three times its size on screen.
     * @default 3
     */
    maxOversample?: number;
    /**
     * Height in pixels of the stream being played, used to work out the
     * maximum zoom. Pass the height you cap the player to.
     * @default 1080
     */
    streamHeight?: number;
    /**
     * Zooms with the mouse wheel, around the cursor.
     * @default true
     */
    wheel?: boolean;
    /**
     * Zooms with two fingers, around their middle.
     * @default true
     */
    pinch?: boolean;
    /**
     * Factor applied by the − and + buttons.
     * @default 1.5
     */
    step?: number;
    /**
     * Adds the − and + buttons.
     * @default true
     */
    buttons?: boolean;
    /**
     * Shows the button going back to the whole picture while zoomed in.
     * @default true
     */
    resetButton?: boolean;
    /**
     * A click or a tap on the picture plays or pauses. Turn it off when the
     * picture is for working on rather than watching.
     * @default true
     */
    clickTogglesPlay?: boolean;
    /**
     * A double click, or a double tap, goes back to the whole picture.
     * @default true
     */
    doubleClickResets?: boolean;
}

/**
 * The audience curve drawn over the progress bar: which parts of the media
 * were watched most.
 *
 * The figures come from the REST API
 * (`GET /analytics/engagement/{media_id}/qualities/{from}/{to}`), which runs
 * on your server, never in a browser — an API key acts as the account that
 * created it. So the curve is handed to the player, as an array or by a
 * loader hitting your own backend. {@link audienceBuckets} turns the
 * per-second counts of that report into the array this expects.
 */
export interface MetaPlayerAudienceOptions {
    /**
     * The curve: **one playback count per slice** of the media — how many times
     * that slice was played. Any length; it is stretched over the duration, and
     * drawn against its own busiest slice.
     *
     * Deliberately not a percentage. The height of the curve already shows
     * where the views are; the figure a viewer reads has to be a number of
     * views, not a share of the busiest moment of that one media.
     * {@link audienceBuckets} produces exactly this from the engagement report.
     */
    curve?: number[];
    /**
     * Fetches the curve instead of passing it. Called once when the player is
     * built, and again by `reloadAudience()`.
     */
    load?: () => number[] | Promise<number[]>;
    /**
     * `peek` opens the curve above the progress bar while it is hovered or
     * touched, `always` keeps it there.
     * @default MetaPlayerAudienceDisplay.Peek
     */
    display?: MetaPlayerAudienceDisplay;
    /**
     * Height of the curve, in pixels.
     * @default 40
     */
    height?: number;
    /**
     * Rounds the corners of the curve, 0 for straight segments and 1 for the
     * roundest reading of the same points.
     * @default 0.6
     */
    smoothing?: number;
    /**
     * Shows the timecode, and the number of views of that slice, in a tooltip.
     * @default true
     */
    tooltip?: boolean;
    /**
     * Height the curve is drawn against, in views. Left out, the curve uses its
     * own busiest slice; set it to compare several medias on one scale.
     */
    peak?: number;
}

/**
 * How the audience curve is displayed.
 */
export enum MetaPlayerAudienceDisplay {
    /**
     * Opens over the progress bar while it is hovered or touched.
     */
    Peek = 'peek',
    /**
     * Always drawn above the progress bar.
     */
    Always = 'always'
}

/**
 * The elements of the control bar. Every one of them can be left out; the bar
 * itself disappears when nothing is left in it.
 */
export interface MetaPlayerTransportOptions {
    /**
     * Play / pause button. Class: `{prefix}-play`
     * @default true
     */
    play?: boolean;
    /**
     * Draggable progress bar. Class: `{prefix}-progress`
     * @default true
     */
    progress?: boolean;
    /**
     * Elapsed position. Class: `{prefix}-elapsed`
     * @default true
     */
    elapsed?: boolean;
    /**
     * Time left, counted down. Class: `{prefix}-remaining`
     * @default true
     */
    remaining?: boolean;
    /**
     * Mute button and volume slider. Classes: `{prefix}-mute`, `{prefix}-volume`
     * @default true
     */
    volume?: boolean;
    /**
     * Volume at start, 0 to 1. Kept in `localStorage` when `rememberVolume`.
     * @default 1
     */
    initialVolume?: number;
    /**
     * Keeps the volume from one visit to the next, in the browser of the
     * viewer. Pass a string to choose the storage key.
     * @default true
     */
    rememberVolume?: boolean | string;
    /**
     * Fullscreen button. It puts the whole player — picture, bar, layers — in
     * fullscreen, not the iframe, so the controls stay available and the
     * zoom holds. Left out where an arbitrary element cannot be put in
     * fullscreen, an iPhone for instance.
     * Class: `{prefix}-fullscreen`
     * @default true
     */
    fullscreen?: boolean;
    /**
     * The two buttons stepping one image back and forth.
     * Classes: `{prefix}-frame-previous`, `{prefix}-frame-next`
     * @default true
     */
    frameSteps?: boolean;
    /**
     * A checkbox per layer, to show and hide it.
     * Class: `{prefix}-layer-toggles`
     * @default false
     */
    layerToggles?: boolean;
    /**
     * The help button, which opens the gestures and shortcuts in a bubble.
     * They used to sit under the bar at all times, which is a line of small
     * print nobody reads twice.
     * Classes: `{prefix}-help`, `{prefix}-help-panel`
     * @default true
     */
    help?: boolean;
}

/**
 * Keyboard shortcuts, answered while the focus is inside the player and out of
 * a form field.
 *
 * A click inside the picture gives the keyboard to the iframe, which has its
 * own shortcuts: the overlay catching the gestures also keeps the focus in the
 * page, so these keep answering.
 */
export interface MetaPlayerKeyboardOptions {
    /**
     * ← and → move by that many seconds.
     * @default 1
     */
    step?: number;
    /**
     * ← and → with Shift move by that many seconds.
     * @default 5
     */
    bigStep?: number;
    /**
     * PageUp and PageDown move by that many seconds.
     * @default 30
     */
    pageStep?: number;
    /**
     * Keys stepping one image back and forth. `false` binds nothing.
     * @default [",", "."]
     */
    frameKeys?: [string, string] | false;
    /**
     * Space and Enter play or pause.
     * @default true
     */
    togglePlay?: boolean;
    /**
     * Home and End jump to the beginning and to the end.
     * @default true
     */
    homeEnd?: boolean;
}

/**
 * Texts of the meta player, for localization. Every default is in English.
 */
export interface MetaPlayerLabels {
    /** @default "Play" */
    play?: string;
    /** @default "Pause" */
    pause?: string;
    /** @default "Position in the media" */
    progress?: string;
    /** @default "Jog wheel: drag, scroll, or use the arrow keys" */
    jog?: string;
    /** @default "backward" */
    backward?: string;
    /** @default "forward" */
    forward?: string;
    /** @default "Playback speed" */
    speed?: string;
    /** @default "Slow down" */
    slower?: string;
    /** @default "Speed up" */
    faster?: string;
    /** @default "Back to 1×" */
    normalSpeed?: string;
    /** @default "Zoom out" */
    zoomOut?: string;
    /** @default "Zoom in" */
    zoomIn?: string;
    /** @default "Back to the whole picture" */
    zoomReset?: string;
    /** @default "Previous image" */
    previousFrame?: string;
    /** @default "Next image" */
    nextFrame?: string;
    /** @default "Mute" */
    mute?: string;
    /** @default "Unmute" */
    unmute?: string;
    /** @default "Volume" */
    volume?: string;
    /** @default "Fullscreen" */
    fullscreen?: string;
    /** @default "Exit fullscreen" */
    exitFullscreen?: string;
    /** @default "audience" */
    audience?: string;
    /** Singular of the audience readout. @default "view" */
    view?: string;
    /** Plural of the audience readout. @default "views" */
    views?: string;
    /** Label of the help button. @default "Help" */
    help?: string;
    /** Label of the button closing the help. @default "Close" */
    closeHelp?: string;
    /** @default "Audience curve not available yet" */
    noAudience?: string;
    /** @default "Layers" */
    layers?: string;
    /** @default "and {count} more" */
    more?: string;
    /** @default "Unable to load the media." */
    error?: string;
    /**
     * The line of gestures and shortcuts under the bar.
     * @default "Jog wheel: drag or scroll (Shift: fine) · ← → 1 s, Shift 5 s, Page ±30 s, « , » « . » one image · Space: play · Picture: scroll to zoom, drag to move, double click to reset"
     */
    hint?: string;
}

/**
 * Colours of the meta player, written as CSS custom properties on its root
 * element. Any CSS colour.
 *
 * They are the quick way to theme the player; for anything further, every
 * element carries a class built from `classPrefix` and the default stylesheet
 * can be left out with `injectStyles: false`.
 */
export interface MetaPlayerTheme {
    /**
     * Background of the control bar. Custom property `--sl-meta-bar`.
     * @default "#111827"
     */
    bar?: string;
    /**
     * Text and icons of the bar. Custom property `--sl-meta-text`.
     * @default "#ffffff"
     */
    text?: string;
    /**
     * Active elements: progress, jog cursor, markers, focus rings. Custom
     * property `--sl-meta-accent`.
     * @default "#fbbf24"
     */
    accent?: string;
    /**
     * Text drawn over the accent colour. Custom property
     * `--sl-meta-accent-text`.
     * @default "#1f2937"
     */
    accentText?: string;
    /**
     * Background behind the picture. Custom property `--sl-meta-backdrop`.
     * @default "#000000"
     */
    backdrop?: string;
    /**
     * Stroke of the audience curve; its fill is derived from it. Custom
     * property `--sl-meta-curve`.
     * @default the accent colour
     */
    curve?: string;
    /**
     * Radius of the player and of its buttons. Custom property
     * `--sl-meta-radius`.
     * @default "10px"
     */
    radius?: string;
}

/**
 * State of the embedded player, as it reports it.
 */
export type MetaPlayerState = 'play' | 'pause' | 'ended';

/**
 * Zoom and pan of the picture: the scale, and the translation in pixels of the
 * displayed picture.
 */
export interface MetaPlayerZoomState {
    scale: number;
    tx: number;
    ty: number;
}

/**
 * Events emitted by the meta player, through `on()`.
 *
 * - `ready`: the player is built and the media known,
 * - `time`: the position moved, whether the media plays or was scrubbed,
 * - `state`: playback started, paused or ended,
 * - `speed`: the playback speed changed,
 * - `zoom`: the picture was zoomed or panned,
 * - `volume`: the volume or the mute state changed,
 * - `fullscreen`: the player entered or left fullscreen,
 * - `select`: a marker or a stage shape was clicked,
 * - `layers`: the items or the visibility of a layer changed.
 */
export interface MetaPlayerEvents {
    ready: (media: Media | null) => void;
    time: (seconds: number) => void;
    state: (state: MetaPlayerState) => void;
    speed: (speed: number) => void;
    zoom: (state: MetaPlayerZoomState) => void;
    volume: (volume: number, muted: boolean) => void;
    fullscreen: (on: boolean) => void;
    select: (items: MetaPlayerLayerItem[], layer: MetaPlayerLayer) => void;
    layers: (layer: MetaPlayerLayer) => void;
}

/**
 * Configuration of {@link generateMetaPlayer}.
 *
 * One source of the media is required: `mediaId`, `permalink` or a ready-made
 * `playerUrl`.
 */
export interface MetaPlayerOptions {
    /**
     * Media ID to play.
     */
    mediaId?: string;
    /**
     * Permalink to play, instead of `mediaId`.
     */
    permalink?: string;
    /**
     * A player URL already built — with its token, for a secured media, or
     * issued by your backend. The parameters the meta player needs
     * (`events=1`, no interface, no controls, no play button) are forced on
     * it, and `inline_throttling` removed: zooming into a capped stream shows
     * nothing.
     */
    playerUrl?: string;
    /**
     * Duration of the media in seconds. Read from `/ws/media` when left out,
     * which also brings the aspect ratio and the frame rate.
     */
    duration?: number;
    /**
     * Aspect ratio of the picture (width / height).
     * @default the ratio of the media, 16 / 9 when unknown
     */
    ratio?: number;
    /**
     * Images per second of the media, used by the image-by-image step.
     * @default the frame rate of the media, 25 when unknown
     */
    fps?: number;
    /**
     * Position the player opens at. Accepts seconds or `hh:mm:ss.mmm`.
     * @default 0
     */
    startAt?: number | string;
    /**
     * Starts playing as soon as the player is ready.
     * @default false
     */
    autostart?: boolean;
    /**
     * The jog wheel. `false` leaves it out.
     */
    jog?: false | MetaPlayerJogOptions;
    /**
     * The playback speed selector. `false` leaves it out.
     */
    speed?: false | MetaPlayerSpeedOptions;
    /**
     * Zoom and pan inside the picture. `false` leaves it out, overlay
     * included, so clicks reach the player again.
     */
    zoom?: false | MetaPlayerZoomOptions;
    /**
     * The layers drawn on the timeline and in the picture.
     */
    layers?: MetaPlayerLayer[];
    /**
     * The audience curve over the progress bar. `false` leaves it out.
     */
    audience?: false | MetaPlayerAudienceOptions;
    /**
     * The elements of the control bar.
     */
    transport?: MetaPlayerTransportOptions;
    /**
     * Keyboard shortcuts. `false` binds none.
     * @default true
     */
    keyboard?: boolean | MetaPlayerKeyboardOptions;
    /**
     * Texts of the player.
     */
    labels?: MetaPlayerLabels;
    /**
     * Colours and radius of the player.
     */
    theme?: MetaPlayerTheme;
    /**
     * Locale used to format the speeds and the numbers.
     * @default browser locale
     */
    locale?: string;
    /**
     * Prefix of every generated CSS class, allowing full restyling.
     * @default "sl-meta"
     */
    classPrefix?: string;
    /**
     * Injects the default stylesheet. Set to `false` to style everything
     * yourself.
     * @default true
     */
    injectStyles?: boolean;
    /**
     * Shows the hours in the timecodes, even under an hour.
     * @default false
     */
    showHours?: boolean;
    /**
     * Before its first playback the player ignores a seek and reports 0. Set
     * this and the player is started muted at the first move, then paused at
     * once, so the picture follows the jog wheel and the progress bar from the
     * start. Turn it off if a silent frame of playback is not acceptable.
     * @default true
     */
    primeOnSeek?: boolean;
    /**
     * Parameters of the embedded player. `events` is forced to `true`, and the
     * interface, the controls and the play button to `false` — the bar drives
     * the player.
     */
    playerParams?: PlayerParams;
    /**
     * Settings of the generated iframe.
     */
    iframeParams?: IframeParams;
    /**
     * Enables debug logging.
     * @default false
     */
    debug?: boolean;
    /**
     * Global options (host, debug) used for the API call and the player URL.
     */
    baseOptions?: BaseOptions;
}

/**
 * Data returned once the meta player is ready.
 */
export interface MetaPlayerData {
    /**
     * The media, when it was read from `/ws/media`.
     */
    media: Media | null;
    /**
     * Duration in seconds, 0 when unknown.
     */
    duration: number;
    /**
     * Aspect ratio applied to the picture.
     */
    ratio: number;
    /**
     * Frame rate used by the image-by-image step.
     */
    fps: number;
}

/**
 * Controller returned by {@link generateMetaPlayer}.
 */
export interface MetaPlayerController extends CallbackResponse<MetaPlayerData> {
    /**
     * Starts playback.
     */
    play: () => void;
    /**
     * Pauses playback.
     */
    pause: () => void;
    /**
     * Plays or pauses.
     */
    togglePlay: () => void;
    /**
     * Moves to a position, in seconds, and tells the player.
     */
    seek: (seconds: number) => void;
    /**
     * Moves by a number of seconds from the current position.
     */
    step: (seconds: number) => void;
    /**
     * Moves by a number of images, negative backwards.
     */
    stepFrames: (frames: number) => void;
    /**
     * Last position known, in seconds. It is the position of the controls,
     * which holds during a gesture and before the first playback, where the
     * player reports nothing usable.
     */
    getTime: () => number;
    /**
     * Duration in seconds, 0 when unknown.
     */
    getDuration: () => number;
    /**
     * State last reported by the player.
     */
    getState: () => MetaPlayerState;
    /**
     * Sets the playback speed, snapped to the nearest available one. Returns
     * the speed reached.
     */
    setSpeed: (speed: number) => number;
    /**
     * Playback speed currently applied.
     */
    getSpeed: () => number;
    /**
     * Sets the volume, 0 to 1.
     */
    setVolume: (volume: number) => void;
    /**
     * Volume currently applied, 0 to 1.
     */
    getVolume: () => number;
    /**
     * Mutes or unmutes, or forces one of the two. Returns the state reached.
     */
    toggleMute: (force?: boolean) => boolean;
    /**
     * Zooms around the centre of the picture by a factor, 1 changing nothing.
     */
    zoomBy: (factor: number) => void;
    /**
     * Sets the zoom and the pan outright, for a saved framing.
     */
    setZoom: (state: Partial<MetaPlayerZoomState>) => void;
    /**
     * Zoom and pan currently applied.
     */
    getZoom: () => MetaPlayerZoomState;
    /**
     * Goes back to the whole picture.
     */
    resetZoom: () => void;
    /**
     * Replaces the items of a layer and redraws it. Returns false when no
     * layer carries that id.
     */
    setLayerItems: (layerId: string, items: MetaPlayerLayerItem[]) => boolean;
    /**
     * Calls the `load` of a layer again and redraws it. Resolves to false when
     * the layer has no loader, or the call failed.
     */
    reloadLayer: (layerId: string) => Promise<boolean>;
    /**
     * Shows or hides a layer, or forces one of the two. Returns the state
     * reached.
     */
    toggleLayer: (layerId: string, force?: boolean) => boolean;
    /**
     * Adds a layer to the player, or replaces the one carrying the same id.
     */
    addLayer: (layer: MetaPlayerLayer) => void;
    /**
     * Removes a layer. Returns false when no layer carries that id.
     */
    removeLayer: (layerId: string) => boolean;
    /**
     * The layers of the player, in drawing order.
     */
    getLayers: () => MetaPlayerLayer[];
    /**
     * Lights up the items of a layer for a moment — the answer to a click on
     * the timecode of a comment in a list beside the player.
     */
    highlight: (layerId: string, itemIds: (string | number)[]) => void;
    /**
     * Replaces the audience curve and redraws it.
     */
    setAudienceCurve: (curve: number[]) => void;
    /**
     * Calls the `load` of the audience curve again. Resolves to false when
     * there is no loader, or the call failed.
     */
    reloadAudience: () => Promise<boolean>;
    /**
     * Tells whether the player holds the fullscreen.
     */
    isFullscreen: () => boolean;
    /**
     * Enters or leaves fullscreen, or forces one of the two. Entering must be
     * called from a user gesture, otherwise the browser refuses it, so the
     * promise resolves to the state actually reached.
     */
    toggleFullscreen: (force?: boolean) => Promise<boolean>;
    /**
     * Subscribes to an event. Returns the function removing that listener.
     */
    on: <K extends keyof MetaPlayerEvents>(event: K, listener: MetaPlayerEvents[K]) => () => void;
    /**
     * Unsubscribes from an event.
     */
    off: <K extends keyof MetaPlayerEvents>(event: K, listener: MetaPlayerEvents[K]) => void;
    /**
     * The elements of the player, for an integration adding its own controls
     * or styling from the code.
     */
    getElements: () => {
        root: HTMLElement;
        frame: HTMLElement;
        picture: HTMLElement;
        stage: HTMLElement | null;
        iframe: HTMLIFrameElement | null;
        controls: HTMLElement | null;
        timeline: HTMLElement | null;
    };
    /**
     * Sends a command to the embedded player, for anything the controller does
     * not wrap — `["fullscreen"]` for instance, which acts inside the iframe.
     */
    send: (command: (string | number)[]) => void;
    /**
     * Removes every listener and empties the container.
     */
    destroy: () => void;
}
