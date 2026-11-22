// Auto-generated from the reviewed schema — canonical Customer shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface Customer {
  id: string;
  createdAt: string;
  updatedAt: string;
  parentName: string;
  studentName: string;
  phone: string;
  subject: string;
  monthlyFee: number;
  billingDay: number;
  isActive: boolean;
  isDemo?: boolean | null;
}
