# Implementation Plan: Responsive + Advisors + Command Center

**Design spec:** `2026-03-31-responsive-advisors-command-center-design.md`
**Branch:** `feat/responsive-advisors-command-center`

---

## Phase 1: Device Detection Foundation

### Step 1.1: Create `src/platform/device.ts`
- Capacitor Device plugin wrapper with `getDeviceInfo()` async function
- Known foldable model database (Samsung Fold, OnePlus Open, Pixel Fold)
- `classifyFormFactor()` pure function: inputs → form factor string
- Unit tests: `tests/platform/device.test.ts`
- **< 150 LOC**

### Step 1.2: Create `src/platform/signals.ts`
- Reactive Preact signals: `formFactor`, `inputMode`, `canDockPanels`, `screenClass`, `isCompactHeight`
- CSS media query listeners for `pointer` and `hover`
- Foldable detection via aspect ratio change on resize (debounced)
- `updateDeviceClass()` replacement that uses `classifyFormFactor()`
- CSS custom property sync (`--pw-touch-target`, `--pw-panel-width`)
- Unit tests: `tests/platform/signals.test.ts`
- **< 200 LOC**

### Step 1.3: Refactor `src/platform/native.ts` and `src/platform/index.ts`
- Remove device classification from `native.ts` (keep Capacitor init, haptics, prefs)
- Update `index.ts` re-exports to use new signal names
- Update all imports across codebase (`isMobile` → `screenClass`, `isTablet` → `formFactor`, etc.)
- **native.ts < 100 LOC after trim**

### Step 1.4: Update all consuming components
- `src/ui/hud/top-bar.tsx` — use `screenClass` and `canDockPanels`
- `src/ui/main-menu.tsx` — use `screenClass` instead of `compact` boolean
- `src/ui/selection-panel.tsx` — use `screenClass`
- `src/ui/minimap-panel.tsx` — use `screenClass`
- `src/ui/tech-tree-panel.tsx` — use `formFactor`/`screenClass` for SVG vs card grid
- `src/ui/hud/unit-commands.tsx` — use `inputMode` for target sizes
- Integration test: `tests/browser/device-detection.test.tsx`

---

## Phase 2: Command Center Panel

### Step 2.1: ECS changes for unit roster data
- Add `TaskOverride` component to `src/ecs/components.ts`
- Refactor `world.autoBehaviors` shape in `src/ecs/world.ts`: flat booleans → per-role object
- Update `src/ecs/systems/auto-behavior.ts` to read new shape + respect TaskOverride
- Update radial menu references to new auto-behavior shape
- Unit tests: `tests/ecs/systems/auto-behavior.test.ts` (update existing)
- **Each file stays < 250 LOC**

### Step 2.2: Store signals for Forces and Buildings
- Add `unitRoster` signal to `src/ui/store.ts` (grouped unit data with current task)
- Add `buildingRoster` signal (building list with queue data)
- Sync logic in game sync cycle (new file `src/game/roster-sync.ts` if game.ts sync is too large)
- Update `PanelTab` type: `'map' | 'forces' | 'buildings' | 'menu'`
- Unit tests for sync logic
- **store.ts stays < 300 LOC, roster-sync.ts < 150 LOC**

### Step 2.3: Forces tab components
- `src/ui/panel/ForcesTab.tsx` — main roster view, group headers, filters (< 150 LOC)
- `src/ui/panel/ForcesGroup.tsx` — collapsible group with auto-toggle (< 100 LOC)
- `src/ui/panel/ForceUnitRow.tsx` — unit row with health bar and task pill (< 100 LOC)
- `src/ui/panel/TaskPicker.tsx` — inline dropdown for task assignment (< 120 LOC)
- Unit tests: `tests/ui/ForcesTab.test.tsx`, `tests/ui/ForceUnitRow.test.tsx`
- Browser test: `tests/browser/forces-tab-flow.test.tsx`

### Step 2.4: Buildings tab components
- `src/ui/panel/BuildingsTab.tsx` — building list view (< 150 LOC)
- `src/ui/panel/BuildingRow.tsx` — building with queue progress (< 120 LOC)
- `src/ui/panel/TrainPicker.tsx` — inline unit/research picker (< 120 LOC)
- Unit tests: `tests/ui/BuildingsTab.test.tsx`, `tests/ui/BuildingRow.test.tsx`
- Browser test: `tests/browser/buildings-tab-flow.test.tsx`

### Step 2.5: Update CommandPanel and delete old tabs
- Modify `src/ui/panel/CommandPanel.tsx` — new tab definitions, docking logic via `canDockPanels`
- Delete `src/ui/panel/ActionsTab.tsx`
- Delete `src/ui/panel/CommandsTab.tsx`
- Update `src/ui/components/HamburgerButton.tsx` — hide when `canDockPanels` is true
- Update `src/ui/app.tsx` — game board sizing respects docked panel
- Browser test: `tests/browser/command-panel-dock.test.tsx`
- **CommandPanel.tsx < 150 LOC**

### Step 2.6: Game board resize for docked panel
- Modify `src/game.ts` `resize()` — subtract panel width when docked
- Modify PixiJS renderer init to account for reduced viewport
- Update fog/light canvas sizing
- Browser test: `tests/browser/command-panel-dock.test.tsx` (extends step 2.5 test)

---

## Phase 3: Advisor System

### Step 3.1: Advisor types and config
- `src/advisors/types.ts` — AdvisorTip interface, AdvisorState, AdvisorRole enum (< 60 LOC)
- `src/config/advisor-config.ts` — advisor personas (names, colors) (< 40 LOC)

### Step 3.2: Tip definitions
- `src/advisors/tips.ts` — all economy, war, builder tip definitions with conditions (< 200 LOC)
- Unit tests: `tests/advisors/tips.test.ts` — each condition function tested in isolation

### Step 3.3: Advisor ECS system
- `src/advisors/advisor-system.ts` — condition evaluation, priority queue, cooldown management (< 200 LOC)
- `src/advisors/advisor-state.ts` — state management, persistence via Preferences (< 120 LOC)
- Wire into game loop in `src/game.ts` (replace `tutorialSystem` call)
- Unit tests: `tests/advisors/advisor-system.test.ts`
- Gameplay test: `tests/gameplay/advisor-pressure.test.ts`

### Step 3.4: Advisor toast UI
- `src/ui/hud/AdvisorToast.tsx` — toast component with dismiss, auto-fade (< 150 LOC)
- Positioned bottom-left, avoids docked panel, responsive via `screenClass`
- Unit test: `tests/ui/AdvisorToast.test.tsx`
- Browser test: `tests/browser/advisor-flow.test.tsx`

### Step 3.5: Settings integration
- Modify `src/ui/overlays/SettingsOverlay.tsx` — add Advisors section with per-advisor toggles
- Modify `src/ui/main-menu.tsx` or `src/ui/settings-panel.tsx` — advisor toggles in pre-game settings
- Browser test: `tests/browser/advisor-settings.test.tsx`

### Step 3.6: Delete old tutorial
- Delete `src/ecs/systems/tutorial.ts`
- Remove `tutorialStep`, `tutorialShownSteps` from `src/ecs/world.ts`
- Remove tutorial imports from `src/game.ts`
- Update save-system.ts with migration for old auto-behavior format
- Verify no dead references: `grep -r tutorial src/`

---

## Phase 4: Integration & Polish

### Step 4.1: Responsive tech tree fix
- Update `src/ui/tech-tree-panel.tsx` to use `formFactor`/`screenClass` instead of `md:hidden`/`md:flex`
- Foldable unfolded gets SVG graph (large touch screen), not card grid
- Browser test: `tests/browser/responsive-tech-tree.test.tsx`

### Step 4.2: Foldable resize transitions
- Test fold/unfold layout transitions (panel docks/undocks, game board resizes)
- Browser test: `tests/browser/foldable-resize.test.tsx`

### Step 4.3: Full gameplay integration test
- `tests/gameplay/forces-game-sync.test.ts` — roster stays in sync during gameplay
- `tests/gameplay/auto-behavior-per-unit.test.ts` — TaskOverride prevents auto-assignment
- `tests/browser/gameplay-loops.test.tsx` — update existing to work with new panel structure

### Step 4.4: Typecheck, lint, build verification
- `pnpm typecheck` — zero errors
- `pnpm lint:fix` — zero lint errors
- `pnpm build` — production build succeeds
- `pnpm test` — all tests pass

---

## File Change Summary

### New Files (19)
```
src/platform/device.ts
src/platform/signals.ts
src/advisors/types.ts
src/advisors/tips.ts
src/advisors/advisor-system.ts
src/advisors/advisor-state.ts
src/config/advisor-config.ts
src/ui/panel/ForcesTab.tsx
src/ui/panel/ForcesGroup.tsx
src/ui/panel/ForceUnitRow.tsx
src/ui/panel/TaskPicker.tsx
src/ui/panel/BuildingsTab.tsx
src/ui/panel/BuildingRow.tsx
src/ui/panel/TrainPicker.tsx
src/ui/hud/AdvisorToast.tsx
src/game/roster-sync.ts
tests/platform/device.test.ts
tests/platform/signals.test.ts
tests/advisors/advisor-system.test.ts
```

### Modified Files (15)
```
src/platform/native.ts
src/platform/index.ts
src/ecs/components.ts
src/ecs/world.ts
src/ecs/systems/auto-behavior.ts
src/ui/store.ts
src/ui/panel/CommandPanel.tsx
src/ui/components/HamburgerButton.tsx
src/ui/app.tsx
src/ui/hud/top-bar.tsx
src/ui/main-menu.tsx
src/ui/tech-tree-panel.tsx
src/ui/overlays/SettingsOverlay.tsx
src/game.ts
src/save-system.ts
```

### Deleted Files (3)
```
src/ui/panel/ActionsTab.tsx
src/ui/panel/CommandsTab.tsx
src/ecs/systems/tutorial.ts
```

### New Test Files (14)
```
tests/platform/device.test.ts
tests/platform/signals.test.ts
tests/ui/ForcesTab.test.tsx
tests/ui/ForceUnitRow.test.tsx
tests/ui/BuildingsTab.test.tsx
tests/ui/BuildingRow.test.tsx
tests/ui/AdvisorToast.test.tsx
tests/advisors/advisor-system.test.ts
tests/advisors/tips.test.ts
tests/browser/device-detection.test.tsx
tests/browser/command-panel-dock.test.tsx
tests/browser/forces-tab-flow.test.tsx
tests/browser/buildings-tab-flow.test.tsx
tests/browser/advisor-flow.test.tsx
tests/browser/advisor-settings.test.tsx
tests/browser/responsive-tech-tree.test.tsx
tests/browser/foldable-resize.test.tsx
tests/gameplay/advisor-pressure.test.ts
tests/gameplay/forces-game-sync.test.ts
tests/gameplay/auto-behavior-per-unit.test.ts
```
