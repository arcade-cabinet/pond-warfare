/**
 * Object Pool
 *
 * Reuses objects instead of allocating/GC-ing them every frame.
 * Useful for high-churn objects like particles and floating texts.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: ((obj: T) => void) | undefined;

  constructor(factory: () => T, prealloc = 0, reset?: (obj: T) => void) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < prealloc; i++) this.pool.push(factory());
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(obj: T): void {
    if (this.reset) this.reset(obj);
    this.pool.push(obj);
  }

  /** Number of objects currently available in the pool. */
  get available(): number {
    return this.pool.length;
  }
}
