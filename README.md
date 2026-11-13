# Small-App Deployment Recipes

[![CI](https://github.com/AtaraxyDevelopers/small-app-deployment-recipes/actions/workflows/ci.yml/badge.svg)](https://github.com/AtaraxyDevelopers/small-app-deployment-recipes/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A runnable persistent Node.js app with backup, restore, container, and rollback exercises.

An open-source project from [Ataraxy Developers](https://github.com/AtaraxyDevelopers).

## Quick start

Requires Node.js 22 or 24 and npm. Git is optional if you download the source ZIP.

```sh
git clone https://github.com/AtaraxyDevelopers/small-app-deployment-recipes.git
cd small-app-deployment-recipes
npm ci
npm test
```

Run the full backup-and-restore exercise without Docker:

```sh
npm run demo
```

It starts a temporary authenticated notes API, writes a synthetic note, stops the
service, creates a checksummed backup, restores into a fresh directory, restarts,
and verifies the recovered note. Temporary files are cleaned up afterward.

## Included implementation

- Persistent JSON store with serialized writes and atomic replacement.
- Authenticated notes API; public health endpoint reports the application version.
- Backup and restore CLIs that reject corrupt archives and existing targets.
- Non-root Docker image, Compose configuration, and container health check.
- Container smoke test that verifies persistence across upgrade and image rollback.

Follow [docs/operations.md](docs/operations.md) for persistent local use, API requests,
environment setup, backups, restoration, container deployment, and rollback.

## Validation

`npm test` covers authentication, invalid input, concurrent writes, restart
persistence, exact recovery, tampered backups, and corrupt-store startup. With Docker
available, `npm run test:container` builds and runs two actual images. CI runs the
Node tests on three operating systems and the container exercise on Linux.

## Scope and limitations

This is a working deployment lab for a small single-process app. It uses synthetic
notes and local storage; it is not a claim of production readiness. The operations
guide documents storage, authentication, backup, and deployment boundaries. It does
not provision hosting or publish an app to the internet.

## Contributing and support

See [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md),
and [SECURITY.md](SECURITY.md). Open an issue with a minimal synthetic reproduction.
This project is maintained on a best-effort basis. No paid service or account is
required to run the local examples.

## License

[MIT](LICENSE). You may use, adapt, and redistribute this project under its license.
