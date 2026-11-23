import type { Event, Order, Plan, Result, Role, Shift } from './model';
import { EPSILON, REQUIRED_ORDERS } from './model';
import { evaluate, prepareEvaluation } from './engine';
import type { Report } from './engine';
import { preservesPrefix } from './prefix';
import {
  count,
  finite,
  issue,
  originalDemand,
  record,
  text,
  validateEvents,
  validateOrders,
  validatePlan,
} from './validation';

export interface Revision {
  id: number;
  parentId: number | null;
  plan: Plan;
  events: Event[];
  status: 'draft' | 'pending' | 'agreed';
  approvals: Role[];
  acknowledgements: { code: string; reason: string }[];
}
export interface Workflow {
  schemaVersion: 1;
  role: Role;
  demandSent: boolean;
  phase: 'baseline' | 'failure' | 'absence';
  planningMinute: number;
  lockedRequests: null | [number, number];
  versions: Revision[];
  currentId: number;
  scenarioPlan: Plan;
  orderOrigins: { id: string; quantity: number; originalDue: Shift }[];
}
export type Action =
  | { type: 'switch-role'; role: Role }
  | { type: 'edit-orders'; orders: Order[] }
  | { type: 'send-demand' }
  | { type: 'edit-plan'; plan: Plan }
  | { type: 'fix-requests'; counts: [number, number]; reasons: [string, string] }
  | { type: 'set-planning-minute'; minute: number }
  | { type: 'submit'; acknowledgements: { code: string; reason: string }[] }
  | { type: 'approve' }
  | { type: 'apply-failure'; machineId: string }
  | { type: 'apply-absence' }
  | { type: 'restore-scenario' };

function guard(
  message: string,
  code = 'WORKFLOW_GUARD',
  refs: string[] = [],
  start: number | null = null,
  end: number | null = null,
): Result<never> {
  return { ok: false, errors: [issue(code, message, refs, start, end)] };
}

function role(value: unknown): value is Role {
  return value === 'planner' || value === 'manager';
}

function acknowledgements(value: unknown): value is Revision['acknowledgements'] {
  return (
    Array.isArray(value) &&
    value.every((row) => record(row) && text(row['code']) && text(row['reason']))
  );
}

function counts(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) && value.length === 2 && value.every((item) => count(item) && item >= 2)
  );
}

function readOrigins(value: unknown): Workflow['orderOrigins'] | null {
  if (!Array.isArray(value)) return null;
  const origins: Workflow['orderOrigins'] = [];
  const ids = new Set<string>();
  for (const row of value) {
    if (
      !record(row) ||
      !text(row['id']) ||
      row['id'] !== row['id'].trim() ||
      ids.has(row['id']) ||
      !finite(row['quantity']) ||
      row['quantity'] <= 0 ||
      !count(row['originalDue']) ||
      row['originalDue'] < 1 ||
      row['originalDue'] > 4
    )
      return null;
    ids.add(row['id']);
    origins.push({
      id: row['id'],
      quantity: row['quantity'],
      originalDue: row['originalDue'] as Shift,
    });
  }
  if (
    !REQUIRED_ORDERS.every((source, index) => {
      const origin = origins[index];
      return (
        origin &&
        origin.id === source.id &&
        origin.quantity === source.quantity &&
        origin.originalDue === source.originalDue
      );
    })
  )
    return null;
  return origins;
}

function validationGuard(plan: Plan): Result<never> | null {
  const jobs = plan.jobs.filter(
    (job) =>
      job.machineId === 'GRIND-1' &&
      job.code.startsWith('VAL-') &&
      Math.min(job.end, 270) - Math.max(job.start, 120) > EPSILON,
  );
  return jobs.length
    ? guard(
        'Interrupted validation recovery is outside this replay. Review GRIND-1 work or restore the scenario.',
        'UNSUPPORTED_FAILURE_VALIDATION',
        ['GRIND-1', ...jobs.map((job) => job.id)],
        120,
        270,
      )
    : null;
}

/** Validate and copy contract fields once; optionally retain the checked baseline evidence. */
function readState(
  value: unknown,
  baselineRequested = false,
): { state: Workflow; baseline: Report | null } | null {
  if (
    !record(value) ||
    value['schemaVersion'] !== 1 ||
    !role(value['role']) ||
    typeof value['demandSent'] !== 'boolean' ||
    (value['phase'] !== 'baseline' &&
      value['phase'] !== 'failure' &&
      value['phase'] !== 'absence') ||
    !finite(value['planningMinute']) ||
    value['planningMinute'] < 660 ||
    value['planningMinute'] > 720 ||
    !(value['lockedRequests'] === null || counts(value['lockedRequests'])) ||
    !count(value['currentId']) ||
    !Array.isArray(value['versions']) ||
    !value['versions'].length
  )
    return null;
  const scenarioPlan = validatePlan(value['scenarioPlan']);
  if (!scenarioPlan.ok) return null;
  const orderOrigins = readOrigins(value['orderOrigins']);
  if (!orderOrigins) return null;
  const ids = new Set<number>();
  const versions: Revision[] = [];
  let baseline: Report | null = null;
  for (const revision of value['versions']) {
    if (
      !record(revision) ||
      !count(revision['id']) ||
      revision['id'] < 1 ||
      ids.has(revision['id']) ||
      !(
        revision['parentId'] === null ||
        (count(revision['parentId']) && ids.has(revision['parentId']))
      ) ||
      (revision['status'] !== 'draft' &&
        revision['status'] !== 'pending' &&
        revision['status'] !== 'agreed') ||
      !Array.isArray(revision['approvals']) ||
      !revision['approvals'].every(role) ||
      new Set(revision['approvals']).size !== revision['approvals'].length ||
      !acknowledgements(revision['acknowledgements'])
    )
      return null;
    const events = validateEvents(revision['events']);
    if (!events.ok) return null;
    let plan: Plan;
    if (baselineRequested && revision['id'] === value['currentId']) {
      const prepared = prepareEvaluation({ plan: revision['plan'], events: [] });
      if (!prepared.ok) return null;
      plan = prepared.value.plan;
      baseline = prepared.value.report;
    } else {
      const validated = validatePlan(revision['plan']);
      if (!validated.ok) return null;
      plan = validated.value;
    }
    versions.push({
      id: revision['id'],
      parentId: revision['parentId'],
      plan,
      events: events.value,
      status: revision['status'],
      approvals: [...revision['approvals']],
      acknowledgements: revision['acknowledgements'].map((row) => ({
        code: row.code,
        reason: row.reason,
      })),
    });
    ids.add(revision['id']);
  }
  if (!ids.has(value['currentId'])) return null;
  const origins = new Map(orderOrigins.map((origin) => [origin.id, origin]));
  if (
    [scenarioPlan.value, ...versions.map((revision) => revision.plan)].some((plan) =>
      plan.orders.some((order) => {
        const origin = origins.get(order.id);
        return (
          !origin || origin.quantity !== order.quantity || origin.originalDue !== order.originalDue
        );
      }),
    )
  )
    return null;
  return {
    state: {
      schemaVersion: 1,
      role: value['role'],
      demandSent: value['demandSent'],
      phase: value['phase'],
      planningMinute: value['planningMinute'],
      lockedRequests: value['lockedRequests'] === null ? null : [...value['lockedRequests']],
      versions,
      currentId: value['currentId'],
      scenarioPlan: scenarioPlan.value,
      orderOrigins,
    },
    baseline,
  };
}

function current(state: Workflow): Revision {
  return state.versions.find((revision) => revision.id === state.currentId)!;
}

function draft(state: Workflow, forceSuccessor = false): Revision {
  const revision = current(state);
  if (revision.status === 'draft' && !forceSuccessor) {
    revision.approvals = [];
    revision.acknowledgements = [];
    return revision;
  }
  const id = Math.max(...state.versions.map((row) => row.id)) + 1;
  const next: Revision = {
    id,
    parentId: revision.id,
    plan: structuredClone(revision.plan),
    events: structuredClone(revision.events),
    status: 'draft',
    approvals: [],
    acknowledgements: [],
  };
  state.versions.push(next);
  state.currentId = id;
  return next;
}

export function createWorkflow(plan: Plan): Result<Workflow> {
  const validated = validatePlan(plan);
  if (!validated.ok) return validated;
  if (validated.value.mode !== 'required')
    return guard('Workflow must start from a required scenario', 'SOURCE_CHANGED');
  const scenarioPlan = validated.value;
  scenarioPlan.requests = null;
  scenarioPlan.orders = scenarioPlan.orders.map((order) => ({ ...order, promise: null }));
  return {
    ok: true,
    value: {
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
          plan: structuredClone(scenarioPlan),
          events: [],
          status: 'draft',
          approvals: [],
          acknowledgements: [],
        },
      ],
      currentId: 1,
      scenarioPlan,
      orderOrigins: REQUIRED_ORDERS.map(({ id, quantity, originalDue }) => ({
        id,
        quantity,
        originalDue,
      })),
    },
  };
}

export function transition(state: Workflow, action: Action): Result<Workflow> {
  if (!record(action) || !text(action.type))
    return guard('Malformed workflow or action', 'INVALID_INPUT');
  const checked = readState(state, action.type === 'apply-failure');
  if (!checked)
    return guard(
      'Malformed workflow: check state, order origins and stored order originals',
      'INVALID_INPUT',
    );
  // Work on a fresh complete tree: no rejected action or successor can alter its predecessor.
  const next = checked.state;
  const revision = current(next);
  const manager = next.role === 'manager';
  switch (action.type) {
    case 'switch-role':
      if (!role(action.role)) return guard('Unknown role', 'INVALID_INPUT');
      next.role = action.role;
      break;
    case 'set-planning-minute':
      if (!finite(action.minute) || action.minute < next.planningMinute || action.minute > 720)
        return guard('Planning time must be monotone in [660,720]');
      next.planningMinute = action.minute;
      break;
    case 'restore-scenario':
      return createWorkflow(next.scenarioPlan);
    case 'edit-orders': {
      if (manager) return guard('Only planner edits demand');
      const validated = validateOrders(action.orders);
      if (!validated.ok) return validated;
      for (const order of validated.value) {
        const previous = next.orderOrigins.find((origin) => origin.id === order.id);
        if (
          previous &&
          (previous.quantity !== order.quantity || previous.originalDue !== order.originalDue)
        )
          return guard(
            'Existing original quantity and due date are immutable; use a promise or a new custom ID',
            'SOURCE_CHANGED',
            [order.id],
          );
      }
      const edited = draft(next);
      edited.plan.orders = validated.value;
      if (edited.plan.mode === 'custom' || !originalDemand(edited.plan.orders))
        edited.plan.mode = 'custom';
      const known = new Set(next.orderOrigins.map((origin) => origin.id));
      next.orderOrigins.push(
        ...validated.value
          .filter((order) => !known.has(order.id))
          .map(({ id, quantity, originalDue }) => ({ id, quantity, originalDue })),
      );
      next.demandSent = false;
      break;
    }
    case 'send-demand':
      if (manager) return guard('Only planner sends demand');
      next.demandSent = true;
      break;
    case 'edit-plan': {
      if (!manager || !next.demandSent)
        return guard('Manager edits production after demand is sent');
      const validated = validatePlan(action.plan);
      if (!validated.ok) return validated;
      if (
        JSON.stringify(validated.value.orders) !== JSON.stringify(revision.plan.orders) ||
        validated.value.mode !== revision.plan.mode
      )
        return guard('Manager cannot overwrite planner demand');
      if (
        next.lockedRequests &&
        JSON.stringify(validated.value.requests) !== JSON.stringify(next.lockedRequests)
      )
        return guard('Fixed requests are immutable');
      if (!next.lockedRequests && validated.value.requests !== null)
        return guard('Use fix-requests to establish staffing; a draft has no approved requests');
      if (next.phase !== 'baseline') {
        const unsupported = validationGuard(validated.value);
        if (unsupported) return unsupported;
        if (
          !preservesPrefix(
            revision.plan,
            validated.value,
            revision.events,
            next.phase === 'failure' ? 120 : 630,
          )
        )
          return guard('Production edit rewrites the frozen execution prefix');
      }
      draft(next).plan = validated.value;
      break;
    }
    case 'fix-requests': {
      if (
        !manager ||
        !next.demandSent ||
        next.lockedRequests ||
        next.planningMinute >= 720 ||
        next.phase !== 'baseline'
      )
        return guard('Fix requests once, as manager after sent demand and before noon');
      if (
        !counts(action.counts) ||
        !Array.isArray(action.reasons) ||
        action.reasons.length !== 2 ||
        !action.reasons.every((reason) => typeof reason === 'string')
      )
        return guard(
          'Requests require two integer counts >=2 and two explanations',
          'INVALID_INPUT',
        );
      const report = evaluate({ plan: revision.plan, events: revision.events });
      if (!report.ok) return report;
      if (
        action.counts.some(
          (number, index) =>
            number > report.value.shifts[index]!.peak && !text(action.reasons[index]),
        )
      )
        return guard('Explain reserve above computed staffing demand');
      const edited = draft(next);
      next.lockedRequests = [...action.counts];
      edited.plan.requests = [...action.counts];
      edited.plan.reserveReasons = [action.reasons[0].trim(), action.reasons[1].trim()];
      break;
    }
    case 'submit': {
      if (revision.status !== 'draft' || !next.demandSent || !next.lockedRequests)
        return guard('Submit a sent draft with fixed requests');
      if (!acknowledgements(action.acknowledgements))
        return guard(
          'Acknowledgements require warning codes and nonempty reasons',
          'INVALID_INPUT',
        );
      const report = evaluate({ plan: revision.plan, events: revision.events });
      if (!report.ok) return report;
      if (!report.value.feasible)
        return { ok: false, errors: report.value.issues.filter((row) => row.severity === 'error') };
      if (
        report.value.shifts
          .slice(0, 2)
          .some(
            (row, index) => row.available > row.peak && !text(revision.plan.reserveReasons[index]),
          )
      )
        return guard('Reserve explanations are required');
      const codes = new Set(
        report.value.issues.filter((row) => row.severity === 'warning').map((row) => row.code),
      );
      if (
        [...codes].some((code) => !action.acknowledgements.some((row) => row.code.trim() === code))
      )
        return guard('Acknowledge every warning code before agreement');
      revision.status = 'pending';
      revision.approvals = [];
      revision.acknowledgements = action.acknowledgements.map((row) => ({
        code: row.code.trim(),
        reason: row.reason.trim(),
      }));
      break;
    }
    case 'approve':
      if (revision.status !== 'pending' || revision.approvals.includes(next.role))
        return guard('Each role approves the same pending revision once');
      revision.approvals.push(next.role);
      if (revision.approvals.length === 2) revision.status = 'agreed';
      break;
    case 'apply-failure': {
      if (!manager || next.phase !== 'baseline' || revision.events.length)
        return guard('Manager applies failure once to the baseline lineage');
      if (action.machineId !== 'GRIND-1')
        return guard(
          'This demo supports only GRIND-1 producing A; review work or restore the scenario.',
          'UNSUPPORTED_FAILURE_TARGET',
          ['GRIND-1'],
        );
      const unsupported = validationGuard(revision.plan);
      if (unsupported) return unsupported;
      if (revision.status !== 'agreed') return guard('Agree the baseline before applying failure');
      // readState checked this current plan and retained its baseline for apply-failure.
      const before = checked.baseline!;
      const produces = (side: 'before' | 'at') =>
        before.machineIntervals.some(
          (row) =>
            row.machineId === 'GRIND-1' &&
            row.kind === 'produce' &&
            row.product === 'A' &&
            row.rate > 0 &&
            (side === 'before'
              ? row.start < 120 && row.end >= 120
              : row.start <= 120 && row.end > 120),
        );
      if (!produces('before') || !produces('at'))
        return guard(
          'GRIND-1 must actually produce A immediately before and at t=120. Review work or restore the scenario.',
          'EVENT_TARGET',
          ['GRIND-1'],
          120,
          270,
        );
      draft(next, true).events.push({ kind: 'failure', machineId: 'GRIND-1' });
      next.phase = 'failure';
      break;
    }
    case 'apply-absence':
      if (
        !manager ||
        next.phase !== 'failure' ||
        revision.status !== 'agreed' ||
        revision.events.length !== 1
      )
        return guard('Agree the failure successor before applying absence once');
      draft(next, true).events.push({ kind: 'absence' });
      next.phase = 'absence';
      break;
    default:
      return guard('Unknown workflow action', 'INVALID_INPUT');
  }
  return { ok: true, value: next };
}

export function exportWorkflow(state: Workflow): string {
  const checked = readState(state);
  if (!checked)
    return (
      JSON.stringify(
        {
          schemaVersion: 1,
          workflow: state,
          evaluation: guard(
            'Malformed workflow: check state, order origins and stored order originals',
            'INVALID_INPUT',
          ),
        },
        null,
        2,
      ) + '\n'
    );
  const revision = current(checked.state);
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        workflow: state,
        evaluation: evaluate({ plan: revision.plan, events: revision.events }),
      },
      null,
      2,
    ) + '\n'
  );
}
