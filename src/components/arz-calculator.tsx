'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Calculator, Edit, PlusCircle, Printer, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { getSummary } from '@/lib/actions';
import {
  addPayment,
  addWorkLog,
  deletePayment,
  deleteWorkLog,
  getPayments,
  getWorkLogs,
  updatePayment,
  updateWorkLog,
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
  FormDescription,
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

const workLogSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  hours: z.coerce.number().positive('Hours must be a positive number.'),
  rate: z.coerce.number().positive('Rate must be a positive number.'),
});

const paymentSchema = z.object({
  amountIRR: z.coerce.number().positive('Amount must be a positive number.'),
  exchangeRate: z.coerce
    .number()
    .positive('Exchange rate must be a positive number.'),
  date: z.date({ required_error: 'A date is required.' }),
  description: z.string().optional(),
});

export default function ArzCalculator() {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, startAiTransition] = useTransition();

  const { toast } = useToast();

  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [isWorkLogDialogOpen, setWorkLogDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const workLogForm = useForm<z.infer<typeof workLogSchema>>({
    resolver: zodResolver(workLogSchema),
    defaultValues: { description: '', hours: 0, rate: 0 },
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amountIRR: 0,
      exchangeRate: exchangeRate > 0 ? exchangeRate : 0,
      date: new Date(),
      description: '',
    },
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [logs, paymentsData] = await Promise.all([
          getWorkLogs(),
          getPayments(),
        ]);
        setWorkLogs(logs);
        setPayments(paymentsData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error loading data',
          description: 'Could not load data from browser storage.',
        });
      } finally {
        setIsDataLoaded(true);
      }
    }
    loadData();
  }, [toast]);

  useEffect(() => {
    if (exchangeRate > 0 && !paymentForm.getValues('exchangeRate')) {
      paymentForm.setValue('exchangeRate', exchangeRate);
    }
  }, [exchangeRate, paymentForm]);

  useEffect(() => {
    if (editingWorkLog) {
      workLogForm.reset(editingWorkLog);
      setWorkLogDialogOpen(true);
    } else {
      workLogForm.reset({ description: '', hours: 0, rate: 0 });
    }
  }, [editingWorkLog, workLogForm]);

  useEffect(() => {
    if (editingPayment) {
      paymentForm.reset({
        ...editingPayment,
        date: new Date(editingPayment.date),
      });
      setPaymentDialogOpen(true);
    } else {
      paymentForm.reset({
        amountIRR: 0,
        exchangeRate: exchangeRate > 0 ? exchangeRate : 0,
        date: new Date(),
        description: '',
      });
    }
  }, [editingPayment, paymentForm, exchangeRate]);

  const closeWorkLogDialog = () => {
    setEditingWorkLog(null);
    setWorkLogDialogOpen(false);
  };

  const closePaymentDialog = () => {
    setEditingPayment(null);
    setPaymentDialogOpen(false);
  };

  const handleWorkLogSubmit = async (values: z.infer<typeof workLogSchema>) => {
    try {
      if (editingWorkLog) {
        const updatedLog = { ...editingWorkLog, ...values };
        await updateWorkLog(updatedLog);
        setWorkLogs(
          workLogs.map((log) => (log.id === updatedLog.id ? updatedLog : log))
        );
        toast({ title: 'Success', description: 'Work log updated.' });
      } else {
        const newLogId = await addWorkLog(values);
        setWorkLogs([...workLogs, { ...values, id: newLogId }]);
        toast({ title: 'Success', description: 'Work log added.' });
      }
      closeWorkLogDialog();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${editingWorkLog ? 'update' : 'add'} work log.`,
      });
    }
  };

  const handleDeleteWorkLog = async (id: number) => {
    try {
      await deleteWorkLog(id);
      setWorkLogs(workLogs.filter((log) => log.id !== id));
      toast({ title: 'Success', description: 'Work log deleted.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete work log.',
      });
    }
  };

  const handlePaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    const paymentData = {
      ...values,
      date: values.date.getTime(),
    };
    try {
      if (editingPayment) {
        const updatedPayment = { ...editingPayment, ...paymentData };
        await updatePayment(updatedPayment);
        setPayments(
          payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
        );
        toast({ title: 'Success', description: 'Payment updated.' });
      } else {
        const newPaymentId = await addPayment(paymentData);
        setPayments([...payments, { ...paymentData, id: newPaymentId }]);
        toast({ title: 'Success', description: 'Payment added.' });
      }
      closePaymentDialog();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${editingPayment ? 'update' : 'add'} payment.`,
      });
    }
  };

  const handleDeletePayment = async (id: number) => {
    try {
      await deletePayment(id);
      setPayments(payments.filter((p) => p.id !== id));
      toast({ title: 'Success', description: 'Payment deleted.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete payment.',
      });
    }
  };

  const {
    totalHours,
    totalEarningsUSD,
    totalPaymentsIRR,
    totalPaymentsUSD,
    balanceUSD,
    balanceIRR,
  } = useMemo(() => {
    const totalHours = workLogs.reduce((sum, log) => sum + log.hours, 0);
    const totalEarningsUSD = workLogs.reduce(
      (sum, log) => sum + log.hours * log.rate,
      0
    );
    const totalPaymentsIRR = payments.reduce(
      (sum, p) => sum + p.amountIRR,
      0
    );
    const totalPaymentsUSD = payments.reduce(
      (sum, p) => sum + p.amountIRR / p.exchangeRate,
      0
    );
    const balanceUSD = totalEarningsUSD - totalPaymentsUSD;
    const balanceIRR = exchangeRate > 0 ? balanceUSD * exchangeRate : 0;
    return {
      totalHours,
      totalEarningsUSD,
      totalPaymentsIRR,
      totalPaymentsUSD,
      balanceUSD,
      balanceIRR,
    };
  }, [workLogs, payments, exchangeRate]);

  const handleGenerateSummary = () => {
    startAiTransition(async () => {
      const summary = await getSummary({
        totalHoursWorked: totalHours,
        totalEarningsUSD: totalEarningsUSD,
        totalPaymentsIRR: totalPaymentsIRR,
        totalPaymentsUSD: totalPaymentsUSD,
        remainingBalanceIRR: balanceIRR,
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
  const formatIRR = (amount: number) =>
    new Intl.NumberFormat('fa-IR').format(amount) + ' ریال';
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
            <Label>نرخ دلار به ریال</Label>
            <Input
              type="number"
              placeholder="مثال: ۵۰۰۰۰۰"
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
            <CardTitle>سوابق کاری</CardTitle>
            <CardDescription>
              ساعات و نرخ کار خود را ثبت کنید.
            </CardDescription>
            <Dialog
              open={isWorkLogDialogOpen}
              onOpenChange={setWorkLogDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="mt-2 w-full md:w-auto no-print">
                  <PlusCircle className="ml-2" /> افزودن رکورد
                </Button>
              </DialogTrigger>
              <DialogContent className="no-print">
                <DialogHeader>
                  <DialogTitle>{editingWorkLog ? 'ویرایش' : 'افزودن'} سابقه کار</DialogTitle>
                </DialogHeader>
                <Form {...workLogForm}>
                  <form
                    onSubmit={workLogForm.handleSubmit(handleWorkLogSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={workLogForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>شرح</FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: توسعه فیچر" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={workLogForm.control}
                        name="hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ساعات</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={workLogForm.control}
                        name="rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>نرخ (دلار/ساعت)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit">ذخیره</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شرح</TableHead>
                  <TableHead className="text-right">ساعات</TableHead>
                  <TableHead className="text-right">نرخ</TableHead>
                  <TableHead className="text-right">جمع</TableHead>
                  <TableHead className="w-[100px] no-print"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workLogs.length > 0 ? (
                  workLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
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
                      <TableCell className="no-print space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingWorkLog(log)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWorkLog(log.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      هنوز سابقه کاری ثبت نشده است.
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
                      name="amountIRR"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مبلغ (ریال)</FormLabel>
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
                          <FormLabel>نرخ دلار به ریال (زمان پرداخت)</FormLabel>
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
                  <TableHead className="text-right">مبلغ (ریال)</TableHead>
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
                        {formatNumber(p.amountIRR)}
                      </TableCell>
                      <TableCell className="text-right font-code">
                        {formatNumber(p.exchangeRate)}
                      </TableCell>
                      <TableCell className="text-right font-headline">
                        {formatUSD(p.amountIRR / p.exchangeRate)}
                      </TableCell>
                      <TableCell className="no-print space-x-1">
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
            <p className="text-sm text-muted-foreground">جمع پرداختی (ریال)</p>
            <p className="font-headline text-lg text-green-600">
              {formatIRR(totalPaymentsIRR)}
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
            <p className="text-sm text-muted-foreground">بدهی (ریال)</p>
            <p className="font-headline text-2xl text-destructive">
              {exchangeRate > 0
                ? formatIRR(balanceIRR)
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
