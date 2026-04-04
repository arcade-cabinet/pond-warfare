# PRD: Pond Warfare v3.0 — Complete Rearchitecture

## Overview

Total rearchitecture from multi-mode 4X-hybrid to single-mode mobile-first RTS with prestige loop. Every piece of game content moves from hardcoded TypeScript to JSON configs. In-match complexity collapses to tap-driven unit control. Between-match depth expands via procedural upgrade web and prestige system.

Source spec: `docs/superpowers/specs/2026-04-03-v3-architecture-design.md`

---

## User Stories

### PHASE 1: JSON CONFIG SYSTEM (Foundation)

#### US1: Config Schema + Loader
**As a** developer adding game content,
**I want** all entity/event/upgrade definitions in JSON with schema validation,
**So that** content changes never require TypeScript modifications.

**Acceptance Criteria:**
- [ ] `configs/` directory with 9 JSON files: units.json, enemies.json, events.json, upgrades.json, prestige.json, lodge.json, terrain.json, fortifications.json, rewards.json
- [ ] TypeScript config loader that reads, validates, and exposes typed configs
- [ ] JSON schema validation on load (errors surface clearly)
- [ ] All existing unit defs (player + enemy) migrated from TS to units.json/enemies.json
- [ ] All building defs migrated to lodge.json + fortifications.json
- [ ] All commander defs migrated to units.json (commanders section)
- [ ] All weather defs migrated to terrain.json
- [ ] ECS archetypes read from config loader, not hardcoded imports
- [ ] Tests: config loader validates schema, rejects malformed JSON, all entities spawn correctly from JSON

#### US2: Event Template Config
**As a** designer creating match variety,
**I want** all events (waves, bosses, escorts, storms, sieges, sabotage, swarms, resource surges) in events.json,
**So that** adding new events is a JSON edit.

**Acceptance Criteria:**
- [ ] events.json with all event templates including: type, min/max progression level, enemy composition, reward formula, duration, direction(s), description
- [ ] Migrate existing 8 random event types to JSON
- [ ] Migrate campaign mission objectives into event templates (siege defense, escort, boss fight, survival hold)
- [ ] Migrate puzzle objectives into event templates (economy rush, sniper challenge, no-build)
- [ ] Event selector reads from config, filters by progression level, selects via PRNG
- [ ] Tests: event loading, PRNG selection, progression filtering

#### US3: Upgrade Web Config
**As a** designer balancing progression,
**I want** the entire upgrade web defined in upgrades.json with procedural generation formulas,
**So that** 240+ upgrades emerge from ~24 path definitions + diamond node connections.

**Acceptance Criteria:**
- [ ] upgrades.json defines: categories (6), subcategories (~4 each), base_effect, scaling_formula, cost_formula, tier_prefixes (10)
- [ ] Diamond nodes defined with multi-path requirements and unlock effects
- [ ] Procedural name generator: "{prefix} {subcategory_name}" — e.g., "Super Clam Gathering"
- [ ] Cost formula: `base_cost * 2^tier` (logarithmic scaling)
- [ ] Effect formula: `base_effect * (tier + 1)` (linear stat scaling)
- [ ] Lodge wing unlocks as diamond nodes (Gathering T5 → Dock Wing, etc.)
- [ ] Unit specialist unlocks as diamond nodes
- [ ] Config loader generates full upgrade catalog at startup
- [ ] Tests: procedural generation produces correct count, costs scale, diamond nodes resolve

#### US4: Prestige Config
**As a** designer tuning the meta-loop,
**I want** prestige tiers, Pearl costs, auto-deploy counts, and auto-behavior unlocks in prestige.json,
**So that** prestige balance is data-driven.

**Acceptance Criteria:**
- [ ] prestige.json defines: all Pearl upgrades (auto-deploy per unit type, auto-behaviors, multipliers), costs, max ranks
- [ ] Pearl calculation formula: `floor(progression_level * rank_multiplier)`
- [ ] Auto-deploy specs: unit type, count per rank, max rank
- [ ] Auto-behavior specs: behavior type, prestige rank required
- [ ] Tests: Pearl calculation, auto-deploy counts at each rank

---

### PHASE 2: MAP & LODGE REWORK

#### US5: Vertical Map with Lodge at Bottom
**As a** player on a phone,
**I want** a compact vertical map where I can see my Lodge and the battlefield,
**So that** I spend time playing, not scrolling.

**Acceptance Criteria:**
- [ ] Map renders vertically: ~1 screen wide, 2-3 screens tall
- [ ] Lodge entity fixed at bottom center of map
- [ ] Camera starts centered on Lodge
- [ ] Resource nodes spawn in middle zone between Lodge and enemy spawn
- [ ] Enemy spawn points at top of map
- [ ] Map size scales with progression_level from SQLite (small at level 0, larger at level 50+)
- [ ] Terrain generation reads from terrain.json for per-level params
- [ ] Tests: map dimensions correct per progression level, Lodge at bottom, resources in middle

#### US6: Lodge Visual Evolution
**As a** player who has invested in upgrades,
**I want** my Lodge to visually grow wings and features,
**So that** I can SEE my progression.

**Acceptance Criteria:**
- [ ] Lodge rendering reads current upgrade state + prestige rank
- [ ] Wings render based on lodge.json definitions (Dock wing, Barracks wing, Watchtower, Healing Pool, etc.)
- [ ] Each wing has a visual sprite/graphic that attaches to the Lodge
- [ ] Prestige rank adds border/glow effect to Lodge
- [ ] Lodge HP bar visible (always)
- [ ] Tap Lodge → radial menu appears
- [ ] Tests: Lodge renders correct wings based on upgrade state

#### US7: Fortification Slot System
**As a** player defending my Lodge,
**I want** to place walls and towers in pre-defined slots around my Lodge,
**So that** defense feels strategic but not overwhelming.

**Acceptance Criteria:**
- [ ] Fort slots radiate outward from Lodge in layers (inner ring, outer ring)
- [ ] Slot positions defined in lodge.json per progression level
- [ ] Tap empty slot → spend Rocks → wall or tower appears
- [ ] Wall: blocks enemy movement, has HP, can be destroyed by sappers
- [ ] Tower: ranged attack on nearby enemies, has HP
- [ ] Fortification types and stats from fortifications.json
- [ ] Slots unlock as map size grows with progression
- [ ] Tests: slot placement, Rock cost deduction, fortification HP

---

### PHASE 3: SIMPLIFIED UNITS & CONTROLS

#### US8: Four Manual Generalist Units
**As a** new player,
**I want** four simple unit types that each have one clear job,
**So that** I understand my army immediately.

**Acceptance Criteria:**
- [ ] Gatherer: collects any resource you send them to. Tap resource node → gatherer goes, collects, returns to Lodge.
- [ ] Fighter: attacks what you target. Tap enemy → fighter engages.
- [ ] Medic: heals who you send them to. Tap wounded ally → medic heals.
- [ ] Scout: reveals fog where you send them. Tap fog → scout explores.
- [ ] All stats from units.json
- [ ] Training from Lodge radial menu: costs Fish
- [ ] Each unit has clear visual identity (use existing SVG sprite system as base)
- [ ] Tests: unit creation from config, movement to target, role behavior

#### US9: Radial Action Menu
**As a** mobile player,
**I want** contextual radial menus when I tap units or the Lodge,
**So that** every action is one tap away with no panels or sidebars.

**Acceptance Criteria:**
- [ ] Tap Lodge → radial: Train Gatherer, Train Fighter, Train Medic, Train Scout, Fortify, Repair
- [ ] Tap selected unit → radial: role-specific actions (Gather/Attack/Heal/Scout/Hold/Patrol)
- [ ] Radial uses design tokens (vine frame, gritty gold icons, wood background)
- [ ] Radial auto-dismisses after 3s if no selection
- [ ] Radial has 44px min touch targets per option
- [ ] Available options filter based on context (no "Heal" for a Fighter)
- [ ] Options disable when resources insufficient (greyed out)
- [ ] Tests: radial renders correct options per unit type, Lodge radial shows all training options

#### US10: Tap-to-Command Flow
**As a** player directing units,
**I want** to tap terrain/enemies/resources to issue commands,
**So that** controlling the battlefield is intuitive.

**Acceptance Criteria:**
- [ ] Tap unit → unit selected (highlight)
- [ ] Tap terrain → selected unit moves there
- [ ] Tap resource node → selected gatherer goes to gather
- [ ] Tap enemy → selected fighter attacks
- [ ] Tap wounded ally → selected medic heals
- [ ] Tap fog → selected scout explores
- [ ] Tap nothing / tap same unit → deselect
- [ ] Multi-select: drag box on multiple units → all selected
- [ ] Deselected unit continues last action automatically
- [ ] Tests: command dispatch for each unit type and target combo

#### US11: Prestige Specialist Units
**As a** prestige player,
**I want** specialist units that auto-perform specific tasks,
**So that** I can focus on strategy instead of micromanagement.

**Acceptance Criteria:**
- [ ] 12 specialists defined in units.json: Fisher, Digger, Logger, Guardian, Hunter, Ranger, Shaman, Lookout, Sapper, Saboteur + Auto-Battlements behavior + Auto-Siege behavior
- [ ] Specialists auto-deploy at match start based on Pearl upgrades (auto_deploy_fisher rank N → N fishers spawn)
- [ ] Each specialist has ONE hardcoded auto-behavior (Fisher always goes to nearest water node)
- [ ] Specialists cannot be manually redirected (they do their thing)
- [ ] Manual generalists are always better stat-wise (flexibility premium)
- [ ] Tests: specialist auto-deploy count matches prestige rank, auto-behavior executes correctly

---

### PHASE 4: UPGRADE WEB UI

#### US12: Upgrade Web Screen
**As a** player between matches,
**I want** a visual upgrade web where I can spend Clams,
**So that** I can see all paths, diamond nodes, and plan my build.

**Acceptance Criteria:**
- [ ] Full-screen upgrade web (replaces old tech tree modal)
- [ ] Categories rendered as radial branches from center
- [ ] Each subcategory is a path of nodes extending outward
- [ ] Nodes show: name, tier prefix, cost, effect, locked/unlocked/purchased state
- [ ] Diamond nodes visually distinct (gold border, connecting lines from prerequisites)
- [ ] Tap node → purchase if affordable → node lights up
- [ ] Lodge preview updates as wings unlock
- [ ] Procedural names displayed: "Super Fish Gathering (+15%)"
- [ ] Total Clams available shown at top
- [ ] Styled with design tokens (vine frame, gritty gold, wood background)
- [ ] Tests: web renders correct node count, purchase updates state, diamond nodes unlock when prereqs met

#### US13: Rewards Screen
**As a** player who just finished a match,
**I want** to see what I earned and why,
**So that** I feel rewarded and understand the progression.

**Acceptance Criteria:**
- [ ] Post-match screen shows: match result (win/lose), duration, kills, resources gathered, events completed
- [ ] Clam reward breakdown: base + kill bonus + event bonus + prestige multiplier
- [ ] "RANK UP" button pulses when prestige threshold reached
- [ ] Buttons: "Upgrade" (goes to upgrade web), "Play Again" (starts new match)
- [ ] Styled with Frame9Slice design system
- [ ] Tests: reward calculation matches formula, rank up threshold detection

---

### PHASE 5: PRESTIGE SYSTEM

#### US14: Rank Up Flow
**As a** player whose progression has slowed,
**I want** to prestige for Pearls and start fresh with multipliers,
**So that** the game stays engaging long-term.

**Acceptance Criteria:**
- [ ] "RANK UP" button appears on rewards screen when progression_level > threshold
- [ ] Tap Rank Up → modal shows: Pearls to earn, what resets, what persists
- [ ] Confirm → rank increments, Pearls added, Clam upgrades reset, current_run table cleared
- [ ] New match starts with increased difficulty baseline + all Pearl upgrades active
- [ ] Tests: prestige resets correct state, Pearls calculated correctly, rank persists

#### US15: Pearl Upgrade Screen
**As a** prestige player,
**I want** to spend Pearls on permanent power,
**So that** each prestige feels impactful.

**Acceptance Criteria:**
- [ ] Pearl upgrade screen accessible from main menu (pre-match)
- [ ] Shows all Pearl upgrades from prestige.json with current rank and cost
- [ ] Auto-deploy upgrades: slider showing N units auto-spawned
- [ ] Auto-behavior upgrades: toggle showing unlocked automations
- [ ] Multiplier upgrades: percentage bars showing current boost
- [ ] Styled with design tokens
- [ ] Tests: Pearl spending deducts correctly, auto-deploy count updates

---

### PHASE 6: EVENTS & ENEMIES

#### US16: Event-Driven Match Flow
**As a** player in a match,
**I want** random events to keep every game feeling different,
**So that** I want to play "just one more."

**Acceptance Criteria:**
- [ ] Event system reads from events.json
- [ ] Events fire based on PRNG seed + time elapsed + progression level
- [ ] Events appear as on-screen alerts with direction indicator (no modals)
- [ ] Multiple events can overlap (boss + storm)
- [ ] Event pool expands with progression level (new players see simple waves only)
- [ ] Wave patterns: early = top only, mid prestige = top + sides, late = all directions
- [ ] Tests: event selection respects progression filter, PRNG produces deterministic sequence

#### US17: Enemy Counterparts
**As a** player,
**I want** enemies that mirror my capabilities,
**So that** combat feels like a fair fight, not target practice.

**Acceptance Criteria:**
- [ ] Enemy types from enemies.json: Raiders, Fighters, Healers, Scouts, Sappers, Saboteurs
- [ ] Raiders target resource nodes (counter: defend your gatherers)
- [ ] Enemy Healers restore wounded enemies (counter: focus-fire healers first)
- [ ] Enemy Scouts detect your army (counter: ambush them)
- [ ] Enemy Sappers breach your walls (counter: garrison defenders)
- [ ] Enemy Saboteurs corrupt resource nodes (counter: patrol with scouts)
- [ ] Enemy stat scaling from config: base stats * progression_level multiplier
- [ ] Tests: each enemy type executes its behavior correctly

---

### PHASE 7: CUT EXISTING SYSTEMS

#### US18: Remove Deprecated Systems
**As a** developer maintaining a clean codebase,
**I want** all deprecated systems removed,
**So that** the codebase matches the v3.0 architecture.

**Acceptance Criteria:**
- [ ] Delete: src/advisors/ (entire directory)
- [ ] Delete: src/campaign/ (entire directory — content migrated to events.json)
- [ ] Delete: src/config/tech-tree.ts (replaced by upgrade web)
- [ ] Delete: src/config/puzzles*.ts (content migrated to events.json)
- [ ] Delete: src/config/unlocks.ts (replaced by upgrade web diamond nodes)
- [ ] Delete: src/ui/tech-tree-panel.tsx + src/ui/tech-tree/ (replaced by upgrade web)
- [ ] Delete: src/ui/campaign-panel.tsx, campaign-briefing.tsx, campaign-choice.tsx
- [ ] Delete: src/ui/screens/PuzzleSelect.tsx, PuzzleComplete.tsx
- [ ] Delete: src/ui/new-game-modal.tsx (replaced by one-button PLAY)
- [ ] Delete: src/ui/settings-panel.tsx advisor section
- [ ] Delete: src/ecs/systems/auto-behavior.ts (replaced by prestige auto-deploy)
- [ ] Remove: Command panel sidebar (src/ui/panel/CommandPanel.tsx and all tabs)
- [ ] Remove: Accordion UI components used only by deleted panels
- [ ] Remove: Difficulty selection system (src/game/difficulty.ts presets)
- [ ] Remove: Survival mode (src/game/survival-mode.ts — every match IS survival)
- [ ] Update app.tsx: single route — menu (PLAY button + upgrade web) or in-match
- [ ] Update store.ts: remove signals for deleted features
- [ ] All tests updated to reflect removed systems
- [ ] Zero dead imports remaining
- [ ] typecheck passes, tests pass, lint passes

#### US19: Simplified Main Menu
**As a** player launching the game,
**I want** one button to start playing,
**So that** I'm in a match in under 2 seconds.

**Acceptance Criteria:**
- [ ] Main menu shows: Lodge preview (visual representation of your progression), "PLAY" button, "UPGRADES" button, "PRESTIGE" button (if available), stats summary
- [ ] Tap PLAY → match starts immediately (no modals, no options)
- [ ] Tap UPGRADES → upgrade web screen
- [ ] Tap PRESTIGE → Pearl upgrade screen (only visible after first prestige)
- [ ] Lodge preview shows current wings, prestige glow, commander
- [ ] Commander selection: tap commander portrait on Lodge preview to cycle
- [ ] Minimal HUD: rank badge, Clams available, Pearls available
- [ ] SwampEcosystem canvas background
- [ ] Styled with design tokens
- [ ] Tests: PLAY starts match, UPGRADES opens web, menu renders Lodge preview

---

### PHASE 8: TESTING & POLISH

#### US20: E2E Playtest Suite
**As a** developer shipping quality,
**I want** browser E2E tests that simulate real player click-through,
**So that** every feature works from the player's perspective.

**Acceptance Criteria:**
- [ ] E2E: Launch → tap PLAY → match starts → Lodge visible → can train Gatherer
- [ ] E2E: Train Gatherer → tap resource → Gatherer moves and collects → returns to Lodge
- [ ] E2E: Train Fighter → tap enemy → Fighter engages and deals damage
- [ ] E2E: Train Medic → tap wounded unit → Medic heals
- [ ] E2E: Tap Lodge → Fortify → wall appears in slot (Rocks deducted)
- [ ] E2E: Win match → rewards screen → Clams earned → tap Upgrades → web visible
- [ ] E2E: Purchase upgrade → node state changes → effect applied in next match
- [ ] E2E: Prestige → rank increases → Clam upgrades reset → Pearl upgrades persist
- [ ] E2E: Event fires during match → on-screen alert → enemies spawn from indicated direction
- [ ] E2E: Mobile viewport (375px) → all buttons 44px+ → no scrolling needed for core actions
- [ ] All E2E tests use click/tap actions, NOT keyboard shortcuts
- [ ] Tests use Chrome DevTools MCP for screenshots at each step

#### US21: Config Validation Tests
**As a** content designer editing JSON,
**I want** tests that catch malformed configs before they hit the game,
**So that** bad data never crashes the engine.

**Acceptance Criteria:**
- [ ] Schema validation for each JSON config file
- [ ] Tests: missing required fields → clear error message
- [ ] Tests: invalid value types → clear error message
- [ ] Tests: broken references (diamond node points to nonexistent category) → clear error
- [ ] Tests: cost formula produces non-negative values at all tiers
- [ ] Tests: all unit/enemy stats are positive numbers

---

## Implementation Order

| Wave | Stories | Dependencies | Parallel? |
|------|---------|-------------|-----------|
| 1 | US1 (configs), US18 (cut systems) | None | Yes — independent |
| 2 | US2 (events), US3 (upgrades), US4 (prestige) | US1 | Yes — all read configs |
| 3 | US5 (map), US8 (units), US9 (radial) | US1 | Yes — independent systems |
| 4 | US6 (Lodge visual), US7 (forts), US10 (commands) | US5, US8 | Yes |
| 5 | US11 (specialists), US12 (upgrade UI), US13 (rewards) | US3, US4, US8 | Yes |
| 6 | US14 (prestige flow), US15 (Pearl UI), US16 (events), US17 (enemies) | US4, US2, US11 | Yes |
| 7 | US19 (menu), US20 (E2E), US21 (validation) | All above | Yes |

## Success Criteria

| Metric | Target |
|--------|--------|
| Tap PLAY to in-match | < 2 seconds |
| JSON config files | 9 files, zero hardcoded content |
| In-match UI elements | Resource bar + Lodge radial only |
| Unit types at start | 4 manual generalists |
| Unit types at max prestige | 16 (4 generalist + 12 specialist) |
| Procedural upgrades | 240+ from formulas |
| Diamond nodes | 30-50 |
| Deleted TS files | 30+ (campaigns, puzzles, tech tree, advisors, panels) |
| E2E tests | 10+ full gameplay loop tests |
| Config validation tests | Schema coverage for all 9 JSON files |
| Match length range | 5-25 minutes (no timer, natural conclusion) |
| Prestige ranks | Infinite (logarithmic scaling) |
