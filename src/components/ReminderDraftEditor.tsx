'use client';

import { useState, type FormEvent } from 'react';

export type ReminderTone = 'friendly' | 'firm' | 'final_notice';
export type ReminderLanguage = 'english' | 'hindi' | 'telugu';

export interface ReminderDraft {
  messageBody: string;
  tone: ReminderTone;
  language: ReminderLanguage;
}

interface ReminderDraftEditorProps {
  initialMessage: string;
  initialTone: ReminderTone;
  initialLanguage: ReminderLanguage;
  isSaving?: boolean;
  onSave: (draft: ReminderDraft) => Promise<void> | void;
}

const MAX_LENGTH = 1000;

const TONE_OPTIONS: { value: ReminderTone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'firm', label: 'Firm' },
  { value: 'final_notice', label: 'Final notice' },
];

const LANGUAGE_OPTIONS: { value: ReminderLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'telugu', label: 'Telugu' },
];

function validateDraft(draft: ReminderDraft): string | null {
  if (draft.messageBody.length === 0) {
    return 'Reminder message cannot be empty. Please write a message.';
  }
  if (draft.messageBody.length > MAX_LENGTH) {
    return 'Reminder message is too long. Keep it under 1000 characters.';
  }
  if (!TONE_OPTIONS.some((t) => t.value === draft.tone)) {
    return 'Please choose a reminder tone: Friendly, Firm or Final notice.';
  }
  if (draft.language !== 'english' && draft.tone !== 'friendly') {
    return 'Hindi and Telugu are available only for the Friendly reminder. Please choose English or change the tone to Friendly.';
  }
  return null;
}

export default function ReminderDraftEditor({
  initialMessage,
  initialTone,
  initialLanguage,
  isSaving = false,
  onSave,
}: ReminderDraftEditorProps) {
  const [message, setMessage] = useState<string>(initialMessage ?? '');
  const [tone, setTone] = useState<ReminderTone>(initialTone);
  const [language, setLanguage] = useState<ReminderLanguage>(initialLanguage);
  const [error, setError] = useState<string | null>(null);

  const isFriendly = tone === 'friendly';

  function handleToneChange(next: ReminderTone) {
    setTone(next);
    // Hindi and Telugu are offered only for the Friendly tone.
    if (next !== 'friendly') setLanguage('english');
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft: ReminderDraft = { messageBody: message.trim(), tone, language };
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      await onSave(draft);
    } catch {
      setError('Could not save the reminder. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">Tone</span>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((option) => {
            const active = tone === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleToneChange(option.value)}
                disabled={isSaving}
                className={`h-9 rounded-full px-4 text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">Language</span>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((option) => {
            const active = language === option.value;
            const locked = !isFriendly && option.value !== 'english';
            return (
              <button data-nexen-component="nx_components_ReminderDraftEditor"
                key={option.value}
                type="button"
                aria-pressed={active}
                disabled={locked || isSaving}
                onClick={() => setLanguage(option.value)}
                className={`h-9 rounded-full px-4 text-sm font-medium border transition-colors disabled:opacity-50 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {!isFriendly && (
          <p className="text-xs text-muted-foreground">
            Hindi and Telugu are available only for the Friendly reminder.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="reminder-message" className="text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="reminder-message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError(null);
          }}
          disabled={isSaving}
          rows={8}
          className="w-full min-w-0 min-h-[160px] rounded-[var(--radius)] border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex justify-end text-xs text-muted-foreground">
          {message.length}/{MAX_LENGTH}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="h-10 w-full sm:w-auto rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </form>
  );
}