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
                    |   game.ts    |  Game orchestrator (1200+ lines)
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
    |   16 ECS Systems   |
    |  (run every frame) |
    +--------------------+
```

## Game Loop

The game runs a fixed-timestep loop at 60 FPS. Each frame:

1. **Input** - Keyboard/pointer events update world state
2. **Yuka AI** - Steering behaviors update (1/60s step), including formation flocking
3. **Physics sync** - Create/remove Planck.js bodies
4. **ECS Systems** - Execute in order:
   - `dayNightSystem` - Time of day, ambient darkness, fireflies
   - `movementSystem` - Unit pathfinding via Yuka steering
   - `collisionSystem` - Planck.js broadphase overlap resolution
   - `gatheringSystem` - Resource collection and dropoff (both factions)
   - `buildingSystem` - Construction progress and repair
   - `combatSystem` - Tower auto-attack, aggro, melee/ranged combat with damage multipliers
   - `projectileSystem` - Projectile movement and impact
   - `trainingSystem` - Unit production from buildings
   - `aiSystem` - Enemy economy (gatherer spawning, resource collection), wave spawning, nest defense, attack decisions
   - `evolutionSystem` - Enemy tier evolution, poison ticks (VenomSnake), Alpha Predator damage aura
   - `autoBehaviorSystem` - Player auto-gather/defend/attack/heal/scout
   - `autoBuildSystem` - Pressure-based auto-building when enabled
   - `healthSystem` - Damage, healing, death, kill streaks, win/lose
   - `veterancySystem` - Kill tracking, rank-up bonuses (HP/damage/speed)
   - `fogOfWarSystem` - Visibility based on unit positions
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

## Enemy AI Architecture

The enemy AI runs a full parallel economy and makes strategic decisions through the `aiSystem`. All sub-systems run on independent timers and share the `world.enemyResources` stockpile (starting: 500 clams, 200 twigs).

```
aiSystem()
  |
  +-- enemyGathererSpawning (every 1200 frames)
  |     +-- Each nest spawns gatherers (50C, max 3 per nest)
  |     +-- Gatherers collect from nearest resource node -> enemyResources
  |
  +-- enemyBuildingConstruction (every 1800 frames)
  |     +-- Priority: Tower > Burrow > Expansion Nest
  |     +-- Placed within 200px of existing nests on tile grid
  |
  +-- enemyArmyTraining (every 300 frames)
  |     +-- Queues Gators/Snakes at each nest (max 3 in queue)
  |     +-- Composition adapts to counter player's army
  |     +-- Uses TrainingQueue component (240 frames per unit)
  |
  +-- enemyAttackDecision (every 600 frames)
  |     +-- Attacks when army >= 5 idle combat units
  |     +-- Targets weakest player building
  |     +-- Sends grouped attack-move
  |
  +-- enemyRetreatLogic (every 60 frames)
  |     +-- Units below 20% HP flee to nearest nest
  |
  +-- enemyScoutLogic (every 3600 frames)
  |     +-- Spawns Snake scouts, 70% biased toward player Lodge
  |
  +-- nestDefenseReinforcement (every 600 frames)
  |     +-- Nests below 50% HP spawn defenders (costs resources)
  |
  +-- bossWaveLogic (every 3 wave intervals after wave 10)
        +-- Boss Croc spawns from each nest

evolutionSystem()
  |
  +-- Tier check (every 600 frames)
  |     +-- Compare game minutes since peace vs. THRESHOLDS [5, 10, 15, 25, 40]
  |     +-- On tier-up: unlock new enemy unit kind, announce with red warning text
  |
  +-- Poison tick (every 60 frames)
  |     +-- VenomSnake poison: 2 damage/sec to poisoned entities
  |     +-- Green particle effects on poisoned units
  |
  +-- Alpha Predator damage aura (every 60 frames)
        +-- +20% damage buff to all enemy units within 200px radius
        +-- Buff expires after 60 frames if out of range

autoBuildSystem()
  |
  +-- Pressure evaluation (every 300 frames, if autoBehaviors.build enabled)
  |     +-- Score: Under attack no tower (120), Pop cap (100), No armory (80), Resources depleting (60)
  |     +-- Filter by affordability, sort by score descending
  |
  +-- Build execution
        +-- Find idle gatherer
        +-- Find valid tile position in expanding rings around Lodge
        +-- Deduct resources, spawn building, assign gatherer to build
```

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

`getDamageMultiplier(attackerKind, defenderKind)` in `entity-defs.ts` returns a multiplier (default 1.0) applied to all damage calculations in the combat system. This creates asymmetric matchups that reward mixed army composition.

## Directory Structure

```
src/
+-- ai/                 # Yuka.js steering manager
|   +-- yuka-manager.ts # Faction-agnostic vehicle management, formation flocking
+-- audio/              # Tone.js audio system
|   +-- audio-system.ts # SFX, procedural music, ambient sounds
+-- config/             # Game balance and definitions
|   +-- entity-defs.ts  # All 30 entity types with stats + damage multiplier table
|   +-- keymap.ts       # Remappable keyboard bindings
|   +-- tech-tree.ts    # 15 technology upgrades with prerequisites
+-- constants.ts        # Game tuning constants (veterancy thresholds, enemy economy, etc.)
+-- ecs/                # Entity Component System
|   +-- archetypes.ts   # Entity spawn templates
|   +-- components.ts   # 14 SoA components + 5 tag components (incl. Veterancy)
|   +-- systems/        # 16 game systems (see Game Loop)
|   +-- world.ts        # GameWorld state container (incl. enemyResources)
+-- game.ts             # Main orchestrator (loop, sync, init)
+-- input/              # Input handling
|   +-- keyboard.ts     # Key bindings + camera pan
|   +-- pointer.ts      # Mouse/touch + minimap interaction
|   +-- selection.ts    # Unit selection, building, commands, formation positioning
+-- physics/            # Planck.js collision world
+-- platform/           # Capacitor mobile integration
+-- rendering/          # Visual output
|   +-- pixi-app.ts     # Primary PixiJS 8 renderer (860+ lines)
|   +-- animations.ts   # anime.js entity/camera animations
|   +-- background.ts   # Procedural terrain generation
|   +-- camera.ts       # Camera clamping + screen shake
|   +-- fog-renderer.ts # Fog-of-war Canvas2D overlay
|   +-- light-renderer.ts # Dynamic lighting + fireflies
|   +-- minimap-renderer.ts # Minimap with pings
|   +-- particles.ts    # Particle rendering
|   +-- sprites.ts      # Procedural sprite generation
+-- save-system.ts      # Game save/load serialization
+-- storage/            # Persistence layer
|   +-- database.ts     # SQLite via capacitor-sqlite + jeep-sqlite (no localStorage)
+-- types.ts            # TypeScript types and enums
+-- ui/                 # Preact components
    +-- app.tsx          # Root component
    +-- store.ts         # Reactive signals (30+ signals)
    +-- hud.tsx          # Top bar (resources, timer, buttons)
    +-- selection-panel.tsx # Selected entity info
    +-- action-panel.tsx # Context-sensitive action buttons
    +-- radial-menu.tsx  # Idle unit auto-behavior menu
    +-- sidebar.tsx      # Left panel layout
    +-- game-over.tsx    # Win/lose overlay
    +-- intro-overlay.tsx # Start screen
    +-- keyboard-reference.tsx # Keyboard shortcut reference overlay
    +-- error-boundary.tsx # Error handling
```

## Key Design Decisions

- **bitECS SoA components** over traditional OOP entities for cache-friendly iteration
- **Preact Signals** for reactive UI without re-rendering the entire tree
- **PixiJS 8 + Canvas2D overlays** - PixiJS for entities/sprites, Canvas2D for fog/lighting (blend modes)
- **Yuka.js for ALL units** (not just enemies) - smooth steering with separation/wander/flee/formation behaviors
- **Mouse/touch-first design** - every action has a clickable UI element, keyboard shortcuts are secondary
- **Fixed timestep with variable rendering** - deterministic game logic at 60 FPS
- **Parallel economies** - enemy AI uses the same resource/gathering systems as the player, creating genuine competition
- **Damage multiplier table** - centralized in `DAMAGE_MULTIPLIERS` for easy balance tuning
- **Veterancy as incremental deltas** - bonuses are applied as differences between ranks, preventing double-counting on rank-up
- **SQLite persistence** - uses capacitor-sqlite + jeep-sqlite for ALL platforms (web: sql.js + IndexedDB, native: native SQLite). No localStorage fallback -- SQLite is required
- **Enemy evolution system** - tier-based progressive difficulty that unlocks new enemy types over time, encouraging player adaptation
- **Pressure-based auto-build** - scores building needs by urgency (attack defense, pop cap, military production, resource expansion) rather than simple timers
