# Retrospective — Connect 4

## Original Intent

The developers set out to build a browser-based Connect 4 game in which a single
human plays against a computer opponent, playable entirely from the keyboard.
The domain vocabulary is unambiguous throughout — `Disc` (`'R'` | `'Y'`),
`Board`, `Player`, `GameStatus`, `Coord`, `dropDisc`, `checkWinAt`,
`chooseComputerColumn` — which signals an intent to model the rules of the game
faithfully as a first-class concern rather than smearing them across UI event
handlers.

The strongest tell about original intent is the split between a pure,
framework-free rules engine (`src/logic`) and the React layer that renders it
(`src/hooks`, `src/components`). Correctness was clearly a headline goal: the
game rules live in small, side-effect-free functions and are exercised by
property-based tests (fast-check). The team wanted to be able to assert general
truths — "a disc always lands in the lowest empty row", "a full column is
rejected without change", "four-in-a-row is detected in every direction",
"restart clears the board and preserves colours and counters" — not just
example cases.

Accessibility and input ergonomics were also in scope from the start: a
keyboard-first control scheme (arrows to move/drop, R to restart, Q to home),
`aria-live` status regions, and colour choice on the home screen all point to a
game meant to be operable and legible without a mouse.

## Design Patterns Observed

| Pattern | Where | Evidence | Likely Motivation |
|---------|-------|----------|-------------------|
| Pure functional core | `src/logic/gameLogic.ts` | `dropDisc` copies the affected column and never mutates its input; every helper returns new data | Make the rules trivially testable and easy to reason about |
| Reducer pattern | `src/hooks/useGameReducer.ts` | Pure `gameReducer(state, action)` wrapped by a thin `useGameReducer` hook via `useReducer` | Centralise all state transitions in one predictable, unit-testable function |
| Discriminated union (state machine) | `src/logic/types.ts` `GameStatus` | `{ kind: 'playing' } | { kind: 'win'; ... } | { kind: 'draw' }` | Make illegal states unrepresentable and force exhaustive handling |
| Strategy-as-function | `src/logic/ai.ts` `chooseComputerColumn` | A single pure function encoding a prioritised heuristic (win -> block -> centre) | Keep the AI swappable and independently testable |
| Custom hooks for I/O isolation | `src/hooks/useKeyboard.ts`, `src/hooks/useSound.ts` | Side effects (DOM listeners, audio) are quarantined behind hooks with a handler/ref pattern | Keep components declarative and side effects contained |
| Lifted state / ownership boundary | `src/components/App.tsx` | `App` owns screen + win counters; `GameScreen` is remounted via a changing `key` (`gameId`) to reset per-game state | Persist session data across games while cheaply resetting the board |
| Shared constant vectors | `src/logic/gameLogic.ts` `DIRECTIONS` | One `[colDelta, rowDelta]` table reused by win- and chain-scanning | Avoid duplicating the four-axis scan logic |

## Conventions & Style

- **Naming.** Terse but meaningful domain terms: single-letter disc codes
  `'R'`/`'Y'`, `col`/`row` throughout, `COLS`/`ROWS`/`CONNECT`/`CENTER_COL` as
  named constants rather than magic numbers.
- **File organisation by layer.** `src/logic` (pure rules + types), `src/hooks`
  (state and I/O), `src/components` (presentation). Tests sit beside the code
  they cover with descriptive multi-part names
  (`gameLogic.winDetection.test.ts`, `useGameReducer.restart.test.ts`,
  `App.keyboardFlow.test.tsx`).
- **Documentation.** Almost every exported function and component carries a
  JSDoc block describing behaviour and edge cases. Several files even cite the
  requirement numbers they satisfy (`Validates: Requirements ...`), tying code
  back to a spec.
- **Immutability.** State transitions return new objects/arrays; the board is
  copied at the column granularity in `dropDisc`. React state is updated with
  functional updaters (`setWinCounters((c) => ...)`).
- **Sentinel values.** `-1` is used as an explicit "none" across boundaries:
  `landedRow: -1` on a failed drop, `chooseComputerColumn` returning `-1` for a
  full board, and `selectedColumn={-1}` to suppress the column highlight once a
  game ends.
- **Strictness.** `tsconfig.app.json` enables `strict`, `noUnusedLocals`,
  `noUnusedParameters`, and `noFallthroughCasesInSwitch`; the build runs
  `tsc -b` before `vite build`, so type errors fail the build.

## Architectural Philosophy

The codebase follows an informal but disciplined layered architecture with a
**pure core** at the centre. `src/logic` depends on nothing but itself (and its
own `types.ts`, effectively a leaf). `src/hooks` depends on `logic`.
`src/components` depends on both, but pushes all rules and mutation down into
the reducer and logic layer, keeping itself close to a pure function of props
and state. The dependency direction is consistently components -> hooks ->
logic, never the reverse.

This is the "functional core, imperative shell" philosophy applied to a React
app: deterministic game rules in the middle, with the messy edges (keyboard
events, audio playback, timers, screen navigation) held at arm's length in
hooks and the `App`/`GameScreen` shell. The discriminated-union `GameStatus`
acts as an explicit state machine, and the reducer is the single writer of game
state, which makes the whole system easy to test without rendering anything.

## Evolution Over Time

The git history is short and legible:

1. `a34e374 Initial commit` / `b81d1a7 Initial checkin` — the bulk of the game:
   types, logic, AI, hooks, components, and the property/RTL test suite, built
   in a spec-driven fashion (a `.kiro/specs/connect-4-game` spec accompanies the
   code, and source comments reference requirement numbers).
2. `7403547 Show win line` — a feature refinement: the winning four are
   highlighted on a win, reusing the existing cell-highlight machinery, and the
   selected-column highlight is suppressed once the game ends.
3. `db585dc Add support for coverage` — tooling maturity: a `coverage` script
   and the v8 coverage provider were added after the game itself was complete.

The trajectory is core-first: the rules and their tests came first, the UI was
composed on top, and later commits are polish (visual win feedback) and
developer-experience (coverage). There are no signs of a pivot or an abandoned
architecture — the layering present at the initial commit is the layering that
remains.

## Things That Worked

- **The pure logic core paid off.** Because `gameLogic.ts` and `ai.ts` are
  side-effect-free, they are covered by property-based tests that assert general
  invariants, not just examples. This is the cleanest, most reusable part of the
  codebase.
- **Clear layer boundaries.** The components -> hooks -> logic direction is
  respected everywhere, so it is easy to find where anything lives.
- **The reducer as single source of truth.** All game transitions funnel through
  `gameReducer`, making turn-taking, win/draw detection, and restart behaviour
  easy to test in isolation.
- **Ownership of persistent state.** Lifting win counters into `App` and
  remounting `GameScreen` via a `key` is a tidy way to reset a game without
  resetting the session — an idiomatic React solution to a real requirement.
- **Requirement traceability.** JSDoc that cites requirement numbers makes the
  intent behind non-obvious code (e.g. the once-per-transition win notification)
  self-documenting.

## Things That Drifted

- **Placeholder audio, then real assets.** `useSound.ts` was written with
  optional/placeholder sources and the comment "Actual audio assets are optional
  at runtime"; the file paths and extensions have since been reconciled to real
  `public/sounds/*.mp3` files. The swallowed `play()` rejection is deliberate but
  means a missing/incorrect asset fails completely silently — convenient in
  tests, easy to miss in production.
- **Gating responsibility split.** `useKeyboard` intentionally does no
  game-state gating and leaves "no-op while it's the computer's turn or the game
  ended" to the caller. This keeps the hook reusable but means the rule is
  enforced in `GameScreen` instead — correct, but the invariant lives away from
  the hook that fires the events.
- **Sentinel overloading.** `-1` means several different "none" concepts
  (failed-drop row, no-column-chosen AI result, and suppressed selection
  highlight). Individually clear, collectively a convention a newcomer must
  learn.
- **`checkWinAt` can return more than four cells.** A run of five or more reports
  the full run, and `useGameReducer` stores exactly those cells as
  `status.cells`. This is handled consistently downstream, but the "winning
  cells" set is not strictly capped at four the way `longestChain` is.

## Unanswered Questions

- **Why WAV first, then MP3?** The original sources targeted `.wav` before being
  changed to `.mp3`. Whether that was a format-support decision, an asset
  availability decision, or simply following whatever files were on hand is not
  recoverable from the code.
- **Is the 400 ms computer delay a UX choice or a placeholder?**
  `COMPUTER_MOVE_DELAY_MS = 400` reads like a deliberate "let the human's move
  settle" pause, but there is no note on how the value was chosen.
- **How far was the AI meant to look?** `chooseComputerColumn` stops at
  immediate win / immediate block / centre preference. It is unclear whether a
  deeper search was ever intended and deliberately scoped out, or simply never
  needed for the target difficulty.
- **Was a sound on/off toggle intended beyond in-game mute?** There is a
  `Mute`/`Unmute` control in `GameScreen`, but no persisted, app-level sound
  setting — leaving open whether a home-screen sound option was planned.
