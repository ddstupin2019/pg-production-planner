import { expect, test } from 'vitest';
import type { Order } from '../../src/domain/model';
import { createWorkflow, transition } from '../../src/domain/workflow';
import type { Action, Workflow } from '../../src/domain/workflow';
import { deepFreeze, feasiblePlan, originalOrders, unwrap } from '../support/fixture';

function current(state: Workflow) {
  return state.versions.find((revision) => revision.id === state.currentId)!;
}
function step(state: Workflow, action: Action): Workflow {
  const before = structuredClone({ state, action });
  const next = unwrap(transition(deepFreeze(state), deepFreeze(action)));
  expect({ state, action }).toEqual(before);
  return next;
}
function custom(id: string, quantity = 10, originalDue: Order['originalDue'] = 1): Order {
  return { id, product: 'A', quantity, originalDue, priority: 'low', promise: null };
}
function renamedDraft(): Workflow {
  let state = unwrap(createWorkflow(deepFreeze(feasiblePlan())));
  state = step(state, { type: 'edit-orders', orders: [...originalOrders(), custom('ORIGIN-X')] });
  state = step(state, {
    type: 'edit-orders',
    orders: current(state).plan.orders.map((order) =>
      order.id === 'ORIGIN-X' ? { ...order, id: 'ORIGIN-Y' } : { ...order },
    ),
  });
  expect(state.role).toBe('planner');
  expect(state.versions).toHaveLength(1);
  expect(current(state).status).toBe('draft');
  expect(
    state.versions.every((revision) =>
      revision.plan.orders.every((order) => order.id !== 'ORIGIN-X'),
    ),
  ).toBe(true);
  expect(current(state).plan.orders.find((order) => order.id === 'ORIGIN-Y')).toMatchObject({
    quantity: 10,
    originalDue: 1,
  });
  return state;
}
function rejectedOrders(state: Workflow, orders: Order[]): void {
  const action: Action = { type: 'edit-orders', orders };
  const before = structuredClone({ state, action });
  const result = transition(deepFreeze(state), deepFreeze(action));
  expect({ state, action }).toEqual(before);
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('A removed ID acquired changed original commitments');
  expect(result.errors.length).toBeGreaterThan(0);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}

test('draft replacement X to Y cannot forget X originals when X is reused with changed quantity/due', () => {
  const state = renamedDraft();
  rejectedOrders(state, [...current(state).plan.orders, custom('ORIGIN-X', 1, 4)]);
});

test('removing a source order cannot permit changed originals when its ID is reintroduced', () => {
  const source = originalOrders()[0]!;
  let state = unwrap(createWorkflow(deepFreeze(feasiblePlan())));
  state = step(state, {
    type: 'edit-orders',
    orders: originalOrders().filter((order) => order.id !== source.id),
  });
  expect(state.versions).toHaveLength(1);
  expect(current(state).plan.orders.every((order) => order.id !== source.id)).toBe(true);
  expect(state.scenarioPlan.orders.find((order) => order.id === source.id)).toEqual(source);
  rejectedOrders(state, [
    ...current(state).plan.orders,
    { ...source, quantity: 1, originalDue: 4 },
  ]);
});

test('a genuinely unused custom ID remains admissible after another ID is removed by rename', () => {
  const state = renamedDraft();
  const next = step(state, {
    type: 'edit-orders',
    orders: [...current(state).plan.orders, custom('UNUSED-Z', 1, 4)],
  });
  expect(current(next).plan.orders.find((order) => order.id === 'UNUSED-Z')).toEqual(
    custom('UNUSED-Z', 1, 4),
  );
});

test('restore starts a new lineage in which the old custom ID may have new submitted originals', () => {
  const state = renamedDraft();
  const restored = step(state, { type: 'restore-scenario' });
  expect(restored.versions).toHaveLength(1);
  expect(current(restored).plan.orders).toEqual(originalOrders());
  expect(current(restored).plan.mode).toBe('required');
  const next = step(restored, {
    type: 'edit-orders',
    orders: [...originalOrders(), custom('ORIGIN-X', 1, 4)],
  });
  expect(current(next).plan.orders.find((order) => order.id === 'ORIGIN-X')).toEqual(
    custom('ORIGIN-X', 1, 4),
  );
});
