#!/usr/bin/env node
// Renders assets/header.svg: a terminal that types each command, then prints its output.
// Edit SESSION and run: node scripts/header.mjs

import { C, MONO, esc, save, terminal } from './lib.mjs';

const SESSION = [
  { cmd: 'whoami', out: [['ostrich', C.bright, true], ['  // Builder · SaaS · AI agents · Trading bots · Cybersecurity · Sysadmin', C.dim]] },
  { cmd: 'ls ~/expertise', out: [['saas    ai-agents    voice-ai    trading-bots    reverse-engineering    cybersecurity', C.blue]] },
  { cmd: 'cat ~/.status', out: [['Shipping products end to end. Bots that sell, bots that trade.', C.text]] },
];

const H = 270;
const START = 0.8; // idle cursor before the first keystroke
const THINK = 0.5; // pause after an output before typing the next command
const ENTER = 0.35; // pause between the last keystroke and the output
const FONT = `font-family="${MONO}" font-size="14" xml:space="preserve"`;

const t = (s) => `${s.toFixed(2)}s`;
const show = (at) => `<set attributeName="display" to="inline" begin="${t(at)}" fill="freeze"/>`;
const hide = (at) => `<set attributeName="display" to="none" begin="${t(at)}" fill="freeze"/>`;
const blink = '<animate attributeName="fill-opacity" values="1;1;0;0" keyTimes="0;0.5;0.501;1" dur="1s" repeatCount="indefinite"/>';
// display (not visibility) so untyped chars take no room and the cursor sits right after the last typed one.
const cursor = (until) => `<tspan fill="${C.accent}">█${until ? hide(until) : ''}${blink}</tspan>`;
// Uneven but deterministic keystroke gaps read as a human typing.
const gap = (k) => 0.055 + ((k * 7) % 5) * 0.02;

const lines = [];
let at = 0;
SESSION.forEach(({ cmd, out }, i) => {
  const promptAt = at;
  at += i === 0 ? START : THINK;
  const keys = [...cmd].map((ch, k) => `<tspan display="none">${esc(ch)}${show((at += gap(k)))}</tspan>`).join('');
  at += ENTER;

  const y = 68 + i * 60;
  lines.push(
    `  <text x="22" y="${y}" ${FONT}${i ? ` display="none">${show(promptAt)}` : '>'}<tspan fill="${C.accent}" font-weight="bold">$</tspan><tspan fill="${C.text}"> ${keys}${cursor(at)}</tspan></text>`,
    `  <text x="22" y="${y + 25}" ${FONT} display="none">${show(at)}${out.map(([s, fill, bold]) => `<tspan fill="${fill}"${bold ? ' font-weight="bold"' : ''}>${esc(s)}</tspan>`).join('')}</text>`,
  );
});
lines.push(`  <text x="22" y="248" ${FONT} display="none">${show(at)}<tspan fill="${C.accent}" font-weight="bold">$</tspan> ${cursor()}</text>`);

console.log(`wrote ${save('header.svg', terminal('~/profile', H, lines.join('\n')))} (${at.toFixed(2)}s)`);
