#!/usr/bin/env node
// Renders assets/streak.svg: all-time contributions plus current and longest daily streak.

import { C, MONO, W, fail, graphql, prompt, save, terminal } from './lib.mjs';

const USER = process.env.GRAPH_USER || 'ostrich-star';

const { user } = await graphql('query ($login: String!) { user(login: $login) { createdAt } }', { login: USER });
const now = new Date();
const today = now.toISOString().slice(0, 10);
const joined = user.createdAt.slice(0, 10);

// contributionsCollection spans at most one year, so ask per calendar year.
const query = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
      }
    }
  }
`;
const days = [];
for (let y = Number(joined.slice(0, 4)); y <= now.getUTCFullYear(); y++) {
  const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
  const data = await graphql(query, { login: USER, from: `${y}-01-01T00:00:00Z`, to });
  for (const w of data.user.contributionsCollection.contributionCalendar.weeks) {
    days.push(...w.contributionDays.filter((d) => d.date.startsWith(`${y}-`) && d.date >= joined && d.date <= today));
  }
}
if (days.length === 0) fail('no contribution days returned');
days.sort((a, b) => a.date.localeCompare(b.date));

const total = days.reduce((s, d) => s + d.contributionCount, 0);

let longest = { len: 0, from: '', to: '' };
let run = { len: 0, from: '' };
for (const d of days) {
  if (d.contributionCount === 0) {
    run = { len: 0, from: '' };
    continue;
  }
  run = { len: run.len + 1, from: run.from || d.date };
  if (run.len > longest.len) longest = { len: run.len, from: run.from, to: d.date };
}

// An empty today doesn't break the streak yet: the day isn't over.
let i = days.length - 1;
if (days[i].contributionCount === 0) i--;
let current = 0;
while (i - current >= 0 && days[i - current].contributionCount > 0) current++;
const currentFrom = current ? days[i - current + 1].date : today;

const H = 200;
const cols = [
  { value: total.toLocaleString('en-US'), label: 'total contributions', range: `${days[0].date} → today`, color: C.bright },
  { value: `${current} days`, label: 'current streak', range: current ? `${currentFrom} → today` : 'starts today', color: C.accent },
  { value: `${longest.len} days`, label: 'longest streak', range: `${longest.from} → ${longest.to}`, color: C.bright },
];

const body = cols
  .map(({ value, label, range, color }, k) => {
    const x = (W / 6) * (2 * k + 1);
    return `  <text x="${x}" y="122" fill="${color}" font-family="${MONO}" font-size="34" font-weight="bold" text-anchor="middle">${value}</text>
  <text x="${x}" y="150" fill="${C.text}" font-family="${MONO}" font-size="13" text-anchor="middle">${label}</text>
  <text x="${x}" y="172" fill="${C.muted}" font-family="${MONO}" font-size="11" text-anchor="middle">${range}</text>`;
  })
  .join('\n');

const svg = terminal('~/streak', H, `  <!-- Command line -->
  <text x="22" y="60" font-family="${MONO}" font-size="13" xml:space="preserve">${prompt(`git streak --author=${USER} --all`)}</text>

  <line x1="${W / 3}" y1="88" x2="${W / 3}" y2="176" stroke="${C.grid}" stroke-width="1"/>
  <line x1="${(2 * W) / 3}" y1="88" x2="${(2 * W) / 3}" y2="176" stroke="${C.grid}" stroke-width="1"/>

${body}`);

console.log(`wrote ${save('streak.svg', svg)} (total ${total}, current ${current}, longest ${longest.len} ${longest.from}..${longest.to})`);
