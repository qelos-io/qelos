import * as assert from 'node:assert/strict';
import { QelosSDKOptions } from '../../types';
import QlAdminWorkspaces from '../workspaces';

const { describe, beforeEach, test } = require('node:test')

describe('QlAdminWorkspaces', () => {
  let options: QelosSDKOptions

  beforeEach(() => {
    options = {
      appUrl: 'http://localhost:3000',
      fetch: () => null,
      extraHeaders: async () => ({}),
      refreshToken: 'mock-refresh-token'
    };
  });

  test('should instantiate', () => {
    const workspaces = new QlAdminWorkspaces(options);
    assert.ok(workspaces);
  });

  test('should call /api/workspaces/all without query params when no filters provided', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([{ name: 'ws1' }]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    const result = await workspaces.getList();

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all');
    assert.deepEqual(result, [{ name: 'ws1' }]);
  });

  test('should append members.user filter to query params', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({ 'members.user': 'user123' });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?members.user=user123');
  });

  test('should append labels filter as comma-separated values', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({ labels: ['label1', 'label2'] });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?labels=label1,label2');
  });

  test('should append name filter to query params', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({ name: 'my workspace' });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?name=my workspace');
  });

  test('should append q (search) filter to query params', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({ q: 'search term' });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?q=search term');
  });

  test('should append _id filter as comma-separated values', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({ _id: ['id1', 'id2'] });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?_id=id1,id2');
  });

  test('should append select filter to query params', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({ select: 'name,logo,labels' });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?select=name,logo,labels');
  });

  test('should combine multiple filters into query params', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({
      'members.user': 'user123',
      labels: ['important'],
      select: 'name,labels,members'
    });

    assert.equal(
      calledUrl,
      'http://localhost:3000/api/workspaces/all?members.user=user123&labels=important&select=name,labels,members'
    );
  });

  test('should skip undefined filter values', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({
      'members.user': 'user123',
      labels: undefined,
      name: undefined,
    });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?members.user=user123');
  });

  test('should handle empty filters object same as no filters', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({});

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?');
  });

  test('should handle single label as array with one element', async () => {
    let calledUrl = '';
    options.fetch = async (url: string) => {
      calledUrl = url;
      const res = new Response(JSON.stringify([]));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.getList({ labels: ['only-one'] });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/all?labels=only-one');
  });

  test('should fetch encrypted data with correct URL and headers', async () => {
    let calledUrl = '';
    let calledHeaders: Record<string, string> = {};
    options.fetch = async (url: string, init?: RequestInit) => {
      calledUrl = url;
      calledHeaders = Object.fromEntries(
        Object.entries(init?.headers || {})
      );
      const res = new Response(JSON.stringify({ key: 'secret' }));
      res.headers.set('Content-Type', 'application/json');
      return res;
    };

    const workspaces = new QlAdminWorkspaces(options);
    const result = await workspaces.getEncryptedData('ws1', 'enc1');

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/ws1/encrypted');
    assert.equal(calledHeaders['x-encrypted-id'], 'enc1');
    assert.deepEqual(result, { key: 'secret' });
  });

  test('should set encrypted data with POST method', async () => {
    let calledUrl = '';
    let calledMethod = '';
    let calledBody = '';
    options.fetch = async (url: string, init?: RequestInit) => {
      calledUrl = url;
      calledMethod = init?.method || '';
      calledBody = init?.body as string || '';
      return new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const workspaces = new QlAdminWorkspaces(options);
    await workspaces.setEncryptedData('ws1', 'enc1', { apiKey: 'test' });

    assert.equal(calledUrl, 'http://localhost:3000/api/workspaces/ws1/encrypted');
    assert.equal(calledMethod, 'post');
    assert.equal(calledBody, JSON.stringify({ apiKey: 'test' }));
  });

  test('should throw when setEncryptedData returns error status', async () => {
    options.fetch = async () => {
      return new Response('error', { status: 400 });
    };

    const workspaces = new QlAdminWorkspaces(options);
    await assert.rejects(
      () => workspaces.setEncryptedData('ws1', 'enc1', {}),
      { message: 'could not set encrypted data' }
    );
  });
});
