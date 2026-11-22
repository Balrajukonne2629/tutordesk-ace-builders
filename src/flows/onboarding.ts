import { ApiError, createDemoData, getTutorProfiles, updateTutorProfile } from '@/lib/api';

export type OnboardingStep = 1 | 2 | 3;

export const ONBOARDING_STEP_COUNT = 3;

export type TutorProfileRecord = Awaited<ReturnType<typeof updateTutorProfile>>;

export type SaveResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ProfileStepInput {
  name: string;
  upiId: string;
}

export type ProfileStepField = 'name' | 'upiId';
export type ProfileStepErrors = Partial<Record<ProfileStepField, string>>;

export const OPENING_CASH_FIELD = 'openingCashBalance' as const;
export const DEMO_OPENING_CASH_BALANCE = 12000;

const NAME_MIN = 2;
const NAME_MAX = 60;
const UPI_MAX = 256;

const UPI_FORMAT = /^[A-Za-z0-9._-]+@[A-Za-z]+$/;
const CASH_FORMAT = /^(\d+|\d{1,3}(,\d{2,3})+)(\.\d{1,2})?$/;

export function validateTutorName(raw: string): string | null {
  const name = (raw ?? '').trim();
  if (name.length === 0) {
    return 'Please enter your name.';
  }
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return 'Name must be between 2 and 60 characters.';
  }
  return null;
}

export function validateUpiId(raw: string): string | null {
  const upi = (raw ?? '').trim();
  if (upi.length === 0) {
    return 'Please enter your UPI ID, for example name@okaxis.';
  }
  if (!UPI_FORMAT.test(upi)) {
    return 'This does not look like a UPI ID. It should look like name@bank, with no spaces.';
  }
  if (upi.length > UPI_MAX) {
    return 'UPI ID is too long. Please check it and try again.';
  }
  return null;
}

export function validateProfileStep(input: ProfileStepInput): ProfileStepErrors {
  const errors: ProfileStepErrors = {};
  const nameError = validateTutorName(input.name);
  if (nameError) errors.name = nameError;
  const upiError = validateUpiId(input.upiId);
  if (upiError) errors.upiId = upiError;
  return errors;
}

export function validateOpeningCash(raw: string): string | null {
  const value = (raw ?? '').trim();
  if (value.length === 0) {
    return 'Enter your opening cash balance in rupees. Enter 0 if you have no cash right now.';
  }
  if (value.startsWith('-')) {
    return 'Opening cash balance cannot be negative. Enter 0 or a positive amount.';
  }
  if (!CASH_FORMAT.test(value)) {
    return 'Enter the amount as a plain rupee figure, for example 12,500 or 12500.50.';
  }
  return null;
}

export function parseOpeningCash(raw: string): number {
  const cleaned = (raw ?? '').trim().replace(/,/g, '');
  return Math.round(Number(cleaned) * 100) / 100;
}

export function canAdvanceFromStep(
  step: OnboardingStep,
  profile: { name?: string | null; upiId?: string | null },
): boolean {
  if (step === 1) {
    return (
      validateTutorName(profile.name ?? '') === null &&
      validateUpiId(profile.upiId ?? '') === null
    );
  }
  return true;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function loadOnboardingProfile(): Promise<TutorProfileRecord> {
  return getTutorProfiles();
}

export async function saveProfileStep(
  profileId: string,
  input: ProfileStepInput,
): Promise<SaveResult<TutorProfileRecord>> {
  const errors = validateProfileStep(input);
  const firstError = errors.name ?? errors.upiId;
  if (firstError) {
    return { ok: false, error: firstError };
  }
  try {
    const profile = await updateTutorProfile(profileId, {
      name: input.name.trim(),
      upiId: input.upiId.trim(),
    });
    return { ok: true, data: profile };
  } catch (err) {
    return { ok: false, error: errorMessage(err, 'Could not save your details. Please try again.') };
  }
}

export async function saveOpeningCashStep(
  profileId: string,
  raw: string,
): Promise<SaveResult<TutorProfileRecord>> {
  const error = validateOpeningCash(raw);
  if (error) {
    return { ok: false, error };
  }
  const amount = parseOpeningCash(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: 'Opening cash balance cannot be negative. Enter 0 or a positive amount.' };
  }
  try {
    const profile = await updateTutorProfile(profileId, { openingCashBalance: amount });
    return { ok: true, data: profile };
  } catch (err) {
    return { ok: false, error: errorMessage(err, 'Could not save your opening cash. Please try again.') };
  }
}

export async function completeOnboarding(profileId: string): Promise<SaveResult<TutorProfileRecord>> {
  try {
    const profile = await updateTutorProfile(profileId, { onboardingCompleted: true });
    return { ok: true, data: profile };
  } catch (err) {
    return { ok: false, error: errorMessage(err, 'Could not finish setup. Please try again.') };
  }
}

export async function loadDemoDataDuringOnboarding(): Promise<SaveResult<number>> {
  try {
    const result = await createDemoData({});
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: errorMessage(err, 'Could not load demo data. Please try again.') };
  }
}