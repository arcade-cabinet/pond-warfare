import { EXPLORED_SCALE } from '@/constants';

function clampToBounds(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

export function createExploredTestContext(
  worldWidth: number,
  worldHeight: number,
): CanvasRenderingContext2D {
  const width = Math.ceil(worldWidth / EXPLORED_SCALE);
  const height = Math.ceil(worldHeight / EXPLORED_SCALE);
  const alpha = new Uint8ClampedArray(width * height);
  let pendingCircle: { x: number; y: number; r: number } | null = null;
  const canvas = { width, height } as HTMLCanvasElement;

  const paintRect = (x: number, y: number, w: number, h: number, value: number) => {
    const startX = clampToBounds(Math.floor(x), width);
    const startY = clampToBounds(Math.floor(y), height);
    const endX = clampToBounds(Math.ceil(x + w), width);
    const endY = clampToBounds(Math.ceil(y + h), height);
    for (let py = startY; py < endY; py += 1) {
      for (let px = startX; px < endX; px += 1) {
        alpha[py * width + px] = value;
      }
    }
  };

  const paintCircle = (x: number, y: number, r: number) => {
    const startX = clampToBounds(Math.floor(x - r), width - 1);
    const startY = clampToBounds(Math.floor(y - r), height - 1);
    const endX = clampToBounds(Math.ceil(x + r), width - 1);
    const endY = clampToBounds(Math.ceil(y + r), height - 1);
    const radiusSq = r * r;
    for (let py = startY; py <= endY; py += 1) {
      for (let px = startX; px <= endX; px += 1) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy <= radiusSq) {
          alpha[py * width + px] = 255;
        }
      }
    }
  };

  const ctx = {
    canvas,
    fillStyle: '#000',
    beginPath() {
      pendingCircle = null;
    },
    arc(x: number, y: number, r: number) {
      pendingCircle = { x, y, r };
    },
    fill() {
      if (pendingCircle) paintCircle(pendingCircle.x, pendingCircle.y, pendingCircle.r);
    },
    fillRect(x: number, y: number, w: number, h: number) {
      const revealed = `${this.fillStyle}` !== '#000';
      paintRect(x, y, w, h, revealed ? 255 : 0);
    },
    clearRect(x: number, y: number, w: number, h: number) {
      paintRect(x, y, w, h, 0);
    },
    getImageData(x: number, y: number, w: number, h: number) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let py = 0; py < h; py += 1) {
        for (let px = 0; px < w; px += 1) {
          const srcX = clampToBounds(x + px, width - 1);
          const srcY = clampToBounds(y + py, height - 1);
          const value = alpha[srcY * width + srcX];
          const idx = (py * w + px) * 4;
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = value;
        }
      }
      return { data };
    },
  };

  return ctx as unknown as CanvasRenderingContext2D;
}
