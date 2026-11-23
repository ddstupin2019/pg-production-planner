import { expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Event, Plan, Result, Shift } from '../../src/domain/model';
import { applyTemplate, createScenarioPlan } from '../../src/domain/scenario';
import { transition } from '../../src/domain/workflow';
import type { Action, Workflow } from '../../src/domain/workflow';
import { deepFreeze, emptyPlan, feasiblePlan, originalOrders, unwrap } from '../support/fixture';
import { finiteTree, sameExecution, uniqueSchedule } from '../support/execution';
import { checkLedger } from '../support/ledger';

function refused<T>(result: Result<T>, codes: string[]): void {
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Invalid external input unexpectedly succeeded');
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.errors.some((issue) => codes.includes(issue.code))).toBe(true);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}

// Plain external JSON draft data, never a fabricated agreed revision or reachable-UI claim.
function managerDraft(
  plan: Plan,
  events: Event[] = [],
): Workflow & {
  orderOrigins: { id: string; quantity: number; originalDue: Shift }[];
} {
  const original = structuredClone(plan);
  original.requests = null;
  return {
    schemaVersion: 1,
    role: 'manager',
    demandSent: true,
    phase: 'baseline',
    planningMinute: 660,
    lockedRequests: null,
    versions: [
      {
        id: 1,
        parentId: null,
        plan: structuredClone(original),
        events: structuredClone(events),
        status: 'draft',
        approvals: [],
        acknowledgements: [],
      },
    ],
    currentId: 1,
    scenarioPlan: structuredClone(original),
    orderOrigins: originalOrders().map(({ id, quantity, originalDue }) => ({
      id,
      quantity,
      originalDue,
    })),
  };
}

test('apply-failure rejects null current campaigns without mutating the intact scenario or creating a successor', () => {
  const state = managerDraft(feasiblePlan());
  const scenario = structuredClone(state.scenarioPlan);
  Object.assign(state.versions[0]!.plan, { campaigns: null });
  expect(state.scenarioPlan).toEqual(scenario);
  const action: Action = { type: 'apply-failure', machineId: 'GRIND-1' };
  const before = structuredClone({ state, action });
  refused(transition(deepFreeze(state), deepFreeze(action)), ['INVALID_INPUT', 'WORKFLOW_GUARD']);
  expect({ state, action }).toEqual(before);
  expect(state.scenarioPlan).toEqual(scenario);
  expect(state.versions).toHaveLength(1);
  expect(state.currentId).toBe(1);
});

test('external baseline draft with a legal failure array but no actual target production cannot lock requests', () => {
  const state = managerDraft(emptyPlan(), [{ kind: 'failure', machineId: 'GRIND-1' }]);
  const action: Action = {
    type: 'fix-requests',
    counts: [40, 40],
    reasons: ['Объяснённый дневной резерв', 'Объяснённый ночной резерв'],
  };
  const before = structuredClone({ state, action });
  refused(transition(deepFreeze(state), deepFreeze(action)), [
    'EVENT_TARGET',
    'INVALID_INPUT',
    'EVENT_ORDER',
    'WORKFLOW_GUARD',
  ]);
  expect({ state, action }).toEqual(before);
  expect(state.lockedRequests).toBe(null);
  expect(state.versions[0]!.plan.requests).toBe(null);
  expect(state.versions[0]!.status).toBe('draft');
  expect(state.versions[0]!.approvals).toEqual([]);
});

test('night template preserves an already recorded whitespace-bearing historical campaign identity or explains refusal', () => {
  const baseline = createScenarioPlan();
  const failure: Event[] = [{ kind: 'failure', machineId: 'GRIND-1' }];
  const repairInput = structuredClone({ plan: baseline, events: failure });
  const repaired = unwrap(
    applyTemplate(deepFreeze(baseline), deepFreeze(failure), 'REPAIR_G1_TO_G3'),
  );
  expect({ plan: baseline, events: failure }).toEqual(repairInput);
  const events: Event[] = [...failure, { kind: 'absence' }];
  const reference = unwrap(evaluate(deepFreeze({ plan: repaired, events })));
  checkLedger(reference, repaired, events);
  const external = structuredClone(repaired);
  const producedBeforeCut = (id: string) =>
    reference.machineIntervals.some(
      (row) => row.campaignId === id && row.kind === 'produce' && row.start < 630 && row.rate > 0,
    );
  const historical =
    external.campaigns.find(
      (campaign) =>
        campaign.machineId === 'PRESS-1' && campaign.start === 0 && producedBeforeCut(campaign.id),
    ) ?? external.campaigns.find((campaign) => producedBeforeCut(campaign.id));
  expect(historical).toBeDefined();
  if (!historical) throw new Error('Factory/repair lineage has no actual pre-cut production');
  // This is already recorded external history, not an ordinary form-submission trim policy.
  historical.id = ` ${historical.id} `;
  const recorded = structuredClone(historical);
  expect(recorded.id.trim().length).toBeGreaterThan(0);
  const before = structuredClone({ plan: external, events });
  const result = applyTemplate(deepFreeze(external), deepFreeze(events), 'NIGHT_WRAP_STAGGERED');
  expect({ plan: external, events }).toEqual(before);
  if (!result.ok) {
    refused(result, [
      'INVALID_INPUT',
      'SOURCE_CHANGED',
      'EVENT_ORDER',
      'EVENT_TARGET',
      'WORKFLOW_GUARD',
      'SETUP_REQUIRED',
      'MACHINE_CONFLICT',
      'WORK_WINDOW',
      'WORK_DURATION',
      'WORK_MISSING',
      'VALIDATION_OUTPUT',
      'STAFF_SHORTAGE',
      'STAFF_ASSIGNMENT',
      'UNSUPPORTED_FAILURE_TARGET',
      'UNSUPPORTED_FAILURE_VALIDATION',
    ]);
  } else {
    const next = result.value;
    finiteTree(next);
    uniqueSchedule(next);
    expect(next.orders).toEqual(external.orders);
    expect(next.requests).toEqual(external.requests);
    expect(next.mode).toBe(external.mode);
    const retained = next.campaigns.find((campaign) => campaign.id === recorded.id);
    expect(retained).toBeDefined();
    if (!retained) throw new Error('Recorded historical campaign identity was lost or normalized');
    expect(retained.id).toBe(recorded.id);
    expect(retained.machineId).toBe(recorded.machineId);
    expect(retained.product).toBe(recorded.product);
    expect(retained.start).toBe(recorded.start);
    expect(Math.min(retained.until, 630)).toBe(Math.min(recorded.until, 630));
    const after = unwrap(evaluate({ plan: deepFreeze(next), events }));
    checkLedger(after, next, events);
    // Renaming a record alone cannot change this real reference execution. No report is mocked.
    sameExecution(reference, repaired, after, next, 630);
  }
}, 60_000);
