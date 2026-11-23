import { evaluate, prepareEvaluation } from './engine';
import type { Report } from './engine';
import { EPSILON, MACHINES, REQUIRED_ORDERS } from './model';
import type { Event, JobCode, Operation, Plan, Product, Result } from './model';
import { issue, validateEvents } from './validation';
import { preservesPrefix } from './prefix';

export type Template =
  'VAL2_STAGGERED' | 'VAL2_PARALLEL' | 'REPAIR_G1_TO_G3' | 'NIGHT_WRAP_STAGGERED';

/** Identity allocation is derived from actual machine/material tasks, not the expert headcounts. */
function staff(plan: Plan, projection: Report, cut = 0): Plan {
  const next = structuredClone(plan);
  next.assignments = next.assignments
    .filter((row) => row.start < cut)
    .map((row) => ({ ...row, end: Math.min(row.end, cut) }));
  for (const row of projection.staffIntervals) {
    if (row.end <= cut) continue;
    let number = 1;
    const shift = Math.floor(row.start / 630) + 1;
    for (const task of row.tasks) {
      next.assignments.push({
        taskId: task.taskId,
        start: Math.max(row.start, cut),
        end: row.end,
        workerIds: Array.from(
          { length: task.required },
          () => `S${String(shift)}-${String(number++)}`,
        ),
      });
    }
  }
  return next;
}

function checked(plan: Plan, events: Event[]): Result<Plan> {
  const report = evaluate({ plan, events });
  if (!report.ok) return report;
  return report.value.feasible
    ? { ok: true, value: plan }
    : {
        ok: false,
        errors: report.value.issues.filter((row) => row.severity === 'error'),
      };
}

function proposal(): Plan {
  const plan: Plan = {
    id: 'scenario-staggered',
    mode: 'required',
    orders: REQUIRED_ORDERS.map((row) => ({ ...row })),
    campaigns: [],
    setups: [],
    jobs: [],
    assignments: [],
    requests: null,
    forecasts: [0, 0],
    reserveReasons: [
      'Резерв для параллельной валидации и переноса работы GRIND-1.',
      'Резерв и перераспределение после отсутствия двух работников.',
    ],
  };
  function run(
    machineId: string,
    product: Product,
    start: number,
    until: number,
    quota: number,
  ): void {
    plan.campaigns.push({
      id: `c-${machineId}-${String(start)}`,
      machineId,
      product,
      start,
      until,
      quota,
    });
  }
  function setup(machineId: string, from: Product, to: Product, start: number, end: number): void {
    plan.setups.push({ id: `s-${machineId}-${String(start)}`, machineId, from, to, start, end });
  }
  function group(
    operation: Operation,
    ids: number[],
    product: Product,
    start: number,
    until: number,
    total: number,
  ): void {
    for (const id of ids)
      run(
        `${operation}-${String(id)}`,
        product,
        start,
        until,
        operation === 'PRESS' ? total / ids.length : total,
      );
  }
  function job(code: JobCode, machineId: string, start: number, end: number): void {
    plan.jobs.push({ id: `j-${code}-${machineId}`, code, machineId, start, end });
  }
  group('PRESS', [1, 2], 'A', 0, 2520, 2150);
  run('PRESS-4', 'B', 0, 2520, 1650);
  setup('PRESS-5', 'B', 'C', 0, 25);
  run('PRESS-5', 'C', 25, 2520, 1050);
  setup('PRESS-3', 'A', 'C', 180, 210);
  run('PRESS-3', 'C', 210, 2520, 900);
  run('THERMAL-1', 'A', 0, 1800, 2150);
  setup('THERMAL-2', 'A', 'C', 0, 30);
  run('THERMAL-2', 'C', 30, 2520, 1950);
  run('THERMAL-3', 'B', 0, 2520, 1650);
  run('PRINT-1', 'A', 0, 2520, 1906.9);
  run('PRINT-2', 'B', 0, 1000, 765);
  setup('PRINT-2', 'B', 'A', 1000, 1020);
  run('PRINT-2', 'A', 1020, 1240, 243.1);
  setup('PRINT-2', 'A', 'B', 1240, 1260);
  run('PRINT-2', 'B', 1260, 2520, 885);
  run('LASER-1', 'C', 220, 2520, 1950);
  run('REWIND-1', 'A', 0, 630, 850);
  setup('REWIND-1', 'A', 'C', 630, 660);
  run('REWIND-1', 'C', 660, 1135, 1000);
  setup('REWIND-1', 'C', 'B', 1135, 1160);
  run('REWIND-1', 'B', 1160, 2520, 1000);
  run('REWIND-2', 'B', 0, 850, 750);
  setup('REWIND-2', 'B', 'A', 850, 870);
  run('REWIND-2', 'A', 870, 1770, 1500);
  setup('REWIND-2', 'A', 'C', 1770, 1800);
  run('REWIND-2', 'C', 1800, 2520, 1100);
  group('GRIND', [1, 2], 'A', 0, 630, 850);
  for (const id of [1, 2, 3]) setup(`GRIND-${String(id)}`, 'A', 'C', 630, 660);
  group('GRIND', [1, 2, 3], 'C', 660, 1151, 1000);
  for (const id of [1, 2]) {
    setup(`GRIND-${String(id)}`, 'C', 'A', 1151, 1181);
    run(`GRIND-${String(id)}`, 'A', 1181, 1770, 396.4);
    setup(`GRIND-${String(id)}`, 'A', 'C', 1770, 1800);
  }
  group('GRIND', [1, 2, 3], 'C', 1800, 2520, 1100);
  run('GRIND-4', 'B', 0, 850, 750);
  run('GRIND-5', 'B', 240, 850, 750);
  for (const id of [4, 5]) {
    setup(`GRIND-${String(id)}`, 'B', 'A', 850, 870);
    run(`GRIND-${String(id)}`, 'A', 870, 1390, 1500);
    setup(`GRIND-${String(id)}`, 'A', 'B', 1390, 1410);
    run(`GRIND-${String(id)}`, 'B', 1410, 2160, 1000);
  }
  const z: [Product, number, number, number][] = [
    ['A', 0, 180, 100],
    ['A', 180, 630, 1000],
    ['B', 650, 890, 900],
    ['C', 915, 1220, 1000],
    ['A', 1260, 1800, 1500],
    ['B', 1820, 2160, 1000],
    ['C', 2185, 2520, 1100],
  ];
  for (const [product, start, end, total] of z) {
    run('WASH-1', product, start, end, total);
    run('LUBE-1', product, start, end, total);
    group('TEF', start < 630 ? [1] : [1, 2], product, start, end, total);
    if (product !== 'B') group('CHROME', [1, 2], product, start, end, total);
  }
  const zSetups: [Product, Product, number, number][] = [
    ['A', 'B', 630, 650],
    ['B', 'C', 890, 915],
    ['C', 'A', 1220, 1250],
    ['A', 'B', 1800, 1820],
    ['B', 'C', 2160, 2185],
  ];
  for (const machine of ['WASH-1', 'TEF-1', 'TEF-2', 'LUBE-1']) {
    for (const [from, to, start, end] of zSetups) setup(machine, from, to, start, end);
  }
  for (const machine of ['CHROME-1', 'CHROME-2']) {
    setup(machine, 'A', 'C', 870, 900);
    setup(machine, 'C', 'A', 1220, 1250);
    setup(machine, 'A', 'C', 1830, 1860);
  }
  group(
    'WRAP',
    Array.from({ length: 10 }, (_, i) => i + 1),
    'A',
    0,
    630,
    1400,
  );
  group('WRAP', [11, 12, 13, 14, 15], 'B', 0, 630, 100);
  group('PACK', [1, 2], 'A', 0, 630, 1400);
  run('PACK-3', 'B', 0, 630, 100);
  const w: [Product, number, number, number][] = [
    ['B', 650, 915, 900],
    ['C', 940, 1260, 1000],
    ['A', 1290, 1820, 1500],
    ['B', 1840, 2165, 1000],
    ['C', 2190, 2520, 1100],
  ];
  for (const [product, start, end, total] of w) {
    group(
      'WRAP',
      Array.from({ length: 15 }, (_, i) => i + 1),
      product,
      start,
      end,
      total,
    );
    group('PACK', [1, 2, 3], product, start, end, total);
  }
  for (const machine of MACHINES.filter(
    (row) => (row.operation === 'WRAP' && row.id !== 'WRAP-16') || row.operation === 'PACK',
  )) {
    if (machine.initialProduct === 'A') setup(machine.id, 'A', 'B', 630, 650);
    setup(machine.id, 'B', 'C', 915, 940);
    setup(machine.id, 'C', 'A', 1260, 1290);
    setup(machine.id, 'A', 'B', 1820, 1840);
    setup(machine.id, 'B', 'C', 2165, 2190);
  }
  job('TO-1', 'PRESS-3', 0, 180);
  job('TO-2', 'GRIND-5', 0, 240);
  job('TO-3', 'THERMAL-1', 1800, 1980);
  job('TO-4', 'CHROME-2', 630, 870);
  job('TO-5', 'PACK-3', 1440, 1620);
  job('VAL-1', 'TEF-1', 180, 420);
  job('VAL-2', 'GRIND-4', 0, 180);
  job('VAL-2', 'GRIND-5', 240, 420);
  job('VAL-3', 'LASER-1', 1260, 1500);
  for (const id of [1, 2, 3]) job('VAL-4', `WRAP-${String(id)}`, 1290, 1470);
  return plan;
}

/** Fresh required-mode candidate with fixed source data, derived quotas and checked identities. */
export function createScenarioPlan(): Plan {
  const plan = proposal();
  const allocation = evaluate({ plan, events: [] });
  if (!allocation.ok) throw new Error('Invalid scenario allocation');
  // Material-limited group proposals become explicit numeric-scarcity machine quotas.
  // This records the replay's allocation, not an assumed equal share that strands late feed.
  plan.campaigns = plan.campaigns.flatMap((campaign) => {
    const produced = allocation.value.quotas.find(
      (row) => row.campaignId === campaign.id,
    )!.produced;
    return produced > EPSILON ? [{ ...campaign, quota: produced }] : [];
  });
  const projected = evaluate({ plan, events: [] });
  if (!projected.ok) throw new Error('Invalid scenario proposal');
  const peaks = projected.value.shifts.map((row) => row.peak);
  // Both VAL-2 choices fit this actual S1 peak. S2 is the separate setup peak.
  plan.requests = [peaks[0]!, peaks[1]!];
  plan.forecasts = [peaks[2]!, peaks[3]!];
  const assigned = staff(plan, projected.value);
  const verified = checked(assigned, []);
  if (!verified.ok)
    throw new Error(
      `Scenario physical errors: ${verified.errors.map((row) => `${row.code}:${row.refs.join(',')}`).join('; ')}`,
    );
  return verified.value;
}

/**
 * Phase-guarded edits: reapplication preserves the physical schedule, not the plan ID.
 * Custom demand is reevaluated; fixed source data and the executed event prefix are retained.
 */
export function applyTemplate(plan: Plan, events: Event[], template: Template): Result<Plan> {
  const valid = prepareEvaluation({ plan, events: [] });
  const validEvents = validateEvents(events);
  if (!valid.ok) return valid;
  if (!validEvents.ok) return validEvents;
  const next = valid.value.plan;
  const cut = events.length === 2 ? 630 : events.length ? 120 : 0;
  if (template === 'VAL2_STAGGERED' || template === 'VAL2_PARALLEL') {
    if (events.length)
      return {
        ok: false,
        errors: [issue('WORKFLOW_GUARD', 'Validation choice is a baseline decision')],
      };
    for (const job of next.jobs.filter((row) => row.code === 'VAL-2')) {
      if (job.machineId !== 'GRIND-4' && job.machineId !== 'GRIND-5')
        return { ok: false, errors: [issue('WORKFLOW_GUARD', 'Restore supported VAL-2 machines')] };
      job.start = job.machineId === 'GRIND-4' && template === 'VAL2_STAGGERED' ? 0 : 240;
      job.end = job.start + 180;
    }
  } else if (template === 'REPAIR_G1_TO_G3') {
    if (events[0]?.kind !== 'failure' || events[0].machineId !== 'GRIND-1' || events.length !== 1)
      return {
        ok: false,
        errors: [issue('WORKFLOW_GUARD', 'Transfer requires prescribed GRIND-1 failure')],
      };
    if (!next.campaigns.some((row) => row.id === 'repair-transfer-GRIND-3')) {
      const affected = valid.value.report.machineIntervals.filter(
        (row) =>
          row.machineId === 'GRIND-1' &&
          row.product === 'A' &&
          row.kind === 'produce' &&
          row.start < 270 &&
          row.end > 120,
      );
      const quantity = affected.reduce(
        (sum, row) => sum + row.rate * (Math.min(row.end, 270) - Math.max(row.start, 120)),
        0,
      );
      const campaign = next.campaigns.find((row) => row.id === affected[0]?.campaignId);
      if (!campaign || quantity <= EPSILON)
        return { ok: false, errors: [issue('EVENT_TARGET', 'No transferable A production')] };
      campaign.quota -= quantity;
      next.campaigns.push({
        id: 'repair-transfer-GRIND-3',
        machineId: 'GRIND-3',
        product: 'A',
        start: 120,
        until: 270,
        quota: quantity,
      });
    }
  } else if (template === 'NIGHT_WRAP_STAGGERED') {
    if (events.length !== 2)
      return {
        ok: false,
        errors: [issue('WORKFLOW_GUARD', 'Night staggering requires sequential absence')],
      };
    for (const id of [14, 15]) {
      const setup = next.setups.find(
        (row) =>
          row.machineId === `WRAP-${String(id)}` &&
          row.start === 915 &&
          row.from === 'B' &&
          row.to === 'C',
      );
      const campaign = next.campaigns.find(
        (row) => row.machineId === `WRAP-${String(id)}` && row.product === 'C' && row.start === 940,
      );
      if (setup && campaign) {
        setup.start = 940;
        setup.end = 965;
        campaign.start = 965;
      }
    }
  } else return { ok: false, errors: [issue('INVALID_INPUT', 'Unknown template')] };
  next.id = `${plan.id}:${template}`;
  const projection = evaluate({ plan: next, events });
  if (!projection.ok) return projection;
  const assigned = staff(next, projection.value, cut);
  if (cut && !preservesPrefix(plan, assigned, events, cut))
    return {
      ok: false,
      errors: [issue('WORKFLOW_GUARD', 'Template would rewrite executed evidence')],
    };
  return checked(assigned, events);
}

/** Public summary consumers can use Report directly; this alias carries no hidden evidence. */
export type ScenarioReport = Report;
