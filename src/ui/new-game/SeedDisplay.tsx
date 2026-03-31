/**
 * New Game — Seed display with inline editing
 *
 * Shows the map seed as a clickable number. Clicking enters edit mode
 * where the user can type a numeric seed or a text string (hashed to int).
 */

export interface SeedDisplayProps {
  seed: number;
  editingSeed: boolean;
  seedText: string;
  onStartEdit: () => void;
  onSeedText: (v: string) => void;
  onCommit: (v: number) => void;
  onCancel: () => void;
}

function parseSeed(text: string): number {
  const parsed = Number(text);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || 1;
}

export function SeedDisplay({
  seed,
  editingSeed,
  seedText,
  onStartEdit,
  onSeedText,
  onCommit,
  onCancel,
}: SeedDisplayProps) {
  return (
    <div class="flex items-center gap-2">
      <span class="font-numbers text-xs" style={{ color: 'var(--pw-text-muted)' }}>
        Seed:
      </span>
      {editingSeed ? (
        <input
          type="text"
          value={seedText}
          onInput={(e) => onSeedText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onCommit(parseSeed(seedText));
          }}
          onBlur={() => {
            onCommit(parseSeed(seedText));
            onCancel();
          }}
          // biome-ignore lint/a11y/noAutofocus: seed input auto-focuses on click-to-edit
          autoFocus
          class="font-numbers text-xs px-2 py-1 rounded"
          style={{
            width: '140px',
            minHeight: '32px',
            background: 'rgba(20, 30, 35, 0.8)',
            border: '1px solid var(--pw-accent-dim)',
            color: 'var(--pw-text-secondary)',
            outline: 'none',
          }}
        />
      ) : (
        <button
          type="button"
          class="font-numbers text-xs cursor-pointer hover:underline"
          style={{
            color: 'var(--pw-text-muted)',
            background: 'none',
            border: 'none',
            padding: '4px 0',
            minHeight: '32px',
          }}
          onClick={onStartEdit}
          title="Click to edit seed"
        >
          {seed}
        </button>
      )}
    </div>
  );
}
