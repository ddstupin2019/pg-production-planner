import { EPSILON } from './model';
import type { Event, Plan } from './model';
import { evaluate } from './engine';

interface Evidence {
  start: number;
  end: number;
  data: unknown;
}

function equal(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= EPSILON;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, index) => equal(item, b[index]));
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const left = Object.entries(a);
    const right = Object.entries(b);
    return (
      left.length === right.length &&
      left.every(
        ([key, value], index) => right[index]?.[0] === key && equal(value, right[index]?.[1]),
      )
    );
  }
  return a === b;
}

function sameTimeline(left: Evidence[], right: Evidence[], cut: number): boolean {
  const edges = [
    ...new Set([
      0,
      cut,
      ...[...left, ...right]
        .flatMap((row) => [row.start, row.end])
        .filter((time) => time > 0 && time < cut),
    ]),
  ].sort((a, b) => a - b);
  for (let index = 1; index < edges.length; index++) {
    const time = (edges[index - 1]! + edges[index]!) / 2;
    const snapshot = (rows: Evidence[]) =>
      rows
        .filter((row) => row.start <= time && row.end > time)
        .map((row) => row.data)
        .sort((a, b) => {
          const first = JSON.stringify(a);
          const second = JSON.stringify(b);
          return first < second ? -1 : first > second ? 1 : 0;
        });
    if (!equal(snapshot(left), snapshot(right))) return false;
  }
  return true;
}

function records(plan: Plan): Evidence[] {
  return [
    ...plan.campaigns.map((row) => ({
      start: row.start,
      end: row.until,
      data: ['campaign', row.id, row.machineId, row.product],
    })),
    ...plan.setups.map((row) => ({
      start: row.start,
      end: row.end,
      data: ['setup', row.id, row.machineId, row.from, row.to],
    })),
    ...plan.jobs.map((row) => ({
      start: row.start,
      end: row.end,
      data: ['job', row.id, row.machineId, row.code],
    })),
    ...plan.assignments.flatMap((row) =>
      row.workerIds.map((id) => ({
        start: row.start,
        end: row.end,
        data: ['worker', row.taskId, id],
      })),
    ),
  ];
}

/** Compare evidence rather than array segmentation, permitting honest splits at the event cut. */
export function preservesPrefix(before: Plan, after: Plan, events: Event[], cut: number): boolean {
  if (!sameTimeline(records(before), records(after), cut)) return false;
  const left = evaluate({ plan: before, events });
  const right = evaluate({ plan: after, events });
  if (!left.ok || !right.ok) return false;
  const machineRows = (report: typeof left.value): Evidence[] =>
    report.machineIntervals.map((row) => ({
      start: row.start,
      end: row.end,
      data: [
        row.machineId,
        row.campaignId,
        row.product,
        row.kind,
        row.rate,
        row.jobIds,
        row.setupId,
      ],
    }));
  if (!sameTimeline(machineRows(left.value), machineRows(right.value), cut)) return false;
  const stockRows = (report: typeof left.value): Evidence[] =>
    report.stockIntervals.map((row) => ({
      start: row.start,
      end: row.end,
      data: [row.product, row.before, row.inflowRate, row.consumedRate],
    }));
  return sameTimeline(stockRows(left.value), stockRows(right.value), cut);
}
