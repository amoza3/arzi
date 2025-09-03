export interface WorkLog {
  id?: number;
  description: string;
  hours: number;
  rate: number;
}

export interface Payment {
  id?: number;
  amountIRR: number;
  exchangeRate: number;
  date: number; // Stored as timestamp
  description?: string;
}
