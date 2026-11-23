import type {
  Event,
  Four,
  Issue,
  JobCode,
  Operation,
  Plan,
  Product,
  Result,
  Shift,
  Triple,
} from './model';
import {
  EPSILON,
  INITIAL_STOCKS,
  MACHINES,
  NOMINAL_RATES,
  REQUIRED_WORK,
  ROUTES,
  SETUP_MINUTES,
} from './model';
import { issue, record, validateEvents, validatePlan } from './validation';

export interface EvaluationInput {
  plan: Plan;
  events: Event[];
}
export interface MachineInterval {
  machineId: string;
  campaignId: string | null;
  start: number;
  end: number;
  product: Product;
  kind: 'produce' | 'setup' | 'maintenance' | 'repair' | 'idle';
  rate: number;
  quantity: number;
  jobIds: string[];
  setupId: string | null;
}
export interface StockInterval {
  product: Product;
  before: Operation;
  start: number;
  end: number;
  opening: number;
  inflowRate: number;
  consumedRate: number;
  closing: number;
}
export interface StaffInterval {
  start: number;
  end: number;
  normal: number;
  setup: number;
  validation: number;
  total: number;
  available: number;
  tasks: { taskId: string; required: number; workerIds: string[] }[];
}
export interface OrderResult {
  orderId: string;
  completedAt: number | null;
  allocatedByShift: Four;
  atOriginalDue: number;
  originalDeficit: number;
  atPromiseDue: number | null;
  promiseDeficit: number | null;
}
export interface JobResult {
  jobId: string;
  code: JobCode;
  machineId: string;
  creditedMinutes: number;
  complete: boolean;
  issues: string[];
}
export interface ShiftResult {
  shift: Shift;
  packed: Triple;
  fulfilled: number;
  dueDeficit: number;
  stocks: { product: Product; before: Operation; quantity: number }[];
  finishedUnallocated: Triple;
  requested: number | null;
  available: number;
  peak: number;
  peakSpans: { start: number; end: number }[];
  laborMinutes: number;
  reserveMinutes: number;
}
export interface Report {
  planId: string;
  feasible: boolean;
  issues: Issue[];
  machineIntervals: MachineInterval[];
  stockIntervals: StockInterval[];
  staffIntervals: StaffInterval[];
  shifts: ShiftResult[];
  orders: OrderResult[];
  jobs: JobResult[];
  quotas: { campaignId: string; produced: number; remaining: number }[];
}
export interface Comparison {
  left: Report;
  right: Report;
  delta: { packed: Triple; originalDeficit: number; peak: Four; laborMinutes: number };
}

const PRODUCTS: Product[] = ['A', 'B', 'C'];
const OPERATIONS = Object.keys(NOMINAL_RATES) as Operation[];
const zero = (): Triple => ({ A: 0, B: 0, C: 0 });
const clean = (value: number): number => (Math.abs(value) <= EPSILON ? 0 : value);
const active = (row: { start: number; end: number }, time: number): boolean =>
  row.start <= time && row.end > time;
const overlap = (a: { start: number; end: number }, b: { start: number; end: number }): boolean =>
  Math.min(a.end, b.end) - Math.max(a.start, b.start) > EPSILON;

function norm(operation: Operation, machines: number): number {
  if (!machines) return 0;
  if (operation === 'PRESS') return 1;
  if (operation === 'PRINT' || operation === 'CHROME') return Math.ceil(machines / 2);
  if (operation === 'WRAP') return Math.ceil(machines / 3);
  return machines * (operation === 'TEF' || operation === 'PACK' ? 2 : 1);
}

function orderedOrders(plan: Plan) {
  const priority = { high: 0, medium: 1, low: 2 };
  return [...plan.orders].sort(
    (a, b) =>
      a.originalDue - b.originalDue ||
      priority[a.priority] - priority[b.priority] ||
      lexical(a.id, b.id),
  );
}

function lexical(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Draft availability is inferred from identities, never from a staffing wish or a peak. */
function availability(plan: Plan, events: Event[]): Four {
  const draft: [number, number] = [0, 0];
  for (const assignment of plan.assignments) {
    for (const id of assignment.workerIds) {
      const match = /^S([12])-([1-9]\d*)$/.exec(id);
      if (match && Number.isSafeInteger(Number(match[2]))) {
        const index = Number(match[1]) - 1;
        draft[index as 0 | 1] = Math.max(draft[index as 0 | 1], Number(match[2]));
      }
    }
  }
  const counts = plan.requests ?? draft;
  return [counts[0], Math.max(0, counts[1] - (events.length === 2 ? 2 : 0)), ...plan.forecasts];
}

function replay(plan: Plan, events: Event[]): Report {
  const issues: Issue[] = [];
  // Deduplicate repeated interval diagnostics, but retain each distinct evidence interval.
  const keys = new Set<string>();
  function add(value: Issue): void {
    const key = JSON.stringify(value);
    if (!keys.has(key)) {
      keys.add(key);
      issues.push(value);
    }
  }
  const counts = availability(plan, events);
  const failure = events[0];
  const repair = { start: 120, end: 270 };
  const jobResults: JobResult[] = plan.jobs.map((job) => ({
    jobId: job.id,
    code: job.code,
    machineId: job.machineId,
    creditedMinutes: 0,
    complete: false,
    issues: [],
  }));
  function jobIssue(jobId: string, code: string, message: string): void {
    const job = plan.jobs.find((row) => row.id === jobId)!;
    const result = jobResults.find((row) => row.jobId === jobId)!;
    if (!result.issues.includes(code)) result.issues.push(code);
    add(issue(code, message, [job.id, job.machineId], job.start, job.end));
  }
  const validSetups = new Set<string>();
  for (const machine of MACHINES) {
    let configured = machine.initialProduct;
    let lastEnd = 0;
    for (const setup of plan.setups
      .filter((row) => row.machineId === machine.id)
      .sort((a, b) => a.start - b.start || lexical(a.id, b.id))) {
      let valid = true;
      if (
        setup.from !== configured ||
        setup.from === setup.to ||
        !ROUTES[setup.to].includes(machine.operation) ||
        Math.abs(setup.end - setup.start - SETUP_MINUTES[setup.from][setup.to]) > EPSILON
      ) {
        add(
          issue(
            'SETUP_REQUIRED',
            'Setup must match configuration and matrix duration',
            [setup.id, machine.id],
            setup.start,
            setup.end,
          ),
        );
        valid = false;
      }
      if (
        setup.start < lastEnd - EPSILON ||
        plan.setups.some(
          (other) =>
            other.id !== setup.id && other.machineId === machine.id && overlap(setup, other),
        ) ||
        plan.jobs.some((job) => job.machineId === machine.id && overlap(setup, job)) ||
        (failure?.kind === 'failure' && failure.machineId === machine.id && overlap(setup, repair))
      ) {
        add(
          issue(
            'MACHINE_CONFLICT',
            'Setup overlaps another setup, work or repair',
            [setup.id, machine.id],
            setup.start,
            setup.end,
          ),
        );
        valid = false;
      }
      if (valid) {
        validSetups.add(setup.id);
        configured = setup.to;
      }
      lastEnd = Math.max(lastEnd, setup.end);
    }
  }
  for (const work of REQUIRED_WORK) {
    const jobs = plan.jobs.filter((job) => job.code === work.code);
    if (new Set(jobs.map((job) => job.machineId)).size < work.count) {
      add(issue('WORK_MISSING', 'Required distinct machines are missing', [work.code]));
    }
  }
  for (const campaign of plan.campaigns) {
    const machine = MACHINES.find((row) => row.id === campaign.machineId)!;
    if (!ROUTES[campaign.product].includes(machine.operation)) {
      add(
        issue(
          'MACHINE_CONFLICT',
          'Operation is not on the product route',
          [campaign.id, machine.id],
          campaign.start,
          campaign.until,
        ),
      );
    }
  }
  for (const job of plan.jobs) {
    const work = REQUIRED_WORK.find((row) => row.code === job.code)!;
    const machine = MACHINES.find((row) => row.id === job.machineId)!;
    if (machine.operation !== work.operation)
      jobIssue(job.id, 'MACHINE_CONFLICT', 'Wrong operation for required work');
    if (
      job.start < (work.firstShift - 1) * 630 - EPSILON ||
      job.end > work.lastShift * 630 + EPSILON
    ) {
      jobIssue(job.id, 'WORK_WINDOW', 'Work must finish inside its allowed window');
    }
    if (Math.abs(job.end - job.start - work.minutes) > EPSILON)
      jobIssue(job.id, 'WORK_DURATION', 'Wrong required work duration');
    if (
      plan.setups.some((setup) => setup.machineId === job.machineId && overlap(job, setup)) ||
      plan.jobs.some(
        (other) => other.id !== job.id && other.machineId === job.machineId && overlap(job, other),
      )
    ) {
      jobIssue(job.id, 'MACHINE_CONFLICT', 'Work overlaps another job or setup');
    }
  }
  const boundaries = new Set([0, 630, 1260, 1890, 2520]);
  for (const row of plan.campaigns) {
    boundaries.add(row.start);
    boundaries.add(row.until);
  }
  for (const row of [...plan.setups, ...plan.jobs, ...plan.assignments]) {
    boundaries.add(row.start);
    boundaries.add(row.end);
  }
  if (failure) {
    boundaries.add(120);
    boundaries.add(270);
  }
  const edges = [...boundaries].sort((a, b) => a - b);
  const produced = Object.fromEntries(plan.campaigns.map((row) => [row.id, 0]));
  const queues = PRODUCTS.flatMap((product) =>
    ROUTES[product]
      .filter((op) => op !== 'PRESS')
      .map((before) => ({
        product,
        before,
        quantity:
          before === 'REWIND' || before === 'WASH' || before === 'WRAP'
            ? INITIAL_STOCKS[before][product]
            : 0,
      })),
  );
  const machineIntervals: MachineInterval[] = [];
  const stockIntervals: StockInterval[] = [];
  const staffIntervals: StaffInterval[] = [];
  const sourceOrders = orderedOrders(plan);
  const orders: OrderResult[] = sourceOrders.map((order) => ({
    orderId: order.id,
    completedAt: null,
    allocatedByShift: [0, 0, 0, 0],
    atOriginalDue: 0,
    originalDeficit: 0,
    atPromiseDue: order.promise ? 0 : null,
    promiseDeficit: order.promise ? 0 : null,
  }));
  const allocated = sourceOrders.map(() => 0);
  const finished = zero();
  const shifts: ShiftResult[] = ([1, 2, 3, 4] as const).map((shift, index) => ({
    shift,
    packed: zero(),
    fulfilled: 0,
    dueDeficit: 0,
    stocks: [],
    finishedUnallocated: zero(),
    requested: index < 2 && plan.requests ? plan.requests[index as 0 | 1] : null,
    available: counts[index]!,
    peak: 0,
    peakSpans: [],
    laborMinutes: 0,
    reserveMinutes: 0,
  }));

  let time = 0;
  let edgeIndex = 1;
  while (time < 2520) {
    while (edgeIndex < edges.length - 1 && edges[edgeIndex]! <= time) edgeIndex++;
    let end = edges[edgeIndex]!;
    const shiftIndex = Math.min(3, Math.floor(time / 630));
    const shift = shifts[shiftIndex]!;
    const rows: MachineInterval[] = MACHINES.map((machine) => {
      const completed = plan.setups
        .filter(
          (setup) =>
            setup.machineId === machine.id && validSetups.has(setup.id) && setup.end <= time,
        )
        .sort((a, b) => a.end - b.end);
      const product = completed.at(-1)?.to ?? machine.initialProduct;
      const setup = plan.setups.find((row) => row.machineId === machine.id && active(row, time));
      const jobs = plan.jobs.filter((row) => row.machineId === machine.id && active(row, time));
      const maintenance = jobs.some((job) => job.code.startsWith('TO-'));
      const broken =
        failure?.kind === 'failure' && failure.machineId === machine.id && active(repair, time);
      const campaign = plan.campaigns.find(
        (row) =>
          row.machineId === machine.id &&
          row.start <= time &&
          row.until > time &&
          row.quota - produced[row.id]! > EPSILON,
      );
      if (campaign && !setup && campaign.product !== product) {
        add(
          issue(
            'SETUP_REQUIRED',
            'Production product does not match configuration',
            [machine.id, campaign.id],
            time,
            end,
          ),
        );
      }
      const kind = broken ? 'repair' : maintenance ? 'maintenance' : setup ? 'setup' : 'idle';
      return {
        machineId: machine.id,
        campaignId: campaign?.id ?? null,
        start: time,
        end,
        product,
        kind,
        rate: 0,
        quantity: 0,
        jobIds: jobs.map((job) => job.id).sort(lexical),
        setupId: setup?.id ?? null,
      };
    });
    const queueRates = queues.map(() => ({ inflow: 0, consumed: 0 }));
    for (const product of PRODUCTS) {
      let inflow = 0;
      for (const operation of ROUTES[product]) {
        const queueIndex = queues.findIndex((q) => q.product === product && q.before === operation);
        const stock = queueIndex < 0 ? Infinity : queues[queueIndex]!.quantity;
        let supply = stock > EPSILON ? Infinity : inflow;
        let output = 0;
        // MACHINES is already in operation order, with numeric (not lexical) suffixes.
        for (const row of rows) {
          if (
            !row.machineId.startsWith(`${operation}-`) ||
            row.product !== product ||
            row.kind !== 'idle' ||
            !row.campaignId
          )
            continue;
          const campaign = plan.campaigns.find((item) => item.id === row.campaignId)!;
          if (campaign.product !== product) continue;
          row.rate = Math.min((NOMINAL_RATES[operation] * 0.85) / 1000, supply);
          if (row.rate > 0) {
            row.kind = 'produce';
            output += row.rate;
            supply -= row.rate;
            end = Math.min(end, time + (campaign.quota - produced[campaign.id]!) / row.rate);
          }
        }
        if (queueIndex >= 0) {
          queueRates[queueIndex] = { inflow, consumed: output };
          if (output > inflow && stock > EPSILON)
            end = Math.min(end, time + stock / (output - inflow));
        }
        inflow = output;
      }
    }
    const duration = end - time;
    if (!(duration > 0) || !Number.isFinite(duration)) throw new Error('Nonadvancing fluid replay');
    const tasks: StaffInterval['tasks'] = [];
    let normal = 0;
    let setupCount = 0;
    let validation = 0;
    for (const operation of OPERATIONS) {
      const required = norm(
        operation,
        rows.filter((row) => row.kind === 'produce' && row.machineId.startsWith(`${operation}-`))
          .length,
      );
      if (required) {
        tasks.push({ taskId: `run:${operation}`, required, workerIds: [] });
        normal += required;
      }
    }
    for (const setup of plan.setups.filter((row) => active(row, time))) {
      const operation = MACHINES.find((machine) => machine.id === setup.machineId)!.operation;
      const required = operation === 'TEF' || operation === 'PACK' ? 2 : 1;
      tasks.push({ taskId: `setup:${setup.id}`, required, workerIds: [] });
      setupCount += required;
    }
    for (const job of plan.jobs.filter((row) => row.code.startsWith('VAL-') && active(row, time))) {
      tasks.push({ taskId: `validate:${job.id}`, required: 1, workerIds: [] });
      validation++;
    }
    const occupied = new Set<string>();
    const invalidTasks = new Set<string>();
    const assignments = plan.assignments.filter((row) => active(row, time));
    for (const assignment of assignments) {
      const task = tasks.find((row) => row.taskId === assignment.taskId);
      if (!task)
        add(
          issue(
            'STAFF_ASSIGNMENT',
            'Assignment refers to an inactive or unknown task',
            [assignment.taskId],
            time,
            end,
          ),
        );
      const assignmentShift = Math.floor(assignment.start / 630) + 1;
      if (assignment.end > assignmentShift * 630 + EPSILON) {
        add(
          issue(
            'STAFF_ASSIGNMENT',
            'Assignment crosses shift boundary',
            [assignment.taskId],
            assignment.start,
            assignment.end,
          ),
        );
        invalidTasks.add(assignment.taskId);
      }
      for (const id of assignment.workerIds) {
        const match = /^S([1-4])-([1-9]\d*)$/.exec(id);
        if (
          !match ||
          Number(match[1]) !== shiftIndex + 1 ||
          Number(match[2]) > counts[shiftIndex]! ||
          occupied.has(id)
        ) {
          add(
            issue(
              'STAFF_ASSIGNMENT',
              'Unavailable, duplicate or double-booked worker',
              [assignment.taskId, id],
              time,
              end,
            ),
          );
          invalidTasks.add(assignment.taskId);
          for (const previous of tasks.filter((row) => row.workerIds.includes(id)))
            invalidTasks.add(previous.taskId);
        }
        occupied.add(id);
        if (task) task.workerIds.push(id);
      }
    }
    for (const task of tasks) {
      task.workerIds.sort(lexical);
      if (new Set(task.workerIds).size < task.required || invalidTasks.has(task.taskId)) {
        add(
          issue(
            'STAFF_ASSIGNMENT',
            'Task lacks distinct available worker coverage',
            [task.taskId],
            time,
            end,
          ),
        );
        invalidTasks.add(task.taskId);
      }
    }
    const total = normal + setupCount + validation;
    if (total > counts[shiftIndex]!)
      add(
        issue(
          'STAFF_SHORTAGE',
          plan.requests === null && shiftIndex < 2
            ? 'Required staff exceeds draft availability inferred from assignments'
            : 'Required staff exceeds availability',
          [],
          time,
          end,
        ),
      );
    staffIntervals.push({
      start: time,
      end,
      normal,
      setup: setupCount,
      validation,
      total,
      available: counts[shiftIndex]!,
      tasks,
    });
    shift.laborMinutes += total * duration;
    shift.reserveMinutes += Math.max(0, counts[shiftIndex]! - total) * duration;
    if (total > shift.peak) {
      shift.peak = total;
      shift.peakSpans = [];
    }
    if (total === shift.peak) {
      const previous = shift.peakSpans.at(-1);
      if (previous && Math.abs(previous.end - time) <= EPSILON) previous.end = end;
      else shift.peakSpans.push({ start: time, end });
    }
    for (const row of rows) {
      row.end = end;
      row.quantity = row.rate * duration;
      if (row.campaignId) produced[row.campaignId]! += row.quantity;
      machineIntervals.push(row);
    }
    for (let index = 0; index < queues.length; index++) {
      const queue = queues[index]!;
      const rates = queueRates[index]!;
      const closing = clean(queue.quantity + (rates.inflow - rates.consumed) * duration);
      if (closing < -EPSILON) throw new Error('Negative queue in fluid replay');
      stockIntervals.push({
        product: queue.product,
        before: queue.before,
        start: time,
        end,
        opening: queue.quantity,
        inflowRate: rates.inflow,
        consumedRate: rates.consumed,
        closing,
      });
      queue.quantity = closing;
    }
    for (const job of plan.jobs.filter((row) => active(row, time))) {
      const result = jobResults.find((row) => row.jobId === job.id)!;
      const work = REQUIRED_WORK.find((row) => row.code === job.code)!;
      const machine = rows.find((row) => row.machineId === job.machineId)!;
      const inWindow = time >= (work.firstShift - 1) * 630 && end <= work.lastShift * 630;
      const compatible =
        MACHINES.find((row) => row.id === job.machineId)!.operation === work.operation &&
        !plan.setups.some((setup) => setup.machineId === job.machineId && active(setup, time)) &&
        !plan.jobs.some(
          (other) =>
            other.id !== job.id && other.machineId === job.machineId && active(other, time),
        );
      const output =
        work.product === null ||
        (machine.kind === 'produce' && machine.product === work.product && machine.rate > 0);
      if (!output) {
        jobIssue(
          job.id,
          'VALIDATION_OUTPUT',
          'Validation requires uninterrupted actual positive output of its named product',
        );
      }
      const staffed =
        work.product === null ||
        (!invalidTasks.has(`validate:${job.id}`) && !invalidTasks.has(`run:${work.operation}`));
      if (!staffed)
        jobIssue(job.id, 'STAFF_ASSIGNMENT', 'Validation lacks normal or extra worker coverage');
      if (inWindow && compatible && output && staffed) result.creditedMinutes += duration;
    }
    for (const product of PRODUCTS) {
      const rate = rows
        .filter((row) => row.machineId.startsWith('PACK-') && row.product === product)
        .reduce((sum, row) => sum + row.rate, 0);
      let quantity = rate * duration;
      shift.packed[product] += quantity;
      let allocationTime = time;
      for (let index = 0; index < sourceOrders.length; index++) {
        const order = sourceOrders[index]!;
        if (order.product !== product) continue;
        const amount = Math.min(quantity, clean(order.quantity - allocated[index]!));
        if (amount <= 0) continue;
        const result = orders[index]!;
        allocated[index]! += amount;
        quantity = clean(quantity - amount);
        result.allocatedByShift[shiftIndex]! += amount;
        shift.fulfilled += amount;
        if (end <= order.originalDue * 630 + EPSILON) result.atOriginalDue += amount;
        if (order.promise && end <= order.promise.due * 630 + EPSILON)
          result.atPromiseDue = Math.min(order.promise.quantity, result.atPromiseDue! + amount);
        allocationTime += amount / rate;
        if (order.quantity - allocated[index]! <= EPSILON && result.completedAt === null)
          result.completedAt = allocationTime;
      }
      finished[product] += quantity;
    }
    if (Math.abs(end - (shiftIndex + 1) * 630) <= EPSILON) {
      shift.stocks = queues.map((queue) => ({
        product: queue.product,
        before: queue.before,
        quantity: queue.quantity,
      }));
      shift.finishedUnallocated = { ...finished };
    }
    time = end;
  }
  for (let index = 0; index < orders.length; index++) {
    const result = orders[index]!;
    const source = sourceOrders[index]!;
    result.originalDeficit = clean(source.quantity - result.atOriginalDue);
    if (source.promise)
      result.promiseDeficit = clean(source.promise.quantity - result.atPromiseDue!);
    shifts[source.originalDue - 1]!.dueDeficit += result.originalDeficit;
    if (result.originalDeficit > EPSILON || (result.promiseDeficit ?? 0) > EPSILON) {
      add(
        issue(
          'ORDER_SHORTFALL',
          'PACK allocation falls short of original or promised commitment',
          [source.id],
          null,
          source.originalDue * 630,
          'warning',
        ),
      );
    }
  }
  for (const result of jobResults) {
    const work = REQUIRED_WORK.find((row) => row.code === result.code)!;
    result.complete =
      !result.issues.length && Math.abs(result.creditedMinutes - work.minutes) <= EPSILON;
    if (!result.complete)
      add(issue('WORK_MISSING', 'Required job is incomplete', [result.jobId, result.code]));
  }
  for (const work of REQUIRED_WORK) {
    if (
      new Set(
        jobResults
          .filter((row) => row.code === work.code && row.complete)
          .map((row) => row.machineId),
      ).size < work.count
    ) {
      add(issue('WORK_MISSING', 'Required qualifying work coverage is incomplete', [work.code]));
    }
  }
  const quotas = plan.campaigns
    .map((campaign) => ({
      campaignId: campaign.id,
      produced: produced[campaign.id]!,
      remaining: clean(campaign.quota - produced[campaign.id]!),
    }))
    .sort((a, b) => lexical(a.campaignId, b.campaignId));
  for (const quota of quotas.filter((row) => row.remaining > EPSILON))
    add(
      issue(
        'QUOTA_SHORTFALL',
        'Campaign ended before its quota was produced',
        [quota.campaignId],
        null,
        null,
        'warning',
      ),
    );
  const machineOrder = Object.fromEntries(MACHINES.map((machine, index) => [machine.id, index]));
  machineIntervals.sort(
    (a, b) => machineOrder[a.machineId]! - machineOrder[b.machineId]! || a.start - b.start,
  );
  stockIntervals.sort(
    (a, b) =>
      PRODUCTS.indexOf(a.product) - PRODUCTS.indexOf(b.product) ||
      ROUTES[a.product].indexOf(a.before) - ROUTES[b.product].indexOf(b.before) ||
      a.start - b.start,
  );
  jobResults.sort((a, b) => lexical(a.jobId, b.jobId));
  issues.sort(
    (a, b) =>
      lexical(a.code, b.code) ||
      (a.start ?? -1) - (b.start ?? -1) ||
      lexical(a.refs.join('|'), b.refs.join('|')),
  );
  return {
    planId: plan.id,
    feasible: !issues.some((row) => row.severity === 'error'),
    issues,
    machineIntervals,
    stockIntervals,
    staffIntervals,
    shifts,
    orders,
    jobs: jobResults,
    quotas,
  };
}

/** @internal Checked boundary shared by replay consumers needing its canonical input as well. */
export function prepareEvaluation(
  input: unknown,
): Result<{ plan: Plan; events: Event[]; report: Report }> {
  if (!record(input))
    return { ok: false, errors: [issue('INVALID_INPUT', 'Evaluation input must be an object')] };
  const plan = validatePlan(input['plan']);
  const events = validateEvents(input['events']);
  if (!plan.ok) return plan;
  if (!events.ok) return events;
  const failure = events.value[0];
  if (failure?.kind === 'failure') {
    const prefix = replay(plan.value, []);
    if (
      !prefix.machineIntervals.some(
        (row) =>
          row.machineId === failure.machineId &&
          row.kind === 'produce' &&
          row.rate > 0 &&
          row.start < 120 &&
          row.end >= 120,
      )
    ) {
      return {
        ok: false,
        errors: [
          issue(
            'EVENT_TARGET',
            'Failure target must actually produce immediately before t=120',
            [failure.machineId],
            120,
            270,
          ),
        ],
      };
    }
  }
  return {
    ok: true,
    value: { plan: plan.value, events: events.value, report: replay(plan.value, events.value) },
  };
}

export function evaluate(input: EvaluationInput): Result<Report> {
  const prepared = prepareEvaluation(input);
  return prepared.ok ? { ok: true, value: prepared.value.report } : prepared;
}

export function compare(left: EvaluationInput, right: EvaluationInput): Result<Comparison> {
  const a = evaluate(left);
  const b = evaluate(right);
  if (!a.ok) return a;
  if (!b.ok) return b;
  const packed = zero();
  for (const product of PRODUCTS)
    packed[product] =
      b.value.shifts.reduce((sum, row) => sum + row.packed[product], 0) -
      a.value.shifts.reduce((sum, row) => sum + row.packed[product], 0);
  return {
    ok: true,
    value: {
      left: a.value,
      right: b.value,
      delta: {
        packed,
        originalDeficit:
          b.value.orders.reduce((sum, row) => sum + row.originalDeficit, 0) -
          a.value.orders.reduce((sum, row) => sum + row.originalDeficit, 0),
        peak: b.value.shifts.map((row, index) => row.peak - a.value.shifts[index]!.peak) as Four,
        laborMinutes:
          b.value.shifts.reduce((sum, row) => sum + row.laborMinutes, 0) -
          a.value.shifts.reduce((sum, row) => sum + row.laborMinutes, 0),
      },
    },
  };
}
