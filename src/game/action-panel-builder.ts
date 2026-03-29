/**
 * Action Panel Builder
 *
 * Builds context-sensitive action buttons and training queue items for
 * the selected entity (or global Command Center when nothing is selected).
 * Covers Lodge, Armory, Gatherer build menu, and all tech upgrades.
 * Each button is tagged with a category ('train', 'build', 'tech') for
 * the tabbed action panel.
 */

import { query } from 'bitecs';
import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { TRAIN_TIMER } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  TrainingQueue,
  trainingQueueSlots,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { cancelTrain, train } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import { EntityKind, Faction } from '@/types';
import {
  type ActionButtonDef,
  actionButtons,
  type QueueItemDef,
  queueItems,
} from '@/ui/action-panel';
import * as store from '@/ui/store';

/** Return a human-readable "Requires: <Tech Name>" string for a tech upgrade, or undefined. */
function techRequiresLabel(techId: TechId): string | undefined {
  const upgrade = TECH_UPGRADES[techId];
  if ('requires' in upgrade && upgrade.requires) {
    const req = TECH_UPGRADES[upgrade.requires];
    return `Requires: ${req.name}`;
  }
  return undefined;
}

/** Build training queue display items for any building with an active queue. */
function buildTrainingQueueItems(
  w: GameWorld,
  buildingEid: number,
  qItems: QueueItemDef[],
  recorder?: ReplayRecorder,
): void {
  const slots = trainingQueueSlots.get(buildingEid) ?? [];
  for (let qi = 0; qi < slots.length; qi++) {
    const unitKind = slots[qi] as EntityKind;
    const progress =
      qi === 0
        ? Math.max(
            0,
            Math.min(100, ((TRAIN_TIMER - TrainingQueue.timer[buildingEid]) / TRAIN_TIMER) * 100),
          )
        : 0;
    const idx = qi;
    qItems.push({
      label: entityKindName(unitKind).charAt(0),
      progressPct: progress,
      onCancel: () => {
        cancelTrain(w, buildingEid, idx);
        recorder?.record(w.frameCount, 'cancel-train', {
          buildingEid,
          index: idx,
          unitKind,
        });
      },
    });
  }
}

/**
 * Build the shared Lodge action buttons (Gatherer, Sturdy Mud, Swift Paws,
 * Scout, Tech Tree) used by both the Global Command Center and the
 * selected-Lodge panel.
 */
function buildLodgeButtons(
  w: GameWorld,
  lodgeEid: number,
  recorder?: ReplayRecorder,
): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];
  const gDef = ENTITY_DEFS[EntityKind.Gatherer];
  btns.push({
    title: 'Gatherer',
    cost: `${gDef.clamCost}C ${gDef.foodCost}F`,
    hotkey: 'Q',
    affordable:
      w.resources.clams >= (gDef.clamCost ?? 0) &&
      w.resources.food + (gDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Worker unit. Gathers clams and twigs, builds structures.',
    category: 'train',
    costBreakdown: { clams: gDef.clamCost, twigs: gDef.twigCost, food: gDef.foodCost },
    onClick: () => {
      train(
        w,
        lodgeEid,
        EntityKind.Gatherer,
        gDef.clamCost ?? 0,
        gDef.twigCost ?? 0,
        gDef.foodCost ?? 1,
      );
      recorder?.record(w.frameCount, 'train', {
        buildingEid: lodgeEid,
        unitKind: EntityKind.Gatherer,
      });
    },
  });
  const smTech = TECH_UPGRADES.sturdyMud;
  btns.push({
    title: smTech.name,
    cost: `${smTech.clamCost}C ${smTech.twigCost}T`,
    hotkey: 'W',
    affordable:
      canResearch('sturdyMud', w.tech) &&
      w.resources.clams >= smTech.clamCost &&
      w.resources.twigs >= smTech.twigCost,
    description: smTech.description,
    category: 'tech',
    costBreakdown: { clams: smTech.clamCost, twigs: smTech.twigCost },
    requires: techRequiresLabel('sturdyMud'),
    onClick: () => {
      if (
        canResearch('sturdyMud', w.tech) &&
        w.resources.clams >= smTech.clamCost &&
        w.resources.twigs >= smTech.twigCost
      ) {
        w.resources.clams -= smTech.clamCost;
        w.resources.twigs -= smTech.twigCost;
        w.tech.sturdyMud = true;
        recorder?.record(w.frameCount, 'research', { tech: 'sturdyMud' });
      }
    },
  });
  const spTech = TECH_UPGRADES.swiftPaws;
  btns.push({
    title: spTech.name,
    cost: `${spTech.clamCost}C ${spTech.twigCost}T`,
    hotkey: 'E',
    affordable:
      canResearch('swiftPaws', w.tech) &&
      w.resources.clams >= spTech.clamCost &&
      w.resources.twigs >= spTech.twigCost,
    description: spTech.description,
    category: 'tech',
    costBreakdown: { clams: spTech.clamCost, twigs: spTech.twigCost },
    requires: techRequiresLabel('swiftPaws'),
    onClick: () => {
      if (
        canResearch('swiftPaws', w.tech) &&
        w.resources.clams >= spTech.clamCost &&
        w.resources.twigs >= spTech.twigCost
      ) {
        w.resources.clams -= spTech.clamCost;
        w.resources.twigs -= spTech.twigCost;
        w.tech.swiftPaws = true;
        recorder?.record(w.frameCount, 'research', { tech: 'swiftPaws' });
      }
    },
  });
  const scoutDef = ENTITY_DEFS[EntityKind.Scout];
  btns.push({
    title: 'Scout',
    cost: `${scoutDef.clamCost}C ${scoutDef.foodCost}F`,
    hotkey: 'R',
    affordable:
      w.resources.clams >= (scoutDef.clamCost ?? 0) &&
      w.resources.food + (scoutDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Fast recon unit with wide vision range.',
    category: 'train',
    costBreakdown: { clams: scoutDef.clamCost, twigs: scoutDef.twigCost, food: scoutDef.foodCost },
    onClick: () => {
      train(
        w,
        lodgeEid,
        EntityKind.Scout,
        scoutDef.clamCost ?? 0,
        scoutDef.twigCost ?? 0,
        scoutDef.foodCost ?? 1,
      );
      recorder?.record(w.frameCount, 'train', {
        buildingEid: lodgeEid,
        unitKind: EntityKind.Scout,
      });
    },
  });
  if (w.tech.aquaticTraining) {
    const swimDef = ENTITY_DEFS[EntityKind.Swimmer];
    btns.push({
      title: 'Swimmer',
      cost: `${swimDef.clamCost}C ${swimDef.twigCost}T ${swimDef.foodCost}F`,
      hotkey: 'F',
      affordable:
        w.resources.clams >= (swimDef.clamCost ?? 0) &&
        w.resources.twigs >= (swimDef.twigCost ?? 0) &&
        w.resources.food + (swimDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Amphibious fast unit. Great for scouting and harassing.',
      category: 'train',
      costBreakdown: { clams: swimDef.clamCost, twigs: swimDef.twigCost, food: swimDef.foodCost },
      requires: 'Requires: Aquatic Training',
      onClick: () => {
        train(
          w,
          lodgeEid,
          EntityKind.Swimmer,
          swimDef.clamCost ?? 0,
          swimDef.twigCost ?? 0,
          swimDef.foodCost ?? 1,
        );
        recorder?.record(w.frameCount, 'train', {
          buildingEid: lodgeEid,
          unitKind: EntityKind.Swimmer,
        });
      },
    });
  }
  btns.push({
    title: 'Tech Tree',
    cost: '',
    hotkey: 'T',
    affordable: true,
    description: 'View full tech tree',
    category: 'tech',
    onClick: () => {
      store.techTreeOpen.value = true;
    },
  });
  return btns;
}

/**
 * Build the action panel buttons and queue items based on the current selection.
 * Writes directly to the actionButtons and queueItems signals.
 */
export function buildActionPanel(world: GameWorld, recorder?: ReplayRecorder): void {
  const w = world;
  const btns: ActionButtonDef[] = [];
  const qItems: QueueItemDef[] = [];

  if (w.selection.length === 0) {
    // Global Command Center: find first completed player Lodge and show its actions
    const allBuildings = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
    let lodgeEid = -1;
    for (let i = 0; i < allBuildings.length; i++) {
      const eid = allBuildings[i];
      if (
        FactionTag.faction[eid] === Faction.Player &&
        EntityTypeTag.kind[eid] === EntityKind.Lodge &&
        Health.current[eid] > 0 &&
        Building.progress[eid] >= 100
      ) {
        lodgeEid = eid;
        break;
      }
    }
    if (lodgeEid >= 0) {
      btns.push(...buildLodgeButtons(w, lodgeEid));

      // Show Lodge training queue in global view
      buildTrainingQueueItems(w, lodgeEid, qItems);
    }
  } else if (w.selection.length === 1) {
    const selEid = w.selection[0];
    const selKind = EntityTypeTag.kind[selEid] as EntityKind;
    const selFaction = FactionTag.faction[selEid] as Faction;

    if (selFaction === Faction.Player) {
      // Gatherer selected: build buttons
      if (selKind === EntityKind.Gatherer) {
        const lodgeDef = ENTITY_DEFS[EntityKind.Lodge];
        btns.push({
          title: 'Lodge',
          cost: `${lodgeDef.clamCost}C ${lodgeDef.twigCost}T`,
          hotkey: 'Q',
          affordable:
            w.resources.clams >= (lodgeDef.clamCost ?? 0) &&
            w.resources.twigs >= (lodgeDef.twigCost ?? 0),
          description: 'Expansion building. +4 food cap, resource drop-off point.',
          category: 'build',
          costBreakdown: { clams: lodgeDef.clamCost, twigs: lodgeDef.twigCost },
          onClick: () => {
            w.placingBuilding = 'lodge';
          },
        });
        const burrowDef = ENTITY_DEFS[EntityKind.Burrow];
        btns.push({
          title: 'Burrow',
          cost: `${burrowDef.twigCost}T`,
          hotkey: 'W',
          affordable: w.resources.twigs >= (burrowDef.twigCost ?? 0),
          description: 'Housing structure. +4 food cap.',
          category: 'build',
          costBreakdown: { clams: burrowDef.clamCost, twigs: burrowDef.twigCost },
          onClick: () => {
            w.placingBuilding = 'burrow';
          },
        });
        const armoryDef = ENTITY_DEFS[EntityKind.Armory];
        btns.push({
          title: 'Armory',
          cost: `${armoryDef.clamCost}C ${armoryDef.twigCost}T`,
          hotkey: 'E',
          affordable:
            w.resources.clams >= (armoryDef.clamCost ?? 0) &&
            w.resources.twigs >= (armoryDef.twigCost ?? 0),
          description: 'Military production. Trains combat units and researches upgrades.',
          category: 'build',
          costBreakdown: { clams: armoryDef.clamCost, twigs: armoryDef.twigCost },
          onClick: () => {
            w.placingBuilding = 'armory';
          },
        });
        const towerDef = ENTITY_DEFS[EntityKind.Tower];
        btns.push({
          title: 'Tower',
          cost: `${towerDef.clamCost}C ${towerDef.twigCost}T`,
          hotkey: 'R',
          affordable:
            w.resources.clams >= (towerDef.clamCost ?? 0) &&
            w.resources.twigs >= (towerDef.twigCost ?? 0),
          description: 'Defensive structure. Attacks nearby enemies automatically.',
          category: 'build',
          costBreakdown: { clams: towerDef.clamCost, twigs: towerDef.twigCost },
          onClick: () => {
            w.placingBuilding = 'tower';
          },
        });
        if (w.tech.eagleEye) {
          const wtDef = ENTITY_DEFS[EntityKind.Watchtower];
          btns.push({
            title: 'Watchtower',
            cost: `${wtDef.clamCost}C ${wtDef.twigCost}T`,
            hotkey: 'T',
            affordable:
              w.resources.clams >= (wtDef.clamCost ?? 0) &&
              w.resources.twigs >= (wtDef.twigCost ?? 0),
            description: 'Extended-range defensive tower.',
            category: 'build',
            costBreakdown: { clams: wtDef.clamCost, twigs: wtDef.twigCost },
            requires: 'Requires: Eagle Eye',
            onClick: () => {
              w.placingBuilding = 'watchtower';
            },
          });
        }
        const wallDef = ENTITY_DEFS[EntityKind.Wall];
        btns.push({
          title: 'Wall',
          cost: `${wallDef.twigCost}T`,
          hotkey: 'Y',
          affordable: w.resources.twigs >= (wallDef.twigCost ?? 0),
          description: 'Defensive barrier. Blocks enemy movement.',
          category: 'build',
          costBreakdown: { clams: wallDef.clamCost, twigs: wallDef.twigCost },
          onClick: () => {
            w.placingBuilding = 'wall';
          },
        });
        if (w.tech.cartography) {
          const spDef = ENTITY_DEFS[EntityKind.ScoutPost];
          btns.push({
            title: 'Scout Post',
            cost: `${spDef.clamCost}C ${spDef.twigCost}T`,
            hotkey: 'U',
            affordable:
              w.resources.clams >= (spDef.clamCost ?? 0) &&
              w.resources.twigs >= (spDef.twigCost ?? 0),
            description: 'Reveals a large area of the map.',
            category: 'build',
            costBreakdown: { clams: spDef.clamCost, twigs: spDef.twigCost },
            requires: 'Requires: Cartography',
            onClick: () => {
              w.placingBuilding = 'scout_post';
            },
          });
        }
        const fhDef = ENTITY_DEFS[EntityKind.FishingHut];
        btns.push({
          title: 'Fishing Hut',
          cost: `${fhDef.clamCost}C ${fhDef.twigCost}T`,
          hotkey: 'I',
          affordable:
            w.resources.clams >= (fhDef.clamCost ?? 0) &&
            w.resources.twigs >= (fhDef.twigCost ?? 0),
          description: 'Passive income building. Generates +5 clams every 5 seconds. +2 food cap.',
          category: 'build',
          costBreakdown: { clams: fhDef.clamCost, twigs: fhDef.twigCost },
          onClick: () => {
            w.placingBuilding = 'fishing_hut';
          },
        });
        const hhDef = ENTITY_DEFS[EntityKind.HerbalistHut];
        btns.push({
          title: 'Herbalist Hut',
          cost: `${hhDef.clamCost}C ${hhDef.twigCost}T`,
          hotkey: 'O',
          affordable:
            w.resources.clams >= (hhDef.clamCost ?? 0) &&
            w.resources.twigs >= (hhDef.twigCost ?? 0),
          description: 'Heals all player units within range by 2 HP every 2 seconds.',
          category: 'build',
          costBreakdown: { clams: hhDef.clamCost, twigs: hhDef.twigCost },
          onClick: () => {
            w.placingBuilding = 'herbalist_hut';
          },
        });
      }

      // Lodge selected: train gatherer + techs (only when construction is complete)
      if (selKind === EntityKind.Lodge && Building.progress[selEid] >= 100) {
        btns.push(...buildLodgeButtons(w, selEid));
        const cartoTech = TECH_UPGRADES.cartography;
        btns.push({
          title: cartoTech.name,
          cost: `${cartoTech.clamCost}C ${cartoTech.twigCost}T`,
          hotkey: 'Y',
          affordable:
            canResearch('cartography', w.tech) &&
            w.resources.clams >= cartoTech.clamCost &&
            w.resources.twigs >= cartoTech.twigCost,
          description: cartoTech.description,
          category: 'tech',
          costBreakdown: { clams: cartoTech.clamCost, twigs: cartoTech.twigCost },
          requires: techRequiresLabel('cartography'),
          onClick: () => {
            if (
              canResearch('cartography', w.tech) &&
              w.resources.clams >= cartoTech.clamCost &&
              w.resources.twigs >= cartoTech.twigCost
            ) {
              w.resources.clams -= cartoTech.clamCost;
              w.resources.twigs -= cartoTech.twigCost;
              w.tech.cartography = true;
            }
          },
        });
        const thTech = TECH_UPGRADES.tidalHarvest;
        btns.push({
          title: thTech.name,
          cost: `${thTech.clamCost}C ${thTech.twigCost}T`,
          hotkey: 'U',
          affordable:
            canResearch('tidalHarvest', w.tech) &&
            w.resources.clams >= thTech.clamCost &&
            w.resources.twigs >= thTech.twigCost,
          description: thTech.description,
          category: 'tech',
          costBreakdown: { clams: thTech.clamCost, twigs: thTech.twigCost },
          requires: techRequiresLabel('tidalHarvest'),
          onClick: () => {
            if (
              canResearch('tidalHarvest', w.tech) &&
              w.resources.clams >= thTech.clamCost &&
              w.resources.twigs >= thTech.twigCost
            ) {
              w.resources.clams -= thTech.clamCost;
              w.resources.twigs -= thTech.twigCost;
              w.tech.tidalHarvest = true;
            }
          },
        });
        const hmTech = TECH_UPGRADES.herbalMedicine;
        btns.push({
          title: hmTech.name,
          cost: `${hmTech.clamCost}C ${hmTech.twigCost}T`,
          hotkey: 'I',
          affordable:
            canResearch('herbalMedicine', w.tech) &&
            w.resources.clams >= hmTech.clamCost &&
            w.resources.twigs >= hmTech.twigCost,
          description: hmTech.description,
          category: 'tech',
          costBreakdown: { clams: hmTech.clamCost, twigs: hmTech.twigCost },
          requires: techRequiresLabel('herbalMedicine'),
          onClick: () => {
            if (
              canResearch('herbalMedicine', w.tech) &&
              w.resources.clams >= hmTech.clamCost &&
              w.resources.twigs >= hmTech.twigCost
            ) {
              w.resources.clams -= hmTech.clamCost;
              w.resources.twigs -= hmTech.twigCost;
              w.tech.herbalMedicine = true;
            }
          },
        });
        const atTech = TECH_UPGRADES.aquaticTraining;
        btns.push({
          title: atTech.name,
          cost: `${atTech.clamCost}C ${atTech.twigCost}T`,
          hotkey: 'O',
          affordable:
            canResearch('aquaticTraining', w.tech) &&
            w.resources.clams >= atTech.clamCost &&
            w.resources.twigs >= atTech.twigCost,
          description: atTech.description,
          category: 'tech',
          costBreakdown: { clams: atTech.clamCost, twigs: atTech.twigCost },
          requires: techRequiresLabel('aquaticTraining'),
          onClick: () => {
            if (
              canResearch('aquaticTraining', w.tech) &&
              w.resources.clams >= atTech.clamCost &&
              w.resources.twigs >= atTech.twigCost
            ) {
              w.resources.clams -= atTech.clamCost;
              w.resources.twigs -= atTech.twigCost;
              w.tech.aquaticTraining = true;
            }
          },
        });
        const ddTech = TECH_UPGRADES.deepDiving;
        btns.push({
          title: ddTech.name,
          cost: `${ddTech.clamCost}C ${ddTech.twigCost}T`,
          hotkey: 'P',
          affordable:
            canResearch('deepDiving', w.tech) &&
            w.resources.clams >= ddTech.clamCost &&
            w.resources.twigs >= ddTech.twigCost,
          description: ddTech.description,
          category: 'tech',
          costBreakdown: { clams: ddTech.clamCost, twigs: ddTech.twigCost },
          requires: techRequiresLabel('deepDiving'),
          onClick: () => {
            if (
              canResearch('deepDiving', w.tech) &&
              w.resources.clams >= ddTech.clamCost &&
              w.resources.twigs >= ddTech.twigCost
            ) {
              w.resources.clams -= ddTech.clamCost;
              w.resources.twigs -= ddTech.twigCost;
              w.tech.deepDiving = true;
            }
          },
        });
      }

      // Armory selected: train brawler/sniper/healer + techs (only when construction is complete)
      if (selKind === EntityKind.Armory && Building.progress[selEid] >= 100) {
        const bDef = ENTITY_DEFS[EntityKind.Brawler];
        btns.push({
          title: 'Brawler',
          cost: `${bDef.clamCost}C ${bDef.twigCost}T ${bDef.foodCost}F`,
          hotkey: 'Q',
          affordable:
            w.resources.clams >= (bDef.clamCost ?? 0) &&
            w.resources.twigs >= (bDef.twigCost ?? 0) &&
            w.resources.food + (bDef.foodCost ?? 1) <= w.resources.maxFood,
          description: 'Tough melee fighter. Short range, high damage.',
          category: 'train',
          costBreakdown: { clams: bDef.clamCost, twigs: bDef.twigCost, food: bDef.foodCost },
          onClick: () => {
            train(
              w,
              selEid,
              EntityKind.Brawler,
              bDef.clamCost ?? 0,
              bDef.twigCost ?? 0,
              bDef.foodCost ?? 1,
            );
          },
        });
        const sDef = ENTITY_DEFS[EntityKind.Sniper];
        btns.push({
          title: 'Sniper',
          cost: `${sDef.clamCost}C ${sDef.twigCost}T ${sDef.foodCost}F`,
          hotkey: 'W',
          affordable:
            w.resources.clams >= (sDef.clamCost ?? 0) &&
            w.resources.twigs >= (sDef.twigCost ?? 0) &&
            w.resources.food + (sDef.foodCost ?? 1) <= w.resources.maxFood,
          description: 'Ranged attacker. Long range, lower HP.',
          category: 'train',
          costBreakdown: { clams: sDef.clamCost, twigs: sDef.twigCost, food: sDef.foodCost },
          onClick: () => {
            train(
              w,
              selEid,
              EntityKind.Sniper,
              sDef.clamCost ?? 0,
              sDef.twigCost ?? 0,
              sDef.foodCost ?? 1,
            );
          },
        });
        const hDef = ENTITY_DEFS[EntityKind.Healer];
        btns.push({
          title: 'Healer',
          cost: `${hDef.clamCost}C ${hDef.twigCost}T ${hDef.foodCost}F`,
          hotkey: 'E',
          affordable:
            w.resources.clams >= (hDef.clamCost ?? 0) &&
            w.resources.twigs >= (hDef.twigCost ?? 0) &&
            w.resources.food + (hDef.foodCost ?? 1) <= w.resources.maxFood,
          description: 'Support unit. Heals nearby friendly units over time.',
          category: 'train',
          costBreakdown: { clams: hDef.clamCost, twigs: hDef.twigCost, food: hDef.foodCost },
          onClick: () => {
            train(
              w,
              selEid,
              EntityKind.Healer,
              hDef.clamCost ?? 0,
              hDef.twigCost ?? 0,
              hDef.foodCost ?? 1,
            );
          },
        });
        const ssTech = TECH_UPGRADES.sharpSticks;
        btns.push({
          title: ssTech.name,
          cost: `${ssTech.clamCost}C ${ssTech.twigCost}T`,
          hotkey: 'R',
          affordable:
            canResearch('sharpSticks', w.tech) &&
            w.resources.clams >= ssTech.clamCost &&
            w.resources.twigs >= ssTech.twigCost,
          description: ssTech.description,
          category: 'tech',
          costBreakdown: { clams: ssTech.clamCost, twigs: ssTech.twigCost },
          requires: techRequiresLabel('sharpSticks'),
          onClick: () => {
            if (
              canResearch('sharpSticks', w.tech) &&
              w.resources.clams >= ssTech.clamCost &&
              w.resources.twigs >= ssTech.twigCost
            ) {
              w.resources.clams -= ssTech.clamCost;
              w.resources.twigs -= ssTech.twigCost;
              w.tech.sharpSticks = true;
            }
          },
        });
        const eeTech = TECH_UPGRADES.eagleEye;
        btns.push({
          title: eeTech.name,
          cost: `${eeTech.clamCost}C ${eeTech.twigCost}T`,
          hotkey: 'T',
          affordable:
            canResearch('eagleEye', w.tech) &&
            w.resources.clams >= eeTech.clamCost &&
            w.resources.twigs >= eeTech.twigCost,
          description: eeTech.description,
          category: 'tech',
          costBreakdown: { clams: eeTech.clamCost, twigs: eeTech.twigCost },
          requires: techRequiresLabel('eagleEye'),
          onClick: () => {
            if (
              canResearch('eagleEye', w.tech) &&
              w.resources.clams >= eeTech.clamCost &&
              w.resources.twigs >= eeTech.twigCost
            ) {
              w.resources.clams -= eeTech.clamCost;
              w.resources.twigs -= eeTech.twigCost;
              w.tech.eagleEye = true;
            }
          },
        });
        const hsTech = TECH_UPGRADES.hardenedShells;
        const hsPearlCost = hsTech.pearlCost ?? 0;
        btns.push({
          title: hsTech.name,
          cost: `${hsTech.clamCost}C ${hsTech.twigCost}T${hsPearlCost > 0 ? ` ${hsPearlCost}P` : ''}`,
          hotkey: 'Y',
          affordable:
            canResearch('hardenedShells', w.tech) &&
            w.resources.clams >= hsTech.clamCost &&
            w.resources.twigs >= hsTech.twigCost &&
            w.resources.pearls >= hsPearlCost,
          description: hsTech.description,
          category: 'tech',
          costBreakdown: { clams: hsTech.clamCost, twigs: hsTech.twigCost, pearls: hsPearlCost },
          requires: techRequiresLabel('hardenedShells'),
          onClick: () => {
            if (
              canResearch('hardenedShells', w.tech) &&
              w.resources.clams >= hsTech.clamCost &&
              w.resources.twigs >= hsTech.twigCost &&
              w.resources.pearls >= hsPearlCost
            ) {
              w.resources.clams -= hsTech.clamCost;
              w.resources.twigs -= hsTech.twigCost;
              w.resources.pearls -= hsPearlCost;
              w.tech.hardenedShells = true;
            }
          },
        });
        if (w.tech.ironShell) {
          const sbDef = ENTITY_DEFS[EntityKind.Shieldbearer];
          btns.push({
            title: 'Shieldbearer',
            cost: `${sbDef.clamCost}C ${sbDef.twigCost}T ${sbDef.foodCost}F`,
            hotkey: 'U',
            affordable:
              w.resources.clams >= (sbDef.clamCost ?? 0) &&
              w.resources.twigs >= (sbDef.twigCost ?? 0) &&
              w.resources.food + (sbDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Heavy tank unit with shield. High HP, absorbs damage.',
            category: 'train',
            costBreakdown: { clams: sbDef.clamCost, twigs: sbDef.twigCost, food: sbDef.foodCost },
            requires: 'Requires: Iron Shell',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Shieldbearer,
                sbDef.clamCost ?? 0,
                sbDef.twigCost ?? 0,
                sbDef.foodCost ?? 1,
              );
            },
          });
        }
        if (w.tech.siegeWorks) {
          const catDef = ENTITY_DEFS[EntityKind.Catapult];
          btns.push({
            title: 'Catapult',
            cost: `${catDef.clamCost}C ${catDef.twigCost}T ${catDef.foodCost}F`,
            hotkey: 'I',
            affordable:
              w.resources.clams >= (catDef.clamCost ?? 0) &&
              w.resources.twigs >= (catDef.twigCost ?? 0) &&
              w.resources.food + (catDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Siege unit. Area-of-effect damage at long range.',
            category: 'train',
            costBreakdown: {
              clams: catDef.clamCost,
              twigs: catDef.twigCost,
              food: catDef.foodCost,
            },
            requires: 'Requires: Siege Works',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Catapult,
                catDef.clamCost ?? 0,
                catDef.twigCost ?? 0,
                catDef.foodCost ?? 1,
              );
            },
          });
        }
        const isTech = TECH_UPGRADES.ironShell;
        btns.push({
          title: isTech.name,
          cost: `${isTech.clamCost}C ${isTech.twigCost}T`,
          hotkey: 'Z',
          affordable:
            canResearch('ironShell', w.tech) &&
            w.resources.clams >= isTech.clamCost &&
            w.resources.twigs >= isTech.twigCost,
          description: isTech.description,
          category: 'tech',
          costBreakdown: { clams: isTech.clamCost, twigs: isTech.twigCost },
          requires: techRequiresLabel('ironShell'),
          onClick: () => {
            if (
              canResearch('ironShell', w.tech) &&
              w.resources.clams >= isTech.clamCost &&
              w.resources.twigs >= isTech.twigCost
            ) {
              w.resources.clams -= isTech.clamCost;
              w.resources.twigs -= isTech.twigCost;
              w.tech.ironShell = true;
            }
          },
        });
        const swTech = TECH_UPGRADES.siegeWorks;
        const swPearlCost = swTech.pearlCost ?? 0;
        btns.push({
          title: swTech.name,
          cost: `${swTech.clamCost}C ${swTech.twigCost}T${swPearlCost > 0 ? ` ${swPearlCost}P` : ''}`,
          hotkey: 'X',
          affordable:
            canResearch('siegeWorks', w.tech) &&
            w.resources.clams >= swTech.clamCost &&
            w.resources.twigs >= swTech.twigCost &&
            w.resources.pearls >= swPearlCost,
          description: swTech.description,
          category: 'tech',
          costBreakdown: { clams: swTech.clamCost, twigs: swTech.twigCost, pearls: swPearlCost },
          requires: techRequiresLabel('siegeWorks'),
          onClick: () => {
            if (
              canResearch('siegeWorks', w.tech) &&
              w.resources.clams >= swTech.clamCost &&
              w.resources.twigs >= swTech.twigCost &&
              w.resources.pearls >= swPearlCost
            ) {
              w.resources.clams -= swTech.clamCost;
              w.resources.twigs -= swTech.twigCost;
              w.resources.pearls -= swPearlCost;
              w.tech.siegeWorks = true;
            }
          },
        });
        const brTech = TECH_UPGRADES.battleRoar;
        btns.push({
          title: brTech.name,
          cost: `${brTech.clamCost}C ${brTech.twigCost}T`,
          hotkey: 'C',
          affordable:
            canResearch('battleRoar', w.tech) &&
            w.resources.clams >= brTech.clamCost &&
            w.resources.twigs >= brTech.twigCost,
          description: brTech.description,
          category: 'tech',
          costBreakdown: { clams: brTech.clamCost, twigs: brTech.twigCost },
          requires: techRequiresLabel('battleRoar'),
          onClick: () => {
            if (
              canResearch('battleRoar', w.tech) &&
              w.resources.clams >= brTech.clamCost &&
              w.resources.twigs >= brTech.twigCost
            ) {
              w.resources.clams -= brTech.clamCost;
              w.resources.twigs -= brTech.twigCost;
              w.tech.battleRoar = true;
            }
          },
        });
        const ctTech = TECH_UPGRADES.cunningTraps;
        btns.push({
          title: ctTech.name,
          cost: `${ctTech.clamCost}C ${ctTech.twigCost}T`,
          hotkey: 'V',
          affordable:
            canResearch('cunningTraps', w.tech) &&
            w.resources.clams >= ctTech.clamCost &&
            w.resources.twigs >= ctTech.twigCost,
          description: ctTech.description,
          category: 'tech',
          costBreakdown: { clams: ctTech.clamCost, twigs: ctTech.twigCost },
          requires: techRequiresLabel('cunningTraps'),
          onClick: () => {
            if (
              canResearch('cunningTraps', w.tech) &&
              w.resources.clams >= ctTech.clamCost &&
              w.resources.twigs >= ctTech.twigCost
            ) {
              w.resources.clams -= ctTech.clamCost;
              w.resources.twigs -= ctTech.twigCost;
              w.tech.cunningTraps = true;
            }
          },
        });
        const camoTech = TECH_UPGRADES.camouflage;
        btns.push({
          title: camoTech.name,
          cost: `${camoTech.clamCost}C ${camoTech.twigCost}T`,
          hotkey: 'B',
          affordable:
            canResearch('camouflage', w.tech) &&
            w.resources.clams >= camoTech.clamCost &&
            w.resources.twigs >= camoTech.twigCost,
          description: camoTech.description,
          category: 'tech',
          costBreakdown: { clams: camoTech.clamCost, twigs: camoTech.twigCost },
          requires: techRequiresLabel('camouflage'),
          onClick: () => {
            if (
              canResearch('camouflage', w.tech) &&
              w.resources.clams >= camoTech.clamCost &&
              w.resources.twigs >= camoTech.twigCost
            ) {
              w.resources.clams -= camoTech.clamCost;
              w.resources.twigs -= camoTech.twigCost;
              w.tech.camouflage = true;
            }
          },
        });
        if (w.tech.cunningTraps) {
          const trapDef = ENTITY_DEFS[EntityKind.Trapper];
          btns.push({
            title: 'Trapper',
            cost: `${trapDef.clamCost}C ${trapDef.twigCost}T ${trapDef.foodCost}F`,
            hotkey: 'N',
            affordable:
              w.resources.clams >= (trapDef.clamCost ?? 0) &&
              w.resources.twigs >= (trapDef.twigCost ?? 0) &&
              w.resources.food + (trapDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Utility unit. Places traps that slow enemies.',
            category: 'train',
            costBreakdown: {
              clams: trapDef.clamCost,
              twigs: trapDef.twigCost,
              food: trapDef.foodCost,
            },
            requires: 'Requires: Cunning Traps',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Trapper,
                trapDef.clamCost ?? 0,
                trapDef.twigCost ?? 0,
                trapDef.foodCost ?? 1,
              );
              recorder?.record(w.frameCount, 'train', {
                buildingEid: selEid,
                unitKind: EntityKind.Trapper,
              });
            },
          });
        }

        buildTrainingQueueItems(w, selEid, qItems);
      }

      // Lodge/Burrow training queue display
      if (selKind === EntityKind.Lodge || selKind === EntityKind.Burrow) {
        buildTrainingQueueItems(w, selEid, qItems);
      }
    }
  }

  actionButtons.value = btns;
  queueItems.value = qItems;
}
