/**
 * PondAccordionSection -- Single collapsible section within PondAccordion.
 *
 * Uses the SVG Frame9Slice system (design bible) for vine-wrapped wood frame
 * with organic corners, edges, and grunge-filtered center panel.
 * Each section is a self-contained framed panel with title in the top edge.
 */

import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Frame9Slice } from './frame';

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
      }, 700); // after Frame9Slice expand animation
      return () => clearTimeout(timer);
    }
  }, [open]);

  const label = icon ? `${icon} ${title}` : title;
  const displayTitle = !open && summary ? `${label} — ${summary}` : label;

  return (
    <section ref={contentRef} data-testid={`accordion-section-${sectionKey}`} aria-label={title}>
      <Frame9Slice title={displayTitle} isExpanded={open} onClick={() => onToggle(sectionKey)}>
        {children}
      </Frame9Slice>
    </section>
  );
}
