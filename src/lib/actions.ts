'use server';

import {
  summarizeTotals as summarizeTotalsFlow,
  type SummarizeTotalsInput,
  type SummarizeTotalsOutput,
} from '@/ai/flows/summarize-totals';

export async function getSummary(
  input: SummarizeTotalsInput
): Promise<SummarizeTotalsOutput> {
  try {
    const result = await summarizeTotalsFlow(input);
    return result;
  } catch (error) {
    console.error('Error in getSummary action:', error);
    return {
      summary:
        "Sorry, I couldn't generate a summary at this time. Please check the server logs for more details.",
    };
  }
}
