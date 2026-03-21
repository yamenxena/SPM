[AUTH: THEMIS | Infra-Structure | themis-editor:v1.0 | 2026-03-09]

[STATUS]: Glossaries: SPM ✅ | Editorial Guide: ✅ | Ready.

# Themis Review Report: مقدمة ملف مار يوسف_en.md

**Date:** 2026-03-09
**Type:** Article Introduction
**Source:** `docs/input/Zain Hajahjah/Urgent/مقدمة ملف مار يوسف.md`
**Target:** `docs/output/Zain Hajahjah/مقدمة ملف مار يوسف_en.md`

## Findings & Edits

### Pass 1: Literacy Enforcement
- **AP-01 (Active Voice):** Pass. No inappropriate passive constructions violating rights.
- **AP-04 (Person-First Language):** Pass.
- **AP-02 (Readability):** `[DEFERRED: no automated scorer]`

### Pass 2: Medium-Specific Formatting
- **AP-06 (Register Match):** Pass. Narrative-report style maintained. 
- **AP-11/12 (Em-dash/Semicolon):** Pass. No semicolons or inappropriate em-dashes used.
- **AP-14 (Citation):** N/A. No citations in this text.

### Pass 3: Forensic Audit & "Never" Rules
- **AP-07 (Never Rule Violation):**
  - **Issue:** The text uses "the Islamic State (ISIS)" and "the Islamic State" instead of the strictly mandated "ISIS".
  - **Correction:** Rewritten to "ISIS" everywhere according to the rule: "ISIS" (never "IS", "ISIL", "Islamic State").
  - **Diff 1:**
    ```diff
    - During the Islamic State (ISIS) control of Mosul, the policy of repression was not limited...
    + During ISIS's control of Mosul, the policy of repression was not limited...
    ```
  - **Diff 2:**
    ```diff
    - ...during the years of the Islamic State's control of the city...
    + ...during the years of ISIS's control of the city...
    ```
  - **Diff 3:**
    ```diff
    - ...during the years of the Islamic State's control over Mosul.
    + ...during the years of ISIS's control over Mosul.
    ```

- **AP-08 (Name Spelling Consistency):** Pass. "Mar Youssef", "Samer Elias Saeed" are consistent. 
- **AP-13 (Glossary Term Conformity):** Pass. "group cells", "Hisba", "*sharia*", "interrogation", "investigation rooms" used correctly according to detention glossary.

## Final Action
The draft has been updated to fix the AP-07 violations.
**Output written to:** `docs/output/Zain Hajahjah/مقدمة ملف مار يوسف_en_reviewed.md`
