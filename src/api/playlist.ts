import {PlaylistParams} from "../types/playlist";
import {buildUrl, fetchData} from "../utils/api";
import {BaseOptions, CallbackResponse, MediaContainer, PlaylistResponse} from "../types/api";

/**
 * Fetches the playlist data using the provided parameters.
 *
 * @param {PlaylistParams} params - The parameters required for fetching the playlist. Must include at least one of: company_id, view_id, or playlist_id.
 * @param {BaseOptions} [options={}] - Optional configuration for the request, including debug mode.
 * @return {Promise<CallbackResponse<PlaylistResponse | null>>} - A promise that resolves to the response containing the playlist data or null.
 * @throws {Error} - Throws an error when none of the identifier parameters are provided in `params`.
 */
export async function getWsPlaylist(params: PlaylistParams, options: BaseOptions = {}): Promise<CallbackResponse<PlaylistResponse | null>> {
    if (!params.company_id && !params.view_id && !params.playlist_id) {
        throw new Error("Missing identifier parameter");
    }
    const endpoint = '/ws/playlist';
    const debug: boolean = options?.debug ?? false;
    if (debug) console.group(`%c[getWsMedia] calling ${endpoint}...`, {'color': 'cyan', 'font-weight': 'bold'});

    const url = buildUrl(endpoint, params, options);
    if (debug) console.debug(url);

    const response = await fetchData<PlaylistResponse | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }
    return response;
}

/**
 * Retrieves the size of a playlist based on the provided parameters.
 *
 * @param {PlaylistParams} params - The parameters to identify the playlist, which can include `company_id`, `view_id`, or `playlist_id`.
 * @param {BaseOptions} options - Additional options for the function execution, such as debug settings.
 * @return {Promise<number>} A promise that resolves to the size of the playlist.
 * @throws {Error} Throws an error if no identifier parameter is provided or if the response is invalid.
 */
export async function getPlaylistSize(params: PlaylistParams={}, options: BaseOptions = {}): Promise<number> {
    const debug: boolean = options?.debug ?? false;
    if (!params.company_id && !params.view_id && !params.playlist_id) {
        throw new Error("Missing identifier parameter");
    }
    if (debug) {
        console.debug('[getPlaylistSize] calling getWsPlaylist()...');
    }
    const response: CallbackResponse<PlaylistResponse | null> = await getWsPlaylist(params, options);
    if (!response.res || !response.data) {
        throw Error(response.errors ?? "Unexpected error");
    }
    return response.data.playlist.metadata.size
}

/**
 * Retrieves a list of media items from a specified playlist.
 *
 * @param {string} id - The unique identifier of the playlist to retrieve media from.
 * @param {PlaylistParams} [params={}] - Optional parameters to customize the playlist retrieval query.
 * @param {BaseOptions} [options={}] - Optional configurations for the request, such as debug settings.
 * @return {Promise<MediaContainer[]>} A promise that resolves to an array of media items contained in the specified playlist.
 * @throws Will throw an error if the response is invalid or an unexpected error occurs.
 */
export async function getMediasFromPlaylist(id:string, params: PlaylistParams={}, options: BaseOptions = {}): Promise<MediaContainer[]> {
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.debug(`[getMediasFromPlaylist] calling getWsPlaylist() with playlist_id: ${id}...`);
    }
    params.playlist_id = id;
    const response: CallbackResponse<PlaylistResponse | null> = await getWsPlaylist(params, options);
    if (!response.res || !response.data) {
        throw Error(response.errors ?? "Unexpected error");
    }
    return response.data.playlist.medias;
}

/**
 * Fetches medias belonging to a specific company by its ID using the provided parameters and options.
 *
 * @param {string} id - The unique identifier of the company whose medias are to be fetched.
 * @param {PlaylistParams} [params={}] - The parameters to refine or customize the media retrieving query.
 * @param {BaseOptions} [options={}] - Additional options such as debug settings for the request.
 * @return {Promise<MediaContainer[]>} A promise that resolves to a list of media containers associated with the specified company.
 */
export async function getMediasFromCompany(id:string, params: PlaylistParams= {}, options: BaseOptions = {}): Promise<MediaContainer[]> {
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.debug(`[getMediasFromCompany] calling getWsPlaylist() with company_id: ${id}...`);
    }
    params.company_id = id;
    const response: CallbackResponse<PlaylistResponse | null> = await getWsPlaylist(params, options);
    if (!response.res || !response.data) {
        throw Error(response.errors ?? "Unexpected error");
    }
    return response.data.playlist.medias;
}


/**
 * Fetches the media items from a specific view based on the provided identifier and parameters.
 *
 * @param {string} id - The identifier of the view from which to retrieve media items.
 * @param {PlaylistParams} [params={}] - Optional parameters to customize the playlist request.
 * @param {BaseOptions} [options={}] - Optional base options, such as debug flag, for additional configurations.
 * @return {Promise<MediaContainer[]>} A promise that resolves to an array of MediaContainer objects.
 */
export async function getMediasFromView(id:string, params: PlaylistParams={}, options: BaseOptions = {}): Promise<MediaContainer[]> {
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.debug(`[getMediasFromView] calling getWsPlaylist() with view_id: ${id}...`);
    }
    params.view_id = id;
    const response: CallbackResponse<PlaylistResponse | null> = await getWsPlaylist(params, options);
    if (!response.res || !response.data) {
        throw Error(response.errors ?? "Unexpected error");
    }
    return response.data.playlist.medias;
}