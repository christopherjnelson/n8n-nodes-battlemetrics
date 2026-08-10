# Compatibility

Compatibility claims are intentionally narrower than the peer dependency syntax.

## Verified release-candidate environments

| Surface                                        | Verified environment                      | Evidence                                                                                                                                                       |
| ---------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete local validation and packaging        | Node.js 22.23.2 and 24.18.0; pnpm 11.15.0 | Phase 2C ran the frozen install, n8n validation, typecheck, lint, format check, full tests, build, dry-run pack, and package regression under both Node majors |
| Packed editor/action/webhook boundaries        | n8n 2.30.6 on Node.js 24.18.0             | Isolated local package checks documented in the release history and webhook ADR                                                                                |
| Real BattleMetrics-originated webhook delivery | n8n 2.32.6                                | Owner-provided production-version evidence from the completed Server Action and Started Map verification; Phase 2C made no production change or request        |

## Supported and expected range

`package.json#engines.node` supports the tested LTS majors with `^22.0.0 || ^24.0.0`. CI runs the full
project suite on both majors. The current official n8n community-node starter requires Node.js 22 or
higher; this package deliberately does not extend that statement into an untested claim for odd-numbered
or future Node.js majors.

The `n8n-workflow: "*"` peer dependency follows the host-provided community-node pattern: n8n supplies
its own workflow runtime and the package must not bundle a competing copy. The wildcard is not evidence
that every historical or future n8n release has been tested.

## Unverified combinations

- Node.js majors other than 22 and 24.
- n8n releases other than the specifically exercised 2.30.6 and 2.32.6 versions.
- Exact-byte webhook behavior after an n8n change to request-body parsing or webhook response handling.
- Other operating systems, architectures, queue/worker topologies, and multi-worker replay behavior.

Re-run the exact raw-body and immediate-acknowledgement proof before broadening the n8n range or changing
the supported baseline. Do not infer compatibility from installation success alone.

Sources reviewed for the compatibility policy:

- [Official n8n community-node starter](https://github.com/n8n-io/n8n-nodes-starter)
- [Official n8n node-building documentation](https://docs.n8n.io/integrations/creating-nodes/overview/)
