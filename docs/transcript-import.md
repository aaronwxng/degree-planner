# Draft 03: browser-local transcript import

## Sources

- [Quest unofficial transcript instructions](https://uwaterloo.ca/the-centre/quest/quest-help/how-do-i-view-my-unofficial-transcript): undergraduate unofficial transcripts are generated as PDFs.
- [Waterloo transcript legend](https://uwaterloo.ca/the-centre/forms-and-official-documents/official-documents/official-transcripts/about-transcripts/transcript-legend): CR grants credit; IP, INC, WD, WF, NCR and failure codes do not establish earned credit.
- [Math transcript guidance](https://uwaterloo.ca/math/understanding-your-unofficial-transcript): undergraduate numeric passing threshold is 50%; CR does not provide a numeric grade for average/threshold checks.
- [Mozilla PDF.js examples](https://mozilla.github.io/pdf.js/examples/): browser document loading and text extraction API. PDF.js and its worker are served from the pinned local npm dependency, not a CDN.

## Implementation

`transcript-pdf.js` reads a local File into a byte buffer, loads PDF.js on demand, extracts text items by page, and destroys the loading task. `transcript.js` reconstructs rows from PDF coordinates, parses a supported column layout, maps dates to the current sequence, marks repeat/conflict cases, and merges only selected eligible records into a cloned plan. `transcript-view.js` presents the review without mutating saved state. The existing JSON plan import remains separate.

Only code, attempted/earned credit-derived units, grade, term, status and import provenance are retained after confirmation. Student names, numbers, PDF metadata, descriptions, raw lines, file names and source documents are not put into localStorage or exports. Import inspection does not log transcript data. The test fixture is synthetic and contains no real student records.

Previously completed courses are not selected by default. An in-progress attempt cannot overwrite a completed record. One selected attempt is allowed per reviewed course identity. Known cross-listings use the existing subject choice. Unmatched future courses remain intact. Earned CR credit has no numeric grade: for example, a List I communication course imported as CR still needs separate evidence of the 60% threshold.

Unsupported layouts, missing units or grades, ambiguous unit sequences, transfer/test credit, unknown grade codes, and administrative entries do not get automatic completion status. Other prerequisite equivalencies, repeated-attempt averages, PD milestones, and transferred-credit approvals remain outside the current planner model. No transcript authentication or official degree audit is performed.

## Verification

Pure tests cover the parser, term mapping, grade/credit consistency, unsupported rows, repeats, protected completed records, immutable merging and plan preservation. The headless Chrome smoke test selects a real synthetic PDF File through the upload input and checks extraction and review, then exercises cancellation, paste import, merging, sensitive-text disposal and mobile layout. Regenerate the fixture with `node scripts/make-transcript-fixture.mjs`.

A current redacted Quest transcript has not yet been supplied. Layout support must be validated against real examples before claiming broad Quest-format compatibility.
