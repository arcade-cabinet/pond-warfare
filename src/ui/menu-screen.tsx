/**
 * MenuScreen — menu shell plus all overlays that can open from the landing page.
 */

import {
  handleClamsChange,
  handleCommanderSelect,
  handleCurrentRunUpgradeStateChange,
  handlePearlBack,
  handlePearlStateChange,
  handleUpgradesBack,
} from './app-v3-handlers';
import { SvgFilters } from './components/SvgFilters';
import { SwampEcosystem } from './components/SwampEcosystem';
import { ErrorOverlay } from './error-overlay';
import { KeyboardReference } from './keyboard-reference';
import { MainMenu } from './main-menu';
import { SettingsOverlay } from './overlays/SettingsOverlay';
import { MultiplayerLobby } from './screens/MultiplayerLobby';
import { PearlUpgradeScreen } from './screens/PearlUpgradeScreen';
import { UpgradeWebScreen } from './screens/UpgradeWebScreen';
import * as store from './store';
import * as mp from './store-multiplayer';
import * as storeV3 from './store-v3';

export function MenuScreen() {
  return (
    <div class="relative h-screen w-screen overflow-hidden" style={{ color: 'var(--pw-text-primary)' }}>
      <div class="rotate-prompt">
        <div class="text-center">
          <span style={{ fontSize: '48px' }}>&#x1F4F1;&#x2194;&#xFE0F;</span>
          <p class="font-heading text-lg mt-4">Please rotate your device to landscape</p>
        </div>
      </div>
      <SwampEcosystem />
      <SvgFilters />
      <ErrorOverlay />
      <MainMenu />
      <SettingsOverlay />
      {storeV3.upgradesScreenOpen.value && (
        <UpgradeWebScreen
          clams={storeV3.totalClams.value}
          onClamsChange={handleClamsChange}
          purchasedNodeIds={storeV3.currentRunPurchasedNodeIds.value}
          purchasedDiamondIds={storeV3.currentRunPurchasedDiamondIds.value}
          startingTierRank={storeV3.startingTierRank.value}
          onUpgradeStateChange={handleCurrentRunUpgradeStateChange}
          onBack={handleUpgradesBack}
        />
      )}
      {store.keyboardRefOpen.value && (
        <KeyboardReference
          onClose={() => {
            store.keyboardRefOpen.value = false;
          }}
        />
      )}
      {storeV3.pearlScreenOpen.value && (
        <PearlUpgradeScreen
          prestigeState={storeV3.prestigeState.value}
          onStateChange={handlePearlStateChange}
          onBack={handlePearlBack}
          selectedCommanderId={store.selectedCommander.value}
          onCommanderSelect={handleCommanderSelect}
          playerProfile={storeV3.playerProfile.value}
        />
      )}
      {mp.multiplayerMenuOpen.value && <MultiplayerLobby />}
    </div>
  );
}
