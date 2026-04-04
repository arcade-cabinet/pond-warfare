> **SUPERSEDED BY v3** -- This PRD describes v1/v2 features. The v3 rearchitecture
> replaced many referenced systems. See tasks/prd-v3-rearchitecture.md for current spec.

# PRD: Pond Warfare v1.4.0 — Visual + Variety + Mobile

## Overview

Pond Warfare v1.3.0 has strong systems (962 tests, 5 tech branches, 7 commanders, terrain, advisors, classic RTS game feel) but units slide without animation, there are only 6 map scenarios, no survival mode, AI personalities feel identical, commanders lack active abilities, mobile testing doesn't exist, and releases require manual intervention. v1.4.0 addresses all of these to take the game from 9/10 polish to a genuinely replayable, visually alive RTS with automated mobile CI.

## Goals

1. Units visually animate (walk cycles, attack swings, idle fidgets) — biggest visual upgrade
2. 3 new map scenarios using the terrain system (Archipelago, Ravine, Swamp)
3. Survival Mode with endless escalating waves and leaderboard integration
4. AI personalities produce visibly different gameplay (turtle builds walls, rush attacks early)
5. Each commander has 1 active ability with cooldown (7 total)
6. Maestro mobile test flows running in CI
7. Android debug APK builds attached to GitHub releases
8. Auto-merge workflow fixed for release-please and Dependabot PRs

## User Stories

### US1: Sprite Walk Cycles
As a player, I want to see my units visually walking when they move, so that the game feels alive instead of units sliding across static sprites.

Acceptance Criteria:
- [ ] All 9 player unit types have 2-3 frame walk cycle animations
- [ ] Walk animation plays during Move, GatherMove, AttackMove states
- [ ] Animation speed scales with unit movement speed
- [ ] Idle state shows idle fidget (existing idle bob + occasional frame shift)
- [ ] Attack state shows attack swing frame (1 frame held during attack cooldown)
- [ ] Enemy units also animate (at minimum Gator and Snake)
- [ ] Sprite sheet generation updated in rendering/sprites/
- [ ] Frame cycling logic in entity-renderer.ts
- [ ] All existing tests still pass
- [ ] < 300 LOC per file

### US2: Attack Swing Animation
As a player, I want to see units visually swing when they attack melee, so that combat feels impactful beyond the existing lunge animation.

Acceptance Criteria:
- [ ] Melee units show a distinct attack frame during their attack cooldown
- [ ] The attack frame is different from the walk/idle frames
- [ ] Ranged units show a "fire" frame when shooting
- [ ] Catapult shows a launch frame
- [ ] Attack animation integrates with existing triggerAttackLunge
- [ ] Tests verify frame switching on state change

### US3: Archipelago Map Scenario
As a player, I want to play on an Archipelago map with multiple islands connected by shallow bridges, so that water terrain creates strategic chokepoints.

Acceptance Criteria:
- [ ] New scenario file: src/game/init-entities/scenario-archipelago.ts
- [ ] 4-6 islands with Water tiles between them
- [ ] Shallows tiles at 2-3 bridge crossings between islands
- [ ] Player starts on one island, enemies on others
- [ ] Resources distributed across islands (must expand to access all)
- [ ] Terrain painted correctly (Water/Shallows/Grass/HighGround)
- [ ] Scenario selectable in New Game modal
- [ ] Determinism test with same seed
- [ ] < 300 LOC

### US4: Ravine Map Scenario
As a player, I want to play on a Ravine map with high ground on both sides and bridge chokepoints, so that elevation advantage creates tactical depth.

Acceptance Criteria:
- [ ] New scenario file: src/game/init-entities/scenario-ravine.ts
- [ ] Central ravine (Mud/Shallows terrain) with HighGround on both sides
- [ ] 2-3 bridge crossings (narrow Grass strips over the ravine)
- [ ] Player on one side, enemies on the other
- [ ] HighGround positions give ranged units +25% range advantage
- [ ] Resources in the ravine (risky to gather but rewarding)
- [ ] Determinism test

### US5: Swamp Map Scenario
As a player, I want to play on a Swamp map that's mostly Mud/Shallows, so that slow terrain forces defensive play and makes speed techs more valuable.

Acceptance Criteria:
- [ ] New scenario file: src/game/init-entities/scenario-swamp.ts
- [ ] 70%+ of map is Mud or Shallows (slow terrain)
- [ ] Small Grass "dry land" patches for bases
- [ ] Scattered Rocks creating maze-like paths
- [ ] Makes Swift Paws tech extremely valuable (+10% speed matters more on slow terrain)
- [ ] Resources concentrated on dry land patches
- [ ] Determinism test

### US6: Survival Mode
As a player, I want an endless Survival Mode where enemy waves escalate indefinitely, so that I can test how long I can survive and compete on leaderboards.

Acceptance Criteria:
- [ ] New game mode selectable from main menu (alongside Skirmish/Campaign)
- [ ] No enemy nests — enemies spawn from map edges in waves
- [ ] Wave difficulty increases every 2 minutes (more units, higher tiers)
- [ ] Boss waves every 5th wave
- [ ] Score based on: survival time + kills + buildings standing
- [ ] Score saved to leaderboard (separate from Skirmish leaderboard)
- [ ] Game ends when Lodge is destroyed
- [ ] Wave counter shown in HUD
- [ ] All 5 tech branches available
- [ ] All 7 commanders selectable
- [ ] Difficulty presets apply (Easy survival = slower escalation)

### US7: AI Personality Differentiation
As a player, I want to notice clear behavioral differences between AI personalities (turtle, rush, economic, balanced, random), so that each game feels distinct based on opponent type.

Acceptance Criteria:
- [ ] Turtle AI: builds 2x towers, walls first, attacks only when army >= 10
- [ ] Rush AI: trains 3 Gators immediately, attacks within 90 seconds, skips economy
- [ ] Economic AI: expands to 3 nests, builds 2x gatherers, late-game army is huge
- [ ] Balanced AI: current behavior (no change needed)
- [ ] Random AI: cycles between personalities visibly (switch every 3 min)
- [ ] Each personality produces measurably different game outcomes in integration tests
- [ ] Visible differences: turtle has more towers, rush contacts earlier, economic has more nests

### US8: Commander Active Abilities
As a player, I want each commander to have 1 powerful active ability with a cooldown, so that choosing a commander is a meaningful strategic decision beyond passives.

Acceptance Criteria:
- [ ] 7 active abilities (1 per commander) with distinct effects
- [ ] Marshal: "Charge!" — selected units 2x speed for 5s (90s cooldown)
- [ ] Sage: "Eureka!" — instantly complete current research (180s cooldown)
- [ ] Warden: "Fortify!" — all buildings invulnerable 10s (120s cooldown)
- [ ] Tidekeeper: "Tidal Wave" — push enemies away from Lodge (90s cooldown)
- [ ] Shadowfang: "Vanish" — all units invisible 8s (120s cooldown)
- [ ] Ironpaw: "Iron Will" — all units immune to damage 5s (150s cooldown)
- [ ] Stormcaller: "Thunder Strike" — massive AoE at target (120s cooldown)
- [ ] Ability button in HUD with cooldown indicator
- [ ] Keyboard shortcut (Q or ability key)
- [ ] Each ability has visual + audio effect
- [ ] Balance tested: no ability is game-breaking

### US9: Maestro Mobile Testing
As a developer, I want Maestro test flows running in CI against an Android emulator, so that mobile UX is validated automatically on every PR.

Acceptance Criteria:
- [ ] Maestro installed in CI workflow
- [ ] 3 test flows: new-game-flow, in-game-hud, settings-persistence
- [ ] new-game-flow: launch → New Game → select commander → START → verify game renders
- [ ] in-game-hud: verify accordion sections visible, tap each one
- [ ] settings-persistence: change volume → restart → verify persisted
- [ ] Runs on Android emulator (API 34)
- [ ] Screenshots captured on failure
- [ ] Doesn't block PR merge (warning only, not required check)

### US10: Android Debug APK in Releases
As a developer, I want debug APKs automatically built and attached to GitHub releases, so that testers can install on real devices without building locally.

Acceptance Criteria:
- [ ] Capacitor Android build in CI (triggered on release tag)
- [ ] Debug APK artifact uploaded to the GitHub release
- [ ] APK filename includes version number
- [ ] Build uses correct base URL for Capacitor (/ not /pond-warfare/)
- [ ] APK installs and launches on Android 12+

### US11: Fix Auto-Merge Workflow
As a developer, I want release-please and Dependabot PRs to auto-merge after CI passes, so that releases don't require manual intervention.

Acceptance Criteria:
- [ ] Auto-merge workflow triggers on pull_request (not pull_request_target)
- [ ] Fork validation prevents malicious PRs
- [ ] Uses a PAT or app token for approval (not GITHUB_TOKEN self-approval)
- [ ] release-please PRs auto-merge after CI passes
- [ ] Dependabot PRs auto-merge after CI passes
- [ ] Non-trusted PRs are not auto-merged

## Technical Requirements

- All sprite animation via PixiJS sprite sheet cycling (no GIF/video)
- Survival mode reuses existing wave/evolution systems with parameter overrides
- Commander abilities use existing ECS pattern (new system file per ability or shared)
- Maestro flows in .maestro/ directory, CI workflow in .github/workflows/
- Android build via Capacitor CLI in CI
- All files < 300 LOC, all tests pass, TypeScript strict

## Success Criteria

- Visual: units visibly animate during walk/attack/idle (not static sprites)
- Content: 9 map scenarios (was 6), 1 new game mode
- Depth: AI personalities produce statistically different outcomes
- Strategic: commander choice matters (active ability + passive)
- Mobile: automated testing catches mobile regressions
- CI/CD: releases are fully automated

## Out of Scope

- Multiplayer
- New unit types (v1.5.0)
- New enemy types (v1.5.0)
- Weather effects (v2.0.0)
- Campaign branching (v1.5.0)
- Replay system (v2.0.0)

## Implementation Plan

Phase 1 (Infrastructure): US9, US10, US11 — CI/CD foundation
Phase 2 (Visual): US1, US2 — sprite animation
Phase 3 (Content): US3, US4, US5, US6 — maps + survival mode
Phase 4 (Depth): US7, US8 — AI + commander abilities

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Sprite animation increases bundle size | Use sprite sheets, not individual frames. Limit to 3 frames per animation. |
| Survival mode balance may be off | Use governor E2E test to validate wave progression |
| Commander abilities may be OP | Add integration tests verifying no ability produces >50% win rate improvement |
| Maestro flaky in CI | Set as warning-only check, not required |
| Android build may fail on CI runners | Use official Capacitor GitHub Action with cached Gradle |
