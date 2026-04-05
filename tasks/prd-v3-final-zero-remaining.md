# PRD: v3 Final — Zero Remaining Issues

## Overview

Exhaustive audit found every remaining issue. This PRD covers ALL of them. After execution, grep/search for any issue returns 0 results.

---

## User Stories

### US1: Delete Dead Stubs & Deprecated Code
**As a** developer reading the codebase,
**I want** zero stub signals, deprecated functions, or dead CSS,
**So that** every line of code is live production code.

**Acceptance Criteria:**
- [ ] Delete 6 stub signal blocks in `src/ui/store-gameplay.ts` (daily challenge, auto-behavior toggles, panel tab, tech tree, campaign, unlocks) — lines 92-118
- [ ] Delete deprecated `addVehicle`/`removeVehicle` in `src/ai/yuka-manager.ts`
- [ ] Delete deprecated CSS blocks in `src/styles/main.css` (ripple-drift, water-shimmer, water-caustics)
- [ ] Delete `src/config/tech-tree.ts` stub (empty TECH_UPGRADES, canResearch always false) — update imports to remove
- [ ] Delete deprecated `advisorState` field usage (keep field for save compat but remove any active references)
- [ ] Fix `src/ui/radial-menu.tsx:112` — read `lodgeDamaged` from `storeV3.lodgeHp` signal
- [ ] Fix `src/ui/settings-panel.tsx:13` — add autoFocus to close button
- [ ] Delete `src/game/init-entities/index.ts` if it only re-exports deprecated horizontal spawner
- [ ] Clean shrine.ts placeholder comments (Flood, Stone Wall)
- [ ] Fix all tests that import deleted stubs — update or remove
- [ ] `grep -ri "stub\|TODO\|FIXME\|HACK\|deprecated\|placeholder" src/` returns 0 actionable items

### US2: Keyboard-Only Features Get Tap Targets
**As a** phone player,
**I want** every game action accessible via tap,
**So that** I never need a keyboard.

**Acceptance Criteria:**
- [ ] Pause: tap target in top bar (already has speed button area — add pause icon)
- [ ] Center Selection: double-tap unit portrait in selection panel centers camera
- [ ] Cycle Buildings: swipe or tap arrows on building list in Forces panel
- [ ] Pond Blessing ability: visible button in HUD (alongside Commander ability)
- [ ] Tidal Surge ability: visible button in HUD (alongside Commander ability)
- [ ] Mute: already in settings — verify settings gear is accessible in-game
- [ ] Commander ability button shows correct key or no key label on mobile
- [ ] Fix Q/B key mismatch: CommanderAbility.tsx shows Q but keymap binds B for rally cry. Wire Q→commander ability consistently.
- [ ] Zero keyboard-only features remain

### US3: Weather Gameplay Effects
**As a** player in a rainstorm,
**I want** rain to actually slow my units and reduce gathering,
**So that** weather creates tactical decisions.

**Acceptance Criteria:**
- [ ] Rain: movement speed ×0.85 — apply `getWeatherGrassSpeedMult()` in `movementSystem`
- [ ] Rain: shallows become impassable — apply `areShallowsBlocked()` in terrain checks
- [ ] Rain: gather rate ×0.9 — apply `getWeatherGatherMult()` in `gatheringSystem`
- [ ] Fog: vision range ×0.6 — apply `getWeatherVisionMult()` in `fogOfWarSystem`
- [ ] Fog: enemy aggro threshold ×1.5 — apply `getWeatherAttackThresholdMult()` in `aiSystem`
- [ ] Wind: projectile drift ±20px — apply `getWeatherProjectileOffset()` in `projectileSystem`
- [ ] Tests: each weather effect has a test verifying the modifier is applied

### US4: wave-spawner.ts Over 300 LOC
**As a** developer following the 300 LOC rule,
**I want** wave-spawner.ts split into focused modules,
**So that** each file has one responsibility.

**Acceptance Criteria:**
- [ ] Split `src/ecs/systems/wave-spawner.ts` (491 LOC) into:
  - `wave-spawner.ts` — role mapping, spawn orchestration (<150 LOC)
  - `spawn-patterns.ts` — all 10 pattern functions (<200 LOC)
  - `spawn-positions.ts` — edge calculation, panel-aware positioning (<150 LOC)
- [ ] Split `src/game/init-entities/spawn-vertical.ts` (311 LOC) — extract helper functions
- [ ] All files under 300 LOC
- [ ] All tests pass after split

### US5: Naming Cleanup
**As a** developer reading the DB schema,
**I want** Pearl earnings stored as `total_pearls_earned` not `total_clams_earned`,
**So that** the naming matches the actual data.

**Acceptance Criteria:**
- [ ] Add `total_pearls_earned` column to schema migration
- [ ] `store-v3-persistence.ts` reads `total_pearls_earned ?? total_clams_earned` (backward compat)
- [ ] `store-v3-persistence.ts` writes to `total_pearls_earned`
- [ ] `world-factory.ts` comment "Starting fish (clams)" → "Starting fish"
- [ ] Zero confusing naming remains

### US6: Multiplayer — Lodge vs Lodge Mode
**As a** player wanting competitive play,
**I want** to fight another player's Lodge in real-time,
**So that** the simplified v3 design enables head-to-head matches.

**Acceptance Criteria:**
- [ ] New match mode: `adversarial` (alongside `waveSurvival` and `nestDestruction`)
- [ ] Each player has own Lodge, own economy, own Commander on same map
- [ ] Enemy waves attack BOTH players (shared threat)
- [ ] Players can send units to attack opponent's Lodge
- [ ] Win condition: destroy opponent's Commander OR Lodge
- [ ] Lockstep sync: all commands serialized as tap events (position, target entity, radial selection)
- [ ] No keyboard commands in multiplayer — tap only
- [ ] Room code matchmaking via existing Trystero WebRTC
- [ ] UI: multiplayer lobby with commander select, ready state
- [ ] Tests: lockstep determinism test (same seed + same commands = same state)

### US7: Pointer/Touch Interaction Tests
**As a** developer changing touch handling,
**I want** tests for tap-to-select, tap-to-move, radial menu dispatch,
**So that** the PRIMARY input method (touch) is regression-tested.

**Acceptance Criteria:**
- [ ] `tests/input/pointer-interactions.test.ts` — tap ground = deselect, tap unit = select, tap enemy with unit selected = attack-move, tap resource with gatherer = gather-move
- [ ] `tests/ui/radial-menu-interactions.test.ts` — Lodge tap shows radial, radial option tap trains unit, cost check prevents training when broke
- [ ] `tests/gameplay/touch-flow.test.ts` — full tap-only flow: tap Lodge → radial → train → tap gatherer → tap resource → gather cycle completes
- [ ] Zero keyboard references in these test files

### US8: Fortification Tower Tests in Live Game Loop
**As a** developer adjusting tower damage,
**I want** integration tests proving towers attack enemies during real gameplay frames,
**So that** balance changes don't silently break defenses.

**Acceptance Criteria:**
- [ ] Test: spawn world → place tower → run 300 frames → enemy near tower loses HP
- [ ] Test: spawn world → place wall → enemy path blocked (position doesn't cross wall)
- [ ] Already partially done in `tests/gameplay/fortification-integration.test.ts` — verify and extend

---

### US9: Archive Superseded Docs & PRDs
**As a** developer onboarding to v3,
**I want** zero stale v1/v2 docs cluttering the project,
**So that** every doc I read describes the ACTUAL game.

**Acceptance Criteria:**
- [ ] Move 7 superseded PRDs to `tasks/archive/`: prd-design-bible.md, prd-v2.0.md, prd-v1.4.md, prd-v1.5.md, prd-macro-meso-micro.md, prd-quality-overhaul.md, prd-content-polish-accessibility.md
- [ ] Move `docs/design-bible-implementation-plan.md` to `docs/archive/`
- [ ] Rewrite `docs/design-bible.md` — currently describes v1.0 (25 techs, 5 campaigns, 6 map scenarios). Replace with v3 vision: single-mode mobile RTS, Lodge defense, prestige loop, 6-panel maps
- [ ] Update `docs/responsive-modals.md` — remove advisor references, update to v3 PondAccordion pattern
- [ ] Update `docs/ROADMAP.md` — test count says 1663, actual is 2159+. Add multiplayer to v3.1. Remove stale v1/v2 milestones section.
- [ ] Update `docs/playtest-findings.md` — incorporate diagnostic playthrough data from this session
- [ ] Update `docs/playtest-personas.md` — ensure personas match mobile-first v3 experience
- [ ] Zero docs reference advisors, campaigns, puzzles, tech tree, or 5 game modes

### US10: Clean Stale Memory Items
**As a** returning developer,
**I want** memory items that reflect v3 reality,
**So that** future sessions don't get confused by v2 context.

**Acceptance Criteria:**
- [ ] Delete or update `project_tech_tree_ui.md` — tech tree replaced by upgrade web
- [ ] Delete or update `project_command_center_ui.md` — replaced by Forces/Buildings accordion
- [ ] Delete or update `feedback_hamburger_critical.md` — hamburger removed, accordion is current pattern
- [ ] Update `project_design_pivot_rts_simplify.md` — pivot is DONE, mark as historical
- [ ] Update `project_governor_bug.md` — bug is FIXED, mark as historical
- [ ] Update `project_massive_session_2026_03_31.md` — mark as historical context
- [ ] Delete `project_design_bible.md` if it references v1 design bible
- [ ] Add new memory: "v3 complete — mobile-first tap RTS, Fish/Rocks/Logs resources, 6-panel maps, fortifications, spawn patterns, Governor auto-play"
- [ ] Add new memory: "NO KEYBOARD — tap/touch is primary input, every action has a visible tap target"

### US11: CLAUDE.md & AGENTS.md Accuracy
**As a** developer (or AI agent) working on this project,
**I want** CLAUDE.md and AGENTS.md to accurately describe v3,
**So that** instructions match the actual codebase.

**Acceptance Criteria:**
- [ ] CLAUDE.md test count updated to current (2159+)
- [ ] CLAUDE.md "6 trainable units" section lists correct costs from units.json
- [ ] CLAUDE.md file organization reflects new files (spawn-patterns.ts, CommanderAbility.tsx, fortification tick)
- [ ] AGENTS.md references v3 architecture, not v2
- [ ] AGENTS.md lists correct commands (`pnpm dev`, `pnpm test`, etc.)
- [ ] Neither doc mentions advisors, tech tree, campaigns, or puzzles

### US12: Delete keyboard.test.ts
**As a** developer maintaining touch-first tests,
**I want** zero keyboard-focused test files,
**So that** test effort goes to the actual input method.

**Acceptance Criteria:**
- [ ] Delete `tests/input/keyboard.test.ts` if it still exists
- [ ] No test files import from `@/input/keyboard` or test keyboard callbacks
- [ ] The keyboard.ts SOURCE file can stay (desktop users) but tests focus on pointer/touch

---

## Out of Scope
- New unit types
- New panel configurations
- PWA/service worker
- Browser-mode e2e tests (need Playwright, separate CI)
- Capacitor native plugins

## Success Criteria
- `grep -ri "stub\|TODO\|FIXME" src/` → 0 actionable items (save-compat comments OK)
- `grep -r "keyboard\|WASD\|hotkey" tests/` → 0 (no keyboard tests)
- Every tap flow has a test
- `pnpm test` all pass
- `pnpm typecheck` zero errors
- `pnpm build` succeeds
- All src/ files under 300 LOC
- Weather effects functional (not just visual)
- Multiplayer adversarial mode playable on 2 phones
- Zero superseded docs in active directories
- Memory items reflect v3 reality
- CLAUDE.md and AGENTS.md accurate
