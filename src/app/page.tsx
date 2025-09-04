'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Auth from '@/components/auth';
import ArzCalculator from '@/components/arz-calculator';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const MOCK_USER: User = {
  uid: process.env.NEXT_PUBLIC_ADMIN_UID || 'l0rwK4cDCsTH1UqXO13YkF2elJr2', // Use Admin UID for mock
  email: 'test@example.com',
  displayName: 'کاربر آزمایشی (Admin)',
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
