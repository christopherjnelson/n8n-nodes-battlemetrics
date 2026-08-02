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
| Owner token with API access              | Not tested; no owner credential was supplied                               |

The first two rows show that the endpoint rejects an invalid Bearer token distinctly. They do not prove
that every subscription `403` authenticates a supplied personal token, nor do they provide a success
case. A credential-test button therefore cannot reliably certify that a credential is usable for an
operation.

## Rejected alternative

The foundation registered a credential-test function that made no request and always returned an error
explaining the limitation. It did not fabricate success, but presenting an always-failing test button
was not useful validation. Treating the anonymous subscription response as successful credential
validation would be materially worse because no supplied credential was authenticated.
