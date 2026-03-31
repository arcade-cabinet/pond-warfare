# Responsive Modals — Design Reference

## Problem statement

Two independent issues were addressed:

1. **Viewport scaling** — modals used fixed `90vh` / `95vh` max-heights.  
   On mobile browsers the *visible* viewport shrinks when the address bar or
   navigation chrome is visible, causing modal cards to be cut off or overflow.

2. **Drag-to-scroll** — scrollable modal content could only be scrolled with a
   mouse wheel or native touch scroll. There was no *click-and-drag* scroll
   support for mouse/pen input.

3. **`touch-action` inheritance** — all in-game modal overlays were rendered
   *inside* `#game-container`, which carries `touch-action: none`.  
   Per the [W3C Pointer Events spec][spec], `touch-action` is computed by
   *intersecting* an element's own value with every ancestor's value. Any
   descendant of a `touch-action: none` element therefore inherits `none`,
   which disabled native touch scrolling inside all in-game modals
   regardless of what `overflow-y: auto` or `touch-action: pan-y` was set on
   the modal's inner elements.

[spec]: https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property

---

## Architectural fix — modals as siblings of `#game-container`

`src/ui/app.tsx` was updated so that all in-game modal overlay components
(`TechTreePanel`, `SettingsOverlay`, `KeyboardReference`, `AchievementsPanel`,
`LeaderboardPanel`, `UnlocksPanel`, `CosmeticsPanel`) are rendered as **siblings**
of `#game-container`, not children.

```
<div class="relative h-screen w-screen …">   ← root, no touch-action
  <div id="game-container" …>               ← touch-action: none (for game canvas)
    <canvas id="game-canvas" />
    … HUD elements, objective tracker, etc.
  </div>

  {/* ← Modals are HERE, outside #game-container */}
  {techTreeOpen && <TechTreePanel />}
  <SettingsOverlay />
  …
</div>
```

Modal overlays are `absolute inset-0 z-[60]` so they still cover the full
viewport visually. Moving them outside `#game-container` means:

- Touch scroll works because there is no `touch-action: none` ancestor.
- Pointer events on modals do **not** leak through to the game canvas —
  the z-index stack ensures modal events are consumed before they reach
  `#game-container`'s handlers.

Menu-screen modals (rendered inside the `menuState === 'main'` branch) were
always outside `#game-container` and were unaffected.

---

## CSS classes — `src/styles/main.css`

Four utility classes were added at the end of `main.css`:

| Class | Use | Key properties |
|---|---|---|
| `.modal-overlay` | Outermost backdrop div | `touch-action: pan-y` |
| `.modal-scroll` | Scrollable panel card (most modals, 90 % height) | `overflow-y: auto`, `overscroll-behavior: contain`, `touch-action: pan-y`, `max-height: 90dvh` with `90vh` fallback |
| `.modal-scroll-lg` | Larger panel card (95 % height) | Same as above at 95 dvh / 95 vh |
| `.modal-scroll-both` | Two-axis panel (Tech Tree) | `overflow: auto`, `touch-action: pan-x pan-y`, `max-height: 95dvh` with fallback |

### `dvh` — Dynamic Viewport Height

`dvh` is the "dynamic" variant of `vh`. It equals the *visible* viewport height
after the browser subtracts its own chrome (address bar, navigation bar). Two
CSS declarations are used for graceful degradation:

```css
.modal-scroll {
  max-height: 90vh;    /* fallback: older browsers that don't know dvh */
  max-height: 90dvh;   /* preferred: overrides the line above in capable browsers */
}
```

Browsers that do not understand `dvh` simply ignore the second declaration and
use `90vh`. Browser support: Chrome 108 (Nov 2022), Firefox 101 (May 2022),
Safari 15.4 (March 2022).

---

## `useScrollDrag` hook — `src/ui/hooks/useScrollDrag.ts`

A lightweight Preact hook that adds **pointer drag-to-scroll** to any scrollable
container.

```typescript
const scrollRef = useScrollDrag<HTMLDivElement>();
return <div ref={scrollRef} class="overflow-y-auto">…long content…</div>;
```

### Behaviour

| Pointer type | Behaviour |
|---|---|
| `mouse` / `pen` (primary button) | Click-and-drag scrolls the container (both axes). |
| `touch` | Ignored — native touch scroll via `touch-action` handles it with momentum. |
| Non-primary button | Ignored. |

**Dead zone**: the hook only activates drag mode after the pointer moves more
than 6 px (`DRAG_THRESHOLD`). This prevents mis-fires when the user simply
clicks a button inside the modal.

**Event listeners**: `pointerdown`, `pointermove`, `pointerup`, `pointercancel`
are added with `{ passive: true }` where possible. Only `pointermove` is
`passive: false` (needed to call `preventDefault()` to suppress text selection
during a drag).

### Where it is applied

All nine modal panels import and use `useScrollDrag`:

- `SettingsPanel` — panel card
- `NewGameModal` — panel card
- `TechTreePanel` — full-screen scroll container
- `AchievementsPanel` — panel card
- `LeaderboardPanel` — panel card
- `UnlocksPanel` — panel card
- `KeyboardReference` — panel card
- `CosmeticsPanel` — panel card
- `CampaignPanel` — both the mission-select view and the briefing view

---

## Campaign panel overflow fix

The `CampaignPanel` component previously used `justify-center` on a full-screen
div without any scroll. On small screens the mission list or briefing text
could be clipped.

Both views were updated to use a scrollable outer container with a
`min-h-full` inner wrapper, so content centres on large screens and scrolls
on small ones:

```tsx
{/* Outer — scrollable */}
<div class="absolute inset-0 z-50 overflow-y-auto modal-overlay" …>
  {/* Inner — centres content, pads top/bottom */}
  <div class="min-h-full flex flex-col items-center justify-center py-8 px-4">
    …content…
  </div>
</div>
```

---

## Testing

New unit tests in `tests/ui/modals/responsive.test.ts` cover:

1. **`useScrollDrag` behaviour** (8 tests)
   - Vertical drag scrolls `scrollTop`
   - Horizontal drag scrolls `scrollLeft`
   - Dead zone prevents false positives on clicks
   - Touch `pointerType` is ignored
   - Non-primary button is ignored
   - `pointerup` stops drag
   - `pointercancel` stops drag
   - Foreign `pointerId` events are ignored

2. **CSS class conventions** (11 tests)
   - Every modal file contains the expected `modal-overlay` / `modal-scroll*`
     class strings (static source inspection)
   - Every modal file imports `useScrollDrag`
