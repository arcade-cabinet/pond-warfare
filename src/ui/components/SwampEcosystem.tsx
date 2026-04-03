import { useEffect, useRef } from 'preact/hooks';

interface FogBlob {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
}

interface Firefly {
  x: number;
  y: number;
  size: number;
  angle: number;
  speed: number;
  hue: number;
  flashPhase: number;
  flashSpeed: number;
}

/**
 * Full-screen canvas rendering an ambient swamp ecosystem:
 * - 8 fog blobs: large radial gradients drifting slowly
 * - 40 fireflies: small dots with sinusoidal flash phases and wandering movement
 *
 * Positioned as a fixed background layer (z-0, pointer-events-none).
 */
export function SwampEcosystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | undefined;
    let stopped = false;
    const fog: FogBlob[] = [];
    const fireflies: Firefly[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Initialize 8 fog blobs
    for (let i = 0; i < 8; i++) {
      fog.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 300 + 200,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.1,
      });
    }

    // Initialize 40 fireflies
    for (let i = 0; i < 40; i++) {
      fireflies.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.1,
        hue: 70 + Math.random() * 40,
        flashPhase: Math.random() * Math.PI * 2,
        flashSpeed: Math.random() * 0.05 + 0.01,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render fog blobs
      for (const f of fog) {
        f.x += f.vx;
        f.y += f.vy;

        if (f.x > canvas.width + f.r) f.x = -f.r;
        if (f.x < -f.r) f.x = canvas.width + f.r;
        if (f.y > canvas.height + f.r) f.y = -f.r;
        if (f.y < -f.r) f.y = canvas.height + f.r;

        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        grad.addColorStop(0, 'rgba(60, 80, 50, 0.08)');
        grad.addColorStop(1, 'rgba(60, 80, 50, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render fireflies
      for (const f of fireflies) {
        f.angle += (Math.random() - 0.5) * 0.2;
        f.x += Math.cos(f.angle) * f.speed;
        f.y += Math.sin(f.angle) * f.speed - 0.2;

        // Wrap around all screen edges
        if (f.y < -10) f.y = canvas.height + 10;
        if (f.y > canvas.height + 10) f.y = -10;
        if (f.x < -10) f.x = canvas.width + 10;
        if (f.x > canvas.width + 10) f.x = -10;

        f.flashPhase += f.flashSpeed;
        const opacity = ((Math.sin(f.flashPhase) + 1) / 2) * 0.8 + 0.2;

        // Draw glow circle (cheaper than shadowBlur)
        const glowR = f.size + 8;
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
        glow.addColorStop(0, `hsla(${f.hue}, 100%, 50%, ${opacity * 0.6})`);
        glow.addColorStop(1, `hsla(${f.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Draw firefly dot
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${f.hue}, 90%, 60%, ${opacity})`;
        ctx.fill();
      }

      if (!stopped) animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      stopped = true;
      window.removeEventListener('resize', resize);
      if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} class="fixed inset-0 pointer-events-none z-0" />;
}
