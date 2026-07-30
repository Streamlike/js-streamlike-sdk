# Streamlike JS SDK
The Streamlike JS SDK is a TypeScript library designed to interact with the Streamlike platform. It simplifies the integration of mediaParams, playlists, and advanced features like dynamic transcripts and interactive previews into your web applications.

## Features
- Easy integration of responsive video players.
- Fetching mediaParams and playlist data via the Streamlike API.
- Generation of interactive thumbnails with different modes (animation, scrubbing).
- Display of dynamic transcripts synchronized with video playback.
- Interactive trimmer for video segments.
- Fully typed with TypeScript for a better development experience.

## Live Demo
You can see a live demonstration of the library's features, including playerParams and playlist examples, by opening the files in the `demo` folder.

## Installation
To install the library, use npm:

```bash
npm install js-streamlike-sdk
```

## Usage
Here's how to use the main features of the library.

### 1. Embed a video player
Use the `setResponsiveIframe` function to embed a video player in an HTML container.

**Note on Breaking Change**: The return structure of `setResponsiveIframe` has changed. Previously, media metadata was accessed via `response.res.global.name`. It is now accessed via `response.data.metadata.global.name`. Please update your code accordingly.

```html
<!-- Your HTML container -->
<div id="player-container"></div>

<script type="module">
    import { setResponsiveIframe } from 'js-streamlike-sdk';

    const containerId = 'player-container';
    const mediaId = 'your-media-id';
    const options = {
        playerParams: {
            events: 1, // Enables player events
            autoplay: true,
            active_color: "293c5a"
        },
        baseOptions: {
            debug: true
        }
    };

    setResponsiveIframe(mediaId, containerId, options)
        .then(response => {
            if (response.res) {
                console.log('Player loaded successfully!', response.data);
            } else {
                console.error('Error loading player:', response.errors);
            }
        });
</script>
```

### 2. Display a playlist
Fetch the media from a playlist with `getMediasFromPlaylist` and display them. This example creates a mosaic of thumbnails.

```html
<div id="playlist-mosaic-container"></div>

<script type="module">
    import { getMediasFromPlaylist, generateThumbnail } from 'js-streamlike-sdk';

    const mosaicContainer = document.getElementById('playlist-mosaic-container');
    const playlistId = 'your-playlist-id';

    async function loadPlaylist(id) {
        const playlistData = await getMediasFromPlaylist(id);

        if (playlistData && playlistData.length > 0) {
            mosaicContainer.innerHTML = ''; // Clear the container

            playlistData.forEach(mediaItem => {
                const media = mediaItem.media;
                const item = document.createElement('div');
                item.className = 'mosaic-item';
                
                const thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';

                // Generate the interactive thumbnail with fitMode options
                generateThumbnail(thumbnail, media.metadata.customization, {
                    mode: 'animation',
                    fitMode: {
                        cover: 'cover', // Options: 'cover' (fill) or 'contain' (with blur)
                        animation: 'contain' // Options: 'cover' (fill) or 'contain' (with blur)
                    }
                });
                
                const title = document.createElement('div');
                title.className = 'title';
                title.textContent = media.metadata.global.name;

                item.appendChild(thumbnail);
                item.appendChild(title);
                mosaicContainer.appendChild(item);
            });
        }
    }

    loadPlaylist(playlistId);
</script>
```

### 3. Display a dynamic transcript
After loading a player, use `generateWords` to display an interactive transcript. The words are highlighted during playback and are clickable to navigate through the video.

```html
<div id="player-container"></div>
<div id="words-container"></div>

<script type="module">
    import { setResponsiveIframe, generateWords } from 'js-streamlike-sdk';

    const containerId = 'player-container';
    const mediaId = 'your-media-id';

    // 1. Load the player
    setResponsiveIframe(mediaId, containerId).then(response => {
        if (response.res && response.data) {
            const media = response.data;
            const wordsUrl = media.metadata.subtitles?.[0]?.subtitle?.url?.words;
            const playerIframe = document.getElementById(containerId).querySelector('iframe');

            if (wordsUrl && playerIframe) {
                // 2. Generate the transcript
                generateWords(wordsUrl, {
                    wordsContainer: 'words-container',
                    iframePlayer: playerIframe,
                    debug: true,
                    autoScroll: true // Option to control auto-scrolling
                });
            } 
        }
    });
</script>
```

### 4. Generate an interactive trimmer
Use the `generateTrimmer` function to create an interactive video segment trimmer. This allows users to select start and end points of a video.

```html
<!-- Your HTML container for the trimmer -->
<div id="trimmer-container" style="width: 100%; max-width: 800px; margin: 0 auto;"></div>

<!-- Input fields to bind to the trimmer -->
<input type="number" id="start-time" step="any">
<input type="number" id="end-time" step="any">
<input type="number" id="current-time" step="any" readonly>

<script type="module">
    import * as Streamlike from 'js-streamlike-sdk';

    const mediaId = 'your-media-id'; // Replace with an actual media ID
    const duration = 120; // Replace with actual media duration

    async function loadTrimmer() {
        const mediaContainer = await Streamlike.getMediaFromId(mediaId, {}, { debug: true });
        if (!mediaContainer || !mediaContainer.media) {
            console.error("No media found for ID", mediaId);
            return;
        }
        const media = mediaContainer.media;

        Streamlike.generateTrimmer('trimmer-container', {
            duration: media.metadata?.global?.duration || duration,
            mediaId: mediaId,
            mediaCustomization: media.metadata?.customization,
            aspectRatio: media.metadata?.global?.ratio || (16 / 9),
            startInput: 'start-time',
            endInput: 'end-time',
            currentTimeInput: 'current-time',
            initialStart: 10,
            initialEnd: 30,
            debug: true,
            baseOptions: {
                debug: true
            }
        });
    }

    loadTrimmer();
</script>
```

## API Reference

### Core Utility
- `getWs(url, debug = false)`: Fetches Streamlike API data from a full endpoint URL.

### Media API
- `getWsMedia(params, options)`: Fetches media content from `/ws/media` using `media_id` or `permalink`.
- `getMediaFromId(id, params, options)`: Retrieves media container by media ID.
- `getMediaFromPermalink(permalink, params, options)`: Retrieves media container by permalink.
- `getMediaMetadata(params, options)`: Fetches metadata for specified media parameters.
- `getMediaStatistics(params, options)`: Fetches playback and rating statistics for specified media.

### Playlist API
- `getWsPlaylist(params, options)`: Fetches raw playlist data from `/ws/playlist`.
- `getPlaylistSize(params, options)`: Retrieves the total item count of a playlist.
- `getMediasFromPlaylist(id, params, options)`: Retrieves media items from a specified playlist ID.
- `getMediasFromCompany(id, params, options)`: Retrieves media items belonging to a company ID.
- `getMediasFromView(id, params, options)`: Retrieves media items belonging to a view ID.

### Playlists API
- `getWsPlaylists(params, options)`: Fetches playlist data for a company from `/ws/playlists`.
- `getPlaylists(params, options)`: Retrieves list of playlists based on query parameters.

### Related & Misc API
- `getWsRelated(params, options)`: Fetches related media items for a given media.
- `getWsCountries(options)`: Fetches list of available countries.
- `getWsLanguages(options)`: Fetches list of available languages.
- `getWsNowPlaying(options)`: Fetches now-playing items.
- `getWsResume(params, options)`: Fetches video resume timecode.

### Player & Features
- `setResponsiveIframe(id, target, options)`: Embeds a responsive player iframe into a target container.
- `generateThumbnail(target, mediaCustomization, options)`: Generates an interactive preview thumbnail.
- `generateWords(url, options)`: Generates an interactive transcript synchronized with video playback.
- `generateTrimmer(target, options)`: Generates an interactive video segment trimmer.

### Important Types
- `Media`: Represents a media entity containing metadata, statistics, and HTML5 sources.
- `MediaContainer`: Wrapper object containing a `media` property.
- `MediaMetadata`: Detailed metadata object for media items.
- `Playlist`: Main playlist object holding metadata and media items.
- `PlaylistItem`: Structured item in a playlists response.
- `PlaylistMetadata`: Interface for playlist metadata (ID, name, description, size, total duration, view position).
- `IframeOptions`: Options interface for embedding player iframe.
- `ThumbnailOptions`: Configuration options for interactive thumbnails (mode, fitMode).
- `TranscriptOptions`: Configuration interface for interactive transcripts (wordsContainer, iframePlayer, autoScroll).
- `TrimmerOptions`: Configuration interface for the video segment trimmer.
- `SortingParams`: Common sorting parameters for API requests.
- `OrderByPlaylist`: Enum defining sorting fields for media within a playlist.
- `OrderByPlaylists`: Enum defining sorting fields for playlists.
- `TypePlayerId`: Enum defining player identifier type (`media`, `permalink`, `streamout`, `live`).
- `CallbackResponse<T>`: Standard callback response structure (`res`, `data`, `errors`).
- `MediaCallbackResponse`: Callback response structure returned by `setResponsiveIframe`.

