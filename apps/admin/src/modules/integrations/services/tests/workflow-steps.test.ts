import { describe, expect, it } from 'vitest';
import { endIsComplete, firstStepToOpen, nextStep, stepState, stepSummary, stepsNeedingAttention, WORKFLOW_STEPS } from '../workflow-steps';

const empty = { trigger: { source: '', operation: '', details: {} }, target: { source: '', operation: '', details: {} }, dataManipulation: [], targetManipulation: [] };
const ready = { ...empty, trigger: { source: 'a', operation: 'webhook', details: {} }, target: { source: 'b', operation: 'makeRequest', details: {} } };

describe('step state', () => {
  it('treats a trigger or target as done only with both a source and an operation', () => {
    expect(endIsComplete({ source: 'a', operation: '' })).toBe(false);
    expect(endIsComplete({ source: '', operation: 'x' })).toBe(false);
    expect(endIsComplete({ source: 'a', operation: 'x' })).toBe(true);
    expect(stepState('trigger', { ...empty, trigger: { source: 'a', operation: '', details: {} } })).toBe('todo');
  });

  it('marks required steps todo until configured and optional ones empty', () => {
    expect(stepState('trigger', empty)).toBe('todo');
    expect(stepState('target', empty)).toBe('todo');
    expect(stepState('data', empty)).toBe('empty');
    expect(stepState('response', empty)).toBe('empty');
    expect(stepState('trigger', ready)).toBe('done');
    expect(stepState('data', { ...ready, dataManipulation: [{}] })).toBe('done');
  });

  it('reads access control from the trigger details', () => {
    expect(stepState('access', ready)).toBe('empty');
    expect(stepState('access', { ...ready, trigger: { ...ready.trigger, details: { roles: ['admin'] } } })).toBe('done');
  });

  it('needs a complete signature for the response step', () => {
    expect(stepState('response', { ...ready, target: { ...ready.target, details: { triggerResponse: { source: 's', kind: 'k' } } } })).toBe('empty');
    expect(stepState('response', { ...ready, target: { ...ready.target, details: { triggerResponse: { source: 's', kind: 'k', eventName: 'e' } } } })).toBe('done');
  });

  it('shows related automations as information, never as a to-do', () => {
    expect(stepState('upstream', empty)).toBe('info');
    expect(stepState('downstream', empty)).toBe('info');
  });
});

describe('what to open and what needs work', () => {
  it('lists unfinished required steps in flow order', () => {
    expect(stepsNeedingAttention(empty)).toEqual(['trigger', 'target']);
    expect(stepsNeedingAttention({ ...ready, target: empty.target })).toEqual(['target']);
    expect(stepsNeedingAttention(ready)).toEqual([]);
  });

  it('opens the first step that needs work, else the trigger', () => {
    expect(firstStepToOpen({ ...ready, trigger: empty.trigger })).toBe('trigger');
    expect(firstStepToOpen({ ...ready, target: empty.target })).toBe('target');
    expect(firstStepToOpen(ready)).toBe('trigger');
  });

  it('moves through the steps in order and stops at the ends', () => {
    expect(nextStep('upstream', -1)).toBeNull();
    expect(nextStep('upstream')).toBe('access');
    expect(nextStep('downstream')).toBeNull();
    expect(WORKFLOW_STEPS.map((step) => step.id)).toEqual(['upstream', 'access', 'trigger', 'data', 'target', 'target-data', 'response', 'downstream']);
  });
});

describe('summaries', () => {
  const name = (id?: string) => ({ a: 'Qelos', b: 'OpenAI' })[id as 'a'] || '';
  const count = (n: number) => `${n} items`;
  it('says what a step holds', () => {
    expect(stepSummary('trigger', ready, name, count)).toBe('Qelos · webhook');
    expect(stepSummary('target', ready, name, count)).toBe('OpenAI · makeRequest');
    expect(stepSummary('data', { ...ready, dataManipulation: [{}, {}] }, name, count)).toBe('2 items');
    expect(stepSummary('data', ready, name, count)).toBe('');
    expect(stepSummary('upstream', { ...ready, upstreamCount: 3 }, name, count)).toBe('3 items');
  });
});
