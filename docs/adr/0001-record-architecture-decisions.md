# ADR-0001: Record architecture decisions as ADRs

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Design decisions made early (database locking, auth, payments) are expensive to reverse and easy to forget the reasons for. Future contributors, reviewers and our future selves need to know *why* the system looks the way it does.

## Decision

Every significant architectural decision is recorded as a short Markdown ADR in `docs/adr/`, numbered sequentially, using [0000-template.md](0000-template.md). An ADR is added in the same pull request as the change it describes.

"Significant" means a choice that affects structure, data, security or external dependencies, or that would take more than a day to undo.

## Alternatives considered

- **Wiki or Notion pages:** these drift away from the code and aren't reviewed in pull requests.
- **No written record:** the reasoning gets lost; decisions get relitigated.

## Consequences

- **Positive:** decisions are reviewable, searchable and versioned with the code.
- **Negative:** a small amount of writing for each decision.
