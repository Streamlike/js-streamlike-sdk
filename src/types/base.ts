// path: src/types/base.ts
/**
 * Defines the query parameters for company-related endpoints.
 */
export interface MandatoryCompanyParams {
    /**
     * The ID of the company to filter by.
     */
    company_id: string;
}

/**
 * Defines the query parameters for company-related endpoints.
 */
export interface MandatoryMediaParams {
    /**
     * The ID of the company to filter by.
     */
    media_id: string;
}

/**
 * Base options for API calls.
 */
export interface ViewParams {
    /**
     * View filter.
     */
    view_id?: string;
}

/**
 * Base options for API calls.
 */
export interface FormatParam {
    /**
     * Webservice output format.
     */
    f?: 'json' | 'xml';
}

/**
 * Defines common pagination parameters for API requests.
 */
export interface PaginationParams {
    /**
     * The page number to retrieve.
     * {range min: 0}
     */
    page?: number;
    /**
     * The number of items per page.
     * {range min: 1}
     */
    pagesize?: number;
}

/**
 * Defines possible sort orders.
 */
export enum SortOrder {
    Up = 'up',
    Down = 'down'
}

/**
 * Sorting fields of `/ws/playlist` (medias within a playlist).
 */
export enum OrderByPlaylist{
    ID="id",
    NAME="name",
    DURATION="duration",
    /**
     * Number of votes received.
     */
    VOTE="vote",
    /**
     * Average rating (`statistics.rating_rate`). Streamlike 6.1.1 and later.
     */
    VOTE_RATE="vote.rate",
    HIT="hit",
    LAST_PLAYBACK_DATE="lastplaybackdate",
    CREATION_DATE="creationdate",
    LAST_UPDATE_DATE="lastupdateddate",
    LAST_UPDATED_FILE_DATE="lastupdatedfiledate",
    RELEASE_DATE= "releasedate",
    POSITION="position"
}

/**
 * Sorting fields of `/ws/playlists`.
 */
export enum OrderByPlaylists{
    ID="id",
    NAME="name",
    CREATION_DATE="creationdate",
    POSITION="position"
}

/**
 * Sorting fields of `/ws/podcast`, the podcast feed built from a playlist
 * (`https://cdn.streamlike.com/ws/podcast?playlist_id=…&orderby=…`).
 * The feed is XML and meant for podcast directories: the SDK does not fetch it,
 * the enum is here to build its URL.
 */
export enum OrderByPodcast{
    CREATION_DATE="creationdate",
    LAST_UPDATE_DATE="lastupdateddate",
    LAST_UPDATED_FILE_DATE="lastupdatedfiledate",
    /**
     * Streamlike 6.1.1 and later.
     */
    RELEASE_DATE="releasedate"
}

/**
 * Defines common sorting parameters for API requests.
 */
export interface SortingParams {
    /**
     * The field to order by (e.g., 'releasedate').
     */
    orderby?: OrderByPlaylist|OrderByPlaylists|OrderByPodcast|string;
    /**
     * The sort direction.
     */
    sortorder?: SortOrder;
}
