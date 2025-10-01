import {
    CallbackResponse,
    HostWs,
    IframeOptions,
    TypeId,
    WebserviceResponse,
    BaseOptions,
    GetMediasOptions,
    GetMediasType,
    GetRelatedOptions, TranscriptOptions, Word
} from "./types";

export class Streamlike {
    public host: string = HostWs.prod;
    private debug: boolean = false;

    // Propriétés pour la gestion de la transcription
    private playerIframe: HTMLIFrameElement | null = null;
    private wordsContainer: HTMLElement | null = null;

    constructor(host?: string) {
        if (host) {
            this.host = host;
        }
        // Écouteur global pour les événements du player
        window.addEventListener("message", this.handlePlayerEvents.bind(this));
    }



    /**
     * Sets up a responsive iframe within a specified target element, using the provided media ID and options.
     *
     * @param {string | HTMLElement} target The target element where the iframe will be embedded. Can be a string (ID of the element) or a direct HTMLElement reference.
     * @param {string} id The unique identifier of the media for the iframe.
     * @param {IframeOptions} [options={}] Optional configuration object for the iframe and player settings, including host, typeId, debug mode, and iframe attributes.
     * @return {Promise<CallbackResponse>} A Promise that resolves with a CallbackResponse object, containing success status, any retrieved data, and potential errors.
     */
    public async setResponsiveIframe(
        target: string | HTMLElement,
        id: string,
        options: IframeOptions = {}
    ): Promise<CallbackResponse> {
        const divParent = typeof target === 'string'
            ? document.getElementById(target)
            : target;
        if (!target || !id || !divParent) {
            return {res: false, data: null, errors: "Missing parameters or invalid target."}
        }

        // Set default values for options
        const allowfullscreen = options.iframe?.allowfullscreen ?? true;
        const allowAutoplay = options.iframe?.allowautoplay ?? true;
        const host = options.host ?? this.host;
        const typeId = options.typeId ?? TypeId.MedId;
        let ratio = 1.77; // 16/9
        this.debug = options?.debug ?? false;

        // build player options string
        let playerOptionsString = "";
        if (options.player) {
            playerOptionsString = Object.entries(options.player)
                .map(([key, value]) => `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('');
        }

        let mediaWsUrl: string;
        switch (typeId) {
            case TypeId.Permalink:
                mediaWsUrl = `//${host}/ws/media?permalink=${id}`;
                break;
            case TypeId.LiveId:
                const id_temp = id.split("_");
                const mediaId = id_temp.length > 2 ? id_temp[2] : id_temp[1];
                mediaWsUrl = `https://${host}/ws/media?media_id=${mediaId}`;
                break;
            default:
                mediaWsUrl = `https://${host}/ws/media?media_id=${id}`;
                break;
        }

        if (this.debug) {
            console.log("Options:", options);
            console.log(`Media WS URL: ${mediaWsUrl}`);
        }

        /**
         * Create an iframe and add it to the parent container.
         * @param src
         * @param currentRatio
         */
        const createIframe = (src: string, currentRatio: number) => {
            const iframePlayer = document.createElement("iframe");
            iframePlayer.setAttribute("src", src);
            iframePlayer.setAttribute("id", `media-${id}`);
            iframePlayer.setAttribute("frameborder", "0");
            iframePlayer.setAttribute("scrolling", "no");

            // Set iframe attributes based on options
            const allowPermissions: string[] = [];
            if (allowAutoplay) {
                allowPermissions.push('autoplay');
            }
            if (allowfullscreen) {
                iframePlayer.setAttribute("allowfullscreen", "true");
                allowPermissions.push('fullscreen');
            }
            if (allowPermissions.length > 0) {
                iframePlayer.setAttribute("allow", allowPermissions.join('; '));
            }
            if (options.iframe?.onLoad) {
                iframePlayer.addEventListener('load', options.iframe.onLoad);
            }

            // Style the iframe
            iframePlayer.style.position = "absolute";
            iframePlayer.style.top = "0";
            iframePlayer.style.left = "0";
            iframePlayer.style.width = "100%";
            iframePlayer.style.height = "100%";
            iframePlayer.style.border = "0";

            // Clear the parent container and add the iframe
            divParent.innerHTML = ''; // Vider le conteneur
            divParent.style.position = "relative";
            divParent.style.overflow = "hidden";
            divParent.style.paddingTop = `${(1 / currentRatio) * 100}%`;
            divParent.appendChild(iframePlayer);
        };

        if (typeId === TypeId.Streamout) {
            const srcPlayer = `//${host}/streamout/play?str_id=${id}${playerOptionsString}`;
            createIframe(srcPlayer, ratio);
            return {res: true, data: null, errors: null};

        } else {
            const srcPlayer = `//${host}/play?${typeId}=${id}${playerOptionsString}`;
            const ws = await this.getWs<any>(mediaWsUrl);
            const dataMedia = ws.data?.media;
            if (ws.status === 200 && dataMedia?.metadata?.global?.ratio) {
                ratio = dataMedia.metadata.global.ratio;
            } else if (this.debug) {
                console.error("Could not fetch media ratio, using default.");
            }
            if (ratio === 0) {
                ratio = 16 / 9;
            }
            createIframe(srcPlayer, ratio);

            return {res: true, data: dataMedia, errors: null}
        }
    }

    /**
     * Fetches metadata for a given media ID.
     * @param {string} mediaId - The ID of the media.
     * @param {BaseOptions} [options] - Optional configuration.
     * @returns {Promise<any>} A promise that resolves with the media metadata.
     */
    public async getMetadata(mediaId: string, options?: BaseOptions): Promise<any> {
        const ws = await this.getWsMedia(mediaId, options);
        return ws.data?.media?.metadata ?? null;
    }

    /**
     * Fetches statistics for a given media ID.
     * @param {string} mediaId - The ID of the media.
     * @param {BaseOptions} [options] - Optional configuration.
     * @returns {Promise<any>} A promise that resolves with the media statistics.
     */
    public async getStatistics(mediaId: string, options?: BaseOptions): Promise<any> {
        const ws = await this.getWsMedia(mediaId, options);
        return ws.data?.media?.statistics ?? null;
    }

    /**
     * Fetches a list of media based on various criteria.
     * @param {string | string[]} id - The identifier (e.g., playlist ID, company ID). Can be a single ID or an array of playlist IDs.
     * @param {GetMediasOptions} [options] - Options to filter and configure the request.
     * @returns {Promise<any>} A promise that resolves with the list of media.
     */
    public async getMedias(id: string | string[], options: GetMediasOptions = {}): Promise<any> {
        if (!id) {
            throw new Error("Missing id parameter");
        }
        const host = options?.host ?? this.host;
        const type = options?.type ?? GetMediasType.PlaylistId;
        this.debug = options?.debug ?? false;

        let urlParams = "";
        if (options.playlist) {
            Object.entries(options.playlist).forEach(([name, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        urlParams += `&${name}[]=${item}`;
                    });
                } else {
                    urlParams += `&${name}=${value}`;
                }
            });
        }

        let url: string;
        if (options.api) {
            url = `https://${host}${urlParams.replace('&', '?')}`;
        } else {
            url = `https://${host}/ws/playlist`;
            switch (type) {
                case GetMediasType.CompanyId:
                    url += `?company_id=${id}`;
                    break;
                case GetMediasType.ViewId:
                    url += `?view_id=${id}`;
                    break;
                case GetMediasType.PlaylistId:
                    if (Array.isArray(id)) {
                        const playlistParams = id.map(pId => `playlist_id[]=${pId}`).join('&');
                        url += `?${playlistParams}`;
                    } else {
                        url += `?playlist_id=${id}`;
                    }
                    break;
            }
            url += urlParams;
        }

        if (this.debug) {
            console.log(options, url);
        }

        const ws = await this.getWs<any>(url);
        if (ws.status !== 200 && this.debug) {
            console.error(`#error loading ws playlist (${ws.status}) : ${ws.info}`);
        }
        return ws.data ?? null;
    }

    /**
     * Fetches related media for a given media ID.
     * @param {string} mediaId - The ID of the media to find related content for.
     * @param {GetRelatedOptions} [options] - Options for the related content query.
     * @returns {Promise<any>} A promise that resolves with the related media data.
     */
    public async getRelated(mediaId: string, options: GetRelatedOptions = {}): Promise<any> {
        if (!mediaId) {
            throw new Error("Missing mediaId parameter");
        }
        const host = options?.host ?? this.host;
        this.debug = options?.debug ?? false;

        let url = `https://${host}/ws/related?media_id=${mediaId}`;

        if (options.related) {
            const relatedParams = Object.entries(options.related)
                .map(([name, value]) => `&${name}=${value}`)
                .join('');
            url += relatedParams;
        }

        if (this.debug) {
            console.log(options, url);
        }

        const ws = await this.getWs<any>(url);
        if (ws.status !== 200 && this.debug) {
            console.error(`#error loading ws related (${ws.status}) : ${ws.info}`);
        }
        return ws.data ?? null;
    }


    /**
     * Asynchronously generates and displays words in a given container by fetching data from a provided URL.
     * The words are displayed as clickable spans, where each span triggers a seek action when clicked.
     * If any errors occur during the process (e.g., fetching data or locating the container), they are logged, and fallback messages are displayed.
     *
     * @param {string} url - The URL to fetch the words data from.
     * @param {TranscriptOptions} options - Configuration options for rendering the words:
     * - `wordsContainer`: The container element or its ID where words will be displayed.
     *                     If the container is not found, an error message is logged.
     * - Other relevant properties are part of the `TranscriptOptions` object.
     * @return {Promise<void>} Resolves when the words have been successfully displayed in the container or in case of an error.
     */
    public async generateWords(url: string, options: TranscriptOptions): Promise<void> {
        this.debug = options?.debug ?? false;
        const wordsContainer = typeof options.wordsContainer === 'string'
            ? document.getElementById(options.wordsContainer)
            : options.wordsContainer;
        const iframePlayer: HTMLIFrameElement = typeof options.iframePlayer === 'string' ?
            document.getElementById(options.iframePlayer) as HTMLIFrameElement
            : options.iframePlayer;
        if (!wordsContainer) {
            console.error("Words container not found.");
            return;
        }

        this.wordsContainer = wordsContainer;

        if (!this.wordsContainer) {
            console.error("Transcript not initialized. Please call initTranscript() first.");
            return;
        }

        this.wordsContainer.innerHTML = '<span>Loading...</span>';

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const error = new Error(`Failed to fetch words data (status: ${response.status})`);
                this.wordsContainer.innerHTML = '<span>Error loading transcript.</span>';
                if (this.debug) {
                    console.error(error);
                }
                return;
            }
            const wordsData: Word[] = await response.json();

            this.wordsContainer.innerHTML = '';

            wordsData.forEach((wordData, index) => {
                const span = document.createElement('span');
                span.dataset.start = wordData.start.toString();
                span.dataset.end = wordData.end.toString();

                span.addEventListener('click', () => {
                    if (iframePlayer) {
                        const command = `["seek",${span.dataset.start}]`;
                        iframePlayer.contentWindow?.postMessage(command, '*');
                    }
                });

                // Gérer la ponctuation pour un affichage plus naturel
                const nextWord = wordsData[index + 1];
                let punctuation = '';
                if (wordData.punctuation) {
                    punctuation = (!nextWord || /^[A-Z]/.test(nextWord.word)) ? '.' : ',';
                }
                span.textContent = wordData.word + punctuation + ' ';
                this.wordsContainer!.appendChild(span);
            });
        } catch (e) {
            this.wordsContainer.innerHTML = '<span>Error loading transcript.</span>';
            if (this.debug) {
                console.error(e);
            }
        }
    }


    /**
     * Fetches data from the specified web service and returns a structured response.
     *
     * @param {string} url - The URL of the web service to fetch data from.
     * @return {Promise<WebserviceResponse<T>>} A promise that resolves to an object containing the response status, status text, and parsed data.
     */
    private async getWs<T>(url: string): Promise<WebserviceResponse<T>> {
        try {
            const response = await fetch(url);
            const data = await response.json().catch(() => null);

            return {
                status: response.status,
                info: response.statusText,
                data: data,
            };
        } catch (error) {
            if (this.debug) {
                console.error("Error with fetch request:", error);
            }
            return {
                status: 0, // Indicates a client-side/network error
                info: error instanceof Error ? error.message : "Network request failed",
                data: null,
            };
        }
    }

    /**
     * Fetches web service media information based on the specified media ID and options.
     *
     * @param {string} mediaId - The unique identifier of the media to fetch. This parameter is required.
     * @param {BaseOptions} [options] - Optional configuration parameters, including host and debug mode.
     * @return {Promise<WebserviceResponse>} A promise that resolves to the web service response containing media information.
     * @throws {Error} Throws an error if the mediaId parameter is missing.
     */
    private async getWsMedia(mediaId: string, options?: BaseOptions): Promise<WebserviceResponse> {
        if (!mediaId) {
            throw new Error("Missing mediaId parameter");
        }
        const host = options?.host ?? this.host;
        this.debug = options?.debug ?? false;
        const url = `https://${host}/ws/media?media_id=${mediaId}`;

        if (this.debug) {
            console.log({options, url});
        }

        const ws = await this.getWs<any>(url);
        if (ws.status !== 200 && this.debug) {
            console.error(`#error loading ws media (${ws.status}) : ${ws.info}`);
        }
        return ws;
    }

    /**
     * Handles player-related events received through message events.
     *
     * @param {MessageEvent} evt - The message event containing player data to process.
     * @return {void} This method does not return any value.
     */
    private handlePlayerEvents(evt: MessageEvent): void {
        if (this.debug) {
            console.log("Received player event:", evt.data);
        }
        try {
            if (evt.data && typeof evt.data === 'string') {
                const data = JSON.parse(evt.data);
                if (data[0] === 'sl-progress' && this.wordsContainer) {
                    this.updateWordsHighlight(data[1]);
                }
            }
        } catch (e) {
            if (this.debug) {
                console.error("Error handling player event:", e);
            }
        }
    }


    /**
     * Updates the highlight state of words in the container based on the current time.
     * Words within the specified start and end times will be highlighted and scrolled into view if necessary.
     *
     * @param {number} currentTime - The current time used to determine which words to highlight.
     * @return {void} This method does not return a value.
     */
    private updateWordsHighlight(currentTime: number): void {
        if (this.debug) {
            console.log("Updating words highlight:", currentTime);
        }
        if (!this.wordsContainer) return;
        const words = this.wordsContainer.querySelectorAll('span[data-start]');
        words.forEach(word => {
            const span = word as HTMLSpanElement;
            const start = parseFloat(span.dataset.start || '0');
            const end = parseFloat(span.dataset.end || '0');
            if (currentTime >= start && currentTime <= end) {
                span.classList.add('active');
                // Auto-scroll pour garder le mot actif visible
                const containerRect = this.wordsContainer!.getBoundingClientRect();
                const rect = span.getBoundingClientRect();
                if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                    span.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
            } else {
                span.classList.remove('active');
            }
        });
    }
}
