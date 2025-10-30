/**
 * Base options for API calls.
 */
export interface BaseOptions extends hostOptions, debugOptions {
}

export interface hostOptions {
    /**
     * The host to use for the API call (e.g., HostWs.streamlike).
     */
    host?: string;
}

export interface debugOptions {
    /**
     * Enable debug logging in the console.
     */
    debug?: boolean;
}

/**
 * Represents a standardized response from a web service.
 * @template T The typePlayerId of the `data` property.
 */
export interface WebserviceResponse<T = any> {
    status: number;
    info: string;
    data: T | null;
}

/**
 * Represents the structure of the response in a callback.
 * @template T The typePlayerId of the data being returned in the response.
 */
export interface CallbackResponse<T = any> {
    res: boolean;
    data: T | null;
    errors: string | null;
}

/**
 * Represents the root response from the /ws/playlist endpoint.
 */
export interface PlaylistResponse {
    playlist: Playlist;
}

/**
 * Represents the root response from the /ws/playlists endpoint.
 */
export interface PlaylistsResponse {
    playlists: PlaylistItem[];
}


/**
 * Interface representing the response structure for a media callback.
 *
 * This interface is used to define the shape of the response returned from operations involving media callbacks.
 *
 * @property {boolean} res Indicates the success status of the media callback operation.
 * @property {Media | null} data Contains the media data if the operation is successful. If the operation fails, this will be null.
 * @property {string | null} errors Provides error details if the operation fails. If the operation is successful, this will be null.
 */
export interface MediaCallbackResponse {
    res: boolean;
    data: Media | null;
    errors: string | null;
}

/**
 * Represents a playlist item in a structured format.
 *
 * Each playlist item contains details pertaining to a specific playlist,
 * including its metadata and associated attributes such as the playlist name,
 * description, language, total duration, and the viewing position.
 *
 * Properties:
 * - `playlist`: An object containing information about a playlist.
 *   - `playlist_id`: The unique identifier of the playlist.
 *   - `name`: The name of the playlist.
 *   - `description`: A brief description of the playlist.
 *   - `language`: The language of the playlist's content.
 *   - `total_duration`: The total duration of the playlist, typically in seconds.
 *   - `view_position`: A property indicating the viewing position or progress within the playlist.
 */
export interface PlaylistItem {
    playlist: {
        [key: string]: string | number;

        playlist_id: string;
        name: string;
        description: string;
        language: string;
        total_duration: number;
        view_position: string;
    }
}

/**
 * Represents the main playlist object.
 */
export interface Playlist {
    metadata: PlaylistMetadata;
    medias: MediaContainer[];
}

/**
 * Metadata for the playlist itself (e.g., total size).
 */
export interface PlaylistMetadata {
    size: number;
}

/**
 * Wrapper object for a single media item within the 'medias' array.
 */
export interface MediaContainer {
    media: Media;
}

/**
 * Represents a single media.
 */
export interface Media {
    metadata: MediaMetadata;
    statistics: Statistics;
    html5_sources: Html5SourceContainer[];
}

/**
 * Detailed metadata for a mediaParams item.
 */
export interface MediaMetadata {
    global: GlobalMetadata;
    share: Share;
    keywords?: Keywords;
    customization: Customization;
    chapters?: ChapterContainer[];
    subtitles?: SubtitleContainer[];
    language_ids: Language[];
    playlists?: MediaPlaylistContainer[];
}

/**
 * Global metadata properties for a mediaParams item.
 */
export interface GlobalMetadata {
    [key: string]: string | number | boolean | null | undefined;

    media_id: string;
    name: string;
    type: "video" | "audio" | string; // Type can be other strings
    permalink: string;
    status: "online" | string; // Status can be other strings
    description?: string;
    transcript?: string;
    duration: number;
    ratio: number;
    fps: number;
    creation_date: string;
    release_date: string;
    lastupdated_date: string;
    lastupdatedfile_date: string;
    lastplayback_date?: string;
    is_360: boolean;
    is_multiple_audio: boolean;
    is_tokenized: boolean;
    has_password: boolean;
    sourceExtension?: string;
    sourceWidth?: string;
    sourceFrameRate?: string;
    sourceHeight?: string;
    is_downloadable: boolean;
    is_secured: boolean;
    has_sound?: boolean;
    saMedIAnalyst?: string; // Appears to be a JSON string
    PIN?: string;
}

/**
 * Sharing information for the mediaParams.
 */
export interface Share {
    universal_url: string;
}

/**
 * Keyword container.
 */
export interface Keywords {
    standard_keywords: StandardKeyword[];
}

/**
 * A single standard keyword.
 */
export interface StandardKeyword {
    standard_keyword: string;
}

/**
 * Customization options (cover, mosaic, etc.).
 */
export interface Customization {
    cover: Cover;
    mosaic: string;
    board?: Board;
}

/**
 * Cover image URLs.
 */
export interface Cover {
    url: string;
    thumbnail_url: string;
    thumbnaillarge_url: string;
    thumbnailextralarge_url: string;
}

/**
 * Board URLs (often empty).
 */
export interface Board {
    small_url: string;
    large_url: string;
}

/**
 * Wrapper for a chapter item.
 */
export interface ChapterContainer {
    chapter: Chapter;
}

/**
 * Chapter details.
 */
export interface Chapter {
    language_id: string;
    url: string;
}

/**
 * Wrapper for a subtitle item.
 */
export interface SubtitleContainer {
    subtitle: Subtitle;
}

/**
 * Subtitle details.
 */
export interface Subtitle {
    language_id: string;
    url: SubtitleUrls;
}

/**
 * URLs for different subtitle formats.
 */
export interface SubtitleUrls {
    dfxp: string;
    vtt: string;
    srt: string;
    m3u8: string;
    words?: string; // Optional property for word-level timing
}

/**
 * Wrapper for a language ID.
 */
export interface Language {
    language_id: string;
}

/**
 * Wrapper for a playlist reference within a mediaParams item.
 */
export interface MediaPlaylistContainer {
    playlist: MediaPlaylist;
}

/**
 * Details of a playlist that the mediaParams belongs to.
 */
export interface MediaPlaylist {
    name: string;
    playlist_id: string;
    type: "public" | string;
    position: number;
}

/**
 * Statistics for the mediaParams item.
 */
export interface Statistics {
    media_access: number;
    rating_hits: number;
    rating_totalvalue: number;
}

/**
 * Wrapper for an HTML5 source.
 */
export interface Html5SourceContainer {
    html5_source: Html5Source;
}

/**
 * HTML5 source details.
 */
export interface Html5Source {
    type: string;
    manifest: string;
}


/**
 * Represents the response from the /ws/resume endpoint.
 */
export interface ResumeResponse {
    resume: Resume;
}

/**
 * Contains the resume timecode.
 */
export interface Resume {
    timecode: number;
}
