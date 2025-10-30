// path: src/utils/api.ts
import {BaseOptions, CallbackResponse, WebserviceResponse} from "../types/api";

/**
 * Defines available hosts for the API.
 */
enum HostWs {
    streamlike = 'https://cdn.streamlike.com',
}

/**
 * Adjusts the provided host string to ensure it includes the appropriate protocol.
 * If the host already starts with "http", it will be returned as is
 * Otherwise; the current protocol is prepended to the host.
 *
 * @param {string} host - The host string to be fixed, which may or may not include a protocol.
 * @param forceHttps
 * @return {string} The host string with the appropriate protocol added.
 */
export function fixHost(host: string, forceHttps: boolean = true): string {
    const protocol = forceHttps ? "https:" : (typeof window !== 'undefined' ? window.location.protocol : 'https:');

    if (host.startsWith('http://') && forceHttps) return `https://${host.slice(7)}`;
    if (host.startsWith('http')) return host;
    if (host.startsWith('//')) return `${protocol}${host}`;
    return `${protocol}//${host}`;
}

/**
 * Fetches data from the specified web service URL and returns a structured response object.
 *
 * @param {string} url - The URL of the web service to fetch data from.
 * @param {boolean} [debug=false] - A flag to enable error logging in case of network request failure.
 * @return {Promise<WebserviceResponse>} A promise that resolves with the web service response including status, info, and data.
 */
export async function getWs<T>(url: string, debug: boolean = false): Promise<WebserviceResponse<T>> {
    try {
        const response = await fetch(url);
        const data = await response.json().catch(() => null);

        return {
            status: response.status,
            info: response.statusText,
            data: data,
        };
    } catch (error) {
        if (debug) {
            console.error("Error with fetch request:", error);
        }
        return {
            status: 0,
            info: error instanceof Error ? error.message : "Network request failed",
            data: null,
        };
    }
}


/**
 * Type guard to check if an object is a WebserviceResponse.
 * @param data The object to check.
 * @returns True if the object matches the WebserviceResponse structure.
 */
function isWebserviceResponse(data: any): data is WebserviceResponse {
    return (
        data &&
        typeof data.status === 'number' &&
        typeof data.info === 'string' &&
        'data' in data
    );
}

/**
 * Constructs a complete URL by appending query parameters to the given endpoint.
 *
 * @param {string} endpoint - The endpoint or path of the URL to be joined with the base host.
 * @param {Record<string, any>} params - An object containing query parameters to append to the URL.
 *    - If a parameter value is an array, each element is appended with `[]` suffix.
 *    - Null or undefined values are skipped.
 * @param {BaseOptions} [options] - Optional configuration object that may include the base host.
 *    - If no host is provided in options, a default production host is used.
 * @returns {string} - The fully constructed URL with appended query parameters.
 */
export const buildUrl = (
    endpoint: string,
    params: Record<string, any>,
    options?: BaseOptions
): string => {
    const debug = options?.debug || false;
    if (debug){
        console.groupCollapsed(`%c[SDK] Building URL: ${endpoint}`,'color: pink; font-weight: bold;');
        console.log(`Params:`, params);
        console.log(`Options:`, options);
    }
    // Use URL constructor for robust URL joining
    let host = options?.host || HostWs.streamlike;
    host = fixHost(host);
    const url = new URL(endpoint, host);

    // Iterate over parameter object
    Object.entries(params).forEach(([key, value]) => {
        // Skip null or undefined values
        if (value === null || value === undefined) {
            return;
        }

        if (Array.isArray(value)) {
            // Handle array values by appending '[]' to the key
            // e.g., not_media_ids=[1, 2] becomes not_media_ids[]=1&not_media_ids[]=2
            value.forEach((item) => {
                url.searchParams.append(`${key}[]`, String(item));
            });
        } else {
            // Handle single values
            url.searchParams.append(key, String(value));
        }
    });
    if (debug){
        console.log(`url:`,url.toString());
        console.groupEnd();
    }
    return url.toString();
};

/**
 * Fetches data from a URL and returns it in a standardized CallbackResponse.
 *
 * This function is "smart":
 * 1. If the response JSON matches the `WebserviceResponse` structure
 * (e.g., from /ws/playlist), it unwraps the `data` property.
 * 2. If the response JSON does *not* match (e.g., from /ws/countries),
 * it returns the JSON data directly.
 *
 * @param url The complete URL to fetch.
 * @param debug Whether to log debug information.
 * @returns A promise that resolves to a CallbackResponse containing the relevant data.
 */
export const fetchData = async <T = any>(
    url: string,
    debug?: boolean
): Promise<CallbackResponse<T>> => {
    if (debug) {
        console.log(`[SDK] Fetching data from: ${url}`);
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            if (debug) {
                console.error(`[SDK] HTTP error! Status: ${response.status}`, errorText);
            }
            return {
                res: false,
                data: null,
                errors: `HTTP error! Status: ${response.status}`,
            };
        }

        const data = await response.json();

        // Check if it's a standard WebserviceResponse (e.g., from /ws/playlist)
        if (isWebserviceResponse(data)) {
            if (data.status === 200 || data.status === 0) { // Assuming 0 is also a success status
                // Success, return the unwrapped 'data' property
                return {res: true, data: data.data as T, errors: null};
            } else {
                // Webservice returned an internal error
                if (debug) {
                    console.error(
                        `[SDK] Webservice error! Status: ${data.status}`,
                        data.info
                    );
                }
                return {res: false, data: null, errors: data.info || 'Webservice error'};
            }
        }

        // If not a WebserviceResponse, assume direct data (e.g., /ws/countries)
        // The generic T will be the data structure itself (e.g., CountriesResponse)
        return {res: true, data: data as T, errors: null};
    } catch (error) {
        if (debug) {
            console.error(`[SDK] Fetch failed:`, error);
        }
        return {res: false, data: null, errors: (error as Error).message};
    }
};