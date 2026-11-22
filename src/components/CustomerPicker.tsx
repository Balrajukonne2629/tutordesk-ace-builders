
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getCustomers } from '@/lib/api';
import type { Customer } from '@/types/customer';

interface CustomerPickerProps {
  value?: string;
  onChange?: (customerId: string) => void;
  error?: string;
}

const SEARCH_LIMIT = 100;

const inr = new Intl.NumberFormat('en-IN');

export default function CustomerPicker({ value = '', onChange, error }: CustomerPickerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await getCustomers({ active: true });
      setCustomers(Array.isArray(rows) ? rows : []);
    } catch {
      setLoadError("Couldn't load customers. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const safeCustomers = Array.isArray(customers) ? customers : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return safeCustomers;
    return safeCustomers.filter(
      (c) =>
        c.parentName.toLowerCase().includes(q) || c.studentName.toLowerCase().includes(q),
    );
  }, [query, safeCustomers]);

  const selected = safeCustomers.find((c) => c.id === value);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setSearchError(
      next.trim().length > SEARCH_LIMIT
        ? 'Search is limited to 100 characters. Try a shorter name.'
        : null,
    );
    setQuery(next);
  }

  function renderBody() {
    if (isLoading) {
      return <p className="p-4 text-sm text-muted-foreground">Loading customers…</p>;
    }
    if (loadError) {
      return (
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-destructive">{loadError}</p>
          <button
            type="button"
            onClick={load}
            className="h-9 shrink-0 rounded-[var(--radius)] border px-3 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      );
    }
    if (safeCustomers.length === 0) {
      return (
        <div className="flex flex-col gap-2 p-4">
          <p className="text-sm text-muted-foreground">
            No customers yet. Add a parent and student before creating an invoice.
          </p>
          <Link href="/customers" className="text-sm font-medium underline">
            Go to customers
          </Link>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <p className="p-4 text-sm text-muted-foreground">
          No customer matches &ldquo;{query.trim()}&rdquo;. Check the spelling or try the student&rsquo;s name.
        </p>
      );
    }
    return (
      <ul role="listbox" aria-label="Customers" className="divide-y">
        {filtered.map((c) => {
          const isSelected = c.id === value;
          return (
            <li key={c.id} role="option" aria-selected={isSelected}>
              <button
                type="button"
                onClick={() => onChange?.(c.id)}
                className={`flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left text-sm ${
                  isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.parentName}</span>
                  <span className="block truncate text-muted-foreground">
                    {c.studentName} · {c.subject}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs">
                  Rs {inr.format(Number(c.monthlyFee))}/mo
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div data-nexen-component="nx_components_CustomerPicker" className="flex w-full min-w-0 flex-col gap-2">
      <label htmlFor="customer-picker-search" className="text-sm font-medium">
        Customer
      </label>
      <input
        id="customer-picker-search"
        type="search"
        placeholder="Search parent or student name"
        value={query}
        onChange={handleSearch}
        autoComplete="off"
        className="h-10 w-full rounded-[var(--radius)] border bg-background px-3 text-sm"
      />
      {searchError && <p className="text-sm text-destructive">{searchError}</p>}

      <div className="w-full min-w-0 overflow-hidden rounded-[var(--radius)] border bg-card">
        <div className="max-h-64 overflow-y-auto">{renderBody()}</div>
      </div>

      {selected && (
        <p className="text-sm text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selected.parentName}</span> for{' '}
          {selected.studentName}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}