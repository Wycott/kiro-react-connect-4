import styles from './Board.module.css';
import { Cell } from './Cell';
import type { Board as BoardModel, Coord } from '../logic/types';
import { COLS, ROWS } from '../logic/types';

export interface BoardProps {
  /** The game board, indexed board[col][row]; row 0 is the lowest row. */
  board: BoardModel;
  /** Currently selected column (0..6); its cells receive a highlight. */
  selectedColumn: number;
  /** When true, chain-highlight cells are applied to the board. */
  debug?: boolean;
  /** Human player's longest-chain cells, highlighted in debug mode. */
  humanChainCells?: Coord[];
  /** Computer player's longest-chain cells, highlighted in debug mode. */
  computerChainCells?: Coord[];
}

function chainKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Renders the board as a grid. Columns run left-to-right (0..6). Because row 0
 * is the LOWEST row, rows are rendered top-to-bottom in reverse (highest row
 * first) so the visual layout matches gravity.
 *
 * The selected column receives a highlight class. In debug mode, cells that
 * appear in the provided human/computer longest-chain lists receive a
 * chain-highlight class.
 */
export function Board({
  board,
  selectedColumn,
  debug = false,
  humanChainCells = [],
  computerChainCells = [],
}: BoardProps) {
  const highlightedChainCells = new Set<string>();
  if (debug) {
    for (const { col, row } of humanChainCells) {
      highlightedChainCells.add(chainKey(col, row));
    }
    for (const { col, row } of computerChainCells) {
      highlightedChainCells.add(chainKey(col, row));
    }
  }

  // Render rows from the highest (ROWS - 1) down to 0 so row 0 sits at the bottom.
  const rowOrder = Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i);
  const colOrder = Array.from({ length: COLS }, (_, i) => i);

  return (
    <div
      className={styles.board}
      role="grid"
      aria-label="Connect 4 board"
      data-testid="board"
    >
      {rowOrder.map((row) => (
        <div className={styles.row} role="row" key={`row-${row}`}>
          {colOrder.map((col) => (
            <Cell
              key={`cell-${col}-${row}`}
              col={col}
              row={row}
              value={board[col][row]}
              selected={col === selectedColumn}
              chainHighlight={highlightedChainCells.has(chainKey(col, row))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
