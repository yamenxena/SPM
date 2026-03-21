# ✏️ Themis Audit Report — أحمد (Bourj Prison, خارجي)

**SSoT Loaded:** ✅ Glossaries (5/5) | ✅ Editorial Guide | ✅ SRT Rules  
**Scope:** 8 SRT files, 300 cues  
**Date:** 2026-03-19  

---

## Pass 1: Literacy Enforcement

| # | File | Cue | Finding | AP | Severity | Status |
|---|------|:---:|---------|:--:|:--------:|:------:|
| 1 | 01 | 15 | Missing first-mention pattern: now `Bourj [Tower] Prison` | AP-08 | 🔴 | ✅ Fixed |
| 2 | 04 | 6 | Passive voice → active: `they tortured him to death` | AP-01 | ⚠️ | ✅ Fixed |
| 3 | 04 | 11 | Passive voice → active: `those they accused of` | AP-01 | ⚠️ | ✅ Fixed |

- **Person-first language (AP-04):** ✅ No issues
- **Acronym specificity (AP-10):** ✅ "ISIS" consistent
- **Gender-neutral (AP-16):** ✅ N/A (single male witness)

---

## Pass 2: Medium-Specific Formatting (SRT)

| # | File | Cue | Finding | AP | Severity | Status |
|---|------|:---:|---------|:--:|:--------:|:------:|
| 4 | 05 | 6 | `ISIS videos` → `propaganda videos` (إصدارات = official ISIS media) | AP-03 | ⚠️ | ✅ Fixed |
| 5 | 05 | 8 | `al-Naba` missing italics → `<i>al-Naba</i>` | AP-09 | 🔴 | ✅ Fixed |
| 6 | 06 | 96 | `اللودالين` local brand → added `<i>ludaelin</i> [dish soap]` | AP-09 | ⚠️ | ✅ Fixed |

### SRT-Specific Checks
| Rule | Status |
|------|:------:|
| No quotation marks (comma only for reported speech) | ✅ |
| No periods at end of blocks | ✅ |
| HTML `<i>` tags for transliterations | ✅ |
| Square brackets `[]` for glosses (not `()`) | ✅ |
| Once-then-English | ✅ |
| `Interviewer:` label (not `Journalist:`) | ✅ |
| No em-dashes | ✅ |
| No semicolons | ✅ |
| Cue parity: 300 AR = 300 EN | ✅ |
| Capitalize first letter of every block | ✅ |
| Timestamps byte-identical to Arabic source | ✅ |

---

## Pass 3: Forensic Audit (SPM "Never" Rules)

| Rule | Status |
|------|:------:|
| "ISIS" (never "IS", "ISIL", "Islamic State") | ✅ |
| "group cell" for مهجع (never "dormitory") | ✅ |
| "solitary cell" for منفردة | ✅ |
| "interrogation room" (room) / "interrogation" (process) | ✅ Fixed (was "investigation room") |
| "Bourj [Tower] Prison" first mention | ✅ Fixed |
| Name spelling vs §13 canonical list | ✅ Abdul Latif |
| Tense tier compliance | ✅ Past tense for events |

### Glossary Additions (promoted to SSoT)
| Arabic | English | Glossary |
|--------|---------|----------|
| البالنغو / بالنغو | *balingo* [hoist for suspension] | `5_glossary_isis.md` §20 |
| اللجان الشعبية | popular committees (pro-regime local militias) | `5_glossary_isis.md` §20 |

### Rule Additions
| Rule | File |
|------|------|
| `[]` not `()` for SRT glosses | `srt_translation_rules.md` §5 |
| No apostrophe in transliterations (double vowel instead) | `srt_translation_rules.md` §5 |
| `ta'zir` → `taazir` | glossaries 2 & 5, editorial guide |
| `investigation room` → `interrogation room` | 03:cue 2, 06:cue 87, 08:cue 25 |
| Two-line SRT formatting (line breaks) | User applied to all 8 files |
| Themis report in same output folder | `srt_translation_rules.md` §1, `translate-srt.md`, Themis SKILL.md |

---

## Summary

| Metric | Value |
|--------|:-----:|
| Files audited | 8 |
| Total cues | 300 |
| Critical findings (🔴) | 2 → ✅ All fixed |
| Warnings (⚠️) | 4 → ✅ All fixed |
| Glossary flags (📌) | 2 → ✅ Promoted to SSoT |
| Open issues | **0** |

---

**[AUTH: THEMIS-AUDIT | أحمد-خارجي | 8 files | 300 cues | 2026-03-19]**
