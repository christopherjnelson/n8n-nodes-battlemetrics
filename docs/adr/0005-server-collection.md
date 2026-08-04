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
cookie-free browser, and neither a subscribed token nor a success response was available. A minimal
collection request plus link-driven pagination provides useful behavior without turning historical or
third-party examples into a claimed contract.

## Consequences

The UI display name is Get Many and its stable internal value is `getAll`. Limit does not alter remote
page size; it trims primary resources locally and stops fetching once enough primary resources have
been received. Search remains a deferred capability even though the phase is described as Get
Many/Search.

## 2026-08-04 review

The first-party developer documentation remained inaccessible to automated retrieval. Public website
server-list URLs were not treated as REST API documentation. No new query option was accepted without a
successful subscribed structural verification, so the conservative decision remains unchanged.
