import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { COLS, ROWS } from '../logic/types';
import type { Disc } from '../logic/types';
import { openColumns } from '../logic/gameLogic';
import {
  createInitialState,
  gameReducer,
  type GameState,
} from './useGameReducer';

/**
 * Feature: connect-4-game, Property 3: Valid drops alternate the current player
 * Validates: Requirements 3.2, 3.3
 *
 * For any ongoing game (status `playing`), a valid drop that does not end the
 * game sets the current player to the opponent of the player who just moved.
 *
 * The reducer is the single source of truth for whose turn it is, so we test
 * the pure `gameReducer` directly (no React render needed). We reach a variety
 * of ongoing states by replaying random column sequences through the reducer
 * itself, which keeps `currentPlayer` consistent with the reducer's own
 * turn-toggling logic.
 */
describe('Property 3: Valid drops alternate the current player', () => {
  /**
   * Replays a sequence of column drops through the reducer, always dropping for
   * the current player. Stops early if the game ends. Returns the resulting
   * state, which always has `status.kind === 'playing'` unless the game ended.
   */
  function replayThroughReducer(humanDisc: Disc, cols: number[]): GameState {
    let state = createInitialState(humanDisc);
    for (const col of cols) {
      if (state.status.kind !== 'playing') {
        break;
      }
      state = gameReducer(state, {
        type: 'DROP',
        player: state.currentPlayer,
        col,
      });
    }
    return state;
  }

  it('flips currentPlayer to the opponent after a valid non-terminal drop', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Disc>('R', 'Y'),
        // A short-to-moderate prefix of drops keeps the board ongoing with
        // open columns available for the drop under test.
        fc.array(fc.integer({ min: 0, max: COLS - 1 }), {
          minLength: 0,
          maxLength: COLS * ROWS - 1,
        }),
        (humanDisc, prefixCols) => {
          const state = replayThroughReducer(humanDisc, prefixCols);

          // Only exercise ongoing games with at least one open column.
          fc.pre(state.status.kind === 'playing');
          const open = openColumns(state.board);
          fc.pre(open.length > 0);

          const mover = state.currentPlayer;
          const expectedOpponent =
            mover === 'human' ? 'computer' : 'human';

          // Try every open column: any valid non-terminal drop must alternate.
          for (const col of open) {
            const next = gameReducer(state, {
              type: 'DROP',
              player: mover,
              col,
            });

            // A valid drop always changes the board.
            expect(next.board).not.toBe(state.board);

            if (next.status.kind === 'playing') {
              // Non-terminal drop: the turn passes to the opponent.
              expect(next.currentPlayer).toBe(expectedOpponent);
            }
            // Terminal drops (win/draw) are outside this property's scope.
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
