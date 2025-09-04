export interface WorkLog {
  id?: string;
  description: string;
  hours: number;
  rate: number;
  start: string;
  end: string;
}

export interface Payment {
  id?: string;
  amountIRT: number;
  exchangeRate: number;
  date: number; // Stored as timestamp
  description?: string;
}
