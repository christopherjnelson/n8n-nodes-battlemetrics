# ADR 0003: Preserve the raw JSON:API envelope

- Status: Accepted
- Date: 2026-08-02

## Decision

Return one n8n item per source input containing the complete response envelope. Preserve `data`,
`included`, `links`, `meta`, resource `type`/string `id`, attributes, and relationships. Attach
`pairedItem` to the source input.

Validate the top-level JSON:API shape but allow sparse resources and unknown attributes so the node does
not discard forward-compatible API data. Never coerce an ID to a number.

## Deferred alternative

A split-resource output mode is deferred. It requires explicit rules for copying top-level links/meta,
included-resource linkage, truncation, collection ordering, empty collections, and source item pairing.
Silently flattening today would lose information and make later behavior harder to correct.
