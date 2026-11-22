// Auto-generated from the reviewed schema — canonical Invoice shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface Invoice {
  id: string;
  createdAt: string;
  updatedAt: string;
  invoiceNumber: string;
  customerId: string;
  billingMonth?: string | null;
  issuedDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  sentAt?: string | null;
  paidAt?: string | null;
  isDemo?: boolean | null;
}
