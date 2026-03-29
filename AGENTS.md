# AGENTS.md - AI Agent Instructions for Pond Warfare

## Project Overview

Pond Warfare is a real-time strategy / tower defense game where otters defend their pond from predators. Built with bitECS, Preact, PixiJS 8, Yuka.js, Planck.js, Tone.js, and anime.js.

## Quick Start

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server (Vite 8)
pnpm test       # Run tests (Vitest 4, 256 tests)
pnpm typecheck  # TypeScript 6 strict mode
pnpm build      # Production build
pnpm lint:fix   # Biome auto-fix
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system overview.

**Key pattern:** ECS game state lives in `GameWorld` (src/ecs/world.ts). UI reads from reactive `signal()` values in `src/ui/store.ts`. The game orchestrator (`src/game.ts`) syncs world → store every 30 frames via `syncUIStore()`.

## Core Conventions

### ECS Components (bitECS 0.4)

Components are SoA typed arrays created with `soa()`:
```typescript
export const Health = soa({ current: [] as number[], max: [] as number[], flashTimer: [] as number[] });
```

Access: `Health.current[eid]`, `Position.x[eid]`, etc.

Queries: `query(world.ecs, [Position, Health, FactionTag])` returns entity ID arrays.

### Adding a New Entity Type

1. Add to `EntityKind` enum in `src/types.ts`
2. Add stats to `ENTITY_DEFS` in `src/config/entity-defs.ts`
3. Add sprite to `SpriteId` enum and `generateSprites()` in `src/rendering/sprites.ts`
4. Add spawn mapping in `src/ecs/archetypes.ts` (`KIND_TO_SPRITE`)
5. Add string mapping in `entityKindFromString()` and `entityKindName()`

### Adding a New ECS System

1. Create `src/ecs/systems/my-system.ts` exporting `function mySystem(world: GameWorld): void`
2. Import and add to the system execution chain in `src/game.ts` `updateLogic()` (order matters)
3. Add tests in `tests/ecs/my-system.test.ts`

### UI Components (Preact + Signals)

- Components are in `src/ui/`
- State flows: `GameWorld` → `syncUIStore()` → `store.ts` signals → UI components
- User actions flow back: UI `onClick` → modify `world` state directly (via game instance)
- All UI must be mouse/touch accessible - no keyboard-only actions

### Steering Behaviors (Yuka.js)

All units use Yuka.js for movement (not just enemies). The `YukaManager`:
- `addUnit(eid, x, y, speed, targetX, targetY)` - register any unit
- `removeUnit(eid)` - unregister on arrival/death
- `setWander(eid)` - idle patrol behavior
- `setFlee(eid, x, y)` - temporary escape (auto-expires after 90 frames)
- All vehicles have `SeparationBehavior` (weight 0.6) to prevent stacking

### Audio (Tone.js)

- SFX: Call `audio.hit()`, `audio.shoot()`, etc. (see AudioSystem class)
- Music: `audio.startMusic(peaceful)` / `audio.stopMusic()`
- Ambient: `audio.updateAmbient(darkness)` syncs day/night sounds
- All audio respects `audio.muted` toggle

## File Map

| File | Purpose | Lines |
|------|---------|-------|
| `src/game.ts` | Game orchestrator, loop, UI sync | ~1200 |
| `src/rendering/pixi-app.ts` | PixiJS 8 renderer | ~860 |
| `src/ecs/systems/*.ts` | 13 ECS game systems | ~50-250 each |
| `src/ui/store.ts` | 30+ reactive signals | ~120 |
| `src/audio/audio-system.ts` | SFX + music + ambient | ~350 |
| `src/ai/yuka-manager.ts` | Steering behavior manager | ~180 |
| `src/config/entity-defs.ts` | Entity stats/balance | ~240 |

## Testing

Tests mirror the `src/` structure under `tests/`. Use `createGameWorld()` and manual component setup for ECS tests. Movement tests need `world.yukaManager.update()` between ticks since all units use Yuka steering.

## Documentation

- [Architecture](docs/architecture.md) - System overview, game loop, data flow
- [Gameplay](docs/gameplay.md) - Units, buildings, tech tree, combat, waves
- [Libraries](docs/libraries.md) - How each dependency is utilized

## Important Notes

- **Mouse/touch first**: Every game action must have a clickable UI element. Mobile (Capacitor/Android) is a first-class target.
- **Auto-behaviors are optional**: Auto-gather/defend/attack are toggled via the idle radial menu, not hardcoded.
- **Buildings unlock through gameplay**: Watchtower requires Eagle Eye tech. Don't show locked buildings.
- **Player units use Yuka too**: Not just enemies. All moving entities register with YukaManager for smooth steering.
