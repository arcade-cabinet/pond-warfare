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

/** Apply Sage passive research discount to a tech cost. */
function discountedTechCost(
  w: GameWorld,
  clamCost: number,
  twigCost: number,
): { clams: number; twigs: number } {
  const d = 1 - w.commanderModifiers.passiveResearchSpeed;
  return { clams: Math.round(clamCost * d), twigs: Math.round(twigCost * d) };
}

/** Check affordability for a tech upgrade with Sage discount applied. */
function canAffordTech(w: GameWorld, techId: TechId): boolean {
  const upgrade = TECH_UPGRADES[techId];
  const { clams, twigs } = discountedTechCost(w, upgrade.clamCost, upgrade.twigCost);
  const pearlCost = (upgrade as { pearlCost?: number }).pearlCost ?? 0;
  return (
    canResearch(techId, w.tech) &&
    w.resources.clams >= clams &&
    w.resources.twigs >= twigs &&
    w.resources.pearls >= pearlCost
  );
}

/** Purchase a tech upgrade, applying Sage discount. Returns true if successful. */
function purchaseTech(w: GameWorld, techId: TechId): boolean {
  const upgrade = TECH_UPGRADES[techId];
  const { clams, twigs } = discountedTechCost(w, upgrade.clamCost, upgrade.twigCost);
  const pearlCost = (upgrade as { pearlCost?: number }).pearlCost ?? 0;
  if (
    !canResearch(techId, w.tech) ||
    w.resources.clams < clams ||
    w.resources.twigs < twigs ||
    w.resources.pearls < pearlCost
  )
    return false;
  w.resources.clams -= clams;
  w.resources.twigs -= twigs;
  w.resources.pearls -= pearlCost;
  w.tech[techId] = true;
  return true;
}

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
  const smCost = discountedTechCost(w, smTech.clamCost, smTech.twigCost);
  btns.push({
    title: smTech.name,
    cost: `${smCost.clams}C ${smCost.twigs}T`,
    hotkey: 'W',
    affordable: canAffordTech(w, 'sturdyMud'),
    description: smTech.description,
    category: 'tech',
    costBreakdown: { clams: smCost.clams, twigs: smCost.twigs },
    requires: techRequiresLabel('sturdyMud'),
    onClick: () => {
      if (purchaseTech(w, 'sturdyMud')) {
        recorder?.record(w.frameCount, 'research', { tech: 'sturdyMud' });
      }
    },
  });
  const spTech = TECH_UPGRADES.swiftPaws;
  const spCost = discountedTechCost(w, spTech.clamCost, spTech.twigCost);
  btns.push({
    title: spTech.name,
    cost: `${spCost.clams}C ${spCost.twigs}T`,
    hotkey: 'E',
    affordable: canAffordTech(w, 'swiftPaws'),
    description: spTech.description,
    category: 'tech',
    costBreakdown: { clams: spCost.clams, twigs: spCost.twigs },
    requires: techRequiresLabel('swiftPaws'),
    onClick: () => {
      if (purchaseTech(w, 'swiftPaws')) {
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
    const swimDiscount = 1 - w.commanderModifiers.passiveSwimmerCostReduction;
    const swimClam = Math.round((swimDef.clamCost ?? 0) * swimDiscount);
    const swimTwig = Math.round((swimDef.twigCost ?? 0) * swimDiscount);
    btns.push({
      title: 'Swimmer',
      cost: `${swimClam}C ${swimTwig}T ${swimDef.foodCost}F`,
      hotkey: 'F',
      affordable:
        w.resources.clams >= swimClam &&
        w.resources.twigs >= swimTwig &&
        w.resources.food + (swimDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Amphibious fast unit. Great for scouting and harassing.',
      category: 'train',
      costBreakdown: { clams: swimClam, twigs: swimTwig, food: swimDef.foodCost },
      requires: 'Requires: Aquatic Training',
      onClick: () => {
        train(w, lodgeEid, EntityKind.Swimmer, swimClam, swimTwig, swimDef.foodCost ?? 1);
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
        const cartoCost = discountedTechCost(w, cartoTech.clamCost, cartoTech.twigCost);
        btns.push({
          title: cartoTech.name,
          cost: `${cartoCost.clams}C ${cartoCost.twigs}T`,
          hotkey: 'Y',
          affordable: canAffordTech(w, 'cartography'),
          description: cartoTech.description,
          category: 'tech',
          costBreakdown: { clams: cartoCost.clams, twigs: cartoCost.twigs },
          requires: techRequiresLabel('cartography'),
          onClick: () => {
            purchaseTech(w, 'cartography');
          },
        });
        const thTech = TECH_UPGRADES.tidalHarvest;
        const thCost = discountedTechCost(w, thTech.clamCost, thTech.twigCost);
        btns.push({
          title: thTech.name,
          cost: `${thCost.clams}C ${thCost.twigs}T`,
          hotkey: 'U',
          affordable: canAffordTech(w, 'tidalHarvest'),
          description: thTech.description,
          category: 'tech',
          costBreakdown: { clams: thCost.clams, twigs: thCost.twigs },
          requires: techRequiresLabel('tidalHarvest'),
          onClick: () => {
            purchaseTech(w, 'tidalHarvest');
          },
        });
        const hmTech = TECH_UPGRADES.herbalMedicine;
        const hmCost = discountedTechCost(w, hmTech.clamCost, hmTech.twigCost);
        btns.push({
          title: hmTech.name,
          cost: `${hmCost.clams}C ${hmCost.twigs}T`,
          hotkey: 'I',
          affordable: canAffordTech(w, 'herbalMedicine'),
          description: hmTech.description,
          category: 'tech',
          costBreakdown: { clams: hmCost.clams, twigs: hmCost.twigs },
          requires: techRequiresLabel('herbalMedicine'),
          onClick: () => {
            purchaseTech(w, 'herbalMedicine');
          },
        });
        const atTech = TECH_UPGRADES.aquaticTraining;
        const atCost = discountedTechCost(w, atTech.clamCost, atTech.twigCost);
        btns.push({
          title: atTech.name,
          cost: `${atCost.clams}C ${atCost.twigs}T`,
          hotkey: 'O',
          affordable: canAffordTech(w, 'aquaticTraining'),
          description: atTech.description,
          category: 'tech',
          costBreakdown: { clams: atCost.clams, twigs: atCost.twigs },
          requires: techRequiresLabel('aquaticTraining'),
          onClick: () => {
            purchaseTech(w, 'aquaticTraining');
          },
        });
        const ddTech = TECH_UPGRADES.deepDiving;
        const ddCost = discountedTechCost(w, ddTech.clamCost, ddTech.twigCost);
        btns.push({
          title: ddTech.name,
          cost: `${ddCost.clams}C ${ddCost.twigs}T`,
          hotkey: 'P',
          affordable: canAffordTech(w, 'deepDiving'),
          description: ddTech.description,
          category: 'tech',
          costBreakdown: { clams: ddCost.clams, twigs: ddCost.twigs },
          requires: techRequiresLabel('deepDiving'),
          onClick: () => {
            purchaseTech(w, 'deepDiving');
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
        const ssCost = discountedTechCost(w, ssTech.clamCost, ssTech.twigCost);
        btns.push({
          title: ssTech.name,
          cost: `${ssCost.clams}C ${ssCost.twigs}T`,
          hotkey: 'R',
          affordable: canAffordTech(w, 'sharpSticks'),
          description: ssTech.description,
          category: 'tech',
          costBreakdown: { clams: ssCost.clams, twigs: ssCost.twigs },
          requires: techRequiresLabel('sharpSticks'),
          onClick: () => {
            purchaseTech(w, 'sharpSticks');
          },
        });
        const eeTech = TECH_UPGRADES.eagleEye;
        const eeCost = discountedTechCost(w, eeTech.clamCost, eeTech.twigCost);
        btns.push({
          title: eeTech.name,
          cost: `${eeCost.clams}C ${eeCost.twigs}T`,
          hotkey: 'T',
          affordable: canAffordTech(w, 'eagleEye'),
          description: eeTech.description,
          category: 'tech',
          costBreakdown: { clams: eeCost.clams, twigs: eeCost.twigs },
          requires: techRequiresLabel('eagleEye'),
          onClick: () => {
            purchaseTech(w, 'eagleEye');
          },
        });
        const hsTech = TECH_UPGRADES.hardenedShells;
        const hsPearlCost = hsTech.pearlCost ?? 0;
        const hsCost = discountedTechCost(w, hsTech.clamCost, hsTech.twigCost);
        btns.push({
          title: hsTech.name,
          cost: `${hsCost.clams}C ${hsCost.twigs}T${hsPearlCost > 0 ? ` ${hsPearlCost}P` : ''}`,
          hotkey: 'Y',
          affordable: canAffordTech(w, 'hardenedShells') && w.resources.pearls >= hsPearlCost,
          description: hsTech.description,
          category: 'tech',
          costBreakdown: { clams: hsCost.clams, twigs: hsCost.twigs, pearls: hsPearlCost },
          requires: techRequiresLabel('hardenedShells'),
          onClick: () => {
            purchaseTech(w, 'hardenedShells');
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
        const isCost = discountedTechCost(w, isTech.clamCost, isTech.twigCost);
        btns.push({
          title: isTech.name,
          cost: `${isCost.clams}C ${isCost.twigs}T`,
          hotkey: 'Z',
          affordable: canAffordTech(w, 'ironShell'),
          description: isTech.description,
          category: 'tech',
          costBreakdown: { clams: isCost.clams, twigs: isCost.twigs },
          requires: techRequiresLabel('ironShell'),
          onClick: () => {
            purchaseTech(w, 'ironShell');
          },
        });
        const swTech = TECH_UPGRADES.siegeWorks;
        const swPearlCost = swTech.pearlCost ?? 0;
        const swCost = discountedTechCost(w, swTech.clamCost, swTech.twigCost);
        btns.push({
          title: swTech.name,
          cost: `${swCost.clams}C ${swCost.twigs}T${swPearlCost > 0 ? ` ${swPearlCost}P` : ''}`,
          hotkey: 'X',
          affordable: canAffordTech(w, 'siegeWorks'),
          description: swTech.description,
          category: 'tech',
          costBreakdown: { clams: swCost.clams, twigs: swCost.twigs, pearls: swPearlCost },
          requires: techRequiresLabel('siegeWorks'),
          onClick: () => {
            purchaseTech(w, 'siegeWorks');
          },
        });
        const brTech = TECH_UPGRADES.battleRoar;
        const brCost = discountedTechCost(w, brTech.clamCost, brTech.twigCost);
        btns.push({
          title: brTech.name,
          cost: `${brCost.clams}C ${brCost.twigs}T`,
          hotkey: 'C',
          affordable: canAffordTech(w, 'battleRoar'),
          description: brTech.description,
          category: 'tech',
          costBreakdown: { clams: brCost.clams, twigs: brCost.twigs },
          requires: techRequiresLabel('battleRoar'),
          onClick: () => {
            purchaseTech(w, 'battleRoar');
          },
        });
        const ctTech = TECH_UPGRADES.cunningTraps;
        const ctCost = discountedTechCost(w, ctTech.clamCost, ctTech.twigCost);
        btns.push({
          title: ctTech.name,
          cost: `${ctCost.clams}C ${ctCost.twigs}T`,
          hotkey: 'V',
          affordable: canAffordTech(w, 'cunningTraps'),
          description: ctTech.description,
          category: 'tech',
          costBreakdown: { clams: ctCost.clams, twigs: ctCost.twigs },
          requires: techRequiresLabel('cunningTraps'),
          onClick: () => {
            purchaseTech(w, 'cunningTraps');
          },
        });
        const camoTech = TECH_UPGRADES.camouflage;
        const camoCost = discountedTechCost(w, camoTech.clamCost, camoTech.twigCost);
        btns.push({
          title: camoTech.name,
          cost: `${camoCost.clams}C ${camoCost.twigs}T`,
          hotkey: 'B',
          affordable: canAffordTech(w, 'camouflage'),
          description: camoTech.description,
          category: 'tech',
          costBreakdown: { clams: camoCost.clams, twigs: camoCost.twigs },
          requires: techRequiresLabel('camouflage'),
          onClick: () => {
            purchaseTech(w, 'camouflage');
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
