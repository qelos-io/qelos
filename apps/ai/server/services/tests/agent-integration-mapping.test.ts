import { describe, it } from 'node:test';
import assert from 'node:assert';
import { QelosTargetOperation, QelosTriggerOperation } from '@qelos/global-types';
import {
  agentPayloadToTarget,
  agentPayloadToTrigger,
  integrationToAgent,
  isAgentIntegration,
} from '../../controllers/agent-integration-mapping';

describe('agent-integration-mapping', () => {
  describe('integrationToAgent', () => {
    it('maps integration trigger/target details to agent shape', () => {
      const integration = {
        _id: '507f1f77bcf86cd799439011',
        tenant: 't1',
        trigger: {
          source: 'tsrc',
          operation: QelosTriggerOperation.chatCompletion,
          details: {
            name: 'Support bot',
            systemPrompt: 'Be helpful',
            tools: [{ name: 't1', description: 'd', schema: {} }],
            workspace: 'ws1',
          },
        },
        target: {
          source: 'usrc',
          operation: QelosTargetOperation.chatCompletion,
          details: {
            model: 'gpt-4o',
            temperature: 0.2,
            max_tokens: 1024,
          },
        },
        active: true,
        created: new Date('2026-01-01'),
      };

      const agent = integrationToAgent(integration as any);

      assert.strictEqual(agent._id, integration._id);
      assert.strictEqual(agent.name, 'Support bot');
      assert.strictEqual(agent.model, 'gpt-4o');
      assert.strictEqual(agent.systemPrompt, 'Be helpful');
      assert.strictEqual(agent.temperature, 0.2);
      assert.strictEqual(agent.maxTokens, 1024);
      assert.strictEqual(agent.tenant, 't1');
      assert.strictEqual(agent.workspace, 'ws1');
      assert.strictEqual(agent.triggerSource, 'tsrc');
      assert.strictEqual(agent.targetSource, 'usrc');
      assert.strictEqual(agent.active, true);
      assert.strictEqual(agent.tools.length, 1);
    });
  });

  describe('agentPayloadToTrigger', () => {
    it('builds trigger entity from create payload', () => {
      const t = agentPayloadToTrigger({
        name: 'N',
        triggerSource: 'trig',
        systemPrompt: 'sp',
        tools: [],
      });

      assert.strictEqual(t.source, 'trig');
      assert.strictEqual(t.operation, QelosTriggerOperation.chatCompletion);
      assert.strictEqual(t.details.name, 'N');
      assert.strictEqual(t.details.systemPrompt, 'sp');
    });
  });

  describe('agentPayloadToTarget', () => {
    it('sets model and embeds system prompt in pre_messages when provided', () => {
      const tgt = agentPayloadToTarget({
        targetSource: 'tgt',
        model: 'claude-4',
        systemPrompt: 'You are an agent',
      });

      assert.strictEqual(tgt.source, 'tgt');
      assert.strictEqual(tgt.operation, QelosTargetOperation.chatCompletion);
      assert.strictEqual(tgt.details.model, 'claude-4');
      assert.ok(Array.isArray(tgt.details.pre_messages));
      const sys = (tgt.details.pre_messages as any[]).find((m) => m.__agentSystemPrompt);
      assert.ok(sys);
      assert.strictEqual(sys.content, 'You are an agent');
    });

    it('updates existing marked system message when systemPrompt changes', () => {
      const existing = {
        source: 'tgt',
        operation: QelosTargetOperation.chatCompletion,
        details: {
          model: 'gpt-4o',
          pre_messages: [
            { role: 'system', content: 'old', __agentSystemPrompt: true },
            { role: 'user', content: 'x' },
          ],
        },
      };

      const tgt = agentPayloadToTarget({ systemPrompt: 'new prompt' }, existing);

      const sys = (tgt.details.pre_messages as any[]).find((m) => m.__agentSystemPrompt);
      assert.strictEqual(sys.content, 'new prompt');
      assert.strictEqual((tgt.details.pre_messages as any[]).length, 2);
    });
  });

  describe('isAgentIntegration', () => {
    it('returns true when trigger operation is chatCompletion', () => {
      assert.strictEqual(
        isAgentIntegration({
          trigger: { operation: QelosTriggerOperation.chatCompletion },
        } as any),
        true,
      );
    });

    it('returns false when trigger operation is not chatCompletion', () => {
      assert.strictEqual(
        isAgentIntegration({
          trigger: { operation: QelosTriggerOperation.webhook },
        } as any),
        false,
      );
    });
  });
});
