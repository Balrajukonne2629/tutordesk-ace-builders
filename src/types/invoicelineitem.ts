// Auto-generated from the reviewed schema — canonical InvoiceLineItem shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface InvoiceLineItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isDemo?: boolean | null;
}
