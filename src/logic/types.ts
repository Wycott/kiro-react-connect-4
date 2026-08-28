export type Disc = 'R' | 'Y';
export type Cell = Disc | null;
// board[col][row]; col in 0..6, row in 0..5, row 0 is the lowest row.
export type Board = Cell[][];

export type Player = 'human' | 'computer';

export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'win'; winner: Player; disc: Disc; cells: Coord[] }
  | { kind: 'draw' };

export interface Coord {
  col: number;
  row: number;
}

export interface DropResult {
  ok: boolean;        // false if the column was full
  board: Board;       // new board (unchanged reference-equal contents on failure)
  landedRow: number;  // row the disc landed in, or -1 on failure
}

export interface ChainResult {
  length: number;     // 0 if the colour has no discs, else 1..4 (capped at 4)
  cells: Coord[];     // the cells forming the longest chain (empty if length 0)
}

export const COLS = 7;
export const ROWS = 6;
export const CONNECT = 4;
export const CENTER_COL = 3;
