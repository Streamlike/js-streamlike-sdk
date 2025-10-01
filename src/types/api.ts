import { BaseOptions } from "./base";

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
