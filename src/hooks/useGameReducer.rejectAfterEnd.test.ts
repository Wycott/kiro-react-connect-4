import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createInitialState,
  gameReducer,
  type GameAction,
  type GameState,
} from './useGameReducer';
import type { Board, Disc, GameStatus, Player } from '../logic/types';
import { COLS } from '../logic/types';
import { findWin } from '../logic/gameLogic';
import {
  fullBoardWithoutChainArb,
  plantedChainArb,
  reachableBoardArb,
} from '../logic/testGenerators';

/**
 * Deep-clones a board so tests can compare contents independently of the
 * references held by the reducer.
 */
function cloneBoard(board: Board): Board {
  return board.map((column) => column.slice());
}

/**
 * Builds a `GameState` from parts, defaulting the fields the drop-rejection
 * property does not care about (selection, debug). `humanDisc`/`computerDisc`
 * are derived from the Human colour just like `createInitialState`.
 */
function makeState(
  board: Board,
  humanDisc: Disc,
  currentPlayer: Player,
  status: GameStatus,
): GameState {
  const base = createInitialState(humanDisc);
  return { ...base, board, currentPlayer, status };
}

/**
 * Arbitrary producing a game state whose status is a `win`. The winning board
 * comes from the planted-chain generator (guaranteeing a real 4-chain), and
 * the win status carries the winning disc, an owning player, and the winning
 * cells, matching what the reducer itself would produce.
 */
const wonStateArb: fc.Arbitrary<GameState> = fc
  .record({
    planted: plantedChainArb(),
    humanDisc: fc.constantFrom<Disc>('R', 'Y'),
    winner: fc.constantFrom<Player>('human', 'computer'),
    currentPlayer: fc.constantFrom<Player>('human', 'computer'),
  })
  .map(({ planted, humanDisc, winner, currentPlayer }) => {
    const status: GameStatus = {
      kind: 'win',
      winner,
      disc: planted.disc,
      cells: planted.cells.map((c) => ({ col: c.col, row: c.row })),
    };
    return makeState(planted.board, humanDisc, currentPlayer, status);
  });

/**
 * Arbitrary producing a game state whose status is a `draw`, backed by a full
 * board that contains no 4-chain of either colour.
 */
const drawnStateArb: fc.Arbitrary<GameState> = fc
  .record({
    board: fullBoardWithoutChainArb(),
    humanDisc: fc.constantFrom<Disc>('R', 'Y'),
    currentPlayer: fc.constantFrom<Player>('human', 'computer'),
  })
  .map(({ board, humanDisc, currentPlayer }) =>
    makeState(board, humanDisc, currentPlayer, { kind: 'draw' }),
  );

/** A game state whose status is terminal (either a win or a draw). */
const endedStateArb: fc.Arbitrary<GameState> = fc.oneof(
  wonStateArb,
  drawnStateArb,
);

describe('Feature: connect-4-game, Property 7: An ended game rejects further drops', () => {
  it('leaves the board and status unchanged when a drop is dispatched into a won game', () => {
    fc.assert(
      fc.property(
        wonStateArb,
        fc.integer({ min: 0, max: COLS - 1 }),
        fc.constantFrom<Player>('human', 'computer'),
        (state, col, player) => {
          // Sanity: the state really is a win over a genuine 4-chain.
          expect(state.status.kind).toBe('win');
          if (state.status.kind === 'win') {
            expect(findWin(state.board, state.status.disc)).not.toBeNull();
          }

          const boardBefore = cloneBoard(state.board);
          const statusBefore = state.status;

          const action: GameAction = { type: 'DROP', player, col };
          const next = gameReducer(state, action);

          // The reducer short-circuits, returning the identical state object.
          expect(next).toBe(state);
          // Board and status are referentially and structurally unchanged.
          expect(next.board).toBe(state.board);
          expect(next.status).toBe(statusBefore);
          expect(next.board).toEqual(boardBefore);
          expect(next.status).toEqual(statusBefore);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('leaves the board and status unchanged when a drop is dispatched into a drawn game', () => {
    fc.assert(
      fc.property(
        drawnStateArb,
        fc.integer({ min: 0, max: COLS - 1 }),
        fc.constantFrom<Player>('human', 'computer'),
        (state, col, player) => {
          expect(state.status.kind).toBe('draw');

          const boardBefore = cloneBoard(state.board);
          const statusBefore = state.status;

          const action: GameAction = { type: 'DROP', player, col };
          const next = gameReducer(state, action);

          expect(next).toBe(state);
          expect(next.board).toBe(state.board);
          expect(next.status).toBe(statusBefore);
          expect(next.board).toEqual(boardBefore);
          expect(next.status).toEqual(statusBefore);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects drops for any ended game regardless of column or acting player', () => {
    fc.assert(
      fc.property(
        endedStateArb,
        // Include out-of-range columns to exercise the guard robustly.
        fc.integer({ min: -2, max: COLS + 1 }),
        fc.constantFrom<Player>('human', 'computer'),
        (state, col, player) => {
          const boardBefore = cloneBoard(state.board);
          const statusBefore = state.status;

          const next = gameReducer(state, { type: 'DROP', player, col });

          expect(next).toBe(state);
          expect(next.board).toEqual(boardBefore);
          expect(next.status).toEqual(statusBefore);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('also rejects a drop reached by replaying real drops to a terminal state', () => {
    // Build a plausible in-progress board via legal drops, then force it to a
    // terminal status and confirm a subsequent DROP is rejected. This exercises
    // the guard against states produced the way a real game reaches them.
    fc.assert(
      fc.property(
        reachableBoardArb({ maxMoves: 30 }),
        fc.constantFrom<Disc>('R', 'Y'),
        fc.integer({ min: 0, max: COLS - 1 }),
        ({ board }, humanDisc, col) => {
          const state = makeState(board, humanDisc, 'human', { kind: 'draw' });

          const boardBefore = cloneBoard(state.board);
          const next = gameReducer(state, {
            type: 'DROP',
            player: 'human',
            col,
          });

          expect(next).toBe(state);
          expect(next.board).toEqual(boardBefore);
          expect(next.status).toEqual({ kind: 'draw' });
        },
      ),
      { numRuns: 100 },
    );
  });
});
