import type { Locator, Page } from '@playwright/test';
import { current, expect } from './browser';
import type { exported } from './browser';
import { checkJobs } from '../support/work-witness';

type Snapshot = Awaited<ReturnType<typeof exported>>;
type Fields = Record<string, number | string | null>;

function numeric(text: string): number {
  return Number(text.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
}

async function cell(page: Page, table: Locator, key: string, heading: string): Promise<Locator> {
  const headings = (await table.getByRole('columnheader').allTextContents()).map((s) => s.trim());
  expect(headings.filter((s) => s === heading)).toHaveLength(1);
  const keyCell = page
    .getByRole('cell', { name: key, exact: true })
    .or(page.getByRole('rowheader', { name: key, exact: true }));
  const row = table.getByRole('row').filter({ has: keyCell });
  await expect(row).toHaveCount(1);
  return row.getByRole('cell').or(row.getByRole('rowheader')).nth(headings.indexOf(heading));
}

async function values(page: Page, table: Locator, key: string, expected: Fields): Promise<void> {
  for (const [heading, value] of Object.entries(expected)) {
    const target = await cell(page, table, key, heading);
    await expect(target).toBeVisible();
    const text = (await target.innerText()).trim();
    if (typeof value === 'number') {
      expect(text.length, `${key}/${heading}: missing number`).toBeGreaterThan(0);
      const actual = numeric(text);
      expect(Number.isFinite(actual), `${key}/${heading}: ${text}`).toBe(true);
      const tolerance = Number.isInteger(value) ? 1e-6 : 0.500001;
      expect(Math.abs(actual - value), `${key}/${heading}`).toBeLessThanOrEqual(tolerance);
    } else if (value === null) {
      expect(text.length, `${key}/${heading}: missing null disclosure`).toBeGreaterThan(0);
      expect(Number.isFinite(numeric(text)), `${key}/${heading}: null is not zero`).toBe(false);
    } else await expect(target).toHaveText(value);
  }
}

async function rowCount(page: Page, table: Locator, count: number): Promise<void> {
  const cells = page.getByRole('cell').or(page.getByRole('rowheader'));
  await expect(table.getByRole('row').filter({ has: cells })).toHaveCount(count);
}

async function booleanCell(
  page: Page,
  table: Locator,
  key: string,
  heading: string,
  value: boolean,
): Promise<void> {
  await expect(await cell(page, table, key, heading)).toHaveText(
    value
      ? /^(?:Да|Допустим|Выполнена|Завершена)$/i
      : /^(?:Нет|Недопустим|Не выполнена|Не завершена)$/i,
  );
}

export async function comparisonValues(
  page: Page,
  alternatives: { choice: string; snapshot: Snapshot }[],
): Promise<void> {
  const table = page.getByRole('table', { name: 'Сравнение вариантов', exact: true });
  await expect(table).toBeVisible();
  await rowCount(page, table, alternatives.length);
  for (const { choice, snapshot } of alternatives) {
    const { report, data } = snapshot;
    const revision = current(data.workflow);
    const coverage = checkJobs(report, revision.plan, revision.events);
    await booleanCell(page, table, choice, 'Физически допустим', report.feasible);
    await values(page, table, choice, {
      'Выпуск A': report.shifts.reduce((n, s) => n + s.packed.A, 0),
      'Выпуск B': report.shifts.reduce((n, s) => n + s.packed.B, 0),
      'Выпуск C': report.shifts.reduce((n, s) => n + s.packed.C, 0),
      'Исходный дефицит': report.orders.reduce((n, order) => n + order.originalDeficit, 0),
      'Пик S1': report.shifts[0]!.peak,
      'Пик S2': report.shifts[1]!.peak,
      'Пик S3': report.shifts[2]!.peak,
      'Пик S4': report.shifts[3]!.peak,
      'Труд, мин': report.shifts.reduce((n, shift) => n + shift.laborMinutes, 0),
      'Работы выполнено': coverage.reduce((n, row) => n + row.complete, 0),
      'Работы требуется': coverage.reduce((n, row) => n + row.required, 0),
    });
  }
}

export async function selectionRationale(page: Page, choice: string): Promise<void> {
  const region = page.getByRole('region', { name: 'Обоснование выбора', exact: true });
  await expect(region).toBeVisible();
  await expect(region).toContainText(choice);
  const reason = (await region.innerText()).replace(choice, '').trim();
  expect(reason.length, 'choice needs an explanation, not only a template ID').toBeGreaterThan(20);
  expect(reason).toMatch(/пик|персонал|труд|выпуск|дефицит|валидац|работ/i);
}

export async function passportValues(page: Page, snapshot: Snapshot): Promise<void> {
  const region = page.getByRole('region', { name: 'Паспорт сценария', exact: true });
  await expect(region).toBeVisible();
  const { report, data } = snapshot;
  const revision = current(data.workflow);
  checkJobs(report, revision.plan, revision.events);
  const version = region.getByRole('table', { name: 'Паспорт: версия', exact: true });
  await rowCount(page, version, 1);
  await values(page, version, revision.plan.id, { Версия: revision.id, План: revision.plan.id });
  const phases = { baseline: /базов|исходн/i, failure: /отказ|сбой|полом/i, absence: /отсутств/i };
  await expect(await cell(page, version, revision.plan.id, 'Фаза')).toHaveText(
    phases[data.workflow.phase],
  );
  const shifts = region.getByRole('table', { name: 'Паспорт: смены', exact: true });
  const staff = region.getByRole('table', { name: 'Паспорт: персонал', exact: true });
  await rowCount(page, shifts, 4);
  await rowCount(page, staff, 4);
  for (const shift of report.shifts) {
    const key = `S${String(shift.shift)}`;
    await values(page, shifts, key, {
      'Выпуск A': shift.packed.A,
      'Выпуск B': shift.packed.B,
      'Выпуск C': shift.packed.C,
      Выполнено: shift.fulfilled,
      'Дефицит в срок': shift.dueDeficit,
    });
    await values(page, staff, key, {
      Заявка: shift.requested,
      Доступно: shift.available,
      Пик: shift.peak,
      'Труд, мин': shift.laborMinutes,
      'Резерв, мин': shift.reserveMinutes,
    });
  }
  const orders = region.getByRole('table', { name: 'Паспорт: заказы', exact: true });
  await rowCount(page, orders, report.orders.length);
  for (const result of report.orders) {
    const order = revision.plan.orders.find((order) => order.id === result.orderId)!;
    await values(page, orders, result.orderId, {
      'Исходный объём': order.quantity,
      'Исходная смена': order.originalDue,
      'К исходному сроку': result.atOriginalDue,
      'Исходный дефицит': result.originalDeficit,
      'Обещанный объём': order.promise?.quantity ?? null,
      'Обещанная смена': order.promise?.due ?? null,
      'К обещанному сроку': result.atPromiseDue,
      'Дефицит обещания': result.promiseDeficit,
      'Выполнено S1': result.allocatedByShift[0],
      'Выполнено S2': result.allocatedByShift[1],
      'Выполнено S3': result.allocatedByShift[2],
      'Выполнено S4': result.allocatedByShift[3],
    });
  }
  const jobs = region.getByRole('table', { name: 'Паспорт: работы', exact: true });
  await rowCount(page, jobs, revision.plan.jobs.length);
  for (const result of report.jobs) {
    const job = revision.plan.jobs.find((job) => job.id === result.jobId)!;
    await values(page, jobs, job.id, {
      Код: job.code,
      Станок: job.machineId,
      Начало: job.start,
      Конец: job.end,
      'Зачтено, мин': result.creditedMinutes,
    });
    await booleanCell(page, jobs, job.id, 'Выполнена', result.complete);
  }
}
