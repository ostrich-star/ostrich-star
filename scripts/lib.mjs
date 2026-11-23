// Shared by every generator in scripts/: GitHub-dark terminal window, palette,
// GraphQL client and output path. One viewBox width so all cards line up at width="100%".

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const W = 842;

export const C = {
  bg: '#0d1117',
  bar: '#161b22',
  border: '#30363d',
  grid: '#21262d',
  accent: '#39d353',
  text: '#e6edf3',
  bright: '#f0f6fc',
  blue: '#79c0ff',
  muted: '#8b949e',
  dim: '#484f58',
};

export const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

export const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// Bold green "$" followed by the command, for a <text xml:space="preserve">.
export const prompt = (cmd) => `<tspan fill="${C.accent}" font-weight="bold">$</tspan><tspan fill="${C.text}"> ${esc(cmd)}</tspan>`;

export function terminal(path, H, body) {
  return `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">

  <!-- Terminal window -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="11" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>

  <!-- Title bar -->
  <rect x="1" y="1" width="${W - 2}" height="36" rx="11" fill="${C.bar}"/>
  <rect x="1" y="26" width="${W - 2}" height="11" fill="${C.bar}"/>
  <line x1="1" y1="37" x2="${W - 1}" y2="37" stroke="${C.border}" stroke-width="0.5"/>

  <!-- Traffic lights -->
  <circle cx="24" cy="19" r="6" fill="#ff5f56"/>
  <circle cx="44" cy="19" r="6" fill="#ffbd2e"/>
  <circle cx="64" cy="19" r="6" fill="#27c93f"/>

  <!-- Title bar text -->
  <text x="${W / 2}" y="23" fill="${C.muted}" font-family="${MONO}" font-size="12" text-anchor="middle">ostrich@github: ${esc(path)}</text>

${body}
</svg>
`;
}

export function save(name, svg) {
  const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg);
  return out;
}

export async function graphql(query, variables) {
  const token = process.env.GITHUB_TOKEN || process.env.TOKEN;
  if (!token) fail('GITHUB_TOKEN (or TOKEN) is required');

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'profile-card-generator',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) fail(`GitHub API returned ${res.status}: ${await res.text()}`);

  const body = await res.json();
  if (body.errors) fail(JSON.stringify(body.errors, null, 2));
  return body.data;
}

export function fail(msg) {
  console.error(msg);
  process.exit(1);
}
