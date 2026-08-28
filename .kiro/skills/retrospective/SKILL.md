---
name: retrospective
description: Writes retrospective documentation explaining what the original developers were probably trying to achieve, including inferred design patterns, conventions, and architectural philosophy.
---

# Retrospective Skill

## Description

Writes retrospective documentation for the RogedoPoker solution, explaining what the original developers were probably trying to achieve. Infers design patterns, conventions, and architectural philosophy from the code as it exists today.

## Trigger

When the user asks for "retrospective", "design intent", "what were they thinking", "architectural philosophy", or "design rationale".

## Instructions

Analyse the solution's code, structure, and history to reverse-engineer the original design intent.

### Procedure

1. Read the solution file(s) and project structure to understand the overall shape.
2. Read `.csproj` files to identify framework evolution, dependency choices, and project organisation.
3. Read key source files across all projects to identify:
   - Design patterns in use (Factory, Decorator, Strategy, Repository, etc.)
   - Naming conventions and coding style
   - Abstraction levels and interface usage
   - Separation of concerns
4. Run `git log --oneline -30` to see recent commit messages for context on development direction.
5. Run `git log --oneline --reverse | head -20` to see early commits for original intent.
6. Look for evidence of:
   - Evolutionary architecture (incremental changes vs big-bang design)
   - Refactoring history
   - Abandoned patterns or dead code
   - Performance-motivated decisions
7. Write `retrospective.md` using the Output Format below.

### Output Format

```markdown
# Retrospective — RogedoPoker

## Original Intent

<What the developers were probably trying to build and why. Infer from the domain, naming, and structure.>

## Design Patterns Observed

| Pattern | Where | Evidence | Likely Motivation |
|---------|-------|----------|-------------------|
| Factory | AnalysisEngine.Domain.Factory | Factory class constructs deck/deal/hands | Encapsulate complex object creation |

## Conventions & Style

<Describe the coding conventions evident in the codebase: naming, file organisation, comment style, error handling approach.>

## Architectural Philosophy

<What layering/separation strategy was the team following? Was it Clean Architecture, Onion, N-tier, or something informal? What evidence supports this?>

## Evolution Over Time

<How has the codebase evolved? What was likely built first? What was added later? Any signs of pivots or scope changes?>

## Things That Worked

<Design decisions that seem to have paid off — code that's clean, well-separated, easy to test.>

## Things That Drifted

<Areas where the original intent seems to have been lost or compromised over time. Inconsistencies, shortcuts, or technical debt.>

## Unanswered Questions

<Things that are unclear from the code alone — decisions that could have gone either way, missing documentation, ambiguous naming.>
```

### Rules

- Read actual source files and git history — do not guess at intent without evidence.
- Be charitable in interpretation — assume competent developers making pragmatic tradeoffs.
- Distinguish between "probably intentional" and "probably accidental" with clear reasoning.
- Reference specific files, classes, or patterns as evidence for claims.
- Avoid prescriptive recommendations — this is a descriptive/analytical document.
- Write the report to `retrospective.md` in the repository root, overwriting any existing content.
