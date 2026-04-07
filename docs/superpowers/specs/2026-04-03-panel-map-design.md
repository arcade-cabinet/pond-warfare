# 6-Panel Map System — Design Spec

## Vision

The game map is a 3×2 grid of panels. Each panel = one screen. New players see only panel 5 (bottom-center, Lodge). Progression unlocks panels outward, expanding the battlefield and introducing new resources, mechanics, and threats. Locked panels show impassable thorn vine walls. Fog of war operates independently on top.

---

## 1. Panel Grid Layout

```
┌─────┬─────┬─────┐
│  1  │  2  │  3  │  ← Top row (enemies, late game)
├─────┼─────┼─────┤
│  4  │  5  │  6  │  ← Bottom row (player territory)
└─────┴─────┴─────┘
         ↑
     Lodge here
```

Each panel = `viewportWidth × viewportHeight` in world pixels at base zoom. On a 960×540 effective viewport, each panel is 960×540. Full 6-panel map = 2880×1080 world units.

Panel dimensions MUST be computed from actual viewport size at game start, not hardcoded.

---

## 2. Progression Unlock Order

| Stage | Panels | Shape | New Mechanic | Resource Introduced |
|-------|--------|-------|-------------|-------------------|
| 1 | 5 | Single square | Micro basics | Fish |
| 2 | 5 + 2 | Vertical strip | Repair | Logs |
| 3 | 5 + 2 + (1 OR 3) | L-shape | Multi-directional enemies | More fish + logs |
| 4 | 5 + 2 + 1 + 3 | T-shape | 3 enemy spawns, intense pressure | Abundance |
| 5 | T + (4 OR 6) | T + side | Flanking → fortifications needed | Rocks |
| 6 | All 6 | Full grid | All threats, all strategies | Everything + rare |

- 50/50 PRNG per seed for stages 3 and 5 (which side unlocks first)
- Panel unlocks are diamond nodes in the upgrade web: "Frontier Expansion I-V"
- Each expansion is a permanent unlock (persists across matches, resets on prestige)

---

## 3. Terrain & Resources per Panel

| Panel | Biome | Resources | Terrain Features | Enemy Spawns |
|-------|-------|-----------|-----------------|-------------|
| **5** | Grassland clearing | Fish (shallow water nodes) | Clear paths, Lodge at center-bottom, open area for early game | Enemies from top edge of panel 5 (stage 1 only) |
| **2** | Muddy forest | Log groves (tree clusters) | Mud terrain (0.75x speed), tree cover, natural paths | Enemy spawn point at top |
| **1** | Rocky marsh | Fish + logs + high ground | Rocky ridges, chokepoints, elevated positions (+15% damage) | Enemy spawn (second or third) |
| **3** | Flooded swamp | Fish + logs + deep water | Water channels, shallows, limited crossings | Enemy spawn (second or third) |
| **4** | Stone quarry | Rock deposits | Heavy rock terrain, narrow corridors, natural choke funnels | Flanking route from side |
| **6** | Dense thicket | Rocks + logs | Dense terrain, vision-blocking groves, ambush territory | Flanking route from side |

**Rare nodes**: Prestige unlock. Map generator scatters them on active panels. Provide early access to resources normally gated behind panel expansion.

---

## 4. Locked Panel Visualization

- **Thorn vine walls**: Dense impassable barrier using the design bible vine aesthetic
- Visual: dark murky green with thick thorny vine silhouettes, matching the SVG vine strokes from the reference JSX
- Completely impassable — units, projectiles, and vision stop at the thorn wall
- When a panel unlocks: thorn wall recedes (animation: vines pull back over 2-3 seconds)
- Behind the receded thorns: fog of war (black). Player must send Scout to reveal.

---

## 5. Camera & Viewport

- **Default**: Panel 5 fills the entire screen. Zero scrolling for new players.
- **Zoom out**: Pinch-zoom to see adjacent unlocked panels. Min zoom = all unlocked panels visible.
- **Zoom in**: Max zoom = panel 5 fills screen (base zoom level).
- **Pan**: Drag to any unlocked panel. Cannot pan into thorn wall area.
- **Camera follow**: Tapping a unit smoothly pans camera to it. No forced auto-scroll.
- **No minimap**: At max zoom-out, the entire battlefield is visible. Minimap is redundant.

---

## 6. What Gets Cut

| Item | Reason |
|------|--------|
| Minimap canvas + refs | Viewport IS the map at zoom-out |
| Airdrop button + mechanic | Doesn't fit v3 design. If revived, it should align with specialist blueprint/radius systems rather than free prestige auto-deploy |
| Ability bar (Rally Cry, Pond Blessing, Tidal Surge) | Old tech-tree abilities. Commander abilities become prestige unlocks |
| Old terrain generator (random noise) | Replaced by panel-aware biome generation |
| Hardcoded map dimensions in terrain.json | Replaced by viewport-computed panel sizing |

---

## 7. What Changes

| File | Change |
|------|--------|
| `vertical-map.ts` | Rewrite: generate panels not a rectangle. Panel-aware terrain per biome. Thorn wall fill for locked panels. |
| `camera.ts` | Rewrite zoom/pan: panel-aware clamping, pinch-zoom, default to panel 5 |
| `app.tsx` | Remove minimap refs, airdrop button, ability bar. onMount without minimap. |
| `terrain.json` | Replace map dimensions with panel_count progression tiers |
| `upgrades.json` | Add "Frontier Expansion I-V" diamond nodes |
| `spawn-vertical.ts` | Place entities per panel based on which panels are unlocked |
| `configs/panels.json` | NEW: panel biome definitions, resource placement rules, enemy spawn points |

---

## 8. SVG Reference Integration

- **Landing/menu screens**: Mount SVG animated sprites (SpriteOtter, SpriteCroc, SpriteSnake) as animated showcase on the main menu
- **In-game rendering**: PixiJS pixel art stays (correct for RTS gameplay)
- **Radial menu**: Text labels with design token styling (not SVG sprites)
- **Frame9Slice vine borders**: Continue wrapping all UI screens (upgrade web, settings, rewards, etc.)

---

## 9. Testing Requirements

- Panel computation from viewport dimensions at 375×667, 960×540, 1920×1080
- Panel unlock progression (all 6 stages)
- Thorn wall impassability
- Camera zoom bounds per unlock stage
- Entity spawning per panel (correct resources per biome)
- Fog of war operates independently from thorn walls
- Rare node spawning with prestige unlock
- E2E: tap PLAY → see panel 5 → Lodge at bottom → units visible → zoom out shows thorn walls
