import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'arz-calculator',
  appId: '1:485144496784:web:df439b0d74681083a4e615',
  storageBucket: 'arz-calculator.firebasestorage.app',
  apiKey: 'AIzaSyAk3wTvoYAIQs2aQv0H_QvJMr6Y4wnRrBk',
  authDomain: 'arz-calculator.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '485144496784',
};

// Initialize Firebase
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
