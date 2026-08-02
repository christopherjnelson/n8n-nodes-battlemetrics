# Contributing

This project welcomes focused issues and pull requests. It is unofficial and contributors must not
represent themselves as BattleMetrics or use BattleMetrics branding.

1. Read `docs/research/api-inventory.md` and the ADRs.
2. Base endpoint work on current first-party BattleMetrics documentation. Record unresolved fields; do
   not infer contracts from wrappers.
3. Use only synthetic fixtures. Never commit tokens, cookies, organization data, player identifiers,
   IP-derived data, notes, flags, or ban reasons.
4. Keep resource IDs as strings and use the category-specific validation types.
5. Add mocked tests and run every command listed in the README.

Normal tests must never call BattleMetrics. Any future live test must be opt-in, read-only, separately
configured, and use owner-provided disposable resources described in `docs/community-testing.md`.

Do not add publishing credentials or a functional publishing workflow. Security issues belong in the
private channel described in `SECURITY.md`, not a public issue.
