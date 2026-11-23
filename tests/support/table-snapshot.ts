export interface RenderedCell {
  text: string;
  visible: boolean;
}
export interface RenderedTable {
  visible: boolean;
  headings: RenderedCell[];
  rows: RenderedCell[][];
}
export interface TableExpectation {
  keyHeading: string;
  tokenKeys?: boolean;
  rows: { key: string; fields: Record<string, number | string | null | boolean | RegExp> }[];
}

// Serialized by Locator.evaluate: deliberately self-contained, DOM-only and table-scoped.
export function readRenderedTable(table: Element): RenderedTable {
  const tableSelector = 'table, [role="table"]';
  const rowSelector = 'tr, [role="row"]';
  const belongs = (element: Element) => element.closest(tableSelector) === table;
  const rendered = (element: Element): RenderedCell => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      text: (element instanceof HTMLElement
        ? element.innerText
        : (element.textContent ?? '')
      ).trim(),
      // Offscreen / horizontally clipped cells are still rendered. Never use viewport intersection.
      visible:
        element.checkVisibility() &&
        style.visibility === 'visible' &&
        style.contentVisibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0,
    };
  };
  const headings: RenderedCell[] = [];
  const rows: RenderedCell[][] = [];
  for (const row of Array.from(table.querySelectorAll(rowSelector)).filter(belongs)) {
    const cells = Array.from(
      row.querySelectorAll('th, td, [role="cell"], [role="rowheader"], [role="columnheader"]'),
    ).filter((cell) => belongs(cell) && cell.closest(rowSelector) === row);
    const headerOnly = cells.every(
      (cell) => cell.tagName === 'TH' && cell.getAttribute('scope') !== 'row',
    );
    const isHeading = (cell: Element) => {
      const role = cell.getAttribute('role');
      if (role) return role === 'columnheader';
      return (
        cell.tagName === 'TH' &&
        cell.getAttribute('scope') !== 'row' &&
        (cell.getAttribute('scope') === 'col' || cell.closest('thead') !== null || headerOnly)
      );
    };
    headings.push(...cells.filter(isHeading).map(rendered));
    const data = cells.filter((cell) => !isHeading(cell)).map(rendered);
    if (data.length) rows.push(data);
  }
  return { visible: rendered(table).visible, headings, rows };
}

function requireThat(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function numeric(text: string): number {
  return Number(text.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
}

// All assertions operate on the single captured table; no per-row/cell browser round trips.
export function validateTable(snapshot: RenderedTable, expected: TableExpectation): void {
  requireThat(snapshot.visible, 'table is not rendered');
  const headings = snapshot.headings.map((cell) => cell.text);
  requireThat(headings.length > 0, 'missing headings');
  requireThat(new Set(headings).size === headings.length, 'duplicate headings');
  requireThat(
    snapshot.headings.every((cell) => cell.visible && cell.text.length > 0),
    'hidden/blank heading',
  );
  const keyIndex = headings.indexOf(expected.keyHeading);
  requireThat(keyIndex >= 0, `missing key heading ${expected.keyHeading}`);
  const keys = expected.rows.map((row) => row.key);
  requireThat(new Set(keys).size === keys.length, 'duplicate expected keys');
  requireThat(snapshot.rows.length === keys.length, 'missing or unexpected rows');
  const matched = new Set<string>();
  for (const cells of snapshot.rows) {
    requireThat(cells.length === headings.length, 'missing or unexpected cells');
    requireThat(
      cells.every((cell) => cell.visible),
      'hidden cell',
    );
    const identifier = cells[keyIndex]!.text;
    const matches = expected.rows.filter(({ key }) => {
      if (!expected.tokenKeys) return identifier === key;
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[^\\p{L}\\p{N}_-])${escaped}(?=$|[^\\p{L}\\p{N}_-])`, 'u').test(
        identifier,
      );
    });
    requireThat(matches.length === 1, `unexpected or ambiguous row key ${identifier}`);
    const row = matches[0]!;
    requireThat(!matched.has(row.key), `duplicate row key ${row.key}`);
    matched.add(row.key);
    for (const [heading, value] of Object.entries(row.fields)) {
      const index = headings.indexOf(heading);
      requireThat(index >= 0, `${row.key}: missing heading ${heading}`);
      const text = cells[index]!.text;
      const label = `${row.key}/${heading}: ${text}`;
      if (typeof value === 'number') {
        requireThat(text.length > 0, `${label}: missing number`);
        const actual = numeric(text);
        const tolerance = Number.isInteger(value) ? 1e-6 : 0.000501;
        requireThat(
          Number.isFinite(actual) && Math.abs(actual - value) <= tolerance,
          `${label}: wrong number`,
        );
      } else if (value === null) {
        requireThat(
          text.length > 0 && !Number.isFinite(numeric(text)),
          `${label}: null is not zero/blank`,
        );
      } else if (typeof value === 'boolean') {
        const pattern = value
          ? /^(?:Да|Допустим|Выполнена|Завершена)$/i
          : /^(?:Нет|Недопустим|Не выполнена|Не завершена)$/i;
        requireThat(pattern.test(text), `${label}: wrong boolean status`);
      } else if (value instanceof RegExp) {
        requireThat(value.test(text), `${label}: wrong text`);
      } else {
        requireThat(
          text.replace(/\s+/g, ' ') === value.replace(/\s+/g, ' '),
          `${label}: wrong text`,
        );
      }
    }
  }
  requireThat(matched.size === keys.length, 'missing row keys');
}
