---
name: OpenAPI and migration checks
description: Workspace-specific generation and migration validation constraints.
---

OpenAPI codegen depends on the source YAML being strictly parseable; a pre-existing indentation error in an unrelated schema can make Orval report only a generic input-resolution failure. Drizzle migration checks can also report an existing snapshot-parent collision while still accepting a valid additive migration.

**Why:** Generation and migration tooling errors can be misleading when the underlying repository already contains metadata drift.

**How to apply:** Parse or run codegen after contract edits, inspect the first YAML parser location if Orval fails, and treat the migration checker’s explicit final sync result separately from unrelated snapshot warnings.