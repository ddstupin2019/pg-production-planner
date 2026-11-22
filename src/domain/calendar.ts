import type { Shift } from './model';

export interface Span {
  start: number;
  end: number;
}

export function workingMinutes(_start: number, _end: number): number {
  throw new Error('Not implemented: workingMinutes');
}

export function toWorkMinute(_calendarMinute: number): number {
  throw new Error('Not implemented: toWorkMinute');
}

export function toCalendarMinute(_workMinute: number, _edge: 'start' | 'end'): number {
  throw new Error('Not implemented: toCalendarMinute');
}

export function workSpans(_shift: Shift): Span[] {
  throw new Error('Not implemented: workSpans');
}
