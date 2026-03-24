---
scope: translation, editing, proofreading
version: 3.0
date: 2026-03-09
---

# SPM Glossary — Master Index (SSoT)

> **This directory is the Single Source of Truth (SSoT) for all Arabic ↔ English terminology.**
> All agents, skills, workflows, and scripts must reference `docs/glossaries/*_glossary_*.md`.

## Domain Glossaries

| File | Volume | Sections | Terms |
|------|--------|----------|-------|
| `1_glossary_state_military.md` | I. State & Military | §1–§5 | 205 |
| `2_glossary_detention.md` | II. Detention & Prison | §6–§9 | 170 |
| `3_glossary_legal_admin.md` | III. Legal & Admin | §10–§11 | 116 |
| `4_glossary_places_culture.md` | IV. Places & Culture | §12–§16 | 127 |
| `5_glossary_isis.md` | V. ISIS / IPM | §17–§26 | 313 |

**Total: 930 terms · 26 global sections · 5 files**

> **Note:** The Military Intelligence Division glossary was merged into file I, §3 (v2.1).

## Other

| Path | Description |
|------|-------------|
| `incremental/` | New terms pending promotion (via `/promote-glossary`) |

## Table Format Rule

All glossary tables: `| العربية | English |` — **Arabic LEFT, English RIGHT. No exceptions.**

## Loading Convention

- **Agents/Skills:** Load all `*_glossary_*.md` from this directory
- **Scripts:** `glob('docs/glossaries/*_glossary_*.md')`
- **Promote workflow:** Route new terms into the correct domain file by section number

**[AUTH: GLOSSARY-INDEX-V3.0 | Infra-Structure | 2026-03-09]**
