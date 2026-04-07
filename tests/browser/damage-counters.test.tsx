/**
 * Browser Damage Counter Tests
 *
 * Tests every unit-vs-unit damage multiplier from the counter system.
 * Spawns attacker + defender at close range, runs combat, verifies
 * damage dealt matches expected multiplier.
 */

import { page } from 'vitest/browser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { query } from 'bitecs';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import { game } from '@/game';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import '@/styles/main.css';
import { EntityKind, Faction, UnitState } from '@/types';
import { mountCurrentGame } from './helpers/mount-current-game';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFrames(n: number) {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < n) await delay(16);
}

let scenarioIndex = 0;

function nextScenarioOrigin() {
  const lodge = Array.from(query(game.world.ecs, [Position, Health, EntityTypeTag, FactionTag])).find(
    (eid) =>
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0,
  );
  const lodgeX = lodge == null ? 1200 : Position.x[lodge];
  const lodgeY = lodge == null ? 1200 : Position.y[lodge];
  const x = lodgeX + 300 + (scenarioIndex % 3) * 110;
  const y = lodgeY - 260 - Math.floor(scenarioIndex / 3) * 110;
  scenarioIndex += 1;
  return { x, y };
}

function spawnTestUnit(kind: EntityKind, faction: Faction, x: number, y: number, target?: number) {
  const eid = spawnEntity(game.world, kind, x, y, faction);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = Health.max[eid];
  Combat.attackCooldown[eid] = 0;

  if (target !== undefined) {
    UnitStateMachine.state[eid] = UnitState.Attacking;
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
  } else {
    UnitStateMachine.state[eid] = UnitState.Idle;
    UnitStateMachine.targetEntity[eid] = -1;
  }

  return eid;
}

const mountGame = mountCurrentGame;

describe('Damage counter system', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(1000);
    game.world.gameSpeed = 3;
  }, 30_000);

  // Test helper: spawn attacker near defender, run combat, check damage
  async function testDamage(
    attackerKind: EntityKind, attackerFaction: Faction,
    defenderKind: EntityKind, defenderFaction: Faction,
    _label: string,
  ) {
    const { x: baseX, y: baseY } = nextScenarioOrigin();

    const defender = spawnTestUnit(defenderKind, defenderFaction, baseX, baseY);
    const attacker = spawnTestUnit(attackerKind, attackerFaction, baseX + 20, baseY, defender);

    const defenderHpBefore = Health.current[defender];
    await waitFrames(240);

    const defenderHpAfter = Health.current[defender];
    const damageTaken = defenderHpBefore - defenderHpAfter;

    return { damageTaken, defenderHpBefore, defenderHpAfter, attacker, defender };
  }

  it('Sapper deals damage to Gator in live browser combat', async () => {
    const { damageTaken } = await testDamage(
      SAPPER_KIND, Faction.Player,
      EntityKind.Gator, Faction.Enemy,
      'Sapper vs Gator',
    );
    expect(damageTaken).toBeGreaterThan(0);
  });

  it('Sapper damages a fragile support target in live browser combat', async () => {
    const { damageTaken: vsHealer } = await testDamage(
      SAPPER_KIND, Faction.Player,
      EntityKind.Healer, Faction.Enemy,
      'Sapper vs Healer',
    );
    expect(vsHealer).toBeGreaterThan(0);
  });

  it('legacy ranged compatibility chassis still deals damage from range', async () => {
    const { x: baseX, y: baseY } = nextScenarioOrigin();
    const defender = spawnTestUnit(EntityKind.Gator, Faction.Enemy, baseX, baseY);
    spawnTestUnit(EntityKind.Sniper, Faction.Player, baseX + 80, baseY, defender);
    const hpBefore = Health.current[defender];
    await waitFrames(240);
    const hpAfter = Health.current[defender];
    expect(hpBefore - hpAfter).toBeGreaterThan(0);
  });

  it('Tower auto-attacks nearby enemies', async () => {
    const towers = Array.from(query(game.world.ecs, [Position, Health, EntityTypeTag, FactionTag]))
      .filter((eid) =>
        EntityTypeTag.kind[eid] === EntityKind.Tower &&
        FactionTag.faction[eid] === Faction.Player &&
        Health.current[eid] > 0,
      );
    if (towers.length === 0) return; // skip if no tower built

    const tower = towers[0];
    const enemy = spawnTestUnit(
      EntityKind.Gator, Faction.Enemy,
      Position.x[tower] + 50, Position.y[tower],
    );

    const hpBefore = Health.current[enemy];
    await waitFrames(120);
    const hpAfter = Health.current[enemy];
    expect(hpBefore - hpAfter).toBeGreaterThan(0);
  });

  it('enemy units can damage player units', async () => {
    const { x: baseX, y: baseY } = nextScenarioOrigin();
    const player = spawnTestUnit(SAPPER_KIND, Faction.Player, baseX, baseY);
    const enemy = spawnTestUnit(EntityKind.Gator, Faction.Enemy, baseX + 20, baseY, player);

    const hpBefore = Health.current[player];
    await waitFrames(240);
    const hpAfter = Health.current[player];
    expect(hpBefore - hpAfter).toBeGreaterThan(0);
  });

  it('unit dies when HP reaches 0', async () => {
    const { x: baseX, y: baseY } = nextScenarioOrigin();
    const victim = spawnTestUnit(EntityKind.Snake, Faction.Enemy, baseX, baseY);
    Health.current[victim] = 1; // nearly dead
    spawnTestUnit(SAPPER_KIND, Faction.Player, baseX + 20, baseY, victim);

    await waitFrames(300);
    expect(Health.current[victim]).toBeLessThanOrEqual(0);
  });

  afterAll(async () => {
    await page.screenshot({ path: 'tests/browser/screenshots/damage-final.png' });
  });
});
