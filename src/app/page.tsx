'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Auth from '@/components/auth';
import ArzCalculator from '@/components/arz-calculator';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
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
          <div className="absolute top-4 left-4 z-10">
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
