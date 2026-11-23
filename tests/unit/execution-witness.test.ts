import { expect, test } from 'vitest';
import type { Report } from '../../src/domain/engine';
import { emptyPlan } from '../support/fixture';
import { finiteTree, nearTree, sameExecution } from '../support/execution';

// Isolated witness-checker data, not an evaluator mock or a fabricated workflow agreement.
function evidence(cuts: number[]): Report {
  const spans = cuts.slice(0, -1).map((start, i) => ({ start, end: cuts[i + 1]! }));
  return {
    planId: 'witness-only',
    feasible: false,
    issues: [],
    jobs: [],
    quotas: [],
    orders: [],
    shifts: [],
    machineIntervals: spans.map(({ start, end }) => ({
      machineId: 'PRESS-1',
      campaignId: 'permission',
      product: 'A',
      kind: 'produce',
      start,
      end,
      rate: 0.765,
      quantity: 0.765 * (end - start),
      jobIds: [],
      setupId: null,
    })),
    stockIntervals: spans.map(({ start, end }) => ({
      product: 'A',
      before: 'THERMAL',
      start,
      end,
      opening: 0.765 * start,
      inflowRate: 0.765,
      consumedRate: 0,
      closing: 0.765 * end,
    })),
    staffIntervals: spans.map(({ start, end }) => ({
      start,
      end,
      normal: 1,
      setup: 0,
      validation: 0,
      total: 1,
      available: 2,
      tasks: [{ taskId: 'run:PRESS', required: 1, workerIds: ['S1-1'] }],
    })),
  };
}

test('full precision witness comparisons normalize EPS residuals, not real differences', () => {
  expect(() => nearTree({ q: [0.123456789] }, { q: [0.123457089] })).not.toThrow();
  expect(() => nearTree({ q: [0.123456789] }, { q: [0.123459789] })).toThrow();
  expect(() => finiteTree({ nested: [0, Infinity] })).toThrow();
  expect(() => finiteTree({ nested: [0, NaN] })).toThrow();
});
test('execution witness accepts equivalent fractional partitions at the cut', () => {
  expect(() =>
    sameExecution(evidence([0, 2]), emptyPlan(), evidence([0, 0.375, 1.125, 2]), emptyPlan(), 2),
  ).not.toThrow();
});
test.each(['stock', 'rate', 'operator', 'availability'])(
  'execution witness rejects changed %s',
  (kind) => {
    const left = evidence([0, 2]);
    const right = evidence([0, 0.375, 1.125, 2]);
    if (kind === 'stock') right.stockIntervals[1]!.opening++;
    if (kind === 'rate') right.machineIntervals[1]!.rate = 0.7;
    if (kind === 'operator') right.staffIntervals[1]!.tasks[0]!.workerIds = ['S1-2'];
    if (kind === 'availability') right.staffIntervals[1]!.available--;
    expect(() => sameExecution(left, emptyPlan(), right, emptyPlan(), 2)).toThrow();
  },
);
