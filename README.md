<p><a href="https://ataraxydevelopers.com"><img src="docs/brand/ataraxy-developers-logo.png" alt="Ataraxy Developers — Turning Digital Visions Into Reality" width="520"></a></p>

# Small-App Deployment Recipes

[![CI](https://github.com/AtaraxyDevelopers/small-app-deployment-recipes/actions/workflows/ci.yml/badge.svg)](https://github.com/AtaraxyDevelopers/small-app-deployment-recipes/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A runnable persistent Node.js app with backup, restore, container, and rollback exercises.

An open-source project from [Ataraxy Developers](https://github.com/AtaraxyDevelopers).

## Quick start

Install [Node.js](https://nodejs.org/en/download) 22 or 24 (npm is included). Check
`node --version` and `npm --version` in your terminal. The commands below run from
this repository's root folder, the one containing `package.json`.

**With Git:**

```sh
git clone https://github.com/AtaraxyDevelopers/small-app-deployment-recipes.git
cd small-app-deployment-recipes
npm ci
npm test
```

**Without Git:** choose **Code → Download ZIP** on GitHub, extract the archive,
and open a terminal in the extracted `small-app-deployment-recipes-main` folder (release archives may
include the version in the folder name). Run `npm ci` and `npm test` there.
Use the **source-code ZIP**, not an npm `.tgz` package, to follow this developer walkthrough.
The install step may need internet access; the examples run locally afterward.

On Windows PowerShell, if `npm.ps1` is blocked by execution policy, use `npm.cmd`
in place of `npm` in these commands. No execution-policy change is required.

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

For a persistent service, the operations guide includes copyable setup, request,
backup, restore, and Docker commands for PowerShell and bash/zsh.

Follow [docs/operations.md](docs/operations.md) for persistent local use, API requests,
environment setup, backups, restoration, container deployment, and rollback.

## Validation

`npm test` covers authentication, invalid input, concurrent writes, restart
persistence, exact recovery, tampered backups, and corrupt-store startup. With Docker
available, `npm run test:container` builds and runs two actual images. CI runs the
Node tests on three operating systems and the container exercise on Linux.
`npm run test:compose` also checks the actual Compose setup, client requests,
volume export, backup, restore, and restart instructions. Run it from a clean
checkout with Docker available; it needs port 4340 and creates its own `.env`.

## Scope and limitations

This is a working deployment lab for a small single-process app. It uses synthetic
notes and local storage; it is not a claim of production readiness. The operations
guide documents storage, authentication, backup, and deployment boundaries. It does
not provision hosting or publish an app to the internet.

## Expected first run

The demo ends with `Restored and verified 1 note.` It generates its own temporary secret and data, stops both temporary servers, and removes its temporary files.

## Contributing and support

See [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md),
and [SECURITY.md](SECURITY.md). Open an issue with a minimal synthetic reproduction.
This project is maintained on a best-effort basis. No paid service or account is
required to run the local examples.

## License

[MIT](LICENSE). You may use, adapt, and redistribute this project under its license.
