import type { Event, Order, Plan, Result, Role } from './model';

export interface Revision {
  id: number;
  parentId: number | null;
  plan: Plan;
  events: Event[];
  status: 'draft' | 'pending' | 'agreed';
  approvals: Role[];
  acknowledgements: { code: string; reason: string }[];
}
export interface Workflow {
  schemaVersion: 1;
  role: Role;
  demandSent: boolean;
  phase: 'baseline' | 'failure' | 'absence';
  planningMinute: number;
  lockedRequests: null | [number, number];
  versions: Revision[];
  currentId: number;
  scenarioPlan: Plan;
}
export type Action =
  | { type: 'switch-role'; role: Role }
  | { type: 'edit-orders'; orders: Order[] }
  | { type: 'send-demand' }
  | { type: 'edit-plan'; plan: Plan }
  | { type: 'fix-requests'; counts: [number, number]; reasons: [string, string] }
  | { type: 'set-planning-minute'; minute: number }
  | { type: 'submit'; acknowledgements: { code: string; reason: string }[] }
  | { type: 'approve' }
  | { type: 'apply-failure'; machineId: string }
  | { type: 'apply-absence' }
  | { type: 'restore-scenario' };

export function createWorkflow(_plan: Plan): Result<Workflow> {
  throw new Error('Not implemented: createWorkflow');
}

export function transition(_state: Workflow, _action: Action): Result<Workflow> {
  throw new Error('Not implemented: transition');
}

export function exportWorkflow(_state: Workflow): string {
  // The implemented export will serialize { schemaVersion: 1, workflow, evaluation: Result<Report> }.
  throw new Error('Not implemented: exportWorkflow');
}
