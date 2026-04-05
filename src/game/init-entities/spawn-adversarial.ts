/**
 * Adversarial Entity Spawner
 *
 * In adversarial mode, spawns TWO Lodges (player + opponent) on opposite
 * sides of the map, each with their own Commander. Enemy waves from nests
 * still attack both players. Players can attack each other.
 *
 * The player Lodge stays at the standard position (center-bottom of panel 5).
 * The opponent Lodge is placed at the top of the map (mirror position).
 */

import { COMMANDER_ABILITIES, getCommanderDef, getCommanderTypeIndex } from '@/config/commanders';
import { getFactionConfig } from '@/config/factions';
import { spawnEntity } from '@/ecs/archetypes';
import { Commander, Health } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { VerticalMapLayout } from '@/game/vertical-map';
import { EntityKind, Faction } from '@/types';

/**
 * Spawn the opponent's Lodge and Commander on the opposite side of the map.
 *
 * The opponent Lodge mirrors the player Lodge position: same X, but at the
 * top of the map instead of center-bottom.
 *
 * Sets world.opponentLodgeEid and world.opponentCommanderEid.
 */
export function spawnAdversarialEntities(world: GameWorld, layout: VerticalMapLayout): void {
  if (!world.adversarialMode) return;

  const factionCfg = getFactionConfig(world.playerFaction);

  // Opponent Lodge at top of map (mirror Y of player Lodge)
  const opponentLodgeX = layout.lodgeX;
  const opponentLodgeY = 150; // Near top edge of the map

  const opponentLodgeEid = spawnEntity(
    world,
    factionCfg.lodgeKind,
    opponentLodgeX,
    opponentLodgeY,
    Faction.Enemy,
  );

  // Scale opponent Lodge HP to match player Lodge
  const lodgeBaseHp = Health.max[opponentLodgeEid];
  const playerLodgeEid = world.selection[0];
  if (playerLodgeEid != null && Health.max[playerLodgeEid] > lodgeBaseHp) {
    const hpDiff = Health.max[playerLodgeEid] - lodgeBaseHp;
    Health.max[opponentLodgeEid] += hpDiff;
    Health.current[opponentLodgeEid] += hpDiff;
  }

  world.opponentLodgeEid = opponentLodgeEid;

  // Opponent Commander next to their Lodge
  const cmdEid = spawnEntity(
    world,
    EntityKind.Commander,
    opponentLodgeX + 50,
    opponentLodgeY + 30,
    Faction.Enemy,
  );

  const cmdDef = getCommanderDef(world.commanderId);
  const typeIdx = getCommanderTypeIndex(world.commanderId);
  const ability = COMMANDER_ABILITIES[world.commanderId];

  Commander.commanderType[cmdEid] = typeIdx;
  Commander.auraRadius[cmdEid] = 150;
  Commander.auraDamageBonus[cmdEid] = Math.round(cmdDef.auraDamageBonus * 100);
  Commander.abilityTimer[cmdEid] = 0;
  Commander.abilityCooldown[cmdEid] = ability?.cooldownFrames ?? 5400;
  Commander.isPlayerCommander[cmdEid] = 0;

  world.opponentCommanderEid = cmdEid;

  // Also set the enemy commander entity for the health system to track
  world.enemyCommanderEntityId = cmdEid;
}
