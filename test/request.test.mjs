import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app.mjs';
const exec = promisify(execFile);
test('the documented request client adds and lists a note using local configuration', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'notes-client-')),
    token = randomBytes(32).toString('hex');
  const server = await createApp({ directory, token });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const env = {
    ...process.env,
    APP_TOKEN: token,
    APP_URL: 'http://127.0.0.1:' + server.address().port,
  };
  const added = await exec(process.execPath, ['scripts/request.mjs', 'add', 'A synthetic note'], {
    env,
  });
  assert.equal(JSON.parse(added.stdout).note.text, 'A synthetic note');
  const listed = await exec(process.execPath, ['scripts/request.mjs', 'list'], { env });
  assert.equal(JSON.parse(listed.stdout).notes.length, 1);
  await assert.rejects(
    exec(process.execPath, ['scripts/request.mjs', 'list'], {
      env: { ...env, APP_URL: 'https://example.com' },
    }),
  );
});
