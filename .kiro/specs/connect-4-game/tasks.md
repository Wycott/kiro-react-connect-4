# Implementation Plan: Connect 4 Game

## Overview

Build the Connect 4 game in incremental layers: shared types first, then pure game logic and the AI heuristic (validated with fast-check property tests), then React state hooks (reducer, keyboard, sound), then UI components, and finally the app-level wiring (screen management, turn flow, session-persistent counters). Each step builds on the previous so nothing is left orphaned, and the app is fully assembled by the last integration task.

## Tasks

- [x] 1. Scaffold the TypeScript + React project and shared types
  - [x] 1.1 Set up project scaffold and tooling
    - Create a TypeScript + React 18+ project (functional components and hooks only, no external state or game libraries)
    - Configure CSS Modules support and the source directory structure (e.g. `src/logic`, `src/hooks`, `src/components`, `src/state`)
    - Set up the test framework with fast-check and React Testing Library, including a test script that runs once (non-watch)
    - _Requirements: 1.1, 2.1, 10.2_

  - [x] 1.2 Define shared types and constants
    - Create `types.ts` with `Disc`, `Cell`, `Board` (`board[col][row]`), `Player`, `GameStatus` union, `Coord`, `DropResult`, `ChainResult`
    - Add constants `COLS = 7`, `ROWS = 6`, `CONNECT = 4`, `CENTER_COL = 3`
    - _Requirements: 2.1_

- [x] 2. Implement pure game logic
  - [x] 2.1 Implement board creation and drop mechanics
    - Write `createEmptyBoard`, `isColumnOpen`, `openColumns`, `dropDisc` (places disc in lowest empty row, returns `ok:false` and unchanged board when full, no mutation of input)
    - Define the shared `DIRECTIONS` vectors used by scanning routines
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Write property test for drop placement
    - **Feature: connect-4-game, Property 1: Drop lands in the lowest empty row**
    - **Validates: Requirements 2.2**
    - Use a reachable-board generator (replay random valid drops); assert landed row, per-column count +1, other columns unchanged, all cells below filled (min 100 iterations)

  - [x] 2.3 Write property test for full-column rejection
    - **Feature: connect-4-game, Property 2: Dropping into a full column is rejected without change**
    - **Validates: Requirements 2.3**
    - Generate boards with a full column; assert `ok = false` and board contents unchanged (min 100 iterations)

  - [x] 2.4 Implement win, draw, and board-full detection
    - Write `checkWinAt` (four-direction check around a just-dropped cell, returns winning cells or null), `findWin` (full-board scan for a disc), `isBoardFull`, `isDraw`
    - Reuse the shared `DIRECTIONS` vectors
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [x] 2.5 Write property test for four-in-a-row detection
    - **Feature: connect-4-game, Property 4: Four-in-a-row is detected in every direction**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Use a planted-chain generator across horizontal, vertical, and both diagonals; assert detection and exactly four aligned same-colour cells (min 100 iterations)

  - [x] 2.6 Write property test for draw classification
    - **Feature: connect-4-game, Property 6: Full board with no chain is a draw**
    - **Validates: Requirements 4.6**
    - Use a full-board-without-chain generator; assert `isDraw` is true (min 100 iterations)

  - [x] 2.7 Implement longest-chain computation
    - Write `longestChain` walking every same-colour cell along each direction, tracking the longest contiguous run and its cells, capping reported length at `CONNECT` (4); length 0 when the colour is absent
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 2.8 Write property tests for longest chain
    - **Feature: connect-4-game, Property 15: Longest-chain length is correct and within 1..4**
    - **Validates: Requirements 8.2, 8.3**
    - **Feature: connect-4-game, Property 16: Highlighted chain cells form a valid chain of the reported length**
    - **Validates: Requirements 8.4**
    - Assert reported length matches the true longest run (1..4, or 0 when absent) and that returned cells are same-colour, aligned, contiguous, and count exactly the reported length (min 100 iterations each)

- [x] 3. Checkpoint - Ensure all game-logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the Computer heuristic
  - [x] 4.1 Implement `chooseComputerColumn` in `ai.ts`
    - Priority order: immediate Computer win, else block an immediate Human win, else open column minimizing `|col - CENTER_COL|` with ties resolving to the lower index; only open columns returned; `-1` only when the board is full
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.2 Write property test for immediate-win selection
    - **Feature: connect-4-game, Property 8: The AI takes an immediate win when one exists**
    - **Validates: Requirements 5.1**
    - Generate boards where at least one open column wins for the Computer; assert the chosen column wins immediately (min 100 iterations)

  - [x] 4.3 Write property test for blocking a Human win
    - **Feature: connect-4-game, Property 9: The AI blocks an immediate Human win**
    - **Validates: Requirements 5.2**
    - Generate boards with no Computer win and exactly one Human immediate threat; assert the chosen column blocks it (min 100 iterations)

  - [x] 4.4 Write property tests for center preference and open-column safety
    - **Feature: connect-4-game, Property 10: The AI otherwise chooses the open column closest to center**
    - **Validates: Requirements 5.3**
    - **Feature: connect-4-game, Property 11: The AI only ever chooses an open column**
    - **Validates: Requirements 5.4**
    - Assert center-minimizing selection when no win/block applies, and that the chosen column is always open when one exists (min 100 iterations each)

- [x] 5. Implement the game reducer
  - [x] 5.1 Implement `useGameReducer` state and actions
    - Define `GameState` (board, humanDisc, computerDisc, currentPlayer, status, selectedColumn, debug) and `GameAction` (`DROP`, `MOVE_SELECTION`, `RESTART`, `TOGGLE_DEBUG`)
    - DROP: reject when `status.kind !== 'playing'` or column full; else place disc, evaluate win via `checkWinAt` then draw, else toggle `currentPlayer`
    - MOVE_SELECTION: `(selectedColumn ± 1 + COLS) % COLS`; RESTART: fresh cleared board with `currentPlayer = 'human'`, preserving disc colours; TOGGLE_DEBUG: flip `debug`
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 4.7, 4.8, 6.1, 6.2, 6.5, 8.1_

  - [x] 5.2 Write property test for alternating players
    - **Feature: connect-4-game, Property 3: Valid drops alternate the current player**
    - **Validates: Requirements 3.2, 3.3**
    - Assert a valid non-terminal drop sets current player to the opponent (min 100 iterations)

  - [x] 5.3 Write property test for rejecting drops after game end
    - **Feature: connect-4-game, Property 7: An ended game rejects further drops**
    - **Validates: Requirements 4.8**
    - Generate won/drawn states; assert drops leave board and status unchanged (min 100 iterations)

  - [x] 5.4 Write property test for restart behavior
    - **Feature: connect-4-game, Property 13: Restart clears the board and preserves colours and counters**
    - **Validates: Requirements 6.5**
    - Assert RESTART yields an all-`null` board with Human current, preserving disc colours (counters live in App) (min 100 iterations)

- [x] 6. Implement keyboard and sound hooks
  - [x] 6.1 Implement `useKeyboard`
    - Attach a `keydown` listener while enabled; map Left/Right to MOVE_SELECTION (with wrap), Down to a Human DROP into `selectedColumn`, `R`/`r` to restart, `Q`/`q` to home
    - No-op for movement/drop while `currentPlayer === 'computer'` or the game has ended; `R` and `Q` always active; `preventDefault` on arrows
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1_

  - [x] 6.2 Write property test for selection wrap navigation
    - **Feature: connect-4-game, Property 12: Selection navigation wraps around the board**
    - **Validates: Requirements 6.1, 6.2**
    - Assert left yields `(i + 6) mod 7` and right yields `(i + 1) mod 7` for all indices (min 100 iterations)

  - [x] 6.3 Implement `useSound`
    - Preload one `HTMLAudioElement` per effect (`drop`, `win`, `draw`, `invalid`) on mount into a ref; `play` rewinds and plays unless `muted`; `invalid` only plays when `invalidEnabled`; catch and ignore play() rejections; expose `toggleMute`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 6.4 Write unit tests for the sound hook
    - Mock `HTMLAudioElement`; assert preload on mount, per-event playback, mute suppression, and invalid gated by `invalidEnabled`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 7. Checkpoint - Ensure all logic and hook tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI components
  - [x] 8.1 Implement `Cell` and `Board`
    - Render `board[col][row]` as a grid with sufficient Red/Yellow contrast; apply selected-column highlight class; in debug mode apply chain-highlight class to `longestChain` cells; optional drop-animation class
    - _Requirements: 2.1, 6.7, 8.4, 10.2, 10.3, 10.4_

  - [x] 8.2 Write RTL tests for Board and Cell
    - Assert grid rendering from a board, selected-column highlight, and chain highlighting when debug is on
    - _Requirements: 6.7, 8.4_

  - [x] 8.3 Implement `CurrentPlayerIndicator` and `StatusBar`
    - Render current-player and outcome text with `aria-live="polite"` for assistive technologies
    - _Requirements: 3.4, 4.7, 10.5_

  - [x] 8.4 Implement `ScorePanel` and `DebugPanel`
    - `ScorePanel` renders both win counters; `DebugPanel` renders the debug checkbox and, when enabled, Human and Computer `Max_Chain_Length` (1..4), hidden when disabled
    - _Requirements: 7.5, 8.1, 8.2, 8.3, 8.5_

  - [x] 8.5 Implement `HomeScreen`
    - Title "Connect 4"; two colour options ("Human plays Red" / "Human plays Yellow") defaulting to Red; Start Game control; win-counter display; keyboard-instruction text; emit selected colour and start event
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8_

  - [x] 8.6 Write RTL tests for HomeScreen and DebugPanel
    - Assert default Red selection, colour change, start emission, counter display, debug checkbox toggling chain-length visibility
    - _Requirements: 1.3, 1.4, 1.6, 8.2, 8.3, 8.5_

- [x] 9. Integration and wiring
  - [x] 9.1 Implement `GameScreen` composition and turn flow
    - Compose `Board`, `CurrentPlayerIndicator`, `StatusBar`, `ScorePanel`, `DebugPanel`; wire `useGameReducer`, `useKeyboard`, `useSound`
    - After a valid non-terminal Human drop, schedule the Computer move (via `setTimeout`) using `chooseComputerColumn` and dispatch its drop; play drop/win/draw/invalid sounds on the matching events
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 9.2, 9.3, 9.4, 9.5_

  - [x] 9.2 Implement `App` screen management and session-persistent counters
    - Own `screen: 'home' | 'game'`, Human colour, sound settings, and win counters `{ human, computer }`
    - Start Game transitions to Game with the selected colour; `Q` returns Home retaining counters; increment the winner's counter exactly once on a win-status change; preserve counters across new game / restart / return-home
    - _Requirements: 1.6, 4.4, 4.5, 6.6, 7.1, 7.2, 7.3, 7.4_

  - [x] 9.3 Write property test for win-counter increments
    - **Feature: connect-4-game, Property 5: Win increments only the winner's counter by one**
    - **Validates: Requirements 4.4, 4.5**
    - Assert a Human win adds 1 to Human only and a Computer win adds 1 to Computer only (min 100 iterations)

  - [x] 9.4 Write property test for counter persistence across transitions
    - **Feature: connect-4-game, Property 14: Win counters are preserved across non-scoring transitions**
    - **Validates: Requirements 7.2, 7.3, 7.4**
    - Assert new game, restart (`R`), and return-home (`Q`) each leave both counters unchanged (min 100 iterations)

  - [x] 9.5 Write RTL keyboard-only end-to-end flow test
    - Drive a full game via keyboard alone (Left/Right/Down/R/Q), asserting selection highlight, drops, win/draw status, restart, and return-home
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation.
- Property tests validate universal correctness properties (fast-check, minimum 100 iterations each, tagged per property).
- Unit and RTL example tests validate components, hooks, and the keyboard-only flow.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 4, "tasks": ["2.5", "2.6", "2.7", "4.1"] },
    { "id": 5, "tasks": ["2.8", "4.2", "4.3", "4.4", "5.1", "6.1", "6.3"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "6.2", "6.4", "8.1", "8.3", "8.4", "8.5"] },
    { "id": 7, "tasks": ["8.2", "8.6", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.5"] },
    { "id": 9, "tasks": ["9.3", "9.4"] }
  ]
}
```
