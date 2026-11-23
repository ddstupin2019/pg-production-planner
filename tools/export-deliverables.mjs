import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire, registerHooks } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { chromium, expect } from '@playwright/test';
import { inspectPath, readPinnedFile } from './files.mjs';

/** @typedef {import('../src/domain/model.ts').Plan} Plan */
/** @typedef {import('../src/domain/model.ts').Event} Event */
/** @typedef {import('../src/domain/engine.ts').Report} Report */
/** @typedef {import('../src/domain/workflow.ts').Workflow} Workflow */
/** @typedef {import('../src/domain/workflow.ts').Action} Action */
/** @typedef {import('../src/domain/workflow.ts').Revision} Revision */
/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {{key: string, caption: string, workflow: Workflow, report: Report}} Stage */
/** @typedef {{path: string, caption: string, version: number, phase: string, role: string, width: number, exportSha256: string}} Capture */

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://127.0.0.1:4183';
const require = createRequire(import.meta.url);
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });
/** @type {Capture[]} */
const captures = [];
/** @type {string[]} */
const runtimeErrors = [];
/** @type {{kind: string, url: string}[]} */
const blocked = [];
/** @type {{state: string, seriousCritical: number, lower: {id: string, impact: string | null, nodes: number}[]}[]} */
const accessibility = [];
/** @type {{path: string, bytes: number, sha256: string, pages?: number}[]} */
const files = [];

/** @param {unknown} condition @param {string} message @returns {asserts condition} */
function check(condition, message) {
  if (!condition) throw new Error(message);
}
/** @template T @param {import('../src/domain/model.ts').Result<T>} result @returns {T} */
function value(result) {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
/** @param {Buffer | string} bytes */
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} item @returns {string} */
const escape = (item) => {
  const text =
    item == null
      ? '—'
      : typeof item === 'string'
        ? item
        : typeof item === 'number' || typeof item === 'boolean'
          ? String(item)
          : JSON.stringify(item);
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
};
/** @param {unknown} item @returns {string} */
const display = (item) => escape(typeof item === 'number' ? number.format(item) : item);
/** @param {unknown} item */
function finiteTree(item) {
  if (typeof item === 'number') check(Number.isFinite(item), 'Nonfinite export number');
  if (item && typeof item === 'object') Object.values(item).forEach(finiteTree);
}
/** @param {unknown} item */
function json(item) {
  finiteTree(item);
  return `${JSON.stringify(item, null, 2)}\n`;
}
/** @param {string} title @param {string[]} headings @param {unknown[][]} rows */
function table(title, headings, rows) {
  return `<div class="scroll"><table><caption>${escape(title)}</caption><thead><tr>${headings.map((cell) => `<th scope="col">${escape(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${display(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/** Only creates fixed derived directories inside this workspace; rejects existing links.
 * @param {string} relative
 */
async function directory(relative) {
  check(/^(artifacts|evidence)(\/[^.][^/]*)*$/.test(relative), 'Output directory outside scope');
  let current = '';
  for (const part of relative.split('/')) {
    check(!part.includes('\\') && part !== '..', 'Unsafe output component');
    current = current ? `${current}/${part}` : part;
    try {
      await mkdir(path.join(root, current));
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
    }
    check(
      (await inspectPath(root, path.join(root, current))).isDirectory(),
      'Output is not a directory',
    );
  }
}
/** @param {string} relative @param {Buffer | string} bytes @param {boolean} [record] */
async function write(relative, bytes, record = true) {
  check(
    relative.startsWith('artifacts/') || relative === 'evidence/export-checks.json',
    'Output outside scope',
  );
  check(!relative.split('/').some((part) => part === '..' || part.includes('\\')), 'Unsafe output');
  await directory(path.posix.dirname(relative));
  const target = path.join(root, relative);
  try {
    check((await inspectPath(root, target)).isFile(), 'Output is not a regular file');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const handle = await open(
    target,
    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    await handle.writeFile(bytes);
  } finally {
    await handle.close();
  }
  const actual = await readPinnedFile(root, target);
  check(actual.bytes.equals(Buffer.from(bytes)), 'Output readback mismatch');
  if (record)
    files.push({ path: relative, bytes: actual.bytes.length, sha256: hash(actual.bytes) });
}

function candidate() {
  const result = spawnSync(process.execPath, [path.join(root, 'tools/manifest.mjs'), 'source'], {
    cwd: root,
    encoding: 'utf8',
  });
  check(result.status === 0, `Cannot identify candidate: ${result.stderr}`);
  /** @type {unknown} */
  const raw = JSON.parse(result.stdout);
  const parsed = /** @type {{candidate_id: string}} */ (raw);
  check(typeof parsed.candidate_id === 'string', 'Missing candidate ID');
  return parsed.candidate_id;
}

/** Node's built-in type stripping plus a process-local extension resolver; no transpiled files.
 * Only the documented domain entrypoints are consumed below. The hook never reads UI state.
 */
async function domain() {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (
        specifier.startsWith('.') &&
        context.parentURL?.includes('/src/domain/') &&
        !path.extname(specifier)
      ) {
        return next(`${specifier}.ts`, context);
      }
      return next(specifier, context);
    },
  });
  try {
    /** @type {unknown} */
    const scenarioModule = await import(new URL('../src/domain/scenario.ts', import.meta.url).href);
    /** @type {unknown} */
    const workflowModule = await import(new URL('../src/domain/workflow.ts', import.meta.url).href);
    /** @type {unknown} */
    const engineModule = await import(new URL('../src/domain/engine.ts', import.meta.url).href);
    /** @type {unknown} */
    const modelModule = await import(new URL('../src/domain/model.ts', import.meta.url).href);
    /** @type {unknown} */
    const calendarModule = await import(new URL('../src/domain/calendar.ts', import.meta.url).href);
    const scenario = /** @type {typeof import('../src/domain/scenario.ts')} */ (scenarioModule);
    const workflow = /** @type {typeof import('../src/domain/workflow.ts')} */ (workflowModule);
    const engine = /** @type {typeof import('../src/domain/engine.ts')} */ (engineModule);
    const model = /** @type {typeof import('../src/domain/model.ts')} */ (modelModule);
    const calendar = /** @type {typeof import('../src/domain/calendar.ts')} */ (calendarModule);
    return { ...scenario, ...workflow, ...engine, ...model, ...calendar };
  } finally {
    hooks.deregister();
  }
}

/** @param {Workflow} state @returns {Revision} */
function current(state) {
  const revision = state.versions.find((row) => row.id === state.currentId);
  check(revision, 'Missing current revision');
  return revision;
}
/** @param {Awaited<ReturnType<typeof domain>>} api */
function lineage(api) {
  const seed = api.createScenarioPlan();
  check(seed.requests, 'Scenario factory must compute default standalone requests');
  const requests = seed.requests;
  let state = value(api.createWorkflow(seed));
  /** @type {Stage[]} */
  const stages = [];
  /** @type {{action: Action, currentId: number, phase: string, status: string}[]} */
  const actions = [];
  /** @param {Action} action */
  function act(action) {
    state = value(api.transition(state, action));
    actions.push({
      action,
      currentId: state.currentId,
      phase: state.phase,
      status: current(state).status,
    });
  }
  /** @param {string} key @param {string} caption */
  function save(key, caption) {
    const revision = current(state);
    const report = value(api.evaluate({ plan: revision.plan, events: revision.events }));
    stages.push({ key, caption, workflow: globalThis.structuredClone(state), report });
  }
  /** @param {string} reason */
  function agree(reason) {
    const revision = current(state);
    const report = value(api.evaluate({ plan: revision.plan, events: revision.events }));
    check(report.feasible, `Cannot agree ${state.phase}: ${JSON.stringify(report.issues)}`);
    const codes = [
      ...new Set(
        report.issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.code),
      ),
    ];
    act({ type: 'submit', acknowledgements: codes.map((code) => ({ code, reason })) });
    act({ type: 'approve' });
    act({ type: 'switch-role', role: 'planner' });
    act({ type: 'approve' });
    check(current(state).status === 'agreed', 'Both-role agreement did not occur');
  }
  const alternatives = /** @type {const} */ (['VAL2_STAGGERED', 'VAL2_PARALLEL']).map((name) => {
    const plan = value(api.applyTemplate(seed, [], name));
    const report = value(api.evaluate({ plan, events: [] }));
    check(report.feasible, `Baseline alternative is not admissible: ${name}`);
    return { name, plan, report };
  });
  const left = alternatives[0];
  const right = alternatives[1];
  check(left && right, 'Two evaluated alternatives are required');
  const comparison = value(
    api.compare({ plan: left.plan, events: [] }, { plan: right.plan, events: [] }),
  );
  const selected = 'VAL2_STAGGERED';
  const rationale = `Выбран ${selected}: физическая допустимость проверена при рассчитанных исходных заявках ${requests.join('/')}; последовательная валидация распределяет дополнительную работу во времени. Пики выбранного варианта: ${left.report.shifts.map((row) => `S${row.shift}=${row.peak}`).join(', ')}; параллельного: ${right.report.shifts.map((row) => `S${row.shift}=${row.peak}`).join(', ')}. Это осознанный ограниченный выбор, не доказательство оптимальности; сроки и резервы показаны отдельно.`;
  const reasons = /** @type {[string, string]} */ (
    seed.reserveReasons.map(
      (reason) =>
        reason.trim() ||
        'Расчётный резерв для обязательных работ и последовательных событий; размер и использование проверяются по журналу.',
    )
  );
  save('planner', '01 · Планировщик: исходный спрос, до передачи и фиксации заявок');
  act({ type: 'send-demand' });
  act({ type: 'switch-role', role: 'manager' });
  act({ type: 'edit-plan', plan: value(api.applyTemplate(current(state).plan, [], selected)) });
  act({ type: 'fix-requests', counts: requests, reasons });
  save('manager', '02 · Руководитель: рассчитанный выбор и зафиксированные заявки');
  agree(rationale);
  save('baseline', '03 · Базовая версия согласована обеими ролями');
  act({ type: 'switch-role', role: 'manager' });
  act({ type: 'apply-failure', machineId: 'GRIND-1' });
  save('failure-raw', '04 · Сбой GRIND-1: последствия до переноса работы');
  act({
    type: 'edit-plan',
    plan: value(api.applyTemplate(current(state).plan, current(state).events, 'REPAIR_G1_TO_G3')),
  });
  agree(
    'Перенос будущего выпуска A на GRIND-3 проверен по текущему отчёту; исходные сроки, предупреждения и выполненный префикс сохранены.',
  );
  save('failure', '05 · Перенос после ремонта: согласованный преемник');
  act({ type: 'switch-role', role: 'manager' });
  act({ type: 'apply-absence' });
  save(
    'absence-raw',
    '06 · Отсутствие двух работников S2: до адаптации, не достигнутый физический результат при ошибках персонала',
  );
  act({
    type: 'edit-plan',
    plan: value(
      api.applyTemplate(current(state).plan, current(state).events, 'NIGHT_WRAP_STAGGERED'),
    ),
  });
  agree(
    'Ночная переналадка разделена на две волны; фиксированная заявка не увеличена, ошибки персонала устранены по отчёту, исходные дефициты не скрыты.',
  );
  save('absence', '07 · Итоговая адаптация согласована обеими ролями');
  const agreed = state.versions.filter((row) => row.status === 'agreed');
  check(agreed.length === 3, 'Expected three real agreed revisions in one lineage');
  const versions = state.versions.map((revision) => ({
    revision,
    evaluation: api.evaluate({ plan: revision.plan, events: revision.events }),
  }));
  for (const row of versions) {
    const report = value(row.evaluation);
    check(
      report.feasible && report.jobs.every((job) => job.complete),
      'Agreed physical/work coverage failure',
    );
    check(
      report.jobs.length === api.REQUIRED_WORK.reduce((sum, work) => sum + work.count, 0),
      'Mandatory work count incomplete',
    );
    check(
      report.shifts.length === 4 &&
        report.machineIntervals.length &&
        report.stockIntervals.length &&
        report.staffIntervals.length,
      'Incomplete authoritative ledger',
    );
  }
  return {
    seed,
    requests,
    reasons,
    stages,
    actions,
    state,
    versions,
    alternatives,
    comparison,
    selected,
    rationale,
  };
}

/** @param {Awaited<ReturnType<typeof domain>>} api @param {number} minute @param {'start'|'end'} edge */
function calendarTime(api, minute, edge) {
  const coordinate = api.toCalendarMinute(minute, edge);
  const clock = coordinate + 480;
  return `D+${Math.floor(clock / 1440) + 1} ${String(Math.floor((clock % 1440) / 60)).padStart(2, '0')}:${number.format(clock % 60).padStart(2, '0')} (к.м. ${number.format(coordinate)})`;
}
/** @param {Awaited<ReturnType<typeof domain>>} api @param {{start:number,end:number}[]} spans */
function spans(api, spans) {
  return spans
    .map(
      (row) =>
        `[${number.format(row.start)}, ${number.format(row.end)}) / ${calendarTime(api, row.start, 'start')} — ${calendarTime(api, row.end, 'end')}`,
    )
    .join('; ');
}
/** @param {Report} report */
function totals(report) {
  return {
    packed: report.shifts.reduce((sum, row) => sum + row.packed.A + row.packed.B + row.packed.C, 0),
    deficit: report.orders.reduce((sum, row) => sum + row.originalDeficit, 0),
    peak: Math.max(...report.shifts.map((row) => row.peak)),
    labor: report.shifts.reduce((sum, row) => sum + row.laborMinutes, 0),
  };
}
/** @param {ReturnType<typeof lineage>} data */
function impacts(data) {
  /** @param {string} key */
  const stage = (key) => {
    const found = data.stages.find((row) => row.key === key);
    check(found, `Missing ${key}`);
    return found;
  };
  const baseline = stage('baseline');
  const raw = stage('failure-raw');
  const repaired = stage('failure');
  const absent = stage('absence-raw');
  const final = stage('absence');
  /** @param {Report} report */
  const output = (report) =>
    report.machineIntervals
      .filter((row) => row.machineId === 'GRIND-1' && row.kind === 'produce' && row.product === 'A')
      .reduce(
        (sum, row) =>
          sum + row.rate * Math.max(0, Math.min(row.end, 270) - Math.max(row.start, 120)),
        0,
      );
  /** @param {Stage} row */
  const nightPeak = (row) =>
    Math.max(
      0,
      ...row.report.staffIntervals
        .filter((span) => span.start < 965 && span.end > 915)
        .map((span) => span.total),
    );
  const beforeAvailable = repaired.report.shifts.find((row) => row.shift === 2)?.available;
  const afterAvailable = final.report.shifts.find((row) => row.shift === 2)?.available;
  check(
    beforeAvailable !== undefined && afterAvailable !== undefined,
    'Missing actual S2 availability',
  );
  return {
    repair: {
      machineId: 'GRIND-1',
      workSpan: { start: 120, end: 270 },
      baselineActualAInWindow: output(baseline.report),
      failedActualAInWindow: output(raw.report),
      actualDisplacedA: output(baseline.report) - output(raw.report),
      totalPackedBefore: totals(baseline.report).packed,
      totalPackedBeforeAdaptation: totals(raw.report).packed,
      totalPackedAfterAdaptation: totals(repaired.report).packed,
    },
    absence: {
      requestedS2: data.requests[1],
      availableBefore: beforeAvailable,
      availableAfter: afterAvailable,
      availabilityDelta: afterAvailable - beforeAvailable,
      nightPeakBeforeAdaptation: nightPeak(absent),
      nightPeakAfterAdaptation: nightPeak(final),
      setupChanges: current(final.workflow).plan.setups.filter(
        (row) => row.machineId === 'WRAP-14' || row.machineId === 'WRAP-15',
      ),
      beforeAdaptationFeasible: absent.report.feasible,
      afterAdaptationFeasible: final.report.feasible,
    },
  };
}

/** @param {Awaited<ReturnType<typeof domain>>} api @param {ReturnType<typeof lineage>} data @param {string} sourceId */
function passport(api, data, sourceId) {
  const effects = impacts(data);
  const conditions = [
    'Учебная детерминированная симуляция, не MES, не оптимизатор и не результат заводского пилота. Все числа получены из публичных API текущего кандидата.',
    'Количество — тысячи лезвий. JSON хранит полные конечные числа; только HTML округляет до трёх знаков. EPSILON = 1e-6.',
    'Скорость каждого станка = номинал × 0,85 / 1000, коэффициент применяется один раз. Материал передаётся непрерывно по реальным очередям; сырьё не ограничено только на PRESS.',
    'Четыре смены по 630 рабочих минут. Перерывы и передача смены исключены календарными API. Интервалы полуоткрытые; завершение в границе срока учитывается.',
    'Начальные запасы REWIND/WASH/WRAP вводятся один раз. B обходит CHROME; C использует LASER. Выполненные префиксы t<120 и t<630 сохраняются при событиях.',
    'Операторы универсальны; отдельное покрытие каждого запуска/переналадки/валидации. Валидация добавляет одного человека. Ремонтная служба вне заявки; ремонт не заменяет ТО.',
    'S1/S2 зафиксированы реальным переходом до D 12:00. S3/S4 — прогнозы. Отсутствие меняет доступность, не заявку. Выбор шаблона сам по себе не доказывает физическую допустимость.',
    'Предупреждения по срокам явно приняты двумя ролями; это не изменяет исходных объёмов/сроков. Нет наблюдений фабрики, интеграций, доказательства оптимальности или универсального восстановления сбоев.',
    'Источник условий: неизменённый исходный кейс PDF с. 5–10, SOURCE_REQUIREMENTS и актуальный PUBLIC_SPEC. Статические слайды описывают предложение пилота, а не уже проведённый пилот.',
  ];
  const inputs =
    table(
      'Маршруты',
      ['Продукт', 'Операции'],
      Object.entries(api.ROUTES).map(([product, route]) => [product, route.join(' → ')]),
    ) +
    table(
      'Начальные запасы, тыс.',
      ['Перед операцией', 'A', 'B', 'C'],
      Object.entries(api.INITIAL_STOCKS).map(([operation, stock]) => [
        operation,
        stock.A,
        stock.B,
        stock.C,
      ]),
    ) +
    table(
      'Матрица переналадок, рабочие минуты',
      ['Из', 'В A', 'В B', 'В C'],
      Object.entries(api.SETUP_MINUTES).map(([product, row]) => [product, row.A, row.B, row.C]),
    ) +
    table(
      'Все станки: исходная настройка и скорость',
      ['Станок', 'Операция', 'Продукт', 'Номинал, лезв./мин', 'Эффективная, тыс./мин'],
      api.MACHINES.map((machine) => [
        machine.id,
        machine.operation,
        machine.initialProduct,
        api.NOMINAL_RATES[machine.operation],
        (api.NOMINAL_RATES[machine.operation] * 0.85) / 1000,
      ]),
    ) +
    table(
      'Нормы обязательных работ',
      ['Код', 'Операция', 'Станков', 'Минут/станок', 'Смены', 'Продукт'],
      api.REQUIRED_WORK.map((row) => [
        row.code,
        row.operation,
        row.count,
        row.minutes,
        `S${row.firstShift}–S${row.lastShift}`,
        row.product,
      ]),
    );
  const choices = table(
    'Физически проверенные альтернативы при исходной заявке',
    [
      'Вариант',
      'Допустим',
      'PACK всего',
      'Исходный дефицит',
      'Пики S1/S2/S3/S4',
      'Труд, чел.-мин',
      'Резерв, чел.-мин',
      'Работ выполнено',
    ],
    data.alternatives.map((row) => [
      row.name,
      row.report.feasible ? 'Да' : 'Нет',
      totals(row.report).packed,
      totals(row.report).deficit,
      row.report.shifts.map((shift) => number.format(shift.peak)).join('/'),
      totals(row.report).labor,
      row.report.shifts.reduce((sum, shift) => sum + shift.reserveMinutes, 0),
      `${row.report.jobs.filter((job) => job.complete).length}/${row.report.jobs.length}`,
    ]),
  );
  const reports = data.stages
    .filter((row) => !['planner', 'manager'].includes(row.key))
    .map((stage) => {
      const { report } = stage;
      const revision = current(stage.workflow);
      return (
        `<section id="${escape(stage.key)}"><h2>${escape(stage.caption)}</h2><p>Версия ${revision.id}; родитель ${display(revision.parentId)}; статус ${escape(revision.status)}; физическая допустимость: <strong>${report.feasible ? 'Да' : 'Нет — контрфактическая проекция, не достигнутый выпуск'}</strong>.</p>` +
        table(
          'Выпуск, запасы готовой продукции и исходные обязательства по сменам',
          [
            'Смена',
            'PACK A',
            'PACK B',
            'PACK C',
            'Новая аллокация',
            'Исходный дефицит срока',
            'Готово не распределено A/B/C',
          ],
          report.shifts.map((row) => [
            row.shift,
            row.packed.A,
            row.packed.B,
            row.packed.C,
            row.fulfilled,
            row.dueDeficit,
            [row.finishedUnallocated.A, row.finishedUnallocated.B, row.finishedUnallocated.C]
              .map((n) => number.format(n))
              .join('/'),
          ]),
        ) +
        table(
          'Персонал, фактическая доступность, прогноз и резерв',
          [
            'Смена',
            'Заявка',
            'Доступно',
            'Прогноз',
            'Пик',
            'Все интервалы пика: рабочее / календарное время',
            'Труд, чел.-мин',
            'Резерв, чел.-мин',
            'Обоснование S1/S2',
          ],
          report.shifts.map((row) => [
            row.shift,
            row.requested,
            row.available,
            row.shift > 2 ? revision.plan.forecasts[row.shift - 3] : '—',
            row.peak,
            spans(api, row.peakSpans),
            row.laborMinutes,
            row.reserveMinutes,
            row.shift <= 2
              ? revision.plan.reserveReasons[row.shift - 1]
              : 'Прогноз следующего цикла',
          ]),
        ) +
        table(
          'Закрывающие запасы всех реальных операционных очередей (включая нулевые)',
          ['Смена', 'Продукт', 'Перед операцией', 'Тыс.'],
          report.shifts.flatMap((shift) =>
            shift.stocks.map((stock) => [shift.shift, stock.product, stock.before, stock.quantity]),
          ),
        ) +
        `<p>PRESS: неограниченное сырьё, не промежуточный запас. PACK: очередь входа показана выше, готовые нераспределённые единицы отдельно. Ненулевые внутренние запасы не объединены в условную стадию.</p>` +
        table(
          'Заказы: оригиналы, обещания и распределение',
          [
            'Заказ',
            'Продукт',
            'Исходный объём',
            'Исходный срок',
            'Приоритет',
            'Обещание объём/срок/причина',
            'По S1/S2/S3/S4',
            'К исходному сроку',
            'Исходный дефицит',
            'К обещанному сроку',
            'Дефицит обещания',
            'Завершён в t',
          ],
          report.orders.map((row) => {
            const order = revision.plan.orders.find((item) => item.id === row.orderId);
            check(order, 'Order report without original');
            return [
              order.id,
              order.product,
              order.quantity,
              order.originalDue,
              order.priority,
              order.promise
                ? `${number.format(order.promise.quantity)} / S${order.promise.due} / ${order.promise.reason}`
                : 'Нет',
              row.allocatedByShift.map((n) => number.format(n)).join('/'),
              row.atOriginalDue,
              row.originalDeficit,
              row.atPromiseDue,
              row.promiseDeficit,
              row.completedAt,
            ];
          }),
        ) +
        table(
          'Все обязательные задания: реальные размещения и зачёт',
          [
            'ID / код',
            'Станок',
            'Рабочий интервал t',
            'Календарное начало',
            'Календарный конец',
            'Зачтено рабочих минут',
            'Выполнено',
            'Замечания',
          ],
          report.jobs.map((row) => {
            const job = revision.plan.jobs.find((item) => item.id === row.jobId);
            check(job, 'Job report without input');
            return [
              `${job.id} / ${job.code}`,
              job.machineId,
              `[${number.format(job.start)}, ${number.format(job.end)})`,
              calendarTime(api, job.start, 'start'),
              calendarTime(api, job.end, 'end'),
              row.creditedMinutes,
              row.complete ? 'Да' : 'Нет',
              row.issues.join('; '),
            ];
          }),
        ) +
        table(
          'Предупреждения и физические ошибки',
          ['Код', 'Уровень', 'Ссылки', 'Начало', 'Конец', 'Сообщение'],
          report.issues.map((row) => [
            row.code,
            row.severity,
            row.refs.join(', '),
            row.start,
            row.end,
            row.message,
          ]),
        ) +
        table(
          'Подтверждения и явно принятые риски',
          ['Роли', 'Код', 'Причина'],
          revision.acknowledgements.map((row) => [
            revision.approvals.join(', '),
            row.code,
            row.reason,
          ]),
        ) +
        '</section>'
      );
    })
    .join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Паспорт учебного сценария</title><style>body{font:14px/1.45 system-ui,sans-serif;margin:2rem;color:#152c24;background:white}h1,h2,h3{break-after:avoid}h2{margin-top:2rem}table{border-collapse:collapse;width:100%;font-size:11px;margin:1rem 0}caption{text-align:left;font-weight:bold;font-size:14px}td,th{border:1px solid #82938b;padding:5px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}.scroll{overflow-x:auto}code{overflow-wrap:anywhere}a{color:#145738}@page{size:A3 landscape;margin:12mm}@media print{body{margin:0;font-size:11px}.scroll{overflow:visible}h2{break-before:page}a{color:inherit}}</style></head><body><h1>Паспорт учебного производственного сценария</h1><p><strong>Симуляция, не производственная система и не результат фабричного пилота.</strong></p><p>Кандидат: <code>${escape(sourceId)}</code>. Рабочие минуты и тыс. лезвий; показано до 3 знаков, полный JSON без округления.</p><nav><a href="scenario-lineage.json">Полный JSON всех версий и интервалов</a> · <a href="scenario-passport.pdf">PDF паспорта</a> · <a href="presentation.pdf">PDF презентации</a> · <a href="screenshots/index.html">Резервные скриншоты с подписями</a></nav><h2>Входные условия и допущения</h2><ul>${conditions.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>${inputs}<h2>Выбор базового варианта</h2>${choices}<p>${escape(data.rationale)}</p><p>Дельта «параллельный минус последовательный»: PACK A/B/C ${Object.values(
    data.comparison.delta.packed,
  )
    .map((n) => number.format(n))
    .join(
      '/',
    )}; исходный дефицит ${display(data.comparison.delta.originalDeficit)}; труд ${display(data.comparison.delta.laborMinutes)} чел.-мин.</p><h2>Последовательные события: расчёт, не предположение</h2><p>Сбой GRIND-1: ${escape(spans(api, [effects.repair.workSpan]))}. Фактически вытесненный из окна выпуск A: <strong>${display(effects.repair.actualDisplacedA)}</strong> тыс. Это интеграл реальных исходных интервалов минус интервалы с ремонтом, не жёстко заданный ответ 102. PACK до события / до переноса / после переноса: ${[effects.repair.totalPackedBefore, effects.repair.totalPackedBeforeAdaptation, effects.repair.totalPackedAfterAdaptation].map((n) => number.format(n)).join(' / ')}.</p><p>После отсутствия S2: неизменённая заявка ${display(effects.absence.requestedS2)}, доступность ${display(effects.absence.availableBefore)} → ${display(effects.absence.availableAfter)}, вычисленная разница ${display(effects.absence.availabilityDelta)}. Пик в ночном окне t=[915,965) до/после адаптации ${display(effects.absence.nightPeakBeforeAdaptation)} / ${display(effects.absence.nightPeakAfterAdaptation)}. Реальные записи изменённых переналадок и контрфактический исходный отчёт сохранены в JSON.</p>${reports}<h2>Контроль комплектности и ограничения</h2><ul><li>Три реальные согласованные версии одной цепочки; каждую подтвердили обе роли через transition.</li><li>Каждая согласованная версия физически допустима по evaluate, содержит 4 смены, все задания, машинные/материальные/кадровые интервалы.</li><li>Доадаптационные отчёты не названы достигнутым результатом, если есть физические ошибки.</li><li>Исходные сроки и дефициты не заменены обещаниями; сохранены все предупреждения и причины принятия.</li><li>Печатный паспорт — сводка; полный интервальный журнал и назначения только в JSON без усечения. PDF, ссылки и скриншоты проверяются отдельным экспортным инструментом; независимая приёмка продукта этим не заменяется.</li><li>Печать зависит от установленного Chromium и локальных системных шрифтов. Статическая презентация не является числовым источником отчётов.</li></ul></body></html>\n`;
}

/** Build once into memory, reserve 4183 strictly, never read/write dist or contact 4173. */
async function serve() {
  /** @type {Map<string, Buffer>} */
  const assets = new Map();
  const server = createServer((request, response) => {
    void (async () => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end();
        return;
      }
      const pathname = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/');
      if (
        !pathname.startsWith('/') ||
        pathname.includes('\\') ||
        pathname.includes('\0') ||
        pathname.split('/').some((part) => part === '..' || part === '.' || part.includes(':'))
      ) {
        response.writeHead(400).end();
        return;
      }
      const key = pathname === '/' ? '/index.html' : pathname;
      let bytes = assets.get(key);
      if (!bytes && pathname.startsWith('/artifacts/'))
        bytes = (await readPinnedFile(root, path.join(root, pathname.slice(1)))).bytes;
      if (!bytes && !pathname.startsWith('/artifacts/')) {
        bytes = (await readPinnedFile(root, path.join(root, 'public', pathname.slice(1)))).bytes;
        assets.set(key, bytes);
      }
      const ext = path.extname(key);
      /** @type {Record<string,string>} */
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.pdf': 'application/pdf',
      };
      response.writeHead(200, {
        'Content-Type': mime[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    })().catch(() => {
      if (!response.headersSent) response.writeHead(404);
      response.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4183, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(undefined);
    });
  });
  try {
    const result = await build({
      root,
      configFile: false,
      base: './',
      publicDir: false,
      logLevel: 'warn',
      build: { write: false, emptyOutDir: false, target: 'es2023', sourcemap: false },
    });
    const outputs = Array.isArray(result) ? result : 'output' in result ? [result] : [];
    for (const output of outputs)
      for (const item of output.output)
        assets.set(
          `/${item.fileName}`,
          Buffer.from(item.type === 'chunk' ? item.code : item.source),
        );
    check(assets.has('/index.html'), 'In-memory production build has no index');
    return { server, assets };
  } catch (error) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    throw error;
  }
}

/** Audited against main.ts section headings; nested ledger regions are not interchangeable.
 * @param {Page} page @param {string} key
 */
function uiRegion(page, key) {
  /** @type {Record<string, RegExp>} */
  const names = {
    overview: /^01\s*План в цифрах$/,
    orders: /^02\s*Заказы и спрос$/,
    planning: /^03\s*Выбор производственного решения$/,
    history: /^05\s*Совместное согласование$/,
  };
  const name = names[key];
  check(name, `Unknown semantic UI region: ${key}`);
  return page.getByRole('region', { name });
}
/** All action locators use exact accessible names in their owning section/form/group.
 * No table pagination or dialog control is selected globally.
 * @param {Page} page @param {string} key
 */
function uiControl(page, key) {
  const roles = page.getByRole('group', { name: 'Учебная роль', exact: true });
  const planning = uiRegion(page, 'planning');
  const history = uiRegion(page, 'history');
  /** @type {Record<string, import('@playwright/test').Locator>} */
  const controls = {
    'send-demand': uiRegion(page, 'orders').getByRole('button', {
      name: 'Передать спрос',
      exact: true,
    }),
    'role-manager': roles.getByRole('button', { name: 'Руководитель', exact: true }),
    'role-planner': roles.getByRole('button', { name: 'Планировщик', exact: true }),
    'compare-templates': planning.getByRole('button', { name: 'Сравнить варианты', exact: true }),
    'preview-template': planning.getByRole('button', {
      name: 'Предпросмотр варианта',
      exact: true,
    }),
    'apply-template': planning.getByRole('button', { name: 'Применить вариант', exact: true }),
    'fix-requests': page
      .getByRole('form', { name: 'Заявка на персонал', exact: true })
      .getByRole('button', { name: 'Зафиксировать заявки', exact: true }),
    'submit-plan': history.getByRole('button', { name: 'Отправить на согласование', exact: true }),
    'approve-plan': history.getByRole('button', { name: 'Подтвердить версию', exact: true }),
    failure: history.getByRole('button', { name: 'Сбой GRIND-1', exact: true }),
    absence: history.getByRole('button', { name: 'Отсутствие S2', exact: true }),
    'export-json': page
      .getByRole('region', { name: 'Паспорт сценария', exact: true })
      .getByRole('button', { name: 'Экспорт JSON', exact: true }),
  };
  const control = controls[key];
  check(control, `Unknown semantic UI action: ${key}`);
  return control;
}
/** @param {Page} page */
async function idle(page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 120_000 });
  await expect(uiControl(page, 'export-json')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
/** @param {Page} page @param {string} key */
async function click(page, key) {
  await uiControl(page, key).click();
  await idle(page);
}
/** @param {Page} page @param {string} template */
async function choose(page, template) {
  await uiRegion(page, 'planning')
    .getByRole('combobox', { name: 'Вариант плана', exact: true })
    .selectOption(template);
  await click(page, 'preview-template');
  await click(page, 'apply-template');
}
/** @param {Page} page @param {string} reason */
async function approve(page, reason) {
  await uiRegion(page, 'history')
    .getByRole('textbox', { name: 'Причина принятия рисков', exact: true })
    .fill(reason);
  await click(page, 'submit-plan');
  await click(page, 'approve-plan');
  await click(page, 'role-planner');
  await click(page, 'approve-plan');
}
/** Public download only: never read window variables, private state or DOM-derived numbers.
 * @param {Page} page
 */
async function exported(page) {
  const download = page.waitForEvent('download');
  await click(page, 'export-json');
  const stream = await (await download).createReadStream();
  /** @type {Buffer[]} */
  const chunks = [];
  for await (const chunk of stream) {
    const bytes = /** @type {unknown} */ (chunk);
    check(Buffer.isBuffer(bytes), 'Unexpected UI download stream data');
    chunks.push(bytes);
  }
  const bytes = Buffer.concat(chunks);
  /** @type {unknown} */
  const raw = JSON.parse(bytes.toString('utf8'));
  const result =
    /** @type {{schemaVersion: number, workflow: Workflow, evaluation: import('../src/domain/model.ts').Result<Report>}} */ (
      raw
    );
  finiteTree(result);
  check(result.schemaVersion === 1, 'UI export schema mismatch');
  return { result, bytes };
}
/** @param {Page} page @param {Stage} stage @param {string} filename @param {string} [anchor] */
async function capture(page, stage, filename, anchor = 'overview') {
  const actual = await exported(page);
  check(
    JSON.stringify(actual.result.workflow) === JSON.stringify(stage.workflow),
    `Actual UI workflow differs at ${stage.key}`,
  );
  check(
    JSON.stringify(value(actual.result.evaluation)) === JSON.stringify(stage.report),
    `Actual UI report differs at ${stage.key}`,
  );
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const audit = await page.evaluate(async () => {
    const browser = /** @type {typeof globalThis & {axe: typeof import('axe-core')}} */ (
      globalThis
    );
    const result = await browser.axe.run(browser.document);
    return result.violations.map((row) => ({
      id: row.id,
      impact: row.impact ?? null,
      nodes: row.nodes.length,
    }));
  });
  const serious = audit.filter((row) => row.impact === 'serious' || row.impact === 'critical');
  accessibility.push({
    state: stage.key,
    seriousCritical: serious.length,
    lower: audit.filter((row) => !serious.includes(row)),
  });
  check(
    !serious.length,
    `Axe serious/critical findings at ${stage.key}: ${JSON.stringify(serious)}`,
  );
  await uiRegion(page, anchor).scrollIntoViewIfNeeded();
  await write(
    `artifacts/screenshots/${filename}`,
    await page.screenshot({ fullPage: false, animations: 'disabled' }),
  );
  captures.push({
    path: `screenshots/${filename}`,
    caption: stage.caption,
    version: stage.workflow.currentId,
    phase: stage.workflow.phase,
    role: stage.workflow.role,
    width: page.viewportSize()?.width ?? 0,
    exportSha256: hash(actual.bytes),
  });
}

/** @param {Page} page @param {string} url @param {string} output */
async function pdf(page, url, output) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  const bytes = await page.pdf({ printBackground: true, preferCSSPageSize: true, tagged: true });
  check(bytes.subarray(0, 5).toString('ascii') === '%PDF-', 'Invalid PDF header');
  const pages = [...bytes.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  check(pages > 0, 'Cannot verify any PDF page dictionary');
  await write(output, bytes);
  const record = files.at(-1);
  check(record, 'Missing PDF output record');
  record.pages = pages;
  await page.emulateMedia({ media: 'screen' });
}

/** @param {Page} page */
async function links(page) {
  const targets = await page.locator('a[href]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      href: /** @type {HTMLAnchorElement} */ (node).href,
      caption: node.textContent?.trim() ?? '',
    })),
  );
  for (const target of targets) {
    check(target.caption.length, 'Uncaptioned local link');
    const url = new URL(target.href);
    check(url.origin === origin, 'Nonlocal document link');
    if (url.hash && url.pathname === new URL(page.url()).pathname) {
      check(
        await page.locator(`[id="${decodeURIComponent(url.hash.slice(1))}"]`).count(),
        'Missing local fragment',
      );
    } else {
      const response = await page.request.get(target.href);
      check(response.ok(), `Missing local link: ${target.href}`);
      await response.dispose();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  check(
    args.includes('--run') && args.every((arg) => arg === '--run' || arg === '--evidence'),
    'Staged exporter: run node tools/export-deliverables.mjs --run [--evidence] only after the foreground browser run finishes.',
  );
  const sourceId = candidate();
  let completed = false;
  let failure = '';
  try {
    const api = await domain();
    const data = lineage(api);
    const exportDocument = {
      schemaVersion: 1,
      sourceCandidateId: sourceId,
      disclosure: 'Учебная симуляция, не результаты фабричного пилота',
      source: {
        epsilon: api.EPSILON,
        machines: api.MACHINES,
        routes: api.ROUTES,
        nominalRates: api.NOMINAL_RATES,
        initialStocks: api.INITIAL_STOCKS,
        setupMinutes: api.SETUP_MINUTES,
        requiredOrders: api.REQUIRED_ORDERS,
        requiredWork: api.REQUIRED_WORK,
      },
      seed: data.seed,
      selected: data.selected,
      rationale: data.rationale,
      alternatives: data.alternatives,
      comparison: data.comparison,
      impacts: impacts(data),
      actions: data.actions,
      checkpoints: data.stages,
      workflow: data.state,
      versions: data.versions,
      authoritativeWorkflowExport: /** @type {unknown} */ (
        JSON.parse(api.exportWorkflow(data.state))
      ),
    };
    await write('artifacts/scenario-lineage.json', json(exportDocument));
    await write('artifacts/scenario-passport.html', passport(api, data, sourceId));
    const { server, assets } = await serve();
    const browser = await chromium.launch().catch(async (error) => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      throw error;
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        colorScheme: 'light',
        serviceWorkers: 'block',
        acceptDownloads: true,
      });
      context.on('page', (page) => {
        page.on('pageerror', (error) => runtimeErrors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') runtimeErrors.push(message.text());
        });
        page.on('requestfailed', (request) => {
          const url = new URL(request.url());
          runtimeErrors.push(`Request failed: ${url.origin}${url.pathname}`);
        });
        page.on('response', (response) => {
          if (response.status() >= 400)
            runtimeErrors.push(`HTTP ${response.status()} ${response.url()}`);
        });
      });
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) {
          blocked.push({ kind: 'http', url: `${url.protocol}//${url.host}${url.pathname}` });
          return route.abort();
        }
        return route.continue();
      });
      await context.routeWebSocket(/.*/, async (route) => {
        const url = new URL(route.url());
        blocked.push({ kind: 'websocket', url: `${url.protocol}//${url.host}${url.pathname}` });
        await route.close({ code: 1008, reason: 'Offline export forbids WebSockets' });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(120_000);
      await page.goto(origin, { waitUntil: 'networkidle' });
      await idle(page);
      /** @param {string} key */
      const stage = (key) => {
        const found = data.stages.find((row) => row.key === key);
        check(found, `Missing ${key}`);
        return found;
      };
      await capture(page, stage('planner'), '01-planner.png', 'orders');
      await click(page, 'send-demand');
      await click(page, 'role-manager');
      await click(page, 'compare-templates');
      await choose(page, data.selected);
      const staffing = page.getByRole('form', { name: 'Заявка на персонал', exact: true });
      for (const [label, content] of [
        ['S1', String(data.requests[0])],
        ['S2', String(data.requests[1])],
        ['Резерв S1', data.reasons[0]],
        ['Резерв S2', data.reasons[1]],
      ]) {
        check(label !== undefined && content !== undefined, 'Missing staffing form data');
        await staffing.getByLabel(label, { exact: true }).fill(content);
      }
      await click(page, 'fix-requests');
      await capture(page, stage('manager'), '02-manager.png', 'planning');
      await approve(page, data.rationale);
      await capture(page, stage('baseline'), '03-baseline-agreed.png', 'history');
      await click(page, 'role-manager');
      await click(page, 'failure');
      await capture(page, stage('failure-raw'), '04-failure-impact.png', 'history');
      await choose(page, 'REPAIR_G1_TO_G3');
      await approve(
        page,
        current(stage('failure').workflow).acknowledgements[0]?.reason ??
          'Перенос проверен, предупреждения приняты.',
      );
      await capture(page, stage('failure'), '05-repair-agreed.png', 'history');
      await click(page, 'role-manager');
      await click(page, 'absence');
      await capture(page, stage('absence-raw'), '06-absence-impact.png', 'history');
      await choose(page, 'NIGHT_WRAP_STAGGERED');
      await approve(
        page,
        current(stage('absence').workflow).acknowledgements[0]?.reason ??
          'Ночная адаптация проверена, предупреждения приняты.',
      );
      await capture(page, stage('absence'), '07-final-agreed.png', 'history');
      await page.setViewportSize({ width: 390, height: 844 });
      await capture(
        page,
        {
          ...stage('absence'),
          caption: '08 · Мобильный итог 390 px: та же реально согласованная версия',
        },
        '08-final-mobile.png',
      );
      check(captures.length >= 6, 'Incomplete interactive backup sequence');
      await write(
        'artifacts/screenshots/index.html',
        `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Резервная демонстрация</title><style>body{font:16px system-ui;max-width:1440px;margin:1rem auto;padding:1rem}img{max-width:100%;height:auto}figure{margin:2rem 0}</style><h1>Реальные шаги учебной симуляции</h1><p>Кандидат ${escape(sourceId)}. Это выполненные взаимодействия, не макеты и не фабричные наблюдения. Для каждого кадра публичный JSON интерфейса совпал с соответствующим отчётом и workflow публичных API.</p><a href="../scenario-passport.html">Паспорт</a>${captures.map((row) => `<figure><img src="${escape(path.posix.basename(row.path))}" alt="${escape(row.caption)}" width="${row.width}"><figcaption>${escape(row.caption)} · версия ${row.version} · ${escape(row.role)} · ${row.width} px</figcaption></figure>`).join('')}</html>\n`,
      );
      const print = await context.newPage();
      await pdf(
        print,
        `${origin}/artifacts/scenario-passport.html`,
        'artifacts/scenario-passport.pdf',
      );
      await pdf(print, `${origin}/slides.html`, 'artifacts/presentation.pdf');
      await print.goto(`${origin}/artifacts/scenario-passport.html`, { waitUntil: 'networkidle' });
      await links(print);
      await print.goto(`${origin}/artifacts/screenshots/index.html`, { waitUntil: 'networkidle' });
      await links(print);
      for (const image of await print.locator('img').evaluateAll((nodes) =>
        nodes.map((node) => {
          const image = /** @type {HTMLImageElement} */ (node);
          return { loaded: image.complete && image.naturalWidth > 0, alt: image.alt };
        }),
      ))
        check(image.loaded && image.alt, 'Screenshot image/caption missing');
      await print.goto(`${origin}/slides.html`, { waitUntil: 'networkidle' });
      await links(print);
      check(
        !blocked.length && !runtimeErrors.length,
        `Export runtime violations: ${JSON.stringify({ blocked, runtimeErrors })}`,
      );
      check(
        candidate() === sourceId,
        'Source changed while exporting; do not accept mixed-candidate artifacts',
      );
      const buildEntries = [...assets.entries()]
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([file, bytes]) => ({ path: file, sha256: hash(bytes) }));
      await write(
        'artifacts/export-checks.json',
        json({
          sourceCandidateId: sourceId,
          completed: true,
          screenshots: captures,
          accessibility,
          blocked,
          runtimeErrors,
          outputs: files,
          memoryBuildId: hash(json(buildEntries)),
          memoryBuildEntries: buildEntries,
          pdfPageCountMethod:
            'Chromium /Type /Page dictionaries; independent PDF reader review remains required',
          limitations: [
            'Not product acceptance or factory-pilot evidence',
            'Lower-impact axe findings recorded for human review',
            'Print rendering/local fonts may vary; actual generated bytes are hashed',
            'Static source slides/UI pre-export limitations are historical; this export package inventory is authoritative',
          ],
        }),
      );
      await write(
        'artifacts/README.md',
        `# Материалы учебной демонстрации\n\nНе производственная система, не оптимизатор и не результаты заводского пилота. Кандидат: \`${sourceId}\`.\n\n- [Паспорт HTML](scenario-passport.html) — автономная русская сводка всех этапов.\n- [Паспорт PDF](scenario-passport.pdf).\n- [Презентация PDF](presentation.pdf) — печать существующего public/slides.html.\n- [Полный JSON](scenario-lineage.json) — входы, переходы, все версии и полные машинные/материальные/кадровые отчёты без округления.\n- [Резервная последовательность](screenshots/index.html) — ${captures.length} реальных кадров, включая 390 px.\n- [Проверки экспорта](export-checks.json) — идентичность UI/API, сеть, axe, хеши, страницы PDF и ограничения.\n\nПосле завершения приёмочного браузерного прогона в корне репозитория: \`node tools/export-deliverables.mjs --run --evidence\`. Нужны уже установленные зависимости и Chromium. Используется только собственный 127.0.0.1:4183: при занятом порте инструмент завершится ошибкой, без повторного использования чужого сервера. UI собирается один раз в памяти; dist и 4173 не изменяются. JSON/HTML можно читать отдельно; для всех относительных ссылок откройте папку через локальный HTTP-сервер. Для повторной проверки хешей: \`node tools/manifest.mjs source\`, \`node tools/manifest.mjs delivery\` (вывод сохранять вне artifacts, например в evidence).\n\nОтчёты до исправления физического конфликта — контрфактические проекции, а не фактическое производство. Сроки могут иметь честные дефициты. Полный интервальный журнал в JSON, не на каждой печатной странице. Независимые продуктовые тесты и проверка PDF отдельным просмотрщиком не заменяются этим инструментом. Фразы исходных слайдов/приложения о ещё не созданных PDF/скриншотах относятся к состоянию до отдельного экспорта; фактический состав этой папки описан здесь.\n`,
      );
      await context.close();
      completed = true;
    } finally {
      try {
        await browser.close();
      } finally {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
      }
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (!completed)
      await write(
        'artifacts/export-checks.json',
        json({
          sourceCandidateId: sourceId,
          completed: false,
          failure,
          captures,
          accessibility,
          blocked,
          runtimeErrors,
          outputs: files,
        }),
        false,
      );
    if (args.includes('--evidence'))
      await write(
        'evidence/export-checks.json',
        json({
          sourceCandidateId: sourceId,
          completed,
          failure,
          command: 'node tools/export-deliverables.mjs --run --evidence',
          cwd: root,
          node: process.version,
          captures,
          accessibility,
          blocked,
          runtimeErrors,
          outputs: files,
        }),
        false,
      );
  }
  console.log(
    `Export completed for ${sourceId}; ${captures.length} real screenshots. Review artifacts/export-checks.json and independently inspect PDFs.`,
  );
}

await main();
