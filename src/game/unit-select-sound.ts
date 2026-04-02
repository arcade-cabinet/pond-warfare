/** Play the appropriate unit selection sound for the current selection. */

import { audio } from '@/audio/audio-system';
import { EntityTypeTag } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { EntityKind } from '@/types';

export function playUnitSelectSound(world: GameWorld): void {
  if (world.selection.length === 0) {
    audio.selectUnit();
    return;
  }
  const kind = EntityTypeTag.kind[world.selection[0]] as EntityKind;
  audio.playGroupSelectionVoice(kind, world.playerFaction, world.selection.length);
}
