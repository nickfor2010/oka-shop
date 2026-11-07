// node:sqlite and a photos folder, with the same async interface as D1 and R2 on Cloudflare.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function openNodeDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'oka.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const norm = (params) => params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));
  return {
    raw: db,
    all: async (sql, params = []) => db.prepare(sql).all(...norm(params)),
    get: async (sql, params = []) => db.prepare(sql).get(...norm(params)) ?? null,
    run: async (sql, params = []) => ({ lastId: Number(db.prepare(sql).run(...norm(params)).lastInsertRowid) }),
  };
}

const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export function openPhotoDir(dir) {
  const file = (key) => {
    const f = path.normalize(path.join(dir, key));
    if (!f.startsWith(path.normalize(dir) + path.sep)) throw new Error('bad key');
    return f;
  };
  return {
    put: async (key, bytes) => { fs.mkdirSync(path.dirname(file(key)), { recursive: true }); fs.writeFileSync(file(key), bytes); },
    get: async (key) => { try { return { body: fs.readFileSync(file(key)), type: TYPES[key.split('.').pop()] }; } catch { return null; } },
    delete: async (key) => { try { fs.unlinkSync(file(key)); } catch { /* already gone */ } },
  };
}
