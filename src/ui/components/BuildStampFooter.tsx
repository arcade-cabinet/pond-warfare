import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { COLORS } from '@/ui/design-tokens';

export interface BuildStampFooterProps {
  class?: string;
  includeBuildLabel?: boolean;
}

export function BuildStampFooter({
  class: className = '',
  includeBuildLabel = true,
}: BuildStampFooterProps) {
  return (
    <div
      class={`font-numbers text-[10px] uppercase tracking-[0.2em] text-center ${className}`.trim()}
      style={{ color: COLORS.weatheredSteel, opacity: 0.7 }}
    >
      {includeBuildLabel ? `Build ${BUILD_STAMP_LABEL}` : BUILD_STAMP_LABEL}
    </div>
  );
}
