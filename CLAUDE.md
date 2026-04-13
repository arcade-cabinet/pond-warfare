---
title: Project Guide — Pond Warfare
updated: 2026-04-13
status: current
domain: technical
---

# CLAUDE.md — Pond Warfare Project Guide

Use [AGENTS.md](AGENTS.md) for the full architecture, design system, file map, and gameplay conventions.

## Canonical References

Use these as the current source of truth:

- [docs/unit-model.md](docs/unit-model.md)
- [docs/gameplay.md](docs/gameplay.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/balance-model.md](docs/balance-model.md)
- [configs/unit-model.json](configs/unit-model.json)

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
pnpm lint:fix
pnpm verify:release
```

## Non-Negotiables

1. Keep files under the repo size guard.
2. Add or update tests for every behavioral change.
3. Do not leave live docs or player-facing copy on obsolete terminology.
4. Verify with `pnpm typecheck` and `pnpm test` before shipping.
5. Run relevant browser coverage when UI, match flow, or pointer behavior changes.

## Canonical Game Snapshot

- One mode: defend the Lodge through escalating match events.
- In-match resources are Fish, Rocks, Logs, and Food cap.
- Metagame currencies are Clams and Pearls.
- Manual roster: `Mudpaw`, `Medic`, `Sapper`, `Saboteur`.
- Pearl specialists are trainable in-match after blueprint unlock:
  `Fisher`, `Logger`, `Digger`, `Guard`, `Ranger`, `Bombardier`, `Shaman`, `Lookout`.
- Pearl specialists are autonomous by radius assignment, not free match-start auto-deploys.
- `Ranger` and `Bombardier` use dual-zone specialist geometry with `anchor_radius`, `engagement_radius`, and `projection_range`.
- The baseline run must stay technically playable through the first exposure to all six stages without spending Clams or Pearls.

## Minimum Verification

Before merging gameplay or UI work:

- `pnpm typecheck`
- `pnpm test`
- relevant browser Vitest coverage for menu, match flow, or pointer interactions
- manual smoke of the live loop being touched

Baseline smoke examples:

- start a match from the landing page
- train a `Mudpaw` from the Lodge
- send the `Mudpaw` to gather a resource node
- if Pearl specialist flow changed, unlock or field the specialist and verify radius assignment
