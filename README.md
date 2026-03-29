# Pond Warfare

Warcraft II-style real-time strategy game set in a pond ecosystem. Two playable factions -- otters and predators -- compete for territory, resources, and dominance. Gather clams, twigs, and rare pearls, expand your base with multiple Lodges, train an army from 10 unique unit types, research 25 technologies with active abilities, play through 5 campaign missions, choose from 7 commanders with unique bonuses, customize AI personality, and climb the ranked leaderboard from Bronze to Diamond.

Built with a modern ECS architecture using bitECS (33 entity types, 18 ECS systems), rendered with PixiJS 8, with AI steering from Yuka.js, physics from Planck.js, procedural audio from Tone.js (unit-specific SFX with spatial panning), animations from anime.js, and SQLite persistence via capacitor-sqlite.

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | TypeScript | 6.0 |
| ECS | bitECS | 0.4 |
| Rendering | PixiJS | 8 |
| UI | Preact + Signals | 10 |
| AI Steering | Yuka.js | 0.7 |
| Physics | Planck.js | 1.4 |
| Audio | Tone.js | 15 |
| Animation | anime.js | 4 |
| Styling | Tailwind CSS | 4 |
| Bundler | Vite | 8 |
| Linter | Biome | 2 |
| Testing | Vitest | 4 |
| Mobile | Capacitor | 8 (Android) |

## Getting Started

```bash
pnpm install   # Install dependencies
pnpm dev       # Start dev server at localhost:5173
```

### Other Commands

```bash
pnpm build      # Production build
pnpm test       # Run tests
pnpm typecheck  # TypeScript strict mode check
pnpm lint:fix   # Auto-fix linting and formatting
```

## Gameplay

Two-faction RTS: otters vs predators compete for the same finite resource nodes across the map. Both sides gather, build, and train armies. The enemy AI runs its own economy with gatherers, constructs buildings, and trains attack waves funded by collected resources.

### Key Mechanics

- **Competitive economy**: Both factions harvest from the same clam beds, cattails, and pearl beds; resource scarcity forces expansion and map control
- **Three resources**: Clams (primary), Twigs (buildings/tech), and Pearls (rare, for elite technologies)
- **Expansion**: Build multiple Lodges across the map, each providing +8 population cap and serving as a resource drop-off point
- **Enemy AI economy**: Predator Nests spawn gatherers that collect resources and fund army production
- **Enemy evolution**: 5-tier system unlocks progressively stronger enemies over time (Armored Gator, Venom Snake, Swamp Drake, Siege Turtle, Alpha Predator)
- **33 entity types**: 10 player units, 8 enemy units, 10 buildings, 3 resource nodes, Commander, Frog, Fish
- **2 playable factions**: Otter (original) and Predator (play as the enemy) with mirrored unit rosters
- **5 campaign missions**: Tutorial through boss battle with scripted dialogue and objectives
- **7 commanders**: Each with unique aura/passive bonuses and unlock requirements
- **5 AI personalities**: Balanced, Turtle, Rush, Economic, Random (switches every 5 min)
- **25 techs** across Lodge, Armory, and Nature branches with 3 active abilities (Rally Cry, Pond Blessing, Tidal Surge)
- **6 map scenarios**: Standard, Island, Contested, Labyrinth, River, Peninsula
- **Ranked leaderboards**: Bronze/Silver/Gold/Diamond based on wins, with personal bests and win streak tracking
- **15 achievements** + 18 unlockables across scenarios, presets, units, modifiers, and cosmetics
- **Cosmetic system**: Unit skins + building themes via sprite HSL recoloring
- **Unit counters**: Damage multiplier table creates rock-paper-scissors dynamics
- **Formation movement**: Role-based rows (melee front, ranged middle, support rear) with Yuka.js flocking
- **Veterancy**: Units rank up from kills (Recruit -> Veteran -> Elite -> Hero) with stat bonuses
- **Enemy evolution**: 5 tiers + threat escalation (mega-waves, champions, random events)
- **Unit-specific SFX**: Each unit type has distinct selection sounds via Tone.js synthesis
- **Fog of war**: Unexplored areas hidden; 3 modes (full, explored, revealed)
- **Auto-behaviors**: Toggle auto-gather/build/defend/attack/heal/scout via idle radial menu
- **Custom game settings**: 13 configurable options for freeplay
- **Difficulty modes**: Easy, Normal, Hard, Nightmare, Ultra Nightmare + permadeath
- **Day/night cycle**: Affects visibility, ambient sounds, and firefly spawning

See [docs/gameplay.md](docs/gameplay.md) for full unit stats, building costs, and mechanics.

## Controls

### Mouse / Touch (Primary)

| Input | Action |
|-------|--------|
| Left click / tap | Select unit/building |
| Right click / long press | Move / attack / gather |
| Click + drag / touch drag | Box select |
| Pinch | Zoom camera |
| Two-finger drag | Pan camera |
| Idle button | Open radial menu (auto-behaviors) |
| X button | Deselect |
| HUD buttons | Train, build, research, pause, speed |

### Keyboard (Secondary)

| Key | Action |
|-----|--------|
| WASD / Arrows | Pan camera |
| Ctrl+1-9 | Save control group |
| 1-9 | Recall control group |
| A | Attack move |
| Space | Pause |
| F | Cycle game speed |
| M | Toggle mute |
| . | Select idle worker |
| , | Select army |
| Esc | Deselect / cancel |

## Architecture

18 ECS systems execute each frame in a fixed-timestep loop. All units (player and enemy) use Yuka.js steering behaviors for smooth pathfinding with separation, wander, flee, and formation flocking behaviors. Performance optimized with SpatialHash grid for proximity queries and ObjectPool + particle throttling for visual effects.

See [docs/architecture.md](docs/architecture.md) for the full system diagram and data flow.

## Project Structure

```text
src/
├── ai/          # Yuka.js steering manager (flocking, formations)
├── audio/       # Tone.js SFX (25+ effects, spatial panning) + music + ambient
├── campaign/    # 5 campaign missions with objectives + dialogue
├── config/      # 33 entity defs, 25 techs, 5 AI personalities, 7 commanders, factions, unlocks
├── ecs/         # bitECS components, archetypes, 18 systems
├── game.ts      # Main orchestrator (~1200 lines)
├── input/       # Keyboard, pointer/touch, selection + formations
├── physics/     # Planck.js collision world
├── platform/    # Capacitor mobile integration
├── rendering/   # PixiJS 8 renderer + Canvas2D overlays + sprite recoloring
├── replay/      # Deterministic replay recording
├── systems/     # Non-ECS systems: achievements, leaderboards, unlocks
├── storage/     # SQLite persistence (5 tables)
├── ui/          # Preact components (HUD, panels, menus, campaign, settings)
├── utils/       # SpatialHash, ObjectPool, particle throttling
└── types.ts     # 33 EntityKind values + shared types
docs/
├── architecture.md  # System overview, data flow, performance
├── design-bible.md  # Vision, strategy, completed roadmap
├── gameplay.md      # Units, buildings, techs, campaign, factions, AI, leaderboards
└── libraries.md     # How each dependency is used
```

## Android Build

```bash
pnpm build
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

## CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Every push | Lint, typecheck, test |
| `cd.yml` | Push to main | Release Please, deploy to GitHub Pages |
| `release.yml` | Published release | Build debug APK, attach to release |

## Documentation

- [AGENTS.md](AGENTS.md) - AI agent instructions, conventions, file map
- [docs/architecture.md](docs/architecture.md) - System overview, game loop, enemy AI, veterancy, formations, performance
- [docs/design-bible.md](docs/design-bible.md) - Vision, macro/meso/micro design, completed roadmap
- [docs/gameplay.md](docs/gameplay.md) - Units, buildings, 25 techs, campaign, factions, AI personalities, leaderboards, commanders, cosmetics
- [docs/libraries.md](docs/libraries.md) - How each dependency is utilized

## License

MIT
