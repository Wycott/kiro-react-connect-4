import fc from 'fast-check';
import { COLS, ROWS } from './types';
import type { Board, Disc } from './types';
import { createEmptyBoard, dropDisc, findWin, openColumns } from './gameLogic';

/**
 * Test-only fast-check arbitraries for the Connect 4 game logic.
 *
 * These generators are shared across the property test suites. Boards produced
 * here are always "reachable": they are built by replaying a sequence of legal
 * drops, so they can never contain floating discs (an empty cell below a
 * filled one in the same column).
 */

/**
 * A reachable board plus the disc that would move next. The board is produced
 * by replaying `moveCount` random valid drops, alternating disc colours the
 * way a real game would.
 */
export interface ReachableBoard {
  board: Board;
  /** The disc colour whose turn it would be to drop next. */
  nextDisc: Disc;
}

/**
 * Replays `cols` (a list of column indices) as a sequence of drops on a fresh
 * board, alternating colours starting with `first`. Illegal drops (into a full
 * column) are skipped so the sequence always yields a reachable board.
 */
function replayDrops(cols: number[], first: Disc): ReachableBoard {
  let board = createEmptyBoard();
  let current: Disc = first;
  for (const col of cols) {
    const result = dropDisc(board, col, current);
    if (result.ok) {
      board = result.board;
      current = current === 'R' ? 'Y' : 'R';
    }
  }
  return { board, nextDisc: current };
}

/**
 * Generates a reachable board by replaying between 0 and (COLS*ROWS) random
 * valid drops. The board is guaranteed to have no floating discs. Because the
 * move count is bounded below the full-board size and columns are chosen
 * uniformly, the generated boards typically retain at least one open column.
 */
export function reachableBoardArb(
  options: { minMoves?: number; maxMoves?: number; firstDisc?: Disc } = {},
): fc.Arbitrary<ReachableBoard> {
  const maxCells = COLS * ROWS;
  const minMoves = options.minMoves ?? 0;
  const maxMoves = options.maxMoves ?? maxCells;
  const firstArb: fc.Arbitrary<Disc> =
    options.firstDisc !== undefined
      ? fc.constant(options.firstDisc)
      : fc.constantFrom<Disc>('R', 'Y');

  return fc
    .tuple(
      fc.array(fc.integer({ min: 0, max: COLS - 1 }), {
        minLength: minMoves,
        maxLength: maxMoves,
      }),
      firstArb,
    )
    .map(([cols, first]) => replayDrops(cols, first));
}

/**
 * Generates a reachable board that is guaranteed to have at least one open
 * column, paired with an open column index chosen from that board. Useful for
 * properties that need to exercise a valid drop.
 */
export function reachableBoardWithOpenColumnArb(
  options: { firstDisc?: Disc } = {},
): fc.Arbitrary<{ board: Board; nextDisc: Disc; col: number }> {
  // Cap moves below the full board size so at least one column stays open.
  const maxMoves = COLS * ROWS - 1;
  return reachableBoardArb({ maxMoves, firstDisc: options.firstDisc })
    .filter(({ board }) => openColumns(board).length > 0)
    .chain(({ board, nextDisc }) =>
      fc
        .constantFrom(...openColumns(board))
        .map((col) => ({ board, nextDisc, col })),
    );
}

/**
 * Counts the number of filled (non-null) cells in a single column.
 */
export function columnCount(board: Board, col: number): number {
  return board[col].reduce((acc, cell) => (cell === null ? acc : acc + 1), 0);
}

/**
 * The four chain directions, expressed as `[colDelta, rowDelta]`, that a
 * planted chain can run along: horizontal, vertical, and both diagonals.
 */
export type PlantedDirection = readonly [number, number];

export const PLANTED_DIRECTIONS: ReadonlyArray<PlantedDirection> = [
  [1, 0], // horizontal (col+)
  [0, 1], // vertical (row+)
  [1, 1], // diagonal up-right
  [1, -1], // diagonal down-right
];

/**
 * A board with a deliberately planted chain of `CONNECT` same-colour discs.
 * Note: such a board is not necessarily "reachable" via legal drops (it may
 * contain floating discs); it is intended purely to exercise win detection.
 */
export interface PlantedChainBoard {
  board: Board;
  /** The colour of the planted four-in-a-row. */
  disc: Disc;
  /** The direction the chain runs along, `[colDelta, rowDelta]`. */
  direction: PlantedDirection;
  /** The four cells forming the planted chain. */
  cells: { col: number; row: number }[];
}

/**
 * Returns true when `(col, row)` is a valid on-board coordinate.
 */
function onBoard(col: number, row: number): boolean {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

/**
 * Generates a board with a chain of exactly four same-colour discs planted at
 * a valid on-board location along a chosen direction (horizontal, vertical, or
 * either diagonal). The rest of the board is empty, guaranteeing the only
 * four-in-a-row present is the planted one.
 *
 * The starting cell is chosen so that all four cells of the chain remain on
 * the board for the selected direction.
 */
export function plantedChainArb(): fc.Arbitrary<PlantedChainBoard> {
  const chainLength = 4;
  return fc
    .record({
      disc: fc.constantFrom<Disc>('R', 'Y'),
      dirIndex: fc.integer({ min: 0, max: PLANTED_DIRECTIONS.length - 1 }),
      startCol: fc.integer({ min: 0, max: COLS - 1 }),
      startRow: fc.integer({ min: 0, max: ROWS - 1 }),
    })
    .map(({ disc, dirIndex, startCol, startRow }) => {
      const direction = PLANTED_DIRECTIONS[dirIndex];
      const [dCol, dRow] = direction;

      // Constrain the starting cell so the whole chain fits on the board.
      const span = chainLength - 1;
      const maxStartCol = dCol > 0 ? COLS - 1 - span * dCol : COLS - 1;
      let col = Math.min(startCol, maxStartCol);

      let row = startRow;
      if (dRow > 0) {
        row = Math.min(startRow, ROWS - 1 - span * dRow);
      } else if (dRow < 0) {
        // Chain moves downward as col increases; keep every row on the board.
        row = Math.max(startRow, span * -dRow);
      }

      const board = createEmptyBoard();
      const cells: { col: number; row: number }[] = [];
      for (let i = 0; i < chainLength; i++) {
        const c = col + i * dCol;
        const r = row + i * dRow;
        // onBoard is a defensive guard; the clamping above keeps cells valid.
        if (onBoard(c, r)) {
          board[c][r] = disc;
          cells.push({ col: c, row: r });
        }
      }

      return { board, disc, direction, cells };
    });
}

/**
 * Generates a completely-filled board that contains no 4-chain of either
 * colour (a genuine draw board).
 *
 * Strategy: colour each cell from a small family of "block" patterns that are
 * resistant to producing four-in-a-row, using per-pattern random parameters so
 * the generator explores many distinct full boards. Every candidate is then
 * verified with `findWin` and only chain-free boards are kept, so correctness
 * never depends on the pattern being provably win-free — the filter guarantees
 * it. The base patterns keep the acceptance rate high enough that the filter
 * rarely has to reject.
 */
export function fullBoardWithoutChainArb(): fc.Arbitrary<Board> {
  return fc
    .record({
      // Choose a block size of 1..3; 2x2/3x3 blocks of a single colour keep
      // same-colour runs short in most orientations.
      blockCols: fc.integer({ min: 1, max: 3 }),
      blockRows: fc.integer({ min: 1, max: 3 }),
      swap: fc.boolean(),
      offset: fc.integer({ min: 0, max: 3 }),
    })
    .map(({ blockCols, blockRows, swap, offset }) => {
      const board: Board = [];
      for (let col = 0; col < COLS; col++) {
        const column: Disc[] = [];
        for (let row = 0; row < ROWS; row++) {
          const block =
            Math.floor((col + offset) / blockCols) +
            Math.floor((row + offset) / blockRows);
          const isR = block % 2 === 0;
          const disc: Disc = (isR ? !swap : swap) ? 'R' : 'Y';
          column.push(disc);
        }
        board.push(column);
      }
      return board;
    })
    .filter(
      (board) => findWin(board, 'R') === null && findWin(board, 'Y') === null,
    );
}
