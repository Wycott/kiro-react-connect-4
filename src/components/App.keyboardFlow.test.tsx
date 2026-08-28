import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { COLS } from '../logic/types';

/**
 * Keyboard-only end-to-end flow test.
 *
 * Drives a full game using the keyboard alone (Left/Right/Down to move + drop,
 * R to restart, Q to return home), asserting selection highlighting, disc
 * drops, turn-taking, a Human win with counter increment, restart clearing the
 * board, and return-to-home retaining counters.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1
 */

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

/** Read the disc occupying a cell: 'R', 'Y', or 'empty'. */
function discAt(col: number, row: number): string {
  const cell = screen.getByTestId(`cell-${col}-${row}`);
  return cell.getAttribute('data-disc') ?? 'empty';
}

/** Count how many cells currently hold a disc of the given colour. */
function countDiscs(colour: 'R' | 'Y'): number {
  return screen
    .getAllByTestId(/^cell-\d+-\d+$/)
    .filter((el) => el.getAttribute('data-disc') === colour).length;
}

/** Assert exactly one column is selected and it is `col`. */
function expectSelectedColumn(col: number): void {
  for (let row = 0; row < 6; row++) {
    expect(
      screen.getByTestId(`cell-${col}-${row}`).getAttribute('data-selected'),
    ).toBe('true');
  }
}

/**
 * Move the selection from `from` to `target` using the minimal number of
 * wrap-aware Left/Right presses, then assert the selection landed correctly.
 * Returns the new current column.
 */
async function moveSelectionTo(
  user: ReturnType<typeof userEvent.setup>,
  from: number,
  target: number,
): Promise<number> {
  // Shortest signed distance on the 7-column ring, preferring rightward on tie.
  let diff = target - from;
  // Normalise into (-COLS/2 .. COLS/2] range using wrap.
  if (diff > COLS / 2) diff -= COLS;
  if (diff < -COLS / 2) diff += COLS;

  const key = diff >= 0 ? '{ArrowRight}' : '{ArrowLeft}';
  for (let i = 0; i < Math.abs(diff); i++) {
    await user.keyboard(key);
  }
  expectSelectedColumn(target);
  return target;
}

describe('App keyboard-only end-to-end flow', () => {
  it('plays a full keyboard-driven game to a Human win, then restarts and returns home', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Home screen is shown first (Req 1.1).
    expect(
      screen.getByRole('heading', { name: 'Connect 4' }),
    ).toBeInTheDocument();

    // The single allowed non-keyboard action: enter the game via Start Game.
    await user.click(screen.getByRole('button', { name: 'Start Game' }));

    // Game screen: board is present and empty at the start (Req 2.4).
    expect(screen.getByTestId('board')).toBeInTheDocument();
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < 6; row++) {
        expect(discAt(col, row)).toBe('empty');
      }
    }

    // Selection defaults to the center column (col 3) and is highlighted (Req 6.7).
    expectSelectedColumn(3);
    let selected = 3;

    // ArrowLeft moves selection one column left (Req 6.1).
    await user.keyboard('{ArrowLeft}');
    expectSelectedColumn(2);

    // ArrowRight moves it back one column right (Req 6.2).
    await user.keyboard('{ArrowRight}');
    expectSelectedColumn(3);

    // Left wraps from the leftmost column to the rightmost (Req 6.1 wrap).
    selected = await moveSelectionTo(user, 3, 0);
    await user.keyboard('{ArrowLeft}');
    expectSelectedColumn(COLS - 1); // wrapped to column 6
    // Right wraps from the rightmost column back to the leftmost (Req 6.2 wrap).
    await user.keyboard('{ArrowRight}');
    expectSelectedColumn(0);
    selected = 0;

    // Deterministic sequence of Human column drops that beats the AI. Each drop
    // is via ArrowDown into the selected column (Req 6.3). After each Human drop
    // (except the final winning one) the Computer responds on its timer, and we
    // wait for its disc to appear before the Human moves again (Req 3.2, 3.3).
    const humanDrops = [0, 0, 0, 0, 3, 0, 1, 1, 1, 2];

    for (let i = 0; i < humanDrops.length; i++) {
      const col = humanDrops[i];
      const isFinal = i === humanDrops.length - 1;

      // Wait until it is the Human's turn before navigating/dropping.
      await waitFor(() =>
        expect(
          screen.getByText('Current player: Human'),
        ).toBeInTheDocument(),
      );

      selected = await moveSelectionTo(user, selected, col);

      const humanBefore = countDiscs('R');
      const computerBefore = countDiscs('Y');

      // Drop the Human disc into the selected column (Req 6.3).
      await user.keyboard('{ArrowDown}');

      // The Human disc count increases by exactly one.
      await waitFor(() => expect(countDiscs('R')).toBe(humanBefore + 1));

      if (!isFinal) {
        // Turn alternates to the Computer, which drops its disc (Req 3.2, 3.3).
        await waitFor(() =>
          expect(countDiscs('Y')).toBe(computerBefore + 1),
        );
      }
    }

    // The winning diagonal (0,0),(1,1),(2,2),(3,3) is all Red (Req 4.3).
    expect(discAt(0, 0)).toBe('R');
    expect(discAt(1, 1)).toBe('R');
    expect(discAt(2, 2)).toBe('R');
    expect(discAt(3, 3)).toBe('R');

    // Status announces the Human win and the Human counter increments (Req 4.4, 4.7).
    await waitFor(() =>
      expect(screen.getByText('Human wins!')).toBeInTheDocument(),
    );
    // The Game screen ScorePanel shows the updated counters.
    await waitFor(() =>
      expect(screen.getByTestId('human-score')).toHaveTextContent('Human: 1'),
    );
    expect(screen.getByTestId('computer-score')).toHaveTextContent(
      'Computer: 0',
    );

    // Press R to restart: the board clears and colours/counters are kept (Req 6.5).
    await user.keyboard('{r}');
    await waitFor(() => {
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < 6; row++) {
          expect(discAt(col, row)).toBe('empty');
        }
      }
    });
    // Selection resets to center and the game is playable again.
    expectSelectedColumn(3);
    // Counters are retained across restart (Req 7.3).
    expect(screen.getByTestId('human-score')).toHaveTextContent('Human: 1');
    expect(screen.getByTestId('computer-score')).toHaveTextContent(
      'Computer: 0',
    );

    // Press Q to return to the Home screen, retaining the counters (Req 6.6, 7.4).
    await user.keyboard('{q}');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Connect 4' }),
      ).toBeInTheDocument(),
    );
    const homeScores = screen.getByLabelText('Win counters');
    expect(within(homeScores).getByText('Human wins: 1')).toBeInTheDocument();
    expect(
      within(homeScores).getByText('Computer wins: 0'),
    ).toBeInTheDocument();
  }, 30000); // Real-timer game with ~9 Computer moves (~400ms each) needs headroom.
});
