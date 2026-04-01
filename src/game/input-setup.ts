/**
 * Input Setup – builds keyboard and pointer callback objects.
 *
 * Factored out of Game.init() so the orchestrator stays concise.
 * Each builder returns the typed callback object ready to pass
 * to KeyboardHandler / PointerHandler constructors.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Selectable,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { KeyboardCallbacks } from '@/input/keyboard';
import type { PointerCallbacks } from '@/input/pointer';
import {
  getEntityAt,
  hasPlayerUnitsSelected,
  issueContextCommand,
  placeBuilding,
  selectArmy,
  selectIdleWorker,
} from '@/input/selection';
import { triggerCommandPulse } from '@/rendering/animations';
import type { ReplayRecorder } from '@/replay';
import { type EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';

export interface InputSetupDeps {
  world: GameWorld;
  recorder: ReplayRecorder;
  syncUIStore: () => void;
  cycleSpeed: () => void;
  playUnitSelectSound: () => void;
}

export function buildKeyboardCallbacks(deps: InputSetupDeps): KeyboardCallbacks {
  const { world, recorder, syncUIStore, cycleSpeed, playUnitSelectSound } = deps;
  return {
    onToggleMute: () => {
      audio.toggleMute();
      store.muted.value = audio.muted;
    },
    onCycleSpeed: () => cycleSpeed(),
    onSelectIdleWorker: () => {
      selectIdleWorker(world);
      syncUIStore();
    },
    onSelectArmy: () => {
      selectArmy(world);
      syncUIStore();
    },
    onUpdateUI: () => syncUIStore(),
    onPlaySound: (name) => {
      if (name === 'selectUnit') playUnitSelectSound();
      else if (name === 'selectBuild') audio.selectBuild();
      else audio.click();
    },
    hasPlayerUnitsSelected: () => hasPlayerUnitsSelected(world),
    getPlayerBuildings: () => {
      const ents = Array.from(
        query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]),
      );
      return ents.filter(
        (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
      );
    },
    onHalt: () => {
      for (const eid of world.selection) {
        if (
          FactionTag.faction[eid] === Faction.Player &&
          !ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding
        ) {
          UnitStateMachine.state[eid] = UnitState.Idle;
          UnitStateMachine.targetEntity[eid] = -1;
          UnitStateMachine.returnEntity[eid] = -1;
          UnitStateMachine.gatherTimer[eid] = 0;
          UnitStateMachine.attackMoveTargetX[eid] = 0;
          UnitStateMachine.attackMoveTargetY[eid] = 0;
          UnitStateMachine.hasAttackMoveTarget[eid] = 0;
          world.yukaManager.clearFormationBehaviors(eid);
          world.yukaManager.removeUnit(eid);
        }
      }
      recorder.record(world.frameCount, 'stop', {
        selection: [...world.selection],
      });
    },
    onAttackMoveMode: () => {
      world.attackMoveMode = true;
    },
    onActionHotkey: (_index: number) => {
      // Action hotkeys handled by UI layer
    },
  };
}

export interface PointerSetupDeps {
  world: GameWorld;
  recorder: ReplayRecorder;
  syncUIStore: () => void;
  playUnitSelectSound: () => void;
  getPointerMouse: () => { worldX: number; worldY: number };
}

export function buildPointerCallbacks(deps: PointerSetupDeps): PointerCallbacks {
  const { world, recorder, syncUIStore, playUnitSelectSound, getPointerMouse } = deps;
  return {
    getEntityAt: (wx, wy) => getEntityAt(world, wx, wy),
    hasPlayerUnitsSelected: () => hasPlayerUnitsSelected(world),
    issueContextCommand: (target) => {
      for (const eid of world.selection) {
        triggerCommandPulse(eid);
      }
      const mouse = getPointerMouse();
      const wx = mouse.worldX;
      const wy = mouse.worldY;
      const selectionSnapshot = [...world.selection];
      const dispatched = issueContextCommand(world, target, wx, wy);

      if (dispatched) {
        for (const eid of world.selection) {
          if (hasComponent(world.ecs, eid, Selectable)) {
            Selectable.selected[eid] = 0;
          }
        }
        world.selection = [];
        world.isTracking = false;
      }

      const cmdType =
        target != null && FactionTag.faction[target] === Faction.Enemy
          ? ('attack' as const)
          : ('move' as const);
      recorder.record(world.frameCount, cmdType, {
        target,
        worldX: wx,
        worldY: wy,
        selection: selectionSnapshot,
      });
    },
    onUpdateUI: () => syncUIStore(),
    onPlaceBuilding: () => {
      const buildType = world.placingBuilding;
      const mouse = getPointerMouse();
      const wx = mouse.worldX;
      const wy = mouse.worldY;
      placeBuilding(world, wx, wy);
      recorder.record(world.frameCount, 'build', {
        buildingType: buildType,
        worldX: wx,
        worldY: wy,
      });
      syncUIStore();
    },
    onPlaySound: (name) => {
      if (name === 'selectUnit') playUnitSelectSound();
      else if (name === 'selectBuild') audio.selectBuild();
      else audio.click();
    },
    isPlayerUnit: (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      !ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding,
    isPlayerBuilding: (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      !!ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding,
    isEnemyFaction: (eid) => FactionTag.faction[eid] === Faction.Enemy,
    isBuildingEntity: (eid) => !!ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding,
    getEntityKind: (eid) => EntityTypeTag.kind[eid],
    getEntityPosition: (eid) => ({ x: Position.x[eid], y: Position.y[eid] }),
    isEntityOnScreen: (eid) => {
      const ex = Position.x[eid];
      const ey = Position.y[eid];
      return (
        ex >= world.camX &&
        ex <= world.camX + world.viewWidth &&
        ey >= world.camY &&
        ey <= world.camY + world.viewHeight
      );
    },
    getAllPlayerUnitsOfKind: (kind) => {
      const ents = Array.from(query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]));
      return ents.filter(
        (eid) =>
          FactionTag.faction[eid] === Faction.Player &&
          EntityTypeTag.kind[eid] === kind &&
          Health.current[eid] > 0,
      );
    },
    selectEntity: (eid) => {
      Selectable.selected[eid] = 1;
    },
    deselectEntity: (eid) => {
      Selectable.selected[eid] = 0;
    },
    deselectAll: () => {
      for (const eid of world.selection) {
        Selectable.selected[eid] = 0;
      }
    },
  };
}
