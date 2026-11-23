import { describe, expect, test } from 'vitest';
import type { MachineInterval } from '../../src/domain/engine';
import type { Event, Plan, Product, Setup } from '../../src/domain/model';
import { emptyPlan } from '../support/fixture';
import { checkSetups } from '../support/setup-witness';
import type { SetupEvidence } from '../support/setup-witness';

// Hand-built setup-only evidence. No evaluator or workflow is mocked, and a passing
// setup witness alone is never presented as a complete physically feasible report.
function row(
  start: number,
  end: number,
  product: Product,
  kind: MachineInterval['kind'] = 'idle',
  setupId: string | null = null,
  machineId = 'PRESS-1',
): MachineInterval {
  const rate = kind === 'produce' ? 0.1 : 0;
  return {
    machineId,
    campaignId: kind === 'produce' ? 'permission' : null,
    start,
    end,
    product,
    kind,
    rate,
    quantity: rate * (end - start),
    jobIds: [],
    setupId,
  };
}
function witness(setups: Setup[], rows: MachineInterval[], invalid = false) {
  const plan = emptyPlan();
  plan.setups = setups;
  const evidence: SetupEvidence = {
    machineIntervals: rows,
    feasible: !invalid,
    issues: invalid
      ? [
          {
            code: 'MACHINE_CONFLICT',
            message: 'Explicit invalid setup attempt',
            severity: 'error',
            refs: [...new Set(setups.flatMap((s) => [s.id, s.machineId]))],
            start: 0,
            end: 2520,
          },
        ]
      : [],
  };
  return { plan, evidence };
}
function ab(machineId = 'PRESS-1'): Setup {
  return { id: 'ab', machineId, from: 'A', to: 'B', start: 0, end: 20 };
}
function check(value: { plan: Plan; evidence: SetupEvidence }, events: Event[] = []) {
  const before = structuredClone(value);
  checkSetups(value.evidence, value.plan, events);
  expect(value).toEqual(before);
}

describe('independent setup/configuration witness, not campaign agreement', () => {
  test('independent source boundary settings cover every operation and all product groups', () => {
    const source: [string, Product][] = [
      ['PRESS-1', 'A'],
      ['PRESS-3', 'A'],
      ['PRESS-4', 'B'],
      ['PRESS-5', 'B'],
      ['THERMAL-2', 'A'],
      ['THERMAL-3', 'B'],
      ['PRINT-1', 'A'],
      ['PRINT-2', 'B'],
      ['LASER-1', 'C'],
      ['REWIND-1', 'A'],
      ['REWIND-2', 'B'],
      ['GRIND-3', 'A'],
      ['GRIND-4', 'B'],
      ['WASH-1', 'A'],
      ['CHROME-2', 'A'],
      ['TEF-2', 'A'],
      ['LUBE-1', 'A'],
      ['WRAP-10', 'A'],
      ['WRAP-11', 'B'],
      ['WRAP-16', 'B'],
      ['PACK-2', 'A'],
      ['PACK-3', 'B'],
    ];
    const rows = source.map(([id, product]) => row(0, 2520, product, 'idle', null, id));
    expect(() => check(witness([], rows))).not.toThrow();
  });
  test('valid sequential changeovers and their rows may arrive in nonchronological order', () => {
    const bc: Setup = { id: 'bc', machineId: 'PRESS-1', from: 'B', to: 'C', start: 20, end: 45 };
    const ca: Setup = { id: 'ca', machineId: 'PRESS-1', from: 'C', to: 'A', start: 45, end: 75 };
    const value = witness(
      [ca, ab(), bc],
      [
        row(75, 2520, 'A', 'produce'),
        row(45, 75, 'C', 'setup', 'ca'),
        row(0, 20, 'A', 'setup', 'ab'),
        row(20, 45, 'B', 'setup', 'bc'),
      ],
    );
    expect(() => check(value)).not.toThrow();
  });
  test('fractional start and exact completion boundary retain from until completion', () => {
    const setup = { ...ab(), start: 0.25, end: 20.25 };
    expect(() =>
      check(
        witness(
          [setup],
          [
            row(0, 0.25, 'A'),
            row(0.25, 20.25, 'A', 'setup', 'ab'),
            row(20.25, 2520, 'B', 'produce'),
          ],
        ),
      ),
    ).not.toThrow();
  });
  test.each([true, false])(
    'missing changeover cannot be hidden by matching campaign/report, feasible=%s',
    (feasible) => {
      const value = witness([], [row(0, 2520, 'B', 'produce')]);
      value.plan.campaigns = [
        {
          id: 'permission',
          machineId: 'PRESS-1',
          product: 'B',
          start: 0,
          until: 2520,
          quota: 1000,
        },
      ];
      value.evidence.feasible = feasible;
      if (!feasible)
        value.evidence.issues = [
          {
            code: 'SETUP_REQUIRED',
            message: 'Not configured',
            severity: 'error',
            refs: ['PRESS-1'],
            start: 0,
            end: 2520,
          },
        ];
      expect(() => check(value)).toThrow();
    },
  );
  test.each(['from', 'duration', 'same product'])(
    'wrong %s attempt cannot commit a target setting',
    (kind) => {
      const setup =
        kind === 'from'
          ? { ...ab(), from: 'C' as const, end: 25 }
          : kind === 'duration'
            ? { ...ab(), end: 19 }
            : { ...ab(), to: 'A' as const };
      const honest = witness(
        [setup],
        [row(0, setup.end, 'A', 'setup', 'ab'), row(setup.end, 2520, 'A')],
        true,
      );
      expect(() => check(honest)).not.toThrow();
      honest.evidence.machineIntervals[1] = row(setup.end, 2520, 'B', 'produce');
      expect(() => check(honest)).toThrow();
    },
  );
  test('invalid setup cannot be labelled feasible just because production is idle', () => {
    const value = witness(
      [{ ...ab(), end: 19 }],
      [row(0, 19, 'A', 'setup', 'ab'), row(19, 2520, 'A')],
    );
    expect(() => check(value)).toThrow();
  });
  test('an unrelated missing-work issue does not explain an invalid setup', () => {
    const value = witness(
      [{ ...ab(), end: 19 }],
      [row(0, 19, 'A', 'setup', 'ab'), row(19, 2520, 'A')],
      true,
    );
    value.evidence.issues[0]!.code = 'WORK_MISSING';
    expect(() => check(value)).toThrow();
  });
  test.each(['setup label', 'premature production', 'late old-product label'])(
    '%s cannot invent a completed setting',
    (kind) => {
      const value = witness(
        [ab()],
        [row(0, 20, 'A', 'setup', 'ab'), row(20, 2520, 'B', 'produce')],
      );
      if (kind === 'setup label') value.evidence.machineIntervals[0]!.product = 'B';
      if (kind === 'premature production')
        value.evidence.machineIntervals[0] = row(0, 20, 'B', 'produce');
      if (kind === 'late old-product label') value.evidence.machineIntervals[1]!.product = 'A';
      expect(() => check(value)).toThrow();
    },
  );
  test('declared setup time that was actually idle does not complete a changeover', () => {
    const value = witness([ab()], [row(0, 20, 'A'), row(20, 2520, 'A')], true);
    expect(() => check(value)).not.toThrow();
    value.evidence.machineIntervals[1] = row(20, 2520, 'B', 'produce');
    expect(() => check(value)).toThrow();
  });
  test('overlapping setup attempts do not chain from either uncompleted target', () => {
    const value = witness(
      [ab(), { id: 'ac', machineId: 'PRESS-1', from: 'A', to: 'C', start: 10, end: 40 }],
      [
        row(0, 10, 'A', 'setup', 'ab'),
        row(10, 20, 'A', 'setup', 'ab'),
        row(20, 40, 'A', 'setup', 'ac'),
        row(40, 2520, 'A'),
      ],
      true,
    );
    expect(() => check(value)).not.toThrow();
    value.evidence.machineIntervals[3] = row(40, 2520, 'C', 'produce');
    expect(() => check(value)).toThrow();
  });
  test('maintenance-stopped setup cannot change configuration after the stop', () => {
    const value = witness(
      [ab()],
      [row(0, 20, 'A', 'maintenance', 'ab'), row(20, 180, 'A', 'maintenance'), row(180, 2520, 'A')],
      true,
    );
    value.plan.jobs = [{ id: 'to', code: 'TO-1', machineId: 'PRESS-1', start: 0, end: 180 }];
    expect(() => check(value)).not.toThrow();
    value.evidence.machineIntervals[2] = row(180, 2520, 'B', 'produce');
    expect(() => check(value)).toThrow();
  });
  test('repair-stopped setup cannot change configuration at repair completion', () => {
    const setup = { ...ab('GRIND-1'), start: 150, end: 170 };
    const value = witness(
      [setup],
      [
        row(0, 120, 'A', 'produce', null, 'GRIND-1'),
        row(120, 150, 'A', 'repair', null, 'GRIND-1'),
        row(150, 170, 'A', 'repair', 'ab', 'GRIND-1'),
        row(170, 270, 'A', 'repair', null, 'GRIND-1'),
        row(270, 2520, 'A', 'idle', null, 'GRIND-1'),
      ],
      true,
    );
    const events: Event[] = [{ kind: 'failure', machineId: 'GRIND-1' }];
    expect(() => check(value, events)).not.toThrow();
    value.evidence.machineIntervals[4] = row(270, 2520, 'B', 'produce', null, 'GRIND-1');
    expect(() => check(value, events)).toThrow();
  });
  test('a genuine later A-to-C changeover may follow an invalid attempt that left A unchanged', () => {
    const value = witness(
      [
        { ...ab(), end: 19 },
        { id: 'ac', machineId: 'PRESS-1', from: 'A', to: 'C', start: 20, end: 50 },
      ],
      [
        row(0, 19, 'A', 'setup', 'ab'),
        row(19, 20, 'A'),
        row(20, 50, 'A', 'setup', 'ac'),
        row(50, 2520, 'C', 'produce'),
      ],
      true,
    );
    expect(() => check(value)).not.toThrow();
  });
  test('an honestly staff-invalid capacity projection may still have valid machine changeovers', () => {
    const value = witness([ab()], [row(0, 20, 'A', 'setup', 'ab'), row(20, 2520, 'B', 'produce')]);
    value.evidence.feasible = false;
    value.evidence.issues = [
      {
        code: 'STAFF_ASSIGNMENT',
        message: 'Counterfactual capacity only',
        severity: 'error',
        refs: ['run:PRESS'],
        start: 20,
        end: 2520,
      },
    ];
    expect(() => check(value)).not.toThrow();
  });
});
