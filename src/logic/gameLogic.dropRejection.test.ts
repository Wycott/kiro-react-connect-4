import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createEmptyBoard, dropDisc, isColumnOpen } from './gameLogic';
import { COLS, ROWS } from './types';
import type { Board, Disc } from './types';

/**
 * Deep-clones a board so tests can compare contents independent of references.
 */
function cloneBoard(board: Board): Board {
  return board.map((column) => column.slice());
}

/**
 * Builds a reachable board by replaying a sequence of drops (each drop targets
 * a column; full columns are skipped), then completely fills the chosen
 * `fullCol` so it is guaranteed to have no empty cell.
 */
function buildBoardWithFullColumn(
  drops: ReadonlyArray<{ col: number; disc: Disc }>,
  fullCol: number,
): Board {
  let board = createEmptyBoard();

  for (const { col, disc } of drops) {
    const result = dropDisc(board, col, disc);
    if (result.ok) {
      board = result.board;
    }
  }

  // Force the chosen column to be completely full with alternating discs.
  for (let row = 0; row < ROWS; row++) {
    if (board[fullCol][row] === null) {
      board[fullCol][row] = row % 2 === 0 ? 'R' : 'Y';
    }
  }

  return board;
}

describe('Feature: connect-4-game, Property 2: Dropping into a full column is rejected without change', () => {
  it('rejects drops into a completely full column and leaves the board contents unchanged', () => {
    const discArb: fc.Arbitrary<Disc> = fc.constantFrom<Disc>('R', 'Y');
    const dropArb = fc.record({
      col: fc.integer({ min: 0, max: COLS - 1 }),
      disc: discArb,
    });

    fc.assert(
      fc.property(
        fc.array(dropArb, { minLength: 0, maxLength: 60 }),
        fc.integer({ min: 0, max: COLS - 1 }),
        discArb,
        (drops, fullCol, dropDisc_disc) => {
          const board = buildBoardWithFullColumn(drops, fullCol);

          // Precondition: the chosen column really is full.
          expect(isColumnOpen(board, fullCol)).toBe(false);

          const before = cloneBoard(board);
          const result = dropDisc(board, fullCol, dropDisc_disc);

          // The drop must be rejected.
          expect(result.ok).toBe(false);
          expect(result.landedRow).toBe(-1);

          // The board contents must be unchanged.
          expect(result.board).toEqual(before);
          expect(board).toEqual(before);
        },
      ),
      { numRuns: 200 },
    );
  });
});
