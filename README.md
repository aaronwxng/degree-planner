# Waterloo Degree Planner

A browser-local planner starting with BCS co-op, Fall 2025 entry, sequence 1, and an optional Artificial Intelligence specialization. All suggested courses begin as **planned**, never completed.

## Run

Requires Node 22.13+ (or Node 24+) for the local server, dependency setup, and tests. The local server disables caching so edits appear on reload. PDF.js is served locally from the pinned npm dependency; no API key is needed.

```sh
npm ci
npm run dev
# Open http://127.0.0.1:5173
npm test
npm run check
# Optional UI smoke test (Node 22+ and installed Chrome; CHROME_BIN can override path)
npm run test:browser
```

Add, edit, move, remove, and mark courses completed or in progress. Changes persist in localStorage. Export/import JSON for backups. Custom course codes are accepted but not validated against a full catalog.

## Import an unofficial transcript · Draft 03

Click **Import transcript** and choose the PDF from Quest (Academics → Unofficial Transcript → Undergraduate Unofficial → View Report). A text-paste fallback is available. Review the extracted records and term mappings, then import the selected courses. Nothing changes until you apply the review.

PDF.js extracts selectable PDF text entirely in the browser, using the local worker in `node_modules`. The PDF, filename, student identity fields, and raw text are not persisted or uploaded. Only selected course records (code, term, units, numeric grade/grade code, status, and import provenance) are saved. Closing the dialog clears raw input. Existing future plans and content exclusions are preserved when matching courses are updated.

The parser supports labelled **Attempted / Earned / Grade** columns in that order, with optional numeric grade points. Completion requires positive earned units plus a passing numeric grade or CR; explicit IP with zero earned units may become in progress. Blank grades, conflicting credit, failures, withdrawals, incompletes, and unsupported grades do not become completed courses. Repeats, known cross-listings, completed-record updates, and extra notations require explicit review. Transfer credits and PD/administrative rows are left for manual handling. Dates outside this sequence require a manual planner-term mapping.

**Validation:** the grade-report layout has been checked locally against a user-provided PDF; no personal data or source PDF is committed. Full transcripts with unit columns are tested against synthetic fixtures; additional real transcript layouts still need validation. Grade reports without unit columns require explicit earned-credit and units confirmation per course. Suggested units (normally 0.50; CS 136L 0.25) are not extracted evidence. Unknown layouts are rejected rather than guessed. Scanned and password-protected PDFs are unsupported; there is no OCR. Files are limited to 10 MB and 50 pages.

## Graduation audit · Draft 04

The degree progress section now gives each check a **Satisfied**, **Missing**, or **Needs review** status with a direct 2025–26 calendar source. It covers 20.0 degree units, 11.25 math units, 5.0 non-math units, required-course allocation, breadth/depth/communication, CAV/MAV, attempt limits, eight full-time terms, five credited work terms (at least three standard), and five PD courses with required codes and timing.

Use the audit's evidence panels to record prior attempts and CLC flags, confirm official full-time status, record credited work terms, and add PD courses. Academic and co-op requirements are kept separate: PD/COOP do not add degree units. Grade averages use recorded final attempts, including failures and repeat grades, weighted by units; they never use future predicted grades. A grade report or partial import alone does not prove complete history.

The course editor supports math/non-math/excluded classification, explicit CR/AEG grade codes, and approved transfer credit. Automatic non-math classification follows subject-code definitions and reviewed alias examples; users must review cross-listings and eligibility. Transfer credits count only after approval and do not enter Waterloo averages. Edits/imports clear affected review confirmations. Earlier v1 plan exports still load; all audit evidence is optional and defaults to unresolved.

See [the audit source and interpretation review](docs/2025-26-graduation-audit.md). This is a record-based planner for BCS co-op sequence 1, not an official graduation decision or an academic-standing simulator. Advisor exceptions, unreviewed equivalencies, and records outside the profile's timeline need review.

## Requirement coverage

Sources and links live in `src/data.js` and the app. Rules are transcribed from the official School of Computer Science **2025–26 checklists**, reviewed October 19, 2026. Breadth, depth thresholds, and communication rules are now verified against the archived 2025–26 calendar; see [the source review](docs/2025-26-elective-rules.md). Draft 04 reconciles BCS degree thresholds, required enriched-course alternatives, and the audit policies listed in its source review. AI course choices still use the School checklist. The calendar takes precedence; this is an evidence-based planning audit, not an official graduation decision or automatic scheduler.

- BCS required course alternatives and distinct upper-year elective allocation.
- AI required courses, four List A choices, Math/Engineering mix, paired alternatives, and CS 480/485 exclusion rule.
- Explicit humanities, social science, pure science, and pure/applied science progress. A science course is eligible for either science category but is allocated only once.
- Same-subject depth with 300-level credit or reviewed Japanese prerequisite chains; other chains are flagged for review.
- Two distinct communication courses, List I’s 60% threshold, missing-grade and before-2A warnings, and List I’s humanities exclusion.
- Optional course grades and math/CS-content exclusions; old v1 exports remain supported.
- Earned versus projected unique-course unit totals. In-progress courses count only toward projections.
- Official sequence 1 study/work timeline through Winter 2030. Starter course placement is a suggestion based on the linked CS sequencing guide; prerequisites and offerings are not checked.

Remaining limits: unreviewed course-content exceptions and cross-listings, unreviewed prerequisite chains, transfer-credit approvals, historical records outside the profile timeline, advisor exceptions, minor eligibility, and future course availability. Full-time, work-term and PD completion depend on the evidence entered in the audit. The general Mathematics minor is shown as unresolved rather than assumed compatible with BCS. Other programs and calendar years are not yet implemented.

## Structure

`src/data.js`: version-specific source data and profile. `src/engine.js`: pure requirement evaluation and import validation. `src/elective-data.js`: pinned subject/communication/chain data. `src/electives.js`: elective unit allocation and rules. `src/elective-view.js`: progress display. `src/app.js`: UI/persistence. `test/engine.test.js`: allocation, double-counting, AI rules, import, and sequence regression checks.

Next milestones: add a complete course catalog and prerequisites; verify minor compatibility; expand prerequisite-chain and course-content coverage; expand coverage with separate reviewed program/year datasets. Never silently substitute newer calendar requirements.

### Prerequisite planning checks

Open **Check course prerequisites** above the course filters for direct timing, grade, corequisite and antirequisite checks on 21 reviewed CS/Math/STAT courses. Courses outside coverage are marked **Not checked**; future prerequisites are conditional on passing. Each reviewed course links to its archived requirements. See [coverage, interpretation and limits](docs/prerequisite-checks.md).

### Planning shortcuts and printing

Planned courses have a **Move** selector for changing terms directly, with **Undo move** available until your next saved edit. Use the course requirement filter to focus on unfinished or unplanned course slots. **Print plan / PDF** opens the browser print dialog with the full timeline, including work terms; choose Save as PDF for a shareable copy. Printing restores your search/status/work-term filters afterward and does not change your saved courses. JSON export remains the editable backup format.

### Alternative plans

Your existing browser plan loads as **Main plan**. Use **Duplicate plan** to create an independent scenario, then rename it, move courses, or change the AI specialization choice. The selected plan is the one edited by the planner, transcript importer, graduation audit and single-plan import/export. Completed records, prior attempts, PD records and audit evidence are copied when duplicating; later changes are not synchronized between scenarios.

Open **Compare alternative plans** to compare eligible degree units, requirement coverage, added/removed/moved courses, changed records and scheduled workload for every term. Each plan uses its own specialization requirements. This comparison does not establish graduation or registration eligibility.

Up to 12 named plans can be saved locally. **Export all plans** backs up every scenario and the active selection. The existing Import plan control accepts either a v1 single-plan file (replaces only the selected plan) or an all-plans backup (replaces the library after confirmation). Single-plan exports remain v1-compatible. Printing includes the selected plan's name.

All plans live in this browser; clearing browser data removes them. If another tab changes saved scenarios, export any in-memory work before reloading to avoid overwriting the other tab. Invalid stored libraries are left untouched and can be downloaded for recovery. See [scenario storage and backup behavior](docs/alternative-plans.md).

### Finding courses and reviewing issues

The saved-plan controls show whether the current work is saved locally; storage failures and changes from another tab leave a visible warning. Use **Export all plans** to preserve in-memory work before reloading if saving is unavailable. Course requirement rows offer **Find in plan**, which reveals and focuses the matched course card. In **Check course prerequisites**, filter for plan issues, review items, uncovered courses, planned prerequisites or recorded prerequisites. These filters change only the view; summary counts still describe the full plan.
