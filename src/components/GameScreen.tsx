import { useCallback, useEffect, useRef } from 'react';
import styles from './GameScreen.module.css';
import { Board } from './Board';
import { CurrentPlayerIndicator } from './CurrentPlayerIndicator';
import { StatusBar } from './StatusBar';
import { ScorePanel } from './ScorePanel';
import { DebugPanel } from './DebugPanel';
import { useGameReducer } from '../hooks/useGameReducer';
import { useKeyboard } from '../hooks/useKeyboard';
import { useSound } from '../hooks/useSound';
import { chooseComputerColumn } from '../logic/ai';
import { longestChain } from '../logic/gameLogic';
import type { Disc, Player } from '../logic/types';

export interface GameScreenProps {
  /** The Human's chosen disc colour; the Computer takes the opposite colour. */
  humanDisc: Disc;
  /** Session Human win counter (owned by App). */
  humanWins: number;
  /** Session Computer win counter (owned by App). */
  computerWins: number;
  /** Return to the Home screen (Q). App preserves counters. */
  onHome: () => void;
  /** Notify App that `winner` won so it can increment counters exactly once. */
  onWin: (winner: Player) => void;
}

/** Delay before the Computer plays, so the Human drop settles first. */
const COMPUTER_MOVE_DELAY_MS = 400;

/**
 * Composes the game board, status/turn indicators, score, and debug panel, and
 * wires the game reducer with keyboard and sound hooks.
 *
 * Turn flow: the Human drops via the keyboard; after a valid non-terminal
 * Human drop the reducer hands the turn to the Computer, and an effect
 * schedules the Computer's move via `setTimeout` (computed by
 * `chooseComputerColumn`) and dispatches its drop.
 *
 * Sounds: 'drop' plays when a disc is placed, 'win'/'draw' when the game ends,
 * and 'invalid' (when enabled) when a drop is rejected.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4,
 * 9.2, 9.3, 9.4, 9.5
 */
export function GameScreen({
  humanDisc,
  humanWins,
  computerWins,
  onHome,
  onWin,
}: GameScreenProps) {
  const [state, dispatch] = useGameReducer(humanDisc);
  const { board, currentPlayer, status, selectedColumn, debug, computerDisc } =
    state;

  const { play, muted, toggleMute } = useSound({ invalidEnabled: true });

  const isPlaying = status.kind === 'playing';
  const isHumanTurn = currentPlayer === 'human';

  // Attempt a Human drop into the selected column, gated to the Human's turn
  // while the game is in progress. Plays 'drop' on success and 'invalid' on a
  // rejected (full-column) drop.
  const dropHuman = useCallback(() => {
    if (!isPlaying || !isHumanTurn) {
      return;
    }
    const before = board[selectedColumn];
    const isFull = before[before.length - 1] !== null;
    if (isFull) {
      play('invalid');
      return;
    }
    play('drop');
    dispatch({ type: 'DROP', player: 'human', col: selectedColumn });
  }, [board, dispatch, isHumanTurn, isPlaying, play, selectedColumn]);

  const moveSelection = useCallback(
    (direction: 'left' | 'right') => {
      if (!isPlaying || !isHumanTurn) {
        return;
      }
      dispatch({ type: 'MOVE_SELECTION', direction });
    },
    [dispatch, isHumanTurn, isPlaying],
  );

  useKeyboard(
    {
      onLeft: () => moveSelection('left'),
      onRight: () => moveSelection('right'),
      onDown: dropHuman,
      onRestart: () => dispatch({ type: 'RESTART' }),
      onHome,
    },
    true,
  );

  // Schedule the Computer's move after a valid non-terminal Human drop, i.e.
  // whenever it becomes the Computer's turn while the game is still playing.
  useEffect(() => {
    if (currentPlayer !== 'computer' || status.kind !== 'playing') {
      return;
    }

    const timer = setTimeout(() => {
      const col = chooseComputerColumn(board, computerDisc, humanDisc);
      if (col < 0) {
        return;
      }
      play('drop');
      dispatch({ type: 'DROP', player: 'computer', col });
    }, COMPUTER_MOVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [board, computerDisc, currentPlayer, dispatch, humanDisc, play, status.kind]);

  // Play the outcome sound and notify App of a win exactly once per transition
  // into a terminal status. A ref keyed off status.kind guards against replays
  // from unrelated re-renders.
  const lastStatusKindRef = useRef<string>('playing');
  useEffect(() => {
    if (status.kind === lastStatusKindRef.current) {
      return;
    }
    lastStatusKindRef.current = status.kind;

    if (status.kind === 'win') {
      play(status.winner === 'human' ? 'win' : 'lose');
      onWin(status.winner);
    } else if (status.kind === 'draw') {
      play('draw');
    }
  }, [status, play, onWin]);

  const humanChain = debug ? longestChain(board, humanDisc) : null;
  const computerChain = debug ? longestChain(board, computerDisc) : null;

  return (
    <main className={styles.game}>
      <div className={styles.header}>
        <CurrentPlayerIndicator currentPlayer={currentPlayer} />
        <StatusBar status={status} />
      </div>

      <Board
        board={board}
        selectedColumn={isPlaying ? selectedColumn : -1}
        debug={debug}
        humanChainCells={humanChain?.cells ?? []}
        computerChainCells={computerChain?.cells ?? []}
        winningCells={status.kind === 'win' ? status.cells : []}
      />

      <div className={styles.controls}>
        <ScorePanel humanWins={humanWins} computerWins={computerWins} />
        <button
          type="button"
          className={styles.muteButton}
          onClick={toggleMute}
          aria-pressed={muted}
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
      </div>

      <DebugPanel
        debug={debug}
        onToggleDebug={() => dispatch({ type: 'TOGGLE_DEBUG' })}
        humanChainLength={humanChain?.length ?? 0}
        computerChainLength={computerChain?.length ?? 0}
      />
    </main>
  );
}



