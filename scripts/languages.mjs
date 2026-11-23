#!/usr/bin/env node
// Renders assets/languages.svg: language share by bytes across every repo the token's owner has, private included.
// shortcut: run locally (GITHUB_TOKEN=$(gh auth token) node scripts/languages.mjs) because the Actions token
// can't read other private repos; add a read-only PAT secret + workflow step if it should refresh on its own.

import { C, MONO, W, graphql, prompt, save, terminal } from './lib.mjs';

const MARKUP = new Set(['HTML', 'CSS', 'SCSS', 'MDX', 'Markdown']); // site exports and docs, not code
const ROWS = 7; // top languages; the rest fold into "Other"

const query = `
  query ($cursor: String) {
    viewer {
      repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false) {
        pageInfo { hasNextPage endCursor }
        nodes { languages(first: 50) { edges { size node { name color } } } }
      }
    }
  }
`;

const bytes = new Map();
let repos = 0;
for (let cursor = null; ; ) {
  const { viewer } = await graphql(query, { cursor });
  const page = viewer.repositories;
  repos += page.nodes.length;
  for (const { size, node } of page.nodes.flatMap((r) => r.languages.edges)) {
    if (MARKUP.has(node.name)) continue;
    const cur = bytes.get(node.name) ?? { size: 0, color: node.color ?? C.muted };
    cur.size += size;
    bytes.set(node.name, cur);
  }
  if (!page.pageInfo.hasNextPage) break;
  cursor = page.pageInfo.endCursor;
}

const total = [...bytes.values()].reduce((s, l) => s + l.size, 0);
const sorted = [...bytes].map(([name, l]) => ({ name, ...l })).sort((a, b) => b.size - a.size);
const rest = sorted.slice(ROWS).reduce((s, l) => s + l.size, 0);
const rows = [...sorted.slice(0, ROWS), ...(rest ? [{ name: 'Other', size: rest, color: C.dim }] : [])];

const H = 270;
const BAR = { x: 170, w: 560 };
const body = rows
  .map(({ name, size, color }, i) => {
    const y = 90 + i * 21;
    const pct = (size / total) * 100;
    return `  <circle cx="27" cy="${y - 4}" r="4" fill="${color}"/>
  <text x="40" y="${y}" fill="${C.text}" font-family="${MONO}" font-size="13">${name}</text>
  <rect x="${BAR.x}" y="${y - 8}" width="${BAR.w}" height="8" rx="4" fill="${C.grid}"/>
  <rect x="${BAR.x}" y="${y - 8}" width="${Math.max((pct / 100) * BAR.w, 4).toFixed(1)}" height="8" rx="4" fill="${color}"/>
  <text x="${W - 22}" y="${y}" fill="${C.muted}" font-family="${MONO}" font-size="13" text-anchor="end">${pct.toFixed(1)}%</text>`;
  })
  .join('\n');

const svg = terminal('~/languages', H, `  <!-- Command line -->
  <text x="22" y="60" font-family="${MONO}" font-size="13" xml:space="preserve">${prompt('github-linguist --breakdown ~/repos')}</text>

${body}

  <!-- Footer -->
  <text x="22" y="${H - 16}" font-family="${MONO}" font-size="12" xml:space="preserve"><tspan fill="${C.text}" font-weight="bold">${repos}</tspan><tspan fill="${C.dim}"> repos  //  private included  //  markup excluded</tspan></text>
  <text x="${W - 22}" y="${H - 16}" fill="${C.dim}" font-family="${MONO}" font-size="11" text-anchor="end">updated ${new Date().toISOString().slice(0, 10)}</text>`);

console.log(`wrote ${save('languages.svg', svg)} (${repos} repos, ${rows.map((r) => `${r.name} ${((r.size / total) * 100).toFixed(1)}%`).join(', ')})`);
