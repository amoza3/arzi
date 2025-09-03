'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Calculator, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { getSummary } from '@/lib/actions';
import {
  addPayment,
  addWorkLog,
  deletePayment,
  deleteWorkLog,
  getPayments,
  getWorkLogs,
} from '@/lib/db';
import type { Payment, WorkLog } from '@/types';

import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

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
});

export default function ArzCalculator() {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, startAiTransition] = useTransition();

  const { toast } = useToast();

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
    if (exchangeRate > 0) {
      paymentForm.setValue('exchangeRate', exchangeRate);
    }
  }, [exchangeRate, paymentForm]);

  const handleAddWorkLog = async (values: z.infer<typeof workLogSchema>) => {
    try {
      const newLogId = await addWorkLog(values);
      setWorkLogs([...workLogs, { ...values, id: newLogId }]);
      toast({ title: 'Success', description: 'Work log added.' });
      workLogForm.reset();
      setWorkLogDialogOpen(false);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add work log.',
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

  const handleAddPayment = async (values: z.infer<typeof paymentSchema>) => {
    try {
      const newPayment = { ...values, date: Date.now() };
      const newPaymentId = await addPayment(newPayment);
      setPayments([...payments, { ...newPayment, id: newPaymentId }]);
      toast({ title: 'Success', description: 'Payment added.' });
      paymentForm.reset();
      setPaymentDialogOpen(false);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add payment.',
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

  const formatUSD = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  const formatIRR = (amount: number) =>
    new Intl.NumberFormat('fa-IR').format(amount) + ' IRR';
  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);

  if (!isDataLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2 text-primary">
            <Calculator className="h-8 w-8" />
          </div>
          <h1 className="font-headline text-4xl font-bold">Arz Calculator</h1>
        </div>
        <div className="w-full md:w-auto">
          <Label>USD to IRR Rate</Label>
          <Input
            type="number"
            placeholder="e.g., 500000"
            value={exchangeRate || ''}
            onChange={(e) => setExchangeRate(Number(e.target.value))}
            className="w-full text-center font-headline text-lg md:w-48"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Work Logs</CardTitle>
            <CardDescription>
              Record your work hours and rates.
            </CardDescription>
            <Dialog
              open={isWorkLogDialogOpen}
              onOpenChange={setWorkLogDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="mt-2 w-full md:w-auto">
                  <PlusCircle className="mr-2" /> Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Work Log</DialogTitle>
                </DialogHeader>
                <Form {...workLogForm}>
                  <form
                    onSubmit={workLogForm.handleSubmit(handleAddWorkLog)}
                    className="space-y-4"
                  >
                    <FormField
                      control={workLogForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Feature development" {...field} />
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
                            <FormLabel>Hours</FormLabel>
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
                            <FormLabel>Rate (USD/hr)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit">Save Entry</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
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
                      <TableCell>
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
                      No work logs yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Log all payments received.</CardDescription>
            <Dialog
              open={isPaymentDialogOpen}
              onOpenChange={setPaymentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="mt-2 w-full md:w-auto">
                  <PlusCircle className="mr-2" /> Add Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Payment</DialogTitle>
                </DialogHeader>
                <Form {...paymentForm}>
                  <form
                    onSubmit={paymentForm.handleSubmit(handleAddPayment)}
                    className="space-y-4"
                  >
                    <FormField
                      control={paymentForm.control}
                      name="amountIRR"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (IRR)</FormLabel>
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
                          <FormLabel>USD to IRR Rate (at payment time)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Save Payment</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount (IRR)</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount (USD)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {new Date(p.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-code">
                        {formatNumber(p.amountIRR)}
                      </TableCell>
                      <TableCell className="text-right font-code">
                        {formatNumber(p.exchangeRate)}
                      </TableCell>
                      <TableCell className="text-right font-headline">
                        {formatUSD(p.amountIRR / p.exchangeRate)}
                      </TableCell>
                      <TableCell>
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
                    <TableCell colSpan={5} className="text-center">
                      No payments recorded.
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
          <CardTitle>Account Summary</CardTitle>
          <CardDescription>
            An overview of your earnings and payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="font-headline text-2xl">{formatNumber(totalHours)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Earnings</p>
            <p className="font-headline text-2xl">
              {formatUSD(totalEarningsUSD)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Paid (USD)</p>
            <p className="font-headline text-2xl text-green-600">
              {formatUSD(totalPaymentsUSD)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Paid (IRR)</p>
            <p className="font-headline text-lg text-green-600">
              {formatIRR(totalPaymentsIRR)}
            </p>
          </div>
          <div className="col-span-2 mt-4 space-y-1 md:col-span-4">
            <Separator />
          </div>
          <div className="col-span-2 space-y-1 md:col-start-3">
            <p className="text-sm text-muted-foreground">Balance Due (USD)</p>
            <p className="font-headline text-3xl text-destructive">
              {formatUSD(balanceUSD)}
            </p>
          </div>
          <div className="col-span-2 space-y-1 md:col-start-4">
            <p className="text-sm text-muted-foreground">Balance Due (IRR)</p>
            <p className="font-headline text-2xl text-destructive">
              {exchangeRate > 0
                ? formatIRR(balanceIRR)
                : 'Enter rate to see'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <Button onClick={handleGenerateSummary} disabled={isAiLoading}>
            <Bot className="mr-2" />
            {isAiLoading ? 'Generating...' : 'Generate AI Summary'}
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
