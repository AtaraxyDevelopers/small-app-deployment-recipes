import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const id = 'ataraxy-test-' + randomBytes(5).toString('hex'),
  volume = id + '-data',
  token = randomBytes(32).toString('hex'),
  images = [id + ':v1', id + ':v2'];
let container;
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
async function start(image, version) {
  container = id + '-' + version;
  docker(
    'run',
    '-d',
    '--name',
    container,
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '-p',
    '127.0.0.1::4340',
    '-v',
    volume + ':/app/data',
    '-e',
    'APP_TOKEN=' + token,
    image,
  );
  const address = docker('port', container, '4340/tcp').split('\n')[0],
    url = 'http://' + address;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url + '/health');
      if (r.ok) {
        assert.equal((await r.json()).version, version);
        return url;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Container health check timed out');
}
function stop() {
  if (container) {
    docker('rm', '-f', container);
    container = null;
  }
}
try {
  for (let i = 0; i < images.length; i++) {
    console.log('Building image ' + (i + 1));
    docker('build', '--build-arg', 'APP_VERSION=demo-v' + (i + 1), '-t', images[i], '.');
  }
  docker('volume', 'create', volume);
  let url = await start(images[0], 'demo-v1');
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  assert.equal(
    (
      await fetch(url + '/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: 'survives upgrade and rollback' }),
      })
    ).status,
    201,
  );
  stop();
  url = await start(images[1], 'demo-v2');
  assert.equal((await (await fetch(url + '/notes', { headers })).json()).notes.length, 1);
  stop();
  url = await start(images[0], 'demo-v1');
  assert.equal(
    (await (await fetch(url + '/notes', { headers })).json()).notes[0].text,
    'survives upgrade and rollback',
  );
  console.log('Container install, persistence, upgrade, and image rollback passed.');
} catch (e) {
  console.error(e.message);
  if (container)
    try {
      console.error(docker('logs', container));
    } catch {}
  process.exitCode = 1;
} finally {
  try {
    stop();
  } catch {}
  try {
    docker('volume', 'rm', volume);
  } catch {}
  for (const image of images)
    try {
      docker('image', 'rm', image);
    } catch {}
}
