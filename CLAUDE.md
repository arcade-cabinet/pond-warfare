# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project context, conventions, and architecture.

## Commands

```bash
pnpm dev        # Dev server
pnpm test       # Vitest 4 (unit + integration, 2145+ tests)
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
- [ ] Manual smoke test -- start game, tap Lodge, train unit, tap gatherer, tap resource, verify gathering

### 5. No Shipping Blind
- Don't refactor systems without integration tests proving they still work.
- Don't remove UI components without verifying the game loop still functions.
- Don't change pointer/input handling without a browser test for tap -> command -> movement.

## v3 Architecture

- **Wave-survival mode**: Defend the Lodge from escalating events. No campaigns, puzzles, or co-op.
- **6-panel map grid**: Panels with unique biomes, resources, terrain features. Unlock tied to progression stage. Defined in `configs/panels.json`.
- **Auto-symbol autonomy**: After completing an order, units show an icon that can be tapped to confirm auto-behavior looping.
- **6 trainable units** (costs from `configs/units.json`):
  - Gatherer (10 Fish), Fighter (20 Fish), Medic (15 Fish), Scout (8 Fish)
  - Sapper (25 Fish + 15 Rocks), Saboteur (20 Fish + 10 Rocks) -- unlocked at stage 5+
- **10 specialist auto-deploy units**: Fisher, Digger, Logger, Guardian, Hunter, Ranger, Shaman, Lookout, Sapper, Saboteur -- unlocked via upgrade web diamond nodes.
- **6 enemy types**: Raider, Fighter, Healer, Scout, Sapper, Saboteur -- with role-based behaviors and per-level scaling.
- **7 commanders**: Marshal, Sage, Warden, Tidekeeper, Shadowfang, Ironpaw, Stormcaller -- each with a unique active ability (Q key / tap button).
- **JSON configs**: All balance data in `configs/*.json` -- units, enemies, events, upgrades, prestige, terrain, fortifications, lodge, rewards, prefixes, panels.
- **Upgrade web**: 240+ procedural nodes from 6 categories x 4 subcategories x 10 tiers, plus Frontier Expansion diamond nodes for Lodge wings and specialist unlocks.
- **Prestige system**: Rank up to reset Clam upgrades and earn Pearls for permanent upgrades (auto-deploy specialists, auto-behaviors, stat multipliers).
- **In-match resources**: Fish (training units), Rocks (fortifications), Logs (repairs).
- **Metagame currencies**: Clams (earned post-match, spent on upgrade web) and Pearls (earned from prestige, spent on permanent upgrades).
- **Match events**: JSON-driven waves, bosses, sabotage, escorts with rewards.
- **Fortifications**: Wood Wall, Stone Wall, Watchtower, Siege Tower -- placed via radial menu, towers auto-attack enemies.
- **Comic panel landing**: Two stacked panels with SVG sprite characters and vine-frame aesthetic.
- **SQLite persistence**: All metagame state via capacitor-sqlite + jeep-sqlite.

## Architecture Principles

- **Tap/touch first** -- every action needs a visible tap target (44px minimum), keyboard is desktop convenience only
- **ECS architecture** -- bitECS SoA components, systems run in order each frame
- **Yuka.js steering** -- all unit movement goes through Yuka vehicles
- **Both factions share systems** -- gathering, movement, combat work the same
- **Preact Signals** -- UI reactivity synced from GameWorld every 30 frames
- **Small focused modules** -- one responsibility per file, <300 LOC
- **JSON-driven content** -- all game balance in configs/, never hardcoded
- **Radial menu** -- tap Lodge for training, tap unit for commands

## File Organization

```text
src/
  ai/           -- Yuka manager, steering behaviors
  audio/        -- Tone.js sound system (audio-system, sfx, music, ambient, cues, voices)
  config/       -- Entity defs, config loader, v3 types, upgrade web, prestige, commanders
  ecs/          -- Components, systems (one system per file)
    systems/
      ai/       -- Enemy AI (economy, training, combat, defense, building, raider, healer, sapper)
      combat/   -- Melee, positional damage
      health/   -- Damage, death, healing, particles
      movement/ -- Arrive, speed modifiers
      gathering/ -- Depletion warning, passive income
      spawn-patterns.ts  -- Wave spawn pattern functions
      spawn-positions.ts -- Edge/panel-aware spawn positioning
      fortification.ts   -- Wall/tower system (placement, tick, damage)
      wave-spawner.ts    -- Role-based enemy spawning
  game/         -- Game orchestrator modules
    abilities.ts         -- Pond Blessing, Tidal Surge, Shadow Sprint, Airdrop
    commander-abilities.ts -- Per-commander active abilities (Charge, Eureka, Fortify, etc.)
    vertical-map.ts      -- Map generation from terrain.json
    match-rewards.ts     -- Post-match Clam reward calculator
  governor/     -- Yuka governor AI auto-play (Think/Goal system)
  input/        -- Pointer (tap/touch), keyboard, selection handlers
  rendering/    -- PixiJS renderers (entity, effects, auto-symbol, lodge, background)
  ui/
    components/ -- Small reusable UI primitives (<100 LOC each)
      frame/    -- SVG 9-slice panel system (Frame9Slice, CenterPanel)
      sprites/  -- SVG unit sprites (Otter, Croc, Snake)
    hud/        -- HUD elements
      CommanderAbility.tsx  -- Commander ability tap button
      AbilityButtons.tsx    -- Pond Blessing / Tidal Surge / Sprint tap buttons
      top-bar.tsx           -- Resource display + controls
    overlays/   -- Modal overlays (settings, etc.)
    screens/    -- Full-screen views (UpgradeWeb, PearlUpgrade, Rewards, RankUp)
    radial-menu.tsx         -- Contextual tap radial for Lodge and units
    radial-menu-options.ts  -- Option definitions per mode/role
  styles/       -- CSS (all colors via --pw-* custom properties)
configs/        -- JSON game data (11 files)
tests/
  ecs/systems/  -- System integration tests
  game/         -- Game module tests
  gameplay/     -- Gameplay loop integration tests (touch flow, fortifications, economy)
  input/        -- Pointer interaction tests (tap-to-select, tap-to-command)
  ui/           -- Component tests (radial menu, settings, HUD)
  browser/      -- Browser interaction + screenshot tests
```

## Docs

- [AGENTS.md](AGENTS.md) -- Full agent instructions, conventions, file map
- [docs/architecture.md](docs/architecture.md) -- System overview, game loop, data flow
- [docs/gameplay.md](docs/gameplay.md) -- Units, resources, events, upgrade web, prestige
- [docs/libraries.md](docs/libraries.md) -- How each dependency is utilized
