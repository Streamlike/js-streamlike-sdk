# Streamlike JS SDK
The Streamlike JS SDK is a TypeScript library designed to interact with the Streamlike platform. It simplifies the integration of media, playlists, and advanced features like dynamic transcripts and interactive previews into your web applications.

## Features
- Easy integration of responsive video players.
- Fetching media and playlist data via the Streamlike API.
- Generation of interactive thumbnails with different modes (animation, scrubbing).
- Display of dynamic transcripts synchronized with video playback.
- Fully typed with TypeScript for a better development experience.

## Live Demo
  You can see a live demonstration of the library's features, including player and playlist examples, by opening the files in the `demo` folder.

## Installation
To install the library, use npm:

`npm install js-streamlike-sdk`

## Usage
Here's how to use the main features of the library.
### 1. Embed a video player
Use the `setResponsiveIframe` function to embed a video player in an HTML container.
```html
<!-- Your HTML container -->
<div id="player-container"></div>

<script type="module">
    import { setResponsiveIframe } from 'js-streamlike-sdk';

    const containerId = 'player-container';
    const mediaId = 'your-media-id';

    const options = {
        debug: true,
        player: {
            events: 1, // Enables player events
            autoplay: true,
            active_color: "293c5a"
        }
    };

    setResponsiveIframe(containerId, mediaId, options)
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
Fetch the media from a playlist with `getMedias` and display them. This example creates a mosaic of thumbnails.
```html
<div id="playlist-mosaic-container"></div>

<script type="module">
    import { getMedias, generateThumbnail } from 'js-streamlike-sdk';

    const mosaicContainer = document.getElementById('playlist-mosaic-container');
    const playlistId = 'your-playlist-id';

    async function loadPlaylist(id) {
        const playlistData = await getMedias(id, { debug: true });

        if (playlistData && playlistData.playlist.medias) {
            mosaicContainer.innerHTML = ''; // Clear the container

            playlistData.playlist.medias.forEach(mediaItem => {
                const media = mediaItem.media;
                const item = document.createElement('div');
                item.className = 'mosaic-item';
                
                const thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';

                // Generate the interactive thumbnail
                generateThumbnail(thumbnail, media.metadata.customization, { mode: 'animation' });
                
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
<div id="words-container"></div>```
<div id="player-container"></div>
<div id="words-container"></div>

<script type="module">
    import { setResponsiveIframe, generateWords } from 'js-streamlike-sdk';

    const containerId = 'player-container';
    const mediaId = 'your-media-id';

    // 1. Load the player
    setResponsiveIframe(containerId, mediaId).then(response => {
        if (response.res && response.data?.metadata?.subtitles) {
            const wordsUrl = response.data.metadata.subtitles[0].subtitle.url.words;
            const playerIframe = document.getElementById(containerId).querySelector('iframe');

            if (wordsUrl && playerIframe) {
                // 2. Generate the transcript
                generateWords(wordsUrl, {
                    wordsContainer: 'words-container',
                    iframePlayer: playerIframe,
                    debug: true
                });
            }
        }
    });
</script>
```
## API Reference
### Main Functions
- `setResponsiveIframe(target, id, options)`: Embeds a responsive iframe player into a target element.
- `getMedias(id, options)`: Fetches data for a playlist, view, or company.
- `getMetadata(mediaId, options)`: Fetches metadata for a specific media.
- `getStatistics(mediaId, options)`: Fetches statistics for a media.
- `getRelated(mediaId, options)`: Fetches related media for a given media.
- `generateThumbnail(target, mediaCustomization, options)`: Creates an interactive preview thumbnail.
- `generateWords(url, options)`: Generates and manages an interactive transcript from a data URL.
 
### Important Types
The library exports several types and enums to facilitate its use with TypeScript.
- `IframeOptions`: Options for iframe player configuration.
- `GetMediasOptions`: Options for fetching media lists.
- `InteractivePreviewOptions`: Options for generating thumbnails.
- `TranscriptOptions`: Options for generating transcripts.
- `TypeId`: Enum for media identifier types (med_id, permalink, etc.).
- `PreviewMode`: Enum for preview modes (scrubbing, animation, fixed).