# POC Reference Chunks

The original `pond_craft.html` (1,926 lines) broken into 18 logical chunks for review. Each file has a header comment explaining what it contains and where it was ported in the modern TypeScript project.

## File Map

| # | File | Lines | Description | Ported To |
|---|------|-------|-------------|-----------|
| 01 | `01-styles.html` | 1-77 | CSS: canvas layering, UI theme, animations | `src/styles/main.css` |
| 02 | `02-html-layout.html` | 79-165 | HTML: full game layout, sidebar, HUD, overlays | `src/ui/*.tsx` |
| 03 | `03-constants-palette.js` | 168-190 | TILE_SIZE, PALETTE, TIME_STOPS | `src/constants.ts` |
| 04 | `04-audio-system.js` | 192-232 | Web Audio API, 15 synthesized SFX | `src/audio/audio-system.ts` |
| 05 | `05-sprite-generator.js` | 234-311 | Procedural pixel art for 14 entity types | `src/rendering/sprites.ts` |
| 06 | `06-projectile-class.js` | 313-344 | Homing projectile with trail | `src/ecs/systems/projectile.ts` |
| 07 | `07-game-state-init.js` | 346-471 | GAME object, state, init, entity spawning | `src/ecs/world.ts`, `src/game.ts` |
| 08 | `08-game-utilities.js` | 473-549 | Speed, idle worker, army, ping, shake, map gen | `src/input/selection.ts`, `src/rendering/background.ts` |
| 09 | `09-input-handling.js` | 550-787 | Keyboard, pointer, touch, minimap input | `src/input/keyboard.ts`, `src/input/pointer.ts` |
| 10 | `10-selection-commands.js` | 788-868 | Entity picking, context commands, placement | `src/input/selection.ts` |
| 11 | `11-ui-update.js` | 870-1064 | updateUI, action panel, tech upgrades, queue | `src/ui/action-panel.tsx`, `src/ui/selection-panel.tsx` |
| 12 | `12-game-actions.js` | 1066-1133 | placeBuilding, train, cancelTrain, gameOver, color lerp | `src/input/selection.ts`, `src/game.ts` |
| 13 | `13-game-loop.js` | 1135-1327 | Game loop, updateLogic (all per-frame systems) | `src/game.ts`, all `src/ecs/systems/*.ts` |
| 14 | `14-draw-rendering.js` | 1329-1503 | Full rendering pipeline (15 stages) | `src/rendering/*.ts` |
| 15 | `15-entity-class.js` | 1505-1571 | Entity constructor + takeDamage | `src/ecs/archetypes.ts`, `src/ecs/systems/health.ts` |
| 16 | `16-entity-update.js` | 1573-1771 | Entity.update() → 12 ECS systems | `src/ecs/systems/*.ts` |
| 17 | `17-entity-arrive-commands.js` | 1774-1807 | arrive() state transitions + cmd* methods | `src/ecs/systems/movement.ts` |
| 18 | `18-entity-die-draw.js` | 1809-1926 | die() + draw() (entity rendering) | `src/ecs/systems/health.ts`, `src/rendering/game-renderer.ts` |

## How to Review

Each chunk can be compared side-by-side with its ported TypeScript equivalent. The header comment in each file lists the exact line range from the original and the target file(s) in the modernized project.
