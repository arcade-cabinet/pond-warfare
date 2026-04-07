import { generateUpgradeWeb } from '@/config/upgrade-web';

const MIN_PANEL_STAGE = 1;
const MAX_PANEL_STAGE = 6;

export interface CurrentRunDiamondEffects {
  panelStage: number;
}

export function resolveCurrentRunDiamondEffects(
  purchasedDiamondIds: string[],
): CurrentRunDiamondEffects {
  const web = generateUpgradeWeb();
  let panelStage = MIN_PANEL_STAGE;

  for (const diamondId of new Set(purchasedDiamondIds)) {
    const diamond = web.diamondMap.get(diamondId);
    if (!diamond) continue;

    const effect = diamond.effect;
    if (effect.type === 'unlock_panel_stage' && Number.isFinite(effect.stage)) {
      panelStage = Math.max(panelStage, clampPanelStage(effect.stage ?? MIN_PANEL_STAGE));
    }
  }

  return { panelStage };
}

export function getCurrentRunPanelStage(purchasedDiamondIds: string[]): number {
  return resolveCurrentRunDiamondEffects(purchasedDiamondIds).panelStage;
}

function clampPanelStage(stage: number): number {
  return Math.max(MIN_PANEL_STAGE, Math.min(MAX_PANEL_STAGE, Math.trunc(stage)));
}
