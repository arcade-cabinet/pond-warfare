# Library Usage

How each dependency is utilized in Pond Warfare.

> Historical note: older references to `Gatherer`, `Swimmer`, or other removed
> player-roster units in this file describe internal or superseded usage. The
> live player-facing unit model is [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md).

## Runtime Dependencies

### bitECS (0.4.0) - Entity Component System

The core data architecture. All game entities are ECS entities with SoA (Structure of Arrays) components.

**Usage:**
- 14 data components (`Position`, `Health`, `Combat`, `Veterancy`, `UnitStateMachine`, `ProjectileData`, etc.)
- 5 tag components (`IsBuilding`, `IsResource`, `TowerAI`, `Dead`, `IsProjectile`)
- `query()` for efficient component-based entity iteration
- `addEntity()` / `removeEntity()` for lifecycle
- `hasComponent()` for conditional logic

**Files:** `src/ecs/components.ts`, `src/ecs/archetypes.ts`, `src/ecs/world.ts`, all systems

### PixiJS (8.x) - 2D Rendering

Primary renderer for all game entities, sprites, and effects.

**Usage:**
- `Application` with WebGL/WebGPU auto-detection
- `Sprite` for entity rendering with texture atlas
- `Graphics` for health bars, selection brackets, building progress
- `Text` for building progress percentage, damage numbers
- `Container` for y-sorted entity layers, UI overlays
- `Texture.from()` for procedurally generated sprite canvases
- Tint-based damage flash (red tint on `flashTimer > 0`)
- Color-blind mode via sprite tinting

**Files:** `src/rendering/pixi-app.ts` (860+ lines), `src/rendering/sprites.ts`

### Yuka.js (0.7.8) - AI Steering Behaviors

Smooth pathfinding, collision avoidance, and formation movement for ALL units (player and enemy).

**Usage:**
- `Vehicle` - one per moving entity, synced with ECS Position
- `EntityManager` - manages all vehicles, computes neighborhoods
- `SeekBehavior` - direct movement toward target (used when chasing)
- `ArriveBehavior` - decelerate near target (used for static destinations)
- `SeparationBehavior` (weight 0.6) - prevents unit stacking
- `AlignmentBehavior` (weight 0.3) - formation movement heading alignment
- `CohesionBehavior` (weight 0.4) - formation movement group cohesion
- `WanderBehavior` - organic idle patrol for auto-defend
- `FleeBehavior` - Mudpaw and worker retreat behavior when attacked (1.5s duration)
- `EvadeBehavior` - specialist and enemy evasive movement when under fire
- Faction-agnostic: `addUnit()` / `removeUnit()` for any entity
- `setFormation()` - enable flocking for group move commands
- Used for the full live roster, Pearl specialists, enemies, and Commander units.

**Files:** `src/ai/yuka-manager.ts`, `src/yuka.d.ts`

### Planck.js (1.4.3) - 2D Physics

Collision detection and overlap resolution.

**Usage:**
- `World` with zero gravity (top-down game)
- Dynamic `Body` per entity with circular `Shape`
- `step()` each frame for overlap resolution
- Position sync back to ECS after physics step
- Sensor contacts for range detection

**Files:** `src/physics/physics-world.ts`

### Tone.js (15.x) - Audio

Complete audio system with procedural synthesis and unit-specific SFX.

**Usage:**
- **SFX** (25+ effects): `Synth` with pooled synth+panner pairs (16 pre-allocated)
- **Selection/command voices**: Palette-based by role rather than a fixed old roster table. Current player-facing mapping centers on Mudpaw (`worker`), Medic/Shaman/Lookout (`support`), Guard/Ranger (`skirmisher`), Bombardier and siege heavies (`heavy`), and Commander (`leader`). Some low-level internal entity kinds still back those palettes.
- **Contextual effects**: building placement, research complete, airdrop incoming, train complete, build complete, unit death, building destruction, heal, error
- **Spatial panning**: SFX panned left/right based on world position relative to camera
- **Music**: Procedural chiptune via `Sequence` - peaceful (C major, 100 BPM) / hunting (C minor, 140 BPM)
- **Ambient**: Pond bubbles (filtered noise), cricket chirps (night), wind gusts (day)
- `Transport` for music timing
- `Gain` nodes for independent volume control
- Respects browser AudioContext policy (starts on first user gesture)

**Files:** `src/audio/audio-system.ts`, `src/audio/sfx.ts`

### anime.js (4.x) - Animations

Smooth transitions and visual polish.

**Usage:**
- `animate()` for smooth camera panning (400ms easeOutQuad)
- `stagger()` for sequential animation delays
- Entity scale animations (spawn pop, death shrink)
- Building completion celebration effect
- Game-over text reveal animation

**Files:** `src/rendering/animations.ts`, `src/game.ts`

### Preact (10.x) + @preact/signals (2.x) - UI

Lightweight reactive UI framework.

**Usage:**
- 60+ reactive `signal()` values synced from game state
- `computed()` for derived UI values (HP percentage, food display)
- JSX components for HUD, selection panel, action buttons, radial menu
- Error boundary for graceful crash handling

**Files:** `src/ui/*.tsx`, `src/ui/store.ts`

### Capacitor (8.x) - Mobile

Android/iOS app packaging and native API access.

**Usage:**
- `StatusBar.hide()` for fullscreen
- `ScreenOrientation.lock('landscape')`
- `Haptics.impact()` for tactile feedback
- `App.addListener()` for lifecycle events

**Files:** `src/platform/native.ts`

### capacitor-sqlite (8.x) + jeep-sqlite (2.x) - Persistence

SQLite database for ALL platforms. **SQLite is required -- there is no localStorage fallback.**

**Usage:**
- **Web**: jeep-sqlite Stencil component backed by sql.js + IndexedDB (localforage)
- **iOS/Android**: native SQLite via Capacitor plugin
- `CapacitorSQLite` / `SQLiteConnection` / `SQLiteDBConnection` for all DB operations
- Database name: `pond_warfare`, version 1
- 5 tables: `saves`, `settings`, `game_history`, `unlocks`, `player_profile`
- Persists: game saves, settings, achievements, unlocks, player stats, campaign progress, cosmetics, win streaks

**Files:** `src/storage/database.ts`

## Dev Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 6.0 | Type safety |
| Vite | 8.0 | Bundling + HMR |
| Vitest | 4.1 | Testing (359 tests across 29 files) |
| Biome | 2.4 | Linting + formatting |
| Tailwind CSS | 4.2 | Utility-first styling |
