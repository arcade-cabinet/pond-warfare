# Pond Warfare

Warcraft II-style real-time strategy game set in a pond ecosystem. Otters and predators compete for territory, resources, and dominance. Gather clams and twigs, expand your base with multiple Lodges, train an army of brawlers, snipers, and healers, research upgrades, and wage war against an AI opponent that builds its own economy and army.

Built with a modern ECS architecture using bitECS, rendered with PixiJS 8, with AI steering from Yuka.js, physics from Planck.js, procedural audio from Tone.js, and animations from anime.js.

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
pnpm test       # Run 256 tests
pnpm typecheck  # TypeScript strict mode check
pnpm lint:fix   # Auto-fix linting and formatting
```

## Gameplay

Two-faction RTS: otters vs predators compete for the same finite resource nodes across the map. Both sides gather, build, and train armies. The enemy AI runs its own economy with gatherers, constructs buildings, and trains attack waves funded by collected resources.

### Key Mechanics

- **Competitive economy**: Both factions harvest from the same clam beds and cattails; resource scarcity forces expansion and map control
- **Expansion**: Build multiple Lodges across the map, each providing +4 population cap and serving as a resource drop-off point
- **Enemy AI economy**: Predator Nests spawn gatherers that collect resources and fund army production
- **Unit counters**: Damage multiplier table creates rock-paper-scissors dynamics (Brawler beats Sniper, Sniper beats Snake, etc.)
- **Formation movement**: Multi-select move orders arrange units in role-based rows (melee front, ranged middle, support rear) with Yuka.js flocking
- **Veterancy**: Units rank up from kills (Recruit -> Veteran -> Elite -> Hero) gaining HP, damage, and speed bonuses
- **Tech tree**: 5 upgrades (Sturdy Mud, Swift Paws, Sharp Sticks, Eagle Eye, Hardened Shells)
- **Fog of war**: Unexplored areas are hidden; scouting reveals enemy positions and resource locations
- **Auto-behaviors**: Toggle auto-gather/defend/attack via the idle radial menu
- **Day/night cycle**: Affects visibility, ambient sounds, and firefly spawning

See [docs/gameplay.md](docs/gameplay.md) for full unit stats, building costs, and mechanics.

## Controls

### Mouse / Touch (Primary)

| Input | Action |
|-------|--------|
| Left click | Select unit/building |
| Right click | Move / attack / gather |
| Click + drag | Box select |
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

14 ECS systems execute each frame in a fixed-timestep loop. All units (player and enemy) use Yuka.js steering behaviors for smooth pathfinding with separation, wander, flee, and formation flocking behaviors.

See [docs/architecture.md](docs/architecture.md) for the full system diagram and data flow.

## Project Structure

```text
src/
├── ai/          # Yuka.js steering manager (flocking, formations)
├── audio/       # Tone.js SFX + procedural music + ambient
├── config/      # Entity definitions, damage table, tech tree, keybindings
├── ecs/         # bitECS components, archetypes, 14 systems
├── game.ts      # Main orchestrator (~1200 lines)
├── input/       # Keyboard, pointer/touch, selection + formations
├── physics/     # Planck.js collision world
├── platform/    # Capacitor mobile integration
├── rendering/   # PixiJS 8 renderer + Canvas2D overlays
├── ui/          # Preact components (HUD, panels, radial menu)
└── types.ts     # Shared types and enums
docs/
├── architecture.md  # System overview and data flow
├── gameplay.md      # Units, buildings, combat, waves
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
| `release.yml` | Published release | Build debug APK, attach to release |

## Documentation

- [AGENTS.md](AGENTS.md) - AI agent instructions, conventions, file map
- [docs/architecture.md](docs/architecture.md) - System overview, game loop, data flow
- [docs/gameplay.md](docs/gameplay.md) - Units, buildings, tech tree, combat, waves
- [docs/libraries.md](docs/libraries.md) - How each dependency is utilized

## License

MIT
