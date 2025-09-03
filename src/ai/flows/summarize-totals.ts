'use server';

/**
 * @fileOverview Summarizes the total hours worked, total earnings in USD, total payments in IRT, and total payments in USD, as well as the remaining balance in both currencies.
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
  totalPaymentsIRT: z.number().describe('The total payments in Toman.'),
  totalPaymentsUSD: z.number().describe('The total payments in USD.'),
  remainingBalanceIRT: z.number().describe('The remaining balance in Toman.'),
  remainingBalanceUSD: z.number().describe('The remaining balance in USD.'),
});
export type SummarizeTotalsInput = z.infer<typeof SummarizeTotalsInputSchema>;

const SummarizeTotalsOutputSchema = z.object({
  summary: z.string().describe('A summary of the total hours worked, total earnings in USD, total payments in Toman and USD, and the remaining balance in both currencies.'),
});
export type SummarizeTotalsOutput = z.infer<typeof SummarizeTotalsOutputSchema>;

export async function summarizeTotals(input: SummarizeTotalsInput): Promise<SummarizeTotalsOutput> {
  return summarizeTotalsFlow(input);
}

const summarizeTotalsPrompt = ai.definePrompt({
  name: 'summarizeTotalsPrompt',
  input: {schema: SummarizeTotalsInputSchema},
  output: {schema: SummarizeTotalsOutputSchema},
  prompt: `Provide a summary of the financial status based on the following information (all currency is in Toman, not Rial):

Total Hours Worked: {{{totalHoursWorked}}}
Total Earnings in USD: {{{totalEarningsUSD}}}
Total Payments in Toman: {{{totalPaymentsIRT}}}
Total Payments in USD: {{{totalPaymentsUSD}}}
Remaining Balance in Toman: {{{remainingBalanceIRT}}}
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

    