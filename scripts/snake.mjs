#!/usr/bin/env node
// Wraps Platane/snk's output (default dist/snake.svg) in the terminal window as assets/snake.svg.

import { readFileSync } from 'node:fs';
import { MONO, W, fail, prompt, save, terminal } from './lib.mjs';

const raw = readFileSync(process.argv[2] || 'dist/snake.svg', 'utf8');
const viewBox = raw.match(/^<svg[^>]*\sviewBox="([^"]+)"/)?.[1] ?? fail('snake svg has no viewBox');
const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number);

const H = 270;
const w = W - 44;
// Nested <svg> keeps snk's own coordinates; its :root CSS variables resolve on our outer root.
const snake = raw.replace(/^<svg[^>]*>/, `<svg x="22" y="70" width="${w}" height="${((w * vh) / vw).toFixed(1)}" viewBox="${viewBox}">`);

const svg = terminal('~/snake', H, `  <!-- Command line -->
  <text x="22" y="60" font-family="${MONO}" font-size="13" xml:space="preserve">${prompt('snake --eat ~/contributions')}</text>

  ${snake}`);

console.log(`wrote ${save('snake.svg', svg)}`);
