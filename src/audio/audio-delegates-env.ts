/**
 * Audio Environment Delegates
 *
 * Weather, worm, and heron sound
 * delegates extracted from audio-delegates.ts for file size compliance.
 */

import type { WeatherType } from '@/config/weather';
import type { AudioManagers } from './audio-delegate-types';
import {
  heronScreechEffect,
  weatherTransitionEffect,
  wormEmergenceEffect,
} from './sfx-environment';

type Self = AudioManagers;

/** Install environment/unit-specific sound delegates onto the prototype. */
export function installEnvironmentDelegates(
  proto: any,
  def: (proto: any, name: string, fn: (this: Self, ...args: any[]) => void) => void,
): void {
  def(proto, 'weatherTransition', function (this: Self, wt: WeatherType) {
    weatherTransitionEffect(
      this.sfxMgr,
      () => this.isMuted,
      () => this.isStarted,
      wt,
    );
  });
  def(proto, 'wormEmergence', function (this: Self, wx?: number) {
    wormEmergenceEffect(
      this.sfxMgr,
      () => this.isMuted,
      () => this.isStarted,
      wx,
    );
  });
  def(proto, 'heronScreech', function (this: Self, wx?: number) {
    heronScreechEffect(
      this.sfxMgr,
      () => this.isMuted,
      () => this.isStarted,
      wx,
    );
  });
}
