# Draft 02 source review

Verified 2026-10-19 against the **archived 2025–26** Undergraduate Calendar. Current-year communication lists differ; do not substitute them.

## Official records

The archive HTML sets `window.catalogId = '663290e835aff7001cc62323'` and loads Waterloo's public Kuali catalog. The following public endpoints expose the same records rendered by the calendar (no API key):

- [BCS major](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/SJPJkCAih): [public record](https://uwaterloocm.kuali.co/api/v1/catalog/program/663290e835aff7001cc62323/SJPJkCAih), record ID `67a653386e4da1ac944e3d39`. `graduationRequirements` contains the breadth table, depth pathways, and exceptions.
- [BCS degree](https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/r1y1WO5ka): [public record](https://uwaterloocm.kuali.co/api/v1/catalog/program/663290e835aff7001cc62323/r1y1WO5ka), record ID `6786be155f8db4ecafd5afcd`. `degreeRequirements` and `courseListsNew` contain communication requirements and lists.
- [JAPAN 102R](https://uwaterloocm.kuali.co/api/v1/catalog/course/663290e835aff7001cc62323/HkQyFEQth): prerequisite is JAPAN 101R or JAPAN 111R.
- [JAPAN 201R](https://uwaterloocm.kuali.co/api/v1/catalog/course/663290e835aff7001cc62323/ByzmkYV7tn): prerequisite is JAPAN 102R or JAPAN 112R.
- [CS breadth/depth advising page](https://uwaterloo.ca/computer-science/current-undergraduate-students/majors/breadth-and-depth-requirements), dated August 6, 2025, corroborates the major's subject categories and exceptions.
- [2025–26 BCS checklist](https://cs.uwaterloo.ca/sites/default/files/uploads/documents/2025-2026-bcs.pdf) corroborates requirements and explicitly permits breadth courses to also count for depth.

## Implemented facts

- Breadth: humanities 1.0 units, social sciences 1.0, pure sciences 0.5, pure/applied sciences 0.5. Subject sets are pinned in `src/elective-data.js`.
- Pure science subjects are also eligible for the pure/applied category. One course must be assigned to only one breadth category: SCI 206 is eligible in either science category, but cannot fill both. A capped unit allocation maximizes coverage without splitting a course across categories.
- List I courses are excluded from humanities breadth, irrespective of which communication slot they fill. Eligible List II courses may overlap with humanities. Depth may reuse breadth credit; credit totals never increase because of reuse.
- Depth: 1.5 same-subject units, with at least 0.5 units at 300+; alternatively a three-course prerequisite chain totalling 1.5 units. Reviewed Japanese chains are supported; other chains are reported as needing review rather than inferred from course numbers.
- Communication: two distinct courses, either two from List I or one each from Lists I and II. First List I requires at least 60% before 2A. Missing grades remain unresolved; planned/in-progress first-course results are conditional. The second course requires earned credit, with no extra 60% threshold imposed.
- List I on-campus guidance is displayed but mode is not tracked. Transfer-credit approvals are not inferred.

## Explicit limits

Subject-based classifications cannot detect all course-specific substantial math/CS content exceptions. Users can exclude such courses from breadth/depth in the editor, without removing earned credit. Unknown subjects are surfaced, not guessed. The non-math subtotal covers classified subjects and communication courses; it is not a complete institution-wide non-math classifier. Engineering List A entries are excluded from non-math credit with AI enabled.

Reviewed cross-listings are deduplicated; unreviewed aliases, course existence, enrollment restrictions, prerequisite scheduling, and exceptions still need review. The app preserves which subject was entered for cross-listings rather than using a course as two different subjects. Saved v1 plans retain compatibility; optional grade and exclusion fields round-trip through JSON.
