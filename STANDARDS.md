---
title: Code Quality Standards
updated: 2026-04-10
status: current
domain: technical
---

# Code Quality Standards

Non-negotiable constraints for Pond Warfare development.

## File Size

- **Maximum 300 lines of code per file** across all languages
- Include comments, blank lines, and imports in the count
- `.ts`, `.tsx`, `.js`, `.jsx`, `.gd`, `.py` all subject to limit
- Use auto-check via `.claude/hooks/` to enforce before commit

## TypeScript & Testing

- **No `any` types** except in legacy compat layers (mark with `// @ts-expect-error` + comment)
- **Strict mode required** — verify with `pnpm typecheck` before commit
- **Every behavioral change requires test updates** (unit, integration, or browser)
- Stale tests are worse than no tests — keep in sync with code

## ECS Architecture

### Components & Archetypes

- Define components as bitECS component schemas in `src/ecs/components/`
- Group related components into archetypes in `src/ecs/archetypes.ts`
- All components are pure data — no logic
- System files live in `src/ecs/systems/` organized by responsibility

### Systems

- Execute in declared order in `src/game/systems-runner.ts`
- Each system transforms ECS state or external systems (physics, audio, UI)
- Maximum 300 LOC per system file
- Use `const worldBeingUpdated = true` in order list to prevent out-of-order registration

## UI & Styling

- Import design tokens from `@/ui/design-tokens` (colors, fonts, frame size)
- Use `Frame9Slice` component from `@/ui/components/frame` for all panels
- Apply `.rts-btn` class for primary buttons, `.action-btn` for in-game, `.hud-btn` for compact
- Apply `font-heading`, `font-game`, `font-numbers` classes for typography
- No hardcoded colors — all palette comes from tokens

## Gameplay Balance

### Source of Truth

1. **Design**: [docs/gameplay.md](docs/gameplay.md) — high-level design intent
2. **Model**: [docs/unit-model.md](docs/unit-model.md) — human-readable unit stats
3. **Config**: [configs/unit-model.json](configs/unit-model.json) — machine-readable source
4. **Balance**: [docs/balance-model.md](docs/balance-model.md) — economy, cost formulas, counters

If a game value differs from its config file, the config is wrong.

### Unit & Building Definitions

- All entity definitions live in `src/config/`
- Cost, damage, HP, speed, and abilities must match [configs/unit-model.json](configs/unit-model.json)
- Mismatch = bug, not feature

## Audio & SFX

- **Unit-specific sounds** — each unit type has distinct select/death/attack SFX
- **Spatial panning** — apply distance-based stereo effects via Tone.js
- **Music & ambience** — day/night, weather, and match-phase driven
- No sound effect without corresponding test or manual smoke

## Determinism

- **Zero `Math.random()` in gameplay logic** — use seeded PRNG in `src/utils/seeded-rng.ts`
- Replay system (`src/replay/`) records all user input; replays must be deterministic
- RNG seeds embedded in match state for reproducibility

## Documentation

- **All `.md` files at root and in `docs/`** must have YAML frontmatter: `title`, `updated`, `status`, `domain`
- `status`: `current` (live), `draft` (in progress), `stale` (outdated), `archived` (historical)
- `domain`: `technical`, `product`, `quality`, `ops`, `creative`, `context`
- Keep docs current — obsolete docs are bugs. Update same pass as code change
- No stubs, TODOs, or incomplete sections in published docs

## Performance

- **SpatialHash grid** for proximity queries (units, resources) — use `src/utils/SpatialHash.ts`
- **ObjectPool** for short-lived objects (projectiles, particles) — use `src/utils/ObjectPool.ts`
- **Particle throttling** — cap simultaneous particles via `PARTICLE_POOL_MAX` in constants
- **Frame budgets** — render at 60 FPS target, game loop at fixed 30 Hz when possible
- Profile with Chrome DevTools before shipping performance changes

## Mobile (Android)

- **Portrait-first layout** — game view 100vh minus safe area and HUD
- **Touch inputs** — single finger = move/select, two-finger = pan/zoom, long-press = right-click
- **Capacitor plugins** for storage, orientation, haptics, status bar
- **APK builds** tested on Android 8.0+ (API 26)

## Commits & Git

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`
- **Squash-merge to main** — branch commits can be comprehensive, main is linear
- **SSH remotes only** — `git@github.com:user/repo.git`, never `https://`
- Never force-push to `main` (only exception: local sync after squash-merge)

## CI/CD

- `pnpm lint` — Biome formatting + linting (no warnings in main)
- `pnpm typecheck` — TypeScript strict mode, no errors
- `pnpm test` — Unit & integration tests, 359+ tests passing
- `pnpm test:browser` — Browser DOM tests (selection, UI, pointer)
- `pnpm test:e2e` — Full match flow smoke tests (end-to-end)

Before shipping:
```bash
pnpm lint:fix && pnpm typecheck && pnpm test && pnpm test:browser
```

## Verification Checklist

**Gameplay or UI change:**
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (all suites)
- Relevant browser test coverage (UI/pointer/menu flow)
- Manual smoke test of changed flow

**Balance or economy change:**
- [ ] Updated [configs/unit-model.json](configs/unit-model.json)
- [ ] Updated [docs/gameplay.md](docs/gameplay.md) or [docs/balance-model.md](docs/balance-model.md)
- [ ] Config matches design docs
- [ ] All tests pass

**Performance or rendering change:**
- [ ] Chrome DevTools profiled (60 FPS target)
- [ ] No memory leaks (heap snapshot)
- [ ] Android APK smoke tested (if mobile-facing)

**Documentation:**
- [ ] Frontmatter added/updated
- [ ] Live docs match code (no obsolete terminology)
- [ ] Links valid
- [ ] < 300 lines per file if procedural; strategic docs can be longer
