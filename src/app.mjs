import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { openStore } from './store.mjs';
export async function createApp({ directory, token, version = '0.1.0' } = {}) {
  if (typeof token !== 'string' || token.length < 20)
    throw new Error('APP_TOKEN must be at least 20 characters');
  const store = await openStore(directory);
  const expected = Buffer.from('Bearer ' + token);
  const server = http.createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(data));
    };
    if (req.url === '/health' && req.method === 'GET') return reply(200, { ok: true, version });
    if (req.url !== '/notes') return reply(404, { error: 'Not found' });
    const supplied = Buffer.from(req.headers.authorization ?? '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return reply(401, { error: 'Unauthorized' });
    if (req.method === 'GET') return reply(200, { notes: store.list() });
    if (req.method !== 'POST') return reply(405, { error: 'Use GET or POST' });
    let bytes = 0;
    const chunks = [];
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 16384) {
          reply(413, { error: 'Request too large' });
          return;
        }
        chunks.push(chunk);
      }
    } catch {
      return;
    }
    let data;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return reply(400, { error: 'Invalid JSON' });
    }
    if (!data || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 2000)
      return reply(422, { error: 'text must contain 1..2000 characters' });
    try {
      return reply(201, { note: await store.add(data.text) });
    } catch {
      return reply(503, { error: 'Store unavailable or full' });
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  return server;
}
