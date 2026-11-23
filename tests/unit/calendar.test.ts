import { describe, expect, test } from 'vitest';
import {
  toCalendarMinute,
  toWorkMinute,
  workingMinutes,
  workSpans,
} from '../../src/domain/calendar';
import type { Shift } from '../../src/domain/model';

describe('four shifts, half-open exclusions and collapsed edges', () => {
  test.each([1, 2, 3, 4] as Shift[])('S%s has exactly 630 working minutes', (shift) => {
    const base = (shift - 1) * 720;
    expect(workSpans(shift)).toEqual([
      { start: base, end: base + 240 },
      { start: base + 270, end: base + 480 },
      { start: base + 510, end: base + 690 },
    ]);
    expect(workingMinutes(base, base + 720)).toBe(630);
    const spans = workSpans(shift);
    spans[0]!.start = 99;
    expect(workSpans(shift)[0]!.start).toBe(base);
  });
  test.each([
    [0, 0, 0],
    [0, 2880, 2520],
    [120, 300, 150],
    [240, 270, 0],
    [480, 510, 0],
    [690, 720, 0],
    [239.75, 270.25, 0.5],
    [689.5, 720.5, 1],
    [2850, 2880, 0],
  ])('intersection [%s,%s) = %s', (a, b, expected) =>
    expect(workingMinutes(a, b)).toBeCloseTo(expected, 10),
  );
  test.each([
    [0, 0, 0],
    [240, 270, 240],
    [450, 510, 480],
    [630, 720, 690],
    [870, 990, 960],
    [1260, 1440, 1410],
    [1890, 2160, 2130],
    [2520, 2850, 2850],
  ])('work t=%s start/end edges', (work, start, end) => {
    expect(toCalendarMinute(work, 'start')).toBe(start);
    expect(toCalendarMinute(work, 'end')).toBe(end);
    expect(toWorkMinute(start)).toBe(work);
    expect(toWorkMinute(end)).toBe(work);
  });
  test('all exclusion plateaus and fractional round trips', () => {
    for (let s = 0; s < 4; s++)
      for (const [a, b] of [
        [240, 270],
        [480, 510],
        [690, 720],
      ]) {
        expect(toWorkMinute(s * 720 + a!)).toBe(toWorkMinute(s * 720 + b!));
        expect(workingMinutes(s * 720 + a!, s * 720 + b!)).toBe(0);
      }
    for (const t of [0.0000005, 119.25, 239.999999, 240.000001, 629.125, 1260.5, 2519.99]) {
      for (const edge of ['start', 'end'] as const)
        expect(toWorkMinute(toCalendarMinute(t, edge))).toBeCloseTo(t, 9);
    }
  });
  test.each([NaN, Infinity, -Infinity, -1, 2880.01])('rejects calendar %s', (t) => {
    expect(() => toWorkMinute(t)).toThrow(RangeError);
    expect(() => workingMinutes(0, t)).toThrow(RangeError);
    expect(() => workingMinutes(t, 2880)).toThrow(RangeError);
  });
  test.each([NaN, Infinity, -1, 2520.01])('rejects work %s', (t) =>
    expect(() => toCalendarMinute(t, 'start')).toThrow(RangeError),
  );
  test('rejects reversed spans, invalid shifts and edge enums', () => {
    expect(() => workingMinutes(20, 19)).toThrow(RangeError);
    for (const s of [0, 5, 1.5, NaN]) expect(() => workSpans(s as Shift)).toThrow(RangeError);
    expect(() => toCalendarMinute(1, 'middle' as 'start')).toThrow(RangeError);
  });
});
