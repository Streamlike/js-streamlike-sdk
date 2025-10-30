import {BaseOptions, CallbackResponse, MediaContainer} from "../types/api";
import {buildUrl, fetchData,} from "../utils/api";
import {RelatedParams} from "../types/related";

/**
 * Fetches related media data from the /ws/related endpoint.
 *
 * @param {RelatedParams} params - Parameters required to fetch related media. Must include the media_id.
 * @param {BaseOptions} [options={}] - Optional configuration options such as debug mode.
 * @return {Promise<CallbackResponse<MediaContainer[] | null>>} - A promise that resolves with the response data, which includes an array of media containers or null if none are found.
 * @throws {Error} - Throws an error if the media_id parameter is missing.
 */
export async function getWsRelated( params: RelatedParams, options: BaseOptions = {}): Promise<CallbackResponse<MediaContainer[] | null>> {
    if (!params.media_id) {
        throw new Error("Missing identifier parameter");
    }
    const endpoint = '/ws/related';
    const debug: boolean = options?.debug ?? false;
    if (debug) console.group(`%c[getWsMedia] calling ${endpoint}...`, {'color': 'cyan', 'font-weight': 'bold'});

    const url = buildUrl(endpoint, params, options);
    if (debug) console.debug(url);

    const response = await fetchData<MediaContainer[] | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }
    return response;
}

/**
 * Retrieves related media information based on a given media ID.
 *
 * @param {string} id - The unique identifier of the media for which related data is to be fetched.
 * @param {RelatedParams} [params] - Optional parameters for customizing the request. Automatically includes the media ID if not provided.
 * @param {BaseOptions} [options={}] - Additional options for the request, such as debug mode.
 * @return {Promise<MediaContainer[]>} A promise that resolves to an array of related media containers.
 */
export async function getMediasRelated(id:string, params?: RelatedParams, options: BaseOptions = {}): Promise<MediaContainer[]> {
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.debug(`[getMediasRelated] calling getWsRelated() with media_id: ${id}...`);
    }
    if (!params) {
        params = {media_id : id};
    }else{
        params.media_id = id;
    }
    const response: CallbackResponse<MediaContainer[] | null> = await getWsRelated(params, options);
    if (!response.res || !response.data) {
        throw Error(response.errors ?? "Unexpected error");
    }
    return response.data;
}