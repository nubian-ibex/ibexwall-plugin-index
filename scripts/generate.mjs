#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Nubian Ibex and IbexWall contributors -->
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Writes the index of official plugins from the app repository's manifests, and
// checks every entry against the schema: the index is what a person or a tool
// reads to find a plugin, so it is generated, committed and checked.
//
//   node scripts/generate.mjs            write index/official from the app
//   node scripts/generate.mjs --check    fail if the committed index differs
//
// The app repository is found next to this one, or at IBEXWALL_APP.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const index = join(here, '..');
const app = process.env.IBEXWALL_APP ?? join(index, '..', 'ibexwall');
const check = process.argv.includes('--check');

function toml(text) {
  // The subset the plugin manifests and the index entries use.
  const out = {};
  let table = out;
  const value = (raw) => {
    raw = raw.trim();
    if (raw.startsWith('"')) return JSON.parse(raw);
    if (raw.startsWith('[')) {
      const items = [];
      let current = '';
      let inString = false;
      let depth = 0;
      for (let i = 1; i < raw.length - 1; i += 1) {
        const c = raw[i];
        if (c === '"' && raw[i - 1] !== '\\') inString = !inString;
        if (!inString && (c === '[' || c === '{')) depth += 1;
        if (!inString && (c === ']' || c === '}')) depth -= 1;
        if (!inString && depth === 0 && c === ',') {
          if (current.trim()) items.push(value(current));
          current = '';
        } else current += c;
      }
      if (current.trim()) items.push(value(current));
      return items;
    }
    return raw;
  };
  let current = '';
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const header = /^\[([^\]]+)\]$/.exec(trimmed);
    if (header && !current) {
      table = out;
      for (const part of header[1].split('.')) table = table[part] ??= {};
      continue;
    }
    if (header) continue;
    current += (current ? ' ' : '') + trimmed;
    if (!current.endsWith(']') || (current.match(/\[/g) ?? []).length <= (current.match(/\]/g) ?? []).length) {
      const eq = current.indexOf('=');
      if (eq > 0) table[current.slice(0, eq).trim()] = value(current.slice(eq + 1));
      current = '';
    }
  }
  return out;
}

const entry = (m, locale = 'en') => `# Generated from the plugin's manifest; do not edit by hand.
id = "${m.id}"
name = "${m.name[locale]}"
description = "${m.description[locale]}"
category = "${m.category}"
kinds = [${m.kinds.map((k) => `"${k}"`).join(', ')}]
version = "${m.version}"
origin = "${m.origin}"
license = "${m.license}"
repository = "https://github.com/nubian-ibex/ibexwall"
maintainers = ["nubian-ibex"]
`;

if (!existsSync(join(app, 'plugins'))) {
  console.log('app repository not found; keeping the committed index');
  process.exit(0);
}

const folder = join(index, 'index', 'official');
mkdirSync(folder, { recursive: true });
const wanted = new Set();
let count = 0;
for (const dir of readdirSync(join(app, 'plugins')).sort()) {
  const file = join(app, 'plugins', dir, 'plugin.toml');
  if (!existsSync(file)) continue;
  const m = toml(readFileSync(file, 'utf8'));
  if (m.category === 'dev') continue;
  writeFileSync(join(folder, `${m.id}.toml`), entry(m));
  wanted.add(`${m.id}.toml`);
  count += 1;
}
for (const file of readdirSync(folder)) {
  if (!wanted.has(file)) rmSync(join(folder, file));
}

if (check) {
  const diff = (() => {
    try {
      execFileSync('git', ['diff', '--exit-code', '--', 'index'], { cwd: index, stdio: 'pipe' });
      return false;
    } catch (error) {
      return String(error.stdout ?? '');
    }
  })();
  if (diff) {
    console.error('the committed index differs from the app repository:');
    console.error(diff.slice(0, 2000));
    process.exit(1);
  }
  console.log(`ok: the index matches (${count} official plugins)`);
} else {
  console.log(`wrote ${count} official plugin entries`);
}
