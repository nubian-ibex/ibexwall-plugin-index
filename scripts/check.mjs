#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Nubian Ibex and IbexWall contributors -->
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Every index entry parses as TOML, has the required fields, and its file name
// is its id. No JSON Schema tool needed at review speed: the schema file is
// the contract, this is the check that runs everywhere.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const seen = new Set();

const value = (raw) => {
  raw = raw.trim();
  if (raw.startsWith('"')) return JSON.parse(raw);
  if (raw.startsWith('[')) {
    return raw
      .slice(1, -1)
      .split(',')
      .map((v) => value(v))
      .filter((v) => v !== '');
  }
  return raw;
};

for (const group of ['official', 'community']) {
  const folder = join(root, 'index', group);
  if (!existsSync(folder)) continue;
  for (const file of readdirSync(folder)) {
    if (!file.endsWith('.toml')) continue;
    const path = join(folder, file);
    const entry = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = /^([a-z_]+) = (.+)$/.exec(line.trim());
      if (m && !line.startsWith('#')) entry[m[1]] = value(m[2]);
    }
    const where = `${group}/${file}`;
    const need = ['id', 'name', 'description', 'category', 'kinds', 'version', 'origin', 'license', 'repository', 'maintainers'];
    for (const field of need) if (!(field in entry)) problems.push(`${where}: missing ${field}`);
    if (entry.id && file !== `${entry.id}.toml`) problems.push(`${where}: the file name must be the id`);
    if (entry.id) {
      if (seen.has(entry.id)) problems.push(`${where}: ${entry.id} appears twice`);
      seen.add(entry.id);
    }
    if (group === 'official' && entry.origin && entry.origin !== 'official') problems.push(`${where}: official entries are generated; propose it under community/`);
    if (group === 'community' && entry.origin && entry.origin !== 'community') problems.push(`${where}: community entries say origin = "community"`);
    if (Array.isArray(entry.repository) || (entry.repository && !String(entry.repository).startsWith('https://'))) problems.push(`${where}: the repository is an https address`);
    if (!Array.isArray(entry.maintainers) || entry.maintainers.length < 1) problems.push(`${where}: at least one maintainer`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`ok: ${seen.size} entries`);
