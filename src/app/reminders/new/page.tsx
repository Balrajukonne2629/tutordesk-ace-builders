
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReminderForm from '@/components/ReminderForm';

export default function NewReminderPage() {
  const router = useRouter();

  return (
    <main data-nexen-component="nx_app_reminders_new_page" className="mx-auto w-full max-w-xl min-w-0 space-y-6 p-4">
      <div className="min-w-0">
        <Link
          href="/reminders"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to reminders
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">New reminder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the customer and the invoice. The tone is chosen for you from how late the payment is.
        </p>
      </div>

      <div className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <ReminderForm
          onCreated={(reminder) => {
            router.push(`/reminders/${reminder.id}`);
          }}
        />
      </div>
    </main>
  );
}