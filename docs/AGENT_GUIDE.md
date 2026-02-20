# Agent Guide

How to use this multi-agent development template with Antigravity IDE.

## Quick Start

1. **Clone/copy** this template for a new project
2. **Open** the project in Antigravity IDE
3. **Run** `/bootstrap` to set up your language/framework
4. **Start developing** with `/new-feature`

## Agent Roles

| Role | What They Do | Workflow |
|------|-------------|----------|
| 🎯 **Planner** | Decomposes features, creates plans | `planning` skill |
| ⚡ **Coder** | Implements with TDD | `/new-feature`, `/bugfix` |
| 🔍 **QA** | Tests, coverage, gaps | `/qa` |
| 📝 **Reviewer** | Code review | `/review` |
| 📐 **Architect** | Design review | `architecture-review` skill |
| 📚 **Docs** | Documentation | `documentation` skill |
| 🧹 **Housekeeping** | Cleanup | `housekeeping` skill |

## How to Work

### Solo Mode (Single Agent)
Use workflows sequentially in one chat:
1. `/new-feature` — plans, codes, tests, reviews in one flow

### Multi-Agent Mode (Parallel)
Use Agent Manager to spawn multiple agents:
1. **Planner chat**: decompose the feature into stages
2. **Spawn Coder agents**: one per stage, each runs `/new-feature`
3. **Spawn QA agent**: runs `/qa` after coders finish
4. **Spawn Review agent**: runs `/review`
5. **Spawn Docs agent**: updates documentation
6. **Planner reviews**: checks all reports, approves merge

### Pipeline Flow
```
Plan → Code (parallel) → QA → Review → Docs → Merge
```

## Available Slash Commands

| Command | Description |
|---------|-------------|
| `/new-feature` | Full feature development pipeline |
| `/bugfix` | Bug investigation and fix |
| `/refactor` | Safe refactoring with test safety net |
| `/review` | Structured code review |
| `/qa` | QA testing pass |
| `/bootstrap` | Set up language/framework |
| `/status` | Project status report |

## Quality Gates

Every change must pass:
- ✅ All tests pass
- ✅ No review BLOCKERs
- ✅ Coverage adequate
- ✅ Linter clean
- ✅ Docs updated

## Key Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent orchestration instructions |
| `STATUS.md` | Current project status |
| `IMPLEMENTATION_PLAN.md` | Active feature plan |
| `CHANGELOG.md` | Release notes |
| `docs/ARCHITECTURE.md` | Architecture decisions |
| `docs/CONVENTIONS.md` | Coding standards |
