// Auto-generated from the reviewed schema — canonical Alert shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface Alert {
  id: string;
  createdAt: string;
  updatedAt: string;
  alertType: string;
  severity: string;
  message: string;
  actionLabel: string;
  status: string;
  snoozedUntil?: string | null;
  dismissedAt?: string | null;
  actedAt?: string | null;
  shortfallDate?: string | null;
  customerId?: string | null;
  invoiceId?: string | null;
  billId?: string | null;
  dedupeKey?: string | null;
  isDemo?: boolean | null;
  invoiceIds?: Record<string, unknown> | null;
}
