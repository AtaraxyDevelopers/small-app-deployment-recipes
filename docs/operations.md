# Deployment and recovery exercise

## Run a persistent local service

Generate a token with:

    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

Set APP_TOKEN in your environment: PowerShell uses $env:APP_TOKEN = 'generated-value';
bash/zsh uses export APP_TOKEN='generated-value'. Then run npm start.
The service binds to 127.0.0.1:4340 and writes data/notes.json. Do not commit the token.
GET /health is public. GET and POST /notes require Authorization: Bearer YOUR_TOKEN.
POST accepts JSON {"text":"A synthetic note"}. Maximum 500 notes, 2,000 characters each.

## Back up and restore

1. Stop the process to establish a clear backup point.
2. Run npm run backup -- data/notes.json backup.json.
3. Create a new empty directory named recovered.
4. Run npm run restore -- backup.json recovered/notes.json.
5. Set DATA_DIR to the absolute recovered directory and restart the app.
6. Read /notes with your token and verify the expected records.

Both commands refuse to overwrite existing files. Restore verifies schema and
SHA-256 checksum before creating its output. A checksum detects accidental corruption;
it does not authenticate an archive from an untrusted source. Keep backups private,
encrypted where required, and outside the live data directory. The demo performs
the entire exercise in temporary directories and removes its own data afterward.

## Containers

With Docker and Compose installed, set APP_TOKEN and run:

    docker compose up --build -d
    docker compose logs --tail 50
    docker compose down

The named data volume persists after down. Do not use down -v if you need the data.
The image runs as the node user with a read-only root filesystem. The published port
binds to host loopback. The smoke test builds two image versions, creates one isolated
test volume, writes a note, upgrades, rolls back the image, and verifies the same note.

    npm run test:container

For a real release, tag and retain an immutable tested image. Set APP_IMAGE to that
image in the environment, then use docker compose up -d --no-build. To roll back,
set APP_IMAGE to the previous retained image and repeat. Confirm /health and the
authenticated notes endpoint afterward. Never assume an older binary can read a
new schema; this exercise deliberately keeps schemaVersion:1 across both images.

## Deployment boundaries

This is a single-process teaching service with local JSON storage, not a distributed
database. Do not run multiple writers against the same directory. Atomic rename
reduces partial-file risk but does not provide crash-durable fsync guarantees. Before
internet exposure, add TLS termination, appropriate authentication and authorization,
rate limits, monitoring, storage durability, and a tested operational policy. The
Docker base tag follows Node 24 security updates; record a digest for a reproducible
production artifact. No cloud account or paid hosting is needed for this exercise.
