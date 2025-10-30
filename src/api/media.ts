// path: src/api/mediaParams.ts
import {BaseOptions, CallbackResponse, MediaContainer, MediaMetadata, Statistics} from "../types/api";
import {buildUrl, fetchData,} from "../utils/api";
import {MediaParams} from "../types/media";


/**
 * Fetches media content from the specified web service (WS) endpoint using
 * the provided parameters and options. This method requires either a `media_id`
 * or a `permalink` in the `params` to identify the media.
 *
 * @param {MediaParams} [params={}] The parameters object that must include either
 * a `media_id` or a `permalink` to identify the media resource.
 * @param {BaseOptions} [options={}] Additional options which can include a debug flag.
 * @return {Promise<CallbackResponse<MediaContainer | null>>} A promise that resolves
 * to the media content wrapped in a callback response or `null` if not found.
 */
export async function getWsMedia(params: MediaParams = {}, options: BaseOptions = {}): Promise<CallbackResponse<MediaContainer | null>> {
    if (!params.media_id && !params.permalink) {
        throw new Error("Missing identifier parameter");
    }
    const endpoint = '/ws/media';
    const debug: boolean = options.debug ?? false;
    if (debug) console.groupCollapsed(`%c[getWsMedia]`, 'color:cyan');

    const url = buildUrl(endpoint, params, options);
    if (debug) console.debug(url);

    const response = await fetchData<MediaContainer | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }

    return response;
}

/**
 * Retrieves media information based on the provided media ID.
 *
 * @param {string} id - The unique identifier for the media to retrieve.
 * @param {MediaParams} [params={}] - Optional parameters for the media query.
 * @param {BaseOptions} [options={}] - Optional configuration options, such as debug mode.
 * @return {Promise<MediaContainer | null>} Returns a promise that resolves to the media container object if found, or null if not found.
 */
export async function getMediaFromId(id: string, params: MediaParams = {}, options: BaseOptions = {}): Promise<MediaContainer | null> {
    const debug: boolean = options.debug ?? false;
    if (debug) console.groupCollapsed(`[getMediaFromId] : ${id}`);
    params.media_id = id;
    const response: CallbackResponse<MediaContainer | null> = await getWsMedia(params, options);
    if (!response.res) {
        if (debug) console.groupEnd();
        throw Error(response.errors ?? "Unexpected error");
    }
    if (debug) console.groupEnd();
    return response.data ?? null;
}


/**
 * Retrieves media information from a given permalink.
 *
 * @param {string} permalink - The permalink of the media to be retrieved.
 * @param {MediaParams} [params] - Optional parameters for the media request.
 * @param {BaseOptions} [options] - Optional base options including debug settings.
 * @return {Promise<MediaContainer | null>} A promise that resolves with the media container if found, or null if no media is found.
 */
export async function getMediaFromPermalink(permalink: string, params: MediaParams={}, options: BaseOptions={}): Promise<MediaContainer | null> {
    const debug: boolean = options.debug ?? false;
    if (debug) console.groupCollapsed(`[getMediaFromPermalink] : ${permalink}`);
    params.media_id = permalink;
    const response: CallbackResponse<MediaContainer | null> = await getWsMedia(params, options);
    if (!response.res) {
        if (debug) console.groupEnd();
        throw Error(response.errors ?? "Unexpected error");
    }
    if (debug) console.groupEnd();
    return response.data ?? null;
}

/**
 * Fetches and retrieves media metadata based on provided parameters and options.
 *
 * @param {MediaParams} [params={}] - The parameters to filter or specify the media query.
 * @param {BaseOptions} [options={}] - Additional options for the request, such as debug mode.
 * @return {Promise<MediaMetadata|null>} A Promise resolving to the media metadata or null if no metadata is found.
 */
export async function getMediaMetadata(params: MediaParams={}, options: BaseOptions={}): Promise<MediaMetadata | null> {
    const debug: boolean = options.debug ?? false;
    if (debug) console.groupCollapsed('[getMediaMetadata]');

    const response: CallbackResponse<MediaContainer | null> = await getWsMedia(params, options);
    if (!response.res) {
        if (debug) console.groupEnd();
        throw Error(response.errors ?? "Unexpected error");
    }
    if (debug) console.groupEnd();
    return response.data?.media.metadata ?? null;
}

/**
 * Fetches media statistics based on the provided parameters and configuration options.
 *
 * @param {MediaParams} [params={}] - The parameters used to filter or identify the media for which statistics are required.
 * @param {BaseOptions} [options={}] - Additional options including debug configuration.
 * @return {Promise<Statistics | null>} - A promise that resolves to media statistics or null if not available.
 */
export async function getMediaStatistics(params: MediaParams={}, options: BaseOptions={}): Promise<Statistics | null> {
    const debug: boolean = options.debug ?? false;
    if (debug) console.debug('[getMediaStatistics]');

    const response: CallbackResponse<MediaContainer | null> = await getWsMedia(params, options);
    if (!response.res) {
        if (debug) console.groupEnd();
        throw Error(response.errors ?? "Unexpected error");
    }
    if (debug) console.groupEnd();
    return response.data?.media.statistics ?? null;
}
