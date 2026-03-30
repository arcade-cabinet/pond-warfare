/**
 * Menu Lily Pads — Simple particle system for decorative floating pads.
 *
 * Pads spawn at random positions, drift with slow random velocities,
 * repel each other to avoid overlap, and softly bounce off screen edges.
 * No Yuka needed — just basic 2D physics each frame.
 */

const PAD_VARIANTS = [1, 2, 3, 'tiny'] as const;
type PadVariant = (typeof PAD_VARIANTS)[number];

interface Pad {
  x: number;
  y: number;
  vx: number;
  vy: number;
  variant: PadVariant;
  size: number; // collision radius
  rotation: number; // visual rotation in degrees
  rotSpeed: number; // degrees per second
  flower: boolean;
}

const REPEL_DIST = 100; // pixels — pads push apart within this range
const REPEL_FORCE = 8; // pixels/sec² repulsion strength
const DRIFT_SPEED = 6; // max pixels/sec
const EDGE_MARGIN = 30;

export class MenuPads {
  pads: Pad[] = [];
  private animId = 0;
  private lastTime = 0;
  private bounds: { width: number; height: number };

  constructor(bounds: { width: number; height: number }, count = 10) {
    this.bounds = bounds;
    this.spawn(count);
  }

  private spawn(count: number): void {
    const { width, height } = this.bounds;
    for (let i = 0; i < count; i++) {
      const variant = PAD_VARIANTS[i % PAD_VARIANTS.length];
      const size = variant === 'tiny' ? 22 : 40;
      const pad: Pad = {
        x: EDGE_MARGIN + Math.random() * (width - EDGE_MARGIN * 2),
        y: EDGE_MARGIN + Math.random() * (height - EDGE_MARGIN * 2),
        vx: (Math.random() - 0.5) * DRIFT_SPEED * 2,
        vy: (Math.random() - 0.5) * DRIFT_SPEED * 2,
        variant,
        size,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8, // slow spin
        flower: i % 3 === 0 && variant !== 'tiny',
      };
      this.pads.push(pad);
    }
  }

  start(): void {
    this.lastTime = performance.now() / 1000;
    const tick = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(now - this.lastTime, 0.05);
      this.lastTime = now;
      this.update(dt);
      this.animId = requestAnimationFrame(tick);
    };
    this.animId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = 0;
  }

  private update(dt: number): void {
    const { width, height } = this.bounds;

    // Pairwise repulsion
    for (let i = 0; i < this.pads.length; i++) {
      const a = this.pads[i];
      for (let j = i + 1; j < this.pads.length; j++) {
        const b = this.pads[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.size + b.size;
        if (dist < REPEL_DIST && dist > 0.1) {
          const force = REPEL_FORCE * (1 - dist / REPEL_DIST);
          const nx = dx / dist;
          const ny = dy / dist;
          a.vx -= nx * force * dt;
          a.vy -= ny * force * dt;
          b.vx += nx * force * dt;
          b.vy += ny * force * dt;

          // Hard push if overlapping
          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.5;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
          }
        }
      }
    }

    // Apply velocity, clamp speed, bounce edges, rotate
    for (const p of this.pads) {
      // Clamp speed
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > DRIFT_SPEED) {
        p.vx = (p.vx / speed) * DRIFT_SPEED;
        p.vy = (p.vy / speed) * DRIFT_SPEED;
      }

      // Add tiny random jitter to keep things alive
      p.vx += (Math.random() - 0.5) * 0.3;
      p.vy += (Math.random() - 0.5) * 0.3;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Soft edge bounce
      if (p.x < EDGE_MARGIN) {
        p.x = EDGE_MARGIN;
        p.vx = Math.abs(p.vx) * 0.6;
      }
      if (p.x > width - EDGE_MARGIN) {
        p.x = width - EDGE_MARGIN;
        p.vx = -Math.abs(p.vx) * 0.6;
      }
      if (p.y < EDGE_MARGIN) {
        p.y = EDGE_MARGIN;
        p.vy = Math.abs(p.vy) * 0.6;
      }
      if (p.y > height - EDGE_MARGIN) {
        p.y = height - EDGE_MARGIN;
        p.vy = -Math.abs(p.vy) * 0.6;
      }

      // Gentle rotation
      p.rotation += p.rotSpeed * dt;
    }
  }

  resize(width: number, height: number): void {
    this.bounds.width = width;
    this.bounds.height = height;
  }

  destroy(): void {
    this.stop();
    this.pads = [];
  }
}
