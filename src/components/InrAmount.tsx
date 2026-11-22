import type { CSSProperties } from 'react';

export interface InrAmountProps {
  value: number | string | null | undefined;
  decimals?: number;
  className?: string;
}

const MISSING = '\u2014';

function toNumber(value: InrAmountProps['value']): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  const rest = intDigits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${grouped},${last3}`;
}

export function formatInr(value: number, decimals: number): string {
  const places = Math.min(Math.max(Math.trunc(decimals), 0), 2);
  const fixed = Math.abs(value).toFixed(places);
  const [intPart, fracPart] = fixed.split('.');
  const grouped = groupIndian(intPart);
  const isZero = Number(fixed) === 0;
  const sign = value < 0 && !isZero ? '-' : '';
  const body = fracPart !== undefined ? `${grouped}.${fracPart}` : grouped;
  return `${sign}Rs ${body}`;
}

const numericStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export function InrAmount({ value, decimals = 0, className }: InrAmountProps) {
  const n = toNumber(value);
  const text = n === null ? MISSING : formatInr(n, decimals);
  const classes = ['whitespace-nowrap', className].filter(Boolean).join(' ');

  return (
    <span data-nexen-component="nx_components_InrAmount" className={classes} style={numericStyle}>
      {text}
    </span>
  );
}

export default InrAmount;