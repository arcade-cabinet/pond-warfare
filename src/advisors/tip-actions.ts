/**
 * Advisor Tip Action Handler
 *
 * Maps tip action strings to UI navigation commands.
 * Called when a user taps an actionable advisor tip.
 */

import { openSettings, openTechTree } from '@/ui/game-actions';
import * as store from '@/ui/store';
import { dismissCurrentTip } from './advisor-system';

/** Execute a tip's navigation action, then auto-dismiss the tip. */
export function executeAdvisorAction(action: string): void {
  switch (action) {
    case 'open-forces':
      store.mobilePanelOpen.value = true;
      store.activePanelTab.value = 'forces';
      break;
    case 'open-buildings':
      store.mobilePanelOpen.value = true;
      store.activePanelTab.value = 'buildings';
      break;
    case 'open-tech-tree':
      openTechTree();
      break;
    case 'open-settings':
      openSettings();
      break;
    default:
      break;
  }
  dismissCurrentTip();
}
