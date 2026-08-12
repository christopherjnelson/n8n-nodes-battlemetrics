# Release process

Releases use npm Trusted Publisher authentication from GitHub Actions and npm staged publishing. The
workflow can stage an exact reviewed tarball under `next`, but it cannot run `npm publish` directly.
There is no npm token, `NPM_TOKEN`, fallback token authentication, or automatic `latest` promotion.

## Permanent npm configuration

Configure the package's npm Trusted Publisher with exactly:

- Provider: GitHub Actions
- Organization or user: `christopherjnelson`
- Repository: `n8n-nodes-battlemetrics`
- Workflow filename: `release.yml`
- Environment: `npm-release`
- Allowed action: `npm stage publish` only

The workflow file must exist on the default branch before saving this configuration. In npm package
publishing access, require two-factor authentication and disallow tokens. The GitHub environment must
contain no npm or other release secret.

## Prepare and validate

1. Run the current beta community-package scanner against local source and require zero findings.
2. Bump the package version and update the changelog.
3. Run the frozen install, official n8n validation, typecheck, lint, formatting, full tests, build,
   package regression, dry-run pack, actual pack, packed credential/metadata/example inspection,
   secret scan, runtime-dependency check, and `git diff --check`.
4. Push `main` and require both canonical CI jobs, `validate (22)` and `validate (24)`, to pass on that
   exact commit.
5. Retain a GitHub release dry run or exact artifact validation when useful, but do not publish from it.

## Stage and approve

6. Obtain explicit owner release approval.
7. Create an annotated immutable `v<version>` tag on the validated commit and push only that tag.
8. Manually dispatch `.github/workflows/release.yml` using that exact tag as the workflow ref. The
   workflow verifies the annotated tag, package version, checkout commit, npm-version absence, scanner,
   tests, build, and packed artifact before running:

   ```sh
   npm stage publish <exact-tarball> --provenance --access public --tag next
   ```

9. Review the staged package and exact downloaded tarball, then approve it with npm 2FA. Approval makes
   the version public under `next`; it does not promote `latest`.
10. Verify the public registry tarball, SHA-256, metadata, and provenance attestation.
11. Install and test `<package>@next` in an isolated n8n environment.
12. Obtain explicit owner approval to promote the exact tested version to `latest`.
13. Promote that exact version with `npm dist-tag add <package>@<version> latest`. Do not rebuild or
    republish it.
14. Run the published beta community-package scanner and require a clean result.
15. Resubmit the n8n Creator Portal only after the published scanner is clean.

Create the GitHub release for the immutable tag only after registry and provenance verification. npm
versions and release tags are immutable: never move or recreate a published tag, reuse a published or
staged version, or replace a tarball after validation.
