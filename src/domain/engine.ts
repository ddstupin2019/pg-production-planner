import type {
  Event,
  Four,
  Issue,
  JobCode,
  Operation,
  Plan,
  Product,
  Result,
  Shift,
  Triple,
} from './model';

export interface EvaluationInput {
  plan: Plan;
  events: Event[];
}
export interface MachineInterval {
  machineId: string;
  campaignId: string | null;
  start: number;
  end: number;
  product: Product;
  kind: 'produce' | 'setup' | 'maintenance' | 'repair' | 'idle';
  rate: number;
  quantity: number;
  jobIds: string[];
  setupId: string | null;
}
export interface StockInterval {
  product: Product;
  before: Operation;
  start: number;
  end: number;
  opening: number;
  inflowRate: number;
  consumedRate: number;
  closing: number;
}
export interface StaffInterval {
  start: number;
  end: number;
  normal: number;
  setup: number;
  validation: number;
  total: number;
  available: number;
  tasks: { taskId: string; required: number; workerIds: string[] }[];
}
export interface OrderResult {
  orderId: string;
  completedAt: number | null;
  allocatedByShift: Four;
  atOriginalDue: number;
  originalDeficit: number;
  atPromiseDue: number | null;
  promiseDeficit: number | null;
}
export interface JobResult {
  jobId: string;
  code: JobCode;
  machineId: string;
  creditedMinutes: number;
  complete: boolean;
  issues: string[];
}
export interface ShiftResult {
  shift: Shift;
  packed: Triple;
  fulfilled: number;
  dueDeficit: number;
  stocks: { product: Product; before: Operation; quantity: number }[];
  finishedUnallocated: Triple;
  requested: number | null;
  available: number;
  peak: number;
  peakSpans: { start: number; end: number }[];
  laborMinutes: number;
  reserveMinutes: number;
}
export interface Report {
  planId: string;
  feasible: boolean;
  issues: Issue[];
  machineIntervals: MachineInterval[];
  stockIntervals: StockInterval[];
  staffIntervals: StaffInterval[];
  shifts: ShiftResult[];
  orders: OrderResult[];
  jobs: JobResult[];
  quotas: { campaignId: string; produced: number; remaining: number }[];
}
export interface Comparison {
  left: Report;
  right: Report;
  delta: { packed: Triple; originalDeficit: number; peak: Four; laborMinutes: number };
}

export function evaluate(_input: EvaluationInput): Result<Report> {
  throw new Error('Not implemented: evaluate');
}

export function compare(_left: EvaluationInput, _right: EvaluationInput): Result<Comparison> {
  throw new Error('Not implemented: compare');
}
