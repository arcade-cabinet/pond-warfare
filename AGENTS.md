# AGENTS.md - AI Agent Instructions for Pond Warfare

## Project Overview

Pond Warfare is a Warcraft II-style real-time strategy game where otters and predators compete for territory and resources in a pond ecosystem. Two playable factions gather resources, build bases, train armies, and fight for map control. Features 33 entity types, 25 techs across 3 branches (with 3 active abilities), 5 campaign missions, 2 playable factions, 5 AI personalities, 7 commanders, 4 ranked tiers, 6 map scenarios, 15 achievements, 18 unlockables, unit-specific SFX, an enemy evolution system with 5 tiers + threat escalation, pressure-based auto-building, permadeath mode, 5 difficulty levels, custom game settings, cosmetic system, and kill streaks. Built with bitECS, Preact, PixiJS 8, Yuka.js, Planck.js, Tone.js, and anime.js. Persistence via SQLite (capacitor-sqlite + jeep-sqlite).

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

**Key pattern:** ECS game state lives in `GameWorld` (src/ecs/world.ts). UI reads from reactive `signal()` values in `src/ui/store.ts`. The game orchestrator (`src/game.ts`) syncs world -> store every 30 frames via `syncUIStore()`.

## Core Conventions

### ECS Components (bitECS 0.4)

Components are SoA typed arrays created with `soa()`:
```typescript
export const Health = soa({ current: [] as number[], max: [] as number[], flashTimer: [] as number[] });
```

Access: `Health.current[eid]`, `Position.x[eid]`, etc.

Queries: `query(world.ecs, [Position, Health, FactionTag])` returns entity ID arrays.

### Resources

Three resource types plus food (population):
- **Clams** (from Clambed nodes) -- primary currency for units, buildings, tech
- **Twigs** (from Cattail nodes) -- building and tech costs
- **Pearls** (from PearlBed nodes) -- rare resource for elite technologies (Hardened Shells, Siege Works)
- **Food** -- population cap from Lodges (+8), Burrows (+6), Fishing Huts (+2)

### Enemy Evolution

The enemy faction progressively unlocks stronger unit types after peace ends:
- Tier 0 (start): Gator + Snake
- Tier 1 (5 min): Armored Gator -- tanky melee
- Tier 2 (10 min): Venom Snake -- poison DoT
- Tier 3 (15 min): Swamp Drake -- fast flanker
- Tier 4 (25 min): Siege Turtle -- anti-building (3x vs buildings)
- Tier 5 (40 min): Alpha Predator -- hero with +20% damage aura

Evolution state is tracked in `world.enemyEvolution`. The `evolutionSystem` also handles poison ticks and alpha damage aura.

### Auto-Build System

When `world.autoBehaviors.build` is true, the `autoBuildSystem` evaluates build pressures every 300 frames and assigns an idle gatherer to construct the highest-priority affordable building. Pressure scores: under attack (120), pop cap (100), no armory (80), resources depleting (60).

### Adding a New Entity Type

1. Add to `EntityKind` enum in `src/types.ts`
2. Add stats to `ENTITY_DEFS` in `src/config/entity-defs.ts`
3. Add damage multipliers to `DAMAGE_MULTIPLIERS` if the unit has counter relationships
4. Add sprite to `SpriteId` enum and `generateSprites()` in `src/rendering/sprites.ts`
5. Add spawn mapping in `src/ecs/archetypes.ts` (`KIND_TO_SPRITE`)
6. Add string mapping in `entityKindFromString()` and `entityKindName()`

### Adding a New ECS System

1. Create `src/ecs/systems/my-system.ts` exporting `function mySystem(world: GameWorld): void`
2. Import and add to the system execution chain in `src/game.ts` `updateLogic()` (order matters)
3. Add tests in `tests/ecs/my-system.test.ts`

### Unit Counter System

Damage multipliers are defined in `DAMAGE_MULTIPLIERS` (src/config/entity-defs.ts). Use `getDamageMultiplier(attackerKind, defenderKind)` in combat calculations. Returns 1.0 for unlisted matchups. Both melee and projectile damage apply the multiplier.

### Veterancy System

Units track kills in `Combat.kills[eid]`. The `Veterancy` component stores `rank` and `appliedRank`. The `veterancySystem` (src/ecs/systems/veterancy.ts) checks kills against thresholds every 60 frames and applies incremental stat bonuses. Rank thresholds and bonus percentages are in `src/constants.ts` (`VET_THRESHOLDS`, `VET_HP_BONUS`, `VET_DMG_BONUS`, `VET_SPD_BONUS`).

### Formation Movement

Group move commands trigger role-based formation positioning in `issueContextCommand()` (src/input/selection.ts). Units are sorted into melee/ranged/support rows via `calculateFormationPositions()`. The `YukaManager.setFormation()` method adds AlignmentBehavior and CohesionBehavior for flocking. Formation behaviors are cleared on arrival.

### Enemy AI

The enemy runs a full parallel economy and strategic AI tracked in `world.enemyResources`. The `aiSystem` (src/ecs/systems/ai.ts) is decomposed into sub-functions:
- `enemyGathererSpawning` - spawns gatherers from nests (50C, max 3/nest, every 1200 frames)
- `enemyBuildingConstruction` - builds Towers, Burrows, expansion Nests (every 1800 frames)
- `enemyArmyTraining` - queues Gators/Snakes at nests via TrainingQueue, adapts composition to counter player army
- `enemyAttackDecision` - attacks when army >= 5 idle units, targets weakest player building
- `enemyRetreatLogic` - retreats units below 20% HP to nearest nest
- `enemyScoutLogic` - sends Snake scouts every 3600 frames, 70% biased toward player Lodge
- `nestDefenseReinforcement` - spawns defenders when nest HP < 50%
- `bossWaveLogic` - Boss Crocs spawn every 3 wave intervals after wave 10

All costs/intervals are in `src/constants.ts` (`ENEMY_*` constants).

### UI Components (Preact + Signals)

- Components are in `src/ui/`
- State flows: `GameWorld` -> `syncUIStore()` -> `store.ts` signals -> UI components
- User actions flow back: UI `onClick` -> modify `world` state directly (via game instance)
- All UI must be mouse/touch accessible - no keyboard-only actions

### Steering Behaviors (Yuka.js)

All units use Yuka.js for movement (not just enemies). The `YukaManager`:
- `addUnit(eid, x, y, speed, targetX, targetY)` - register any unit
- `removeUnit(eid)` - unregister on arrival/death
- `setWander(eid)` - idle patrol behavior
- `setFlee(eid, x, y)` - temporary escape (auto-expires after 90 frames)
- `setFormation(eids, targetX, targetY)` - add flocking behaviors for group movement
- `isInFormation(eid)` - check if unit has flocking behaviors
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
| `src/rendering/pixi/entity-renderer.ts` | PixiJS entity rendering, recoloring, health bars | ~371 |
| `src/rendering/recolor.ts` | Sprite recoloring: 14 presets for cosmetics/veterancy/champions | ~224 |
| `src/ecs/systems/*.ts` | 18 ECS game systems | ~50-800 each |
| `src/ecs/systems/ai.ts` | Enemy AI economy, training, attack decisions | ~800 |
| `src/ecs/systems/veterancy.ts` | Veterancy rank-up system | ~130 |
| `src/ui/store.ts` | 60+ reactive signals | ~308 |
| `src/audio/audio-system.ts` | SFX orchestrator + music + ambient | ~350 |
| `src/audio/sfx.ts` | SfxManager: 25+ synth SFX with spatial panning | ~318 |
| `src/ai/yuka-manager.ts` | Steering + formation flocking manager | ~380 |
| `src/config/entity-defs.ts` | 33 entity types, stats, damage multipliers | ~510 |
| `src/config/tech-tree.ts` | 25 technologies with prerequisite chains + active abilities | ~263 |
| `src/config/ai-personalities.ts` | 5 AI personalities with multiplier configs | ~88 |
| `src/config/commanders.ts` | 7 commander definitions with aura/passive bonuses | ~168 |
| `src/config/factions.ts` | 2 playable factions with unit mappings | ~88 |
| `src/config/unlocks.ts` | 18 unlockable items across 5 categories | ~184 |
| `src/campaign/missions.ts` | 5 campaign missions with objectives + dialogue | ~445 |
| `src/systems/achievements.ts` | 15 achievements with SQLite persistence | ~326 |
| `src/systems/leaderboard.ts` | Ranked progression + win streak tracking | ~159 |
| `src/ecs/systems/evolution.ts` | Enemy evolution (5 tiers) + threat escalation | ~160 |
| `src/ecs/systems/auto-build.ts` | Pressure-based auto-building | ~260 |
| `src/input/selection.ts` | Selection, commands, formation positioning | ~550 |
| `src/storage/database.ts` | SQLite: saves, settings, game_history, unlocks, player_profile | ~100 |
| `src/utils/spatial-hash.ts` | SpatialHash grid for O(n) proximity queries | ~80 |
| `src/utils/particles.ts` | Particle spawning with pool + throttling | ~68 |
| `src/constants.ts` | Tuning constants (vet thresholds, enemy economy, AI timers) | ~140 |

## Testing

Tests mirror the `src/` structure under `tests/`. Use `createGameWorld()` and manual component setup for ECS tests. Movement tests need `world.yukaManager.update()` between ticks since all units use Yuka steering.

## Documentation

- [Architecture](docs/architecture.md) - System overview, game loop, data flow, enemy AI, veterancy, formations, performance
- [Gameplay](docs/gameplay.md) - Units, buildings, 25 techs, combat, campaign, factions, AI personalities, leaderboards, commanders, cosmetics
- [Libraries](docs/libraries.md) - How each dependency is utilized
- [Design Bible](docs/design-bible.md) - Vision, macro/meso/micro design, completed roadmap

## Important Notes

- **Mouse/touch first**: Every game action must have a clickable UI element. Mobile (Capacitor/Android) is a first-class target.
- **Auto-behaviors are optional**: Auto-gather/build/defend/attack/heal/scout are toggled via the idle radial menu, not hardcoded.
- **Buildings unlock through gameplay**: Watchtower requires Eagle Eye tech, Shieldbearer requires Iron Shell, etc. Don't show locked buildings/units.
- **Player units use Yuka too**: Not just enemies. All moving entities register with YukaManager for smooth steering.
- **Both factions use the same systems**: Gathering, movement, and combat work identically for player and enemy units. The enemy just gets its orders from the AI system instead of user input.
- **Damage multipliers are centralized**: All counter relationships live in `DAMAGE_MULTIPLIERS` in entity-defs.ts. Don't hardcode damage modifiers elsewhere.
- **Veterancy bonuses are incremental**: The system applies the delta between old and new rank bonuses, not the full bonus, to prevent double-counting.
- **SQLite is required**: Persistence uses capacitor-sqlite + jeep-sqlite. There is no localStorage fallback. If SQLite init fails, the app cannot start.
- **Enemy evolution is time-based**: Evolution tiers unlock based on minutes since peace ended, not player actions. The system also manages poison ticks and alpha damage aura.
- **Pearls are the rare resource**: Only found at PearlBed nodes (500 each), required for elite techs like Hardened Shells (30P) and Siege Works (50P).
