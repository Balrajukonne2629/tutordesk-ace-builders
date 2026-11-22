'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerList from '@/components/CustomerList';
import CustomerSearchBar from '@/components/CustomerSearchBar';
import PageHeader from '@/components/PageHeader';
import PageState from '@/components/PageState';
import { getCustomers } from '@/lib/api';

type CustomerRows = ComponentProps<typeof CustomerList>['customers'];

const MAX_QUERY_LENGTH = 100;

export default function CustomersPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerRows>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);
    getCustomers(query ? { q: query } : undefined)
      .then((rows) => {
        if (!cancelled) setCustomers(rows);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  function handleSearch(value: string) {
    const trimmed = value.trim();
    if (trimmed.length > MAX_QUERY_LENGTH) {
      setSearchError('Search is limited to 100 characters. Try a shorter name.');
      return;
    }
    setSearchError(null);
    setQuery(trimmed);
  }

  const hasSearch = query.length > 0;
  const count = customers?.length ?? 0;

  let body: React.ReactNode;
  if (loadFailed) {
    body = (
      <PageState
        state="error"
        title="Customers could not be loaded"
        message="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => setReloadKey((k) => k + 1)}
        rows={3}
        icon={null}
      />
    );
  } else if (isLoading && customers === null) {
    body = (
      <PageState
        state="loading"
        title="Loading customers"
        message=""
        actionLabel=""
        onAction={() => {}}
        rows={3}
        icon={null}
      />
    );
  } else if (!hasSearch && customers !== null && customers.length === 0) {
    body = (
      <PageState
        state="empty"
        title="No customers yet"
        message="Add your first parent and student to start tracking fees."
        actionLabel="Add first customer"
        onAction={() => router.push('/customers/new')}
        rows={3}
        icon={null}
      />
    );
  } else {
    body = <CustomerList customers={customers} isSearching={hasSearch} />;
  }

  return (
    <main data-nexen-component="nx_app_customers_page" className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <PageHeader
        title="Customers"
        subtitle="Parents and students, what they pay and what is owed."
        eyebrow="Directory"
        count={count}
        countLabel="customers"
        backHref=""
        backLabel=""
        actions={
          <Link
            href="/customers/new"
            className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm sm:w-auto"
          >
            Add customer
          </Link>
        }
      />

      <div className="min-w-0 space-y-2">
        <CustomerSearchBar
          onSearch={handleSearch}
          resultCount={count}
          defaultValue={query}
        />
        {searchError ? (
          <p role="alert" className="text-sm text-destructive">
            {searchError}
          </p>
        ) : null}
      </div>

      <div className="min-w-0 overflow-x-auto">{body}</div>
    </main>
  );
}