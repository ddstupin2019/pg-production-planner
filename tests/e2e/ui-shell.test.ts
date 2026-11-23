import type { Page } from '@playwright/test';
import { test, expect, noOverflow, theme } from './browser';

const sections = ['overview', 'orders', 'planning', 'resources', 'history', 'passport'];

async function boot(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'Тёмная тема', exact: true })).toBeVisible();
}

async function currentSection(page: Page, id: string): Promise<void> {
  const navigation = page.getByRole('navigation', { name: 'Разделы плана' });
  await expect(navigation.locator('[aria-current]')).toHaveCount(1);
  await expect(navigation.locator(`[href="#${id}"]`)).toHaveAttribute('aria-current', 'location');
}

async function palette(page: Page, dark: boolean): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', dark ? 'dark' : 'light');
  await expect(page.getByRole('button', { name: 'Тёмная тема', exact: true })).toHaveAttribute(
    'aria-pressed',
    String(dark),
  );
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    dark ? 'rgb(23, 27, 34)' : 'rgb(243, 244, 240)',
  );
  await expect(page.locator('.sidebar')).toHaveCSS(
    'background-color',
    dark ? 'rgb(28, 36, 49)' : 'rgb(37, 49, 67)',
  );
  await expect(page.locator('.topbar')).toHaveCSS(
    'background-color',
    dark ? 'rgb(32, 38, 48)' : 'rgb(255, 255, 255)',
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    dark ? '#171b22' : '#f3f4f0',
  );
}

test('fresh light theme ignores OS dark; explicit choices persist and apply before app code', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await boot(page);
  await palette(page, false);
  const toggle = page.getByRole('button', { name: 'Тёмная тема', exact: true });
  await toggle.focus();
  await page.keyboard.press('Space');
  await palette(page, true);
  await expect(toggle).toBeFocused();

  const beforeApp: { theme: string | undefined; color: string; chrome: string | null }[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (/\/assets\/.*\.js$/.test(url.pathname) || url.pathname === '/src/main.ts') {
      beforeApp.push(
        await page.evaluate(() => ({
          theme: document.documentElement.dataset['theme'],
          color: getComputedStyle(document.documentElement).backgroundColor,
          chrome:
            document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
        })),
      );
    }
    await route.fallback();
  });
  await page.reload();
  await palette(page, true);
  expect(beforeApp.length).toBeGreaterThan(0);
  expect(beforeApp[0]).toEqual({
    theme: 'dark',
    color: 'rgb(23, 27, 34)',
    chrome: '#171b22',
  });
  await toggle.click();
  await page.reload();
  await palette(page, false);
});

for (const denial of ['access', 'write'] as const) {
  test(`storage ${denial} denial keeps rendering, keyboard toggle and rerenders usable`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      if (mode === 'access') {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new DOMException('Storage blocked', 'SecurityError');
          },
        });
      } else {
        Storage.prototype.setItem = () => {
          throw new DOMException('Storage full', 'QuotaExceededError');
        };
      }
    }, denial);
    await boot(page);
    await palette(page, false);
    await page.getByRole('button', { name: 'Тёмная тема', exact: true }).focus();
    await page.keyboard.press('Enter');
    await palette(page, true);
    await page.getByRole('button', { name: 'Руководитель', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Руководитель', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await palette(page, true);
    await page.reload();
    await palette(page, false);
    await theme(page, true);
    await palette(page, true);
  });
}

test('direct hash, link clicks, history and changed hashes synchronize section and focus', async ({
  page,
}) => {
  await boot(page, '/#resources');
  await currentSection(page, 'resources');
  await expect(page.locator('#resources')).toBeFocused();
  const navigation = page.getByRole('navigation', { name: 'Разделы плана' });
  await navigation.locator('[href="#history"]').click();
  await currentSection(page, 'history');
  await navigation.locator('[href="#planning"]').click();
  await currentSection(page, 'planning');
  await page.goBack();
  await currentSection(page, 'history');
  await expect(page.locator('#history')).toBeFocused();
  await page.goBack();
  await currentSection(page, 'resources');
  await page.goForward();
  await currentSection(page, 'history');
  await page.evaluate(() => {
    window.location.hash = '#orders';
  });
  await currentSection(page, 'orders');
  await expect(page.locator('#orders')).toBeFocused();
});

test('scroll in both directions tracks actual section without creating history entries', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page);
  const historyLength = await page.evaluate(() => window.history.length);
  for (const id of [...sections, ...sections.toReversed()]) {
    await page.evaluate((target) => {
      document.getElementById(target)!.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, id);
    await currentSection(page, id);
  }
  expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
  expect(new URL(page.url()).hash).toBe('');
});

test('rerendered shell keeps one current link and one navigation action', async ({ page }) => {
  await boot(page);
  for (let iteration = 0; iteration < 4; iteration++) {
    const role = iteration % 2 === 0 ? 'Руководитель' : 'Планировщик';
    await page.getByRole('button', { name: role, exact: true }).click();
    await expect(page.getByRole('button', { name: role, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  const historyLength = await page.evaluate(() => window.history.length);
  await page.locator('.sidebar nav [href="#passport"]').click();
  await currentSection(page, 'passport');
  expect(await page.evaluate(() => window.history.length)).toBe(historyLength + 1);
  await page.getByRole('button', { name: 'Восстановить сценарий', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Планировщик', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await currentSection(page, 'passport');
  await page.locator('.sidebar nav [href="#orders"]').click();
  await currentSection(page, 'orders');
  await page.goBack();
  await currentSection(page, 'passport');
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1440, height: 480 },
  { width: 390, height: 844 },
]) {
  test(`all six links are keyboard reachable in both themes at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await boot(page);
    for (const dark of [false, true]) {
      await theme(page, dark);
      for (const id of sections) {
        const anchor = page.locator(`.sidebar nav [href="#${id}"]`);
        await anchor.focus();
        await expect(anchor).toBeInViewport();
        await page.keyboard.press('Enter');
        await currentSection(page, id);
        await expect(page.locator(`#${id}`)).toBeFocused();
        const position = await page.locator(`#${id}`).boundingBox();
        const header = await page.locator('.topbar').boundingBox();
        expect(position!.y).toBeGreaterThanOrEqual(header!.height);
        expect(position!.y).toBeLessThan(viewport.height);
      }
      await noOverflow(page);
    }
  });
}

test('default copy is materially shorter without concealing public tables; print retains limits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page);
  const words = (await page.locator('main').innerText()).trim().split(/\s+/).length;
  test.info().annotations.push({ type: 'visible-main-words', description: `1701 → ${words}` });
  expect(words).toBeLessThanOrEqual(1445);
  for (const name of [
    'Смены',
    'Заказы',
    'Работы',
    'Оборудование',
    'Материалы',
    'Персонал',
    'Версии',
    'Паспорт: версия',
    'Паспорт: смены',
    'Паспорт: персонал',
    'Паспорт: заказы',
    'Паспорт: работы',
  ]) {
    await expect(page.getByRole('table', { name, exact: true })).toBeVisible();
  }
  await theme(page, true);
  await page.emulateMedia({ media: 'print' });
  const passport = page.getByRole('region', { name: 'Паспорт сценария', exact: true });
  await expect(passport.getByText(/Пилот не проводился/)).toBeVisible();
  await expect(passport.getByText(/Границы: только GRIND-1/)).toBeVisible();
  await expect(passport.locator('.assumptions')).toBeVisible();
  await expect(passport.getByText(/не полный журнал/)).toBeVisible();
});

test('slides stay neutral light under OS dark, have local navigation and ten print-sized pages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/slides.html');
  await expect(page.locator('.slide')).toHaveCount(10);
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(241, 243, 247)');
  await expect(page.locator('.slide').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('link', { name: 'Слайд 6', exact: true }).click();
  await expect(page).toHaveURL(/#s6$/);
  await expect(page.locator('#s6')).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.setViewportSize({ width: 1122, height: 900 });
  await page.emulateMedia({ media: 'print' });
  // Check page geometry without creating a PDF/artifact. Actual PDF page count is a delivery check.
  const geometry = await page.locator('.slide').evaluateAll((slides) =>
    slides.map((slide) => ({
      height: slide.getBoundingClientRect().height,
      overflow: slide.scrollHeight - slide.clientHeight,
      breakAfter: getComputedStyle(slide).breakAfter,
    })),
  );
  expect(geometry).toHaveLength(10);
  for (const [index, slide] of geometry.entries()) {
    expect(slide.height).toBeLessThanOrEqual((194 * 96) / 25.4);
    expect(slide.overflow).toBeLessThanOrEqual(1);
    expect(slide.breakAfter).toBe(index === 9 ? 'auto' : 'page');
  }
});
