import assert from 'node:assert/strict';
import type { Report } from '../../src/domain/engine';
import type { Event, Plan, Product, Setup } from '../../src/domain/model';

// Independent R6/R4 transcription: never infer a setting from a campaign, report or
// production MACHINES/SETUP_MINUTES export. A/B/C groups use numeric machine suffixes.
const settings = [
  ['PRESS', 3, 2, 0],
  ['THERMAL', 2, 1, 0],
  ['PRINT', 1, 1, 0],
  ['LASER', 0, 0, 1],
  ['REWIND', 1, 1, 0],
  ['GRIND', 3, 2, 0],
  ['WASH', 1, 0, 0],
  ['CHROME', 2, 0, 0],
  ['TEF', 2, 0, 0],
  ['LUBE', 1, 0, 0],
  ['WRAP', 10, 6, 0],
  ['PACK', 2, 1, 0],
] as const;
const initial = new Map<string, Product>(
  settings.flatMap(([operation, a, b, c]) =>
    Array.from({ length: a + b + c }, (_, index): [string, Product] => [
      `${operation}-${index + 1}`,
      index < a ? 'A' : index < a + b ? 'B' : 'C',
    ]),
  ),
);
const matrix: Record<Product, Record<Product, number>> = {
  A: { A: 0, B: 20, C: 30 },
  B: { A: 20, B: 0, C: 25 },
  C: { A: 30, B: 25, C: 0 },
};
const epsilon = 1e-6;
export type SetupEvidence = Pick<Report, 'machineIntervals' | 'issues' | 'feasible'>;

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return Math.min(a.end, b.end) - Math.max(a.start, b.start) > epsilon;
}

export function checkSetups(evidence: SetupEvidence, plan: Plan, events: Event[] = []): void {
  const ids = new Set([
    ...evidence.machineIntervals.map((row) => row.machineId),
    ...plan.setups.map((setup) => setup.machineId),
  ]);
  for (const machineId of ids) {
    const original = initial.get(machineId);
    assert(original, `unknown setup/configuration machine ${machineId}`);
    const rows = evidence.machineIntervals.filter((row) => row.machineId === machineId);
    const ordered = plan.setups
      .filter((setup) => setup.machineId === machineId)
      .sort((a, b) => a.start - b.start || a.end - b.end || (a.id < b.id ? -1 : 1));
    const changes: { time: number; product: Product }[] = [{ time: 0, product: original }];
    let configured = original;
    const invalid = (setup: Setup, why: string) => {
      assert.equal(
        evidence.feasible,
        false,
        `${setup.id}: invalid setup hidden as feasible: ${why}`,
      );
      const codes = ['SETUP_REQUIRED', 'MACHINE_CONFLICT', 'WORK_DURATION', 'INVALID_INPUT'];
      assert(
        evidence.issues.some(
          (issue) =>
            issue.severity === 'error' &&
            codes.includes(issue.code) &&
            (issue.refs.includes(machineId) || issue.refs.includes(setup.id)),
        ),
        `${setup.id}: no relevant setup error: ${why}`,
      );
    };

    for (const setup of ordered) {
      const duration = setup.end - setup.start;
      const expected = matrix[setup.from]?.[setup.to];
      const shape =
        Number.isFinite(setup.start) &&
        Number.isFinite(setup.end) &&
        setup.start >= 0 &&
        setup.end <= 2520 &&
        duration > 0;
      const durationMatches =
        shape &&
        setup.from !== setup.to &&
        expected !== undefined &&
        Math.abs(duration - expected) <= epsilon;
      const fromMatches = setup.from === configured;
      const otherSetup = ordered.some((other) => other !== setup && overlaps(setup, other));
      const maintenance = plan.jobs.some(
        (job) => job.machineId === machineId && job.code.startsWith('TO-') && overlaps(setup, job),
      );
      const repair =
        events.some((event) => event.kind === 'failure' && event.machineId === machineId) &&
        overlaps(setup, { start: 120, end: 270 });
      let actualClock = true;
      const cuts = [
        ...new Set([setup.start, setup.end, ...rows.flatMap((row) => [row.start, row.end])]),
      ]
        .filter((t) => t >= setup.start && t <= setup.end)
        .sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        if (cuts[i + 1]! - cuts[i]! <= epsilon) continue;
        const t = (cuts[i]! + cuts[i + 1]!) / 2;
        const slice = rows.filter((row) => row.start <= t && row.end > t);
        actualClock &&=
          slice.length === 1 &&
          slice[0]!.kind === 'setup' &&
          slice[0]!.setupId === setup.id &&
          slice[0]!.product === configured &&
          slice[0]!.rate === 0 &&
          slice[0]!.quantity === 0;
      }
      const complete =
        durationMatches && fromMatches && !otherSetup && !maintenance && !repair && actualClock;
      if (complete) {
        // The transition happens only at completion, not at declaration/start or at
        // the end of a wrong, overlapping or stopped attempt. Later from uses this state.
        changes.push({ time: setup.end, product: setup.to });
        configured = setup.to;
      } else invalid(setup, 'from, matrix duration, overlap or actual setup clock');
    }

    for (const row of rows) {
      const cuts = [
        ...new Set([
          row.start,
          row.end,
          ...ordered.flatMap((setup) => [setup.start, setup.end]),
          ...changes.map((change) => change.time),
        ]),
      ]
        .filter((t) => t >= row.start && t <= row.end)
        .sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        if (cuts[i + 1]! - cuts[i]! <= epsilon) continue;
        const t = (cuts[i]! + cuts[i + 1]!) / 2;
        const state = changes.filter((change) => change.time <= t).at(-1)!;
        assert.equal(row.product, state.product, `${machineId}: configured product at ${t}`);
        const active = ordered.filter((setup) => setup.start <= t && setup.end > t);
        if (active.length > 0) {
          assert.notEqual(row.kind, 'produce', `${machineId}: production during a setup attempt`);
          assert.equal(row.rate, 0);
          assert.equal(row.quantity, 0);
        }
        if (row.kind === 'setup') {
          assert(
            active.some((setup) => setup.id === row.setupId),
            `${machineId}: invented setup work`,
          );
          assert.equal(row.rate, 0);
          assert.equal(row.quantity, 0);
        }
        // Even an explicitly invalid report may not produce a new product without
        // a genuinely completed preceding changeover. Campaign agreement is not proof.
        if (row.kind === 'produce') assert.equal(row.product, state.product);
      }
    }
  }
}
