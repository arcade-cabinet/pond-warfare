# Claude Plan/Docs Audit — 2026-04-06

## Scope

This audit compares:

- `.claude/plan-state.json`
- `docs/superpowers/specs/2026-03-31-implementation-plan.md`
- `docs/superpowers/specs/2026-04-03-v3-architecture-design.md`
- `docs/superpowers/specs/2026-04-03-panel-map-design.md`
- `docs/superpowers/specs/2026-04-03-comic-landing-design.md`
- `docs/architecture.md`
- `docs/gameplay.md`
- `CLAUDE.md`
- current `src/`, `configs/`, `tests/`

Verification performed:

- `pnpm typecheck`
- `pnpm test` (ran 183 files, 2302 tests passed, 1 skipped)
- `pnpm exec vitest run --config vitest.browser.config.ts tests/browser/current-flow-captures.test.tsx`
- `pnpm exec vitest run --config vitest.browser.config.ts tests/browser/gameplay-loops.test.tsx`

## Executive Summary

1. The latest live Claude plan in `.claude/plan-state.json` is stale. Most of the 6-panel map work exists in code, but the plan still marks every phase `pending`.
2. The older March 31 command-center/advisor plan only landed its device-detection foundation. The actual command-center/advisor UI never shipped, but panel-era residue still exists in stores, helpers, and browser tests.
3. The comic landing implementation is only partial. The current UI is a 2-panel main stage plus a 2-panel play-mode stage, not the documented 3-panel landing page with `SETTINGS`, `CONTINUE`, and prestige affordances.
4. The docs contradict each other. `docs/gameplay.md` and the comic landing spec are behind the code; `CLAUDE.md` is closer to the current menu shape than the gameplay/design docs.
5. The standard test suite is strong, but the browser suite is stale. The old gameplay browser flow times out before startup; a new focused capture test was added for the current flow.
6. There is at least one real implementation gap, not just doc drift: fresh startup still defaults `progressionLevel` to `0`, while the panel-map system behaves as if new players should start at stage `1`.

## Latest Live Plan: `.claude/plan-state.json`

### Status against code

| Plan area | Current state | Evidence |
| --- | --- | --- |
| `configs/panels.json` | Implemented | `configs/panels.json` exists with 6-panel definitions and progression stages |
| panel-based `terrain.json` | Implemented | `configs/terrain.json` uses `panel_based: true` and runtime viewport sizing |
| Frontier Expansion nodes | Implemented | `configs/upgrades.json` includes `frontier_expansion_1` through `frontier_expansion_5` |
| `PanelGrid` | Implemented | `src/game/panel-grid.ts` |
| `ThornWall` terrain | Implemented | `src/terrain/terrain-grid.ts`, `src/game/vertical-map.ts` |
| panel-aware map generation | Implemented | `src/game/vertical-map.ts` |
| panel-aware entity spawning | Implemented | `src/game/init-entities/spawn-vertical.ts`, `src/game/spawn-world.ts` |
| camera pan/zoom clamp | Implemented | `src/rendering/camera.ts`, `src/input/pointer.ts` |
| thorn-wall/biome rendering | Implemented | `src/rendering/background-thornwall.ts`, `src/rendering/background-biome.ts` |
| menu sprites on landing | Implemented | `src/ui/comic-panel.tsx`, `src/ui/comic-landing.tsx` |
| panel-grid test coverage | Implemented | `tests/game/panel-grid.test.ts`, `tests/game/vertical-map.test.ts`, `tests/game/spawn-vertical.test.ts`, `tests/game/camera-zoom.test.ts`, `tests/input/pinch-zoom.test.ts`, `tests/rendering/camera-clamp.test.ts` |

### Still open or only partially done

| Plan step | Current state | Evidence |
| --- | --- | --- |
| Remove minimap system residue | Partial | minimap UI is gone from `src/ui/app.tsx`, but `world.minimapPings` and many minimap-ping producers still exist in ECS/system code |
| Remove airdrop logic | Partial | no airdrop button in `src/ui/app.tsx`, but airdrop state and logic remain in `src/game/abilities.ts`, `src/game/difficulty.ts`, `src/ui/store-gameplay.ts`, `src/ui/store.ts`, `src/ecs/world.ts` |
| Remove ability bar | Not done | `src/ui/app.tsx` still renders `AbilityButtons`; `src/ui/hud/AbilityButtons.tsx` still exposes `Rally Cry`, `Pond Blessing`, `Tidal Surge` |
| Full current-flow browser/E2E proof | Missing in old suite, replaced here | legacy browser files still assume `New Game`/`START`; new current capture test added as `tests/browser/current-flow-captures.test.tsx` |
| Plan bookkeeping | Not done | `.claude/plan-state.json` still marks all phases `pending` despite shipped code |

## March 31 Plan: Responsive + Advisors + Command Center

### What actually landed

| Area | Current state | Evidence |
| --- | --- | --- |
| device classification | Implemented | `src/platform/device.ts`, `tests/platform/device.test.ts` |
| device/form-factor signals | Implemented | `src/platform/signals.ts`, `tests/platform/signals.test.ts`, `tests/browser/device-detection.test.tsx`, `tests/browser/foldable-resize.test.tsx` |
| `roster-sync` helper | Implemented | `src/game/roster-sync.ts` exists |

### What never landed

Missing files from the plan:

- `src/advisors/types.ts`
- `src/advisors/tips.ts`
- `src/advisors/advisor-system.ts`
- `src/advisors/advisor-state.ts`
- `src/config/advisor-config.ts`
- `src/ui/panel/ForcesTab.tsx`
- `src/ui/panel/ForcesGroup.tsx`
- `src/ui/panel/ForceUnitRow.tsx`
- `src/ui/panel/TaskPicker.tsx`
- `src/ui/panel/BuildingsTab.tsx`
- `src/ui/panel/BuildingRow.tsx`
- `src/ui/panel/TrainPicker.tsx`
- `src/ui/hud/AdvisorToast.tsx`
- `tests/advisors/advisor-system.test.ts`
- `tests/ui/ForcesTab.test.tsx`
- `tests/ui/BuildingsTab.test.tsx`
- `tests/browser/command-panel-dock.test.tsx`
- `tests/browser/forces-tab-flow.test.tsx`
- `tests/browser/buildings-tab-flow.test.tsx`
- `tests/browser/advisor-flow.test.tsx`
- `tests/browser/advisor-settings.test.tsx`
- `tests/browser/responsive-tech-tree.test.tsx`
- `tests/gameplay/auto-behavior-per-unit.test.ts`

### Residual code from that abandoned direction

- `mobilePanelOpen` still exists in `src/ui/store-gameplay.ts`
- `src/game/panel-actions.ts` still exists and refers to Forces/Buildings-tab behavior that no longer exists
- roster signals still exist in `src/ui/store-gameplay.ts`
- many browser tests still expect panel-era tabs such as `Map`, `Cmd`, `Act`, `Menu`

Conclusion:

- Phase 1 shipped.
- Phase 2-4 did not ship.
- The codebase still contains partial scaffolding from the abandoned plan.

## Comic Landing: Spec vs Reality

### Implemented

- `src/ui/comic-panel.tsx`
- `src/ui/speech-bubble.tsx`
- `src/ui/comic-landing.tsx`
- SVG sprites for otter/croc/snake
- Frame9Slice styling and menu background

### Not implemented from the April 3 landing spec

| Spec item | Current state | Evidence |
| --- | --- | --- |
| 3 stacked panels in main landing | Not done | current `ComicLanding` main view renders only Otter + Croc panels |
| Snake `SETTINGS` panel | Not done | no `SETTINGS` button in `src/ui/comic-landing.tsx` render tree |
| `CONTINUE` button on save | Not done | `hasSaveGame` exists in store, but `ComicLanding` never reads it |
| prestige bubble on panel 2 | Not done | `ComicLanding` only opens `pearlScreenOpen` from main `UPGRADES` button |
| settings entry on landing | Not done | no `settingsOpen` interaction in `ComicLanding` |
| splash-video stage after start | Dead code | `showSplashVideo` route exists in `src/ui/app.tsx`, but no code sets `showSplashVideo.value = true` |

### Internal contradictions

- `src/ui/comic-landing.tsx` header comment still describes:
  - Panel 3 snake/settings
  - 3 stacked panels
- actual JSX renders:
  - main stage: Otter `PLAY`, Croc `UPGRADES`
  - play stage: Otter `SINGLE PLAYER`, Croc `MULTIPLAYER`

### Test false positives

`tests/ui/comic-landing.test.tsx` passes, but it does not prove the real landing page behavior:

- it mainly tests `ComicPanel` in isolation
- its “store interaction” assertions only flip raw signals
- it claims coverage for `SETTINGS`, `CONTINUE`, and prestige behavior that the real `ComicLanding` component does not render

## Docs That Are Now Obsolete or Wrong

### `docs/gameplay.md`

Outdated in multiple places:

- panel unlock table does not match `configs/panels.json`
  - docs say panel 4 and 5 are stage 1 starts
  - config says panel 5 is stage 1; panel 4 is stage 5
- map-size-by-progression table is obsolete
  - docs describe fixed `1600x2400`, `2000x3000`, `2400x3600`
  - config/code now compute panel size from viewport at runtime
- landing page description is obsolete
  - docs say 3 stacked panels with `PLAY`, `CONTINUE`, `UPGRADES`, `SETTINGS`
  - current UI is 2 landing stages, no `SETTINGS`, no `CONTINUE`
- match-start description is outdated
  - docs say the match starts with Lodge + initial units
  - current vertical spawner creates Lodge + Commander only; no free generalists

### `docs/architecture.md`

Partially stale:

- still says render step includes minimap
- actual app no longer mounts minimap canvases
- minimap data structures still exist in world/systems, so code cleanup is incomplete

### `CLAUDE.md`

Closer to current reality than `docs/gameplay.md`, but still not fully aligned:

- says comic landing is “Two stacked panels”, which matches current UI better
- still documents removed-or-dead surfaces like airdrop-related logic elsewhere in the file map

## Real Gaps, Not Just Doc Drift

### 1. Fresh startup still defaults to stage 0

Observed during browser capture:

- `src/game.ts` calls `spawnVerticalWorld(this.world, storeV3.progressionLevel.value ?? 1)`
- `storeV3.progressionLevel` starts at `0`
- `0 ?? 1` is still `0`
- the intended new-player panel-5 map is stage `1`, not stage `0`

Evidence:

- the capture test had to seed `storeV3.progressionLevel.value = 1`
- several tests manually seed progression to `1` to get the expected map state

Impact:

- new-player startup semantics are ambiguous/broken
- map/resource state for a true fresh run is not aligned with the docs or the stage-1 tests

### 2. Old browser journey is stale and currently unusable

Direct run:

- `pnpm exec vitest run --config vitest.browser.config.ts tests/browser/gameplay-loops.test.tsx`

Result:

- suite failed in `beforeAll`
- 30 tests skipped
- hook timed out after 30 seconds

Why:

- `tests/browser/gameplay-loops.test.tsx` still clicks `New Game` then `START`
- the current menu is `PLAY` then `SINGLE PLAYER`

### 3. Browser script filtering is misleading

`pnpm test:browser -- tests/browser/<file>` still ends up pulling in the broader browser suite.  
For focused validation, use:

```bash
pnpm exec vitest run --config vitest.browser.config.ts tests/browser/<file>.tsx
```

## What Is Implemented and Verified

### Code/test confirmed

- panel grid
- panel-aware terrain generation
- thorn-wall terrain and rendering
- panel-aware entity spawning
- pinch-zoom and camera clamping
- device/form-factor detection
- typed config loading
- reward/prestige/update-web state flows

### Current screenshots captured

Generated by:

```bash
pnpm exec vitest run --config vitest.browser.config.ts tests/browser/current-flow-captures.test.tsx
```

Artifacts:

- `tests/browser/audit/landing-01-main.png`
- `tests/browser/audit/landing-02-play-mode.png`
- `tests/browser/audit/phase-01-match-start.png`
- `tests/browser/audit/phase-02-economy-gathering.png`
- `tests/browser/audit/phase-03-event-alert.png`
- `tests/browser/audit/phase-04-defense-combat.png`
- `tests/browser/audit/phase-05-rewards.png`
- `tests/browser/audit/phase-06-upgrade-web.png`

Note:

- the capture test forces `progressionLevel = 1` because current startup still defaults to `0`

## Bottom Line

If the question is “what did Claude actually finish versus just plan?”:

- the 6-panel map rework is mostly real and shipped
- the command-center/advisor plan did not ship beyond device detection
- the comic landing shipped only as a partial redesign
- the docs were not reconciled after implementation drift
- the old browser suite is no longer a trustworthy source of truth for the current UX
