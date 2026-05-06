import assert from 'node:assert/strict';
import test from 'node:test';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { applyQelosForwardHeaders } from './forward-headers';
import { QELOS_USER_HEADER, QELOS_WORKSPACE_HEADER } from './types';

test('applyQelosForwardHeaders strips spoofed client headers when anonymous', () => {
  const h = new Headers();
  h.set(QELOS_USER_HEADER, 'evil-user');
  h.set(QELOS_WORKSPACE_HEADER, 'evil-ws');
  applyQelosForwardHeaders(h, null, null);
  assert.equal(h.get(QELOS_USER_HEADER), null);
  assert.equal(h.get(QELOS_WORKSPACE_HEADER), null);
});

test('applyQelosForwardHeaders sets trusted ids when resolved', () => {
  const h = new Headers();
  applyQelosForwardHeaders(h, { _id: 'u1' } as IUser, { _id: 'w1' } as IWorkspace);
  assert.equal(h.get(QELOS_USER_HEADER), 'u1');
  assert.equal(h.get(QELOS_WORKSPACE_HEADER), 'w1');
});
