# Design Spec: Accordion UI + Pond Asset Integration + Tech Tree Expansion

**Date:** 2026-04-01
**Status:** Approved

---

## 1. Accordion Component

### Design

Replace all tab-based navigation with a single reusable `PondAccordion` component. Each section has a collapsible header with summary text, using the `Button.png` asset as the header background. Lily pad decorative elements on expanded sections. Watercolor texture behind panel backgrounds.

### Component: `src/ui/components/PondAccordion.tsx`

```typescript
interface AccordionSection {
  key: string;
  title: string;          // Full descriptive label, never abbreviated
  summary?: string;       // Shown when collapsed (e.g., "3 idle, 8 total")
  icon?: string;          // Emoji or text icon
  defaultOpen?: boolean;  // Start expanded
}

interface PondAccordionProps {
  sections: AccordionSection[];
  children: ComponentChildren;  // One child per section
  allowMultiple?: boolean;      // Allow multiple sections open (default: true)
}
```

Layout:
- Section headers use `Button.png` as background (same as landing page MenuButton)
- Chevron (V / >) on the right indicates expand/collapse state
- Summary text shown right-aligned when collapsed
- Expanded sections have a subtle lily pad watermark in the corner (Lillypad-tiny.png at 5% opacity)
- Smooth height transition on expand/collapse (CSS max-height + ease-out)
- Touch targets: min 44px height per header
- Content area has light watercolor tint background

### CSS: `.pond-accordion` in `main.css`
- `.pond-accordion-header` — Button.png background, flex row, min-h-[44px]
- `.pond-accordion-content` — expandable, overflow hidden, max-height transition
- `.pond-accordion-summary` — right-aligned muted text on header
- `.pond-accordion-watermark` — absolute positioned lily pad at low opacity

---

## 2. UI Asset Integration

### Background Texture
All panels and modals get a subtle watercolor pond background derived from `Background.png`:
- `.pond-panel-bg` class: semi-transparent watercolor overlay behind content
- Applied to: CommandPanel, NewGameModal, SettingsOverlay, TechTreePanel

### Lily Pad Decorations
- Expanded accordion sections show `Lillypad-tiny.png` watermark
- Section dividers between accordion groups use a thin lily pad border pattern

### Water Ripple Transitions
- Panel open/close uses `Flowing_Serenity_Water Ripples 1.png` as a CSS mask-image transition
- Subtle, fast (200ms), not blocking

### Flower Accent
- `Flower.png` used as a decorative element in section headers that have special importance (e.g., Commander selection, active research)

---

## 3. Accordion Integration Points

### A. New Game Modal
Replace 5 tabs with scrollable accordion:

```
[Commander] (always open by default)
  Commander picker cards

[Map Settings]  summary: "Standard, Normal density"
  Scenario buttons + resource density

[Economy]  summary: "Normal starting resources"
  Starting resources, trade modifiers

[Enemies]  summary: "1 AI, Balanced"
  Enemy count, AI personality, evolution speed

[Rules]  summary: "Normal difficulty"
  Permadeath, peace timer, custom rules

[Presets]  (always visible, not collapsible)
  Easy / Normal / Hard / Nightmare / Ultra / Sandbox / Speedrun / Survival

[START GAME]  (always visible at bottom)
```

Commander is first and default-open because it's the most personal choice. Presets and Start Game are always visible outside the accordion.

### B. Command Panel (Sidebar)
Replace 4 tabs with accordion sections:

```
[Minimap]  (default open, collapsible)
  Minimap canvas + camera rect

[Forces]  summary: "3 idle, 12 total"
  Unit roster grouped by role

[Buildings]  summary: "Lodge, Armory, 2 Towers"
  Building list with queues

[Game Menu]  summary: ""
  Tech tree, save/load, settings, achievements
```

`allowMultiple: true` — multiple sections can be open simultaneously on desktop. On compact screens, opening one collapses others.

### C. Settings
Replace 5 tabs with scrollable accordion:

```
[Audio]  summary: "Master 75%"
  3 volume sliders

[Gameplay]  summary: "Speed 1x, Auto-save ON"
  Speed, auto-save toggle

[Accessibility]  summary: ""
  Color blind, UI scale, screen shake, reduce noise

[Advisors]  summary: "All enabled"
  Per-advisor toggles
```

### D. Tech Tree
Replace 2-branch tabs with 5-branch accordion (see Section 4).

---

## 4. Tech Tree Expansion: 2 Branches -> 5 Branches

### Current State
- Lodge/Nature: 9 techs (economy + support + utility mixed)
- Armory: 16 techs (offense + defense + siege + subterfuge mixed)

### New Structure: 5 Branches

Each branch has a clear strategic identity. Players can't research everything — choices matter.

#### Branch 1: Lodge (Economy & Expansion) — 5 techs
Researched at the Lodge building.

| Tech | Cost | Requires | Effect |
|------|------|----------|--------|
| Cartography | 100C 50T | — | Unlocks Scout Post, +25% fog reveal |
| Tidal Harvest | 100C 75T | — | Gatherers collect +25% resources |
| Trade Routes | 200C 150T | Cartography | +6 clams/5sec per Lodge |
| Deep Diving | 150C 100T | Tidal Harvest | Unlocks pearl gathering |
| Root Network | 200C 200T | Deep Diving | Gatherers share resource info (auto-path to richest node) |

#### Branch 2: Nature (Support & Healing) — 5 techs
Researched at the Lodge building.

| Tech | Cost | Requires | Effect |
|------|------|----------|--------|
| Herbal Medicine | 100C 75T | — | Unlocks Herbalist Hut, Healer unit |
| Aquatic Training | 150C 100T | Herbal Medicine | Unlocks Swimmer unit |
| Pond Blessing | 200C 150T | Herbal Medicine | Active: heal all units 20% HP |
| Tidal Surge | 300C 200T | Deep Diving (Lodge) | Active: push enemies back + slow |
| Regeneration | 250C 200T | Aquatic Training | All units passively regen 1 HP/5s |

#### Branch 3: Warfare (Offense & Damage) — 5 techs
Researched at the Armory building.

| Tech | Cost | Requires | Effect |
|------|------|----------|--------|
| Sharp Sticks | 100C 50T | — | All melee +15% damage |
| Eagle Eye | 200C 150T | Sharp Sticks | All ranged +20% range |
| Battle Roar | 150C 100T | Sharp Sticks | Units deal +10% damage when near Commander |
| Piercing Shot | 300C 200T | Eagle Eye | Snipers ignore 50% damage reduction |
| War Drums | 350C 250T | Battle Roar | +15% melee damage aura near Armory |

#### Branch 4: Fortifications (Defense & Siege) — 5 techs
Researched at the Armory building.

| Tech | Cost | Requires | Effect |
|------|------|----------|--------|
| Sturdy Mud | 100C 75T | — | All buildings +30% HP |
| Iron Shell | 200C 150T | Sharp Sticks (Warfare) | Unlocks Shieldbearer unit |
| Fortified Walls | 250C 200T | Sturdy Mud | Wall HP +100, walls slow enemies |
| Siege Works | 300C 250T | Eagle Eye (Warfare) | Unlocks Catapult unit |
| Hardened Shells | 400C 300T 50P | Eagle Eye (Warfare) | All units +15% damage resistance |

#### Branch 5: Shadow (Subterfuge & Control) — 5 techs
Researched at the Armory building.

| Tech | Cost | Requires | Effect |
|------|------|----------|--------|
| Swift Paws | 100C 50T | — | All units +10% movement speed |
| Cunning Traps | 150C 100T | Swift Paws | Unlocks Trapper unit |
| Rally Cry | 250C 200T | Swift Paws | Active: all units +30% speed 10s |
| Camouflage | 200C 150T | Cunning Traps | Trappers invisible when still |
| Venom Coating | 300C 200T | Cunning Traps | All melee apply 1 dmg/s poison 3s |

### Cross-Branch Dependencies
Some techs require techs from other branches, creating meaningful choice tension:
- Iron Shell (Fortifications) requires Sharp Sticks (Warfare)
- Siege Works (Fortifications) requires Eagle Eye (Warfare)
- Hardened Shells (Fortifications) requires Eagle Eye (Warfare)
- Tidal Surge (Nature) requires Deep Diving (Lodge)

This means a pure economy player can't get Tidal Surge without investing in Lodge. A pure defense player needs Warfare investment for advanced units.

### Tech Tree UI with Accordion
On compact screens, each branch is an accordion section:
```
[Lodge — Economy & Expansion]  summary: "2/5 researched"
  Tech cards in a vertical list with dependency arrows

[Nature — Support & Healing]  summary: "0/5"
  ...

[Warfare — Offense & Damage]  summary: "1/5"
  ...

[Fortifications — Defense & Siege]  summary: "0/5"
  ...

[Shadow — Subterfuge & Control]  summary: "0/5"
  ...
```

On desktop, branches can be displayed as columns side by side (same as current desktop layout but with 5 columns instead of 2).

### Migration
- `TechId` union type updated with new IDs
- `TECH_UPGRADES` map updated
- `tech-tree.ts` restructured into 5 branches
- `tree-data.ts` gets 5 node/edge arrays
- `world.tech` object gets new boolean fields
- Existing techs keep their IDs — no save migration needed for existing techs
- New tech: `regeneration` (Nature branch) — needs implementation in health system
- `Siege Engineering` removed (folded into Siege Works as cost increase)

---

## 5. Testing Strategy

- Unit tests for PondAccordion component (expand/collapse, multiple mode, summary display)
- Integration tests for each accordion surface (NewGame, CommandPanel, Settings, TechTree)
- Tech tree tests: verify 5 branches render, cross-branch dependencies work
- Balance test: verify all tech costs are defined and effects are wired
- Browser tests: accordion expand/collapse works on simulated viewports

---

## 6. File Changes Summary

### New Files
```
src/ui/components/PondAccordion.tsx      — reusable accordion
src/ui/components/PondAccordionSection.tsx — single section
tests/ui/PondAccordion.test.tsx          — accordion tests
```

### Modified Files
```
src/ui/panel/CommandPanel.tsx            — tabs -> accordion
src/ui/new-game-modal.tsx                — tabs -> accordion
src/ui/settings-panel.tsx                — tabs -> accordion
src/ui/tech-tree-panel.tsx               — 2 branches -> 5 accordion
src/ui/tech-tree/tree-data.ts            — 5 branch definitions
src/config/tech-tree.ts                  — 5 branches, new techs
src/ecs/world.ts                         — new tech booleans
src/ecs/world-defaults.ts                — defaults for new techs
src/styles/main.css                      — accordion CSS, pond asset backgrounds
```

### Deleted
```
src/ui/components/PondTabButton.tsx      — replaced by accordion
```
