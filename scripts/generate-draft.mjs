#!/usr/bin/env node
// Разовая генерация черновика: POST /api/content/generate (Basic Auth).
// Креды берутся из env ADMIN_USER / ADMIN_PASS. URL захардкожен здесь,
// чтобы не копировать его в чат/терминал.
import { writeFileSync } from 'node:fs';

const BASE = 'https://doctorguryanova.ru';
const topic = process.argv[2];
if (!topic) { console.error('Usage: node scripts/generate-draft.mjs "тема"'); process.exit(1); }

const user = process.env.ADMIN_USER;
const pass = process.env.ADMIN_PASS;
if (!user || !pass) { console.error('Set ADMIN_USER and ADMIN_PASS first (see README step below).'); process.exit(1); }

const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
console.log(`POST ${BASE}/api/content/generate  topic="${topic}"  (up to ~60s, do not interrupt)`);

const t0 = Date.now();
let res;
try {
  res = await fetch(`${BASE}/api/content/generate`, {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
} catch (e) {
  console.error('network error:', e.message);
  process.exit(2);
}

const text = await res.text();
writeFileSync('/tmp/draft-latest.json', text);
console.log(`HTTP ${res.status}, ${((Date.now() - t0) / 1000).toFixed(1)}s  -> saved /tmp/draft-latest.json`);
try {
  const json = JSON.parse(text);
  console.log(JSON.stringify(json, null, 2).split('\n').slice(0, 120).join('\n'));
} catch {
  console.log(text.slice(0, 800));
}
