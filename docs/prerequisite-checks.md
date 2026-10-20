# Direct prerequisite checks

The planner checks course/grade conditions for the 2025–26 BCS profile. This is a planning aid rather than registration approval. Source records were retrieved on October 20, 2026 from Waterloo's public Kuali catalog API, catalog `663290e835aff7001cc62323`. Each covered course links to its archived calendar entry; `src/prerequisite-sources.js` retains the prerequisite and corequisite text and antirequisite codes used for review.

Coverage: CS 135, 136, 136L, 240, 241, 245, 246, 251, 341, 350, 480, 485, 486, 492; MATH 135, 136, 137, 138, 239; STAT 230, 231. Advanced/enriched courses are accepted where listed as alternatives, but their own requirements are not inferred from the ordinary version.

## Interpretation

- Prerequisites require an earlier calendar term; corequisites permit the same term. Work terms are included in chronological ordering.
- Completed courses with recorded numeric grades can meet thresholds. Earned credit without a numeric grade proves a pass but never a higher threshold such as 60% or 85%.
- Planned and in-progress prerequisites are conditional on successful completion and any required grade; hypothetical future grades do not count as evidence.
- Alternate paths use OR; combined conditions use AND. For example, CS 241 permits the CS 138 path, the lab plus 85% CS 136/146 path, or the lab plus CS 246/246E path.
- Passing historical attempts can supply evidence; failed, unresolved, excluded and CLC attempts do not. Transfer prerequisites require explicit equivalency approval.
- Antirequisites found among passed attempts or planned courses are flagged. Even different-term future courses can conflict if both are intended for completion.
- Each course is checked directly. A prerequisite's own missing requirements are reported in its own row; there is no overall feasible-plan verdict.
- Course checks do not change the saved plan format, prevent edits, or assume unknown courses are eligible.

## Limits

Program enrolment and standing are not independently verified; rules use this app's BCS profile. In particular, the Software Engineering-only alternative for MATH 239 does not apply to this profile. High-school prerequisites/admission equivalencies for MATH 135/137 remain review items. Overrides, delivery restrictions, equivalent courses not explicitly listed, future course offerings and current registration rules need separate review. A 2025–26 course rule is not a guarantee for registration in later years.

## Maintenance

Fetch `/api/v1/catalog/search/663290e835aff7001cc62323?q=CODE`, select the exact course code, then fetch `/api/v1/catalog/course/663290e835aff7001cc62323/PID` on `https://uwaterloocm.kuali.co`. Review nested AND/OR structure, grade conditions, program restrictions, corequisites and antirequisites before changing `src/prerequisites.js`. Never substitute the current catalog silently. Run `npm test`, `npm run check` and `npm run test:browser`.
