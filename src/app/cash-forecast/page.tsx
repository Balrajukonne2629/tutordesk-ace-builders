
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCashForecast } from '@/lib/api';
import CashForecastChart from '@/components/CashForecastChart';
import ForecastExplanation from '@/components/ForecastExplanation';
import ForecastShortfallBanner from '@/components/ForecastShortfallBanner';
import ForecastSummary from '@/components/ForecastSummary';
import HorizonToggle from '@/components/HorizonToggle';
import PageState from '@/components/PageState';

type Horizon = 30 | 60 | 90;
const HORIZONS: readonly Horizon[] = [30, 60, 90];
const DAYS_PARAM: Record<Horizon, '30' | '60' | '90'> = { 30: '30', 60: '60', 90: '90' };

type ForecastDay = { date: string; balance: number };
type CashForecastResponse = {
  days: number;
  starting_cash: number;
  lowest_balance: number;
  lowest_balance_date: string;
  shortfall_date: string | null;
  daily: ForecastDay[];
  explanation: string;
};

export default function CashForecastPage() {
  const router = useRouter();
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [data, setData] = useState<CashForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const load = useCallback(async (days: Horizon) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCashForecast({ days: DAYS_PARAM[days] });
      setData(result as CashForecastResponse);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Could not calculate the forecast.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(horizon);
  }, [horizon, load]);

  const handleHorizon = (days: number) => {
    const next = HORIZONS.find((h) => h === days);
    if (next === undefined) {
      setValidationError('Choose a forecast of 30, 60 or 90 days.');
      return;
    }
    setValidationError(null);
    setHorizon(next);
  };

  const shortfallAmount = data && data.lowest_balance < 0 ? -data.lowest_balance : null;
  const isEmpty = !data || data.daily.length === 0;

  return (
    <main data-nexen-component="nx_app_cash_forecast_page" className="mx-auto w-full max-w-3xl min-w-0 space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cash forecast</h1>
        <HorizonToggle value={horizon} onChange={handleHorizon} disabled={isLoading} />
      </div>

      {validationError && (
        <p role="alert" className="text-sm text-destructive">
          {validationError}
        </p>
      )}

      {error ? (
        <PageState
          state="error"
          title="Forecast not available"
          message={error}
          actionLabel="Try again"
          onAction={() => void load(horizon)}
        />
      ) : isLoading ? (
        <PageState
          state="loading"
          title="Calculating forecast"
          message={`Working out your cash for the next ${horizon} days.`}
          actionLabel="Retry"
          onAction={() => void load(horizon)}
        />
      ) : isEmpty || !data ? (
        <PageState
          state="empty"
          title="No cash data yet"
          message="Set your opening cash balance in Settings or load demo data to see a forecast."
          actionLabel="Go to Settings"
          onAction={() => router.push('/settings')}
        />
      ) : (
        <>
          <ForecastShortfallBanner
            shortfallAmount={shortfallAmount}
            shortfallDate={data.shortfall_date}
            horizonDays={horizon}
          />
          <ForecastSummary
            openingBalance={data.starting_cash}
            lowestBalance={data.lowest_balance}
            lowestBalanceDate={data.lowest_balance_date}
            shortfallDate={data.shortfall_date}
          />
          <div className="min-w-0 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
            <CashForecastChart series={data.daily} horizonDays={horizon} />
          </div>
          <ForecastExplanation explanation={data.explanation} />
        </>
      )}
    </main>
  );
}