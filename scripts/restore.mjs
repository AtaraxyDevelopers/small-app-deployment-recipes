import { restore } from '../src/store.mjs';
try {
  const args = process.argv.slice(2);
  if (args.length !== 2)
    throw new Error(
      'Usage: npm run restore -- backup.json new-directory/notes.json (directory must exist)',
    );
  await restore(args[0], args[1]);
  console.log('Backup verified and restored to a new file.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
