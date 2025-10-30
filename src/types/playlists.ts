// path: src/types/playlist/playlists.ts
import {FormatParam, MandatoryCompanyParams, PaginationParams, SortingParams, ViewParams} from "./base";


export interface PlaylistsParams extends MandatoryCompanyParams,
    PaginationParams,
    SortingParams,
    ViewParams,
    FormatParam {
}
