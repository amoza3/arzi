'use server';

/**
 * @fileOverview Summarizes the total hours worked, total earnings in USD, total payments in IRR, and total payments in USD, as well as the remaining balance in both currencies.
 *
 * - summarizeTotals - A function that handles the summarization of totals.
 * - SummarizeTotalsInput - The input type for the summarizeTotals function.
 * - SummarizeTotalsOutput - The return type for the summarizeTotals function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTotalsInputSchema = z.object({
  totalHoursWorked: z.number().describe('The total hours worked.'),
  totalEarningsUSD: z.number().describe('The total earnings in USD.'),
  totalPaymentsIRR: z.number().describe('The total payments in IRR.'),
  totalPaymentsUSD: z.number().describe('The total payments in USD.'),
  remainingBalanceIRR: z.number().describe('The remaining balance in IRR.'),
  remainingBalanceUSD: z.number().describe('The remaining balance in USD.'),
});
export type SummarizeTotalsInput = z.infer<typeof SummarizeTotalsInputSchema>;

const SummarizeTotalsOutputSchema = z.object({
  summary: z.string().describe('A summary of the total hours worked, total earnings in USD, total payments in IRR and USD, and the remaining balance in both currencies.'),
});
export type SummarizeTotalsOutput = z.infer<typeof SummarizeTotalsOutputSchema>;

export async function summarizeTotals(input: SummarizeTotalsInput): Promise<SummarizeTotalsOutput> {
  return summarizeTotalsFlow(input);
}

const summarizeTotalsPrompt = ai.definePrompt({
  name: 'summarizeTotalsPrompt',
  input: {schema: SummarizeTotalsInputSchema},
  output: {schema: SummarizeTotalsOutputSchema},
  prompt: `Provide a summary of the financial status based on the following information:

Total Hours Worked: {{{totalHoursWorked}}}
Total Earnings in USD: {{{totalEarningsUSD}}}
Total Payments in IRR: {{{totalPaymentsIRR}}}
Total Payments in USD: {{{totalPaymentsUSD}}}
Remaining Balance in IRR: {{{remainingBalanceIRR}}}
Remaining Balance in USD: {{{remainingBalanceUSD}}}

Give a concise summary.`,
});

const summarizeTotalsFlow = ai.defineFlow(
  {
    name: 'summarizeTotalsFlow',
    inputSchema: SummarizeTotalsInputSchema,
    outputSchema: SummarizeTotalsOutputSchema,
  },
  async input => {
    const {output} = await summarizeTotalsPrompt(input);
    return output!;
  }
);
