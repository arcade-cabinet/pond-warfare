---
title: Outstanding Work
updated: 2026-04-16
status: current
domain: planning
---

# Outstanding Work

This is the canonical inventory of remaining product work after branch and PR triage on 2026-04-16.

The execution task for that work lives in [tasks/prd-production-complete.md](../tasks/prd-production-complete.md).

## Branch / PR State

- Open pull requests: `0`
- Mergeable non-`main` remote branches: `0`
- Remaining remote branches outside `main`: `0`

## Branch Disposition

The stale `feat/v3.1-commander-flow` branch was intentionally not merged and has been deleted.

If commander ideas are still wanted later, rebuild them from fresh branches off `main`.

## Canonical Remaining Product Work

1. Single-player hardening
2. Multiplayer production surface
3. Custom modifiers
4. Campaign
5. Cosmetics / store

See [tasks/prd-production-complete.md](../tasks/prd-production-complete.md) for scope, acceptance criteria, and production gates.

## Execution Rule

Until the roadmap above is complete:
- branch from `main`
- keep exactly one active production PR at a time unless parallel work is truly independent
- squash merge to `main`
- delete stale feature branches after integration
