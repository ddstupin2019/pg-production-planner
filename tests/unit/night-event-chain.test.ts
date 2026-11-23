import { expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import {
  EPSILON,
  INITIAL_STOCKS,
  MACHINES,
  NOMINAL_RATES,
  REQUIRED_ORDERS,
  REQUIRED_WORK,
  ROUTES,
  SETUP_MINUTES,
} from '../../src/domain/model';
import type { Event } from '../../src/domain/model';
import { applyTemplate, createScenarioPlan } from '../../src/domain/scenario';
import { deepFreeze, unwrap } from '../support/fixture';
import { finiteTree } from '../support/execution';
import { checkLedger, near, quantity } from '../support/ledger';

const sources = () => ({
  EPSILON,
  INITIAL_STOCKS,
  MACHINES,
  NOMINAL_RATES,
  REQUIRED_ORDERS,
  REQUIRED_WORK,
  ROUTES,
  SETUP_MINUTES,
});

test('night template rejects a physically legal operating GRIND-2 failure followed by absence', () => {
  const sourceBefore = structuredClone(sources());
  const plan = createScenarioPlan();
  const events: Event[] = [{ kind: 'failure', machineId: 'GRIND-2' }, { kind: 'absence' }];
  const input = { plan, events };
  const before = structuredClone(input);
  deepFreeze(input);

  const baseline = unwrap(evaluate({ plan, events: [] }));
  finiteTree(baseline);
  checkLedger(baseline, plan);
  const producing = baseline.machineIntervals.filter(
    (row) => row.machineId === 'GRIND-2' && row.kind === 'produce' && row.rate > 0,
  );
  // Permit equivalent interval splits at 120 while requiring actual production on both sides.
  expect(producing.some((row) => row.start < 120 && row.end >= 120)).toBe(true);
  expect(producing.some((row) => row.start <= 120 && row.end > 120)).toBe(true);

  // The physical evaluator supports this target/sequence even though the bounded template does not.
  const physical = unwrap(evaluate(input));
  finiteTree(physical);
  checkLedger(physical, plan, events);
  expect(
    physical.issues.some(
      (issue) =>
        issue.severity === 'error' &&
        ['INVALID_INPUT', 'SOURCE_CHANGED', 'EVENT_TARGET', 'EVENT_ORDER'].includes(issue.code),
    ),
  ).toBe(false);
  const repair = physical.machineIntervals.filter(
    (row) => row.machineId === 'GRIND-2' && row.kind === 'repair',
  );
  expect(repair.length).toBeGreaterThan(0);
  near(
    repair.reduce((minutes, row) => minutes + row.end - row.start, 0),
    150,
  );
  expect(repair.every((row) => row.start >= 120 && row.end <= 270)).toBe(true);
  near(quantity(physical, 'GRIND-2', 120, 270), 0);
  expect(input).toEqual(before);
  expect(sources()).toEqual(sourceBefore);

  const result = applyTemplate(plan, events, 'NIGHT_WRAP_STAGGERED');
  expect(input).toEqual(before);
  expect(sources()).toEqual(sourceBefore);
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Night template accepted a non-GRIND-1 two-stage lineage');
  expect(result.errors.length).toBeGreaterThan(0);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}, 60_000);
