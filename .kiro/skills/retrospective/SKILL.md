---
name: retrospective
description: Writes retrospective documentation explaining what the original developers were probably trying to achieve, including inferred design patterns, conventions, and architectural philosophy.
---

# Retrospective Skill

## Description

Writes retrospective documentation for the Connect 4 solution, explaining what the original developers were probably trying to achieve. Infers design patterns, conventions, and architectural philosophy from the code as it exists today.

## Trigger

When the user asks for "retrospective", "design intent", "what were they thinking", "architectural philosophy", or "design rationale".

## Instructions

Analyse the solution's code, structure, and history to reverse-engineer the original design intent.

### Procedure

1. Read `package.json`, the config files, and the `src/` structure to understand the overall shape.
2. Read the tooling choices (Vite, TypeScript strictness, Vitest, fast-check) to infer the team's quality and testing priorities.
3. Read key source files across all layers to identify:
   - Design patterns in use (reducer pattern, pure functional core, immutable updates, discriminated unions, custom hooks)
   - Naming conventions and coding style
   - Abstraction levels and separation between logic, state, and UI
   - Separation of concerns (pure `logic` vs React `hooks`/`components`)
4. Run `git log --oneline -30` to see recent commit messages for context on development direction.
5. Run `git log --oneline --reverse` (and inspect the first ~20 commits) for original intent.
6. Look for evidence of:
   - Evolutionary architecture (incremental changes vs big-bang design)
   - Refactoring history
   - Abandoned patterns or dead code
   - Decisions motivated by testability (e.g. keeping game logic pure so it can be property-tested)
7. Write `retrospective.md` using the Output Format below.

### Output Format

```markdown
# Retrospective — Connect 4

## Original Intent

<What the developers were probably trying to build and why. Infer from the domain, naming, and structure.>

## Design Patterns Observed

| Pattern | Where | Evidence | Likely Motivation |
|---------|-------|----------|-------------------|
| Reducer pattern | hooks/useGameReducer.ts | Pure `gameReducer` + `useReducer` wrapper | Predictable, testable state transitions |
| Pure functional core | logic/gameLogic.ts | Board updates return new arrays, never mutate | Enable property-based testing and easy reasoning |

## Conventions & Style

<Describe the coding conventions evident in the codebase: naming (e.g. `'R'`/`'Y'` discs, `board[col][row]`), file organisation by layer, JSDoc comment style, sentinel values, immutability.>

## Architectural Philosophy

<What layering/separation strategy was the team following? Evidence for a pure-logic core with React confined to hooks and components; how the discriminated-union GameStatus and immutable board support this.>

## Evolution Over Time

<How has the codebase evolved? What was likely built first (types and logic) vs later (UI, sound, win-line highlight, coverage)? Reference the commit history.>

## Things That Worked

<Design decisions that seem to have paid off — the pure logic core, the reducer, clear layer boundaries, strong test coverage.>

## Things That Drifted

<Areas where the original intent seems compromised — inconsistencies, shortcuts, or technical debt (e.g. placeholder audio paths, test-only helpers, sentinel-value overloading).>

## Unanswered Questions

<Things that are unclear from the code alone — decisions that could have gone either way, missing documentation, ambiguous naming.>
```

### Rules

- Read actual source files and git history — do not guess at intent without evidence.
- Be charitable in interpretation — assume competent developers making pragmatic tradeoffs.
- Distinguish between "probably intentional" and "probably accidental" with clear reasoning.
- Reference specific files, functions, or patterns as evidence for claims.
- Avoid prescriptive recommendations — this is a descriptive/analytical document.
- Write the report to `retrospective.md` in the repository root, overwriting any existing content.
