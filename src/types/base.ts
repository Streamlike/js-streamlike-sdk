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
 * Defines common sorting parameters for API requests.
 */
export interface SortingParams {
    /**
     * The field to order by (e.g., 'releasedate').
     */
    orderby?: string;
    /**
     * The sort direction.
     */
    sortorder?: SortOrder;
}
