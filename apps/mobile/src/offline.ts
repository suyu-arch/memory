import * as SQLite from 'expo-sqlite';

let database: Promise<SQLite.SQLiteDatabase> | null = null;

async function db() {
  database ??= SQLite.openDatabaseAsync('togetherly.db');
  const instance = await database;
  await instance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS upload_tasks (
      id TEXT PRIMARY KEY NOT NULL, encounter_id TEXT NOT NULL, uri TEXT NOT NULL,
      filename TEXT NOT NULL, mime_type TEXT NOT NULL, bytes INTEGER NOT NULL,
      state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, remote_asset_id TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
  return instance;
}

export async function saveDraft(id: string, payload: object) {
  const instance = await db();
  await instance.runAsync(
    'INSERT INTO drafts(id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',
    id, JSON.stringify(payload), Date.now(),
  );
}

export async function loadDraft<T>(id: string): Promise<T | null> {
  const instance = await db();
  const row = await instance.getFirstAsync<{ payload: string }>('SELECT payload FROM drafts WHERE id=?', id);
  return row ? JSON.parse(row.payload) as T : null;
}

export async function enqueueUploads(encounterId: string, files: Array<{ uri: string; filename: string; mimeType: string; bytes: number }>) {
  const instance = await db();
  for (const file of files) await instance.runAsync(
    'INSERT OR REPLACE INTO upload_tasks(id,encounter_id,uri,filename,mime_type,bytes,state,attempts,updated_at) VALUES(?,?,?,?,?,?,?,0,?)',
    crypto.randomUUID(), encounterId, file.uri, file.filename, file.mimeType, file.bytes, 'PENDING', Date.now(),
  );
}

export type UploadTask = {
  id: string; encounter_id: string; uri: string; filename: string; mime_type: string;
  bytes: number; state: string; attempts: number; remote_asset_id: string | null;
};

export async function enqueueAssignedUploads(
  encounterId: string,
  files: Array<{ uri: string; filename: string; mimeType: string; bytes: number; remoteAssetId: string }>,
) {
  const instance = await db();
  for (const file of files) await instance.runAsync(
    'INSERT INTO upload_tasks(id,encounter_id,uri,filename,mime_type,bytes,state,attempts,remote_asset_id,updated_at) VALUES(?,?,?,?,?,?,?,0,?,?)',
    crypto.randomUUID(), encounterId, file.uri, file.filename, file.mimeType, file.bytes, 'PENDING', file.remoteAssetId, Date.now(),
  );
}

export async function pendingUploads(encounterId?: string) {
  const instance = await db();
  return instance.getAllAsync<UploadTask>(
    `SELECT * FROM upload_tasks WHERE state NOT IN ('READY','FAILED')${encounterId ? ' AND encounter_id=?' : ''} ORDER BY updated_at ASC`,
    ...(encounterId ? [encounterId] : []),
  );
}

export async function updateUploadTask(id: string, state: string, attempts?: number) {
  const instance = await db();
  if (attempts === undefined) {
    await instance.runAsync('UPDATE upload_tasks SET state=?,updated_at=? WHERE id=?', state, Date.now(), id);
  } else {
    await instance.runAsync('UPDATE upload_tasks SET state=?,attempts=?,updated_at=? WHERE id=?', state, attempts, Date.now(), id);
  }
}

export async function pendingUploadCount() {
  const instance = await db();
  const row = await instance.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM upload_tasks WHERE state NOT IN ('READY','FAILED')");
  return row?.count ?? 0;
}
