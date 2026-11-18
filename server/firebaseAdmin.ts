import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let config: {
  projectId?: string;
  firestoreDatabaseId?: string;
  apiKey?: string;
} = {};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse firebase-applet-config.json', err);
  }
}

const PROJECT_ID = config.projectId || 'ai-studio-applet-webapp-59a98';
const DATABASE_ID = config.firestoreDatabaseId || '(default)';
const BASE_DOC_ROOT = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const REST_BASE = `https://firestore.googleapis.com/v1/${BASE_DOC_ROOT}`;

function encodePathSegments(docOrColPath: string): string {
  return docOrColPath
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map((v) => toFirestoreValue(v))
      }
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const arr = val.arrayValue?.values || [];
    return arr.map((item: any) => fromFirestoreValue(item));
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue?.fields || {});
  }
  return null;
}

function fromFirestoreFields(fields: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

function extractDocId(resourceName: string): string {
  const parts = String(resourceName || '').split('/');
  return parts[parts.length - 1] || '';
}

function extractRelativePath(resourceName: string): string {
  const marker = '/documents/';
  const idx = resourceName.indexOf(marker);
  if (idx !== -1) {
    return resourceName.slice(idx + marker.length);
  }
  return resourceName;
}

async function firestoreRequest(url: string, init: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {})
  };

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const errMsg =
      (Array.isArray(json) ? json[0]?.error?.message : json?.error?.message) ||
      `Firestore REST ${res.status}: ${text.slice(0, 300)}`;
    const err: any = new Error(errMsg);
    err.status = res.status;
    throw err;
  }

  return json;
}

export interface WhereFilter {
  field: string;
  op: '==' | 'in' | 'array-contains' | '>=' | '<=' | '<' | '>';
  value: any;
}

function toStructuredOp(op: WhereFilter['op']): string {
  switch (op) {
    case '==':
      return 'EQUAL';
    case 'in':
      return 'IN';
    case 'array-contains':
      return 'ARRAY_CONTAINS';
    case '>=':
      return 'GREATER_THAN_OR_EQUAL';
    case '<=':
      return 'LESS_THAN_OR_EQUAL';
    case '<':
      return 'LESS_THAN';
    case '>':
      return 'GREATER_THAN';
  }
}

class WrappedDocumentSnapshot {
  constructor(
    private _id: string,
    private _path: string,
    private _exists: boolean,
    private _data: any
  ) {}

  get id(): string {
    return this._id;
  }

  get exists(): boolean {
    return this._exists;
  }

  get ref(): WrappedDoc {
    return new WrappedDoc(this._path);
  }

  data(): any {
    return this._data;
  }
}

class WrappedQuerySnapshot {
  constructor(private _docs: WrappedDocumentSnapshot[]) {}

  get size(): number {
    return this._docs.length;
  }

  get empty(): boolean {
    return this._docs.length === 0;
  }

  get docs(): WrappedDocumentSnapshot[] {
    return this._docs;
  }
}

class WrappedDoc {
  constructor(public readonly path: string) {}

  get id(): string {
    const parts = this.path.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }

  get resourceName(): string {
    return `${BASE_DOC_ROOT}/${this.path}`;
  }

  collection(subName: string): WrappedCollection {
    return new WrappedCollection(`${this.path}/${subName}`);
  }

  async get(): Promise<WrappedDocumentSnapshot> {
    const url = `${REST_BASE}/${encodePathSegments(this.path)}`;
    try {
      const json = await firestoreRequest(url, { method: 'GET' });
      return new WrappedDocumentSnapshot(
        this.id,
        this.path,
        true,
        fromFirestoreFields(json.fields || {})
      );
    } catch (err: any) {
      if (err.status === 404) {
        return new WrappedDocumentSnapshot(this.id, this.path, false, undefined);
      }
      throw err;
    }
  }

  async set(data: any, options?: { merge?: boolean }): Promise<void> {
    const keys = Object.keys(data || {}).filter((k) => data[k] !== undefined);
    const params = new URLSearchParams();
    if (options?.merge) {
      for (const k of keys) {
        params.append('updateMask.fieldPaths', k);
      }
    }
    const qs = params.toString();
    const url = `${REST_BASE}/${encodePathSegments(this.path)}${qs ? `?${qs}` : ''}`;
    await firestoreRequest(url, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
  }

  async update(data: any): Promise<void> {
    const keys = Object.keys(data || {}).filter((k) => data[k] !== undefined);
    if (keys.length === 0) return;
    const params = new URLSearchParams();
    params.set('currentDocument.exists', 'true');
    for (const k of keys) {
      params.append('updateMask.fieldPaths', k);
    }
    const url = `${REST_BASE}/${encodePathSegments(this.path)}?${params.toString()}`;
    await firestoreRequest(url, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
  }

  async delete(): Promise<void> {
    const url = `${REST_BASE}/${encodePathSegments(this.path)}`;
    await firestoreRequest(url, { method: 'DELETE' });
  }
}

class WrappedQuery {
  constructor(
    private path: string,
    private filters: WhereFilter[] = [],
    private limitVal?: number
  ) {}

  where(field: string, op: WhereFilter['op'], value: any): WrappedQuery {
    return new WrappedQuery(this.path, [...this.filters, { field, op, value }], this.limitVal);
  }

  limit(n: number): WrappedQuery {
    return new WrappedQuery(this.path, this.filters, n);
  }

  async get(): Promise<WrappedQuerySnapshot> {
    const segments = this.path.split('/').filter(Boolean);
    const collectionId = segments[segments.length - 1];
    const parentSegments = segments.slice(0, -1);
    const parentUrlPart = parentSegments.length > 0 ? `/${encodePathSegments(parentSegments.join('/'))}` : '';
    const url = `${REST_BASE}${parentUrlPart}:runQuery`;

    const structuredQuery: any = {
      from: [{ collectionId }]
    };

    if (this.filters.length === 1) {
      const f = this.filters[0];
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: f.field },
          op: toStructuredOp(f.op),
          value: toFirestoreValue(f.value)
        }
      };
    } else if (this.filters.length > 1) {
      structuredQuery.where = {
        compositeFilter: {
          op: 'AND',
          filters: this.filters.map((f) => ({
            fieldFilter: {
              field: { fieldPath: f.field },
              op: toStructuredOp(f.op),
              value: toFirestoreValue(f.value)
            }
          }))
        }
      };
    }

    if (typeof this.limitVal === 'number') {
      structuredQuery.limit = this.limitVal;
    }

    const rows = await firestoreRequest(url, {
      method: 'POST',
      body: JSON.stringify({ structuredQuery })
    });

    const docs: WrappedDocumentSnapshot[] = [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row.document && row.document.name) {
          const relPath = extractRelativePath(row.document.name);
          const id = extractDocId(row.document.name);
          const data = fromFirestoreFields(row.document.fields || {});
          docs.push(new WrappedDocumentSnapshot(id, relPath, true, data));
        }
      }
    }
    return new WrappedQuerySnapshot(docs);
  }
}

class WrappedCollection {
  constructor(private path: string) {}

  doc(id?: string): WrappedDoc {
    const docId =
      id || `auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return new WrappedDoc(`${this.path}/${docId}`);
  }

  where(field: string, op: WhereFilter['op'], value: any): WrappedQuery {
    return new WrappedQuery(this.path, [{ field, op, value }]);
  }

  limit(n: number): WrappedQuery {
    return new WrappedQuery(this.path, [], n);
  }

  async get(): Promise<WrappedQuerySnapshot> {
    return new WrappedQuery(this.path, []).get();
  }
}

class WrappedBatch {
  private writes: any[] = [];

  set(wrappedDoc: WrappedDoc, data: any, options?: { merge?: boolean }): WrappedBatch {
    const keys = Object.keys(data || {}).filter((k) => data[k] !== undefined);
    const writeObj: any = {
      update: {
        name: wrappedDoc.resourceName,
        fields: toFirestoreFields(data)
      }
    };
    if (options?.merge) {
      writeObj.updateMask = { fieldPaths: keys };
    }
    this.writes.push(writeObj);
    return this;
  }

  update(wrappedDoc: WrappedDoc, data: any): WrappedBatch {
    const keys = Object.keys(data || {}).filter((k) => data[k] !== undefined);
    if (keys.length === 0) return this;
    this.writes.push({
      update: {
        name: wrappedDoc.resourceName,
        fields: toFirestoreFields(data)
      },
      updateMask: { fieldPaths: keys },
      currentDocument: { exists: true }
    });
    return this;
  }

  delete(wrappedDoc: WrappedDoc): WrappedBatch {
    this.writes.push({
      delete: wrappedDoc.resourceName
    });
    return this;
  }

  async commit(): Promise<void> {
    if (this.writes.length === 0) return;
    const url = `${REST_BASE}:commit`;
    await firestoreRequest(url, {
      method: 'POST',
      body: JSON.stringify({ writes: this.writes })
    });
  }
}

class WrappedFirestore {
  collection(colPath: string): WrappedCollection {
    return new WrappedCollection(colPath);
  }

  batch(): WrappedBatch {
    return new WrappedBatch();
  }
}

const db = new WrappedFirestore();

export { db };
