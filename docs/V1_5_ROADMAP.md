# V1.5 / Phase 2 roadmap proposal

This document is a planning note. None of the items below should be read as implemented functionality. Current behavior is described in [V1_ARCHITECTURE.md](V1_ARCHITECTURE.md).

## Current V1 limitations

- Scanned/image-only resumes are rejected; OCR is not implemented.
- Provider selection includes the local rule-based parser and explicitly selected Gemini or Cerebras extraction.
- There is no provider router, automatic fallback, or field-level merge.
- The current confidence value is a heuristic score, not a calibrated model.
- Skill aliases are held in process memory; unknown-skill counts use a local JSON file.
- Analysis results are not stored in a database.
- Production observability, retries, and background processing are not implemented.

## Potential improvements

The following are candidates for a future phase and require product and technical decisions before implementation:

- Evaluate and improve extraction confidence.
- Define provider routing and fallback policies, including error handling and operational limits.
- Evaluate whether field-level merging between local and AI extraction would improve accuracy.
- Add OCR for scanned or image-heavy documents.
- Define durable, privacy-aware persistence for knowledge and analysis data.
- Improve job matching beyond the current token/substring overlap.
- Add structured logs, request tracing, metrics, and controlled retries.
- Consider background processing if expected workloads require it.

## Decisions required before implementation

- Which providers and supported SDK versions are in scope.
- What resume data may be sent to external providers and what user consent is required.
- How keys are managed, and what rate, cost, and retention controls apply.
- Which extraction-quality thresholds should trigger routing or partial results.
- What data needs persistence, retention, and deletion policies.
- How changes will be measured against representative resumes and job descriptions.

No provider key pool, paid fallback, learning queue, OCR engine, or semantic matcher is currently implemented.
