# Architecture

Pond Warfare uses an Entity Component System (ECS) architecture powered by bitECS, with Preact for UI and PixiJS 8 for rendering.

The canonical unit model is defined in [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md) and [configs/unit-model.json](/Users/jbogaty/src/arcade-cabinet/pond-warfare/configs/unit-model.json). The live player-facing runtime now uses the canonical Lodge/radial roster and in-match specialist blueprints. The remaining low-level compatibility layer is limited to shared chassis ids and the specialist snapshot harness used by diagnostics; Pearl progression no longer uses the deleted free specialist match-start spawn contract.

## System Overview

```
                    +--------------+
                    |   main.tsx   |  Preact entry point
                    +------+-------+
                           |
                    +------v-------+
                    |   app.tsx    |  Root component, mounts game
                    +------+-------+
                           |
                    +------v-------+
                    |   game.ts    |  Game orchestrator (decomposed)
                    +------+-------+
                           |
              +------------+------------+
              |            |            |
       +------v-------+ +--v----+ +-----v--------+
       |  ECS World   | |  UI   | |  Rendering   |
       |  (bitECS)    | | Store | |  (PixiJS)    |
       +------+-------+ +-------+ +--------------+
              |
    +---------+---------+
    |  30+ ECS Systems   |
    |  (run every frame) |
    +--------------------+
```

## Game Loop

The game runs a fixed-timestep loop at 60 FPS. Each frame:

1. **Input** - Keyboard/pointer events update world state
2. **Yuka AI** - Steering behaviors update (1/60s step), including formation flocking
3. **Physics sync** - Create/remove Planck.js bodies
4. **ECS Systems** - Execute in order (see `src/game/systems-runner.ts`):
   - `weatherSystem` - Weather transitions (clear/rain/fog/wind), speed/vision modifiers
   - `dayNightSystem` - Time of day, ambient darkness, fireflies
   - `movementSystem` - Unit pathfinding via Yuka steering
   - `collisionSystem` - Planck.js broadphase overlap resolution
   - `gatheringSystem` - Resource collection and dropoff (both factions)
   - `buildingSystem` - Construction progress and repair
   - `combatSystem` - Tower auto-attack, idle aggro (10-frame scan), melee/ranged with damage multipliers, immediate retarget after kill
   - `fortificationTickSystem` - Fort slot towers attack nearest enemy in range
   - `commanderPassivesSystem` - Commander passive upkeep, Marshal/Shadowfang active-state cleanup, Stormcaller lightning
   - `projectileSystem` - Projectile movement and impact
   - `trainingSystem` - Unit production from buildings
   - `aiSystem` - Enemy economy, training, combat, defense, building (6 sub-systems)
   - `evolutionSystem` - Enemy tier evolution, poison ticks, Alpha Predator aura
   - `autoBuildSystem` - Pressure-based auto-building when enabled
   - `autoTrainSystem` - Automatic unit training
   - `patrolSystem` - Patrol route movement
   - `healthSystem` - Damage, healing, death, kill streaks, win/lose
   - `moraleSystem` - Morale effects, commander death demoralize
   - `autoRetreatSystem` - Automatic retreat for low-HP units
   - `shamanHealSystem` - Shaman auto-healing
   - `veterancySystem` - Kill tracking, rank-up bonuses (HP/damage/speed)
   - `fogOfWarSystem` - Visibility based on unit positions
   - `branchCosmeticsSystem` - Visual branch unlocks
   - `matchEventRunnerSystem` - Wave-survival event scheduling from events.json with 10 spawn patterns (scatter, line, wave, v_formation, pincer, surround, l_sweep, t_hammer, flank, funnel)
   - `randomEventsSystem` - Environmental random events
   - `autoSymbolSystem` - Auto-behavior icon overlay after order completion
   - `cleanupSystem` - Particle/corpse/ping decay
5. **Camera** - Pan velocity, tracking lerp, screen shake
6. **UI Sync** - Every 30 frames, sync world state to Preact signals
7. **Render** - PixiJS entities + Canvas2D overlays (fog, light)

## Data Flow

```
GameWorld (ECS)  --sync every 30 frames-->  Store (Preact Signals)  --reactive-->  UI Components
     |                                                                                  |
     |                                                                                  |
     <---------------------- user actions (click, button press) ------------------------+
```

Store is split across 5 files:
- `store.ts` - Core signals (resources, selection, menu, settings)
- `store-v3.ts` - Prestige, upgrade web, rewards, events, Lodge HP
- `store-weather.ts` - Weather signals
- `store-gameplay.ts` - Game over, FPS, ability signals
- `store-multiplayer.ts` - P2P multiplayer signals (retained from v2)

## Enemy AI Architecture

The enemy AI runs a full parallel economy and makes strategic decisions through the `aiSystem` (`src/ecs/systems/ai/`). In v3, enemies also have role-based behaviors:

- **Raiders** (`enemy-raider.ts`) - Target player resource nodes
- **Support units** (`enemy-support.ts`) - Restore wounded enemy allies
- **Sappers** (`enemy-sapper.ts`) - Breach player fortifications

```
aiSystem()
  |
  +-- enemyEconomyTick
  +-- enemyBuildingTick
  +-- enemyTrainingTick / enemyTrainingQueueProcess
  +-- enemyCombatTick
  +-- enemyRaiderTick
  +-- enemySupportTick
  +-- enemySapperTick
  +-- enemyCommanderTick
  +-- nestDefenseReinforcement (every 600 frames)
  +-- bossWaveLogic (every 3 wave intervals after wave 10)
```

## Wave Spawner

`src/ecs/systems/wave-spawner.ts` handles role-based enemy spawning:
- Maps `enemies.json` role keys to EntityKinds
- Tracks spawned unit roles for behavior systems
- Computes spawn positions from panel progression and map geometry

## Match Event Runner

`src/ecs/systems/match-event-runner.ts` drives the wave-survival game mode:
- Reads event templates from `configs/events.json`
- Schedules events based on progression level and PRNG timing
- Delegates spawning to wave-spawner
- Tracks completed events for post-match Clam reward calculation

## Auto-Symbol System

`src/ecs/systems/auto-symbol.ts` provides unit autonomy feedback:
- After a unit completes an order and is deselected, a themed icon appears above it
- Icons last 4 seconds; tapping confirms the auto-behavior
- Confirmed units loop their last action; unconfirmed units idle

## Vertical Map & Panel Grid

Maps use a 6-panel grid system (`src/game/panel-grid.ts`) with Clam-run frontier unlocks:
- Panels are defined in `configs/panels.json` with biome, resources, terrain features, and unlock order
- Lodge panel sits at bottom center; new panels expand outward and add pressure/resources
- The live match map size is driven by purchased Frontier Expansion diamonds in the current run, not by Pearl prestige state
- Required buildings/responses should arrive from the pane baseline; Clams can tune power, but should not gate the existence of mandatory progression tools

## Canonical Unit Architecture

The intended gameplay model is:

- baseline manual units: `Mudpaw`, `Medic`, `Sapper`, `Saboteur`
- Pearl specialists: `Fisher`, `Logger`, `Digger`, `Guard`, `Ranger`, `Bombardier`, `Shaman`, `Lookout`
- Pearl specialists are unlocked by Pearls but trained with in-match resources
- specialists are assigned to terrain areas and operate within a Yuka-governed radius
- specialist radius growth is a first-class Pearl upgrade axis, not a secondary stat
- selected specialists should reveal their assigned circle(s) plus dotted correlation links on the map; `Ranger` and `Bombardier` are dual-zone by design

The live player-facing runtime now also carries specialist zone bonuses on the
world state at match start:

- blueprint caps initialize from prestige state
- zone bonuses initialize from prestige state
- `registerSpecialistEntity()` applies those bonuses to the spawned specialist assignment
- the Pearl screen groups progression per specialist so blueprint and radius rows stay readable together

The older model of free match-start specialist auto-deploy is obsolete in the player-facing runtime. Pearl specialist ranks now initialize in-match blueprint caps, the player fields those specialists from the Lodge during a run, and the manual Lodge/radial flow now exposes `Mudpaw`, `Medic`, `Sapper`, and `Saboteur` on their intended stage gates.

## Commander Runtime

The live commander layer now has two distinct parts:

1. **Persistent commander modifiers**
   - difficulty setup copies the selected commander's live aura/passive numbers into `world.commanderModifiers`
   - aura state is rebuilt by `commanderAura()`
   - specialist-specific commander bonuses are applied at specialist field time, not through deleted unit types

2. **Active commander abilities**
   - `src/game/commander-abilities.ts` owns activation and cooldown state
   - `Marshal` tracks charged units in `world.commanderAbilityTargets`
   - `Warden` and `Ironpaw` gate `takeDamage()` during their active windows
   - `Shadowfang` uses the existing stealth targeting path instead of a fake placeholder flag
   - `Sage` no longer targets the deleted research tree; it grants an instant resource spike

## Upgrade Effects Pipeline

At game init, `src/game/upgrade-effects.ts`:
1. Reads purchased upgrade web nodes from `store-v3`
2. Computes active stat effects (gather rate, combat, defense, etc.)
3. Reads Pearl upgrade multipliers from prestige state
4. Applies all bonuses as world modifiers before entity spawning

Separately, `src/ui/current-run-diamond-effects.ts` resolves current-run Frontier Expansion diamonds so the next match spawns at the correct panel stage.

Under the canonical unit model, Pearl progression now centers on:

1. specialist blueprint unlocks
2. specialist cap/radius/projection/efficiency modifiers
3. specialist training availability during a match
4. area-assignment control rather than per-target micromanagement

## Veterancy System

The `veterancySystem` runs every 60 frames and checks each combat unit's kill count against rank thresholds:

- **Recruit** (0 kills) -> **Veteran** (3) -> **Elite** (7) -> **Hero** (15)
- Each rank grants incremental bonuses to HP, damage, and speed (percentages of base stats)
- Bonuses are applied as deltas between the old and new rank to avoid double-counting
- Rank-ups produce floating text and gold particle effects

## Formation Movement

When a group move command is issued via `issueContextCommand()`:

1. Units are sorted into role-based rows: melee (front), ranged (middle), support (back)
2. `calculateFormationPositions()` assigns per-unit target positions with 40px spacing
3. `YukaManager.setFormation()` adds AlignmentBehavior and CohesionBehavior to each vehicle
4. During movement, `setTarget()` preserves flocking behaviors for units in a formation
5. On arrival, formation behaviors are cleared

## Unit Counter System

`getDamageMultiplier(attackerKind, defenderKind)` in `entity-defs.ts` returns a multiplier (default 1.0) applied to all damage calculations in the combat system.

## Directory Structure

```
src/
+-- ai/                 # Yuka.js steering manager
|   +-- yuka-manager.ts # Faction-agnostic vehicle management, formation flocking
+-- audio/              # Tone.js audio system
|   +-- audio-system.ts # SFX orchestrator, music, ambient sounds
+-- config/             # Game balance and definitions
|   +-- config-loader.ts # JSON config loader with typed accessors
|   +-- v3-types.ts     # TypeScript types for JSON configs
|   +-- upgrade-web.ts  # Procedural upgrade web generator (240+ nodes)
|   +-- prestige-logic.ts # Prestige calculation and Pearl upgrades
|   +-- entity-defs/    # Player units, enemy units, buildings, damage multipliers
+-- constants.ts        # Game tuning constants
+-- ecs/                # Entity Component System
|   +-- archetypes.ts   # Entity spawn templates
|   +-- components.ts   # SoA components + tag components
|   +-- systems/        # 30+ game systems (see Game Loop)
|   |   +-- ai/         # Enemy AI: economy, training, combat, defense, building, raider, healer, sapper
|   |   +-- combat/     # Melee, positional damage
|   |   +-- evolution/  # Evolution tiers, poison, alpha aura
|   |   +-- gathering/  # Depletion warning, passive income
|   |   +-- health/     # Damage, death, healing, particles
|   |   +-- movement/   # Arrive, speed modifiers
|   +-- world.ts        # GameWorld state container
+-- game/               # Game orchestrator modules
|   +-- game.ts         # Entry point
|   +-- systems-runner.ts # ECS system execution order
|   +-- game-loop.ts    # Main update loop
|   +-- game-init.ts    # World initialization
|   +-- vertical-map.ts # Vertical map generator from terrain.json
|   +-- panel-grid.ts   # 6-panel grid system from panels.json
|   +-- match-rewards.ts # Post-match Clam reward calculator
|   +-- upgrade-effects.ts # Upgrade web + Pearl multiplier application
|   +-- action-panel/   # Train/Build button definitions
|   +-- init-entities/  # Map generators + helpers
+-- governor/           # Yuka-driven AI governor player
+-- input/              # Pointer, keyboard, selection handlers
+-- net/                # P2P multiplayer (Trystero/WebRTC, retained from v2)
+-- physics/            # Planck.js collision world
+-- platform/           # Capacitor native detection
+-- rendering/          # PixiJS renderers (entity, effects, ui, background)
|   +-- pixi/
|   |   +-- entity-renderer.ts # Sprite rendering, health bars
|   |   +-- auto-symbol-overlay.ts # Auto-symbol icon rendering
|   |   +-- lodge-visuals.ts # Lodge wing rendering
+-- replay/             # Replay system (retained from v2)
+-- storage/            # SQLite persistence (schema, queries, settings)
+-- systems/            # Non-ECS systems (achievements, daily challenges, XP, leaderboard)
+-- terrain/            # Terrain grid, painters
+-- ui/
|   +-- comic-landing.tsx # Comic book landing page (3 stacked panels)
|   +-- comic-panel.tsx  # Reusable comic panel component
|   +-- store.ts         # Core reactive signals
|   +-- store-v3.ts      # v3 metagame signals
|   +-- store-v3-persistence.ts # SQLite persistence for v3 state
|   +-- components/      # Reusable UI primitives
|   |   +-- frame/       # SVG 9-slice panel system
|   |   +-- sprites/     # SVG unit sprites with idle/attack frames
|   +-- hud/             # HUD elements (event alerts, onboarding, weather, ctrl-groups)
|   +-- screens/         # UpgradeWebScreen, PearlUpgradeScreen, RewardsScreen, RankUpModal
|   +-- overlays/        # Modal overlays (settings, etc.)
+-- utils/              # Utility modules (particles, pool, spatial-hash, random)
configs/                # JSON game data (11 files)
tests/                  # 140+ test files mirroring src/ structure
```

## Performance Optimizations

- **SpatialHash grid** (`src/utils/spatial-hash.ts`) - O(n) proximity queries for aggro, healing, aura buffs
- **ObjectPool** (`src/utils/pool.ts`) - Reusable particle allocations to avoid GC pressure
- **Particle throttling** (`src/utils/particles.ts`) - Probabilistic skip when particle count exceeds thresholds
- **Synth pool** - Pre-allocated Tone.js synth+panner pairs, eviction on pool exhaustion
- **Sprite recolor cache** - Recolored textures cached by preset+spriteId key
- **30-frame UI sync** - Game state synced to Preact signals every 30 frames (not every frame)

## Key Design Decisions

- **bitECS SoA components** over traditional OOP entities for cache-friendly iteration
- **Preact Signals** for reactive UI without re-rendering the entire tree
- **PixiJS 8 + Canvas2D overlays** - PixiJS for entities/sprites, Canvas2D for fog/lighting
- **Yuka.js for ALL units** - smooth steering with separation/wander/flee/formation behaviors
- **Mouse/touch-first design** - every action has a clickable UI element
- **Wave-survival mode** - single game mode: defend the Lodge from escalating events
- **6-panel grid** - map divided into panels with progression-based unlock
- **Auto-symbol autonomy** - visual feedback loop for unit auto-behaviors
- **JSON-driven balance** - all unit stats, events, upgrades in `configs/*.json`
- **Deterministic PRNG** - all gameplay randomness through SeededRandom, never Math.random()
- **SQLite persistence** - capacitor-sqlite + jeep-sqlite for all platforms
- **Upgrade web + prestige** - deep metagame progression between matches
- **Faction-agnostic systems** - same ECS systems handle both player and AI factions
