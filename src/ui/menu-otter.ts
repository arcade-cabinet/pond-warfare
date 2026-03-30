/**
 * Menu Otter — Yuka.js steered otter for the landing page.
 *
 * The otter wanders around the pond, avoids lily pads and UI elements,
 * is curious about the player's pointer (seeks it slowly), and flees
 * when you poke/click it. Creates an alive, interactive pond scene.
 */

import { EntityManager, FleeBehavior, SeekBehavior, Vector3, Vehicle, WanderBehavior } from 'yuka';

/** Obstacle rectangle for avoidance (screen-space). */
export interface OtterObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class MenuOtter {
  private entityManager = new EntityManager();
  private vehicle = new Vehicle();
  private wanderBehavior: WanderBehavior;
  private seekBehavior: SeekBehavior;
  private fleeBehavior: FleeBehavior | null = null;
  private fleeTimer = 0;
  private pointer = new Vector3();
  private pointerActive = false;
  private animId = 0;
  private lastTime = 0;

  /** Current otter position in screen-space pixels. */
  x = 0;
  y = 0;
  /** Otter heading angle in radians (0 = right). */
  rotation = 0;
  /** Whether otter faces left (for flipping the sprite). */
  facingLeft = false;

  constructor(
    private bounds: { width: number; height: number },
    startX: number,
    startY: number,
  ) {
    this.x = startX;
    this.y = startY;

    // Configure vehicle
    const v = this.vehicle;
    v.position.set(startX, 0, startY); // Yuka uses XZ plane
    v.maxSpeed = 30; // pixels/sec — leisurely swim
    v.maxForce = 15;
    v.mass = 1;
    v.updateNeighborhood = false;

    // Wander: gentle random movement
    this.wanderBehavior = new WanderBehavior();
    this.wanderBehavior.jitter = 2;
    this.wanderBehavior.radius = 20;
    this.wanderBehavior.distance = 40;
    this.wanderBehavior.weight = 0.6;
    v.steering.add(this.wanderBehavior);

    // Seek: gently follow cursor when present
    this.seekBehavior = new SeekBehavior(new Vector3());
    this.seekBehavior.weight = 0; // disabled until pointer moves
    v.steering.add(this.seekBehavior);

    this.entityManager.add(v);
  }

  /** Update pointer position (call on pointermove). */
  setPointer(px: number, py: number): void {
    this.pointer.set(px, 0, py);
    this.seekBehavior.target = this.pointer;
    this.pointerActive = true;

    // Gently seek the pointer
    this.seekBehavior.weight = 0.15;

    // If cursor is close, get more curious
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200) {
      this.seekBehavior.weight = 0.3;
    }
  }

  /** Clear pointer tracking (call on pointerleave). */
  clearPointer(): void {
    this.pointerActive = false;
    this.seekBehavior.weight = 0;
  }

  /** Poke the otter — it flees from the poke point briefly. */
  poke(px: number, py: number): void {
    // Remove old flee
    if (this.fleeBehavior) {
      this.vehicle.steering.remove(this.fleeBehavior);
    }

    this.fleeBehavior = new FleeBehavior(new Vector3(px, 0, py));
    this.fleeBehavior.weight = 2.5;
    this.vehicle.steering.add(this.fleeBehavior);
    this.fleeTimer = 1.2; // flee for 1.2 seconds

    // Temporarily boost speed
    this.vehicle.maxSpeed = 80;

    // Suppress seek while fleeing
    this.seekBehavior.weight = 0;
  }

  /** Start the animation loop. */
  start(): void {
    this.lastTime = performance.now() / 1000;
    const tick = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(now - this.lastTime, 0.05); // cap at 50ms
      this.lastTime = now;

      this.update(dt);
      this.animId = requestAnimationFrame(tick);
    };
    this.animId = requestAnimationFrame(tick);
  }

  /** Stop the animation loop. */
  stop(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = 0;
  }

  private update(dt: number): void {
    // Decay flee
    if (this.fleeTimer > 0) {
      this.fleeTimer -= dt;
      if (this.fleeTimer <= 0 && this.fleeBehavior) {
        this.vehicle.steering.remove(this.fleeBehavior);
        this.fleeBehavior = null;
        this.vehicle.maxSpeed = 30; // back to leisurely
        // Restore seek if pointer is active
        if (this.pointerActive) {
          this.seekBehavior.weight = 0.15;
        }
      }
    }

    // Update Yuka
    this.entityManager.update(dt);

    // Read back position
    this.x = this.vehicle.position.x;
    this.y = this.vehicle.position.z;

    // Keep in bounds with soft bounce
    const margin = 40;
    const bw = this.bounds.width;
    const bh = this.bounds.height;
    if (this.x < margin) {
      this.x = margin;
      this.vehicle.position.x = margin;
      this.vehicle.velocity.x *= -0.5;
    }
    if (this.x > bw - margin) {
      this.x = bw - margin;
      this.vehicle.position.x = bw - margin;
      this.vehicle.velocity.x *= -0.5;
    }
    if (this.y < margin) {
      this.y = margin;
      this.vehicle.position.z = margin;
      this.vehicle.velocity.z *= -0.5;
    }
    if (this.y > bh - margin) {
      this.y = bh - margin;
      this.vehicle.position.z = bh - margin;
      this.vehicle.velocity.z *= -0.5;
    }

    // Compute facing direction from velocity
    const vx = this.vehicle.velocity.x;
    const vz = this.vehicle.velocity.z;
    if (Math.abs(vx) > 0.5 || Math.abs(vz) > 0.5) {
      this.rotation = Math.atan2(vz, vx);
      this.facingLeft = vx < 0;
    }
  }

  /** Update bounds (call on resize). */
  resize(width: number, height: number): void {
    this.bounds.width = width;
    this.bounds.height = height;
  }

  destroy(): void {
    this.stop();
    this.entityManager.clear();
  }
}
