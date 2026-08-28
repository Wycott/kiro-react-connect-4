import { COLS, ROWS, CONNECT } from './types';
import type { Board, ChainResult, Coord, Disc, DropResult } from './types';

/**
 * Shared direction vectors `[colDelta, rowDelta]` used by the win- and
 * chain-scanning routines. Each vector represents one of the four axes along
 * which a Connect 4 chain can form.
 */
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], // horizontal (col+)
  [0, 1], // vertical (row+)
  [1, 1], // diagonal up-right
  [1, -1], // diagonal down-right
];

/**
 * Creates a fresh `COLS` x `ROWS` board filled with `null` cells.
 * Layout is `board[col][row]`, with row 0 as the lowest row.
 */
export function createEmptyBoard(): Board {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => null),
  );
}

/**
 * Returns true when `col` is a valid column index that contains at least one
 * empty cell (i.e. its top row is `null`).
 */
export function isColumnOpen(board: Board, col: number): boolean {
  if (col < 0 || col >= COLS) {
    return false;
  }
  return board[col][ROWS - 1] === null;
}

/**
 * Returns the list of column indices that contain at least one empty cell.
 */
export function openColumns(board: Board): number[] {
  const result: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (isColumnOpen(board, col)) {
      result.push(col);
    }
  }
  return result;
}

/**
 * Places `disc` in the lowest empty row of `col` on a copy of `board`.
 * The input board is never mutated. When the column is out of range or full,
 * returns `{ ok: false, board, landedRow: -1 }` with the original board.
 */
export function dropDisc(board: Board, col: number, disc: Disc): DropResult {
  if (!isColumnOpen(board, col)) {
    return { ok: false, board, landedRow: -1 };
  }

  const landedRow = board[col].findIndex((cell) => cell === null);

  const nextBoard: Board = board.map((column, columnIndex) =>
    columnIndex === col ? column.slice() : column,
  );
  nextBoard[col][landedRow] = disc;

  return { ok: true, board: nextBoard, landedRow };
}
/**
 * Returns true when `(col, row)` is a valid on-board coordinate.
 */
function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

/**
 * Detects whether the disc at `(col, row)` completes a chain of `CONNECT`
 * same-colour discs along any of the four axes. For each axis the run is
 * counted in both directions from the just-dropped cell. Returns the winning
 * cells (the full run, which may exceed `CONNECT`) or `null` when no win.
 */
export function checkWinAt(
  board: Board,
  col: number,
  row: number,
): Coord[] | null {
  if (!inBounds(col, row)) {
    return null;
  }

  const disc = board[col][row];
  if (disc === null) {
    return null;
  }

  for (const [dCol, dRow] of DIRECTIONS) {
    const cells: Coord[] = [{ col, row }];

    // Walk forward along the axis.
    let c = col + dCol;
    let r = row + dRow;
    while (inBounds(c, r) && board[c][r] === disc) {
      cells.push({ col: c, row: r });
      c += dCol;
      r += dRow;
    }

    // Walk backward along the axis.
    c = col - dCol;
    r = row - dRow;
    while (inBounds(c, r) && board[c][r] === disc) {
      cells.unshift({ col: c, row: r });
      c -= dCol;
      r -= dRow;
    }

    if (cells.length >= CONNECT) {
      return cells;
    }
  }

  return null;
}

/**
 * Scans the whole board for any chain of `CONNECT` `disc` cells. Returns the
 * winning cells for the first chain found, or `null` when none exists.
 */
export function findWin(board: Board, disc: Disc): Coord[] | null {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (board[col][row] !== disc) {
        continue;
      }
      // Only start a run at the beginning of a chain along each axis to avoid
      // redundant scans, then confirm via the shared checkWinAt logic.
      const win = checkWinAt(board, col, row);
      if (win !== null && board[win[0].col][win[0].row] === disc) {
        return win;
      }
    }
  }
  return null;
}

/**
 * Returns true when every cell on the board is filled (no `null` cells).
 */
export function isBoardFull(board: Board): boolean {
  for (let col = 0; col < COLS; col++) {
    if (board[col][ROWS - 1] === null) {
      return false;
    }
  }
  return true;
}

/**
 * Returns true when the board is completely filled and neither colour has a
 * chain of `CONNECT` discs.
 */
export function isDraw(board: Board): boolean {
  if (!isBoardFull(board)) {
    return false;
  }
  return findWin(board, 'R') === null && findWin(board, 'Y') === null;
}

/**
 * Finds the longest contiguous run of `disc` cells along any of the four
 * directions. Walks every same-colour cell as a potential run start (a cell is
 * a start only when the preceding cell along the axis is not the same colour),
 * then extends forward, tracking the longest run and its cells.
 *
 * The reported `length` is capped at `CONNECT` (4): a longer true run still
 * reports `4`, and the returned `cells` are the first `CONNECT` cells of that
 * run so `cells.length` always equals the reported `length`. When the colour
 * is absent from the board the result is `{ length: 0, cells: [] }`.
 */
export function longestChain(board: Board, disc: Disc): ChainResult {
  let bestLength = 0;
  let bestCells: Coord[] = [];

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (board[col][row] !== disc) {
        continue;
      }

      for (const [dCol, dRow] of DIRECTIONS) {
        // Only begin a run at its start along this axis to avoid recounting
        // the same run from every cell it contains.
        const prevCol = col - dCol;
        const prevRow = row - dRow;
        if (inBounds(prevCol, prevRow) && board[prevCol][prevRow] === disc) {
          continue;
        }

        const cells: Coord[] = [{ col, row }];
        let c = col + dCol;
        let r = row + dRow;
        while (inBounds(c, r) && board[c][r] === disc) {
          cells.push({ col: c, row: r });
          c += dCol;
          r += dRow;
        }

        if (cells.length > bestLength) {
          bestLength = cells.length;
          bestCells = cells;
        }
      }
    }
  }

  const cappedLength = Math.min(bestLength, CONNECT);
  return { length: cappedLength, cells: bestCells.slice(0, cappedLength) };
}
