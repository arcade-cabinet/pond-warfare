import type { ReplayRecorder } from '@/replay';
import type { GameWorld } from '@/ecs/world';
import type { ActionButtonDef } from '@/ui/action-panel';
import {
  getActiveSpecialistCount,
  getSpecialistBlueprintCap,
} from '@/game/specialist-blueprints';
import {
  canSpawnSpecialistFromLodge,
  getSpecialistSpawnCost,
  spawnSpecialistFromLodge,
} from '@/game/specialist-training';

interface SpecialistButtonSpec {
  unitId: string;
  title: string;
  hotkey: string;
  requiredStage: number;
  description: string;
}

const SPECIALIST_BUTTON_SPECS: SpecialistButtonSpec[] = [
  {
    unitId: 'fisher',
    title: 'Fisher',
    hotkey: '1',
    requiredStage: 1,
    description: 'Autonomous fish specialist. Assign an operating radius on the map.',
  },
  {
    unitId: 'logger',
    title: 'Logger',
    hotkey: '2',
    requiredStage: 2,
    description: 'Autonomous log specialist. Works inside its assigned radius.',
  },
  {
    unitId: 'digger',
    title: 'Digger',
    hotkey: '3',
    requiredStage: 5,
    description: 'Autonomous rock specialist for later frontier pressure.',
  },
  {
    unitId: 'guardian',
    title: 'Guard',
    hotkey: '4',
    requiredStage: 1,
    description: 'Autonomous melee defender that holds its assigned area.',
  },
  {
    unitId: 'hunter',
    title: 'Hunter',
    hotkey: '5',
    requiredStage: 3,
    description: 'Autonomous attack specialist that pressures forward lanes.',
  },
  {
    unitId: 'ranger',
    title: 'Ranger',
    hotkey: '6',
    requiredStage: 3,
    description: 'Autonomous ranged patrol specialist with a projected fire zone.',
  },
  {
    unitId: 'shaman',
    title: 'Shaman',
    hotkey: '7',
    requiredStage: 2,
    description: 'Autonomous healer that keeps allies alive inside its radius.',
  },
  {
    unitId: 'lookout',
    title: 'Lookout',
    hotkey: '8',
    requiredStage: 1,
    description: 'Autonomous scout that patrols and maintains vision in its radius.',
  },
];

export function buildSpecialistButtons(
  world: GameWorld,
  lodgeEid: number,
  recorder?: ReplayRecorder,
): ActionButtonDef[] {
  const stage = world.panelGrid?.getActivePanels().length ?? 1;
  const buttons: ActionButtonDef[] = [];

  for (const spec of SPECIALIST_BUTTON_SPECS) {
    const cap = getSpecialistBlueprintCap(world, spec.unitId);
    if (cap <= 0) continue;

    const active = getActiveSpecialistCount(world, spec.unitId);
    const atCap = active >= cap;
    const stageBlocked = stage < spec.requiredStage;
    const cost = getSpecialistSpawnCost(spec.unitId);
    const affordable = !stageBlocked && !atCap && canSpawnSpecialistFromLodge(world, spec.unitId);

    buttons.push({
      title: spec.title,
      hotkey: spec.hotkey,
      category: 'train',
      affordable,
      cost: formatCost(cost, active, cap),
      description: spec.description,
      costBreakdown: {
        fish: cost.fish,
        logs: cost.logs,
        rocks: cost.rocks,
        food: cost.food,
      },
      requires: stageBlocked
        ? `Requires: Frontier stage ${spec.requiredStage}`
        : atCap
          ? `Requires: Open cap (${active}/${cap} fielded)`
          : undefined,
      onClick: () => {
        if (!spawnSpecialistFromLodge(world, lodgeEid, spec.unitId, spec.title)) return;
        recorder?.record(world.frameCount, 'train', {
          buildingEid: lodgeEid,
          unitKind: spec.unitId,
        });
      },
    });
  }

  return buttons;
}

function formatCost(
  cost: { fish: number; logs: number; rocks: number; food: number },
  active: number,
  cap: number,
): string {
  const parts: string[] = [];
  if (cost.fish > 0) parts.push(`${cost.fish}F`);
  if (cost.logs > 0) parts.push(`${cost.logs}L`);
  if (cost.rocks > 0) parts.push(`${cost.rocks}R`);
  parts.push(`${cost.food}Pop`);
  return `${parts.join(' ')}\n${active}/${cap}`;
}
