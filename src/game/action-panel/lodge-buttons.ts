/**
 * Action Panel — Lodge Buttons
 *
 * Builds Lodge action buttons (Gatherer, Sturdy Mud, Swift Paws,
 * Scout, Swimmer, Tech Tree) shared by Global Command Center and
 * selected-Lodge panel.
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import { TECH_UPGRADES } from '@/config/tech-tree';
import type { GameWorld } from '@/ecs/world';
import { train } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import { EntityKind } from '@/types';
import type { ActionButtonDef } from '@/ui/action-panel';
import * as store from '@/ui/store';

import { canAffordTech, discountedTechCost, purchaseTech, techRequiresLabel } from './tech-helpers';

export function buildLodgeButtons(
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
