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

## Phase 1A collection amendment

Server Get Many returns one honest combined envelope per source input. It merges primary `data` in API
order, applies the user Limit to primary resources, preserves relationships, and deduplicates `included`
by exact string `type` + `id` while retaining first-seen order. Original page `links`, `meta`, and
`jsonapi` objects are stored under `meta.n8n.sourcePageContext`; they are not promoted as links or meta
for the combined local result. `meta.n8n` also records page count, returned primary-resource count,
applied limit, and whether the result was truncated.

## Phase 1D Game collection amendment

Game Get Many preserves a one-page envelope, trimming only `data` when a local Limit applies. When more
than one page is fetched it uses the same combined-envelope rules as Server Get Many: API order,
included-resource deduplication by exact string `type` and `id`, and source page context under
`meta.n8n.sourcePageContext` without root pagination links.
