
'use client';

import { useState } from 'react';
import type { Reminder } from '@/types/reminder';
import { ApiError, createReminderMarkSent, getReminderWhatsappLink } from '@/lib/api';

const MIN_LENGTH = 20;
const MAX_LENGTH = 1000;

type Channel = 'whatsapp' | 'copy';
type Busy = 'whatsapp' | 'copy' | 'log' | null;

interface ReminderSendActionsProps {
  reminderId: string;
  messageBody: string;
  status: Reminder['status'];
  recentlyReminded?: boolean;
  onSent?: (reminder: Reminder) => void;
}

function messageError(text: string): string | null {
  const length = text.trim().length;
  if (length === 0) return 'Please write a message before sending the reminder.';
  if (length < MIN_LENGTH) return 'Keep the reminder between 20 and 1000 characters.';
  if (length > MAX_LENGTH) return 'Reminder message is too long. Keep it under 1000 characters.';
  return null;
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

export default function ReminderSendActions({
  reminderId,
  messageBody,
  status,
  recentlyReminded = false,
  onSent,
}: ReminderSendActionsProps) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSent = status === 'sent';
  const isBusy = busy !== null;

  async function openWhatsApp() {
    const problem = messageError(messageBody);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy('whatsapp');
    try {
      const url = await getReminderWhatsappLink(reminderId);
      window.open(url, '_blank', 'noopener,noreferrer');
      setChannel('whatsapp');
      setNotice('WhatsApp opened. Log it as sent once you have sent the message.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function copyText() {
    const problem = messageError(messageBody);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy('copy');
    try {
      await navigator.clipboard.writeText(messageBody.trim());
      setChannel('copy');
      setNotice('Message copied. Paste it into your chat, then log it as sent.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function logAsSent() {
    if (!channel) {
      setError('Choose how you sent this reminder: WhatsApp or copied text.');
      return;
    }
    const problem = messageError(messageBody);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy('log');
    try {
      const input = { sent_at: new Date().toISOString(), channel };
      const reminder = await createReminderMarkSent(reminderId, input);
      setNotice('Reminder logged as sent.');
      onSent?.(reminder);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  if (isSent) {
    return (
      <div className="w-full min-w-0 rounded-[var(--radius)] border bg-card p-4 text-sm text-muted-foreground">
        This reminder has been logged as sent and is kept in the reminder log.
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_ReminderSendActions" className="flex w-full min-w-0 flex-col gap-3 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
      {recentlyReminded && (
        <p className="rounded-[var(--radius)] bg-accent px-3 py-2 text-sm text-accent-foreground">
          This customer was sent a reminder in the last 3 days. You can still send another.
        </p>
      )}

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={openWhatsApp}
          disabled={isBusy}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50 sm:w-auto"
        >
          {busy === 'whatsapp' ? 'Opening…' : 'Open in WhatsApp'}
        </button>
        <button
          type="button"
          onClick={copyText}
          disabled={isBusy}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] border bg-background px-4 text-sm font-medium text-foreground disabled:opacity-50 sm:w-auto"
        >
          {busy === 'copy' ? 'Copying…' : 'Copy message'}
        </button>
        <button
          type="button"
          onClick={logAsSent}
          disabled={isBusy}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] border bg-background px-4 text-sm font-medium text-foreground disabled:opacity-50 sm:ml-auto sm:w-auto"
        >
          {busy === 'log' ? 'Logging…' : 'Log as sent'}
        </button>
      </div>

      {channel && (
        <p className="text-xs text-muted-foreground">
          Sending via {channel === 'whatsapp' ? 'WhatsApp' : 'copied text'}
        </p>
      )}

      {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}