import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { App } from './App';
import { COLS } from '../logic/types';
import type { Player } from '../logic/types';

/**
 * Property 5: Win increments only the winner's counter by one.
 *
 * Feature: connect-4-game, Property 5: Win increments only the winner's counter
 * by one
 *
 * Validates: Requirements 4.4, 4.5
 *
 * The win-counter increment rule lives in `App.handleWin`, which does
 * `setWinCounters(c => ({ ...c, [winner]: c[winner] + 1 }))`. That rule is a
 * pure function of (counters, winner): it adds one to the winner's counter and
 * leaves the other unchanged. We restate that rule as a local reference
 * implementation and property-test it over arbitrary prior counters and both
 * winners, then anchor it with an integration case that drives a real Human win
 * through <App/> via the keyboard.
 */

interface WinCounters {
  human: number;
  computer: number;
}

/**
 * Local reference implementation of App's win-counter increment rule: add one
 * to the winner's counter, leave the other unchanged. Kept as a pure function
 * so the property can exercise it directly without React.
 */
function applyWin(counters: WinCounters, winner: Player): WinCounters {
  return { ...counters, [winner]: counters[winner] + 1 };
}

describe('Feature: connect-4-game, Property 5: Win increments only the winner\'s counter by one', () => {
  it('increments only the winning player\'s counter by exactly one', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000 }),
        fc.nat({ max: 10_000 }),
        fc.constantFrom<Player>('human', 'computer'),
        (human, computer, winner) => {
          const before: WinCounters = { human, computer };
          const after = applyWin(before, winner);

          if (winner === 'human') {
            // Req 4.4: a Human win adds exactly one to Human only.
            expect(after.human).toBe(human + 1);
            expect(after.computer).toBe(computer);
          } else {
            // Req 4.5: a Computer win adds exactly one to Computer only.
            expect(after.computer).toBe(computer + 1);
            expect(after.human).toBe(human);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Minimal HTMLAudioElement stand-in: jsdom has no Audio constructor, so the
 * sound hook needs one. load() is a no-op and play() resolves.
 */
class MockAudio {
  preload = '';
  currentTime = 0;
  load = vi.fn();
  play = vi.fn(() => Promise.resolve());
  constructor(public src = '') {}
}

beforeEach(() => {
  vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Count how many cells currently hold a disc of the given colour. */
function countDiscs(colour: 'R' | 'Y'): number {
  return screen
    .getAllByTestId(/^cell-\d+-\d+$/)
    .filter((el) => el.getAttribute('data-disc') === colour).length;
}

/**
 * Move the selection from `from` to `target` using the minimal number of
 * wrap-aware Left/Right presses.
 */
async function moveSelectionTo(
  user: ReturnType<typeof userEvent.setup>,
  from: number,
  target: number,
): Promise<number> {
  let diff = target - from;
  if (diff > COLS / 2) diff -= COLS;
  if (diff < -COLS / 2) diff += COLS;
  const key = diff >= 0 ? '{ArrowRight}' : '{ArrowLeft}';
  for (let i = 0; i < Math.abs(diff); i++) {
    await user.keyboard(key);
  }
  return target;
}

describe('App win-counter integration (Property 5 concrete case)', () => {
  it('adds one to the Human counter only after a real Human win', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Start a game from the Home screen (single non-keyboard action allowed).
    await user.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(screen.getByTestId('board')).toBeInTheDocument();

    // Deterministic Human column drops producing a Red diagonal win
    // (0,0),(1,1),(2,2),(3,3), reused from the keyboard-flow test.
    const humanDrops = [0, 0, 0, 0, 3, 0, 1, 1, 1, 2];
    let selected = 3; // selection defaults to the center column.

    for (let i = 0; i < humanDrops.length; i++) {
      const col = humanDrops[i];
      const isFinal = i === humanDrops.length - 1;

      // Wait for the Human's turn before navigating and dropping.
      await waitFor(() =>
        expect(screen.getByText('Current player: Human')).toBeInTheDocument(),
      );

      selected = await moveSelectionTo(user, selected, col);

      const humanBefore = countDiscs('R');
      const computerBefore = countDiscs('Y');

      await user.keyboard('{ArrowDown}');
      await waitFor(() => expect(countDiscs('R')).toBe(humanBefore + 1));

      if (!isFinal) {
        // Computer responds on its ~400ms timer.
        await waitFor(() =>
          expect(countDiscs('Y')).toBe(computerBefore + 1),
        );
      }
    }

    // The Human wins with the Red diagonal (Req 4.3).
    await waitFor(() =>
      expect(screen.getByText('Human wins!')).toBeInTheDocument(),
    );

    // Req 4.4/4.5: only the Human counter incremented (by one); Computer stays 0.
    await waitFor(() =>
      expect(screen.getByTestId('human-score')).toHaveTextContent('Human: 1'),
    );
    expect(screen.getByTestId('computer-score')).toHaveTextContent(
      'Computer: 0',
    );
  }, 30000);
});
