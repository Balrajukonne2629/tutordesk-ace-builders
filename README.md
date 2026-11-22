# TutorDesk: The One-Person Back Office
ACE Builders Hackathon 2026, Problem Statement 1

Live app: https://PASTE-YOUR-VERCEL-URL-HERE  (deployment was still being fixed at the development deadline)
Demo: open Settings, then "Load demo data" (all data is synthetic)

## Problem
Home tutors run fees on WhatsApp and notebooks. Invoices go unsent, parents pay late, and the tutor cannot say who owes what or whether cash covers rent next month.

## Who it is for
A solo home tutor in India with 10-30 students, monthly fees of Rs 1,500-4,000, paid by UPI or cash.

## What it does
- Invoice to payment: create and bulk-generate invoices, UPI QR, full or partial payments
- Who owes me: outstanding, overdue, aging buckets, ranked chase table
- Assisted follow-ups: reminder drafts by tone, WhatsApp link, Hindi and Telugu option
- 30/60/90 day cash forecast with shortfall date
- What-if scenarios: a customer pays late, does not pay, or an unexpected expense
- Alerts with one action each, and Bad-Day mode when 5 or more customers are late
- Quick Log: paste a UPI or SMS text to log a payment

## Business model
Solo Rs 199/month, Small Team Rs 399/month. Next: UPI collection fee, coaching-class tier, then salons and clinics.

## How it was built
Built in the Codebenders IDE using the Nexen phases: PRD, personas, brand, screens, stack (Next.js 15, TypeScript, Prisma, PostgreSQL on Supabase), business logic (14 journeys, 255 rules), schema, API atlas, then Generate (144 plan items). All code was generated inside Codebenders. Phase specs are in .codebenders/phases.

## Known issues (unfinished build)
My credits ran out at the final validation step, so the last fix pass was not run. Some screens read API fields with a different naming style, so a few columns may be blank. The alerts API route is incomplete. Type-check errors are skipped at build time (next.config.mjs).

## Run locally
npm install, set DATABASE_URL and DIRECT_URL in .env, then npx prisma generate, npx prisma db push, npm run dev

All data is synthetic. No real personal data.
