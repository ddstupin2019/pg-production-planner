export type Product = 'A' | 'B' | 'C';
export type Shift = 1 | 2 | 3 | 4;
export type Operation =
  | 'PRESS'
  | 'THERMAL'
  | 'PRINT'
  | 'LASER'
  | 'REWIND'
  | 'GRIND'
  | 'WASH'
  | 'CHROME'
  | 'TEF'
  | 'LUBE'
  | 'WRAP'
  | 'PACK';
export type Role = 'planner' | 'manager';
export type Triple = Record<Product, number>;
export type Four = [number, number, number, number];
export type JobCode =
  'TO-1' | 'TO-2' | 'TO-3' | 'TO-4' | 'TO-5' | 'VAL-1' | 'VAL-2' | 'VAL-3' | 'VAL-4';
export interface Order {
  id: string;
  product: Product;
  quantity: number;
  originalDue: Shift;
  priority: 'high' | 'medium' | 'low';
  promise: null | { quantity: number; due: Shift; reason: string };
}
export interface Machine {
  id: string;
  operation: Operation;
  initialProduct: Product;
}
export interface Campaign {
  id: string;
  machineId: string;
  product: Product;
  start: number;
  until: number;
  quota: number;
}
export interface Setup {
  id: string;
  machineId: string;
  from: Product;
  to: Product;
  start: number;
  end: number;
}
export interface Job {
  id: string;
  code: JobCode;
  machineId: string;
  start: number;
  end: number;
}
export interface Assignment {
  taskId: string;
  start: number;
  end: number;
  workerIds: string[];
}
export interface Plan {
  id: string;
  mode: 'required' | 'custom';
  orders: Order[];
  campaigns: Campaign[];
  setups: Setup[];
  jobs: Job[];
  assignments: Assignment[];
  requests: null | [number, number];
  forecasts: [number, number];
  reserveReasons: [string, string];
}
export type Event = { kind: 'failure'; machineId: string } | { kind: 'absence' };
export interface Issue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  refs: string[];
  start: number | null;
  end: number | null;
}
export type Result<T> = { ok: true; value: T } | { ok: false; errors: Issue[] };

export const EPSILON: number = 1e-6;

// Fixture construction only: the counts and ordering are SOURCE_REQUIREMENTS R6.
const initialSettings: readonly [Operation, number, number, number][] = [
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
];

export const MACHINES: readonly Machine[] = Object.freeze(
  initialSettings.flatMap(([operation, a, b, c]) =>
    Array.from({ length: a + b + c }, (_, index): Machine =>
      Object.freeze({
        id: `${operation}-${String(index + 1)}`,
        operation,
        initialProduct: index < a ? 'A' : index < a + b ? 'B' : 'C',
      }),
    ),
  ),
);

export const ROUTES: Readonly<Record<Product, readonly Operation[]>> = Object.freeze({
  A: Object.freeze<Operation[]>([
    'PRESS',
    'THERMAL',
    'PRINT',
    'REWIND',
    'GRIND',
    'WASH',
    'CHROME',
    'TEF',
    'LUBE',
    'WRAP',
    'PACK',
  ]),
  B: Object.freeze<Operation[]>([
    'PRESS',
    'THERMAL',
    'PRINT',
    'REWIND',
    'GRIND',
    'WASH',
    'TEF',
    'LUBE',
    'WRAP',
    'PACK',
  ]),
  C: Object.freeze<Operation[]>([
    'PRESS',
    'THERMAL',
    'LASER',
    'REWIND',
    'GRIND',
    'WASH',
    'CHROME',
    'TEF',
    'LUBE',
    'WRAP',
    'PACK',
  ]),
});

export const NOMINAL_RATES: Readonly<Record<Operation, number>> = Object.freeze({
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

export const INITIAL_STOCKS: Readonly<Record<'REWIND' | 'WASH' | 'WRAP', Triple>> = Object.freeze({
  REWIND: Object.freeze({ A: 200, B: 100, C: 150 }),
  WASH: Object.freeze({ A: 250, B: 150, C: 0 }),
  WRAP: Object.freeze({ A: 300, B: 100, C: 0 }),
});

export const SETUP_MINUTES: Readonly<Record<Product, Readonly<Triple>>> = Object.freeze({
  A: Object.freeze({ A: 0, B: 20, C: 30 }),
  B: Object.freeze({ A: 20, B: 0, C: 25 }),
  C: Object.freeze({ A: 30, B: 25, C: 0 }),
});

export const REQUIRED_ORDERS: readonly Order[] = Object.freeze(
  (
    [
      {
        id: 'ORD-1',
        product: 'A',
        quantity: 1400,
        originalDue: 1,
        priority: 'high',
        promise: null,
      },
      {
        id: 'ORD-2',
        product: 'B',
        quantity: 1000,
        originalDue: 2,
        priority: 'medium',
        promise: null,
      },
      {
        id: 'ORD-3',
        product: 'C',
        quantity: 1000,
        originalDue: 2,
        priority: 'high',
        promise: null,
      },
      {
        id: 'ORD-4',
        product: 'A',
        quantity: 1500,
        originalDue: 3,
        priority: 'high',
        promise: null,
      },
      { id: 'ORD-5', product: 'B', quantity: 1000, originalDue: 4, priority: 'low', promise: null },
      {
        id: 'ORD-6',
        product: 'C',
        quantity: 1100,
        originalDue: 4,
        priority: 'medium',
        promise: null,
      },
    ] satisfies Order[]
  ).map((order) => Object.freeze(order)),
);

export const REQUIRED_WORK: readonly {
  code: JobCode;
  operation: Operation;
  count: number;
  minutes: number;
  firstShift: Shift;
  lastShift: Shift;
  product: Product | null;
}[] = Object.freeze([
  Object.freeze({
    code: 'TO-1',
    operation: 'PRESS',
    count: 1,
    minutes: 180,
    firstShift: 1,
    lastShift: 1,
    product: null,
  }),
  Object.freeze({
    code: 'TO-2',
    operation: 'GRIND',
    count: 1,
    minutes: 240,
    firstShift: 1,
    lastShift: 2,
    product: null,
  }),
  Object.freeze({
    code: 'TO-3',
    operation: 'THERMAL',
    count: 1,
    minutes: 180,
    firstShift: 1,
    lastShift: 4,
    product: null,
  }),
  Object.freeze({
    code: 'TO-4',
    operation: 'CHROME',
    count: 1,
    minutes: 240,
    firstShift: 1,
    lastShift: 4,
    product: null,
  }),
  Object.freeze({
    code: 'TO-5',
    operation: 'PACK',
    count: 1,
    minutes: 180,
    firstShift: 3,
    lastShift: 4,
    product: null,
  }),
  Object.freeze({
    code: 'VAL-1',
    operation: 'TEF',
    count: 1,
    minutes: 240,
    firstShift: 1,
    lastShift: 2,
    product: 'A',
  }),
  Object.freeze({
    code: 'VAL-2',
    operation: 'GRIND',
    count: 2,
    minutes: 180,
    firstShift: 1,
    lastShift: 4,
    product: 'B',
  }),
  Object.freeze({
    code: 'VAL-3',
    operation: 'LASER',
    count: 1,
    minutes: 240,
    firstShift: 3,
    lastShift: 4,
    product: 'C',
  }),
  Object.freeze({
    code: 'VAL-4',
    operation: 'WRAP',
    count: 3,
    minutes: 180,
    firstShift: 3,
    lastShift: 4,
    product: 'A',
  }),
]);
