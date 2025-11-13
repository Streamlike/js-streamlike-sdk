// path: src/playerParams/iframeParams.ts
import {IframeOptions, TypePlayerId} from "../types/player";
import { getWsMedia} from "../api/media";
import {Media, MediaCallbackResponse} from "../types/api";
import {buildUrl} from "../utils/api";
import {MediaParams} from "../types/media";


/**
 * Configures and embeds a responsive iframe into the specified target element.
 * The iframe adapts its dimensions based on a specified or default aspect ratio.
 *
 * @param {string} id - The identifier of the media or content to be displayed in the iframe.
 * @param {string|HTMLElement} target - The target container where the iframe will be embedded.
 * It can be a DOM element or the ID of an element as a string.
 * @param {IframeOptions} [options] - Optional configuration for the iframe, including player parameters, iframe settings, and base options.
 * @return {Promise<Media>} A promise that resolves to a MediaCallbackResponse object, indicating success, data, or errors encountered during the process.
 */
export async function setResponsiveIframe(
    id: string,
    target: string | HTMLElement,
    options?: IframeOptions,
): Promise<MediaCallbackResponse> {
    const divParent = typeof target === 'string' ? document.getElementById(target) : target;
    if (!divParent || (!id)) {
        return {res: false, data: null, errors: "Missing parameters or invalid target."};
    }
    const debug = options?.baseOptions?.debug || false;
    if (debug) {
        console.groupCollapsed(`[setResponsiveIframe] set iframe for : ${id}`);
        console.debug(`divParent:`, divParent);
        console.debug(`IframeOptions:`, options);
    }

    const {playerParams = {}, iframeParams, typePlayerId = TypePlayerId.media, baseOptions = {}} = options ?? {};
    const mediaParams: MediaParams = {}
    const {allowfullscreen = true, allowautoplay = true, onLoad} = iframeParams || {};
    let ratio = 16 / 9;


    const createIframe = (src: string, currentRatio: number) => {
        if (debug) {
            console.groupCollapsed(`creatingIframe...`);
            console.debug(`src:`, src);
            console.debug(`currentRatio:`, currentRatio);
        }
        const iframePlayer = document.createElement("iframe");
        iframePlayer.src = src;
        iframePlayer.id = `media-${id}`;

        const allowPermissions: string[] = [];
        if (allowautoplay) allowPermissions.push('autoplay');
        if (allowfullscreen) {
            iframePlayer.allowFullscreen = true;
            allowPermissions.push('fullscreen');
        }
        if (allowPermissions.length > 0) iframePlayer.setAttribute("allow", allowPermissions.join('; '));
        if (onLoad) iframePlayer.addEventListener('load', onLoad);

        iframePlayer.style.width = '100%';
        iframePlayer.style.height = '100%';
        iframePlayer.style.border = '0';
        iframePlayer.style.overflow = 'hidden';

        divParent.innerHTML = '';
        divParent.style.overflow = "hidden";
        divParent.style.aspectRatio = `${currentRatio}`;
        divParent.appendChild(iframePlayer);

        if (debug) {
            console.debug('%c✔ iframe created', 'color: green', iframePlayer);

            console.groupEnd();
        }
    };

    let endpoint = '/play';
    switch (typePlayerId) {
        case TypePlayerId.media:
            playerParams.med_id = id;
            break;
        case TypePlayerId.permalink:
            playerParams.permalink = id;
            break;
        case TypePlayerId.streamout:
            playerParams.str_id = id;
            endpoint = '/streamout/play';
            break;
        case TypePlayerId.live:
            playerParams.live_id = id;
            break;

    }
    const srcPlayer = buildUrl(endpoint, playerParams, options?.baseOptions);

    if (typePlayerId === TypePlayerId.streamout) {
        createIframe(srcPlayer, ratio);
        if (debug) {
            console.groupEnd();
        }
        return {res: true, data: null, errors: null};
    }

    switch (typePlayerId) {
        case TypePlayerId.media:
            mediaParams.media_id = id;
            break;
        case TypePlayerId.permalink:
            mediaParams.permalink = id;
            break;
        case TypePlayerId.live:
            const parts = id.split("_");
            mediaParams.media_id = parts[parts.length - 1];
            break;
    }
    let media: Media | null = null;
    try {
        const response = await getWsMedia(mediaParams, baseOptions);
        if (response.res && response.data) {
            media = response.data.media;
            ratio = media.metadata.global.ratio;
        } else {
            if (baseOptions.debug) console.error(`Could not fetch media ratio : ${response.errors ?? "Unexpected error"}`);
        }
    } catch (error) {
        if (baseOptions.debug) console.error("Could not fetch media ratio, using default.", error);

    }
    createIframe(srcPlayer, ratio || 16 / 9);
    if (debug) {
        console.groupEnd();
    }
    return {res: true, data: media, errors: null};
}
