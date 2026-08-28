import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { COLS } from '../logic/types';
import {
  createInitialState,
  gameReducer,
  type GameState,
} from './useGameReducer';

// Feature: connect-4-game, Property 12: Selection navigation wraps around the board
// Validates: Requirements 6.1, 6.2
describe('Feature: connect-4-game, Property 12: Selection navigation wraps around the board', () => {
  it('left yields (i + COLS - 1) % COLS and right yields (i + 1) % COLS for all indices', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: COLS - 1 }), (i) => {
        const state: GameState = { ...createInitialState('R'), selectedColumn: i };

        const left = gameReducer(state, { type: 'MOVE_SELECTION', direction: 'left' });
        expect(left.selectedColumn).toBe((i + COLS - 1) % COLS);

        const right = gameReducer(state, { type: 'MOVE_SELECTION', direction: 'right' });
        expect(right.selectedColumn).toBe((i + 1) % COLS);
      }),
      { numRuns: 100 },
    );
  });
});
