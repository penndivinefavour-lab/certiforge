// Type declarations for browser APIs used in Open Studio
declare const indexedDB: IDBFactory;
declare const crypto: Crypto;

interface Crypto {
  getRandomValues<T extends ArrayBufferView | null>(typedArray: T): T;
}

interface IDBFactory {
  open(name: string, version?: number): IDBOpenDBRequest;
}

interface IDBOpenDBRequest extends EventTarget {
  onsuccess: ((this: IDBOpenDBRequest, ev: Event) => any) | null;
  onerror: ((this: IDBOpenDBRequest, ev: Event) => any) | null;
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any) | null;
  result: IDBDatabase | null;
  error: DOMException | null;
  source: IDBObjectStore | null;
  transaction: IDBTransaction | null;
}

interface IDBDatabase extends EventTarget {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction;
  close(): void;
  onclose: ((this: IDBDatabase, ev: Event) => any) | null;
  onerror: ((this: IDBDatabase, ev: Event) => any) | null;
  onversionchange: ((this: IDBDatabase, ev: IDBVersionChangeEvent) => any) | null;
}

interface IDBObjectStore {
  name: string;
  indexNames: DOMStringList;
  keyPath: string | string[];
  autoIncrement: boolean;
  add(value: any, key?: any): IDBRequest;
  put(value: any, key?: any): IDBRequest;
  get(key: any): IDBRequest;
  delete(key: any): IDBRequest;
  clear(): IDBRequest;
  count(key?: any): IDBRequest;
  getIndex(name: string): IDBIndex;
  getKey(key: any): IDBRequest;
  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
  deleteIndex(name: string): void;
  transaction: IDBTransaction;
}

interface IDBRequest extends EventTarget {
  onsuccess: ((this: IDBRequest, ev: Event) => any) | null;
  onerror: ((this: IDBRequest, ev: Event) => any) | null;
  result: any;
  error: DOMException | null;
  source: IDBObjectStore | IDBIndex;
  transaction: IDBTransaction | null;
  readyState: IDBRequestReadyState;
}

enum IDBRequestReadyState {
  pending = 0,
  done = 1,
}

interface IDBIndex {
  name: string;
  objectStore: IDBObjectStore;
  keyPath: string | string[];
  multiEntry: boolean;
  unique: boolean;
  get(key: any): IDBRequest;
  getAll(key?: any, count?: number): IDBRequest;
  getAllKeys(key?: any, count?: number): IDBRequest;
  count(key?: any): IDBRequest;
  getKey(key: any): IDBRequest;
}

interface IDBTransaction extends EventTarget {
  objectStore(name: string): IDBObjectStore;
  mode: IDBTransactionMode;
  error: DOMException | null;
  onerror: ((this: IDBTransaction, ev: Event) => any) | null;
  oncomplete: ((this: IDBTransaction, ev: Event) => any) | null;
  abort(): void;
}

enum IDBTransactionMode {
  readonly = 'readonly',
  readwrite = 'readwrite',
}

interface IDBVersionChangeEvent extends Event {
  newVersion: number | null;
  oldVersion: number;
}

interface IDBIndexParameters {
  unique?: boolean;
  multiEntry?: boolean;
}
