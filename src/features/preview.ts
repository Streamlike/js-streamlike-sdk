// path: src/features/preview.ts
import {InteractivePreviewOptions, MediaCustomization, MosaicFrame, PreviewMode, FitMode} from "../types/features";
import {CallbackResponse} from "../types/api";

/**
 * Parses a VTT (Web Video Text Tracks) formatted text to extract mosaic frame information.
 *
 * @param {string} text - The VTT data as a string. The text contains lines with URL and coordinate information.
 * @return {MosaicFrame[]} An array of objects representing mosaic frames, each containing the URL, x, y coordinates, width, and height.
 */
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

/**
 * Generates an interactive thumbnail preview for a given target element. Depending on the mode,
 * it allows for either scrubbing through frames or playing an animated preview. The frames are
 * fetched and displayed based on the provided media customization and options.
 *
 * @param {string | HTMLElement} target - The target element or its ID where the thumbnail will be displayed.
 * @param {MediaCustomization} mediaCustomization - Configuration object containing media details such as cover image and board URL.
 * @param {InteractivePreviewOptions} options - Options for customizing the preview behavior such as mode, duration, frames per second, and debugging.
 * @return {Promise<CallbackResponse>} Returns a promise that resolves with a response object containing whether the operation was successful, data details, or errors if any.
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
        fitMode = {cover: FitMode.Cover, animation: FitMode.Contain},
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

    // Créer une image pour la planche de vignettes
    const coverImg = document.createElement('img');
    coverImg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: ${fitMode.cover};
        object-position: center;
        z-index: 3;
    `;
    coverImg.src = mediaCustomization.cover.thumbnailextralarge_url;

    // Créer une image de fond floutée pour combler les bandes noires
    const blurredBg = document.createElement('img');
    blurredBg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        filter: blur(20px);
        opacity: 0.6;
        z-index: 1;
        display: none;
    `;
    blurredBg.src = mediaCustomization.cover.thumbnailextralarge_url;

    const mosaicImg = document.createElement('img');
    mosaicImg.style.cssText = `
        position: absolute;
        display: block;
    `;

    // Créer un conteneur pour clipper l'image mosaïque
    const mosaicWrapper = document.createElement('div');
    mosaicWrapper.style.cssText = `
        position: absolute;
        /* La taille et la position seront définies dynamiquement */
        overflow: hidden;
        z-index: 2;
        display: none;
    `;
    mosaicWrapper.appendChild(mosaicImg);

    // Configurer le container principal
    previewBox.style.cssText = `
        position: relative;
        overflow: hidden;
        cursor: pointer;
        background-color: #000;
    `;
    previewBox.innerHTML = '';
    previewBox.appendChild(coverImg);
    previewBox.appendChild(blurredBg);
    previewBox.appendChild(mosaicWrapper);

    // Si le mode de la cover est 'contain', on affiche le fond flou dès le début
    if (fitMode.cover === FitMode.Contain) {
        blurredBg.style.display = 'block';
    }

    // En mode Fixed, on s'arrête là
    if (mode === PreviewMode.Fixed) {
        return {res: true, data: null, errors: null};
    }

    const showFrame = (frame: MosaicFrame) => {
        if (!frame) return;

        if (debug) {
            console.log('🎬 showFrame called', {
                frameUrl: frame.url,
                frameX: frame.x,
                frameY: frame.y,
                frameWidth: frame.width,
                frameHeight: frame.height
            });
        }

        // Obtenir les dimensions du container
        const containerWidth = previewBox.clientWidth;
        const containerHeight = previewBox.clientHeight;

        // Dimensions de la vignette depuis le VTT
        const originalThumbWidth = frame.width || 210;
        const originalThumbHeight = frame.height || 168;
        let thumbWidth = originalThumbWidth;
        let thumbHeight = originalThumbHeight;

        let xCorrection = 0;
        let yCorrection = 0;

        // Le ratio de la vignette du storyboard peut être incorrect (ex : vidéo verticale dans un cadre 16:9).
        // On utilise le ratio de l'image de couverture comme source de vérité pour corriger les dimensions
        // et calculer la correction de position nécessaire.
        if (coverImg.complete && coverImg.naturalWidth > 0) {
            const coverAspectRatio = coverImg.naturalWidth / coverImg.naturalHeight;
            const thumbAspectRatio = thumbWidth / thumbHeight;

            if (Math.abs(thumbAspectRatio - coverAspectRatio) > 0.1) { // Tolérance
                if (thumbAspectRatio > coverAspectRatio) { // Pillarbox : la vignette est plus large que le contenu
                    thumbWidth = thumbHeight * coverAspectRatio;
                    xCorrection = (originalThumbWidth - thumbWidth) / 2;
                } else { // Letterbox : la vignette est plus haute que le contenu
                    thumbHeight = thumbWidth / coverAspectRatio;
                    yCorrection = (originalThumbHeight - thumbHeight) / 2;
                }
            }
        }


        // Changer l'image de la planche si nécessaire
        if (lastUsedMosaicUrl !== frame.url) {
            if (debug) console.log('🔄 Changing mosaic image source');
            mosaicImg.src = frame.url;
            lastUsedMosaicUrl = frame.url;
        }

        const applyFramePosition = () => {
            const boardWidth = mosaicImg.naturalWidth;
            const boardHeight = mosaicImg.naturalHeight;

            if (debug) {
                console.groupCollapsed('🎯 applyFramePosition');
                console.log({
                    boardWidth, boardHeight, containerWidth, containerHeight,
                    thumbWidth, thumbHeight, fitModeAnimation: fitMode.animation
                });
            }

            let scale: number;
            let showBlur: boolean;

            if (fitMode.animation === FitMode.Cover) {
                // Mode COVER : la vignette remplit le container (peut être tronquée)
                const scaleX = containerWidth / thumbWidth;
                const scaleY = containerHeight / thumbHeight;
                scale = Math.max(scaleX, scaleY);
                showBlur = false; // Pas de blur en mode cover
                if (debug) console.log('📐 Mode COVER:', {scaleX, scaleY, scale, showBlur});

            } else {
                // Mode CONTAIN : la vignette est affichée en entier
                const scaleX = containerWidth / thumbWidth;
                const scaleY = containerHeight / thumbHeight;
                scale = Math.min(scaleX, scaleY);

                // Afficher le blur seulement si les ratios diffèrent
                const containerRatio = containerWidth / containerHeight;
                const thumbRatio = thumbWidth / thumbHeight;
                const ratioDiff = Math.abs(containerRatio - thumbRatio);
                showBlur = ratioDiff > 0.01;
                if (debug) console.log('📐 Mode CONTAIN:', {scaleX, scaleY, scale, ratioDiff, showBlur});
            }

            // Afficher ou masquer le flou en arrière-plan.
            // Pour garantir un rendu visuel consistant, l'image de couverture est
            // toujours utilisée comme source pour le flou, plutôt que la mosaïque.
            if (showBlur) {
                blurredBg.style.display = 'block';
            } else {
                blurredBg.style.display = 'none';
            }

            // ** Nouvelle logique de positionnement **
            const scaledThumbWidth = thumbWidth * scale;
            const scaledThumbHeight = thumbHeight * scale;

            // 1. Redimensionner et centrer le wrapper qui sert de "fenêtre"
            const wrapperLeft = (containerWidth - scaledThumbWidth) / 2;
            const wrapperTop = (containerHeight - scaledThumbHeight) / 2;
            mosaicWrapper.style.width = `${scaledThumbWidth}px`;
            mosaicWrapper.style.height = `${scaledThumbHeight}px`;
            mosaicWrapper.style.left = `${wrapperLeft}px`;
            mosaicWrapper.style.top = `${wrapperTop}px`;

            // 2. Mettre à l'échelle la planche mosaïque complète
            const scaledBoardWidth = boardWidth * scale;
            const scaledBoardHeight = boardHeight * scale;
            mosaicImg.style.width = `${scaledBoardWidth}px`;
            mosaicImg.style.height = `${scaledBoardHeight}px`;

            // 3. Déplacer la planche à l'intérieur du wrapper pour n'afficher que la bonne vignette
            const scaledX = (frame.x + xCorrection) * scale;
            const scaledY = (frame.y + yCorrection) * scale;
            mosaicImg.style.left = `-${scaledX}px`;
            mosaicImg.style.top = `-${scaledY}px`;


            // Afficher/masquer les éléments
            coverImg.style.display = 'none';
            mosaicWrapper.style.display = 'block';

            if (debug) {
                console.log('🎨 Final state:', {
                    coverDisplay: coverImg.style.display,
                    blurDisplay: blurredBg.style.display,
                    wrapper: {
                        left: mosaicWrapper.style.left,
                        top: mosaicWrapper.style.top,
                        width: mosaicWrapper.style.width,
                        height: mosaicWrapper.style.height
                    },
                    mosaic: {
                        left: mosaicImg.style.left,
                        top: mosaicImg.style.top,
                        width: mosaicImg.style.width,
                        height: mosaicImg.style.height
                    }
                });
                console.groupEnd();
            }
        };

        // Attendre que l'image soit chargée ou l'appliquer directement si déjà chargée
        if (!mosaicImg.complete || mosaicImg.naturalWidth === 0) {
            mosaicImg.onload = function() {
                applyFramePosition();
                mosaicImg.onload = null;
            };
        } else {
            applyFramePosition();
        }
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
        const startAnimation = () => {
            if (activeFrames.length === 0) return;
            if (mode === PreviewMode.Animation) {
                animationInterval = window.setInterval(() => {
                    showFrame(activeFrames[currentFrame]);
                    currentFrame = (currentFrame + 1) % activeFrames.length;
                }, 1000 / fps);
            }
        };

        previewBox.addEventListener('mouseenter', startAnimation);
        previewBox.addEventListener('touchstart', startAnimation);
    }
    if (mode === PreviewMode.Scrubbing) {
        const handleScrub = (clientX: number) => {
            if (activeFrames.length > 0) {
                const rect = previewBox.getBoundingClientRect();
                const frameIndex = Math.min(activeFrames.length - 1, Math.max(0, Math.floor((clientX - rect.left) / rect.width * activeFrames.length)));
                showFrame(activeFrames[frameIndex]);
            }
        };

        previewBox.addEventListener('mousemove', (event) => {
            handleScrub(event.clientX);
        });

        previewBox.addEventListener('touchmove', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            handleScrub(touch.clientX);
        });
    }


    const resetPreview = () => {
        if (debug) console.log('👋 resetPreview: réinitialisation de l\'aperçu');
        clearInterval(animationInterval);
        currentFrame = 0;
        lastUsedMosaicUrl = null;
        mosaicWrapper.style.display = 'none';
        coverImg.style.display = 'block';

        // Réinitialiser l'état du flou en fonction du mode de la cover
        if (fitMode.cover === FitMode.Contain) {
            blurredBg.style.display = 'block';
            // S'assurer que l'image du flou est bien celle de la cover
            if (blurredBg.src !== mediaCustomization.cover.thumbnailextralarge_url) {
                blurredBg.src = mediaCustomization.cover.thumbnailextralarge_url;
            }
        } else {
            blurredBg.style.display = 'none';
        }
    };

    previewBox.addEventListener('mouseleave', resetPreview);
    previewBox.addEventListener('touchend', resetPreview);

    try {
        if (!mediaCustomization.board) {
            return {res: true, data: null, errors: 'board not found'};
        }
        const response = await fetch(mediaCustomization.board[`${mosaicSize}_url`]);
        if (!response.ok) {
            const error = `Media VTT not found.`;
            if (debug) console.warn(`Media VTT not found.`);
            return {res: true, data: null, errors: error};
        }
        allFrames = _parseVttIndexes(await response.text());
        calculateAndSampleFrames();
        if (allFrames.length === 0 && debug) console.warn("No frames found.");
        return {res: true, data: {framesCount: allFrames.length}, errors: null};

    } catch (error: any) {
        if (debug) console.error(error.message);
        return {res: false, data: null, errors: error.message};
    }
}
