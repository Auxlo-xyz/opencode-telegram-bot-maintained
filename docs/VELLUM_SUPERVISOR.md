# Vellum supervisor mode

This maintained fork is intended for deployments where OpenCode is owned by an
external process supervisor rather than by the Telegram bot process itself.
That distinction matters: stopping only the OpenCode child causes the
supervisor to start it again, and starting a second server can point at a
separate state directory.

## Telegram commands

- `/opencode_start` asks the supervisor to converge the local server and waits
  for an authenticated health response.
- `/opencode_restart` runs the deployment's safe restart helper, then waits for
  the server to become healthy.
- `/opencode_stop` explains that the server is supervisor-managed instead of
  killing the child behind the supervisor's back.

The bot intentionally does not delete or recreate OpenCode's persistent
session database during any of these operations.

## Supervisor contract

The default Vellum paths are:

- supervisor: `/workspace/bin/opencode-telegram-supervise`
- safe restart helper: `/workspace/bin/opencode-telegram-restart`
- working directory: `/workspace`

Override them when needed with:

```text
OPENCODE_TELEGRAM_SUPERVISOR_PATH
OPENCODE_TELEGRAM_RESTART_PATH
OPENCODE_TELEGRAM_SUPERVISOR_CWD
```

The supervisor should keep OpenCode private on loopback, inject credentials at
process start from a secret manager, and use persistent `XDG_DATA_HOME`,
`XDG_CONFIG_HOME`, and `XDG_CACHE_HOME` directories. Do not place Telegram or
OpenCode credentials in this repository, `.env` files committed to Git, logs,
or command arguments.

For this deployment, leave `OPENCODE_AUTO_RESTART_ENABLED=false` in the bot.
The external supervisor is the single owner of OpenCode recovery.

## Development

The bot source is TypeScript. The release bundle is generated JavaScript in
`dist/`, which is intentionally ignored by Git in the upstream project.

```bash
npm install
npm run build
npm run lint
npm run typecheck
npm test
```
