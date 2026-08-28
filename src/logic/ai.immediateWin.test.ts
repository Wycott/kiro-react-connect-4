import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { COLS, ROWS } from './types';
import type { Board, Disc } from './types';
import { dropDisc, checkWinAt, openColumns } from './gameLogic';
import { reachableBoardArb } from './testGenerators';
import { chooseComputerColumn } from './ai';

/**
 * Feature: connect-4-game, Property 8: The AI takes an immediate win when one exists
 * Validates: Requirements 5.1
 *
 * For any board where the Computer is to move and at least one open column
 * produces an immediate Computer win, `chooseComputerColumn` returns a column
 * whose drop wins immediately.
 *
 * Construction: start from a reachable board, then deliberately plant a
 * horizontal three-in-a-row for the Computer that has an open winning column
 * on one end where the winning disc would land in the same row as the plant.
 * We rebuild the four cells of the target row across a window so gravity is
 * respected (every cell beneath the plant is filled with the opponent disc),
 * guaranteeing the winning column is open and that dropping there wins.
 */

/**
 * Fills columns [startCol, startCol+3] up to (but not including) `row` with a
 * non-winning filler pattern, then plants three `computerDisc` discs at `row`
 * in the three columns nearest `startCol`, leaving the fourth (winCol) open at
 * `row`. Returns the constructed board and the winning column, or null if the
 * window cannot be laid out on the board.
 */
function buildImmediateWinBoard(
  base: Board,
  computerDisc: Disc,
  humanDisc: Disc,
  startCol: number,
  row: number,
  winOnRight: boolean,
): { board: Board; winCol: number } | null {
  const endCol = startCol + 3;
  if (endCol >= COLS || startCol < 0) {
    return null;
  }
  if (row < 0 || row >= ROWS) {
    return null;
  }

  // Deep copy the base board so we never mutate shared fixtures.
  const board: Board = base.map((column) => column.slice());

  const windowCols = [startCol, startCol + 1, startCol + 2, startCol + 3];
  const winCol = winOnRight ? endCol : startCol;
  const plantCols = windowCols.filter((c) => c !== winCol);

  // Rebuild each window column deterministically so gravity is respected:
  // fill rows [0, row) with filler discs, then place the plant/gap at `row`,
  // and clear everything above `row`.
  for (const c of windowCols) {
    for (let r = 0; r < ROWS; r++) {
      if (r < row) {
        // Alternate filler colours to avoid creating an accidental win below.
        board[c][r] = (c + r) % 2 === 0 ? humanDisc : computerDisc;
      } else {
        board[c][r] = null;
      }
    }
  }

  // Plant the three computer discs at the target row.
  for (const c of plantCols) {
    board[c][row] = computerDisc;
  }
  // Leave winCol[row] empty so the computer can drop there.

  return { board, winCol };
}

describe('Property 8: The AI takes an immediate win when one exists', () => {
  it('chooses a column whose drop wins immediately for the Computer', () => {
    fc.assert(
      fc.property(
        reachableBoardArb(),
        fc.constantFrom<Disc>('R', 'Y'),
        fc.integer({ min: 0, max: COLS - 4 }),
        fc.integer({ min: 0, max: ROWS - 1 }),
        fc.boolean(),
        (reachable, computerDisc, startCol, row, winOnRight) => {
          const humanDisc: Disc = computerDisc === 'R' ? 'Y' : 'R';

          const built = buildImmediateWinBoard(
            reachable.board,
            computerDisc,
            humanDisc,
            startCol,
            row,
            winOnRight,
          );
          // The window always fits given the generator bounds, but guard anyway.
          if (built === null) {
            return;
          }
          const { board, winCol } = built;

          // Precondition sanity: the winning column is open, and dropping the
          // computer disc there is genuinely an immediate win.
          expect(openColumns(board)).toContain(winCol);
          const winDrop = dropDisc(board, winCol, computerDisc);
          expect(winDrop.ok).toBe(true);
          expect(
            checkWinAt(winDrop.board, winCol, winDrop.landedRow),
          ).not.toBeNull();

          // The property under test: the AI's chosen column produces an
          // immediate Computer win.
          const chosen = chooseComputerColumn(board, computerDisc, humanDisc);
          expect(openColumns(board)).toContain(chosen);

          const chosenDrop = dropDisc(board, chosen, computerDisc);
          expect(chosenDrop.ok).toBe(true);
          expect(
            checkWinAt(chosenDrop.board, chosen, chosenDrop.landedRow),
          ).not.toBeNull();
        },
      ),
      { numRuns: 200 },
    );
  });
});
