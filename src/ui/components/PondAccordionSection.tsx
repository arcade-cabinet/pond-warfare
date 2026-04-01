/**
 * PondAccordionSection -- Single collapsible section within PondAccordion.
 * Uses Button.png as header background, matching the landing-page MenuButton style.
 */

import type { ComponentChildren } from 'preact';

const UI = '/pond-warfare/assets/ui';

export interface AccordionSectionProps {
  sectionKey: string;
  title: string;
  summary?: string;
  icon?: string;
  open: boolean;
  onToggle: (key: string) => void;
  children: ComponentChildren;
}

export function PondAccordionSection({
  sectionKey,
  title,
  summary,
  icon,
  open,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div class="pond-accordion-section" data-testid={`accordion-section-${sectionKey}`}>
      <button
        type="button"
        class="pond-accordion-header"
        data-testid={`accordion-header-${sectionKey}`}
        onClick={() => onToggle(sectionKey)}
        aria-expanded={open}
      >
        <img src={`${UI}/Button.png`} alt="" class="pond-accordion-header-bg" draggable={false} />
        <span class="pond-accordion-header-content">
          <span class="pond-accordion-title">
            {icon && <span class="pond-accordion-icon">{icon}</span>}
            {title}
          </span>
          {!open && summary && (
            <span class="pond-accordion-summary" data-testid={`accordion-summary-${sectionKey}`}>
              {summary}
            </span>
          )}
          <span
            class={`pond-accordion-chevron ${open ? 'pond-accordion-chevron-open' : ''}`}
            data-testid={`accordion-chevron-${sectionKey}`}
            aria-hidden="true"
          >
            {open ? '\u25BC' : '\u25B6'}
          </span>
        </span>
      </button>

      <div
        class={`pond-accordion-content ${open ? 'pond-accordion-content-open' : ''}`}
        data-testid={`accordion-content-${sectionKey}`}
        style={{ display: open ? 'block' : 'none' }}
      >
        <div class="pond-accordion-watermark" aria-hidden="true">
          <img src={`${UI}/Lillypad-tiny.png`} alt="" draggable={false} />
        </div>
        {children}
      </div>
    </div>
  );
}
