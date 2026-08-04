// --- SDK Version ---
export const SDK_VERSION = "3.5.0";
// console.log(`%cStreamlike SDK v${SDK_VERSION} loaded`, "color: #00ff00; font-weight: bold;");

// --- API Methods ---
export {getWs} from './utils/api';
export {getWsMedia, getMediaFromId, getMediaFromPermalink, getMediaStatistics, getMediaMetadata} from './api/media';
export {getWsCountries,getWsLanguages,getWsNowPlaying,getWsResume} from './api/misc';
export {getWsPlaylist,getPlaylistSize,getMediasFromPlaylist,getMediasFromCompany,getMediasFromView} from './api/playlist';
export {getWsPlaylists,getPlaylists} from './api/playlists';
export {getWsRelated} from './api/related';

// --- Features ---
export {generateThumbnail} from './features/preview';
export {generateWords} from './features/transcripts';
export {generateTrimmer} from './features/trimmer';
export {generatePlaylistPlayer} from './features/playlistPlayer';

// --- Player ---
export {setResponsiveIframe, embedPlayerIframe} from './player/iframe';

// Note: `generateWords` would be in `src/features/transcripts.ts` but was omitted for brevity as it's complex and unchanged.

// --- Types ---
export * from './types/api';
export * from './types/base';
export * from './types/features';
export * from './types/media';
export * from './types/misc';
export * from './types/player';
export * from './types/playlist';
export * from './types/playlistPlayer';
export * from './types/playlists';
export * from './types/related';
