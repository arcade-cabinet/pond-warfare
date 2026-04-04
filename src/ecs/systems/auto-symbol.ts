/**
 * Auto-Symbol System
 *
 * After a player unit completes an order and is deselected, a themed icon
 * appears above its head for 4 seconds. If the player taps the icon,
 * the unit's auto-behavior is confirmed and it loops its last action.
 * If not tapped, the icon fades and the unit idles normally.
 *
 * Runs each frame to:
 * 1. Detect units transitioning to Idle that are not selected (trigger symbol)
 * 2. Decrement active timers
 * 3. Expire unconfirmed symbols (unit stays idle)
 * 4. Re-issue looping commands for confirmed symbols
 */

import { query } from 'bitecs';
import {
  AutoSymbol,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Resource,
  Selectable,
  SymbolType,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

/** Duration in frames the auto-symbol icon is visible (4s at 60fps). */
export const AUTO_SYMBOL_DURATION = 240;

/** Radius to search for a nearby target when re-issuing a confirmed command. */
const REISSUE_SEARCH_RADIUS = 300;

/**
 * Tracks each unit's previous-frame state so we can detect the
 * transition *into* Idle (i.e. command completion).
 */
const prevState = new Map<number, number>();

/** Infer the symbol type from the state the unit just finished. */
function symbolFromPrevState(prev: UnitState, kind: EntityKind): number {
  switch (prev) {
    case UnitState.GatherMove:
    case UnitState.Gathering:
    case UnitState.ReturnMove:
      return SymbolType.Gather;
    case UnitState.AttackMove:
    case UnitState.Attacking:
    case UnitState.AttackMovePatrol:
      return SymbolType.Attack;
    default:
      break;
  }
  // Healers/Shamans that were moving get heal symbol
  if (kind === EntityKind.Healer || kind === EntityKind.Shaman) {
    if (prev === UnitState.Move) return SymbolType.Heal;
  }
  // Scouts that were moving get scout symbol
  if (kind === EntityKind.Scout) {
    if (prev === UnitState.Move) return SymbolType.Scout;
  }
  return SymbolType.None;
}

export function autoSymbolSystem(world: GameWorld): void {
  const units = query(world.ecs, [
    UnitStateMachine,
    FactionTag,
    Health,
    Position,
    EntityTypeTag,
    Selectable,
    AutoSymbol,
  ]);

  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (Health.current[eid] <= 0) continue;
    if (FactionTag.faction[eid] !== Faction.Player) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    const prev = (prevState.get(eid) ?? UnitState.Idle) as UnitState;

    // --- Detect transition into Idle while deselected ---
    if (state === UnitState.Idle && prev !== UnitState.Idle && Selectable.selected[eid] === 0) {
      const kind = EntityTypeTag.kind[eid] as EntityKind;
      const sym = symbolFromPrevState(prev, kind);
      if (sym !== SymbolType.None) {
        AutoSymbol.active[eid] = 1;
        AutoSymbol.symbolType[eid] = sym;
        AutoSymbol.timer[eid] = AUTO_SYMBOL_DURATION;
        AutoSymbol.confirmed[eid] = 0;
      }
    }

    // Cancel symbol if unit gets selected or receives a new command
    if (AutoSymbol.active[eid] === 1) {
      if (Selectable.selected[eid] === 1 || state !== UnitState.Idle) {
        AutoSymbol.active[eid] = 0;
        AutoSymbol.timer[eid] = 0;
      }
    }

    // --- Tick active symbols ---
    if (AutoSymbol.active[eid] === 1 && AutoSymbol.timer[eid] > 0) {
      AutoSymbol.timer[eid]--;

      // Confirmed: re-issue the looping command
      if (AutoSymbol.confirmed[eid] === 1) {
        reissueCommand(world, eid, AutoSymbol.symbolType[eid]);
        AutoSymbol.active[eid] = 0;
        AutoSymbol.timer[eid] = 0;
      }

      // Expired without confirmation: stays idle, symbol fades
      if (AutoSymbol.timer[eid] <= 0) {
        AutoSymbol.active[eid] = 0;
      }
    }

    prevState.set(eid, state);
  }
}

/** Re-issue a looping command based on the confirmed symbol type. */
function reissueCommand(world: GameWorld, eid: number, symType: number): void {
  const ex = Position.x[eid];
  const ey = Position.y[eid];

  if (symType === SymbolType.Gather) {
    // Find nearest resource node
    const resources = query(world.ecs, [Position, Resource, IsResource]);
    let closest = -1;
    let minDist = REISSUE_SEARCH_RADIUS;
    for (let j = 0; j < resources.length; j++) {
      const r = resources[j];
      if (Resource.amount[r] <= 0) continue;
      const dx = Position.x[r] - ex;
      const dy = Position.y[r] - ey;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        closest = r;
      }
    }
    if (closest !== -1) {
      UnitStateMachine.targetEntity[eid] = closest;
      UnitStateMachine.targetX[eid] = Position.x[closest];
      UnitStateMachine.targetY[eid] = Position.y[closest];
      UnitStateMachine.state[eid] = UnitState.GatherMove;
    }
  } else if (symType === SymbolType.Attack) {
    // Find nearest enemy
    const candidates = world.spatialHash
      ? world.spatialHash.query(ex, ey, REISSUE_SEARCH_RADIUS)
      : [];
    let closest = -1;
    let minDist = REISSUE_SEARCH_RADIUS;
    for (let j = 0; j < candidates.length; j++) {
      const c = candidates[j];
      if (FactionTag.faction[c] !== Faction.Enemy) continue;
      if (Health.current[c] <= 0) continue;
      const dx = Position.x[c] - ex;
      const dy = Position.y[c] - ey;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        closest = c;
      }
    }
    if (closest !== -1) {
      UnitStateMachine.targetEntity[eid] = closest;
      UnitStateMachine.targetX[eid] = Position.x[closest];
      UnitStateMachine.targetY[eid] = Position.y[closest];
      UnitStateMachine.state[eid] = UnitState.AttackMove;
    }
  }
  // Heal and Scout: enable the corresponding auto-behavior toggle
  else if (symType === SymbolType.Heal) {
    world.autoBehaviors.healer = true;
  } else if (symType === SymbolType.Scout) {
    world.autoBehaviors.scout = true;
  }
}

/** Reset tracking state (call on game restart). */
export function resetAutoSymbol(): void {
  prevState.clear();
}
