/**
 * Selection Info Sync
 *
 * Updates the UI store signals for the current selection: name, HP, stats,
 * description, composition breakdown, etc.
 */

import { hasComponent } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { VET_RANK_NAMES } from '@/constants';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Stance,
  StanceMode,
  UnitStateMachine,
  Velocity,
  Veterancy,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { getEntityDisplayName } from '@/game/unit-display';
import { type EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';

/**
 * Sync the selection info portion of the UI store.
 * @param idleGeneralists - idle Mudpaw/generalist count (computed by population-sync)
 * @param armyUnits - army unit count (computed by population-sync)
 * @param maxFoodCap - max food capacity (computed by population-sync)
 */
export function syncSelectionInfo(
  world: GameWorld,
  idleGeneralists: number,
  armyUnits: number,
  maxFoodCap: number,
): void {
  const w = world;

  if (w.selection.length === 0) {
    // No selection: show global Command Center
    store.selectionCount.value = 0;
    store.selectionName.value = 'Command Center';
    store.selectionNameColor.value = '';
    store.selectionShowHpBar.value = false;
    store.selectionIsMulti.value = false;
    store.selectionStatsHtml.value = `Idle Mudpaws: ${idleGeneralists} | Army: ${armyUnits} | Pop: ${w.resources.food}/${maxFoodCap}`;
    store.selectionDesc.value = '';
    store.selectionSpriteData.value = null;
    store.selectionKills.value = 0;
    store.selectionStance.value = -1;
  } else if (w.selection.length === 1) {
    const selEid = w.selection[0];
    const kind = EntityTypeTag.kind[selEid] as EntityKind;
    const faction = FactionTag.faction[selEid] as Faction;
    store.selectionCount.value = 1;
    store.selectionName.value = getEntityDisplayName(w, selEid);
    store.selectionIsMulti.value = false;
    store.selectionNameColor.value =
      faction === Faction.Player
        ? 'pw-name-player'
        : faction === Faction.Enemy
          ? 'pw-name-enemy'
          : 'pw-name-neutral';
    store.selectionHp.value = Health.current[selEid];
    store.selectionMaxHp.value = Health.max[selEid];
    store.selectionShowHpBar.value = !hasComponent(w.ecs, selEid, IsResource);
    store.selectionKills.value = hasComponent(w.ecs, selEid, Combat) ? Combat.kills[selEid] : 0;
    // Build stats string (show actual values which may include vet bonuses)
    const def = ENTITY_DEFS[kind];
    const statParts: string[] = [];
    statParts.push(`HP: ${Health.current[selEid]}/${Health.max[selEid]}`);
    if (hasComponent(w.ecs, selEid, Combat) && Combat.damage[selEid] > 0)
      statParts.push(`Dmg: ${Combat.damage[selEid]}`);
    if (hasComponent(w.ecs, selEid, Combat) && Combat.attackRange[selEid] > 0)
      statParts.push(`Range: ${Combat.attackRange[selEid]}`);
    if (def.speed > 0 && !def.isBuilding && hasComponent(w.ecs, selEid, Velocity))
      statParts.push(`Spd: ${Velocity.speed[selEid].toFixed(1)}`);
    // Show veterancy rank if unit has it
    if (hasComponent(w.ecs, selEid, Veterancy)) {
      const vetRank = Veterancy.rank[selEid];
      if (vetRank > 0) {
        statParts.push(`Rank: ${VET_RANK_NAMES[vetRank]}`);
      }
    }
    store.selectionStatsHtml.value = statParts.join(' | ');
    // Describe current state (only for units with a state machine, not buildings/resources)
    const hasStateMachine = hasComponent(w.ecs, selEid, UnitStateMachine);
    const state = hasStateMachine ? (UnitStateMachine.state[selEid] as UnitState) : -1;
    const stateNames: Record<number, string> = {
      [UnitState.Idle]: 'Idle',
      [UnitState.Move]: 'Moving',
      [UnitState.GatherMove]: 'Moving to gather',
      [UnitState.Gathering]: 'Gathering',
      [UnitState.ReturnMove]: 'Returning resources',
      [UnitState.BuildMove]: 'Moving to build',
      [UnitState.Building]: 'Building',
      [UnitState.RepairMove]: 'Moving to repair',
      [UnitState.Repairing]: 'Repairing',
      [UnitState.AttackMove]: 'Attack-moving',
      [UnitState.Attacking]: 'Attacking',
      [UnitState.AttackMovePatrol]: 'Patrolling',
    };
    store.selectionDesc.value = stateNames[state] ?? '';
    store.selectionSpriteData.value = null;
    store.selectionStance.value =
      hasStateMachine && !def.isBuilding && !def.isResource && faction === Faction.Player
        ? ((Stance.mode?.[selEid] as number | undefined) ?? StanceMode.Aggressive)
        : -1;
  } else {
    // Multiple selected
    store.selectionIsMulti.value = true;
    store.selectionCount.value = w.selection.length;
    store.selectionName.value = `${w.selection.length} Units`;
    store.selectionNameColor.value = 'pw-name-player';
    store.selectionShowHpBar.value = false;
    store.selectionSpriteData.value = null;
    // Build composition string
    const labelCounts = new Map<string, number>();
    for (const eid of w.selection) {
      const label = getEntityDisplayName(w, eid);
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
    const compParts: string[] = [];
    for (const [label, count] of labelCounts) {
      compParts.push(`${count} ${label}`);
    }
    store.selectionComposition.value = compParts.join(', ');
    store.selectionStatsHtml.value = '';
    store.selectionDesc.value = '';
    store.selectionKills.value = 0;
    let multiStance = -1;
    for (const eid of w.selection) {
      if (FactionTag.faction[eid] === Faction.Player) {
        const ek = EntityTypeTag.kind[eid] as EntityKind;
        const eDef = ENTITY_DEFS[ek];
        if (!eDef.isBuilding && !eDef.isResource) {
          multiStance = (Stance.mode?.[eid] as number | undefined) ?? StanceMode.Aggressive;
          break;
        }
      }
    }
    store.selectionStance.value = multiStance;
  }
}
