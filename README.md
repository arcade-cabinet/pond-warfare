# Pond Warfare - A real-time strategy game

RTS game where otters defend their pond from predators. Gather resources, train units, research upgrades, and survive waves of gators and snakes across a dynamic day/night cycle.


## Features

- Resource gathering (clams and twigs) with worker units
- Unit training (gatherers, defenders, rangers)
- Tech tree with upgradeable abilities
- Fog of war with exploration reveal
- Day/night cycle affecting visibility and enemy behavior
- Tower defense buildings with auto-targeting projectiles
- Minimap with real-time unit tracking
- Wave-based enemy spawns with scaling difficulty
- Physics-based collision (Planck.js broadphase)
- AI steering behaviors (Yuka.js seek/arrive)
- Sprite animations and particle effects
- Mobile/touch support via Capacitor (Android)

## Tech Stack

| Category    | Technology          |
| ----------- | ------------------- |
| Language    | TypeScript          |
| ECS         | bitECS              |
| UI          | Preact + Signals    |
| Audio       | Tone.js             |
| AI          | Yuka.js             |
| Physics     | Planck.js           |
| Animation   | anime.js            |
| Styling     | Tailwind CSS        |
| Bundler     | Vite                |
| Linter      | Biome               |
| Testing     | Vitest              |
| Mobile      | Capacitor (Android) |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint and Format

```bash
pnpm lint        # check
pnpm lint:fix    # auto-fix
pnpm format      # format
```

## Project Structure

```
src/
  ecs/          # Entity Component System (components, archetypes, systems)
  rendering/    # Canvas 2D renderer, camera, sprites, fog, minimap, particles
  input/        # Keyboard, pointer/touch, and selection handling
  ui/           # Preact UI components (HUD, panels, overlays)
  audio/        # Tone.js sound effects system
  ai/           # Yuka.js enemy steering behaviors
  physics/      # Planck.js collision world
  config/       # Entity definitions and balance tuning
tests/          # Vitest test suites mirroring src/ structure
```

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow       | Purpose                                 |
| -------------- | --------------------------------------- |
| `ci.yml`       | Lint, typecheck, and test on every push |
| `cd.yml`       | Build and deploy on main branch merges  |
| `release.yml`  | Tag-based release publishing            |

## Android Build

Requires Android Studio and the Android SDK.

```bash
pnpm build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Controls

### Keyboard

| Key           | Action                  |
| ------------- | ----------------------- |
| `1`-`9`       | Assign/recall groups    |
| `A`           | Attack move             |
| `S`           | Stop                    |
| `Escape`      | Deselect / close panels |
| `Space`       | Center on selection     |
| `+` / `-`     | Game speed              |

### Mouse / Touch

| Input              | Action            |
| ------------------ | ----------------- |
| Left click         | Select unit       |
| Right click        | Move / interact   |
| Click + drag       | Box select        |
| Scroll wheel       | Zoom              |
| Pinch (touch)      | Zoom              |

## License

MIT -- see [LICENSE](./LICENSE) for details.
