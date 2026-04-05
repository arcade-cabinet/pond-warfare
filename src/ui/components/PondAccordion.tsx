/**
 * PondAccordion -- Collapsible accordion with CSS-styled headers.
 *
 * Replaces tab-based navigation across the UI. Each section has a painted
 * teal header, chevron indicator, optional summary, and lily-pad watermark
 * when expanded. Supports single or multiple open sections.
 */

import type { ComponentChildren, VNode } from 'preact';
import { toChildArray } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { PondAccordionSection } from './PondAccordionSection';

export interface AccordionSection {
  key: string;
  title: string;
  summary?: string;
  icon?: string;
  defaultOpen?: boolean;
}

export interface PondAccordionProps {
  sections: AccordionSection[];
  children?: ComponentChildren;
  allowMultiple?: boolean;
}

export function PondAccordion({ sections, children, allowMultiple = true }: PondAccordionProps) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const s of sections) {
      if (s.defaultOpen) initial.add(s.key);
    }
    return initial;
  });

  const handleToggle = useCallback(
    (key: string) => {
      setOpenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          audio.accordionClose();
        } else {
          if (!allowMultiple) next.clear();
          next.add(key);
          audio.accordionOpen();
        }
        return next;
      });
    },
    [allowMultiple],
  );

  const childArray = toChildArray(children) as VNode[];

  return (
    <div class="pond-accordion" data-testid="pond-accordion">
      {sections.map((section, i) => (
        <PondAccordionSection
          key={section.key}
          sectionKey={section.key}
          title={section.title}
          summary={section.summary}
          icon={section.icon}
          open={openKeys.has(section.key)}
          onToggle={handleToggle}
        >
          {childArray[i] ?? null}
        </PondAccordionSection>
      ))}
    </div>
  );
}
