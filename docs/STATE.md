---
title: Current State & Known Issues
updated: 2026-04-16
status: current
domain: context
---

# Current State & Known Issues

## Release Status: v1.3.0

**Current version:** 1.3.0 (released 2026-04-14)

**Game mode:** Tower defense with progression — defend Lodge against escalating enemy waves, unlock upgrades and specialist blueprints between matches.

**Platform support:**
- Web (Vite hosted on GitHub Pages)
- Android (Capacitor 8 + Gradle)
- iOS (Capacitor config present, not actively tested)

## What's Done

### Core Gameplay

- [x] 4 canonical manual units (Mudpaw, Medic, Sapper, Saboteur)
- [x] 8 Pearl specialist blueprints trainable in-match (Fisher, Logger, Digger, Guard, Ranger, Bombardier, Shaman, Lookout)
- [x] 6 enemy types with role-based behaviors (raider, healer, sapper, armored, venom, siege)
- [x] Wave-survival match events with 10 spawn patterns
- [x] Enemy AI with economy, training, defense, combat sub-systems
- [x] 6-panel map grid with progression-based unlock
- [x] Fortification system (walls, towers, slot management)

### Progression

- [x] 240+ upgrade nodes across 6 categories with procedural generation
- [x] Frontier Expansion diamond unlock gates
- [x] Pearl prestige currency system
- [x] Specialist blueprint unlock via upgrades
- [x] Cosmetic unlocks (unit skins, building themes)
- [x] Auto-symbol unit autonomy mechanic
- [x] Rank-based progression (5 ranks, rank-up modal)

### Technical

- [x] bitECS 0.4 architecture (33 entity types, 30+ systems)
- [x] PixiJS 8 rendering + Canvas2D overlays (fog, light, terrain)
- [x] Yuka.js steering for all units (flocking, formation, pathfinding)
- [x] Planck.js physics (collision, body management)
- [x] Tone.js procedural SFX (unit-specific select/death/attack sounds with spatial panning)
- [x] Preact + Signals UI with Frame9Slice design system
- [x] SQLite persistence (Capacitor + jeep-sqlite)
- [x] Deterministic seeded PRNG (zero Math.random in gameplay)
- [x] Replay system (deterministic recording of input)

### Quality

- [x] 2,500+ tests across unit, browser, integration, gameplay, and E2E suites
- [x] TypeScript strict mode
- [x] Biome linting + formatting
- [x] Android APK builds (debug + signed release)
- [x] Mobile-responsive UI (portrait-first, safe area aware)
- [x] Accessibility improvements (ARIA labels, keyboard navigation)
- [x] Scripted release gate (`pnpm verify:release`)
- [x] Tracked browser audit captures + manifest
- [x] Pixel-diff visual regression gate for the canonical staged browser captures

### Documentation

- [x] README.md — overview, tech stack, gameplay, controls
- [x] AGENTS.md — AI agent instructions, architecture, conventions
- [x] docs/architecture.md — system overview, game loop, data flow
- [x] docs/gameplay.md — unit stats, building costs, techs, commanders, AI personalities
- [x] docs/unit-model.md — human-readable unit design
- [x] docs/balance-model.md — economy, cost formulas, damage multipliers
- [x] docs/libraries.md — dependency usage
- [x] CHANGELOG.md — release history

## What's Partially Done

### UI Polish

- **Status:** Stable but ongoing
- **Issues:**
  - Modal responsiveness on very small screens (< 360px width) needs refinement
  - Upgrade web panel can overflow on narrow tablets in landscape
  - Radial menu positioning needs adjustment for edge-of-screen cases

### Balance (Ongoing Audit)

- **Status:** Current version stable, continuous tuning
- **Recent work:** Fortification costs, tower damage, unit speed, cost reduction multipliers
- **Next focus:** Late-stage governor follow-through and remaining balance tuning

### Mobile Experience

- **Status:** Functional on Android 8.0+, iOS untested
- **Issues:**
  - APK size ~35MB (consider lazy-loading audio)
  - Touch latency on low-end devices (need profiling)
  - Orientation lock to portrait — landscape mode WIP

## Known Issues

### Critical (Block Release)

None currently. The tracked release gate is green on v1.3.0.

### Major (High Priority)

1. **Upgrade unlock gate visibility** — Frontier nodes sometimes not visually distinct on narrow screens
   - Workaround: Zoom or rotate device
   - Fix: Improve gate visual hierarchy, add tooltip

2. **Tower damage upgrade delay** — Tower damage upgrades take ~1 frame to apply
   - Caused by: UI sync running every 30 frames
   - Impact: Minor, towers still attack, damage just delayed
   - Fix: Priority sync for upgrade effects (low priority, cosmetic)

### Minor (Polish)

1. **Corpse particle throttling** — With 50+ units dying simultaneously, some corpses skip animation
   - Cause: Particle pool max (200) reached, particles queued
   - Impact: Visual only, no gameplay effect
   - Fix: Increase pool or implement streaming garbage collection

2. **Audio lag on match start** — First few SFX calls have slight delay
   - Cause: Tone.js initialization + AudioContext startup
   - Impact: Select sounds slightly late (< 200ms)
   - Fix: Pre-warm audio context on game load

3. **Yuka steering overshoot** — Units sometimes overshoot target by 1-2 pixels
   - Cause: Arrival behavior tolerance set to 5px
   - Impact: Gather completion delayed by 1 frame
   - Fix: Tighten tolerance to 2px (low priority)

## Open Branch Inventory

- `main`
  - Canonical production branch.
- `feat/v3.1-commander-flow`
  - Stale pre-release divergence from merge-base `239f0bb`.
  - No open PR, heavy conflicts against current `main`, and not a safe merge candidate.
  - Any still-desired commander work should be rebuilt from fresh branches off `main`, not merged wholesale.

See [docs/outstanding-work.md](outstanding-work.md) for the canonical remaining product work after branch triage.

## Next Steps (Post-v1.3)

### Planned Features

1. **Multiplayer follow-through** — P2P via Trystero (WebRTC/WebTorrent)
   - Architecture drafted in `src/net/`
   - Need full matchmaking UI + replay sync

2. **Custom game modifiers**
   - Prestige-gated difficulty modifiers (speed runs, no walls, etc.)
   - Leaderboard tracking per modifier

3. **Campaign mode**
   - 5 scripted missions with dialogue
   - Progressive unlock of factions/commanders
   - Story beats (cutscenes, dialogue bubbles)

4. **Cosmetic store**
   - Cosmetic skins for units + buildings
   - Pearl cosmetic bundles

### Technical Debt

- [ ] Extract `src/game/` into smaller domain modules (<300 LOC each)
- [ ] Refactor UI state sync to event-driven (currently polling every 30 frames)
- [x] Add E2E visual regression tests (screenshot comparison)
- [ ] Improve audio streaming (lazy-load SFX by category)
- [ ] Profile memory usage on low-end Android devices

### Performance Targets

- **Web:** 60 FPS sustained, <2MB initial bundle
- **Android:** 60 FPS on Pixel 4+, 30 FPS on Pixel 3

## Testing Gaps

- **Visual regression:** Canonical staged captures now have a pixel-diff gate, but live gameplay scenes still use explicit per-capture budgets to absorb harmless canvas speckle
- **Mobile stress test:** No automated test for 100+ unit match on low-end devices
- **Audio:** No test for spatial panning correctness (manual verification only)
- **Networking:** Multiplayer P2P not fully tested (feature WIP)

## Documentation Gaps

All root and docs/ files now have YAML frontmatter and are current as of 2026-04-16.

- `docs/LORE.md` — Game world and narrative (game is tower defense, not narrative-heavy, but lore docs added for completeness)

## Build & Release Checklist

Before cutting a new release:

```bash
# Code quality
pnpm lint:fix && pnpm typecheck && pnpm test && pnpm test:browser

# Manual smoke test
# - Start match, gather, train unit, attack enemy
# - Unlock upgrade, verify it applies
# - End match, check rewards

# Build for web + Android
pnpm build && pnpm build:android

# Verify APK
# - Install android/app/build/outputs/apk/debug/app-debug.apk
# - Run through smoke test on device

# Update CHANGELOG.md (semantic versioning)
# - Commit & push to main via squash-merge

# GitHub create release with APK artifact attached
```

See [docs/release-checklist.md](release-checklist.md) and [docs/release-signoff-template.md](release-signoff-template.md) for full details.
