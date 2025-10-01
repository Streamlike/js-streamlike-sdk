import {BaseOptions} from "./base";

// --- Transcript/Words ---
export enum MosaicSize {
    Small = 'small',
    Large = 'large'
}

export enum PreviewMode {
    Scrubbing = 'scrubbing',
    Animation = 'animation',
    Fixed = 'fixed'
}

export interface Word {
    start: number;
    end: number;
    word: string;
    punctuation?: string | boolean;
}

export interface Subtitle {
    subtitle: {
        language_id: string;
        url: {
            words: string;
            [key: string]: string;
        };
    };
}

export interface TranscriptOptions {
    wordsContainer: string | HTMLElement;
    iframePlayer: string | HTMLIFrameElement;
    debug?: boolean;
}

// --- Interactive Preview ---

export interface MosaicFrame {
    url: string;
    x: number;
    y: number;
}

export interface InteractivePreviewOptions extends BaseOptions {
    mode?: PreviewMode;
    duration?: number;
    fps?: number;
    mosaicSize?: MosaicSize;
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
 * Represents media customization options including cover images and mosaic/board configurations.
 */
export interface MediaCustomization {
    cover: CoverUrls;
    mosaic: string;
    board?: BoardUrls;
}