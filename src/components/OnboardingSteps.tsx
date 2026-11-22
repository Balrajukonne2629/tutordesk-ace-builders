'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, createDemoData, getTutorProfiles, updateTutorProfile } from '@/lib/api';

const STEPS = ['Your name', 'UPI ID', 'Opening cash'] as const;
const LABELS = ['Your name', 'UPI ID', 'Opening cash balance (Rs)'] as const;
const PLACEHOLDERS = ['e.g. Ravi Kumar', 'name@okaxis', '0'] as const;
const UPI_PATTERN = /^[A-Za-z0-9._-]+@[A-Za-z]+$/;
const CASH_PATTERN = /^\d{1,3}(,\d{2,3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;

function validateName(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Please enter your name.';
  if (v.length < 2 || v.length > 60) return 'Name must be between 2 and 60 characters.';
  return null;
}

function validateUpi(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Please enter your UPI ID, for example name@okaxis.';
  if (!UPI_PATTERN.test(v)) return 'This does not look like a UPI ID. It should look like name@bank, with no spaces.';
  if (v.length > 256) return 'UPI ID is too long. Please check it and try again.';
  return null;
}

function validateCash(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your opening cash balance in rupees. Enter 0 if you have no cash right now.';
  if (v.startsWith('-')) return 'Opening cash balance cannot be negative. Enter 0 or a positive amount.';
  if (!CASH_PATTERN.test(v)) return 'Enter the amount as a plain rupee figure, for example 12,500 or 12500.50.';
  return null;
}

export default function OnboardingSteps() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cash, setCash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getTutorProfiles()
      .then((p) => {
        setProfileId(p.id);
        setName(p.name ?? '');
        setUpiId(p.upiId ?? '');
        setCash(p.openingCashBalance != null ? String(p.openingCashBalance) : '');
      })
      .catch(() => setError('Could not load your setup. Please refresh the page.'));
  }, []);

  const fieldValue = step === 0 ? name : step === 1 ? upiId : cash;
  const setFieldValue = (value: string) => {
    if (step === 0) setName(value);
    else if (step === 1) setUpiId(value);
    else setCash(value);
  };

  async function save(input: {
    name?: string;
    upiId?: string;
    openingCashBalance?: number;
    onboardingCompleted?: boolean;
  }) {
    if (!profileId) throw new Error('Setup is not ready yet. Please wait a moment.');
    await updateTutorProfile(profileId, input);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const message = step === 0 ? validateName(name) : step === 1 ? validateUpi(upiId) : validateCash(cash);
    if (message) {
      setError(message);
      return;
    }
    setIsSaving(true);
    try {
      if (step === 0) {
        await save({ name: name.trim() });
        setStep(1);
      } else if (step === 1) {
        await save({ upiId: upiId.trim() });
        setStep(2);
      } else {
        await save({
          openingCashBalance: Number(cash.trim().replace(/,/g, '')),
          onboardingCompleted: true,
        });
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setIsSaving(true);
    try {
      await createDemoData({});
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load demo data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div data-nexen-component="nx_components_OnboardingSteps" className="w-full max-w-xl mx-auto space-y-6 min-w-0">
      <div className="flex flex-wrap gap-2" aria-label="Setup steps">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              index <= step
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {index + 1}. {label}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">Step {step + 1} of 3</p>

      <form
        onSubmit={handleSubmit}
        className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="onboarding-field" className="block text-sm font-medium text-foreground">
            {LABELS[step]}
          </label>
          <input
            id="onboarding-field"
            type="text"
            inputMode={step === 2 ? 'decimal' : 'text'}
            value={fieldValue}
            placeholder={PLACEHOLDERS[step]}
            disabled={isSaving}
            onChange={(e) => setFieldValue(e.target.value)}
            className="h-10 w-full min-w-0 rounded-[var(--radius)] border border-input bg-background px-3 text-sm text-foreground"
          />
          {step === 1 && (
            <p className="text-xs text-muted-foreground">Used on printed invoices and QR codes.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSaving}
              className="h-10 rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-medium text-foreground disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="h-10 rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {isLast ? 'Finish setup' : 'Next'}
          </button>
        </div>
      </form>

      <div className="rounded-[var(--radius)] border border-border bg-card p-6 space-y-2">
        <p className="text-sm font-medium text-foreground">Want to explore first?</p>
        <p className="text-sm text-muted-foreground">
          Demo data adds 16 synthetic students, three months of invoices and payments, and sets opening cash to Rs 12,000.
        </p>
        <button
          type="button"
          onClick={handleDemo}
          disabled={isSaving}
          className="h-10 w-full rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-medium text-foreground disabled:opacity-50 sm:w-auto"
        >
          Load demo data
        </button>
      </div>
    </div>
  );
}