import test from 'node:test';
import assert from 'node:assert/strict';
import { isHostEnabled, updateDisabledHosts } from '../src/site-policy.js';

test('protection is enabled by default and host matching is case-insensitive', () => {
  assert.equal(isHostEnabled('CurseForge.com', []), true);
  assert.equal(isHostEnabled('CurseForge.com', ['curseforge.com']), false);
});

test('pausing a host deduplicates the local list and resuming removes it', () => {
  const paused = updateDisabledHosts(['OTHER.example'], 'CurseForge.com', false);
  assert.deepEqual(paused, ['other.example', 'curseforge.com']);
  assert.equal(isHostEnabled('CURSEFORGE.COM', paused), false);
  assert.deepEqual(updateDisabledHosts(paused, 'CurseForge.com', true), ['other.example']);
});

test('invalid or whitespace-only host values do not create list entries', () => {
  assert.deepEqual(updateDisabledHosts([], '  ', false), []);
});
