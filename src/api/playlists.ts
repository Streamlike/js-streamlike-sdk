import {BaseOptions, CallbackResponse, PlaylistItem, PlaylistsResponse} from "../types/api";
import {buildUrl, fetchData} from "../utils/api";
import {PlaylistsParams} from "../types/playlists";

/**
 * Fetches playlists for a specific company based on provided parameters.
 *
 * @param {PlaylistsParams} params - The parameters required to fetch playlists, including the company identifier.
 * @param {BaseOptions} [options={}] - Optional configurations for the request, such as debug mode.
 * @return {Promise<CallbackResponse<PlaylistsResponse | null>>} A promise resolving to the list if playlists or null.
 */
export async function getWsPlaylists(params: PlaylistsParams, options: BaseOptions = {}): Promise<CallbackResponse<PlaylistsResponse | null>> {
    if (!params.company_id) {
        throw new Error("Missing identifier parameter");
    }
    const endpoint = '/ws/playlists';
    const debug: boolean = options?.debug ?? false;
    if (debug) console.group(`%c[getWsPlaylists] calling ${endpoint}...`, {'color': 'cyan', 'font-weight': 'bold'});

    const url = buildUrl(endpoint, params, options);
    if (debug) console.debug(url);

    const response = await fetchData<PlaylistsResponse | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }
    return response;
}

/**
 * Retrieves a list of playlists based on the given parameters.
 *
 * @param {PlaylistsParams} params - The parameters for fetching playlists.
 * @param {BaseOptions} [options={}] - Optional configuration options. Includes a debug flag for console debugging.
 * @return {Promise<PlaylistItem[]>} A promise that resolves to an array of PlaylistItem objects.
 */
export async function getPlaylists(params: PlaylistsParams, options: BaseOptions = {}): Promise<PlaylistItem[]> {
    if (!params.company_id) {
        throw new Error("Missing identifier parameter");
    }
    const debug: boolean = options?.debug ?? false;
    if (debug) console.debug('[getPlaylists] calling getWsPlaylist()...');

    const response: CallbackResponse<PlaylistsResponse | null> = await getWsPlaylists(params, options);
    if (!response.res || !response.data) {
        throw Error(response.errors ?? "Unexpected error");
    }
    return response.data.playlists;
}