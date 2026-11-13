import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app.mjs';
import { backup, restore } from '../src/store.mjs';
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'deployment-demo-')),
  token = randomBytes(32).toString('hex');
let server;
try {
  server = await createApp({ directory, token });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  const response = await fetch(url + '/notes', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'A synthetic note for the recovery exercise' }),
  });
  if (response.status !== 201) throw new Error('Create failed');
  console.log('Created a note.');
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  server = null;
  const archive = path.join(directory, 'backup.json');
  await backup(path.join(directory, 'notes.json'), archive);
  console.log('Backed up stopped service data.');
  const recovered = path.join(directory, 'restored');
  await fs.mkdir(recovered);
  await restore(archive, path.join(recovered, 'notes.json'));
  server = await createApp({ directory: recovered, token });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const notes = await (
    await fetch('http://127.0.0.1:' + server.address().port + '/notes', {
      headers: { Authorization: 'Bearer ' + token },
    })
  ).json();
  if (notes.notes.length !== 1) throw new Error('Recovery failed');
  console.log('Restored and verified ' + notes.notes.length + ' note.');
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
  await fs.rm(directory, { recursive: true, force: true });
}
