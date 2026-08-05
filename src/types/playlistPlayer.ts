// path: src/types/playlistPlayer.ts

import {BaseOptions, CallbackResponse, Media, MediaContainer, PlaylistMetadata} from "./api";
import {IframeParams, PlayerParams} from "./player";
import {PlaylistParams} from "./playlist";
import {InteractivePreviewOptions} from "./features";

/**
 * Placement of the playlist navigation list relative to the player.
 */
export enum PlaylistListPosition {
    Right = 'right',
    Left = 'left',
    Bottom = 'bottom',
    Top = 'top'
}

/**
 * Toggles for the information displayed next to the player while a media is playing.
 * Every entry maps to an element with a dedicated CSS class (see `classPrefix`),
 * so the final integrator can restyle or hide any of them.
 */
export interface PlaylistPlayerInfoOptions {
    /**
     * Media name. Class: `{prefix}-info-title`
     * @default true
     */
    title?: boolean;
    /**
     * Media description. Class: `{prefix}-info-description`
     * @default false
     */
    description?: boolean;
    /**
     * Playlist name. Class: `{prefix}-info-playlist`
     * @default false
     */
    playlistName?: boolean;
    /**
     * Rank of the media in the playlist (e.g. "3 / 12"). Class: `{prefix}-info-position`
     * @default true
     */
    position?: boolean;
    /**
     * Total duration of the current media. Class: `{prefix}-info-duration`
     * @default true
     */
    duration?: boolean;
    /**
     * Live playback position, updated while playing. Class: `{prefix}-info-currenttime`
     * @default false
     */
    currentTime?: boolean;
    /**
     * Release date of the media. Class: `{prefix}-info-date`
     * @default false
     */
    releaseDate?: boolean;
    /**
     * Time of day (hours and minutes) of the release date. Class: `{prefix}-info-time`
     * @default false
     */
    releaseTime?: boolean;
    /**
     * Playback count of the media. Class: `{prefix}-info-views`
     * @default false
     */
    views?: boolean;
    /**
     * Standard keywords. Classes: `{prefix}-info-keywords` / `{prefix}-info-keyword`
     * @default false
     */
    keywords?: boolean;
}

/**
 * Toggles for the information displayed on each entry of the playlist list.
 * `duration`, `releaseDate`, `releaseTime` and `views` are gathered, in that
 * order, in a `{prefix}-item-meta` row displayed under the title.
 */
export interface PlaylistPlayerListItemOptions {
    /**
     * Cover image of the media. Class: `{prefix}-item-thumbnail`
     * @default true
     */
    thumbnail?: boolean;
    /**
     * Replaces the static cover by an interactive preview (see `generateThumbnail`).
     * Pass the preview options to enable it.
     * @default undefined
     */
    interactiveThumbnail?: InteractivePreviewOptions;
    /**
     * Rank of the media in the playlist. Class: `{prefix}-item-index`
     * @default true
     */
    index?: boolean;
    /**
     * Media name. Class: `{prefix}-item-title`
     * @default true
     */
    title?: boolean;
    /**
     * Media duration. Class: `{prefix}-item-duration`
     * @default true
     */
    duration?: boolean;
    /**
     * Release date of the media. Class: `{prefix}-item-date`
     * @default false
     */
    releaseDate?: boolean;
    /**
     * Time of day (hours and minutes) of the release date. Class: `{prefix}-item-time`
     * @default false
     */
    releaseTime?: boolean;
    /**
     * Playback count of the media. Class: `{prefix}-item-views`
     * @default false
     */
    views?: boolean;
    /**
     * Media description. Class: `{prefix}-item-description`
     * @default false
     */
    description?: boolean;
}

/**
 * Texts used by the playlist player, for localization purposes.
 */
export interface PlaylistPlayerLabels {
    /** @default "Previous" */
    previous?: string;
    /** @default "Next" */
    next?: string;
    /** @default "Loading…" */
    loading?: string;
    /** @default "This playlist is empty." */
    empty?: string;
    /** @default "Unable to load the playlist." */
    error?: string;
    /** @default "views" */
    views?: string;
    /** @default "medias" */
    medias?: string;
    /** Label of the button loading the next medias. @default "Load more" */
    more?: string;
    /** Label of the fullscreen button. @default "Fullscreen" */
    fullscreen?: string;
    /** Label of the fullscreen button while in fullscreen. @default "Exit fullscreen" */
    exitFullscreen?: string;
    /** Label of the floating button while the information is shown. @default "Hide information" */
    hideInfo?: string;
    /** Label of the floating button while the video is alone. @default "Show information" */
    showInfo?: string;
    /**
     * Message shown when a media cannot be played: missing token, or an IP /
     * referrer restriction that does not pass.
     * @default "Secured media"
     */
    secured?: string;
}

/**
 * Query parameter names used to build and read a "share at timecode" URL.
 */
export interface PlaylistPlayerShareParams {
    /**
     * Reads `media` and `timecode` from the current page URL to select the
     * starting media and position. Values given through `startMediaId` /
     * `startTimecode` take precedence.
     * @default false
     */
    enabled?: boolean;
    /**
     * Name of the query parameter holding the media id.
     * @default "media"
     */
    media?: string;
    /**
     * Name of the query parameter holding the start position (in seconds).
     * @default "t"
     */
    timecode?: string;
}

/**
 * Configuration of {@link generatePlaylistPlayer}.
 *
 * One source of medias is required: `playlistId`, `viewId`, `companyId` or a
 * pre-fetched `medias` array.
 */
export interface PlaylistPlayerOptions {
    /**
     * Playlist ID to read the medias from.
     */
    playlistId?: string;
    /**
     * View ID to read the medias from.
     */
    viewId?: string;
    /**
     * Company ID to read the medias from.
     */
    companyId?: string;
    /**
     * Already fetched medias. When provided, no API call is made.
     */
    medias?: MediaContainer[];
    /**
     * Extra parameters (ordering, filters) forwarded to `/ws/playlist`.
     * @default { orderby: OrderByPlaylist.POSITION, sortorder: SortOrder.Up }
     */
    playlistParams?: PlaylistParams;
    /**
     * Number of medias fetched per request. The list starts with one page, then
     * grows: the next page is fetched when playback approaches the end of the
     * loaded medias, and a "load more" button appears while some remain.
     * Defaults to `playlistParams.pagesize` when set.
     * @default 10
     */
    pageSize?: number;
    /**
     * Number of loaded medias still ahead below which the next page is fetched.
     * With the default page size, reaching the 9th media loads the next ten.
     * @default 2
     */
    prefetchThreshold?: number;
    /**
     * ID of the media to start with. Falls back to the first media of the playlist.
     */
    startMediaId?: string;
    /**
     * Position where the first media starts. Accepts seconds or `hh:mm:ss.mmm`.
     */
    startTimecode?: number | string;
    /**
     * Starts playing as soon as the player is ready.
     * @default false
     */
    autostart?: boolean;
    /**
     * Starts playing automatically when navigating to another media.
     * @default true
     */
    autoplayOnChange?: boolean;
    /**
     * Plays the next media when the current one ends.
     * @default true
     */
    autoNext?: boolean;
    /**
     * Goes back to the first media after the last one.
     * @default false
     */
    loop?: boolean;
    /**
     * Hides the medias that cannot be played, that is the tokenized ones with
     * no password: they are removed from the list and from the counts.
     *
     * Set it to `false` to keep them visible: their cover is displayed in the
     * list and in place of the player, along with the `labels.secured` message
     * and a button to jump to the next media.
     *
     * Two cases are never hidden, since they remain playable: a tokenized media
     * protected by a password (the player prompts for it), and a media secured
     * by IP or referrer.
     *
     * For those restricted medias the player URL is probed (a HEAD request,
     * `/play` answers a 404 when the access does not pass), so the message and
     * the button appear only when playback really fails.
     * @default true
     */
    hideTokenized?: boolean;
    /**
     * Displays the navigable list of the playlist medias.
     * @default true
     */
    showList?: boolean;
    /**
     * Displays the previous / next controls.
     * @default true
     */
    showControls?: boolean;
    /**
     * Adds a fullscreen button that puts the whole player — media, information,
     * controls and list — in fullscreen, and **keeps it there when the media
     * changes**.
     *
     * That is the point of the option. The player's own fullscreen button acts
     * inside the iframe, whose document is destroyed each time another media is
     * loaded, so the browser leaves fullscreen at every change. Here the element
     * put in fullscreen is the container, which survives the swap.
     *
     * Enabling it therefore hides the fullscreen button of the embedded player
     * (`playerParams.fs` and `playerParams.fullscreen` are forced to `false`),
     * so the only path offered is the one that holds.
     *
     * Not supported on iPhone, where Safari only knows how to put a native video
     * element in fullscreen: the button is left out there.
     * @default false
     */
    fullscreen?: boolean;
    /**
     * Key toggling the information while in fullscreen, so the media can be left
     * alone on screen. Set to `false` to bind nothing.
     *
     * The shortcut only answers while the player holds the fullscreen, and only
     * when the focus is in the page: a click inside the player sends the
     * keystrokes to its iframe, out of reach of any page.
     * @default "i"
     */
    toggleInfoKey?: string | false;
    /**
     * Where the list is rendered relative to the player.
     * @default PlaylistListPosition.Right
     */
    listPosition?: PlaylistListPosition;
    /**
     * Information displayed while a media is playing.
     */
    info?: PlaylistPlayerInfoOptions;
    /**
     * Information displayed on each entry of the list.
     */
    listItem?: PlaylistPlayerListItemOptions;
    /**
     * Texts used by the player.
     */
    labels?: PlaylistPlayerLabels;
    /**
     * Locale used to format dates and numbers.
     * @default browser locale
     */
    locale?: string;
    /**
     * Prefix of every generated CSS class, allowing full restyling.
     * @default "sl-playlist"
     */
    classPrefix?: string;
    /**
     * Injects the default stylesheet. Set to `false` to style everything yourself.
     * @default true
     */
    injectStyles?: boolean;
    /**
     * Parameters of the embedded player. `events` is always forced to `true`.
     */
    playerParams?: PlayerParams;
    /**
     * Settings of the generated iframe.
     */
    iframeParams?: IframeParams;
    /**
     * Query parameter names used by `getShareUrl()`.
     */
    shareParams?: PlaylistPlayerShareParams;
    /**
     * Called each time the played media changes.
     */
    onMediaChange?: (media: Media, index: number) => void;
    /**
     * Called when the last media of the playlist ends (and `loop` is disabled).
     */
    onPlaylistEnd?: () => void;
    /**
     * Enables debug logging.
     * @default false
     */
    debug?: boolean;
    /**
     * Global options (host, debug) used for the API calls and the player URL.
     */
    baseOptions?: BaseOptions;
}

/**
 * Data returned once the playlist player is ready.
 */
export interface PlaylistPlayerData {
    /**
     * Medias handled by the player, in playing order.
     */
    medias: MediaContainer[];
    /**
     * Metadata of the playlist, when it was fetched from the API.
     */
    playlist: PlaylistMetadata | null;
    /**
     * Index of the media the player started on.
     */
    index: number;
}

/**
 * Playback controller returned by {@link generatePlaylistPlayer}.
 */
export interface PlaylistPlayerController extends CallbackResponse<PlaylistPlayerData> {
    /**
     * Resumes playback of the current media.
     */
    play: () => void;
    /**
     * Pauses the current media.
     */
    pause: () => void;
    /**
     * Seeks the current media to the given position (in seconds).
     */
    seek: (timecode: number) => void;
    /**
     * Plays the next media. Returns false when there is none.
     */
    next: () => boolean;
    /**
     * Plays the previous media. Returns false when there is none.
     */
    previous: () => boolean;
    /**
     * Plays the media at the given index, optionally at a given position.
     */
    playIndex: (index: number, timecode?: number | string) => boolean;
    /**
     * Plays the media matching the given id, optionally at a given position.
     */
    playMedia: (mediaId: string, timecode?: number | string) => boolean;
    /**
     * Index of the media currently loaded.
     */
    getCurrentIndex: () => number;
    /**
     * Media currently loaded.
     */
    getCurrentMedia: () => Media | null;
    /**
     * Medias currently loaded, in playing order. The array grows as further
     * pages are fetched.
     */
    getMedias: () => MediaContainer[];
    /**
     * Total number of medias in the playlist, loaded or not.
     */
    getTotal: () => number;
    /**
     * Fetches the next page of medias and appends it to the list. Resolves to
     * false when nothing was added (everything is loaded, or the request failed).
     */
    loadMore: () => Promise<boolean>;
    /**
     * Last playback position reported by the player, in seconds.
     */
    getCurrentTime: () => number;
    /**
     * Tells whether the player currently holds the fullscreen.
     */
    isFullscreen: () => boolean;
    /**
     * Enters or leaves fullscreen, or forces one of the two when `force` is
     * given. Works whatever `options.fullscreen`, which only governs the button.
     *
     * Entering must be called from a user gesture (a click handler), otherwise
     * the browser refuses it. Resolves to the state actually reached, so a
     * refusal — an unsupported browser, a missing gesture — reads as `false`.
     */
    toggleFullscreen: (force?: boolean) => Promise<boolean>;
    /**
     * Tells whether the media is currently alone on screen.
     */
    isVideoOnly: () => boolean;
    /**
     * Hides everything but the media — information, controls and list — or
     * brings it all back, and returns the state reached. Only shows in
     * fullscreen, where the rules apply; leaving fullscreen resets it.
     */
    toggleVideoOnly: (force?: boolean) => boolean;
    /**
     * Builds a shareable URL pointing to the current media, at the current
     * position by default.
     */
    getShareUrl: (options?: { timecode?: number | boolean; url?: string }) => string;
    /**
     * Removes the listeners and empties the container.
     */
    destroy: () => void;
}
