import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { COLS, ROWS } from '../logic/types';
import type { Disc } from '../logic/types';
import { gameReducer } from './useGameReducer';
import type { GameState } from './useGameReducer';
import { reachableBoardArb } from '../logic/testGenerators';

/**
 * Feature: connect-4-game, Property 13: Restart clears the board and preserves
 * colours and counters
 * Validates: Requirements 6.5
 *
 * For any in-progress or finished game state, dispatching RESTART produces an
 * all-`null` board (7x6) with the Human set as current player, while the Human
 * and Computer disc colours are preserved (unchanged from the input state).
 * Win counters live in `App`, so they are inherently preserved by the reducer.
 */

/**
 * Arbitrary GameStatus covering playing, win, and draw variants.
 */
const statusArb: fc.Arbitrary<GameState['status']> = fc.oneof(
  fc.constant<GameState['status']>({ kind: 'playing' }),
  fc.record({
    kind: fc.constant<'win'>('win'),
    winner: fc.constantFrom<'human' | 'computer'>('human', 'computer'),
    disc: fc.constantFrom<Disc>('R', 'Y'),
    cells: fc.array(
      fc.record({
        col: fc.integer({ min: 0, max: COLS - 1 }),
        row: fc.integer({ min: 0, max: ROWS - 1 }),
      }),
      { minLength: 4, maxLength: 4 },
    ),
  }),
  fc.constant<GameState['status']>({ kind: 'draw' }),
);

/**
 * Builds an arbitrary, varied GameState: random reachable board fill, current
 * player, status, selected column, debug flag, and human/computer disc colours.
 */
const gameStateArb: fc.Arbitrary<GameState> = fc
  .record({
    reachable: reachableBoardArb(),
    humanDisc: fc.constantFrom<Disc>('R', 'Y'),
    currentPlayer: fc.constantFrom<'human' | 'computer'>('human', 'computer'),
    status: statusArb,
    selectedColumn: fc.integer({ min: 0, max: COLS - 1 }),
    debug: fc.boolean(),
  })
  .map(({ reachable, humanDisc, currentPlayer, status, selectedColumn, debug }) => {
    const computerDisc: Disc = humanDisc === 'R' ? 'Y' : 'R';
    return {
      board: reachable.board,
      humanDisc,
      computerDisc,
      currentPlayer,
      status,
      selectedColumn,
      debug,
    } satisfies GameState;
  });

describe('Property 13: Restart clears the board and preserves colours and counters', () => {
  it('yields an all-null board with Human current, preserving disc colours', () => {
    fc.assert(
      fc.property(gameStateArb, (state) => {
        const next = gameReducer(state, { type: 'RESTART' });

        // Board is exactly 7 columns by 6 rows, entirely null.
        expect(next.board).toHaveLength(COLS);
        for (let col = 0; col < COLS; col++) {
          expect(next.board[col]).toHaveLength(ROWS);
          for (let row = 0; row < ROWS; row++) {
            expect(next.board[col][row]).toBeNull();
          }
        }

        // Human is the current player after a restart.
        expect(next.currentPlayer).toBe('human');

        // Disc colours are preserved (unchanged from the input state).
        expect(next.humanDisc).toBe(state.humanDisc);
        expect(next.computerDisc).toBe(state.computerDisc);

        // Game is back to a playing state.
        expect(next.status.kind).toBe('playing');
      }),
      { numRuns: 200 },
    );
  });
});
