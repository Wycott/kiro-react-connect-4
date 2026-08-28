import { CENTER_COL } from './types';
import type { Board, Disc } from './types';
import { openColumns, dropDisc, checkWinAt } from './gameLogic';

/**
 * Chooses the column the Computer should drop into, using a center-weighted
 * heuristic with the following priority order:
 *
 *   1. If any open column produces an immediate Computer win, return it.
 *   2. Else if any open column would let the Human win on their next drop,
 *      return the column that blocks that win.
 *   3. Else return the open column closest to `CENTER_COL`, minimizing
 *      `|col - CENTER_COL|`; ties resolve to the lower column index for
 *      determinism.
 *
 * Only open columns are ever returned. Returns `-1` only when the board is
 * full (no open columns exist).
 */
export function chooseComputerColumn(
  board: Board,
  computerDisc: Disc,
  humanDisc: Disc,
): number {
  const open = openColumns(board);
  if (open.length === 0) {
    return -1;
  }

  // 1. Take an immediate Computer win if one is available.
  for (const col of open) {
    const drop = dropDisc(board, col, computerDisc);
    if (drop.ok && checkWinAt(drop.board, col, drop.landedRow) !== null) {
      return col;
    }
  }

  // 2. Block an immediate Human win.
  for (const col of open) {
    const drop = dropDisc(board, col, humanDisc);
    if (drop.ok && checkWinAt(drop.board, col, drop.landedRow) !== null) {
      return col;
    }
  }

  // 3. Otherwise pick the open column closest to center; ties -> lower index.
  let bestCol = open[0];
  let bestDistance = Math.abs(bestCol - CENTER_COL);
  for (const col of open) {
    const distance = Math.abs(col - CENTER_COL);
    if (distance < bestDistance) {
      bestCol = col;
      bestDistance = distance;
    }
  }

  return bestCol;
}
