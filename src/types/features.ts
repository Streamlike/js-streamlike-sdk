// path: src/types/features.ts

// --- Transcript/Words ---
import {debugOptions} from "./api";

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

export interface Word {
    start: number;
    end: number;
    word: string;
    punctuation?: string | boolean;
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
    cover: CoverUrls;
    mosaic: string;
    board?: BoardUrls;
}