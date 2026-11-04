#!/usr/bin/env node
// Checks every external URL in docs/**/*.md and src/**/*.ts.
// angular.dev returns HTTP 200 for unknown pages but renders the home page,
// so for angular.dev we also check the <title> is not "Home • Angular".
// Usage: node scripts/check-links.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['docs', 'src', 'README.md'];
const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f)));
  else if (/\.(md|ts|html)$/.test(p)) files.push(p);
};
roots.forEach(walk);

const urlRe = /https?:\/\/[^\s)<>"'`\]]+/g;
const urls = new Map();
for (const file of files) {
  for (const raw of readFileSync(file, 'utf8').match(urlRe) ?? []) {
    const url = raw.replace(/[.,;:]+$/, '');
    if (url.includes('localhost') || url.includes('example.com')) continue;
    if (!urls.has(url)) urls.set(url, new Set());
    urls.get(url).add(file);
  }
}

const check = async (url) => {
  const base = url.split('#')[0];
  try {
    const res = await fetch(base, { redirect: 'follow', headers: { 'user-agent': 'link-check' } });
    // blog.angular.dev (Medium) blocks bots with 403: report it as a warning, not a failure.
    if (res.status === 403 && base.includes('blog.angular.dev')) return 'WARN';
    if (!res.ok) return `HTTP ${res.status}`;
    if (base.includes('angular.dev') && !/^https:\/\/angular\.dev\/?$/.test(base)) {
      const title = (await res.text()).match(/<title>([^<]*)/)?.[1] ?? '';
      if (title.startsWith('Home')) return 'angular.dev page not found (redirected to home)';
    }
    return null;
  } catch (e) {
    return String(e);
  }
};

const entries = [...urls.keys()];
const bad = [];
const warned = [];
for (let i = 0; i < entries.length; i += 10) {
  const batch = entries.slice(i, i + 10);
  const results = await Promise.all(batch.map(check));
  results.forEach((err, j) => {
    if (err === 'WARN') warned.push(batch[j]);
    else if (err) bad.push([batch[j], err]);
  });
}

console.log(`Checked ${entries.length} unique URLs in ${files.length} files.`);
for (const url of warned) console.log(`⚠️  ${url} → blocked for bots (403), open it in a browser to check`);
for (const [url, err] of bad) console.log(`❌ ${url} → ${err}\n   in ${[...urls.get(url)].join(', ')}`);
if (bad.length) process.exit(1);
console.log('✅ All links OK');
