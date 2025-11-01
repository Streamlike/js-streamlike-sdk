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
/**
 * Interface representing the parameters for a player configuration.
 * This interface defines a wide range of optional properties that can be
 * used to customize the behavior and appearance of a media player.
 */
export interface PlayerParams {
    /**
     * Encrypted media ID
     * @default -
     * @streamlive no
     * @streamout no
     */
    med_id?: string,

    /**
     * Permalink
     * @default -
     * @streamlive no
     * @streamout no
     */
    permalink?: string,

    /**
     * Live ID or "stream name"
     * @default -
     * @streamlive yes
     * @streamout no
     */
    live_id?: string,

    /**
     * Encrypted streamout ID
     * @default -
     * @streamlive no
     * @streamout yes
     */
    str_id?: string,

    /**
     * Changes the color of all "active" elements of the player (progress bar, active buttons...).
     * Sets an HTML color, without the #. Ex: FF01F8
     * @default -
     * @streamlive yes
     * @streamout no
     */
    active_color?: string;

    /**
     * Automatic media start
     * @default false
     * @streamlive yes
     * @streamout no
     */
    autostart?: boolean;

    /**
     * Switches to the lowest available quality if a video is playing but is not visible
     * @default false
     * @streamlive yes
     * @streamout yes
     */
    background_audio?: boolean;

    /**
     * Change the background color behind the video and post it.
     * Sets an HTML color, without the #. Ex: FF01F8
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    background_color?: string;

    /**
     * Only in combination with a background_color. Override of the opacity parameter of the background color.
     * 0: transparent, 100: opaque
     * @default 100
     * @streamlive yes
     * @streamout yes
     */
    background_opacity?: number;

    /**
     * Change the color of overlaid buttons.
     * Set an HTML color, without the #. Ex: FF01F8
     * @default FFFFFF
     * @streamlive yes
     * @streamout yes
     */
    buttons_color?: string;

    /**
     * Force language or disable the display of chapters.
     * Ex: chapter=en or chapter=0
     * @default 1
     * @streamlive no
     * @streamout no
     */
    chapter?: string;

    /**
     * Show or disable chapter thumbnails
     * @default true
     * @streamlive no
     * @streamout no
     */
    chapters_usethumb?: boolean;

    /**
     * Display or not the player controls
     * @default true
     * @streamlive yes
     * @streamout no
     */
    controls?: boolean;

    /**
     * URL of the image to use for the cover, or boolean to enable / disable
     * @default 1
     * @streamlive yes
     * @streamout no
     */
    cover?: string;

    /**
     * Displays a download button for the highest quality transcoding /
     * displays a download button while setting the maximum bitrate for the transcoding that can be downloaded
     * @default 0
     * @streamlive no
     * @streamout no
     */
    download?: number | string;

    /**
     * Enables or disables the ability to control the player from outside the iframe
     * @default false
     * @streamlive yes
     * @streamout no
     */
    events?: boolean;

    /**
     * Enables or disables the playback mode that fills the entire browser window.
     * In this mode, parts of the video may become hidden but it is not distorted.
     * @default false
     * @streamlive yes
     * @streamout yes
     */
    fill_browser?: boolean;

    /**
     * Selects only the best quality stream (MP4 only)
     * @default false
     * @streamlive no
     * @streamout no
     */
    forcehd?: boolean;

    /**
     * Enable or disable fullscreen
     * @default true
     * @streamlive yes
     * @streamout yes
     */
    fs?: boolean;

    /**
     * Enable or disable Fullscreen
     * @default true
     * @streamlive yes
     * @streamout yes
     */
    fullscreen?: boolean;

    /**
     * Positions the icons panel to the right or left or completely hides the icons panel
     * @default right
     * @streamlive yes
     * @streamout no
     */
    icons_position?: "right" | "left" | "none";

    /**
     * Displays the title / description / credits block.
     * A "nometa" value of 1 disables this option
     * @default false
     * @streamlive yes
     * @streamout no
     */
    infos?: boolean | string;

    /**
     * Requires using the Theo player. Limits the quality of available videos for inline playback only
     * (not in full screen mode), by specifying a maximum bitrate (in Kbps)
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    inline_throttling?: number;

    /**
     * Force language or disable the display of interactions.
     * Ex: interaction=en or interaction=0
     * @default 1
     * @streamlive no
     * @streamout no
     */
    interaction?: string;

    /**
     * Disables all interface elements (buttons, controls, panel ...)
     * @default true
     * @streamlive yes
     * @streamout no
     */
    interface?: boolean;

    /**
     * Displays the cover image and a clickable logo instead of the player.
     * The player is loaded after clicking on the image.
     * @default false
     * @streamlive no
     * @streamout no
     */
    landing?: boolean;

    /**
     * Enables DVR mode during live streaming
     * @default true
     * @streamlive yes
     * @streamout no
     */
    live_dvr?: boolean | string;

    /**
     * Shows or hides the logo
     * @default true
     * @streamlive yes
     * @streamout yes
     */
    logo?: boolean;

    /**
     * Overriding the transparency parameter, only if the logo is set from a logo_url parameter
     * Value between 0 and 100
     * @default 100
     * @streamlive yes
     * @streamout yes
     */
    logo_alpha?: number;

    /**
     * Applies the logo referenced by its ID
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    logo_id?: number | string;

    /**
     * Makes the logo clickable and opens the url in a new window
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    logo_link?: string;

    /**
     * Position parameter override (r: right, t: top, b: bottom, l: left),
     * only if the logo is set from a logo_url parameter
     * @default rt
     * @streamlive yes
     * @streamout yes
     */
    logo_position?: "lb" | "lt" | "rt" | "rb";

    /**
     * Overrides the URL of the logo image
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    logo_url?: string;

    /**
     * Looping the media
     * @default false
     * @streamlive no
     * @streamout no
     */
    loop?: boolean;

    /**
     * Sets a width limit on the transcodes that are made available for adaptative streaming.
     * When combined with inline_throttling, the most stringent rule prevails
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    max_width?: number;

    /**
     * Sets a height limit on the transcodes that are made available for adaptative streaming.
     * When combined with inline_throttling, the most stringent rule prevails
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    max_height?: number;

    /**
     * Shows or disables mosaic
     * @default true
     * @streamlive no
     * @streamout no
     */
    mosaic?: boolean;

    /**
     * Mutes the media
     * @default false
     * @streamlive yes
     * @streamout yes
     */
    muted?: boolean;

    /**
     * Removes meta tags in the head (title, descriptions, keywords, og ...)
     * @default false
     * @streamlive yes
     * @streamout yes
     */
    nometa?: boolean;

    /**
     * Disables sharing meta tags on social networks (included in nometa)
     * @default false
     * @streamlive yes
     * @streamout yes
     */
    nosharemeta?: boolean;

    /**
     * Adds a clickable button to display the current number of playbacks
     * @default false
     * @streamlive yes
     * @streamout no
     */
    nowplaying?: boolean;

    /**
     * Encrypted ID of the player setting to apply to the media
     * @default company default
     * @streamlive yes
     * @streamout yes
     */
    pid?: string | boolean;

    /**
     * Shows or hides the central "play" button.
     * @default true
     * @streamlive yes
     * @streamout no
     */
    play_button?: boolean;

    /**
     * Displays the button to change the playback speed of the media
     * @default false
     * @streamlive no
     * @streamout no
     */
    playback_speed?: boolean;

    /**
     * Forces the player type
     * @default flow
     * @streamlive yes
     * @streamout yes
     */
    player?: "videojs" | "theo";

    /**
     * Preloads the media
     * @default false
     * @streamlive no
     * @streamout no
     */
    preload?: boolean;

    /**
     * Blocks the click on the player
     * @default false
     * @streamlive yes
     * @streamout no
     */
    prevent_click?: boolean;

    /**
     * Displays a grid of media sharing common keywords and belonging to the same view
     * @default false
     * @streamlive no
     * @streamout no
     */
    related?: string;

    /**
     * Displays the button to report inappropriate content
     * @default false
     * @streamlive yes
     * @streamout no
     */
    report?: boolean;

    /**
     * Shows or hides the share block
     * @default false
     * @streamlive yes
     * @streamout no
     */
    share?: boolean;

    /**
     * Uncrypted ID of the skin to use
     * @default -
     * @streamlive yes
     * @streamout no
     */
    skin?: string;

    /**
     * Shows or hides the slider
     * @default true
     * @streamlive no
     * @streamout no
     */
    slider?: boolean;

    /**
     * When token security is enabled, must contain the access token created by the API
     * String (32 characters)
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    sltoken?: string;

    /**
     * List of IDs of authorized IP groups, separated by commas
     * String (32 characters)
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    sltoken_ip_ids?: string;

    /**
     * List of IDs of authorized referrers, separated by commas
     * String (32 characters)
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    sltoken_referrer_ids?: string;

    /**
     * Validity duration of the token, in seconds
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    sltoken_duration?: string;

    /**
     * Position (in seconds) where to start the video
     * @default 0
     * @streamlive no
     * @streamout no
     */
    streamlike_mp_starttc?: number;

    /**
     * Forces language or disables subtitle display.
     * Ex: subtitle=fr or subtitle=0
     * @default 1
     * @streamlive no
     * @streamout yes
     */
    subtitle?: string;

    /**
     * Forces the language or disables the search in the subtitles.
     * Ex: subtitle_deep_links=en or subtitle_deep_links=0
     * @default 1
     * @streamlive no
     * @streamout no
     */
    subtitle_deep_links?: string;

    /**
     * Height of the font in em
     * @default -
     * @streamlive no
     * @streamout yes
     */
    subtitles_size?: number | string;

    /**
     * Uncrypted ID of the skin to use
     * @default -
     * @streamlive no
     * @streamout no
     */
    swfskin?: string;

    /**
     * Position where to start the video.
     * Formats accepted: hh:mm:ss.000 or shorter
     * @default 0
     * @streamlive no
     * @streamout no
     */
    t?: string | number;

    /**
     * Position where to start the video.
     * Formats accepted: hh:mm:ss.000 or shorter
     * @default 0
     * @streamlive no
     * @streamout no
     */
    tc?: string | number;

    /**
     * Limits the quality of available videos by specifying a maximum bitrate (in Kbps);
     * Sets a minimum quality threshold if the value is negative
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    throttling?: number;

    /**
     * Position where to start the video.
     * Formats accepted: hh:mm:ss.000 or shorter
     * @default 0
     * @streamlive no
     * @streamout no
     */
    timecode?: string | number;

    /**
     * Removes the controls and the play button and forces autoplay.
     * Interactions remain visible but not clickable.
     * Default setting that cannot be modified for a streamout
     * @default false
     * @streamlive yes
     * @streamout no
     */
    tv?: boolean;

    /**
     * Transcript
     */
    transcript?: boolean;

    /**
     * Identify a particular user by permanently assigning him/her the same token
     * String (64 characters)
     * @default -
     * @streamlive yes
     * @streamout yes
     */
    user_token?: string;

    /**
     * Volume adjustment from 0.0 to 1.0
     * @default 1.0
     * @streamlive yes
     * @streamout yes
     */
    volume?: number | boolean;
}