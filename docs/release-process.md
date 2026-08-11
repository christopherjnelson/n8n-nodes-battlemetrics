# Release process

Releases use GitHub Actions and npm Trusted Publisher authentication so npm can attach build
provenance. No npm access token or GitHub Environment is required.

## Validate

From a clean checkout on the release commit, run:

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

Confirm that `package.json` has the intended version and that the packed artifact contains no secrets,
tests, source files, or runtime dependencies.

## One-time npm configuration

Configure an npm Trusted Publisher for this package with:

- Provider: GitHub Actions
- Organization or user: `christopherjnelson`
- Repository: `n8n-nodes-battlemetrics`
- Workflow filename: `publish.yml`
- Environment: blank
- Permission: Allow npm publish

The repository workflow must exist on the default branch before saving this configuration.

## Publish

1. Commit the validated release state to `main` and push it.
2. Create and push an annotated `v<version>` tag on that exact commit.
3. The tag starts `.github/workflows/publish.yml`, which validates the package and runs
   `pnpm run release`. The n8n node CLI publishes through the npm Trusted Publisher with provenance.
4. Verify the successful workflow and the published version and provenance on npm.
5. Create the matching GitHub release from the tag.

npm versions and published Git release tags are immutable. Never move or recreate a published tag and
never attempt to overwrite a published npm version.
