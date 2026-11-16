// path: src/metaplayer/tracks.ts

import {AudioTrack, Media} from "../types/api";
import {MetaPlayerTracks} from "../types/metaPlayer";

/**
 * The tracks a media declares, read from `/ws/media`. Absence is an absent
 * key, never an empty list, so every container is guarded.
 *
 * A subtitle language is taken as given: `fr-cc` — closed captions in French —
 * is a track of its own, not a variant of `fr`. A media carrying a single
 * audio track declares none; one carrying several but no `audio_tracks` falls
 * back on its `language_ids`, the only list there is.
 */
export function readTracks(media: Media | null): MetaPlayerTracks {
    const metadata = media?.metadata;
    if (!metadata) return {subtitles: [], audio: []};

    const subtitles = [...new Set((metadata.subtitles ?? [])
        .map(entry => entry?.subtitle?.language_id)
        .filter((language): language is string => Boolean(language)))];

    let audio: AudioTrack[] = (metadata.audio_tracks ?? [])
        .map(entry => entry?.audio_track)
        .filter((track): track is AudioTrack => Boolean(track?.language_id));
    if (audio.length === 0 && metadata.global?.is_multiple_audio === true) {
        audio = (metadata.language_ids ?? [])
            .map(entry => entry?.language_id)
            .filter((language): language is string => Boolean(language))
            .map(language_id => ({language_id}));
    }
    return {subtitles, audio};
}

/**
 * A language code as a reader says it — `fr` → "français", `fr-cc` →
 * "français (CC)" — in the locale of the player. The code itself when the
 * browser has no name for it.
 */
export function languageName(
    code: string,
    locale: string | undefined,
    suffixes: Record<string, string> = {}
): string {
    const [base, ...rest] = code.split('-');
    let name = base;
    try {
        const names = new Intl.DisplayNames(locale ? [locale] : undefined, {type: 'language'});
        name = names.of(base) ?? base;
    } catch {
        // No Intl.DisplayNames, or a code it refuses: the code stays
    }
    if (name && name !== base) name = name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
    const suffix = rest.join('-');
    if (!suffix) return name;
    return `${name} (${suffixes[suffix.toLowerCase()] ?? suffix.toUpperCase()})`;
}
