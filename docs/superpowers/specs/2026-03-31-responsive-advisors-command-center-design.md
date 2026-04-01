# Design Spec: Device-Aware Responsive Design, Advisor System, Command Center UI

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Three tightly coupled subsystems that together fix device responsiveness, new-player onboarding, and unit/building management UX.

---

## 1. Device Detection & Form Factor Classification

### Problem

Current `src/platform/native.ts` classifies devices by screen size alone. A OnePlus Open unfolded (2208x1840) gets treated as tablet/desktop despite being a large touch device. CSS uses a single `md:` breakpoint (768px) and one media query (portrait rotate prompt). No foldable, Chromebook, or input-mode awareness.

### Design

Replace screen-size heuristics with multi-signal device classification using Capacitor Device plugin, CSS media queries, and resize heuristics.

#### Input Signals

| Signal | Source | Purpose |
|--------|--------|---------|
| Device model/manufacturer | `@capacitor/device` `Device.getInfo()` | Known foldable/tablet model matching |
| Platform | `Capacitor.getPlatform()` | android/ios/web distinction |
| Pointer type | CSS `pointer: coarse/fine` via `matchMedia` | Touch vs mouse input |
| Hover capability | CSS `hover: hover/none` via `matchMedia` | Tooltip/hover support |
| Screen dimensions | `window.innerWidth/Height` + `devicePixelRatio` | Layout sizing |
| Resize events | `resize` + `orientationchange` | Foldable fold/unfold detection |

#### Output Signals (Preact signals, reactive)

| Signal | Type | Description |
|--------|------|-------------|
| `formFactor` | `'phone' \| 'foldable' \| 'tablet' \| 'laptop' \| 'desktop'` | Primary device classification |
| `inputMode` | `'touch' \| 'pointer'` | How the user interacts (independent of form factor) |
| `canDockPanels` | `boolean` | True when viewport is wide enough for persistent sidebar (>1100px usable width) |
| `screenClass` | `'compact' \| 'medium' \| 'large'` | Layout bucket for CSS/component decisions |
| `isCompactHeight` | `boolean` | Viewport height < 500px (landscape phones) |

#### Classification Logic

```
1. If Capacitor native (android/ios):
   a. Check Device.getInfo().model against known foldable list
      → If match AND aspect ratio ~1:1 (unfolded): formFactor = 'foldable'
      → If match AND aspect ratio narrow (folded): formFactor = 'phone'
   b. Else classify by screen: maxDim < 1100 → 'phone', else → 'tablet'

2. If web:
   a. pointer:coarse + hover:none → touch device
      - minDim < 500 → 'phone'
      - minDim < 820 → 'tablet'
      - else → 'tablet' (large touch = tablet-class)
   b. pointer:fine + hover:hover → 'laptop' (< 1600px) or 'desktop' (>= 1600px)
   c. pointer:fine + hover:none → 'laptop' (stylus/trackpad without hover)

3. Foldable resize detection:
   - Track aspect ratio across resize events
   - If aspect ratio changes by > 0.4 within 500ms → foldable fold/unfold event
   - Update formFactor accordingly

4. inputMode derived from pointer media query (live, updates if bluetooth mouse connected)

5. canDockPanels = (innerWidth > 1100) AND (formFactor !== 'phone')

6. screenClass:
   - compact: innerWidth < 768 OR isCompactHeight
   - medium: 768 <= innerWidth < 1280
   - large: innerWidth >= 1280
```

#### Known Foldable Models (initial list, extensible)

```
Samsung: SM-F946*, SM-F936*, SM-F926* (Z Fold series)
OnePlus: CPH2551, CPH2611 (Open, Open 2)
Google: G0B96, GGH4X (Pixel Fold, Pixel 9 Pro Fold)
```

#### File Structure

```
src/platform/
  native.ts      — MODIFIED: remove device classification, keep Capacitor init/haptics/prefs
  device.ts      — NEW: Device.getInfo() wrapper, model database, classification logic
  signals.ts     — NEW: reactive signals, resize listener, foldable detection
  index.ts       — MODIFIED: re-export new signals
```

All files < 200 LOC target.

---

## 2. Command Center Panel Redesign

### Problem

The hamburger slide-out panel hides critical features behind 4 tabs (Map/Actions/Commands/Menu). Auto-behaviors (6 toggles), training queues, idle unit management, and the minimap are all buried. Players never discover them. The "idle" button is a counter that cycles through units one at a time. There's no way to see all your units and their tasks, manage them centrally, or control auto-behaviors per-unit.

### Design

Redesign the command panel from 4 tabs to 4 new tabs: **Map**, **Forces**, **Buildings**, **Menu**.

#### Tab: Map (unchanged)
Minimap with click-to-pan and camera rectangle overlay. No changes.

#### Tab: Forces (replaces Actions + Commands)

A unit roster — single pane of glass for your entire force.

**Layout:**
```
+------------------------------------------+
| FORCES                          [filters] |
+------------------------------------------+
| Group: Gatherers (4)        [Auto-Gather] |
| +--------------------------------------+ |
| | Gatherer 1  [Gathering Clams   v]    | |
| | Gatherer 2  [Idle              v]    | |
| | Gatherer 3  [Gathering Twigs   v]    | |
| | Gatherer 4  [Building Armory   v]    | |
| +--------------------------------------+ |
|                                          |
| Group: Combat (3)           [Auto-Attack] |
| +--------------------------------------+ |
| | Brawler 1   [Patrolling       v]    | |
| | Brawler 2   [Idle              v]    | |
| | Slinger 1   [Attacking Gator  v]    | |
| +--------------------------------------+ |
|                                          |
| Group: Support (1)           [Auto-Heal] |
| +--------------------------------------+ |
| | Healer 1    [Healing Brawler2  v]    | |
| +--------------------------------------+ |
|                                          |
| Commander: Shellsworth                    |
| Status: Defending Lodge  HP: 85/100       |
+------------------------------------------+
```

**Behaviors:**
- Units grouped by role: Gatherers, Combat, Support, Scouts. Commander shown separately (never auto-assigned).
- Idle units sorted to top within each group, highlighted with warning color.
- Each unit row shows: unit type name, current task as inline picker pill.
- Tap task pill → dropdown with available tasks for that unit type:
  - Gatherer: Idle, Gather (nearest), Gather Clams, Gather Twigs, Build
  - Combat: Idle, Patrol, Defend Lodge, Attack (nearest enemy)
  - Healer: Idle, Heal (nearest wounded)
  - Scout: Idle, Scout (random explore)
- Group header has auto-behavior toggle for that role (replaces global toggles).
- Tap unit name → camera pans to unit on game board, unit gets selected.
- Unit health bar shown as thin colored bar under each row.

**Data flow:**
- Forces tab reads from ECS queries every sync cycle (30 frames, same as current store sync).
- Task pill changes dispatch commands to ECS (same as right-click commands but targeted).
- Auto-behavior toggles stored per-role in `world.autoBehaviors` (refactored from current flat booleans to `{ gatherer: boolean, combat: boolean, healer: boolean, scout: boolean }`).

#### Tab: Buildings (replaces part of Actions)

All player buildings with their status, queues, and capabilities.

**Layout:**
```
+------------------------------------------+
| BUILDINGS                                 |
+------------------------------------------+
| Lodge           HP: 200/200               |
|   Pop: 12/16   Upgrades: 1/3             |
|   [Research: Hardened Shells  ====--  60%]|
+------------------------------------------+
| Armory          HP: 150/150               |
|   Training: Brawler [====------  40%]     |
|   Queue: Brawler, Slinger                 |
|   [+ Train]                               |
+------------------------------------------+
| Nest #1         HP: 100/100               |
|   Training: Gatherer [========-  90%]     |
|   [+ Train]                               |
+------------------------------------------+
| Tower #1        HP: 80/80                 |
|   Range: 200    DPS: 8                    |
+------------------------------------------+
```

**Behaviors:**
- All player buildings listed, sorted by type (Lodge first, then production, then defensive).
- Training queue visible per building with progress bar.
- [+ Train] button opens inline unit picker for that building's capabilities.
- Tap building name → camera pans to building, selects it.
- Research progress shown for Lodge upgrades.
- Building HP as colored bar.

#### Tab: Menu (mostly unchanged)

Tech Tree, Save/Load, Settings, Keyboard Reference, Achievements, Leaderboard, Color Blind toggle. Same as current MenuTab.

#### Panel Docking (responsive)

| Form Factor | Panel Behavior |
|-------------|---------------|
| phone | Hamburger slide-out (current behavior), 50vw max width |
| foldable (folded) | Hamburger slide-out |
| foldable (unfolded) | Docked right sidebar, ~300px, always visible |
| tablet | Docked right sidebar if landscape + width > 1100px, else hamburger |
| laptop/desktop | Docked right sidebar, ~300px, collapsible |

When docked, the hamburger button is hidden. The game board resizes to fill remaining space. Panel has a collapse/expand toggle.

#### File Structure

```
src/ui/panel/
  CommandPanel.tsx    — MODIFIED: new tab definitions, docking logic
  ForcesTab.tsx       — NEW: unit roster view
  ForcesGroup.tsx     — NEW: unit group (Gatherers, Combat, etc.)
  ForceUnitRow.tsx    — NEW: single unit row with task picker
  TaskPicker.tsx      — NEW: inline dropdown for task assignment
  BuildingsTab.tsx    — NEW: building list view
  BuildingRow.tsx     — NEW: single building with queue/progress
  TrainPicker.tsx     — NEW: inline unit picker for training
  MapTab.tsx          — UNCHANGED
  MenuTab.tsx         — UNCHANGED
  ActionsTab.tsx      — DELETED (replaced by Forces + Buildings)
  CommandsTab.tsx     — DELETED (replaced by Forces)
```

All files < 200 LOC target. Force decomposition if approaching 250.

#### Store Changes

```
src/ui/store.ts — MODIFIED:
  - New signals: unitRoster (grouped unit data), buildingRoster (building data)
  - PanelTab type: 'map' | 'forces' | 'buildings' | 'menu'
  - Remove: idleWorkerCount, idleGathererCount, etc. (subsumed by unitRoster)
  - Keep: selectionCount, autoXxxEnabled (refactored to per-role)

src/ecs/world.ts — MODIFIED:
  - autoBehaviors refactored: { gatherer: boolean, combat: boolean, healer: boolean, scout: boolean }
  - Add: buildingRoster sync data structure
```

#### ECS System Changes

```
src/ecs/systems/auto-behavior.ts — MODIFIED:
  - Read per-role toggles instead of flat booleans
  - Per-unit task override support (new component: TaskOverride)

src/ecs/components.ts — MODIFIED:
  - Add TaskOverride component: { task: number, targetEntity: number }
  - Units with TaskOverride skip auto-behavior assignment

src/game/sync-store.ts — MODIFIED (or new file split from game.ts):
  - Sync unitRoster and buildingRoster signals every 30 frames
  - Group units by role, include current state and target info
```

---

## 3. Advisor System

### Problem

Current tutorial is 6 hardcoded floating texts at timed frames above the Commander. No interactivity, no skip, no state-awareness, disappears whether player understood or not. Commander is a gameplay unit (unlockable, with abilities), not appropriate as narrator.

### Design

Civ-style advisor system with 3 role-based advisor personas, triggered by game state pressure scores, toggleable from main menu settings.

#### Advisors

| Advisor | Domain | Persona |
|---------|--------|---------|
| **Economy Advisor** | Gathering, resources, food cap, idle workers | "Elder Whiskers" — wise old otter, focuses on prosperity |
| **War Advisor** | Combat, defense, army composition, threats | "Captain Claw" — grizzled veteran, focuses on survival |
| **Builder Advisor** | Construction, tech, buildings, queues | "Architect Pebble" — enthusiastic builder, focuses on growth |

Persona names/flavor are placeholders — the system architecture is what matters.

#### Trigger System

Advisors fire based on **pressure scores** from existing game state, NOT timed frames. Each advisor has a set of **tips** with conditions.

```typescript
interface AdvisorTip {
  id: string;                          // Unique, for tracking shown/dismissed
  advisor: 'economy' | 'war' | 'builder';
  condition: (world: GameWorld) => boolean;  // When to show
  cooldown: number;                    // Min frames between re-showing same tip
  priority: number;                    // Higher = more urgent, shown first
  message: string;                     // The advice text
  action?: string;                     // Optional: reference to UI element or action
  oncePerGame?: boolean;               // Only show once (for introductory tips)
}
```

**Example tips:**

```
Economy:
- "You have idle gatherers. Open Forces and assign them to clam beds."
  condition: idleGathererCount > 0 AND frameCount > 300
  priority: 80, cooldown: 1800

- "Clam deposits are running low. Send scouts to find new ones."
  condition: totalClamRemaining < 200
  priority: 60, cooldown: 3600

- "You're at population cap. Build another Lodge for +8 food."
  condition: population >= popCap
  priority: 100, cooldown: 1200

War:
- "Enemies spotted! Train some Brawlers at the Armory."
  condition: visibleEnemyCount > 0 AND playerCombatUnitCount < 3
  priority: 90, cooldown: 2400

- "Your Lodge is under attack! Rally defenders!"
  condition: lodgeUnderAttack
  priority: 120, cooldown: 600

- "Build an Armory to unlock combat units."
  condition: frameCount > 1200 AND armoryCount === 0
  priority: 70, cooldown: 3600, oncePerGame: true

Builder:
- "Research techs at the Lodge to unlock new capabilities."
  condition: availableResearchCount > 0 AND totalResearchDone === 0
  priority: 50, cooldown: 3600, oncePerGame: true

- "Your training queue is empty. Keep producing units."
  condition: totalQueuedUnits === 0 AND canAffordAnyUnit
  priority: 40, cooldown: 2400

- "Open the Forces tab to manage auto-behaviors for your army."
  condition: playerCombatUnitCount >= 3 AND neverOpenedForcesTab
  priority: 60, oncePerGame: true
```

#### Presentation

**HUD toast** in bottom-left corner of game screen (doesn't overlap minimap or command panel).

```
+--------------------------------------------+
| [Advisor Icon]  Elder Whiskers              |
| "You have 3 idle gatherers. Open Forces    |
|  and assign them to resources."             |
|                              [Got it]  [!]  |
+--------------------------------------------+
```

- Small advisor portrait/icon (colored circle with initial as MVP).
- Message text with advisor name.
- "Got it" dismisses this tip (marks as shown, respects cooldown).
- [!] button = "Don't show this again" (permanently dismisses this specific tip).
- Auto-fades after 15 seconds if not interacted with (tip goes to cooldown, not permanently dismissed).
- Max 1 toast visible at a time. Queue by priority.
- Toast has safe-area padding on all form factors.

#### Settings

In main menu Settings modal (pre-game) AND in-game Settings overlay:

```
Advisors
  [x] Economy Advisor (Elder Whiskers)
  [x] War Advisor (Captain Claw)
  [x] Builder Advisor (Architect Pebble)
  [ ] Disable All Advisors
```

Each advisor independently toggleable. "Disable All" is a master switch. Persisted via Capacitor Preferences. Default: all enabled.

#### State Tracking

```typescript
// In GameWorld or separate advisor state
interface AdvisorState {
  enabled: { economy: boolean; war: boolean; builder: boolean };
  shownTips: Map<string, number>;       // tipId → last shown frame
  dismissedTips: Set<string>;           // permanently dismissed
  currentTip: AdvisorTip | null;        // currently displayed
  tipQueue: AdvisorTip[];               // pending display
}
```

Persisted across saves via `save-system.ts`. `dismissedTips` persisted globally via Preferences (not per-save — if you dismiss "build an armory" tip, it stays dismissed).

#### File Structure

```
src/advisors/
  types.ts           — NEW: AdvisorTip interface, AdvisorState, advisor enum
  tips.ts            — NEW: all tip definitions (economy, war, builder arrays)
  advisor-system.ts  — NEW: ECS system that evaluates conditions, manages queue
  advisor-state.ts   — NEW: state management, persistence, settings integration

src/ui/hud/
  AdvisorToast.tsx   — NEW: HUD toast component

src/ui/overlays/
  SettingsOverlay.tsx — MODIFIED: add advisor toggles section

src/config/
  advisor-config.ts  — NEW: advisor personas (names, colors, icons)
```

All files < 200 LOC target.

#### Replaces

- `src/ecs/systems/tutorial.ts` — DELETED entirely
- `world.tutorialStep`, `world.tutorialShownSteps`, `world.isFirstGame` tutorial usage — removed
- Tutorial references in `game.ts` — replaced with advisor system call

---

## 4. Responsive Layout Integration

### How the Three Systems Connect

```
Device Detection (signals.ts)
  ├── formFactor, inputMode, canDockPanels, screenClass
  │
  ├──► Command Center Panel (CommandPanel.tsx)
  │     ├── canDockPanels → docked sidebar vs hamburger slide-out
  │     ├── screenClass → panel width, content density
  │     ├── inputMode → touch target sizes (44px touch, 32px pointer)
  │     ├── Forces tab → unit roster, task pickers
  │     └── Buildings tab → building list, queue management
  │
  ├──► Advisor Toast (AdvisorToast.tsx)
  │     ├── screenClass → toast position, size
  │     ├── canDockPanels → toast avoids docked panel area
  │     └── inputMode → dismiss button sizing
  │
  ├──► Game Board (game.ts resize)
  │     ├── canDockPanels → reduce game board width when panel docked
  │     ├── formFactor → zoom defaults per device
  │     └── DPR capping stays (max 2x)
  │
  ├──► Tech Tree (tech-tree-panel.tsx)
  │     ├── screenClass → card grid vs SVG graph threshold
  │     ├── formFactor → foldable gets SVG graph (large touch screen)
  │     └── inputMode → node tap targets
  │
  ├──► Top Bar (top-bar.tsx)
  │     ├── screenClass → compact vs full height
  │     ├── canDockPanels → hide hamburger button when docked
  │     └── inputMode → padding, text sizes
  │
  └──► All Modals/Overlays
        ├── screenClass → max-height, padding
        └── inputMode → button sizes, scroll behavior
```

### CSS Strategy

- **Remove** the single `md:` Tailwind breakpoint approach for layout decisions.
- **Keep** `md:` for minor text/padding adjustments where appropriate.
- **Use signals** for all structural layout decisions (dock vs hamburger, grid vs list, SVG vs cards).
- **Add CSS custom properties** set from signals for things CSS needs to know:
  ```css
  :root {
    --pw-touch-target: 44px;   /* or 32px for pointer mode */
    --pw-panel-width: 300px;   /* or 0px when hamburger */
    --pw-screen-class: large;  /* compact | medium | large */
  }
  ```
- **Safe area insets**: already implemented, keep as-is.
- **dvh units**: already implemented for modals, keep as-is.

### Touch Target Standards

| Input Mode | Min Target | Recommended |
|------------|-----------|-------------|
| touch | 44x44px | 48x48px for primary actions |
| pointer | 32x32px | 36x36px for primary actions |

Applied via `inputMode` signal → CSS custom property → used in component styles.

---

## 5. Testing Strategy

Every subsystem gets unit tests AND Vitest browser integration tests.

### Unit Tests (Vitest, jsdom)

```
tests/platform/
  device.test.ts         — Form factor classification with mocked Device.getInfo()
  signals.test.ts        — Signal reactivity on resize events

tests/advisors/
  advisor-system.test.ts — Tip condition evaluation, queue priority, cooldown
  advisor-state.test.ts  — Persistence, dismiss, settings toggles

tests/ui/
  ForcesTab.test.tsx     — Unit roster rendering, grouping, idle sorting
  ForceUnitRow.test.tsx  — Task picker interaction
  BuildingsTab.test.tsx  — Building list, queue display
  BuildingRow.test.tsx   — Training progress, train picker
  AdvisorToast.test.tsx  — Toast display, dismiss, auto-fade
```

### Integration Tests (Vitest browser mode)

```
tests/browser/
  device-detection.test.tsx    — Resize simulation → signal changes → layout reflow
  command-panel-dock.test.tsx  — Panel docking/undocking on viewport change
  forces-tab-flow.test.tsx     — Open forces, see units, change task, verify ECS state
  buildings-tab-flow.test.tsx  — Open buildings, see queues, train unit, verify queue
  advisor-flow.test.tsx        — Start game → advisor fires → dismiss → cooldown respected
  advisor-settings.test.tsx    — Toggle advisors in settings → verify no tips appear
  responsive-tech-tree.test.tsx — Tech tree renders correctly per form factor
  foldable-resize.test.tsx     — Simulate fold/unfold → layout transitions
```

### Gameplay Integration Tests

```
tests/gameplay/
  auto-behavior-per-unit.test.ts — Per-unit task override prevents auto-assignment
  forces-game-sync.test.ts       — Unit roster stays in sync with ECS state
  advisor-pressure.test.ts       — Pressure conditions trigger correct advisor tips
```

---

## 6. Migration & Backwards Compatibility

### Removed
- `src/ecs/systems/tutorial.ts` — deleted
- `src/ui/panel/ActionsTab.tsx` — deleted
- `src/ui/panel/CommandsTab.tsx` — deleted
- `world.tutorialStep`, `world.tutorialShownSteps` — removed from GameWorld
- `world.isFirstGame` tutorial usage — advisor system handles first-game detection differently (via `dismissedTips` being empty)
- Global auto-behavior booleans in store — refactored to per-role

### Preserved
- `world.autoBehaviors` — refactored shape but same concept
- All existing save game data — migration in save-system.ts maps old auto-behavior booleans to new per-role structure
- Commander exclusion from auto-behaviors — preserved in new system
- Radial menu — updated to reference new auto-behavior structure
- All keyboard shortcuts — unchanged
- Minimap — unchanged (MapTab stays)

### Save Migration

```typescript
// In save-system.ts load path:
if (saveData.autoBehaviors && typeof saveData.autoBehaviors.gather === 'boolean') {
  // Old format: { gather, defend, attack, heal, scout, build }
  // New format: { gatherer, combat, healer, scout }
  world.autoBehaviors = {
    gatherer: saveData.autoBehaviors.gather || saveData.autoBehaviors.build,
    combat: saveData.autoBehaviors.attack || saveData.autoBehaviors.defend,
    healer: saveData.autoBehaviors.heal,
    scout: saveData.autoBehaviors.scout,
  };
}
```
