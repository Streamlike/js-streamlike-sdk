# Streamlike JS SDK
The Streamlike JS SDK is a TypeScript library designed to interact with the Streamlike platform. It simplifies the integration of mediaParams, playlists, and advanced features like dynamic transcripts and interactive previews into your web applications.

## Features
- Easy integration of responsive video players.
- Fetching mediaParams and playlist data via the Streamlike API.
- Generation of interactive thumbnails with different modes (animation, scrubbing).
- Display of dynamic transcripts synchronized with video playback.
- Playlist player with navigation, configurable information panel and shareable timecoded links.
- Interactive trimmer for video segments.
- Fully typed with TypeScript for a better development experience.

## Live Demo
You can see a live demonstration of the library's features, including playerParams and playlist examples, by opening the files in the `demo` folder.

## Installation
To install the library, use npm:

```bash
npm install js-streamlike-sdk
```

### Use it without npm (CDN)
The SDK has **no runtime dependency**, so the published files are directly usable by a browser, straight from
any npm CDN (jsDelivr, unpkg, esm.sh). No install, no build step.

**As an ES module** — the recommended way:

```html
<div id="my-player"></div>

<script type="module">
    import { generatePlaylistPlayer } from 'https://cdn.jsdelivr.net/npm/js-streamlike-sdk@3.8.0/dist/index.mjs';

    await generatePlaylistPlayer('my-player', { playlistId: 'your-playlist-id' });
</script>
```

**As a classic script** — for pages that cannot use ES modules. The whole SDK is exposed on the `Streamlike`
global:

```html
<div id="my-player"></div>

<script src="https://cdn.jsdelivr.net/npm/js-streamlike-sdk@3.8.0/dist/index.global.js"></script>
<script>
    Streamlike.generatePlaylistPlayer('my-player', { playlistId: 'your-playlist-id' });
</script>
```

unpkg serves the same files: replace the host with `https://unpkg.com/js-streamlike-sdk@3.8.0/…`.

Two recommendations:

- **Always pin an exact version.** With `@latest`, publishing a new release changes the behaviour of pages
  you no longer control. `@3.8.0` is immutable; `@3` follows the minor releases of the 3.x branch.
- Loading from a public CDN adds a third party to your pages. Integrations that cannot accept it should
  install through npm and serve the SDK from their own domain.

The `demo/playlist-player-cdn.html` page shows this integration, loaded from jsDelivr.

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

### 5. Play a whole playlist
Use the `generatePlaylistPlayer` function to play every media of an ordered playlist. It renders a player,
previous / next controls, a clickable list of the medias and an information panel, and moves on to the next
media when the current one ends.

```html
<div id="playlist-player"></div>

<script type="module">
    import { generatePlaylistPlayer } from 'js-streamlike-sdk';

    const controller = await generatePlaylistPlayer('playlist-player', {
        playlistId: 'your-playlist-id',

        // Which information is displayed while a media is playing
        info: {
            title: true,          // default true
            position: true,       // "3 / 12" – default true
            duration: true,       // default true
            currentTime: false,   // live playback position
            playlistName: false,
            description: false,
            releaseDate: false,   // date part of release_date
            releaseTime: false,   // time of day (hh:mm) of release_date
            views: false,
            keywords: false
        },

        // Which information is displayed on each entry of the list
        listItem: {
            thumbnail: true,
            index: true,
            title: true,
            duration: true,       // default true
            releaseDate: false,   // date part of release_date
            releaseTime: false,   // time of day (hh:mm) of release_date
            views: false,
            description: false,
            // Optional: replace the static cover by an interactive preview
            // interactiveThumbnail: { mode: 'animation' }
        },

        listPosition: 'right',   // 'right' | 'left' | 'bottom' | 'top'
        pageSize: 10,            // medias fetched per request
        fullscreen: false,       // fullscreen button, kept across medias
        autoNext: true,          // play the next media at the end of the current one
        hideTokenized: true,     // hide the medias that cannot be played
        loop: false,             // go back to the first media after the last one
        autostart: false,        // start playing right away
        labels: { previous: 'Précédent', next: 'Suivant' },

        onMediaChange: (media, index) => console.log('Now playing', index, media.metadata.global.name),
        onPlaylistEnd: () => console.log('End of the playlist')
    });

    controller.next();                 // navigate programmatically
    controller.playMedia('media-id', 65);
</script>
```

In each entry of the list, `duration`, `releaseDate`, `releaseTime` and `views` are gathered — in that
order — in a `sl-playlist-item-meta` row shown under the title, each with its own class
(`-item-duration`, `-item-date`, `-item-time`, `-item-views`) so they can be styled or reordered one by
one. Dates and counts follow the `locale` option, and the row is left out entirely when none of the four
is enabled.

#### Long playlists
The medias are loaded page by page — `pageSize` per request, 10 by default, which is also the `/ws/playlist`
default. The list then grows on its own:

- playback approaching the end of the loaded medias triggers the next page (`prefetchThreshold`, 2 by
  default: with a page of 10, reaching the 9th media loads the following ten);
- a **load more** button (`{prefix}-list-more`) appears in the list while medias remain, and disappears once
  everything is loaded;
- the counter in the list header shows `20 / 330 medias` while the playlist is partially loaded.

`getTotal()` returns the size of the whole playlist and `loadMore()` fetches the next page by hand, for
custom interfaces. Raise `pageSize` to load everything in one request:

```js
await generatePlaylistPlayer('playlist-player', {
    playlistId: 'your-playlist-id',
    pageSize: 500
});
```

Two things to keep in mind on large playlists. A shared link pointing to a media beyond the first page makes
the player load the whole playlist at once to locate it — one extra request, only when a starting media is
requested. And `listItem.interactiveThumbnail` downloads one storyboard file per entry as soon as it is
rendered: keep it for short playlists, a few dozen entries at most.

#### Only the video, in fullscreen
In fullscreen, a floating button over the media hides the information, the controls and the list, leaving
the video alone on screen — and brings them back. It is transparent until the pointer is over the player,
and a touch or the keyboard shortcut brings it out for three seconds.

```js
await generatePlaylistPlayer('playlist-player', {
    playlistId: 'your-playlist-id',
    fullscreen: true,
    toggleInfoKey: 'i',   // false binds nothing
    labels: { hideInfo: 'Masquer les infos', showInfo: 'Afficher les infos' }
});
```

The button carries `{prefix}-toggle-info`, and the container gains `is-video-only` while the video is alone,
`is-revealed` while the button shows — both restylable. The restricted-access notice stays visible in that
mode: it carries the only way out of a media that cannot be played. `isVideoOnly()` and
`toggleVideoOnly(force?)` drive the same thing from the controller.

Two limits worth knowing. On a touch screen there is no hover, so the button is its own target: a first tap
brings it out, the next one acts — the media sits in a cross-origin iframe, which swallows every tap meant
for the page. And the shortcut only answers while the focus is in the page: a click inside the player sends
the keystrokes to its iframe, out of reach.

#### Medias with restricted access
Some medias cannot be played from a plain player URL. The player sorts them out:

| Media | Behaviour |
| --- | --- |
| Tokenized, no password | Hidden by default (`hideTokenized`), otherwise its cover replaces the player, with the message and the *next* button. Played anyway when the URL carries a valid `playerParams.sltoken`. |
| Tokenized, password protected | Played normally, the player prompts for the password. Never hidden. |
| Secured by IP or referrer (`is_secured`) | Played normally. The message and the *next* button appear only if playback fails. |

For those restricted medias, the player URL is probed with a `HEAD` request before deciding: `/play` answers
a 404 when the access does not pass, and allows cross-origin reads, so the outcome is known rather than
guessed. The probe runs alongside the player, so a media that plays is never delayed, and it is skipped
entirely for ordinary medias.

The notice is shown only when the access really fails, and only that 404 counts as a failure: if the probe
cannot conclude — network error, CORS rejection, 5xx — a media secured by IP or referrer keeps its player
and no notice. It is never displayed on sight either, so a tokenized media that plays thanks to a valid
`playerParams.sltoken` never flashes it. The one case where an unconcluded probe still shows it is a media
tokenized without password: no plain player URL can play it, so its cover stays in place.

With `hideTokenized: true` (the default), the hidden medias are removed from the list **and** from the
counts: the size announced by the API is corrected by the number of medias dropped, so the counter, the
position and the paging stay consistent.

```js
await generatePlaylistPlayer('playlist-player', {
    playlistId: 'your-playlist-id',
    hideTokenized: false,
    labels: { secured: 'Média sécurisé', next: 'Vidéo suivante' }
});
```

The message sits in `{prefix}-notice-message` and the button in `{prefix}-notice-next`, inside a
`{prefix}-notice` block. The concerned list entries carry `is-locked` or `is-secured`, and the cover shown
in place of the player is a `{prefix}-player-cover`.

#### Start on a given media at a given timecode (sharing)
Pass `startMediaId` and `startTimecode` (seconds or `hh:mm:ss.mmm`) to open the player on a specific moment:

```js
await generatePlaylistPlayer('playlist-player', {
    playlistId: 'your-playlist-id',
    startMediaId: 'your-media-id',
    startTimecode: '00:01:05',
    autostart: true
});
```

With `shareParams: { enabled: true }`, the player reads those values from the page URL
(`?media=<media_id>&t=<seconds>` by default, the parameter names are configurable). The controller builds
such a link for the media and position currently playing:

```js
const controller = await generatePlaylistPlayer('playlist-player', {
    playlistId: 'your-playlist-id',
    shareParams: { enabled: true }
});

controller.getShareUrl();                 // current media, current position
controller.getShareUrl({ timecode: 0 });  // current media, from the beginning
```

#### Staying in fullscreen from one media to the next
The fullscreen button of the embedded player acts on the iframe, whose document is destroyed every time
another media is loaded — so the browser leaves fullscreen at each change, and the reader has to ask for it
again. `fullscreen: true` adds a button of its own, which puts the **container** in fullscreen instead:

```js
await generatePlaylistPlayer('playlist-player', {
    playlistId: 'your-playlist-id',
    fullscreen: true,
    labels: { fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran' }
});
```

The container survives the swap of the iframe, so playback goes on across a media change, whether it comes
from *auto next*, the controls or a click in the list — all of which stay on screen and are styled for it
(`{prefix}:fullscreen`, dark background, the media taking the space left).

The option also hides the player's own fullscreen button (`playerParams.fs` and `playerParams.fullscreen`
are forced to `false`): leaving it in place would offer a second path, the one that drops out at every
change. That fullscreen cannot be caught and transferred from the outside — the click happens in a
cross-origin iframe, so the page holds no user activation and the browser refuses the request.

It is left out on iPhone, where Safari can only put a native video element in fullscreen; there the player
keeps its own button. The controller exposes `isFullscreen()` and `toggleFullscreen(force?)` for a custom
interface — entering must be called from a user gesture, and the promise resolves to the state actually
reached, so a refusal reads as `false`.

#### Styling
Every generated element carries a class prefixed with `classPrefix` (`sl-playlist` by default), so the whole
UI can be restyled from your own CSS:

| Class | Element |
| --- | --- |
| `sl-playlist` / `sl-playlist--list-right` | Root container and list placement modifier |
| `sl-playlist-main` / `sl-playlist-player` | Player column and iframe wrapper |
| `sl-playlist-controls` / `sl-playlist-button` / `sl-playlist-button-prev` / `sl-playlist-button-next` / `-button-fullscreen` | Navigation controls |
| `sl-playlist-info` | Information panel |
| `sl-playlist-info-title` / `-playlist` / `-meta` / `-position` / `-duration` / `-currenttime` / `-date` / `-time` / `-views` / `-description` / `-keywords` / `-keyword` | Information items |
| `sl-playlist-list` / `-list-header` / `-list-title` / `-list-count` / `-items` / `-list-more` | Playlist list and its "load more" button |
| `sl-playlist-notice` / `-notice-message` / `-notice-next` / `sl-playlist-player-cover` | Restricted access block and stand-in cover |
| `sl-playlist-item` (+ `is-active`, `is-locked`, `is-secured`) / `-item-button` / `-item-index` / `-item-thumbnail` / `-item-title` / `-item-meta` / `-item-duration` / `-item-date` / `-item-time` / `-item-views` / `-item-description` | List entries |

A default stylesheet is injected once per prefix, using single-class selectors so your own rules override it
easily. Set `injectStyles: false` to start from a blank slate. Descriptions coming from the API are rendered
as plain text (HTML markup is stripped).

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
- `embedPlayerIframe(container, src, ratio, params, debug)`: Low-level helper creating a responsive player iframe from a ready-made player URL.
- `generateThumbnail(target, mediaCustomization, options)`: Generates an interactive preview thumbnail.
- `generateWords(url, options)`: Generates an interactive transcript synchronized with video playback.
- `generateTrimmer(target, options)`: Generates an interactive video segment trimmer.
- `generatePlaylistPlayer(target, options)`: Generates a playlist player with navigation, information panel and shareable timecoded links. Returns a `PlaylistPlayerController` (`play`, `pause`, `seek`, `next`, `previous`, `playIndex`, `playMedia`, `loadMore`, `getCurrentIndex`, `getCurrentMedia`, `getMedias`, `getTotal`, `getCurrentTime`, `isFullscreen`, `toggleFullscreen`, `getShareUrl`, `destroy`).

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
- `PlaylistPlayerOptions`: Configuration interface for the playlist player (source, playback, display and share options).
- `PlaylistPlayerInfoOptions`: Toggles for the information displayed during playback.
- `PlaylistPlayerListItemOptions`: Toggles for the information displayed on each list entry.
- `PlaylistPlayerLabels`: Texts used by the playlist player (localization).
- `PlaylistPlayerController`: Controller returned by `generatePlaylistPlayer`.
- `PlaylistListPosition`: Enum defining where the list is rendered (`right`, `left`, `bottom`, `top`).
- `IframeParams`: Settings applied to the generated `<iframe>` (permissions, load callback).
- `SortingParams`: Common sorting parameters for API requests.
- `OrderByPlaylist`: Enum defining sorting fields for media within a playlist.
- `OrderByPlaylists`: Enum defining sorting fields for playlists.
- `TypePlayerId`: Enum defining player identifier type (`media`, `permalink`, `streamout`, `live`).
- `CallbackResponse<T>`: Standard callback response structure (`res`, `data`, `errors`).
- `MediaCallbackResponse`: Callback response structure returned by `setResponsiveIframe`.

