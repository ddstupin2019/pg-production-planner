import type { Shift } from './model';

export interface Span {
  start: number;
  end: number;
}

function bounded(value: number, maximum: number): void {
  if (!Number.isFinite(value) || value < 0 || value > maximum) {
    throw new RangeError('Minute outside calendar domain');
  }
}

export function workingMinutes(start: number, end: number): number {
  bounded(start, 2880);
  bounded(end, 2880);
  if (end < start) throw new RangeError('Reversed interval');
  return ([1, 2, 3, 4] as const)
    .flatMap(workSpans)
    .reduce(
      (total, span) => total + Math.max(0, Math.min(end, span.end) - Math.max(start, span.start)),
      0,
    );
}

export function toWorkMinute(calendarMinute: number): number {
  return workingMinutes(0, calendarMinute);
}

export function toCalendarMinute(workMinute: number, edge: 'start' | 'end'): number {
  bounded(workMinute, 2520);
  if (edge !== 'start' && edge !== 'end') throw new RangeError('Unknown edge');
  if (workMinute === 2520) return 2850;
  let elapsed = 0;
  for (const span of ([1, 2, 3, 4] as const).flatMap(workSpans)) {
    const next = elapsed + span.end - span.start;
    if (workMinute < next || (workMinute === next && edge === 'end')) {
      return span.start + workMinute - elapsed;
    }
    elapsed = next;
  }
  return 2850;
}

export function workSpans(shift: Shift): Span[] {
  if (!Number.isInteger(shift) || shift < 1 || shift > 4) throw new RangeError('Unknown shift');
  const offset = (shift - 1) * 720;
  return [
    { start: offset, end: offset + 240 },
    { start: offset + 270, end: offset + 480 },
    { start: offset + 510, end: offset + 690 },
  ];
}
