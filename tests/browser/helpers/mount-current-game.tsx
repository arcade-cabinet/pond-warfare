import { query } from 'bitecs';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityTypeTag, FactionTag, Health, IsResource, Position } from '@/ecs/components';
import { render } from 'preact';
import { game } from '@/game';
import { App } from '@/ui/app';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { EntityKind, Faction } from '@/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function clickRequiredButton(text: string): void {
  const button = Array.from(document.querySelectorAll('button')).find(
    (node) => node.textContent?.includes(text) && !node.disabled,
  );
  if (!button) {
    throw new Error(`Button not found: ${text}`);
  }
  button.click();
}

function getPlayerUnitIds(kind?: EntityKind): number[] {
  return Array.from(query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      (kind === undefined || EntityTypeTag.kind[eid] === kind),
  );
}

function getNearbyEntityIds(
  kind: EntityKind,
  faction: Faction,
  centerX: number,
  centerY: number,
  radius: number,
): number[] {
  const radiusSq = radius * radius;
  return Array.from(query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag])).filter(
    (eid) => {
      if (FactionTag.faction[eid] !== faction) return false;
      if (Health.current[eid] <= 0) return false;
      if (EntityTypeTag.kind[eid] !== kind) return false;
      const dx = Position.x[eid] - centerX;
      const dy = Position.y[eid] - centerY;
      return dx * dx + dy * dy <= radiusSq;
    },
  );
}

function getNearbyResourceIds(kind: EntityKind, centerX: number, centerY: number, radius: number): number[] {
  const radiusSq = radius * radius;
  return Array.from(query(game.world.ecs, [Position, Health, IsResource, EntityTypeTag])).filter(
    (eid) => {
      if (Health.current[eid] <= 0) return false;
      if (EntityTypeTag.kind[eid] !== kind) return false;
      const dx = Position.x[eid] - centerX;
      const dy = Position.y[eid] - centerY;
      return dx * dx + dy * dy <= radiusSq;
    },
  );
}

function ensureBrowserTestRoster(): void {
  const lodge = getPlayerUnitIds(EntityKind.Lodge)[0];
  if (lodge == null) return;

  const lodgeX = Position.x[lodge];
  const lodgeY = Position.y[lodge];
  const gatherers = getPlayerUnitIds(EntityKind.Gatherer);
  const brawlers = getPlayerUnitIds(EntityKind.Brawler);

  for (let i = gatherers.length; i < 2; i += 1) {
    spawnEntity(game.world, EntityKind.Gatherer, lodgeX - 90 + i * 36, lodgeY - 70, Faction.Player);
  }

  if (brawlers.length === 0) {
    spawnEntity(game.world, EntityKind.Brawler, lodgeX + 70, lodgeY - 90, Faction.Player);
  }
}

function ensureBrowserTestSandbox(): void {
  const lodge = getPlayerUnitIds(EntityKind.Lodge)[0];
  if (lodge == null) return;

  const lodgeX = Position.x[lodge];
  const lodgeY = Position.y[lodge];

  game.world.resources.fish = Math.max(game.world.resources.fish, 200);
  game.world.resources.logs = Math.max(game.world.resources.logs, 200);
  game.world.resources.rocks = Math.max(game.world.resources.rocks, 100);

  if (getNearbyResourceIds(EntityKind.Clambed, lodgeX, lodgeY, 120).length === 0) {
    spawnEntity(game.world, EntityKind.Clambed, lodgeX + 96, lodgeY - 24, Faction.Neutral);
  }
  if (getNearbyResourceIds(EntityKind.Cattail, lodgeX, lodgeY, 120).length === 0) {
    spawnEntity(game.world, EntityKind.Cattail, lodgeX - 96, lodgeY - 24, Faction.Neutral);
  }
  if (getNearbyResourceIds(EntityKind.PearlBed, lodgeX, lodgeY, 120).length === 0) {
    spawnEntity(game.world, EntityKind.PearlBed, lodgeX + 72, lodgeY + 84, Faction.Neutral);
  }

  if (getNearbyEntityIds(EntityKind.PredatorNest, Faction.Enemy, lodgeX, lodgeY - 520, 400).length === 0) {
    spawnEntity(game.world, EntityKind.PredatorNest, lodgeX, Math.max(180, lodgeY - 520), Faction.Enemy);
  }
}

export async function mountCurrentGame(): Promise<void> {
  if ((game as unknown as { running?: boolean }).running) {
    game.destroy();
  }

  store.menuState.value = 'main';
  store.continueRequested.value = false;
  store.hasSaveGame.value = false;
  store.settingsOpen.value = false;
  storeV3.progressionLevel.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];
  storeV3.pearlScreenOpen.value = false;
  storeV3.upgradesScreenOpen.value = false;
  storeV3.rewardsScreenOpen.value = false;
  storeV3.clamUpgradeScreenOpen.value = false;
  storeV3.rankUpModalOpen.value = false;

  let root = document.getElementById('app');
  if (!root) {
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden';

  const ready = new Promise<void>((resolve) => {
    render(
      <App
        onMount={async (refs) => {
          await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas);
          resolve();
        }}
      />,
      root!,
    );
  });

  await delay(150);
  clickRequiredButton('PLAY');
  await delay(150);
  clickRequiredButton('SINGLE PLAYER');
  await ready;
  ensureBrowserTestRoster();
  ensureBrowserTestSandbox();
  game.syncUIStore();
  await delay(250);
}
