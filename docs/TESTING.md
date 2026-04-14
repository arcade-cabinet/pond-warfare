---
title: Testing Strategy
updated: 2026-04-14
status: current
domain: quality
---

# Testing Strategy

## Overview

Pond Warfare uses a **multi-layer testing pyramid**:

- **Unit tests** (Vitest, jsdom) — pure logic, ECS systems, utility functions
- **Browser tests** (Vitest + Playwright) — DOM interaction, UI components, pointer/keyboard handling
- **E2E tests** (Vitest + Playwright) — full match flows, menu navigation, state persistence
- **Manual smoke** — live gameplay, mobile builds, visual polish

**Current coverage:** 2,500+ tests across unit, browser, integration, gameplay, and E2E suites, with release gating centered on green scripted verification rather than a single line-coverage threshold.

## Running Tests

```bash
# All tests (unit + jsdom + integration slices under default Vitest config)
pnpm test

# Watch mode (development)
pnpm test:watch

# Browser tests (DOM, Preact components)
pnpm test:browser

# E2E tests (full match flow)
pnpm test:e2e

# Full release gate
pnpm verify:release

# Refresh canonical staged browser audit captures + manifest
pnpm audit:browser-captures

# Single file
pnpm test src/ecs/systems/movement.test.ts
```

## Test Organization

```
tests/
├── ecs/
│   ├── components/          # Component schema tests
│   └── systems/             # System behavior tests
├── game/
│   ├── governor/            # AI decision logic
│   ├── match-events/        # Wave/event scheduling
│   └── ui-sync/             # World → Store sync
├── ui/
│   ├── components/          # Preact component rendering
│   ├── input/               # Pointer, keyboard, selection
│   └── menu-flow/           # Menu navigation, modal state
└── utils/
    ├── balance/             # Cost calculations, damage formulas
    └── spatial-hash/        # Proximity query correctness
```

## Test Categories

### Unit Tests

**What:** Pure logic, no DOM or game loop.

**Examples:**
- Entity cost calculations (`configs/costs.test.ts`)
- Damage multiplier tables (`ecs/systems/combat.test.ts`)
- SpatialHash grid performance (`utils/SpatialHash.test.ts`)
- Veterancy rank bonuses (`ecs/systems/veterancy.test.ts`)

**Config:** `vitest.config.ts` (jsdom)

### Browser Tests

**What:** DOM rendering, user interaction, Preact state updates.

**Examples:**
- HUD button clicks trigger training (`ui/hud/train-button.test.ts`)
- Selection panel updates on unit select (`ui/selection-panel.test.ts`)
- Keyboard shortcuts (Ctrl+1-9 for control groups) (`input/control-groups.test.ts`)
- Right-click brings up radial menu (`input/radial-menu.test.ts`)

**Config:** `vitest.browser.config.ts` (playwright)

**Key patterns:**
```typescript
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { userEvent } from '@testing-library/user-event'

test('train button increments unit queue', async () => {
  const user = userEvent.setup()
  const { container } = render(<TrainButton unitKind="mudpaw" />)
  
  const trainBtn = screen.getByRole('button', { name: 'Train' })
  await user.click(trainBtn)
  
  expect(trainBtn).toHaveTextContent('2/5')
})
```

### E2E Tests

**What:** Full match flows from menu to victory/defeat.

**Examples:**
- Start match from main menu, gather resource, train unit (`game/full-match-flow.e2e.ts`)
- Unlock specialist blueprint via upgrade, train it in-match (`game/specialist-unlock.e2e.ts`)
- Enemy wave spawns, defeats player, match ends (`game/wave-defeat.e2e.ts`)

**Config:** `vitest.e2e.config.ts` (playwright)

**Key patterns:**
```typescript
test('full match from start to specialist training', async () => {
  // Navigate to game
  await page.goto('/game')
  
  // Wait for match start
  await page.waitForSelector('[data-testid="match-started"]')
  
  // Gather resources
  const mudpaw = await page.$('[data-entity-kind="mudpaw"]')
  await mudpaw.click({ button: 'right' }) // Right-click to move
  
  // Verify gather animation
  await expect(mudpaw).toHaveClass('gathering')
})
```

## Release Gate

The canonical pre-ship gate is:

```bash
pnpm verify:release
```

That scripted pass covers:
- TypeScript compilation
- Full Vitest suite
- Core browser smoke slices
- Production web build
- Android sync build
- Dependency audit

For visual signoff, refresh the tracked staged screenshots too:

```bash
pnpm audit:browser-captures
```

That command regenerates [tests/browser/audit/MANIFEST.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/browser/audit/MANIFEST.md) and fails closed if the canonical nine capture files drift.

## When to Write Tests

### Always

- **Behavioral change** — update or add test
- **Bug fix** — write test that fails with old code, passes with fix
- **Balance adjustment** — verify new formula with test
- **UI interaction** — browser test for click/keyboard/selection

### Often

- New system or component
- Complex calculation (damage, cost, probability)
- State machine transitions (menu → game → rewards)

### Optional (Internal Refactors)

- Rename function (no behavior change)
- Extract helper (same test coverage)
- Optimize datastructure (same output)

## Manual Smoke Tests

**Before every release:**

Use [docs/release-checklist.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/release-checklist.md) for the canonical smoke sequence and [docs/release-signoff-template.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/release-signoff-template.md) for the record you attach to a release PR or release issue.

At minimum, manual signoff should cover:

1. **Fresh launch**
   - Clean install / launch
   - Main menu art + icon set visible
   - PLAY → SINGLE PLAYER flow starts a match cleanly

2. **Core match**
   - Onboarding coach advances through its three early steps
   - Units can be selected, commanded, and trained
   - Rewards screen appears at match end

3. **Progression carry-forward**
   - Clam upgrades persist into the next match
   - Pearl upgrades persist into the next match
   - Specialist blueprint behavior still functions

4. **Touch + resume**
   - Tap select
   - Tap command
   - Pinch zoom
   - Drag pan
   - Background / resume without broken audio or shell state

5. **Longer smoke**
   - 15-20 minute session without stalled AI or broken overlays

## Test Fixtures & Mocks

### GameWorld Mock

```typescript
import { createWorld, addEntity } from '@/ecs/world'

const world = createWorld()
const mudpaw = addEntity(world, 'mudpaw', { x: 100, y: 100 })
```

### Store Mock

```typescript
import { store } from '@/ui/store'

store.selectedEntities.value = [mudpaw]
store.resources.value = { clams: 100, twigs: 50, pearls: 5 }
```

### Yuka Vehicle Mock

For steering behavior tests, use `src/utils/test-helpers.ts`:
```typescript
import { createTestVehicle } from '@/utils/test-helpers'

const vehicle = createTestVehicle({ x: 0, y: 0 })
vehicle.velocity.set(10, 0)
vehicle.update(0.016) // 1/60s frame
```

## CI/CD Integration

All tests run on every push via `.github/workflows/ci.yml`:

```yaml
- name: Run unit tests
  run: pnpm test
  
- name: Run browser tests
  run: pnpm test:browser
  
- name: Run E2E tests
  run: pnpm test:e2e
```

Merge blocked if any suite fails.

## Debugging Tips

### View test output
```bash
pnpm test -- --reporter=verbose
```

### Run single test
```bash
pnpm test -- -t "train button"
```

### Watch + debug
```bash
pnpm test:watch -- src/ecs/systems/combat.test.ts
```

### Browser test debugging
```bash
pnpm test:browser -- --debug --headed
# Opens Playwright inspector
```

### Console logs in tests
```typescript
test('example', () => {
  console.log('Debug output here')
  // Logs visible in pnpm test:watch
})
```

## Continuous Improvement

- Review coverage report monthly (`pnpm test -- --coverage`)
- Add tests when bugs are found (write failing test, fix bug, verify passing)
- Refactor tests as code evolves (stale tests are bugs)
- Pair manual smoke tests with automated E2E coverage
