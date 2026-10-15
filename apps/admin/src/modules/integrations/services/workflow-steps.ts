export type StepId = 'upstream' | 'access' | 'trigger' | 'data' | 'target' | 'target-data' | 'response' | 'downstream';

/** done: configured · todo: required and not finished · empty: optional and not used · info: a read-only view of related automations */
export type StepState = 'done' | 'todo' | 'empty' | 'info';

export interface StepDefinition {
  id: StepId;
  title: string;
  description: string;
  required: boolean;
  /** the stage of the flow the step belongs to, for grouping in the list */
  stage: 'start' | 'process' | 'finish';
}

export const WORKFLOW_STEPS: StepDefinition[] = [
  { id: 'upstream', title: 'Incoming Signals', description: 'Integrations that emit events matching this trigger', required: false, stage: 'start' },
  { id: 'access', title: 'Access Control', description: 'Specify who can trigger this workflow', required: false, stage: 'start' },
  { id: 'trigger', title: 'Trigger', description: 'Configure the event listener that starts this workflow', required: true, stage: 'start' },
  { id: 'data', title: 'Data Manipulation', description: 'Transform, enrich or validate the payload before targeting another system', required: false, stage: 'process' },
  { id: 'target', title: 'Target', description: 'Choose where the processed data goes and how the action executes', required: true, stage: 'finish' },
  { id: 'target-data', title: 'Target Manipulation', description: "Transform, filter or shape the target's result before it is returned or passed onward", required: false, stage: 'finish' },
  { id: 'response', title: 'Trigger Response', description: 'Broadcast a platform event when the target succeeds', required: false, stage: 'finish' },
  { id: 'downstream', title: 'Downstream Automations', description: 'Integrations that listen to this trigger response', required: false, stage: 'finish' },
];

export interface WorkflowSnapshot {
  trigger?: { source?: string; operation?: string; details?: Record<string, any> } | null;
  target?: { source?: string; operation?: string; details?: Record<string, any> } | null;
  dataManipulation?: unknown[] | null;
  targetManipulation?: unknown[] | null;
  upstreamCount?: number;
  downstreamCount?: number;
}

const hasSignature = (value?: { source?: string; kind?: string; eventName?: string } | null) => !!(value?.source && value?.kind && value?.eventName);

/** A trigger or target is finished once it names a source and an operation. */
export const endIsComplete = (end?: { source?: string; operation?: string } | null) => !!(end?.source && end?.operation);

export function stepState(id: StepId, workflow: WorkflowSnapshot): StepState {
  switch (id) {
    case 'upstream':
      return 'info';
    case 'downstream':
      return 'info';
    case 'access': {
      const details = workflow.trigger?.details || {};
      const restricted = !!(details.roles?.length || details.workspaceRoles?.length || details.workspaceLabels?.length);
      return restricted ? 'done' : 'empty';
    }
    case 'trigger':
      return endIsComplete(workflow.trigger) ? 'done' : 'todo';
    case 'target':
      return endIsComplete(workflow.target) ? 'done' : 'todo';
    case 'data':
      return workflow.dataManipulation?.length ? 'done' : 'empty';
    case 'target-data':
      return workflow.targetManipulation?.length ? 'done' : 'empty';
    case 'response':
      return hasSignature(workflow.target?.details?.triggerResponse) ? 'done' : 'empty';
  }
}

/** Required steps that still need work, in flow order. */
export function stepsNeedingAttention(workflow: WorkflowSnapshot): StepId[] {
  return WORKFLOW_STEPS.filter((step) => step.required && stepState(step.id, workflow) === 'todo').map((step) => step.id);
}

/** The step to open first: the first one that needs work, else the trigger. */
export function firstStepToOpen(workflow: WorkflowSnapshot): StepId {
  return stepsNeedingAttention(workflow)[0] ?? 'trigger';
}

export function nextStep(current: StepId, direction: 1 | -1 = 1): StepId | null {
  const index = WORKFLOW_STEPS.findIndex((step) => step.id === current) + direction;
  return WORKFLOW_STEPS[index]?.id ?? null;
}

/** A short line that says what a step currently holds, or '' when there is nothing to say. */
export function stepSummary(id: StepId, workflow: WorkflowSnapshot, sourceName: (id?: string) => string, count: (n: number) => string): string {
  switch (id) {
    case 'trigger':
      return [sourceName(workflow.trigger?.source), workflow.trigger?.operation].filter(Boolean).join(' · ');
    case 'target':
      return [sourceName(workflow.target?.source), workflow.target?.operation].filter(Boolean).join(' · ');
    case 'data':
      return workflow.dataManipulation?.length ? count(workflow.dataManipulation.length) : '';
    case 'target-data':
      return workflow.targetManipulation?.length ? count(workflow.targetManipulation.length) : '';
    case 'upstream':
      return workflow.upstreamCount ? count(workflow.upstreamCount) : '';
    case 'downstream':
      return workflow.downstreamCount ? count(workflow.downstreamCount) : '';
    default:
      return '';
  }
}
