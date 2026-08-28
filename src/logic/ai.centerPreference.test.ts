import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CENTER_COL } from './types';
import type { Board, Disc } from './types';
import { dropDisc, checkWinAt, openColumns } from './gameLogic';
import {
  reachableBoardArb,
  reachableBoardWithOpenColumnArb,
} from './testGenerators';
import { chooseComputerColumn } from './ai';

/**
 * Returns true when dropping `disc` into some open column of `board` produces
 * an immediate win for that disc. Used to detect boards where the AI's
 * win-or-block branches would fire (so those boards are excluded from the
 * center-preference property).
 */
function hasImmediateWin(board: Board, disc: Disc): boolean {
  for (const col of openColumns(board)) {
    const drop = dropDisc(board, col, disc);
    if (drop.ok && checkWinAt(drop.board, col, drop.landedRow) !== null) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the open column closest to `CENTER_COL`, minimizing
 * `|col - CENTER_COL|` with ties resolving to the lower column index. This is
 * an independent reference implementation of the AI's center-preference rule.
 */
function expectedCenterColumn(board: Board): number {
  const open = openColumns(board);
  let best = open[0];
  let bestDistance = Math.abs(best - CENTER_COL);
  for (const col of open) {
    const distance = Math.abs(col - CENTER_COL);
    if (distance < bestDistance) {
      best = col;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Feature: connect-4-game, Property 11: The AI only ever chooses an open column
 * Validates: Requirements 5.4
 *
 * For any reachable board with at least one open column, the column chosen by
 * `chooseComputerColumn` is always an open column (regardless of which branch
 * of the heuristic fires).
 */
describe('Property 11: The AI only ever chooses an open column', () => {
  it('returns a column that is open whenever one exists', () => {
    fc.assert(
      fc.property(
        reachableBoardWithOpenColumnArb(),
        fc.constantFrom<Disc>('R', 'Y'),
        ({ board }, computerDisc) => {
          const humanDisc: Disc = computerDisc === 'R' ? 'Y' : 'R';
          const open = openColumns(board);
          expect(open.length).toBeGreaterThan(0);

          const chosen = chooseComputerColumn(board, computerDisc, humanDisc);
          expect(open).toContain(chosen);
        },
      ),
      { numRuns: 200 },
    );
  });
});

/**
 * Feature: connect-4-game, Property 10: The AI otherwise chooses the open column closest to center
 * Validates: Requirements 5.3
 *
 * For any board with no immediate Computer win and no immediate Human threat to
 * block, the chosen column minimizes `|col - CENTER_COL|` among the open
 * columns, with ties resolving to the lower index.
 *
 * We filter reachable boards to exclude any where the computer has an immediate
 * win or the human has an immediate winning threat, so only the
 * center-preference branch of the heuristic can fire. The expected column is
 * computed independently and compared for equality.
 */
describe('Property 10: The AI otherwise chooses the open column closest to center', () => {
  it('chooses the center-closest open column when no win or block applies', () => {
    fc.assert(
      fc.property(
        reachableBoardArb({ maxMoves: 41 }),
        fc.constantFrom<Disc>('R', 'Y'),
        (reachable, computerDisc) => {
          const humanDisc: Disc = computerDisc === 'R' ? 'Y' : 'R';
          const board = reachable.board;
          const open = openColumns(board);

          // Precondition: at least one open column and neither side has an
          // immediate win/threat, so only the center-preference rule applies.
          fc.pre(open.length > 0);
          fc.pre(!hasImmediateWin(board, computerDisc));
          fc.pre(!hasImmediateWin(board, humanDisc));

          const chosen = chooseComputerColumn(board, computerDisc, humanDisc);
          expect(chosen).toBe(expectedCenterColumn(board));
        },
      ),
      { numRuns: 200 },
    );
  });
});
