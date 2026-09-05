// Type declarations for browser APIs used in Open Studio
// These are needed because TypeScript doesn't include IndexedDB types by default

declare const indexedDB: IDBFactory;
declare const crypto: Crypto;

interface Crypto {
  getRandomValues<T extends ArrayBufferView | null>(typedArray: T): T;
}

interface IDBFactory {
  open(name: string, version?: number): IDBOpenDBRequest;
  deleteDatabase(name: string): IDBOpenDBRequest;
  databases(): Promise<IDBDatabaseInfo[]>;
  cmp(version1: number, version2: number): number;
}

interface IDBDatabaseInfo {
  name: string;
  version: number;
}

interface IDBOpenDBRequest extends EventTarget {
  onsuccess: ((this: IDBOpenDBRequest, ev: Event) => any) | null;
  onerror: ((this: IDBOpenDBRequest, ev: Event) => any) | null;
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any) | null;
  onblocked: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any) | null;
  result: IDBDatabase | null;
  error: DOMException | null;
  source: IDBObjectStore | null;
  transaction: IDBTransaction | null;
  readonly readyState: IDBRequestReadyState;
}

enum IDBRequestReadyState {
  pending = 0,
  done = 1,
}

interface IDBDatabase extends EventTarget {
  readonly name: string;
  readonly version: number;
  readonly objectStoreNames: DOMStringList;
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction;
  close(): void;
  onclose: ((this: IDBDatabase, ev: Event) => any) | null;
  onerror: ((this: IDBDatabase, ev: Event) => any) | null;
  onversionchange: ((this: IDBDatabase, ev: IDBVersionChangeEvent) => any) | null;
}

interface IDBObjectStore extends EventTarget {
  readonly name: string;
  readonly indexNames: DOMStringList;
  readonly keyPath: string | string[];
  readonly autoIncrement: boolean;
  add(value: any, key?: IDBValidKey): IDBRequest;
  put(value: any, key?: IDBValidKey): IDBRequest;
  get(key: IDBValidKey): IDBRequest;
  delete(key: IDBValidKey): IDBRequest;
  clear(): IDBRequest;
  count(key?: IDBValidKey): IDBRequest;
  getKey(key: IDBValidKey): IDBRequest;
  getIndex(name: string): IDBIndex;
  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
  deleteIndex(name: string): void;
  transaction: IDBTransaction;
}

interface IDBRequest extends EventTarget {
  onsuccess: ((this: IDBRequest, ev: Event) => any) | null;
  onerror: ((this: IDBRequest, ev: Event) => any) | null;
  result: any;
  error: DOMException | null;
  readonly source: IDBObjectStore | IDBIndex;
  readonly transaction: IDBTransaction | null;
  readonly readyState: IDBRequestReadyState;
}

interface IDBIndex extends EventTarget {
  readonly name: string;
  readonly objectStore: IDBObjectStore;
  readonly keyPath: string | string[];
  readonly multiEntry: boolean;
  readonly unique: boolean;
  get(key: IDBValidKey): IDBRequest;
  getAll(key?: IDBValidKey, count?: number): IDBRequest;
  getAllKeys(key?: IDBValidKey, count?: number): IDBRequest;
  count(key?: IDBValidKey): IDBRequest;
  getKey(key: IDBValidKey): IDBRequest;
}

interface IDBTransaction extends EventTarget {
  readonly objectStore(name: string): IDBObjectStore;
  readonly mode: IDBTransactionMode;
  readonly db: IDBDatabase;
  readonly commit: () => void;
  abort(): void;
  onabort: ((this: IDBTransaction, ev: Event) => any) | null;
  oncomplete: ((this: IDBTransaction, ev: Event) => any) | null;
  onerror: ((this: IDBTransaction, ev: Event) => any) | null;
}

enum IDBTransactionMode {
  readonly = 'readonly',
  readwrite = 'readwrite',
  versionchange = 'versionchange',
}

interface IDBVersionChangeEvent extends Event {
  readonly newVersion: number | null;
  readonly oldVersion: number;
}

interface IDBIndexParameters {
  unique?: boolean;
  multiEntry?: boolean;
}
