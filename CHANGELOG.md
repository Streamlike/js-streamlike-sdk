# Changelog
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