# Changelog
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