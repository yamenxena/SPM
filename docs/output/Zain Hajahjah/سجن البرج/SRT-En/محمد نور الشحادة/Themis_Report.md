# Themis Audit Report — محمد نور الشحادة (Muhammad Nour al-Shahadah)

**Witness:** Muhammad Nour al-Shahadah  
**Prison:** Bourj [Tower] Prison (سجن البرج)  
**Series:** خارجي (7 episodes)  
**Date:** 20 March 2026  
**Auditor:** Themis v1.0-AOS

---

## SSoTs Loaded

| Source | Version | Status |
|--------|---------|--------|
| Unified Editorial Guide | v2.4 | ✅ |
| SRT Translation Rules | v1.0 | ✅ |
| 1_glossary_state_military | v2.1 | ✅ |
| 2_glossary_detention | v2.0 | ✅ |
| 3_glossary_legal_admin | v2.0 | ✅ |
| 4_glossary_places_culture | v2.0 | ✅ |
| 5_glossary_isis | v2.0 | ✅ |

---

## Cue Parity Verification

| # | Episode | AR | EN | Match |
|---|---------|:--:|:--:|:-----:|
| 01 | الاعتقال | 34 | 34 | ✅ |
| 02 | التحقيق | 84 | 84 | ✅ |
| 03 | التعذيب | 47 | 47 | ✅ |
| 04 | مفردات وألقاب | 47 | 47 | ✅ |
| 05 | قصف سجن البرج | 71 | 71 | ✅ |
| 06 | المنفردة | 37 | 37 | ✅ |
| 07 | الخروج | 41 | 41 | ✅ |
| | **Total** | **361** | **361** | ✅ |

---

## Pass 1: Terminology & Glossary Compliance

| # | File | Cue | Finding | Code | Fix |
|---|------|:---:|---------|------|-----|
| 1 | 02 | 73 | "religious courses" → should be `<i>sharia</i> courses` per glossary: دورات شرعية = *sharia* courses | TERM-1 | ✅ Fixed |
| 2 | 04 | 31 | "perform ablution" → first mention should use `<i>wudu</i> [ablution]` per once-then-English rule | TRANS-1 | ✅ Fixed |

### Terminology Verified ✅

| Term | AR Source | EN Used | Glossary | Status |
|------|-----------|---------|----------|--------|
| Bourj [Tower] Prison | سجن البرج | Bourj [Tower] Prison (first), Bourj Prison (subsequent) | Bourj Prison + SRT `[]` rule | ✅ |
| ISIS | داعش / التنظيم | ISIS | ISIS (never IS/ISIL) | ✅ |
| disciplinary cell | التأديبية | disciplinary cell / disciplinary | disciplinary | ✅ |
| balingo | البالنغو | `<i>balingo</i> [hoist for suspension]` | *balingo* [hoist for suspension] | ✅ |
| tamasha | الطماشة | `<i>tamasha</i> [blindfold]` | *tamasha* [blindfold] | ✅ |
| shabeh | الشبح | `suspension [<i>shabeh</i>]` | suspension [shabeh] [suspension] | ✅ |
| Lakhdar Brahimi | الأخضر الإبراهيمي | Lakhdar Brahimi | Lakhdar Brahimi (not al-Akhdar) | ✅ |
| group cell | مهجع | group cell | group cell (not dormitory) | ✅ |
| solitary cell | منفردة | solitary cell | solitary cell | ✅ |
| Interviewer | الصحفي | Interviewer: | interviewer (not journalist) | ✅ |
| interrogation | التحقيق | interrogation | interrogation (not investigation) | ✅ |
| Assad regime | نظام الدولة السورية | Assad regime | Assad regime (never Syrian regime) | ✅ |
| Free Syrian Army | الجيش الحر | Free Syrian Army | Free Syrian Army (FSA) | ✅ |
| SDF | قسد | Syrian Democratic Forces, the SDF | SDF | ✅ |
| muaazin | المؤذن | `<i>muaazin</i>` | No apostrophe (mu'azzin → muaazin) | ✅ |
| wudu | وضوء | `<i>wudu</i> [ablution]` | *wudu* [ablution] | ✅ |
| Tabqa | الطبقة | Tabqa | Tabqa (not Tabaqa) | ✅ |
| clan | عشيرة | — | clan (not tribe) — not used in text | ✅ n/a |
| execution | القصاص / الإعدام | execution | execution / death sentence | ✅ |
| base | مقر | base | base (not headquarters) | ✅ |

---

## Pass 2: SRT Format Compliance

| Rule | Status |
|------|--------|
| No periods at end of cue blocks | ✅ |
| No quotation marks around reported speech | ✅ |
| HTML `<i>` tags for transliterations | ✅ |
| `[]` brackets for glosses (not `()`) | ✅ |
| No em-dashes | ✅ |
| No semicolons | ✅ |
| `Interviewer:` capitalized | ✅ |
| Numbers >9 as numerals | ✅ |
| Two-line formatting for long cues | ✅ |
| No apostrophes in transliterations | ✅ |
| Timestamps byte-identical to source | ✅ |
| Cue numbers identical to source | ✅ |

---

## Pass 3: Style & Consistency

| Check | Status | Notes |
|-------|--------|-------|
| American English | ✅ | Consistent throughout |
| Reported speech: no quotation marks | ✅ | Comma-only per SRT rules |
| First name for victim, surname for officials | ✅ | "Muhammad" for witness |
| Once-then-English for Arabic terms | ✅ | balingo, tamasha, shabeh, wudu all introduced once then English only |
| Clear, everyday language | ✅ | YouTube-style clarity, no slang |
| Sentence order preserved | ✅ | Aligned with timestamps |
| No Arabic remnants in EN files | ✅ | Verified |
| Tone consistency across episodes | ✅ | Consistent terminology and register |

---

## Verdict

**PASS** — 2 minor terminology issues found and corrected in-place. All 361 cues verified. Full glossary and editorial compliance achieved.

---

**[AUTH: THEMIS-AUDIT | محمد نور الشحادة | سجن البرج | 2026-03-20]**
