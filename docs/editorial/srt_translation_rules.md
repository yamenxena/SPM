---
activation: on_srt_translation
scope: SRT subtitle translation only
version: 1.0
date: 2026-03-18
supplements: Unified_Editorial_Guide.md, docs/glossaries/*_glossary_*.md
---

# SRT Translation Rules — Syria Prisons Museum

> **This file supplements (does not replace) the Unified Editorial Guide and the SSoT glossaries.** Both Hermes and Themis must load all three when working on SRT files. **If any rule here conflicts with the general editorial guide, this file takes priority for SRT work.**

---

## 1. Workflow

1. **Copy** the Arabic `.srt` from `docs/input/` to `docs/output/{same_hierarchy}/{name}_En.srt`
2. **Load** this file + `Unified_Editorial_Guide.md` + all `docs/glossaries/*_glossary_*.md` (see guardrails.md §9b)
3. **Translate** the copied file in one pass — replace **only** the Arabic text lines with English. Do NOT rewrite or regenerate the cue numbers or timecodes. They must remain byte-for-byte identical to the Arabic source.
4. **Verify** exact cue count and timestamp parity (Arabic cues = English cues, all timestamps identical)
5. **Validate** with `srt_processor.py` (report mode)
6. **Gate** — present to user for review → invoke Themis audit
7. **Themis Report** — after audit, save the Themis report as `Themis_Report.md` in the **same output folder** as the translated SRT files. One report per witness per batch.
8. **Update Report** — append the completed batch to `Payments/report_{month}.md` (Task Log table) and recalculate the Invoice section. This is mandatory after every finalized translation batch.

> ⚠️ **Copy-then-replace only.** Never write an SRT from scratch. Always start from the Arabic source file and replace only the text blocks. This guarantees timecodes and cue numbers are preserved exactly.

> ⚠️ **Full-document translation.** Modern AI handles entire SRT files (800+ cues) in one pass with consistent terminology. Do not split into chunks.

### 1b. Full Interview + Episodes Pipeline

When a witness has a **full interview** (one large SRT) and **episode splits** (smaller SRTs cut from the same footage), use the pipeline script:

```
scripts/srt_translate_pipeline.py
```

| Step | Who | Command / Action |
|:----:|:---:|------------------|
| 0 | Agent | SSoT Pre-Flight: load glossaries, editorial guide, SRT rules |
| 1 | 🐍 Script | `python scripts/srt_translate_pipeline.py copy <ar_dir> <out_dir>` — copies all Arabic SRTs to output with `_En` suffix |
| 2 | Agent | Translate the **full interview only** — replace Arabic text with English in the `_En.srt` file |
| 3 | 🐍 Script | `python scripts/srt_translate_pipeline.py verify <ar_dir> <out_dir>` — checks cue parity, timestamps, no empty cues, no Arabic remnants |
| 4 | ⏸️ HALT | User reviews. Themis audits the full interview → saves `Themis_Report.md` in output folder. **HALT for user approval.** |
| 5 | 🐍 Script | `python scripts/srt_translate_pipeline.py crossref <ar_dir> <out_dir>` — cross-references each episode's Arabic cues against the full interview. Matched cues get the English translation. Unmatched cues are flagged `[UNMATCHED]`. |
| 5b | Agent | Translate only the `[UNMATCHED]` cues (unique episode content not in the full interview) |
| 6 | 🐍 Script | `python scripts/srt_translate_pipeline.py verify-episodes <ar_dir> <out_dir>` — verifies all episodes |
| 7 | ⏸️ HALT | Themis audits episodes → appends episode section to `Themis_Report.md`. **HALT for user approval.** |
| 8 | Agent | Update `Payments/report_{month}.md` with new batch |

> ⚠️ **HALT points are mandatory.** The pipeline halts after Themis audit of the full interview (Step 4) and after Themis audit of episodes (Step 7). The user must approve before proceeding.

> ⚠️ **No Temp folder.** All work is done directly in `خارجي/`. The script manages a `_pipeline_manifest.json` to track progress.

### 1c. Dual-Format Output (Final Stage)

Every finalized translation must exist in **both** SRT and DOCX format in the output folder.

**Folder structure:** DOCX files go into a `DOCX/` subfolder inside the SRT folder:
```
خارجي/
  01_..._En.srt
  02_..._En.srt
  DOCX/
    01_..._En.docx
    02_..._En.docx
```

| Source Format | Generate | Method |
|:-------------:|:--------:|--------|
| SRT only | → DOCX | Extract text lines (no timestamps, no cue numbers), one paragraph per cue → `DOCX/` subfolder |
| DOCX only | → SRT | Match DOCX text to Arabic SRT timestamps via content cross-reference |

**Script:** `scripts/srt_docx_converter.py`

```
python scripts/srt_docx_converter.py srt-to-docx <srt_file_or_dir>
python scripts/srt_docx_converter.py docx-to-srt <docx_file_or_dir> <ar_srt_dir>
python scripts/srt_docx_converter.py scan <output_dir>
```

> ⚠️ **This is the final stage** after Themis approval and report update. Run it on the entire output folder to ensure 100% format coverage.

---

## 2. Output Format

- Standard SRT format. No leading/trailing spaces on any line.
- No extra blank lines between cue blocks.
- Exact same number of cue blocks as the Arabic source.
- Keep original numbering — do not renumber.
- Keep original timecodes — do not modify, merge, or split.
- Output filename: `{original_name}_En.srt`

### Line Breaking

- **Two-line formatting**: Long subtitle text should be split across two lines for readability.
- **Short sentences** do not need a line break — keep them on one line.
- **Prefer breaking at natural punctuation** — full stop (`.`), comma (`,`), or clause boundary — rather than mid-phrase.
  - ✅ `They brought me canned meat,`  
    `cheese cubes, bread, jam, and halva`
  - ✅ `I was sitting and the guard opened the door`  
    `on me. No, I think it was the interrogator`
  - ❌ `They brought me canned meat, cheese cubes, bread,`  
    `jam, and halva` *(breaks mid-list — acceptable but less ideal)*

---

## 3. Capitalization & Punctuation

- **Capitalize** the first letter of the first word in every subtitle block.
- **Capitalize** the first letter of every sentence, the pronoun "I", and all names.
- **Do not** end the final word of any subtitle block with a period. Use punctuation only for clarity.
- **Questions** must end with `?`, especially from the Interviewer.
- **Numbers** above nine: write as numerals, not words.
- **No em-dashes.** **No semicolons.** (CON-3: SRT-only ban)
- **Q&A labels**: `Interviewer:` and `Witness:` (capital I/W). The sentence after the label starts with a capital letter.

---

## 4. Reported Speech (SRT-Specific)

- **No quotation marks** around reported speech in SRT. Use comma only.
  - ✅ `He said, I don't know anything`
  - ❌ `He said, "I don't know anything"`
- This differs from article translation, where quotation marks are used.

---

## 5. Transliteration in SRT

- Use **HTML `<i>` tags** for transliterated Arabic terms: `<i>term</i>`
  - This renders as italic in Subtitle Edit. Do not use markdown `*italics*` in SRT files.
- Add a brief **square-bracket gloss** `[English meaning]` on first mention where needed.
  - ⚠️ **Always use `[]` in SRT**, never `()`. Example: `<i>balingo</i> [hoist for suspension]`, not `<i>balingo</i> (hoist for suspension)`.
  - This applies to prison names too: `Bourj [Tower] Prison` on first mention (overrides glossary `()` convention for SRT context).
- **Once-then-English rule**: Use the English translation on first occurrence with the Arabic transliteration in square brackets, then use the English equivalent only for all subsequent occurrences.
- ⚠️ **No apostrophe (`'`) in transliterations.** Use double vowels instead.
  - ✅ `<i>taazir</i>` — not `<i>ta'zir</i>`
  - ✅ `<i>muaazin</i>` — not `<i>mu'azzin</i>`
  - This keeps subtitle rendering clean and avoids encoding issues in SRT players.

### Standard Transliterations

| Arabic | First Mention | Subsequent |
|--------|--------------|------------|
| الدولاب | `Tire [<i>doulab</i>]` | Tire |
| الشبح | `suspension [<i>shabeh</i>]` | suspension |
| بساط الريح | `flying carpet [<i>bisat al-rih</i>]` | flying carpet |
| سخرة | `<i>sukhra</i> [forced labor]` | forced labor |
| الحنتور / الحنتورة | `<i>hantour</i>/<i>hantoura</i> [bed-like contraption]` | hantour |
| البالينغو | `<i>balingo</i> [hoist for suspension]` | balingo |
| الدعاء | `<i>duaa</i> [supplication]` | supplication |
| التعزير | `<i>taazir</i> [discretionary punishment]` | discretionary punishment |
| السحور | `<i>suhoor</i> [pre-dawn Ramadan meal]` | pre-dawn meal |
| النبأ | `<i>al-Naba</i>` (ISIS newspaper) | *al-Naba* |
| اللودالين | `<i>ludaelin</i> [dish soap]` | dish soap |

> Only transliterate Arabic-origin terms. Never italicize native English words or military ranks. Never italicize "tuberculosis."

---

## 6. Quotation Marks

- **No quotation marks around names.** Arabic puts quotation marks around names, but English does not.
  - ✅ `Um al-Mauuna Church`
  - ❌ `"Um al-Mauuna Church"`
- Do not put quotation marks around Latin-origin product or brand words (e.g. Kiri, Starex).

---

## 7. Terminology Cross-Reference

All terminology comes from the Unified Editorial Guide and glossaries. Key reminders for SRT:

- **Assad regime** (never "former Syrian regime" or "Syrian government")
- **ISIS** for داعش and التنظيم
- **prisoner** preferred over "detainee" (unless clearly pre-trial)
- "detained for one month" (not "arrested for one month")
- **group cell** for مهجع (never "dormitory")
- **interrogation** (not "investigation") for the process
- **interviewer** (not "journalist")
- **clan** (not "tribe")
- **Breathing Yard** (note: exercise was usually forbidden)
- **the reception hall**, **the visiting room** (not "visitation room")
- **base** (not "headquarters" — only the top-level facility is HQ)
- If Hisba appears: "Hisba (religious police)" on first mention, then "Hisba"
- Past tense for Assad regime institutions (they no longer exist)

---

## 8. Style

- Clear, everyday **American English** (YouTube-style clarity, not slang).
- Preserve sentence order and align precisely with timestamps.
- Prefer "remain unknown" over "remain shrouded in mystery."
- Maintain consistency with previous chunks: terms, repeated phrases, tone.

---

## 9. Selective Translation (Optional)

When provided with a selective instruction, translate only the specified cues:

```
translate all x= [1, 5, 12-15, 20]
```

This translates only the cue numbers listed. All other cues remain unchanged.

---

**[AUTH: SRT-RULES | Infra-Structure | v1.0 | 2026-03-18]**
