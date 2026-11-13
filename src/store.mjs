import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
export function validateData(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.notes) || data.notes.length > 500)
    throw new Error('Invalid store schema');
  const ids = new Set();
  for (const note of data.notes) {
    if (
      !note ||
      typeof note.id !== 'string' ||
      !note.id ||
      ids.has(note.id) ||
      typeof note.text !== 'string' ||
      !note.text.trim() ||
      note.text.length > 2000 ||
      typeof note.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(note.createdAt))
    )
      throw new Error('Invalid note');
    ids.add(note.id);
  }
  return data;
}
export async function atomicWrite(file, body) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(temp, body, { flag: 'wx', mode: 0o600 });
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true });
  }
}
export async function openStore(directory) {
  const file = path.join(directory, 'notes.json');
  let data;
  try {
    data = validateData(JSON.parse(await fs.readFile(file, 'utf8')));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    data = { schemaVersion: 1, notes: [] };
    await atomicWrite(file, JSON.stringify(data));
  }
  let queue = Promise.resolve();
  return {
    list: () => structuredClone(data.notes),
    add(text) {
      const operation = queue.then(async () => {
        if (typeof text !== 'string' || !text.trim() || text.length > 2000)
          throw new Error('Text must contain 1..2000 characters');
        if (data.notes.length >= 500) throw new Error('Capacity reached');
        const note = { id: randomUUID(), text: text.trim(), createdAt: new Date().toISOString() },
          next = { schemaVersion: 1, notes: [...data.notes, note] };
        await atomicWrite(file, JSON.stringify(next));
        data = next;
        return note;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
}
export async function backup(source, destination) {
  const data = validateData(JSON.parse(await fs.readFile(source, 'utf8'))),
    payload = JSON.stringify(data);
  const envelope = {
    format: 'ataraxy-notes-backup-v1',
    sha256: createHash('sha256').update(payload).digest('hex'),
    data,
  };
  await fs.writeFile(destination, JSON.stringify(envelope, null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  return envelope;
}
export async function restore(source, destination) {
  const envelope = JSON.parse(await fs.readFile(source, 'utf8'));
  if (envelope.format !== 'ataraxy-notes-backup-v1') throw new Error('Unsupported backup format');
  const data = validateData(envelope.data),
    digest = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  if (digest !== envelope.sha256) throw new Error('Backup checksum mismatch');
  await fs.writeFile(destination, JSON.stringify(data), { flag: 'wx', mode: 0o600 });
  return data;
}
