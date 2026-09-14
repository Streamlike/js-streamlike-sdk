// path: src/types/features.ts

// --- Transcript/Words ---
import {BaseOptions, debugOptions} from "./api";

export enum MosaicSize {
    Small = 'small',
    Large = 'large'
}

export enum PreviewMode {
    Scrubbing = 'scrubbing',
    Animation = 'animation',
    Fixed = 'fixed'
}

export enum FitMode {
    Cover = 'cover',
    Contain = 'contain'
}

/**
 * Where the timing of a word, or of a whole words file, comes from.
 * - `asr`: timed by the speech engine,
 * - `aligned` (file level only): the subtitles were corrected, the untouched words keep their engine timing,
 * - `estimated`: interpolated, no engine timing at all (e.g. an imported SRT).
 */
export type WordsSource = 'asr' | 'aligned' | 'estimated';

/**
 * One word of a transcript, with its timing in seconds.
 */
export interface Word {
    start: number;
    end: number;
    word: string;
    /**
     * Legacy flag of the words files written before September 2026.
     */
    punctuation?: string | boolean | number;
    /**
     * Trailing punctuation mark of the word, `""` when none. Files written from September 2026.
     */
    mark?: string;
    /**
     * Where the timing of this word comes from. Files written from September 2026.
     */
    source?: WordsSource;
}

/**
 * The words file of a subtitle track as served since September 2026.
 * Older files are a bare `Word[]`; `generateWords` accepts both.
 */
export interface WordsFile {
    source: WordsSource;
    language: string;
    words: Word[];
}

/**
 * Data returned by `generateWords` on success.
 */
export interface WordsResult {
    wordsCount: number;
    /**
     * File-level source, `undefined` on a legacy list-shaped file.
     */
    source?: WordsSource;
    /**
     * Language of the track, `undefined` on a legacy list-shaped file.
     */
    language?: string;
}

export interface TranscriptOptions {
    wordsContainer: string | HTMLElement;
    iframePlayer: string | HTMLIFrameElement;
    debug?: boolean;
    autoScroll?: boolean;
    messages:{
        loading: string;
        error: string;
    }
}

// --- Interactive Preview ---

export interface MosaicFrame {
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface InteractivePreviewOptions extends debugOptions {
    mode?: PreviewMode;
    duration?: number;
    fps?: number;
    mosaicSize?: MosaicSize;
    fitMode?: {
        cover? :FitMode
        animation?: FitMode;
    };
}

/**
 * Represents the URLs for different cover image sizes.
 */
interface CoverUrls {
    url: string;
    thumbnail_url: string;
    thumbnaillarge_url: string;
    thumbnailextralarge_url: string;
}

/**
 * Represents the URLs for different board sizes.
 */
interface BoardUrls {
    small_url: string;
    large_url: string;
}

/**
 * Represents mediaParams customization options including cover images and mosaic/board configurations.
 */
export interface MediaCustomization {
    /**
     * Absent when the media has no cover: the four sizes appear or disappear together.
     */
    cover?: CoverUrls;
    mosaic?: string;
    board?: BoardUrls;
}

// --- Trimmer ---

export interface TrimmerOptions {
    duration: number;
    startInput: string | HTMLInputElement;
    endInput: string | HTMLInputElement;
    currentTimeInput: string | HTMLInputElement;
    mediaUrl?: string;
    mediaId?: string;
    mediaCustomization?: MediaCustomization;
    aspectRatio?: number;
    initialStart?: number;
    initialEnd?: number;
    playButton?: string | HTMLElement;
    stopButton?: string | HTMLElement;
    debug?: boolean;
    baseOptions?: BaseOptions;
}