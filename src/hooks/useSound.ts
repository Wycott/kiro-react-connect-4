import { useCallback, useEffect, useRef, useState } from 'react';

/** The set of sound effects the game can play. */
export type SoundName = 'drop' | 'win' | 'lose' | 'draw' | 'invalid';

/** Public surface returned by {@link useSound}. */
export interface UseSound {
  /** Play the named sound effect (no-op when muted or gated off). */
  play(name: SoundName): void;
  /** Whether all sound effects are currently suppressed. */
  muted: boolean;
  /** Flip the muted state. */
  toggleMute(): void;
}

/** Source path per effect. Actual audio assets are optional at runtime. */
const SOUND_SOURCES: Record<SoundName, string> = {
  drop: '/sounds/drop.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
  draw: '/sounds/draw.mp3',
  invalid: '/sounds/invalid.mp3',
};

const SOUND_NAMES: SoundName[] = ['drop', 'win', 'lose', 'draw', 'invalid'];

/**
 * Lightweight preloading sound hook.
 *
 * On mount it constructs and preloads one `HTMLAudioElement` per effect
 * (via `audio.load()`), storing them in a ref so they survive re-renders.
 * `play` rewinds the requested clip to the start and plays it unless muted.
 * The `invalid` effect only plays when `invalidEnabled` is set. Rejections
 * from `HTMLAudioElement.play()` (e.g. autoplay policy) are caught and
 * ignored so gameplay is never blocked.
 */
export function useSound(options?: { invalidEnabled?: boolean }): UseSound {
  const invalidEnabled = options?.invalidEnabled ?? false;
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<Record<SoundName, HTMLAudioElement> | null>(null);

  // Preload one HTMLAudioElement per effect on mount.
  useEffect(() => {
    const elements = {} as Record<SoundName, HTMLAudioElement>;
    for (const name of SOUND_NAMES) {
      const audio = new Audio(SOUND_SOURCES[name]);
      audio.preload = 'auto';
      audio.load();
      elements[name] = audio;
    }
    audioRef.current = elements;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(
    (name: SoundName): void => {
      if (muted) return;
      if (name === 'invalid' && !invalidEnabled) return;

      const elements = audioRef.current;
      if (!elements) return;

      const audio = elements[name];
      if (!audio) return;

      audio.currentTime = 0;
      // play() may reject (e.g. autoplay restrictions); ignore the rejection.
      void Promise.resolve(audio.play()).catch(() => {
        /* ignored: playback failures must not block gameplay */
      });
    },
    [muted, invalidEnabled],
  );

  const toggleMute = useCallback((): void => {
    setMuted((prev) => !prev);
  }, []);

  return { play, muted, toggleMute };
}

