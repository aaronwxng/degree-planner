# Alternative plans

## Scope

Each named scenario contains a full v1 plan: courses, specialization setting, prior attempts, PD records and audit evidence. The original becomes Main plan without changing its records. Duplication makes a deep independent copy and activates it. Switching clears undo and course/requirement filters to avoid applying an action or hiding courses from the previous scenario. The work-term display preference remains a view preference.

The planner, prerequisite checks, audit, transcript importer, single-plan import/export and printing all use the selected scenario. Transcript imports affect that scenario only. Completed history and audit evidence are independent after duplication; there is no shared transcript synchronization or merge between scenarios.

Names must be unique ignoring case, nonblank and at most 80 characters. Up to 12 scenarios can be stored. Deleting requires confirmation, preserves other scenarios and leaves at least one plan. Deleting the active plan selects the first remaining one.

## Comparison

Comparisons show eligible earned/projected units and course requirement slot coverage, calculated with each scenario's specialization setting. Different specialization settings can produce different denominators. Course differences use reviewed course identities and include additions, removals, code alternatives, term/status/unit changes and other record differences. Audit/PD/history differences are flagged separately; this is not a complete side-by-side graduation audit.

Workload tables count all scheduled courses and units, including excluded credit and courses scheduled during work terms. These totals do not establish degree credit or permission to study during co-op. Future course availability, unreviewed prerequisites and other existing coverage limitations still apply.

## Storage and migration

`waterloo-degree-scenarios-v1` holds one authoritative JSON object with kind `waterloo-degree-scenarios`, version 1, activeId, and plans (`id`, `name`, `state`). All nested plans are validated before a library is accepted or written. A library is saved in one localStorage write so a failed write leaves the previous saved library intact. If a course save fails, current changes remain in memory and can be exported; success is not reported.

If no library exists, the app reads `waterloo-degree-plan-v1` and wraps it as Main plan. Startup does not rewrite existing storage. The first saved action persists the library. The legacy key is subsequently maintained as a best-effort mirror of the active plan for v1 tooling; it is not authoritative once a library exists.

Malformed stored libraries are never silently replaced by a starter plan or stale legacy mirror. The app preserves stored data, offers a raw recovery download, and blocks overwriting it until an explicitly confirmed valid all-plans import. If another tab changes the library, this tab blocks further writes until reload or an explicit all-plans restore. Export in-memory work before reloading.

This is browser-local storage, not a cloud account. Browser storage quotas still apply. Export backups before clearing storage, changing browsers or deleting scenarios.

## Backups

Export plan writes only the active v1 plan; existing exports remain compatible. Export all plans writes the full validated library shape. Import plan detects that shape, validates every plan and requests confirmation before replacing the entire library. A v1 file replaces only the selected scenario and preserves its name and other saved alternatives. Import files are limited to 5 MB. Backups contain course grades/evidence and should be treated as personal academic records.

## Validation

`test/scenarios.test.js` covers legacy migration, deep-copy isolation, switching/renaming/deletion, name/ID validation, backup round trips, malformed storage, quota failures, stale mirror behavior, comparisons and scenario limits. Browser smoke checks cover active-plan editing, isolation, reload, comparisons, single/all-plan import/export, cancellation, invalid backups, deletion, mobile layout and printing. Tests use synthetic records in an isolated Chrome profile; they do not modify the user's saved browser plan.
