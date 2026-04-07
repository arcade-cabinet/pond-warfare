import { hasComponent } from 'bitecs';
import { AutonomousSpecialist, LegacySpecialistSnapshot } from '@/ecs/components';
import { game } from '@/game';
import type { RosterUnit, UnitTask } from '@/ui/roster-types';

const REASSIGNABLE_ATTACK_TASKS: UnitTask[] = ['idle', 'patrolling', 'defending', 'attacking'];
const REASSIGNABLE_DEFEND_TASKS: UnitTask[] = ['idle', 'patrolling', 'defending', 'attacking'];

function isPrestigeLocked(unit: RosterUnit): boolean {
  if (!unit.hasOverride) return false;
  const ecs = game.world?.ecs;
  if (!ecs) return false;
  return (
    hasComponent(ecs, unit.eid, LegacySpecialistSnapshot) ||
    hasComponent(ecs, unit.eid, AutonomousSpecialist)
  );
}

function canReassign(unit: RosterUnit, allowedTasks: UnitTask[]): boolean {
  if (!allowedTasks.includes(unit.task)) return false;
  return !isPrestigeLocked(unit);
}

export function canAttackWith(unit: RosterUnit): boolean {
  return canReassign(unit, REASSIGNABLE_ATTACK_TASKS);
}

export function canDefendWith(unit: RosterUnit): boolean {
  return canReassign(unit, REASSIGNABLE_DEFEND_TASKS);
}
