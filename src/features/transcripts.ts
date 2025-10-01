import { TranscriptOptions, Word } from "../types/features";
import { CallbackResponse } from "../types/base";

/**
 * Handles highlighting of transcript words based on player progress.
 * @param wordsContainer The element containing the word spans.
 * @param currentTime The current time from the player.
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
                span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            span.classList.remove('active');
        }
    });
}

/**
 * Fetches transcript data and generates clickable/highlightable word spans in a container.
 * This function also sets up event listeners to sync with player progress.
 *
 * @param url The URL of the 'words' JSON file.
 * @param options Configuration options including target containers and the player iframe.
 * @returns A promise that resolves with a cleanup function to remove event listeners.
 */
export async function generateWords(url: string, options: TranscriptOptions): Promise<{ cleanup: () => void; } & CallbackResponse> {
    const { debug = false } = options;
    const wordsContainer = typeof options.wordsContainer === 'string'
        ? document.getElementById(options.wordsContainer)
        : options.wordsContainer;

    const iframePlayer = typeof options.iframePlayer === 'string'
        ? document.getElementById(options.iframePlayer) as HTMLIFrameElement
        : options.iframePlayer;

    if (!wordsContainer || !iframePlayer) {
        return { res: false, data: null, errors: "Words container or iframePlayer not found.", cleanup: () => {} };
    }

    wordsContainer.innerHTML = '<span>Loading...</span>';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch words data (status: ${response.status})`);

        const wordsData: Word[] = await response.json();
        wordsContainer.innerHTML = '';

        wordsData.forEach((wordData, index) => {
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
                if (debug) console.error("Error handling player event:", e);
            }
        };

        window.addEventListener("message", handlePlayerEvents);

        const cleanup = () => {
            window.removeEventListener("message", handlePlayerEvents);
            if(debug) console.log("Transcript event listeners cleaned up.");
        };

        return { res: true, data: { wordsCount: wordsData.length }, errors: null, cleanup };

    } catch (e: any) {
        wordsContainer.innerHTML = '<span>Error loading transcript.</span>';
        if (debug) console.error(e);
        return { res: false, data: null, errors: e.message, cleanup: () => {} };
    }
}
