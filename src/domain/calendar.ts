import type { Shift } from './model';
import { assertNumeric } from './numeric-invariant';

export interface Span {
  start: number;
  end: number;
}

function bounded(value: number, maximum: number): void {
  assertNumeric(
    Number.isFinite(value) && value >= 0 && value <= maximum,
    'Minute outside calendar domain',
    RangeError,
  );
}

export function workingMinutes(start: number, end: number): number {
  bounded(start, 2880);
  bounded(end, 2880);
  assertNumeric(end >= start, 'Reversed interval', RangeError);
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
  const previousShiftEnd = edge === 'end' && workMinute > 0 && workMinute % 630 === 0;
  const shiftIndex = Math.floor(workMinute / 630) - (previousShiftEnd ? 1 : 0);
  const local = workMinute - shiftIndex * 630;
  const offset = shiftIndex * 720;
  if (local < 240 || (local === 240 && edge === 'end')) return offset + local;
  if (local < 450 || (local === 450 && edge === 'end')) return offset + local + 30;
  return offset + local + 60;
}

export function workSpans(shift: Shift): Span[] {
  assertNumeric(Number.isInteger(shift) && shift >= 1 && shift <= 4, 'Unknown shift', RangeError);
  const offset = (shift - 1) * 720;
  return [
    { start: offset, end: offset + 240 },
    { start: offset + 270, end: offset + 480 },
    { start: offset + 510, end: offset + 690 },
  ];
}
