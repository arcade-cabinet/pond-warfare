# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project context, conventions, and architecture.

## Commands

```bash
pnpm dev        # Dev server
pnpm test       # Vitest 4 (unit + integration)
pnpm typecheck  # TypeScript 6 strict
pnpm build      # Production build
pnpm lint:fix   # Biome auto-fix
```

## HARD RULES -- Non-Negotiable

### 1. No Monoliths
- **Max 300 lines per file.** No exceptions for .ts/.tsx files.
- If a file exceeds 300 LOC, decompose it BEFORE adding features.
- Hook `.claude/hooks/file-size-guard.py` enforces this on writes.

### 2. Test Everything
- **Every PR must include tests** for the code it changes.
- **Integration tests required** for gameplay systems (movement, combat, gathering, selection).
- **Browser tests required** for UI interactions (pointer events reach game, buttons dispatch actions).
- Run `pnpm test` before EVERY commit. Run `pnpm typecheck && pnpm test && pnpm lint` before every push (enforced by `.githooks/pre-push`).
- If you can't write an automated test for it, don't ship it.

### 3. Commit Everything
- **Every asset referenced in code must be committed in the same PR.**
- Before creating a PR: `git status` to verify no untracked files that code depends on.
- Never assume "works locally" = works deployed.

### 4. Test Before Merge Checklist
Before any PR merge, ALL must pass:
- [ ] `pnpm typecheck` -- zero errors
- [ ] `pnpm test` -- all tests pass, coverage doesn't decrease
- [ ] `pnpm build` -- production build succeeds
- [ ] `pnpm lint:fix` -- zero lint errors
- [ ] Browser integration tests -- core gameplay loop verified
- [ ] Manual smoke test -- start game, select units, right-click to move, verify movement

### 5. No Shipping Blind
- Don't refactor systems without integration tests proving they still work.
- Don't remove UI components without verifying the game loop still functions.
- Don't change pointer/input handling without a browser test for click -> command -> movement.

## v3 Architecture

- **One game mode**: Defend the Lodge against waves. No campaigns, puzzles, survival, or co-op.
- **Vertical map**: Lodge at bottom, enemies from top, resources in middle. Map scales with progression level.
- **JSON configs**: All balance data in `configs/*.json` -- units, enemies, events, upgrades, prestige, terrain, fortifications, lodge, rewards, prefixes.
- **Upgrade web**: 240+ procedural nodes from 6 categories x 4 subcategories x 10 tiers, plus diamond nodes for Lodge wings and specialist unlocks.
- **Prestige system**: Rank up to reset Clam upgrades and earn Pearls for permanent upgrades (auto-deploy specialists, auto-behaviors, stat multipliers).
- **In-match resources**: Fish, Rocks, Logs (aliased to clams, pearls, twigs internally).
- **Metagame currencies**: Clams (earned post-match, spent on upgrades) and Pearls (earned from prestige).
- **Match events**: JSON-driven waves, bosses, sabotage, escorts with rewards.

## Architecture Principles

- **Mouse/touch first** -- every action needs a clickable UI element
- **ECS architecture** -- bitECS SoA components, systems run in order each frame
- **Yuka.js steering** -- all unit movement goes through Yuka vehicles
- **Both factions share systems** -- gathering, movement, combat work the same
- **Preact Signals** -- UI reactivity synced from GameWorld every 30 frames
- **Small focused modules** -- one responsibility per file, <300 LOC
- **JSON-driven content** -- all game balance in configs/, never hardcoded

## File Organization

```text
src/
  ai/           -- Yuka manager, steering behaviors
  audio/        -- Tone.js sound system
  config/       -- Entity defs, config loader, v3 types, upgrade web, prestige
  ecs/          -- Components, systems (one system per file)
  game/         -- Game orchestrator modules (vertical map, match rewards, etc.)
  input/        -- Pointer, keyboard, selection handlers
  platform/     -- Capacitor native detection
  rendering/    -- PixiJS renderers (entity, effects, ui, background)
  ui/
    components/ -- Small reusable UI primitives (<100 LOC each)
    panel/      -- Command panel tabs
    overlays/   -- Modal overlays (settings, etc.)
    hud/        -- HUD elements (abilities, ctrl-groups, weather)
    screens/    -- Full-screen views (UpgradeWeb, PearlUpgrade, Rewards, RankUp)
  styles/       -- CSS
configs/        -- JSON game data (10 files)
tests/
  ecs/systems/  -- System integration tests
  game/         -- Game module tests
  ui/           -- Component tests
  browser/      -- Browser interaction + screenshot tests
  gameplay/     -- Gameplay loop integration tests
```

## Docs

- [AGENTS.md](AGENTS.md) -- Full agent instructions, conventions, file map
- [docs/architecture.md](docs/architecture.md) -- System overview, game loop, data flow
- [docs/gameplay.md](docs/gameplay.md) -- Units, resources, events, upgrade web, prestige
- [docs/libraries.md](docs/libraries.md) -- How each dependency is utilized
