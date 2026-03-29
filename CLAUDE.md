# CLAUDE.md

See [AGENTS.md](AGENTS.md) for full project context, conventions, and architecture.

## Quick Reference

```bash
pnpm dev        # Dev server
pnpm test       # 256 tests (Vitest 4)
pnpm typecheck  # TypeScript 6 strict
pnpm build      # Production build
pnpm lint:fix   # Biome auto-fix
```

## Key Principles

- **Mouse/touch first** - every action needs a clickable UI element, keyboard shortcuts are secondary
- **ECS architecture** - bitECS SoA components, 13 systems run in order each frame
- **All units use Yuka.js** steering (player and enemy) with SeparationBehavior
- **Auto-behaviors are optional** - toggled via idle radial menu, not hardcoded
- **Buildings unlock through gameplay** - don't show locked buildings in UI
- **Preact Signals** for UI reactivity - sync from GameWorld every 30 frames

## Docs

- [AGENTS.md](AGENTS.md) - Full agent instructions, conventions, file map
- [docs/architecture.md](docs/architecture.md) - System overview, game loop, data flow
- [docs/gameplay.md](docs/gameplay.md) - Units, buildings, tech tree, combat, waves
- [docs/libraries.md](docs/libraries.md) - How each dependency is utilized
