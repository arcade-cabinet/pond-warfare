/**
 * Combat audio delegates — methods that combine SFX with reactive cue stingers.
 *
 * Extracted from AudioSystem to keep audio-system.ts under 300 LOC.
 */

import type { CueManager } from './cues';
import type { SfxManager } from './sfx';

/** Play a combat hit SFX with a stinger. */
export function combatHit(sfx: SfxManager, cues: CueManager, worldX?: number): void {
  cues.combatStinger();
  sfx.hit(worldX);
}

/** Play a ranged shoot SFX with a stinger. */
export function combatShoot(sfx: SfxManager, cues: CueManager, worldX?: number): void {
  cues.combatStinger();
  sfx.shoot(worldX);
}

/** Play a sniper shoot SFX with a stinger. */
export function combatSniperShoot(sfx: SfxManager, cues: CueManager, worldX?: number): void {
  cues.combatStinger();
  sfx.sniperShoot(worldX);
}

/** Play a catapult shoot SFX with a stinger. */
export function combatCatapultShoot(sfx: SfxManager, cues: CueManager, worldX?: number): void {
  cues.combatStinger();
  sfx.catapultShoot(worldX);
}

/** Play a tower shoot SFX with a stinger. */
export function combatTowerShoot(sfx: SfxManager, cues: CueManager, worldX?: number): void {
  cues.combatStinger();
  sfx.towerShoot(worldX);
}
