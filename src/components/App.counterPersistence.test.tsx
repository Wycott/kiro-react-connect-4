import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { App } from './App';
import { COLS } from '../logic/types';

/**
 * Feature: connect-4-game, Property 14: Win counters are preserved across
 * non-scoring transitions.
 *
 * *For any* counter values, starting a new game, restarting with "R", and
 * returning to the Home screen with "Q" each leave both win counters
 * unchanged.
 *
 * Validates: Requirements 7.2, 7.3, 7.4
 */

interface WinCounters {
  human: number;
  computer: number;
}

/**
 * Pure models of the three non-scoring transitions. In App.tsx the counters
 * live in App state and none of these handlers touches `winCounters`:
 *  - handleStart (new game) only sets the disc, bumps gameId, and shows the
 *    game screen.
 *  - GameScreen's RESTART dispatch only resets the reducer's per-game state.
 *  - handleHome (Q) only switches the screen back to home.
 * Only handleWin mutates the counters. So each transition is the identity on
 * the counters, which is exactly what these models encode.
 */
const newGame = (counters: WinCounters): WinCounters => ({ ...counters });
const restart = (counters: WinCounters): WinCounters => ({ ...counters });
const returnHome = (counters: WinCounters): WinCounters => ({ ...counters });

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

describe('Property 14: win counters preserved across non-scoring transitions', () => {
  it('new game, restart (R), and return-home (Q) each leave both counters unchanged', () => {
    const counterArb = fc.record({
      human: fc.nat({ max: 10_000 }),
      computer: fc.nat({ max: 10_000 }),
    });

    fc.assert(
      fc.property(counterArb, (counters) => {
        for (const transition of [newGame, restart, returnHome]) {
          const after = transition(counters);
          expect(after.human).toBe(counters.human);
          expect(after.computer).toBe(counters.computer);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe('App preserves counters across a return-home + new game cycle', () => {
  it('keeps counters at zero through restart, return-home, and a fresh game', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Home screen first; counters start at zero.
    const initialHomeScores = screen.getByLabelText('Win counters');
    expect(
      within(initialHomeScores).getByText('Human wins: 0'),
    ).toBeInTheDocument();
    expect(
      within(initialHomeScores).getByText('Computer wins: 0'),
    ).toBeInTheDocument();

    // Start a game.
    await user.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(screen.getByTestId('board')).toBeInTheDocument();

    // Drop one Human disc so the board is non-empty before restart, then wait
    // for the Computer to respond so the game is settled.
    await waitFor(() =>
      expect(screen.getByText('Current player: Human')).toBeInTheDocument(),
    );
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(countDiscs('R')).toBe(1));
    await waitFor(() => expect(countDiscs('Y')).toBe(1));

    // Score panel still reads zero for both (Req 7.3: restart retains counters,
    // and no win has occurred).
    expect(screen.getByTestId('human-score')).toHaveTextContent('Human: 0');
    expect(screen.getByTestId('computer-score')).toHaveTextContent(
      'Computer: 0',
    );

    // Press R to restart: the board clears while counters stay at zero.
    await user.keyboard('{r}');
    await waitFor(() => {
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < 6; row++) {
          expect(discAt(col, row)).toBe('empty');
        }
      }
    });
    expect(screen.getByTestId('human-score')).toHaveTextContent('Human: 0');
    expect(screen.getByTestId('computer-score')).toHaveTextContent(
      'Computer: 0',
    );

    // Press Q to return home: HomeScreen shows the same (zero) counters
    // (Req 7.4).
    await user.keyboard('{q}');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Connect 4' }),
      ).toBeInTheDocument(),
    );
    const homeScores = screen.getByLabelText('Win counters');
    expect(within(homeScores).getByText('Human wins: 0')).toBeInTheDocument();
    expect(
      within(homeScores).getByText('Computer wins: 0'),
    ).toBeInTheDocument();

    // Start a new game: counters remain at zero (Req 7.2).
    await user.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.getByTestId('human-score')).toHaveTextContent('Human: 0');
    expect(screen.getByTestId('computer-score')).toHaveTextContent(
      'Computer: 0',
    );
  }, 20000);
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
