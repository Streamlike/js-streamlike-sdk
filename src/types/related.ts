import {FormatParam, PaginationParams, ViewParams} from "./base";

export interface RelatedParams extends PaginationParams, ViewParams, FormatParam {
    media_id: string;
}