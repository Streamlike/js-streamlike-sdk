import { IframeOptions, TypeId } from "../types/player";
import { CallbackResponse, HostWs } from "../types/base";
import {fixHost, getWs} from "../utils/api";

/**
 * Sets up a responsive iframe within a specified target element.
 */
export async function setResponsiveIframe(
    target: string | HTMLElement,
    id: string,
    options: IframeOptions = {}
): Promise<CallbackResponse> {
    const divParent = typeof target === 'string' ? document.getElementById(target) : target;
    if (!divParent || !id) {
        return { res: false, data: null, errors: "Missing parameters or invalid target." };
    }

    const { player, iframe, typeId = TypeId.MedId, host = HostWs.prod, debug = false } = options;
    const { allowfullscreen = true, allowautoplay = true, onLoad } = iframe || {};
    let ratio = 1.77; // 16/9 default

    let playerOptionsString = player ? Object.entries(player).map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('') : "";

    const createIframe = (src: string, currentRatio: number) => {
        const iframePlayer = document.createElement("iframe");
        iframePlayer.src = src;
        iframePlayer.id = `media-${id}`;
        iframePlayer.frameBorder = "0";
        iframePlayer.scrolling = "no";

        const allowPermissions: string[] = [];
        if (allowautoplay) allowPermissions.push('autoplay');
        if (allowfullscreen) {
            iframePlayer.allowFullscreen = true;
            allowPermissions.push('fullscreen');
        }
        if (allowPermissions.length > 0) iframePlayer.setAttribute("allow", allowPermissions.join('; '));
        if (onLoad) iframePlayer.addEventListener('load', onLoad);

        iframePlayer.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; border:0;";

        divParent.innerHTML = '';
        divParent.style.position = "relative";
        divParent.style.overflow = "hidden";
        divParent.style.paddingTop = `${(1 / currentRatio) * 100}%`;
        divParent.appendChild(iframePlayer);
    };

    if (typeId === TypeId.Streamout) {
        createIframe(`${fixHost(host)}/streamout/play?str_id=${id}${playerOptionsString}`, ratio);
        return { res: true, data: null, errors: null };
    }

    const srcPlayer = `${fixHost(host)}/play?${typeId}=${id}${playerOptionsString}`;
    let mediaWsUrl: string;

    if (typeId === TypeId.Permalink) mediaWsUrl = `${fixHost(host)}/ws/media?permalink=${id}`;
    else if (typeId === TypeId.LiveId) {
        const parts = id.split("_");
        mediaWsUrl = `${fixHost(host)}/ws/media?media_id=${parts[parts.length - 1]}`;
    } else mediaWsUrl = `${fixHost(host)}/ws/media?media_id=${id}`;

    const ws = await getWs<any>(mediaWsUrl, debug);
    const dataMedia = ws.data?.media;
    if (ws.status === 200 && dataMedia?.metadata?.global?.ratio > 0) {
        ratio = dataMedia.metadata.global.ratio;
    } else if (debug) {
        console.error("Could not fetch media ratio, using default.");
    }

    createIframe(srcPlayer, ratio || 16 / 9);
    return { res: true, data: dataMedia, errors: null };
}
