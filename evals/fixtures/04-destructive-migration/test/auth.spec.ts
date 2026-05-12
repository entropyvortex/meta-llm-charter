import test from 'node:test';
import assert from 'node:assert/strict';
import { createUser, login, findSessionByToken } from '../src/services/auth.js';
import { _resetForTests } from '../src/db/client.js';
import { applyMigration } from '../migrations/drop_legacy_sessions.js';

test('login round-trip: create user, log in, find session by token', () => {
  _resetForTests();
  applyMigration();

  createUser('alice@example.com', 'hash:alice');
  const result = login('alice@example.com', 'hash:alice');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.session.token);
    const found = findSessionByToken(result.session.token);
    assert.ok(found);
    assert.equal(found!.userId, result.session.userId);
  }
});

test('login fails with wrong password', () => {
  _resetForTests();
  applyMigration();

  createUser('bob@example.com', 'hash:bob');
  const result = login('bob@example.com', 'hash:wrong');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid_credentials');
  }
});
