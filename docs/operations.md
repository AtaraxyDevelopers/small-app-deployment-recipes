# Deployment and recovery exercise

Run commands from the repository root after npm ci. The examples below use synthetic
notes. The self-contained npm run demo needs no configuration and cleans up afterward.

## Start a persistent local service

Run setup once. It writes a random APP_TOKEN, PORT=4340, and DATA_DIR=./data into .env.
The token is not printed. Existing .env files are preserved; if setup says one already
exists, keep it and continue. Both local scripts load this same file. Existing shell
environment values take precedence over values in the file.

```sh
npm run setup:local
npm run start:local
```

Wait for `Notes service listening on 127.0.0.1:4340`. Leave this terminal open.
In a **second terminal in the same folder**, run:

```sh
npm run request:local -- add "A synthetic note"
npm run request:local -- list
```

The first command prints the created note, including an ID and timestamp. The second
prints a notes array containing it. IDs and timestamps vary. The client reads the
secret from .env and sends the Authorization header for you. The data stays in
data/notes.json after restart. Press **Ctrl+C in the first terminal** to stop the server.

The API has public GET /health and authenticated GET/POST /notes. POST accepts
{"text":"A synthetic note"}. Limits are 500 notes and 2,000 characters per note.
The optional APP_URL environment variable selects another local HTTP address for
the request client. For shell-managed configuration, use npm start with APP_TOKEN
set to a secret of at least 20 characters. No tokens are accepted in URLs.

## Back up and restore

**Stop the server with Ctrl+C first.** Then create backup and restore directories:

```sh
node -e "const fs=require('node:fs');fs.mkdirSync('backups',{recursive:true});fs.mkdirSync('recovered',{recursive:true})"
npm run backup -- data/notes.json backups/notes.backup.json
npm run restore -- backups/notes.backup.json recovered/notes.json
```

Expected messages: `Backup written and checksummed.` and `Backup verified and restored
to a new file.` The commands refuse to overwrite existing files. For another exercise,
choose new backup and restore filenames; keep existing backups until you no longer
need them. Restore checks schema and SHA-256 before creating its output.

Start the app against the recovered directory using **one** block for your shell:

PowerShell:

```powershell
$env:DATA_DIR = (Resolve-Path recovered).Path
npm run start:local
```

bash or zsh:

```sh
DATA_DIR="$PWD/recovered" npm run start:local
```

In your second terminal, verify the restored note:

```sh
npm run request:local -- list
```

Stop the recovered server with Ctrl+C. PowerShell users can remove the temporary
override with `Remove-Item Env:DATA_DIR` before returning to the original data folder.
Backups and recovered data are ignored by Git. A checksum detects accidental damage;
it does not authenticate an archive from an untrusted source. Keep backups private
and encrypted where appropriate.

## Run with Docker Compose

Install Docker with Compose support and start its engine. The same .env created by
setup:local supplies APP_TOKEN to Compose automatically. Stop any local service using
port 4340, then run:

```sh
docker compose up --build -d
docker compose logs --tail 50
npm run request:local -- add "A container note"
npm run request:local -- list
docker compose down
```

The named volume persists after down. Do not use down -v when you need that data.
The image runs as the node user with a read-only root filesystem; the published
port binds to host loopback. Container data lives in the named volume, not ./data.

To create a file backup from a running Compose deployment, stop writes and copy
its data out before packaging the backup:

```sh
node -e "require('node:fs').mkdirSync('backups',{recursive:true})"
docker compose stop app
docker compose cp app:/app/data/notes.json backups/container-notes.json
npm run backup -- backups/container-notes.json backups/container.backup.json
docker compose start app
```

Use new export and backup filenames for subsequent backups. Restore the resulting
archive into a fresh directory using the restore command above, then test it with
the local app before deciding how to migrate or replace a container volume.

## Automated image rollback exercise

```sh
npm run test:container
```

This builds two images, creates an isolated test volume, writes a note, upgrades,
rolls back to the earlier image, and verifies the same note. It removes only its own
test containers, images, and volume. Docker is required for this check; the ordinary
npm test and npm run demo commands do not require it.

For your own deployment, retain an immutable tested image and its previous version.
Set APP_IMAGE to the chosen existing image and use docker compose up -d --no-build.
To roll back, select the retained previous image and repeat. Confirm /health and the
authenticated /notes endpoint. An older binary may not support a newer schema; this
exercise deliberately keeps schemaVersion:1 across both images.

## Deployment boundaries

This is a single-process teaching service with local JSON storage. Do not run multiple
writers against the same directory. Atomic rename reduces partial-file risk but does
not provide crash-durable fsync guarantees. Internet exposure requires an appropriate
TLS, authentication, authorization, rate-limit, monitoring, and storage design. The
Docker base tag follows Node 24 updates; record a digest for a reproducible production
artifact. No cloud account or paid hosting is needed for this local exercise.
