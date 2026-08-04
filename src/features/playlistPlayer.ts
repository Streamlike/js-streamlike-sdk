// path: src/features/playlistPlayer.ts
import {Media, MediaContainer, PlaylistMetadata, PlaylistResponse} from "../types/api";
import {OrderByPlaylist, SortOrder} from "../types/base";
import {PlayerParams} from "../types/player";
import {
    PlaylistListPosition,
    PlaylistPlayerController,
    PlaylistPlayerInfoOptions,
    PlaylistPlayerLabels,
    PlaylistPlayerListItemOptions,
    PlaylistPlayerOptions
} from "../types/playlistPlayer";
import {getWsPlaylist} from "../api/playlist";
import {embedPlayerIframe} from "../player/iframe";
import {buildUrl} from "../utils/api";
import {generateThumbnail} from "./preview";

const DEFAULT_PREFIX = 'sl-playlist';

/** Medias fetched per request, matching the `/ws/playlist` default. */
const DEFAULT_PAGE_SIZE = 10;

/** Remaining loaded medias below which the next page is fetched. */
const DEFAULT_PREFETCH_THRESHOLD = 2;

const DEFAULT_LABELS: Required<PlaylistPlayerLabels> = {
    previous: 'Previous',
    next: 'Next',
    loading: 'Loading…',
    empty: 'This playlist is empty.',
    error: 'Unable to load the playlist.',
    views: 'views',
    medias: 'medias',
    more: 'Load more'
};

const DEFAULT_INFO: Required<PlaylistPlayerInfoOptions> = {
    title: true,
    description: false,
    playlistName: false,
    position: true,
    duration: true,
    currentTime: false,
    releaseDate: false,
    releaseTime: false,
    views: false,
    keywords: false
};

const DEFAULT_LIST_ITEM: PlaylistPlayerListItemOptions = {
    thumbnail: true,
    index: true,
    title: true,
    duration: true,
    description: false
};

/**
 * Formats a duration in seconds as `m:ss` or `h:mm:ss`.
 */
function _formatTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (v: number) => v.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Converts a timecode expressed in seconds or as `hh:mm:ss.mmm` into seconds.
 */
function _parseTimecode(value?: number | string | null): number {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : Math.max(0, value);

    const trimmed = value.trim();
    if (trimmed.includes(':')) {
        const seconds = trimmed.split(':').reduce((acc, part) => acc * 60 + (parseFloat(part) || 0), 0);
        return Math.max(0, seconds);
    }
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Formats an API date (`YYYY-MM-DD hh:mm:ss`) using the given locale.
 * Returns the raw value when it cannot be parsed.
 */
function _formatDate(raw?: string, locale?: string): string {
    const date = _parseApiDate(raw);
    return date ? date.toLocaleDateString(locale) : (raw ?? '');
}

/**
 * Formats the time of day (hours and minutes) of an API date, using the given
 * locale. Returns an empty string when the date cannot be parsed.
 */
function _formatClockTime(raw?: string, locale?: string): string {
    const date = _parseApiDate(raw);
    return date ? date.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'}) : '';
}

/**
 * Parses an API date (`YYYY-MM-DD hh:mm:ss` or ISO 8601). Returns null when the
 * value is missing or invalid.
 */
function _parseApiDate(raw?: string): Date | null {
    if (!raw) return null;
    const date = new Date(raw.replace(' ', 'T'));
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Converts a description coming from the API (which may contain HTML) into
 * plain text. Parsing happens in an inert document: no script is executed and
 * no asset is loaded.
 */
function _toPlainText(html?: string): string {
    if (!html) return '';
    if (!html.includes('<')) return html;
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Creates an element with a class and an optional text content.
 */
function _el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

/**
 * Injects the default stylesheet for a given class prefix (once per prefix).
 * Every rule uses a single class selector so it can be overridden easily.
 */
function _injectStyles(p: string): void {
    const styleId = `${p}-default-styles`;
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
.${p}, .${p} * { box-sizing: border-box; }
.${p} { display: flex; gap: 1rem; width: 100%; align-items: stretch; }
.${p}--list-right { flex-direction: row; }
.${p}--list-left { flex-direction: row-reverse; }
.${p}--list-bottom { flex-direction: column; }
.${p}--list-top { flex-direction: column-reverse; }
.${p}-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: .5rem; }
.${p}-player { width: 100%; background: #000; }
.${p}-controls { display: flex; align-items: center; gap: .5rem; }
.${p}-button { font: inherit; cursor: pointer; border: 0; border-radius: 4px; padding: .4rem .9rem; background: #293c5a; color: #fff; }
.${p}-button:disabled { opacity: .4; cursor: default; }
.${p}-info { display: flex; flex-direction: column; gap: .4rem; }
.${p}-info-title { margin: 0; font-size: 1.1rem; font-weight: 700; }
.${p}-info-playlist { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; opacity: .6; }
.${p}-info-meta { display: flex; flex-wrap: wrap; gap: .75rem; font-size: .85rem; opacity: .75; }
.${p}-info-description { margin: 0; font-size: .9rem; line-height: 1.5; }
.${p}-info-keywords { display: flex; flex-wrap: wrap; gap: .35rem; margin: 0; padding: 0; list-style: none; }
.${p}-info-keyword { font-size: .75rem; padding: .15rem .5rem; border-radius: 999px; background: rgba(41, 60, 90, .1); }
.${p}-list { flex: 0 0 320px; min-width: 0; display: flex; flex-direction: column; gap: .25rem; }
.${p}--list-bottom .${p}-list, .${p}--list-top .${p}-list { flex: 0 0 auto; width: 100%; }
.${p}-list-header { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
.${p}-list-title { font-weight: 700; }
.${p}-list-count { font-size: .85rem; opacity: .7; }
.${p}-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .25rem; max-height: 480px; overflow-y: auto; }
.${p}-item-button { font: inherit; color: inherit; display: flex; align-items: center; gap: .6rem; width: 100%; text-align: left; background: none; border: 0; padding: .4rem; border-radius: 6px; cursor: pointer; }
.${p}-item-button:hover { background: rgba(41, 60, 90, .08); }
.${p}-item.is-active > .${p}-item-button { background: rgba(41, 60, 90, .16); }
.${p}-item-index { flex: 0 0 1.5rem; text-align: right; font-size: .8rem; opacity: .6; }
.${p}-item-thumbnail { flex: 0 0 120px; aspect-ratio: 16 / 9; background: #000; border-radius: 4px; overflow: hidden; }
.${p}-item-thumbnail img { width: 100%; height: 100%; object-fit: cover; display: block; }
.${p}-item-body { min-width: 0; display: flex; flex-direction: column; gap: .15rem; }
.${p}-item-title { font-size: .9rem; }
.${p}-item-duration { font-size: .75rem; opacity: .65; }
.${p}-item-description { font-size: .75rem; opacity: .7; }
.${p}-list-more { width: 100%; margin-top: .25rem; }
.${p}-message { padding: 1rem; text-align: center; opacity: .7; }
@media (max-width: 720px) {
    .${p}--list-right, .${p}--list-left { flex-direction: column; }
    .${p}--list-right .${p}-list, .${p}--list-left .${p}-list { flex: 0 0 auto; width: 100%; }
}
`;
    document.head.appendChild(style);
}

/**
 * Builds a controller with inert methods, used when the player cannot be created.
 */
function _errorController(errors: string): PlaylistPlayerController {
    const noop = () => {
    };
    return {
        res: false,
        data: null,
        errors,
        play: noop,
        pause: noop,
        seek: noop,
        next: () => false,
        previous: () => false,
        playIndex: () => false,
        playMedia: () => false,
        getCurrentIndex: () => -1,
        getCurrentMedia: () => null,
        getMedias: () => [],
        getTotal: () => 0,
        loadMore: () => Promise.resolve(false),
        getCurrentTime: () => 0,
        getShareUrl: () => '',
        destroy: noop
    };
}

/**
 * Generates a playlist player: an embedded player that plays every media of an
 * ordered playlist, with previous / next controls, a clickable list of the
 * medias, and a configurable information panel.
 *
 * The medias can be fetched from a playlist, a view or a company id, or passed
 * directly through `options.medias`. A media id and a timecode can be provided
 * (`startMediaId` / `startTimecode`, or the share query parameters) so a shared
 * link starts on the right media at the right position.
 *
 * Every generated element carries a class built from `options.classPrefix`
 * (`sl-playlist` by default), so the final integrator can fully restyle the UI.
 *
 * @param {string | HTMLElement} target - The container element or its id.
 * @param {PlaylistPlayerOptions} options - Playlist source, playback and display options.
 * @return {Promise<PlaylistPlayerController>} A promise resolving to a playback controller.
 */
export async function generatePlaylistPlayer(
    target: string | HTMLElement,
    options: PlaylistPlayerOptions
): Promise<PlaylistPlayerController> {
    const container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!container) return _errorController("Invalid target element.");
    if (!options) return _errorController("Missing options.");

    const {
        playlistId,
        viewId,
        companyId,
        medias: providedMedias,
        playlistParams = {},
        startMediaId,
        startTimecode,
        autostart = false,
        autoplayOnChange = true,
        autoNext = true,
        loop = false,
        showList = true,
        showControls = true,
        listPosition = PlaylistListPosition.Right,
        classPrefix = DEFAULT_PREFIX,
        injectStyles = true,
        playerParams = {},
        iframeParams = {},
        shareParams = {},
        onMediaChange,
        onPlaylistEnd,
        locale,
        baseOptions = {}
    } = options;

    const pageSize = Math.max(1, Number(options.pageSize ?? options.playlistParams?.pagesize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE);
    const prefetchThreshold = Math.max(0, options.prefetchThreshold ?? DEFAULT_PREFETCH_THRESHOLD);

    const debug = options.debug ?? baseOptions.debug ?? false;
    const p = classPrefix;
    const info: Required<PlaylistPlayerInfoOptions> = {...DEFAULT_INFO, ...options.info};
    const listItem: PlaylistPlayerListItemOptions = {...DEFAULT_LIST_ITEM, ...options.listItem};
    const labels: Required<PlaylistPlayerLabels> = {...DEFAULT_LABELS, ...options.labels};
    const shareMediaParam = shareParams.media || 'media';
    const shareTimecodeParam = shareParams.timecode || 't';

    if (debug) {
        console.groupCollapsed(`[generatePlaylistPlayer] ${playlistId ?? viewId ?? companyId ?? 'medias'}`);
        console.debug('target:', container);
        console.debug('options:', options);
    }

    if (injectStyles) _injectStyles(p);

    // --- Layout ---
    const rootClasses = [p, `${p}--list-${listPosition}`];
    container.classList.add(...rootClasses);
    container.innerHTML = '';

    const main = _el('div', `${p}-main`);
    const playerBox = _el('div', `${p}-player`);
    main.appendChild(playerBox);
    container.appendChild(main);

    const loadingMessage = _el('div', `${p}-message`, labels.loading);
    main.appendChild(loadingMessage);

    // --- Medias ---
    let medias: MediaContainer[] = [];
    let playlistMetadata: PlaylistMetadata | null = null;
    let total = 0;

    // Base query reused by every page. `page` is an item offset, not a page
    // number: page=10 with pagesize=10 returns the medias 11 to 20.
    const sourceParams = (playlistId || viewId || companyId) ? {
        orderby: OrderByPlaylist.POSITION,
        sortorder: SortOrder.Up,
        ...playlistParams,
        ...(playlistId ? {playlist_id: playlistId} : {}),
        ...(viewId ? {view_id: viewId} : {}),
        ...(companyId ? {company_id: companyId} : {})
    } : null;

    /** Keeps only playable medias, dropping the ones already loaded. */
    const _newMedias = (incoming: MediaContainer[]): MediaContainer[] => {
        const known = new Set(medias.map(item => item.media.metadata.global.media_id));
        return incoming.filter(item => {
            const id = item?.media?.metadata?.global?.media_id;
            return !!id && !known.has(id);
        });
    };

    /** Fetches one page of medias, starting at the given item offset. */
    const _fetchPage = async (offset: number, size: number = pageSize) => {
        if (!sourceParams) return {medias: [] as MediaContainer[], metadata: null, errors: null as string | null};
        const response = await getWsPlaylist({...sourceParams, pagesize: size, page: offset}, baseOptions);
        if (!response.res || !response.data) {
            return {medias: [] as MediaContainer[], metadata: null, errors: response.errors ?? "Playlist could not be loaded."};
        }
        const playlist = (response.data as PlaylistResponse).playlist;
        return {medias: playlist.medias ?? [], metadata: playlist.metadata ?? null, errors: null};
    };

    if (providedMedias?.length) {
        medias = _newMedias(providedMedias);
        total = medias.length;
    } else if (sourceParams) {
        const first = await _fetchPage(0);
        if (first.errors) {
            loadingMessage.textContent = labels.error;
            if (debug) {
                console.error('Playlist could not be loaded:', first.errors);
                console.groupEnd();
            }
            return _errorController(first.errors);
        }
        medias = _newMedias(first.medias);
        playlistMetadata = first.metadata;
        total = Math.max(Number(playlistMetadata?.size ?? 0) || 0, medias.length);
    } else {
        loadingMessage.textContent = labels.error;
        if (debug) console.groupEnd();
        return _errorController("Missing playlist source: provide playlistId, viewId, companyId or medias.");
    }

    if (!medias.length) {
        loadingMessage.textContent = labels.empty;
        if (debug) {
            console.warn('Playlist is empty.');
            console.groupEnd();
        }
        return _errorController("Playlist is empty.");
    }
    main.removeChild(loadingMessage);

    // --- Info panel ---
    const infoBox = _el('div', `${p}-info`);
    const infoPlaylist = _el('div', `${p}-info-playlist`);
    const infoTitle = _el('h3', `${p}-info-title`);
    const infoMeta = _el('div', `${p}-info-meta`);
    const infoPosition = _el('span', `${p}-info-position`);
    const infoDuration = _el('span', `${p}-info-duration`);
    const infoCurrentTime = _el('span', `${p}-info-currenttime`);
    const infoDate = _el('span', `${p}-info-date`);
    const infoTime = _el('span', `${p}-info-time`);
    const infoViews = _el('span', `${p}-info-views`);
    const infoDescription = _el('p', `${p}-info-description`);
    const infoKeywords = _el('ul', `${p}-info-keywords`);

    if (info.playlistName) infoBox.appendChild(infoPlaylist);
    if (info.title) infoBox.appendChild(infoTitle);
    if (info.position) infoMeta.appendChild(infoPosition);
    if (info.currentTime) infoMeta.appendChild(infoCurrentTime);
    if (info.duration) infoMeta.appendChild(infoDuration);
    if (info.releaseDate) infoMeta.appendChild(infoDate);
    if (info.releaseTime) infoMeta.appendChild(infoTime);
    if (info.views) infoMeta.appendChild(infoViews);
    if (infoMeta.childElementCount) infoBox.appendChild(infoMeta);
    if (info.description) infoBox.appendChild(infoDescription);
    if (info.keywords) infoBox.appendChild(infoKeywords);
    if (infoBox.childElementCount) main.appendChild(infoBox);

    if (info.playlistName) {
        infoPlaylist.textContent = (playlistMetadata?.name as string) ?? '';
    }

    // --- Controls ---
    const controls = _el('div', `${p}-controls`);
    const prevButton = _el('button', `${p}-button ${p}-button-prev`, labels.previous);
    const nextButton = _el('button', `${p}-button ${p}-button-next`, labels.next);
    prevButton.type = 'button';
    nextButton.type = 'button';
    if (showControls) {
        controls.appendChild(prevButton);
        controls.appendChild(nextButton);
        main.appendChild(controls);
    }

    // --- List ---
    const listBox = _el('div', `${p}-list`);
    const itemsList = _el('ul', `${p}-items`);
    const listCount = _el('span', `${p}-list-count`);
    const moreButton = _el('button', `${p}-button ${p}-list-more`, labels.more);
    const itemElements: HTMLLIElement[] = [];
    moreButton.type = 'button';

    /** Builds one entry of the list for the media at the given index. */
    const createListItem = (mediaContainer: MediaContainer, index: number): HTMLLIElement => {
        const media = mediaContainer.media;
        const global = media.metadata.global;

        const item = _el('li', `${p}-item`);
        item.dataset.mediaId = global.media_id;
        item.dataset.index = String(index);

        const button = _el('button', `${p}-item-button`);
        button.type = 'button';

        if (listItem.index) {
            button.appendChild(_el('span', `${p}-item-index`, String(index + 1)));
        }

        if (listItem.thumbnail) {
            const thumbnail = _el('div', `${p}-item-thumbnail`);
            if (listItem.interactiveThumbnail) {
                generateThumbnail(thumbnail, media.metadata.customization, {
                    debug,
                    ...listItem.interactiveThumbnail
                }).catch(err => debug && console.error('Thumbnail generation failed:', err));
            } else {
                const img = document.createElement('img');
                img.src = media.metadata.customization?.cover?.thumbnail_url ?? '';
                img.alt = global.name ?? '';
                img.setAttribute('loading', 'lazy');
                thumbnail.appendChild(img);
            }
            button.appendChild(thumbnail);
        }

        const body = _el('div', `${p}-item-body`);
        if (listItem.title) body.appendChild(_el('span', `${p}-item-title`, global.name ?? ''));
        if (listItem.duration) {
            body.appendChild(_el('span', `${p}-item-duration`, _formatTime(global.duration)));
        }
        if (listItem.description && global.description) {
            body.appendChild(_el('span', `${p}-item-description`, _toPlainText(global.description)));
        }
        button.appendChild(body);

        button.addEventListener('click', () => playIndex(index));
        item.appendChild(button);
        return item;
    };

    /** Appends the entries for the medias not rendered yet. */
    const renderNewItems = () => {
        if (!showList) return;
        for (let index = itemElements.length; index < medias.length; index++) {
            const item = createListItem(medias[index], index);
            itemsList.appendChild(item);
            itemElements.push(item);
        }
    };

    /** Refreshes the counter and the visibility of the "load more" button. */
    const updateListState = () => {
        const remaining = Math.max(0, total - medias.length);
        listCount.textContent = remaining > 0
            ? `${medias.length} / ${total} ${labels.medias}`
            : `${medias.length} ${labels.medias}`;
        moreButton.style.display = remaining > 0 ? '' : 'none';
    };

    if (showList) {
        const listHeader = _el('div', `${p}-list-header`);
        const listTitle = _el('span', `${p}-list-title`, (playlistMetadata?.name as string) ?? '');
        listHeader.appendChild(listTitle);
        listHeader.appendChild(listCount);
        listBox.appendChild(listHeader);
        listBox.appendChild(itemsList);
        listBox.appendChild(moreButton);
        container.appendChild(listBox);

        renderNewItems();
    }

    // --- State ---
    let currentIndex = -1;
    let currentTime = 0;
    let playerIframe: HTMLIFrameElement | null = null;
    let endHandled = false;

    const getCurrentMedia = (): Media | null => medias[currentIndex]?.media ?? null;

    const postToPlayer = (method: string, param?: number | string) => {
        if (!playerIframe?.contentWindow) {
            if (debug) console.warn('Cannot post to player: iframe missing.');
            return;
        }
        const message = param !== undefined ? `["${method}", ${param}]` : `["${method}"]`;
        if (debug) console.debug('postToPlayer:', message);
        playerIframe.contentWindow.postMessage(message, '*');
    };

    const updateInfo = () => {
        const media = getCurrentMedia();
        if (!media) return;
        const global = media.metadata.global;

        if (info.title) infoTitle.textContent = global.name ?? '';
        if (info.position) infoPosition.textContent = `${currentIndex + 1} / ${Math.max(total, medias.length)}`;
        if (info.duration) infoDuration.textContent = _formatTime(global.duration);
        if (info.currentTime) infoCurrentTime.textContent = _formatTime(currentTime);
        if (info.releaseDate) infoDate.textContent = _formatDate(global.release_date, locale);
        if (info.releaseTime) infoTime.textContent = _formatClockTime(global.release_date, locale);
        if (info.views) {
            infoViews.textContent = `${(media.statistics?.media_access ?? 0).toLocaleString(locale)} ${labels.views}`;
        }
        if (info.description) infoDescription.textContent = _toPlainText(global.description);
        if (info.keywords) {
            infoKeywords.innerHTML = '';
            (media.metadata.keywords?.standard_keywords ?? []).forEach(keyword => {
                infoKeywords.appendChild(_el('li', `${p}-info-keyword`, keyword.standard_keyword));
            });
        }
    };

    const updateActiveItem = () => {
        itemElements.forEach((item, index) => {
            const isActive = index === currentIndex;
            item.classList.toggle('is-active', isActive);
            if (isActive) item.setAttribute('aria-current', 'true');
            else item.removeAttribute('aria-current');
        });
    };

    const hasMore = () => !!sourceParams && medias.length < total;

    const updateControls = () => {
        prevButton.disabled = !loop && currentIndex <= 0;
        nextButton.disabled = !loop && !hasMore() && currentIndex >= medias.length - 1;
    };

    /**
     * Fetches the next page of medias and appends it to the list.
     * Concurrent calls share the same request.
     */
    let loadingPage: Promise<boolean> | null = null;
    const loadMore = (): Promise<boolean> => {
        if (loadingPage) return loadingPage;
        if (!hasMore()) return Promise.resolve(false);

        moreButton.disabled = true;
        moreButton.textContent = labels.loading;

        loadingPage = _fetchPage(medias.length).then(page => {
            if (page.errors) {
                if (debug) console.error('Could not load more medias:', page.errors);
                return false;
            }
            const added = _newMedias(page.medias);
            if (!added.length) {
                // Nothing new came back: stop asking to avoid an endless loop.
                total = medias.length;
                if (debug) console.warn('No additional media returned, playlist considered complete.');
                return false;
            }
            medias.push(...added);
            if (page.metadata?.size) total = Math.max(Number(page.metadata.size) || 0, medias.length);
            renderNewItems();
            updateActiveItem();
            if (debug) console.debug(`+${added.length} medias loaded (${medias.length}/${total}).`);
            return true;
        }).catch(error => {
            if (debug) console.error('Could not load more medias:', error);
            return false;
        }).finally(() => {
            loadingPage = null;
            moreButton.disabled = false;
            moreButton.textContent = labels.more;
            updateListState();
            updateControls();
            updateInfo();
        }) as Promise<boolean>;

        return loadingPage;
    };

    /** Loads the next page ahead of time when the end of the list gets close. */
    const prefetchIfNeeded = () => {
        if (hasMore() && currentIndex >= medias.length - 1 - prefetchThreshold) loadMore();
    };

    /**
     * Loads a media into the player and refreshes the whole UI.
     */
    const setMedia = (index: number, timecode: number = 0, play: boolean = false): boolean => {
        const mediaContainer = medias[index];
        if (!mediaContainer) {
            if (debug) console.warn(`No media at index ${index}.`);
            return false;
        }
        const media = mediaContainer.media;
        const global = media.metadata.global;

        currentIndex = index;
        currentTime = timecode;
        endHandled = false;

        const params: PlayerParams = {
            ...playerParams,
            med_id: global.media_id,
            events: true,
            autostart: play
        };
        if (timecode > 0) params.tc = timecode;
        else delete params.tc;

        const src = buildUrl('/play', params, baseOptions);
        playerIframe = embedPlayerIframe(
            playerBox,
            src,
            global.ratio || 16 / 9,
            {...iframeParams, id: `${p}-media-${global.media_id}`},
            debug
        );

        updateInfo();
        updateActiveItem();
        updateControls();
        onMediaChange?.(media, index);
        prefetchIfNeeded();
        return true;
    };

    function playIndex(index: number, timecode?: number | string): boolean {
        return setMedia(index, _parseTimecode(timecode), autoplayOnChange);
    }

    const next = (): boolean => {
        if (currentIndex < medias.length - 1) return playIndex(currentIndex + 1);
        if (hasMore()) {
            // The next media is not loaded yet: play it as soon as it arrives.
            const from = currentIndex;
            loadMore().then(added => {
                if (added && currentIndex === from) playIndex(from + 1);
            });
            return true;
        }
        if (loop) return playIndex(0);
        return false;
    };

    const previous = (): boolean => {
        if (currentIndex > 0) return playIndex(currentIndex - 1);
        if (loop) return playIndex(medias.length - 1);
        return false;
    };

    const handleMediaEnd = () => {
        if (endHandled) return;
        endHandled = true;
        if (debug) console.debug('Media ended at index', currentIndex);

        const isLast = currentIndex >= medias.length - 1 && !hasMore();
        if (autoNext && (!isLast || loop)) {
            next();
            return;
        }
        if (isLast) onPlaylistEnd?.();
    };

    // --- Player events ---
    const onPlayerMessage = (event: MessageEvent) => {
        if (playerIframe?.contentWindow && event.source !== playerIframe.contentWindow) return;
        try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            const duration = getCurrentMedia()?.metadata.global.duration ?? 0;

            // Array format: ["sl-progress", position]
            if (Array.isArray(data)) {
                if (data[0] === 'sl-progress') {
                    const position = parseFloat(data[1]);
                    if (isNaN(position)) return;
                    currentTime = position;
                    if (info.currentTime) infoCurrentTime.textContent = _formatTime(position);
                    if (duration > 0 && position >= duration - 0.75) handleMediaEnd();
                }
                return;
            }

            // Object format: {event: "Streamlike.statusChange", options: {...}}
            if (data?.event) {
                const name = String(data.event).replace('Streamlike.', '');
                if (name === 'timeupdate') {
                    const position = data.options?.position ?? data.position ?? 0;
                    currentTime = position;
                    if (info.currentTime) infoCurrentTime.textContent = _formatTime(position);
                    if (duration > 0 && position >= duration - 0.75) handleMediaEnd();
                } else if (name === 'statusChange') {
                    const status = String(data.options?.newStatus ?? data.newStatus ?? '').toLowerCase();
                    if (debug) console.debug('statusChange:', status);
                    if (status === 'ended' || status === 'complete' || status === 'completed') handleMediaEnd();
                } else if (name === 'ended' || name === 'complete') {
                    handleMediaEnd();
                }
            }
        } catch (error) {
            if (debug) console.error('Error parsing player message:', error, event.data);
        }
    };
    window.addEventListener('message', onPlayerMessage);

    prevButton.addEventListener('click', () => previous());
    nextButton.addEventListener('click', () => next());
    moreButton.addEventListener('click', () => loadMore());
    updateListState();

    // --- Starting point (shared link support) ---
    const search = shareParams.enabled && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null;

    const wantedMediaId = startMediaId ?? search?.get(shareMediaParam) ?? undefined;
    const wantedTimecode = _parseTimecode(startTimecode ?? search?.get(shareTimecodeParam));

    let startIndex = 0;
    if (wantedMediaId) {
        let found = medias.findIndex(item => item.media.metadata.global.media_id === wantedMediaId);

        // A shared link can point to a media sitting beyond the first page. Rather
        // than walking the pages one by one, load the whole playlist at once: it
        // only happens when a starting media was explicitly requested.
        if (found < 0 && hasMore()) {
            if (debug) console.debug(`Media "${wantedMediaId}" not in the first page, loading the whole playlist to locate it.`);
            const everything = await _fetchPage(0, total);
            const added = _newMedias(everything.medias);
            if (added.length) {
                medias.push(...added);
                renderNewItems();
                updateListState();
            }
            found = medias.findIndex(item => item.media.metadata.global.media_id === wantedMediaId);
        }

        if (found >= 0) startIndex = found;
        else if (debug) console.warn(`Media "${wantedMediaId}" is not part of this playlist, starting from the first one.`);
    }

    setMedia(startIndex, wantedTimecode, autostart);

    if (debug) {
        console.debug(`%c✔ playlist player ready (${medias.length} medias)`, 'color: green');
        console.groupEnd();
    }

    return {
        res: true,
        data: {medias, playlist: playlistMetadata, index: startIndex},
        errors: null,
        play: () => postToPlayer('play'),
        pause: () => postToPlayer('pause'),
        seek: (timecode: number) => {
            currentTime = _parseTimecode(timecode);
            postToPlayer('seek', currentTime);
        },
        next,
        previous,
        playIndex,
        playMedia: (mediaId: string, timecode?: number | string) => {
            const index = medias.findIndex(item => item.media.metadata.global.media_id === mediaId);
            return index >= 0 ? playIndex(index, timecode) : false;
        },
        getCurrentIndex: () => currentIndex,
        getCurrentMedia,
        getMedias: () => medias,
        getTotal: () => Math.max(total, medias.length),
        loadMore,
        getCurrentTime: () => currentTime,
        getShareUrl: (shareOptions) => {
            const href = typeof window !== 'undefined' ? window.location.href : '';
            if (!shareOptions?.url && !href) return '';
            const url = new URL(shareOptions?.url ?? href, href || undefined);
            const media = getCurrentMedia();
            if (media) url.searchParams.set(shareMediaParam, media.metadata.global.media_id);

            const timecodeOption = shareOptions?.timecode ?? true;
            const timecode = typeof timecodeOption === 'number'
                ? timecodeOption
                : (timecodeOption ? currentTime : 0);
            if (timecode > 0) url.searchParams.set(shareTimecodeParam, String(Math.floor(timecode)));
            else url.searchParams.delete(shareTimecodeParam);

            return url.toString();
        },
        destroy: () => {
            window.removeEventListener('message', onPlayerMessage);
            container.innerHTML = '';
            container.classList.remove(...rootClasses);
            playerIframe = null;
            if (debug) console.debug('Playlist player destroyed.');
        }
    };
}
