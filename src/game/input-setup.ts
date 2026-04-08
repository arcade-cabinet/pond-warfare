/**
 * Input Setup -- builds keyboard and pointer callback objects.
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
  Stance,
  StanceMode,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { usePondBlessing, useShadowSprint, useTidalSurge } from '@/game/abilities';
import { useCommanderAbility } from '@/game/commander-abilities';
import { getSpecialistMenuMode } from '@/game/specialist-assignment';
import type { KeyboardCallbacks } from '@/input/keyboard';
import type { PointerCallbacks } from '@/input/pointer';
import {
  getEntityAt,
  getResourceAt,
  hasPlayerUnitsSelected,
  issueContextCommand,
  placeBuilding,
  selectArmy,
  selectIdleGeneralist,
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
    onSelectIdleGeneralist: () => {
      selectIdleGeneralist(world);
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
    onCycleStance: () => {
      cycleStanceForSelection(world);
      syncUIStore();
    },
    onActionHotkey: (index: number) => {
      // Q = Commander ability (action slot 0)
      if (index === 0) {
        useCommanderAbility(world);
      }
    },
    onRallyCry: () => {
      useShadowSprint(world);
    },
    onPondBlessing: () => {
      usePondBlessing(world);
    },
    onTidalSurge: () => {
      useTidalSurge(world);
    },
  };
}

const STANCE_LABELS = ['Aggressive', 'Defensive', 'Hold'];

/** Cycle stance for all selected player units: Aggressive -> Defensive -> Hold -> Aggressive. */
export function cycleStanceForSelection(world: GameWorld): void {
  let newStance = -1;
  for (const eid of world.selection) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding) continue;
    const cur = (Stance.mode?.[eid] as number | undefined) ?? StanceMode.Aggressive;
    if (newStance === -1) newStance = (cur + 1) % 3;
    Stance.mode[eid] = newStance;
  }
  if (newStance >= 0) {
    audio.click();
    world.floatingTexts.push({
      x: world.camX + world.viewWidth / 2,
      y: world.camY + 60,
      text: `Stance: ${STANCE_LABELS[newStance]}`,
      color: '#38bdf8',
      life: 60,
    });
  }
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
    getResourceAt: (wx, wy) => getResourceAt(world, wx, wy),
    hasPlayerUnitsSelected: () => hasPlayerUnitsSelected(world),
    issueContextCommand: (target, shiftDown) => {
      for (const eid of world.selection) {
        triggerCommandPulse(eid);
      }
      const mouse = getPointerMouse();
      const wx = mouse.worldX;
      const wy = mouse.worldY;
      const selectionSnapshot = [...world.selection];
      const dispatched = issueContextCommand(world, target, wx, wy, shiftDown);

      // Don't deselect when shift is held (patrol mode) so player can add waypoints
      if (dispatched && !shiftDown) {
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
    getSpecialistMenuMode: (eid) => getSpecialistMenuMode(world, eid),
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
