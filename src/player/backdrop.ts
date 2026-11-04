// path: src/player/backdrop.ts

import {PlayerBridge} from "../metaplayer/bridge";
import {parseMosaicVtt} from "../features/preview";
import {Customization} from "../types/api";
import {MosaicSize, TimedMosaicFrame} from "../types/features";
import {BackdropOptions, BackdropSource} from "../types/player";

/**
 * Below this gap the media fills the frame: there is nothing to hide.
 */
const RATIO_TOLERANCE = 0.01;
const FADE_MS = 700;

/**
 * What a mounted backdrop hands back to the player.
 */
export interface MountedBackdrop {
    /** Element the player goes into */
    stage: HTMLElement;
    /** Starts following the playback of the player */
    follow: (iframe: HTMLIFrameElement) => void;
}

/**
 * How to take down the backdrop of a container, kept out of the DOM: a new
 * player in the same container must not leave the former one listening.
 */
const mounted = new WeakMap<HTMLElement, () => void>();

/**
 * Turns the `backdrop` option into complete settings.
 *
 * @param {boolean | BackdropOptions} [options] - The option as given.
 * @return {Required<BackdropOptions> | null} The settings, or null when the backdrop is off.
 */
export function resolveBackdropOptions(options?: boolean | BackdropOptions): Required<BackdropOptions> | null {
    if (!options) return null;
    const given = options === true ? {} : options;
    return {
        source: given.source ?? BackdropSource.Mosaic,
        ratio: given.ratio && given.ratio > 0 ? given.ratio : 16 / 9,
        blur: given.blur ?? 30,
        brightness: given.brightness ?? 0.7,
        mosaicSize: given.mosaicSize ?? MosaicSize.Large
    };
}

/**
 * Takes down the backdrop of a container, if it holds one.
 *
 * @param {HTMLElement} host - The container of the player.
 */
export function clearBackdrop(host: HTMLElement): void {
    mounted.get(host)?.();
    mounted.delete(host);
}

/**
 * The part of a picture holding the media. A storyboard may keep a vertical
 * media inside a wider cell: the bars around it must not reach the backdrop.
 */
function _cropToRatio(width: number, height: number, ratio: number): {x: number; y: number; width: number; height: number} {
    const cropWidth = Math.min(width, height * ratio);
    const cropHeight = Math.min(height, width / ratio);
    return {x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight};
}

/**
 * The frame shown at a given time, the frames being in order.
 */
function _frameAt(frames: TimedMosaicFrame[], time: number): TimedMosaicFrame | null {
    let low = 0;
    let high = frames.length - 1;
    let found: TimedMosaicFrame | null = null;
    while (low <= high) {
        const middle = (low + high) >> 1;
        if (frames[middle].start <= time) {
            found = frames[middle];
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    return found;
}

/**
 * Reads the storyboard of a media. A published URL does not guarantee the file:
 * the large one is announced on medias encoded before it existed, so every
 * storyboard the media lists is tried, the requested size first.
 */
async function _loadFrames(customization: Customization | undefined, size: MosaicSize, debug: boolean): Promise<TimedMosaicFrame[]> {
    const {board, mosaic} = customization ?? {};
    const urls = new Set([board?.[`${size}_url`], board?.large_url, board?.small_url, mosaic]);
    for (const url of urls) {
        if (!url) continue;
        try {
            const response = await fetch(url);
            const frames = response.ok ? parseMosaicVtt(await response.text()) : [];
            if (frames.length > 0) return frames;
        } catch (error) {
            if (debug) console.warn(`[backdrop] Could not read ${url}`, error);
        }
    }
    return [];
}

function _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Could not load ${url}`));
        image.src = url;
    });
}

/**
 * Prepares a container for a media narrower than the frame: the frame takes the
 * container, the backdrop fills it and a centred stage awaits the player.
 *
 * The player cannot draw outside its iframe, so the iframe is reduced to the
 * media and the page paints the rest. The fullscreen of the player applies to
 * the iframe alone, which is why the backdrop does not follow it there.
 *
 * @param {HTMLElement} host - The container of the player.
 * @param {number} mediaRatio - The aspect ratio of the media.
 * @param {Customization | undefined} customization - The cover and storyboards of the media.
 * @param {Required<BackdropOptions>} options - The settings of the backdrop.
 * @param {boolean} [debug=false] - Enables debug logging.
 * @return {MountedBackdrop | null} The stage, or null when the media fills the frame.
 */
export function mountBackdrop(
    host: HTMLElement,
    mediaRatio: number,
    customization: Customization | undefined,
    options: Required<BackdropOptions>,
    debug: boolean = false
): MountedBackdrop | null {
    const {source, ratio, blur, brightness, mosaicSize} = options;
    if (mediaRatio >= ratio - RATIO_TOLERANCE) {
        if (debug) console.debug('[backdrop] The media fills the frame, nothing to do', {mediaRatio, ratio});
        return null;
    }

    const {position, backgroundColor} = host.style;
    host.innerHTML = '';
    host.style.position = 'relative';
    host.style.overflow = 'hidden';
    host.style.backgroundColor = '#000';
    host.style.aspectRatio = `${ratio}`;

    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position: absolute; inset: 0; overflow: hidden; pointer-events: none;';

    // A blur fades towards its edges: the pictures overflow to keep them out of the frame.
    const overflow = blur * 2;
    const pictures = [0, 1].map(() => {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: absolute;
            top: ${-overflow}px;
            left: ${-overflow}px;
            width: calc(100% + ${overflow * 2}px);
            height: calc(100% + ${overflow * 2}px);
            object-fit: cover;
            filter: blur(${blur}px) brightness(${brightness});
            opacity: 0;
        `;
        layer.appendChild(canvas);
        return canvas;
    });

    const stage = document.createElement('div');
    stage.style.cssText = `position: relative; margin: 0 auto; width: ${mediaRatio / ratio * 100}%;`;
    host.appendChild(layer);
    host.appendChild(stage);

    let destroyed = false;
    let bridge: PlayerBridge | null = null;
    let frames: TimedMosaicFrame[] = [];
    let shown: TimedMosaicFrame | null = null;
    let front = 0;
    const sprites = new Map<string, Promise<HTMLImageElement>>();

    // The new picture fades in over the former one, which stays lit underneath:
    // crossing both would let the black of the frame through at every change.
    const paint = (image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
        const crop = _cropToRatio(width, height, mediaRatio);
        front = 1 - front;
        const canvas = pictures[front];
        canvas.style.transition = 'none';
        canvas.style.opacity = '0';
        canvas.width = Math.max(1, Math.round(crop.width));
        canvas.height = Math.max(1, Math.round(crop.height));
        canvas.getContext('2d')?.drawImage(image, x + crop.x, y + crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
        layer.appendChild(canvas);
        void canvas.offsetWidth;
        canvas.style.transition = `opacity ${FADE_MS}ms linear`;
        canvas.style.opacity = '1';
    };

    const showFrame = (time: number) => {
        const frame = _frameAt(frames, time);
        if (!frame || frame === shown) return;
        shown = frame;
        if (!sprites.has(frame.url)) sprites.set(frame.url, _loadImage(frame.url));
        sprites.get(frame.url)!
            .then(image => {
                // The playback may have moved on while the board was loading.
                if (!destroyed && shown === frame) paint(image, frame.x, frame.y, frame.width, frame.height);
            })
            .catch(error => {
                if (debug) console.warn('[backdrop]', error);
            });
    };

    const coverUrl = customization?.cover?.thumbnailextralarge_url;
    if (coverUrl) {
        _loadImage(coverUrl)
            .then(image => {
                // A frame already showing is closer to the picture than the cover.
                if (!destroyed && !shown) paint(image, 0, 0, image.naturalWidth, image.naturalHeight);
            })
            .catch(error => {
                if (debug) console.warn('[backdrop]', error);
            });
    }

    if (source === BackdropSource.Mosaic) {
        _loadFrames(customization, mosaicSize, debug).then(loaded => {
            frames = loaded;
            if (debug) console.debug(`[backdrop] ${loaded.length} frames`);
        });
    }

    mounted.set(host, () => {
        destroyed = true;
        bridge?.destroy();
        host.style.position = position;
        host.style.backgroundColor = backgroundColor;
    });

    return {
        stage,
        follow: iframe => {
            if (source !== BackdropSource.Mosaic) return;
            bridge = new PlayerBridge(() => iframe, debug);
            bridge.onProgress = showFrame;
        }
    };
}
