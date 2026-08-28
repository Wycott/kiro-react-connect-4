---
name: dev-quick-start
description: Writes a quick-start onboarding guide for a developer returning to this codebase after years away.
---

# Dev Quick-Start Skill

## Description

Writes a quick-start onboarding guide for a developer returning to the RogedoPoker codebase after time away. Covers how to build, how to run, key entry points, debugging tips, and common pitfalls.

## Trigger

When the user asks for "quick start", "dev quick start", "onboarding", "getting started", or "how to run".

## Instructions

Analyse the solution to produce a practical developer onboarding guide.

### Procedure

1. Read solution file(s) to identify all projects and their roles.
2. Read `.csproj` files to determine:
   - Target framework and SDK version
   - Required tooling (e.g. .NET SDK version)
   - External service dependencies (Redis, RabbitMQ, databases)
3. Read entry points (`Program.cs`, form constructors, `Startup.cs`) to identify how to launch each runnable project.
4. Read `launchSettings.json` or equivalent for ports, URLs, environment variables.
5. Identify build commands, test commands, and any scripts (`.bat`, `.sh`).
6. Read key source files to identify the main code paths a developer would need to understand first.
7. Note any configuration, secrets, or environment setup required.
8. Write `dev-quick-start.md` using the Output Format below.

### Output Format

```markdown
# Dev Quick-Start — RogedoPoker

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| .NET SDK | 10.0 | Required for all projects |

## Build

<Commands to restore, build, and verify the solution compiles cleanly.>

## Run

### <Project Name>

<How to run this project, any required configuration, URLs/ports it listens on.>

## Test

<How to run the test suite, expected output, any known slow tests.>

## Key Entry Points

| Project | Entry Point | What It Does |
|---------|------------|--------------|
| AnalysisEngineRunner.WebUI | `Program.cs` → `Startup.cs` | ASP.NET MVC web app for running poker analysis |

## Architecture at a Glance

<Brief description of how the projects relate — which is the domain, which is the UI, which is the wrapper.>

## Debugging Tips

<Practical tips for debugging: breakpoint locations, how to isolate issues, useful watch expressions.>

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Redis not running | DataCaching throws connection timeout | Start Redis via Docker: `docker run -d -p 6379:6379 redis` |

## Configuration & Secrets

<Any appsettings, environment variables, or connection strings needed. Do NOT include actual secret values.>

## Useful Commands

| Command | Purpose |
|---------|---------|
| `dotnet build PokerToolsBuild.sln` | Build all projects |
| `dotnet test PokerToolsBuild.sln` | Run all unit tests |
```

### Rules

- Read actual project files and source code — do not guess at configuration or commands.
- Verify build and test commands work before recommending them.
- Be specific about versions, ports, and paths.
- Note any platform requirements (Windows-only for WinForms projects, etc.).
- Flag any external services that need to be running for the solution to work fully.
- Keep the tone practical and direct — this is for a developer who needs to get productive fast.
- Write the report to `dev-quick-start.md` in the repository root, overwriting any existing content.
