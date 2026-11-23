import type { Event, Plan, Result } from './model';

export function createScenarioPlan(): Plan {
  throw new Error('Not implemented: createScenarioPlan');
}

export function applyTemplate(
  _plan: Plan,
  _events: Event[],
  _template: 'VAL2_STAGGERED' | 'VAL2_PARALLEL' | 'REPAIR_G1_TO_G3' | 'NIGHT_WRAP_STAGGERED',
): Result<Plan> {
  throw new Error('Not implemented: applyTemplate');
}
