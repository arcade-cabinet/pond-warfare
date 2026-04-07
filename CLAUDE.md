# CLAUDE.md

Use [AGENTS.md](AGENTS.md) for the full project map and conventions.

Use these as the canonical gameplay sources:
- [docs/unit-model.md](docs/unit-model.md)
- [docs/gameplay.md](docs/gameplay.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/balance-model.md](docs/balance-model.md)

## Commands

```bash
pnpm dev
pnpm test
pnpm typecheck
pnpm build
pnpm lint:fix
```

## Non-Negotiables

1. Keep files under the repo size guard.
2. Add or update tests for every behavioral change.
3. Do not leave live docs or player-facing copy on obsolete terminology.
4. Verify with `pnpm typecheck` and `pnpm test` before shipping.
5. Run the relevant browser suites when UI or gameplay flow changes.

## Canonical Game Snapshot

- One mode: defend the Lodge across escalating match events.
- Clams are current-run pressure relief between matches.
- Pearls are permanent prestige currency spent from the main menu.
- Manual roster: `Mudpaw`, `Medic`, `Sapper`, `Saboteur`.
- Pearl specialists are trainable in-match after blueprint unlock:
  `Fisher`, `Logger`, `Digger`, `Guard`, `Ranger`, `Bombardier`, `Shaman`, `Lookout`.
- Pearl specialists are autonomous by radius assignment, not free match-start auto-deploys.
- `Ranger` and `Bombardier` are dual-zone specialists with `anchor_radius`, `engagement_radius`, and `projection_range`.
- If a building or response is required to clear a panel for the first time, it belongs in the baseline run, not behind Clams.

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
