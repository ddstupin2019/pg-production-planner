import { createRequire } from 'node:module';
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AxeResults } from 'axe-core';
import type { Report } from '../../src/domain/engine';
import type { Result } from '../../src/domain/model';
import type { Workflow, Revision } from '../../src/domain/workflow';

export const test = base.extend<{ runtimeGuard: void }>({
  runtimeGuard: [
    async ({ context }, use, testInfo) => {
      const remote: string[] = [];
      const errors: string[] = [];
      const local = (url: string) =>
        ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname);
      await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (/^https?:/.test(url) && !local(url)) {
          remote.push(url);
          await route.abort('blockedbyclient');
        } else await route.continue();
      });
      await context.routeWebSocket('**/*', async (socket) => {
        if (!local(socket.url())) {
          remote.push(socket.url());
          await socket.close({ code: 1008, reason: 'Offline runtime only' });
        } else socket.connectToServer();
      });
      context.on('page', (page) => {
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
      });
      await use();
      await testInfo.attach('runtime-guard', {
        body: JSON.stringify({ remote, errors }, null, 2),
        contentType: 'application/json',
      });
      expect(remote, 'all attempted remote HTTP and WebSocket traffic').toEqual([]);
      expect(errors, 'all console errors and uncaught page errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function axe(page: Page, label: string): Promise<void> {
  const require = createRequire(import.meta.url);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const result = await page.evaluate(async () => {
    const windowWithAxe = window as typeof window & { axe: { run: () => Promise<AxeResults> } };
    return windowWithAxe.axe.run();
  });
  await test.info().attach(`axe-${label}`, {
    body: JSON.stringify(result.violations, null, 2),
    contentType: 'application/json',
  });
  expect(
    result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
  ).toEqual([]);
}
export interface Exported {
  schemaVersion: 1;
  workflow: Workflow;
  evaluation: Result<Report>;
}
export function current(state: Workflow): Revision {
  return state.versions.find((v) => v.id === state.currentId)!;
}
export async function exported(
  page: Page,
): Promise<{ text: string; data: Exported; report: Report }> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт JSON', exact: true }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBe(null);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  const text = Buffer.concat(chunks).toString('utf8');
  const data = JSON.parse(text) as Exported;
  expect(Object.keys(data)).toEqual(['schemaVersion', 'workflow', 'evaluation']);
  expect(data.schemaVersion).toBe(1);
  expect(text).toBe(JSON.stringify(data, null, 2) + '\n');
  expect(data.evaluation.ok).toBe(true);
  if (!data.evaluation.ok) throw new Error(JSON.stringify(data.evaluation.errors));
  return { text, data, report: data.evaluation.value };
}
export async function theme(page: Page, dark: boolean): Promise<void> {
  const button = page.getByRole('button', { name: 'Тёмная тема', exact: true });
  if ((await button.getAttribute('aria-pressed')) !== String(dark)) await button.click();
  await expect(button).toHaveAttribute('aria-pressed', String(dark));
  await expect(page.getByText('Учебная симуляция', { exact: false }).first()).toBeVisible();
}
export async function noOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}
export async function approvePair(page: Page): Promise<void> {
  await page
    .getByRole('textbox', { name: 'Причина принятия рисков', exact: true })
    .fill('Риски показаны; исходные обязательства сохранены');
  await page.getByRole('button', { name: 'Отправить на согласование', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Состояние плана' })).toContainText(
    /ожидает|согласовани/i,
  );
  await page.getByRole('button', { name: 'Подтвердить версию', exact: true }).click();
  await page.getByRole('button', { name: 'Планировщик', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить версию', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Состояние плана' })).toContainText(/согласован/i);
  await page.getByRole('button', { name: 'Руководитель', exact: true }).click();
}
export async function choose(page: Page, value: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Вариант плана', exact: true }).selectOption(value);
  await page.getByRole('button', { name: 'Предпросмотр варианта', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Изменения плана' })).toBeVisible();
  await page.getByRole('button', { name: 'Применить вариант', exact: true }).click();
}
