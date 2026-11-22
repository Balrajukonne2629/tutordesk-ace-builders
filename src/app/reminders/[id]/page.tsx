'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Reminder } from '@/types/reminder';
import { ApiError, deleteReminder, getReminderById, updateReminder } from '@/lib/api';
import ReminderDraftEditor from '@/components/ReminderDraftEditor';
import ReminderSendActions from '@/components/ReminderSendActions';
import RecentlyRemindedWarning from '@/components/RecentlyRemindedWarning';

type ReminderDetail = Reminder & { recentlyReminded: boolean };

const MAX_LENGTH = 1000;
const TONES: Reminder['tone'][] = ['friendly', 'firm', 'final_notice'];

function validateDraft(message: string, tone: Reminder['tone'], language: Reminder['language']): string | null {
  const text = message.trim();
  if (text.length === 0) return 'Reminder message cannot be empty. Please write a message.';
  if (text.length > MAX_LENGTH) return 'Reminder message is too long. Keep it under 1000 characters.';
  if (!TONES.includes(tone)) return 'Please choose a tone: Friendly, Firm or Final notice.';
  if (language !== 'english' && tone !== 'friendly') {
    return 'Hindi and Telugu are available only for the Friendly reminder. Switch the tone to Friendly or use English.';
  }
  return null;
}

export default function ReminderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [reminder, setReminder] = useState<ReminderDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    getReminderById(params.id)
      .then((data) => setReminder(data))
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'Could not load this reminder.'));
  }, [params.id]);

  if (loadError) {
    return <p role="alert" className="px-4 py-6 text-sm text-[var(--destructive)]">{loadError}</p>;
  }
  if (!reminder) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading reminder…</p>;
  }

  const isDraft = reminder.status === 'draft';

  async function handleDiscard() {
    if (!window.confirm('Discard this draft? It will be removed and cannot be undone.')) return;
    setIsDiscarding(true);
    setActionError(null);
    try {
      await deleteReminder(params.id);
      router.push('/reminders');
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not discard this draft.');
    } finally {
      setIsDiscarding(false);
    }
  }

  return (
    <main data-nexen-component="nx_app_reminders__id__page" className="mx-auto w-full max-w-2xl min-w-0 space-y-4 px-4 py-6">
      <Link href="/reminders" className="text-sm text-muted-foreground underline">
        ← Reminders
      </Link>
      <h1 className="text-2xl font-semibold">Reminder</h1>

      <RecentlyRemindedWarning recentlyReminded={reminder.recentlyReminded} lastSentAt={null} />

      {isDraft ? (
        <section className="w-full min-w-0 space-y-4 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
          <ReminderDraftEditor
            key={`${reminder.id}-${String(reminder.updatedAt)}`}
            initialMessage={reminder.messageBody}
            initialTone={reminder.tone}
            initialLanguage={reminder.language}
            isSaving={isSaving}
            onSave={async (draft) => {
              const problem = validateDraft(draft.messageBody, draft.tone, draft.language);
              if (problem) {
                setActionError(problem);
                return;
              }
              setActionError(null);
              setIsSaving(true);
              try {
                const updated = await updateReminder(reminder.id, {
                  messageBody: draft.messageBody.trim(),
                  tone: draft.tone,
                  language: draft.language,
                });
                setReminder({ ...updated, recentlyReminded: reminder.recentlyReminded });
              } catch (e) {
                setActionError(e instanceof ApiError ? e.message : 'Could not save your changes.');
              } finally {
                setIsSaving(false);
              }
            }}
          />
          <ReminderSendActions
            reminderId={reminder.id}
            messageBody={reminder.messageBody}
            status={reminder.status}
            recentlyReminded={reminder.recentlyReminded}
            onSent={(sent) => setReminder({ ...sent, recentlyReminded: reminder.recentlyReminded })}
          />
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isDiscarding}
            className="h-11 w-full rounded-[var(--radius)] border text-sm font-medium text-[var(--destructive)] disabled:opacity-50"
          >
            {isDiscarding ? 'Discarding…' : 'Discard draft'}
          </button>
        </section>
      ) : (
        <section className="w-full min-w-0 space-y-3 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">This reminder was sent and is kept in the reminder log.</p>
          <p className="whitespace-pre-wrap break-words text-sm">{reminder.messageBody}</p>
        </section>
      )}

      {actionError && (
        <p role="alert" className="text-sm text-[var(--destructive)]">{actionError}</p>
      )}
    </main>
  );
}