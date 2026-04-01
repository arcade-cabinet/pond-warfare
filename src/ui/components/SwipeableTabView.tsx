/**
 * SwipeableTabView
 *
 * Reusable horizontal-swipe tab container. Shows dot/pill indicators
 * at the top (active tab uses Lillypad-tiny.png), a current-tab label,
 * and the content area driven by useSwipeTabs for gesture navigation.
 *
 * Subtle edge arrows appear on pointer (non-touch) devices when there
 * are more tabs in that direction.
 */

import type { ComponentChildren } from 'preact';
import { toChildArray } from 'preact';
import { useMemo } from 'preact/hooks';
import { inputMode } from '@/platform';
import { useSwipeTabs } from '../hooks/useSwipeTabs';

const UI = '/pond-warfare/assets/ui';

export interface Tab {
  key: string;
  label: string;
  icon?: string;
}

export interface SwipeableTabViewProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children?: ComponentChildren;
  variant?: 'panel' | 'modal' | 'overlay';
  showIndicator?: boolean;
}

export function SwipeableTabView({
  tabs,
  activeTab,
  onTabChange,
  children,
  showIndicator = true,
}: SwipeableTabViewProps) {
  const activeIndex = useMemo(
    () =>
      Math.max(
        0,
        tabs.findIndex((t) => t.key === activeTab),
      ),
    [tabs, activeTab],
  );

  const { containerRef, style, isDragging } = useSwipeTabs({
    tabCount: tabs.length,
    activeIndex,
    onChangeIndex: (i) => onTabChange(tabs[i].key),
  });

  const childArray = toChildArray(children);
  const isPointer = inputMode.value === 'pointer';
  const canGoLeft = activeIndex > 0;
  const canGoRight = activeIndex < tabs.length - 1;
  const currentLabel = tabs[activeIndex]?.label ?? '';

  return (
    <div class="swipe-tab-view" data-testid="swipe-tab-view">
      {/* Indicator bar */}
      {showIndicator && (
        <div class="swipe-tab-indicators">
          <div class="swipe-tab-dots">
            {tabs.map((tab, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={tab.key}
                  type="button"
                  class={`swipe-tab-dot ${isActive ? 'active' : ''}`}
                  data-testid={`tab-dot-${tab.key}`}
                  onClick={() => onTabChange(tab.key)}
                  aria-label={tab.label}
                  title={tab.label}
                >
                  {isActive ? (
                    <img
                      src={`${UI}/Lillypad-tiny.png`}
                      alt=""
                      class="swipe-tab-lilypad"
                      draggable={false}
                    />
                  ) : (
                    <span class="swipe-tab-inactive-dot" />
                  )}
                </button>
              );
            })}
          </div>
          <div class="swipe-tab-label font-heading">{currentLabel}</div>
        </div>
      )}

      {/* Content area with swipe */}
      <div class="swipe-tab-viewport" data-testid="swipe-tab-viewport">
        {/* Left arrow */}
        {isPointer && canGoLeft && (
          <button
            type="button"
            class="swipe-tab-arrow swipe-tab-arrow-left"
            data-testid="swipe-arrow-left"
            onClick={() => onTabChange(tabs[activeIndex - 1].key)}
            aria-label="Previous tab"
          >
            {'<'}
          </button>
        )}

        {/* Right arrow */}
        {isPointer && canGoRight && (
          <button
            type="button"
            class="swipe-tab-arrow swipe-tab-arrow-right"
            data-testid="swipe-arrow-right"
            onClick={() => onTabChange(tabs[activeIndex + 1].key)}
            aria-label="Next tab"
          >
            {'>'}
          </button>
        )}

        {/* Sliding content track */}
        <div
          ref={containerRef}
          class="swipe-tab-track"
          data-testid="swipe-tab-track"
          style={{
            ...style,
            width: `${tabs.length * 100}%`,
            cursor: isDragging ? 'grabbing' : undefined,
          }}
        >
          {tabs.map((tab, i) => (
            <div
              key={tab.key}
              class="swipe-tab-panel"
              style={{ width: `${100 / tabs.length}%` }}
              aria-hidden={i !== activeIndex}
            >
              {childArray[i]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
