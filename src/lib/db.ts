import type { WorkLog, Payment } from '@/types';

const DB_NAME = 'ArzCalculatorDB';
const DB_VERSION = 1;
const WORK_LOG_STORE = 'workLogs';
const PAYMENT_STORE = 'payments';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available on server'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(WORK_LOG_STORE)) {
          db.createObjectStore(WORK_LOG_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains(PAYMENT_STORE)) {
          db.createObjectStore(PAYMENT_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };
    });
  }
  return dbPromise;
};

// Work Log Operations
export const addWorkLog = async (log: WorkLog): Promise<number> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORK_LOG_STORE, 'readwrite');
    const store = transaction.objectStore(WORK_LOG_STORE);
    const request = store.add(log);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const getWorkLogs = async (): Promise<WorkLog[]> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORK_LOG_STORE, 'readonly');
    const store = transaction.objectStore(WORK_LOG_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteWorkLog = async (id: number): Promise<void> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORK_LOG_STORE, 'readwrite');
    const store = transaction.objectStore(WORK_LOG_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Payment Operations
export const addPayment = async (payment: Payment): Promise<number> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PAYMENT_STORE, 'readwrite');
    const store = transaction.objectStore(PAYMENT_STORE);
    const request = store.add(payment);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const getPayments = async (): Promise<Payment[]> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PAYMENT_STORE, 'readonly');
    const store = transaction.objectStore(PAYMENT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deletePayment = async (id: number): Promise<void> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PAYMENT_STORE, 'readwrite');
    const store = transaction.objectStore(PAYMENT_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
