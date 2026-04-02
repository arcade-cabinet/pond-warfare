/**
 * MinimapLegend — "?" button that shows a minimap color legend.
 * US12: Works with both hover (desktop) and tap (mobile).
 * Tap "?" to toggle, tap outside to close.
 */

import { useEffect, useRef, useState } from 'preact/hooks';

interface LegendEntry {
  color: string;
  label: string;
  blink?: boolean;
}

const LEGEND_ITEMS: LegendEntry[] = [
  { color: 'var(--pw-accent)', label: 'Player building' },
  { color: 'var(--pw-enemy)', label: 'Enemy building' },
  { color: 'var(--pw-clam)', label: 'Clam resource' },
  { color: 'var(--pw-twig)', label: 'Twig resource' },
  { color: 'var(--pw-pearl)', label: 'Pearl resource' },
  { color: 'var(--pw-hp-low)', label: 'Combat zone', blink: true },
];

export function MinimapLegend() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close legend when tapping outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div class="relative" ref={containerRef}>
      <button
        type="button"
        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
        style={{
          background: 'var(--pw-bar-track)',
          color: 'var(--pw-text-muted)',
          border: '1px solid var(--pw-border)',
        }}
        title="Minimap legend"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div
          class="absolute bottom-6 left-0 z-50 rounded p-2 flex flex-col gap-1 whitespace-nowrap"
          style={{
            background: 'var(--pw-overlay-dark)',
            border: '1px solid var(--pw-border)',
          }}
        >
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} class="flex items-center gap-2 text-[10px]">
              <span
                class={`w-2.5 h-2.5 rounded-full flex-shrink-0${item.blink ? ' animate-pulse' : ''}`}
                style={{ background: item.color }}
              />
              <span class="font-game" style={{ color: 'var(--pw-text-primary)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
