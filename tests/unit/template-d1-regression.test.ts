import { expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Report } from '../../src/domain/engine';
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
import type { Event, Plan } from '../../src/domain/model';
import { applyTemplate, createScenarioPlan } from '../../src/domain/scenario';
import { deepFreeze, emptyPlan, feasiblePlan, roster, run, unwrap } from '../support/fixture';
import { finiteTree } from '../support/execution';
import { checkLedger } from '../support/ledger';

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
function actualTarget(report: Report, product: 'A' | 'B'): void {
  const rows = report.machineIntervals.filter(
    (row) =>
      row.machineId === 'GRIND-1' &&
      row.product === product &&
      row.kind === 'produce' &&
      row.rate > 0,
  );
  expect(rows.some((row) => row.start < 120 && row.end >= 120)).toBe(true);
  expect(rows.some((row) => row.start <= 120 && row.end > 120)).toBe(true);
}
type Template = Parameters<typeof applyTemplate>[2];
function refuses(plan: Plan, template: Template): void {
  const events: Event[] = [];
  if (!template.startsWith('VAL2_')) events.push({ kind: 'failure', machineId: 'GRIND-1' });
  if (template === 'NIGHT_WRAP_STAGGERED') events.push({ kind: 'absence' });
  const before = structuredClone({ plan, events });
  const sourceBefore = structuredClone(sources());
  const physical = unwrap(evaluate(deepFreeze({ plan, events })));
  finiteTree(physical);
  checkLedger(physical, plan, events);
  // Generic physical target validity does not imply D1 template eligibility or feasibility.
  expect(
    physical.issues.some(
      (issue) =>
        issue.severity === 'error' &&
        ['INVALID_INPUT', 'EVENT_TARGET', 'EVENT_ORDER'].includes(issue.code),
    ),
  ).toBe(false);
  const result = applyTemplate(plan, events, template);
  expect({ plan, events }).toEqual(before);
  expect(sources()).toEqual(sourceBefore);
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Independent template API bypassed a D1 prerequisite');
  expect(result.errors.length).toBeGreaterThan(0);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}

test.each(['REPAIR_G1_TO_G3', 'NIGHT_WRAP_STAGGERED'] as const)(
  '%s rejects physically supported GRIND-1/B at 120 rather than treating it as A',
  (template) => {
    const plan = emptyPlan();
    plan.setups = [
      { id: 'external-g1-ab', machineId: 'GRIND-1', from: 'A', to: 'B', start: 0, end: 20 },
    ];
    run(plan, 'REWIND-2', 'B', 0, 60, 100);
    run(plan, 'GRIND-1', 'B', 20, 300, 100);
    plan.assignments = roster([
      { taskId: 'setup:external-g1-ab', start: 0, end: 20, count: 1 },
      { taskId: 'run:REWIND', start: 0, end: 100 / 2.125, count: 1 },
      { taskId: 'run:GRIND', start: 20, end: 20 + 100 / 0.68, count: 1 },
    ]);
    const baseline = unwrap(evaluate({ plan: deepFreeze(plan), events: [] }));
    checkLedger(baseline, plan);
    actualTarget(baseline, 'B');
    refuses(plan, template);
  },
);

test.each(['REPAIR_G1_TO_G3', 'NIGHT_WRAP_STAGGERED'] as const)(
  '%s rejects GRIND-1/A when a validation job intersects its repair interval',
  (template) => {
    const plan = createScenarioPlan();
    const validation = plan.jobs.find((job) => job.code === 'VAL-2' && job.machineId === 'GRIND-4');
    expect(validation).toBeDefined();
    if (!validation) throw new Error('Factory lacks its public GRIND-4 VAL-2 job');
    Object.assign(validation, { machineId: 'GRIND-1', start: 90, end: 270 });
    const baseline = unwrap(evaluate({ plan: deepFreeze(plan), events: [] }));
    checkLedger(baseline, plan);
    actualTarget(baseline, 'A');
    expect(
      plan.jobs.some(
        (job) =>
          job.machineId === 'GRIND-1' &&
          job.code.startsWith('VAL-') &&
          job.start < 270 &&
          job.end > 120,
      ),
    ).toBe(true);
    refuses(plan, template);
  },
  60_000,
);

function baselinePlacement(plan: Plan, template: 'VAL2_STAGGERED' | 'VAL2_PARALLEL'): void {
  const jobs = plan.jobs
    .filter((job) => job.code === 'VAL-2' && ['GRIND-4', 'GRIND-5'].includes(job.machineId))
    .sort((a, b) => a.machineId.localeCompare(b.machineId));
  expect(jobs.map((job) => [job.machineId, job.start, job.end])).toEqual(
    template === 'VAL2_PARALLEL'
      ? [
          ['GRIND-4', 240, 420],
          ['GRIND-5', 240, 420],
        ]
      : [
          ['GRIND-4', 0, 180],
          ['GRIND-5', 240, 420],
        ],
  );
  for (const job of jobs) {
    expect(
      plan.campaigns.some(
        (campaign) =>
          campaign.machineId === job.machineId &&
          campaign.product === 'B' &&
          campaign.start <= job.start &&
          campaign.until >= job.end,
      ),
    ).toBe(true);
  }
}

test.each(['VAL2_STAGGERED', 'VAL2_PARALLEL'] as const)(
  '%s rejects actual GRIND-1/B despite having its expected GRIND-4/5 work',
  (template) => {
    const plan = feasiblePlan(template === 'VAL2_PARALLEL');
    plan.campaigns = plan.campaigns.filter((campaign) => campaign.machineId !== 'GRIND-1');
    plan.setups.push({
      id: 'baseline-g1-ab',
      machineId: 'GRIND-1',
      from: 'A',
      to: 'B',
      start: 0,
      end: 20,
    });
    // 80 / .68 > 100 minutes: B is still actually producing at 120, without exhausting
    // the shared B feed needed by the two original named validations.
    run(plan, 'GRIND-1', 'B', 20, 280, 80);
    plan.assignments.push({
      taskId: 'setup:baseline-g1-ab',
      start: 0,
      end: 20,
      workerIds: ['S1-40'],
    });
    baselinePlacement(plan, template);
    const baseline = unwrap(evaluate({ plan: deepFreeze(plan), events: [] }));
    finiteTree(baseline);
    checkLedger(baseline, plan);
    actualTarget(baseline, 'B');
    refuses(plan, template);
  },
  60_000,
);

test.each(['VAL2_STAGGERED', 'VAL2_PARALLEL'] as const)(
  '%s rejects overlapping GRIND-1 validation while retaining its expected GRIND-4/5 work',
  (template) => {
    const plan = feasiblePlan(template === 'VAL2_PARALLEL');
    const id = 'baseline-g1-validation';
    plan.jobs.push({ id, code: 'VAL-2', machineId: 'GRIND-1', start: 90, end: 270 });
    plan.assignments.push({ taskId: `validate:${id}`, start: 90, end: 270, workerIds: ['S1-40'] });
    baselinePlacement(plan, template);
    const baseline = unwrap(evaluate({ plan: deepFreeze(plan), events: [] }));
    finiteTree(baseline);
    checkLedger(baseline, plan);
    actualTarget(baseline, 'A');
    expect(plan.jobs.find((job) => job.id === id)).toMatchObject({
      machineId: 'GRIND-1',
      start: 90,
      end: 270,
    });
    refuses(plan, template);
  },
  60_000,
);
