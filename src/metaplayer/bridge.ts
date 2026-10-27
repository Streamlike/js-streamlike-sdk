// path: src/metaplayer/bridge.ts

import {MetaPlayerState} from "../types/metaPlayer";

/**
 * Commands accepted by the embedded Streamlike player.
 */
export type PlayerCommand =
    | ['play'] | ['pause'] | ['mute'] | ['unmute'] | ['fullscreen']
    | ['seek', number] | ['speed', number] | ['volume', number];

/**
 * Below this gap between two seeks the player saturates and stutters.
 */
const SEEK_MIN_INTERVAL_MS = 90;

/**
 * Drives the embedded Streamlike player through its `postMessage` API.
 *
 * Sent: `["play"]`, `["pause"]`, `["seek", s]`, `["speed", x]`, `["mute"]`,
 * `["unmute"]`, `["volume", 0..1]`, `["fullscreen"]`.
 * Received, with `events=1` on the player URL: `["sl-state", "play"|"pause"|"ended"]`
 * and `["sl-progress", s]`, as a JSON string or as an array depending on the
 * version of the player.
 *
 * Only messages coming from the player's own frame are read: a page receives
 * messages from every frame it holds.
 */
export class PlayerBridge {
    onState: (state: MetaPlayerState) => void = () => undefined;
    onProgress: (time: number) => void = () => undefined;

    /**
     * When the last seek was sent, so a position reported just after it can be
     * recognised as the former one.
     */
    lastSeekSentAt = -Infinity;

    private pendingSeek: number | null = null;
    private seekTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly listener = (event: MessageEvent) => this.handle(event);

    /**
     * @param frame Looks the iframe up at every call: it is created
     * asynchronously, and replaced when the media changes.
     * @param debug Logs every command sent.
     */
    constructor(private readonly frame: () => HTMLIFrameElement | null, private readonly debug: boolean = false) {
        window.addEventListener('message', this.listener);
    }

    destroy(): void {
        window.removeEventListener('message', this.listener);
        if (this.seekTimer !== null) clearTimeout(this.seekTimer);
        this.seekTimer = null;
        this.pendingSeek = null;
    }

    send(command: PlayerCommand | (string | number)[]): void {
        const iframe = this.frame();
        if (!iframe?.contentWindow) return;
        if (this.debug) console.debug('[metaPlayer] →', command);
        iframe.contentWindow.postMessage(JSON.stringify(command), this.targetOrigin(iframe));
    }

    /**
     * A seek limited in frequency: only the last position asked for is sent,
     * so a gesture producing dozens of positions a second does not choke the
     * player.
     */
    seek(time: number): void {
        this.pendingSeek = time;
        this.flushSeek();
    }

    private flushSeek(): void {
        if (this.pendingSeek === null) return;
        const wait = SEEK_MIN_INTERVAL_MS - (performance.now() - this.lastSeekSentAt);
        if (wait > 0) {
            this.seekTimer ??= setTimeout(() => {
                this.seekTimer = null;
                this.flushSeek();
            }, wait);
            return;
        }
        this.send(['seek', Number(this.pendingSeek.toFixed(3))]);
        this.lastSeekSentAt = performance.now();
        this.pendingSeek = null;
    }

    private handle(event: MessageEvent): void {
        const iframe = this.frame();
        if (!iframe || event.source !== iframe.contentWindow) return;
        const data = PlayerBridge.parse(event.data);
        if (!data) return;
        if (data[0] === 'sl-state' && (data[1] === 'play' || data[1] === 'pause' || data[1] === 'ended')) {
            this.onState(data[1]);
        }
        if (data[0] === 'sl-progress' && typeof data[1] === 'number' && Number.isFinite(data[1])) {
            this.onProgress(data[1]);
        }
    }

    private static parse(raw: unknown): unknown[] | null {
        try {
            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Array.isArray(data) ? data : null;
        } catch {
            return null;
        }
    }

    private targetOrigin(iframe: HTMLIFrameElement): string {
        try {
            return new URL(iframe.src).origin;
        } catch {
            return '*';
        }
    }
}
