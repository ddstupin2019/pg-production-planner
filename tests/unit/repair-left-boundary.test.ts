import { expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Event } from '../../src/domain/model';
import { applyTemplate, createScenarioPlan } from '../../src/domain/scenario';
import { deepFreeze, unwrap } from '../support/fixture';
import { finiteTree, sameExecution, uniqueSchedule } from '../support/execution';
import { checkLedger, near, quantity } from '../support/ledger';

test('post-event repair preserves an ended A permission boundary or explains refusal without inventing transfer', () => {
  const factory = createScenarioPlan();
  const factoryBefore = structuredClone(factory);
  const original = unwrap(evaluate({ plan: deepFreeze(factory), events: [] }));
  checkLedger(original, factory);
  const left = original.machineIntervals.find(
    (row) =>
      row.machineId === 'GRIND-1' &&
      row.product === 'A' &&
      row.kind === 'produce' &&
      row.rate > 0 &&
      row.start < 120 &&
      row.end >= 120,
  );
  expect(left).toBeDefined();
  if (!left || left.campaignId === null)
    throw new Error('Factory has no actual GRIND-1/A left-boundary permission');

  // External post-event input: do not call the initial workflow failure action, whose
  // unmodified-baseline guard also requires production containing the right side of 120.
  const plan = structuredClone(factory);
  const ended = plan.campaigns.find((campaign) => campaign.id === left.campaignId);
  expect(ended).toBeDefined();
  if (!ended) throw new Error('Actual factory production has no matching campaign');
  expect(ended.start).toBeLessThan(120);
  ended.until = 120;
  plan.campaigns = plan.campaigns.filter(
    (campaign) =>
      !(
        campaign.machineId === 'GRIND-1' &&
        campaign.product === 'A' &&
        campaign.start < 270 &&
        campaign.until > 120
      ),
  );
  expect(plan.campaigns.find((campaign) => campaign.id === ended.id)?.until).toBe(120);
  expect(
    plan.campaigns.some(
      (campaign) =>
        campaign.machineId === 'GRIND-1' &&
        campaign.product === 'A' &&
        campaign.start < 270 &&
        campaign.until > 120,
    ),
  ).toBe(false);

  const events: Event[] = [{ kind: 'failure', machineId: 'GRIND-1' }];
  const inputBefore = structuredClone({ plan, events });
  const before = unwrap(evaluate(deepFreeze({ plan, events })));
  finiteTree(before);
  checkLedger(before, plan, events);
  expect(
    before.issues.some(
      (issue) =>
        issue.severity === 'error' &&
        ['INVALID_INPUT', 'EVENT_TARGET', 'EVENT_ORDER'].includes(issue.code),
    ),
  ).toBe(false);
  const producing = before.machineIntervals.filter(
    (row) =>
      row.machineId === 'GRIND-1' && row.product === 'A' && row.kind === 'produce' && row.rate > 0,
  );
  expect(producing.some((row) => row.start < 120 && row.end >= 120)).toBe(true);
  expect(producing.some((row) => row.start <= 120 && row.end > 120)).toBe(false);
  near(quantity(before, 'GRIND-1', 120, 270), 0);
  sameExecution(original, factory, before, plan, 120);
  expect({ plan, events }).toEqual(inputBefore);

  // No earlier template call/transfer is used. A protective no-op or explained refusal
  // may already satisfy this boundary; it is not a required real-implementation RED.
  const result = applyTemplate(plan, events, 'REPAIR_G1_TO_G3');
  expect({ plan, events }).toEqual(inputBefore);
  expect(factory).toEqual(factoryBefore);
  if (!result.ok) {
    expect(result).not.toHaveProperty('value');
    expect(result.errors.length).toBeGreaterThan(0);
    for (const issue of result.errors) {
      expect(issue.severity).toBe('error');
      expect(issue.code.trim().length).toBeGreaterThan(0);
      expect(issue.message.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(issue.refs)).toBe(true);
    }
  } else {
    const next = result.value;
    finiteTree(next);
    uniqueSchedule(next);
    expect(next.orders).toEqual(plan.orders);
    expect(next.requests).toEqual(plan.requests);
    expect(next.mode).toBe(plan.mode);
    expect(
      next.campaigns.every((campaign) => Number.isFinite(campaign.quota) && campaign.quota > 0),
    ).toBe(true);
    expect(
      next.campaigns.some(
        (campaign) =>
          campaign.machineId === 'GRIND-1' &&
          campaign.product === 'A' &&
          campaign.start < 270 &&
          campaign.until > 120,
      ),
    ).toBe(false);
    const after = unwrap(evaluate({ plan: deepFreeze(next), events }));
    finiteTree(after);
    checkLedger(after, next, events);
    sameExecution(before, plan, after, next, 120);
    near(quantity(after, 'GRIND-1', 120, 270), 0);
    near(quantity(after, 'GRIND-3', 120, 270), quantity(before, 'GRIND-3', 120, 270));
    expect({ plan, events }).toEqual(inputBefore);
  }
}, 60_000);
