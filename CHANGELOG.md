# Changelog
## [3.5.0] - 2026-08-03

### New Features (Minor)
- Introduced `generatePlaylistPlayer`, a playlist player that plays every media of an ordered playlist, with previous / next controls, a clickable media list and auto-advance at the end of a media.
- Added `PlaylistPlayerOptions.info` and `PlaylistPlayerOptions.listItem` to choose which information (title, description, position, duration, current time, playlist name, release date, release time, views, keywords) is displayed during playback and in the list.
- `info.releaseTime` displays the time of day (hours and minutes) taken from `release_date`, formatted with the `locale` option. Class: `{prefix}-info-time`.
- Added deep-link support through `startMediaId` / `startTimecode` and `shareParams`, so a shared link can start on a given media at a given position. The returned controller exposes `getShareUrl()` to build such a link.
- Every generated element carries a CSS class built from the configurable `classPrefix` (`sl-playlist` by default); the default stylesheet uses single-class selectors and can be disabled with `injectStyles: false`.
- Exposed `embedPlayerIframe`, the iframe creation helper extracted from `setResponsiveIframe` and shared with the playlist player (which therefore navigates without extra API calls).
- Added the `demo/playlist-player.html` demo page.

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