import { describe, expect, it } from 'vitest';
import {
  automationDescription,
  automationFlow,
  automationName,
  classifyAutomation,
  cloneForCreate,
  countByType,
  filterAutomations,
  matchesAutomation,
} from '../integration-presentation';

const sources = { a: { _id: 'a', name: 'Qelos111' }, b: { _id: 'b', name: 'My OpenAI Token' }, c: { _id: 'c', name: 'harry potter' } };

const agent = { _id: '1', active: true, kind: ['qelos', 'openai'], trigger: { source: 'a', operation: 'chatCompletion', details: { name: 'avi' } }, target: { source: 'b', operation: 'chatCompletion' } };
const inactiveAgent = { ...agent, _id: '2', active: false, trigger: { ...agent.trigger, details: { name: 'rami' } } };
const mcp = { _id: '3', active: true, kind: ['qelos', 'http'], trigger: { source: 'a', operation: 'mcpTool', details: { name: 'get_characters', description: 'Lists characters' } }, target: { source: 'c', operation: 'makeRequest' } };
const hook = { _id: '4', kind: ['github', 'qelos'], trigger: { source: 'x', operation: 'webhook', details: { source: 'github', kind: 'push', eventName: 'opened' } }, target: { source: 'a', operation: 'webhook' } };
const plain = { _id: '5', active: true, kind: ['qelos', 'qelos'], trigger: { source: 'a', operation: 'somethingElse' }, target: { source: 'a', operation: 'webhook' } };

describe('classifyAutomation', () => {
  it('tells agents, tools, webhooks and plain workflows apart', () => {
    expect(classifyAutomation(agent)).toBe('ai-agent');
    expect(classifyAutomation(mcp)).toBe('mcp-tool');
    expect(classifyAutomation({ kind: ['qelos', 'http'], trigger: { operation: 'apiWebhook' } })).toBe('api-webhook');
    expect(classifyAutomation({ trigger: { operation: 'functionCalling' } })).toBe('function-call');
    expect(classifyAutomation(hook)).toBe('webhook');
  });

  it('shows what used to be hidden: anything unclassified is a workflow', () => {
    expect(classifyAutomation(plain)).toBe('workflow');
    expect(classifyAutomation({})).toBe('workflow');
  });
});

describe('names and flows', () => {
  it('prefers the given name, else from → to', () => {
    expect(automationName(agent, sources)).toBe('avi');
    expect(automationName(plain, sources)).toBe('Qelos111 → Qelos111');
    expect(automationName({ _id: 'z' }, sources)).toBe('z');
  });

  it('describes both ends of the flow', () => {
    expect(automationFlow(agent, sources)).toEqual({
      from: { source: 'Qelos111', kind: 'qelos', operation: 'chatCompletion' },
      to: { source: 'My OpenAI Token', kind: 'openai', operation: 'chatCompletion' },
    });
  });

  it('describes webhooks by event, others by description', () => {
    expect(automationDescription(hook)).toBe('push | Event: opened');
    expect(automationDescription(mcp)).toBe('Lists characters');
    expect(automationDescription(agent)).toBe('');
  });
});

describe('filtering', () => {
  const list = [agent, inactiveAgent, mcp, hook, plain];

  it('matches every word across names, sources and operations', () => {
    expect(matchesAutomation(mcp, 'harry characters', sources)).toBe(true);
    expect(matchesAutomation(mcp, 'harry openai', sources)).toBe(false);
    expect(matchesAutomation(agent, '', sources)).toBe(true);
  });

  it('filters by type, state and text together', () => {
    expect(filterAutomations(list, { type: 'ai-agent' }, sources).map((a) => a._id)).toEqual(['1', '2']);
    expect(filterAutomations(list, { type: 'ai-agent', state: 'inactive' }, sources).map((a) => a._id)).toEqual(['2']);
    expect(filterAutomations(list, { state: 'active', query: 'qelos111' }, sources).map((a) => a._id)).toEqual(['1', '3', '4', '5']);
  });

  it('treats a missing active flag as active', () => {
    expect(filterAutomations([hook], { state: 'active' }, sources)).toHaveLength(1);
  });

  it('counts per type', () => {
    expect(countByType(list)).toMatchObject({ all: 5, 'ai-agent': 2, 'mcp-tool': 1, webhook: 1, workflow: 1, 'function-call': 0 });
  });
});

describe('cloneForCreate', () => {
  it('strips ids and marks the name as a copy without touching the original', () => {
    const original = { ...agent, tenant: 't', created: 'x', trigger: { ...agent.trigger, _id: 'tid' }, dataManipulation: [{ _id: 'r', map: {} }] };
    const copy = cloneForCreate(original);
    expect(copy).not.toHaveProperty('_id');
    expect(copy).not.toHaveProperty('tenant');
    expect(copy.trigger.details.name).toBe('avi_COPY');
    expect(copy.trigger).not.toHaveProperty('_id');
    expect(copy.dataManipulation[0]).not.toHaveProperty('_id');
    expect(original.trigger.details.name).toBe('avi');
  });
});
