/**
 * Browser Building Tests -- Every building type, construction, destruction, special effects
 *
 * Runs in a REAL browser via vitest browser mode + Playwright.
 * Validates every building's HP, placement, construction progress, special
 * effects (food provided, auto-attack, healing), destruction, costs, multi-builder
 * speedup, Lodge loss game-over, and Tower targeting.
 *
 * Run with: pnpm test:browser
 */

import { render } from 'preact';
import { page } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hasComponent, query } from 'bitecs';
import {
  Building,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  TowerAI,
  TrainingQueue,
  UnitStateMachine,
  trainingQueueSlots,
} from '@/ecs/components';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { BUILD_TIMER } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';
import { EntityKind, Faction, UnitState } from '@/types';
import { takeDamage } from '@/ecs/systems/health';

// ---------------------------------------------------------------------------
// Helpers (same pattern as gameplay-loops.test.tsx)
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function firePointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
  button = 0,
  opts: Partial<PointerEventInit> = {},
) {
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX, clientY,
    button, pointerId: 1, pointerType: 'mouse', ...opts,
  }));
}

function worldToScreen(wx: number, wy: number) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const w = game.world;
  return { x: rect.left + (wx - w.camX) * w.zoomLevel, y: rect.top + (wy - w.camY) * w.zoomLevel };
}

function clickWorld(wx: number, wy: number, button = 0) {
  const { x, y } = worldToScreen(wx, wy);
  const c = document.getElementById('game-container')!;
  firePointer(c, 'pointerdown', x, y, button);
  firePointer(c, 'pointerup', x, y, button);
}

function clickButton(text: string): boolean {
  const btn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(text) && !b.disabled,
  );
  if (btn) { btn.click(); return true; }
  return false;
}

function getUnits(kind?: EntityKind, faction = Faction.Player) {
  return Array.from(query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag])).filter((eid) =>
    FactionTag.faction[eid] === faction && Health.current[eid] > 0 &&
    (kind === undefined || EntityTypeTag.kind[eid] === kind),
  );
}

async function waitFrames(n: number) {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < n) await delay(16);
}

async function selectEntity(eid: number) {
  clickWorld(Position.x[eid], Position.y[eid], 0);
  await delay(150);
}

/** Spawn a building at full progress (complete) for stat verification tests. */
function spawnCompleteBuilding(kind: EntityKind, x: number, y: number, faction = Faction.Player): number {
  const eid = spawnEntity(game.world, kind, x, y, faction);
  Building.progress[eid] = 100;
  Health.current[eid] = Health.max[eid];
  return eid;
}

/** Spawn a building at initial construction state (progress 1, HP 1). */
function spawnIncompleteBuilding(kind: EntityKind, x: number, y: number): number {
  const eid = spawnEntity(game.world, kind, x, y, Faction.Player);
  // spawnEntity already sets progress=1 and HP=1 for non-Lodge player buildings
  return eid;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function mountGame() {
  let root = document.getElementById('app');
  if (!root) { root = document.createElement('div'); root.id = 'app'; document.body.appendChild(root); }
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden';

  const ready = new Promise<void>((resolve) => {
    render(<App onMount={async (refs) => {
      await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);
      resolve();
    }} />, root!);
  });

  await delay(500);
  clickButton('New Game');
  await delay(500);
  clickButton('START');
  await ready;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Buildings: stats, placement, construction, effects, destruction', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(4500); // intro fade
    game.world.gameSpeed = 3;
    // Give plenty of resources so building tests never stall on costs
    game.world.resources.fish = 50000;
    game.world.resources.logs = 50000;
    game.world.resources.rocks = 5000;
    game.world.resources.maxFood = 200;
  }, 30_000);

  // ========================================================================
  // 1. Lodge -- 1500 HP, provides +8 food, trains Gatherer/Scout
  // ========================================================================

  describe('1. Lodge', () => {
    it('Lodge HP matches entity-defs (1500)', () => {
      const def = ENTITY_DEFS[EntityKind.Lodge];
      expect(def.hp).toBe(1500);

      // Verify the starting Lodge entity's max HP matches (without sturdyMud)
      const lodges = getUnits(EntityKind.Lodge);
      expect(lodges.length).toBeGreaterThanOrEqual(1);
      const lodge = lodges[0];
      // Lodge is spawned at full progress; HP should equal base hp
      // (sturdyMud tech is false by default)
      expect(Health.max[lodge]).toBe(1500);
    });

    it('Lodge provides +8 food', () => {
      const def = ENTITY_DEFS[EntityKind.Lodge];
      expect(def.foodProvided).toBe(8);
    });

    it('Lodge has training queue (can train Gatherer/Scout)', () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      expect(hasComponent(game.world.ecs, lodge, TrainingQueue)).toBe(true);
    });
  });

  // ========================================================================
  // 2. Burrow -- 300 HP, provides +6 food, no training
  // ========================================================================

  describe('2. Burrow', () => {
    it('Burrow HP matches entity-defs (300)', () => {
      const def = ENTITY_DEFS[EntityKind.Burrow];
      expect(def.hp).toBe(300);
    });

    it('Burrow provides +6 food', () => {
      const def = ENTITY_DEFS[EntityKind.Burrow];
      expect(def.foodProvided).toBe(6);
    });

    it('Burrow placement creates entity', () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const lx = Position.x[lodge];
      const ly = Position.y[lodge];

      const before = getUnits(EntityKind.Burrow).length;
      spawnIncompleteBuilding(EntityKind.Burrow, lx + 150, ly + 150);
      const after = getUnits(EntityKind.Burrow).length;
      expect(after).toBe(before + 1);
    });
  });

  // ========================================================================
  // 3. Armory -- 500 HP, trains Brawler/Sniper/Healer/Shieldbearer/Catapult/Trapper
  // ========================================================================

  describe('3. Armory', () => {
    it('Armory HP matches entity-defs (500)', () => {
      const def = ENTITY_DEFS[EntityKind.Armory];
      expect(def.hp).toBe(500);
    });

    it('Armory has training queue', () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const armoryEid = spawnCompleteBuilding(EntityKind.Armory, Position.x[lodge] + 200, Position.y[lodge]);
      expect(hasComponent(game.world.ecs, armoryEid, TrainingQueue)).toBe(true);
    });
  });

  // ========================================================================
  // 4. Tower -- 500 HP, auto-attacks within 200px range, 10 damage
  // ========================================================================

  describe('4. Tower', () => {
    it('Tower HP matches entity-defs (500)', () => {
      const def = ENTITY_DEFS[EntityKind.Tower];
      expect(def.hp).toBe(500);
    });

    it('Tower has TowerAI and Combat components', () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const towerEid = spawnCompleteBuilding(EntityKind.Tower, Position.x[lodge] - 150, Position.y[lodge]);
      expect(hasComponent(game.world.ecs, towerEid, TowerAI)).toBe(true);
      expect(hasComponent(game.world.ecs, towerEid, Combat)).toBe(true);
    });

    it('Tower attack range is 200 and damage is 10', () => {
      const def = ENTITY_DEFS[EntityKind.Tower];
      expect(def.attackRange).toBe(200);
      expect(def.damage).toBe(10);
    });
  });

  // ========================================================================
  // 5. Watchtower -- 800 HP, 280px range, 15 damage
  // ========================================================================

  describe('5. Watchtower', () => {
    it('Watchtower HP matches entity-defs (800)', () => {
      const def = ENTITY_DEFS[EntityKind.Watchtower];
      expect(def.hp).toBe(800);
    });

    it('Watchtower has TowerAI and 280 range, 15 damage', () => {
      const def = ENTITY_DEFS[EntityKind.Watchtower];
      expect(def.attackRange).toBe(280);
      expect(def.damage).toBe(15);

      const lodge = getUnits(EntityKind.Lodge)[0];
      const wtEid = spawnCompleteBuilding(EntityKind.Watchtower, Position.x[lodge] + 250, Position.y[lodge] - 100);
      expect(hasComponent(game.world.ecs, wtEid, TowerAI)).toBe(true);
      expect(Combat.attackRange[wtEid]).toBe(280);
      expect(Combat.damage[wtEid]).toBe(15);
    });
  });

  // ========================================================================
  // 6. Wall -- 400 HP, blocks movement
  // ========================================================================

  describe('6. Wall', () => {
    it('Wall HP matches entity-defs (400)', () => {
      const def = ENTITY_DEFS[EntityKind.Wall];
      expect(def.hp).toBe(400);
    });

    it('Wall is a building with no damage and no range', () => {
      const def = ENTITY_DEFS[EntityKind.Wall];
      expect(def.isBuilding).toBe(true);
      expect(def.damage).toBe(0);
      expect(def.attackRange).toBe(0);
    });
  });

  // ========================================================================
  // 7. ScoutPost -- 200 HP
  // ========================================================================

  describe('7. ScoutPost', () => {
    it('ScoutPost HP matches entity-defs (200)', () => {
      const def = ENTITY_DEFS[EntityKind.ScoutPost];
      expect(def.hp).toBe(200);
    });

    it('ScoutPost placement creates entity', () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const before = getUnits(EntityKind.ScoutPost).length;
      spawnIncompleteBuilding(EntityKind.ScoutPost, Position.x[lodge] - 200, Position.y[lodge] + 200);
      const after = getUnits(EntityKind.ScoutPost).length;
      expect(after).toBe(before + 1);
    });
  });

  // ========================================================================
  // 8. FishingHut -- 250 HP, provides +2 food
  // ========================================================================

  describe('8. FishingHut', () => {
    it('FishingHut HP matches entity-defs (250)', () => {
      const def = ENTITY_DEFS[EntityKind.FishingHut];
      expect(def.hp).toBe(250);
    });

    it('FishingHut provides +2 food', () => {
      const def = ENTITY_DEFS[EntityKind.FishingHut];
      expect(def.foodProvided).toBe(2);
    });
  });

  // ========================================================================
  // 9. HerbalistHut -- 300 HP, heals nearby units
  // ========================================================================

  describe('9. HerbalistHut', () => {
    it('HerbalistHut HP matches entity-defs (300)', () => {
      const def = ENTITY_DEFS[EntityKind.HerbalistHut];
      expect(def.hp).toBe(300);
    });

    it('HerbalistHut heals nearby wounded units over time', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const hx = Position.x[lodge] + 100;
      const hy = Position.y[lodge] + 250;

      // Spawn a complete HerbalistHut
      spawnCompleteBuilding(EntityKind.HerbalistHut, hx, hy);

      // Spawn a wounded player unit within 150px of the hut
      const woundedEid = spawnEntity(game.world, EntityKind.Brawler, hx + 30, hy + 30, Faction.Player);
      const maxHp = Health.max[woundedEid];
      Health.current[woundedEid] = Math.floor(maxHp * 0.5);
      const hpBefore = Health.current[woundedEid];

      // HerbalistHut heals every 120 frames; wait for several ticks
      await waitFrames(360);

      expect(Health.current[woundedEid]).toBeGreaterThan(hpBefore);
      await page.screenshot({ path: 'tests/browser/screenshots/bld-09-herbalist-heal.png' });
    });
  });

  // ========================================================================
  // 10. PredatorNest (enemy) -- 1000 HP, trains enemy units
  // ========================================================================

  describe('10. PredatorNest', () => {
    it('PredatorNest HP matches entity-defs (1000)', () => {
      const def = ENTITY_DEFS[EntityKind.PredatorNest];
      expect(def.hp).toBe(1000);
    });

    it('PredatorNest is a building', () => {
      const def = ENTITY_DEFS[EntityKind.PredatorNest];
      expect(def.isBuilding).toBe(true);
    });

    it('PredatorNest entity has IsBuilding component', () => {
      const nests = getUnits(EntityKind.PredatorNest, Faction.Enemy);
      if (nests.length > 0) {
        expect(hasComponent(game.world.ecs, nests[0], IsBuilding)).toBe(true);
      } else {
        // Spawn one to verify
        const nestEid = spawnEntity(game.world, EntityKind.PredatorNest, 800, 800, Faction.Enemy);
        expect(hasComponent(game.world.ecs, nestEid, IsBuilding)).toBe(true);
      }
    });
  });

  // ========================================================================
  // 11. Building costs deducted on placement (entity-defs cost verification)
  // ========================================================================

  describe('11. Building costs', () => {
    it('Burrow costs match entity-defs (0 clams, 75 twigs)', () => {
      const def = ENTITY_DEFS[EntityKind.Burrow];
      expect(def.fishCost).toBe(0);
      expect(def.logCost).toBe(75);
    });

    it('Tower costs match entity-defs (200 clams, 250 twigs)', () => {
      const def = ENTITY_DEFS[EntityKind.Tower];
      expect(def.fishCost).toBe(200);
      expect(def.logCost).toBe(250);
    });

    it('Lodge costs match entity-defs (200 clams, 150 twigs)', () => {
      const def = ENTITY_DEFS[EntityKind.Lodge];
      expect(def.fishCost).toBe(200);
      expect(def.logCost).toBe(150);
    });

    it('Armory costs match entity-defs (180 clams, 120 twigs)', () => {
      const def = ENTITY_DEFS[EntityKind.Armory];
      expect(def.fishCost).toBe(180);
      expect(def.logCost).toBe(120);
    });
  });

  // ========================================================================
  // 12. Multiple builders speed up construction
  // ========================================================================

  describe('12. Multiple builders speed up construction', () => {
    it('two builders increase progress faster than one', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const bx = Position.x[lodge] + 300;
      const by = Position.y[lodge] + 300;

      // --- Single builder test ---
      const building1 = spawnIncompleteBuilding(EntityKind.Burrow, bx, by);
      const builder1 = spawnEntity(game.world, EntityKind.Gatherer, bx + 10, by + 10, Faction.Player);

      // Assign builder to the building
      UnitStateMachine.state[builder1] = UnitState.Building;
      UnitStateMachine.targetEntity[builder1] = building1;
      UnitStateMachine.gatherTimer[builder1] = BUILD_TIMER;

      // Run for some frames
      const startProgress1 = Building.progress[building1];
      await waitFrames(200);
      const singleProgress = Building.progress[building1] - startProgress1;

      // --- Two builder test ---
      const building2 = spawnIncompleteBuilding(EntityKind.Burrow, bx + 200, by);
      const builderA = spawnEntity(game.world, EntityKind.Gatherer, bx + 210, by + 10, Faction.Player);
      const builderB = spawnEntity(game.world, EntityKind.Gatherer, bx + 220, by + 10, Faction.Player);

      UnitStateMachine.state[builderA] = UnitState.Building;
      UnitStateMachine.targetEntity[builderA] = building2;
      UnitStateMachine.gatherTimer[builderA] = BUILD_TIMER;

      UnitStateMachine.state[builderB] = UnitState.Building;
      UnitStateMachine.targetEntity[builderB] = building2;
      UnitStateMachine.gatherTimer[builderB] = BUILD_TIMER;

      const startProgress2 = Building.progress[building2];
      await waitFrames(200);
      const doubleProgress = Building.progress[building2] - startProgress2;

      // Two builders should make more progress than one
      expect(doubleProgress).toBeGreaterThan(singleProgress);
      await page.screenshot({ path: 'tests/browser/screenshots/bld-12-multi-builder.png' });
    });
  });

  // ========================================================================
  // 13. Losing last Lodge triggers game over (lose condition)
  // ========================================================================

  describe('13. Losing last Lodge triggers game over', () => {
    it('destroying all Lodges sets state to lose', async () => {
      // This test must run last or with care since it ends the game.
      // Save current state to restore.
      const savedState = game.world.state;

      // Find all player Lodges
      const lodges = getUnits(EntityKind.Lodge);
      expect(lodges.length).toBeGreaterThanOrEqual(1);

      // Save their HPs so we can restore after the test
      const savedHPs = lodges.map((eid) => ({
        eid,
        current: Health.current[eid],
        max: Health.max[eid],
      }));

      // Kill all Lodges by setting HP to 0
      for (const eid of lodges) {
        Health.current[eid] = 0;
      }

      // The health system checks win/lose every 60 frames -- align to boundary
      const remainder = 60 - (game.world.frameCount % 60);
      await waitFrames(remainder + 120);

      expect(game.world.state).toBe('lose');
      await page.screenshot({ path: 'tests/browser/screenshots/bld-13-lodge-game-over.png' });

      // Restore game state and respawn a Lodge so other tests can continue
      game.world.state = 'playing';
      const spawnedLodge = spawnEntity(game.world, EntityKind.Lodge, 400, 400, Faction.Player);
      Building.progress[spawnedLodge] = 100;
      Health.current[spawnedLodge] = Health.max[spawnedLodge];
    });
  });

  // ========================================================================
  // 14. Tower targets nearest enemy within range
  // ========================================================================

  describe('14. Tower targets nearest enemy within range', () => {
    it('Tower fires at an enemy placed within 200px range', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const tx = Position.x[lodge] - 250;
      const ty = Position.y[lodge] - 250;

      // Spawn a complete Tower via archetype (sets TowerAI, Combat, Building progress, etc.)
      const towerEid = spawnCompleteBuilding(EntityKind.Tower, tx, ty);
      // Reset cooldown so it fires immediately
      Combat.attackCooldown[towerEid] = 0;

      // Spawn an enemy within 200px of the tower
      const enemyEid = spawnEntity(game.world, EntityKind.Gator, tx + 100, ty, Faction.Enemy);
      const enemyHpBefore = Health.current[enemyEid];

      // Wait for combat system to process tower auto-attack and projectile to land
      // Tower fires projectile -> projectile system needs frames to reach target
      await waitFrames(180);

      // The enemy should have taken damage (from tower projectile)
      expect(Health.current[enemyEid]).toBeLessThan(enemyHpBefore);
      await page.screenshot({ path: 'tests/browser/screenshots/bld-14-tower-targeting.png' });

      // Cleanup
      Health.current[enemyEid] = 0;
    });

    it('Tower ignores enemies outside 200px range', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const tx = Position.x[lodge] - 350;
      const ty = Position.y[lodge] + 350;

      // Spawn a complete Tower via archetype
      const towerEid = spawnCompleteBuilding(EntityKind.Tower, tx, ty);
      Combat.attackCooldown[towerEid] = 0;

      // Spawn an enemy OUTSIDE 200px range (at 300px away)
      const enemyEid = spawnEntity(game.world, EntityKind.Gator, tx + 300, ty, Faction.Enemy);
      const enemyHpBefore = Health.current[enemyEid];

      // Wait for a few combat system ticks
      await waitFrames(180);

      // The enemy should NOT have taken damage since it is out of range
      expect(Health.current[enemyEid]).toBe(enemyHpBefore);

      // Cleanup
      Health.current[enemyEid] = 0;
    });
  });

  // ========================================================================
  // 15. Construction progress increases when builder assigned
  // ========================================================================

  describe('15. Construction progress', () => {
    it('building progress increases from 1 toward 100 with a builder', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const bx = Position.x[lodge] + 400;
      const by = Position.y[lodge] + 100;

      const buildingEid = spawnIncompleteBuilding(EntityKind.Burrow, bx, by);
      expect(Building.progress[buildingEid]).toBeLessThan(5);

      const builderEid = spawnEntity(game.world, EntityKind.Gatherer, bx + 5, by + 5, Faction.Player);
      UnitStateMachine.state[builderEid] = UnitState.Building;
      UnitStateMachine.targetEntity[builderEid] = buildingEid;
      UnitStateMachine.gatherTimer[builderEid] = BUILD_TIMER;

      // Wait for sufficient build ticks (BUILD_TIMER=25 frames per tick, each adds 10 HP)
      await waitFrames(600);

      expect(Building.progress[buildingEid]).toBeGreaterThan(1);
    });
  });

  // ========================================================================
  // 16. Building destruction when HP reaches 0
  // ========================================================================

  describe('16. Building destruction', () => {
    it('building is removed when HP reaches 0 via takeDamage', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const bx = Position.x[lodge] + 500;
      const by = Position.y[lodge] + 500;

      const wallEid = spawnCompleteBuilding(EntityKind.Wall, bx, by);
      expect(Health.current[wallEid]).toBe(Health.max[wallEid]);

      // Deal lethal damage
      takeDamage(game.world, wallEid, Health.max[wallEid] + 100, -1);

      // Entity should be removed from queries after death processing
      // processDeath removes entity synchronously via removeEntity
      await waitFrames(30);
      const walls = getUnits(EntityKind.Wall).filter((e) =>
        Position.x[e] === bx && Position.y[e] === by,
      );
      expect(walls.length).toBe(0);
    });

    it('screen shakes on building destruction', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const bx = Position.x[lodge] + 600;
      const by = Position.y[lodge] + 600;

      const burrowEid = spawnCompleteBuilding(EntityKind.Burrow, bx, by);
      game.world.shakeTimer = 0;

      // Deal lethal damage
      takeDamage(game.world, burrowEid, Health.max[burrowEid] + 100, -1);

      // shakeTimer should have been set by processDeath for buildings
      expect(game.world.shakeTimer).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // 17. Fortified Walls tech bonus
  // ========================================================================

  describe('17. Fortified Walls tech', () => {
    it('Wall completed with fortifiedWalls tech gets +100 HP', async () => {
      game.world.tech.fortifiedWalls = true;

      const lodge = getUnits(EntityKind.Lodge)[0];
      const wx = Position.x[lodge] + 700;
      const wy = Position.y[lodge];

      const wallEid = spawnIncompleteBuilding(EntityKind.Wall, wx, wy);
      const baseMax = Health.max[wallEid];

      // Assign a builder and run until complete
      const builderEid = spawnEntity(game.world, EntityKind.Gatherer, wx + 5, wy + 5, Faction.Player);
      UnitStateMachine.state[builderEid] = UnitState.Building;
      UnitStateMachine.targetEntity[builderEid] = wallEid;
      UnitStateMachine.gatherTimer[builderEid] = BUILD_TIMER;

      // Wait for construction to complete (Wall is 400 HP, BUILD_TIMER=25 frames per tick,
      // each tick adds 10 HP, so 40 ticks * 25 frames = 1000 frames at 1x speed)
      // With gameSpeed=3, this goes faster but waitFrames counts game frames
      await waitFrames(1800);

      // Verify the wall completed
      expect(Building.progress[wallEid]).toBeGreaterThanOrEqual(100);
      // Fortified Walls adds +100 HP on completion
      expect(Health.max[wallEid]).toBe(baseMax + 100);
      expect(Health.current[wallEid]).toBe(Health.max[wallEid]);

      game.world.tech.fortifiedWalls = false;
    });
  });

  // ========================================================================
  // 18. Sturdy Mud tech gives +300 HP to new buildings
  // ========================================================================

  describe('18. Sturdy Mud tech', () => {
    it('building spawned with sturdyMud has +300 max HP', () => {
      game.world.tech.sturdyMud = true;

      const lodge = getUnits(EntityKind.Lodge)[0];
      const bEid = spawnEntity(game.world, EntityKind.Burrow, Position.x[lodge] + 800, Position.y[lodge], Faction.Player);
      const baseDef = ENTITY_DEFS[EntityKind.Burrow].hp;

      expect(Health.max[bEid]).toBe(baseDef + 300);

      game.world.tech.sturdyMud = false;
    });
  });

  // ========================================================================
  // 19. Incomplete building does not auto-attack or train
  // ========================================================================

  describe('19. Incomplete buildings are inactive', () => {
    it('Tower at progress < 100 does not fire', async () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const tx = Position.x[lodge] - 400;
      const ty = Position.y[lodge] - 400;

      // Spawn incomplete tower via archetype (progress starts at 1 for non-Lodge player buildings)
      const towerEid = spawnIncompleteBuilding(EntityKind.Tower, tx, ty);
      // Ensure progress stays low
      Building.progress[towerEid] = 10;
      Health.current[towerEid] = Math.floor(Health.max[towerEid] * 0.1);
      Combat.attackCooldown[towerEid] = 0;

      // Spawn enemy in range
      const enemyEid = spawnEntity(game.world, EntityKind.Gator, tx + 50, ty, Faction.Enemy);
      const hpBefore = Health.current[enemyEid];

      await waitFrames(180);

      // Tower should not have fired because building is incomplete (progress < 100)
      expect(Health.current[enemyEid]).toBe(hpBefore);

      Health.current[enemyEid] = 0;
    });
  });

  // ========================================================================
  // 20. Building stat summary -- all building kinds are in BUILDING_KINDS set
  // ========================================================================

  describe('20. All building kinds registered', () => {
    it('every building kind in entity-defs has isBuilding true', () => {
      const buildingKinds = [
        EntityKind.Lodge,
        EntityKind.Burrow,
        EntityKind.Armory,
        EntityKind.Tower,
        EntityKind.Watchtower,
        EntityKind.Wall,
        EntityKind.ScoutPost,
        EntityKind.FishingHut,
        EntityKind.HerbalistHut,
        EntityKind.PredatorNest,
      ];

      for (const kind of buildingKinds) {
        expect(ENTITY_DEFS[kind].isBuilding).toBe(true);
      }
    });

    it('spawned buildings have IsBuilding and Building components', () => {
      const lodge = getUnits(EntityKind.Lodge)[0];
      const kinds = [
        EntityKind.Burrow,
        EntityKind.Armory,
        EntityKind.Tower,
        EntityKind.Watchtower,
        EntityKind.Wall,
        EntityKind.ScoutPost,
        EntityKind.FishingHut,
        EntityKind.HerbalistHut,
      ];

      for (let i = 0; i < kinds.length; i++) {
        const eid = spawnEntity(
          game.world,
          kinds[i],
          Position.x[lodge] + 900 + i * 100,
          Position.y[lodge] + 900,
          Faction.Player,
        );
        expect(hasComponent(game.world.ecs, eid, IsBuilding)).toBe(true);
        expect(hasComponent(game.world.ecs, eid, Building)).toBe(true);
      }
    });
  });

  afterAll(async () => {
    await page.screenshot({ path: 'tests/browser/screenshots/buildings-final.png' });
  });
});
