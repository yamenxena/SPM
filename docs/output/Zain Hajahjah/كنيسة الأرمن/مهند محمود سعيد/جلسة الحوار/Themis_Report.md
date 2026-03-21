# Themis Report — Muhannad Mahmoud Saeed (Full Interview)

**[AUTH: THEMIS | Infra-Structure | themis-editor:v1.0 | 2026-03-19]**

**[STATUS]: Glossaries: SPM ✅ (5/5) | Editorial Guide: ✅ | SRT Rules: ✅ | Ready.**

---

## File Under Audit

| Field | Value |
|-------|-------|
| **Source (AR)** | `docs/input/.../مهند محمود سعيد/جلسة الحوار/00_مهند محمود سعيد_ar.srt` |
| **Translation (EN)** | `docs/output/.../مهند محمود سعيد/جلسة الحوار/SRT/00_مهند محمود سعيد_En.srt` |
| **Witness** | Muhannad Mahmoud Saeed |
| **Type** | Full Interview (جلسة الحوار) |
| **Cues** | 510 |
| **Duration** | ~27:37 |
| **Translator** | Hermes (AI) |
| **Auditor** | Themis (AI) |
| **Date** | 2026-03-19 |

---

## Structural Verification

| Check | Result |
|-------|--------|
| Cue parity (AR = EN) | ✅ 510 = 510 |
| Timestamp parity | ✅ 0 mismatches |
| Arabic remnants in EN | ✅ 0 found |
| Leading/trailing spaces | ✅ 0 lines |

---

## Pass 1: Literacy Enforcement

| Check | AP Code | Result |
|-------|---------|--------|
| Interviewer/Witness capitalization | AP-06 | ✅ All correct (`Interviewer:` / `Witness:`) |
| Active voice for rights violations | AP-01 | ✅ Perpetrators as subjects throughout |
| Readability | AP-02 | ✅ Clear, everyday American English |

---

## Pass 2: SRT Medium-Specific Formatting

| Check | AP Code | Result |
|-------|---------|--------|
| Quotation marks (banned) | AP-11 | ✅ 0 found — comma-only for reported speech |
| Em-dashes (banned) | AP-11 | ✅ 0 found |
| Semicolons (banned) | AP-12 | ✅ 0 found |
| HTML `<i>` for transliteration | AP-09 | ✅ Used in cue 313 (`<i>hantoura</i>`) |
| Once-then-English | AP-09 | ✅ `hantoura` glossed on first mention (cue 313), plain English on second (cue 315) |
| Line-count parity | AP-15 | ✅ Multi-line cues preserved where source had multi-line |

---

## Pass 3: Forensic Audit (SPM Never Rules)

| Banned Term | Should Be | AP Code | Result |
|-------------|-----------|---------|--------|
| "dormitory" | group cell | AP-07 | ✅ 0 hits |
| "journalist" | interviewer | AP-07 | ✅ 0 hits |
| "tribe" | clan | AP-07 | ✅ 0 hits |
| "Syrian regime" | Assad regime | AP-07 | ✅ 0 hits |
| "Islamic State" / "ISIL" | ISIS | AP-07 | ✅ 0 hits |
| "headquarters" | base | AP-07 | ✅ 0 hits |
| "leaked documents" | documents | AP-07 | ✅ 0 hits |

### Glossary Term Verification

| Arabic Term | Expected English | Cue(s) | Status |
|-------------|-----------------|--------|--------|
| الحسبة | Hisba (religious police) → then Hisba | 11, 34, 80, 227, 248 | ✅ Glossed on first mention (cue 11), plain thereafter |
| الحنتورة | `<i>hantoura</i>` [bed-like contraption] | 313, 315 | ✅ HTML italic + gloss on first mention |
| صحفي | Interviewer | 148 cues | ✅ Consistent throughout |
| الشاهد | Witness | 67 cues | ✅ Consistent throughout |
| داعش / التنظيم | ISIS | 42, 172, 376, etc. | ✅ |
| عناصر التنظيم | ISIS members | 63, 387, 438, etc. | ✅ |
| معتقلين | prisoners | 17, 67, 149, etc. | ✅ |
| عشيرة | clan | 450 | ✅ |
| القندهاري | Qandahari | 227 | ✅ Transliterated |
| كنيسة البيعة | Biya church | 115, 134, 143 | ✅ |

### Name Consistency

| Name | Spelling | Status |
|------|----------|--------|
| Muhannad Mahmoud Saeed | Canonical | ✅ Consistent (cue 1) |
| No "Mohammed" / "Mohamed" variants | — | ✅ 0 found |

### Tense Compliance

| Tier | Rule | Status |
|------|------|--------|
| T1: Events | Past tense | ✅ "They arrested", "He pushed", "They grabbed" |
| T2: Reporting | Present tense | ✅ "Interviewer:" labels (present-embedded) |
| T3: Closed institutions | Past tense | ✅ ISIS operations described in past |

---

## Findings Summary

| Severity | Count | Details |
|----------|:-----:|---------|
| 🔴 Critical | **0** | — |
| 🟡 Medium | **0** | — |
| 🟢 Info | **1** | Cue 345: trailing newline (cosmetic, no impact) |

---

## Verdict

> **✅ APPROVED** — Translation passes all 3 Themis audit passes with zero critical or medium findings. The 510-cue full interview is SSoT-compliant, structurally sound, and ready for publication.

---

## Notes

1. **Hisba** correctly glossed as "Hisba (religious police)" on first mention (cue 11), then plain "Hisba" in all subsequent mentions (cues 34, 80, 227, 248).
2. **Hantoura** correctly rendered with HTML italic `<i>hantoura</i>` and square-bracket gloss `[bed-like contraption]` on first mention (cue 313), then plain "hantoura" in cue 315 — per once-then-English rule.
3. **No quotation marks** used for reported speech — comma-only throughout, per SRT rules §4.
4. **Perpetrator agency** maintained — ISIS members are consistently the grammatical subjects of violent actions (active voice).
5. **Clan** (not "tribe") used in cue 450 when witness discusses عشيرة.

---

**[AUTH: THEMIS | Infra-Structure | themis-editor:v1.0 | 2026-03-19]**
