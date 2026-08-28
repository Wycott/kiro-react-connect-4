import { useReducer } from 'react';
import type { Board, Disc, GameStatus, Player } from '../logic/types';
import { CENTER_COL, COLS } from '../logic/types';
import {
  checkWinAt,
  createEmptyBoard,
  dropDisc,
  isBoardFull,
} from '../logic/gameLogic';

/**
 * Per-game state owned by the game reducer. Win counters live in `App` and are
 * intentionally excluded here so they persist independently of this reducer's
 * lifecycle (new game / restart / return-home).
 */
export interface GameState {
  board: Board;
  humanDisc: Disc;
  computerDisc: Disc;
  currentPlayer: Player;
  status: GameStatus;
  selectedColumn: number; // 0..COLS-1
  debug: boolean;
}

/**
 * Actions the game reducer understands.
 * - `DROP`: attempt to drop `player`'s disc into `col`.
 * - `MOVE_SELECTION`: move the selected column left/right with wrap-around.
 * - `RESTART`: clear the board, preserving disc colours, Human to move.
 * - `TOGGLE_DEBUG`: flip the debug flag.
 */
export type GameAction =
  | { type: 'DROP'; player: Player; col: number }
  | { type: 'MOVE_SELECTION'; direction: 'left' | 'right' }
  | { type: 'RESTART' }
  | { type: 'TOGGLE_DEBUG' };

/**
 * Returns the disc colour a given player uses.
 */
function discFor(state: GameState, player: Player): Disc {
  return player === 'human' ? state.humanDisc : state.computerDisc;
}

/**
 * Returns the opponent of `player`.
 */
function opponent(player: Player): Player {
  return player === 'human' ? 'computer' : 'human';
}

/**
 * Builds the initial game state for the given Human disc colour. The Computer
 * takes the opposite colour. Human always moves first; the selection starts at
 * the center column and debug mode is off.
 */
export function createInitialState(humanDisc: Disc): GameState {
  const computerDisc: Disc = humanDisc === 'R' ? 'Y' : 'R';
  return {
    board: createEmptyBoard(),
    humanDisc,
    computerDisc,
    currentPlayer: 'human',
    status: { kind: 'playing' },
    selectedColumn: CENTER_COL,
    debug: false,
  };
}

/**
 * Pure reducer for per-game state. See `GameAction` for the handled actions.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'DROP': {
      // Reject drops once the game has ended.
      if (state.status.kind !== 'playing') {
        return state;
      }

      const disc = discFor(state, action.player);
      const result = dropDisc(state.board, action.col, disc);

      // Reject when the column is full (or out of range); board unchanged.
      if (!result.ok) {
        return state;
      }

      const board = result.board;

      // Evaluate a win around the just-dropped cell.
      const winningCells = checkWinAt(board, action.col, result.landedRow);
      if (winningCells !== null) {
        const status: GameStatus = {
          kind: 'win',
          winner: action.player,
          disc,
          cells: winningCells,
        };
        return { ...state, board, status };
      }

      // No win: a full board is a draw.
      if (isBoardFull(board)) {
        return { ...state, board, status: { kind: 'draw' } };
      }

      // Game continues: hand the turn to the opponent.
      return {
        ...state,
        board,
        currentPlayer: opponent(action.player),
      };
    }

    case 'MOVE_SELECTION': {
      const delta = action.direction === 'left' ? -1 : 1;
      const selectedColumn = (state.selectedColumn + delta + COLS) % COLS;
      return { ...state, selectedColumn };
    }

    case 'RESTART': {
      // Fresh board, Human to move; preserve disc colours. Debug and selection
      // reset to their initial values.
      return createInitialState(state.humanDisc);
    }

    case 'TOGGLE_DEBUG': {
      return { ...state, debug: !state.debug };
    }

    default:
      return state;
  }
}

/**
 * React hook wrapping `gameReducer`. Accepts the Human disc colour as the init
 * parameter; the Computer disc is derived as the opposite colour.
 */
export function useGameReducer(humanDisc: Disc) {
  return useReducer(gameReducer, humanDisc, createInitialState);
}
