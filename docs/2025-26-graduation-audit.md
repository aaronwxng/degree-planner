# Draft 04: 2025–26 BCS co-op graduation audit

Reviewed October 20, 2026. Rules are pinned to the archived 2025–26 calendar, catalog ID `663290e835aff7001cc62323`. The public records behind that archive were inspected; the newer calendar is not substituted.

## Source map

| Calendar record | Implemented requirements |
| --- | --- |
| [BCS degree requirements](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/r1y1WO5ka) | Minimum 20.0 units; maximum 2.0 failed/excluded units and 5.0 unusable units; communication requirement; eight full-time co-op terms; at least five credited work terms including three standard; five PD courses including PD 1, PD 11, PD 10 plus two others; PD sequencing. |
| [BCS major](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/SJPJkCAih) | Required course alternatives (including enriched 200-level CS courses), 11.25 math units, 5.0 non-math units, breadth/depth, CAV ≥60%, CS MAV ≥60% and its course set. |
| [Math academic plan definitions](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/SJP3vv7pp) | Math subject codes and cross-listings; COMM/MTHEL and non-math courses; COOP/PD exclusion from academic credit; unusable attempts as failures or CLC designations. |
| [Math averages and academic standings](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/Sk2s2wXT6) | Eligibility for CAV; numerical floor 32; DNW/FTC/NMR/WF average value 32; minimum two courses before calculating CS MAV. |
| [Grading systems](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/rkrb6r5V6) | CR/AEG credit with no numeric average; NCR failure without average value; WD no credit and no average; unresolved INC/IP/MM/UR evidence. |
| [Unit weights](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/S1lvLKtN6) | Course units weight average calculations; COOP/PD do not add degree units. |
| [Math courses and classes](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/BktTku7p6) | Maximum three attempts per course; known cross-listings share an identity; antirequisite treatment can require faculty discretion. |

The public JSON records are available at `https://uwaterloocm.kuali.co/api/v1/catalog/program/<catalog-id>/<program-pid>` and `.../policy/<catalog-id>/<policy-pid>`; the search endpoint for this catalog also returns the rendered policy bodies. Source text is not stored in the app.

## Calculation and evidence decisions

- All degree unit totals and required-course matching use eligible academic courses only. Transfer credits require explicit approval; math/non-math/excluded overrides must follow the calendar. Non-math subject inference is conditional until classification/cross-listing eligibility has been reviewed. PHYS 467 is a reviewed math cross-listing example; the app does not contain every cross-listing.
- Required-course slots need at least 0.50 units, except CS 136L at 0.25. A course cannot fill two slots. Extra elective credit is accounted for by the 20.0-unit total after required and non-math minimums; it is not a separate double-counted pool.
- CAV and MAV use unit-weighted recorded final attempts, not just the last/best passing grade. Numeric grades below 32 and DNW/FTC/NMR/WF use 32. CR, AEG, NCR, WD and transfer grades do not enter numeric averages. Missing final grades keep checks unresolved. The MAV list comes from the BCS major record; two graded eligible attempts are required for an automatic numeric result. Cases with only non-numeric completion evidence remain for review.
- Prior attempts are stored separately from degree-credit courses. Failures contribute to both the 2.0-unit and 5.0-unit limits. CLC contributes to unusable attempts even with a passing numeric grade. WD contributes to attempt counts, not failure/unusable units. Repeated passes without enough CLC evidence stay unresolved. Historical exclusions and advisor exceptions require review.
- Recording another passing attempt through import preserves the previously completed attempt when its term changes. Unknown legacy grades are retained as unresolved evidence. Re-importing the same term updates the current record without manufacturing a second attempt. New imports clear history/classification/content review confirmations.
- Official full-time terms are explicitly confirmed rather than inferred from earned credit. Planned academic loads ≥1.5 units provide projections only. Transfer credit does not manufacture Waterloo term load.
- Scheduled work terms do not count as credited. Standard and flexible credited terms are recorded separately. At least five credited and at least three standard are required.
- PD courses are separate records with unique codes and statuses. PD 1, PD 11 and PD 10 must be completed along with two additional distinct PD courses. Sequence 1 checks PD 1 in an academic term before WT1 and PD 11 in WT1. Nonstandard PD placement is referred for advisor review; guidance using “should” is not converted to an automatic failure.
- A check can be satisfied from the supplied evidence; there is deliberately no aggregate `readyToGraduate` verdict. Every displayed rule has a source and unresolved evidence remains visible. Complete-history and classification confirmations are user statements, not university verification.

## Compatibility and limits

Existing v1 plans retain courses, grades and provenance. Optional `audit`, `attemptHistory`, and `pdCourses` fields round-trip through export/import and are validated before saving. Course edits preserve unrelated provenance and clear affected review flags.

This audit is scoped to the existing BCS co-op 2025-entry sequence-1 profile. Earlier histories and nonstandard sequences, academic/co-op standing decisions, petitions, antirequisite equivalencies, extra credentials, and unreviewed prerequisite chains are not inferred. Transfer, full-time, credited work-term, and PD evidence is entered by the user. Full transcript import still does not automatically retain every failure/WD/PD record; the evidence panels must be completed and reviewed.

Tests cover threshold boundaries, unit weighting, grade-code behavior, failure/CLC distinctions, repeated grades, enriched alternatives, transfer/admin exclusions, evidence validation, source-scope MAV membership, legacy v1 compatibility, and import-history preservation. Browser checks cover adding history/PD records, term evidence, persistence, mobile layout, and the existing transcript flow.
