import { WebserviceResponse, BaseOptions, HostWs } from "../types/base";

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
    const url = `https://${host}/ws/media?media_id=${mediaId}`;

    if (debug) {
        console.log({ options, url });
    }

    const ws = await getWs<any>(url, debug);
    if (ws.status !== 200 && debug) {
        console.error(`#error loading ws media (${ws.status}) : ${ws.info}`);
    }
    return ws;
}
