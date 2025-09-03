import type { WorkLog, Payment } from '@/types';

const DB_NAME = 'ArzCalculatorDB';
const DB_VERSION = 2; // Incremented version to handle schema change
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
        const transaction = (event.target as IDBOpenDBRequest).transaction;

        if (!db.objectStoreNames.contains(WORK_LOG_STORE)) {
          db.createObjectStore(WORK_LOG_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
        
        // Handle migration for payments store
        if (db.objectStoreNames.contains(PAYMENT_STORE)) {
           if (event.oldVersion < 2) {
            const paymentStore = transaction!.objectStore(PAYMENT_STORE);
            const tempStoreName = "payments_temp";
            const tempStore = db.createObjectStore(tempStoreName, { keyPath: 'id', autoIncrement: true });

            paymentStore.openCursor().onsuccess = (e) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                const oldPayment = cursor.value;
                const newPayment = { ...oldPayment, amountIRT: oldPayment.amountIRR, amountIRR: undefined };
                delete newPayment.amountIRR;
                tempStore.add(newPayment);
                cursor.continue();
              } else {
                 db.deleteObjectStore(PAYMENT_STORE);
                 db.createObjectStore(PAYMENT_STORE, { keyPath: 'id', autoIncrement: true }).onsuccess = () => {
                    const finalStore = transaction!.objectStore(PAYMENT_STORE);
                    const tempTx = db.transaction(tempStoreName, 'readonly');
                    const tempObjStore = tempTx.objectStore(tempStoreName);
                    tempObjStore.openCursor().onsuccess = (e) => {
                        const cursor2 = (e.target as IDBRequest<IDBCursorWithValue>).result;
                        if(cursor2) {
                            finalStore.add(cursor2.value);
                            cursor2.continue();
                        } else {
                            db.deleteObjectStore(tempStoreName);
                        }
                    }
                 }
              }
            };
           }
        } else {
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
export const addWorkLog = async (log: Omit<WorkLog, 'id'>): Promise<number> => {
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

export const updateWorkLog = async (log: WorkLog): Promise<number> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORK_LOG_STORE, 'readwrite');
    const store = transaction.objectStore(WORK_LOG_STORE);
    const request = store.put(log);
    request.onsuccess = () => resolve(request.result as number);
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
export const addPayment = async (payment: Omit<Payment, 'id'>): Promise<number> => {
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
    request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result.map((p: any) => {
            if (p.amountIRR !== undefined && p.amountIRT === undefined) {
                return {...p, amountIRT: p.amountIRR / 10, amountIRR: undefined };
            }
            return p;
        });
        resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
};

export const updatePayment = async (payment: Payment): Promise<number> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PAYMENT_STORE, 'readwrite');
    const store = transaction.objectStore(PAYMENT_STORE);
    const request = store.put(payment);
    request.onsuccess = () => resolve(request.result as number);
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

    