import { evaluate, prepareEvaluation } from './engine';
import type { Report } from './engine';
import { EPSILON } from './model';
import type { Event, Plan, Result } from './model';
import { issue, validateEvents } from './validation';
import { preservesPrefix } from './prefix';
import { assignStaff } from './staffing';

export { createScenarioPlan } from './engine';

export type Template =
  'VAL2_STAGGERED' | 'VAL2_PARALLEL' | 'REPAIR_G1_TO_G3' | 'NIGHT_WRAP_STAGGERED';

/**
 * Phase-guarded edits: reapplication preserves the physical schedule, not the plan ID.
 * Acceptance is not feasibility: evaluate exposes physical errors and submit blocks them.
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
    const [failure, absence] = validEvents.value;
    if (
      failure?.kind !== 'failure' ||
      failure.machineId !== 'GRIND-1' ||
      absence?.kind !== 'absence'
    )
      return {
        ok: false,
        errors: [
          issue(
            'WORKFLOW_GUARD',
            'Night staggering requires the prescribed GRIND-1 failure followed by absence',
          ),
        ],
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
  const assigned = assignStaff(next, projection.value, cut);
  if (cut && !preservesPrefix(plan, assigned, events, cut))
    return {
      ok: false,
      errors: [issue('WORKFLOW_GUARD', 'Template would rewrite executed evidence')],
    };
  return { ok: true, value: assigned };
}

/** Public summary consumers can use Report directly; this alias carries no hidden evidence. */
export type ScenarioReport = Report;
