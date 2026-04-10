---
title: Project Guide — Pond Warfare
updated: 2026-04-10
status: current
domain: technical
---

# CLAUDE.md — Pond Warfare Project Guide

Pond Warfare is a mobile-first tower-defense RTS: defend the otter Lodge against escalating enemy waves, gather resources, unlock upgrades, and train specialist units.

**Quick start:** See [AGENTS.md](AGENTS.md) for full architecture and conventions. See [README.md](README.md) for gameplay overview.

## Essential Files

**Gameplay truth** (in order of priority):
1. [docs/gameplay.md](docs/gameplay.md) — Unit stats, building costs, techs, commanders, AI
2. [docs/unit-model.md](docs/unit-model.md) — Human-readable unit design
3. [configs/unit-model.json](configs/unit-model.json) — Machine-readable canonical model
4. [docs/balance-model.md](docs/balance-model.md) — Economy, formulas, damage multipliers

**Architecture:**
- [docs/architecture.md](docs/architecture.md) — System overview, ECS, game loop, data flow
- [AGENTS.md](AGENTS.md) — AI agent instructions, design system, file map
- [src/game.ts](src/game.ts) — Game orchestrator (entry point for main loop)
- [src/ecs/world.ts](src/ecs/world.ts) — ECS world (all entity state)
- [src/ui/store.ts](src/ui/store.ts) — Preact signals (UI state)

**Quality:**
- [STANDARDS.md](STANDARDS.md) — Non-negotiable code constraints
- [docs/TESTING.md](docs/TESTING.md) — Test strategy, coverage goals, how to run tests
- [docs/STATE.md](docs/STATE.md) — Current progress, known issues, next steps

**Design:**
- [docs/LORE.md](docs/LORE.md) — Game world, factions, thematic elements
- [docs/design-bible.md](docs/design-bible.md) — Historical design intent (reference only, not live spec)

**Other:**
- [CHANGELOG.md](CHANGELOG.md) — Release history
- [docs/libraries.md](docs/libraries.md) — How each dependency is used

## Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server (localhost:5173)
pnpm test       # Run unit + integration tests (359+ tests)
pnpm test:watch # Watch mode
pnpm test:browser # DOM/Preact tests
pnpm test:e2e   # Full match E2E tests
pnpm typecheck  # TypeScript strict mode
pnpm build      # Production build
pnpm lint:fix   # Biome auto-fix + format
```

## Code Organization

```
src/
├── ai/          # Yuka.js steering (flocking, formations, pathfinding)
├── audio/       # Tone.js SFX (25+ effects, spatial panning, music, ambience)
├── balance/     # Cost formulas, damage multipliers, economy constants
├── config/      # 33 entity defs, 25 techs, 5 AI personalities, 7 commanders, factions
├── ecs/         # bitECS (30+ systems, components, archetypes)
├── game/        # Game orchestrator modules (moved from monolithic game.ts)
├── game.ts      # Main entry point, frame loop coordinator
├── governor/    # Enemy AI decision-making (6 sub-systems)
├── input/       # Keyboard, pointer, selection, control groups
├── physics/     # Planck.js world + collision handling
├── platform/    # Capacitor mobile integration
├── rendering/   # PixiJS 8 + Canvas2D (fog, light, sprite recoloring)
├── replay/      # Deterministic PRNG + match recording
├── net/         # P2P multiplayer (Trystero, WIP)
├── storage/     # SQLite persistence (5 tables via capacitor-sqlite)
├── ui/          # Preact components (HUD, panels, menus, modals)
└── types.ts     # Shared types, EntityKind enum
```

## Design System

**Tokens:** Import from `@/ui/design-tokens`
- `COLORS` — grittyGold, mossGreen, weatheredSteel, etc.
- `FONTS` — header (IM Fell English SC), body (Open Sans), numbers (JetBrains Mono)
- `FRAME` — cornerSize (60px)

**Components:**
- `Frame9Slice` — SVG 9-slice panel wrapper (use for all panels/modals)
- `CenterPanel` — Dark interior with grunge texture
- `.rts-btn` — Primary button
- `.action-btn` — In-game action button
- `.hud-btn` — Compact HUD button

**SVG Filters:** `#grunge-heavy`, `#organic-wood`, `#swamp-glow` (mounted via `SvgFilters` component)

See [AGENTS.md](AGENTS.md) § Design System for full details.

## Non-Negotiables

1. **Every behavioral change requires tests** — unit, browser, or E2E
2. **File size limit: 300 LOC** — enforced by `.claude/hooks/`
3. **No hardcoded values** — all balance lives in `src/config/` or `configs/`
4. **Sync code <> docs** — if code changes, update design docs same PR
5. **Verify before ship:**
   ```bash
   pnpm lint:fix && pnpm typecheck && pnpm test && pnpm test:browser
   ```

## Before Shipping Gameplay or UI

- [ ] `pnpm typecheck` — passes
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm test:browser` — DOM/component tests pass
- [ ] Manual smoke test — live flow feels good
- [ ] Design docs updated — no obsolete terminology
- [ ] CHANGELOG updated (squash-merge will auto-generate from commits)

### Baseline Smoke Tests

- Start match from landing page
- Gather 2 clams from resource node
- Train 2 Mudpaws
- Move unit to gather
- Verify attack animation + damage number
- End match (win/lose)

If specialist flow changed:
- Unlock specialist blueprint
- Train it in-match
- Place radius assignment
- Verify behavior (e.g., Fisher gathers resources)

## Canonical Game State (v1.2)

**Match mode:** Tower defense — defend Lodge against escalating waves

**Manual units:** Mudpaw (infantry), Medic (healer), Sapper (builder), Saboteur (infiltrator)

**Specialists (Pearl blueprints):** Fisher, Logger, Digger, Guard, Ranger, Bombardier, Shaman, Lookout
- Trainable in-match after unlock
- Auto-patrol assigned radius
- Cannot be directly ordered

**Resources:** Clams (primary), Twigs (building), Pearls (prestige)

**Progression:** 
- Between matches: spend Clams on upgrade web (240+ nodes)
- Spend Pearls on prestige upgrades (specialist unlocks, radius/cap/efficiency multipliers)
- Unlock panel map grid progressively
- 5 ranks with rank-up modal rewards

**Enemy AI:** Full economy, 6 unit types, evolution tiers, role-based tactics (raider, healer, sapper)

## Key Constraints

**ECS:** All entity state lives in `GameWorld` (bitECS). Never replicate to store — sync via `syncUIStore()` every 30 frames.

**Determinism:** Zero `Math.random()` in gameplay. Use seeded PRNG in `src/utils/seeded-rng.ts` for reproducible replays.

**Audio:** Every sound is unit-specific or contextual (match phase, weather, time of day). All SFX have spatial panning.

**Mobile:** Portrait-first, touch-first. Test on Android 8.0+. Use Capacitor for storage/orientation/haptics.

**Balance:** All unit/building costs, damage, and tech properties must match `src/config/` definitions. Mismatch = bug.

## Getting Help

- **Architecture questions?** → [docs/architecture.md](docs/architecture.md) + [AGENTS.md](AGENTS.md)
- **Unit stats?** → [docs/gameplay.md](docs/gameplay.md) → [docs/unit-model.md](docs/unit-model.md) → [configs/unit-model.json](configs/unit-model.json)
- **Balance equations?** → [docs/balance-model.md](docs/balance-model.md)
- **Test patterns?** → [docs/TESTING.md](docs/TESTING.md)
- **Code quality?** → [STANDARDS.md](STANDARDS.md)
- **What's next?** → [docs/STATE.md](docs/STATE.md)
