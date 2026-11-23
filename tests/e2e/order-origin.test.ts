import type { Page } from '@playwright/test';
import { test, expect, exported, current } from './browser';

test.setTimeout(90_000);

async function newOrder(page: Page, id: string, quantity: string, due: string) {
  await page.getByRole('button', { name: 'Добавить заказ', exact: true }).click();
  const form = page.getByRole('form', { name: 'Заказ', exact: true });
  await form.getByRole('textbox', { name: 'Код заказа', exact: true }).fill(id);
  await form.getByRole('combobox', { name: 'Продукт', exact: true }).selectOption('A');
  await form.getByLabel('Объём', { exact: true }).fill(quantity);
  await form.getByRole('combobox', { name: 'Срок (смена)', exact: true }).selectOption(due);
  await form.getByRole('combobox', { name: 'Приоритет', exact: true }).selectOption('low');
  return form;
}

test('renaming a draft custom order cannot permit changed originals through ID reuse in the form', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Планировщик', exact: true })).toBeVisible();
  const table = page.getByRole('table', { name: 'Заказы', exact: true });
  await expect(table).toBeVisible();
  const form = await newOrder(page, 'ORIGIN-X', '10', '1');
  await form.getByRole('button', { name: 'Сохранить заказ', exact: true }).click();
  await expect(form).not.toBeVisible();
  const created = await exported(page);
  expect(
    current(created.data.workflow).plan.orders.find((order) => order.id === 'ORIGIN-X'),
  ).toMatchObject({ quantity: 10, originalDue: 1 });

  const row = table.getByRole('row').filter({
    has: page
      .getByRole('cell', { name: 'ORIGIN-X', exact: true })
      .or(page.getByRole('rowheader', { name: 'ORIGIN-X', exact: true })),
  });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Изменить заказ', exact: true }).click();
  await form.getByRole('textbox', { name: 'Код заказа', exact: true }).fill('ORIGIN-Y');
  await form.getByRole('button', { name: 'Сохранить заказ', exact: true }).click();
  await expect(form).not.toBeVisible();
  const renamed = await exported(page);
  const orders = current(renamed.data.workflow).plan.orders;
  expect(orders.some((order) => order.id === 'ORIGIN-X')).toBe(false);
  expect(orders.find((order) => order.id === 'ORIGIN-Y')).toMatchObject({
    quantity: 10,
    originalDue: 1,
  });

  await newOrder(page, 'ORIGIN-X', '1', '4');
  const alertsBefore = await page.getByRole('alert').allTextContents();
  await form.getByRole('button', { name: 'Сохранить заказ', exact: true }).click();
  await expect.poll(() => page.getByRole('alert').allTextContents()).not.toEqual(alertsBefore);
  const alert = page.getByRole('alert').last();
  await expect(alert).toBeVisible();
  expect((await alert.innerText()).trim().length).toBeGreaterThan(0);
  await expect(form).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Код заказа', exact: true })).toHaveValue(
    'ORIGIN-X',
  );
  await expect(form.getByLabel('Объём', { exact: true })).toHaveValue('1');
  await expect(form.getByRole('combobox', { name: 'Срок (смена)', exact: true })).toHaveValue('4');
  // Normal modal cancellation permits the export without bypassing background inertness.
  const dialog = page.getByRole('dialog').filter({ has: form });
  await expect(dialog).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(form).not.toBeVisible();
  const rejected = await exported(page);
  expect(rejected.text).toBe(renamed.text);
  expect(rejected.data.workflow).toEqual(renamed.data.workflow);
});
