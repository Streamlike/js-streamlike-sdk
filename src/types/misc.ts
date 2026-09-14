// path: src/types/countries.ts
import {FormatParam, MandatoryCompanyParams, MandatoryMediaParams, ViewParams} from "./base";
import {Language} from "./api";


//-- START COUNTRIES --//
/**
 * Defines the query parameters for the /ws/countries endpoint.
 */
export interface CountriesParams extends ViewParams, MandatoryCompanyParams,FormatParam {}


/**
 * Represents a single country object as returned by the /ws/countries endpoint.
 */
export interface Country {
    country_id: string;
}

/**
 * Represents the structure of the data object
 * in the successful response from /ws/countries.
 */
export interface CountriesResponse {
    country_ids: Country[];
}

//-- STOP COUNTRIES --//

//-- START LANGUAGES --//
/**
 * Defines the query parameters for the /ws/countries endpoint.
 */
export interface LanguagesParams extends ViewParams, MandatoryCompanyParams,FormatParam {}

/**
 * Represents the structure of the data object
 * in the successful response from /ws/languages.
 */
export interface LanguagesResponse {
    language_ids: Language[];
}
//-- STOP LANGUAGES --//


//-- START NOW PLAYING --//

export interface NowPlayingParams extends MandatoryMediaParams, FormatParam {
}


export interface ResumeParams extends MandatoryMediaParams, FormatParam {
    /**
     * Your own identifier for the viewer, the same value passed to the player as `user_token=`
     * for positions to be recorded at all. It is the only identity checked: keep it unguessable.
     */
    user_token: string
}

/**
 * Represents the response from the /ws/nowplaying endpoint.
 */
export interface NowPlayingResponse {
    nowplaying: NowPlaying;
}

/**
 * Represents the count of viewers.
 */
export interface NowPlaying {
    count: number;
}

//-- STOP NOW PLAYING --//