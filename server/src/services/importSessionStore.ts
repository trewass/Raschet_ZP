import { randomUUID } from 'crypto';

export interface ImportSessionData {
  id: string;
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
  createdAt: number;
}

const store = new Map<string, ImportSessionData>();
const TTL = 1000 * 60 * 30; // 30 minutes

export function createImportSession(data: {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}): ImportSessionData {
  const id = randomUUID();
  const session: ImportSessionData = {
    id,
    headers: data.headers,
    rows: data.rows,
    delimiter: data.delimiter,
    createdAt: Date.now(),
  };
  store.set(id, session);
  return session;
}

export function getImportSession(id: string): ImportSessionData | null {
  const session = store.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > TTL) {
    store.delete(id);
    return null;
  }
  return session;
}

export function deleteImportSession(id: string) {
  store.delete(id);
}
