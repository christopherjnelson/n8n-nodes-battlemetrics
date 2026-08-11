# Release process

Releases are intentionally manual. GitHub Actions runs CI but does not publish to npm.

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

## Publish

1. Commit the validated release state to `main` and push it.
2. Create and push an annotated `v<version>` tag on that exact commit.
3. Create the matching GitHub release from the tag.
4. Run `npm publish --access public` from the tagged, clean checkout.
5. Verify the published version with `npm view <package>@<version>`.

npm versions and published Git release tags are immutable. Never move or recreate a published tag and
never attempt to overwrite a published npm version.
