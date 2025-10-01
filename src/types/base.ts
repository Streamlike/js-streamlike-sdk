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
 * Base options for API calls.
 */
export interface BaseOptions {
    host?: string;
    debug?: boolean;
}

/**
 * Defines available hosts for the API.
 */
export enum HostWs {
    prod = 'cdn.streamlike.com',
    recette = 'recette5.streamlike.com'
}
