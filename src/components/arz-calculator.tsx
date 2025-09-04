'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Calculator, Edit, PlusCircle, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { User } from 'firebase/auth';

import { getSummary } from '@/lib/actions';
import {
  addPayment,
  deletePayment,
  getPayments,
  updatePayment,
} from '@/lib/db';
import type { Payment, WorkLog } from '@/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';

const paymentSchema = z.object({
  amountIRT: z.coerce.number().positive('مبلغ باید عدد مثبت باشد.'),
  exchangeRate: z.coerce
    .number()
    .positive('نرخ تبدیل باید عدد مثبت باشد.'),
  date: z.date({ required_error: 'تاریخ الزامی است.' }),
  description: z.string().optional(),
});

interface ArzCalculatorProps {
  user: User;
}

// Interface for the data coming from the Clockify API
interface ClockifyTimeEntry {
  description: string;
  timeInterval: {
    duration: number; // in seconds
  };
  rate: number;
  amount: number; // This is the earned amount
  _id: string;
}


export default function ArzCalculator({ user }: ArzCalculatorProps) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, startAiTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);

  const { toast } = useToast();

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amountIRT: 0,
      exchangeRate: exchangeRate > 0 ? exchangeRate : 0,
      date: new Date(),
      description: '',
    },
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const paymentsData = await getPayments(user.uid);
        setPayments(paymentsData);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'خطا در بارگذاری اطلاعات',
          description: 'خطا در بارگذاری پرداخت‌ها از Firestore.',
        });
      } finally {
        setIsDataLoaded(true);
      }
    }
    loadData();
  }, [user, toast]);

  const handleSyncClockify = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/clockify-report');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const clockifyEntries: ClockifyTimeEntry[] = await response.json();
      
      const formattedWorkLogs: WorkLog[] = clockifyEntries.map(entry => ({
        id: entry._id,
        description: entry.description || 'بدون شرح',
        hours: (entry.timeInterval.duration || 0) / 3600,
        rate: entry.rate || 0,
      }));

      setWorkLogs(formattedWorkLogs);
      toast({
        title: 'همگام‌سازی موفق',
        description: `${formattedWorkLogs.length} رکورد کاری از Clockify بارگذاری شد.`
      });

    } catch (error) {
      console.error("Failed to sync with Clockify:", error);
      toast({
        variant: 'destructive',
        title: 'خطا در همگام‌سازی',
        description: 'امکان دریافت اطلاعات از Clockify وجود ندارد.',
      });
    } finally {
      setIsSyncing(false);
    }
  };


  useEffect(() => {
    if (exchangeRate > 0 && !paymentForm.getValues('exchangeRate')) {
      paymentForm.setValue('exchangeRate', exchangeRate);
    }
  }, [exchangeRate, paymentForm]);

  useEffect(() => {
    if (editingPayment) {
      paymentForm.reset({
        ...editingPayment,
        date: new Date(editingPayment.date),
      });
      setPaymentDialogOpen(true);
    } else {
      paymentForm.reset({
        amountIRT: 0,
        exchangeRate: exchangeRate > 0 ? exchangeRate : 0,
        date: new Date(),
        description: '',
      });
    }
  }, [editingPayment, paymentForm, exchangeRate]);

  const closePaymentDialog = () => {
    setEditingPayment(null);
    setPaymentDialogOpen(false);
  };

  const handlePaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    const paymentData = {
      ...values,
      date: values.date.getTime(),
    };
    try {
      if (editingPayment) {
        const updatedPayment = { ...editingPayment, ...paymentData };
        await updatePayment(user.uid, updatedPayment);
        setPayments(
          payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
        );
        toast({ title: 'موفق', description: 'پرداخت ویرایش شد.' });
      } else {
        const newPayment = await addPayment(user.uid, paymentData);
        setPayments([...payments, newPayment]);
        toast({ title: 'موفق', description: 'پرداخت اضافه شد.' });
      }
      closePaymentDialog();
    } catch {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: `خطا در ${editingPayment ? 'ویرایش' : 'افزودن'} پرداخت.`,
      });
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePayment(user.uid, id);
      setPayments(payments.filter((p) => p.id !== id));
      toast({ title: 'موفق', description: 'پرداخت حذف شد.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'خطا در حذف پرداخت.',
      });
    }
  };

  const {
    totalHours,
    totalEarningsUSD,
    totalPaymentsIRT,
    totalPaymentsUSD,
    balanceUSD,
    balanceIRT,
  } = useMemo(() => {
    const totalHours = workLogs.reduce((sum, log) => sum + log.hours, 0);
    const totalEarningsUSD = workLogs.reduce(
      (sum, log) => sum + log.hours * log.rate,
      0
    );
    const totalPaymentsIRT = payments.reduce(
      (sum, p) => sum + p.amountIRT,
      0
    );
    const totalPaymentsUSD = payments.reduce(
      (sum, p) => sum + p.amountIRT / p.exchangeRate,
      0
    );
    const balanceUSD = totalEarningsUSD - totalPaymentsUSD;
    const balanceIRT = exchangeRate > 0 ? balanceUSD * exchangeRate : 0;
    return {
      totalHours,
      totalEarningsUSD,
      totalPaymentsIRT,
      totalPaymentsUSD,
      balanceUSD,
      balanceIRT,
    };
  }, [workLogs, payments, exchangeRate]);

  const handleGenerateSummary = () => {
    startAiTransition(async () => {
      const summary = await getSummary({
        totalHoursWorked: totalHours,
        totalEarningsUSD: totalEarningsUSD,
        totalPaymentsIRT: totalPaymentsIRT,
        totalPaymentsUSD: totalPaymentsUSD,
        remainingBalanceIRT: balanceIRT,
        remainingBalanceUSD: balanceUSD,
      });
      setAiSummary(summary.summary);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const formatUSD = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  const formatIRT = (amount: number) =>
    new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);

  if (!isDataLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>در حال بارگذاری اطلاعات...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8" dir="rtl">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .container { max-width: 100% !important; padding: 0 !important; }
          .card { box-shadow: none !important; border: 1px solid #ccc; }
        }
      `}</style>
      <header className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2 text-primary">
            <Calculator className="h-8 w-8" />
          </div>
          <h1 className="font-headline text-4xl font-bold">محاسبه‌گر ارز</h1>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-end">
          <div className="w-full md:w-auto">
            <Label>نرخ دلار به تومان</Label>
            <Input
              type="number"
              placeholder="مثال: ۵۰۰۰۰"
              value={exchangeRate || ''}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="w-full text-center font-headline text-lg md:w-48"
            />
          </div>
          <Button onClick={handlePrint} variant="outline" className="no-print">
            <Printer className="ml-2" /> چاپ
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <div className='flex justify-between items-start'>
                <div>
                    <CardTitle>سوابق کاری</CardTitle>
                    <CardDescription>
                      ساعات کاری ثبت شده در Clockify.
                    </CardDescription>
                </div>
                <Button onClick={handleSyncClockify} disabled={isSyncing} className="no-print">
                  <RefreshCw className={cn("ml-2", isSyncing && "animate-spin")} />
                  {isSyncing ? 'در حال دریافت...' : 'همگام‌سازی با Clockify'}
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شرح</TableHead>
                  <TableHead className="text-right">ساعات</TableHead>
                  <TableHead className="text-right">نرخ</TableHead>
                  <TableHead className="text-right">جمع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSyncing ? (
                    <>
                        <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    </>
                ) : workLogs.length > 0 ? (
                  workLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-right font-code">
                        {formatNumber(log.hours)}
                      </TableCell>
                      <TableCell className="text-right font-code">
                        {formatUSD(log.rate)}
                      </TableCell>
                      <TableCell className="text-right font-headline">
                        {formatUSD(log.hours * log.rate)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      برای نمایش اطلاعات، با Clockify همگام‌سازی کنید.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>پرداخت‌ها</CardTitle>
            <CardDescription>تمام پرداخت‌های دریافت شده را ثبت کنید.</CardDescription>
            <Dialog
              open={isPaymentDialogOpen}
              onOpenChange={setPaymentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="mt-2 w-full md:w-auto no-print">
                  <PlusCircle className="ml-2" /> افزودن پرداخت
                </Button>
              </DialogTrigger>
              <DialogContent className="no-print">
                <DialogHeader>
                  <DialogTitle>{editingPayment ? 'ویرایش' : 'افزودن'} پرداخت</DialogTitle>
                </DialogHeader>
                <Form {...paymentForm}>
                  <form
                    onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={paymentForm.control}
                      name="amountIRT"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مبلغ (تومان)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="exchangeRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نرخ دلار به تومان (زمان پرداخت)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={paymentForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>تاریخ پرداخت</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>یک تاریخ انتخاب کنید</span>
                                  )}
                                  <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>شرح (اختیاری)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="مثال: پرداخت برای پروژه X"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">ذخیره پرداخت</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>شرح</TableHead>
                  <TableHead className="text-right">مبلغ (تومان)</TableHead>
                  <TableHead className="text-right">نرخ</TableHead>
                  <TableHead className="text-right">مبلغ (دلار)</TableHead>
                  <TableHead className="w-[100px] no-print"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {new Date(p.date).toLocaleDateString('fa-IR')}
                      </TableCell>
                       <TableCell>{p.description || '-'}</TableCell>
                      <TableCell className="text-right font-code">
                        {formatNumber(p.amountIRT)}
                      </TableCell>
                      <TableCell className="text-right font-code">
                        {formatNumber(p.exchangeRate)}
                      </TableCell>
                      <TableCell className="text-right font-headline">
                        {formatUSD(p.amountIRT / p.exchangeRate)}
                      </TableCell>
                      <TableCell className="no-print space-x-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPayment(p)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePayment(p.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      هنوز پرداختی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle>خلاصه حساب</CardTitle>
          <CardDescription>
            مروری بر درآمدها و پرداخت‌های شما.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">جمع ساعات</p>
            <p className="font-headline text-2xl">{formatNumber(totalHours)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">جمع درآمد</p>
            <p className="font-headline text-2xl">
              {formatUSD(totalEarningsUSD)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">جمع پرداختی (دلار)</p>
            <p className="font-headline text-2xl text-green-600">
              {formatUSD(totalPaymentsUSD)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">جمع پرداختی (تومان)</p>
            <p className="font-headline text-lg text-green-600">
              {formatIRT(totalPaymentsIRT)}
            </p>
          </div>
          <div className="col-span-2 mt-4 space-y-1 md:col-span-4">
            <Separator />
          </div>
          <div className="col-span-2 space-y-1 md:col-start-3">
            <p className="text-sm text-muted-foreground">بدهی (دلار)</p>
            <p className="font-headline text-3xl text-destructive">
              {formatUSD(balanceUSD)}
            </p>
          </div>
          <div className="col-span-2 space-y-1 md:col-start-4">
            <p className="text-sm text-muted-foreground">بدهی (تومان)</p>
            <p className="font-headline text-2xl text-destructive">
              {exchangeRate > 0
                ? formatIRT(balanceIRT)
                : 'نرخ را وارد کنید'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <Button onClick={handleGenerateSummary} disabled={isAiLoading} className="no-print">
            <Bot className="ml-2" />
            {isAiLoading ? 'در حال تولید...' : 'خلاصه با هوش مصنوعی'}
          </Button>
          {aiSummary && (
            <div className="mt-4 w-full rounded-lg border bg-muted/50 p-4 text-sm">
              <p className="whitespace-pre-wrap font-body">{aiSummary}</p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
