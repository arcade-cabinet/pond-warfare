> **SUPERSEDED BY v3** -- This PRD describes v1/v2 features. The v3 rearchitecture
> replaced many referenced systems. See tasks/prd-v3-rearchitecture.md for current spec.

# PRD: Quality Overhaul — Fix Everything Broken, Inconsistent, and Missing

## Overview

Comprehensive quality pass addressing every issue found in the brutal audit. The game has strong systems but they're disconnected — Puzzle Mode and Survival Mode have backend code but zero UI, Weather runs invisibly, responsive design breaks on tablets, visual consistency is shattered with 27+ hardcoded colors, and new features feel bolted on rather than integrated.

## User Stories

### US1: Puzzle Mode UI
As a player, I want to select and play puzzle missions from the main menu, so that the 10 puzzles are actually playable instead of dead config data.

Acceptance Criteria:
- [ ] "Puzzles" button on main menu (alongside Skirmish/Campaign/Survival/Co-op)
- [ ] Puzzle selection screen showing all 10 puzzles with: name, description, star rating, locked/unlocked status, par time
- [ ] Puzzle HUD overlay during gameplay: objective text, timer, star target
- [ ] Puzzle completion screen: stars earned, time taken, "Next Puzzle" button
- [ ] Wire puzzle config into game init (fixed units, fixed map, objectives)
- [ ] Tests for puzzle selection + HUD

### US2: Survival Mode UI
As a player, I want to start Survival Mode from the main menu with a wave counter in the HUD, so that endless mode is actually playable.

Acceptance Criteria:
- [ ] "Survival" button on main menu
- [ ] Survival settings: difficulty, map scenario, commander selection
- [ ] In-game wave counter in top bar: "Wave 7" with visual escalation
- [ ] Score display during gameplay
- [ ] Survival game-over: final score, waves survived, leaderboard entry
- [ ] Wire survival-mode.ts into game loop when survival preset selected
- [ ] Tests

### US3: Weather HUD
As a player, I want to see the current weather and countdown to next weather change, so that I can plan around weather effects.

Acceptance Criteria:
- [ ] Weather indicator in top bar: icon + label (Clear/Rain/Fog/Wind)
- [ ] Countdown timer to next weather change
- [ ] Weather transition announcement via event feed
- [ ] Visual weather particle effects (rain drops, fog overlay, wind streaks)
- [ ] Wire store-weather.ts signals into top bar display
- [ ] Tests

### US4: Tablet Responsive Fix (768-1100px)
As a player on an iPad, I want the game to look correct in landscape, so that the panel isn't broken between mobile and desktop modes.

Acceptance Criteria:
- [ ] New medium breakpoint: 768-1100px gets a collapsible docked sidebar (~350px)
- [ ] canDockPanels threshold lowered to 768px for touch devices
- [ ] Panel width scales: 280px phone, 350px tablet, 300px desktop dock
- [ ] Hamburger button larger and more prominent on medium screens
- [ ] TopBar adapts spacing for medium screens
- [ ] Test at 768, 1024, 1100, 1280 viewports
- [ ] Verify iPad Mini landscape, iPad Air landscape, iPad Pro landscape

### US5: Accordion Content Animation + Mobile Polish
As a player on a phone, I want accordion sections to expand smoothly and content to be readable, so that the panel doesn't feel janky.

Acceptance Criteria:
- [ ] Smooth expand/collapse animation (CSS max-height transition, not display:none toggle)
- [ ] Font sizes scale down on compact screens (unit names 11px, counts 9px minimum)
- [ ] Forces tab unit rows optimized for 280px width
- [ ] TaskPicker dropdown doesn't overflow panel
- [ ] Scroll-to-visible when section opens (auto-scroll so opened section is in view)
- [ ] Tests

### US6: Centralize All Colors to CSS Variables
As a developer, I want all UI colors to use CSS variables, so that theming is consistent and changeable.

Acceptance Criteria:
- [ ] Audit every tsx/ts file for hardcoded rgba/hex in style props
- [ ] Add missing CSS variables to :root in main.css
- [ ] Replace all 27+ hardcoded colors with var() references
- [ ] No inline hex/rgba in any UI component (rendering/audio OK)
- [ ] Verify visual appearance unchanged after migration

### US7: Unified Button Component
As a developer, I want one reusable Button component used everywhere, so that all buttons look consistent.

Acceptance Criteria:
- [ ] Create src/ui/components/GameButton.tsx with variants: primary, secondary, danger, ghost
- [ ] Primary: Button.png background (like MenuButton)
- [ ] Secondary: semi-transparent with accent border
- [ ] Danger: red-tinted for destructive actions
- [ ] Ghost: minimal, no background
- [ ] All variants: proper touch targets (44px min), rounded corners, hover/active states
- [ ] Replace ad-hoc button styling in: HUD, panels, modals, overlays
- [ ] Tests

### US8: Z-Index System
As a developer, I want a centralized z-index layer system, so that overlays don't fight each other.

Acceptance Criteria:
- [ ] Define z-index scale in CSS vars: --z-game, --z-hud, --z-panel, --z-modal, --z-toast, --z-loading
- [ ] Replace all inline zIndex and z-[] classes with the vars
- [ ] Document the layer hierarchy in a comment block
- [ ] No more magic numbers for z-index anywhere

### US9: Room Code Security
As a developer, I want room codes generated with crypto.getRandomValues, so that P2P connections are secure.

Acceptance Criteria:
- [ ] Replace Math.random() in net/connection.ts generateRoomCode with crypto.getRandomValues
- [ ] Fallback to Math.random if crypto not available (old browsers)
- [ ] Test uniqueness

### US10: Build Preview Ghost
As a player, I want to see where a building will be placed before I click, so that placement is precise.

Acceptance Criteria:
- [ ] When in placement mode, show semi-transparent building sprite at cursor
- [ ] Green tint when valid, red when invalid (collision/terrain)
- [ ] Works on touch (follows finger)
- [ ] Cancel with Escape or tap outside
- [ ] Already partially implemented in ui-renderer.ts — verify and complete

### US11: Weather Visual Effects
As a player, I want to SEE weather (rain particles, fog overlay, wind streaks), so that weather affects the visual experience, not just stats.

Acceptance Criteria:
- [ ] Rain: falling particle effect across viewport
- [ ] Fog: semi-transparent overlay reducing visibility
- [ ] Wind: horizontal streak particles showing wind direction
- [ ] Clear: no effects (default)
- [ ] Effects use existing particle system or PixiJS filters
- [ ] Performance: no FPS drop (< 5% impact)

### US12: Minimap Legend Touch Fix
As a mobile player, I want the minimap legend to work with tap, not just hover.

Acceptance Criteria:
- [ ] Tap "?" to toggle legend visibility
- [ ] Tap outside to close
- [ ] Works on touch AND mouse

### US13: Content Animation for Accordion
As a player, I want accordion sections to animate open/closed smoothly instead of instant toggle.

Acceptance Criteria:
- [ ] CSS max-height transition (0.2s ease-out) on expand
- [ ] Reverse animation on collapse
- [ ] No layout shift during animation
- [ ] Performance: no jank on mobile

## Technical Requirements

- All files < 300 LOC
- All existing 1327 tests must still pass
- New tests for every new UI component
- TypeScript strict mode
- No Math.random() in gameplay or security code

## Implementation Plan

Phase 1 (BROKEN): US1, US2, US3, US9 — make invisible features visible
Phase 2 (RESPONSIVE): US4, US5, US12, US13 — fix tablet/mobile layout
Phase 3 (CONSISTENCY): US6, US7, US8 — unify visual language
Phase 4 (POLISH): US10, US11 — final visual polish
