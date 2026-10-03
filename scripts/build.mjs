import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import './generate-icons.mjs';

const outputDirectory = new URL('../dist/', import.meta.url);
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: ['src/guard-main.ts', 'src/settings-bridge.ts', 'src/popup.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  outdir: 'dist',
  sourcemap: true,
});

await cp('popup.html', 'dist/popup.html');
await cp('popup.css', 'dist/popup.css');
await cp('icons', 'dist/icons', { recursive: true });
await cp('_locales', 'dist/_locales', { recursive: true });
await cp('LICENSE', 'dist/LICENSE');
await cp('vendor/LICENSE.translation-resilience', 'dist/LICENSE.translation-resilience');

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
for (const contentScript of manifest.content_scripts) {
  contentScript.js = contentScript.js.map((file) => file.replace(/^dist\//, ''));
}
manifest.action.default_popup = manifest.action.default_popup.replace(/^dist\//, '');
await writeFile('dist/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
