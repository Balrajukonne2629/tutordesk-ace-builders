
'use client';

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';

const MAX_LENGTH = 100;
const DEBOUNCE_MS = 300;
const TOO_LONG_MESSAGE = 'Search is limited to 100 characters. Try a shorter name.';

export interface CustomerSearchBarProps {
  onSearch: (query: string) => void;
  resultCount?: number;
  defaultValue?: string;
}

export function CustomerSearchBar({ onSearch, resultCount, defaultValue = '' }: CustomerSearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue.trim());
  const [error, setError] = useState<string | null>(null);

  // Debounce: only the settled text is sent to the parent.
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed.length > MAX_LENGTH) {
        setError(TOO_LONG_MESSAGE);
        return;
      }
      setError(null);
      setQuery(trimmed);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  // Notify the parent only when the settled query actually changes.
  useEffect(() => {
    onSearch(query);
    // onSearch is intentionally excluded so a new callback identity does not re-fire the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length > MAX_LENGTH) {
      setError(TOO_LONG_MESSAGE);
      return;
    }
    setError(null);
    setQuery(trimmed);
  }

  function handleClear() {
    setValue('');
    setError(null);
    setQuery('');
  }

  const showEmpty = query.length > 0 && resultCount === 0 && !error;

  return (
    <div data-nexen-component="nx_components_CustomerSearchBar" className="w-full min-w-0">
      <form role="search" onSubmit={handleSubmit} className="flex w-full min-w-0 items-center gap-2">
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <div className="relative min-w-0 flex-1">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            id="customer-search"
            type="search"
            value={value}
            onChange={handleChange}
            placeholder="Search by parent, student or phone"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'customer-search-error' : undefined}
            className="h-10 w-full min-w-0 rounded-[var(--radius)] border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="h-10 shrink-0 rounded-[var(--radius)] border border-border bg-card px-3 text-sm font-medium text-foreground"
          >
            Clear search
          </button>
        )}
      </form>

      {error && (
        <p id="customer-search-error" role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showEmpty && (
        <div className="mt-4 rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">No customers match &ldquo;{query}&rdquo;.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try the parent&apos;s name, the student&apos;s name or the phone number.
          </p>
        </div>
      )}
    </div>
  );
}

export default CustomerSearchBar;