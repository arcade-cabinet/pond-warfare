/**
 * Campaign Mission Definitions — Missions 8A/8B
 *
 * Split from mission-defs-finale.ts to stay under 300 LOC.
 *   8A) Shadow Strike — Stealth path (requires Mission 7)
 *   8B) Iron Tide — Siege path (requires Mission 7)
 */

import { EK, type MissionDef } from './mission-types';

export const mission8A: MissionDef = {
  id: 'shadow-strike',
  number: 8,
  title: 'Shadow Strike',
  subtitle: 'Destroy the enemy Lodge undetected',
  recommendedBranch: 'shadow',
  briefing: [
    'Commander, the enemy Lodge lies deep in the swamp.',
    'Heavy patrols guard every approach. Brute force will fail.',
    '',
    'Use Camouflage to hide your Trappers and Divers to flank',
    'through underwater paths. Cunning Traps can disable patrols',
    'while your strike team slips through.',
    '',
    'Swift Paws and Camouflage are already researched.',
    'Research Venom Coating for a lethal finishing blow.',
    'Destroy the enemy Lodge to complete the mission.',
  ].join('\n'),
  objectives: [
    {
      id: 'research-venom-coating',
      type: 'research',
      label: 'Research Venom Coating (poison melee)',
      techId: 'venomCoating',
    },
    {
      id: 'destroy-enemy-lodge',
      type: 'destroyNest',
      label: 'Destroy the Enemy Lodge',
      count: 1,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, stealth is our weapon. Stay hidden and strike from the shadows.',
      duration: 240,
    },
    {
      frame: 600,
      text: 'Trappers with Camouflage are invisible when still. Ambush their patrols.',
      duration: 210,
    },
    {
      frame: 1800,
      text: 'Divers can move through water unseen. Use them to flank the Lodge.',
      duration: 210,
    },
    {
      frame: 3600,
      text: 'Research Venom Coating. Poisoned blades will bring the Lodge down fast.',
      duration: 180,
    },
    {
      frame: 5400,
      text: 'Strike now! The Lodge is exposed.',
      duration: 150,
    },
  ],
  settingsOverrides: {
    scenario: 'swamp',
    enemyNests: 1,
    enemyAggression: 'aggressive',
    peaceMinutes: 1,
    fogOfWar: 'full',
    resourceDensity: 'sparse',
  },
  worldOverrides: {
    startingTech: ['swiftPaws', 'cunningTraps', 'camouflage'],
    startingResourcesMult: 0.75,
  },
};

export const mission8B: MissionDef = {
  id: 'iron-tide',
  number: 8,
  title: 'Iron Tide',
  subtitle: 'Siege the enemy fortifications',
  recommendedBranch: 'fortifications',
  briefing: [
    'The enemy has dug in behind three fortified positions.',
    'Walls, towers, and defenders block every approach.',
    '',
    'Research Siege Works to unlock Catapults -- they demolish',
    'buildings from range. War Drums will boost your melee fighters',
    'as they storm the breaches.',
    '',
    'Siege Works and Fortified Walls are already researched.',
    'Build Catapults and flatten their defenses.',
  ].join('\n'),
  objectives: [
    {
      id: 'research-war-drums',
      type: 'research',
      label: 'Research War Drums (melee aura)',
      techId: 'warDrums',
    },
    {
      id: 'train-catapults',
      type: 'train',
      label: 'Train 2 Catapults',
      entityKind: EK.Catapult,
      count: 2,
    },
    {
      id: 'destroy-fortifications',
      type: 'destroyNest',
      label: 'Destroy 3 Enemy Fortifications',
      count: 3,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, their walls are thick. We need siege weapons.',
      duration: 240,
    },
    {
      frame: 600,
      text: 'Build Catapults at the Armory. They outrange towers.',
      duration: 210,
    },
    {
      frame: 1800,
      text: 'Research War Drums. The melee aura will help your soldiers storm the gaps.',
      duration: 210,
    },
    {
      frame: 3600,
      text: 'First fortification down! Two more to go.',
      duration: 180,
    },
    {
      frame: 5400,
      text: 'Push through! Flatten everything in our path!',
      duration: 150,
    },
  ],
  settingsOverrides: {
    scenario: 'contested',
    enemyNests: 3,
    enemyAggression: 'aggressive',
    peaceMinutes: 1,
    fogOfWar: 'full',
    resourceDensity: 'rich',
  },
  worldOverrides: {
    startingTech: ['sharpSticks', 'eagleEye', 'sturdyMud', 'siegeWorks', 'fortifiedWalls'],
  },
};
