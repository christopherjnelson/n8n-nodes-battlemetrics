# ADR 0004: Validate credentials at operation time

- Status: Accepted
- Date: 2026-08-02

## Decision

Do not register an n8n network credential test for the `battleMetricsApi` credential. Keep the access
token field required and secret. Explain in the credential UI that a personal access token may not be
sufficient for REST API access, that an eligible BattleMetrics subscription may also be required, and
that the credential is validated when an operation runs.

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

## Rejected alternative

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
