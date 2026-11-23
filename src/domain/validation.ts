import { MACHINES, REQUIRED_ORDERS, REQUIRED_WORK } from './model';
import type { Event, Issue, Order, Plan, Product, Result } from './model';

export function issue(
  code: string,
  message: string,
  refs: string[] = [],
  start: number | null = null,
  end: number | null = null,
  severity: 'error' | 'warning' = 'error',
): Issue {
  return { code, message, severity, refs, start, end };
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function count(value: unknown): value is number {
  return finite(value) && Number.isSafeInteger(value) && value >= 0;
}

function product(value: unknown): value is Product {
  return value === 'A' || value === 'B' || value === 'C';
}

function shift(value: unknown): boolean {
  return count(value) && value >= 1 && value <= 4;
}

function span(start: unknown, end: unknown): boolean {
  return finite(start) && finite(end) && start >= 0 && end <= 2520 && end > start;
}

function pair(value: unknown, predicate: (item: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length === 2 && value.every(predicate);
}

export function validateOrders(value: unknown): Result<Order[]> {
  if (!Array.isArray(value))
    return { ok: false, errors: [issue('INVALID_INPUT', 'Orders must be an array')] };
  const errors: Issue[] = [];
  const ids = new Set<string>();
  for (const row of value) {
    if (
      !record(row) ||
      !text(row['id']) ||
      !product(row['product']) ||
      !finite(row['quantity']) ||
      row['quantity'] <= 0 ||
      !shift(row['originalDue']) ||
      (row['priority'] !== 'high' && row['priority'] !== 'medium' && row['priority'] !== 'low')
    ) {
      errors.push(issue('INVALID_INPUT', 'Malformed order'));
      continue;
    }
    const id = row['id'].trim();
    if (ids.has(id)) errors.push(issue('INVALID_INPUT', 'Duplicate order ID', [id]));
    ids.add(id);
    const promise = row['promise'];
    if (
      promise !== null &&
      (!record(promise) ||
        !finite(promise['quantity']) ||
        promise['quantity'] <= 0 ||
        promise['quantity'] > row['quantity'] ||
        !shift(promise['due']) ||
        !text(promise['reason']))
    ) {
      errors.push(issue('INVALID_INPUT', 'Invalid promise', [id]));
    }
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: (value as Order[]).map((row) => ({
      id: row.id.trim(),
      product: row.product,
      quantity: row.quantity,
      originalDue: row.originalDue,
      priority: row.priority,
      promise:
        row.promise === null
          ? null
          : {
              quantity: row.promise.quantity,
              due: row.promise.due,
              reason: row.promise.reason.trim(),
            },
    })),
  };
}

export function originalDemand(orders: Order[]): boolean {
  return (
    orders.length === REQUIRED_ORDERS.length &&
    REQUIRED_ORDERS.every((source) => {
      const row = orders.find((order) => order.id === source.id);
      return (
        row &&
        row.product === source.product &&
        row.quantity === source.quantity &&
        row.originalDue === source.originalDue &&
        row.priority === source.priority
      );
    })
  );
}

/** Validate shape before any replay, sorting, dereference or cloning of untrusted input. */
export function validatePlan(value: unknown): Result<Plan> {
  if (!record(value))
    return { ok: false, errors: [issue('INVALID_INPUT', 'Plan must be an object')] };
  const orders = validateOrders(value['orders']);
  const errors: Issue[] = orders.ok ? [] : [...orders.errors];
  if (
    !text(value['id']) ||
    (value['mode'] !== 'required' && value['mode'] !== 'custom') ||
    !(value['requests'] === null || pair(value['requests'], count)) ||
    !pair(value['forecasts'], count) ||
    !pair(value['reserveReasons'], (item) => typeof item === 'string')
  ) {
    errors.push(issue('INVALID_INPUT', 'Invalid plan header or staffing counts'));
  }
  for (const collection of ['campaigns', 'setups', 'jobs', 'assignments'] as const) {
    const rows = value[collection];
    if (!Array.isArray(rows)) {
      errors.push(issue('INVALID_INPUT', `${collection} must be an array`));
      continue;
    }
    const ids = new Set<string>();
    for (const row of rows) {
      if (!record(row)) {
        errors.push(issue('INVALID_INPUT', `Malformed ${collection} record`));
        continue;
      }
      if (collection === 'assignments') {
        if (
          !text(row['taskId']) ||
          !span(row['start'], row['end']) ||
          !Array.isArray(row['workerIds']) ||
          !row['workerIds'].every(text)
        ) {
          errors.push(issue('INVALID_INPUT', 'Malformed assignment'));
        }
        continue;
      }
      const id = row['id'];
      const machine = MACHINES.find((item) => item.id === row['machineId']);
      if (
        !text(id) ||
        !machine ||
        !span(row['start'], collection === 'campaigns' ? row['until'] : row['end'])
      ) {
        errors.push(issue('INVALID_INPUT', `Invalid ${collection} ID, machine or interval`));
        continue;
      }
      if (ids.has(id.trim())) errors.push(issue('INVALID_INPUT', 'Duplicate ID', [id.trim()]));
      ids.add(id.trim());
      if (
        collection === 'campaigns' &&
        (!product(row['product']) || !finite(row['quota']) || row['quota'] <= 0)
      ) {
        errors.push(issue('INVALID_INPUT', 'Invalid campaign product or quota', [id]));
      }
      if (collection === 'setups' && (!product(row['from']) || !product(row['to']))) {
        errors.push(issue('INVALID_INPUT', 'Invalid setup products', [id]));
      }
      if (collection === 'jobs' && !REQUIRED_WORK.some((work) => work.code === row['code'])) {
        errors.push(issue('INVALID_INPUT', 'Unknown work code', [id]));
      }
    }
  }
  if (errors.length || !orders.ok) return { ok: false, errors };
  // Copy only validated contract fields. Unknown extra properties cannot inject non-JSON
  // values into reports or make structuredClone throw after a valid shape check.
  const source = value as unknown as Plan;
  const plan: Plan = {
    id: source.id.trim(),
    mode: source.mode,
    orders: orders.value,
    campaigns: source.campaigns.map((row) => ({
      id: row.id.trim(),
      machineId: row.machineId,
      product: row.product,
      start: row.start,
      until: row.until,
      quota: row.quota,
    })),
    setups: source.setups.map((row) => ({
      id: row.id.trim(),
      machineId: row.machineId,
      from: row.from,
      to: row.to,
      start: row.start,
      end: row.end,
    })),
    jobs: source.jobs.map((row) => ({
      id: row.id.trim(),
      machineId: row.machineId,
      code: row.code,
      start: row.start,
      end: row.end,
    })),
    assignments: source.assignments.map((row) => ({
      taskId: row.taskId.trim(),
      start: row.start,
      end: row.end,
      workerIds: row.workerIds.map((id) => id.trim()),
    })),
    requests: source.requests === null ? null : [...source.requests],
    forecasts: [...source.forecasts],
    reserveReasons: [source.reserveReasons[0].trim(), source.reserveReasons[1].trim()],
  };
  for (const machine of MACHINES) {
    const campaigns = plan.campaigns
      .filter((row) => row.machineId === machine.id)
      .sort((a, b) => a.start - b.start);
    if (campaigns.some((row, index) => index > 0 && row.start < campaigns[index - 1]!.until)) {
      errors.push(issue('INVALID_INPUT', 'Overlapping campaigns', [machine.id]));
    }
  }
  if (plan.mode === 'required' && !originalDemand(plan.orders))
    errors.push(issue('SOURCE_CHANGED', 'Required source demand was changed'));
  return errors.length ? { ok: false, errors } : { ok: true, value: plan };
}

export function validateEvents(value: unknown): Result<Event[]> {
  if (
    !Array.isArray(value) ||
    value.length > 2 ||
    value.some(
      (event, index) =>
        !record(event) || (index === 0 ? event['kind'] !== 'failure' : event['kind'] !== 'absence'),
    )
  ) {
    return {
      ok: false,
      errors: [issue('EVENT_ORDER', 'Expected [], [failure], or [failure, absence]')],
    };
  }
  const first: unknown = value[0];
  if (
    value.length &&
    (!record(first) ||
      !MACHINES.some(
        (machine) => machine.operation === 'GRIND' && machine.id === first['machineId'],
      ))
  ) {
    return {
      ok: false,
      errors: [issue('EVENT_TARGET', 'Failure must target a known GRIND machine')],
    };
  }
  if (!record(first)) return { ok: true, value: [] };
  const failure: Event = { kind: 'failure', machineId: first['machineId'] as string };
  return { ok: true, value: value.length === 2 ? [failure, { kind: 'absence' }] : [failure] };
}
