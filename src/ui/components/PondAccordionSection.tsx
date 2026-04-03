/**
 * PondAccordionSection -- Single collapsible section within PondAccordion.
 * Uses Button.png as header background, matching the landing-page MenuButton style.
 * US13: Smooth CSS max-height transition instead of display:none toggle.
 */

import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

const PANEL = '/pond-warfare/assets/ui/panel';

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
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll opened section into view
  useEffect(() => {
    if (open && contentRef.current) {
      const timer = setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 260); // after animation completes
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div class="pond-accordion-section" data-testid={`accordion-section-${sectionKey}`}>
      <button
        type="button"
        class="pond-accordion-header"
        data-testid={`accordion-header-${sectionKey}`}
        onClick={() => onToggle(sectionKey)}
        aria-expanded={open}
      >
        <img
          src={`${PANEL}/section-header.png`}
          alt=""
          class="pond-accordion-header-bg"
          draggable={false}
        />
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
        ref={contentRef}
        class={`pond-accordion-content ${open ? 'pond-accordion-content-open' : ''}`}
        data-testid={`accordion-content-${sectionKey}`}
      >
        <div class="pond-accordion-watermark" aria-hidden="true">
          <img src={`${PANEL}/otter-icon.png`} alt="" draggable={false} />
        </div>
        {children}
      </div>
    </div>
  );
}
