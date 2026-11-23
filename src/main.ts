import './styles.css';
import { evaluate } from './domain/engine';
import type { Report } from './domain/engine';
import {
  EPSILON,
  INITIAL_STOCKS,
  MACHINES,
  NOMINAL_RATES,
  REQUIRED_ORDERS,
  REQUIRED_WORK,
  ROUTES,
  SETUP_MINUTES,
} from './domain/model';
import type { Issue, Order, Plan, Product, Result, Role, Shift } from './domain/model';
import { applyTemplate, createScenarioPlan } from './domain/scenario';
import type { Template } from './domain/scenario';
import { createWorkflow, exportWorkflow, transition } from './domain/workflow';
import type { Action, Revision, Workflow } from './domain/workflow';

type Child = Node | string | number | null;
type Cell = Child | boolean;
interface Candidate {
  code: Template;
  plan: Plan | null;
  report: Report | null;
  issues: Issue[];
}

const root = document.querySelector<HTMLDivElement>('#app')!;
const numbers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });
const roles: Record<Role, string> = { planner: 'Планировщик', manager: 'Руководитель' };
const statuses = { draft: 'Черновик', pending: 'На согласовании', agreed: 'Согласован' };
const phases = { baseline: 'Базовый план', failure: 'Сбой GRIND-1', absence: 'Отсутствие S2' };
const templates: Record<Template, string> = {
  VAL2_STAGGERED: 'Последовательная VAL-2',
  VAL2_PARALLEL: 'Параллельная VAL-2',
  REPAIR_G1_TO_G3: 'Перенос A с GRIND-1 на GRIND-3',
  NIGHT_WRAP_STAGGERED: 'Ночная переналадка WRAP в две волны',
};
const issueLabels: Record<string, string> = {
  INVALID_INPUT: 'Проверьте формат данных и диапазоны значений.',
  SOURCE_CHANGED:
    'Исходные объём и срок неизменяемы. Используйте обещание или пользовательскую копию.',
  EVENT_ORDER: 'Сначала согласуйте базовый план, затем сбой, затем отсутствие.',
  EVENT_TARGET:
    'GRIND-1 должен фактически выпускать A в момент t=120. Проверьте работы или восстановите сценарий.',
  SETUP_REQUIRED: 'Настройка станка не соответствует продукту: нужна переналадка.',
  MACHINE_CONFLICT: 'На станке пересекаются несовместимые работы.',
  WORK_WINDOW: 'Обязательная работа выходит за разрешённое окно.',
  WORK_DURATION: 'Длительность обязательной работы не соответствует условию.',
  WORK_MISSING: 'Не выполнен полный набор обязательных работ.',
  VALIDATION_OUTPUT: 'Валидация требует непрерывного фактического выпуска и отдельного работника.',
  STAFF_SHORTAGE:
    'Требуемый персонал превышает доступный. Перераспределите работы; заявки уже нельзя увеличить.',
  STAFF_ASSIGNMENT:
    'Проверьте назначения: нужен доступный отдельный работник на каждую одновременную задачу.',
  ORDER_SHORTFALL:
    'Часть заказа не обеспечена к обязательному сроку. Дефицит не скрывается новым обещанием.',
  QUOTA_SHORTFALL: 'Кампания не выбрала квоту: проверьте подачу материала, окно и простои.',
  WORKFLOW_GUARD:
    'Действие недоступно в текущей роли или стадии. Проверьте спрос, заявки и согласование.',
  UNSUPPORTED_FAILURE_TARGET: 'Учебный сценарий поддерживает только сбой GRIND-1 при выпуске A.',
  UNSUPPORTED_FAILURE_VALIDATION:
    'Валидация на GRIND-1 пересекает ремонт [120,270). Её восстановление вне сценария: пересмотрите работы или восстановите сценарий.',
};

let state: Workflow;
let dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let busy = false;
let preview: Candidate | null = null;
let alternatives: Candidate[] = [];
let selectedTemplate: Template = 'VAL2_STAGGERED';
let choiceReason = '';
let staffDirty = false;
let notice = 'Начните с проверки заказов и передачи спроса руководителю.';
let noticeError = false;
const reports = new Map<string, Result<Report>>();
const candidateCache = new Map<string, Candidate>();
const live = document.createElement('div');
live.className = 'sr-only';
live.setAttribute('role', 'status');
live.setAttribute('aria-live', 'polite');
document.body.append(live);

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  for (const child of children) {
    if (child !== null) element.append(child instanceof Node ? child : String(child));
  }
  return element;
}

function value(cell: Cell): Node | string {
  if (cell instanceof Node) return cell;
  if (cell === null) return '—';
  if (typeof cell === 'boolean') return cell ? 'Да' : 'Нет';
  return typeof cell === 'number' ? numbers.format(Math.abs(cell) < EPSILON ? 0 : cell) : cell;
}

function text(content: string, className = 'muted'): HTMLParagraphElement {
  return node('p', className, content);
}

function button(
  label: string,
  action: () => void,
  className = 'button',
  disabled = false,
  id = '',
): HTMLButtonElement {
  const control = node('button', className, label);
  control.type = 'button';
  control.disabled = disabled;
  if (id) control.id = id;
  control.addEventListener('click', action);
  return control;
}

function link(label: string, href: string, className = ''): HTMLAnchorElement {
  const anchor = node('a', className, label);
  anchor.href = href;
  return anchor;
}

function badge(label: string, tone = ''): HTMLElement {
  return node('span', `badge ${tone}`, label);
}

function section(id: string, number: string, title: string, description: string): HTMLElement {
  const area = node('section', 'section');
  area.id = id;
  area.tabIndex = -1;
  area.setAttribute('aria-labelledby', `${id}-title`);
  const heading = node('h2', '', node('span', 'section-number', number), title);
  heading.id = `${id}-title`;
  area.append(node('div', 'section-heading', heading, text(description)));
  return area;
}

function region(name: string, className = 'panel'): HTMLElement {
  const area = node('section', className);
  area.setAttribute('aria-label', name);
  return area;
}

function details(label: string, ...children: Child[]): HTMLDetailsElement {
  return node('details', 'disclosure', node('summary', '', label), ...children);
}

function table(name: string, headers: string[], rows: Cell[][], pageSize = 16): HTMLElement {
  const container = node('div', 'table-block');
  const scroll = node('div', 'table-scroll');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', `${name}: прокрутка таблицы`);
  const grid = node('table');
  grid.append(node('caption', '', name));
  const head = node('tr');
  for (const header of headers) {
    const cell = node('th', '', header);
    cell.scope = 'col';
    head.append(cell);
  }
  grid.append(node('thead', '', head));
  const body = node('tbody');
  grid.append(body);
  scroll.append(grid);
  container.append(scroll);
  let page = 0;
  const pageLabel = node('span', 'muted');
  const previous = button('← Назад', () => draw(page - 1), 'button subtle');
  const next = button('Далее →', () => draw(page + 1), 'button subtle');
  previous.setAttribute('aria-label', `← Назад · ${name}: предыдущая страница`);
  next.setAttribute('aria-label', `Далее → · ${name}: следующая страница`);
  const paging = node('div', 'pagination', pageLabel, node('div', 'actions', previous, next));
  if (rows.length > pageSize) container.append(paging);
  function draw(index: number): void {
    page = index;
    body.replaceChildren();
    for (const row of rows.slice(page * pageSize, (page + 1) * pageSize)) {
      const tr = node('tr');
      row.forEach((content, column) => {
        const cell = column === 0 ? node('th') : node('td');
        if (cell instanceof HTMLTableCellElement && column === 0) cell.scope = 'row';
        cell.append(value(content));
        tr.append(cell);
      });
      body.append(tr);
    }
    if (!rows.length) {
      const empty = node('td', 'empty', 'Нет строк для выбранного фильтра.');
      empty.colSpan = headers.length;
      body.append(node('tr', '', empty));
    }
    pageLabel.textContent = `${Math.min(page * pageSize + 1, rows.length)}–${Math.min((page + 1) * pageSize, rows.length)} из ${rows.length}`;
    previous.disabled = page === 0;
    next.disabled = (page + 1) * pageSize >= rows.length;
    if (document.activeElement === next && next.disabled) previous.focus();
    if (document.activeElement === previous && previous.disabled) next.focus();
  }
  draw(0);
  return container;
}

function current(): Revision {
  return state.versions.find((revision) => revision.id === state.currentId)!;
}

function fingerprint(revision: Revision): string {
  return JSON.stringify([revision.plan, revision.events]);
}

function reportFor(revision: Revision): Result<Report> {
  const key = fingerprint(revision);
  const cached = reports.get(key);
  if (cached) return cached;
  const result = evaluate({ plan: revision.plan, events: revision.events });
  if (reports.size >= 16) reports.delete(reports.keys().next().value!);
  reports.set(key, result);
  return result;
}

function totals(report: Report): {
  packed: Record<Product, number>;
  deficit: number;
  labor: number;
} {
  return {
    packed: {
      A: report.shifts.reduce((sum, row) => sum + row.packed.A, 0),
      B: report.shifts.reduce((sum, row) => sum + row.packed.B, 0),
      C: report.shifts.reduce((sum, row) => sum + row.packed.C, 0),
    },
    deficit: report.orders.reduce((sum, row) => sum + row.originalDeficit, 0),
    labor: report.shifts.reduce((sum, row) => sum + row.laborMinutes, 0),
  };
}

function errorsView(issues: Issue[], title = 'Проверьте ограничения'): HTMLElement {
  const box = node('div', 'issue-box');
  box.append(node('h3', '', title));
  const groups = [...new Set(issues.map((issue) => issue.code))];
  for (const code of groups) {
    const matching = issues.filter((issue) => issue.code === code);
    box.append(
      text(`${code} · ${matching.length}: ${issueLabels[code] ?? 'Проверьте данные модели.'}`, ''),
    );
  }
  box.append(
    details(
      `Подробности (${issues.length})`,
      table(
        'Ограничения',
        ['Код', 'Уровень', 'Объекты', 'Начало', 'Конец', 'Сообщение модели'],
        issues.map((issue) => [
          issue.code,
          issue.severity === 'error' ? 'Конфликт' : 'Предупреждение',
          issue.refs.join(', '),
          issue.start,
          issue.end,
          issue.message,
        ]),
      ),
    ),
  );
  return box;
}

function announce(message: string, error = false): void {
  notice = message;
  noticeError = error;
  live.textContent = message;
}

function invalidatePreview(): void {
  preview = null;
  const area = document.querySelector<HTMLElement>('#preview-content');
  if (area)
    area.replaceChildren(text('Параметры изменены. Сохраните их и заново откройте предпросмотр.'));
  const apply = document.querySelector<HTMLButtonElement>('#apply-template');
  if (apply) apply.disabled = true;
}

function execute(action: Action, success: string): boolean {
  const result = transition(state, action);
  if (!result.ok) {
    announce(
      result.errors
        .map((issue) => `${issue.code}: ${issueLabels[issue.code] ?? issue.message}`)
        .join(' '),
      true,
    );
    return false;
  }
  state = result.value;
  staffDirty = false;
  if (action.type !== 'switch-role') {
    preview = null;
    alternatives = [];
    choiceReason = '';
    candidateCache.clear();
  }
  if (action.type === 'apply-failure') selectedTemplate = 'REPAIR_G1_TO_G3';
  if (action.type === 'apply-absence') selectedTemplate = 'NIGHT_WRAP_STAGGERED';
  if (action.type === 'restore-scenario') selectedTemplate = 'VAL2_STAGGERED';
  announce(success);
  return true;
}

function work(task: () => void, focusId = ''): void {
  if (busy) return;
  busy = true;
  root.setAttribute('aria-busy', 'true');
  live.textContent = 'Пересчитываем производственный план…';
  const oldFocus = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
  document.body.classList.add('calculating');
  window.setTimeout(() => {
    try {
      task();
    } catch (error) {
      announce(
        `Расчёт не завершён: ${error instanceof Error ? error.message : 'неизвестная ошибка'}. Восстановите сценарий.`,
        true,
      );
    } finally {
      busy = false;
      document.body.classList.remove('calculating');
      render();
      root.removeAttribute('aria-busy');
      const target = document.getElementById(focusId || oldFocus);
      if (target instanceof HTMLButtonElement && target.disabled) {
        document.getElementById('plan-state')?.focus({ preventScroll: true });
      } else target?.focus({ preventScroll: true });
    }
  }, 20);
}

function act(action: Action, message: string, focusId = ''): void {
  work(() => {
    execute(action, message);
  }, focusId);
}

function candidate(code: Template): Candidate {
  const revision = current();
  const key = `${fingerprint(revision)}|${code}`;
  const cached = candidateCache.get(key);
  if (cached) return cached;
  const applied = applyTemplate(revision.plan, revision.events, code);
  let result: Candidate;
  if (!applied.ok) result = { code, plan: null, report: null, issues: applied.errors };
  else {
    const evaluated = evaluate({ plan: applied.value, events: revision.events });
    result = evaluated.ok
      ? { code, plan: applied.value, report: evaluated.value, issues: evaluated.value.issues }
      : { code, plan: applied.value, report: null, issues: evaluated.errors };
  }
  candidateCache.set(key, result);
  return result;
}

function select(name: string, options: [string, string][], selected: string): HTMLSelectElement {
  const control = node('select');
  control.name = name;
  control.id = `field-${name}`;
  for (const [optionValue, label] of options) {
    const option = node('option', '', label);
    option.value = optionValue;
    option.selected = optionValue === selected;
    control.append(option);
  }
  return control;
}

function input(name: string, initial: string, type = 'text'): HTMLInputElement {
  const control = node('input');
  control.name = name;
  control.id = `field-${name}`;
  control.type = type;
  control.value = initial;
  return control;
}

function field(label: string, control: HTMLElement, hint = ''): HTMLElement {
  const caption = node('label', '', label);
  caption.htmlFor = control.id;
  const wrapper = node('div', 'field', caption, control);
  if (hint) {
    const help = node('small', 'muted', hint);
    help.id = `${control.id}-hint`;
    control.setAttribute('aria-describedby', help.id);
    wrapper.append(help);
  }
  return wrapper;
}

function numberValue(control: HTMLInputElement): number {
  return control.value.trim() ? Number(control.value.trim().replace(',', '.')) : NaN;
}

function showFieldErrors(
  form: HTMLFormElement,
  box: HTMLElement,
  errors: [HTMLElement, string][],
): void {
  for (const element of form.querySelectorAll('[aria-invalid]'))
    element.removeAttribute('aria-invalid');
  box.replaceChildren();
  if (!errors.length) return;
  box.hidden = false;
  for (const [control, message] of errors) {
    control.setAttribute('aria-invalid', 'true');
    box.append(text(message, ''));
  }
  errors[0]?.[0].focus();
}

function shell(report: Report | null): HTMLElement {
  document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
  const frame = node('div', 'app-shell');
  const skip = link('К основному содержимому', '#overview', 'skip-link');
  const side = node('aside', 'sidebar');
  const brand = node(
    'div',
    'brand',
    node('span', 'brand-mark', 'К'),
    node('div', '', node('strong', '', 'КОНТУР'), node('small', '', 'ПЛАНИРОВАНИЕ')),
  );
  const navigation = node('nav');
  navigation.setAttribute('aria-label', 'Разделы плана');
  const items = [
    ['overview', '01', 'Обзор плана'],
    ['orders', '02', 'Заказы и спрос'],
    ['planning', '03', 'Варианты и решение'],
    ['resources', '04', 'Ресурсы и работы'],
    ['history', '05', 'Согласование'],
    ['passport', '06', 'Паспорт сценария'],
  ];
  for (const [id, index, label] of items) navigation.append(link(`${index}  ${label}`, `#${id}`));
  side.append(
    brand,
    node('div', 'sidebar-label', 'РАБОЧЕЕ ПРОСТРАНСТВО'),
    navigation,
    node(
      'div',
      'sidebar-footer',
      badge('Локальный сценарий', 'cool'),
      text('4 смены · 2 роли\nОдин прозрачный план'),
      link('Презентация ↗', '/slides.html'),
    ),
  );
  const body = node('div', 'workspace');
  const header = node('header', 'topbar');
  const switcher = node('div', 'role-switch');
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'Учебная роль');
  for (const role of ['planner', 'manager'] as const) {
    const control = button(
      roles[role],
      () =>
        act({ type: 'switch-role', role }, `Выбрана роль: ${roles[role]}. Это не аутентификация.`),
      'role-button',
      false,
      `role-${role}`,
    );
    control.setAttribute('aria-pressed', String(state.role === role));
    switcher.append(control);
  }
  const theme = button(
    'Тёмная тема',
    () => {
      dark = !dark;
      document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
      document.getElementById('theme')?.setAttribute('aria-pressed', String(dark));
    },
    'button subtle theme-button',
    false,
    'theme',
  );
  theme.setAttribute('aria-pressed', String(dark));
  header.append(
    node(
      'div',
      'breadcrumb',
      'Производство',
      node('span', '', '/'),
      node('strong', '', 'План на D+1 — D+2'),
    ),
    node('div', 'header-controls', switcher, theme),
  );
  const main = node('main', 'main-content');
  const disclosure = node(
    'div',
    'simulation',
    node('strong', '', 'Учебная симуляция'),
    node('span', '', 'Не MES и не оптимизатор. Без сервера. Переключение ролей — не авторизация.'),
  );
  const intro = node(
    'div',
    'page-intro',
    node(
      'div',
      '',
      text('ОПЕРАЦИОННЫЙ ГОРИЗОНТ / 48 ЧАСОВ', 'eyebrow'),
      node('h1', '', 'Производственный план'),
      text('Сначала спрос. Затем ресурсы. Решение — вместе.'),
    ),
    badge(
      current().plan.mode === 'custom' ? 'Пользовательский сценарий' : 'Исходный сценарий',
      current().plan.mode === 'custom' ? 'warm' : 'cool',
    ),
  );
  const status = region('Состояние плана', 'state-strip');
  status.id = 'plan-state';
  status.tabIndex = -1;
  status.append(
    badge(statuses[current().status], current().status === 'agreed' ? 'cool' : 'warm'),
    node('strong', '', `Версия ${current().id}`),
    node('span', '', phases[state.phase]),
    node('span', '', `Роль: ${roles[state.role]}`),
    node(
      'span',
      '',
      `D ${Math.floor(state.planningMinute / 60)}:${String(state.planningMinute % 60).padStart(2, '0')}`,
    ),
    node('span', '', `Подтверждения: ${current().approvals.length}/2`),
  );
  const notification = node('div', noticeError ? 'notification error' : 'notification', notice);
  notification.setAttribute('role', noticeError ? 'alert' : 'status');
  main.append(disclosure, intro, status, notification);
  main.append(
    overview(report),
    ordersSection(report),
    planningSection(report),
    resourcesSection(report),
    historySection(report),
    passportSection(report),
  );
  main.append(
    node(
      'footer',
      'page-footer',
      node('span', '', 'КОНТУР / Детерминированный учебный сценарий'),
      node('span', '', 'Все количества — тыс. лезвий · A = А, B = Б, C = В'),
    ),
  );
  body.append(header, main);
  frame.append(skip, side, body);
  return frame;
}

function overview(report: Report | null): HTMLElement {
  const area = section(
    'overview',
    '01',
    'План в цифрах',
    'Фактический расчёт текущей версии, а не сумма паспортных мощностей.',
  );
  if (!report) return area;
  const sum = totals(report);
  const demand = current().plan.orders.reduce((total, order) => total + order.quantity, 0);
  const packed = sum.packed.A + sum.packed.B + sum.packed.C;
  const cards = node('div', 'metric-grid');
  for (const [label, figure, hint, tone] of [
    [
      'Спрос на горизонте',
      numbers.format(demand),
      `${current().plan.orders.length} заказов · тыс. лезвий`,
      'neutral',
    ],
    [
      'Выпуск после PACK',
      numbers.format(packed),
      `A ${numbers.format(sum.packed.A)} / B ${numbers.format(sum.packed.B)} / C ${numbers.format(sum.packed.C)}`,
      'cool',
    ],
    [
      'Исходный дефицит в срок',
      numbers.format(sum.deficit),
      'Обещания не меняют исходные обязательства',
      'warm',
    ],
    [
      'Обязательные работы',
      `${report.jobs.filter((job) => job.complete).length} / ${REQUIRED_WORK.reduce((total, work) => total + work.count, 0)}`,
      report.feasible
        ? 'Физические ограничения соблюдены'
        : 'Есть жёсткие конфликты — согласование закрыто',
      report.feasible ? 'cool' : 'warm',
    ],
  ])
    cards.append(
      node(
        'div',
        `metric-card ${tone}`,
        text(label!, 'metric-label'),
        node('strong', 'metric-value', figure!),
        text(hint!, 'metric-hint'),
      ),
    );
  area.append(cards);
  const next = !state.demandSent
    ? [
        'Спрос ещё не передан',
        'Планировщик проверяет заказы и передаёт спрос. После этого руководитель выбирает кампании и персонал.',
        '#orders',
      ]
    : !state.lockedRequests
      ? [
          'Решение до D 12:00',
          'Сравните варианты, проверьте пик и зафиксируйте отдельные заявки S1/S2. S3/S4 останутся прогнозом.',
          '#planning',
        ]
      : current().status === 'draft'
        ? [
            'Подготовьте версию к согласованию',
            'Устраните физические конфликты. Для предупреждений запишите обоснование принятия рисков.',
            '#history',
          ]
        : current().status === 'pending'
          ? [
              'Нужны два разных подтверждения',
              'Обе роли подтверждают одну неизменённую версию. Переключение роли само по себе не является подписью.',
              '#history',
            ]
          : [
              'Версия согласована',
              state.phase === 'absence'
                ? 'Весь последовательный сценарий пройден. Откройте паспорт и выгрузите полный расчёт.'
                : 'Переходите к следующему событию. Согласованная версия останется в истории.',
              state.phase === 'absence' ? '#passport' : '#history',
            ];
  area.append(
    node(
      'div',
      'next-step',
      node('div', '', text('СЛЕДУЮЩИЙ ШАГ', 'eyebrow'), node('h3', '', next[0]!), text(next[1]!)),
      link('Перейти к действию →', next[2]!, 'button primary'),
    ),
  );
  if (!report.feasible)
    area.append(
      text(
        'Физически недопустимо. Выпуск ниже — контрфактическая проекция мощности и материалов, не физически достигнутый результат. Не используйте её как согласованный производственный факт.',
        'invalid-banner',
      ),
    );
  area.append(
    table(
      'Смены',
      ['Смена', 'Выпуск A', 'Выпуск B', 'Выпуск C', 'Пик', 'Труд, мин', 'Резерв, мин'],
      report.shifts.map((shift) => [
        `S${shift.shift}`,
        shift.packed.A,
        shift.packed.B,
        shift.packed.C,
        shift.peak,
        shift.laborMinutes,
        shift.reserveMinutes,
      ]),
    ),
  );
  area.append(
    text(
      'A = продукт А, B = продукт Б, C = продукт В. Выпуск — после PACK. Время в таблицах — рабочие минуты t, без перерывов; интервалы [начало, конец). Округление только на экране, до 3 знаков.',
    ),
  );
  const hard = report.issues.filter((issue) => issue.severity === 'error');
  const warnings = report.issues.filter((issue) => issue.severity === 'warning');
  if (hard.length) area.append(errorsView(hard, 'Жёсткие конфликты · блокируют согласование'));
  else
    area.append(
      text(
        '✓ Жёстких конфликтов нет. Это не означает отсутствия рисков по обязательствам.',
        'success-note',
      ),
    );
  if (warnings.length)
    area.append(errorsView(warnings, 'Предупреждения · требуют осознанного решения'));
  else area.append(text('Предупреждений по текущему расчёту нет.'));
  return area;
}

function ordersSection(report: Report | null): HTMLElement {
  const area = section(
    'orders',
    '02',
    'Заказы и спрос',
    'Владелец — планировщик. Исходные объём и срок сохраняются; новое обещание учитывается отдельно.',
  );
  const isPlanner = state.role === 'planner';
  area.append(
    node(
      'div',
      'actions',
      button('Добавить заказ', () => orderDialog(), 'button', !isPlanner, 'add-order'),
      button(
        'Передать спрос',
        () =>
          act(
            { type: 'send-demand' },
            'Спрос передан. Переключитесь на руководителя, чтобы выбрать план и зафиксировать персонал.',
          ),
        'button primary',
        !isPlanner || state.demandSent,
        'send-demand',
      ),
      badge(
        state.demandSent ? 'Спрос передан' : 'Спрос не передан',
        state.demandSent ? 'cool' : 'warm',
      ),
    ),
  );
  if (!isPlanner)
    area.append(text('Для создания заказа или изменения обещаний выберите роль «Планировщик».'));
  area.append(
    table(
      'Заказы',
      [
        'Заказ',
        'Продукт',
        'Исходный объём',
        'Исходная смена',
        'Приоритет',
        'К исходному сроку',
        'Исходный дефицит',
        'Обещание',
        'Действие',
      ],
      current().plan.orders.map((order) => {
        const result = report?.orders.find((row) => row.orderId === order.id);
        return [
          order.id,
          order.product,
          order.quantity,
          `S${order.originalDue}`,
          { high: 'Высокий', medium: 'Средний', low: 'Низкий' }[order.priority],
          result?.atOriginalDue ?? null,
          result?.originalDeficit ?? null,
          order.promise
            ? `${numbers.format(order.promise.quantity)} / S${order.promise.due} · ${order.promise.reason}`
            : 'Не задано',
          button(
            'Изменить заказ',
            () => orderDialog(order),
            'button subtle',
            !isPlanner,
            `edit-${order.id}`,
          ),
        ];
      }),
    ),
  );
  area.append(
    details(
      'Исходные шесть заказов · неизменяемая точка восстановления',
      table(
        'Исходные заказы',
        ['Заказ', 'Продукт', 'Объём', 'Смена'],
        REQUIRED_ORDERS.map((order) => [
          order.id,
          order.product,
          order.quantity,
          `S${order.originalDue}`,
        ]),
      ),
      text(
        'Изменение исходных реквизитов создаёт пользовательскую копию с новым кодом. В текущем спросе она заменяет выбранный заказ; исходный сценарий доступен через восстановление. Обещание не заменяет исходный заказ.',
      ),
    ),
  );
  return area;
}

function planningSection(report: Report | null): HTMLElement {
  const area = section(
    'planning',
    '03',
    'Выбор производственного решения',
    'Ограниченные, явно заданные кампании. Каждый вариант заново проверяется на текущем спросе и текущих событиях.',
  );
  area.append(
    text(
      'Поддерживается только сбой GRIND-1 при выпуске A, без пересечения валидации с ремонтом [120,270). VAL-2 остаётся на GRIND-4/5 для B. Произвольные сбои, автоматическая оптимизация и восстановление прерванной валидации не моделируются.',
      'scope-note',
    ),
  );
  const manager = state.role === 'manager' && state.demandSent;
  const codes: Template[] =
    state.phase === 'baseline'
      ? ['VAL2_STAGGERED', 'VAL2_PARALLEL']
      : state.phase === 'failure'
        ? ['REPAIR_G1_TO_G3']
        : ['NIGHT_WRAP_STAGGERED'];
  if (!codes.includes(selectedTemplate)) selectedTemplate = codes[0]!;
  const selector = select(
    'template',
    codes.map((code) => [code, `${templates[code]} · ${code}`]),
    selectedTemplate,
  );
  selector.disabled = !manager;
  selector.addEventListener('change', () => {
    selectedTemplate = selector.value as Template;
    invalidatePreview();
    document
      .getElementById('choice-text')
      ?.replaceChildren(
        text(
          `${selectedTemplate}: ${templates[selectedTemplate]}. Выбран, но не применён. Откройте предпросмотр для проверки текущих критериев.`,
        ),
      );
  });
  const previewButton = button(
    'Предпросмотр варианта',
    () =>
      work(() => {
        preview = candidate(selectedTemplate);
        announce(
          'Предпросмотр рассчитан по текущей версии. Проверьте изменения перед применением.',
        );
      }, 'preview-template'),
    'button primary',
    !manager || staffDirty,
    'preview-template',
  );
  const applyButton = button(
    'Применить вариант',
    () =>
      work(() => {
        if (!preview?.plan || !preview.report?.feasible) return;
        const code = preview.code;
        if (
          execute(
            { type: 'edit-plan', plan: preview.plan },
            `Применён ${code}. Расчёт обновлён; предыдущие подтверждения не действуют для правок.`,
          )
        ) {
          const evaluated = reportFor(current());
          choiceReason = `${code}: ${templates[code]}. ${evaluated.ok ? `Физическая допустимость: ${evaluated.value.feasible ? 'Да' : 'Нет'}; исходный дефицит ${numbers.format(totals(evaluated.value).deficit)}; пики ${evaluated.value.shifts.map((row) => `S${row.shift}=${row.peak}`).join(', ')}; труд ${numbers.format(totals(evaluated.value).labor)} мин.` : 'Проверьте ошибки данных.'}`;
        }
      }, 'apply-template'),
    'button',
    !manager || staffDirty || !preview?.report?.feasible,
    'apply-template',
  );
  area.append(
    node(
      'div',
      'panel',
      field('Вариант плана', selector),
      node(
        'div',
        'actions',
        previewButton,
        applyButton,
        button(
          'Сравнить варианты',
          () =>
            work(() => {
              alternatives = (
                state.phase === 'baseline'
                  ? (['VAL2_STAGGERED', 'VAL2_PARALLEL'] as Template[])
                  : codes
              ).map(candidate);
              announce(
                'Сравнение пересчитано для текущего плана. Допустимость не переносится из исходного сценария.',
              );
            }, 'compare-templates'),
          'button',
          !manager || staffDirty,
          'compare-templates',
        ),
      ),
      text(
        manager
          ? 'Сначала сохраните изменения прогноза. Предпросмотр не меняет план; применение создаёт реальные записи и назначения. Переключение роли сбросит несохранённые поля формы.'
          : 'Передайте спрос и выберите роль «Руководитель».',
      ),
    ),
  );
  const previewArea = region('Изменения плана', 'panel preview');
  previewArea.id = 'preview-content';
  previewArea.append(node('h3', '', 'Изменения плана'));
  if (preview) renderPreview(previewArea, preview);
  else
    previewArea.append(
      text(
        'Выберите вариант и откройте предпросмотр: здесь появятся изменения кампаний, работ и назначений.',
      ),
    );
  area.append(previewArea);
  if (alternatives.length) {
    const evaluated = alternatives.map((option): Cell[] => {
      if (!option.report)
        return [
          `${templates[option.code]} · ${option.code}`,
          false,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          REQUIRED_WORK.reduce((sum, work) => sum + work.count, 0),
        ];
      const sum = totals(option.report);
      return [
        `${templates[option.code]} · ${option.code}`,
        option.report.feasible,
        sum.packed.A,
        sum.packed.B,
        sum.packed.C,
        sum.deficit,
        ...option.report.shifts.map((shift) => shift.peak),
        sum.labor,
        option.report.jobs.filter((job) => job.complete).length,
        REQUIRED_WORK.reduce((sum, work) => sum + work.count, 0),
      ];
    });
    if (state.phase !== 'baseline' && report) {
      const sum = totals(report);
      evaluated.unshift([
        `Текущий план · ${current().plan.id}`,
        report.feasible,
        sum.packed.A,
        sum.packed.B,
        sum.packed.C,
        sum.deficit,
        ...report.shifts.map((row) => row.peak),
        sum.labor,
        report.jobs.filter((row) => row.complete).length,
        REQUIRED_WORK.reduce((sum, work) => sum + work.count, 0),
      ]);
    }
    area.append(
      table(
        'Сравнение вариантов',
        [
          'Вариант',
          'Физически допустим',
          'Выпуск A',
          'Выпуск B',
          'Выпуск C',
          'Исходный дефицит',
          'Пик S1',
          'Пик S2',
          'Пик S3',
          'Пик S4',
          'Труд, мин',
          'Работы выполнено',
          'Работы требуется',
        ],
        evaluated,
      ),
    );
    for (const option of alternatives)
      if (!option.report?.feasible)
        area.append(errorsView(option.issues, `${option.code}: недопустим`));
    if (state.phase !== 'baseline')
      area.append(
        text(
          'В этой фазе сравниваются текущая версия и предпросмотр поддерживаемого исправления. Два варианта VAL-2 доступны до сбоя; прошлое после событий не переписывается.',
        ),
      );
  }
  const reason = region('Обоснование выбора', 'decision-note');
  const explanation = node('div');
  explanation.id = 'choice-text';
  explanation.append(
    text(
      choiceReason ||
        `${selectedTemplate}: ${templates[selectedTemplate]}. Текущий план: ${current().plan.id}. Откройте предпросмотр выбранного варианта. Оцените полный выпуск, исходный дефицит, пики всех смен, труд и выполнение работ. Одинаковый общий пик не означает одинаковых интервалов валидации.`,
    ),
  );
  if (preview?.report) {
    const sum = totals(preview.report);
    explanation.append(
      text(
        `${preview.code}: допустим — ${preview.report.feasible ? 'Да' : 'Нет'}; дефицит ${numbers.format(sum.deficit)}; пики ${preview.report.shifts.map((row) => row.peak).join(' / ')}; труд ${numbers.format(sum.labor)} мин. Предпросмотр ещё не означает применение.`,
      ),
    );
  }
  reason.append(node('h3', '', 'Обоснование выбора'), explanation);
  area.append(reason);
  if (report) area.append(staffForm(report));
  return area;
}

function renderPreview(area: HTMLElement, option: Candidate): void {
  area.append(text(`${option.code} · ${templates[option.code]}`, 'eyebrow'));
  if (!option.plan || !option.report) {
    area.append(errorsView(option.issues, 'Вариант не прошёл физическую проверку'));
    return;
  }
  const before = reportFor(current());
  const after = option.report;
  area.append(
    badge(after.feasible ? 'Физически допустим' : 'Недопустим', after.feasible ? 'cool' : 'warm'),
  );
  if (before.ok) {
    const a = totals(before.value);
    const b = totals(after);
    area.append(
      table(
        'Эффект варианта',
        ['Показатель', 'До', 'После', 'Изменение'],
        [
          ['Выпуск A', a.packed.A, b.packed.A, b.packed.A - a.packed.A],
          ['Выпуск B', a.packed.B, b.packed.B, b.packed.B - a.packed.B],
          ['Выпуск C', a.packed.C, b.packed.C, b.packed.C - a.packed.C],
          ['Исходный дефицит', a.deficit, b.deficit, b.deficit - a.deficit],
          ['Труд, мин', a.labor, b.labor, b.labor - a.labor],
          ...after.shifts.map((shift, index): Cell[] => [
            `Пик S${shift.shift}`,
            before.value.shifts[index]!.peak,
            shift.peak,
            shift.peak - before.value.shifts[index]!.peak,
          ]),
        ],
      ),
    );
  }
  const changes: Cell[][] = [];
  const plan = current().plan;
  for (const row of option.plan.jobs) {
    const old = plan.jobs.find((item) => item.id === row.id);
    if (JSON.stringify(old) !== JSON.stringify(row))
      changes.push([
        row.id,
        'Работа',
        row.machineId,
        old ? `${old.start}–${old.end}` : 'Нет',
        `${row.start}–${row.end}`,
        row.code,
      ]);
  }
  for (const row of option.plan.setups) {
    const old = plan.setups.find((item) => item.id === row.id);
    if (JSON.stringify(old) !== JSON.stringify(row))
      changes.push([
        row.id,
        'Переналадка',
        row.machineId,
        old ? `${old.start}–${old.end}` : 'Нет',
        `${row.start}–${row.end}`,
        `${row.from} → ${row.to}`,
      ]);
  }
  for (const row of option.plan.campaigns) {
    const old = plan.campaigns.find((item) => item.id === row.id);
    if (JSON.stringify(old) !== JSON.stringify(row))
      changes.push([
        row.id,
        'Кампания',
        row.machineId,
        old ? `${old.start}–${old.until} / ${numbers.format(old.quota)}` : 'Нет',
        `${row.start}–${row.until} / ${numbers.format(row.quota)}`,
        row.product,
      ]);
  }
  area.append(
    table(
      'Изменённые записи',
      ['Код', 'Тип', 'Станок', 'До: окно / квота', 'После: окно / квота', 'Продукт / работа'],
      changes,
    ),
  );
  const oldAssignments = new Set(plan.assignments.map((row) => JSON.stringify(row)));
  const changed = option.plan.assignments.filter((row) => !oldAssignments.has(JSON.stringify(row)));
  area.append(
    details(
      `Новые или изменённые назначения (${changed.length})`,
      table(
        'Изменения назначений',
        ['Задача', 'Начало', 'Конец', 'Работники'],
        changed.map((row) => [row.taskId, row.start, row.end, row.workerIds.join(', ')]),
      ),
    ),
  );
  if (!changes.length)
    area.append(
      text('Кампании и работы уже соответствуют варианту; назначения всё равно проверены заново.'),
    );
  if (state.phase !== 'baseline')
    area.append(
      text(
        `Выполненная часть до t=${state.phase === 'failure' ? 120 : 630} сохраняется. Начальные запасы повторно не добавляются.`,
      ),
    );
  if (after.issues.length) area.append(errorsView(after.issues, 'Ограничения варианта'));
}

function staffForm(report: Report): HTMLElement {
  const form = node('form', 'panel staffing-form');
  form.setAttribute('aria-label', 'Заявка на персонал');
  form.noValidate = true;
  form.append(
    node('h3', '', 'Заявка на персонал'),
    text(
      state.lockedRequests
        ? 'S1/S2 зафиксированы. После отсутствия доступно на 2 человека меньше в S2; увеличение заявки запрещено. S3/S4 — редактируемый прогноз.'
        : 'D 11:00 → до D 12:00. Значения ниже — предложение по текущим пикам, а не автоматически принятая заявка. Решение принимает руководитель.',
    ),
  );
  const plan = current().plan;
  const locked = state.lockedRequests !== null;
  const allowed = state.role === 'manager' && state.demandSent;
  const counts = [
    input('staff-s1', String(plan.requests?.[0] ?? report.shifts[0]!.peak), 'number'),
    input('staff-s2', String(plan.requests?.[1] ?? report.shifts[1]!.peak), 'number'),
  ];
  const forecasts = [
    input('forecast-s3', String(plan.forecasts[0]), 'number'),
    input('forecast-s4', String(plan.forecasts[1]), 'number'),
  ];
  const reasons = [
    input('reserve-s1', plan.reserveReasons[0]),
    input('reserve-s2', plan.reserveReasons[1]),
  ];
  const fields = node('div', 'form-grid four');
  counts.forEach((control, index) => {
    control.min = '2';
    control.step = '1';
    control.disabled = locked || !allowed;
    fields.append(
      field(
        `S${index + 1}`,
        control,
        `Расчётный пик: ${report.shifts[index]!.peak}. ${locked ? 'Заявка закреплена.' : 'До фиксации — черновое значение.'}`,
      ),
    );
  });
  forecasts.forEach((control, index) => {
    control.min = '0';
    control.step = '1';
    control.disabled = !allowed;
    fields.append(
      field(
        `Прогноз S${index + 3}`,
        control,
        `Расчётный пик: ${report.shifts[index + 2]!.peak}. Не фиксированная заявка.`,
      ),
    );
  });
  const reserves = node('div', 'form-grid');
  reasons.forEach((control, index) => {
    control.disabled = !allowed;
    reserves.append(
      field(
        `Резерв S${index + 1}`,
        control,
        'Объясните запас сверх пика; не создаёт дополнительных работников.',
      ),
    );
  });
  const errorBox = node('div', 'form-errors');
  errorBox.setAttribute('role', 'alert');
  errorBox.hidden = true;
  const save = node('button', 'button', 'Сохранить прогноз и обоснования');
  save.type = 'submit';
  save.value = 'forecast';
  save.disabled = !allowed;
  save.id = 'save-forecast';
  const fix = node('button', 'button primary', 'Зафиксировать заявки');
  fix.type = 'submit';
  fix.value = 'fix';
  fix.id = 'fix-requests';
  fix.disabled = !allowed || locked || state.planningMinute >= 720;
  form.append(fields, reserves, errorBox, node('div', 'actions', save, fix));
  form.addEventListener('input', () => {
    staffDirty = true;
    invalidatePreview();
    for (const id of ['preview-template', 'compare-templates']) {
      const control = document.getElementById(id);
      if (control instanceof HTMLButtonElement) control.disabled = true;
    }
    live.textContent =
      'Есть несохранённые параметры персонала. Сохраните прогноз перед сравнением и предпросмотром.';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const mode = event.submitter instanceof HTMLButtonElement ? event.submitter.value : 'forecast';
    const errors: [HTMLElement, string][] = [];
    const forecastValues = forecasts.map(numberValue);
    forecasts.forEach((control, index) => {
      if (!Number.isInteger(forecastValues[index]) || forecastValues[index]! < 0)
        errors.push([control, `Прогноз S${index + 3}: введите целое неотрицательное число.`]);
    });
    const requestValues = counts.map(numberValue);
    if (mode === 'fix') {
      counts.forEach((control, index) => {
        if (!Number.isInteger(requestValues[index]) || requestValues[index]! < 2)
          errors.push([control, `S${index + 1}: введите целое число не меньше 2.`]);
        if (requestValues[index]! > report.shifts[index]!.peak && !reasons[index]!.value.trim())
          errors.push([
            reasons[index]!,
            `Резерв S${index + 1}: объясните заявку сверх расчётного пика.`,
          ]);
      });
    }
    showFieldErrors(form, errorBox, errors);
    if (errors.length) return;
    const next = structuredClone(plan);
    next.forecasts = [forecastValues[0]!, forecastValues[1]!];
    next.reserveReasons = [reasons[0]!.value.trim(), reasons[1]!.value.trim()];
    work(
      () => {
        if (!execute({ type: 'edit-plan', plan: next }, 'Прогноз S3/S4 и обоснования сохранены.'))
          return;
        if (mode === 'fix')
          execute(
            {
              type: 'fix-requests',
              counts: [requestValues[0]!, requestValues[1]!],
              reasons: next.reserveReasons,
            },
            'Заявки S1/S2 зафиксированы до полудня. Они больше не могут быть увеличены.',
          );
      },
      mode === 'fix' ? 'plan-state' : 'save-forecast',
    );
  });
  form.append(
    table(
      'Персонал',
      ['Смена', 'Статус', 'Заявка', 'Доступно', 'Пик', 'Труд, мин', 'Резерв, мин'],
      report.shifts.map((row) => [
        `S${row.shift}`,
        row.shift > 2 ? 'Прогноз' : locked ? 'Фиксированная заявка' : 'Черновые назначения',
        row.requested,
        row.available,
        row.peak,
        row.laborMinutes,
        row.reserveMinutes,
      ]),
    ),
  );
  form.append(
    text(
      'Пик — одновременная потребность, не численность заявки. Труд — интеграл потребности; резерв — интеграл max(доступно − потребность, 0). Ремонтная служба в заявку не входит.',
    ),
  );
  form.append(
    details(
      'Учебные часы: проверить ограничение до полудня',
      text(
        'Перевод часов необратим до восстановления сценария. Производственные рабочие минуты t — другая шкала.',
      ),
      button(
        'Наступило D 12:00',
        () =>
          act(
            { type: 'set-planning-minute', minute: 720 },
            'Учебные часы: D 12:00. Незакреплённые заявки теперь нельзя зафиксировать.',
          ),
        'button subtle',
        state.planningMinute >= 720,
        'noon',
      ),
    ),
  );
  return form;
}

function resourcesSection(report: Report | null): HTMLElement {
  const area = section(
    'resources',
    '04',
    'Ресурсы и физический журнал',
    'От агрегатов — к конкретному станку, работнику и очереди материала. Большие журналы разбиты на страницы.',
  );
  if (!report) return area;
  const plan = current().plan;
  area.append(
    table(
      'Работы',
      ['Работа', 'Код', 'Станок', 'Начало', 'Конец', 'Зачтено, мин', 'Выполнена', 'Окно'],
      report.jobs.map((row) => {
        const job = plan.jobs.find((item) => item.id === row.jobId)!;
        const requirement = REQUIRED_WORK.find((item) => item.code === row.code)!;
        return [
          row.jobId,
          row.code,
          row.machineId,
          job.start,
          job.end,
          row.creditedMinutes,
          row.complete,
          `S${requirement.firstShift}–S${requirement.lastShift} · ${requirement.minutes} мин${requirement.product ? ` · ${requirement.product}` : ''}`,
        ];
      }),
    ),
  );
  area.append(
    text(
      'ТО останавливает выпуск. Валидация засчитывается только при непрерывном положительном выпуске нужного продукта и отдельном работнике. Ремонт не заменяет ТО.',
    ),
  );
  area.append(
    table(
      'Оборудование',
      [
        'Станок',
        'Операция',
        'Начальный продукт',
        'Номинал, лезвий/мин',
        'Выпущено, тыс.',
        'Кампаний',
        'Переналадок',
      ],
      MACHINES.map((machine) => [
        machine.id,
        machine.operation,
        machine.initialProduct,
        NOMINAL_RATES[machine.operation],
        report.machineIntervals
          .filter((row) => row.machineId === machine.id)
          .reduce((sum, row) => sum + row.quantity, 0),
        plan.campaigns.filter((row) => row.machineId === machine.id).length,
        plan.setups.filter((row) => row.machineId === machine.id).length,
      ]),
    ),
  );
  const machine = select(
    'machine-ledger',
    MACHINES.map((row) => [row.id, row.id]),
    'GRIND-1',
  );
  const machineRows = node('div');
  const kinds = {
    produce: 'Выпуск',
    setup: 'Переналадка',
    maintenance: 'ТО',
    repair: 'Ремонт',
    idle: 'Простой / нет подачи',
  };
  function drawMachine(): void {
    machineRows.replaceChildren(
      table(
        'Интервалы оборудования',
        [
          'Станок',
          'Кампания',
          'Начало',
          'Конец',
          'Продукт',
          'Состояние',
          'Скорость, тыс./мин',
          'Количество',
          'Работы / настройка',
        ],
        report!.machineIntervals
          .filter((row) => row.machineId === machine.value)
          .map((row) => [
            row.machineId,
            row.campaignId,
            row.start,
            row.end,
            row.product,
            kinds[row.kind],
            row.rate,
            row.quantity,
            [...row.jobIds, ...(row.setupId ? [row.setupId] : [])].join(', '),
          ]),
      ),
    );
  }
  machine.addEventListener('change', drawMachine);
  drawMachine();
  area.append(
    details(
      'Журнал станка · фактические интервалы и простои',
      field('Станок журнала', machine),
      machineRows,
    ),
  );
  const stockShift = select(
    'stock-shift',
    [1, 2, 3, 4].map((shift) => [String(shift), `S${shift}`]),
    '2',
  );
  const onlyNonzero = input('nonzero-stock', '', 'checkbox');
  onlyNonzero.checked = true;
  const stockRows = node('div');
  function drawStocks(): void {
    const row = report!.shifts.find((shift) => shift.shift === Number(stockShift.value))!;
    stockRows.replaceChildren(
      table(
        'Материалы',
        ['Смена', 'Продукт', 'Перед операцией', 'Остаток, тыс.'],
        row.stocks
          .filter((item) => !onlyNonzero.checked || item.quantity > EPSILON)
          .map((item) => [`S${row.shift}`, item.product, item.before, item.quantity]),
      ),
      table(
        'Готовая продукция без распределения',
        ['Смена', 'A', 'B', 'C'],
        [
          [
            `S${row.shift}`,
            row.finishedUnallocated.A,
            row.finishedUnallocated.B,
            row.finishedUnallocated.C,
          ],
        ],
      ),
    );
  }
  stockShift.addEventListener('change', drawStocks);
  onlyNonzero.addEventListener('change', drawStocks);
  drawStocks();
  area.append(
    node(
      'div',
      'panel',
      node('h3', '', 'Материалы на границе смены'),
      node(
        'div',
        'filter-row',
        field('Смена остатков', stockShift),
        node('label', 'checkbox-label', onlyNonzero, 'Только ненулевые остатки'),
      ),
      stockRows,
    ),
  );
  const product = select(
    'stock-product',
    ['A', 'B', 'C'].map((item) => [item, item]),
    'A',
  );
  const operation = select(
    'stock-operation',
    ROUTES.A.slice(1).map((item) => [item, item]),
    'GRIND',
  );
  const materialRows = node('div');
  function drawMaterialLedger(): void {
    const valid = ROUTES[product.value as Product].slice(1);
    if (!valid.includes(operation.value as (typeof valid)[number])) operation.value = valid[0]!;
    materialRows.replaceChildren(
      table(
        'Интервалы материалов',
        [
          'Продукт',
          'Перед операцией',
          'Начало',
          'Конец',
          'Входящий остаток',
          'Приток, тыс./мин',
          'Расход, тыс./мин',
          'Исходящий остаток',
        ],
        report!.stockIntervals
          .filter((row) => row.product === product.value && row.before === operation.value)
          .map((row) => [
            row.product,
            row.before,
            row.start,
            row.end,
            row.opening,
            row.inflowRate,
            row.consumedRate,
            row.closing,
          ]),
      ),
    );
  }
  product.addEventListener('change', () => {
    operation.replaceChildren(
      ...ROUTES[product.value as Product].slice(1).map((item) => {
        const option = node('option', '', item);
        option.value = item;
        return option;
      }),
    );
    drawMaterialLedger();
  });
  operation.addEventListener('change', drawMaterialLedger);
  drawMaterialLedger();
  area.append(
    details(
      'Материальный баланс по каждой операции',
      node(
        'div',
        'filter-row',
        field('Продукт журнала', product),
        field('Перед операцией', operation),
      ),
      text(
        'Остаток на конец = остаток на начало + приток − расход. Начальные запасы применяются только один раз. Внутренние остатки не приравниваются к готовой продукции.',
      ),
      materialRows,
    ),
  );
  const staffShift = select(
    'staff-ledger-shift',
    [1, 2, 3, 4].map((shift) => [String(shift), `S${shift}`]),
    '2',
  );
  const staffRows = node('div');
  function drawStaff(): void {
    const shift = Number(staffShift.value);
    staffRows.replaceChildren(
      table(
        'Интервалы персонала',
        ['Начало', 'Конец', 'Обычная работа', 'Переналадки', 'Валидация', 'Всего', 'Доступно'],
        report!.staffIntervals
          .filter((row) => row.start >= (shift - 1) * 630 && row.start < shift * 630)
          .map((row) => [
            row.start,
            row.end,
            row.normal,
            row.setup,
            row.validation,
            row.total,
            row.available,
          ]),
      ),
      table(
        'Назначения персонала',
        ['Задача', 'Начало', 'Конец', 'Работники'],
        plan.assignments
          .filter((row) => row.start >= (shift - 1) * 630 && row.start < shift * 630)
          .map((row) => [row.taskId, row.start, row.end, row.workerIds.join(', ')]),
      ),
      table(
        'Пики персонала',
        ['Смена', 'Пик', 'Начало', 'Конец'],
        report!.shifts
          .filter((row) => row.shift === shift)
          .flatMap((row) =>
            row.peakSpans.map((span) => [`S${row.shift}`, row.peak, span.start, span.end]),
          ),
      ),
    );
  }
  staffShift.addEventListener('change', drawStaff);
  drawStaff();
  area.append(
    details(
      'Персональные назначения и интервалы пиков',
      field('Смена журнала персонала', staffShift),
      staffRows,
    ),
  );
  area.append(
    details(
      'Кампании и квоты',
      table(
        'Квоты кампаний',
        ['Кампания', 'Станок', 'Продукт', 'Начало', 'До', 'Квота', 'Произведено', 'Осталось'],
        plan.campaigns.map((row) => {
          const quota = report.quotas.find((item) => item.campaignId === row.id);
          return [
            row.id,
            row.machineId,
            row.product,
            row.start,
            row.until,
            row.quota,
            quota?.produced ?? null,
            quota?.remaining ?? null,
          ];
        }),
      ),
    ),
  );
  return area;
}

function historySection(report: Report | null): HTMLElement {
  const area = section(
    'history',
    '05',
    'Совместное согласование',
    'Два разных подтверждения одной версии. Любая правка аннулирует подтверждения изменяемого плана, но не историю.',
  );
  const revision = current();
  const warnings = [
    ...new Set(
      report?.issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.code) ??
        [],
    ),
  ];
  const risk = node('textarea');
  risk.id = 'risk-reason';
  risk.rows = 3;
  risk.placeholder = 'Причины, последствия для заказов и согласованные действия';
  risk.disabled = revision.status !== 'draft';
  risk.value = revision.acknowledgements.map((item) => `${item.code}: ${item.reason}`).join('\n');
  const panel = node('div', 'panel');
  panel.append(
    node('h3', '', 'Решение по текущей версии'),
    text(
      warnings.length
        ? `Требуют принятия все коды предупреждений: ${warnings.join(', ')}. Общая причина будет записана для каждого из них.`
        : 'Предупреждений нет. Физически недопустимый план отправить нельзя.',
    ),
    field('Причина принятия рисков', risk),
  );
  const riskError = node('div', 'form-errors');
  riskError.setAttribute('role', 'alert');
  riskError.hidden = true;
  const submit = button(
    'Отправить на согласование',
    () => {
      if (warnings.length && !risk.value.trim()) {
        riskError.hidden = false;
        riskError.textContent =
          'Причина принятия рисков: заполните обоснование для всех указанных кодов.';
        risk.setAttribute('aria-invalid', 'true');
        risk.focus();
        return;
      }
      act(
        {
          type: 'submit',
          acknowledgements: warnings.map((code) => ({ code, reason: risk.value.trim() })),
        },
        'Версия отправлена. Каждая роль должна отдельно нажать «Подтвердить версию».',
      );
    },
    'button primary',
    revision.status !== 'draft' || !state.demandSent || !state.lockedRequests || !report?.feasible,
    'submit-plan',
  );
  const approve = button(
    'Подтвердить версию',
    () => act({ type: 'approve' }, `Версия подтверждена: ${roles[state.role]}.`),
    'button',
    revision.status !== 'pending' || revision.approvals.includes(state.role),
    'approve-plan',
  );
  panel.append(
    riskError,
    node('div', 'actions', submit, approve),
    node(
      'div',
      'approval-row',
      ...(['planner', 'manager'] as const).map((role) =>
        badge(
          `${roles[role]} · ${revision.approvals.includes(role) ? 'подтверждено' : 'не подтверждено'}`,
          revision.approvals.includes(role) ? 'cool' : 'neutral',
        ),
      ),
    ),
  );
  panel.append(
    text(
      !state.demandSent
        ? 'Для отправки сначала передайте спрос от планировщика.'
        : !state.lockedRequests
          ? 'Для отправки руководитель должен зафиксировать заявки до D 12:00.'
          : !report?.feasible
            ? 'Согласование заблокировано жёсткими конфликтами. После отсутствия примените ночной шаблон в разделе выбора решения.'
            : revision.status === 'pending'
              ? 'Переключите роль в шапке и подтвердите эту же версию. Повторное подтверждение одной ролью запрещено.'
              : revision.status === 'agreed'
                ? 'Согласованная версия сохранена. Последующие правки создадут новый черновик.'
                : 'Проверьте расчёт и отправьте версию на согласование.',
    ),
  );
  area.append(panel);
  const manager = state.role === 'manager';
  const failureAllowed = manager && state.phase === 'baseline' && revision.status === 'agreed';
  const absenceAllowed = manager && state.phase === 'failure' && revision.status === 'agreed';
  area.append(
    node(
      'div',
      'event-grid',
      node(
        'div',
        'event-card',
        text('СОБЫТИЕ 01 / D+1 10:00', 'eyebrow'),
        node('h3', '', 'Сбой на GRIND-1'),
        text(
          'A · ремонт 10:00–13:00, 150 рабочих минут [120,270). Валидация на этом станке не должна пересекать ремонт. Перенесите будущую работу на свободный GRIND-3.',
        ),
        button(
          'Сбой GRIND-1',
          () =>
            act(
              { type: 'apply-failure', machineId: 'GRIND-1' },
              'Сбой GRIND-1 применён к согласованной версии. Создан черновик-преемник. Проверьте последствия и предпросмотр переноса на GRIND-3.',
            ),
          'button',
          !failureAllowed,
          'failure',
        ),
        text(
          failureAllowed
            ? 'Доступно руководителю после согласования базовой версии.'
            : 'Только руководитель, после согласования базового плана; событие применяется один раз.',
        ),
      ),
      node(
        'div',
        'event-card',
        text('СОБЫТИЕ 02 / D+1 19:30', 'eyebrow'),
        node('h3', '', 'Два отсутствующих в S2'),
        text(
          'Фиксированная заявка сохраняется, доступный персонал уменьшается на 2. Сначала согласуйте решение по сбою, затем измените будущие назначения и ночные переналадки.',
        ),
        button(
          'Отсутствие S2',
          () =>
            act(
              { type: 'apply-absence' },
              'Отсутствие применено в той же цепочке со сбоем. S2: заявка минус 2. До корректировки возможна только контрфактическая проекция.',
            ),
          'button',
          !absenceAllowed,
          'absence',
        ),
        text(
          absenceAllowed
            ? 'Доступно руководителю после согласования решения по сбою.'
            : 'Только руководитель, после согласования версии со сбоем; событие применяется один раз.',
        ),
      ),
    ),
  );
  area.append(
    table(
      'Версии',
      ['Версия', 'Родитель', 'План', 'Состояние', 'События', 'Подтверждения', 'Режим'],
      state.versions.map((row) => [
        row.id,
        row.parentId,
        row.plan.id,
        `${statuses[row.status]}${row.id === state.currentId ? ' · текущая' : ' · история'}`,
        row.events
          .map((event) => (event.kind === 'failure' ? 'Сбой GRIND-1' : 'Отсутствие S2'))
          .join(' → ') || 'Без событий',
        row.approvals.map((role) => roles[role]).join(', ') || 'Нет',
        row.plan.mode === 'required' ? 'Исходный' : 'Пользовательский',
      ]),
    ),
  );
  const previous = [...state.versions]
    .reverse()
    .find((row) => row.id !== revision.id && row.status === 'agreed');
  if (previous && report) {
    const old = reportFor(previous);
    if (old.ok) {
      const a = totals(old.value);
      const b = totals(report);
      area.append(
        table(
          'Сравнение с последней согласованной версией',
          [
            'Показатель',
            `Версия ${previous.id} · неизменяема`,
            `Версия ${revision.id}`,
            'Изменение',
          ],
          [
            ['Выпуск A', a.packed.A, b.packed.A, b.packed.A - a.packed.A],
            ['Выпуск B', a.packed.B, b.packed.B, b.packed.B - a.packed.B],
            ['Выпуск C', a.packed.C, b.packed.C, b.packed.C - a.packed.C],
            ['Исходный дефицит', a.deficit, b.deficit, b.deficit - a.deficit],
            ['Труд, мин', a.labor, b.labor, b.labor - a.labor],
            ...report.shifts.map((row, index): Cell[] => [
              `Пик S${row.shift}`,
              old.value.shifts[index]!.peak,
              row.peak,
              row.peak - old.value.shifts[index]!.peak,
            ]),
          ],
        ),
      );
    }
  }
  if (state.versions.length > 1) {
    const historyChoice = select(
      'history-version',
      state.versions.map((row) => [String(row.id), `Версия ${row.id} · ${statuses[row.status]}`]),
      String(state.versions[0]!.id),
    );
    const historical = node('div');
    function drawHistory(): void {
      const chosen = state.versions.find((row) => row.id === Number(historyChoice.value))!;
      const result = reportFor(chosen);
      historical.replaceChildren(
        text(
          `Версия ${chosen.id} · ${chosen.plan.id} · ${statuses[chosen.status]}. Просмотр не меняет текущий черновик. Историческая согласованная версия не редактируется.`,
        ),
      );
      if (result.ok)
        historical.append(
          table(
            'Смены выбранной версии',
            ['Смена', 'Выпуск A', 'Выпуск B', 'Выпуск C', 'Пик', 'Исходный дефицит'],
            result.value.shifts.map((row) => [
              `S${row.shift}`,
              row.packed.A,
              row.packed.B,
              row.packed.C,
              row.peak,
              row.dueDeficit,
            ]),
          ),
        );
    }
    historyChoice.addEventListener('change', drawHistory);
    drawHistory();
    area.append(
      details('Открыть сохранённую версию', field('Версия истории', historyChoice), historical),
    );
  }
  return area;
}

function passportSection(report: Report | null): HTMLElement {
  const area = section(
    'passport',
    '06',
    'Паспорт сценария',
    'Тот же текущий отчёт, что и в интерфейсе. Полный журнал и все версии доступны в JSON без округления.',
  );
  const passport = region('Паспорт сценария', 'panel passport');
  passport.append(
    node('h3', '', 'Воспроизводимый расчёт'),
    text(
      'Учебная симуляция, не заводские результаты. Пилот не проводился. Нет оптимизатора, живого MES и серверного хранения. При перезагрузке страницы состояние не сохраняется.',
    ),
  );
  passport.append(
    node(
      'div',
      'actions',
      button(
        'Экспорт JSON',
        () =>
          work(() => {
            const content = exportWorkflow(state);
            const url = URL.createObjectURL(
              new Blob([content], { type: 'application/json;charset=utf-8' }),
            );
            const anchor = link('Скачать', url);
            anchor.download = `kontur-v${state.currentId}-${state.phase}.json`;
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            announce(
              'JSON подготовлен: точный exportWorkflow, все интервалы и текущая оценка. Одинаковое состояние даёт одинаковые байты.',
            );
          }, 'export-json'),
        'button primary',
        false,
        'export-json',
      ),
      link('Презентация', '/slides.html', 'button'),
      button('Печать паспорта', () => window.print(), 'button', false, 'print-passport'),
    ),
  );
  passport.append(
    table(
      'Паспорт: версия',
      ['Версия', 'План', 'Фаза'],
      [[current().id, current().plan.id, phases[state.phase]]],
    ),
  );
  if (state.versions.length > 1) {
    passport.append(
      details(
        'Последствия последовательных версий',
        table(
          'Паспорт: последовательные версии',
          [
            'Версия',
            'Состояние',
            'Физически допустим',
            'Выпуск A',
            'Выпуск B',
            'Выпуск C',
            'Исходный дефицит',
            'Пики S1 / S2 / S3 / S4',
          ],
          state.versions.map((revision) => {
            const result = reportFor(revision);
            if (!result.ok)
              return [
                revision.id,
                statuses[revision.status],
                false,
                null,
                null,
                null,
                null,
                'Нет достоверной оценки',
              ];
            const sum = totals(result.value);
            return [
              revision.id,
              statuses[revision.status],
              result.value.feasible,
              sum.packed.A,
              sum.packed.B,
              sum.packed.C,
              sum.deficit,
              result.value.shifts.map((row) => row.peak).join(' / '),
            ];
          }),
        ),
        text(
          'Каждая строка пересчитана по сохранённому плану и его событиям. Черновые строки не являются согласованной историей. Полные планы версий включены в exportWorkflow.',
        ),
      ),
    );
  }
  if (report) {
    if (!report.feasible)
      passport.append(
        text(
          'Недопустимый план: показатели выпуска — контрфактическая проекция, не физический результат.',
          'invalid-banner',
        ),
      );
    passport.append(
      table(
        'Паспорт: смены',
        ['Смена', 'Выпуск A', 'Выпуск B', 'Выпуск C', 'Выполнено', 'Дефицит в срок'],
        report.shifts.map((row) => [
          `S${row.shift}`,
          row.packed.A,
          row.packed.B,
          row.packed.C,
          row.fulfilled,
          row.dueDeficit,
        ]),
      ),
    );
    passport.append(
      table(
        'Паспорт: персонал',
        ['Смена', 'Заявка', 'Доступно', 'Пик', 'Труд, мин', 'Резерв, мин'],
        report.shifts.map((row) => [
          `S${row.shift}`,
          row.requested,
          row.available,
          row.peak,
          row.laborMinutes,
          row.reserveMinutes,
        ]),
      ),
    );
    passport.append(
      table(
        'Паспорт: заказы',
        [
          'Заказ',
          'Исходный объём',
          'Исходная смена',
          'К исходному сроку',
          'Исходный дефицит',
          'Обещанный объём',
          'Обещанная смена',
          'К обещанному сроку',
          'Дефицит обещания',
          'Выполнено S1',
          'Выполнено S2',
          'Выполнено S3',
          'Выполнено S4',
        ],
        report.orders.map((row) => {
          const order = current().plan.orders.find((item) => item.id === row.orderId)!;
          return [
            row.orderId,
            order.quantity,
            order.originalDue,
            row.atOriginalDue,
            row.originalDeficit,
            order.promise?.quantity ?? null,
            order.promise?.due ?? null,
            row.atPromiseDue,
            row.promiseDeficit,
            ...row.allocatedByShift,
          ];
        }),
      ),
    );
    passport.append(
      table(
        'Паспорт: работы',
        ['Работа', 'Код', 'Станок', 'Начало', 'Конец', 'Зачтено, мин', 'Выполнена'],
        report.jobs.map((row) => {
          const job = current().plan.jobs.find((item) => item.id === row.jobId)!;
          return [
            row.jobId,
            row.code,
            row.machineId,
            job.start,
            job.end,
            row.creditedMinutes,
            row.complete,
          ];
        }),
      ),
    );
    const stockRows = report.shifts.flatMap((shift) =>
      shift.stocks
        .filter((row) => row.quantity > EPSILON)
        .map((row): Cell[] => [`S${shift.shift}`, row.product, row.before, row.quantity]),
    );
    passport.append(
      details(
        'Паспорт: ненулевые запасы всех смен',
        table(
          'Паспорт: материалы',
          ['Смена', 'Продукт', 'Перед операцией', 'Остаток, тыс.'],
          stockRows,
        ),
        text(
          'Включены внутренние буферы. Нулевые очереди, скорости и полный интервальный баланс присутствуют в JSON и в журнале ресурсов. Готовая нераспределённая продукция учитывается отдельно.',
        ),
      ),
    );
  }
  passport.append(
    details(
      'Условия расчёта и допущения',
      node(
        'ul',
        'assumptions',
        ...[
          `Точность EPSILON = ${EPSILON}. Сравнения и экспорт без промежуточного округления.`,
          'Для каждого станка скорость = номинал × 0,85 / 1000 тыс./мин. Коэффициент применяется один раз, а не на каждом переходе материала.',
          'Четыре смены по 630 рабочих минут; перерывы 12:00–12:30 / 16:00–16:30, ночью 00:00–00:30 / 04:00–04:30; передача смены — последние 30 минут.',
          'Запасы по продуктам находятся перед конкретной операцией. Перемещение непрерывное, без транспортной задержки и минимальной партии. Сырьё не ограничено только на PRESS; B обходит CHROME, C проходит LASER, не PRINT.',
          'Выпуск ограничен реальной подачей и квотами. При нехватке материала распределение — по числовому суффиксу станка. Готовая продукция распределяется по исходному сроку, приоритету и коду заказа.',
          'Операторы универсальны. На каждую одновременную переналадку нужен отдельный обычный оператор (TEF/PACK — два). Валидация добавляет отдельного работника. Один человек не может одновременно выполнять несовместимые задачи.',
          'Сбой: только GRIND-1/A в [120,270); VAL-2 на GRIND-4/5. Ремонт не заменяет ТО. После событий выполненный префикс не изменяется и запасы не перезагружаются.',
          'Это заданный детерминированный повтор, не поиск оптимального расписания. Пользовательский спрос может оставаться необеспеченным. Заявки S1/S2 закрепляются до D 12:00, S3/S4 — прогноз.',
          'Источники: исходный кейс ИТМО × P&G, PDF с. 5–10; PUBLIC_SPEC v1.1 и SOURCE_REQUIREMENTS R1–R9. Экспертный архив — только гипотеза; цифры паспорта получены из текущего вычисления.',
        ].map((item) => node('li', '', item)),
      ),
      table(
        'Начальные запасы',
        ['Перед операцией', 'A', 'B', 'C'],
        Object.entries(INITIAL_STOCKS).map(([operation, stock]) => [
          operation,
          stock.A,
          stock.B,
          stock.C,
        ]),
      ),
      table(
        'Маршруты',
        ['Продукт', 'Операции'],
        Object.entries(ROUTES).map(([product, route]) => [product, route.join(' → ')]),
      ),
      table(
        'Матрица переналадок, рабочие минуты',
        ['Из продукта', 'В A', 'В B', 'В C'],
        Object.entries(SETUP_MINUTES).map(([product, times]) => [
          product,
          times.A,
          times.B,
          times.C,
        ]),
      ),
    ),
  );
  passport.append(
    text(
      'Предлагаемые метрики, план пилота, риски и контроль — в локальной презентации. PDF можно получить системной печатью; готовый PDF и резервная последовательность скриншотов этой поставкой не создавались. Печатается сводка и открытая страница таблиц; полный журнал — в JSON.',
    ),
  );
  area.append(
    passport,
    node(
      'div',
      'restore-panel',
      node(
        'div',
        '',
        node('h3', '', 'Вернуться к исходным условиям'),
        text(
          'Восстановление удалит текущие правки, обещания, события, заявки и историю этого сеанса. Экспортируйте JSON, если их нужно сохранить.',
        ),
      ),
      node(
        'div',
        'actions',
        button(
          'Восстановить сценарий',
          () =>
            act(
              { type: 'restore-scenario' },
              'Восстановлены исходные шесть заказов и все условия. Роль: планировщик, D 11:00; заявки снова не закреплены.',
            ),
          'button',
          false,
          'restore',
        ),
        button('Сбросить', resetDialog, 'button danger', false, 'reset'),
      ),
    ),
  );
  return area;
}

function dialog(
  title: string,
  returnId: string,
): { modal: HTMLDialogElement; content: HTMLElement; close: () => void } {
  const modal = node('dialog', 'modal');
  const heading = node('h2', '', title);
  heading.id = 'dialog-title';
  modal.setAttribute('aria-labelledby', heading.id);
  const content = node('div', 'modal-content', heading);
  modal.append(content);
  document.body.append(modal);
  const close = (): void => {
    modal.close();
    modal.remove();
    document.getElementById(returnId)?.focus({ preventScroll: true });
  };
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
      ),
    ).filter((control) => !control.hidden);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  return { modal, content, close };
}

function resetDialog(): void {
  const { modal, content, close } = dialog('Сброс сценария', 'reset');
  const cancel = button('Отмена', close, 'button', false, 'cancel-reset');
  content.append(
    text(
      'Сбросить заказы, обещания, согласования, фиксированные заявки и события? Будет восстановлен исходный сценарий без сохранения текущей истории.',
    ),
    node(
      'div',
      'actions',
      cancel,
      button(
        'Подтвердить сброс',
        () => {
          close();
          act(
            { type: 'restore-scenario' },
            'Сценарий сброшен. Исходные заказы восстановлены; роль — планировщик.',
            'reset',
          );
        },
        'button danger',
      ),
    ),
  );
  modal.showModal();
  cancel.focus();
}

function orderDialog(existing?: Order): void {
  const { modal, content, close } = dialog('Заказ', existing ? `edit-${existing.id}` : 'add-order');
  const form = node('form');
  form.noValidate = true;
  form.setAttribute('aria-label', 'Заказ');
  const id = input('order-code', existing?.id ?? '');
  id.maxLength = 80;
  const product = select(
    'order-product',
    ['A', 'B', 'C'].map((item) => [item, `${item} · продукт ${{ A: 'А', B: 'Б', C: 'В' }[item]}`]),
    existing?.product ?? 'A',
  );
  const quantity = input('order-quantity', existing ? String(existing.quantity) : '');
  quantity.inputMode = 'decimal';
  const due = select(
    'order-due',
    [1, 2, 3, 4].map((shift) => [String(shift), `S${shift}`]),
    String(existing?.originalDue ?? 1),
  );
  const priority = select(
    'order-priority',
    [
      ['high', 'Высокий'],
      ['medium', 'Средний'],
      ['low', 'Низкий'],
    ],
    existing?.priority ?? 'medium',
  );
  const errors = node('div', 'form-errors');
  errors.hidden = true;
  errors.id = 'order-errors';
  errors.setAttribute('role', 'alert');
  for (const control of [id, product, quantity, due, priority])
    control.setAttribute('aria-describedby', errors.id);
  form.append(
    text(
      existing
        ? `Исходные значения ${existing.id}: ${existing.product}, ${numbers.format(existing.quantity)} тыс., S${existing.originalDue}. Объём и срок этого кода не перезаписываются: изменения создадут пользовательскую копию с новым кодом, заменив заказ в текущем спросе.`
        : 'Новый заказ переводит план в пользовательский сценарий. Это не обещание автоматической выполнимости.',
    ),
    node(
      'div',
      'form-grid',
      field('Код заказа', id),
      field('Продукт', product),
      field('Объём', quantity, 'Тысяч лезвий; можно использовать запятую или точку.'),
      field('Срок (смена)', due),
      field('Приоритет', priority),
    ),
    errors,
  );
  const save = node('button', 'button primary', 'Сохранить заказ');
  save.type = 'submit';
  save.id = 'save-order';
  form.append(node('div', 'actions', save, button('Отмена', close)));
  function committedOrder(): Order {
    return {
      id: id.value.trim(),
      product: product.value as Product,
      quantity: numberValue(quantity),
      originalDue: Number(due.value) as Shift,
      priority: priority.value as Order['priority'],
      promise: null,
    };
  }
  function saveOrders(orders: Order[]): void {
    if (busy) return;
    const result = transition(state, { type: 'edit-orders', orders });
    if (!result.ok) {
      errors.hidden = false;
      errors.replaceChildren(errorsView(result.errors, 'Заказ не сохранён'));
      errors.tabIndex = -1;
      errors.focus();
      return;
    }
    state = result.value;
    preview = null;
    alternatives = [];
    choiceReason = '';
    staffDirty = false;
    candidateCache.clear();
    announce(
      'Заказ сохранён. Подтверждения правок сброшены, спрос нужно передать заново. Исходные обязательства сохранены.',
    );
    render();
    close();
    if (!document.getElementById(existing ? `edit-${existing.id}` : 'add-order'))
      document.getElementById('add-order')?.focus();
  }
  form.addEventListener('input', invalidatePreview);
  form.addEventListener('change', invalidatePreview);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const order = committedOrder();
    const messages: [HTMLElement, string][] = [];
    if (!order.id) messages.push([id, 'Код заказа: заполните непустой код.']);
    if (!Number.isFinite(order.quantity) || order.quantity <= 0)
      messages.push([quantity, 'Объём: введите конечное число больше нуля в тысячах лезвий.']);
    const changedOriginal =
      existing &&
      (order.quantity !== existing.quantity ||
        order.originalDue !== existing.originalDue ||
        order.product !== existing.product);
    if (changedOriginal && order.id === existing.id) {
      let suffix = 1;
      while (current().plan.orders.some((row) => row.id === `${existing.id}-CUSTOM-${suffix}`))
        suffix++;
      order.id = `${existing.id}-CUSTOM-${suffix}`;
    }
    if (current().plan.orders.some((row) => row.id === order.id && row.id !== existing?.id))
      messages.push([id, 'Код заказа: такой код уже существует. Выберите уникальный.']);
    showFieldErrors(form, errors, messages);
    if (messages.length) return;
    if (existing && !changedOriginal && order.id === existing.id) order.promise = existing.promise;
    const orders = existing
      ? current().plan.orders.map((row) => (row.id === existing.id ? order : row))
      : [...current().plan.orders, order];
    saveOrders(orders);
  });
  if (existing) {
    const promiseQuantity = input(
      'promise-quantity',
      String(existing.promise?.quantity ?? existing.quantity),
    );
    promiseQuantity.inputMode = 'decimal';
    const promiseDue = select(
      'promise-due',
      [1, 2, 3, 4].map((shift) => [String(shift), `S${shift}`]),
      String(existing.promise?.due ?? existing.originalDue),
    );
    const promiseReason = input('promise-reason', existing.promise?.reason ?? '');
    for (const control of [promiseQuantity, promiseDue, promiseReason])
      control.setAttribute('aria-describedby', errors.id);
    form.append(
      node('hr'),
      node('h3', '', 'Пересогласовать обещание'),
      text(
        'Обещание не меняет исходные объём, срок и дефицит. Сначала сохраните отдельные изменения реквизитов заказа.',
      ),
      node(
        'div',
        'form-grid',
        field(
          'Обещанный объём',
          promiseQuantity,
          `Больше нуля, не больше ${numbers.format(existing.quantity)} тыс.`,
        ),
        field('Обещанная смена', promiseDue),
        field('Причина обещания', promiseReason),
      ),
      button(
        'Сохранить обещание',
        () => {
          const messages: [HTMLElement, string][] = [];
          const base = committedOrder();
          if (
            base.id !== existing.id ||
            base.product !== existing.product ||
            base.quantity !== existing.quantity ||
            base.originalDue !== existing.originalDue ||
            base.priority !== existing.priority
          )
            messages.push([
              id,
              'Код заказа и реквизиты: сначала сохраните изменения заказа или верните исходные значения.',
            ]);
          const amount = numberValue(promiseQuantity);
          if (!Number.isFinite(amount) || amount <= 0 || amount > existing.quantity)
            messages.push([
              promiseQuantity,
              'Обещанный объём: введите число больше нуля и не больше исходного объёма.',
            ]);
          if (!promiseReason.value.trim())
            messages.push([promiseReason, 'Причина обещания: объясните пересогласование.']);
          showFieldErrors(form, errors, messages);
          if (messages.length) return;
          const updated: Order = {
            ...existing,
            promise: {
              quantity: amount,
              due: Number(promiseDue.value) as Shift,
              reason: promiseReason.value.trim(),
            },
          };
          saveOrders(current().plan.orders.map((row) => (row.id === existing.id ? updated : row)));
        },
        'button',
      ),
    );
  }
  content.append(form);
  modal.showModal();
  id.focus();
}

function render(): void {
  const result = reportFor(current());
  root.replaceChildren(shell(result.ok ? result.value : null));
  if (!result.ok)
    document
      .getElementById('overview')
      ?.append(errorsView(result.errors, 'Расчёт отклонён: данные недостоверны'));
}

window.setTimeout(() => {
  try {
    const initialized = createWorkflow(createScenarioPlan());
    if (!initialized.ok)
      throw new Error(initialized.errors.map((issue) => issue.message).join('; '));
    state = initialized.value;
    render();
  } catch (error) {
    const failure = node(
      'div',
      'notification error',
      'Не удалось подготовить сценарий. ',
      error instanceof Error ? error.message : 'Ошибка модели.',
    );
    failure.setAttribute('role', 'alert');
    root.replaceChildren(failure);
  }
}, 20);
