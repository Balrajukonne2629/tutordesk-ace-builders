
import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  count?: number;
  countLabel?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  count,
  countLabel,
  backHref,
  backLabel,
  actions,
}: PageHeaderProps) {
  const safeCount = typeof count === 'number' && Number.isFinite(count) ? count : null;
  const defaultCountLabel = safeCount === 1 ? 'item' : 'items';

  return (
    <header data-nexen-component="nx_components_PageHeader" className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="inline-flex text-sm text-muted-foreground hover:text-foreground"
          >
            {'← '}
            {backLabel}
          </Link>
        ) : null}

        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="break-words text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>

        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}

        {safeCount !== null ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{safeCount}</span>{' '}
            {countLabel ?? defaultCountLabel}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}