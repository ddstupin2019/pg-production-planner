# Proposed public semantic UI contract — review before coder handoff

This artifact proposes accessible names for the interactions already required by PUBLIC_SPEC v1.1. It contains no private scenario data, expected numerical outputs or test paths. Acceptance by the orchestrator is required before these names become a coder obligation. Russian labels may include visible units, with the accessible name retaining the name below. Native controls are preferred; equivalent correctly implemented ARIA roles are acceptable. Status remains textual, never color alone.

## Navigation and state

- Buttons: `Планировщик`, `Руководитель`. Switching roles does not approve anything.
- Toggle button `Тёмная тема`, with `aria-pressed` reflecting the actual theme; disclosure `Учебная симуляция` remains visible in both themes.
- Named region `Состояние плана` exposes role, revision, draft/pending/agreed status and baseline/failure/absence phase in Russian, and fixed versus forecast staffing.
- Named tables `Заказы`, `Смены`, `Работы`, `Материалы`, `Оборудование`, `Персонал`, `Версии`. Local scrolling containers have accessible names and are keyboard reachable. Table `Смены` has one row per S1–S4 with column headings `Смена`, `Выпуск A`, `Выпуск B`, `Выпуск C`, `Пик`, `Труд, мин`, `Резерв, мин`. Numbers use display rounding only.
- Persistent Russian explanation of bounded GRIND-1/A failure, VAL-2 on GRIND-4/5, named choices and custom demand limits; no arbitrary failure target input.

## Orders and staffing

- Button `Добавить заказ` opens form `Заказ`. Controls: text `Код заказа`, select `Продукт` with A/B/C values, text/number `Объём` in thousand blades, select `Срок (смена)` with 1–4 values, select `Приоритет` with high/medium/low values. Button `Сохранить заказ`. Row action `Изменить заказ` opens the same form; original identities/quantities/deadlines stay immutable, renegotiation uses `Обещанный объём`, select `Обещанная смена` (1–4), textbox `Причина обещания` and button `Сохранить обещание`.
- Form errors use `role=alert`, identify the invalid field and keep entered values. User content is text, not HTML. Custom copies are explicitly labelled `Пользовательский сценарий`.
- Button `Передать спрос` sends the displayed valid demand.
- Form `Заявка на персонал`: spinbuttons `S1`, `S2`, `Прогноз S3`, `Прогноз S4`; textboxes `Резерв S1`, `Резерв S2`. Button `Зафиксировать заявки` fixes the two requests before noon, not the forecasts.

## Named editing choices and agreement

- Select `Вариант плана` uses option values `VAL2_STAGGERED`, `VAL2_PARALLEL`, `REPAIR_G1_TO_G3`, `NIGHT_WRAP_STAGGERED`, with understandable Russian visible labels. Button `Предпросмотр варианта` exposes named region `Изменения плана` with affected machines, work and staff before applying. Button `Применить вариант` commits the chosen candidate and reevaluates it.
- Button `Сравнить варианты` shows table `Сравнение вариантов` containing evaluated physical feasibility, output, original deficits, staffing peak, labor and work coverage. Invalid alternatives remain clearly invalid.
- Comparison table columns: `Вариант`, `Физически допустим`, `Выпуск A`, `Выпуск B`, `Выпуск C`, `Исходный дефицит`, `Пик S1`, `Пик S2`, `Пик S3`, `Пик S4`, `Труд, мин`, `Работы выполнено`, `Работы требуется`. Each variant is identified by its public template code alongside its Russian label. Region `Обоснование выбора` identifies the selected template and explains the decision using relevant comparison criteria.
- Textbox `Причина принятия рисков` records a rationale for all currently shown warning codes (or equivalent separately labelled per-code fields after public amendment). Buttons `Отправить на согласование`, `Подтвердить версию`. Both roles approve the same unchanged revision; button availability/status reflects the guards.
- Button `Сбой GRIND-1` applies the prescribed event; `Отсутствие S2` applies the later absence only after failure-successor agreement. Invalid actions have explained guards, not silent changes.

## Export and restoration

- Button `Экспорт JSON` downloads deterministic UTF-8 JSON from the current real report, not a fixture.
- Region `Паспорт сценария` uses that same report; link `Презентация` opens a local Russian slide artifact. Printing limitations, if any, are disclosed.
- Inside the passport, named table `Паспорт: версия` has columns `Версия`, `План`, `Фаза`; `Паспорт: смены` has `Смена`, `Выпуск A`, `Выпуск B`, `Выпуск C`, `Выполнено`, `Дефицит в срок`; `Паспорт: персонал` has `Смена`, `Заявка`, `Доступно`, `Пик`, `Труд, мин`, `Резерв, мин`.
- Table `Паспорт: заказы` has columns `Заказ`, `Исходный объём`, `Исходная смена`, `К исходному сроку`, `Исходный дефицит`, `Обещанный объём`, `Обещанная смена`, `К обещанному сроку`, `Дефицит обещания`, `Выполнено S1`, `Выполнено S2`, `Выполнено S3`, `Выполнено S4`. Table `Паспорт: работы` has columns `Работа`, `Код`, `Станок`, `Начало`, `Конец`, `Зачтено, мин`, `Выполнена`. Row identifiers are the current plan, shift, order and job IDs, respectively.
- Button `Восстановить сценарий` restores mandatory inputs. Button `Сбросить` opens modal dialog `Сброс сценария` with `Отмена` and `Подтвердить сброс`. Focus enters and remains in the dialog; cancel preserves state, confirm restores originals.
- All interactions work by keyboard, at 390/1440 widths, in both themes, without page-wide overflow or remote runtime resources.
