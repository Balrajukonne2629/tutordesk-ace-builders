
'use client'

import { useRouter } from 'next/navigation'
import SettingsForm from '@/components/SettingsForm'
import DemoDataCard from '@/components/DemoDataCard'

export default function SettingsPage() {
  const router = useRouter()

  function handleDemoLoaded() {
    router.refresh()
  }

  return (
    <main data-nexen-component="nx_app_settings_page" className="mx-auto w-full max-w-2xl min-w-0 space-y-6 bg-background px-4 py-6 text-foreground sm:py-10">
      <header className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Back office
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your name, UPI ID and opening cash. Changes apply once you save.
        </p>
      </header>

      <section
        aria-labelledby="tutor-settings-heading"
        className="min-w-0 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
      >
        <h2 id="tutor-settings-heading" className="text-lg font-semibold">
          Tutor details
        </h2>
        <SettingsForm />
      </section>

      <section
        aria-labelledby="demo-data-heading"
        className="min-w-0 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
      >
        <h2 id="demo-data-heading" className="text-lg font-semibold">
          Demo data
        </h2>
        <DemoDataCard onLoaded={handleDemoLoaded} />
      </section>
    </main>
  )
}