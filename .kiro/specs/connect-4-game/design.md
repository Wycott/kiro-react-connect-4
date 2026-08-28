# Design Document

## Overview

Connect 4 is a browser-based, single-Human-versus-Computer game implemented in TypeScript with React 18+ using functional components and hooks only. The design cleanly separates three layers:

1. **Pure game logic** (`gameLogic.ts`, `ai.ts`) — framework-agnostic, side-effect-free functions for board manipulation, win/draw detection, longest-chain computation, and the Computer heuristic. This layer is the primary target for property-based testing.
2. **React state and UI** — functional components with `useState`/`useReducer` for app-level and game-level state, plus custom hooks for keyboard input and sound.
3. **Styling** — CSS Modules for encapsulated, component-scoped styles.

No external state-management or game libraries are used. All state is held in React and is session-persistent (lost on full page reload), which satisfies the "session-persistent win counters" requirement without any storage layer.

## Architecture

### Layered structure

```
App (app-level state: screen, colours, win counters, sound settings)
 ├── HomeScreen        (colour selection, start, counters, instructions)
 └── GameScreen        (board, status, current-player, debug, counters)
      ├── useGameReducer  (board, currentPlayer, status, selectedColumn, debug)
      ├── useKeyboard     (Left/Right/Down/R/Q handling)
      ├── useSound        (preload + play, mute)
      ├── Board           (grid rendering, selected-column highlight, chain highlight)
      │    └── Cell
      └── StatusBar / CurrentPlayerIndicator / DebugPanel / ScorePanel

Pure logic (no React):
  gameLogic.ts  — createEmptyBoard, dropDisc, checkWin, isDraw, longestChain
  ai.ts         — chooseComputerColumn
  types.ts      — shared types
```

### Screen management

The active screen is app-level state: `screen: 'home' | 'game'`. `App` owns the data that must survive screen transitions (Human colour, win counters, sound settings). `GameScreen` owns per-game state via a reducer and is remounted/reset when a new game starts.

- **Validates: Requirements 1.6, 6.6** — `App` sets `screen` and passes the selected colour down; returning Home (`Q`) sets `screen = 'home'` while `App`-level counters remain untouched.

### Turn flow

The Human always moves first. After a valid Human drop that does not end the game, an effect schedules the Computer's move (via `setTimeout` to allow the drop animation/render to settle), which computes a column through `chooseComputerColumn` and dispatches a drop. The reducer is the single source of truth for whose turn it is.

## Components and Interfaces

### Shared types (`types.ts`)

```typescript
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
```

### Pure game logic (`gameLogic.ts`)

```typescript
// Creates a 7x6 board of nulls.
export function createEmptyBoard(): Board;

// Places `disc` in the lowest empty row of `col`. Returns ok:false if full.
// Does not mutate the input board.
export function dropDisc(board: Board, col: number, disc: Disc): DropResult;

// True if `col` has at least one empty cell.
export function isColumnOpen(board: Board, col: number): boolean;

// Returns the list of columns with at least one empty cell.
export function openColumns(board: Board): number[];

// Detects whether the disc at (col,row) completes a 4-chain in any of the
// four directions. Used right after a drop. Returns the winning cells or null.
export function checkWinAt(board: Board, col: number, row: number): Coord[] | null;

// Scans the whole board for any 4-chain of the given disc; returns winning cells.
export function findWin(board: Board, disc: Disc): Coord[] | null;

// True when the board is completely filled.
export function isBoardFull(board: Board): boolean;

// True when the board is full and neither colour has a 4-chain.
export function isDraw(board: Board): boolean;

// Longest run of `disc` in any of the four directions, capped at CONNECT (4),
// with the cells forming that run. length 0 => colour absent from board.
export function longestChain(board: Board, disc: Disc): ChainResult;
```

Direction handling uses a shared set of direction vectors so horizontal, vertical, and both diagonals share one scanning routine:

```typescript
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],  // horizontal (col+)
  [0, 1],  // vertical (row+)
  [1, 1],  // diagonal up-right
  [1, -1], // diagonal down-right
];
```

`longestChain` walks every cell of the given colour along each direction, tracking the longest contiguous run and its cells, capping the reported length at 4.

### Computer heuristic (`ai.ts`)

```typescript
// Priority order:
//   1. If any open column produces an immediate Computer win, return it.
//   2. Else if any open column would let the Human win next, return the
//      column that blocks it.
//   3. Else return the open column closest to CENTER_COL (ties -> lower index,
//      which also breaks toward center-left deterministically).
// Only open columns are ever returned. Returns -1 only if the board is full.
export function chooseComputerColumn(
  board: Board,
  computerDisc: Disc,
  humanDisc: Disc,
): number;
```

The "closest to center" selection computes `Math.abs(col - CENTER_COL)` over `openColumns` and picks the minimum; ties resolve to the lower column index for determinism.

### React state: game reducer (`useGameReducer.ts`)

```typescript
interface GameState {
  board: Board;
  humanDisc: Disc;
  computerDisc: Disc;
  currentPlayer: Player;
  status: GameStatus;
  selectedColumn: number;   // 0..6
  debug: boolean;
}

type GameAction =
  | { type: 'DROP'; player: Player; col: number }
  | { type: 'MOVE_SELECTION'; direction: 'left' | 'right' }
  | { type: 'RESTART' }
  | { type: 'TOGGLE_DEBUG' };
```

The reducer:
- **DROP**: rejects if `status.kind !== 'playing'` or the column is full (board unchanged). Otherwise places the disc, then evaluates win (via `checkWinAt`) then draw; on continuation it toggles `currentPlayer`.
- **MOVE_SELECTION**: `selectedColumn = (selectedColumn ± 1 + COLS) % COLS`.
- **RESTART**: returns a fresh state with a cleared board and `currentPlayer = 'human'`, preserving `humanDisc`/`computerDisc`. Win counters live in `App`, so they are inherently preserved.
- **TOGGLE_DEBUG**: flips `debug`.

Win-counter increments happen in `App` in response to a `status` change reported upward, keeping counter persistence independent of the per-game reducer lifecycle.

### Custom hooks

**`useKeyboard`** — attaches a `keydown` listener while the Game screen is mounted:

```typescript
interface KeyboardHandlers {
  onLeft(): void;    // MOVE_SELECTION left
  onRight(): void;   // MOVE_SELECTION right
  onDown(): void;    // DROP human into selectedColumn
  onRestart(): void; // 'r' / 'R'
  onHome(): void;    // 'q' / 'Q'
}
export function useKeyboard(handlers: KeyboardHandlers, enabled: boolean): void;
```

Only Human input is accepted; the handler is a no-op while `currentPlayer === 'computer'` or the game has ended (except `R` and `Q`, which are always active).

**`useSound`** — lightweight preloading sound hook:

```typescript
type SoundName = 'drop' | 'win' | 'draw' | 'invalid';

interface UseSound {
  play(name: SoundName): void;
  muted: boolean;
  toggleMute(): void;
}
export function useSound(options?: { invalidEnabled?: boolean }): UseSound;
```

On mount it constructs and preloads one `HTMLAudioElement` per effect (`audio.load()`), stored in a ref. `play` clones/rewinds and plays the requested clip unless `muted` is true. The `invalid` effect only plays when `invalidEnabled` is set.

### UI components

- **`HomeScreen`**: title, two radio-style colour options (default Red), Start button, score display, and keyboard-instruction text. Emits the selected colour and a start event to `App`.
- **`GameScreen`**: composes `Board`, `CurrentPlayerIndicator`, `StatusBar`, `ScorePanel`, `DebugPanel`, and wires the reducer + hooks.
- **`Board` / `Cell`**: render `board[col][row]` as a grid. Applies the selected-column highlight class and, in debug mode, a chain-highlight class to cells returned by `longestChain`. An optional drop-animation class animates the disc to its resting row.
- **`CurrentPlayerIndicator`** and **`StatusBar`**: expose their text via `aria-live="polite"` so assistive technologies announce turn changes and outcomes.
- **`DebugPanel`**: a checkbox plus, when enabled, the Human and Computer `Max_Chain_Length` values (1..4).
- **`ScorePanel`**: renders both win counters.

## Data Models

### Board representation

`board[col][row]`, a 7-element array of 6-element arrays. Row 0 is the lowest (bottom) row; discs "fall" to the lowest empty row. Each cell is `'R' | 'Y' | null`. This column-major layout makes drop and column-fullness checks natural (operate on `board[col]`).

### Game status

A discriminated union (`playing | win | draw`). The `win` variant carries the winning `disc`, the winning `Player`, and the winning `cells` for highlighting. This makes "reject drops after game end" a single check on `status.kind`.

### Win counters

Held in `App` as `{ human: number; computer: number }`. Because they live above the game reducer and screen switch, they naturally persist across restart (`R`), new game, and return-to-home (`Q`) within a session.

## Error Handling

- **Full-column drops**: `dropDisc` returns `{ ok: false }` and the reducer leaves the board unchanged; the optional invalid-move sound may play. No exceptions are thrown for expected rejections.
- **Drops after game end**: the reducer short-circuits when `status.kind !== 'playing'`.
- **AI on a full board**: `chooseComputerColumn` returns `-1`; the caller only invokes the AI when the game is still `playing`, which guarantees at least one open column, but the `-1` guard prevents an invalid drop.
- **Sound playback failures**: `HTMLAudioElement.play()` returns a promise that can reject (e.g., autoplay policy); rejections are caught and ignored so gameplay is never blocked.
- **Keyboard events**: unrecognized keys are ignored; handled keys call `preventDefault` (e.g., arrows) to avoid page scroll.

## Testing Strategy

**Dual approach.** Pure logic in `gameLogic.ts` and `ai.ts` is validated primarily with property-based tests (fast-check) at a minimum of 100 iterations per property. React components and hooks are validated with example-based tests (React Testing Library) for rendering, keyboard flow, and sound side-effects (mocked `HTMLAudioElement`), plus a keyboard-only end-to-end flow for full-game playability.

**Generators.** Custom fast-check arbitraries produce (a) arbitrary reachable boards by replaying random valid drop sequences, (b) boards with a planted 4-chain in a chosen direction, and (c) full boards. Replaying legal drops guarantees the "no floating discs" invariant so generated boards are realistic.

**Property test tagging.** Each property test references its design property using the tag format: **Feature: connect-4-game, Property {number}: {property_text}**.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Drop lands in the lowest empty row

*For any* reachable board and any open column, dropping a disc places it in the lowest empty row of that column, increases that column's disc count by exactly one, leaves all other columns unchanged, and leaves every cell below the landed cell filled.

**Validates: Requirements 2.2**

### Property 2: Dropping into a full column is rejected without change

*For any* board and any column that is completely full, a drop into that column is rejected (`ok = false`) and the board contents are unchanged.

**Validates: Requirements 2.3**

### Property 3: Valid drops alternate the current player

*For any* ongoing game (status `playing`), a valid drop that does not end the game sets the current player to the opponent of the player who just moved.

**Validates: Requirements 3.2, 3.3**

### Property 4: Four-in-a-row is detected in every direction

*For any* board containing a chain of four same-colour discs in a horizontal, vertical, or either diagonal direction, win detection declares that colour's owner the winner and returns exactly a set of four aligned same-colour cells.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Win increments only the winner's counter by one

*For any* prior counter values, when the Human wins the Human counter increases by exactly one and the Computer counter is unchanged; when the Computer wins the Computer counter increases by exactly one and the Human counter is unchanged.

**Validates: Requirements 4.4, 4.5**

### Property 6: Full board with no chain is a draw

*For any* completely filled board that contains no 4-chain of either colour, the game is classified as a draw.

**Validates: Requirements 4.6**

### Property 7: An ended game rejects further drops

*For any* game whose status is a win or a draw, any drop attempt leaves the board unchanged and the status unchanged.

**Validates: Requirements 4.8**

### Property 8: The AI takes an immediate win when one exists

*For any* board where the Computer is to move and at least one open column produces an immediate Computer win, the chosen column is one whose drop wins immediately.

**Validates: Requirements 5.1**

### Property 9: The AI blocks an immediate Human win

*For any* board where the Computer has no immediate win but the Human has exactly one immediate winning threat, the chosen column is the one that blocks that Human win.

**Validates: Requirements 5.2**

### Property 10: The AI otherwise chooses the open column closest to center

*For any* board with no immediate Computer win and no Human threat to block, the chosen column minimizes `|col - 3|` among the open columns.

**Validates: Requirements 5.3**

### Property 11: The AI only ever chooses an open column

*For any* board with at least one open column, the AI's chosen column is an open column.

**Validates: Requirements 5.4**

### Property 12: Selection navigation wraps around the board

*For any* selected column index in 0..6, a left move yields `(index + 6) mod 7` and a right move yields `(index + 1) mod 7`.

**Validates: Requirements 6.1, 6.2**

### Property 13: Restart clears the board and preserves colours and counters

*For any* in-progress or finished game state, restarting produces an all-`null` board with the Human set as current player, while the Human and Computer disc colours and the win counters are unchanged.

**Validates: Requirements 6.5**

### Property 14: Win counters are preserved across non-scoring transitions

*For any* counter values, starting a new game, restarting with "R", and returning to the Home screen with "Q" each leave both win counters unchanged.

**Validates: Requirements 7.2, 7.3, 7.4**

### Property 15: Longest-chain length is correct and within 1..4

*For any* board, the reported `Max_Chain_Length` for a colour equals the true longest contiguous run of that colour in any of the four directions, capped at 4; it is a value in 1..4 whenever the colour is present and 0 when it is absent.

**Validates: Requirements 8.2, 8.3**

### Property 16: Highlighted chain cells form a valid chain of the reported length

*For any* board, the cells returned as a colour's longest chain are all that colour, are aligned and contiguous along a single direction, and number exactly the reported chain length.

**Validates: Requirements 8.4**
