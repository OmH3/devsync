import test from 'node:test';
import assert from 'node:assert/strict';
import { guardResourceEvents } from '../src/middleware/socket-resource.middleware.js';

function harness(member, active = true) {
  let middleware;
  const errors = [];
  const socket = { userId: 'reader', use: fn => { middleware = fn; }, emit: (_, data) => errors.push(data) };
  const resource = { findById: () => ({ lean: async () => ({ isActive: active, creatorId: 'owner', workspaceId: 'workspace' }) }) };
  guardResourceEvents(socket, { Doc: resource, Code: resource, Board: resource, Member: { findOne: () => ({ populate: async () => member }) } });
  return async (event, data) => {
    let admitted = false;
    await middleware([event, data], () => { admitted = true; });
    return { admitted, errors };
  };
}

test('outsiders cannot join code rooms or inject document and board mutations', async () => {
  for (const [event, payload] of [['join-code-editor', 'id'], ['doc-text-change', { docId: 'id' }], ['draw-start', { whiteboardId: 'id' }]]) {
    const result = await harness(null)(event, payload);
    assert.equal(result.admitted, false);
    assert.equal(result.errors[0].code, 'FORBIDDEN');
  }
});

test('read-only membership permits joining but denies edits', async () => {
  const run = harness({ role: { permissions: ['USE_DOCS'] } });
  assert.equal((await run('join-doc', 'id')).admitted, true);
  assert.equal((await run('doc-text-change', { docId: 'id' })).admitted, false);
});

test('edit permission permits mutations, inactive resources deny access', async () => {
  const member = { role: { permissions: ['EDIT_DOCS'] } };
  assert.equal((await harness(member)('doc-text-change', { docId: 'id' })).admitted, true);
  assert.equal((await harness(member, false)('join-doc', 'id')).admitted, false);
});
