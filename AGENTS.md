# AGENTS.md - AI Agent Instructions for Pond Warfare

## Project Overview

Pond Warfare is a Warcraft II-style real-time strategy game where otters and predators compete for territory and resources in a pond ecosystem. Two playable factions gather resources, build bases, train armies, and fight for map control.

**Feature summary:** 44 entity types (12 player units, 9 enemy units, ~15 buildings, 3 resources), 25 techs across 5 branches (Lodge, Nature, Warfare, Fortifications, Shadow) with 3 active abilities, 5 campaign missions with branching after Mission 3 and campaign briefing screen, 10 puzzle missions, 2 playable factions, 5 AI personalities, 7 commanders with passives + active abilities, 4 ranked tiers, 9 map scenarios, 4 weather types, 5 game modes (Skirmish, Campaign, Survival, Puzzles, Co-op), 40 achievements, 26 unlockables, P2P co-op multiplayer (Trystero/WebRTC lockstep), daily challenges with XP/level system, match history, 8 random in-game event types, deterministic dual-layer PRNG (zero Math.random in gameplay), unit-specific SFX with spatial panning, an enemy evolution system with 5 tiers + threat escalation, pressure-based auto-building, Yuka governor AI player, advisor system (3 advisors), replay system, permadeath mode, 5 difficulty levels, custom game settings, cosmetic system, kill streaks, terrain system (6 types), morale and flanking mechanics, event feed, enhanced minimap with legend, idle unit indicators, ctrl group badges, tooltips, hotkeys, build placement preview, Quick Play, loading screen, unlock progression display with next-unlock hint, wave announcements, settings persistence, commander selection persistence, accordion UI with pond watercolor aesthetic, Maestro mobile testing, Android APK builds.

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

**Key pattern:** ECS game state lives in `GameWorld` (src/ecs/world.ts). UI reads from reactive `signal()` values in `src/ui/store.ts` (core signals) + `src/ui/store-weather.ts` (weather) + `src/ui/store-gameplay.ts` (game over, campaign, puzzle, replay, abilities). The game orchestrator (`src/game.ts` + `src/game/`) syncs world -> store every 30 frames via `syncUIStore()`.

## Design System (Design Bible)

The visual identity follows the design bible at `docs/brand/`. Reference components at `docs/brand/ui-reference-full.jsx`.

### Design Tokens
Import from `@/ui/design-tokens`:
- `COLORS` — grittyGold, mossGreen, weatheredSteel, woodBase, vineBase, etc.
- `FONTS` — header (IM Fell English SC), body (Open Sans)
- `FRAME` — cornerSize (60px)

### Frame9Slice (SVG 9-Slice Panel System)
Import from `@/ui/components/frame`:
- `Frame9Slice` — CSS grid wrapper assembling SVG corners, edges, and center panel
- `CenterPanel` — Standalone dark interior with grunge filter

Props: `{ children, title?, isExpanded?, onClick?, class? }`

Used for: ALL panels, modals, accordion sections. No PNG assets needed.

### SVG Filters
`SvgFilters` component (mounted at app root) provides:
- `url(#grunge-heavy)` — Fractal noise worn texture
- `url(#organic-wood)` — Directional wood grain + displacement warp
- `url(#swamp-glow)` — Dual drop-shadow (black + moss green)

### SVG Sprites
Import from `@/ui/components/sprites`:
- `SpriteOtter` — Assault infantry (idle + attack frames)
- `SpriteCroc` — Siege heavy (idle + attack with gatling)
- `SpriteSnake` — Sniper specialist (idle + attack with laser)

CSS animations: `.sprite-frame-1` / `.sprite-frame-2` toggle frames at 0.4s steps.

### SwampEcosystem
Canvas background component with animated fog blobs + fireflies. Rendered at app root for menu screens.

### Typography
- Headers: `font-heading` class → IM Fell English SC
- Body: `font-game` class → Open Sans
- Numbers: `font-numbers` class → JetBrains Mono

### Button Styles
- `.rts-btn` — Primary warfare button (dark bg, bark border, sepia text, uppercase)
- `.rts-btn.active` — Gold border, moss background glow
- `.action-btn` — In-game action button (wood gradient)
- `.hud-btn` — Compact HUD control button

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
- **Food** -- population cap from Lodges (+8), Burrows (+6), Fishing Huts (+2), Docks (+2)

### Player Units (16 types)

| Unit | HP | Speed | Damage | Range | Cost (C/T) | Role |
|------|----|-------|--------|-------|-------------|------|
| Gatherer | 30 | 2.0 | 2 | 40 | 50/0 | Economy worker |
| Brawler | 60 | 1.8 | 6 | 40 | 100/50 | Melee DPS |
| Sniper | 40 | 1.6 | 8 | 180 | 80/80 | Ranged DPS |
| Healer | 35 | 1.8 | 0 | 0 | 50/30 | Support healer |
| Shieldbearer | 100 | 1.4 | 3 | 35 | 150/100 | Heavy tank |
| Scout | 20 | 3.0 | 1 | 30 | 35/0 | Fast recon |
| Catapult | 50 | 0.8 | 20 | 250 | 300/200 | Siege weapon |
| Swimmer | 35 | 2.8 | 4 | 40 | 60/30 | Amphibious unit |
| Trapper | 30 | 1.6 | 0 | 100 | 80/60 | Slow trap specialist |
| Commander | 80 | 2.0 | 5 | 60 | -- | Hero unit (unique) |
| Diver | 25 | 2.5 | 8 | 40 | 60/40 | Stealth assassin (invisible in water) |
| Engineer | 40 | 1.5 | 1 | 40 | 80/60 | Bridge builder |
| Shaman | 30 | 1.6 | 0 | 0 | 70/50 | AoE healer |
| Otter Warship | 80 | 1.5 | 12 | 200 | 200/150 | Naval ranged |
| Berserker | 60 | 2.0 | 15 | 40 | 120/80 | Rage melee (damage increases at low HP) |
| Frog/Fish | 5 | 0.5-1.0 | 0 | 0 | -- | Ambient critters |

### Enemy Units (10 types)

| Unit | HP | Speed | Damage | Range | Tier | Role |
|------|----|-------|--------|-------|------|------|
| Gator | 60 | 1.8 | 6 | 40 | 0 | Melee fighter |
| Snake | 60 | 2.0 | 4 | 40 | 0 | Fast melee |
| Armored Gator | 120 | 1.0 | 8 | 40 | 1 | Tanky melee |
| Venom Snake | 40 | 2.2 | 3 | 40 | 2 | Poison DoT |
| Swamp Drake | 50 | 2.0 | 6 | 60 | 3 | Fast flanker |
| Siege Turtle | 250 | 0.5 | 25 | 50 | 4 | Anti-building (3x vs buildings) |
| Alpha Predator | 500 | 1.0 | 12 | 50 | 5 | Hero with +20% damage aura |
| Boss Croc | 200 | 1.2 | 15 | 50 | Boss | Boss wave unit |
| Burrowing Worm | 60 | 1.0 | 10 | 40 | Event | Underground ambusher |
| Flying Heron | 20 | 3.5 | 4 | 40 | Event | Ignores terrain |

### Buildings (15 types)

**Player:** Lodge (1500 HP, +8 food), Burrow (300 HP, +6 food), Armory (500 HP), Tower (500 HP, 10 dmg), Watchtower (800 HP, 15 dmg), Wall (400 HP), Wall Gate (80 HP), ScoutPost (200 HP), FishingHut (250 HP, +2 food), HerbalistHut (300 HP), Market (100 HP, resource trading), Dock (120 HP, +2 food), Shrine (60 HP, 300C/200T/25P)
**Enemy:** PredatorNest (1000 HP)
**Resource:** Clambed, Cattail, PearlBed

### Enemy Evolution

The enemy faction progressively unlocks stronger unit types after peace ends:
- Tier 0 (start): Gator + Snake
- Tier 1 (5 min): Armored Gator -- tanky melee
- Tier 2 (10 min): Venom Snake -- poison DoT
- Tier 3 (15 min): Swamp Drake -- fast flanker
- Tier 4 (25 min): Siege Turtle -- anti-building (3x vs buildings)
- Tier 5 (40 min): Alpha Predator -- hero with +20% damage aura

Random events spawn Burrowing Worms and Flying Herons. Boss Crocs appear in boss wave intervals. Evolution state is tracked in `world.enemyEvolution`. Sub-systems: alpha-aura, heron-spawner, mega-wave, poison, threat-escalation, worm-spawner, random-events.

### Tech Tree (25 techs, 5 branches)

**Lodge (Economy & Expansion):** Cartography -> Trade Routes, Tidal Harvest -> Deep Diving -> Root Network
**Nature (Support & Healing):** Herbal Medicine -> Aquatic Training -> Regeneration, Herbal Medicine -> Pond Blessing, Deep Diving -> Tidal Surge
**Warfare (Offense & Damage):** Sharp Sticks -> Eagle Eye -> Piercing Shot, Sharp Sticks -> Battle Roar -> War Drums
**Fortifications (Defense & Siege):** Sturdy Mud -> Fortified Walls, Sharp Sticks -> Iron Shell, Eagle Eye -> Siege Works, Eagle Eye -> Hardened Shells
**Shadow (Subterfuge & Control):** Swift Paws -> Cunning Traps -> Camouflage, Swift Paws -> Rally Cry, Cunning Traps -> Venom Coating

Active abilities: **Pond Blessing** (heal all 20% HP), **Tidal Surge** (push + slow enemies), **Rally Cry** (all units +30% speed 10s)

### Commanders (7)

Each commander has a passive aura, a passive bonus, and an active ability (Q hotkey):

| Commander | Aura | Passive | Active (Cooldown) |
|-----------|------|---------|-------------------|
| Marshal (default) | +10% damage | None | Charge! 2x speed 5s (90s) |
| Sage (3 wins) | +25% research speed | +15% gather rate | Eureka! instant research (180s) |
| Warden (win Hard) | +200 building HP | Towers +20% atk speed | Fortify! buildings invuln 10s (120s) |
| Tidekeeper (200 pearls) | +0.4 speed | Swimmers -50% cost | Tidal Wave push (90s) |
| Shadowfang (win 0 losses) | -20% enemy damage | Traps last 2x | Vanish all invis 8s (120s) |
| Ironpaw (5 heroes) | +20% unit HP | Shieldbearers 2x train | Iron Will invuln 5s (150s) |
| Stormcaller (win Nightmare) | Catapults +50% range | Random lightning | Thunder Strike AoE (120s) |

### Map Scenarios (9)

Standard, Island, Contested, Labyrinth, River, Peninsula, Archipelago, Ravine, Swamp. Each has a dedicated init file in `src/game/init-entities/scenario-*.ts`.

### Terrain System (6 types)

| Terrain | Speed Mult | Notes |
|---------|-----------|-------|
| Grass | 1.0 | Standard |
| Water | 0 (impassable) | Swimmers, Divers, Warships bypass |
| Shallows | 0.5 | Blocked during rain |
| Mud | 0.75 | Slow terrain |
| Rocks | 0 (impassable) | |
| HighGround | 1.0 | Elevation bonus for combat |

Defined in `src/terrain/terrain-grid.ts`. Flying units (Heron) ignore all terrain modifiers. Warships prefer water (1.5x speed) over land (0.5x).

### Weather System (4 types)

Changes every 3-5 minutes, seeded from map seed for determinism:
- **Clear**: No modifiers
- **Rain**: -15% speed on grass, shallows become impassable (flooding)
- **Fog**: -40% vision range
- **Wind**: +-15px projectile drift

### Game Modes (5)

- **Skirmish**: Standard mode, destroy all enemy nests to win
- **Campaign**: 5 story missions with objectives and dialogue, branching after Mission 3 (path A/B), campaign briefing screen with recommended tech branches
- **Survival**: Endless waves, no nests, score-based
- **Puzzles**: 10 fixed-unit tactical puzzles with star ratings (First Strike, Stealth Run, Hold the Bridge, Economy Race, Commander Down, plus 5 advanced puzzles)
- **Co-op**: P2P 2-player cooperative via Trystero/WebRTC with deterministic lockstep synchronization

### Tactical Combat

- **Flanking**: Positional damage bonuses based on attack angle
- **Elevation**: HighGround terrain provides combat advantage
- **Morale**: Unit morale system affects combat effectiveness
- **Auto-Retreat**: Units below 20% HP retreat to nearest friendly building
- **Diver Stealth**: Invisible in water tiles, first-strike bonus
- **Engineer Bridges**: Can build temporary bridges over water
- **Shaman AoE Heal**: Area-of-effect healing for nearby units
- **Berserker Rage**: Damage increases as HP decreases
- **Counter System**: Damage multipliers in `DAMAGE_MULTIPLIERS` (entity-defs)

### Achievements (40)

Defined in `src/systems/achievement-defs.ts`. 40 achievements spanning combat, economy, campaign, co-op, daily challenges, and new systems. Examples include: First Blood, Triple Kill, Rampage, Victory, Hard Won, Nightmare Survivor, Hero of the Pond, Untouchable, Speed Demon, War Machine, Scholar, Pearl Diver, Master Builder, Endurance, Branch Master, Full Scholar, Commander's Guard, Shadow Strike, Eco Boom, Speed Runner, Turtle Shell, Grand Army, Pearl Hoarder, Flawless Victory, plus achievements for weather survival, warship kills, bridge building, diver ambushes, market trades, berserker streaks, shrine abilities, co-op victories, daily challenge completion, player levels, perfect puzzles, and random event encounters.

### Unlocks (22)

Defined in `src/config/unlocks.ts`. Categories: Scenarios (2), Presets (5), Units (4), Modifiers (4), Cosmetics (5 + 2 branch-themed).

### Advisor System

3 advisor roles (Economy, War, Builder) in `src/advisors/`. Pressure-based tips fire when game state conditions are met (not timed tutorials). Tips have priority, cooldowns, and per-game-once options. Players can dismiss tips permanently.

### Governor AI (Yuka-based)

A goal-based AI player in `src/governor/`. Uses Yuka.js Think/Goal architecture with 6 goal types: Gather, Build, Train, Research, Attack, Defend. Evaluators score each goal based on game state (resource levels, army size, threat level). The governor can play the player side autonomously.

### Replay System

Records game state snapshots in `src/replay/recorder.ts`. Playback via `src/replay/replay-viewer.ts` with speed control (1x, 2x, 4x, 8x) and pause. Stored in SQLite via `src/replay/replay-storage.ts`.

### P2P Co-op Multiplayer (Trystero/WebRTC)

2-player cooperative multiplayer using Trystero for WebRTC signaling via Nostr relays. Architecture in `src/net/`:
- `connection.ts` -- Room management, peer join/leave, typed message channels
- `lockstep.ts` -- Deterministic lockstep synchronizer with input delay buffering
- `multiplayer-controller.ts` -- High-level controller bridging net layer to game world
- `command-serializer.ts` -- Serializes game commands for network transmission
- `checksum.ts` -- Frame-level checksum for desync detection
- `types.ts` -- Protocol message types, lobby state, connection quality

The lockstep model buffers commands 3 frames ahead; a frame only executes when both players' inputs are received. Host commands apply before guest commands for deterministic ordering. Checksum validation detects desyncs. UI components: `MultiplayerMenu` (host/join), `MultiplayerLobby` (ready-up), `ConnectionStatus` HUD indicator, `DisconnectOverlay`.

### Daily Challenges & XP/Level System

Defined in `src/systems/daily-challenges.ts` and `src/systems/player-xp.ts`. A pool of 15 challenge templates rotates daily (deterministic from UTC date). Each challenge has an objective function evaluated at game end, awarding bonus XP on completion. Persisted in the SQLite settings table.

XP is earned from every game based on: base (100), win bonus (200), difficulty bonus (0-300), kill/building/tech bonuses, and daily challenge completion. Player level = totalXP / 500. Stored in the player_profile table.

### Match History

Stored in `src/storage/match-history.ts`. Saves match summaries (result, difficulty, scenario, commander, duration, kills, XP earned) to SQLite. Auto-prunes to the last 50 records. Displayed in `src/ui/match-history-panel.tsx`.

### Random In-Game Events (8 types)

Defined in `src/ecs/systems/random-events.ts`. Fire every 3-5 minutes (seeded from map seed for determinism). Each event lasts 30-60 seconds:

| Event | Effect |
|-------|--------|
| Resource Surge | Random resource node doubles remaining amount |
| Migrating Fish | 5-8 neutral fish spawn and wander |
| Predator Frenzy | All enemies +20% speed for 30 seconds |
| Healing Spring | Temporary healing zone heals nearby units |
| Fog Bank | Fog of war closes in by 30% for 60 seconds |
| Supply Drop | +100 clams, +50 twigs at random location |
| Earthquake | All buildings take 10% damage, screen shake |
| Blessing of the Pond | All player units +10% speed for 60 seconds |

### Deterministic PRNG

`src/utils/random.ts` provides a `SeededRandom` class (Mulberry32 variant) used for map generation, weather transitions, and random events. Zero `Math.random()` calls in gameplay code; all randomness is seeded from the map seed for replay determinism.

### Unlock Progression & Next-Unlock Hint

`src/systems/unlock-tracker.ts` tracks unlock progress. `src/systems/next-unlock-hint.ts` calculates the closest unearned unlock and its progress percentage, displayed in `src/ui/unlock-progress.tsx`. 26 unlockable items across 6 categories.

### Auto-Build System

When `world.autoBehaviors.build` is true, the `autoBuildSystem` evaluates build pressures every 300 frames and assigns an idle gatherer to construct the highest-priority affordable building. Pressure scores: under attack (120), pop cap (100), no armory (80), resources depleting (60).

### Adding a New Entity Type

1. Add to `EntityKind` enum in `src/types.ts`
2. Add stats to the appropriate sub-module in `src/config/entity-defs/` (player-units.ts, enemy-units.ts, or buildings.ts)
3. Add damage multipliers to `DAMAGE_MULTIPLIERS` in `src/config/entity-defs/damage-multipliers.ts`
4. Add sprite to `SpriteId` enum and `generateSprites()` in `src/rendering/sprites.ts`
5. Add spawn mapping in `src/ecs/archetypes.ts` (`KIND_TO_SPRITE`)
6. Add string mapping in `entityKindFromString()` and `entityKindName()` in `src/config/entity-defs/kind-helpers.ts`

### Adding a New ECS System

1. Create `src/ecs/systems/my-system.ts` exporting `function mySystem(world: GameWorld): void`
2. Import and add to the system execution chain in `src/game/systems-runner.ts` (order matters)
3. Add tests in `tests/ecs/my-system.test.ts`

### Unit Counter System

Damage multipliers are defined in `DAMAGE_MULTIPLIERS` (src/config/entity-defs/damage-multipliers.ts). Use `getDamageMultiplier(attackerKind, defenderKind)` in combat calculations. Returns 1.0 for unlisted matchups. Both melee and projectile damage apply the multiplier.

### Veterancy System

Units track kills in `Combat.kills[eid]`. The `Veterancy` component stores `rank` and `appliedRank`. The `veterancySystem` (src/ecs/systems/veterancy.ts) checks kills against thresholds every 60 frames and applies incremental stat bonuses. Rank thresholds and bonus percentages are in `src/constants.ts` (`VET_THRESHOLDS`, `VET_HP_BONUS`, `VET_DMG_BONUS`, `VET_SPD_BONUS`).

### Formation Movement

Group move commands trigger role-based formation positioning in `issueContextCommand()` (src/input/selection/commands.ts). Units are sorted into melee/ranged/support rows via `calculateFormationPositions()`. The `YukaManager.setFormation()` method adds AlignmentBehavior and CohesionBehavior for flocking. Formation behaviors are cleared on arrival.

### Enemy AI

The enemy runs a full parallel economy and strategic AI tracked in `world.enemyResources`. The AI system is decomposed into sub-files in `src/ecs/systems/ai/`:
- `enemy-economy.ts` - gatherer spawning, resource tracking (~138 LOC)
- `enemy-building.ts` - builds Towers, Burrows, expansion Nests (~150 LOC)
- `enemy-training.ts` - queues units at nests via TrainingQueue, adapts composition (~248 LOC)
- `enemy-combat.ts` - attack decisions, retreat, scouting, boss waves (~243 LOC)
- `enemy-defense.ts` - nest defense reinforcement (~166 LOC)
- `helpers.ts` - shared utility functions (~199 LOC)

AI personality multipliers modify behavior: Balanced, Turtle (2x towers), Rush (early attacks), Economic (3 nests, huge late army), Random (cycles every 3 min).

### UI Components (Preact + Signals)

- Components are in `src/ui/`
- State flows: `GameWorld` -> `syncUIStore()` -> `store.ts` signals -> UI components
- User actions flow back: UI `onClick` -> modify `world` state directly (via game instance)
- All UI must be mouse/touch accessible - no keyboard-only actions
- Accordion UI with pond watercolor aesthetic
- Mobile slide-out panel with Forces/Buildings/Map/Menu tabs

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

- SFX: Call `audio.hit()`, `audio.shoot()`, etc. (see AudioSystem class in `src/audio/audio-system.ts`)
- Spatial SFX delegates in `src/audio/audio-spatial-sfx.ts` for worldX-panned sounds
- Music: `audio.startMusic(peaceful)` / `audio.stopMusic()`
- Ambient: `audio.updateAmbient(darkness)` syncs day/night sounds, scenario biomes
- Voices: Unit selection/command voice barks per faction
- Cues: Combat stinger, victory/defeat motifs, stat tick/total
- All audio respects `audio.muted` toggle + master/music/sfx volume

## File Map

| File | Purpose | Lines |
|------|---------|-------|
| `src/game.ts` | Game orchestrator entry point | ~300 |
| `src/game/*.ts` | Decomposed game modules (47 files) | ~20-300 each |
| `src/game/systems-runner.ts` | ECS system execution order | |
| `src/game/game-loop.ts` | Main update loop | |
| `src/game/game-init.ts` | World initialization | |
| `src/game/init-entities/scenario-*.ts` | 9 map scenario generators | |
| `src/game/action-panel/*.ts` | Lodge/Armory/Gatherer/Market button defs + tech helpers | |
| `src/rendering/pixi/entity-renderer.ts` | PixiJS entity rendering, recoloring, health bars | ~300 |
| `src/rendering/recolor.ts` | Sprite recoloring: 14 presets for cosmetics/veterancy/champions | ~224 |
| `src/ecs/systems/**/*.ts` | 57 ECS system files across 7 subdirs | ~40-250 each |
| `src/ecs/systems/ai/*.ts` | Enemy AI: economy, training, combat, defense, building | ~1200 total |
| `src/ecs/systems/evolution/*.ts` | Enemy evolution: tiers, poison, alpha aura, mega-waves, spawners | ~931 total |
| `src/ecs/systems/combat/*.ts` | Combat: melee, positional damage, commander aura, war drums, attack state | |
| `src/ecs/systems/health/*.ts` | Health: damage, death, healing, death particles | |
| `src/ecs/systems/movement/*.ts` | Movement: arrive, speed modifiers | |
| `src/ecs/systems/gathering/*.ts` | Gathering: depletion warning, passive income | |
| `src/ecs/systems/veterancy.ts` | Veterancy rank-up system | ~130 |
| `src/ecs/systems/morale.ts` | Unit morale system | |
| `src/ecs/systems/diver-stealth.ts` | Diver water stealth mechanic | |
| `src/ecs/systems/berserker.ts` | Berserker rage: damage scales with low HP | |
| `src/ecs/systems/engineer.ts` | Engineer bridge building | |
| `src/ecs/systems/shaman-heal.ts` | Shaman AoE healing | |
| `src/ecs/systems/weather.ts` | Weather transitions and effects | |
| `src/ecs/systems/wall-gate.ts` | Wall gate open/close | |
| `src/ecs/systems/shrine.ts` | Shrine building effects | |
| `src/ecs/systems/random-events.ts` | 8 random in-game event types | ~292 |
| `src/ecs/systems/branch-cosmetics.ts` | Tech branch cosmetic effects | |
| `src/ecs/systems/auto-retreat.ts` | Low-HP auto-retreat logic | |
| `src/ecs/systems/auto-build.ts` | Pressure-based auto-building | ~254 |
| `src/ecs/systems/auto-behavior.ts` | Auto-behavior dispatching | |
| `src/ecs/systems/fog-of-war.ts` | Fog of war visibility | |
| `src/ecs/systems/day-night.ts` | Day/night cycle | |
| `src/ui/store.ts` | Core reactive signals (resources, selection, menu, settings) | ~300 |
| `src/ui/store-weather.ts` | Weather signals | ~20 |
| `src/ui/store-gameplay.ts` | Game over, campaign, FPS, puzzle, replay, ability signals | ~73 |
| `src/ui/store-types.ts` | Shared interfaces (ResourceChange, FoodChange, CustomGameSettings) | ~67 |
| `src/audio/audio-system.ts` | AudioSystem class: volume, init, delegates | ~230 |
| `src/audio/audio-spatial-sfx.ts` | Spatial SFX delegate functions (worldX panning) | ~34 |
| `src/audio/audio-combat.ts` | Combat SFX with stinger integration | |
| `src/audio/sfx.ts` | SfxManager: 25+ synth SFX with spatial panning | ~290 |
| `src/audio/music.ts` | MusicManager: procedural music | |
| `src/audio/ambient.ts` | AmbientManager: scenario biome sounds | |
| `src/audio/cues.ts` | CueManager: combat/victory/defeat motifs | |
| `src/audio/voices.ts` | VoiceManager: faction voice barks | |
| `src/ai/yuka-manager.ts` | Steering + formation flocking manager | ~282 |
| `src/config/entity-defs.ts` | Entity defs barrel (re-exports sub-modules) | ~45 |
| `src/config/entity-defs/player-units.ts` | 16 player unit stat definitions | ~221 |
| `src/config/entity-defs/enemy-units.ts` | 10 enemy unit stat definitions | ~107 |
| `src/config/entity-defs/buildings.ts` | 15 building stat definitions | ~179 |
| `src/config/entity-defs/damage-multipliers.ts` | Counter table + getDamageMultiplier | |
| `src/config/tech-tree.ts` | 25 technologies with prerequisite chains + active abilities | ~296 |
| `src/config/ai-personalities.ts` | 5 AI personalities with multiplier configs | ~124 |
| `src/config/commanders.ts` | 7 commander definitions + 7 active abilities | ~287 |
| `src/config/factions.ts` | 2 playable factions with unit mappings | ~87 |
| `src/config/unlocks.ts` | 22 unlockable items across 6 categories | ~225 |
| `src/config/weather.ts` | 4 weather types with gameplay modifiers | ~104 |
| `src/config/cosmetics.ts` | Branch-themed cosmetic definitions | ~172 |
| `src/config/barks.ts` | Unit bark text definitions | ~120 |
| `src/config/puzzles.ts` | 10 puzzle mission definitions (barrel + types) | ~70 |
| `src/config/puzzles-core.ts` | Puzzle missions 1-5 definitions | ~200 |
| `src/config/puzzles-advanced.ts` | Puzzle missions 6-10 definitions | ~200 |
| `src/campaign/missions.ts` | Campaign barrel re-export | ~17 |
| `src/campaign/mission-defs.ts` | Missions 1-2 definitions | ~152 |
| `src/campaign/mission-defs-late.ts` | Missions 3-5 with branch paths | ~272 |
| `src/systems/achievement-defs.ts` | 40 achievement definitions | ~298 |
| `src/systems/achievements.ts` | Achievement checker + SQLite persistence | ~220 |
| `src/systems/daily-challenges.ts` | Daily challenge pool, selection, persistence | ~191 |
| `src/systems/player-xp.ts` | XP calculation, level progression | ~102 |
| `src/systems/unlock-tracker.ts` | Unlock progression tracking | |
| `src/systems/next-unlock-hint.ts` | Next-unlock hint calculation | |
| `src/systems/leaderboard.ts` | Ranked progression + win streak tracking | ~154 |
| `src/advisors/*.ts` | Advisor system: tips, state, actions, helpers | ~6 files |
| `src/governor/*.ts` | Yuka governor AI: evaluators + 6 goal types | ~619 total |
| `src/replay/*.ts` | Replay recorder, player, viewer, storage | ~362 total |
| `src/net/*.ts` | P2P multiplayer: connection, lockstep, controller, serializer, checksum | ~638 total |
| `src/storage/match-history.ts` | Match history SQLite storage (last 50 records) | |
| `src/terrain/terrain-grid.ts` | TerrainGrid: 6 types, speed mults, pathability | |
| `src/terrain/terrain-painters*.ts` | Terrain painting for map generation | |
| `src/input/selection/*.ts` | Selection, commands, formation positioning | ~596 total |
| `src/input/pointer*.ts` | Pointer handling (click, minimap, types) | |
| `src/input/keyboard.ts` | Keyboard shortcuts | |
| `src/storage/*.ts` | SQLite: saves, settings, game_history, unlocks, player_profile | ~487 total |
| `src/utils/random.ts` | SeededRandom PRNG (Mulberry32) for deterministic gameplay | ~44 |
| `src/utils/spatial-hash.ts` | SpatialHash grid for O(n) proximity queries | ~62 |
| `src/utils/particles.ts` | Particle spawning with pool + throttling | ~67 |
| `src/constants.ts` | Tuning constants (vet thresholds, enemy economy, AI timers) | ~136 |

## File Organization

```
src/
  ai/             -- Yuka manager, steering behaviors
  advisors/       -- Advisor system (economy/war/builder tips)
  audio/          -- Tone.js sound system (audio-system, sfx, music, ambient, cues, voices, combat)
  campaign/       -- Campaign mission definitions + types
  config/         -- Entity defs, tech tree, commanders, factions, barks, unlocks, cosmetics, weather, puzzles, AI personalities
  ecs/            -- Components, systems (57 system files across 7 subdirs)
    systems/
      ai/         -- Enemy AI (economy, training, combat, defense, building)
      combat/     -- Melee, positional damage, commander aura, war drums
      evolution/  -- Evolution tiers, poison, alpha aura, mega-waves, spawners
      gathering/  -- Depletion warning, passive income
      health/     -- Damage, death, healing, particles
      movement/   -- Arrive, speed modifiers
      *.ts        -- Top-level systems (auto-build, berserker, diver-stealth, engineer, etc.)
  game/           -- Game orchestrator modules (47 files)
    action-panel/ -- Train/Build/Tech button definitions
    init-entities/ -- 9 scenario map generators + helpers
  governor/       -- Yuka governor AI player (6 goal types)
  input/          -- Pointer, keyboard, selection handlers
  net/            -- P2P multiplayer (Trystero/WebRTC lockstep, connection, serializer)
    selection/    -- Commands, group select, queries
  platform/       -- Capacitor native detection
  rendering/      -- PixiJS renderers (entity, effects, ui, background, water-ripple)
  replay/         -- Replay recorder, player, viewer, storage
  storage/        -- SQLite persistence (schema, queries, settings)
  systems/        -- Achievements (40), daily challenges, player XP/levels, leaderboard, unlock tracker
  terrain/        -- Terrain grid, painters
  ui/
    components/   -- Small reusable UI primitives (<100 LOC each)
      frame/      -- SVG 9-slice panel system (Frame9Slice, corners, edges, center)
      sprites/    -- SVG unit sprites (Otter, Croc, Snake) with idle/attack frames
    panel/        -- Command panel tabs
    overlays/     -- Modal overlays (settings, tech tree, etc.)
    hud/          -- HUD elements (overlays, ctrl-groups, abilities, minimap legend, connection status)
    screens/      -- Full-screen views (UpgradeWebScreen, PearlUpgradeScreen, RankUpModal, RewardsScreen, multiplayer lobby/menu)
  styles/         -- CSS
tests/
  ecs/systems/    -- System integration tests
  ui/             -- Component tests
  browser/        -- Browser interaction + screenshot tests
  gameplay/       -- Gameplay loop integration tests
```

## Testing

Tests mirror the `src/` structure under `tests/`. Use `createGameWorld()` and manual component setup for ECS tests. Movement tests need `world.yukaManager.update()` between ticks since all units use Yuka steering.

## v3 Architecture (JSON Config + Metagame Systems)

### JSON Config System (10 files in configs/)

All game balance data lives in `configs/*.json`, loaded via `src/config/config-loader.ts` with typed accessors. Types in `src/config/v3-types.ts`.

| Config | Purpose | Key Data |
|--------|---------|----------|
| `units.json` | Player unit stats | Generalists (7) + Specialists (5) |
| `enemies.json` | Enemy unit stats + scaling | Types (9) + per-level scaling |
| `upgrades.json` | Upgrade web categories | 6 categories, 4 subcats each, 10 tiers = 240 nodes |
| `prestige.json` | Pearl upgrades + prestige formula | Auto-deploy, auto-behavior, multiplier upgrades |
| `events.json` | Match event templates + timing | Boss fights, escorts, weather events |
| `rewards.json` | Post-match Clam reward formula | base + kill + event + survival bonuses |
| `terrain.json` | Map size scaling per level | Progression tiers with resource counts |
| `fortifications.json` | Wall/tower/trap stats | HP, cost, damage, range |
| `lodge.json` | Lodge wings + fort slots | Diamond node unlock targets |
| `prefixes.json` | Tier name prefixes | Basic, Super, Ultra, etc. (10 tiers) |

### Screen Routing (app.tsx + store-v3.ts)

Menu state uses `store.menuState` signal (`'main' | 'playing'`). v3 overlay screens use `store-v3.ts` signals:

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

### Upgrade Web (240+ procedural nodes from upgrades.json)

Generated by `src/config/upgrade-web.ts` from `configs/upgrades.json`:
- **6 categories**: Gathering, Combat, Defense, Utility, Economy, Siege
- **4 subcategories each**: e.g., Gathering has Fish, Rock, Log, Carry Capacity
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

### Event System (PRNG-driven from events.json)

Match events via `src/ecs/systems/match-event-runner-system.ts`:
- Templates in `configs/events.json` with min/max progression levels
- Timing: first event after delay, then random intervals, max concurrent
- Rewards tracked in `matchEventsCompleted` signal, fed to post-match calculation

### Rewards Screen (Post-Match Clam Calculation)

`src/ui/screens/RewardsScreen.tsx` displays post-match results:
- Formula: base + (kills * kill_bonus) + (events * event_bonus) + (duration * survival_bonus) * prestige_multiplier
- Loss penalty: 50% of total. Calculation in `src/game/match-rewards.ts`
- Options: Rank Up (if eligible), Upgrades (returns to menu), Play Again

## Documentation

- [Architecture](docs/architecture.md) - System overview, game loop, data flow, enemy AI, veterancy, formations, performance
- [Gameplay](docs/gameplay.md) - Units, buildings, 25 techs, combat, campaign, factions, AI personalities, leaderboards, commanders, cosmetics
- [Libraries](docs/libraries.md) - How each dependency is utilized
- [Design Bible](docs/design-bible.md) - Vision, macro/meso/micro design, completed roadmap

## Important Notes

- **Mouse/touch first**: Every game action must have a clickable UI element. Mobile (Capacitor/Android) is a first-class target.
- **Max 300 LOC per file**: Enforced by `.claude/hooks/file-size-guard.py`. Decompose before adding features.
- **Auto-behaviors are optional**: Auto-gather/build/defend/attack/heal/scout are toggled via the idle radial menu, not hardcoded.
- **Buildings unlock through gameplay**: Watchtower requires Eagle Eye tech, Shieldbearer requires Iron Shell, etc. Don't show locked buildings/units.
- **Player units use Yuka too**: Not just enemies. All moving entities register with YukaManager for smooth steering.
- **Both factions use the same systems**: Gathering, movement, and combat work identically for player and enemy units. The enemy just gets its orders from the AI system instead of user input.
- **Damage multipliers are centralized**: All counter relationships live in `DAMAGE_MULTIPLIERS` in entity-defs/damage-multipliers.ts. Don't hardcode damage modifiers elsewhere.
- **Veterancy bonuses are incremental**: The system applies the delta between old and new rank bonuses, not the full bonus, to prevent double-counting.
- **SQLite is required**: Persistence uses capacitor-sqlite + jeep-sqlite. There is no localStorage fallback. If SQLite init fails, the app cannot start.
- **Enemy evolution is time-based**: Evolution tiers unlock based on minutes since peace ended, not player actions. The system also manages poison ticks and alpha damage aura.
- **Pearls are the rare resource**: Only found at PearlBed nodes (500 each), required for elite techs like Hardened Shells (30P) and Siege Works (50P).
- **Terrain affects movement**: Speed multipliers per terrain type, water units bypass water tiles, flying units ignore all terrain.
- **Weather changes gameplay**: Rain floods shallows, fog reduces vision, wind drifts projectiles. Seeded from map seed for determinism.
- **Store is split into 5 files**: Core signals in `store.ts`, weather in `store-weather.ts`, gameplay session state (game over, campaign, puzzle, replay, abilities) in `store-gameplay.ts`, multiplayer state in `store-multiplayer.ts`, v3 metagame (prestige, upgrade web, rewards) in `store-v3.ts`. Core signals re-exported from `store.ts` for backward compatibility.
- **Governor can play autonomously**: The Yuka governor AI in `src/governor/` uses goal-based planning to play the player side. Used for AI vs AI testing and spectating.
- **Multiplayer is lockstep P2P**: Both players must process the same commands in the same order. All gameplay randomness must go through `SeededRandom`, never `Math.random()`. Desyncs are detected via frame checksums.
- **Daily challenges rotate by UTC date**: Deterministic selection from a pool of 15 challenges. Completion tracked per calendar day in SQLite.
- **Random events are seeded**: Event timing and selection use the map seed + frame count, ensuring replays and multiplayer stay synchronized.
