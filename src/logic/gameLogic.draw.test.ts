import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { findWin, isBoardFull, isDraw } from './gameLogic';
import { fullBoardWithoutChainArb } from './testGenerators';

/**
 * Property 6: Full board with no chain is a draw.
 *
 * For any completely filled board that contains no 4-chain of either colour,
 * `isDraw` classifies the board as a draw.
 */
describe('Feature: connect-4-game, Property 6: Full board with no chain is a draw', () => {
  it('classifies a completely filled board with no 4-chain as a draw', () => {
    fc.assert(
      fc.property(fullBoardWithoutChainArb(), (board) => {
        // Preconditions established by the generator: the board is full and
        // neither colour has a winning chain.
        expect(isBoardFull(board)).toBe(true);
        expect(findWin(board, 'R')).toBeNull();
        expect(findWin(board, 'Y')).toBeNull();

        // The property under test.
        expect(isDraw(board)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
