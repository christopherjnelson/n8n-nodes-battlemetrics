# ADR 0005: Conservative Server collection

- Status: Accepted
- Date: 2026-08-02

## Decision

Implement Server Get Many as `GET /servers` with no API query parameters. Expose only Return All and a
local Limit. Follow the API's returned `links.next` value exactly after enforcing same-origin HTTPS,
require the `/servers` path, reject URL user information, preserve order, reject repeats, and retain the
existing 100-page and 10,000-primary-item caps.

Do not expose search, game, country/region, status, sort, include, sparse-field, page-size, offset, or
cursor controls until their current first-party contract is accessible or safely observed with an
owner-provided subscribed credential. An authentication-gated response does not verify that a query
parameter is supported.

## Rationale

The exact collection path is identified by the first-party explorer URL and responds at the official
API origin. The current explorer remained blocked to the research environment, including a fresh
cookie-free browser. A minimal collection request plus link-driven pagination provides useful behavior
without turning historical or third-party examples into a claimed contract.

## Consequences

The UI display name is Get Many and its stable internal value is `getAll`. Limit does not alter remote
page size; it trims primary resources locally and stops fetching once enough primary resources have
been received. Search remains a deferred capability even though the phase is described as Get
Many/Search.

## 2026-08-04 review

The first-party developer documentation remained inaccessible to automated retrieval. Public website
server-list URLs were not treated as REST API documentation. No new query option was accepted without a
successful subscribed structural verification, so the conservative decision remains unchanged.

The subscribed run later that day directly observed absolute same-origin `/servers` next links using
`page[key]` and `page[rel]`. Following one link returned a second valid Server collection page with no
duplicate primary IDs across the adjacent pages. These keys remain opaque link state and are not exposed
as user parameters. Page size, offsets, filters, sorting, includes, and sparse fieldsets remain
unresolved, so the decision remains conservative.

## Phase 1C usability review

The editor description now states that Get Many uses the API's default collection ordering and exposes no
server-side filters. Return All explicitly names the 100-page and 10,000-item caps; Limit explicitly says
that trimming is local and cannot over-return. A bounded n8n run observed 10 resources on the first page:
limits 1, 5, and 10 fetched one page, while Limit 11 fetched exactly two pages and returned exactly 11
primary resources with both page contexts retained.
