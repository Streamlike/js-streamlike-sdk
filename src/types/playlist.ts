// path: src/types/playlist/playlist.ts
import {PaginationParams, SortingParams, ViewParams} from "./base";

/**
 * Defines the query parameters for the /ws/playlist endpoint
 * based on the OpenAPI specification.
 * Extends common pagination and sorting parameters.
 * orderby choice values  : ["id","name","duration","vote","hit","lastplaybackdate","creationdate","lastupdateddate","lastupdatedfiledate","releasedate","position"]
 */
export interface PlaylistParams extends PaginationParams, SortingParams, ViewParams {
    /**
     * Filter by country code.
     */
    country?: string;
    /**
     * Filter mediaParams encoded or not.
     */
    encoded?: boolean;
    /**
     * Filter mediaParams at least in on playlist {choice values: ["true","false",0,1]}
     */
    forceplaylist?: string;
    /**
     * Filter by language code (e.g., 'en', 'fr').
     */
    lng?: string;
    /**
     * Exclude mediaParams associated with these country codes.
     */
    not_countries?: string[];
    /**
     * Exclude mediaParams associated with these language codes.
     */
    not_languages?: string[];
    /**
     * Exclude these mediaParams IDs from the result.
     */
    not_media_ids?: string[];
    /**
     * Exclude mediaParams belonging to these playlist IDs.
     */
    not_playlist_ids?: string[];
    /**
     * Exclude mediaParams belonging to these view IDs.
     */
    not_view_ids?: string[];
    /**
     * A search query string.
     */
    query?: string;
    /**
     * Fields to include in the search (e.g., 'name', 'description').
     */
    search_fields?: string[];

    // --- Identifiers ---
    /**
     * Filter by company ID.
     */
    company_id?: string;
    /**
     * Filter by view ID.
     */
    view_id?: string;
    /**
     * Filter by playlist ID.
     * Note: getWsPlaylist() also accepts string[] for the main `id` argument,
     * but the query parameter in the spec is listed as string.
     */
    playlist_id?: string;
}