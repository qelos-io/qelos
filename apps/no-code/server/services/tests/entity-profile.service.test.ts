import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isLogLikeBlueprint, tokenize } from '../entity-profile.service';

describe('tokenize', () => {
  it('splits separators and camelCase', () => {
    assert.deepEqual(tokenize('activity_log'), ['activity', 'log']);
    assert.deepEqual(tokenize('usage-daily'), ['usage', 'daily']);
    assert.deepEqual(tokenize('Video Editing State'), ['video', 'editing', 'state']);
    assert.deepEqual(tokenize('AuditLog'), ['audit', 'log']);
    assert.deepEqual(tokenize('HTTPLogs'), ['http', 'logs']);
    assert.deepEqual(tokenize(undefined), []);
  });
});

describe('isLogLikeBlueprint', () => {
  it('recognizes the log blueprints seen in production', () => {
    assert.equal(isLogLikeBlueprint('activity_log'), true);
    assert.equal(isLogLikeBlueprint('usage-daily'), true);
    assert.equal(isLogLikeBlueprint('video-editing-state'), true);
    assert.equal(isLogLikeBlueprint('video_editing_state', 'Video editing state'), true);
    assert.equal(isLogLikeBlueprint('system_event'), true);
  });

  it('recognizes other common log shapes, by identifier or by name', () => {
    for (const id of ['logs', 'auditTrail', 'order_history', 'page-metrics', 'api_traces', 'telemetry']) {
      assert.equal(isLogLikeBlueprint(id), true, id);
    }
    assert.equal(isLogLikeBlueprint('x1', 'Audit entries'), true);
    assert.equal(isLogLikeBlueprint('tbl', 'Usage per workspace'), true);
  });

  it('does not treat a standalone Event, a bare State or lookalike words as a log', () => {
    for (const id of ['event', 'events', 'Event', 'calendar_event', 'state', 'states', 'catalog', 'blogs', 'dialog', 'logistics', 'todo', 'orders', 'users', 'product_catalog']) {
      assert.equal(isLogLikeBlueprint(id), false, id);
    }
  });

  it('ignores a missing name', () => {
    assert.equal(isLogLikeBlueprint('orders', undefined), false);
    assert.equal(isLogLikeBlueprint('orders', ''), false);
  });
});
