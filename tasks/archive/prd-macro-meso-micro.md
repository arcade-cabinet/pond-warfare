> **SUPERSEDED BY v3** -- This PRD describes v1/v2 features. The v3 rearchitecture
> replaced many referenced systems. See tasks/prd-v3-rearchitecture.md for current spec.

# PRD: Macro/Meso/Micro Gap Analysis — Complete Remediation

## Overview

Comprehensive analysis across three levels identified 60+ gaps in Pond Warfare. This PRD addresses everything from game balance (macro), UX flows (meso), to code quality (micro). Prioritized by player impact.

**Business value:** Transform from "working prototype with balance issues" to "polished, balanced RTS that rewards skill and exploration."

## Source Analysis

- **Macro** (game systems): 32 findings — unit balance, tech tree, commanders, difficulty, progression, missing RTS systems
- **Meso** (UX/UI): 25 findings — information architecture, feedback loops, accessibility, mobile UX
- **Micro** (code quality): 15 findings — dead code, incomplete features, performance, type safety

---

## User Stories

### TIER 1: CRITICAL (Gamebreaking / Blocks Fun)

---

### US1: Implement 4 Stub Commander Abilities
**As a** player choosing a commander,
**I want** every commander ability to actually work,
**So that** my commander choice is meaningful and not cosmetic.

**Current state:** Marshal (Charge), Warden (Fortify), Shadowfang (Vanish), Ironpaw (Iron Will) show floating text but apply NO gameplay effect. Only Tidekeeper, Sage, Stormcaller work.

**Acceptance Criteria:**
- [ ] Marshal Charge: 2x movement speed for all player units for 5s
- [ ] Warden Fortify: all buildings take 0 damage for 10s
- [ ] Shadowfang Vanish: all units invisible to enemies for 8s
- [ ] Ironpaw Iron Will: selected units immune to damage for 5s
- [ ] Each ability has a test verifying the effect is applied and expires
- [ ] Cooldown timers work correctly for all 4

**Files:** `src/game/commander-abilities.ts`, `src/ecs/systems/movement/speed-modifiers.ts`, `src/ecs/systems/health/take-damage.ts`, `src/ecs/systems/fog-of-war.ts`

---

### US2: Rebalance Units — Scout, Shieldbearer, Catapult
**As a** player building an army,
**I want** every unit to have a clear role,
**So that** unit composition decisions are strategic, not obvious.

**Acceptance Criteria:**
- [ ] Scout: redesigned as vision support (5→1 damage stays, add +50% vision aura for nearby units, speed 3.0→3.5, cost stays 35C)
- [ ] Shieldbearer: cost reduced 150C+100T → 100C+60T, damage stays 3, add 30% damage reduction aura for adjacent units
- [ ] Catapult: cost reduced 300C+200T → 200C+150T, add splash damage (hits all enemies in 40px radius)
- [ ] Tests for each rebalanced unit

**Files:** `src/config/entity-defs/player-units.ts`, `src/ecs/systems/combat/melee-attacks.ts`

---

### US3: Fix Nature Branch Healing — Add Caps
**As a** player facing healer-heavy compositions,
**I want** healing to have meaningful limits,
**So that** games don't devolve into infinite attrition.

**Acceptance Criteria:**
- [ ] Healers: max 3 active heals per healer at once (not unlimited)
- [ ] Herbalist Hut: healing range reduced from unlimited to 200px
- [ ] Pondius Blessing: cooldown added (120s), heals 20% max HP (not current)
- [ ] Regeneration tech: 1 HP/5s only when out of combat (not during fights)
- [ ] Tests verifying healing caps

**Files:** `src/ecs/systems/health/healing.ts`, `src/config/tech-tree.ts`

---

### US4: Fix Tech Tree — Trade Routes, Warfare Branch, Shadow Identity
**As a** player investing in tech,
**I want** every tech to be worth researching,
**So that** there are meaningful choices, not trap options.

**Acceptance Criteria:**
- [ ] Trade Routes: reworked to "+2 clams/sec per Market building" (was +6 clams/5s per Lodge — too weak)
- [ ] Warfare branch: War Drums reworked to "+10% damage for all units within 300px of any friendly building" (not just Armory)
- [ ] Piercing Shot: reworked to "ranged attacks ignore 30% armor" (was 50% — too niche, now useful vs all enemies)
- [ ] Shadow branch identity: Rally Cry merged with Swift Paws into "Shadow Sprint" (+15% permanent speed, active: +40% for 8s). Venom Coating buffed to "2 dmg/s poison for 5s"
- [ ] Tests for reworked techs

**Files:** `src/config/tech-tree.ts`, `src/ecs/systems/combat/melee-attacks.ts`, `src/ecs/systems/commander-passives.ts`

---

### US5: Add Action Confirmation for Expensive Operations
**As a** mobile player,
**I want** confirmation before spending 100+ resources,
**So that** fat-finger misclicks don't ruin my game.

**Acceptance Criteria:**
- [ ] Tech research shows "Research X? (cost)" confirm dialog for techs costing 200+ resources
- [ ] Building placement shows cost preview before placing
- [ ] Toast with 3s undo window appears after training expensive units (100+ cost)
- [ ] Confirmation respects "Don't ask again" toggle in settings

**Files:** `src/ui/tech-tree-panel.tsx`, `src/ui/action-panel.tsx`, new: `src/ui/components/ConfirmDialog.tsx`

---

### US6: Delete Dead Menu Code
**As a** developer maintaining the codebase,
**I want** unused code removed,
**So that** the codebase stays clean and the 300 LOC limit is meaningful.

**Acceptance Criteria:**
- [ ] `src/ui/menu-lily-pads.tsx` deleted (54 LOC, zero imports)
- [ ] `src/ui/menu-otter.ts` deleted (200 LOC, zero imports)
- [ ] `src/ui/menu-pads.ts` deleted (159 LOC, zero imports)
- [ ] Old watercolor UI assets in public/assets/ui/ that are no longer referenced: Background.png, Button.png, Otter.png, otter shadow PNG, lily pad PNGs, water ripple PNGs, Flower.png — moved out of public/ or deleted
- [ ] No remaining imports of deleted files

**Files:** 3 files to delete, asset cleanup

---

### TIER 2: HIGH PRIORITY (Impacts Strategy / UX Clarity)

---

### US7: Show Tech Prerequisites Inline
**As a** player planning my tech path,
**I want** to see why a tech is locked,
**So that** I can plan my research order.

**Acceptance Criteria:**
- [ ] Locked techs show "Requires: [tech name]" label
- [ ] Unaffordable techs have disabled research button with cost in red
- [ ] Tech tooltip shows full dependency chain
- [ ] Works in both compact (accordion) and desktop (graph) layouts

**Files:** `src/ui/tech-tree/TechCard.tsx`, `src/ui/tech-tree/TechNode.tsx`

---

### US8: Show Unit Stats in Training Tooltips
**As a** player choosing units to train,
**I want** to see HP, damage, range, and speed before committing,
**So that** I can make informed army composition decisions.

**Acceptance Criteria:**
- [ ] Action button tooltip shows: HP, Damage, Range, Speed, Train Time
- [ ] Cost breakdown shows clams/twigs/food separately
- [ ] Tooltip data sourced from entity-defs (single source of truth)

**Files:** `src/ui/action-panel.tsx`, `src/ui/tooltip-helpers.ts`, `src/config/entity-defs/player-units.ts`

---

### US9: Add Resource Generation Rate to HUD
**As a** player managing economy,
**I want** to see "+X clams/sec" next to resource counts,
**So that** I know if my economy is healthy.

**Acceptance Criteria:**
- [ ] Top bar shows generation rate per resource (clams, twigs, food)
- [ ] Rate updates every 5 seconds (not per frame)
- [ ] Rate changes flash briefly when a gatherer starts/stops

**Files:** `src/ui/hud/top-bar-resources.tsx`, `src/ui/store.ts`

---

### US10: Add Ability Hotkey Badges
**As a** player using keyboard shortcuts,
**I want** to see hotkey labels on ability buttons,
**So that** I can learn shortcuts while playing.

**Acceptance Criteria:**
- [ ] Rally Cry shows "P" badge
- [ ] Pond Blessing shows "G" badge
- [ ] Tidal Surge shows "S" badge
- [ ] Commander ability already shows "Q" (verify)

**Files:** `src/ui/hud/ability-bar.tsx`

---

### US11: Fix Difficulty Curve — Hard/Nightmare Economy
**As a** player on Hard/Nightmare,
**I want** a fair challenge that scales with time,
**So that** I'm not dead before minute 3 due to economy disparity.

**Acceptance Criteria:**
- [ ] Hard: enemies start with 2 nests (was 3), nest build rate 0.8x (was 1x)
- [ ] Nightmare: enemies start with 2 nests (was 4), nest build rate 1.0x, but +25% unit stats
- [ ] Ultra Nightmare: enemies start with 3 nests, 1.5x unit stats, 0 peace time
- [ ] Permadeath bonus: +75% gathering speed (was +50%)
- [ ] Tests for difficulty modifier application

**Files:** `src/game/difficulty.ts`, `src/ecs/world-defaults.ts`

---

### US12: Add Unit Rally Points
**As a** player training units from buildings,
**I want** to set rally points so new units go where I need them,
**So that** I don't have to babysit every building.

**Acceptance Criteria:**
- [ ] Right-click building while selected → set rally point
- [ ] Rally flag renders at target position
- [ ] Newly trained units auto-move to rally point on spawn
- [ ] Rally point persists until cleared (right-click building again)

**Files:** `src/ecs/components.ts` (new RallyPoint component), `src/ecs/systems/training.ts`, `src/rendering/pixi/entity-overlays.ts`

---

### US13: Add Unit Stances (Hold/Aggressive/Defensive)
**As a** player controlling army behavior,
**I want** to set unit stances,
**So that** defenders hold position and attackers pursue enemies.

**Acceptance Criteria:**
- [ ] 3 stances: Aggressive (chase enemies in vision), Defensive (fight if attacked, don't chase), Hold (don't move or fight unless ordered)
- [ ] Stance button in selection panel (cycle with S key)
- [ ] Default stance: Defensive for gatherers, Aggressive for combat units
- [ ] Stance icon visible on selected unit overlay

**Files:** `src/ecs/components.ts`, `src/ecs/systems/auto-behavior.ts`, `src/ui/selection-panel.tsx`

---

### US14: Fix Commander Balance
**As a** player choosing a commander,
**I want** all 7 commanders to be viable,
**So that** I can experiment with different strategies.

**Acceptance Criteria:**
- [ ] Sage: gather bonus reduced +15% → +10% (still best economy commander, but not mandatory)
- [ ] Shadowfang: damage reduction aura reduced -20% → -10% (still good defense, not broken)
- [ ] Stormcaller: lightning clarified — "every 15s, deals 10 damage to 3 random enemies in vision"
- [ ] Marshal: damage aura increased +10% → +15% (viable aggressive option)
- [ ] Tests for each commander passive

**Files:** `src/config/commanders.ts`, `src/ecs/systems/commander-passives.ts`

---

### TIER 3: MEDIUM PRIORITY (Quality of Life)

---

### US15: Add Toast Notifications for Actions
**As a** player executing commands,
**I want** brief feedback when I train, build, or research,
**So that** I know my click registered.

**Acceptance Criteria:**
- [ ] "Training: Brawler (15s)" toast on train
- [ ] "Researching: Eagle Eye (45s)" toast on research
- [ ] "Building: Armory" toast on placement
- [ ] Toasts auto-dismiss in 3s, stack up to 3

**Files:** new: `src/ui/hud/ActionToast.tsx`, `src/ui/store.ts`

---

### US16: Fix Color Contrast for Accessibility
**As a** player with vision differences,
**I want** text to meet WCAG AA contrast ratios,
**So that** I can read resource counts and button labels.

**Acceptance Criteria:**
- [ ] Gold text on dark backgrounds: increase to `#D4B96A` (from #C5A059) for 4.5:1 ratio
- [ ] All button text meets 4.5:1 contrast ratio
- [ ] Resource counters meet 4.5:1 ratio

**Files:** `src/ui/design-tokens.ts`, `src/styles/main.css`

---

### US17: Compress Video Assets
**As a** mobile player on slow network,
**I want** the game to load quickly,
**So that** I don't abandon it waiting for 18MB of videos.

**Acceptance Criteria:**
- [ ] splash-stream.mp4 (11MB) deleted if unused, or compressed to <3MB
- [ ] splash-16x9.mp4 compressed to <2MB (was 4.1MB)
- [ ] splash-9x16.mp4 compressed to <1.5MB (was 3.4MB)
- [ ] Old watercolor assets removed from public/assets/ui/

**Files:** public/assets/video/, public/assets/ui/

---

### US18: Split Oversized Files
**As a** developer following the 300 LOC rule,
**I want** files at the limit decomposed,
**So that** each file has a single responsibility.

**Acceptance Criteria:**
- [ ] `src/game/game-loop.ts` (300 LOC) split into game-loop-tick.ts + game-loop-phases.ts
- [ ] `src/ui/store.ts` (295 LOC) split into store-resources.ts, store-selection.ts (keep store.ts as barrel)
- [ ] `src/ecs/world.ts` (295 LOC) split into world-state.ts + world-helpers.ts
- [ ] `src/ui/hud/unit-commands.tsx` (297 LOC) split into command groups
- [ ] No file in src/ exceeds 300 LOC after changes

**Files:** 5+ files to split

---

### US19: Add Minimap Legend
**As a** player using the minimap,
**I want** to know what the colored dots represent,
**So that** I can navigate the map effectively.

**Acceptance Criteria:**
- [ ] Legend shows: Player units (blue), Enemy units (red), Resources (yellow), Buildings (green)
- [ ] Legend toggleable via minimap button
- [ ] Compact on mobile (icon-only)

**Files:** `src/ui/hud/MinimapLegend.tsx` (exists but may need updates)

---

### US20: HighGround Combat Bonus
**As a** player positioning units on high ground,
**I want** a damage bonus for elevated units,
**So that** terrain control is strategically rewarding.

**Acceptance Criteria:**
- [ ] Units on HighGround terrain deal +15% damage to units on lower terrain
- [ ] Units attacking uphill deal -10% damage
- [ ] Visual indicator on HUD when unit has elevation advantage

**Files:** `src/terrain/terrain-grid.ts`, `src/ecs/systems/combat/melee-attacks.ts`

---

### TIER 4: LOW PRIORITY (Polish)

---

### US21: Survival Mode Scoring Improvements
**Acceptance Criteria:**
- [ ] Difficulty multiplier: Easy 0.5x, Normal 1x, Hard 2x, Nightmare 3x
- [ ] Commander choice bonus: +10% for non-meta commanders
- [ ] Wave milestone bonuses: Wave 10/20/30 give 500/1000/2000 bonus

**Files:** `src/game/survival-mode.ts`

---

### US22: Weather Strategic Impact
**Acceptance Criteria:**
- [ ] Rain: -10% gather speed (workers slower in rain)
- [ ] Fog: enemy AI aggression reduced (can't see targets)
- [ ] Wind: +20px projectile drift (was +15, more impactful)
- [ ] Weather forecast shown 30s before transition

**Files:** `src/config/weather.ts`, `src/ecs/systems/weather.ts`

---

### US23: Unhandled Promise Fixes
**Acceptance Criteria:**
- [ ] All async imports in game-lifecycle.ts have .catch() handlers
- [ ] game-init.ts ripple attachment has error handling
- [ ] processGameOverRewards failure shows toast to user

**Files:** `src/game/game-lifecycle.ts`, `src/game/game-init.ts`, `src/game/game-over-sync.ts`

---

## Implementation Plan

| Order | Stories | Dependencies | Agent Batch |
|-------|---------|-------------|-------------|
| 1 | US6 (dead code), US18 (split files), US23 (promises) | None | Code cleanup |
| 2 | US1 (abilities), US2 (units), US3 (healing), US4 (techs) | None | Balance batch |
| 3 | US11 (difficulty), US14 (commanders), US20 (terrain) | US2 | Balance batch 2 |
| 4 | US5 (confirm), US7 (prerequisites), US8 (stats), US9 (rates), US10 (hotkeys) | None | UX batch |
| 5 | US15 (toasts), US16 (contrast), US19 (minimap) | US5 | UX batch 2 |
| 6 | US12 (rally), US13 (stances) | US1 | RTS features |
| 7 | US17 (video), US21 (survival), US22 (weather) | None | Polish |

## Success Criteria

| Metric | Target |
|--------|--------|
| Commander abilities working | 7/7 |
| Trap units redesigned | 3/3 (Scout, Shieldbearer, Catapult) |
| Tech tree viable paths | 5 branches, each with 2+ research-worthy techs |
| Dead code removed | 400+ LOC |
| Files over 300 LOC | 0 |
| WCAG AA contrast | All text elements |
| Video assets | <7MB total (was 18.5MB) |
| Test coverage for changes | 100% of acceptance criteria |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Balance changes create new imbalances | Ship with "Balance Preview" flag, gather player feedback |
| File splits break imports | Run typecheck after each split |
| Commander ability implementations complex | Start with simplest (Charge = speed buff) as template |
| Confirmation dialogs slow gameplay flow | "Don't ask again" toggle + only for 200+ cost |
