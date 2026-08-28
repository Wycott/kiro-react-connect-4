import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { COLS } from './types';
import { dropDisc } from './gameLogic';
import {
  columnCount,
  reachableBoardWithOpenColumnArb,
} from './testGenerators';

/**
 * Feature: connect-4-game, Property 1: Drop lands in the lowest empty row
 * Validates: Requirements 2.2
 *
 * For any reachable board and any open column, dropping a disc:
 *  - places it in the lowest empty row of that column,
 *  - increases that column's disc count by exactly one,
 *  - leaves all other columns unchanged, and
 *  - leaves every cell below the landed cell filled.
 */
describe('Property 1: Drop lands in the lowest empty row', () => {
  it('lands in the lowest empty row and preserves all other columns', () => {
    fc.assert(
      fc.property(
        reachableBoardWithOpenColumnArb(),
        fc.constantFrom<'R' | 'Y'>('R', 'Y'),
        ({ board, col }, disc) => {
          const before = board;
          const expectedRow = columnCount(before, col);

          const result = dropDisc(before, col, disc);

          // The drop into an open column must succeed.
          expect(result.ok).toBe(true);

          // The disc lands in the lowest empty row (== prior fill count).
          expect(result.landedRow).toBe(expectedRow);
          expect(result.board[col][result.landedRow]).toBe(disc);

          // That column's disc count increased by exactly one.
          expect(columnCount(result.board, col)).toBe(expectedRow + 1);

          // Every cell below the landed cell is filled.
          for (let row = 0; row < result.landedRow; row++) {
            expect(result.board[col][row]).not.toBeNull();
          }

          // All other columns are unchanged.
          for (let c = 0; c < COLS; c++) {
            if (c === col) {
              continue;
            }
            expect(result.board[c]).toEqual(before[c]);
          }

          // The input board's targeted column is not mutated.
          expect(columnCount(before, col)).toBe(expectedRow);
        },
      ),
      { numRuns: 200 },
    );
  });
});
