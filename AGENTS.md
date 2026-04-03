# AGENTS.md - AI Agent Instructions for Pond Warfare

## Project Overview

Pond Warfare is a mobile-first real-time strategy game where otters defend their Lodge from waves of predators in a pond ecosystem. One game mode: defend the Lodge at the bottom of a vertical map against escalating enemy waves from the top. Between matches, spend earned Clams on an upgrade web (240+ nodes) and Pearls on prestige upgrades.

**Feature summary:** 14 unit types (4 generalists + 10 specialists), 6 enemy types with per-level scaling, vertical map that scales with progression level, 240+ procedural upgrade nodes across 6 categories, prestige system with Pearl upgrades (auto-deploy, auto-behaviors, multipliers), JSON-driven match events (waves, bosses, sabotage, escorts), post-match reward screen with Clam earnings, Lodge with visual wing evolution, fortification system (walls, towers), deterministic PRNG (zero Math.random in gameplay), unit-specific SFX with spatial panning, Yuka.js steering for all units, terrain system (4 types), weather system (4 types), fog of war, day/night cycle, veterancy ranks, formation movement, auto-behaviors (gather/build/defend/attack/heal/scout), kill streaks, minimap, ctrl groups, hotkeys, settings persistence, SVG 9-slice panel system with pond watercolor aesthetic, Android APK builds.

Built with bitECS, Preact, PixiJS 8, Yuka.js, Planck.js, Tone.js, and anime.js. Persistence via SQLite (capacitor-sqlite + jeep-sqlite).

## Quick Start

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server (Vite 8)
pnpm test       # Run tests (Vitest 4)
pnpm typecheck  # TypeScript 6 strict mode
pnpm build      # Production build
pnpm lint:fix   # Biome auto-fix
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system overview.

**Key pattern:** ECS game state lives in `GameWorld` (src/ecs/world.ts). UI reads from reactive `signal()` values in `src/ui/store.ts` (core signals) + `src/ui/store-v3.ts` (prestige, upgrade web, rewards, events). The game orchestrator (`src/game.ts` + `src/game/`) syncs world -> store every 30 frames via `syncUIStore()`.

**v3 routing:** Menu state uses `store.menuState` signal (`'main' | 'playing'`). v3 overlay screens use `store-v3.ts` signals:

```
Main Menu (menuState='main')
  |-- PLAY --> menuState='playing' --> Game Screen
  |-- Upgrades --> upgradesScreenOpen=true --> UpgradeWebScreen overlay
  |-- Prestige --> pearlScreenOpen=true --> PearlUpgradeScreen overlay
  |-- Settings --> settingsOpen=true --> SettingsOverlay

Game Screen (menuState='playing')
  |-- Post-match --> rewardsScreenOpen=true --> RewardsScreen overlay
  |     |-- RANK UP --> rankUpModalOpen=true --> RankUpModal overlay
  |     |-- Upgrades --> back to main menu + upgradesScreenOpen=true
  |     |-- Play Again --> back to main menu
```

Handler functions in `src/ui/app-v3-handlers.ts` manage signal transitions.

## Design System (Design Bible)

The visual identity follows the design bible at `docs/brand/`. Reference components at `docs/brand/ui-reference-full.jsx`.

### Design Tokens
Import from `@/ui/design-tokens`:
- `COLORS` -- grittyGold, mossGreen, weatheredSteel, woodBase, vineBase, etc.
- `FONTS` -- header (IM Fell English SC), body (Open Sans)
- `FRAME` -- cornerSize (60px)

### Frame9Slice (SVG 9-Slice Panel System)
Import from `@/ui/components/frame`:
- `Frame9Slice` -- CSS grid wrapper assembling SVG corners, edges, and center panel
- `CenterPanel` -- Standalone dark interior with grunge filter

Props: `{ children, title?, isExpanded?, onClick?, class? }`

Used for: ALL panels, modals, accordion sections. No PNG assets needed.

### SVG Filters
`SvgFilters` component (mounted at app root) provides:
- `url(#grunge-heavy)` -- Fractal noise worn texture
- `url(#organic-wood)` -- Directional wood grain + displacement warp
- `url(#swamp-glow)` -- Dual drop-shadow (black + moss green)

### SVG Sprites
Import from `@/ui/components/sprites`:
- `SpriteOtter` -- Assault infantry (idle + attack frames)
- `SpriteCroc` -- Siege heavy (idle + attack with gatling)
- `SpriteSnake` -- Sniper specialist (idle + attack with laser)

CSS animations: `.sprite-frame-1` / `.sprite-frame-2` toggle frames at 0.4s steps.

### SwampEcosystem
Canvas background component with animated fog blobs + fireflies. Rendered at app root for menu screens.

### Typography
- Headers: `font-heading` class -- IM Fell English SC
- Body: `font-game` class -- Open Sans
- Numbers: `font-numbers` class -- JetBrains Mono

### Button Styles
- `.rts-btn` -- Primary warfare button (dark bg, bark border, sepia text, uppercase)
- `.rts-btn.active` -- Gold border, moss background glow
- `.action-btn` -- In-game action button (wood gradient)
- `.hud-btn` -- Compact HUD control button

## Core Conventions

### ECS Components (bitECS 0.4)

Components are SoA typed arrays created with `soa()`:
```typescript
export const Health = soa({ current: [] as number[], max: [] as number[], flashTimer: [] as number[] });
```

Access: `Health.current[eid]`, `Position.x[eid]`, etc.

Queries: `query(world.ecs, [Position, Health, FactionTag])` returns entity ID arrays.

### Resources

Three in-match resource types (v3 naming, backed by v2 data fields):
- **Fish** (from Clambed/fish nodes) -- primary currency for training units
- **Rocks** (from PearlBed/rock deposits) -- used for fortifications and upgrades
- **Logs** (from Cattail/tree clusters) -- used for buildings and repairs
- **Food** -- population cap from Lodges (+8), Burrows (+6)

v3 resource helpers in `src/v3-resources.ts` provide `getFish()`, `getRocks()`, `getLogs()` aliases that map to the underlying clams/pearls/twigs fields.

Metagame currencies (between matches):
- **Clams** -- earned post-match, spent on upgrade web nodes
- **Pearls** -- earned from prestige (rank up), spent on Pearl upgrades

### Player Units (14 types)

#### Generalists (4) -- trainable at Lodge

| Unit | HP | Speed | Damage | Cost (Fish) | Role |
|------|----|-------|--------|-------------|------|
| Gatherer | 30 | 2.0 | 0 | 10 | Economy worker |
| Fighter | 60 | 1.8 | 8 | 20 | Melee DPS |
| Medic | 25 | 1.5 | 0 | 15 | Support healer |
| Scout | 20 | 3.5 | 1 | 8 | Fast recon |

#### Specialists (10) -- unlocked via upgrade web diamond nodes, auto-deployed via prestige

| Unit | HP | Speed | Damage | Role | Auto-Target |
|------|----|-------|--------|------|-------------|
| Fisher | 25 | 2.0 | 0 | Auto-gather fish | fish_node |
| Digger | 25 | 1.8 | 0 | Auto-gather rocks | rock_deposit |
| Logger | 25 | 1.8 | 0 | Auto-gather logs | tree_cluster |
| Guardian | 80 | 1.2 | 6 | Auto-defend Lodge | lodge_area |
| Hunter | 50 | 2.0 | 10 | Auto-attack enemies | nearest_enemy |
| Ranger | 40 | 2.5 | 6 | Auto-patrol routes | patrol_route |
| Shaman | 20 | 1.5 | 0 | Auto-heal wounded | nearest_wounded |
| Lookout | 15 | 3.0 | 0 | Auto-scout fog | fog_edge |
| Sapper | 40 | 1.5 | 15 | Siege enemy forts | enemy_fort |
| Saboteur | 30 | 2.5 | 5 | Subvert enemy nodes | enemy_node |

Specialist definitions in `configs/units.json`. Specialists are auto-deployed at match start based on prestige Pearl upgrades.

### Enemy Units (6 types)

| Unit | HP | Speed | Damage | Role |
|------|----|-------|--------|------|
| Raider | 25 | 2.5 | 4 | Targets resource nodes |
| Fighter | 60 | 1.8 | 8 | Direct assault |
| Healer | 20 | 1.5 | 0 | Restores wounded enemies |
| Scout (enemy) | 15 | 3.0 | 1 | Reveals player army |
| Sapper (enemy) | 50 | 1.0 | 20 | Destroys fortifications |
| Saboteur (enemy) | 25 | 2.5 | 3 | Poisons resource nodes |

Enemy stats scale with progression level: HP +5%/level, Damage +3%/level, Speed +1%/level. Defined in `configs/enemies.json`.

### Fortifications (4 types)

| Fort | HP | Cost (Rocks) | Effect |
|------|----|-------------|--------|
| Wood Wall | 100 | 15 | Blocks movement |
| Stone Wall | 250 | 40 | Reinforced barrier |
| Watchtower | 150 | 30 | Ranged defense (5 dmg, 200 range) |
| Siege Tower | 200 | 60 | Heavy platform (15 dmg, 300 range) |

Defined in `configs/fortifications.json`. Fort slots per level in `configs/lodge.json`.

### Vertical Map

Maps are vertical: ~1 screen wide, 2-3 screens tall. Lodge at bottom center, resources in middle zone, enemies spawn from top. Map size scales with progression level via `configs/terrain.json`:

| Progression | Map Size | Nodes | Spawn Dirs |
|-------------|----------|-------|------------|
| 0-10 | 1600x2400 | 6 | top |
| 11-30 | 2000x3000 | 10 | top, left, right |
| 31+ | 2400x3600 | 15 | top, left, right, bottom_sides |

Resource types: fish_node, rock_deposit, tree_cluster. Terrain types: grass, water, rocks, mud.

Generation in `src/game/vertical-map.ts`. Terrain painting in `src/terrain/`.

### JSON Config System (10 files in configs/)

All game balance data lives in `configs/*.json`, loaded via `src/config/config-loader.ts` with typed accessors. Types in `src/config/v3-types.ts`.

| Config | Purpose | Key Data |
|--------|---------|----------|
| `units.json` | Player unit stats | Generalists (4) + Specialists (10) |
| `enemies.json` | Enemy unit stats + scaling | Types (6) + per-level scaling |
| `upgrades.json` | Upgrade web categories | 6 categories, 4 subcats each, 10 tiers = 240 nodes |
| `prestige.json` | Pearl upgrades + prestige formula | Auto-deploy, auto-behavior, multiplier upgrades |
| `events.json` | Match event templates + timing | Waves, bosses, sabotage, escorts, storms |
| `rewards.json` | Post-match Clam reward formula | base + kill + event + survival bonuses |
| `terrain.json` | Map size scaling per level | Progression tiers with resource counts |
| `fortifications.json` | Wall/tower stats | HP, cost, damage, range |
| `lodge.json` | Lodge wings + fort slots | Diamond node unlock targets |
| `prefixes.json` | Tier name prefixes | Basic, Super, Ultra, etc. (10 tiers) |

### Upgrade Web (240+ procedural nodes)

Generated by `src/config/upgrade-web.ts` from `configs/upgrades.json`:
- **6 categories**: Gathering, Combat, Defense, Utility, Economy, Siege
- **4 subcategories each**: e.g., Gathering has Fish Gathering, Rock Gathering, Log Gathering, Carry Capacity
- **10 tiers per subcategory**: Cost = base_cost * 2^tier, Effect = base_effect * (tier+1)
- **Diamond nodes**: Cross-category milestones unlocking Lodge wings, specialists, behaviors
- **State management**: `src/ui/upgrade-web-state.ts` tracks purchases, highest tiers, clam balance
- **Screen component**: `src/ui/screens/UpgradeWebScreen.tsx` + `UpgradeNodeRow.tsx`

### Prestige System (Pearls, Auto-Deploy, Auto-Behaviors)

Managed by `src/config/prestige-logic.ts` reading `configs/prestige.json`:
- **Prestige (Rank Up)**: Reset Clam upgrades, earn Pearls based on progression level
- **Pearl upgrades** (3 categories): Auto-Deploy (specialists at match start), Auto-Behavior (permanent passives), Multipliers (permanent stat boosts)
- **Pearl screen**: `src/ui/screens/PearlUpgradeScreen.tsx`
- **Rank-up modal**: `src/ui/screens/RankUpModal.tsx`

### Match Events (PRNG-driven from events.json)

Match events via `src/ecs/systems/match-event-runner.ts`:
- Templates in `configs/events.json` with min/max progression levels
- Types: wave, boss, sabotage, escort, storm, swarm, resource_surge
- Timing: first event after delay, then random intervals, max concurrent
- Rewards tracked in `matchEventsCompleted` signal, fed to post-match calculation

### Rewards Screen (Post-Match Clam Calculation)

`src/ui/screens/RewardsScreen.tsx` displays post-match results:
- Formula: base + (kills * kill_bonus) + (events * event_bonus) + (duration * survival_bonus) * prestige_multiplier
- Loss penalty: 50% of total. Calculation in `src/game/match-rewards.ts`
- Options: Rank Up (if eligible), Upgrades (returns to menu), Play Again

### Lodge Visual Evolution

Lodge rendering reads upgrade state + prestige rank from `configs/lodge.json`:
- **4 wings**: Dock (Gathering T5), Barracks (Combat T5), Watchtower (Defense T5), Healing Pool (Utility T5)
- Fort slots scale with progression level (4 / 8 / 12)
- Prestige rank adds visual glow effect

### Steering Behaviors (Yuka.js)

All units use Yuka.js for movement. The `YukaManager`:
- `addUnit(eid, x, y, speed, targetX, targetY)` -- register any unit
- `removeUnit(eid)` -- unregister on arrival/death
- `setWander(eid)` -- idle patrol behavior
- `setFlee(eid, x, y)` -- temporary escape (auto-expires after 90 frames)
- `setFormation(eids, targetX, targetY)` -- add flocking behaviors for group movement
- All vehicles have `SeparationBehavior` (weight 0.6) to prevent stacking

### Audio (Tone.js)

- SFX: Call `audio.hit()`, `audio.shoot()`, etc. (see AudioSystem class in `src/audio/audio-system.ts`)
- Spatial SFX in `src/audio/audio-spatial-sfx.ts` for worldX-panned sounds
- Music: `audio.startMusic(peaceful)` / `audio.stopMusic()`
- Ambient: `audio.updateAmbient(darkness)` syncs day/night sounds
- All audio respects `audio.muted` toggle + master/music/sfx volume

### Veterancy System

Units track kills in `Combat.kills[eid]`. Rank thresholds: Recruit (0), Veteran (3), Elite (7), Hero (15). Bonuses: HP +10/20/35%, Damage +15/25/40%, Speed +0/10/15%.

### Weather System (4 types)

Changes every 3-5 minutes, seeded from map seed:
- **Clear**: No modifiers
- **Rain**: -15% speed on grass, shallows become impassable
- **Fog**: -40% vision range
- **Wind**: +-15px projectile drift

### Terrain (4 types)

| Terrain | Speed Mult | Notes |
|---------|-----------|-------|
| Grass | 1.0 | Standard |
| Water | 0 (impassable) | Water units bypass |
| Rocks | 0 (impassable) | |
| Mud | 0.75 | Slow terrain |

### UI Components (Preact + Signals)

- Components are in `src/ui/`
- State flows: `GameWorld` -> `syncUIStore()` -> `store.ts` / `store-v3.ts` signals -> UI components
- User actions flow back: UI `onClick` -> modify `world` state directly (via game instance)
- All UI must be mouse/touch accessible -- no keyboard-only actions
- Store split: `store.ts` (core), `store-v3.ts` (prestige/upgrades/rewards/events), `store-weather.ts`, `store-gameplay.ts`, `store-multiplayer.ts`

## File Map

| File | Purpose | Lines |
|------|---------|-------|
| `src/game.ts` | Game orchestrator entry point | ~300 |
| `src/game/*.ts` | Decomposed game modules | ~20-300 each |
| `src/game/vertical-map.ts` | Vertical map generator from terrain.json | ~225 |
| `src/game/match-rewards.ts` | Post-match Clam reward calculator | ~198 |
| `src/game/systems-runner.ts` | ECS system execution order | |
| `src/game/game-loop.ts` | Main update loop | |
| `src/game/game-init.ts` | World initialization | |
| `src/v3-resources.ts` | Fish/Rocks/Logs aliases for v2 resource fields | ~60 |
| `src/rendering/pixi/entity-renderer.ts` | PixiJS entity rendering, health bars | ~300 |
| `src/rendering/camera.ts` | Camera system: pan, zoom, shake | ~81 |
| `src/ecs/systems/match-event-runner.ts` | v3 event system from events.json | |
| `src/ecs/systems/specialist-deploy.ts` | Auto-deploy specialists from prestige | |
| `src/ecs/systems/fortification.ts` | Wall/tower fortification system | |
| `src/ecs/systems/ai/*.ts` | Enemy AI: economy, training, combat, defense, building | ~1200 total |
| `src/ecs/systems/combat/*.ts` | Combat: melee, positional damage | |
| `src/ecs/systems/health/*.ts` | Health: damage, death, healing, particles | |
| `src/ecs/systems/movement/*.ts` | Movement: arrive, speed modifiers | |
| `src/ecs/systems/gathering/*.ts` | Gathering: depletion warning, passive income | |
| `src/ecs/systems/veterancy.ts` | Veterancy rank-up system | ~130 |
| `src/ecs/systems/weather.ts` | Weather transitions and effects | |
| `src/ecs/systems/random-events.ts` | Legacy random events (8 types) | |
| `src/config/config-loader.ts` | JSON config loader with typed accessors | |
| `src/config/v3-types.ts` | TypeScript types for JSON configs | ~250 |
| `src/config/upgrade-web.ts` | Procedural upgrade web generator | |
| `src/config/prestige-logic.ts` | Prestige calculation and Pearl upgrades | |
| `src/config/entity-defs.ts` | Entity defs barrel (re-exports sub-modules) | ~45 |
| `src/config/entity-defs/player-units.ts` | Player unit stat definitions | |
| `src/config/entity-defs/enemy-units.ts` | Enemy unit stat definitions | |
| `src/config/entity-defs/buildings.ts` | Building stat definitions | |
| `src/config/entity-defs/damage-multipliers.ts` | Counter table + getDamageMultiplier | |
| `src/ui/store.ts` | Core reactive signals (resources, selection, menu, settings) | ~300 |
| `src/ui/store-v3.ts` | v3 signals (prestige, upgrade web, rewards, events, Lodge HP) | ~92 |
| `src/ui/store-weather.ts` | Weather signals | ~20 |
| `src/ui/store-gameplay.ts` | Game over, FPS, ability signals | ~73 |
| `src/ui/upgrade-web-state.ts` | Upgrade web purchase state management | |
| `src/ui/app-v3-handlers.ts` | Signal transition handlers for v3 screens | |
| `src/ui/screens/UpgradeWebScreen.tsx` | Upgrade web browsing screen | |
| `src/ui/screens/UpgradeNodeRow.tsx` | Individual upgrade node row component | |
| `src/ui/screens/PearlUpgradeScreen.tsx` | Pearl prestige upgrade screen | |
| `src/ui/screens/RewardsScreen.tsx` | Post-match rewards display | |
| `src/ui/screens/RankUpModal.tsx` | Prestige rank-up confirmation modal | |
| `src/audio/audio-system.ts` | AudioSystem class: volume, init, delegates | ~230 |
| `src/ai/yuka-manager.ts` | Steering + formation flocking manager | ~282 |
| `src/terrain/terrain-grid.ts` | TerrainGrid: 4 types, speed mults, pathability | |
| `src/utils/random.ts` | SeededRandom PRNG (Mulberry32) for deterministic gameplay | ~44 |
| `src/utils/spatial-hash.ts` | SpatialHash grid for O(n) proximity queries | ~62 |
| `src/constants.ts` | Tuning constants (vet thresholds, enemy economy, AI timers) | ~136 |

### configs/ Directory

| File | Purpose |
|------|---------|
| `configs/units.json` | Player generalist + specialist definitions |
| `configs/enemies.json` | Enemy types + per-level scaling |
| `configs/upgrades.json` | Upgrade web categories, subcategories, diamond nodes |
| `configs/prestige.json` | Pearl upgrade definitions + prestige formula |
| `configs/events.json` | Match event templates + timing config |
| `configs/rewards.json` | Post-match Clam reward formula |
| `configs/terrain.json` | Map size progression tiers |
| `configs/fortifications.json` | Wall/tower stat definitions |
| `configs/lodge.json` | Lodge wings + fort slot scaling |
| `configs/prefixes.json` | Tier name prefixes (Basic through Legendary) |

## File Organization

```
src/
  ai/             -- Yuka manager, steering behaviors
  audio/          -- Tone.js sound system (audio-system, sfx, music, ambient, cues, voices)
  config/         -- Entity defs, config loader, v3 types, upgrade web, prestige logic
  ecs/            -- Components, systems (one system per file)
    systems/
      ai/         -- Enemy AI (economy, training, combat, defense, building)
      combat/     -- Melee, positional damage
      evolution/  -- Evolution tiers, poison, alpha aura
      gathering/  -- Depletion warning, passive income
      health/     -- Damage, death, healing, particles
      movement/   -- Arrive, speed modifiers
      *.ts        -- Match events, fortification, specialist deploy, weather, etc.
  game/           -- Game orchestrator modules
    action-panel/ -- Train/Build button definitions
    init-entities/ -- Map generators + helpers
  governor/       -- Yuka governor AI player
  input/          -- Pointer, keyboard, selection handlers
  net/            -- P2P multiplayer (Trystero/WebRTC, retained from v2)
  platform/       -- Capacitor native detection
  rendering/      -- PixiJS renderers (entity, effects, ui, background)
  replay/         -- Replay system (retained from v2)
  storage/        -- SQLite persistence (schema, queries, settings)
  systems/        -- Achievements, daily challenges, player XP, leaderboard
  terrain/        -- Terrain grid, painters
  ui/
    components/   -- Small reusable UI primitives (<100 LOC each)
      frame/      -- SVG 9-slice panel system
      sprites/    -- SVG unit sprites with idle/attack frames
    panel/        -- Command panel tabs
    overlays/     -- Modal overlays (settings, etc.)
    hud/          -- HUD elements (abilities, ctrl-groups, weather)
    screens/      -- Full-screen views (UpgradeWeb, PearlUpgrade, Rewards, RankUp)
  styles/         -- CSS
configs/          -- JSON game data (units, enemies, upgrades, prestige, events, etc.)
tests/
  ecs/systems/    -- System integration tests
  game/           -- Game module tests
  ui/             -- Component tests
  browser/        -- Browser interaction + screenshot tests
  gameplay/       -- Gameplay loop integration tests
```

## Testing

Tests mirror the `src/` structure under `tests/`. Use `createGameWorld()` and manual component setup for ECS tests. Movement tests need `world.yukaManager.update()` between ticks since all units use Yuka steering.

Note: bitECS SoA components are global typed arrays. When tests run in parallel, entities from other test files can be visible in queries. Mock audio and rendering modules to prevent side-effects, and use generous entity counts for resilience.

### Adding a New Entity Type

1. Add to `EntityKind` enum in `src/types.ts`
2. Add stats to the appropriate sub-module in `src/config/entity-defs/` (or JSON config)
3. Add damage multipliers to `DAMAGE_MULTIPLIERS` in `src/config/entity-defs/damage-multipliers.ts`
4. Add sprite to `SpriteId` enum and `generateSprites()` in `src/rendering/sprites.ts`
5. Add spawn mapping in `src/ecs/archetypes.ts` (`KIND_TO_SPRITE`)
6. Add string mapping in `entityKindFromString()` and `entityKindName()` in `src/config/entity-defs/kind-helpers.ts`

### Adding a New ECS System

1. Create `src/ecs/systems/my-system.ts` exporting `function mySystem(world: GameWorld): void`
2. Import and add to the system execution chain in `src/game/systems-runner.ts` (order matters)
3. Add tests in `tests/ecs/my-system.test.ts`

## Documentation

- [Architecture](docs/architecture.md) -- System overview, game loop, data flow
- [Gameplay](docs/gameplay.md) -- Units, resources, events, upgrade web, prestige, combat
- [Libraries](docs/libraries.md) -- How each dependency is utilized
- [Design Bible](docs/design-bible.md) -- Vision, visual identity, design tokens

## Important Notes

- **Mouse/touch first**: Every game action must have a clickable UI element. Mobile (Capacitor/Android) is a first-class target.
- **Max 300 LOC per file**: Enforced by `.claude/hooks/file-size-guard.py`. Decompose before adding features.
- **One game mode**: Defend the Lodge. No campaigns, puzzles, survival, or co-op modes in v3.
- **JSON configs for balance**: All unit stats, enemy scaling, events, upgrades, and prestige data live in `configs/*.json`. Content changes should never require TypeScript modifications.
- **Vertical map**: Lodge at bottom, enemies from top, resources in middle. Map grows with progression level.
- **Clams are metagame currency**: Earned post-match, spent on upgrade web between matches. Fish/Rocks/Logs are the in-match resources.
- **Specialists auto-deploy**: Specialists spawn at match start based on prestige Pearl upgrades, not trained during a match.
- **Player units use Yuka too**: Not just enemies. All moving entities register with YukaManager for smooth steering.
- **Both factions use the same systems**: Gathering, movement, and combat work identically for player and enemy units.
- **SQLite is required**: Persistence uses capacitor-sqlite + jeep-sqlite. There is no localStorage fallback.
- **Deterministic PRNG**: All gameplay randomness goes through `SeededRandom`, never `Math.random()`.
- **Store is split into 5 files**: Core signals in `store.ts`, v3 metagame in `store-v3.ts`, weather in `store-weather.ts`, gameplay session state in `store-gameplay.ts`, multiplayer in `store-multiplayer.ts`.
- **Terrain affects movement**: Speed multipliers per terrain type; water and rocks are impassable.
- **Weather changes gameplay**: Rain floods shallows, fog reduces vision, wind drifts projectiles. Seeded from map seed for determinism.
- **Auto-behaviors are optional**: Auto-gather/build/defend/attack/heal/scout are toggled via the idle radial menu, not hardcoded.
