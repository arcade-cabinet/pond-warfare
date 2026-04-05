import { CommanderIronpaw } from './CommanderIronpaw';
import { CommanderMarshal } from './CommanderMarshal';
import { CommanderSage } from './CommanderSage';
import { CommanderShadowfang } from './CommanderShadowfang';
import { CommanderStormcaller } from './CommanderStormcaller';
import { CommanderTidekeeper } from './CommanderTidekeeper';
import { CommanderWarden } from './CommanderWarden';

const SPRITES: Record<string, () => preact.JSX.Element> = {
  marshal: CommanderMarshal,
  sage: CommanderSage,
  warden: CommanderWarden,
  tidekeeper: CommanderTidekeeper,
  shadowfang: CommanderShadowfang,
  ironpaw: CommanderIronpaw,
  stormcaller: CommanderStormcaller,
};

interface CommanderPortraitProps {
  commanderType: string;
  size?: number;
}

export function CommanderPortrait({ commanderType, size = 100 }: CommanderPortraitProps) {
  const Sprite = SPRITES[commanderType] ?? CommanderMarshal;
  return (
    <div style={{ width: size, height: size }}>
      <Sprite />
    </div>
  );
}
