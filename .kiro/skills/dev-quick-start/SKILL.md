---
name: dev-quick-start
description: Writes a quick-start onboarding guide for a developer returning to this codebase after years away.
---

# Dev Quick-Start Skill

## Description

Writes a quick-start onboarding guide for a developer returning to the Connect 4 codebase after time away. Covers how to build, how to run, key entry points, debugging tips, and common pitfalls.

## Trigger

When the user asks for "quick start", "dev quick start", "onboarding", "getting started", or "how to run".

## Instructions

Analyse the solution to produce a practical developer onboarding guide.

### Procedure

1. Read `package.json` to identify:
   - Runtime dependencies (React, React DOM) and their versions
   - Dev tooling (Vite, TypeScript, Vitest, fast-check, Testing Library, coverage provider)
   - The available npm scripts (`dev`, `build`, `preview`, `test`, `test:watch`, `coverage`)
2. Read the config files (`vite.config.ts`, `tsconfig*.json`) to determine build/test setup, the jsdom test environment, CSS Modules handling, and coverage configuration.
3. Read entry points (`index.html`, `src/main.tsx`, `src/components/App.tsx`) to identify how the app boots and how screens (Home / Game) are selected.
4. Identify the dev server, build, and test commands, and any static assets required (e.g. `public/sounds/*.mp3`).
5. Read key source files to identify the main code paths a developer would need to understand first (pure logic in `src/logic`, state in `src/hooks/useGameReducer.ts`, composition in `src/components/GameScreen.tsx`).
6. Note any configuration or environment setup required (Node version, asset files, browser autoplay considerations for sound).
7. Write `dev-quick-start.md` using the Output Format below.

### Output Format

```markdown
# Dev Quick-Start — Connect 4

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Required to run Vite 6 and the tooling |
| npm | 9+ | Package manager |

## Install

<Command to install dependencies.>

## Build

<Commands to type-check and build the production bundle, and how to verify it compiles cleanly.>

## Run

### Dev Server

<How to start the Vite dev server, the URL it serves on, and how to preview a production build.>

## Test

<How to run the test suite (unit + property + RTL), the coverage command, and any known slow tests (e.g. the real-timer keyboard end-to-end flow).>

## Key Entry Points

| File | Role | What It Does |
|------|------|--------------|
| `src/main.tsx` | Bootstrap | Mounts `<App />` into the DOM |
| `src/components/App.tsx` | Screen manager | Owns screen, chosen colour, and session win counters |

## Architecture at a Glance

<Brief description of the layers — pure logic (`src/logic`), state and I/O hooks (`src/hooks`), and presentational/composition components (`src/components`).>

## Debugging Tips

<Practical tips: enabling the in-game Debug panel (longest-chain highlight), inspecting reducer actions, and where the Computer move is scheduled.>

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Missing sound assets | No sound; `play()` promise rejects silently | Ensure `public/sounds/*.mp3` exist and match the paths in `useSound.ts` |
| Browser autoplay policy | First sound does not play | A user gesture (keypress/click) is required before audio plays |

## Configuration & Assets

<Any config or static assets needed: CSS Modules, the `public/sounds` folder, coverage output in `./coverage`. Do NOT include any secret values.>

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build the production bundle |
| `npm test` | Run the full test suite once (non-watch) |
| `npm run coverage` | Run tests with a v8 coverage report |
```

### Rules

- Read actual config and source files — do not guess at commands or setup.
- Verify build and test commands work before recommending them.
- Be specific about versions, ports, and paths.
- Note platform-agnostic behaviour: this is a browser app built with Vite; there are no server-side services to run.
- Flag any static assets (sound files) that must be present for full functionality.
- Keep the tone practical and direct — this is for a developer who needs to get productive fast.
- Write the report to `dev-quick-start.md` in the repository root, overwriting any existing content.
