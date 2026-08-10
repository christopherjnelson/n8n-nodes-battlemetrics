## Summary

Describe the focused change and its relation to the frozen scope.

## Validation

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm run validate`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm run format:check`
- [ ] `pnpm test`
- [ ] `pnpm run build`
- [ ] `npm pack --dry-run`
- [ ] `pnpm run test:package`
- [ ] `git diff --check`

## Safety

- [ ] No new resource, operation, polling, registration, moderation, RCON-command, websocket, or custom
      API-call functionality was added without an approved scope change.
- [ ] Tests and examples use only synthetic data.
- [ ] No token, webhook secret, RCON password, private identifier/address, raw header/response, execution
      export, environment file, database, or screenshot is included.
- [ ] No package version, tag, remote, npm ownership, dist-tag, or publication setting changed.
