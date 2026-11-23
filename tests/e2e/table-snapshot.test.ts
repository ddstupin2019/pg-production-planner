import { test, expect } from './browser';
import { tableValues } from './display';
import { readRenderedTable, validateTable } from '../support/table-snapshot';

test.setTimeout(90_000);

test('snapshot reader scopes native rows/headers to one named table and keeps clipped cells visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.setContent(`
    <div style="width:100px;overflow-x:auto">
      <table aria-label="Снимок" style="width:1000px">
        <thead><tr><th>Ключ</th><th>Выпуск</th><th>Пик</th><th>Заявка</th><th>Статус</th></tr></thead>
        <tbody><tr><th scope="row">S1</th><td>1&#8239;234,568</td><td>4</td><td>—</td><td>Да</td></tr></tbody>
      </table>
    </div>
    <table aria-label="Другой"><tr><th>Ключ</th><th>Выпуск</th></tr><tr><td>S1</td><td>999</td></tr></table>
  `);
  const table = page.getByRole('table', { name: 'Снимок', exact: true });
  const start = performance.now();
  const snapshot = await table.evaluate(readRenderedTable);
  validateTable(snapshot, {
    keyHeading: 'Ключ',
    rows: [{ key: 'S1', fields: { Выпуск: 1234.5676, Пик: 4, Заявка: null, Статус: true } }],
  });
  expect(snapshot.headings).toHaveLength(5);
  expect(snapshot.rows).toHaveLength(1);
  expect(snapshot.rows[0]).toHaveLength(5);
  await test.info().attach('snapshot-read', {
    body: JSON.stringify({ tableEvaluations: 1, elapsedMs: performance.now() - start }),
    contentType: 'application/json',
  });
});

test('snapshot reader handles ARIA tables and rejects hidden cells from real rendered DOM', async ({
  page,
}) => {
  await page.setContent(`
    <div role="table" aria-label="Снимок">
      <div role="row"><span role="columnheader">Вариант</span><span role="columnheader">Версия</span></div>
      <div role="row"><span role="rowheader">Выбор (VAL2_PARALLEL)</span><span role="cell">2</span></div>
    </div>
  `);
  const table = page.getByRole('table', { name: 'Снимок', exact: true });
  const fields = {
    keyHeading: 'Вариант',
    tokenKeys: true,
    rows: [{ key: 'VAL2_PARALLEL', fields: { Версия: 2 } }],
  };
  await tableValues(table, fields);
  for (const style of ['display:none', 'visibility:hidden', 'content-visibility:hidden']) {
    // Synthetic helper fixture only, never modifying the application's DOM/state.
    await table
      .getByRole('cell', { includeHidden: true })
      .evaluate((cell, css) => cell.setAttribute('style', css), style);
    const snapshot = await table.evaluate(readRenderedTable);
    expect(snapshot.rows[0]![1]!.visible).toBe(false);
    expect(() => validateTable(snapshot, fields)).toThrow(/hidden cell/);
  }
});
