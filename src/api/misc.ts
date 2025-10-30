// path: src/api/misc.ts
import {buildUrl, fetchData} from "../utils/api";
import {
    CountriesParams,
    CountriesResponse,
    LanguagesParams,
    LanguagesResponse, NowPlayingParams,
    NowPlayingResponse, ResumeParams
} from "../types/misc";
import {BaseOptions, CallbackResponse, ResumeResponse} from "../types/api";

/**
 * Retrieves a list of countries based on the provided parameters and options.
 *
 * @param {CountriesParams} params - The parameters used to filter the list of countries.
 * @param {BaseOptions} [options] - Optional settings such as debug mode or additional configurations.
 * @return {Promise<CallbackResponse<CountriesResponse | null>>} A promise that resolves to the response containing country data or null.
 */
export async function getWsCountries(params: CountriesParams, options?: BaseOptions): Promise<CallbackResponse<CountriesResponse | null>> {
    const endpoint = '/ws/countries';
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.group(`%c[getCountries] calling ${endpoint}...`, {'color': 'cyan', 'font-weight': 'bold'});
    }
    // Build the complete URL
    const url = buildUrl(endpoint, params, options);

    const response = await fetchData<CountriesResponse | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }
    // Fetch the data
    return response;
}

/**
 * Fetches the list of available languages from the given endpoint.
 *
 * @param {LanguagesParams} params - Parameters required to fetch the languages.
 * @param {BaseOptions} [options] - Optional settings such as debug mode or additional configurations.
 * @return {Promise<CallbackResponse<LanguagesResponse | null>>} A promise that resolves to the response containing
 *         the list of languages or null if no languages are returned.
 */
export async function getWsLanguages(params: LanguagesParams, options?: BaseOptions): Promise<CallbackResponse<LanguagesResponse | null>> {
    const endpoint = '/ws/languages';
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.group(`%c[getLanguages] calling ${endpoint}...`, {'color': 'cyan', 'font-weight': 'bold'});
    }
    // Build the complete URL
    const url = buildUrl(endpoint, params, options);

    // Fetch the data
    const response = await fetchData<LanguagesResponse | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }
    // Fetch the data
    return response;
}

/**
 * Fetches the currently playing track information from the `/ws/nowplaying` endpoint.
 *
 * @param {NowPlayingParams} params - The parameters required to fetch the now playing data.
 * @param {BaseOptions} [options] - Optional configuration options for the request, such as debug mode.
 * @return {Promise<CallbackResponse<NowPlayingResponse | null>>} A promise that resolves to the now playing data wrapped in a callback response, or null if no data is available.
 */
export async function getWsNowPlaying(params: NowPlayingParams, options?: BaseOptions): Promise<CallbackResponse<NowPlayingResponse | null>> {
    const endpoint = '/ws/nowplaying';
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.group(`%c[getNowPlaying] calling ${endpoint}...`, {'color': 'cyan', 'font-weight': 'bold'});
    }
    // Build the complete URL
    const url = buildUrl(endpoint, params, options);

    // Fetch the data
    const response = await fetchData<NowPlayingResponse | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }
    // Fetch the data
    return response;
}


/**
 * Fetches the resume data from the specified endpoint with given parameters and options.
 *
 * @param {ResumeParams} params - The parameters required for building the resume request.
 * @param {BaseOptions} [options] - Optional configuration options, such as debug settings.
 * @return {Promise<CallbackResponse<ResumeResponse | null>>} A promise that resolves to the resume response, or null if no data is available.
 */
export async function getWsResume(params: ResumeParams, options?: BaseOptions): Promise<CallbackResponse<ResumeResponse | null>> {
    const endpoint = '/ws/resume';
    const debug: boolean = options?.debug ?? false;
    if (debug) {
        console.group(`%c[getResume] calling ${endpoint}...`, {'color': 'cyan', 'font-weight': 'bold'});
    }
    // Build the complete URL
    const url = buildUrl(endpoint, params, options);

    // Fetch the data
    const response = await fetchData<ResumeResponse | null>(url, debug);
    if (debug) {
        console.debug(response);
        console.groupEnd();
    }
    // Fetch the data
    return response;
}

