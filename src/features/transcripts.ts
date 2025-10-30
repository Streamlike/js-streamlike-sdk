// path: src/features/transcripts.ts
import {TranscriptOptions, Word} from "../types/features";
import {fixHost} from "../utils/api";
import {CallbackResponse} from "../types/api";

/**
 * Handles highlighting of transcript words based on playerParams progress.
 * @param wordsContainer The element containing the word spans.
 * @param currentTime The current time from the playerParams.
 * @internal
 */
function _updateWordsHighlight(wordsContainer: HTMLElement, currentTime: number): void {
    const words = wordsContainer.querySelectorAll('span[data-start]');
    words.forEach(word => {
        const span = word as HTMLSpanElement;
        const start = parseFloat(span.dataset.start || '0');
        const end = parseFloat(span.dataset.end || '0');
        if (currentTime >= start && currentTime < end) {
            span.classList.add('active');
            // Auto-scroll to keep the active word visible
            const containerRect = wordsContainer.getBoundingClientRect();
            const rect = span.getBoundingClientRect();
            if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                span.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
        } else {
            span.classList.remove('active');
        }
    });
}

/**
 * Fetches transcript data and generates clickable/highlightable word spans in a container.
 * This function also sets up event listeners to sync with playerParams progress.
 *
 * @param url The URL of the 'words' JSON file.
 * @param options Configuration options including target containers and the playerParams iframeParams.
 * @returns A promise that resolves with a cleanup function to remove event listeners.
 */
export async function generateWords(url: string, options: TranscriptOptions): Promise<{
    cleanup: () => void;
} & CallbackResponse> {
    const {debug = false} = options;
    if (debug) console.groupCollapsed(`[generateWords]`);
    {
        console.debug(`url:`, url);
        console.debug(`options:`, options);
    }
    const wordsContainer = typeof options.wordsContainer === 'string'
        ? document.getElementById(options.wordsContainer)
        : options.wordsContainer;

    const iframePlayer: HTMLIFrameElement = typeof options.iframePlayer === 'string'
        ? document.getElementById(options.iframePlayer) as HTMLIFrameElement
        : options.iframePlayer;

    if (!wordsContainer || !iframePlayer) {
        const e = "Words container or iframePlayer not found."
        if (debug) {
            console.error(e);
            console.groupEnd();
        }
        return {
            res: false, data: null, errors: e, cleanup: () => {
            }
        };
    }


    const defaultMessages = {
        loading: 'Loading...',
        error: 'Error loading transcript.'
    };

    const messages = {
        loading: options.messages?.loading || defaultMessages.loading,
        error: options.messages?.error || defaultMessages.error
    };

    wordsContainer.innerHTML = `<span>${messages.loading}</span>`;

    try {
        const response = await fetch(fixHost(url));
        if (!response.ok) {
            const e = `Failed to fetch words data (status: ${response.status})`
            wordsContainer.innerHTML = `<span>${messages.error}</span>`;
            if (debug) {
                console.error(e);
                console.groupEnd();
            }
            return {
                res: false, data: null, errors: e, cleanup: () => {
                }
            };
        }

        const wordsData: Word[] = await response.json();
        wordsContainer.innerHTML = '';

        wordsData.forEach((wordData) => {
            const span = document.createElement('span');
            span.dataset.start = wordData.start.toString();
            span.dataset.end = wordData.end.toString();
            span.textContent = wordData.word + ' ';

            span.addEventListener('click', () => {
                const command = `["seek",${span.dataset.start}]`;
                iframePlayer.contentWindow?.postMessage(command, '*');
            });
            wordsContainer.appendChild(span);
        });

        const handlePlayerEvents = (evt: MessageEvent): void => {
            try {
                if (evt.source === iframePlayer.contentWindow && typeof evt.data === 'string') {
                    const data = JSON.parse(evt.data);
                    if (data[0] === 'sl-progress') {
                        _updateWordsHighlight(wordsContainer, data[1]);
                    }
                }
            } catch (e) {
                if (debug) console.error("Error handling playerParams event:", e);
            }
        };

        window.addEventListener("message", handlePlayerEvents);

        const cleanup = () => {
            window.removeEventListener("message", handlePlayerEvents);
            if (debug) console.debug("Transcript event listeners cleaned up.");
        };
        if (debug) console.groupEnd();

        return {res: true, data: {wordsCount: wordsData.length}, errors: null, cleanup};

    } catch (e: any) {
        wordsContainer.innerHTML = `<span>${messages.error}</span>`;
        if (debug) {
            console.error(e);
            console.groupEnd();
        }
        return {
            res: false, data: null, errors: e.message, cleanup: () => {
            }
        };
    }
}
