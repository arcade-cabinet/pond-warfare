# PRD: Pond Warfare v3 — Complete Remaining Implementation

## Overview

v3.0 rearchitecture and v3.1 commander flow are mostly implemented. This PRD covers ALL remaining gaps identified via Governor-driven diagnostic playthroughs, test coverage analysis, and code exploration. Goal: ship a complete, tested, playable v3 game.

Current state: 162 test files, 1973 tests passing. Core loop works (gather → train → fight → defend). Fortification system just integrated. Commander ability UI just added. Spawn patterns implemented.

---

## Goals

1. **100% critical system test coverage** — every gameplay-affecting system has tests
2. **Zero stubs** — no placeholder code, every feature is wired end-to-end
3. **Governor auto-play mode** — toggle in settings for demo/testing
4. **Resource naming complete** — no remaining v2 aliases anywhere
5. **Documentation current** — CLAUDE.md, architecture.md, gameplay.md all accurate

---

## User Stories

### US1: Governor Auto-Play Mode
**As a** developer testing gameplay balance,
**I want** a toggle in settings to enable Governor AI auto-play,
**So that** I can observe full matches without manual input.

**Acceptance Criteria:**
- [ ] `src/ui/store-gameplay.ts` has `autoPlayEnabled` signal
- [ ] Settings panel has "Auto-Play (Governor AI)" toggle
- [ ] `src/game.ts` instantiates Governor when auto-play enabled
- [ ] Governor.enabled set to true on match start when toggle active
- [ ] Auto-play test: Governor trains units, gathers, attacks within 3600 frames

---

### US2: Combat Subsystem Tests
**As a** developer changing damage formulas,
**I want** tests for positional damage, take-damage, healing, and commander aura,
**So that** balance changes don't silently break combat.

**Acceptance Criteria:**
- [ ] `tests/ecs/systems/combat/positional-damage.test.ts` — flanking + elevation bonuses
- [ ] `tests/ecs/systems/health/take-damage.test.ts` — damage application, tech modifiers
- [ ] `tests/ecs/systems/health/healing.test.ts` — heal caps, area healing
- [ ] `tests/ecs/systems/combat/commander-aura.test.ts` — buff radius, damage bonus
- [ ] All tests use real ECS entities, not mocks of own code

---

### US3: Enemy AI Tests
**As a** developer tuning difficulty,
**I want** tests for enemy economy, training, and combat decisions,
**So that** difficulty changes are validated.

**Acceptance Criteria:**
- [ ] `tests/ecs/systems/ai/enemy-economy.test.ts` — gatherer spawn, peace timer gate
- [ ] `tests/ecs/systems/ai/enemy-training.test.ts` — unit training, cost deduction
- [ ] `tests/ecs/systems/ai/enemy-combat.test.ts` — attack targeting, army grouping

---

### US4: Input System Tests
**As a** developer changing keybindings,
**I want** tests for keyboard and pointer handlers,
**So that** controls don't silently break.

**Acceptance Criteria:**
- [ ] `tests/input/keyboard.test.ts` — WASD pan, Ctrl+1-9 groups, Q ability, Escape, Tab, speed
- [ ] All keymap entries have corresponding test assertions

---

### US5: Evolution & Threat Escalation Tests
**As a** developer adjusting difficulty curves,
**I want** tests for threat level progression and enemy evolution,
**So that** late-game scaling is validated.

**Acceptance Criteria:**
- [ ] `tests/ecs/systems/evolution/threat-escalation.test.ts` — threat over time, tier thresholds
- [ ] `tests/ecs/systems/gathering/passive-income.test.ts` — fishing hut income rate

---

### US6: Fortification Integration Tests
**As a** player placing towers and walls,
**I want** towers to actually shoot enemies and walls to block movement,
**So that** fortifications provide real defensive value.

**Acceptance Criteria:**
- [ ] Test: tower placed → nearest enemy in range takes damage each cooldown cycle
- [ ] Test: wall placed → movement system blocks entities at wall position
- [ ] Test: enemy sapper damages fortification slot → slot transitions to destroyed
- [ ] Tests use real spawnVerticalEntities world with fortification state initialized

---

### US7: Resource Naming Consistency Pass
**As a** developer reading the codebase,
**I want** v3 resource names (fish/rocks/logs/fishCost/logCost/rockCost) used everywhere,
**So that** there's no confusion with metagame currencies (Clams/Pearls).

**Acceptance Criteria:**
- [ ] Zero `clamCost` or `twigCost` in src/ (use fishCost/logCost)
- [ ] Zero `store.clams` or `store.twigs` in src/ (use store.fish/store.logs)
- [ ] Zero `resources.clams` or `resources.twigs` in src/ (except save-system v2 compat)
- [ ] Zero `gathering-clams` or `gathering-twigs` task names (use gathering-fish/gathering-logs)
- [ ] CLAUDE.md line 58 says "No aliases" not "aliased internally"
- [ ] Grep verification script confirms zero stale references

---

### US8: Documentation Update
**As a** developer onboarding to the project,
**I want** accurate documentation reflecting v3 state,
**So that** I can understand the architecture without reading every file.

**Acceptance Criteria:**
- [ ] `CLAUDE.md` resource section accurate (no aliases)
- [ ] `CLAUDE.md` test count updated
- [ ] `docs/architecture.md` lists fortification system in system runner order
- [ ] `docs/architecture.md` lists spawn pattern system
- [ ] `docs/gameplay.md` reflects v3 unit costs from units.json

---

## Technical Requirements

- **Stack**: Preact + bitECS + Yuka.js + Vitest 4
- **300 LOC max** per file — enforced by hook
- **Node test environment** by default, JSDOM per-file via `// @vitest-environment jsdom`
- **No mocking own code** — use real createGameWorld() and spawnEntity()
- **JSON configs** are source of truth for all balance data

## Success Criteria

- `pnpm typecheck` — zero errors
- `pnpm test` — all pass, no skipped tests
- `pnpm build` — production build under 1MB
- `pnpm lint:fix` — zero new errors
- Governor diagnostic: all tiers show active combat, economy, and defense
- No `clamCost`, `twigCost`, `store.clams`, `store.twigs` in grep of src/

## Out of Scope

- New unit types beyond the 6 generalists + 6 enemies
- Multiplayer/co-op features
- New panel configurations beyond the 3x2 grid
- Mobile-specific Capacitor plugins
- Service worker / PWA (removed in v3)
- New visual assets / sprites

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Resource rename breaks save compat | save-system.ts has v2 fallback: `data.resources.fish ?? data.resources.clams` |
| Fortification tower damage too strong | Tower cooldown is 90 frames (1.5s), testable via config |
| Governor auto-play too aggressive | Governor is opt-in via settings, doesn't affect normal gameplay |
| Test count growth slows CI | Tests run in <5s currently; Node env is 3x faster than JSDOM |
