<!-- SPDX-FileCopyrightText: 2026 Nubian Ibex and IbexWall contributors -->
<!-- SPDX-License-Identifier: GPL-3.0-or-later

# ibexwall-plugin-index

[![CI](https://github.com/nubian-ibex/ibexwall-plugin-index/actions/workflows/ci.yml/badge.svg)](https://github.com/nubian-ibex/ibexwall-plugin-index/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)


The index of IbexWall plugins: one file per plugin under `index/`, saying what
it is, where its source lives and who maintains it. A person reads it to find a
plugin; a tool reads it to know where to fetch one from. Listing a plugin here
says nothing about trust: a plugin is trusted only when its manifest is signed
with the key the person's IbexWall was built with.

- `index/official/` is generated from the manifests in the
  [app repository](https://github.com/nubian-ibex/ibexwall) and committed.
- `index/community/` holds entries proposed by their maintainers, one file per
  plugin, with the source repository and the maintainers named. A community
  plugin runs only on a machine whose administrator signed its key.

## Checks

```sh
node scripts/generate.mjs --check   # the index matches the app repository
node scripts/check.mjs              # every entry validates against the schema
```

CI runs both on every change.

## Adding a community plugin

Add `index/community/<id>.toml`:

    id = "system.example"
    name = "Example"
    description = "What it does, in one line."
    category = "other"
    kinds = ["check"]
    version = "1.0.0"
    origin = "community"
    license = "GPL-3.0-or-later"
    repository = "https://github.com/you/ibexwall-plugin-example"
    maintainers = ["your-name"]

A community plugin must propose and never apply, declare what it reads and
writes, and be signed. The review looks for exactly that.
