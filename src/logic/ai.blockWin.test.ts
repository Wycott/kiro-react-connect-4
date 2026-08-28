import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { COLS, ROWS } from './types';
import type { Board, Coord, Disc } from './types';
import { dropDisc, checkWinAt, openColumns } from './gameLogic';
import { reachableBoardArb } from './testGenerators';
import { chooseComputerColumn } from './ai';

/**
 * Feature: connect-4-game, Property 9: The AI blocks an immediate Human win
 * Validates: Requirements 5.2
 *
 * For any board where the Computer has no immediate win but the Human has
 * exactly one immediate winning threat, `chooseComputerColumn` returns the
 * column that blocks that Human win.
 *
 * Construction: start from a reachable board, then deliberately plant a
 * horizontal three-in-a-row for the Human across a four-column window, leaving
 * one open winning column at a target row. Gravity is respected by rebuilding
 * every window column from the bottom up: rows below the target row are filled
 * with a deterministic filler and rows above are cleared, so the winning
 * column's target cell is the lowest empty cell (the Human's disc would land
 * exactly there and complete four-in-a-row).
 *
 * Because the base board is arbitrary, the constructed board is not guaranteed
 * to satisfy the property's preconditions (the Computer might have an unrelated
 * immediate win, or a second Human threat might exist). Rather than force those
 * conditions, we verify them explicitly and use `fc.pre` to discard any
 * fixture that fails, so every asserted case genuinely has no Computer win and
 * exactly one Human threat.
 */

/**
 * Returns the set of open columns whose drop of `disc` is an immediate win.
 */
function winningColumns(board: Board, disc: Disc): number[] {
  const cols: number[] = [];
  for (const col of openColumns(board)) {
    const drop = dropDisc(board, col, disc);
    if (drop.ok && checkWinAt(drop.board, col, drop.landedRow) !== null) {
      cols.push(col);
    }
  }
  return cols;
}

/**
 * Builds a board with a horizontal three-in-a-row for `humanDisc` planted at
 * `row` across the window `[startCol, startCol + 3]`, leaving one end column
 * (the win column) open at `row`. Each window column is rebuilt from the bottom
 * so gravity holds: rows below `row` are filled with a filler colour and rows
 * at/above `row` follow the plant/gap. Returns the board and the win column, or
 * null when the window does not fit on the board.
 */
function buildBlockBoard(
  base: Board,
  humanDisc: Disc,
  computerDisc: Disc,
  startCol: number,
  row: number,
  winOnRight: boolean,
): { board: Board; winCol: number } | null {
  const endCol = startCol + 3;
  if (startCol < 0 || endCol >= COLS) {
    return null;
  }
  if (row < 0 || row >= ROWS) {
    return null;
  }

  // Deep copy so shared base fixtures are never mutated.
  const board: Board = base.map((column) => column.slice());

  const windowCols = [startCol, startCol + 1, startCol + 2, startCol + 3];
  const winCol = winOnRight ? endCol : startCol;
  const plantCols = windowCols.filter((c) => c !== winCol);

  // Rebuild each window column deterministically so gravity is respected:
  // fill rows [0, row) with alternating filler, place the plant/gap at `row`,
  // and clear everything above `row`.
  for (const c of windowCols) {
    for (let r = 0; r < ROWS; r++) {
      if (r < row) {
        board[c][r] = (c + r) % 2 === 0 ? humanDisc : computerDisc;
      } else {
        board[c][r] = null;
      }
    }
  }

  // Plant the three human discs at the target row, leaving winCol[row] empty.
  for (const c of plantCols) {
    board[c][row] = humanDisc;
  }

  return { board, winCol };
}

describe('Property 9: The AI blocks an immediate Human win', () => {
  it('chooses the column that blocks the Human win when no Computer win exists', () => {
    fc.assert(
      fc.property(
        reachableBoardArb(),
        fc.constantFrom<Disc>('R', 'Y'),
        fc.integer({ min: 0, max: COLS - 4 }),
        fc.integer({ min: 0, max: ROWS - 1 }),
        fc.boolean(),
        (reachable, humanDisc, startCol, row, winOnRight) => {
          const computerDisc: Disc = humanDisc === 'R' ? 'Y' : 'R';

          const built = buildBlockBoard(
            reachable.board,
            humanDisc,
            computerDisc,
            startCol,
            row,
            winOnRight,
          );
          if (built === null) {
            return;
          }
          const { board, winCol } = built;

          // Precondition: the Human has EXACTLY ONE immediate winning threat,
          // and it is the win column we planted.
          const humanWins = winningColumns(board, humanDisc);
          fc.pre(humanWins.length === 1 && humanWins[0] === winCol);

          // Precondition: the Computer has NO immediate win in any open column.
          const computerWins = winningColumns(board, computerDisc);
          fc.pre(computerWins.length === 0);

          // Precondition sanity: the blocking column is open and a Human drop
          // there genuinely wins.
          expect(openColumns(board)).toContain(winCol);
          const humanDrop = dropDisc(board, winCol, humanDisc);
          expect(humanDrop.ok).toBe(true);
          const winCells: Coord[] | null = checkWinAt(
            humanDrop.board,
            winCol,
            humanDrop.landedRow,
          );
          expect(winCells).not.toBeNull();

          // The property under test: the AI blocks by choosing the column that
          // would otherwise let the Human win.
          const chosen = chooseComputerColumn(board, computerDisc, humanDisc);
          expect(chosen).toBe(winCol);
        },
      ),
      { numRuns: 200 },
    );
  });
});
