import { Types, defineComponent } from 'bitecs';

// Position and movement
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

export const Velocity = defineComponent({
  speed: Types.f32,
});

// Rendering
export const Sprite = defineComponent({
  textureId: Types.ui8,
  width: Types.f32,
  height: Types.f32,
  facingLeft: Types.ui8,
  yOffset: Types.f32,
});

// Health
export const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
  flashTimer: Types.ui8,
});

// Combat
export const Combat = defineComponent({
  damage: Types.f32,
  attackRange: Types.f32,
  attackCooldown: Types.ui16,
  kills: Types.ui16,
});

// Unit state machine
export const UnitStateMachine = defineComponent({
  state: Types.ui8,
  targetX: Types.f32,
  targetY: Types.f32,
  targetEntity: Types.eid,
  returnEntity: Types.eid,
  gatherTimer: Types.i16,
  attackMoveTargetX: Types.f32,
  attackMoveTargetY: Types.f32,
  hasAttackMoveTarget: Types.ui8,
});

// Faction tag
export const FactionTag = defineComponent({
  faction: Types.ui8,
});

// Entity type tag
export const EntityTypeTag = defineComponent({
  kind: Types.ui8,
});

// Resource component (for cattail/clambed)
export const Resource = defineComponent({
  resourceType: Types.ui8,
  amount: Types.f32,
});

// Carrying resource (for gatherers returning resources)
export const Carrying = defineComponent({
  resourceType: Types.ui8,
});

// Building component
export const Building = defineComponent({
  progress: Types.f32,
  rallyX: Types.f32,
  rallyY: Types.f32,
  hasRally: Types.ui8,
});

// Training queue - using flat array approach (max 8 in queue)
export const TrainingQueue = defineComponent({
  slots: [Types.ui8, 8],
  count: Types.ui8,
  timer: Types.i16,
});

// Collider
export const Collider = defineComponent({
  radius: Types.f32,
});

// Selectable
export const Selectable = defineComponent({
  selected: Types.ui8,
});

// Tower auto-attack tag
export const TowerAI = defineComponent();

// IsBuilding tag
export const IsBuilding = defineComponent();

// IsResource tag
export const IsResource = defineComponent();

// Dead tag (for cleanup)
export const Dead = defineComponent();

// Projectile component
export const ProjectileData = defineComponent({
  targetEntity: Types.eid,
  targetX: Types.f32,
  targetY: Types.f32,
  damage: Types.f32,
  ownerEntity: Types.eid,
  speed: Types.f32,
});

// IsProjectile tag
export const IsProjectile = defineComponent();
