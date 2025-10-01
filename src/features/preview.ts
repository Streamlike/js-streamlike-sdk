import {InteractivePreviewOptions, MediaCustomization, MosaicFrame, PreviewMode} from "../types/features";
import {CallbackResponse, HostWs} from "../types/base";

function _parseVttIndexes(text: string): MosaicFrame[] {
    const coordinates: MosaicFrame[] = [];
    const lineRegex = /^(.*?)#xywh=(\d+),(\d+),\d+,\d+$/;
    for (const line of text.trim().split('\n')) {
        const match = line.match(lineRegex);
        if (match) {
            coordinates.push({
                url: match[1].startsWith('//') ? `https:${match[1]}` : match[1],
                x: parseInt(match[2], 10),
                y: parseInt(match[3], 10)
            });
        }
    }
    return coordinates;
}

/**
 * Initializes an interactive preview for a media in a target container.
 */
export async function generateThumbnail(
    target: string | HTMLElement,
    mediaCustomization: MediaCustomization,
    options: InteractivePreviewOptions
): Promise<CallbackResponse> {
    const previewBox = typeof target === 'string' ? document.getElementById(target) : target;
    if (!previewBox) return {res: false, data: null, errors: "Invalid target element."};
    if (!mediaCustomization) return {res: false, data: null, errors: "Missing mediaCustomization"};


    const {
        mode = 'scrubbing',
        duration = 8,
        fps = 6,
        mosaicSize = 'large',
        debug = false
    } = options;

    if (debug) {
        console.groupCollapsed(`generateInteractivePreview`);
        console.log(target);
        console.log(mediaCustomization);
        console.log(options);
        console.groupEnd();
    }

    let allFrames: MosaicFrame[], activeFrames: MosaicFrame[] = [],
        animationInterval: number, currentFrame = 0,
        lastUsedMosaicUrl: string | null = null;

    previewBox.style.cssText = `background-image: url('${mediaCustomization.cover.thumbnailextralarge_url}'); background-size: cover; background-position: center; cursor: pointer;`;
    if (mode === PreviewMode.Fixed) {
        return {res: true, data: null, errors: null};
    }

    const showFrame = (frame: MosaicFrame) => {
        if (!frame) return;
        if (lastUsedMosaicUrl !== frame.url) {
            previewBox.style.backgroundImage = `url('${frame.url}')`;
            lastUsedMosaicUrl = frame.url;
        }
        previewBox.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
    };

    const calculateAndSampleFrames = () => {
        if (allFrames.length === 0) return;
        const desiredCount = Math.max(2, Math.floor(duration * fps));
        if (desiredCount >= allFrames.length) {
            activeFrames = [...allFrames];
            return;
        }
        const sampled: MosaicFrame[] = [];
        const lastIndex = allFrames.length - 1;
        for (let i = 0; i < desiredCount; i++) {
            sampled.push(allFrames[Math.round(i / (desiredCount - 1) * lastIndex)]);
        }
        activeFrames = sampled;
    };

    if (mode === PreviewMode.Animation) {
        previewBox.addEventListener('mouseenter', () => {
            if (activeFrames.length === 0) return;
            previewBox.style.backgroundSize = 'auto';
            if (mode === PreviewMode.Animation) {
                animationInterval = window.setInterval(() => {
                    showFrame(activeFrames[currentFrame]);
                    currentFrame = (currentFrame + 1) % activeFrames.length;
                }, 1000 / fps);
            }
        });


    }
    if (mode === PreviewMode.Scrubbing) {
        previewBox.addEventListener('mousemove', (event) => {
            if (activeFrames.length > 0) {
                const rect = previewBox.getBoundingClientRect();
                previewBox.style.backgroundSize = 'auto';
                const frameIndex = Math.min(activeFrames.length - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * activeFrames.length)));
                showFrame(activeFrames[frameIndex]);
            }
        });
    }

    previewBox.addEventListener('mouseleave', () => {
        clearInterval(animationInterval);
        currentFrame = 0;
        lastUsedMosaicUrl = null;
        previewBox.style.backgroundImage = `url('${mediaCustomization.cover.thumbnailextralarge_url}')`;
        previewBox.style.backgroundSize = 'cover';
        previewBox.style.backgroundPosition = 'center';
    });





    try {
        if (!mediaCustomization.board) {
            previewBox.style.cssText = `background-image: url('${mediaCustomization.cover.thumbnailextralarge_url}'); background-size: cover; background-position: center; cursor: pointer;`;
            return {res: true, data: null, errors: 'board not found'};
        }
        console.log(mediaCustomization);
        console.log(mediaCustomization.board[`${mosaicSize}_url`]);
        const response = await fetch(mediaCustomization.board[`${mosaicSize}_url`]);
        if (!response.ok) throw new Error(`Media VTT not found.`);
        allFrames = _parseVttIndexes(await response.text());
        calculateAndSampleFrames();
        if (allFrames.length === 0 && debug) console.warn("No frames found.");
        previewBox.style.cursor = 'pointer';
        return {res: true, data: {framesCount: allFrames.length}, errors: null};

    } catch (error: any) {
        if (debug) console.error(error.message);
        previewBox.style.cssText = `background-image: url('${mediaCustomization.cover.thumbnailextralarge_url}'); background-size: cover; background-position: center; cursor: pointer;`;
        return {res: false, data: null, errors: error.message};
    }
}
