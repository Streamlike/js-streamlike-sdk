import {CallbackResponse} from "../types/api";
import {TrimmerOptions, MosaicFrame} from "../types/features";
import {setResponsiveIframe} from "../player/iframe";

function _parseVttIndexes(text: string): MosaicFrame[] {
    const coordinates: MosaicFrame[] = [];
    const lineRegex = /^(.*?)#xywh=(\d+),(\d+),(\d+),(\d+)$/;
    for (const line of text.trim().split('\n')) {
        const match = line.match(lineRegex);
        if (match) {
            coordinates.push({
                url: match[1].startsWith('//') ? `https:${match[1]}` : match[1],
                x: parseInt(match[2], 10),
                y: parseInt(match[3], 10),
                width: parseInt(match[4], 10),
                height: parseInt(match[5], 10)
            });
        }
    }
    return coordinates;
}

/** Crée une image de vignette depuis une frame du storyboard */
function _createMosaicView(): { wrapper: HTMLDivElement, img: HTMLImageElement } {
    const img = document.createElement('img');
    img.style.cssText = 'position: absolute; display: block;';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: absolute; overflow: hidden; top: 0; left: 0;';
    wrapper.appendChild(img);
    return {wrapper, img};
}

/** Applique une frame à un wrapper + img */
function _applyFrame(
    frame: MosaicFrame,
    img: HTMLImageElement,
    wrapper: HTMLDivElement,
    scale: number,
    onApplied?: () => void
) {
    wrapper.style.width = `${(frame.width || 210) * scale}px`;
    wrapper.style.height = `${(frame.height || 168) * scale}px`;

    const applyPixels = () => {
        if (!img.naturalWidth) return;
        img.style.width = `${img.naturalWidth * scale}px`;
        img.style.height = `${img.naturalHeight * scale}px`;
        img.style.left = `-${frame.x * scale}px`;
        img.style.top = `-${frame.y * scale}px`;
        onApplied?.();
    };

    if (img.src !== frame.url) {
        img.src = frame.url;
    }
    if (!img.complete || img.naturalWidth === 0) {
        img.onload = () => {
            applyPixels();
            img.onload = null;
        };
    } else {
        applyPixels();
    }
}

/**
 * Generates an interactive trimmer inside a target element.
 */
export async function generateTrimmer(
    target: string | HTMLElement,
    options: TrimmerOptions
): Promise<CallbackResponse> {
    const container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!container) return {res: false, data: null, errors: "Invalid target element."};

    const {
        duration,
        mediaUrl,
        aspectRatio = 16 / 9,
        debug = false,
        mediaCustomization,
        mediaId,
        baseOptions
    } = options;

    const startInput = typeof options.startInput === 'string'
        ? document.getElementById(options.startInput) as HTMLInputElement
        : options.startInput;
    const currentTimeInput = typeof options.currentTimeInput === 'string'
        ? document.getElementById(options.currentTimeInput) as HTMLInputElement
        : options.currentTimeInput;

    const endInput = typeof options.endInput === 'string'
        ? document.getElementById(options.endInput) as HTMLInputElement
        : options.endInput;

    const playButton = typeof options.playButton === 'string'
        ? document.getElementById(options.playButton) as HTMLButtonElement
        : options.playButton;
    const stopButton = typeof options.stopButton === 'string'
        ? document.getElementById(options.stopButton) as HTMLButtonElement
        : options.stopButton;


    if (!startInput || !endInput) return {res: false, data: null, errors: "Invalid start or end input element."};
    if (!duration || duration <= 0) return {res: false, data: null, errors: "Invalid duration."};

    let startTime = Math.max(0, options.initialStart || 0);
    let endTime = Math.min(duration, options.initialEnd || duration);
    if (startTime >= endTime) {
        startTime = 0;
        endTime = duration;
    }

    if (debug) {
        console.groupCollapsed(`generateTrimmer`);
        console.log("mediaId:", mediaId, "| startTime:", startTime, "| endTime:", endTime);
        console.log("mediaCustomization:", mediaCustomization);
        console.log("playButton:", playButton);
        console.log("stopButton:", stopButton);
        console.groupEnd();
    }

    // --- Container setup ---
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.backgroundColor = '#000';
    container.style.userSelect = 'none';
    container.style.overflow = 'visible'; // allow tooltips to overflow

    if ('aspectRatio' in container.style) {
        container.style.aspectRatio = aspectRatio.toString();
    } else {
        (container.style as any).paddingTop = `${(1 / aspectRatio) * 100}%`;
    }
    container.innerHTML = '';

    // uiWrapper clips everything inside
    const uiWrapper = document.createElement('div');
    uiWrapper.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; overflow:hidden;';
    container.appendChild(uiWrapper);

    // --- Background Player or Image ---
    const bgContainer = document.createElement('div');
    bgContainer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;';
    uiWrapper.appendChild(bgContainer);

    let playerIframe: HTMLIFrameElement | null = null;
    let isPlaying = false;

    if (mediaId) {
        const playerRes = await setResponsiveIframe(mediaId, bgContainer, {
            playerParams: {
                events: true,
                controls: false,
                tc: Math.round(startTime),
                autostart: false,
                play_button: false
            },
            baseOptions: baseOptions
        });
        if (playerRes.res) {
            playerIframe = bgContainer.querySelector('iframe');
            if (debug) console.log("playerIframe found:", !!playerIframe);
        } else {
            if (debug) console.warn("setResponsiveIframe failed", playerRes.errors);
        }
    } else if (mediaUrl) {
        const bgImage = document.createElement('img');
        bgImage.src = mediaUrl;
        bgImage.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;';
        bgContainer.appendChild(bgImage);
    }

    // --- Full-screen scrubbing overlay (hides player during drag) ---
    const scrubOverlay = document.createElement('div');
    scrubOverlay.className = 'sl-trimmer-scrub-overlay';
    scrubOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 4; display: none; align-items: center; justify-content: center;
        background: #000;
    `;
    const {wrapper: scrubMosaicWrapper, img: scrubMosaicImg} = _createMosaicView();
    scrubMosaicWrapper.style.position = 'relative'; // override absolute for centering
    scrubOverlay.appendChild(scrubMosaicWrapper);
    uiWrapper.appendChild(scrubOverlay);

    // --- Darkened overlays for unselected regions ---
    const leftOverlay = document.createElement('div');
    leftOverlay.className = 'sl-trimmer-overlay sl-trimmer-overlay-left';
    const rightOverlay = document.createElement('div');
    rightOverlay.className = 'sl-trimmer-overlay sl-trimmer-overlay-right';
    const borderTop = document.createElement('div');
    borderTop.className = 'sl-trimmer-border sl-trimmer-border-top';
    const borderBottom = document.createElement('div');
    borderBottom.className = 'sl-trimmer-border sl-trimmer-border-bottom';
    const overlayStyle = `position:absolute; top:0; bottom:0; background:rgba(0,0,0,0.6); pointer-events:none; z-index:2;`;
    leftOverlay.style.cssText = overlayStyle + 'left:0;';
    rightOverlay.style.cssText = overlayStyle + 'right:0;';
    const borderStyle = `position:absolute; left:0; right:0; height:2px; background:#fff; pointer-events:none; z-index:2;`;
    borderTop.style.cssText = borderStyle + 'top:0;';
    borderBottom.style.cssText = borderStyle + 'bottom:0;';
    uiWrapper.appendChild(leftOverlay);
    uiWrapper.appendChild(rightOverlay);
    uiWrapper.appendChild(borderTop);
    uiWrapper.appendChild(borderBottom);

    // --- Progress bar (shown during playback) ---
    const progressBarTrack = document.createElement('div');
    progressBarTrack.className = 'sl-trimmer-progress-track';
    progressBarTrack.style.cssText = `
        position: absolute; bottom: 0; left: 0; right: 0; height: 6px;
        background: rgba(255,255,255,0.2); z-index: 3; pointer-events: none;
    `;
    const progressBarFill = document.createElement('div');
    progressBarFill.className = 'sl-trimmer-progress-fill';
    progressBarFill.style.cssText = `height: 100%; background: #fff; width: 0%; transition: width 0.25s linear;`;
    progressBarTrack.appendChild(progressBarFill);
    uiWrapper.appendChild(progressBarTrack);

    // --- Cursors (Handles) ---
    const CURSOR_W = 14;
    const MINI_THUMB_SCALE = 0.4;

    const makeCursor = (side: 'start' | 'end') => {
        const cur = document.createElement('div');
        cur.className = `sl-trimmer-cursor sl-trimmer-cursor-${side}`;
        const baseStyle = `position:absolute; top:0; bottom:0; width:${CURSOR_W}px;
            background:#fff; cursor:ew-resize; z-index:5;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            box-shadow:0 0 4px rgba(0,0,0,0.5);`;
        const radius = side === 'start' ? '4px 0 0 4px' : '0 4px 4px 0';
        const left = side === 'start' ? '0' : '100%';
        cur.style.cssText = baseStyle + `left:${left}; transform:translateX(-50%); border-radius:${radius};`;

        // Grip lines
        const grip = document.createElement('div');
        grip.style.cssText = 'display:flex; gap:2px;';
        grip.innerHTML = '<div style="width:2px;height:16px;background:#999;"></div><div style="width:2px;height:16px;background:#999;"></div>';
        cur.appendChild(grip);

        // Mini thumbnail bubble above the cursor
        const miniThumbContainer = document.createElement('div');
        miniThumbContainer.className = 'sl-trimmer-cursor-thumb';
        miniThumbContainer.style.cssText = `
            position: absolute; bottom: 8px; left: 50%;
            transform: translateX(-50%);
            background: #000; border: 2px solid #fff; border-radius: 3px;
            overflow: hidden; display: none; pointer-events: none; z-index: 10;
        `;
        const {wrapper: miniWrapper, img: miniImg} = _createMosaicView();
        miniWrapper.style.position = 'relative';
        miniThumbContainer.appendChild(miniWrapper);
        // Append to container (not uiWrapper) so it survives overflow:hidden clipping
        container.appendChild(miniThumbContainer);

        return {cur, miniThumbContainer, miniWrapper, miniImg};
    };

    const {
        cur: startCursor,
        miniThumbContainer: startMini,
        miniWrapper: startMiniWrapper,
        miniImg: startMiniImg
    } = makeCursor('start');
    const {
        cur: endCursor,
        miniThumbContainer: endMini,
        miniWrapper: endMiniWrapper,
        miniImg: endMiniImg
    } = makeCursor('end');

    uiWrapper.appendChild(startCursor);
    uiWrapper.appendChild(endCursor);

    // --- VTT frames ---
    let allFrames: MosaicFrame[] = [];
    let scrubLastUrl: string | null = null;

    if (mediaCustomization?.board?.large_url) {
        if (debug) console.log("Fetching VTT from:", mediaCustomization.board.large_url);
        fetch(mediaCustomization.board.large_url)
            .then(res => res.ok ? res.text() : '')
            .then(text => {
                if (text) {
                    allFrames = _parseVttIndexes(text);
                    if (debug) console.log(`Parsed ${allFrames.length} VTT frames.`);
                    // Show mini thumbs once frames are loaded
                    updateMiniThumb(startTime, startMini, startMiniWrapper, startMiniImg, startCursor);
                    updateMiniThumb(endTime, endMini, endMiniWrapper, endMiniImg, endCursor);
                } else {
                    if (debug) console.warn("VTT empty or failed.");
                }
            })
            .catch(err => debug && console.error("VTT Fetch error:", err));
    } else {
        if (debug) console.warn("No board.large_url in mediaCustomization.", mediaCustomization);
    }

    // Return the frame for a given time
    const getFrame = (t: number): MosaicFrame | null => {
        if (!allFrames.length) return null;
        const idx = Math.max(0, Math.min(allFrames.length - 1, Math.floor((t / duration) * (allFrames.length - 1))));
        return allFrames[idx] ?? null;
    };

    // --- Mini thumbnail on cursor ---
    const updateMiniThumb = (
        t: number,
        miniContainer: HTMLDivElement,
        miniWrapper: HTMLDivElement,
        miniImg: HTMLImageElement,
        cursorEl: HTMLElement
    ) => {
        const frame = getFrame(t);
        if (!frame) {
            miniContainer.style.display = 'none';
            return;
        }

        _applyFrame(frame, miniImg, miniWrapper, MINI_THUMB_SCALE, () => {
            // Position mini-thumb above cursor
            const curRect = cursorEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const left = (curRect.left - containerRect.left) + curRect.width / 2;
            miniContainer.style.left = `${left}px`;
            miniContainer.style.bottom = `8px`;
        });
        miniContainer.style.display = 'block';

        // Reposition after possible layout change
        const curRect = cursorEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const left = (curRect.left - containerRect.left) + cursorEl.offsetWidth / 2;
        miniContainer.style.left = `${left}px`;
    };

    // --- Large scrub overlay ---
    const showScrubOverlay = (t: number) => {
        const frame = getFrame(t);
        if (!frame) {
            scrubOverlay.style.display = 'none';
            return;
        }

        scrubOverlay.style.display = 'flex';
        bgContainer.style.opacity = '0';

        const containerW = container.getBoundingClientRect().width;
        const containerH = container.getBoundingClientRect().height || (containerW / aspectRatio);
        const thumbAR = (frame.width || 210) / (frame.height || 168);
        const scaleX = containerW / (frame.width || 210);
        const scaleY = containerH / (frame.height || 168);
        const scale = Math.min(scaleX, scaleY);

        if (scrubLastUrl !== frame.url) {
            scrubMosaicImg.src = frame.url;
            scrubLastUrl = frame.url;
        }

        _applyFrame(frame, scrubMosaicImg, scrubMosaicWrapper, scale);
    };

    const hideScrubOverlay = () => {
        scrubOverlay.style.display = 'none';
        bgContainer.style.opacity = '1';
    };

    // --- Player messaging ---
    const postToPlayer = (method: string, params?: any) => {
        if (playerIframe && playerIframe.contentWindow) {
            const msg = params !== undefined ? `["${method}", ${params}]` : `["${method}"]`;
            if (debug) console.log(`postToPlayer: ${msg}`);
            playerIframe.contentWindow.postMessage(msg, '*');
        } else {
            if (debug) console.warn("Cannot post to player: iframe missing.");
        }
    };

    const togglePlayback = () => {
        if (!playerIframe) {
            if (debug) console.warn("No playerIframe for togglePlayback");
            return;
        }
        if (isPlaying) {
            if (debug) console.log("→ pause");
            postToPlayer('pause');
        } else {
            if (debug) console.log("→ play");
            postToPlayer('play');
        }
    };

    if (playButton && playButton instanceof HTMLButtonElement) {
        if (debug) console.log("Attaching click to controlBtn:", playButton);
        playButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (debug) console.log("controlBtn clicked, isPlaying:", isPlaying);
            postToPlayer('seek', startInput.value);
            postToPlayer('play');
        });
    }

    if (stopButton && playButton instanceof HTMLButtonElement) {
        if (debug) console.log("Attaching click to controlBtn:", stopButton);
        stopButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (debug) console.log("controlBtn clicked, isPlaying:", isPlaying);
            postToPlayer('pause');
        });
    }

    // --- Player messages (sl-progress format + JSON event format) ---
    const onPlayerMessage = (e: MessageEvent) => {
        try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

            // Array format: ["sl-progress", time] from iframe postMessage API
            if (Array.isArray(data)) {
                if (data[0] === 'sl-progress') {
                    const pos = parseFloat(data[1]);
                    console.log("sl-progress:", pos, "duration:", duration);
                    const pct = duration > 0 ? Math.min(100, Math.max(0, (pos / duration) * 100)) : 0;
                    if (debug) console.log("sl-progress:", pos, "pct", pct, "endTime:", endTime);
                    // Update current time input
                    if (currentTimeInput) currentTimeInput.value = pos.toFixed(3);
                    // Update progress bar
                    progressBarFill.style.width = `${pct}%`;
                    if (pos >= endTime) {
                        postToPlayer('pause');
                        progressBarFill.style.width = '0%';
                    }
                }
                return;
            }

            // Object format: {event: "Streamlike.timeupdate", ...}
            if (data.event) {
                if (debug) console.log("Player event:", data.event, data);
                if (data.event === 'Streamlike.timeupdate' || data.event === 'timeupdate') {
                    const pos = data.options?.position ?? data.position ?? 0;
                    // Update current time input
                    if (currentTimeInput) currentTimeInput.value = pos.toFixed(3);
                    const rangeLen = endTime - startTime;
                    const pct = rangeLen > 0 ? Math.min(100, Math.max(0, ((pos - startTime) / rangeLen) * 100)) : 0;
                    progressBarFill.style.width = `${pct}%`;
                    if (pos >= endTime) {
                        postToPlayer('pause');
                        progressBarFill.style.width = '0%';
                    }
                } else if (data.event === 'Streamlike.statusChange' || data.event === 'statusChange') {
                    const status = data.options?.newStatus ?? data.newStatus;
                    isPlaying = (status === 'playing');
                    if (debug) console.log("statusChange:", status, "isPlaying:", isPlaying);
                    progressBarTrack.style.display = isPlaying ? 'block' : 'none';
                }
            }
        } catch (err) {
            if (debug) console.error("Error parsing player message:", err, e.data);
        }
    };
    window.addEventListener('message', onPlayerMessage);

    // --- DOM update ---
    const updateDOM = () => {
        const sp = (startTime / duration) * 100;
        const ep = (endTime / duration) * 100;

        leftOverlay.style.width = `${sp}%`;
        rightOverlay.style.width = `${100 - ep}%`;
        borderTop.style.left = `${sp}%`;
        borderTop.style.width = `${ep - sp}%`;
        borderBottom.style.left = `${sp}%`;
        borderBottom.style.width = `${ep - sp}%`;
        startCursor.style.left = `${sp}%`;
        endCursor.style.left = `${ep}%`;

        startInput.value = startTime.toFixed(3);
        endInput.value = endTime.toFixed(3);
        startInput.dispatchEvent(new Event('input', {bubbles: true}));
        endInput.dispatchEvent(new Event('input', {bubbles: true}));
    };

    // --- Drag logic ---
    let activeCursor: 'start' | 'end' | null = null;
    let initialX = 0, initialStart = 0, initialEnd = 0;

    const onMove = (e: MouseEvent | TouchEvent) => {
        if (!activeCursor) return;
        const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
        const rect = container.getBoundingClientRect();
        const deltaTime = ((clientX - initialX) / rect.width) * duration;

        if (activeCursor === 'start') {
            startTime = Math.max(0, Math.min(initialStart + deltaTime, endTime - 0.1));
            showScrubOverlay(startTime);
            updateMiniThumb(startTime, startMini, startMiniWrapper, startMiniImg, startCursor);
        } else {
            endTime = Math.max(startTime + 0.1, Math.min(initialEnd + deltaTime, duration));
            showScrubOverlay(endTime);
            updateMiniThumb(endTime, endMini, endMiniWrapper, endMiniImg, endCursor);
        }
        updateDOM();
    };

    const onUp = () => {
        if (activeCursor) hideScrubOverlay();
        activeCursor = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
    };

    const onDown = (cursorType: 'start' | 'end', e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        activeCursor = cursorType;
        initialX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
        initialStart = startTime;
        initialEnd = endTime;
        if (cursorType === 'start') showScrubOverlay(startTime);
        else showScrubOverlay(endTime);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, {passive: false});
        document.addEventListener('touchend', onUp);
    };

    startCursor.addEventListener('mousedown', (e) => onDown('start', e));
    endCursor.addEventListener('mousedown', (e) => onDown('end', e));
    startCursor.addEventListener('touchstart', (e) => onDown('start', e), {passive: false});
    endCursor.addEventListener('touchstart', (e) => onDown('end', e), {passive: false});

    // --- Listeners on external inputs to move cursors ---
    startInput.addEventListener('change', () => {
        const val = parseFloat(startInput.value);
        if (!isNaN(val)) {
            startTime = Math.max(0, Math.min(val, endTime));

            updateDOM();
            showScrubOverlay(startTime);
            updateMiniThumb(startTime, startMini, startMiniWrapper, startMiniImg, startCursor);
        }
    });

    endInput.addEventListener('change', () => {
        const val = parseFloat(endInput.value);
        if (!isNaN(val)) {
            endTime = Math.max(startTime, Math.min(val, duration));

            updateDOM();
            showScrubOverlay(endTime);
            updateMiniThumb(endTime, endMini, endMiniWrapper, endMiniImg, endCursor);
        }
    });

    updateDOM();
    return {res: true, data: {startTime, endTime}, errors: null};
}