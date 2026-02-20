# Architecture

> This document will be populated after running `/bootstrap` with your chosen
> language and framework.

## Principles
- Composition over inheritance
- Dependency injection for testability
- Clean architecture / hexagonal architecture
- Dependencies flow inward: Infrastructure → Application → Domain

## Layers
```
┌─────────────────────────┐
│    Presentation/UI      │  ← Controllers, Routes, CLI
├─────────────────────────┤
│    Application Logic    │  ← Use cases, Services
├─────────────────────────┤
│     Domain/Core         │  ← Entities, Business rules
├─────────────────────────┤
│    Infrastructure       │  ← DB, APIs, File system
└─────────────────────────┘
```

## Key Decisions
Document architectural decisions as ADRs in `docs/adr/`.

See the `architecture-review` skill for review criteria.
