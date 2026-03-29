# Architecture

Pond Warfare uses an Entity Component System (ECS) architecture powered by bitECS, with Preact for UI and PixiJS 8 for rendering.

## System Overview

```
                    ┌─────────────┐
                    │   main.tsx   │  Preact entry point
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   app.tsx   │  Root component, mounts game
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   game.ts   │  Game orchestrator (1200+ lines)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │  ECS World  │ │  UI  │ │  Rendering  │
       │  (bitECS)   │ │Store │ │  (PixiJS)   │
       └──────┬──────┘ └──────┘ └─────────────┘
              │
    ┌─────────┼─────────┐
    │   12 ECS Systems   │
    │  (run every frame) │
    └────────────────────┘
```

## Game Loop

The game runs a fixed-timestep loop at 60 FPS. Each frame:

1. **Input** - Keyboard/pointer events update world state
2. **Yuka AI** - Steering behaviors update (1/60s step)
3. **Physics sync** - Create/remove Planck.js bodies
4. **ECS Systems** - Execute in order:
   - `dayNightSystem` - Time of day, ambient darkness, fireflies
   - `movementSystem` - Unit pathfinding via Yuka steering
   - `collisionSystem` - Planck.js broadphase overlap resolution
   - `gatheringSystem` - Resource collection and dropoff
   - `buildingSystem` - Construction progress and repair
   - `combatSystem` - Tower auto-attack, aggro, melee/ranged combat
   - `projectileSystem` - Projectile movement and impact
   - `trainingSystem` - Unit production from buildings
   - `aiSystem` - Wave spawning, nest defense, boss waves
   - `autoBehaviorSystem` - Player auto-gather/defend/attack
   - `healthSystem` - Damage, healing, death, win/lose
   - `fogOfWarSystem` - Visibility based on unit positions
   - `cleanupSystem` - Particle/corpse/ping decay
5. **Camera** - Pan velocity, tracking lerp, screen shake
6. **UI Sync** - Every 30 frames, sync world state to Preact signals
7. **Render** - PixiJS entities + Canvas2D overlays (fog, light, minimap)

## Data Flow

```
GameWorld (ECS)  ──sync every 30 frames──▶  Store (Preact Signals)  ──reactive──▶  UI Components
     │                                                                                  │
     │                                                                                  │
     ◀──────────────────── user actions (click, button press) ──────────────────────────┘
```

## Directory Structure

```
src/
├── ai/                 # Yuka.js steering manager
│   └── yuka-manager.ts # Faction-agnostic vehicle management
├── audio/              # Tone.js audio system
│   └── audio-system.ts # SFX, procedural music, ambient sounds
├── config/             # Game balance and definitions
│   ├── entity-defs.ts  # All 15 entity types with stats
│   ├── keymap.ts       # Remappable keyboard bindings
│   └── tech-tree.ts    # 5 technology upgrades
├── ecs/                # Entity Component System
│   ├── archetypes.ts   # Entity spawn templates
│   ├── components.ts   # 12 SoA components + 5 tag components
│   ├── systems/        # 13 game systems (see Game Loop)
│   └── world.ts        # GameWorld state container
├── game.ts             # Main orchestrator (loop, sync, init)
├── input/              # Input handling
│   ├── keyboard.ts     # Key bindings + camera pan
│   ├── pointer.ts      # Mouse/touch + minimap interaction
│   └── selection.ts    # Unit selection, building, commands
├── physics/            # Planck.js collision world
├── platform/           # Capacitor mobile integration
├── rendering/          # Visual output
│   ├── pixi-app.ts     # Primary PixiJS 8 renderer (860+ lines)
│   ├── animations.ts   # anime.js entity/camera animations
│   ├── background.ts   # Procedural terrain generation
│   ├── camera.ts       # Camera clamping + screen shake
│   ├── fog-renderer.ts # Fog-of-war Canvas2D overlay
│   ├── light-renderer.ts # Dynamic lighting + fireflies
│   ├── minimap-renderer.ts # Minimap with pings
│   ├── particles.ts    # Particle rendering
│   └── sprites.ts      # Procedural sprite generation
├── save-system.ts      # Game save/load serialization
├── types.ts            # TypeScript types and enums
└── ui/                 # Preact components
    ├── app.tsx          # Root component
    ├── store.ts         # Reactive signals (30+ signals)
    ├── hud.tsx          # Top bar (resources, timer, buttons)
    ├── selection-panel.tsx # Selected entity info
    ├── action-panel.tsx # Context-sensitive action buttons
    ├── radial-menu.tsx  # Idle unit auto-behavior menu
    ├── sidebar.tsx      # Left panel layout
    ├── game-over.tsx    # Win/lose overlay
    ├── intro-overlay.tsx # Start screen
    └── error-boundary.tsx # Error handling
```

## Key Design Decisions

- **bitECS SoA components** over traditional OOP entities for cache-friendly iteration
- **Preact Signals** for reactive UI without re-rendering the entire tree
- **PixiJS 8 + Canvas2D overlays** - PixiJS for entities/sprites, Canvas2D for fog/lighting (blend modes)
- **Yuka.js for ALL units** (not just enemies) - smooth steering with separation/wander/flee behaviors
- **Mouse/touch-first design** - every action has a clickable UI element, keyboard shortcuts are secondary
- **Fixed timestep with variable rendering** - deterministic game logic at 60 FPS
