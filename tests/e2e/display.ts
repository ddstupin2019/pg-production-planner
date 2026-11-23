import type { Locator, Page } from '@playwright/test';
import { current, expect } from './browser';
import type { exported } from './browser';
import { checkJobs } from '../support/work-witness';
import { readRenderedTable, validateTable } from '../support/table-snapshot';
import type { TableExpectation } from '../support/table-snapshot';

type Snapshot = Awaited<ReturnType<typeof exported>>;

export async function tableValues(table: Locator, expected: TableExpectation): Promise<void> {
  await expect(table).toHaveCount(1);
  await expect(async () => {
    validateTable(await table.evaluate(readRenderedTable), expected);
  }).toPass({ timeout: 5_000 });
}

export async function visibleNumbers(page: Page, report: Snapshot['report']): Promise<void> {
  expect(report.shifts).toHaveLength(4);
  await tableValues(page.getByRole('table', { name: 'Смены', exact: true }), {
    keyHeading: 'Смена',
    rows: report.shifts.map((shift) => ({
      key: `S${String(shift.shift)}`,
      fields: {
        'Выпуск A': shift.packed.A,
        'Выпуск B': shift.packed.B,
        'Выпуск C': shift.packed.C,
        Пик: shift.peak,
        'Труд, мин': shift.laborMinutes,
        'Резерв, мин': shift.reserveMinutes,
      },
    })),
  });
}

export async function comparisonValues(
  page: Page,
  alternatives: { choice: string; snapshot: Snapshot }[],
): Promise<void> {
  await tableValues(page.getByRole('table', { name: 'Сравнение вариантов', exact: true }), {
    keyHeading: 'Вариант',
    tokenKeys: true,
    rows: alternatives.map(({ choice, snapshot }) => {
      const { report, data } = snapshot;
      const revision = current(data.workflow);
      const coverage = checkJobs(report, revision.plan, revision.events);
      return {
        key: choice,
        fields: {
          'Физически допустим': report.feasible,
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
        },
      };
    }),
  });
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
  expect(report.shifts).toHaveLength(4);
  checkJobs(report, revision.plan, revision.events);
  const phases = { baseline: /базов|исходн/i, failure: /отказ|сбой|полом/i, absence: /отсутств/i };
  await tableValues(region.getByRole('table', { name: 'Паспорт: версия', exact: true }), {
    keyHeading: 'План',
    rows: [
      {
        key: revision.plan.id,
        fields: { Версия: revision.id, План: revision.plan.id, Фаза: phases[data.workflow.phase] },
      },
    ],
  });
  await tableValues(region.getByRole('table', { name: 'Паспорт: смены', exact: true }), {
    keyHeading: 'Смена',
    rows: report.shifts.map((shift) => ({
      key: `S${String(shift.shift)}`,
      fields: {
        'Выпуск A': shift.packed.A,
        'Выпуск B': shift.packed.B,
        'Выпуск C': shift.packed.C,
        Выполнено: shift.fulfilled,
        'Дефицит в срок': shift.dueDeficit,
      },
    })),
  });
  await tableValues(region.getByRole('table', { name: 'Паспорт: персонал', exact: true }), {
    keyHeading: 'Смена',
    rows: report.shifts.map((shift) => ({
      key: `S${String(shift.shift)}`,
      fields: {
        Заявка: shift.requested,
        Доступно: shift.available,
        Пик: shift.peak,
        'Труд, мин': shift.laborMinutes,
        'Резерв, мин': shift.reserveMinutes,
      },
    })),
  });
  await tableValues(region.getByRole('table', { name: 'Паспорт: заказы', exact: true }), {
    keyHeading: 'Заказ',
    rows: report.orders.map((result) => {
      const order = revision.plan.orders.find((order) => order.id === result.orderId)!;
      return {
        key: result.orderId,
        fields: {
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
        },
      };
    }),
  });
  expect(report.jobs).toHaveLength(revision.plan.jobs.length);
  await tableValues(region.getByRole('table', { name: 'Паспорт: работы', exact: true }), {
    keyHeading: 'Работа',
    rows: report.jobs.map((result) => {
      const job = revision.plan.jobs.find((job) => job.id === result.jobId)!;
      return {
        key: job.id,
        fields: {
          Код: job.code,
          Станок: job.machineId,
          Начало: job.start,
          Конец: job.end,
          'Зачтено, мин': result.creditedMinutes,
          Выполнена: result.complete,
        },
      };
    }),
  });
}
