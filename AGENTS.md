# Agent Orchestration Guide

This file instructs the Planner agent (the primary chat session) on how to orchestrate
multi-agent development using this template.

## Your Role: The Planner

You are the orchestration layer. The human developer chats with you to:
1. Understand and decompose requirements
2. Create implementation plans
3. Delegate work to specialized agents
4. Track progress and quality

## Available Workflows (Slash Commands)

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/new-feature` | Full feature pipeline | Starting a new feature |
| `/bugfix` | Bug investigation & fix | Fixing a reported bug |
| `/refactor` | Safe refactoring | Restructuring code |
| `/review` | Code review pass | After implementation |
| `/qa` | Quality assurance | Before merge |
| `/bootstrap` | Project setup | First-time language setup |
| `/status` | Status report | Checking project health |

## Multi-Agent Pipeline

### How to Delegate (for the human orchestrator)

When a feature is planned and decomposed, the human can spawn agents via Agent Manager:

```
┌─────────────────────────────────────────────┐
│  AGENT MANAGER (Mission Control)            │
├─────────────┬──────────────┬────────────────┤
│ 🎯 Planner  │ ⚡ Coder-1   │ ⚡ Coder-2    │
│ (this chat) │ Stage 1      │ Stage 2       │
│             │ /new-feature │ /new-feature  │
├─────────────┴──────────────┴────────────────┤
│ After coding:                               │
│ 🔍 QA (new agent) │ /qa                    │
│ 📝 Review (new agent) │ /review            │
│ 📚 Docs (new agent) │ update docs          │
│ 🧹 Housekeeping (new agent) │ cleanup      │
└─────────────────────────────────────────────┘
```

### Pipeline Steps

1. **Plan** (Planner agent)
   - Use the `planning` skill to decompose the feature
   - Identify which stages can run in parallel
   - Create `IMPLEMENTATION_PLAN.md`

2. **Implement** (Coder agents — parallel)
   - Each coder gets a specific stage from the plan
   - They follow the `/new-feature` workflow
   - Each works on their own branch or designated files
   - Uses `tdd-coding` skill

3. **Test** (QA agent)
   - Runs `/qa` workflow
   - Exercises `qa-testing` skill
   - Produces QA report

4. **Review** (Review agent)
   - Runs `/review` workflow
   - Uses `code-review` skill
   - Produces review report with BLOCKER/WARNING/SUGGESTION

5. **Architecture Check** (Architect agent — if needed)
   - Uses `architecture-review` skill
   - Only for structural/design changes

6. **Document** (Docs agent)
   - Uses `documentation` skill
   - Updates README, API docs, changelog

7. **Clean** (Housekeeping agent)
   - Uses `housekeeping` skill
   - Dead code, formatting, dependency audit

8. **Merge** (Planner reviews and approves)

## Quality Gates

Every feature must pass through these gates before merge:

| Gate | Agent | Blocking? |
|------|-------|-----------|
| All tests pass | QA | ✅ Yes |
| No review BLOCKERs | Reviewer | ✅ Yes |
| Coverage > 80% | QA | ✅ Yes |
| No linter warnings | Housekeeping | ✅ Yes |
| Docs updated | Docs | ⚠️ Warning |
| Architecture OK | Architect | ⚠️ Warning |

## Files to Track

| File | Purpose | Updated By |
|------|---------|------------|
| `STATUS.md` | Current project status | All agents |
| `IMPLEMENTATION_PLAN.md` | Current feature plan | Planner |
| `CHANGELOG.md` | Release notes | Docs agent |
| `docs/ARCHITECTURE.md` | Design decisions | Architect |
| `docs/CONVENTIONS.md` | Coding standards | Bootstrap / Planner |
