# Architecture

Pond Warfare uses an Entity Component System (ECS) architecture powered by bitECS, with Preact for UI and PixiJS 8 for rendering.

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
   - `diverStealthSystem` - Water-based stealth mechanics
   - `movementSystem` - Unit pathfinding via Yuka steering
   - `collisionSystem` - Planck.js broadphase overlap resolution
   - `gatheringSystem` - Resource collection and dropoff (both factions)
   - `buildingSystem` - Construction progress and repair
   - `engineerSystem` - Sapper siege mechanics
   - `combatSystem` - Tower auto-attack, idle aggro (10-frame scan), melee/ranged with damage multipliers, immediate retarget after kill
   - `fortificationTickSystem` - Fort slot towers attack nearest enemy in range
   - `commanderPassivesSystem` - Commander aura/passive bonuses
   - `berserkerSystem` - Berserker rage mechanic
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
   - `wallGateSystem` - Wall gate open/close mechanics
   - `veterancySystem` - Kill tracking, rank-up bonuses (HP/damage/speed)
   - `fogOfWarSystem` - Visibility based on unit positions
   - `branchCosmeticsSystem` - Visual branch unlocks
   - `matchEventRunnerSystem` - Wave-survival event scheduling from events.json with 10 spawn patterns (scatter, line, wave, v_formation, pincer, surround, l_sweep, t_hammer, flank, funnel)
   - `randomEventsSystem` - Environmental random events
   - `autoSymbolSystem` - Auto-behavior icon overlay after order completion
   - `cleanupSystem` - Particle/corpse/ping decay
5. **Camera** - Pan velocity, tracking lerp, screen shake
6. **UI Sync** - Every 30 frames, sync world state to Preact signals
7. **Render** - PixiJS entities + Canvas2D overlays (fog, light, minimap)

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

The enemy AI runs a full parallel economy and makes strategic decisions through the `aiSystem` (7 sub-files in `src/ecs/systems/ai/`). In v3, enemies also have role-based behaviors:

- **Raiders** (`enemy-raider.ts`) - Target player resource nodes
- **Healers** (`enemy-healer.ts`) - Restore wounded enemy allies
- **Sappers** (`enemy-sapper.ts`) - Breach player fortifications

```
aiSystem()
  |
  +-- enemyGathererSpawning (every 1200 frames)
  +-- enemyBuildingConstruction (every 1800 frames)
  +-- enemyArmyTraining (every 300 frames)
  +-- enemyAttackDecision (every 600 frames)
  +-- enemyRetreatLogic (every 60 frames)
  +-- enemyScoutLogic (every 3600 frames)
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

Maps use a 6-panel grid system (`src/game/panel-grid.ts`) with progression-based unlock:
- Panels defined in `configs/panels.json` with biome, resources, terrain features
- Lodge panel at bottom center, enemy panels at top
- Panel unlock tied to progression stage
- Map dimensions scale with progression level via `configs/terrain.json`

## Upgrade Effects Pipeline

At game init, `src/game/upgrade-effects.ts`:
1. Reads purchased upgrade web nodes from `store-v3`
2. Computes active stat effects (gather rate, combat, defense, etc.)
3. Reads Pearl upgrade multipliers from prestige state
4. Applies all bonuses as world modifiers before entity spawning

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
