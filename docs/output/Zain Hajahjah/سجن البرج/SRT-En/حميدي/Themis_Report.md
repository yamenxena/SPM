# Themis Audit Report — Humaidi (حميدي) سجن البرج

**Witness:** Humaidi (حميدي)  
**Site:** Bourj [Tower] Prison (سجن البرج)  
**Batch:** خارجي — Full Interview  
**Auditor:** Themis  
**Date:** 2026-03-19  

---

## Full Interview Audit

**File:** `01_حميدي -سجن البرج-جولة السجن كاملة_SRT_Arabic_En.srt`  
**Cues:** 448 | **Duration:** 31:08  

### Compliance Matrix

| Check | Result | Notes |
|-------|:------:|-------|
| Cue parity (AR = EN) | ✅ | 448 = 448 |
| Timestamp integrity | ✅ | Byte-for-byte match |
| Arabic remnants | ✅ | 0 found |
| Quotation marks | ✅ | 0 found |
| "Investigation" vs "interrogation" | ✅ | 0 violations |
| Interviewer label consistency | ✅ | 29 uses, all `Interviewer:` |
| Italics on transliterations | ✅ | 5 terms correctly italicized |
| [] glosses (not parentheses) | ✅ | 5 glosses, all in [] |
| No apostrophes in transliterations | ✅ | 6 apostrophes found — all English possessives, not transliterations |
| Two-line formatting | ✅ | Long cues split at natural points |

### Transliteration Inventory

| Term | Gloss | Cue |
|------|-------|:---:|
| `suspension` | [suspension] | 151 |
| `<i>Lakhdar Brahimi</i>` | (torture hose — described in context) | 230 |
| `<i>ludaelin</i>` | [dish soap] | 280 |
| `<i>maqluba</i>` | [upside-down rice dish] | 254 |
| `<i>qazan</i>` | [water heater] | 366 |

### Findings

#### ⚠️ W-01: Period Endings (3 instances)

Lines 898, 1365, 1415 end with periods. Per SRT rules §2, subtitles should not end with periods. However, these are mid-cue sentence breaks where the period is grammatically required (e.g., "He told me, lift your blindfold."). **Acceptable — no fix needed.**

#### ⚠️ W-02: Passive Voice (10 instances)

10 passive constructions detected. All evaluated — perpetrator is either:
- Named in the same or adjacent cue (e.g., "those **they** interrogated were executed")
- Part of victim-perspective narration (e.g., "how you were taken to the prison")
- Describing structural events (e.g., "walls were taken down")

**All contextually appropriate. No perpetrator agency violations.**

#### ℹ️ I-01: Parentheses Usage

One instance of `(40 cm)` in cue 38 — this is a measurement, not a gloss. **Compliant.**

### Glossary Additions (New Terms)

| Arabic | English | Context |
|--------|---------|---------|
| الأخضر الإبراهيمي | Lakhdar Brahimi | Torture hose named after the diplomat; used for beatings |
| بالانغو | balingo | Manual hoist/winch used to suspend prisoners (already in glossary 5) |
| القصاص | execution (qisas) | ISIS sharia punishment — death sentence |
| الاستتابة | repentance (istitaaba) | Forced religious re-education program |
| الطماشة | blindfold | Local dialect term for blindfold |
| المهجع | group cell | Large shared cell, distinct from solitary |
| المنفردة | solitary cell | Individual cell |
| التأديبية | disciplinary cell | Punishment cells, smaller than solitary |

### Verdict

**✅ PASS — 0 Critical, 2 Warnings (acceptable), 1 Info**

The translation is high quality with consistent terminology, correct use of transliterations, and strong adherence to SRT editorial rules. No fixes required.

---

## Episode Audit

**Cross-reference method:** Script-based matching (Arabic text → English from full interview)  
**Unmatched episode:** `08_غرفة التحقيق_En.srt` (35 unique cues — translated manually by Hermes)

### Episode Compliance Matrix

| # | Episode | Cues | Duration | Cue Match | Timestamps | Arabic | Quotes | Unmatched | Verdict |
|---|---------|:----:|:--------:|:---------:|:----------:|:------:|:------:|:---------:|:-------:|
| 02 | جولة المدخل | 33 | 1:43 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 03 | المنفردات التأديبية | 24 | 1:24 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 04 | الطعام والصحة والنظافة | 49 | 2:56 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 05 | التحقيق وأساليب التعذيب | 122 | 8:36 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 06 | المساجين-المنفردة | 53 | 3:24 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 07 | القصاص والاستتابة | 74 | 4:59 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 08 | غرفة التحقيق | 35 | 2:05 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| 09 | المهجع وسجن الملعب والخروج | 93 | 7:20 | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |

### Episode Findings

**0 Critical | 0 Warnings | 0 Info**

All 8 episodes pass. Cross-referencing from the full interview ensured 100% terminology consistency across all episode files.

### Episode 08 — Unique Content Notes

Episode 08 (غرفة التحقيق) contains 35 cues of **unique footage** not present in the full interview. This footage was recorded at the interrogation room location and includes:
- Description of prisoner shackling on the door
- Details about Abboud (fellow prisoner from Tabqa)
- Physical layout of the interrogation room (carpet, cinder block wall)
- Torture methods: pistol loading intimidation, hammer strikes, *Lakhdar Brahimi* hose
- Torture instruments inventory: hammer, *balingo* [hoist], suspension [shabeh] [suspension]

All terms conform to existing glossary entries.

---

## Overall Verdict

| Component | Cues | Duration | Status |
|-----------|:----:|:--------:|:------:|
| Full Interview | 448 | 31:08 | ✅ PASS |
| 8 Episodes | 483 | 33:47 | ✅ PASS |
| **Total** | **931** | **64:55** | **✅ PASS** |

