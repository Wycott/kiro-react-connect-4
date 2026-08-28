import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { COLS, ROWS, CONNECT } from './types';
import type { Board, Coord, Disc } from './types';
import { longestChain } from './gameLogic';
import { reachableBoardArb } from './testGenerators';

/**
 * The four chain directions, expressed as `[colDelta, rowDelta]`: horizontal,
 * vertical, and both diagonals. Mirrors the directions used by the production
 * scanning routines but is defined independently here so the test does not
 * depend on the implementation's internals.
 */
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], // horizontal (col+)
  [0, 1], // vertical (row+)
  [1, 1], // diagonal up-right
  [1, -1], // diagonal down-right
];

/** Returns true when `(col, row)` is a valid on-board coordinate. */
function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

/** Returns true when `disc` appears anywhere on the board. */
function discPresent(board: Board, disc: Disc): boolean {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (board[col][row] === disc) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Independent reference implementation: computes the true longest contiguous
 * run of `disc` along any of the four directions, capped at `CONNECT` (4).
 * Returns 0 when the colour is absent. This is deliberately a simple scan that
 * shares no code with the production `longestChain`.
 */
function trueLongestRunCapped(board: Board, disc: Disc): number {
  let best = 0;
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (board[col][row] !== disc) {
        continue;
      }
      for (const [dCol, dRow] of DIRECTIONS) {
        let run = 0;
        let c = col;
        let r = row;
        while (inBounds(c, r) && board[c][r] === disc) {
          run++;
          c += dCol;
          r += dRow;
        }
        if (run > best) {
          best = run;
        }
      }
    }
  }
  return Math.min(best, CONNECT);
}

/**
 * Property 15: Longest-chain length is correct and within 1..4.
 *
 * For any board, the reported `Max_Chain_Length` for a colour equals the true
 * longest contiguous run of that colour in any of the four directions, capped
 * at 4; it is a value in 1..4 whenever the colour is present and 0 when absent.
 *
 * **Validates: Requirements 8.2, 8.3**
 */
describe('Feature: connect-4-game, Property 15: Longest-chain length is correct and within 1..4', () => {
  it('reports the true longest run (capped at 4), in 1..4 when present and 0 when absent', () => {
    fc.assert(
      fc.property(
        reachableBoardArb(),
        fc.constantFrom<Disc>('R', 'Y'),
        ({ board }, disc) => {
          const result = longestChain(board, disc);
          const expected = trueLongestRunCapped(board, disc);

          // Reported length matches the independent reference scan.
          expect(result.length).toBe(expected);

          if (discPresent(board, disc)) {
            // Present colour => length is in 1..4.
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result.length).toBeLessThanOrEqual(CONNECT);
          } else {
            // Absent colour => length is exactly 0.
            expect(result.length).toBe(0);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

/**
 * Property 16: Highlighted chain cells form a valid chain of the reported
 * length.
 *
 * For any board, the cells returned as a colour's longest chain are all that
 * colour, are aligned and contiguous along a single direction, and number
 * exactly the reported chain length.
 *
 * **Validates: Requirements 8.4**
 */
describe('Feature: connect-4-game, Property 16: Highlighted chain cells form a valid chain of the reported length', () => {
  it('returns same-colour cells aligned and contiguous along one direction, sized to the reported length', () => {
    fc.assert(
      fc.property(
        reachableBoardArb(),
        fc.constantFrom<Disc>('R', 'Y'),
        ({ board }, disc) => {
          const { length, cells } = longestChain(board, disc);

          // The count of returned cells always equals the reported length.
          expect(cells.length).toBe(length);

          if (length === 0) {
            // No chain: nothing more to verify.
            expect(cells).toEqual([]);
            return;
          }

          // Every returned cell is on the board and holds the target colour.
          for (const { col, row } of cells) {
            expect(inBounds(col, row)).toBe(true);
            expect(board[col][row]).toBe(disc);
          }

          if (length === 1) {
            // A single cell is trivially aligned and contiguous.
            return;
          }

          // The cells must be aligned along exactly one direction: the step
          // between the first two cells must equal a valid direction vector...
          const first = cells[0];
          const second = cells[1];
          const step: readonly [number, number] = [
            second.col - first.col,
            second.row - first.row,
          ];

          const matchesDirection = (
            a: readonly [number, number],
            b: readonly [number, number],
          ): boolean => a[0] === b[0] && a[1] === b[1];

          const isValidDirection = DIRECTIONS.some((dir) =>
            matchesDirection(step, dir),
          );
          expect(isValidDirection).toBe(true);

          // ...and every subsequent cell must continue that same step,
          // proving the run is both aligned and contiguous.
          for (let i = 0; i < cells.length; i++) {
            const expectedCell: Coord = {
              col: first.col + i * step[0],
              row: first.row + i * step[1],
            };
            expect(cells[i]).toEqual(expectedCell);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
