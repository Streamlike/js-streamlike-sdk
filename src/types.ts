/**
 * Represents types of identifiers used for various entities.
 * This enum provides a set of predefined string constants that can be used
 * to categorize and identify specific entities or resources.
 */
export enum TypeId {
    MedId = 'med_id',
    Permalink = 'permalink',
    LiveId = 'live_id',
    Streamout = 'streamout'
}

export enum HostWs {
    prod = 'cdn.streamlike.com',
    recette = 'recette5.streamlike.com'
}

/**
 * Represents a standardized response from a web service.
 * @template T The type of the `data` property.
 */
export interface WebserviceResponse<T = any> {
    status: number;
    info: string;
    data: T | null;
}

/**
 * Represents the structure of the response in a callback.
 * @template T The type of the data being returned in the response.
 */
export interface CallbackResponse<T = any> {
    res: boolean;
    data: T | null;
    errors: string | null;
}

/**
 * Represents configuration options for an iframe setup.
 */
export interface IframeOptions extends BaseOptions {
    player?: { [key: string]: string | number | boolean };
    iframe?: {
        allowfullscreen?: boolean;
        allowautoplay?: boolean;
        onLoad?: () => void;
    };
    typeId?: TypeId;
}

/**
 * Base options for API calls.
 */
export interface BaseOptions {
    host?: string;
    debug?: boolean;
}

/**
 * Enum for media retrieval types.
 */
export enum GetMediasType {
    CompanyId = 'company_id',
    ViewId = 'view_id',
    PlaylistId = 'playlist_id'
}

/**
 * Options for fetching a list of media.
 */
export interface GetMediasOptions extends BaseOptions {
    playlist?: { [key: string]: string | number | boolean | string[] };
    type?: GetMediasType;
    api?: boolean;
}

/**
 * Options for fetching related media.
 */
export interface GetRelatedOptions extends BaseOptions {
    related?: { [key: string]: string | number | boolean };
}

// --- Types for Transcript/Words Feature ---

/**
 * Represents a single word from a transcript file.
 */
export interface Word {
    start: number;
    end: number;
    word: string;
    punctuation?: string | boolean;
}

/**
 * Represents the structure of a single subtitle/transcript entry.
 */
export interface Subtitle {
    subtitle: {
        language_id: string;
        url: {
            words: string;
            [key: string]: string; // vtt, srt, etc.
        };
    };
}

/**
 * Options for initializing the transcript feature.
 */
export interface TranscriptOptions {
    /** The container element (or its ID) where words will be displayed. */
    wordsContainer: string | HTMLElement;
    iframePlayer: string | HTMLIFrameElement;
    debug?: boolean;
}

