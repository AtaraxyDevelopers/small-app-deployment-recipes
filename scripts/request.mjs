import { parseArgs } from 'node:util';
try {
  const { values, positionals } = parseArgs({
    options: { help: { type: 'boolean' } },
    allowPositionals: true,
    strict: true,
  });
  if (values.help || !positionals.length)
    console.log(
      'npm run request:local -- list\nnpm run request:local -- add "A synthetic note"\nUses APP_TOKEN and PORT from .env; APP_URL can select a different local HTTP server.',
    );
  else {
    const [command, ...args] = positionals;
    if (!((command === 'list' && !args.length) || (command === 'add' && args.length === 1)))
      throw new Error('Use list or add "Your note".');
    const token = process.env.APP_TOKEN;
    if (typeof token !== 'string' || token.length < 20)
      throw new Error(
        'APP_TOKEN must contain at least 20 characters. Run npm run setup:local first.',
      );
    const base = new URL(process.env.APP_URL ?? 'http://127.0.0.1:' + (process.env.PORT ?? '4340'));
    if (
      base.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) ||
      base.username ||
      base.password
    )
      throw new Error('The example client only supports local HTTP servers.');
    const response = await fetch(new URL('/notes', base), {
      method: command === 'list' ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(command === 'add' ? { body: JSON.stringify({ text: args[0] }) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.text();
    if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + body);
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
