import { query } from 'bitecs';
import { render } from 'preact';
import { afterAll, describe, expect, it } from 'vitest';
import { EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import { game } from '@/game';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { calculateMatchReward } from '@/game/match-rewards';
import { App } from '@/ui/app';
import { actionButtons } from '@/ui/action-panel';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import '@/styles/main.css';
import { EntityKind, Faction } from '@/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function clickButtonText(
  text: string,
  options: { exact?: boolean; preferLast?: boolean } = {},
): void {
  const { exact = false, preferLast = false } = options;
  const candidates = Array.from(document.querySelectorAll('button')).filter((node) => {
    if (node.disabled) return false;
    const content = node.textContent?.trim() ?? '';
    return exact ? content === text : content.includes(text);
  });
  const target = (preferLast ? candidates[candidates.length - 1] : candidates[0]) as
    | HTMLButtonElement
    | undefined;
  if (!target) {
    throw new Error(`Button not found: ${text}`);
  }
  target.click();
}

function hasButtonText(
  text: string,
  options: { exact?: boolean; preferLast?: boolean } = {},
): boolean {
  const { exact = false } = options;
  return Array.from(document.querySelectorAll('button')).some((node) => {
    if (node.disabled) return false;
    const content = node.textContent?.trim() ?? '';
    return exact ? content === text : content.includes(text);
  });
}

function clickAriaLabel(label: string): void {
  const target = document.querySelector(`[aria-label="${label}"]`) as HTMLElement | null;
  if (!target) {
    throw new Error(`Element not found: ${label}`);
  }
  target.click();
}

function clickAriaLabelPrefix(prefix: string): void {
  const target = Array.from(document.querySelectorAll('[aria-label]')).find((node) =>
    node.getAttribute('aria-label')?.startsWith(prefix),
  ) as HTMLElement | undefined;
  if (!target) {
    throw new Error(`Element not found: ${prefix}`);
  }
  target.click();
}

function clickFirstBuyButton(kind: 'Pearls' | 'Clams'): void {
  const buttons = Array.from(document.querySelectorAll('button')).filter(
    (node) =>
      !node.disabled &&
      node.getAttribute('aria-label')?.startsWith('Buy ') &&
      node.getAttribute('aria-label')?.includes(kind),
  );
  const target = buttons[0] as HTMLButtonElement | undefined;
  if (!target) {
    throw new Error(`Buy button not found for ${kind}`);
  }
  target.click();
}

function countPlayerUnits(kind: EntityKind): number {
  return Array.from(query(game.world.ecs, [Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === kind &&
      Health.current[eid] > 0,
  ).length;
}

async function waitFor(predicate: () => boolean, timeoutMs = 8_000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await delay(25);
  }
}

async function waitFrames(count: number): Promise<void> {
  const start = game.world.frameCount;
  await waitFor(() => game.world.frameCount - start >= count, Math.max(8_000, count * 40));
}

function setRewardsState(options: {
  progressionLevel: number;
  totalClams: number;
  prestigeRank: number;
  canRankUp: boolean;
}) {
  storeV3.progressionLevel.value = options.progressionLevel;
  storeV3.totalClams.value = options.totalClams;
  storeV3.lastRewardBreakdown.value = calculateMatchReward({
    result: 'win',
    durationSeconds: 420,
    kills: 8,
    resourcesGathered: 180,
    eventsCompleted: 2,
    prestigeRank: options.prestigeRank,
  });
  storeV3.matchEventsCompleted.value = 2;
  storeV3.canRankUpAfterMatch.value = options.canRankUp;
  storeV3.rewardsScreenOpen.value = true;
}

async function mountAppShell() {
  let root = document.getElementById('app');
  if (!root) {
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:#000';

  const resolvers: Array<() => void> = [];

  render(
    <App
      onMount={async (refs) => {
        await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);
        const resolve = resolvers.shift();
        resolve?.();
      }}
    />,
    root,
  );

  return {
    waitForInit: () =>
      new Promise<void>((resolve) => {
        resolvers.push(resolve);
      }),
    root,
  };
}

async function startSinglePlayer(waitForInit: () => Promise<void>) {
  const init = waitForInit();
  clickButtonText('PLAY', { exact: true });
  await delay(100);
  clickButtonText('SINGLE PLAYER', { exact: true });
  await init;
  await waitFrames(20);
}

describe('progression meta loop', () => {
  afterAll(() => {
    store.menuState.value = 'main';
    store.settingsOpen.value = false;
    store.continueRequested.value = false;
    store.hasSaveGame.value = false;
    storeV3.pearlScreenOpen.value = false;
    storeV3.upgradesScreenOpen.value = false;
    storeV3.rewardsScreenOpen.value = false;
    storeV3.clamUpgradeScreenOpen.value = false;
    storeV3.rankUpModalOpen.value = false;
    storeV3.currentRunPurchasedNodeIds.value = [];
    storeV3.currentRunPurchasedDiamondIds.value = [];
    if ((game as unknown as { running?: boolean }).running) {
      game.destroy();
    }
    const root = document.getElementById('app');
    if (root) {
      render(null, root);
    }
    document.body.innerHTML = '';
  });

  it('applies Pearl and Clam progression purchases on subsequent matches', async () => {
    store.menuState.value = 'main';
    store.settingsOpen.value = false;
    store.continueRequested.value = false;
    store.hasSaveGame.value = false;
    storeV3.progressionLevel.value = 0;
    storeV3.totalClams.value = 0;
    storeV3.prestigeRank.value = 0;
    storeV3.totalPearls.value = 0;
    storeV3.startingTierRank.value = 0;
    storeV3.currentRunPurchasedNodeIds.value = [];
    storeV3.currentRunPurchasedDiamondIds.value = [];
    storeV3.prestigeState.value = {
      rank: 0,
      pearls: 0,
      totalPearlsEarned: 0,
      upgradeRanks: {},
    };
    const shell = await mountAppShell();

    await startSinglePlayer(shell.waitForInit);
    const baseMudpawChassisCount = countPlayerUnits(MUDPAW_KIND);
    const baseGatherSpeed = game.world.gatherSpeedMod;
    expect(baseGatherSpeed).toBe(1);

    setRewardsState({
      progressionLevel: 40,
      totalClams: 0,
      prestigeRank: 0,
      canRankUp: true,
    });

    await waitFor(() => hasButtonText('RANK UP', { exact: true }));
    clickButtonText('RANK UP', { exact: true });
    await delay(100);
    clickAriaLabel('Confirm rank up to rank 1');
    await waitFor(() => store.menuState.value === 'main');
    expect(storeV3.prestigeRank.value).toBe(1);
    expect(storeV3.totalPearls.value).toBeGreaterThanOrEqual(20);

    clickButtonText('PRESTIGE', { exact: true });
    await waitFor(() => storeV3.pearlScreenOpen.value);
    await waitFor(() => hasButtonText('Upgrades', { exact: true }));
    clickButtonText('Upgrades', { exact: true, preferLast: true });
    await delay(100);
    await waitFor(() =>
      Array.from(document.querySelectorAll('[aria-label]')).some((node) =>
        node.getAttribute('aria-label')?.startsWith('Toggle Fisher'),
      ),
    );
    clickAriaLabelPrefix('Toggle Fisher');
    await delay(100);
    clickAriaLabel('Buy Fisher Blueprint for 3 Pearls');
    await delay(100);
    clickButtonText('Close', { exact: true });
    await delay(100);
    clickButtonText('Confirm', { exact: true, preferLast: true });
    await waitFor(() => !storeV3.pearlScreenOpen.value);
    expect(storeV3.prestigeState.value.upgradeRanks.blueprint_fisher).toBe(1);

    await startSinglePlayer(shell.waitForInit);
    const blueprintMudpawChassisCount = countPlayerUnits(MUDPAW_KIND);
    const preClamGatherSpeed = game.world.gatherSpeedMod;
    expect(blueprintMudpawChassisCount).toBe(baseMudpawChassisCount);
    expect(game.world.specialistBlueprintCaps.fisher).toBe(1);
    game.world.selection = [];
    game.syncUIStore();
    await waitFor(() => actionButtons.value.some((button) => button.title === 'Fisher'));
    actionButtons.value.find((button) => button.title === 'Fisher')?.onClick();
    await delay(100);
    const afterTrainingMudpawChassisCount = countPlayerUnits(MUDPAW_KIND);
    expect(afterTrainingMudpawChassisCount).toBeGreaterThan(blueprintMudpawChassisCount);
    expect(preClamGatherSpeed).toBe(baseGatherSpeed);

    setRewardsState({
      progressionLevel: 1,
      totalClams: 350,
      prestigeRank: storeV3.prestigeRank.value,
      canRankUp: false,
    });
    storeV3.currentRunPurchasedNodeIds.value = [
      'gathering_fish_gathering_t0',
      'gathering_log_gathering_t0',
    ];

    await waitFor(() => hasButtonText('Upgrades', { exact: true }));
    clickButtonText('Upgrades', { exact: true });
    await waitFor(() => storeV3.clamUpgradeScreenOpen.value);
    await waitFor(() =>
      Array.from(document.querySelectorAll('[aria-label]')).some((node) =>
        node.getAttribute('aria-label')?.startsWith('Toggle Gathering'),
      ),
    );
    clickAriaLabelPrefix('Toggle Gathering');
    await delay(100);
    clickAriaLabel('Buy Frontier Expansion I for 30 Clams');
    await delay(100);
    clickFirstBuyButton('Clams');
    await delay(100);
    clickButtonText('Done', { exact: true });
    await delay(100);
    clickButtonText('Confirm', { exact: true, preferLast: true });
    await waitFor(() => store.menuState.value === 'main');
    expect(storeV3.currentRunPurchasedNodeIds.value.length).toBeGreaterThan(0);
    expect(storeV3.currentRunPurchasedDiamondIds.value).toContain('frontier_expansion_1');

    await startSinglePlayer(shell.waitForInit);
    expect(game.world.panelGrid?.getActivePanels().length).toBe(2);
    expect(game.world.gatherSpeedMod).toBeGreaterThan(preClamGatherSpeed);
  }, 120_000);
});
