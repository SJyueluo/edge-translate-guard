import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

test('extension runs its repair code early in the page world and settings bridge in isolation', () => {
  assert.equal(manifest.manifest_version, 3);
  const repair = manifest.content_scripts.find((script) => script.js.includes('dist/guard-main.js'));
  const settings = manifest.content_scripts.find((script) => script.js.includes('dist/settings-bridge.js'));
  assert.equal(repair.run_at, 'document_start');
  assert.equal(repair.world, 'MAIN');
  assert.equal(settings.run_at, 'document_start');
  assert.equal(settings.world, 'ISOLATED');
});
