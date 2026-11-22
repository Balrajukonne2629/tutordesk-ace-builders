'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getTutorProfiles, updateTutorProfile } from '@/lib/api';

type Profile = Awaited<ReturnType<typeof getTutorProfiles>>;
type FieldErrors = { name?: string; upiId?: string; cash?: string };

const UPI_PATTERN = /^[A-Za-z0-9._-]+@[A-Za-z]+$/;
const CASH_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_CASH = 10000000;

function validate(name: string, upiId: string, cash: string): FieldErrors {
  const errors: FieldErrors = {};
  const n = name.trim();
  const u = upiId.trim();
  const c = cash.trim();

  if (!n) errors.name = 'Please enter your name.';
  else if (n.length < 2 || n.length > 60) errors.name = 'Name must be between 2 and 60 characters.';

  if (!u) errors.upiId = 'Please enter your UPI ID to receive payments.';
  else if (u.length > 50) errors.upiId = 'UPI ID must be 50 characters or fewer.';
  else if (!UPI_PATTERN.test(u)) errors.upiId = 'Enter a valid UPI ID like name@bank (no spaces).';

  if (!c) errors.cash = 'Enter your opening cash balance (enter 0 if you have none).';
  else if (!CASH_PATTERN.test(c) || Number(c) > MAX_CASH)
    errors.cash = 'Opening cash must be between Rs 0 and Rs 1,00,00,000.';

  return errors;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

export default function SettingsForm() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cash, setCash] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const applyProfile = (p: Profile) => {
    setProfileId(p.id);
    setName(p.name ?? '');
    setUpiId(p.upiId ?? '');
    setCash(String(p.openingCashBalance ?? 0));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getTutorProfiles();
        if (active) applyProfile(profile);
      } catch (err) {
        if (active) setFormError(errorMessage(err));
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    setFormError(null);

    const found = validate(name, upiId, cash);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!profileId) {
      setFormError('Your profile is not loaded yet. Please wait and try again.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateTutorProfile(profileId, {
        name: name.trim(),
        upiId: upiId.trim(),
        openingCashBalance: Number(cash.trim()),
      });
      applyProfile(updated);
      setSaved(true);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full min-w-0 h-10 rounded-[var(--radius)] border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const labelClass = 'block text-sm font-medium text-foreground mb-1';
  const errorClass = 'mt-1 text-sm text-destructive';

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  return (
    <form data-nexen-component="nx_components_SettingsForm"
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-md space-y-5 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div>
        <label htmlFor="tutor-name" className={labelClass}>
          Tutor name
        </label>
        <input
          id="tutor-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(errors.name)}
        />
        <p className="mt-1 text-xs text-muted-foreground">Shown to parents on invoices and reminders.</p>
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="upi-id" className={labelClass}>
          UPI ID
        </label>
        <input
          id="upi-id"
          type="text"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          className={inputClass}
          autoComplete="off"
          aria-invalid={Boolean(errors.upiId)}
        />
        <p className="mt-1 text-xs text-muted-foreground">Printed on invoices and encoded in the UPI QR code.</p>
        {errors.upiId && <p className={errorClass}>{errors.upiId}</p>}
      </div>

      <div>
        <label htmlFor="opening-cash" className={labelClass}>
          Opening cash balance (Rs)
        </label>
        <input
          id="opening-cash"
          type="text"
          inputMode="decimal"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(errors.cash)}
        />
        <p className="mt-1 text-xs text-muted-foreground">Cash in hand that the forecast starts from.</p>
        {errors.cash && <p className={errorClass}>{errors.cash}</p>}
      </div>

      {formError && (
        <p role="alert" className={errorClass}>
          {formError}
        </p>
      )}
      {saved && !formError && <p className="text-sm text-success">Settings saved.</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60 sm:w-auto"
      >
        {isSaving ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  );
}