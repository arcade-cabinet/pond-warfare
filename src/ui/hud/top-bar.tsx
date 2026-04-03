/**
 * TopBar - Resource display (clams, twigs, food), weather indicator,
 * status text (peaceful/hunting), speed/pause/mute/CB/save/load/settings buttons.
 *
 * Wood panel background with carved-stone buttons and JetBrains Mono resource numbers.
 */

import { screenClass } from '@/platform';
import { TopBarControls } from './top-bar-controls';
import { TopBarResources } from './top-bar-resources';
import { WeatherIndicator } from './WeatherIndicator';

export interface TopBarProps {
  onSpeedClick?: () => void;
  onMuteClick?: () => void;
  onColorBlindToggle?: () => void;
  onPauseClick?: () => void;
  onSaveClick?: () => void;
  onLoadClick?: () => void;
  onSettingsClick?: () => void;
  onKeyboardRefClick?: () => void;
  onPanelToggle?: () => void;
}

export function TopBar(props: TopBarProps) {
  const compact = screenClass.value !== 'large';

  return (
    <div
      class={`absolute top-0 left-0 w-full wood-panel border-0 border-b flex items-center justify-between px-2 md:px-6 z-20 text-xs md:text-sm ${compact ? 'h-10' : 'h-10 md:h-12'}`}
      style={{
        borderBottomColor: 'var(--pw-mud)',
        borderBottomWidth: '2px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: `linear-gradient(180deg, var(--pw-mud-light) 0%, var(--pw-mud) 60%, var(--pw-bark) 100%)`,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(139, 105, 20, 0.08)',
      }}
    >
      <div class="flex items-center gap-2 md:gap-4">
        <TopBarResources compact={compact} />
        <WeatherIndicator compact={compact} />
      </div>
      <TopBarControls props={props} compact={compact} />
    </div>
  );
}
