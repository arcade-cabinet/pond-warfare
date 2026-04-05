> **SUPERSEDED BY v3** -- This PRD describes v1/v2 features. The v3 rearchitecture
> replaced many referenced systems. See tasks/prd-v3-rearchitecture.md for current spec.

# PRD: Design Bible — Complete Visual Identity Implementation

## Overview

Pond Warfare's UI was built with a gentle watercolor/teal aesthetic that contradicts the game's identity as a "glorious swampy mudfight." The design bible at `docs/brand/` defines the correct visual language: vine-wrapped wood planks, gritty gold/moss/steel palette, SVG procedural textures, and militarized swamp doodads.

Phase 1 established the SVG Frame9Slice system, design tokens, SVG filters, and sprites. This PRD covers **everything remaining** to reach 100% design bible compliance across all UI surfaces.

**Business value:** Visual coherence between brand identity and in-game experience. Players see "POND WARFARE" marketing and get a matching gritty RTS interface, not a gentle pond simulator.

## Goals

1. **100% design bible compliance** across all 70+ UI files
2. **Zero PNG panel assets** — all panel borders via procedural SVG Frame9Slice
3. **Unified typography** — IM Fell English SC headers, Open Sans body, zero Cinzel/MedievalSharp/Inter holdovers
4. **Main menu transformation** — swamp/vine aesthetic replaces watercolor lily pads
5. **Every change tested** — visual regression tests, component tests, integration tests
6. **Documentation updated** — AGENTS.md reflects new component system

## Current State (Audit 2026-04-02)

| Surface | Compliance | Key Gaps |
|---------|------------|----------|
| Design Tokens | 95% | Complete |
| Color Palette | 100% | Complete |
| Typography | 85% | Cinzel remnants in logo CSS, Inter in body |
| Modals/Panels | 65% | 9 of 14+ panels use Frame9Slice |
| Buttons | 80% | MenuButton uses old Button.png |
| Main Menu | 30% | Watercolor pond bg, lily pads, old buttons |
| HUD Elements | 95% | Minor polish |
| Command Panel | 75% | Still uses .war-panel PNG border-image |
| SVG Sprites | 100% | Otter, Croc, Snake created |
| **Overall** | **~70%** | |

## Out of Scope

- PixiJS game canvas rendering changes (terrain, unit rendering on the game board)
- Audio system changes
- Gameplay mechanics or balancing
- P2P multiplayer networking
- New game features not related to visual identity

---

## User Stories

### US1: Main Menu Swamp Transformation
**As a** player launching the game,
**I want** the main menu to look like a gritty swamp war room,
**So that** my first impression matches the "Pond WARFARE" brand identity.

**Acceptance Criteria:**
- [ ] Menu background renders dark swamp scene (not watercolor pond)
- [ ] SwampEcosystem canvas (fog + fireflies) is visible behind menu
- [ ] Title uses IM Fell English SC with vine decoration (reference: `ui-reference-full.jsx` title section)
- [ ] Floating lily pads removed or replaced with swamp debris
- [ ] Menu otter replaced/restyled to match gritty aesthetic
- [ ] Water ripple overlays removed or converted to swamp fog

**Test plan:**
- [ ] Unit test: MenuBackground renders without lily pad elements
- [ ] Unit test: SwampEcosystem canvas mounts and has correct z-index
- [ ] Snapshot test: Main menu DOM structure matches expected output

**Files to modify:**
- `src/ui/menu-background.tsx` — Replace watercolor with swamp gradient + vines
- `src/ui/menu-lily-pads.tsx` — Remove or replace with swamp debris
- `src/ui/main-menu.tsx` — Update title treatment, integrate SwampEcosystem

---

### US2: Wood Plank Menu Buttons
**As a** player navigating the main menu,
**I want** buttons that look like carved wood planks with vine accents,
**So that** every interactive element reinforces the warfare aesthetic.

**Acceptance Criteria:**
- [ ] MenuButton component replaced with wood plank styling
- [ ] Button uses IM Fell English SC font, gritty gold text
- [ ] Hover state shows vine highlight glow
- [ ] Active/pressed state shows slight inset
- [ ] All menu CTA buttons (New Game, Continue, Settings, etc.) use new style
- [ ] Old `Button.png` asset no longer referenced

**Test plan:**
- [ ] Unit test: MenuButton renders with correct font-family
- [ ] Unit test: MenuButton hover/active classes applied
- [ ] Integration test: Main menu renders all buttons without PNG references

**Files to modify:**
- `src/ui/menu-button.tsx` — Restyle to wood plank (CSS, no PNG)
- `src/ui/campaign-briefing.tsx` — Update any MenuButton references
- `src/ui/screens/MultiplayerMenu.tsx` — Update MenuButton references

---

### US3: Command Panel Frame Migration
**As a** player with the side panel open during gameplay,
**I want** the command panel wrapped in the vine-frame border,
**So that** the in-game panel matches the modal/accordion aesthetic.

**Acceptance Criteria:**
- [ ] CommandPanel outer container uses Frame9Slice (not `.war-panel` with PNG)
- [ ] Minimap canvas sits inside a vine-framed section
- [ ] Panel toggle button styled as rts-btn
- [ ] Accordion sections within panel render properly inside the frame
- [ ] Responsive behavior preserved (dock on large screens, hamburger on small)

**Test plan:**
- [ ] Unit test: CommandPanel renders Frame9Slice wrapper
- [ ] Unit test: Minimap canvas ref connects properly inside frame
- [ ] Integration test: CommandPanel accordion toggle works within frame
- [ ] Browser test: Panel docking still works at 768px+ breakpoint

**Files to modify:**
- `src/ui/panel/CommandPanel.tsx` — Wrap in Frame9Slice
- `src/styles/main.css` — Deprecate `.war-panel` class

---

### US4: Tech Tree Panel Frame Migration
**As a** player viewing the tech tree,
**I want** the tech tree modal wrapped in the vine-frame border,
**So that** it matches all other panels.

**Acceptance Criteria:**
- [ ] TechTreePanel uses Frame9Slice wrapper
- [ ] Tech branch tabs styled as rts-btn
- [ ] Tech node cards styled with design tokens (no old stone-node PNG refs)
- [ ] Close button styled as rts-btn

**Test plan:**
- [ ] Unit test: TechTreePanel renders with Frame9Slice
- [ ] Unit test: Tech node cards render with correct colors

**Files to modify:**
- `src/ui/tech-tree-panel.tsx` — Wrap in Frame9Slice

---

### US5: Campaign Panel Frame Migration
**As a** player viewing the campaign missions,
**I want** the campaign panel wrapped in the vine-frame border,
**So that** it matches all other panels.

**Acceptance Criteria:**
- [ ] CampaignPanel uses Frame9Slice wrapper
- [ ] Mission cards use design tokens for tint colors
- [ ] Briefing overlay uses Frame9Slice

**Test plan:**
- [ ] Unit test: CampaignPanel renders Frame9Slice

**Files to modify:**
- `src/ui/campaign-panel.tsx` — Wrap in Frame9Slice
- `src/ui/campaign-briefing.tsx` — Verify/update styling

---

### US6: Typography Unification
**As a** player reading any UI text,
**I want** consistent typography across all screens,
**So that** the font choices reinforce the gritty warfare theme.

**Acceptance Criteria:**
- [ ] Zero references to 'Cinzel' or 'MedievalSharp' in CSS or TSX
- [ ] All heading fonts use 'IM Fell English SC'
- [ ] Body text uses 'Open Sans' (not 'Inter')
- [ ] Logo title classes (.logo-pond, .logo-warfare, .title-reflection) use IM Fell English SC
- [ ] `.font-heading`, `.font-title` confirmed as IM Fell English SC
- [ ] `.font-game` confirmed as Open Sans

**Test plan:**
- [ ] Grep test: Zero matches for 'Cinzel' in src/ and tests/
- [ ] Grep test: Zero matches for 'MedievalSharp' in src/ and tests/
- [ ] Unit test: Rendered heading elements have correct font-family

**Files to modify:**
- `src/styles/main.css` — Replace all Cinzel/MedievalSharp/Inter references
- Any TSX file with inline font-family declarations

---

### US7: Deprecate PNG Panel Assets
**As a** developer maintaining the codebase,
**I want** all panel borders to use procedural SVG Frame9Slice,
**So that** we eliminate PNG asset dependencies and have resolution-independent UI.

**Acceptance Criteria:**
- [ ] `.war-panel` CSS class deprecated (comment + no active usage)
- [ ] `.parchment-panel` CSS class deprecated (comment + no active usage)
- [ ] `.war-panel-header` class deprecated (replaced by Frame9Slice title)
- [ ] `.war-panel-content` class deprecated
- [ ] `panel-9slice.png` no longer referenced in any CSS or TSX
- [ ] `section-header.png` no longer referenced in any CSS or TSX
- [ ] `panel-center.png` no longer referenced in any CSS or TSX
- [ ] `panel-border-h.png` and `panel-border-v.png` no longer referenced
- [ ] `panel-corner.png` no longer referenced

**Test plan:**
- [ ] Grep test: Zero references to deprecated PNG filenames in src/
- [ ] Grep test: Zero active usage of `.war-panel` class in TSX
- [ ] Grep test: Zero active usage of `.parchment-panel` class in TSX

**Files to modify:**
- `src/styles/main.css` — Mark deprecated classes, remove PNG references
- Any file still using `.war-panel` or `.parchment-panel` classes

---

### US8: Intro Overlay Swamp Theme
**As a** player seeing the game intro,
**I want** the intro overlay to use the swamp aesthetic,
**So that** the transition from menu to game feels cohesive.

**Acceptance Criteria:**
- [ ] Intro overlay background uses dark swamp gradient (not blue/teal)
- [ ] Difficulty selector cards use design tokens
- [ ] Title animation uses IM Fell English SC

**Test plan:**
- [ ] Unit test: Intro overlay renders with correct background colors

**Files to modify:**
- `src/ui/intro-overlay.tsx` — Update background gradient colors

---

### US9: Game Over & Loading Screens
**As a** player seeing victory/defeat or loading,
**I want** these screens to match the swamp aesthetic,
**So that** every screen feels like part of the same game.

**Acceptance Criteria:**
- [ ] LoadingScreen uses swamp gradient background (not watercolor)
- [ ] Game over banner uses Frame9Slice or vine decoration
- [ ] Loading tips use IM Fell English SC header font

**Test plan:**
- [ ] Unit test: LoadingScreen renders with design token colors

**Files to modify:**
- `src/ui/LoadingScreen.tsx` — Update background
- `src/ui/game-over.tsx` — Verify design token usage

---

### US10: Multiplayer & Puzzle Screen Compliance
**As a** player in multiplayer or puzzle screens,
**I want** these screens to use the vine-frame system,
**So that** newer features don't look like they're from a different game.

**Acceptance Criteria:**
- [ ] MultiplayerMenu uses Frame9Slice wrapper
- [ ] MultiplayerLobby uses Frame9Slice wrapper
- [ ] PuzzleSelect uses Frame9Slice wrapper
- [ ] PuzzleComplete uses Frame9Slice wrapper
- [ ] EvacuationOverlay uses design tokens
- [ ] DisconnectOverlay uses design tokens

**Test plan:**
- [ ] Unit test: Each screen renders Frame9Slice
- [ ] Integration test: Multiplayer flow renders properly

**Files to modify:**
- `src/ui/screens/MultiplayerMenu.tsx`
- `src/ui/screens/MultiplayerLobby.tsx`
- `src/ui/screens/PuzzleSelect.tsx`
- `src/ui/screens/PuzzleComplete.tsx`
- `src/ui/evacuation-overlay.tsx`

---

### US11: HUD Polish
**As a** player during gameplay,
**I want** HUD elements to feel etched into wood,
**So that** the in-game interface matches the panel system.

**Acceptance Criteria:**
- [ ] Top bar has wood-grain background via SVG filter or CSS gradient
- [ ] Ctrl group buttons styled as rts-btn
- [ ] Advisor toast styled as vine-framed briefing card (not generic floating toast)
- [ ] Connection status indicator uses design tokens

**Test plan:**
- [ ] Unit test: AdvisorToast renders with correct styling classes
- [ ] Unit test: CtrlGroups buttons have rts-btn class

**Files to modify:**
- `src/ui/hud/top-bar.tsx` — Verify/add wood grain feel
- `src/ui/hud/ctrl-groups.tsx` — Style buttons
- `src/ui/hud/AdvisorToast.tsx` — Frame as briefing card
- `src/ui/hud/ConnectionStatus.tsx` — Verify design tokens

---

### US12: CSS Cleanup & Dead Code Removal
**As a** developer maintaining the codebase,
**I want** clean CSS without deprecated classes or dead PNG references,
**So that** the stylesheet is maintainable and reflects the actual design system.

**Acceptance Criteria:**
- [ ] All deprecated CSS classes marked with `/* DEPRECATED */` comment
- [ ] Old watercolor-specific animations removed (if unused)
- [ ] No hardcoded hex colors that should be CSS variables
- [ ] `.rts-btn` fully documented with variants
- [ ] Sprite animation keyframes documented

**Test plan:**
- [ ] Grep test: No hardcoded `#1A1208` or other old bark color in CSS
- [ ] Grep test: All color references use var(--pw-*) tokens

**Files to modify:**
- `src/styles/main.css` — Full cleanup pass

---

### US13: Documentation Update
**As a** developer joining the project,
**I want** updated documentation reflecting the design system,
**So that** I know how to build new UI that matches the brand.

**Acceptance Criteria:**
- [ ] AGENTS.md updated with Frame9Slice component system docs
- [ ] AGENTS.md documents design tokens import pattern
- [ ] AGENTS.md documents SVG sprite system
- [ ] docs/design-bible-implementation-plan.md marked as COMPLETE
- [ ] New UI components listed in file organization section

**Test plan:**
- [ ] Manual: AGENTS.md contains Frame9Slice section
- [ ] Manual: Design tokens documented

**Files to modify:**
- `AGENTS.md` — Add design system section
- `docs/design-bible-implementation-plan.md` — Mark complete

---

### US14: Comprehensive Visual Regression Tests
**As a** developer making future UI changes,
**I want** test coverage for the design system components,
**So that** visual regressions are caught before merge.

**Acceptance Criteria:**
- [ ] Frame9Slice renders with all 9 cells (corners, edges, center)
- [ ] Frame9Slice title prop renders in h2 element
- [ ] Frame9Slice isExpanded=false collapses center row
- [ ] SvgFilters renders 3 filter definitions
- [ ] SwampEcosystem mounts canvas element
- [ ] SpriteOtter/SpriteCroc/SpriteSnake render SVG with correct viewBox
- [ ] Design tokens export all expected color keys
- [ ] CenterPanel renders children inside grunge-filtered container

**Test plan:**
- [ ] New test file: `tests/ui/components/frame9slice.test.ts`
- [ ] New test file: `tests/ui/components/svg-filters.test.ts`
- [ ] New test file: `tests/ui/components/sprites.test.ts`
- [ ] New test file: `tests/ui/design-tokens.test.ts`

**Files to create:**
- `tests/ui/components/frame9slice.test.ts`
- `tests/ui/components/svg-filters.test.ts`
- `tests/ui/components/sprites.test.ts`
- `tests/ui/design-tokens.test.ts`

---

## Technical Requirements

### Architecture
- All UI panels use `Frame9Slice` from `@/ui/components/frame`
- Colors imported from `@/ui/design-tokens` (never hardcoded)
- SVG filters must be mounted via `<SvgFilters />` at app root (already done)
- Max 300 LOC per file (enforced by hook)

### Dependencies
- Google Fonts: IM Fell English SC, Open Sans (loaded via CSS @import)
- No new npm dependencies required

### Security
- No security implications (visual-only changes)

## Success Criteria

| Metric | Target |
|--------|--------|
| Design bible compliance | 100% |
| PNG panel asset references | 0 |
| Cinzel/MedievalSharp font references | 0 |
| Test coverage (new components) | 100% of acceptance criteria |
| All existing tests passing | 1385+ |
| Lint errors | 0 |
| Type errors | 0 |

## Implementation Plan

Execute as a single task batch with agent team:

| Order | Story | Dependencies | Estimated Files |
|-------|-------|-------------|-----------------|
| 1 | US14 (Tests) | None | 4 new test files |
| 2 | US6 (Typography) | None | 2 files |
| 3 | US7 (Deprecate PNGs) | None | 5+ files |
| 4 | US1 (Main Menu) | US6, US7 | 3 files |
| 5 | US2 (Menu Buttons) | US1 | 3 files |
| 6 | US3 (Command Panel) | US7 | 2 files |
| 7 | US4 (Tech Tree) | US7 | 1 file |
| 8 | US5 (Campaign) | US7 | 2 files |
| 9 | US8 (Intro) | US6 | 1 file |
| 10 | US9 (Game Over/Loading) | US6 | 2 files |
| 11 | US10 (MP/Puzzle) | US7 | 5 files |
| 12 | US11 (HUD) | US6 | 4 files |
| 13 | US12 (CSS Cleanup) | US3-US11 | 1 file |
| 14 | US13 (Docs) | All | 2 files |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Frame9Slice SVG filters slow on mobile | Performance regression | Profile on Android emulator via Maestro; add will-change hints |
| SwampEcosystem canvas uses too much GPU | Battery drain on mobile | Reduce firefly count on mobile; pause when tab hidden |
| Removing PNG fallbacks breaks older browsers | Visual regression | Keep PNG classes commented (not deleted) for emergency rollback |
| Large CSS diff causes merge conflicts | Development friction | Execute in single branch, commit atomically |
