/**
 * MenuBackground — Dark swamp war room: gradient, fog overlay, vine SVG, vignette.
 * No PNG images — SwampEcosystem (rendered in app.tsx) handles ambient life.
 */

export function MenuBackground() {
  return (
    <>
      {/* ---- Dark swamp gradient background ---- */}
      <div
        class="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 100% at 50% 50%, var(--pw-bark) 0%, var(--pw-mud) 60%, var(--pw-bark) 100%)`,
        }}
      />

      {/* ---- Fog overlay ---- */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 40%, rgba(46,60,27,0.15) 0%, transparent 70%)`,
        }}
      />

      {/* ---- SVG vine decoration along bottom and sides ---- */}
      <svg
        class="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Left vine */}
        <path
          d="M0,100 C20,200 10,350 0,500 C5,480 25,460 15,420 C30,380 10,300 20,250 C15,200 25,160 0,100"
          fill="var(--pw-vine-base)"
          opacity="0.25"
        />
        <path
          d="M0,150 Q30,250 10,380 Q25,320 40,280 Q20,220 0,150"
          fill="var(--pw-vine-highlight)"
          opacity="0.12"
        />
        {/* Right vine */}
        <path
          d="M1000,80 C980,180 990,340 1000,520 C995,490 975,450 985,400 C970,360 990,280 980,230 C985,180 975,140 1000,80"
          fill="var(--pw-vine-base)"
          opacity="0.25"
        />
        <path
          d="M1000,130 Q970,230 990,370 Q975,310 960,270 Q980,210 1000,130"
          fill="var(--pw-vine-highlight)"
          opacity="0.12"
        />
        {/* Bottom vine border */}
        <path
          d="M0,580 C100,560 200,590 300,570 C400,555 500,585 600,565 C700,555 800,580 900,560 C950,555 980,570 1000,575 L1000,600 L0,600 Z"
          fill="var(--pw-vine-base)"
          opacity="0.3"
        />
        <path
          d="M0,590 C150,575 350,595 500,580 C650,570 850,590 1000,585 L1000,600 L0,600 Z"
          fill="var(--pw-moss)"
          opacity="0.2"
        />
      </svg>

      {/* ---- Vignette (darkened with bark) ---- */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 70% at 50% 45%, transparent 20%, var(--pw-bark) 100%)`,
        }}
      />
    </>
  );
}
