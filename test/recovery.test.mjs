import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app.mjs';
import { backup, restore, openStore } from '../src/store.mjs';
test('persistent API authenticates, validates, serializes writes, and survives restart', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'notes-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const token = randomBytes(32).toString('hex');
  let server = await createApp({ directory: dir, token });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => {
    server.closeAllConnections();
    return new Promise((r) => server.close(r));
  });
  let url = 'http://127.0.0.1:' + server.address().port;
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  assert.equal((await fetch(url + '/notes')).status, 401);
  assert.equal(
    (await fetch(url + '/notes', { method: 'POST', headers, body: 'invalid' })).status,
    400,
  );
  assert.equal(
    (await fetch(url + '/notes', { method: 'POST', headers, body: '{"text":""}' })).status,
    422,
  );
  const responses = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      fetch(url + '/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: 'note ' + i }),
      }),
    ),
  );
  assert.ok(responses.every((r) => r.status === 201));
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  server = await createApp({ directory: dir, token, version: 'rollback-demo' });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await (await fetch(url + '/notes', { headers })).json()).notes.length, 10);
  assert.equal((await (await fetch(url + '/health')).json()).version, 'rollback-demo');
});
test('backup restores exact data and rejects tampering or overwrites', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = await openStore(dir);
  await store.add('synthetic');
  const file = path.join(dir, 'notes.json'),
    archive = path.join(dir, 'archive.json'),
    target = path.join(dir, 'recovered.json');
  await backup(file, archive);
  await restore(archive, target);
  assert.deepEqual(
    JSON.parse(await fs.readFile(target, 'utf8')),
    JSON.parse(await fs.readFile(file, 'utf8')),
  );
  await assert.rejects(restore(archive, target), { code: 'EEXIST' });
  const broken = JSON.parse(await fs.readFile(archive, 'utf8'));
  broken.data.notes[0].text = 'tampered';
  await fs.writeFile(archive, JSON.stringify(broken));
  await assert.rejects(restore(archive, path.join(dir, 'rejected.json')), /checksum/);
  await assert.rejects(fs.stat(path.join(dir, 'rejected.json')), { code: 'ENOENT' });
});
test('corrupt stores fail startup instead of discarding data', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'corrupt-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'notes.json'), 'broken');
  await assert.rejects(openStore(dir));
  assert.equal(await fs.readFile(path.join(dir, 'notes.json'), 'utf8'), 'broken');
});
