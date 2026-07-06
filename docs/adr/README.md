# Architecture Decision Records — fdp-client

Client-side architectural decisions. Numbering is independent from the server's ADR series
(`fdp-neo/server/docs/adr/`); when a client decision is driven by a server decision, the ADR
says so explicitly in its header.

ADRs are numbered sequentially and are immutable once accepted. Superseding decisions are
recorded as new ADRs that reference the ones they replace.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-catalogrecord-consumption.md) | Consume the CatalogRecord meta-metadata projection | Proposed |

## Format

Each ADR follows the same lightweight Nygard-style format as the server's:

- **Status** — proposed, accepted, deprecated, or superseded
- **Context** — the forces at play
- **Decision** — what we are doing
- **Alternatives considered** — what we did not do and why
- **Consequences** — what becomes easier and harder as a result
