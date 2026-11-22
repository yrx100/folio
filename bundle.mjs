import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

await mkdir('bin', { recursive: true });

// 1. Compile Tailwind CSS v4 (scans src/**/*.{ts,tsx} automatically)
const twCli = path.resolve('node_modules/@tailwindcss/cli/dist/index.mjs');
execFileSync(
  process.execPath,
  [twCli, '-i', 'src/styles/app.css', '-o', 'bin/tailwind.css', '--minify'],
  { stdio: 'inherit' }
);

// 2. Bundle React + TypeScript + Motion + vendor CSS (e.g. driver.js)
await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  legalComments: 'eof',
  target: 'chrome110',
  outfile: 'bin/app.js',
  alias: { '@': path.resolve('src') },
  define: { 'process.env.NODE_ENV': '"production"' },
});

const js = await readFile('bin/app.js', 'utf8');
const tailwindCss = await readFile('bin/tailwind.css', 'utf8');
let vendorCss = '';
try {
  vendorCss = await readFile('bin/app.css', 'utf8');
} catch {
  // No extracted vendor CSS
}

const css = `${vendorCss}\n${tailwindCss}`;
await writeFile('bin/app.css', css);
await rm('bin/tailwind.css', { force: true });

const html =
  '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">' +
  '<style>' + css + '</style><title>Folio</title></head>' +
  '<body><div id="root"></div><script>' + js.replace(/<\/script/gi, '<\\/script') + '</script></body></html>';

await writeFile('bin/index.html', html);
