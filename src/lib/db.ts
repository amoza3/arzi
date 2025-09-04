import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WorkLog, Payment } from '@/types';

const WORK_LOG_STORE = 'work-logs';
const PAYMENT_STORE = 'payments';

// IMPORTANT: All data operations are performed on the admin's data,
// ensuring that all users see the same information.
const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID;

const getWorkLogsCollection = (userId: string) =>
  collection(db, 'users', userId, WORK_LOG_STORE);
const getPaymentsCollection = (userId: string) =>
  collection(db, 'users', userId, PAYMENT_STORE);

// Work Log Operations
export const addWorkLog = async (
  userId: string,
  log: Omit<WorkLog, 'id'>
): Promise<WorkLog> => {
  if (userId !== ADMIN_UID) throw new Error('Unauthorized');
  const docRef = await addDoc(getWorkLogsCollection(userId), {
    ...log,
    createdAt: Timestamp.now(),
  });
  return { ...log, id: docRef.id };
};

export const getWorkLogs = async (userId: string): Promise<WorkLog[]> => {
  // Always fetch the admin's work logs
  const q = query(getWorkLogsCollection(ADMIN_UID!), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as WorkLog)
  );
};

export const updateWorkLog = async (
  userId: string,
  log: WorkLog
): Promise<void> => {
  if (userId !== ADMIN_UID) throw new Error('Unauthorized');
  if (!log.id) throw new Error('Log ID is required for update');
  const docRef = doc(db, 'users', userId, WORK_LOG_STORE, log.id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...data } = log;
  await updateDoc(docRef, data);
};

export const deleteWorkLog = async (
  userId: string,
  id: string
): Promise<void> => {
  if (userId !== ADMIN_UID) throw new Error('Unauthorized');
  const docRef = doc(db, 'users', userId, WORK_LOG_STORE, id);
  await deleteDoc(docRef);
};

// Payment Operations
export const addPayment = async (
  userId: string,
  payment: Omit<Payment, 'id'>
): Promise<Payment> => {
  if (userId !== ADMIN_UID) throw new Error('Unauthorized');
  const docRef = await addDoc(getPaymentsCollection(userId), {
    ...payment,
    createdAt: Timestamp.now(),
  });
  return { ...payment, id: docRef.id };
};

export const getPayments = async (userId: string): Promise<Payment[]> => {
  // Always fetch the admin's payments
  const q = query(getPaymentsCollection(ADMIN_UID!), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Payment)
  );
};

export const updatePayment = async (
  userId: string,
  payment: Payment
): Promise<void> => {
  if (userId !== ADMIN_UID) throw new Error('Unauthorized');
  if (!payment.id) throw new Error('Payment ID is required for update');
  const docRef = doc(db, 'users', userId, PAYMENT_STORE, payment.id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...data } = payment;
  await updateDoc(docRef, data);
};

export const deletePayment = async (
  userId: string,
  id: string
): Promise<void> => {
  if (userId !== ADMIN_UID) throw new Error('Unauthorized');
  const docRef = doc(db, 'users', userId, PAYMENT_STORE, id);
  await deleteDoc(docRef);
};
