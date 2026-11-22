import PageHeader from '@/components/PageHeader'
import OnboardingSteps from '@/components/OnboardingSteps'

export default function OnboardingPage() {
  return (
    <div data-nexen-component="nx_app_onboarding_page" className="mx-auto w-full max-w-xl min-w-0 space-y-6 px-4 py-6 sm:py-8">
      <PageHeader
        title="Welcome to TutorDesk"
        subtitle="It takes three steps to set up. You can change these later in Settings."
      />
      <OnboardingSteps />
    </div>
  )
}