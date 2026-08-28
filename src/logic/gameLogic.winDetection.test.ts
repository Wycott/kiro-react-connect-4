import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CONNECT } from './types';
import type { Coord, Disc } from './types';
import { findWin, checkWinAt } from './gameLogic';
import { plantedChainArb } from './testGenerators';

/**
 * Feature: connect-4-game, Property 4: Four-in-a-row is detected in every direction
 * Validates: Requirements 4.1, 4.2, 4.3
 *
 * For any board containing a chain of four same-colour discs in a horizontal,
 * vertical, or either diagonal direction, win detection declares that colour's
 * owner the winner and returns a set of aligned same-colour cells that
 * contains at least four contiguous cells forming the chain.
 */
describe('Property 4: Four-in-a-row is detected in every direction', () => {
  it('detects a planted four-chain and returns aligned same-colour cells', () => {
    fc.assert(
      fc.property(plantedChainArb(), ({ board, disc, direction }) => {
        const win = findWin(board, disc);

        // A win must be detected for the planted colour.
        expect(win).not.toBeNull();
        const cells = win as Coord[];

        // The returned run contains at least four cells.
        expect(cells.length).toBeGreaterThanOrEqual(CONNECT);

        // Every returned cell holds the winning colour.
        for (const { col, row } of cells) {
          expect(board[col][row]).toBe<Disc>(disc);
        }

        // The cells are aligned and contiguous along the chain's direction.
        const [dCol, dRow] = direction;
        for (let i = 1; i < cells.length; i++) {
          const prev = cells[i - 1];
          const cur = cells[i];
          expect(cur.col - prev.col).toBe(dCol);
          expect(cur.row - prev.row).toBe(dRow);
        }

        // The opposite colour has no win on this board.
        const other: Disc = disc === 'R' ? 'Y' : 'R';
        expect(findWin(board, other)).toBeNull();

        // checkWinAt anchored on a chain cell also detects the win.
        const anchor = cells[0];
        expect(checkWinAt(board, anchor.col, anchor.row)).not.toBeNull();
      }),
      { numRuns: 200 },
    );
  });
});
