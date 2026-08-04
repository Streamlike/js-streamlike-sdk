# Changelog
## [3.6.0] - 2026-08-04

### New Features (Minor)
- `generatePlaylistPlayer` handles the medias whose access is restricted. A tokenized media without password cannot be played from a plain player URL: it used to appear in the list and fail as soon as the reader clicked it. `PlaylistPlayerOptions.hideTokenized` (true by default) removes it from the list and from the counts; set to `false`, its cover is shown in the list and in place of the player, with the `labels.secured` message and a button to jump to the next media.
- A tokenized media protected by a password stays playable and is never hidden: the player prompts for the password.
- A media secured by IP or referrer (`is_secured` without `is_tokenized`) stays playable — playback is attempted and the player answers a 404 when the restriction does not pass — and displays the same message and button.
- Added `labels.secured` (default `Secured media`) and the `{prefix}-notice`, `{prefix}-notice-message`, `{prefix}-notice-next`, `{prefix}-player-cover` classes, plus `is-locked` / `is-secured` on the concerned list entries.
- The offset used for paging is tracked separately from the kept medias, so hiding an entry no longer shifts the next page, and a page made only of hidden medias no longer ends the pagination.

## [3.5.0] - 2026-08-04

### New Features (Minor)
- Introduced `generatePlaylistPlayer`, a playlist player that plays every media of an ordered playlist, with previous / next controls, a clickable media list and auto-advance at the end of a media.
- Added `PlaylistPlayerOptions.info` and `PlaylistPlayerOptions.listItem` to choose which information (title, description, position, duration, current time, playlist name, release date, release time, views, keywords) is displayed during playback and in the list.
- `info.releaseTime` displays the time of day (hours and minutes) taken from `release_date`, formatted with the `locale` option. Class: `{prefix}-info-time`.
- Added deep-link support through `startMediaId` / `startTimecode` and `shareParams`, so a shared link can start on a given media at a given position. The returned controller exposes `getShareUrl()` to build such a link.
- Every generated element carries a CSS class built from the configurable `classPrefix` (`sl-playlist` by default); the default stylesheet uses single-class selectors and can be disabled with `injectStyles: false`.
- Exposed `embedPlayerIframe`, the iframe creation helper extracted from `setResponsiveIframe` and shared with the playlist player (which therefore navigates without extra API calls).
- Medias are loaded incrementally: `pageSize` (10 by default) medias per request, the next page being fetched when playback approaches the end of the loaded ones (`prefetchThreshold`), plus a "load more" button in the list while medias remain. `getTotal()` and `loadMore()` were added to the controller, and the list counter shows the loaded/total ratio.
- A shared link targeting a media beyond the first page now loads the whole playlist to locate it, instead of falling back to the first media.
- Added the `demo/playlist-player.html` demo page.
- Added a browser global build (`dist/index.global.js`, IIFE, minified, `Streamlike` global) so the SDK can be used from a `<script>` tag without ES modules. The `build` script now produces it alongside the CJS/ESM/types outputs, and the `unpkg` / `jsdelivr` package fields point to it.
- Documented CDN usage (jsDelivr, unpkg) in the `README.md`, with the `demo/playlist-player-cdn.html` demo page loading the SDK without any install.

## [3.4.1] - 2026-07-30

### Fix
- Updated `README.md` documentation, correcting cut-off descriptions, duplicate entries, missing API functions, typos, code example flaws, and inaccurate type descriptions.

## [3.4.0] - 2026-04-03

### New Features (Minor)
- Added `baseOptions` to `TrimmerOptions` to allow passing global configuration (such as `host` or `debug`) to the trimmer's internal player.


## [3.3.0] - 2026-04-02

### New Features (Minor)
- ### Added
- Introduced `generateTrimmer` function for creating interactive video segment trimmers.
- Added `TrimmerOptions` interface for configuring the trimmer.

## [3.2.0] - 2026-01-07

### New Features (Minor)
- ### Added
- Enabled 'Scrubbing' and 'Animation' preview modes in `demo/playlist.html`.
- Enabled 'Fit mode animation' in `demo/playlist.html`.
- Introduced `autoScroll` option in `TranscriptOptions` to control automatic scrolling of transcripts during playback.

## [3.1.2] - 2025-12-23

### 
- Corrected typo in `OrderByPlaylist` enum from `VOTRE` to `VOTE`.

## [3.1.1] - 2025-11-13

### fix
- Corrected internal endpoint handling for streamout and live player types in `setResponsiveIframe`.

## [3.1.0] - 2025-11-05

### New Features (Minor)
- ### Added
- Enhanced `PlaylistMetadata` interface with new optional fields: `playlist_id`, `name`, `description`, `total_duration`, and `view_position`.
- Introduced `OrderByPlaylist` and `OrderByPlaylists` enums to provide specific and type-safe sorting options for media within playlists and for playlists themselves.
- Updated `SortingParams` interface to allow `orderby` property to accept `OrderByPlaylist` or `OrderByPlaylists` enums, improving type safety for API sorting parameters.

## [3.0.0] - 2025-11-02
### Major Changes (BREAKING CHANGES)
- Modified `setResponsiveIframe` to use the `aspectRatio` CSS property for responsive sizing instead of the `paddingTop` hack. This may require adjustments to custom CSS that relied on the previous implementation.

### Added
- Introduced new 'Fit Mode' options (`cover`, `contain`) for `generateThumbnail` to control how interactive preview thumbnails are displayed. This includes a blurred background option for `contain` mode.
- Enhanced `generateThumbnail` with a completely refactored rendering logic, utilizing `<img>` elements for improved control and adding touch event support for mobile devices.
- Added `width` and `height` properties to the `MosaicFrame` interface, providing more precise data for thumbnail frames.
- Added comprehensive JSDoc comments to the `PlayerParams` interface for improved documentation and clarity.

### fix
- Display media name in `demo/playlist.html`.

## [2.0.0] - 2025-10-31

### Major Changes (BREAKING CHANGES)
- Refactored API structure for improved modularity and consistency. 
- Introduced new API modules for `misc`, `playlists`, and `related` endpoints. 
- Renamed and updated signatures for existing media and playlist functions, including `getMediaMetadata`, `getStatistics` to `getMediaStatistics`, `getRelated` to `getMediasRelated`, and `getMedias` to `getMediasFromPlaylist`. 
- Updated `setResponsiveIframe` parameters and internal logic. This includes significant breaking changes to the SDK's public API.


## [1.0.3] - 2025-10-08

### Added
- Add `fixHost` function and integrate it across API calls to ensure valid host URLs.

## [1.0.2] - 2025-10-4

### Added
- **First deployment to NPM**: The SDK is now available on NPM as `@js-streamlike-sdk` and can be installed with `npm i js-streamlike-sdk` or `yarn add @js-streamlike-sdk`

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).