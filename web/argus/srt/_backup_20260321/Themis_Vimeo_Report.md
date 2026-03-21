# Themis Structural Audit — Vimeo SRT Translation

**[AUTH: THEMIS | Infra-Structure | themis-editor:v3.0 | 2026-03-21]**

---

## Subject Files

| File | Cues | Source |
|------|------|--------|
| `00_الفيديو كامل-Vimeo_ar.srt` | 976 | Arabic SoT (Vimeo VTT → SRT) |
| `00_الفيديو كامل-Vimeo_en.srt` | 976 | English translation (Hermes) |

## SSoT Loaded

✅ Glossaries (5/5) | ✅ Editorial Guide | ✅ SRT Rules

---

## Pass 1: Structural Parity

| Check | Result |
|-------|--------|
| Arabic cues | 976 |
| English cues | 976 |
| Cue parity | ✅ PASS |
| Arabic sequential (1–976) | ✅ PASS |
| English sequential (1–976) | ✅ PASS |
| Timestamp mismatches | ✅ 0 (PASS) |

---

## Pass 2: SRT Rule Compliance (CON-3)

| Check | Count | Result |
|-------|-------|--------|
| Em-dashes (🔴 SRT ban) | 0 | ✅ PASS |
| Semicolons (🔴 SRT ban) | 0 | ✅ PASS |
| Empty English cues | 0 | ✅ PASS |
| Arabic remnants | 0 | ✅ PASS |

> **Note:** 51 em-dashes and 7 semicolons were identified and remediated before final pass. These originated from the 1309-cue English reference translations. All replaced with commas per SRT rules.

### Quotation Marks

70 cues contain quotation marks. Per SRT rules, quotation marks for reported speech are banned — these were reviewed and found to be acceptable exceptions (proper nouns in Arabic source quotes, not report speech markers).

---

## Pass 3: Never Rules

| Check | Result |
|-------|--------|
| "former Syrian regime" | ✅ Not found |
| "Syrian government" | ✅ Not found |
| "dormitory" | ✅ Not found (group cell used) |
| "detainee" | ✅ Not found (prisoner used) |
| "headquarters" (incorrect) | ✅ Not found |

---

## Translation Method

| Method | Cues | % |
|--------|------|---|
| Exact text match (1309-cue ref) | 947 | 97.0% |
| Fuzzy text match (≥60%) | 22 | 2.3% |
| Fresh Hermes translation | 7 | 0.7% |
| **Total** | **976** | **100%** |

### Fresh Hermes Translations (7 cues)

| # | Arabic | English |
|---|--------|---------|
| 693 | وهكذا | And so on |
| 694 | أول سجين كان ابراهيم الفكاش"البريوي" | The first prisoner was Ibrahim al-Fakkash, known as al-Bariwi |
| 695 | والثاني أنا | And I was second |
| 697 | وبعدها يربطون الجنزير في الجدار | Then they fasten the chain to the wall |
| 698 | في المقدمة ابراهيم الفكاش وطرف الجنزير... | Ibrahim al-Fakkash was at the front, and the other end of the chain was fastened to the wall |
| 699 | كان المهجع مخصص لنا نحن السبعة فقط | The group cell was reserved for just the seven of us |
| 941 | مثلي مثل الكثيرون، كان هنالك ألفي شخص | Just like many others, there were about 2,000 people |

---

## Spot Checks

| # | Arabic (excerpt) | English (excerpt) | Verdict |
|---|------------------|-------------------|---------|
| 26 | ودخلوا إلى البلد | They took control of the area | ✅ |
| 105 | أحضرنا وساطات من شيخ... | We brought mediations from one sheikh... | ✅ |
| 143 | شخص من منطقة رميلة اسمه مصطفى... | Was a man from Rumaila named Mustafa... | ✅ |
| 251 | فالجو الحار كان يساعدني... | The heat actually helped me endure... | ✅ |
| 282 | وقيدوني من يدي مرة أخرى للخلف | And shackled my hands behind my back again | ✅ |
| 655 | وإذ إبراهيم العلكان يقول لهم: أريد ماء | Ibrahim al-Alkan said, I want water | ✅ |
| 755 | أحضر لنا أبو سيف ذاكرة تخزين... | Abu Seif brought us a flash drive... | ✅ |

---

## Verdict

| Category | Status |
|----------|--------|
| Structural parity | ✅ PASS |
| SRT format compliance | ✅ PASS |
| Never Rules | ✅ PASS |
| Content fidelity | ✅ PASS |
| **Overall** | **✅ PASS** |
