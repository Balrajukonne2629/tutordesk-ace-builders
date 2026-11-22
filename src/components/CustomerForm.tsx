'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, createCustomer } from '@/lib/api';
import type { Customer } from '@/types/customer';

type FormValues = {
  parentName: string;
  studentName: string;
  phone: string;
  subject: string;
  monthlyFee: string;
  billingDay: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

type FieldConfig = {
  name: keyof FormValues;
  label: string;
  placeholder: string;
  inputMode?: 'text' | 'numeric' | 'tel';
};

const EMPTY: FormValues = {
  parentName: '',
  studentName: '',
  phone: '',
  subject: '',
  monthlyFee: '',
  billingDay: '',
};

const FIELDS: FieldConfig[] = [
  { name: 'parentName', label: 'Parent name', placeholder: 'e.g. Sunita Rao' },
  { name: 'studentName', label: 'Student name', placeholder: 'e.g. Aarav Rao' },
  { name: 'phone', label: 'Phone', placeholder: '10-digit mobile number', inputMode: 'tel' },
  { name: 'subject', label: 'Subject', placeholder: 'e.g. Maths' },
  { name: 'monthlyFee', label: 'Monthly fee (Rs)', placeholder: 'e.g. 2500', inputMode: 'numeric' },
  { name: 'billingDay', label: 'Billing day (day of month)', placeholder: '1 to 28', inputMode: 'numeric' },
];

function validate(v: FormValues): { errors: FieldErrors; payload: CustomerPayload | null } {
  const errors: FieldErrors = {};

  const parent = v.parentName.trim();
  if (!parent) errors.parentName = "Please enter the parent's name.";
  else if (parent.length < 2 || parent.length > 60)
    errors.parentName = 'Parent name should be between 2 and 60 characters.';

  const student = v.studentName.trim();
  if (!student) errors.studentName = "Please enter the student's name.";
  else if (student.length < 2 || student.length > 60)
    errors.studentName = 'Student name should be between 2 and 60 characters.';

  const phone = v.phone.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
  if (!v.phone.trim()) errors.phone = 'Please enter a phone number.';
  else if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number starting with 6 to 9.';

  const subject = v.subject.trim();
  if (!subject) errors.subject = 'Please enter the subject being taught.';
  else if (subject.length < 2 || subject.length > 40)
    errors.subject = 'Subject should be between 2 and 40 characters.';

  const fee = Number(v.monthlyFee);
  if (!v.monthlyFee.trim()) errors.monthlyFee = 'Please enter the monthly fee.';
  else if (!Number.isInteger(fee) || fee < 1 || fee > 100000)
    errors.monthlyFee = 'Monthly fee must be a whole number between Rs 1 and Rs 1,00,000.';

  const day = Number(v.billingDay);
  if (!v.billingDay.trim()) errors.billingDay = 'Please choose the billing day of the month.';
  else if (!Number.isInteger(day) || day < 1 || day > 28) errors.billingDay = 'Billing day must be between 1 and 28.';

  if (Object.keys(errors).length > 0) return { errors, payload: null };

  return {
    errors,
    payload: {
      parentName: parent,
      studentName: student,
      phone,
      subject,
      monthlyFee: fee,
      billingDay: day,
      isActive: true,
    },
  };
}

type CustomerPayload = {
  parentName: string;
  studentName: string;
  phone: string;
  subject: string;
  monthlyFee: number;
  billingDay: number;
  isActive: boolean;
};

export default function CustomerForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const { errors: found, payload } = validate(values);
    setErrors(found);
    if (!payload) return;

    setSaving(true);
    try {
      const customer: Customer = await createCustomer(payload);
      router.push(`/customers/${customer.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : 'We could not save the customer. Check your connection and try again.';
      if (/already used/i.test(message)) {
        setErrors({ phone: 'This phone number is already used by another customer.' });
      } else {
        setSubmitError(message);
      }
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md space-y-4">
      {submitError && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      {FIELDS.map((field) => {
        const error = errors[field.name];
        const inputId = `customer-${field.name}`;
        return (
          <div data-nexen-component="nx_components_CustomerForm" key={field.name} className="min-w-0 space-y-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              {field.label}
            </label>
            <input
              id={inputId}
              name={field.name}
              type="text"
              inputMode={field.inputMode}
              placeholder={field.placeholder}
              value={values[field.name]}
              onChange={(e) => update(field.name, e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${inputId}-error` : undefined}
              disabled={saving}
              className={`h-10 w-full rounded-[var(--radius)] border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                error ? 'border-destructive' : 'border-input'
              }`}
            />
            {error && (
              <p id={`${inputId}-error`} className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push('/customers')}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-medium text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-70"
        >
          {saving && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
            />
          )}
          {saving ? 'Saving...' : 'Save customer'}
        </button>
      </div>
    </form>
  );
}