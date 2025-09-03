'use client';

import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      toast({
        variant: 'destructive',
        title: 'خطا در ورود',
        description: 'مشکلی در هنگام ورود با گوگل پیش آمد. لطفا دوباره تلاش کنید.',
      });
    }
  };

  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center bg-background"
      dir="rtl"
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">به محاسبه‌گر ارز خوش آمدید</h1>
          <p className="text-muted-foreground">
            برای دسترسی به حساب خود، لطفا با حساب گوگل وارد شوید.
          </p>
        </div>
        <Button onClick={handleSignIn} className="w-full">
          <Chrome className="ml-2 h-5 w-5" />
          ورود با گوگل
        </Button>
      </div>
    </div>
  );
}
