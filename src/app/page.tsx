'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Auth from '@/components/auth';
import ArzCalculator from '@/components/arz-calculator';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

// TODO: Replace 'YOUR_REAL_USER_ID' with your actual Firebase User ID
// to see your data in the development environment.
// You can find your UID by logging into your live app on Vercel,
// opening the browser console (F12), and typing: `firebase.auth().currentUser.uid`
const MOCK_USER: User = {
  uid: 'YOUR_REAL_USER_ID', // <-- IMPORTANT: REPLACE THIS VALUE
  email: 'test@example.com',
  displayName: 'کاربر آزمایشی',
  photoURL: '',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  providerId: 'mock',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
};


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

  useEffect(() => {
    if (useMockAuth) {
      if (MOCK_USER.uid === 'YOUR_REAL_USER_ID') {
         console.warn(
          'Using mock auth. Please replace "YOUR_REAL_USER_ID" in src/app/page.tsx with your actual Firebase UID to fetch your data.'
        );
      }
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [useMockAuth]);

  const handleSignOut = async () => {
    if (useMockAuth) {
      setUser(null);
      return;
    }
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <main>
      {user ? (
        <>
          <div className="absolute top-4 left-4 z-10 no-print">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="ml-2" />
              خروج
            </Button>
          </div>
          <ArzCalculator user={user} />
        </>
      ) : (
        <Auth />
      )}
    </main>
  );
}
