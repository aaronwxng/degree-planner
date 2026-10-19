# Waterloo Degree Planner

A browser-local planner starting with BCS co-op, Fall 2025 entry, sequence 1, and an optional Artificial Intelligence specialization. All suggested courses begin as **planned**, never completed.

## Run

Requires Python 3 for the local server and Node 18+ for tests. No dependencies or API keys are needed.

```sh
npm run dev
# Open http://127.0.0.1:5173
npm test
npm run check
# Optional UI smoke test (Node 22+ and installed Chrome; CHROME_BIN can override path)
npm run test:browser
```

Add, edit, move, remove, and mark courses completed or in progress. Changes persist in localStorage. Export/import JSON for backups. Custom course codes are accepted but not validated against a full catalog.

## Requirement coverage · Draft 02

Sources and links live in `src/data.js` and the app. Rules are transcribed from the official School of Computer Science **2025–26 checklists**, reviewed October 19, 2026. Breadth, depth thresholds, and communication rules are now verified against the archived 2025–26 calendar; see [the source review](docs/2025-26-elective-rules.md). The other course checks have not yet been fully reconciled with the calendar, which takes precedence. This is a partial course checker, not a full graduation audit or automatic course scheduler.

- BCS required course alternatives and distinct upper-year elective allocation.
- AI required courses, four List A choices, Math/Engineering mix, paired alternatives, and CS 480/485 exclusion rule.
- Explicit humanities, social science, pure science, and pure/applied science progress. A science course is eligible for either science category but is allocated only once.
- Same-subject depth with 300-level credit or reviewed Japanese prerequisite chains; other chains are flagged for review.
- Two distinct communication courses, List I’s 60% threshold, missing-grade and before-2A warnings, and List I’s humanities exclusion.
- Optional course grades and math/CS-content exclusions; old v1 exports remain supported.
- Earned versus projected unique-course unit totals. In-progress courses count only toward projections.
- Official sequence 1 study/work timeline through Winter 2030. Starter course placement is a suggestion based on the linked CS sequencing guide; prerequisites and offerings are not checked.

Remaining limits: course-specific content exceptions, unknown subjects and unreviewed prerequisite chains, complete non-math classification, averages, failed/repeated attempts, transfer credit, all cross-listed equivalencies, full-time residency, PD/work-term completion, minor eligibility, and future course availability. The general Mathematics minor is shown as unresolved rather than assumed compatible with BCS. Other programs and calendar years are not yet implemented.

## Structure

`src/data.js`: version-specific source data and profile. `src/engine.js`: pure requirement evaluation and import validation. `src/elective-data.js`: pinned subject/communication/chain data. `src/electives.js`: elective unit allocation and rules. `src/elective-view.js`: progress display. `src/app.js`: UI/persistence. `test/engine.test.js`: allocation, double-counting, AI rules, import, and sequence regression checks.

Next milestones: reconcile the archived calendar; add a complete course catalog and prerequisites; verify minor compatibility; expand prerequisite-chain and course-content coverage; expand coverage with separate reviewed program/year datasets. Never silently substitute newer calendar requirements.
