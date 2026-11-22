PRODUCT: TutorDesk. One-person back office for an Indian home tutor.

SUMMARY
TutorDesk helps a solo home tutor (1-5 person micro-business, no accounting or admin staff) run fees like a business. It replaces WhatsApp chats, notebooks and spreadsheets. Core promise: the tutor always knows who owes them, how much, and since when, and whether cash will cover rent and bills over the next 30-90 days.

TARGET USER
Primary: a home tutor in India teaching 10-30 school students (Class 6-12) with monthly fees of Rs 1,500-4,000, collecting mostly by UPI and cash. Not tech-savvy, uses a phone first. 
Secondary (future, out of scope for build): salons, small clinics, freelance designers.

PROBLEM
Invoices go unsent, parents pay late, payments are not chased, the tutor cannot say who owes what, and cannot tell if there will be enough cash next month for rent, internet and materials. Small businesses fail because money arrives late and bills arrive on time.

CORE CAPABILITIES
1. Customers: manage parents/students (parent name, student name, fake phone, subject, monthly fee, billing day).
2. Invoices: create in under 30 seconds with auto number, line items, due date; bulk-generate all monthly invoices with preview; printable invoice with UPI ID and UPI QR; statuses draft, sent, partial, paid, overdue.
3. Payments: record full or partial payments (UPI, cash, bank); status updates automatically; no overpayment.
4. Quick log: paste a UPI/SMS/WhatsApp text like "Received Rs 2500 from Ramesh Kumar on 20 Nov via UPI"; rules parse amount, date, name, method; fuzzy match to customer and oldest unpaid invoice; confirm before saving.
5. Dashboard "who owes me, how much, since when": total outstanding, overdue amount, collected this month, cash in hand; aging buckets (not due, 1-7, 8-30, 30+ days); table sorted by amount x days overdue; customer detail with history and average days late.
6. Assisted follow-ups: reminder drafts by tone (Friendly, Firm, Final notice), auto-chosen by days late; editable; open in WhatsApp via wa.me link, copy, log as sent; warn if reminded in last 3 days; Hindi and Telugu option for the friendly template. Template based, no external AI API.
7. Cash forecast 30/60/90 days: start from cash balance; inflows = unpaid invoices at due date + that customer's average delay (from last 3 paid invoices) plus upcoming recurring fees; outflows = bills (rent, internet, materials, recurring monthly). Day-by-day balance line chart with negative zone, lowest balance and date, shortfall banner, plain-language "how this is calculated".
8. What-if scenarios with live chart vs baseline: a selected customer pays N days late; a customer does not pay; unexpected expense; everyone pays on time. Presets like "Biggest payer pays 15 days late". Show delta in lowest balance and shortfall date.
9. Alerts that lead to one clear action: overdue 3+ days -> "Chase [name] today"; 30+ days -> final notice; due tomorrow -> heads-up; forecast shortfall within 30 days -> "Collect Rs X by date" with which invoices to chase; bill due soon with low cash; billing day reached -> generate invoices. Priority critical/warning/info; dismiss and snooze.
10. Bad-day mode: when 5 or more customers are late, show ranked chase list (amount x days late), estimated cash recovered if top 3 pay, and "Draft all reminders" to review one by one.
11. Settings: tutor name, UPI ID, opening cash balance, reset demo data. First-run onboarding in 3 steps plus load demo data.

BUSINESS MODEL
Subscription: Solo Rs 199/month, Small Team Rs 399/month. Switch reason: recovering 2-3 late fees per month pays for it. Future revenue: UPI collection fee, batch/coaching-class tier, expansion to salons and clinics.

NON-GOALS
No real payment processing or bank integration. No accounting/GST/tax features. No external AI APIs. No real personal data: all data synthetic. No multi-user roles. No native mobile app (responsive web only).

CONSTRAINTS
Mobile-first, INR formatting (Rs 1,23,456), Indian date style. Synthetic seed data with dates relative to today: 16 students, 3 months of invoices and payments, mixed behavior (9 on time, 4 five-to-ten days late, 2 twenty-plus days late, 1 owes two months), at least 5 overdue today. Loading, empty and error states everywhere. Must be deployed with a public link.

SUCCESS
A judge can in 3 minutes: see who owes what, generate an invoice, record a payment, send a drafted reminder, see the 90-day forecast, run "biggest payer pays 15 days late", and act on an alert.