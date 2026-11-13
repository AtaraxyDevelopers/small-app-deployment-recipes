import { createApp } from './app.mjs';
try {
  const port = Number(process.env.PORT ?? 4340),
    host = process.env.HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = await createApp({
    directory: process.env.DATA_DIR ?? './data',
    token: process.env.APP_TOKEN,
    version: process.env.APP_VERSION ?? '0.1.0',
  });
  server.on('error', (e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log('Notes service listening on ' + host + ':' + port));
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => server.close());
} catch (e) {
  console.error(e.message);
  process.exitCode = 2;
}
