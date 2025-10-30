// path: src/types/playerParams.ts

import {BaseOptions} from "./api";

/**
 * Represents types of identifiers used for mediaParams.
 */
export enum TypePlayerId {
    media = 'media',
    permalink = 'permalink',
    live = 'live',
    streamout = 'str_id'
}

/**
 * Represents the options for configuring an iframe.
 *
 * This interface is used to specify various configurable parameters
 * for an iframe, including player-related options, permissions, and
 * additional iframe settings.
 *
 * Properties:
 * - `typePlayerId` (optional): Specifies the type of player identifier to be used.
 * - `playerParams` (optional): Provides configuration options for the player.
 * - `iframeParams` (optional): Allows defining specific iframe settings, such as:
 *    - `allowfullscreen`: Determines whether fullscreen mode is allowed.
 *    - `allowautoplay`: Indicates whether autoplay of content is permitted.
 *    - `onLoad`: A callback function to handle iframe load events.
 * - `baseOptions` (optional): Includes additional base configuration options applicable to the iframe.
 */
export interface IframeOptions {
    typePlayerId?: TypePlayerId;
    playerParams?: PlayerParams;
    iframeParams?: {
        allowfullscreen?: boolean;
        allowautoplay?: boolean;
        onLoad?: () => void;
    };
    baseOptions?: BaseOptions;
}

export interface PlayerParams {
    med_id?: string,
    permalink?: string,
    live_id?: string,
    str_id?: string,
    active_color?: string;
    autostart?: boolean;
    background_audio?: boolean;
    background_color?: string;
    background_opacity?: number;
    buttons_color?: string;
    chapter?: string;
    chapters_usethumb?: boolean;
    controls?: boolean;
    cover?: string;
    download?: number | string; // TypeOption::NUMBER, default: "0"
    events?: boolean;
    fill_browser?: boolean;
    forcehd?: boolean;
    fs?: boolean;
    fullscreen?: boolean;
    icons_position?: "right" | "left" | "none"; // TypeOption::OPTIONS
    infos?: boolean | string; // TypeOption::BOOLEAN, default: "0"
    inline_throttling?: number;
    interaction?: string;
    interface?: boolean;
    landing?: boolean;
    live_dvr?: boolean | string; // TypeOption::BOOLEAN, default: ""
    logo?: boolean;
    logo_alpha?: number;
    logo_id?: number | string; // TypeOption::NUMBER, default: ""
    logo_link?: string;
    logo_position?: "lb" | "lt" | "rt" | "rb"; // TypeOption::OPTIONS
    logo_url?: string;
    loop?: boolean;
    max_width?: number;
    max_height?: number;
    mosaic?: boolean;
    muted?: boolean;
    nometa?: boolean;
    nosharemeta?: boolean;
    nowplaying?: boolean;
    pid?: string | boolean; // TypeOption::STRING, default: false
    play_button?: boolean;
    playback_speed?: boolean;
    player?: "videojs" | "theo"; // TypeOption::OPTIONS
    preload?: boolean;
    prevent_click?: boolean;
    related?: string;
    report?: boolean;
    share?: boolean;
    skin?: string;
    slider?: boolean;
    sltoken?: string; // TypeOption::STRING, default: false
    sltoken_ip_ids?: string;
    sltoken_referrer_ids?: string;
    sltoken_duration?: string;
    streamlike_mp_starttc?: number;
    subtitle?: string;
    subtitle_deep_links?: string;
    subtitles_size?: number | string; // TypeOption::NUMBER, default: ""
    swfskin?: string;
    t?: string | number; // TypeOption::STRING, default: 0
    tc?: string | number; // TypeOption::STRING, default: 0
    throttling?: number;
    timecode?: string | number; // TypeOption::STRING, default: 0
    tv?: boolean;
    transcript?: boolean;
    user_token?: string;
    volume?: number | boolean; // TypeOption::NUMBER, default: true
}
