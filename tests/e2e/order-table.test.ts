import { test, expect } from './browser';

test.setTimeout(90_000);

test('exact order-table and row scoping tolerate duplicated literal user text in the passport', async ({
  page,
}) => {
  const literal = '<img src=x onerror=alert(1)>';
  await page.setContent(`
    <table aria-label="Заказы">
      <tr><th>Заказ</th><th>Действие</th></tr>
      <tr><th scope="row">&lt;img src=x onerror=alert(1)&gt;</th>
        <td><button>Изменить заказ</button></td></tr>
    </table>
    <table aria-label="Паспорт: заказы">
      <tr><th>Заказ</th><th>Действие</th></tr>
      <tr><td>&lt;img src=x onerror=alert(1)&gt;</td>
        <td><button>Изменить заказ</button></td></tr>
    </table>
  `);
  await expect(page.getByText(literal, { exact: true })).toHaveCount(2);
  const orders = page.getByRole('table', { name: 'Заказы', exact: true });
  await expect(orders).toHaveCount(1);
  await expect(orders.getByText(literal, { exact: true })).toBeVisible();
  expect(await orders.getByRole('img').count()).toBe(0);
  const row = orders.getByRole('row').filter({
    has: page
      .getByRole('cell', { name: literal, exact: true })
      .or(page.getByRole('rowheader', { name: literal, exact: true })),
  });
  await expect(row).toHaveCount(1);
  const edit = row.getByRole('button', { name: 'Изменить заказ', exact: true });
  await edit.click();
  await expect(edit).toBeFocused();
});
