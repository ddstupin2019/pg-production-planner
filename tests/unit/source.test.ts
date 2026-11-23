import { describe, expect, test } from 'vitest';
import {
  EPSILON,
  INITIAL_STOCKS,
  MACHINES,
  NOMINAL_RATES,
  REQUIRED_ORDERS,
  REQUIRED_WORK,
  ROUTES,
  SETUP_MINUTES,
} from '../../src/domain/model';
import { originalOrders } from '../support/fixture';

describe('R3–R7 exact source transcription, not an expert plan oracle', () => {
  test('six immutable originals and 7000 thousand blades', () => {
    expect(EPSILON).toBe(1e-6);
    expect(REQUIRED_ORDERS).toEqual(originalOrders());
    expect(REQUIRED_ORDERS.reduce((sum, o) => sum + o.quantity, 0)).toBe(7000);
    expect(INITIAL_STOCKS).toEqual({
      REWIND: { A: 200, B: 100, C: 150 },
      WASH: { A: 250, B: 150, C: 0 },
      WRAP: { A: 300, B: 100, C: 0 },
    });
    expect(SETUP_MINUTES).toEqual({
      A: { A: 0, B: 20, C: 30 },
      B: { A: 20, B: 0, C: 25 },
      C: { A: 30, B: 25, C: 0 },
    });
  });
  test('all operation routes and per-machine nominal speeds', () => {
    expect(ROUTES).toEqual({
      A: 'PRESS THERMAL PRINT REWIND GRIND WASH CHROME TEF LUBE WRAP PACK'.split(' '),
      B: 'PRESS THERMAL PRINT REWIND GRIND WASH TEF LUBE WRAP PACK'.split(' '),
      C: 'PRESS THERMAL LASER REWIND GRIND WASH CHROME TEF LUBE WRAP PACK'.split(' '),
    });
    expect(NOMINAL_RATES).toEqual({
      PRESS: 900,
      THERMAL: 1540,
      PRINT: 1300,
      LASER: 1500,
      REWIND: 2500,
      GRIND: 800,
      WASH: 7680,
      CHROME: 2680,
      TEF: 3385,
      LUBE: 7680,
      WRAP: 285,
      PACK: 1350,
    });
  });
  test('all 43 IDs and initial settings, numeric not lexicographic order', () => {
    const settings = [
      ['PRESS', 3, 2, 0],
      ['THERMAL', 2, 1, 0],
      ['PRINT', 1, 1, 0],
      ['LASER', 0, 0, 1],
      ['REWIND', 1, 1, 0],
      ['GRIND', 3, 2, 0],
      ['WASH', 1, 0, 0],
      ['CHROME', 2, 0, 0],
      ['TEF', 2, 0, 0],
      ['LUBE', 1, 0, 0],
      ['WRAP', 10, 6, 0],
      ['PACK', 2, 1, 0],
    ] as const;
    expect(MACHINES).toEqual(
      settings.flatMap(([operation, a, b, c]) =>
        Array.from({ length: a + b + c }, (_, i) => ({
          id: `${operation}-${String(i + 1)}`,
          operation,
          initialProduct: i < a ? 'A' : i < a + b ? 'B' : 'C',
        })),
      ),
    );
    expect(MACHINES).toHaveLength(43);
  });
  test('all mandatory counts, products, durations and windows', () => {
    const rows = [
      ['TO-1', 'PRESS', 1, 180, 1, 1, null],
      ['TO-2', 'GRIND', 1, 240, 1, 2, null],
      ['TO-3', 'THERMAL', 1, 180, 1, 4, null],
      ['TO-4', 'CHROME', 1, 240, 1, 4, null],
      ['TO-5', 'PACK', 1, 180, 3, 4, null],
      ['VAL-1', 'TEF', 1, 240, 1, 2, 'A'],
      ['VAL-2', 'GRIND', 2, 180, 1, 4, 'B'],
      ['VAL-3', 'LASER', 1, 240, 3, 4, 'C'],
      ['VAL-4', 'WRAP', 3, 180, 3, 4, 'A'],
    ] as const;
    expect(REQUIRED_WORK).toEqual(
      rows.map(([code, operation, count, minutes, firstShift, lastShift, product]) => ({
        code,
        operation,
        count,
        minutes,
        firstShift,
        lastShift,
        product,
      })),
    );
  });
  test('nested source records are frozen, not just the outer arrays', () => {
    for (const collection of [
      MACHINES,
      REQUIRED_WORK,
      REQUIRED_ORDERS,
      ROUTES,
      INITIAL_STOCKS,
      SETUP_MINUTES,
      NOMINAL_RATES,
    ]) {
      expect(Object.isFrozen(collection)).toBe(true);
      for (const value of Object.values(collection))
        if (typeof value === 'object') expect(Object.isFrozen(value)).toBe(true);
    }
  });
});
