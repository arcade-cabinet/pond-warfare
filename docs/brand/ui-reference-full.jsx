import React, { useState, useEffect, useRef } from 'react';

// --- DESIGN TOKENS ---
const TOKENS = {
  colors: {
    grittyGold: '#C5A059',
    goldDim: '#8A6D3B',
    mossGreen: '#5A6B3A',
    mossDark: '#2E3C1B',
    weatheredSteel: '#6A7A7A',
    woodDark: '#21160C',
    woodBase: '#4A3320',
    woodHighlight: '#684B31',
    vineBase: '#304515',
    vineHighlight: '#5A8022',
    swampWater: '#1A2A25',
    sepiaText: '#E8DCC4',
    bgPanel: 'rgba(25, 30, 20, 0.95)',
    bloodRed: '#8B2525',
    muzzleFlash: '#FFAA00'
  },
  fonts: {
    header: '"IM Fell English SC", serif',
    body: '"Open Sans", sans-serif',
  }
};

// --- ANIMATED RTS SPRITES (Pure SVG) ---
// These use CSS classes defined globally to toggle frames and animate elements.

const SpriteOtter = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" shapeRendering="crispEdges">
    {/* RTS Selection Circle */}
    <ellipse cx="50" cy="85" rx="30" ry="10" fill="none" stroke={TOKENS.colors.mossGreen} strokeWidth="2" strokeDasharray="8 4" className="selection-circle" />
    <ellipse cx="50" cy="85" rx="25" ry="8" fill="rgba(0,0,0,0.5)" /> {/* Shadow */}

    {/* FRAME 1: IDLE */}
    <g className="sprite-frame-1">
      {/* Tail */}
      <path d="M 30 65 L 15 75 L 20 85 L 35 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
      {/* Legs */}
      <path d="M 40 65 L 35 80 L 45 80 Z M 55 65 L 55 80 L 65 80 Z" fill="#3B2F2F" stroke="#111" strokeWidth="2" />
      {/* Body */}
      <path d="M 35 40 L 60 40 L 65 70 L 35 70 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
      <path d="M 40 40 L 55 40 L 60 70 L 40 70 Z" fill="#C5A059" opacity="0.4" /> {/* Belly */}
      {/* Vest / Ammo Belt */}
      <path d="M 35 55 L 65 65 L 65 70 L 35 60 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" />
      <rect x="40" y="58" width="5" height="8" fill={TOKENS.colors.grittyGold} stroke="#111" strokeWidth="1" transform="rotate(15 40 58)" />
      <rect x="48" y="60" width="5" height="8" fill={TOKENS.colors.grittyGold} stroke="#111" strokeWidth="1" transform="rotate(15 48 60)" />
      {/* Head */}
      <path d="M 35 20 L 60 20 L 65 40 L 30 40 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
      <path d="M 45 32 L 65 32 L 60 40 L 40 40 Z" fill="#E8DCC4" stroke="#111" strokeWidth="1.5" /> {/* Snout */}
      <circle cx="48" cy="28" r="2" fill="#111" /> <circle cx="56" cy="28" r="2" fill="#111" /> {/* Eyes */}
      <rect x="60" y="32" width="3" height="3" fill="#111" /> {/* Nose */}
      {/* Bandana */}
      <path d="M 30 20 L 65 20 L 60 28 L 35 28 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" />
      <path d="M 30 24 L 15 30 L 20 35 L 30 28 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" /> {/* Tails */}
      {/* Gun (Assault Rifle) */}
      <path d="M 30 45 L 80 45 L 80 50 L 30 50 Z" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="2" />
      <path d="M 45 50 L 45 60 L 55 60 L 55 50 Z" fill="#222" stroke="#111" strokeWidth="2" /> {/* Mag */}
      <path d="M 30 45 L 25 55 L 35 55 Z" fill="#222" stroke="#111" strokeWidth="2" /> {/* Stock */}
    </g>

    {/* FRAME 2: ATTACKING */}
    <g className="sprite-frame-2">
      <path d="M 28 65 L 12 70 L 15 80 L 32 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" /> {/* Tail Shift */}
      <path d="M 38 65 L 32 80 L 42 80 Z M 52 65 L 55 80 L 65 80 Z" fill="#3B2F2F" stroke="#111" strokeWidth="2" /> {/* Legs braced */}
      <path d="M 32 42 L 58 40 L 62 70 L 32 70 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
      <path d="M 38 42 L 52 40 L 58 70 L 38 70 Z" fill="#C5A059" opacity="0.4" />
      <path d="M 32 55 L 62 65 L 62 70 L 32 60 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" />
      <rect x="38" y="58" width="5" height="8" fill={TOKENS.colors.grittyGold} stroke="#111" strokeWidth="1" transform="rotate(15 40 58)" />
      <rect x="46" y="60" width="5" height="8" fill={TOKENS.colors.grittyGold} stroke="#111" strokeWidth="1" transform="rotate(15 48 60)" />
      {/* Head recoiled */}
      <path d="M 30 22 L 55 20 L 60 40 L 25 42 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
      <path d="M 40 34 L 60 32 L 55 40 L 35 42 Z" fill="#E8DCC4" stroke="#111" strokeWidth="1.5" />
      <path d="M 52 34 L 58 34 L 55 38 Z" fill="#111" /> {/* Open mouth */}
      <circle cx="43" cy="28" r="2" fill="#111" /> <circle cx="51" cy="28" r="2" fill="#111" />
      <path d="M 25 22 L 60 20 L 55 28 L 30 30 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" />
      <path d="M 25 26 L 10 20 L 12 30 L 28 30 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" /> {/* Tails flying */}
      {/* Gun firing (recoiled up slightly) */}
      <g transform="translate(-2, -3) rotate(-5 50 50)">
        <path d="M 30 45 L 80 45 L 80 50 L 30 50 Z" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="2" />
        <path d="M 45 50 L 45 60 L 55 60 L 55 50 Z" fill="#222" stroke="#111" strokeWidth="2" />
        <path d="M 30 45 L 25 55 L 35 55 Z" fill="#222" stroke="#111" strokeWidth="2" />
        {/* Muzzle Flash WC2 Style */}
        <polygon points="80,47 95,35 90,47 105,47 90,50 95,60 80,50" fill={TOKENS.colors.muzzleFlash} stroke="#FFF" strokeWidth="1" />
        {/* Ejected Casing */}
        <rect x="45" y="30" width="6" height="3" fill={TOKENS.colors.grittyGold} stroke="#111" strokeWidth="1" transform="rotate(-30 45 30)" />
      </g>
    </g>
  </svg>
);

const SpriteCroc = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" shapeRendering="crispEdges">
    <ellipse cx="50" cy="85" rx="35" ry="12" fill="none" stroke={TOKENS.colors.mossGreen} strokeWidth="2" strokeDasharray="8 4" className="selection-circle" />
    <ellipse cx="50" cy="85" rx="30" ry="10" fill="rgba(0,0,0,0.5)" />

    {/* FRAME 1: IDLE */}
    <g className="sprite-frame-1">
      {/* Tail */}
      <path d="M 25 65 L 5 75 L 10 85 L 35 75 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" />
      <polygon points="10,65 15,55 20,65" fill="#1A2410" stroke="#111" strokeWidth="1" />
      {/* Body */}
      <path d="M 20 50 L 65 50 L 70 80 L 25 80 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" />
      <path d="M 25 65 L 65 65 L 68 80 L 28 80 Z" fill="#A5A57A" opacity="0.6" /> {/* Pale underbelly */}
      {/* Legs */}
      <path d="M 30 70 L 25 85 L 40 85 Z M 55 70 L 50 85 L 65 85 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" />
      {/* Heavy Leather Harness */}
      <path d="M 40 50 L 55 50 L 50 80 L 35 80 Z" fill={TOKENS.colors.woodDark} stroke="#111" strokeWidth="2" />
      <rect x="42" y="60" width="8" height="6" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="1.5" />
      {/* Head */}
      <path d="M 60 45 L 90 55 L 90 70 L 65 70 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" />
      <path d="M 65 40 Q 70 35 75 45 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="1.5" /> {/* Brow */}
      <circle cx="72" cy="46" r="2.5" fill={TOKENS.colors.grittyGold} stroke="#111" />
      <path d="M 65 60 L 90 60 L 85 70 L 65 70 Z" fill="#A5A57A" stroke="#111" strokeWidth="1.5" /> {/* Jaw */}
      {/* Back-Mounted Gatling Base */}
      <path d="M 30 35 L 50 35 L 55 50 L 25 50 Z" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="2" />
      <circle cx="40" cy="42" r="5" fill="#222" />
      {/* Barrels */}
      <path d="M 45 38 L 85 35 L 85 41 L 45 44 Z" fill="#444" stroke="#111" strokeWidth="2" />
      <line x1="45" y1="41" x2="85" y2="38" stroke="#111" strokeWidth="2" />
    </g>

    {/* FRAME 2: ATTACKING */}
    <g className="sprite-frame-2">
      <path d="M 23 65 L 2 70 L 8 82 L 33 75 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" />
      <polygon points="8,62 12,50 18,62" fill="#1A2410" stroke="#111" strokeWidth="1" />
      <path d="M 18 52 L 63 52 L 68 82 L 23 82 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" />
      <path d="M 23 67 L 63 67 L 66 82 L 26 82 Z" fill="#A5A57A" opacity="0.6" />
      <path d="M 28 72 L 20 87 L 35 87 Z M 53 72 L 45 87 L 60 87 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" />
      <path d="M 38 52 L 53 52 L 48 82 L 33 82 Z" fill={TOKENS.colors.woodDark} stroke="#111" strokeWidth="2" />
      <rect x="40" y="62" width="8" height="6" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="1.5" />
      {/* Snapping Head */}
      <path d="M 58 43 L 88 35 L 90 50 L 63 55 Z" fill={TOKENS.colors.mossGreen} stroke="#111" strokeWidth="2" />
      <path d="M 63 38 Q 68 33 73 43 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="1.5" />
      <circle cx="70" cy="44" r="2.5" fill={TOKENS.colors.grittyGold} stroke="#111" />
      <path d="M 63 60 L 92 68 L 88 80 L 63 70 Z" fill="#A5A57A" stroke="#111" strokeWidth="2" /> {/* Jaw dropped */}
      {/* Teeth visible */}
      <path d="M 65 52 L 70 58 L 75 50 L 80 56 L 85 48" fill="none" stroke="#FFF" strokeWidth="2" strokeLinejoin="miter" />
      <path d="M 65 62 L 70 56 L 75 64 L 80 58 L 85 66" fill="none" stroke="#FFF" strokeWidth="2" strokeLinejoin="miter" />

      {/* Gatling Firing */}
      <path d="M 28 37 L 48 37 L 53 52 L 23 52 Z" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="2" />
      <circle cx="38" cy="44" r="5" fill="#222" />
      <path d="M 43 40 L 85 40 L 85 46 L 43 46 Z" fill="#444" stroke="#111" strokeWidth="2" /> {/* Barrels shifted */}
      <line x1="43" y1="43" x2="85" y2="43" stroke="#111" strokeWidth="2" />
      {/* Massive Gatling Muzzle Flash */}
      <polygon points="85,43 100,25 95,43 110,43 95,46 100,60 85,46" fill={TOKENS.colors.muzzleFlash} stroke="#FFF" strokeWidth="2" />
    </g>
  </svg>
);

const SpriteSnake = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" shapeRendering="crispEdges">
    <ellipse cx="50" cy="85" rx="25" ry="8" fill="none" stroke={TOKENS.colors.mossGreen} strokeWidth="2" strokeDasharray="8 4" className="selection-circle" />
    <ellipse cx="50" cy="85" rx="20" ry="6" fill="rgba(0,0,0,0.5)" />

    {/* FRAME 1: IDLE */}
    <g className="sprite-frame-1">
      {/* Coils */}
      <path d="M 30 75 L 70 75 L 65 85 L 25 85 Z" fill={TOKENS.colors.vineHighlight} stroke="#111" strokeWidth="2" />
      <path d="M 35 65 L 60 65 L 65 75 L 30 75 Z" fill={TOKENS.colors.vineBase} stroke="#111" strokeWidth="2" />
      {/* Raised Body */}
      <path d="M 40 40 L 55 40 L 50 65 L 45 65 Z" fill={TOKENS.colors.vineHighlight} stroke="#111" strokeWidth="2" />
      {/* Tactical Gear Base */}
      <path d="M 40 45 L 55 45 L 52 52 L 42 52 Z" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="2" />
      {/* Back Sniper/Laser */}
      <path d="M 35 35 L 75 30 L 75 35 L 35 40 Z" fill="#222" stroke="#111" strokeWidth="2" />
      {/* Head */}
      <path d="M 45 25 L 65 25 L 70 35 L 40 35 Z" fill={TOKENS.colors.vineHighlight} stroke="#111" strokeWidth="2" />
      {/* Cyber Goggle */}
      <path d="M 55 25 L 68 25 L 65 32 L 52 32 Z" fill="#111" stroke="#000" strokeWidth="1" />
      <circle cx="62" cy="28" r="2.5" fill="#FF0000" />
      <path d="M 68 32 L 72 34" stroke="#8B2525" strokeWidth="2" /> {/* Tongue */}
    </g>

    {/* FRAME 2: ATTACKING */}
    <g className="sprite-frame-2">
      <path d="M 28 75 L 68 75 L 63 85 L 23 85 Z" fill={TOKENS.colors.vineHighlight} stroke="#111" strokeWidth="2" />
      <path d="M 38 65 L 63 65 L 68 75 L 33 75 Z" fill={TOKENS.colors.vineBase} stroke="#111" strokeWidth="2" />
      {/* Body lunged forward */}
      <path d="M 50 35 L 65 35 L 55 65 L 45 65 Z" fill={TOKENS.colors.vineHighlight} stroke="#111" strokeWidth="2" />
      <path d="M 50 40 L 62 40 L 57 48 L 47 48 Z" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="2" />
      {/* Sniper Firing */}
      <path d="M 45 25 L 85 28 L 85 33 L 45 30 Z" fill="#222" stroke="#111" strokeWidth="2" />
      {/* Laser Beam WC2 Style */}
      <polygon points="85,30 110,29 120,30 110,31" fill="#FF0000" />
      <line x1="85" y1="30" x2="150" y2="30" stroke="#FF5555" strokeWidth="2" strokeDasharray="10 5" />
      {/* Head struck forward */}
      <path d="M 60 20 L 80 25 L 85 35 L 55 30 Z" fill={TOKENS.colors.vineHighlight} stroke="#111" strokeWidth="2" />
      <path d="M 70 22 L 82 25 L 78 30 L 65 28 Z" fill="#111" stroke="#000" strokeWidth="1" />
      <circle cx="77" cy="26" r="2.5" fill="#FF0000" />
      <path d="M 85 32 L 95 30 M 85 32 L 92 36" fill="none" stroke="#8B2525" strokeWidth="2" /> {/* Hissing tongue spread */}
    </g>
  </svg>
);


// --- HELPER: Wobbly Line Generator for Organic Wood Edges ---
const generateWobblyRect = (w, h, segmentSize = 20, variance = 2) => {
  let path = `M 0 0 `;
  for (let x = segmentSize; x <= w; x += segmentSize) path += `L ${x} ${Math.random() * variance} `;
  for (let y = segmentSize; y <= h; y += segmentSize) path += `L ${w - Math.random() * variance} ${y} `;
  for (let x = w - segmentSize; x >= 0; x -= segmentSize) path += `L ${x} ${h - Math.random() * variance} `;
  for (let y = h - segmentSize; y >= 0; y -= segmentSize) path += `L ${Math.random() * variance} ${y} `;
  return path + 'Z';
};

// --- CANVAS: The Living Swamp Ecosystem ---
const SwampEcosystem = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let entities = { fog: [], fireflies: [] };

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();

    for (let i = 0; i < 8; i++) {
      entities.fog.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 300 + 200, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.1 });
    }
    for (let i = 0; i < 40; i++) {
      entities.fireflies.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2.5 + 0.5, angle: Math.random() * Math.PI * 2, speed: Math.random() * 0.5 + 0.1, hue: 70 + Math.random() * 40, flashPhase: Math.random() * Math.PI * 2, flashSpeed: Math.random() * 0.05 + 0.01 });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      entities.fog.forEach(f => {
        f.x += f.vx; f.y += f.vy;
        if (f.x > canvas.width + f.r) f.x = -f.r; if (f.x < -f.r) f.x = canvas.width + f.r;
        if (f.y > canvas.height + f.r) f.y = -f.r;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        grad.addColorStop(0, 'rgba(60, 80, 50, 0.08)'); grad.addColorStop(1, 'rgba(60, 80, 50, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      });
      entities.fireflies.forEach(f => {
        f.angle += (Math.random() - 0.5) * 0.2; f.x += Math.cos(f.angle) * f.speed; f.y += Math.sin(f.angle) * f.speed - 0.2;
        if (f.y < -10) f.y = canvas.height + 10; if (f.x < -10) f.x = canvas.width + 10; if (f.x > canvas.width + 10) f.x = -10;
        const opacity = (Math.sin(f.flashPhase += f.flashSpeed) + 1) / 2 * 0.8 + 0.2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${f.hue}, 90%, 60%, ${opacity})`; ctx.shadowBlur = 15; ctx.shadowColor = `hsla(${f.hue}, 100%, 50%, ${opacity})`; ctx.fill(); ctx.shadowBlur = 0;
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// --- SVG FILTERS ---
const SvgFilters = () => (
  <svg style={{ width: 0, height: 0, position: 'absolute' }}>
    <defs>
      <filter id="grunge-heavy" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" result="noise" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.2 0" in="noise" result="coloredNoise" />
        <feBlend in="SourceGraphic" in2="coloredNoise" mode="multiply" />
      </filter>
      <filter id="organic-wood" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.01 0.3" numOctaves="3" result="grain" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.2   0 0 0 0 0.1   0 0 0 0 0.05  0 0 0 0.7 0" in="grain" result="darkGrain" />
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="warpNoise" />
        <feDisplacementMap in="SourceGraphic" in2="warpNoise" scale="3" xChannelSelector="R" yChannelSelector="G" result="warpedShape" />
        <feBlend in="warpedShape" in2="darkGrain" mode="multiply" />
      </filter>
      <filter id="swamp-glow">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.8" />
        <feDropShadow dx="0" dy="0" stdDeviation="15" floodColor={TOKENS.colors.mossGreen} floodOpacity="0.4" />
      </filter>
    </defs>
  </svg>
);

// --- PROCEDURAL UI PIECES ---
const SvgLeaf = ({ x, y, rot, scale = 1 }) => (
  <path d="M 0 0 C 5 -10, 15 -10, 20 0 C 15 10, 5 10, 0 0 Z" fill={TOKENS.colors.mossGreen} stroke={TOKENS.colors.vineBase} strokeWidth="1" transform={`translate(${x}, ${y}) rotate(${rot}) scale(${scale})`} />
);
const CornerTopLeft = () => <svg viewBox="0 0 60 60" className="w-full h-full overflow-visible"><path d="M 60 20 L 22 20 C 20 20, 20 20, 20 22 L 20 60 L 0 60 L 0 0 L 60 0 Z" fill={TOKENS.colors.woodBase} filter="url(#organic-wood)" stroke={TOKENS.colors.woodDark} strokeWidth="2.5" /><path d="M 25 60 C 25 25, 0 30, 8 12 C 15 -5, 35 5, 25 25 C 15 45, 50 45, 60 35" fill="none" stroke={TOKENS.colors.vineBase} strokeWidth="8" strokeLinecap="round" /><path d="M 25 60 C 25 25, 0 30, 8 12 C 15 -5, 35 5, 25 25 C 15 45, 50 45, 60 35" fill="none" stroke={TOKENS.colors.vineHighlight} strokeWidth="3" strokeLinecap="round" /><SvgLeaf x={12} y={18} rot={-45} scale={0.8} /><SvgLeaf x={40} y={35} rot={20} scale={1.2} /></svg>;
const CornerTopRight = () => <svg viewBox="0 0 60 60" className="w-full h-full overflow-visible"><path d="M 0 20 L 38 20 C 40 20, 40 20, 40 22 L 40 60 L 60 60 L 60 0 L 0 0 Z" fill={TOKENS.colors.woodBase} filter="url(#organic-wood)" stroke={TOKENS.colors.woodDark} strokeWidth="2.5" /><g transform="translate(50, 15) rotate(20)"><polygon points="-8,-6 2,-6 6,2 2,10 -8,10 -12,2" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="1.5" /><circle cx="-3" cy="2" r="3" fill="#222" /><path d="M -3 6 L -2 15 M -5 6 L -6 12" stroke="#8B3A25" strokeWidth="1" strokeLinecap="round" opacity="0.8"/></g><rect x="25" y="45" width="12" height="5" rx="1" transform="rotate(25 25 45)" fill={TOKENS.colors.weatheredSteel} stroke="#111" strokeWidth="1.5"/><path d="M 0 35 C 20 40, 40 20, 60 60" fill="none" stroke={TOKENS.colors.vineBase} strokeWidth="5" /><path d="M 0 35 C 20 40, 40 20, 60 60" fill="none" stroke={TOKENS.colors.vineHighlight} strokeWidth="2" /></svg>;
const CornerBottomLeft = () => <svg viewBox="0 0 60 60" className="w-full h-full overflow-visible"><path d="M 60 40 L 22 40 C 20 40, 20 40, 20 38 L 20 0 L 0 0 L 0 60 L 60 60 Z" fill={TOKENS.colors.woodBase} filter="url(#organic-wood)" stroke={TOKENS.colors.woodDark} strokeWidth="2.5" /><g transform="translate(5, 40)"><path d="M 0 5 C 15 -10, 35 -5, 50 5 C 55 10, 55 18, 50 20 L -5 20 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" /><path d="M 5 0 C 20 -15, 30 -5, 45 5" fill="none" stroke={TOKENS.colors.mossGreen} strokeWidth="3" /><path d="M 15 5 L 18 12 M 25 6 L 28 12 M 35 8 L 37 14" stroke="#FFF" strokeWidth="2" strokeLinecap="round" /><circle cx="38" cy="0" r="2.5" fill={TOKENS.colors.grittyGold} stroke="#000" /></g></svg>;
const CornerBottomRight = () => <svg viewBox="0 0 60 60" className="w-full h-full overflow-visible"><path d="M 0 40 L 38 40 C 40 40, 40 40, 40 38 L 40 0 L 60 0 L 60 60 L 0 60 Z" fill={TOKENS.colors.woodBase} filter="url(#organic-wood)" stroke={TOKENS.colors.woodDark} strokeWidth="2.5" /><g transform="translate(45, 20)"><rect x="-10" y="-15" width="7" height="18" rx="2" fill={TOKENS.colors.grittyGold} stroke="#111" strokeWidth="1.5" transform="rotate(-15)" /><rect x="0" y="-12" width="7" height="18" rx="2" fill={TOKENS.colors.grittyGold} stroke="#111" strokeWidth="1.5" transform="rotate(25)" /></g><path d="M 60 45 C 50 35, 30 35, 15 45 C 5 50, 0 55, 0 60 L 60 60 Z" fill={TOKENS.colors.mossDark} stroke="#111" strokeWidth="2" /><path d="M 55 40 C 40 25, 30 35, 15 45" fill="none" stroke={TOKENS.colors.mossGreen} strokeWidth="3" /><path d="M 45 45 L 42 52 M 35 46 L 32 52 M 25 48 L 23 54" stroke="#FFF" strokeWidth="2" strokeLinecap="round" /></svg>;
const EdgeHorizontal = ({ top }) => <svg width="100%" height="100%" preserveAspectRatio="none" className="overflow-visible"><rect x="0" y={top ? 0 : 40} width="100%" height="20" fill={TOKENS.colors.woodBase} filter="url(#organic-wood)" stroke={TOKENS.colors.woodDark} strokeWidth="2.5" /><path d={`M 0 ${top ? 12 : 48} Q 50 ${top ? -5 : 65}, 100 ${top ? 15 : 45} T 200 ${top ? 8 : 52} T 300 ${top ? 18 : 42} T 400 ${top ? 5 : 55} T 500 ${top ? 15 : 45} T 600 ${top ? 10 : 50} T 800 ${top ? 12 : 48} T 1000 ${top ? 15 : 45}`} fill="none" stroke={TOKENS.colors.vineBase} strokeWidth="8" strokeLinecap="round" /><path d={`M 0 ${top ? 12 : 48} Q 50 ${top ? -5 : 65}, 100 ${top ? 15 : 45} T 200 ${top ? 8 : 52} T 300 ${top ? 18 : 42} T 400 ${top ? 5 : 55} T 500 ${top ? 15 : 45} T 600 ${top ? 10 : 50} T 800 ${top ? 12 : 48} T 1000 ${top ? 15 : 45}`} fill="none" stroke={TOKENS.colors.vineHighlight} strokeWidth="3" strokeLinecap="round" />{[10, 30, 50, 70, 90].map((pct, i) => <SvgLeaf key={i} x={`${pct}%`} y={top ? (i%2===0 ? 0 : 20) : (i%2===0 ? 40 : 60)} rot={i*45} scale={0.7} />)}</svg>;
const EdgeVertical = ({ left }) => <svg width="100%" height="100%" preserveAspectRatio="none" className="overflow-visible"><rect x={left ? 0 : 40} y="0" width="20" height="100%" fill={TOKENS.colors.woodBase} filter="url(#organic-wood)" stroke={TOKENS.colors.woodDark} strokeWidth="2.5" /><path d={`M ${left ? 12 : 48} 0 Q ${left ? -5 : 65} 50, ${left ? 15 : 45} 100 T ${left ? 8 : 52} 200 T ${left ? 18 : 42} 300 T ${left ? 5 : 55} 400 T ${left ? 15 : 45} 500`} fill="none" stroke={TOKENS.colors.vineBase} strokeWidth="8" strokeLinecap="round" /><path d={`M ${left ? 12 : 48} 0 Q ${left ? -5 : 65} 50, ${left ? 15 : 45} 100 T ${left ? 8 : 52} 200 T ${left ? 18 : 42} 300 T ${left ? 5 : 55} 400 T ${left ? 15 : 45} 500`} fill="none" stroke={TOKENS.colors.vineHighlight} strokeWidth="3" strokeLinecap="round" /><SvgLeaf x={left ? 5 : 55} y="20%" rot={left ? -90 : 90} scale={0.8} /><SvgLeaf x={left ? 15 : 45} y="70%" rot={left ? -45 : 45} scale={1} /></svg>;
const CenterPanel = ({ children }) => (
  <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-repeat bg-center" style={{ backgroundColor: TOKENS.colors.bgPanel, filter: 'url(#grunge-heavy)' }}>
    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(15,20,10,1)] pointer-events-none z-0" />
    <div className="relative z-10 w-full h-full p-4">{children}</div>
  </div>
);

const Frame9Slice = ({ children, isExpanded, onClick, title }) => (
  <div className="relative w-full max-w-4xl mx-auto my-8 transition-all duration-500 ease-in-out cursor-pointer group panel-3d">
    <div className={`absolute inset-[-20px] bg-[#5A8022] blur-[40px] rounded-3xl transition-opacity duration-1000 -z-10 ${isExpanded ? 'opacity-30' : 'opacity-0'}`}></div>
    <div className="grid drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]" style={{ gridTemplateColumns: '60px 1fr 60px', gridTemplateRows: `60px ${isExpanded ? 'auto' : '0px'} 60px` }}>
      <div className="w-[60px] h-[60px] z-20" onClick={onClick}><CornerTopLeft /></div>
      <div className="h-[60px] z-10 relative" onClick={onClick}>
        <div className="absolute inset-0"><EdgeHorizontal top={true} /></div>
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none mt-1">
          <h2 className="text-3xl tracking-widest text-center transition-all group-hover:scale-[1.03] duration-500" style={{ fontFamily: TOKENS.fonts.header, color: TOKENS.colors.grittyGold, textShadow: '2px 2px 0 #111, -1px -1px 0 #111, 1px -1px 0 #111, -1px 1px 0 #111, 0 8px 12px rgba(0,0,0,0.9)' }}>
            {title}
          </h2>
        </div>
      </div>
      <div className="w-[60px] h-[60px] z-20" onClick={onClick}><CornerTopRight /></div>
      <div className={`w-[60px] z-10 transition-all duration-700 ease-out ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{isExpanded && <EdgeVertical left={true} />}</div>
      <div className={`transition-all duration-700 origin-top cursor-default ${isExpanded ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 overflow-hidden'}`}>
         <CenterPanel>{children}</CenterPanel>
      </div>
      <div className={`w-[60px] z-10 transition-all duration-700 ease-out ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{isExpanded && <EdgeVertical left={false} />}</div>
      <div className="w-[60px] h-[60px] z-20" onClick={onClick}><CornerBottomLeft /></div>
      <div className="h-[60px] z-10 relative" onClick={onClick}><div className="absolute inset-0"><EdgeHorizontal top={false} /></div></div>
      <div className="w-[60px] h-[60px] z-20" onClick={onClick}><CornerBottomRight /></div>
    </div>
  </div>
);

// --- MAIN APP ---
export default function App() {
  const [expandedSection, setExpandedSection] = useState('barracks');
  const [selectedUnit, setSelectedUnit] = useState('otter');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      containerRef.current.style.setProperty('--mouse-x', x);
      containerRef.current.style.setProperty('--mouse-y', y);
      containerRef.current.style.setProperty('--light-x', `${e.clientX}px`);
      containerRef.current.style.setProperty('--light-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const units = {
    otter: { name: 'Otter Commando', role: 'Assault Infantry', Sprite: SpriteOtter, desc: 'High mobility. Equipped with standard tactical bandana and auto-rifle.' },
    croc: { name: 'Gator Heavy', role: 'Siege & Armor', Sprite: SpriteCroc, desc: 'Slow, heavily armored. Carries a back-mounted Gatling cannon for suppressing fire.' },
    snake: { name: 'Viper Sniper', role: 'Specialist', Sprite: SpriteSnake, desc: 'Stealth coils. Uses cyber-optics and a high-energy back-mounted laser rifle.' }
  };

  return (
    <div ref={containerRef} className="perspective-container">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Open+Sans:ital,wght@0,400;0,700;1,400&display=swap');

          :root { --mouse-x: 0; --mouse-y: 0; --light-x: 50vw; --light-y: 50vh; }
          body {
            margin: 0; background: #0A0D08; min-height: 100vh;
            color: ${TOKENS.colors.sepiaText}; font-family: 'Open Sans', sans-serif; overflow-x: hidden;
          }

          .perspective-container { perspective: 1500px; }
          .panel-3d {
            transform: rotateX(calc(var(--mouse-y) * -3deg)) rotateY(calc(var(--mouse-x) * 3deg)) translateZ(0);
            transform-style: preserve-3d; transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .dynamic-lighting::after {
            content: ''; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: radial-gradient(circle 800px at var(--light-x) var(--light-y), rgba(197, 160, 89, 0.08), transparent 70%);
            pointer-events: none; z-index: 50; mix-blend-mode: screen;
          }

          /* --- RTS SPRITE ANIMATIONS (CSS Step Animation) --- */
          .sprite-frame-1 { animation: sprite-toggle-1 0.4s steps(1) infinite; }
          .sprite-frame-2 { animation: sprite-toggle-2 0.4s steps(1) infinite; }
          @keyframes sprite-toggle-1 { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          @keyframes sprite-toggle-2 { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

          .selection-circle { animation: spin 4s linear infinite; transform-origin: center; }
          @keyframes spin { 100% { transform: rotate(360deg); } }

          /* UI Buttons */
          .rts-btn {
            background: rgba(0,0,0,0.6); border: 2px solid ${TOKENS.colors.woodDark};
            color: ${TOKENS.colors.sepiaText}; padding: 0.5rem 1rem;
            text-transform: uppercase; font-family: ${TOKENS.fonts.header}; font-size: 1.2rem;
            transition: all 0.2s; cursor: pointer; position: relative; overflow: hidden;
          }
          .rts-btn.active {
            border-color: ${TOKENS.colors.grittyGold}; background: ${TOKENS.colors.mossDark};
            box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 0 10px rgba(197, 160, 89, 0.4);
            color: ${TOKENS.colors.grittyGold};
          }
          .rts-btn:hover:not(.active) { border-color: ${TOKENS.colors.mossGreen}; background: rgba(90, 107, 58, 0.3); }
        `}
      </style>

      <SvgFilters />
      <SwampEcosystem />
      <div className="dynamic-lighting" />

      <div className="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center min-h-screen">

        {/* Title */}
        <div className="mb-10 text-center relative w-full max-w-xl panel-3d pointer-events-none">
          <svg className="absolute inset-0 w-full h-full -z-10 opacity-60" viewBox="0 0 500 200" filter="url(#grunge-heavy)">
             <path d="M -50 150 Q 150 -50, 250 100 T 550 100" fill="none" stroke={TOKENS.colors.vineBase} strokeWidth="18" strokeLinecap="round" opacity="0.6"/>
             <path d="M 0 50 Q 200 200, 350 50 T 600 150" fill="none" stroke={TOKENS.colors.mossDark} strokeWidth="12" strokeLinecap="round" opacity="0.4"/>
          </svg>
          <h1 className="text-6xl md:text-[5rem] leading-none mt-8 relative inline-block select-none" style={{ fontFamily: TOKENS.fonts.header, color: TOKENS.colors.mossGreen, textShadow: '4px 4px 0 #050505, -2px -2px 0 #050505, 2px -2px 0 #050505, -2px 2px 0 #050505, 0px 20px 30px rgba(0,0,0,0.9)' }}>
            POND<br/><span style={{ color: TOKENS.colors.grittyGold, fontSize: '0.85em' }}>WARFARE</span>
          </h1>
        </div>

        <div className="w-full relative z-20">

          {/* SECTION: RTS BARRACKS (Sprite Viewer) */}
          <Frame9Slice title="BARRACKS: ACTIVE ROSTER" isExpanded={expandedSection === 'barracks'} onClick={() => setExpandedSection(expandedSection === 'barracks' ? null : 'barracks')}>
            <div className="flex flex-col md:flex-row h-full w-full bg-[#0a0f0a]/80 border-2 border-[#111] shadow-[inset_0_15px_30px_rgba(0,0,0,1)] p-2">

              {/* Left Column: Unit Selection */}
              <div className="w-full md:w-1/3 border-r-2 border-[#111] p-4 flex flex-col gap-3 bg-black/40">
                <div className="text-[#C5A059] font-bold text-sm tracking-[0.2em] mb-2 uppercase border-b border-[#333] pb-2">Select Unit</div>
                {Object.entries(units).map(([key, unit]) => (
                  <button key={key} className={`rts-btn text-left ${selectedUnit === key ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setSelectedUnit(key); }}>
                    {unit.name}
                  </button>
                ))}

                {/* Stats Block */}
                <div className="mt-auto pt-4 text-xs font-mono text-[#7A8B8B]">
                  <div className="flex justify-between mb-1"><span>HP:</span><span className="text-[#5A8022]">{'████████░░'}</span></div>
                  <div className="flex justify-between mb-1"><span>DMG:</span><span className="text-[#C5A059]">{'█████░░░░░'}</span></div>
                  <div className="flex justify-between"><span>SPD:</span><span className="text-[#8B2525]">{'███████░░░'}</span></div>
                </div>
              </div>

              {/* Right Column: Sprite Stage */}
              <div className="w-full md:w-2/3 p-6 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_#2A3A25_0%,_#0A140C_100%)]">
                {/* Stage Grid Background */}
                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" width="100%" height="100%">
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke={TOKENS.colors.grittyGold} strokeWidth="1"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Unit Details Header */}
                <div className="relative z-10 mb-4 border-b-2 border-[#5A8022]/40 pb-2">
                  <h3 className="text-3xl text-[#C5A059]" style={{ fontFamily: TOKENS.fonts.header }}>{units[selectedUnit].name}</h3>
                  <p className="text-sm text-[#7A8B8B] uppercase tracking-widest">{units[selectedUnit].role}</p>
                </div>

                {/* The Animated Sprite Wrapper */}
                <div className="flex-1 flex items-center justify-center relative z-10 min-h-[250px]">
                   <div className="w-64 h-64 drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] filter transition-transform duration-300 hover:scale-110">
                      {React.createElement(units[selectedUnit].Sprite)}
                   </div>
                </div>

                {/* Description Box */}
                <div className="relative z-10 bg-black/60 border border-[#333] p-4 text-sm mt-4 text-[#E8DCC4] shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)]">
                  {units[selectedUnit].desc}
                </div>
              </div>
            </div>
          </Frame9Slice>

        </div>
      </div>
    </div>
  );
}
