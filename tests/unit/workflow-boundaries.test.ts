import { describe, expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Report } from '../../src/domain/engine';
import type { Plan, Result } from '../../src/domain/model';
import { createWorkflow, exportWorkflow, transition } from '../../src/domain/workflow';
import type { Action, Workflow } from '../../src/domain/workflow';
import { deepFreeze, emptyPlan, feasiblePlan, originalOrders, unwrap } from '../support/fixture';
import { finiteTree } from '../support/execution';

function failure<T>(result: Result<T>, codes?: string[]): void {
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Invalid public input succeeded');
  expect(result.errors.length).toBeGreaterThan(0);
  if (codes) expect(result.errors.some((issue) => codes.includes(issue.code))).toBe(true);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}

function denied(state: Workflow, action: Action, codes?: string[]): void {
  const before = structuredClone({ state, action });
  const result = transition(deepFreeze(state), deepFreeze(action));
  expect({ state, action }).toEqual(before);
  failure(result, codes);
}

// Independently constructed external JSON draft, not an invented agreement or evaluator mock.
// Empty physical schedules are permitted at initialization; they cannot be submitted as feasible.
function externalDraft(): Workflow {
  const plan = emptyPlan();
  plan.requests = null;
  return {
    schemaVersion: 1,
    role: 'planner',
    demandSent: false,
    phase: 'baseline',
    planningMinute: 660,
    lockedRequests: null,
    versions: [
      {
        id: 1,
        parentId: null,
        plan: structuredClone(plan),
        events: [],
        status: 'draft',
        approvals: [],
        acknowledgements: [],
      },
    ],
    currentId: 1,
    scenarioPlan: structuredClone(plan),
  };
}

type Corruption = [string, (state: Workflow) => void];
const corruptions: Corruption[] = [
  [
    'null scenarioPlan',
    (s) => {
      Object.assign(s, { scenarioPlan: null });
    },
  ],
  [
    'nonobject scenarioPlan',
    (s) => {
      Object.assign(s, { scenarioPlan: 17 });
    },
  ],
  [
    'scenarioPlan orders not an array',
    (s) => {
      Object.assign(s.scenarioPlan, { orders: {} });
    },
  ],
  [
    'scenarioPlan null campaign',
    (s) => {
      Object.assign(s.scenarioPlan, { campaigns: [null] });
    },
  ],
  [
    'null revision',
    (s) => {
      Object.assign(s, { versions: [null] });
    },
  ],
  [
    'numeric revision',
    (s) => {
      Object.assign(s, { versions: [7] });
    },
  ],
  [
    'array revision',
    (s) => {
      Object.assign(s, { versions: [[]] });
    },
  ],
  [
    'duplicate revision ID',
    (s) => {
      s.versions.push(structuredClone(s.versions[0]!));
    },
  ],
  [
    'missing parent revision',
    (s) => {
      s.versions[0]!.parentId = 999;
    },
  ],
  [
    'self parent revision',
    (s) => {
      s.versions[0]!.parentId = 1;
    },
  ],
  [
    'text parent ID',
    (s) => {
      Object.assign(s.versions[0]!, { parentId: '1' });
    },
  ],
  [
    'unknown revision status',
    (s) => {
      Object.assign(s.versions[0]!, { status: 'accepted' });
    },
  ],
  [
    'null approvals',
    (s) => {
      Object.assign(s.versions[0]!, { approvals: null });
    },
  ],
  [
    'duplicate approvals',
    (s) => {
      Object.assign(s.versions[0]!, { status: 'pending', approvals: ['planner', 'planner'] });
    },
  ],
  [
    'unknown approval role',
    (s) => {
      Object.assign(s.versions[0]!, { status: 'pending', approvals: ['observer'] });
    },
  ],
  [
    'unknown workflow role',
    (s) => {
      Object.assign(s, { role: 'observer' });
    },
  ],
  [
    'null acknowledgements',
    (s) => {
      Object.assign(s.versions[0]!, { acknowledgements: null });
    },
  ],
  [
    'nonobject acknowledgement',
    (s) => {
      Object.assign(s.versions[0]!, { acknowledgements: [null] });
    },
  ],
  [
    'acknowledgement missing reason',
    (s) => {
      Object.assign(s.versions[0]!, { acknowledgements: [{ code: 'ORDER_SHORTFALL' }] });
    },
  ],
  [
    'acknowledgement nontext code',
    (s) => {
      Object.assign(s.versions[0]!, { acknowledgements: [{ code: 7, reason: 'Раскрыто' }] });
    },
  ],
  [
    'null revision events',
    (s) => {
      Object.assign(s.versions[0]!, { events: null });
    },
  ],
  [
    'nonobject revision event',
    (s) => {
      Object.assign(s.versions[0]!, { events: [null] });
    },
  ],
  [
    'unknown revision event',
    (s) => {
      Object.assign(s.versions[0]!, { events: [{ kind: 'holiday' }] });
    },
  ],
  [
    'nontext event target',
    (s) => {
      Object.assign(s.versions[0]!, { events: [{ kind: 'failure', machineId: 7 }] });
    },
  ],
  [
    'null revision plan',
    (s) => {
      Object.assign(s.versions[0]!, { plan: null });
    },
  ],
  [
    'revision plan orders not an array',
    (s) => {
      Object.assign(s.versions[0]!.plan, { orders: {} });
    },
  ],
  [
    'revision plan null setup',
    (s) => {
      Object.assign(s.versions[0]!.plan, { setups: [null] });
    },
  ],
  [
    'revision plan invalid forecast tuple',
    (s) => {
      Object.assign(s.versions[0]!.plan, { forecasts: [1] });
    },
  ],
];

describe('finite JSON Workflow malformations are rejected, never repaired or approved', () => {
  test('uncorrupted external draft permits role switching and exports its real physical report', () => {
    const state = externalDraft();
    const before = structuredClone(state);
    const next = unwrap(transition(deepFreeze(state), { type: 'switch-role', role: 'manager' }));
    expect(state).toEqual(before);
    expect(next).toEqual({ ...before, role: 'manager' });
    const payload = JSON.parse(exportWorkflow(state)) as { evaluation: Result<Report> };
    expect(payload.evaluation).toEqual(evaluate({ plan: state.versions[0]!.plan, events: [] }));
    expect(unwrap(payload.evaluation).feasible).toBe(false);
  });
  test.each(corruptions)('transition refuses %s without mutation', (_label, corrupt) => {
    const state = externalDraft();
    corrupt(state);
    denied(state, { type: 'switch-role', role: 'manager' });
  });

  test.each(corruptions)(
    'D2 export preserves %s with INVALID_INPUT diagnostics',
    (_label, corrupt) => {
      const state = externalDraft();
      corrupt(state);
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
      failure(payload.evaluation, ['INVALID_INPUT']);
      finiteTree(payload);
      expect(text).toBe(JSON.stringify(payload, null, 2) + '\n');
    },
  );
});

function sent(role: 'planner' | 'manager'): Workflow {
  let state = unwrap(createWorkflow(deepFreeze(feasiblePlan())));
  state = unwrap(transition(deepFreeze(state), { type: 'send-demand' }));
  if (role === 'manager')
    state = unwrap(transition(deepFreeze(state), { type: 'switch-role', role }));
  expect(state.role).toBe(role);
  expect(state.demandSent).toBe(true);
  expect(state.lockedRequests).toBe(null);
  expect(state.versions.find((v) => v.id === state.currentId)!.status).toBe('draft');
  return state;
}

const badOrders: [string, () => unknown][] = [
  ['missing', () => ({ type: 'edit-orders' })],
  ...[null, 7, {}, [null], [{}]].map((orders): [string, () => unknown] => [
    JSON.stringify(orders),
    () => ({ type: 'edit-orders', orders }),
  ]),
  [
    'duplicate ID',
    () => {
      const orders = originalOrders();
      orders.push(structuredClone(orders[0]!));
      return { type: 'edit-orders', orders };
    },
  ],
  [
    'unknown product',
    () => {
      const orders = originalOrders();
      Object.assign(orders[0]!, { product: 'D' });
      return { type: 'edit-orders', orders };
    },
  ],
  [
    'invalid promise',
    () => {
      const orders = originalOrders();
      Object.assign(orders[0]!, { promise: { quantity: 1, due: 5, reason: 'Позже' } });
      return { type: 'edit-orders', orders };
    },
  ],
];
function draftPayloadPlan(): Plan {
  const plan = feasiblePlan();
  plan.requests = null;
  return plan;
}
const badPlans: [string, () => unknown][] = [
  ['missing', () => ({ type: 'edit-plan' })],
  ...[null, 7, {}].map((plan): [string, () => unknown] => [
    JSON.stringify(plan),
    () => ({ type: 'edit-plan', plan }),
  ]),
  ...(
    [
      ['campaigns not array', { campaigns: {} }],
      ['null campaign', { campaigns: [null] }],
      ['invalid forecasts', { forecasts: [1] }],
      [
        'null worker list',
        { assignments: [{ taskId: 'run:GRIND', start: 0, end: 1, workerIds: null }] },
      ],
    ] satisfies [string, object][]
  ).map(([name, fields]): [string, () => unknown] => [
    name,
    () => ({ type: 'edit-plan', plan: Object.assign(draftPayloadPlan(), fields) }),
  ]),
];

describe('malformed edit payloads reach the correct role after demand is sent', () => {
  test.each(badOrders)('planner refuses edit-orders %s immutably', (_label, action) => {
    denied(sent('planner'), action() as Action, [
      'INVALID_INPUT',
      'SOURCE_CHANGED',
      'WORKFLOW_GUARD',
    ]);
  });
  test.each(badPlans)('manager refuses edit-plan %s immutably', (_label, action) => {
    denied(sent('manager'), action() as Action, [
      'INVALID_INPUT',
      'SOURCE_CHANGED',
      'WORKFLOW_GUARD',
    ]);
  });
});

describe('shape-valid external workflows cannot approve an absent physical failure target', () => {
  test.each(['fix-requests', 'submit'] as const)(
    '%s rejects an idle event target, not a role gate',
    (actionType) => {
      const state = externalDraft();
      state.role = 'manager';
      state.demandSent = true;
      state.phase = 'failure';
      const revision = state.versions[0]!;
      revision.events = [{ kind: 'failure', machineId: 'GRIND-1' }];
      if (actionType === 'submit') {
        state.lockedRequests = [40, 40];
        revision.plan.requests = [40, 40];
      }
      const input = { plan: revision.plan, events: revision.events };
      const before = structuredClone(input);
      failure(evaluate(deepFreeze(input)), ['EVENT_TARGET']);
      expect(input).toEqual(before);
      const action: Action =
        actionType === 'fix-requests'
          ? {
              type: 'fix-requests',
              counts: [40, 40],
              reasons: ['Раскрытый дневной резерв', 'Раскрытый ночной резерв'],
            }
          : {
              type: 'submit',
              acknowledgements: [
                { code: 'ORDER_SHORTFALL', reason: 'Исходный дефицит раскрыт' },
                { code: 'QUOTA_SHORTFALL', reason: 'Риск квот раскрыт' },
              ],
            };
      denied(state, action, ['EVENT_TARGET', 'INVALID_INPUT', 'WORKFLOW_GUARD']);
      expect(revision.status).toBe('draft');
      expect(revision.approvals).toEqual([]);
    },
  );
});
