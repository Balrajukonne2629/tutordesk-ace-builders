// Auto-generated from the reviewed schema — canonical Bill shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface Bill {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  category: number;
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  status: string;
  paidOn?: string | null;
  isDemo: boolean;
}
