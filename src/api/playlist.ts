import {GetMediasOptions} from "../types/api";
import {HostWs} from "../types/base";
import {getWs} from "../utils/api";

/**
 * Fetches a list of media based on various criteria.
 */
export async function getMedias(id: string | string[], options: GetMediasOptions = {}): Promise<any> {
    if (!id) throw new Error("Missing id parameter");

    const host = options?.host ?? HostWs.prod;
    const { type, playlist, api, debug } = options;

    let urlParams = "";
    if (playlist) {
        Object.entries(playlist).forEach(([name, value]) => {
            if (Array.isArray(value)) {
                value.forEach(item => urlParams += `&${name}[]=${item}`);
            } else {
                urlParams += `&${name}=${value}`;
            }
        });
    }

    let url = api ? `https://${host}${urlParams.replace('&', '?')}` : `https://${host}/ws/playlist`;

    if (!api) {
        if (type === 'company_id') url += `?company_id=${id}`;
        else if (type === 'view_id') url += `?view_id=${id}`;
        else { // playlist_id is default
            const playlistIds = Array.isArray(id) ? id.map(pId => `playlist_id[]=${pId}`).join('&') : `playlist_id=${id}`;
            url += `?${playlistIds}`;
        }
        url += urlParams;
    }

    if (debug) console.log(options, url);

    const ws = await getWs<any>(url, debug);
    if (ws.status !== 200 && debug) {
        console.error(`#error loading ws playlist (${ws.status}) : ${ws.info}`);
    }
    return ws.data ?? null;
}