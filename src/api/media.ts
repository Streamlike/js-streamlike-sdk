import { GetRelatedOptions } from "../types/api";
import { BaseOptions, HostWs } from "../types/base";
import {fixHost, getWs, getWsMedia} from "../utils/api";

/**
 * Fetches metadata for a given media ID.
 */
export async function getMetadata(mediaId: string, options?: BaseOptions): Promise<any> {
    const ws = await getWsMedia(mediaId, options);
    return ws.data?.media?.metadata ?? null;
}

/**
 * Fetches statistics for a given media ID.
 */
export async function getStatistics(mediaId: string, options?: BaseOptions): Promise<any> {
    const ws = await getWsMedia(mediaId, options);
    return ws.data?.media?.statistics ?? null;
}


/**
 * Fetches related media for a given media ID.
 */
export async function getRelated(mediaId: string, options: GetRelatedOptions = {}): Promise<any> {
    if (!mediaId) throw new Error("Missing mediaId parameter");

    const host = options?.host ?? HostWs.prod;
    const { related, debug } = options;
    let url = `${fixHost(host)}/ws/related?media_id=${mediaId}`;

    if (related) {
        url += Object.entries(related).map(([name, value]) => `&${name}=${value}`).join('');
    }

    if (debug) console.log(options, url);

    const ws = await getWs<any>(url, debug);
    if (ws.status !== 200 && debug) {
        console.error(`#error loading ws related (${ws.status}) : ${ws.info}`);
    }
    return ws.data ?? null;
}
