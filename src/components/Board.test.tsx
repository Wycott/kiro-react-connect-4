import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Board } from './Board';
import { createEmptyBoard, dropDisc } from '../logic/gameLogic';
import type { Board as BoardModel, Coord } from '../logic/types';
import { COLS, ROWS } from '../logic/types';

/**
 * Builds a board by replaying a series of legal drops so the resulting board
 * respects gravity (no floating discs).
 */
function buildBoard(drops: Array<{ col: number; disc: 'R' | 'Y' }>): BoardModel {
  let board = createEmptyBoard();
  for (const { col, disc } of drops) {
    const result = dropDisc(board, col, disc);
    expect(result.ok).toBe(true);
    board = result.board;
  }
  return board;
}

function cell(col: number, row: number): HTMLElement {
  return screen.getByTestId(`cell-${col}-${row}`);
}

describe('Board', () => {
  it('renders every cell of the grid', () => {
    render(<Board board={createEmptyBoard()} selectedColumn={0} />);
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        expect(cell(col, row)).toBeInTheDocument();
      }
    }
  });

  it('renders discs at the right coordinates and empties as "empty"', () => {
    // Drop R into col 0 (lands row 0), Y into col 0 (lands row 1),
    // R into col 3 (lands row 0).
    const board = buildBoard([
      { col: 0, disc: 'R' },
      { col: 0, disc: 'Y' },
      { col: 3, disc: 'R' },
    ]);

    render(<Board board={board} selectedColumn={0} />);

    expect(cell(0, 0)).toHaveAttribute('data-disc', 'R');
    expect(cell(0, 1)).toHaveAttribute('data-disc', 'Y');
    expect(cell(3, 0)).toHaveAttribute('data-disc', 'R');

    // A sampling of untouched cells should render as empty.
    expect(cell(0, 2)).toHaveAttribute('data-disc', 'empty');
    expect(cell(1, 0)).toHaveAttribute('data-disc', 'empty');
    expect(cell(6, 5)).toHaveAttribute('data-disc', 'empty');
  });

  it('marks only the selected column cells as selected', () => {
    const selectedColumn = 2;
    render(<Board board={createEmptyBoard()} selectedColumn={selectedColumn} />);

    for (let col = 0; col < COLS; col++) {
      const expected = col === selectedColumn ? 'true' : 'false';
      for (let row = 0; row < ROWS; row++) {
        expect(cell(col, row)).toHaveAttribute('data-selected', expected);
      }
    }
  });

  it('highlights chain cells when debug is enabled', () => {
    const board = buildBoard([
      { col: 0, disc: 'R' },
      { col: 1, disc: 'Y' },
      { col: 1, disc: 'R' },
      { col: 2, disc: 'Y' },
    ]);

    const humanChainCells: Coord[] = [
      { col: 0, row: 0 },
      { col: 1, row: 1 },
    ];
    const computerChainCells: Coord[] = [
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];

    render(
      <Board
        board={board}
        selectedColumn={0}
        debug={true}
        humanChainCells={humanChainCells}
        computerChainCells={computerChainCells}
      />,
    );

    // Provided chain cells are highlighted.
    expect(cell(0, 0)).toHaveAttribute('data-chain', 'true');
    expect(cell(1, 1)).toHaveAttribute('data-chain', 'true');
    expect(cell(1, 0)).toHaveAttribute('data-chain', 'true');
    expect(cell(2, 0)).toHaveAttribute('data-chain', 'true');

    // A cell not in either chain list is not highlighted.
    expect(cell(3, 0)).toHaveAttribute('data-chain', 'false');
    expect(cell(5, 5)).toHaveAttribute('data-chain', 'false');
  });

  it('applies no chain highlighting when debug is disabled', () => {
    const board = buildBoard([
      { col: 0, disc: 'R' },
      { col: 1, disc: 'Y' },
      { col: 1, disc: 'R' },
    ]);

    render(
      <Board
        board={board}
        selectedColumn={0}
        debug={false}
        humanChainCells={[
          { col: 0, row: 0 },
          { col: 1, row: 1 },
        ]}
        computerChainCells={[{ col: 1, row: 0 }]}
      />,
    );

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        expect(cell(col, row)).toHaveAttribute('data-chain', 'false');
      }
    }
  });
});
