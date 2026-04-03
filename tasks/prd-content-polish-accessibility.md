# PRD: Content Expansion, Polish, & Accessibility

## Overview

Following the design bible implementation and macro/meso/micro remediation, this PRD addresses the remaining 25+ gaps: content expansion (campaign, puzzles, survival), performance optimization, accessibility compliance, and missing RTS polish features.

**Business value:** Transform from "balanced RTS with good UI" to "complete, accessible, content-rich game worth recommending."

---

## User Stories

### TIER 1: CONTENT EXPANSION

---

### US1: Campaign Expansion — 5 More Missions
**As a** player who beat the 5-mission campaign in 1 hour,
**I want** 10 total missions with meaningful branching,
**So that** the campaign is a real progression path, not a tutorial.

**Acceptance Criteria:**
- [ ] Missions 6-10 added to mission-defs-late.ts
- [ ] Mission 6: defend against 3-wave siege (teaches wall-gate system)
- [ ] Mission 7: co-op escort (teaches multiplayer if unlocked, or AI ally)
- [ ] Mission 8A/8B: branching choice (stealth path vs siege path)
- [ ] Mission 9: survival-style endless defense (must last 15 min)
- [ ] Mission 10: final boss — Alpha Predator + Siege Turtles
- [ ] Each mission unlocks a cosmetic or commander
- [ ] Briefing screens for all new missions
- [ ] Tests for mission definitions and unlock triggers

**Files:** `src/campaign/mission-defs-late.ts`, `src/config/unlocks.ts`, new briefing content

---

### US2: Puzzle Expansion — 10 More Puzzles
**As a** player who completed all 10 puzzles,
**I want** 20 total puzzles with difficulty categories,
**So that** puzzle mode is a real game mode, not a tutorial appendix.

**Acceptance Criteria:**
- [ ] 10 new puzzles in puzzles-advanced.ts or new puzzles-expert.ts
- [ ] Difficulty tiers: Beginner (1-5), Intermediate (6-10), Advanced (11-15), Expert (16-20)
- [ ] New puzzle types: economy optimization, tech rush, defense hold, micro challenge
- [ ] Star rating system: 1-3 stars based on time/efficiency
- [ ] Tests for new puzzle definitions

**Files:** `src/config/puzzles-advanced.ts` or new file, `src/ui/screens/PuzzleSelect.tsx`

---

### US3: Survival Mode Scoring + Leaderboard
**As a** player in survival mode,
**I want** meaningful scoring with difficulty multipliers,
**So that** I'm motivated to push for higher waves.

**Acceptance Criteria:**
- [ ] Score multiplier: Easy 0.5x, Normal 1x, Hard 2x, Nightmare 3x
- [ ] Commander diversity bonus: +10% for non-meta commanders
- [ ] Wave milestone bonuses: Wave 10/20/30 give 500/1000/2000
- [ ] Survival leaderboard (local, per difficulty)
- [ ] Post-game stat breakdown (kills/buildings/resources)

**Files:** `src/game/survival-mode.ts`, `src/ui/game-over.tsx`, `src/systems/leaderboard.ts`

---

### TIER 2: ACCESSIBILITY & POLISH

---

### US4: ARIA Accessibility Audit
**As a** player using a screen reader,
**I want** all UI elements properly labeled,
**So that** the game is accessible to players with disabilities.

**Acceptance Criteria:**
- [ ] PondAccordionSection has aria-expanded attribute
- [ ] All resource counters have aria-label ("Clams: 200")
- [ ] Action buttons have aria-label ("Train Brawler, costs 50 clams")
- [ ] Modal overlays have aria-modal="true"
- [ ] Focus management: modals trap focus, return focus on close
- [ ] All interactive SVGs have role="button" where clickable

**Files:** Multiple UI components

---

### US5: Keyboard Navigation Completeness
**As a** keyboard-only player,
**I want** full keyboard navigation in all screens,
**So that** I can play without a mouse.

**Acceptance Criteria:**
- [ ] Tab/Shift+Tab cycles through all buttons in settings
- [ ] Arrow keys navigate tech tree nodes
- [ ] Enter activates focused button
- [ ] Escape closes any open modal/overlay
- [ ] Shortcut to open command panel (P key)
- [ ] All hotkeys documented in keyboard reference

**Files:** `src/input/keyboard.ts`, `src/ui/settings-panel.tsx`, `src/ui/keyboard-reference.tsx`

---

### US6: Video Asset Compression
**As a** mobile player,
**I want** the game to load in <5 seconds on 4G,
**So that** I don't abandon it waiting.

**Acceptance Criteria:**
- [ ] splash-stream.mp4 deleted if unused, or compressed to <3MB
- [ ] splash-16x9.mp4 compressed to <2MB (was 4.1MB)
- [ ] splash-9x16.mp4 compressed to <1.5MB (was 3.4MB)
- [ ] Total video assets <7MB (was 18.5MB)
- [ ] PWA service worker caches video assets

**Files:** public/assets/video/, vite.config.ts

---

### US7: Performance — useMemo Optimization
**As a** player on a low-end device,
**I want** smooth 60fps UI,
**So that** the interface doesn't stutter during gameplay.

**Acceptance Criteria:**
- [ ] Wrap ForceUnitRow, BuildingRow in memo()
- [ ] Memoize inline style objects in high-frequency components
- [ ] Extract constant objects from render functions
- [ ] Profile and optimize any component rendering >16ms

**Files:** Multiple UI components

---

### TIER 3: MISSING RTS FEATURES

---

### US8: Weather Strategic Impact
**As a** player adapting to weather,
**I want** weather to affect economy and AI,
**So that** weather creates real strategic decisions.

**Acceptance Criteria:**
- [ ] Rain: -10% gather speed
- [ ] Fog: enemy AI aggression reduced 50%
- [ ] Wind: +20px projectile drift (was 15)
- [ ] Weather forecast: 30s warning before transitions
- [ ] Weather indicator shows incoming change

**Files:** `src/config/weather.ts`, `src/ecs/systems/weather.ts`, `src/ui/hud/WeatherIndicator.tsx`

---

### US9: Co-op Multiplayer Rules
**As a** co-op player,
**I want** clear shared economy and win conditions,
**So that** co-op feels designed, not bolted on.

**Acceptance Criteria:**
- [ ] Shared resource pool between co-op partners
- [ ] Both players must survive for shared victory
- [ ] Minimap ping system (click minimap + hotkey sends ping)
- [ ] Shared fog of war (see what partner sees)
- [ ] Co-op difficulty scaling (enemies get +50% stats)

**Files:** `src/net/multiplayer-controller.ts`, `src/net/types.ts`

---

### US10: Unit Patrol Routes
**As a** player defending a base,
**I want** units to patrol between waypoints,
**So that** I can set up perimeter defense automatically.

**Acceptance Criteria:**
- [ ] Shift+right-click adds waypoints to patrol route
- [ ] Units loop between waypoints continuously
- [ ] Patrol interrupted if unit takes damage (switches to defensive stance)
- [ ] Visual patrol path lines on minimap

**Files:** `src/ecs/components.ts`, `src/ecs/systems/auto-behavior.ts`, new patrol system

---

### US11: Daily Challenge Improvements
**As a** returning player,
**I want** daily challenges with clear rewards,
**So that** I have a reason to play every day.

**Acceptance Criteria:**
- [ ] Daily challenge shows on main menu (today's challenge card)
- [ ] Challenge types: speed run, no losses, tech rush, eco only
- [ ] Rewards: 150-300 XP + exclusive cosmetic after 7-day streak
- [ ] Challenge history in match history panel

**Files:** `src/systems/daily-challenges.ts`, `src/ui/main-menu.tsx`

---

### US12: Menu Hierarchy Reorganization
**As a** new player,
**I want** to immediately see Campaign as the primary mode,
**So that** I know where to start.

**Acceptance Criteria:**
- [ ] Main menu reordered: Campaign (large), then Puzzles/Survival row, then Quick Play/New Game, then secondary buttons
- [ ] Campaign button is visually larger/more prominent
- [ ] "New to Pond Warfare? Start the Campaign!" tooltip on first launch

**Files:** `src/ui/main-menu.tsx`

---

## Implementation Plan

| Order | Stories | Estimated Files |
|-------|---------|-----------------|
| 1 | US4 (ARIA), US5 (keyboard), US12 (menu) | 15+ files |
| 2 | US6 (video), US7 (perf) | 10+ files |
| 3 | US1 (campaign), US2 (puzzles) | 5+ files |
| 4 | US3 (survival), US8 (weather) | 4 files |
| 5 | US9 (co-op), US10 (patrol), US11 (daily) | 6+ files |

## Success Criteria

| Metric | Target |
|--------|--------|
| Campaign missions | 10 (was 5) |
| Puzzles | 20 (was 10) |
| ARIA compliance | 100% interactive elements labeled |
| Video assets total | <7MB (was 18.5MB) |
| Keyboard navigable screens | All |
| Daily challenge engagement | Visible on main menu |
