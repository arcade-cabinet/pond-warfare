/**
 * MenuBackground — Painted pond background layers, ripples, vignette, and fireflies.
 */

const UI = '/pond-warfare/assets/ui';

export function MenuBackground() {
  return (
    <>
      {/* ---- Painted pond background ---- */}
      <div
        class="absolute inset-0"
        style={{
          backgroundImage: `url(${UI}/Background.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* ---- Water ripple overlays ---- */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${UI}/Flowing_Serenity_Water Ripples 1.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          animation: 'ripple-drift-1 12s ease-in-out infinite',
        }}
      />
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${UI}/Flowing_Serenity_Water ripples 2.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          animation: 'ripple-drift-2 16s ease-in-out infinite',
        }}
      />

      {/* Vignette */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 85% 75% at 50% 45%, transparent 25%, var(--pw-scrim-35) 65%, var(--pw-scrim-70) 100%)`,
        }}
      />

      {/* ---- Fireflies ---- */}
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="firefly" style={{ top: '20%', left: '15%' }} />
        <div class="firefly" style={{ top: '35%', right: '20%' }} />
        <div class="firefly" style={{ top: '60%', left: '25%' }} />
        <div class="firefly" style={{ bottom: '25%', right: '30%' }} />
        <div class="firefly" style={{ top: '15%', right: '35%' }} />
        <div class="firefly" style={{ bottom: '35%', left: '10%' }} />
      </div>
    </>
  );
}
