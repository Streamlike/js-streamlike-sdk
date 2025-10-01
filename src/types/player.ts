import { BaseOptions } from "./base";

/**
 * Represents types of identifiers used for media.
 */
export enum TypeId {
    MedId = 'med_id',
    Permalink = 'permalink',
    LiveId = 'live_id',
    Streamout = 'streamout'
}

/**
 * Represents configuration options for an iframe setup.
 */
export interface IframeOptions extends BaseOptions {
    player?: { [key: string]: string | number | boolean };
    iframe?: {
        allowfullscreen?: boolean;
        allowautoplay?: boolean;
        onLoad?: () => void;
    };
    typeId?: TypeId;
}
