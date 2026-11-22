// Auto-generated from the reviewed schema — canonical Payment shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface Payment {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  invoiceId: string;
  amount: number;
  receivedOn: string;
  method: string;
  reference?: string | null;
  source: string;
  isDemo?: boolean | null;
}
