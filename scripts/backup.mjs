import { backup } from '../src/store.mjs';
try {
  const args = process.argv.slice(2);
  if (args.length !== 2) throw new Error('Usage: npm run backup -- data/notes.json backup.json');
  await backup(args[0], args[1]);
  console.log('Backup written and checksummed.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
