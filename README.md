# TutorDesk: The One-Person Back Office
ACE Builders Hackathon 2026, Problem Statement 1

Live app: https://tutordesk-ace-builders.vercel.app/
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

## Status and known issues (unfinished build)
The code in this repository was last committed before the development deadline. This README was written afterwards and changes no code.

My Codebenders credits ran out at the final API validation step (error 402, insufficient_balance), so the last fix pass was never run. What I know is still wrong:
- The alerts API route (src/app/api/alerts/route.ts) exports no handler, so the Alerts page and dashboard alert strip do not load data.
- The API client returns snake_case fields while several screens read camelCase, so the invoice detail, invoices list, payments, quick-log, reminders and what-if screens can show blank values or fail.
- Route handlers still type params as a plain object, which Next.js 15 expects as a Promise.
- The demo seed does not yet hit its targets: the Bad-Day banner showed 3 late customers with a tiny recovery amount instead of 5 or more.
- Type-check errors are skipped at build time (next.config.mjs) so the app could be deployed.

## Run locally
npm install, set DATABASE_URL and DIRECT_URL in .env, then npx prisma generate, npx prisma db push, npm run dev

All data is synthetic. No real personal data.
