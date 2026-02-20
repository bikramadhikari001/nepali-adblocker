# Coding Conventions

> This document will be populated with language-specific conventions
> after running `/bootstrap`.

## General Conventions

### Naming
- Use descriptive, intention-revealing names
- Functions: `verb + noun` pattern
- Booleans: question form (`isValid`, `hasPermission`)
- Constants: `UPPER_SNAKE_CASE`

### File Organization
- One primary export per file
- Group by feature/domain, not by type
- Keep files under 300 lines

### Functions
- Max 20 lines (guideline)
- Max 3 parameters
- Prefer pure functions

### Comments
- Explain WHY, not WHAT
- Public APIs must have doc comments

### Error Handling
- Use the language's idiomatic error handling
- Include context in error messages
- Never silently ignore errors

## Language-Specific Conventions
_To be added after `/bootstrap`_
