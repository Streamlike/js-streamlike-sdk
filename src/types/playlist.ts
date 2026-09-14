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
     * Keep only the medias filed in at least one playlist (`true` / `1`), dropping those filed nowhere.
     * Redundant with `playlist_id`, which already implies it.
     * Webservices 5.20 and later: before that, `0` and `1` were read inverted — send `true` / `false`
     * if the target server may be older.
     */
    forceplaylist?: boolean | 0 | 1 | 'true' | 'false';
    /**
     * Filter on the encoder that published the media's files: `2` keeps only the medias published by
     * the current encoding pipeline, `1` only those published by the legacy encoder, absent does not filter.
     * A media publishing nothing (never encoded, live, first encoding running) is returned by neither value.
     * Webservices 5.20 and later.
     */
    encoding_version?: 1 | 2;
    /**
     * `1` keeps only the medias carrying several audio tracks, `0` only single-track ones, absent does not filter.
     * Webservices 5.20 and later — earlier servers accept it and ignore it.
     */
    multiple_audio?: 0 | 1;
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