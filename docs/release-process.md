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

Publish an approved candidate under `next`, then test the exact registry artifact. For the first version,
pass `--tag next`; npm otherwise assigns `latest` by default. Do not also assign `latest` during the
bootstrap. Installation through the Creator Portal and default npm installation require a separate,
intentional promotion to `latest`. Treat dist-tag changes as release actions even though they do not
create a new package version.

**Owner approval checkpoint 2:** stop before the first-package bootstrap or staged npm publication.

**Owner approval checkpoint 3:** stop before the owner approves an npm publication stage with 2FA.

**Owner approval checkpoint 4:** stop before promoting the tested candidate to `latest`.

## Trusted publishing

Research repeated on 2026-08-10 against current official npm documentation established this bootstrap
boundary:

- Trusted Publisher configuration is created from an existing package's npm settings. Because
  `n8n-nodes-battlemetrics` has no package page yet, it cannot be configured before the first version.
- [`npm stage publish`](https://docs.npmjs.com/staged-publishing/) explicitly requires an existing
  registry package and cannot create a brand-new package.
- The first version can originate from a GitHub-hosted Actions runner with provenance. npm documents
  `id-token: write`, a public repository matching `package.json#repository`, and
  `npm publish --provenance --access public` for a first publication.
- That one bootstrap publication therefore needs temporary authentication. Use a granular access token
  with the shortest available expiration, package/scope read-write access and no organization access,
  and bypass 2FA as npm requires for non-interactive package creation. Because the unscoped package does
  not exist yet and therefore cannot be selected individually, the bootstrap token may need temporary
  **All Packages** access. Store it only as an environment-scoped GitHub Actions secret for the approved
  manual run. Delete the Actions secret and revoke the npm token immediately after the run, whether the
  run succeeds or fails.
- Bootstrap with `npm publish --provenance --access public --tag next`. The explicit tag prevents npm's
  default `latest` assignment. After registry-install testing, `latest` remains a separate owner-approved
  dist-tag action.

After the package exists, configure GitHub Actions OIDC with npm Trusted Publishing. Match the GitHub
owner, repository, workflow filename, and protected environment exactly; enter only the filename in
npm's workflow field. Allow `npm stage publish` but not direct `npm publish`, then set package publishing
access to require 2FA and disallow traditional tokens. Future releases use a GitHub-hosted runner,
`id-token: write`, read-only repository contents, `npm stage publish --tag next`, provenance generated
automatically by trusted publishing, and separate owner 2FA approval.

Official sources checked: [Trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[staged publishing](https://docs.npmjs.com/staged-publishing/),
[provenance](https://docs.npmjs.com/generating-provenance-statements/),
[granular access tokens](https://docs.npmjs.com/about-access-tokens/), and
[dist-tags](https://docs.npmjs.com/cli/dist-tag/).

No publishing workflow is committed before the GitHub repository, environment, required checks, and
exact workflow identity exist. When it is later added, review the rendered workflow and effective
permissions before enabling it.

Recheck these npm requirements immediately before Phase 3B because registry capabilities can change. Do
not publish a placeholder package merely to reserve the name.

## Creator Portal

Submit only after the exact `latest` artifact has passed registry installation and metadata checks and
the public repository/security controls are live.

**Owner approval checkpoint 5:** stop before Creator Portal submission.

## Prohibited release actions

No local npm publishing, npm token creation, placeholder publication, force-push, tag movement, automatic
version bump, automatic dist-tag promotion, or automatic Creator Portal submission is permitted.
