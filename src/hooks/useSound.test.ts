import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSound, type SoundName } from './useSound';

/**
 * Mock replacement for HTMLAudioElement. Records the src it was constructed
 * with and exposes spied load()/play() plus mutable currentTime/preload so
 * tests can assert preloading, playback, and rewinding behavior.
 */
class MockAudio {
  static instances: MockAudio[] = [];

  src: string;
  preload = '';
  currentTime = 0;
  load = vi.fn();
  // play() resolves by default; individual tests can override per instance.
  play = vi.fn(() => Promise.resolve());

  constructor(src?: string) {
    this.src = src ?? '';
    MockAudio.instances.push(this);
  }

  /** Find the constructed element whose src matches the given effect name. */
  static forName(name: SoundName): MockAudio {
    const match = MockAudio.instances.find((a) => a.src.includes(`${name}.`));
    if (!match) throw new Error(`No mock Audio constructed for "${name}"`);
    return match;
  }
}

const ALL_NAMES: SoundName[] = ['drop', 'win', 'lose', 'draw', 'invalid'];

beforeEach(() => {
  MockAudio.instances = [];
  vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useSound', () => {
  // Req 9.1: preload the sound effects on init.
  it('constructs and preloads one Audio element per effect on mount', () => {
    renderHook(() => useSound());

    // Exactly one element per effect.
    expect(MockAudio.instances).toHaveLength(ALL_NAMES.length);

    for (const name of ALL_NAMES) {
      const audio = MockAudio.forName(name);
      expect(audio.preload).toBe('auto');
      expect(audio.load).toHaveBeenCalledTimes(1);
    }
  });

  // Reqs 9.2, 9.3, 9.4: drop/win/draw playback rewinds and plays.
  it.each<SoundName>(['drop', 'win', 'draw'])(
    'plays the "%s" effect, rewinding currentTime to 0',
    (name) => {
      const { result } = renderHook(() => useSound());
      const audio = MockAudio.forName(name);
      audio.currentTime = 5; // simulate a previously played clip

      act(() => {
        result.current.play(name);
      });

      expect(audio.currentTime).toBe(0);
      expect(audio.play).toHaveBeenCalledTimes(1);
    },
  );

  it('does not play unrelated effects when one is requested', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play('drop');
    });

    expect(MockAudio.forName('drop').play).toHaveBeenCalledTimes(1);
    expect(MockAudio.forName('win').play).not.toHaveBeenCalled();
    expect(MockAudio.forName('draw').play).not.toHaveBeenCalled();
  });

  // Req 9.6: mute suppresses all sound effects.
  it('suppresses playback for all effects once muted', () => {
    const { result } = renderHook(() => useSound({ invalidEnabled: true }));

    expect(result.current.muted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.muted).toBe(true);

    act(() => {
      result.current.play('drop');
      result.current.play('win');
      result.current.play('draw');
      result.current.play('invalid');
    });

    for (const name of ALL_NAMES) {
      expect(MockAudio.forName(name).play).not.toHaveBeenCalled();
    }
  });

  it('resumes playback after unmuting', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.toggleMute(); // mute
    });
    act(() => {
      result.current.toggleMute(); // unmute
    });
    expect(result.current.muted).toBe(false);

    act(() => {
      result.current.play('drop');
    });
    expect(MockAudio.forName('drop').play).toHaveBeenCalledTimes(1);
  });

  // Req 9.5: invalid effect is gated by invalidEnabled.
  it('does not play the "invalid" effect when invalidEnabled is false', () => {
    const { result } = renderHook(() => useSound({ invalidEnabled: false }));

    act(() => {
      result.current.play('invalid');
    });

    expect(MockAudio.forName('invalid').play).not.toHaveBeenCalled();
  });

  it('does not play the "invalid" effect by default (no options)', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play('invalid');
    });

    expect(MockAudio.forName('invalid').play).not.toHaveBeenCalled();
  });

  it('plays the "invalid" effect when invalidEnabled is true', () => {
    const { result } = renderHook(() => useSound({ invalidEnabled: true }));
    const audio = MockAudio.forName('invalid');
    audio.currentTime = 3;

    act(() => {
      result.current.play('invalid');
    });

    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  // Robustness: a rejected play() promise must not throw or bubble up.
  it('does not throw when play() rejects', async () => {
    const { result } = renderHook(() => useSound());
    const audio = MockAudio.forName('drop');
    audio.play = vi.fn(() => Promise.reject(new Error('autoplay blocked')));

    expect(() =>
      act(() => {
        result.current.play('drop');
      }),
    ).not.toThrow();

    // Let the rejected promise settle so the internal catch runs.
    await act(async () => {
      await Promise.resolve();
    });

    expect(audio.play).toHaveBeenCalledTimes(1);
  });
});

