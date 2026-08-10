# Release process

This document is the local release contract for `n8n-nodes-battlemetrics`. It does not authorize a tag,
push, npm publication, dist-tag change, or Creator Portal submission. Every external checkpoint requires
the owner's explicit approval.

## Release-candidate inputs

Before packaging, require a clean reviewed commit on the intended branch, the exact version already
present in `package.json`, a frozen lockfile, zero runtime dependencies, and these stable codex
identities:

- `n8n-nodes-battlemetrics.battleMetrics`
- `n8n-nodes-battlemetrics.battleMetricsTrigger`

The `0.1.0` product scope is fixed in [ADR 0002](adr/0002-api-scope.md). Do not add functionality during
release preparation.

## Local artifact gate

Run the complete validation suite on every claimed Node.js major. The release candidate must pass:

```sh
pnpm install --frozen-lockfile
pnpm run validate
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm test
pnpm run build
npm pack --dry-run
pnpm run test:package
git diff --check
```

Also validate both SVGs as XML and run the repository's example, metadata, privacy, and secret scans.
Normal release validation must not call BattleMetrics or production n8n.

Create the actual npm tarball in a temporary directory with `npm pack --pack-destination`.
Inspect every packed path rather than relying only on `package.json#files`. Verify:

- the exact file allowlist, including npm's implicit `package.json`;
- source/compiled/packed codex metadata equality;
- clean loading of both compiled nodes and both credentials;
- importable, synthetic examples with no credentials or execution data;
- compressed and unpacked sizes plus file count;
- SHA-256 of the exact candidate;
- zero runtime dependencies; and
- no environment files, tests, research, coverage, databases, screenshots, live responses, execution
  exports, tokens, secrets, private IDs, private addresses, raw headers, or production URLs.

Record the candidate commit, tarball filename, file count, sizes, SHA-256, test count, codex identities,
categories, and runtime dependency count. Delete temporary tarballs and extractions after recording the
results. Never run `npm publish` locally.

## Immutable release discipline

- npm versions are immutable. A published version is never overwritten.
- Git release tags are immutable. Use an annotated `v<version>` tag.
- Before pushing, verify that the annotated tag peels to the exact approved commit.
- Never move, delete/recreate, or force-push a published release tag.
- Never create a new semantic version merely to change npm dist-tags.

**Owner approval checkpoint 1:** stop before creating or pushing the annotated release tag.

## Candidate and dist-tag flow

Publish an approved candidate under `next`, then test the exact registry artifact. Installation through
the Creator Portal and default npm installation require a separate, intentional promotion to `latest`.
Treat dist-tag changes as release actions even though they do not create a new package version.

**Owner approval checkpoint 2:** stop before the first-package bootstrap or staged npm publication.

**Owner approval checkpoint 3:** stop before the owner approves an npm publication stage with 2FA.

**Owner approval checkpoint 4:** stop before promoting the tested candidate to `latest`.

## Trusted publishing

Use GitHub Actions OIDC with npm Trusted Publishing. Do not add a permanent npm-token fallback. The npm
Trusted Publisher configuration must exactly match the GitHub repository owner, repository, workflow
filename, and any selected environment; enter only the filename in npm's workflow field. The future
workflow needs `id-token: write`, read-only repository contents, and an intentionally protected manual
release path. Prefer npm staged publication with a separate owner 2FA approval.

No publishing workflow is committed before the GitHub repository, environment, required checks, and
exact workflow identity exist. When it is later added, review the rendered workflow and effective
permissions before enabling it.

For the first public version, research npm's then-current package-bootstrap and Trusted Publisher
requirements immediately before acting. Do not assume OIDC can create a package that does not yet exist,
and do not publish a placeholder package merely to reserve the name.

## Creator Portal

Submit only after the exact `latest` artifact has passed registry installation and metadata checks and
the public repository/security controls are live.

**Owner approval checkpoint 5:** stop before Creator Portal submission.

## Prohibited release actions

No local npm publishing, npm token creation, placeholder publication, force-push, tag movement, automatic
version bump, automatic dist-tag promotion, or automatic Creator Portal submission is permitted.
