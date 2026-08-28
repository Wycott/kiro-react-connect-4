# Dev Quick-Start — Connect 4

A browser-based Connect 4 game (human vs. computer) built with React 18 +
TypeScript, bundled by Vite, and tested with Vitest + fast-check + React Testing
Library. It is entirely client-side — no backend, database, or network services.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Required for Vite 6 and the tooling; verified on Node 24.16.0 |
| npm | 9+ | Package manager; verified on npm 11.13.0 |

No external services (Redis, databases, etc.) are needed — everything runs in
the browser.

## Install

```bash
npm install
```

## Build

Type-checks with the project references (`tsc -b`) and then produces the
production bundle with Vite. A type error fails the build.

```bash
npm run build
```

Output is emitted to `dist/`. Verified clean (bundle ~154 kB JS / ~2.8 kB CSS).

## Run

### Dev Server

```bash
npm run dev
```

Starts the Vite dev server with hot module replacement. It serves on
`http://localhost:5173` by default (Vite prints the exact URL on start). Run it
in your own terminal — it is a long-running process.

### Preview a Production Build

```bash
npm run build
npm run preview
```

`preview` serves the built `dist/` locally so you can sanity-check the
production output.

## Test

```bash
npm test
npm run test:watch
npm run coverage
```

- `npm test` runs the full suite once (non-watch); `test:watch` is watch mode;
  `coverage` adds a v8 coverage report.
- Tests run under Vitest in a jsdom environment (`vite.config.ts`), with globals
  enabled and matchers from `@testing-library/jest-dom` loaded via
  `src/test/setup.ts`.
- The suite mixes fast-check property tests (pure game logic), RTL component
  tests, and full keyboard-driven end-to-end tests.
- Coverage writes a terminal summary plus an HTML report to `./coverage`
  (open `coverage/index.html`).

**Known slow tests:** the App-level keyboard flows
(`src/components/App.keyboardFlow.test.tsx`, `App.winCounter.test.tsx`) drive a
full game with real timers and wait for the computer's ~400 ms move between
turns, so each takes several seconds. They have generous per-test timeouts.

## Key Entry Points

| File | Role | What It Does |
|------|------|--------------|
| `index.html` | HTML shell | Hosts `#root` and loads `/src/main.tsx` |
| `src/main.tsx` | Bootstrap | Mounts `<App />` into `#root` under React `StrictMode` |
| `src/components/App.tsx` | Screen manager | Owns the active screen, chosen disc colour, and session win counters |
| `src/components/GameScreen.tsx` | Game composition | Wires the reducer + keyboard + sound hooks and composes the board/panels |
| `src/hooks/useGameReducer.ts` | State | Pure `gameReducer` (DROP / MOVE_SELECTION / RESTART / TOGGLE_DEBUG) plus its hook |
| `src/logic/gameLogic.ts` | Rules | Drop mechanics, win/draw detection, longest-chain |
| `src/logic/ai.ts` | Opponent | `chooseComputerColumn` heuristic (win -> block -> centre) |

## Architecture at a Glance

Three layers with a strict inward dependency direction (components -> hooks ->
logic):

- **`src/logic`** — pure, framework-free rules and types. No React, no side
  effects. This is what the property tests target directly.
- **`src/hooks`** — React state (`useGameReducer`) and isolated I/O
  (`useKeyboard` for the document keydown listener, `useSound` for audio).
- **`src/components`** — presentational and composition components. `App` and
  `GameScreen` wire things together; leaf components (`Board`, `Cell`,
  `StatusBar`, etc.) are close to pure functions of their props.

The game is keyboard-first: Left/Right move the selected column, Down drops,
`R` restarts, `Q` returns home.

## Debugging Tips

- **Debug panel.** In-game there is a "Debug mode" checkbox
  (`DebugPanel`) that toggles the reducer's `debug` flag. When on, the board
  highlights each player's longest chain (via `longestChain`) and shows the
  chain lengths — useful for reasoning about win/near-win detection.
- **Isolate the rules.** Because `src/logic` is pure, you can reproduce and step
  through any board situation in a unit test without rendering the UI.
- **Where the computer moves.** The opponent's turn is scheduled in a
  `useEffect` in `GameScreen.tsx` via a `setTimeout` using
  `COMPUTER_MOVE_DELAY_MS` (400 ms); the column comes from
  `chooseComputerColumn`.
- **Turn/outcome state.** `GameStatus` is a discriminated union
  (`playing` / `win` / `draw`); inspect the reducer state to see whose turn it
  is and why a drop was accepted or rejected.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Missing/misnamed sound assets | No sound; `play()` rejects and is swallowed silently | Ensure `public/sounds/drop.mp3`, `win.mp3`, `lose.mp3`, `draw.mp3`, `invalid.mp3` exist and match `SOUND_SOURCES` in `src/hooks/useSound.ts` |
| Browser autoplay policy | First sound does not play | Audio only plays after a user gesture (a keypress/click); the first drop satisfies this |
| Stale 404s after adding assets | Sounds still silent right after adding files | Hard-refresh the browser so cached 404s are dropped |
| Unused local/param | The build fails (tsc) even though tests pass | `tsconfig.app.json` sets `noUnusedLocals`/`noUnusedParameters`; remove the unused symbol |
| Launching a long-running server from a script/CI | Command hangs | The dev/preview servers are long-running; use the one-shot build/test commands for verification |

## Configuration & Assets

- **`vite.config.ts`** — React plugin, CSS Modules (`camelCaseOnly`), jsdom test
  environment, and v8 coverage config (reports to `./coverage`, excludes test
  files, `src/test/**`, `src/logic/testGenerators.ts`, `src/main.tsx`, and
  `.d.ts`).
- **`tsconfig.json`** — a solution file referencing `tsconfig.app.json` (app
  sources, strict) and `tsconfig.node.json` (tooling).
- **`public/sounds/*.mp3`** — static sound assets served at `/sounds/*.mp3`.
- No environment variables or secrets are required to build, run, or test.

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite dev server (HMR) on http://localhost:5173 |
| `npm run build` | Type-check (`tsc -b`) and build the production bundle to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Run the full test suite once (non-watch) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run coverage` | Run tests with a v8 coverage report (HTML in `./coverage`) |
