import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const id = 'ataraxy-compose-' + randomBytes(5).toString('hex'),
  folder = path.resolve('backups', id);
let createdEnv = false;
const run = (command, args) =>
  execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, APP_IMAGE: id + ':test' },
  }).trim();
const compose = (...args) => run('docker', ['compose', '--project-name', id, ...args]);
const client = (...args) =>
  JSON.parse(run(process.execPath, ['--env-file=.env', 'scripts/request.mjs', ...args]));
async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch('http://127.0.0.1:4340/health')).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Compose service did not become ready');
}
try {
  if (fs.existsSync('.env'))
    throw new Error(
      'Use a clean checkout: this test creates its own .env and never overwrites one.',
    );
  run(process.execPath, ['scripts/setup-local.mjs']);
  createdEnv = true;
  compose('config', '--quiet');
  compose('up', '--build', '-d');
  await ready();
  assert.equal(client('add', 'A container note').note.text, 'A container note');
  assert.equal(client('list').notes.length, 1);
  compose('logs', '--tail', '50');
  compose('stop', 'app');
  fs.mkdirSync(folder, { recursive: true });
  const exported = path.join(folder, 'container-notes.json'),
    archive = path.join(folder, 'container.backup.json'),
    recovered = path.join(folder, 'recovered.json');
  compose('cp', 'app:/app/data/notes.json', exported);
  run(process.execPath, ['scripts/backup.mjs', exported, archive]);
  run(process.execPath, ['scripts/restore.mjs', archive, recovered]);
  assert.equal(JSON.parse(fs.readFileSync(recovered, 'utf8')).notes[0].text, 'A container note');
  compose('start', 'app');
  await ready();
  assert.equal(client('list').notes.length, 1);
  compose('down');
  compose('up', '-d', '--no-build');
  await ready();
  assert.equal(client('list').notes.length, 1);
  console.log('Documented Compose setup, requests, volume backup, restore, and restart passed.');
} catch (error) {
  console.error(error.message);
  if (createdEnv)
    try {
      console.error(compose('logs', '--tail', '50'));
    } catch {}
  process.exitCode = 1;
} finally {
  if (createdEnv) {
    try {
      compose('down', '--volumes', '--rmi', 'local');
    } catch {}
    try {
      run('docker', ['image', 'rm', id + ':test']);
    } catch {}
    fs.rmSync('.env', { force: true });
  }
  if (
    path.dirname(folder) !== path.resolve('backups') ||
    !path.basename(folder).startsWith('ataraxy-compose-')
  )
    throw new Error('Unsafe cleanup path');
  fs.rmSync(folder, { recursive: true, force: true });
}
