// Auto-generated from the reviewed schema — canonical TutorProfile shape.
// The API serializes these exact field names; UI components read them.
// Do not hand-edit — regenerate from the schema instead.

export interface TutorProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  upiId?: string | null;
  openingCashBalance: number;
  onboardingCompleted: boolean;
}
