// Auto-generated from the reviewed schema — canonical Reminder shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface Reminder {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  invoiceId: string;
  tone: string;
  language: string;
  messageBody: string;
  daysLateAtCreation: number;
  status: string;
  channel?: string | null;
  sentAt?: string | null;
  isDemo?: boolean | null;
  badDayBatchId?: string | null;
  badDayRank?: number | null;
}
