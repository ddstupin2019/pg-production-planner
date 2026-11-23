import type { Report } from './engine';
import type { Plan } from './model';

/** Assign identities to the computed task timeline without changing staffing requests. */
export function assignStaff(plan: Plan, projection: Report, cut = 0): Plan {
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
