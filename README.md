# Waterloo Degree Planner

A browser-local planner starting with BCS co-op, Fall 2025 entry, sequence 1, and an optional Artificial Intelligence specialization. All suggested courses begin as **planned**, never completed.

## Run

Requires Python 3 for the local server and Node 18+ for tests. No dependencies or API keys are needed.

```sh
npm run dev
# Open http://127.0.0.1:5173
npm test
npm run check
```

Add, edit, move, remove, and mark courses completed or in progress. Changes persist in localStorage. Export/import JSON for backups. Custom course codes are accepted but not validated against a full catalog.

## Requirement coverage

Sources and links live in `src/data.js` and the app. Rules are transcribed from the official School of Computer Science **2025–26 checklists**, reviewed October 19, 2026. They have not yet been fully reconciled with the archived academic calendar, which takes precedence. This is a partial course checker, not a full graduation audit or automatic course scheduler.

- BCS required course alternatives and distinct upper-year elective allocation.
- AI required courses, four List A choices, Math/Engineering mix, paired alternatives, and CS 480/485 exclusion rule.
- Earned versus projected unique-course unit totals. In-progress courses count only toward projections.
- Official sequence 1 study/work timeline through Winter 2030. Starter course placement is a suggestion based on the linked CS sequencing guide; prerequisites and offerings are not checked.

Not yet evaluated: non-math classification and minimum, breadth/depth, communication grades, averages, failed/repeated attempts, transfer credit, all cross-listed equivalencies, full-time residency, PD/work-term completion, minor eligibility, and future course availability. The general Mathematics minor is shown as unresolved rather than assumed compatible with BCS. Other programs and calendar years are not yet implemented.

## Structure

`src/data.js`: version-specific source data and profile. `src/engine.js`: pure requirement evaluation and import validation. `src/app.js`: UI/persistence. `test/engine.test.js`: allocation, double-counting, AI rules, import, and sequence regression checks.

Next milestones: reconcile the archived calendar; add a complete course catalog and prerequisites; verify minor compatibility; implement breadth/depth and grade rules; expand coverage with separate reviewed program/year datasets. Never silently substitute newer calendar requirements.
