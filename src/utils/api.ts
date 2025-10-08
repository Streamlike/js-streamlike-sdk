import { WebserviceResponse, BaseOptions, HostWs } from "../types/base";

/**
 * Adjusts the provided host string to ensure it includes a valid protocol.
 * If the host starts with "http" or "https", it is returned unchanged.
 * If the host starts with "//", "https:" is prepended to it.
 * For other cases, "https://" is added at the beginning.
 *
 * @param {string} host - The host string to be fixed.
 * @return {string} The fixed host string with the appropriate protocol.
 */
export function fixHost(host:string): string
{
    if (host.startsWith('http')) {
        return host;
    }
    if (host.startsWith('//')) {
        return `https:${host}`;
    }
    return `https://${host}`;
}

/**
 * Fetches data from the specified web service.
 * @internal
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
 * Fetches web service media information.
 * @internal
 */
export async function getWsMedia(mediaId: string, options?: BaseOptions): Promise<WebserviceResponse> {
    if (!mediaId) {
        throw new Error("Missing mediaId parameter");
    }
    const host = options?.host ?? HostWs.prod;
    const debug = options?.debug ?? false;
    const url = `${fixHost(host)}/ws/media?media_id=${mediaId}`;

    if (debug) {
        console.log({ options, url });
    }

    const ws = await getWs<any>(url, debug);
    if (ws.status !== 200 && debug) {
        console.error(`#error loading ws media (${ws.status}) : ${ws.info}`);
    }
    return ws;
}
