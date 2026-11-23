import { expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Report } from '../../src/domain/engine';
import { REQUIRED_ORDERS } from '../../src/domain/model';
import type { Order, Result, Shift } from '../../src/domain/model';
import { createWorkflow, exportWorkflow, transition } from '../../src/domain/workflow';
import type { Action, Workflow } from '../../src/domain/workflow';
import { deepFreeze, feasiblePlan, originalOrders, run, unwrap } from '../support/fixture';
import { finiteTree, sameExecution, sameOutputs } from '../support/execution';
import { checkLedger } from '../support/ledger';

// Explicit public v1.3 output/JSON-boundary contract; bootstrap need not declare it yet.
type RegistryWorkflow = Workflow & {
  orderOrigins: { id: string; quantity: number; originalDue: Shift }[];
};
const originalOrigins = () =>
  originalOrders().map(({ id, quantity, originalDue }) => ({
    id,
    quantity,
    originalDue,
  }));
const custom = (id: string, quantity = 10, originalDue: Shift = 1): Order => ({
  id,
  product: 'A',
  quantity,
  originalDue,
  priority: 'low',
  promise: null,
});
const origin = ({ id, quantity, originalDue }: Order) => ({ id, quantity, originalDue });
function publicRegistry(state: Workflow): RegistryWorkflow {
  const output = state as RegistryWorkflow;
  expect(output).toHaveProperty('orderOrigins');
  expect(Array.isArray(output.orderOrigins), 'public Workflow.orderOrigins output').toBe(true);
  return output;
}
function current(state: Workflow) {
  return state.versions.find((revision) => revision.id === state.currentId)!;
}
function start(): RegistryWorkflow {
  const plan = feasiblePlan();
  const before = structuredClone(plan);
  const state = publicRegistry(unwrap(createWorkflow(deepFreeze(plan))));
  expect(plan).toEqual(before);
  expect(state.orderOrigins).toEqual(originalOrigins());
  return state;
}
function step(state: RegistryWorkflow, action: Action): RegistryWorkflow {
  const before = structuredClone({ state, action });
  const next = publicRegistry(unwrap(transition(deepFreeze(state), deepFreeze(action))));
  expect({ state, action }).toEqual(before);
  return next;
}
function edit(state: RegistryWorkflow, orders: Order[]): RegistryWorkflow {
  return step(state, { type: 'edit-orders', orders });
}
function withCustom(): RegistryWorkflow {
  const state = edit(start(), [...originalOrders(), custom('AUDIT-X')]);
  expect(state.orderOrigins).toEqual([...originalOrigins(), origin(custom('AUDIT-X'))]);
  return state;
}
function withoutSource(): RegistryWorkflow {
  const state = edit(
    start(),
    originalOrders().filter((order) => order.id !== originalOrders()[0]!.id),
  );
  expect(state.orderOrigins).toEqual(originalOrigins());
  return state;
}
function warningAcknowledgements(state: Workflow) {
  const revision = current(state);
  const report = unwrap(evaluate({ plan: revision.plan, events: revision.events }));
  checkLedger(report, revision.plan, revision.events);
  expect(report.feasible).toBe(true);
  return [
    ...new Set(
      report.issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.code),
    ),
  ].map((code) => ({ code, reason: 'Исходные риски раскрыты' }));
}
function withHistory(): RegistryWorkflow {
  let state = step(withCustom(), { type: 'send-demand' });
  state = step(state, { type: 'switch-role', role: 'manager' });
  state = step(state, {
    type: 'fix-requests',
    counts: [40, 40],
    reasons: ['Дневной резерв', 'Ночной резерв'],
  });
  state = step(state, { type: 'submit', acknowledgements: warningAcknowledgements(state) });
  const plan = structuredClone(current(state).plan);
  plan.forecasts = [41, 40];
  state = step(state, { type: 'edit-plan', plan });
  state = step(state, { type: 'switch-role', role: 'planner' });
  state = edit(state, originalOrders());
  expect(current(state).plan.orders.some((order) => order.id === 'AUDIT-X')).toBe(false);
  expect(
    state.versions.some(
      (revision) =>
        revision.id !== state.currentId &&
        revision.plan.orders.some((order) => order.id === 'AUDIT-X'),
    ),
  ).toBe(true);
  expect(state.orderOrigins).toEqual([...originalOrigins(), origin(custom('AUDIT-X'))]);
  return state;
}
function failure<T>(result: Result<T>, code?: string): void {
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Origin contract violation returned success');
  expect(result.errors.length).toBeGreaterThan(0);
  if (code) expect(result.errors.some((issue) => issue.code === code)).toBe(true);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}
function denied(state: RegistryWorkflow, action: Action, code?: string): void {
  const before = structuredClone({ state, action });
  failure(transition(deepFreeze(state), deepFreeze(action)), code);
  expect({ state, action }).toEqual(before);
}
function invalidExport(state: RegistryWorkflow): void {
  const before = structuredClone(state);
  const text = exportWorkflow(deepFreeze(state));
  expect(state).toEqual(before);
  expect(exportWorkflow(state)).toBe(text);
  const payload = JSON.parse(text) as {
    schemaVersion: number;
    workflow: unknown;
    evaluation: Result<Report>;
  };
  expect(Object.keys(payload)).toEqual(['schemaVersion', 'workflow', 'evaluation']);
  expect(payload.schemaVersion).toBe(1);
  expect(payload.workflow).toEqual(before);
  failure(payload.evaluation, 'INVALID_INPUT');
  finiteTree(payload);
  expect(text).toBe(JSON.stringify(payload, null, 2) + '\n');
}

test('v1.3 initializes exactly six deterministic independent public origin records', () => {
  const plan = feasiblePlan();
  const inputBefore = structuredClone(plan);
  const sourceBefore = structuredClone(REQUIRED_ORDERS);
  const first = publicRegistry(unwrap(createWorkflow(deepFreeze(plan))));
  const second = start();
  expect(first.orderOrigins).toEqual(originalOrigins());
  expect(second.orderOrigins).toEqual(first.orderOrigins);
  expect(first.orderOrigins).not.toBe(second.orderOrigins);
  first.orderOrigins.forEach((record, index) => {
    expect(record).not.toBe(second.orderOrigins[index]);
    expect(record).not.toBe(REQUIRED_ORDERS[index]);
    expect(record).not.toBe(plan.orders[index]);
    expect(record).not.toBe(first.scenarioPlan.orders[index]);
    expect(record).not.toBe(current(first).plan.orders[index]);
  });
  expect(plan).toEqual(inputBefore);
  expect(REQUIRED_ORDERS).toEqual(sourceBefore);
});

test('origin order follows first accepted arrays, never current order sorting or draft reconstruction', () => {
  const initial = start();
  const z = custom('AUDIT-Z', 2.5, 2);
  const a = custom('AUDIT-A', 1.25, 4);
  const first = edit(initial, [z, ...originalOrders(), a]);
  expect(first.orderOrigins).toEqual([...originalOrigins(), origin(z), origin(a)]);
  const b = custom('AUDIT-B', 3, 3);
  const second = edit(first, [b, ...structuredClone(current(first).plan.orders).reverse()]);
  expect(second.orderOrigins).toEqual([...originalOrigins(), origin(z), origin(a), origin(b)]);
  expect(initial.orderOrigins).toEqual(originalOrigins());
  expect(first.orderOrigins).toEqual([...originalOrigins(), origin(z), origin(a)]);
});

test('rename/removal retain origins and same-original reuse adds no duplicate entry', () => {
  const accepted = withCustom();
  const renamed = edit(accepted, [...originalOrders(), custom('AUDIT-Y')]);
  const removed = edit(renamed, originalOrders());
  const reused = edit(removed, [...originalOrders(), custom('AUDIT-X')]);
  const expected = [...originalOrigins(), origin(custom('AUDIT-X')), origin(custom('AUDIT-Y'))];
  for (const state of [renamed, removed, reused]) expect(state.orderOrigins).toEqual(expected);
  expect(accepted.orderOrigins).toEqual([...originalOrigins(), origin(custom('AUDIT-X'))]);
});

test.each(['quantity', 'originalDue'] as const)(
  'removed ID cannot change its registered %s',
  (field) => {
    const state = edit(withCustom(), originalOrders());
    const changed = custom('AUDIT-X');
    if (field === 'quantity') changed.quantity = 1;
    else changed.originalDue = 4;
    denied(state, { type: 'edit-orders', orders: [...originalOrders(), changed] });
    expect(state.orderOrigins).toEqual([...originalOrigins(), origin(custom('AUDIT-X'))]);
  },
);

test('unauthorized and partially invalid edits append nothing before a later real first acceptance', () => {
  const initial = start();
  const manager = step(initial, { type: 'switch-role', role: 'manager' });
  denied(manager, { type: 'edit-orders', orders: [...originalOrders(), custom('UNAUTHORIZED')] });
  expect(manager.orderOrigins).toEqual(originalOrigins());
  const planner = step(manager, { type: 'switch-role', role: 'planner' });
  denied(planner, {
    type: 'edit-orders',
    orders: [...originalOrders(), custom('ATOMIC-GOOD', 5, 1), custom('ATOMIC-BAD', 0, 1)],
  });
  expect(planner.orderOrigins).toEqual(originalOrigins());
  const accepted = edit(planner, [...originalOrders(), custom('ATOMIC-GOOD', 2, 4)]);
  expect(accepted.orderOrigins).toEqual([
    ...originalOrigins(),
    origin(custom('ATOMIC-GOOD', 2, 4)),
  ]);
});

test('only committed normalized order IDs enter the registry, once', () => {
  const first = edit(start(), [...originalOrders(), custom('  COMMITTED-X  ')]);
  expect(current(first).plan.orders.find((order) => order.id === 'COMMITTED-X')).toEqual(
    custom('COMMITTED-X'),
  );
  expect(first.orderOrigins).toEqual([...originalOrigins(), origin(custom('COMMITTED-X'))]);
  const next = edit(first, [...originalOrders(), custom(' COMMITTED-X ')]);
  expect(next.orderOrigins).toEqual(first.orderOrigins);
});

test('restore reinitializes only six origins and leaves the previous lineage/scenario unchanged', () => {
  const state = edit(withCustom(), [...originalOrders(), custom('AUDIT-Y')]);
  expect(state.orderOrigins).toEqual([
    ...originalOrigins(),
    origin(custom('AUDIT-X')),
    origin(custom('AUDIT-Y')),
  ]);
  const scenarioBefore = structuredClone(state.scenarioPlan);
  const originsBefore = structuredClone(state.orderOrigins);
  const restored = step(state, { type: 'restore-scenario' });
  expect(restored.orderOrigins).toEqual(originalOrigins());
  expect(restored.scenarioPlan).toEqual(scenarioBefore);
  expect(current(restored).plan.orders).toEqual(originalOrders());
  expect(state.orderOrigins).toEqual(originsBefore);
  const fresh = edit(restored, [...originalOrders(), custom('AUDIT-X', 1, 4)]);
  expect(fresh.orderOrigins).toEqual([...originalOrigins(), origin(custom('AUDIT-X', 1, 4))]);
});

test('export retains ordered audit origins without phantom demand, allocation or stock', () => {
  const baseline = start();
  const first = custom('HIDDEN-Z', 1e6, 1);
  const second = custom('HIDDEN-A', 2e6, 4);
  const accepted = edit(baseline, [...originalOrders(), first, second]);
  const state = edit(accepted, originalOrders());
  const row = current(state);
  const real = unwrap(evaluate({ plan: row.plan, events: row.events }));
  const original = unwrap(evaluate({ plan: current(baseline).plan, events: [] }));
  checkLedger(real, row.plan, row.events);
  checkLedger(original, current(baseline).plan);
  sameExecution(original, current(baseline).plan, real, row.plan);
  sameOutputs(original, real);
  const before = structuredClone(state);
  const text = exportWorkflow(deepFreeze(state));
  const payload = JSON.parse(text) as {
    schemaVersion: number;
    workflow: RegistryWorkflow;
    evaluation: Result<Report>;
  };
  expect(payload.schemaVersion).toBe(1);
  expect(payload.workflow).toEqual(before);
  expect(payload.workflow.orderOrigins).toEqual([
    ...originalOrigins(),
    origin(first),
    origin(second),
  ]);
  expect(payload.evaluation).toEqual({ ok: true, value: real });
  expect(real.orders.map((order) => order.orderId).sort()).toEqual(
    originalOrders()
      .map((order) => order.id)
      .sort(),
  );
  expect(current(payload.workflow).plan.orders).toEqual(originalOrders());
  expect(state).toEqual(before);
  expect(exportWorkflow(state)).toBe(text);
  expect(text).toBe(JSON.stringify(payload, null, 2) + '\n');
}, 60_000);

test('origins survive real successors, event drafts and both approvals without changing old states', () => {
  let state = edit(withCustom(), originalOrders());
  const expected = [...originalOrigins(), origin(custom('AUDIT-X'))];
  expect(state.orderOrigins).toEqual(expected);
  const retain = (action: Action) => {
    state = step(state, action);
    expect(state.orderOrigins).toEqual(expected);
  };
  const agree = () => {
    retain({ type: 'submit', acknowledgements: warningAcknowledgements(state) });
    retain({ type: 'approve' });
    retain({ type: 'switch-role', role: 'planner' });
    retain({ type: 'approve' });
    expect(current(state).status).toBe('agreed');
    retain({ type: 'switch-role', role: 'manager' });
  };
  retain({ type: 'send-demand' });
  retain({ type: 'switch-role', role: 'manager' });
  retain({ type: 'fix-requests', counts: [40, 40], reasons: ['Дневной резерв', 'Ночной резерв'] });
  agree();
  retain({ type: 'apply-failure', machineId: 'GRIND-1' });
  const repaired = structuredClone(current(state).plan);
  run(repaired, 'GRIND-3', 'A', 120, 270, 102);
  retain({ type: 'edit-plan', plan: repaired });
  agree();
  retain({ type: 'apply-absence' });
  agree();
});

type InvalidLedger = {
  name: string;
  build?: () => RegistryWorkflow;
  corrupt: (state: RegistryWorkflow) => void;
};
const ledgerValue =
  (value: unknown) =>
  (state: RegistryWorkflow): void => {
    Object.assign(state, { orderOrigins: structuredClone(value) });
  };
const customOriginFields =
  (fields: Record<string, unknown>) =>
  (state: RegistryWorkflow): void => {
    Object.assign(state.orderOrigins[6]!, fields);
  };
function historicalOrder(state: RegistryWorkflow): Order {
  const order = state.versions
    .filter((revision) => revision.id !== state.currentId)
    .flatMap((revision) => revision.plan.orders)
    .find((row) => row.id === 'AUDIT-X');
  expect(order).toBeDefined();
  if (!order) throw new Error('Public history has no retained custom order');
  return order;
}
const invalidLedgers: InvalidLedger[] = [
  {
    name: 'missing ledger',
    corrupt: (s) => {
      Reflect.deleteProperty(s, 'orderOrigins');
    },
  },
  { name: 'null ledger', corrupt: ledgerValue(null) },
  { name: 'nonarray ledger', corrupt: ledgerValue({}) },
  {
    name: 'duplicate ID',
    corrupt: (s) => {
      s.orderOrigins.push(structuredClone(s.orderOrigins[0]!));
    },
  },
  { name: 'empty ID', corrupt: customOriginFields({ id: '' }) },
  { name: 'blank ID', corrupt: customOriginFields({ id: ' ' }) },
  { name: 'zero quantity', corrupt: customOriginFields({ quantity: 0 }) },
  { name: 'negative quantity', corrupt: customOriginFields({ quantity: -1 }) },
  { name: 'null quantity', corrupt: customOriginFields({ quantity: null }) },
  { name: 'text quantity', corrupt: customOriginFields({ quantity: '10' }) },
  { name: 'zero due', corrupt: customOriginFields({ originalDue: 0 }) },
  { name: 'due beyond four', corrupt: customOriginFields({ originalDue: 5 }) },
  { name: 'fractional due', corrupt: customOriginFields({ originalDue: 1.5 }) },
  { name: 'text due', corrupt: customOriginFields({ originalDue: '1' }) },
  {
    name: 'missing source origin',
    corrupt: (s) => {
      s.orderOrigins.splice(0, 1);
    },
  },
  {
    name: 'source quantity changed after removal',
    build: withoutSource,
    corrupt: (s) => {
      s.orderOrigins[0]!.quantity = 1;
    },
  },
  {
    name: 'source due changed after removal',
    build: withoutSource,
    corrupt: (s) => {
      s.orderOrigins[0]!.originalDue = 4;
    },
  },
  {
    name: 'missing current custom origin',
    corrupt: (s) => {
      s.orderOrigins.splice(6, 1);
    },
  },
  {
    name: 'current quantity disagrees',
    corrupt: (s) => {
      current(s).plan.orders.find((o) => o.id === 'AUDIT-X')!.quantity = 11;
    },
  },
  {
    name: 'current due disagrees',
    corrupt: (s) => {
      current(s).plan.orders.find((o) => o.id === 'AUDIT-X')!.originalDue = 4;
    },
  },
  {
    name: 'scenario originals disagree',
    corrupt: (s) => {
      s.scenarioPlan.orders[0]!.quantity += 1;
    },
  },
  {
    name: 'historical quantity disagrees',
    build: withHistory,
    corrupt: (s) => {
      historicalOrder(s).quantity = 11;
    },
  },
  {
    name: 'historical due disagrees',
    build: withHistory,
    corrupt: (s) => {
      historicalOrder(s).originalDue = 4;
    },
  },
  {
    name: 'missing historical-only origin',
    build: withHistory,
    corrupt: (s) => {
      s.orderOrigins.splice(6, 1);
    },
  },
  { name: 'null origin record', corrupt: ledgerValue([...originalOrigins(), null]) },
  { name: 'nonobject origin record', corrupt: ledgerValue([...originalOrigins(), 7]) },
  {
    name: 'missing quantity field',
    corrupt: (s) => {
      Reflect.deleteProperty(s.orderOrigins[6]!, 'quantity');
    },
  },
  {
    name: 'missing due field',
    corrupt: (s) => {
      Reflect.deleteProperty(s.orderOrigins[6]!, 'originalDue');
    },
  },
];

test.each(invalidLedgers)(
  'invalid origins: $name reject immutable transition and preserve D2 JSON diagnostics',
  ({ build, corrupt }) => {
    const state = (build ?? withCustom)();
    corrupt(state);
    denied(state, { type: 'switch-role', role: 'manager' }, 'INVALID_INPUT');
    invalidExport(state);
  },
  60_000,
);

test.each([NaN, Infinity, -Infinity])(
  'nonfinite origin quantity %s is invalid; its finite JSON boundary data is preserved',
  (quantity) => {
    const state = withCustom();
    state.orderOrigins[6]!.quantity = quantity;
    denied(state, { type: 'switch-role', role: 'manager' }, 'INVALID_INPUT');
    // Nonfinite values themselves are outside D2's finite-JSON contract. Actual JSON transport
    // represents this field as null; the supplied finite value, not a repaired origin, is exported.
    const boundary = JSON.parse(JSON.stringify(state)) as RegistryWorkflow;
    expect(boundary.orderOrigins[6]!.quantity).toBe(null);
    invalidExport(boundary);
  },
);
