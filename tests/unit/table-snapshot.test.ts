import { expect, test } from 'vitest';
import { validateTable } from '../support/table-snapshot';
import type { RenderedCell, RenderedTable, TableExpectation } from '../support/table-snapshot';

const cell = (text: string): RenderedCell => ({ text, visible: true });
function witness(): RenderedTable {
  return {
    visible: true,
    headings: ['Смена', 'Объём', 'Пик', 'Заявка', 'Статус', 'Фаза'].map(cell),
    rows: [['S1', '1\u202f234,568', '4', '—', 'Допустим', 'Базовый план'].map(cell)],
  };
}
function expected(): TableExpectation {
  return {
    keyHeading: 'Смена',
    rows: [
      {
        key: 'S1',
        fields: { Объём: 1234.5676, Пик: 4, Заявка: null, Статус: true, Фаза: /базов/i },
      },
    ],
  };
}

test('rendered snapshot validates all field types at the public display precision', () => {
  validateTable(witness(), expected());
  const snapshot = witness();
  snapshot.rows[0]![4]!.text = 'Не выполнена';
  const fields = expected();
  fields.rows[0]!.fields['Статус'] = false;
  fields.rows[0]!.fields['Фаза'] = 'Базовый план';
  validateTable(snapshot, fields);
});

const corruptions: [string, (table: RenderedTable) => void][] = [
  [
    'hidden table',
    (t) => {
      t.visible = false;
    },
  ],
  [
    'missing headings',
    (t) => {
      t.headings = [];
    },
  ],
  [
    'duplicate heading',
    (t) => {
      t.headings[1]!.text = 'Пик';
    },
  ],
  [
    'hidden heading',
    (t) => {
      t.headings[0]!.visible = false;
    },
  ],
  [
    'blank heading',
    (t) => {
      t.headings[0]!.text = '';
    },
  ],
  [
    'missing required column',
    (t) => {
      t.headings[1]!.text = 'Другое';
    },
  ],
  [
    'missing key column',
    (t) => {
      t.headings[0]!.text = 'Другое';
    },
  ],
  [
    'missing row',
    (t) => {
      t.rows = [];
    },
  ],
  [
    'extra row',
    (t) => {
      t.rows.push(t.rows[0]!);
    },
  ],
  [
    'unexpected key',
    (t) => {
      t.rows[0]![0]!.text = 'S2';
    },
  ],
  [
    'key in wrong column',
    (t) => {
      t.rows[0]![0]!.text = 'x';
      t.rows[0]![5]!.text = 'S1';
    },
  ],
  [
    'missing cell',
    (t) => {
      t.rows[0]!.pop();
    },
  ],
  [
    'extra cell',
    (t) => {
      t.rows[0]!.push(cell('x'));
    },
  ],
  [
    'hidden cell',
    (t) => {
      t.rows[0]![1]!.visible = false;
    },
  ],
  [
    'blank number',
    (t) => {
      t.rows[0]![1]!.text = '';
    },
  ],
  [
    'nonfinite number',
    (t) => {
      t.rows[0]![1]!.text = 'Infinity';
    },
  ],
  [
    'beyond three-decimal tolerance',
    (t) => {
      t.rows[0]![1]!.text = '1234.569';
    },
  ],
  [
    'rounded integer',
    (t) => {
      t.rows[0]![2]!.text = '4.0001';
    },
  ],
  [
    'null as zero',
    (t) => {
      t.rows[0]![3]!.text = '0';
    },
  ],
  [
    'blank null disclosure',
    (t) => {
      t.rows[0]![3]!.text = '';
    },
  ],
  [
    'wrong boolean',
    (t) => {
      t.rows[0]![4]!.text = 'Недопустим';
    },
  ],
  [
    'numeric boolean',
    (t) => {
      t.rows[0]![4]!.text = '1';
    },
  ],
  [
    'stale phase',
    (t) => {
      t.rows[0]![5]!.text = 'Отказ';
    },
  ],
];
test.each(corruptions)('%s fails snapshot validation', (_label, change) => {
  const table = witness();
  change(table);
  expect(() => validateTable(table, expected())).toThrow();
});

test('duplicate actual/expected row keys cannot hide a missing row at equal row count', () => {
  const table = witness();
  table.rows.push(structuredClone(table.rows[0]!));
  const fields = expected();
  fields.rows.push({ key: 'S2', fields: fields.rows[0]!.fields });
  expect(() => validateTable(table, fields)).toThrow(/duplicate row key/);
  fields.rows[1]!.key = 'S1';
  expect(() => validateTable(table, fields)).toThrow(/duplicate expected keys/);
});

test('comparison tokens match only in the variant column, never substrings or another column', () => {
  const fields: TableExpectation = {
    keyHeading: 'Вариант',
    tokenKeys: true,
    rows: [{ key: 'VAL2_PARALLEL', fields: { Пик: 4 } }],
  };
  const table: RenderedTable = {
    visible: true,
    headings: ['Вариант', 'Пик'].map(cell),
    rows: [['Параллельно (VAL2_PARALLEL)', '4'].map(cell)],
  };
  validateTable(table, fields);
  for (const invalid of ['XVAL2_PARALLEL', 'VAL2_PARALLEL_EXTRA', 'VAL2_PARALLEL-x']) {
    table.rows[0]![0]!.text = invalid;
    expect(() => validateTable(table, fields)).toThrow(/row key/);
  }
  table.rows[0] = ['Другой', 'VAL2_PARALLEL'].map(cell);
  expect(() => validateTable(table, fields)).toThrow(/row key/);
});

test('current revision, plan and values must match the supplied current export', () => {
  const table: RenderedTable = {
    visible: true,
    headings: ['План', 'Версия', 'Выпуск'].map(cell),
    rows: [['plan-2', '2', '15.3'].map(cell)],
  };
  const fields: TableExpectation = {
    keyHeading: 'План',
    rows: [{ key: 'plan-2', fields: { План: 'plan-2', Версия: 2, Выпуск: 15.3 } }],
  };
  validateTable(table, fields);
  for (const [index, stale] of [
    [0, 'plan-1'],
    [1, '1'],
    [2, '20.4'],
  ] as const) {
    const copy = structuredClone(table);
    copy.rows[0]![index]!.text = stale;
    expect(() => validateTable(copy, fields)).toThrow();
  }
});
