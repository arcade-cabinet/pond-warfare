import { hasComponent } from 'bitecs';
import { Combat, FactionTag } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { Faction } from '@/types';

export function rollPlayerCriticalHit(world: GameWorld, ownerEid: number): boolean {
  if (
    ownerEid === -1 ||
    world.playerCriticalHitChance <= 0 ||
    !hasComponent(world.ecs, ownerEid, FactionTag) ||
    FactionTag.faction[ownerEid] !== Faction.Player
  ) {
    return false;
  }

  if (!hasComponent(world.ecs, ownerEid, Combat)) {
    return world.gameRng.next() < world.playerCriticalHitChance;
  }

  const charge = (Combat.critCharge[ownerEid] ?? 0) + world.playerCriticalHitChance;
  if (charge >= 1) {
    Combat.critCharge[ownerEid] = charge - 1;
    return true;
  }

  Combat.critCharge[ownerEid] = charge;
  return false;
}
