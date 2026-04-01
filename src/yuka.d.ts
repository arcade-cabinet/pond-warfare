/** Ambient type declarations for yuka (no @types/yuka available). */
declare module 'yuka' {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
    subVectors(a: Vector3, b: Vector3): this;
    normalize(): this;
    divideScalar(s: number): this;
    multiplyScalar(s: number): this;
    add(v: Vector3): this;
    length(): number;
    squaredDistanceTo(v: Vector3): number;
    squaredLength(): number;
    applyMatrix4(m: Matrix4): this;
    applyRotation(q: Quaternion): this;
  }

  export class Matrix4 {
    getInverse(target: Matrix4): Matrix4;
  }

  export class Quaternion {}

  export class GameEntity {
    position: Vector3;
    uuid: string;
    active: boolean;
    /** A list of neighbors populated by EntityManager.updateNeighborhood(). */
    neighbors: GameEntity[];
    /** Entities within this radius are considered neighbors. Default 1. */
    neighborhoodRadius: number;
    /** Whether the EntityManager should compute neighbors each frame. Default false. */
    updateNeighborhood: boolean;
    /** Bounding radius used for obstacle avoidance and spatial queries. Default 0. */
    boundingRadius: number;
    /** Reference to the EntityManager that owns this entity. */
    manager: EntityManager | null;
  }

  export class MovingEntity extends GameEntity {
    velocity: Vector3;
    maxSpeed: number;
    maxForce: number;
  }

  export class SteeringBehavior {
    active: boolean;
    weight: number;
  }

  export class SteeringManager {
    /** Ordered list of steering behaviors. */
    behaviors: SteeringBehavior[];
    add(behavior: SteeringBehavior): this;
    remove(behavior: SteeringBehavior): this;
    clear(): this;
  }

  export class Vehicle extends MovingEntity {
    mass: number;
    steering: SteeringManager;
    worldMatrix: Matrix4;
    rotation: Quaternion;
  }

  export class ArriveBehavior extends SteeringBehavior {
    target: Vector3;
    deceleration: number;
    constructor(target?: Vector3, deceleration?: number);
  }

  export class SeekBehavior extends SteeringBehavior {
    target: Vector3;
    constructor(target?: Vector3);
  }

  export class FleeBehavior extends SteeringBehavior {
    target: Vector3;
    /** The agent only flees if within this distance of the target. Default 10. */
    panicDistance: number;
    constructor(target?: Vector3, panicDistance?: number);
  }

  export class SeparationBehavior extends SteeringBehavior {
    constructor();
  }

  export class AlignmentBehavior extends SteeringBehavior {
    constructor();
  }

  export class CohesionBehavior extends SteeringBehavior {
    constructor();
  }

  export class WanderBehavior extends SteeringBehavior {
    /** Radius of the constraining circle. Default 1. */
    radius: number;
    /** Distance the wander circle is projected in front of the agent. Default 5. */
    distance: number;
    /** Maximum displacement along the circle each frame. Default 5. */
    jitter: number;
    constructor(radius?: number, distance?: number, jitter?: number);
  }

  export class PursuitBehavior extends SteeringBehavior {
    evader: MovingEntity;
    predictionFactor: number;
    constructor(evader?: MovingEntity, predictionFactor?: number);
  }

  export class EvadeBehavior extends SteeringBehavior {
    pursuer: MovingEntity;
    predictionFactor: number;
    panicDistance: number;
    constructor(pursuer?: MovingEntity, panicDistance?: number, predictionFactor?: number);
  }

  export class OffsetPursuitBehavior extends SteeringBehavior {
    leader: Vehicle;
    offset: Vector3;
    constructor(leader?: Vehicle, offset?: Vector3);
  }

  export class ObstacleAvoidanceBehavior extends SteeringBehavior {
    obstacles: GameEntity[];
    brakingWeight: number;
    dBoxMinLength: number;
    constructor(obstacles?: GameEntity[]);
  }

  export class EntityManager {
    entities: GameEntity[];
    add(entity: GameEntity): this;
    remove(entity: GameEntity): this;
    update(delta: number): this;
    clear(): this;
  }

  // ---- Goal-Driven Agent Design ----

  interface GoalStatus {
    ACTIVE: 'active';
    INACTIVE: 'inactive';
    COMPLETED: 'completed';
    FAILED: 'failed';
  }

  export class Goal {
    static STATUS: GoalStatus;
    owner: GameEntity | null;
    status: string;
    constructor(owner?: GameEntity | null);
    activate(): void;
    execute(): void;
    terminate(): void;
    active(): boolean;
    inactive(): boolean;
    completed(): boolean;
    failed(): boolean;
    activateIfInactive(): this;
    replanIfFailed(): this;
  }

  export class CompositeGoal extends Goal {
    subgoals: Goal[];
    addSubgoal(goal: Goal): this;
    removeSubgoal(goal: Goal): this;
    clearSubgoals(): this;
    currentSubgoal(): Goal | null;
    executeSubgoals(): string;
    hasSubgoals(): boolean;
  }

  export class GoalEvaluator {
    characterBias: number;
    constructor(characterBias?: number);
    calculateDesirability(owner: GameEntity): number;
    setGoal(owner: GameEntity): void;
  }

  export class Think extends CompositeGoal {
    evaluators: GoalEvaluator[];
    constructor(owner?: GameEntity | null);
    addEvaluator(evaluator: GoalEvaluator): this;
    removeEvaluator(evaluator: GoalEvaluator): this;
    arbitrate(): this;
  }
}
