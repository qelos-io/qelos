import * as assert from 'node:assert/strict';
import {test} from 'node:test';
import QlWorkspaces from '../src/workspaces';
import {QelosSDKOptions} from '../src/types';

function jsonResponse(body: unknown, ok = true) {
  const res = new Response(JSON.stringify(body));
  res.headers.set('Content-Type', 'application/json');
  if (!ok) {
    Object.defineProperty(res, 'ok', {value: false});
    Object.defineProperty(res, 'status', {value: 400});
  }
  return res;
}

test('QlWorkspaces', async (t) => {
  await t.test('removeMember sends DELETE to members path', async () => {
    const calls: string[] = [];
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (url) => {
        calls.push(url.toString());
        return jsonResponse({message: 'Member removed from workspace.', userId: 'u1'});
      },
    };
    const ws = new QlWorkspaces(options);
    await ws.removeMember('ws-1', 'user-456');
    assert.equal(calls[0], 'http://localhost:3000/api/workspaces/ws-1/members/user-456');
  });

  await t.test('updateMemberRoles sends PUT with roles body', async () => {
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        init = requestInit;
        return jsonResponse({
          message: 'Member roles updated successfully.',
          workspaceId: 'ws-1',
        });
      },
    };
    const ws = new QlWorkspaces(options);
    await ws.updateMemberRoles('ws-1', 'user-456', ['admin']);
    assert.equal(init?.method, 'put');
    assert.equal((init?.headers as Record<string, string>)['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(init?.body as string), {roles: ['admin']});
  });

  await t.test('inviteUser merges invites then updates workspace', async () => {
    const bodies: unknown[] = [];
    let step = 0;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        if (step === 0) {
          step++;
          assert.equal(requestInit?.method, undefined);
          return jsonResponse({
            name: 'W',
            labels: [],
            invites: [{email: 'old@x.com', roles: ['member'], _id: 'i1'}],
          });
        }
        bodies.push(JSON.parse(requestInit?.body as string));
        return jsonResponse({name: 'W', labels: [], invites: []});
      },
    };
    const ws = new QlWorkspaces(options);
    await ws.inviteUser('ws-1', 'newdev@company.com', ['editor']);
    assert.equal(step, 1);
    assert.deepEqual(bodies[0], {
      invites: [
        {email: 'old@x.com', roles: ['member'], _id: 'i1'},
        {email: 'newdev@company.com', roles: ['editor']},
      ],
    });
  });

  await t.test('inviteUser updates roles for existing email (case-insensitive)', async () => {
    let putBody: unknown;
    let step = 0;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        if (step === 0) {
          step++;
          return jsonResponse({
            name: 'W',
            labels: [],
            invites: [{email: 'A@X.COM', roles: ['member'], _id: 'i1'}],
          });
        }
        putBody = JSON.parse(requestInit?.body as string);
        return jsonResponse({name: 'W', labels: []});
      },
    };
    const ws = new QlWorkspaces(options);
    await ws.inviteUser('ws-1', 'a@x.com', ['admin']);
    assert.deepEqual(putBody, {
      invites: [{email: 'A@X.COM', roles: ['admin'], _id: 'i1'}],
    });
  });

  await t.test('listInvites returns invites from getWorkspace', async () => {
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async () =>
        jsonResponse({
          name: 'W',
          labels: [],
          invites: [{email: 'x@y.com', roles: ['editor'], _id: 'inv1'}],
        }),
    };
    const ws = new QlWorkspaces(options);
    const list = await ws.listInvites('ws-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].email, 'x@y.com');
    assert.equal(list[0]._id, 'inv1');
  });

  await t.test('revokeInvite filters invite and updates workspace', async () => {
    let putBody: unknown;
    let step = 0;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        if (step === 0) {
          step++;
          return jsonResponse({
            name: 'W',
            labels: [],
            invites: [
              {_id: 'keep', email: 'a@b.com', roles: ['member']},
              {_id: 'drop', email: 'c@d.com', roles: ['member']},
            ],
          });
        }
        putBody = JSON.parse(requestInit?.body as string);
        return jsonResponse({name: 'W', labels: []});
      },
    };
    const ws = new QlWorkspaces(options);
    await ws.revokeInvite('ws-1', 'drop');
    assert.deepEqual(putBody, {
      invites: [{_id: 'keep', email: 'a@b.com', roles: ['member']}],
    });
  });

  await t.test('revokeInvite throws when id is not found', async () => {
    let step = 0;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async () => {
        if (step === 0) {
          step++;
          return jsonResponse({
            name: 'W',
            labels: [],
            invites: [{_id: 'x', email: 'a@b.com', roles: ['member']}],
          });
        }
        return jsonResponse({});
      },
    };
    const ws = new QlWorkspaces(options);
    await assert.rejects(() => ws.revokeInvite('ws-1', 'missing'), /Invitation not found/);
    assert.equal(step, 1);
  });
});
