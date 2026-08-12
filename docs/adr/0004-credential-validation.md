# ADR 0004: Validate credentials at operation time

- Status: Amended
- Date: 2026-08-02

## Decision

Register a declarative n8n credential test for `battleMetricsApi` using the live-verified, read-only
`GET https://api.battlemetrics.com/servers` endpoint. Put the Bearer expression directly in the test
request so the credential does not opt into generic proxy authentication. Keep the access token field
required and secret.

Treat `200` as success, `401` as an invalid or expired token, and `403` as a subscription or permission
failure. The test proves access to this endpoint only; it does not certify every operation or scope.

Operation errors distinguish the directly observed authentication and subscription cases where the
response supports that distinction. They must not treat a subscription denial as an invalid token or an
invalid token as successful validation. Other `403` responses remain permission denials unless the safe
error document identifies the subscription requirement.

## Evidence

Safe read-only `GET /servers?page[size]=1` requests on 2026-08-02 produced this sanitized matrix:

| Request context                          | Observed result                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| No `Authorization` header                | HTTP `403`; JSON error document identified an API subscription requirement |
| Obviously invalid synthetic Bearer token | HTTP `401`; JSON error document identified an invalid or expired token     |
| Owner personal token without API access  | Not tested; no owner credential was supplied                               |
| Owner Premium token with API access      | HTTP `200` for Server Get and Server Get Many on 2026-08-04                |

The rows show that the endpoint rejects an invalid Bearer token distinctly and that an eligible
subscribed token can authenticate successful Server reads. They do not prove that every subscription
`403` authenticates a supplied personal token or that other resources share the same requirements. A
credential-test button therefore still cannot reliably certify every operation, scope, or resource
permission.

## 2026-08-11 amendment

Creator Portal's current scanner requires every non-OAuth credential to define a `test` or be tested by
a node through `testedBy`. The now-live-verified subscribed-token `200` result makes `/servers` a
legitimate credential test endpoint. n8n's declarative credential test API accepts request headers and
fails non-2xx responses by default, so no `authenticate` property is needed. Explicit `401` and `403`
rules provide useful messages without including credential material.

The separate webhook shared-secret credential has no independent outbound verification endpoint, so it
must not define a fabricated request test. Current scanner rules accept a node-level `testedBy` method.
That method truthfully validates only that the shared secret is a non-empty string and states that
BattleMetrics verifies the matching value when a signed webhook arrives. It does not claim remote
matching, connectivity, or registration.

## Previously rejected alternative

The foundation registered a credential-test function that made no request and always returned an error
explaining the limitation. It did not fabricate success, but presenting an always-failing test button
was not useful validation. Treating the anonymous subscription response as successful credential
validation would be materially worse because no supplied credential was authenticated.

## 2026-08-04 implementation review

The decision remains unchanged. The opt-in verifier now requires both a token and Server ID, proves a
credential only through successful subscribed Server requests, and separately checks one synthetic
invalid token. Its safe category matrix distinguishes `401` invalid credential, subscription-specific
`403`, other `403` permission denial, and `404` missing resource without printing response bodies or
credential material.

The bounded subscribed verifier passed on 2026-08-04. It observed `200` for Server Get and two Server
Get Many pages, `401 invalidCredential` for the synthetic token, and `404 resourceNotFound` for the
synthetic in-range missing ID. All responses used `application/json` error/success media types with
JSON:API-shaped envelopes.

## Phase 1C runtime review

The exact packed node was exercised through a disposable n8n 2.30.6 editor. The credential dialog kept
Access Token password-protected and exposed no standalone test button. Execution data and browser logs
contained neither the token nor Authorization text. The run also demonstrated that n8n represents helper
HTTP failures with a string `NodeApiError.httpCode`; the normalizer now accepts validated three-digit HTTP
strings so runtime 401, 403, 404, 429, and server errors retain their status and safe category.
