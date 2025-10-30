# Streamlike JS SDK
The Streamlike JS SDK is a TypeScript library designed to interact with the Streamlike platform. It simplifies the integration of mediaParams, playlists, and advanced features like dynamic transcripts and interactive previews into your web applications.

## Features
- Easy integration of responsive video players.
- Fetching mediaParams and playlist data via the Streamlike API.
- Generation of interactive thumbnails with different modes (animation, scrubbing).
- Display of dynamic transcripts synchronized with video playback.
- Fully typed with TypeScript for a better development experience.

## Live Demo
  You can see a live demonstration of the library's features, including playerParams and playlist examples, by opening the files in the `demo` folder.

## Installation
To install the library, use npm:

`npm install js-streamlike-sdk`

## Usage
Here's how to use the main features of the library.
### 1. Embed a video playerParams
Use the `setResponsiveIframe` function to embed a video playerParams in an HTML container.
```html
<!-- Your HTML container -->
<div id="playerParams-container"></div>

<script type="module">
    import { setResponsiveIframe } from 'js-streamlike-sdk';

    const containerId = 'playerParams-container';
    const mediaId = 'your-mediaParams-id';
    const options = {
        playerParams: {
            events: 1, // Enables playerParams events
            autoplay: true,
            active_color: "293c5a"
        },
        baseOptions: {
            debug: 1
        }
    };

    setResponsiveIframe(mediaId,containerId, options)
        .then(response => {
            if (response.res) {
                console.log('Player loaded successfully!', response.data);
            } else {
                console.error('Error loading playerParams:', response.errors);
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

        if (playlistData && playlistData.length>1) {
            mosaicContainer.innerHTML = ''; // Clear the container

            playlistData.forEach(mediaItem => {
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
After loading a playerParams, use `generateWords` to display an interactive transcript. The words are highlighted during playback and are clickable to navigate through the video.

```html

<div id="playerParams-container"></div>
<div id="words-container"></div>```
<div id="playerParams-container"></div>
<div id="words-container"></div>

<script type="module">
    import {setResponsiveIframe, generateWords} from 'js-streamlike-sdk';

    const containerId = 'playerParams-container';
    const mediaId = 'your-mediaParams-id';

    // 1. Load the playerParams
    setResponsiveIframe(mediaId,containerId).then(response => {
        if (response.res && response.data) {
            const media= response.data;
            const wordsUrl = media.metadata.subtitles[0].subtitle.url.words;
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
- `getWs(url, debug = false)` : Fetches the Streamlike API data from a given URL.
- `getWsMedia(param, options)`: Fetches media content from the specified web service (WS) endpoint using
- `getMediaFromId(id, options)`: Retrieves media information based on the provided media ID..
- `getMediaMetadata(params, options)`: Fetches and retrieves media metadata based on provided parameters and options.
- `getWsPlaylist(param, options)`: Fetches the playlistParams for a given playlistParams ID.
- `getMediasFromPlaylist(id, options)`: Retrieves a list of media items from a specified playlist.`
- `getWsPlaylist(params, options)`: Fetches the playlist data using the provided parameters.
- `getWsPlaylists(params, options)`: Fetches playlists for a specific company based on provided parameters.
- `getPlaylists(params, options)`: Retrieves a list of playlists based on the given parameters..
- `getWsRelated(params, options)`: Fetches related medias for a given mediaParams.
- `setResponsiveIframe(id,target, options)`: Embeds a responsive iframeParams playerParams into a target element.
- `generateThumbnail(target, mediaCustomization, options)`: Creates an interactive preview thumbnail.
- `generateWords(url, options)`: Generates and manages an interactive transcript from a data URL.


 
### Important Types
The library exports several types and enums to facilitate its use with TypeScript.
- `Media`: Options for iframeParams playerParams configuration.
- `Playlist`: Represents the main playlist object.
- `PlaylistItem`: Represents a playlist item in a structured format..
...
