import {
  test,
  expect,
  axe,
  exported,
  current,
  theme,
  noOverflow,
  approvePair,
  choose,
} from './browser';
import type { Page } from '@playwright/test';
import { checkLedger, near, prefix, quantity } from '../support/ledger';
import { comparisonValues, passportValues, selectionRationale, visibleNumbers } from './display';

test.setTimeout(90_000);
async function verifiedExport(page: Page) {
  const snapshot = await exported(page);
  const revision = current(snapshot.data.workflow);
  checkLedger(snapshot.report, revision.plan, revision.events);
  return snapshot;
}
async function boot(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Учебная симуляция', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Планировщик', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Заказы', exact: true })).toBeVisible();
}
async function fixed(page: Page) {
  await page.getByRole('button', { name: 'Передать спрос', exact: true }).click();
  await page.getByRole('button', { name: 'Руководитель', exact: true }).click();
  const form = page.getByRole('form', { name: 'Заявка на персонал' });
  // Keep shipped counts: no uncontracted labor-minimizing optimizer assumption.
  for (const name of ['S1', 'S2']) {
    const field = form.getByRole('spinbutton', { name, exact: true });
    const value = Number(await field.inputValue());
    expect(Number.isInteger(value) && value >= 2).toBe(true);
    await field.fill(String(value));
  }
  await form
    .getByRole('textbox', { name: 'Резерв S1', exact: true })
    .fill('Резерв для отказа и перестроения');
  await form
    .getByRole('textbox', { name: 'Резерв S2', exact: true })
    .fill('Резерв на ночное отсутствие');
  await page.getByRole('button', { name: 'Зафиксировать заявки', exact: true }).click();
}

for (const width of [390, 1440])
  for (const dark of [false, true]) {
    test(`built offline complete lineage; ${String(width)}px ${dark ? 'dark' : 'light'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await boot(page);
      await theme(page, dark);
      await noOverflow(page);
      await axe(page, 'planner');
      await fixed(page);
      const alternatives = [];
      for (const choice of ['VAL2_STAGGERED', 'VAL2_PARALLEL']) {
        await choose(page, choice);
        const value = await verifiedExport(page);
        const revision = current(value.data.workflow);
        expect(value.report.feasible).toBe(true);
        checkLedger(value.report, revision.plan, revision.events);
        const jobs = revision.plan.jobs.filter((j) => j.code === 'VAL-2');
        expect(jobs).toHaveLength(2);
        expect(jobs.map((j) => j.machineId).sort()).toEqual(['GRIND-4', 'GRIND-5']);
        const intervals = jobs
          .sort((a, b) => a.machineId.localeCompare(b.machineId))
          .map((j) => [j.start, j.end]);
        expect(intervals).toEqual(
          choice === 'VAL2_PARALLEL'
            ? [
                [240, 420],
                [240, 420],
              ]
            : [
                [0, 180],
                [240, 420],
              ],
        );
        alternatives.push({ choice, snapshot: value });
      }
      expect(alternatives[0]!.snapshot.data.workflow.versions).not.toEqual([]);
      await page.getByRole('button', { name: 'Сравнить варианты', exact: true }).click();
      await comparisonValues(page, alternatives);
      await choose(page, 'VAL2_STAGGERED');
      await selectionRationale(page, 'VAL2_STAGGERED');
      await axe(page, 'manager');
      await approvePair(page);
      const baseline = await verifiedExport(page);
      const b = current(baseline.data.workflow);
      expect(b.status).toBe('agreed');
      expect(b.approvals.slice().sort()).toEqual(['manager', 'planner']);
      await visibleNumbers(page, baseline.report);
      await passportValues(page, baseline);
      await expect(page.getByRole('button', { name: 'Отсутствие S2', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Сбой GRIND-1', exact: true }).click();
      const failed = await verifiedExport(page);
      await passportValues(page, failed);
      expect(failed.data.workflow.phase).toBe('failure');
      expect(current(failed.data.workflow).events).toEqual([
        { kind: 'failure', machineId: 'GRIND-1' },
      ]);
      expect(prefix(failed.report, 120)).toEqual(prefix(baseline.report, 120));
      const at120 = baseline.report.machineIntervals.filter(
        (m) => m.machineId === 'GRIND-1' && m.kind === 'produce' && m.product === 'A' && m.rate > 0,
      );
      expect(at120.some((m) => m.start < 120 && m.end > 120)).toBe(true);
      expect(
        b.plan.jobs.some(
          (j) =>
            j.machineId === 'GRIND-1' && j.code.startsWith('VAL') && j.start < 270 && j.end > 120,
        ),
      ).toBe(false);
      await choose(page, 'REPAIR_G1_TO_G3');
      const transfer = await verifiedExport(page);
      await passportValues(page, transfer);
      const t = current(transfer.data.workflow);
      checkLedger(transfer.report, t.plan, t.events);
      expect(transfer.report.feasible).toBe(true);
      expect(quantity(transfer.report, 'GRIND-3', 120, 270)).toBeGreaterThan(
        quantity(failed.report, 'GRIND-3', 120, 270),
      );
      expect(prefix(transfer.report, 120)).toEqual(prefix(baseline.report, 120));
      near(
        transfer.report.machineIntervals
          .filter((m) => m.machineId === 'GRIND-1' && m.kind === 'repair')
          .reduce((n, m) => n + m.end - m.start, 0),
        150,
      );
      await approvePair(page);
      const failureAgreement = await verifiedExport(page);
      await passportValues(page, failureAgreement);
      await axe(page, 'failure-agreed');
      await page.getByRole('button', { name: 'Отсутствие S2', exact: true }).click();
      const absent = await verifiedExport(page);
      await passportValues(page, absent);
      expect(absent.data.workflow.phase).toBe('absence');
      expect(absent.data.workflow.lockedRequests).toEqual(baseline.data.workflow.lockedRequests);
      expect(absent.report.shifts[1]!.available).toBe(
        baseline.data.workflow.lockedRequests![1] - 2,
      );
      expect(prefix(absent.report, 630)).toEqual(prefix(failureAgreement.report, 630));
      await choose(page, 'NIGHT_WRAP_STAGGERED');
      const night = await verifiedExport(page);
      await passportValues(page, night);
      const n = current(night.data.workflow);
      checkLedger(night.report, n.plan, n.events);
      expect(night.report.feasible).toBe(true);
      for (let machine = 1; machine <= 15; machine++)
        expect(n.plan.setups).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              machineId: `WRAP-${String(machine)}`,
              from: 'B',
              to: 'C',
              start: machine <= 13 ? 915 : 940,
              end: machine <= 13 ? 940 : 965,
            }),
          ]),
        );
      expect(
        n.plan.setups.some(
          (s) => s.machineId === 'WRAP-16' && s.from === 'B' && s.to === 'C' && s.start === 915,
        ),
      ).toBe(false);
      expect(prefix(night.report, 630)).toEqual(prefix(failureAgreement.report, 630));
      await approvePair(page);
      const final = await verifiedExport(page);
      const f = current(final.data.workflow);
      expect(f.status).toBe('agreed');
      expect(f.events).toEqual([{ kind: 'failure', machineId: 'GRIND-1' }, { kind: 'absence' }]);
      expect(final.data.workflow.versions.find((v) => v.id === b.id)).toEqual(b);
      expect((await exported(page)).text).toBe(final.text);
      await visibleNumbers(page, final.report);
      await axe(page, 'absence-agreed');
      await noOverflow(page);
      await passportValues(page, final);
      const slides = page.getByRole('link', { name: 'Презентация', exact: true });
      const href = await slides.getAttribute('href');
      expect(href).toBeTruthy();
      const url = new URL(href!, page.url());
      expect(url.origin).toBe(new URL(page.url()).origin);
      const response = await page.request.get(url.toString(), { maxRedirects: 0 });
      expect(response.ok()).toBe(true);
      await page.getByRole('button', { name: 'Восстановить сценарий', exact: true }).click();
      const restored = await exported(page);
      expect(restored.data.workflow.phase).toBe('baseline');
      expect(restored.data.workflow.versions).toHaveLength(1);
      expect(restored.data.workflow.lockedRequests).toBe(null);
      expect(current(restored.data.workflow).plan.mode).toBe('required');
    });
  }

test('invalid custom order retains input, safe user text, real edit, reset cancel/confirm by keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await boot(page);
  const mandatory = await exported(page);
  await page.getByRole('button', { name: 'Добавить заказ', exact: true }).click();
  const form = page.getByRole('form', { name: 'Заказ', exact: true });
  await form.getByRole('textbox', { name: 'Код заказа', exact: true }).fill('CUSTOM-X');
  await form.getByRole('combobox', { name: 'Продукт', exact: true }).selectOption('A');
  const volume = form.getByLabel('Объём', { exact: true });
  await volume.fill('-1');
  await form.getByRole('combobox', { name: 'Срок (смена)', exact: true }).selectOption('2');
  await form.getByRole('combobox', { name: 'Приоритет', exact: true }).selectOption('low');
  await form.getByRole('button', { name: 'Сохранить заказ', exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(volume).toHaveValue('-1');
  await expect(form.getByRole('textbox', { name: 'Код заказа', exact: true })).toHaveValue(
    'CUSTOM-X',
  );
  await expect(form.getByRole('combobox', { name: 'Срок (смена)', exact: true })).toHaveValue('2');
  const orderDialog = page.getByRole('dialog').filter({ has: form });
  await expect(orderDialog).toHaveCount(1);
  await orderDialog.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(form).not.toBeVisible();
  expect((await exported(page)).text).toBe(mandatory.text);
  await page.getByRole('button', { name: 'Добавить заказ', exact: true }).click();
  await form.getByRole('combobox', { name: 'Продукт', exact: true }).selectOption('A');
  await form.getByRole('combobox', { name: 'Срок (смена)', exact: true }).selectOption('2');
  await form.getByRole('combobox', { name: 'Приоритет', exact: true }).selectOption('low');
  await volume.fill('2.5');
  await form
    .getByRole('textbox', { name: 'Код заказа', exact: true })
    .fill('<img src=x onerror=alert(1)>');
  await form.getByRole('button', { name: 'Сохранить заказ', exact: true }).click();
  const custom = await exported(page);
  expect(current(custom.data.workflow).plan.mode).toBe('custom');
  expect(current(custom.data.workflow).plan.orders).toHaveLength(7);
  await expect(page.getByText('Пользовательский сценарий', { exact: false }).first()).toBeVisible();
  await expect(
    page
      .getByRole('table', { name: 'Заказы' })
      .getByText('<img src=x onerror=alert(1)>', { exact: true }),
  ).toBeVisible();
  expect(await page.getByRole('table', { name: 'Заказы' }).getByRole('img').count()).toBe(0);
  const customRow = page.getByRole('row').filter({ hasText: '<img src=x onerror=alert(1)>' });
  await customRow.getByRole('button', { name: 'Изменить заказ', exact: true }).click();
  const edit = page.getByRole('form', { name: 'Заказ' });
  await expect(edit.getByLabel('Объём', { exact: true })).toHaveValue('2.5');
  await edit.getByLabel('Обещанный объём', { exact: true }).fill('1.5');
  await edit.getByRole('combobox', { name: 'Обещанная смена', exact: true }).selectOption('3');
  await edit
    .getByRole('textbox', { name: 'Причина обещания', exact: true })
    .fill('Частичный перенос');
  await edit.getByRole('button', { name: 'Сохранить обещание', exact: true }).click();
  const revised = await exported(page);
  const revision = current(revised.data.workflow);
  checkLedger(revised.report, revision.plan, revision.events);
  await passportValues(page, revised);
  const order = current(revised.data.workflow).plan.orders.find((o) => o.id.startsWith('<img'))!;
  expect(order).toMatchObject({
    quantity: 2.5,
    originalDue: 2,
    promise: { quantity: 1.5, due: 3, reason: 'Частичный перенос' },
  });
  // Reset is keyboard-initiated; focus must enter and remain in the modal.
  const reset = page.getByRole('button', { name: 'Сбросить', exact: true });
  await reset.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Сброс сценария' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click();
  expect((await exported(page)).text).toBe(revised.text);
  await reset.focus();
  await page.keyboard.press('Enter');
  const confirm = page
    .getByRole('dialog', { name: 'Сброс сценария' })
    .getByRole('button', { name: 'Подтвердить сброс', exact: true });
  await confirm.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).not.toBeVisible();
  expect((await exported(page)).text).toBe(mandatory.text);
  await axe(page, 'restored');
  await noOverflow(page);
});

test('role gates and a keyboard-operable order form, both actual theme palettes', async ({
  page,
}) => {
  await boot(page);
  await expect(page.getByRole('button', { name: 'Сбой GRIND-1', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Руководитель', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Передать спрос', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Зафиксировать заявки', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Планировщик', exact: true }).click();
  await theme(page, false);
  const toggle = page.getByRole('button', { name: 'Тёмная тема', exact: true });
  await toggle.focus();
  const palette = () =>
    page.evaluate(() =>
      Array.from(document.getElementsByTagName('*'), (element) => {
        const style = getComputedStyle(element);
        return [style.color, style.backgroundColor];
      }),
    );
  const light = await palette();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const dark = await palette();
  expect(dark).not.toEqual(light);
  const add = page.getByRole('button', { name: 'Добавить заказ', exact: true });
  await add.focus();
  await page.keyboard.press('Enter');
  const form = page.getByRole('form', { name: 'Заказ' });
  const id = form.getByRole('textbox', { name: 'Код заказа', exact: true });
  await id.focus();
  await page.keyboard.type('KEYBOARD');
  await page.keyboard.press('Tab');
  expect(await form.evaluate((f) => f.contains(document.activeElement))).toBe(true);
  await expect(id).toHaveValue('KEYBOARD');
  await axe(page, 'keyboard-dark');
});
