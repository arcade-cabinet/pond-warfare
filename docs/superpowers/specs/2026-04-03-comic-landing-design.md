# Comic Panel Landing Page — Design Spec

## Vision

The main menu is a vertical comic book page. Three hero panels stacked, alternating left/right. Each panel features an SVG animated character with a speech bubble containing a game action button. The design bible's vine frames, grunge filters, and procedural textures style every element as a weathered war-comic page.

**Design philosophy:** "The menu IS the brand. Every screen is a panel in the Pond Warfare comic."

---

## 1. Layout — Three Comic Panels

```
┌─ TITLE BAR ──────────────────────────────┐
│           P O N D   W A R F A R E        │
│          (vine-wrapped, grunge filter)    │
└──────────────────────────────────────────┘

┌─ PANEL 1 ────────────────────────────────┐
│  ┌──────┐    ╭─────────────────────╮     │
│  │🦦    │◄───│ "Ready for battle?" │     │
│  │Otter │    │     [ P L A Y ]     │     │
│  │(left)│    ╰─────────────────────╯     │
│  └──────┘                                │
│  (vine frame border, swamp bg tint)      │
└──────────────────────────────────────────┘

┌─ PANEL 2 ────────────────────────────────┐
│     ╭─────────────────────╮  ┌──────┐    │
│     │  "Power up, soldier" │──►│🐊   │    │
│     │   [ UPGRADES ]      │  │Croc  │    │
│     ╰─────────────────────╯  │(right│    │
│                               └──────┘    │
│  (vine frame border, darker tint)        │
└──────────────────────────────────────────┘

┌─ PANEL 3 ────────────────────────────────┐
│  ┌──────┐    ╭─────────────────────╮     │
│  │🐍    │◄───│ "Adjust your gear"  │     │
│  │Snake │    │   [ SETTINGS ]      │     │
│  │(left)│    ╰─────────────────────╯     │
│  └──────┘                                │
│  (vine frame border, foggy tint)         │
└──────────────────────────────────────────┘

┌─ FOOTER ─────────────────────────────────┐
│  v3.0 · Defend the Pond                  │
└──────────────────────────────────────────┘
```

---

## 2. Comic Panel Component

Each panel is a `ComicPanel` component:

- **Frame**: Frame9Slice vine border (existing component) but with rougher edges — apply `filter: url(#grunge-heavy)` to the border SVGs for inked-edge feel
- **Background**: Subtle biome tint per panel (swamp green, dark marsh, foggy grey) using the existing `bgPanel` token + biome overlay
- **Character**: SVG animated sprite (SpriteOtter / SpriteCroc / SpriteSnake) at 120-160px, positioned left or right
- **Speech bubble**: SVG shape with:
  - Wood-grain interior (bgPanel color + grunge filter)
  - Gold border stroke (grittyGold)
  - Pointed tail arrow aimed at the character
  - Quote text in IM Fell English SC (FONTS.header)
  - Action button (rts-btn) inside the bubble
- **Alternation**: Panel 1 = character left, bubble right. Panel 2 = character right, bubble left. Panel 3 = character left, bubble right.

---

## 3. Speech Bubble SVG

Procedural SVG speech bubble with:
- Rounded rectangle body with organic wobble (not perfect rect)
- Triangular tail/arrow pointing toward the character
- Fill: COLORS.bgPanel with grunge-heavy filter
- Stroke: COLORS.grittyGold, 2px
- Interior padding for text + button

The tail direction flips based on character side (left character → tail points left, right character → tail points right).

---

## 4. Character Poses

- **Otter (Panel 1)**: Idle pose facing right. Bandana, assault rifle at ready. Selection circle spinning below.
- **Croc (Panel 2)**: Idle pose facing left (mirror the SVG). Gatling cannon mounted. Slightly larger (1.2x) for heavy feel.
- **Snake (Panel 3)**: Idle pose facing right. Coiled with cyber goggle red eye. Laser rifle on back.

Characters use existing SpriteOtter/SpriteCroc/SpriteSnake with CSS sprite-frame animation playing.

---

## 5. Responsive Behavior

- **Desktop (>768px)**: Full comic layout as shown. Characters 140px, bubbles 250px wide.
- **Mobile landscape (>480px)**: Tighter spacing. Characters 100px, bubbles 200px.
- **Mobile portrait (<480px)**: Stack vertically, characters 80px, bubbles full width. Still alternating sides but more compact.

---

## 6. Title Treatment

"POND WARFARE" at top:
- Vine decoration behind/around the text (existing TitleVines component or enhanced)
- IM Fell English SC font
- "POND" in mossGreen, "WARFARE" in grittyGold
- Heavy text shadow for comic-book impact
- Optional: apply grunge-heavy filter to title for weathered ink feel

---

## 7. Additional Buttons

If prestige rank > 0, Panel 2 (Croc) gets a second smaller bubble below: "Spend your pearls" [PRESTIGE]

Continue button (if save exists) appears as a small speech bubble attached to the Otter panel: "Welcome back" [CONTINUE]

---

## 8. Implementation

### New files:
- `src/ui/comic-panel.tsx` — ComicPanel component (frame + character + bubble)
- `src/ui/speech-bubble.tsx` — SVG speech bubble with tail
- `src/ui/comic-landing.tsx` — Full landing page assembling 3 panels

### Modified files:
- `src/ui/main-menu.tsx` — Replace current button layout with ComicLanding
- `src/ui/menu-sprites.tsx` — May be absorbed into comic-panel.tsx

### Existing components reused:
- Frame9Slice (vine border for panels)
- SpriteOtter, SpriteCroc, SpriteSnake (characters)
- SvgFilters (grunge-heavy filter)
- SwampEcosystem (fog + fireflies behind panels)
- Design tokens (COLORS, FONTS)
- rts-btn (buttons inside bubbles)

---

## 9. Testing

- Comic landing renders 3 panels with correct characters (Otter/Croc/Snake)
- Speech bubbles contain correct buttons (PLAY/UPGRADES/SETTINGS)
- Character alternation: left/right/left
- Responsive: panels stack properly at mobile widths
- PLAY button starts game
- UPGRADES button opens upgrade web
- SETTINGS button opens settings overlay
- Prestige button appears only when rank > 0
- Continue button appears only when save exists
