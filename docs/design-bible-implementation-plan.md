> **STATUS: SUPERSEDED BY v3** (2026-04-02)
> This plan was completed for the v2 design bible pass. The v3 rearchitecture
> replaced many referenced systems (tech tree, campaigns, etc.). See AGENTS.md
> and docs/gameplay.md for current v3 architecture. The design bible visual
> identity (9-slice panels, typography, color palette) remains valid.

# Design Bible Implementation Plan (v2 -- Historical)

## Source Material

Three reference images at `docs/brand/`:
1. **Brand identity** -- logo, vine frame, action scene, app icon
2. **9-slice accordion** -- full panel mockup + tileable piece breakdown
3. **Design bible rules** -- typography, colors, asset guidelines

## What the Design Bible Requires

### Surfaces
- ALL panels: 9-slice wood plank with vine/moss borders
- ALL content areas: dark muddy/bark interior
- ALL headers: weathered wood strip with text
- ALL modals: same wood panel treatment

### Typography
- Headers: Rugged serif (the game uses custom vine font for title -- reference only)
- Menu/UI text: Open Sans or similar sans-serif
- Colors: Gritty Gold for headers, Weathered Steel for body, Mossy Green for accents

### Color Palette
- Gritty Gold: warm brown-gold for important elements
- Mossy Green: dark green for vine/nature accents
- Weathered Steel: grey-blue for secondary text
- Dark Bark: near-black brown for deepest backgrounds
- Mud Brown: medium brown for surfaces

### Icons
- Bold, simple silhouettes
- Weathered colors (gritty gold + green)
- No pure vectors -- textured appearance

### Design Ethos
"MAINTAIN THE GRIT. Every asset must feel functional and weathered, never clean. Balance modularity with complexity."

## Asset Requirements

### 9-Slice Panel Pieces (MUST MATCH REFERENCE ART)
The reference shows specific artistic elements that procedural generation cannot replicate:
- Corner pieces with specific vine curl patterns and decorative shells/bolts
- Edge pieces with specific leaf/vine overlays
- Center with specific worn texture pattern

### Button Assets
- Wood plank button (normal + pressed + disabled states)
- Must match the accordion header wood grain style

### Landing Page
- Should use the brand art style (vine-wrapped title, swamp background)
- The brand art shows the correct landing page design

### In-Game HUD
- Top bar: wood strip
- Minimap frame: vine-wrapped border
- Event feed: scratched wood background
- Resource counters: etched into wood

## Implementation Order

1. **Get proper 9-slice assets** -- this is the blocker. Need high-quality tiles.
2. **CSS 9-slice system** -- border-image or background tiling
3. **Landing page retheme** -- replace watercolor with swamp/vine aesthetic
4. **Panel/accordion retheme** -- apply 9-slice to all panels
5. **Button retheme** -- wood plank buttons everywhere
6. **HUD retheme** -- top bar, minimap frame
7. **Modal retheme** -- all overlays get wood treatment
8. **Typography** -- apply font rules from design bible
9. **Icon style** -- bold silhouettes with weathered colors
