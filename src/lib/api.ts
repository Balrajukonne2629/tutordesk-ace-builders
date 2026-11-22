'use client';

// Auto-generated typed API client — the app's single fetch surface.
// Request bodies are typed against the database schema, so calling an
// endpoint with the wrong field names is a compile error. Do not hand-
// edit — regenerate from the API atlas + schema instead.

import { getToken } from '@/lib/authToken';

// Mock mode: the IDE preview boots before any database exists, so the
// single fetch surface answers locally instead of calling routes that
// would fail on a missing DATABASE_URL. Mirrors the demo session in
// @/lib/authContext so both auth surfaces agree.
// The `process.env.NEXT_PUBLIC_MOCK_MODE` form is deliberate: Next inlines
// that EXACT text at build time. `process.env?.X` or a computed key is not
// matched by the inliner, so it would compile to a lookup that is always
// undefined in the browser bundle — the same way a dynamic
// `process.env['NEXT_PUBLIC_' + name]` once left the preview inspector
// permanently inert. Do not add optional chaining here.
const __NEXEN_IS_MOCK__ =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_MOCK_MODE === 'true') ||
  (typeof process !== 'undefined' && process.env.MOCK_MODE === 'true') ||
  ((globalThis as unknown as { __NEXEN_MOCK__?: boolean }).__NEXEN_MOCK__ === true);

const __NEXEN_DEMO_USER__ = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@example.com',
  name: 'Demo User',
  role: 'home_tutor',
};

const __NEXEN_MOCK_ROWS__: Record<string, any[]> = {
  "tutor_profiles": [
    {
      "id": "tutor_profile_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "name": "Meera Krishnan",
      "upiId": "meera.tutor@okaxis",
      "openingCashBalance": 18500,
      "onboardingCompleted": true
    },
    {
      "id": "tutor_profile_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "name": "Suresh Babu",
      "upiId": "upi_002",
      "openingCashBalance": 7200,
      "onboardingCompleted": false
    },
    {
      "id": "tutor_profile_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "name": "Anjali Deshpande",
      "upiId": "anjali.d@ybl",
      "openingCashBalance": 9200,
      "onboardingCompleted": true
    },
    {
      "id": "tutor_profile_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "name": "Rahul Menon",
      "upiId": "rahul.menon@paytm",
      "openingCashBalance": 12750,
      "onboardingCompleted": true
    }
  ],
  "customers": [
    {
      "id": "customer_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "parentName": "Sunita Iyer",
      "studentName": "Ananya Iyer",
      "phone": "+91 98450 11203",
      "subject": "Maths (Class 10)",
      "monthlyFee": 2500,
      "billingDay": 5,
      "isActive": true,
      "isDemo": true
    },
    {
      "id": "customer_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "parentName": "Rakesh Gowda",
      "studentName": "Kiran Gowda",
      "phone": "+91 99012 45876",
      "subject": "Science (Class 8)",
      "monthlyFee": 2000,
      "billingDay": 1,
      "isActive": true,
      "isDemo": true
    },
    {
      "id": "customer_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "parentName": "Farhana Sheikh",
      "studentName": "Zoya Sheikh",
      "phone": "+91 97410 36582",
      "subject": "Physics (Class 12)",
      "monthlyFee": 3500,
      "billingDay": 10,
      "isActive": true,
      "isDemo": true
    },
    {
      "id": "customer_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "parentName": "Mohan Reddy",
      "studentName": "Teja Reddy",
      "phone": "+91 98661 20734",
      "subject": "English (Class 7)",
      "monthlyFee": 1800,
      "billingDay": 3,
      "isActive": true,
      "isDemo": true
    },
    {
      "id": "customer_005",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "parentName": "Priya Nair",
      "studentName": "Aarav Nair",
      "phone": "+91 90039 77145",
      "subject": "Maths (Class 6)",
      "monthlyFee": 1500,
      "billingDay": 1,
      "isActive": false,
      "isDemo": true
    },
    {
      "id": "customer_006",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "parentName": "Deepak Joshi",
      "studentName": "Riya Joshi",
      "phone": "+91 98230 54198",
      "subject": "Maths (Class 9)",
      "monthlyFee": 2200,
      "billingDay": 15,
      "isActive": true,
      "isDemo": true
    }
  ],
  "invoices": [
    {
      "id": "invoice_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "invoiceNumber": "TD-2025-029",
      "customerId": "customer_001",
      "billingMonth": "2025-03-01T00:00:00.000Z",
      "issuedDate": "2025-03-15T00:00:00.000Z",
      "dueDate": "2025-03-22T00:00:00.000Z",
      "totalAmount": 2200,
      "status": "paid",
      "sentAt": "2025-03-15T10:05:00.000Z",
      "paidAt": "2025-03-30T16:42:00.000Z",
      "isDemo": true
    },
    {
      "id": "invoice_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "invoiceNumber": "TD-2025-031",
      "customerId": "customer_002",
      "billingMonth": "2025-04-01T00:00:00.000Z",
      "issuedDate": "2025-04-05T00:00:00.000Z",
      "dueDate": "2025-04-12T00:00:00.000Z",
      "totalAmount": 2500,
      "status": "overdue",
      "sentAt": "2025-04-05T09:20:00.000Z",
      "paidAt": "2026-02-15T10:00:00Z",
      "isDemo": true
    },
    {
      "id": "invoice_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "invoiceNumber": "TD-2025-032",
      "customerId": "customer_003",
      "billingMonth": "2025-04-01T00:00:00.000Z",
      "issuedDate": "2025-04-01T00:00:00.000Z",
      "dueDate": "2025-04-08T00:00:00.000Z",
      "totalAmount": 2000,
      "status": "paid",
      "sentAt": "2025-04-01T08:45:00.000Z",
      "paidAt": "2025-04-06T11:30:00.000Z",
      "isDemo": true
    },
    {
      "id": "invoice_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "invoiceNumber": "TD-2025-033",
      "customerId": "customer_004",
      "billingMonth": "2025-04-01T00:00:00.000Z",
      "issuedDate": "2025-04-10T00:00:00.000Z",
      "dueDate": "2025-04-17T00:00:00.000Z",
      "totalAmount": 3500,
      "status": "partial",
      "sentAt": "2025-04-10T19:10:00.000Z",
      "paidAt": "2026-04-15T10:00:00Z",
      "isDemo": true
    },
    {
      "id": "invoice_005",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "invoiceNumber": "TD-2025-034",
      "customerId": "customer_005",
      "billingMonth": "2025-04-01T00:00:00.000Z",
      "issuedDate": "2025-04-12T00:00:00.000Z",
      "dueDate": "2025-04-20T00:00:00.000Z",
      "totalAmount": 1800,
      "status": "sent",
      "sentAt": "2025-04-12T07:55:00.000Z",
      "paidAt": "2026-05-15T10:00:00Z",
      "isDemo": true
    },
    {
      "id": "invoice_006",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "invoiceNumber": "TD-2025-035",
      "customerId": "customer_006",
      "billingMonth": "2025-05-01T00:00:00.000Z",
      "issuedDate": "2025-05-01T00:00:00.000Z",
      "dueDate": "2025-05-08T00:00:00.000Z",
      "totalAmount": 3000,
      "status": "draft",
      "sentAt": "2026-06-15T10:00:00Z",
      "paidAt": "2026-06-15T10:00:00Z",
      "isDemo": true
    }
  ],
  "invoice_line_items": [
    {
      "id": "invoice_line_item_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "invoiceId": "invoice_001",
      "description": "Maths tuition - March 2025",
      "quantity": 1,
      "unitPrice": 2200,
      "amount": 2200,
      "isDemo": true
    },
    {
      "id": "invoice_line_item_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "invoiceId": "invoice_002",
      "description": "Maths tuition - April 2025",
      "quantity": 1,
      "unitPrice": 2500,
      "amount": 2500,
      "isDemo": true
    },
    {
      "id": "invoice_line_item_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "invoiceId": "invoice_003",
      "description": "Science tuition - April 2025",
      "quantity": 1,
      "unitPrice": 2000,
      "amount": 2000,
      "isDemo": true
    },
    {
      "id": "invoice_line_item_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "invoiceId": "invoice_004",
      "description": "Physics tuition - April 2025",
      "quantity": 1,
      "unitPrice": 3500,
      "amount": 3500,
      "isDemo": true
    },
    {
      "id": "invoice_line_item_005",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "invoiceId": "invoice_005",
      "description": "English tuition - April 2025",
      "quantity": 1,
      "unitPrice": 1800,
      "amount": 1800,
      "isDemo": true
    },
    {
      "id": "invoice_line_item_006",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "invoiceId": "invoice_006",
      "description": "Chemistry tuition - May 2025",
      "quantity": 1,
      "unitPrice": 3000,
      "amount": 3000,
      "isDemo": true
    }
  ],
  "payments": [
    {
      "id": "payment_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "customerId": "customer_001",
      "invoiceId": "invoice_001",
      "amount": 2200,
      "receivedOn": "2025-03-30T00:00:00.000Z",
      "method": "bank",
      "reference": "NEFT-HDFC88214",
      "source": "manual",
      "isDemo": true
    },
    {
      "id": "payment_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "customerId": "customer_002",
      "invoiceId": "invoice_002",
      "amount": 2000,
      "receivedOn": "2025-04-06T00:00:00.000Z",
      "method": "upi",
      "reference": "UPI412908731",
      "source": "quick_log",
      "isDemo": true
    },
    {
      "id": "payment_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "customerId": "customer_003",
      "invoiceId": "invoice_003",
      "amount": 2000,
      "receivedOn": "2025-04-14T00:00:00.000Z",
      "method": "upi",
      "reference": "UPI418830215",
      "source": "quick_log",
      "isDemo": true
    },
    {
      "id": "payment_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "customerId": "customer_004",
      "invoiceId": "invoice_004",
      "amount": 1800,
      "receivedOn": "2025-03-04T00:00:00.000Z",
      "method": "cash",
      "reference": "sample_reference_4",
      "source": "manual",
      "isDemo": true
    },
    {
      "id": "payment_005",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "customerId": "customer_005",
      "invoiceId": "invoice_005",
      "amount": 3000,
      "receivedOn": "2025-03-08T00:00:00.000Z",
      "method": "upi",
      "reference": "UPI407715692",
      "source": "quick_log",
      "isDemo": true
    },
    {
      "id": "payment_006",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "customerId": "customer_006",
      "invoiceId": "invoice_006",
      "amount": 500,
      "receivedOn": "2025-04-11T00:00:00.000Z",
      "method": "cash",
      "reference": "sample_reference_6",
      "source": "manual",
      "isDemo": true
    }
  ],
  "bills": [
    {
      "id": "bill_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "name": "Flat rent - Koramangala",
      "category": "rent",
      "amount": 12000,
      "dueDate": "2025-05-01T00:00:00.000Z",
      "isRecurring": true,
      "status": "unpaid",
      "paidOn": "2026-01-15T10:00:00Z",
      "isDemo": true
    },
    {
      "id": "bill_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "name": "Broadband - ACT Fibernet",
      "category": "internet",
      "amount": 899,
      "dueDate": "2025-04-20T00:00:00.000Z",
      "isRecurring": true,
      "status": "unpaid",
      "paidOn": "2026-02-15T10:00:00Z",
      "isDemo": true
    },
    {
      "id": "bill_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "name": "Whiteboard markers and worksheets",
      "category": "materials",
      "amount": 650,
      "dueDate": "2025-04-05T00:00:00.000Z",
      "isRecurring": false,
      "status": "paid",
      "paidOn": "2025-04-03T00:00:00.000Z",
      "isDemo": true
    },
    {
      "id": "bill_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "name": "Mobile recharge - Jio",
      "category": "other",
      "amount": 399,
      "dueDate": "2025-04-16T00:00:00.000Z",
      "isRecurring": true,
      "status": "unpaid",
      "paidOn": "2026-04-15T10:00:00Z",
      "isDemo": true
    },
    {
      "id": "bill_005",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "name": "Printer ink cartridges",
      "category": "materials",
      "amount": 1100,
      "dueDate": "2025-04-25T00:00:00.000Z",
      "isRecurring": false,
      "status": "unpaid",
      "paidOn": "2026-05-15T10:00:00Z",
      "isDemo": true
    },
    {
      "id": "bill_006",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "name": "Scheduling app subscription",
      "category": "other",
      "amount": 499,
      "dueDate": "2025-03-28T00:00:00.000Z",
      "isRecurring": true,
      "status": "paid",
      "paidOn": "2025-03-27T00:00:00.000Z",
      "isDemo": true
    }
  ],
  "reminders": [
    {
      "id": "reminder_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "customerId": "customer_001",
      "invoiceId": "invoice_001",
      "alertId": "alert_001",
      "tone": "friendly",
      "language": "english",
      "messageBody": "Hi Sunita, a gentle reminder that April's maths fee of Rs 2500 for Ananya is still pending. Thank you!",
      "daysLateAtCreation": 3,
      "status": "sent",
      "channel": "whatsapp",
      "sentAt": "2025-04-13T09:30:00.000Z",
      "isDemo": true,
      "badDayBatchId": "BD-2025-04-14",
      "badDayRank": 1
    },
    {
      "id": "reminder_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "customerId": "customer_002",
      "invoiceId": "invoice_002",
      "alertId": "alert_002",
      "tone": "firm",
      "language": "hindi",
      "messageBody": "नमस्ते Sunita ji, अप्रैल की फीस ₹2500 अभी बकाया है। कृपया जल्द UPI से भुगतान करें।",
      "daysLateAtCreation": 7,
      "status": "draft",
      "channel": "sample_channel_2",
      "sentAt": "2026-02-15T10:00:00Z",
      "isDemo": true,
      "badDayBatchId": "BD-2025-04-14",
      "badDayRank": 2
    },
    {
      "id": "reminder_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "customerId": "customer_003",
      "invoiceId": "invoice_003",
      "alertId": "alert_003",
      "tone": "final_notice",
      "language": "english",
      "messageBody": "Hi Farhana, Rs 1500 balance on Zoya's April fee was due 17 April. Please clear it by 20 April to keep the slot.",
      "daysLateAtCreation": 2,
      "status": "sent",
      "channel": "copy",
      "sentAt": "2025-04-14T18:00:00.000Z",
      "isDemo": true,
      "badDayBatchId": "baddaybatch_003",
      "badDayRank": 17
    },
    {
      "id": "reminder_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "customerId": "customer_004",
      "invoiceId": "invoice_004",
      "alertId": "alert_004",
      "tone": "friendly",
      "language": "telugu",
      "messageBody": "నమస్కారం మోహన్ గారు, తేజ ఏప్రిల్ నెల ఫీజు ₹1800 ఇంకా రావలసి ఉంది. ధన్యవాదాలు.",
      "daysLateAtCreation": 0,
      "status": "draft",
      "channel": "sample_channel_4",
      "sentAt": "2026-04-15T10:00:00Z",
      "isDemo": true,
      "badDayBatchId": "baddaybatch_004",
      "badDayRank": 24
    },
    {
      "id": "reminder_005",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "customerId": "customer_005",
      "invoiceId": "invoice_005",
      "alertId": "alert_005",
      "tone": "firm",
      "language": "english",
      "messageBody": "Hi Sunita, Ananya's April fee of Rs 2500 is now 3 days past due. Please pay via UPI using the ID on your invoice.",
      "daysLateAtCreation": 3,
      "status": "sent",
      "channel": "other",
      "sentAt": "2025-04-13T12:15:00.000Z",
      "isDemo": true,
      "badDayBatchId": "baddaybatch_005",
      "badDayRank": 31
    }
  ],
  "alerts": [
    {
      "id": "alert_001",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z",
      "alertType": "overdue_chase",
      "severity": "critical",
      "message": "Ananya's April fee Rs 2500 is 3 days overdue",
      "actionLabel": "Send reminder",
      "status": "open",
      "snoozedUntil": "2026-01-15T10:00:00Z",
      "dismissedAt": "2026-01-15T10:00:00Z",
      "actedAt": "2026-01-15T10:00:00Z",
      "shortfallDate": "2026-01-15T10:00:00Z",
      "dueDate": "2025-04-12T00:00:00.000Z",
      "customerId": "customer_001",
      "invoiceId": "invoice_001",
      "billId": "bill_001",
      "dedupeKey": "overdue_chase:TD-2025-031",
      "isDemo": true,
      "invoiceIds": {}
    },
    {
      "id": "alert_002",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "alertType": "bill_due_low_cash",
      "severity": "warning",
      "message": "Mobile recharge Rs 399 due tomorrow",
      "actionLabel": "Mark as paid",
      "status": "open",
      "snoozedUntil": "2026-02-15T10:00:00Z",
      "dismissedAt": "2026-02-15T10:00:00Z",
      "actedAt": "2026-02-15T10:00:00Z",
      "shortfallDate": "2026-02-15T10:00:00Z",
      "dueDate": "2025-04-16T00:00:00.000Z",
      "customerId": "customer_002",
      "invoiceId": "invoice_002",
      "billId": "bill_002",
      "dedupeKey": "bill_due_low_cash:jio-recharge-2025-04",
      "isDemo": true,
      "invoiceIds": {}
    },
    {
      "id": "alert_003",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "alertType": "forecast_shortfall",
      "severity": "critical",
      "message": "Cash may fall Rs 4,200 short on 1 May for rent",
      "actionLabel": "Review forecast",
      "status": "open",
      "snoozedUntil": "2026-03-15T10:00:00Z",
      "dismissedAt": "2026-03-15T10:00:00Z",
      "actedAt": "2026-03-15T10:00:00Z",
      "shortfallDate": "2025-05-01T00:00:00.000Z",
      "dueDate": "2026-03-15T10:00:00Z",
      "customerId": "customer_003",
      "invoiceId": "invoice_003",
      "billId": "bill_003",
      "dedupeKey": "forecast_shortfall:2025-05-01",
      "isDemo": true,
      "invoiceIds": {}
    },
    {
      "id": "alert_004",
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z",
      "alertType": "bill_due_low_cash",
      "severity": "warning",
      "message": "Rent Rs 12000 due 1 May; balance covers Rs 9,800",
      "actionLabel": "Plan payments",
      "status": "snoozed",
      "snoozedUntil": "2025-04-18T09:00:00.000Z",
      "dismissedAt": "2026-04-15T10:00:00Z",
      "actedAt": "2026-04-15T10:00:00Z",
      "shortfallDate": "2026-04-15T10:00:00Z",
      "dueDate": "2025-05-01T00:00:00.000Z",
      "customerId": "customer_004",
      "invoiceId": "invoice_004",
      "billId": "bill_004",
      "dedupeKey": "bill_due_low_cash:rent-2025-05",
      "isDemo": true,
      "invoiceIds": {}
    },
    {
      "id": "alert_005",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z",
      "alertType": "billing_day_reached",
      "severity": "info",
      "message": "Billing day reached for Sai Rao. April invoice is ready",
      "actionLabel": "Review and send",
      "status": "acted",
      "snoozedUntil": "2026-05-15T10:00:00Z",
      "dismissedAt": "2026-05-15T10:00:00Z",
      "actedAt": "2025-04-07T10:20:00.000Z",
      "shortfallDate": "2026-05-15T10:00:00Z",
      "dueDate": "2026-05-15T10:00:00Z",
      "customerId": "customer_005",
      "invoiceId": "invoice_005",
      "billId": "bill_005",
      "dedupeKey": "billing_day_reached:sai-rao-2025-04",
      "isDemo": true,
      "invoiceIds": {}
    },
    {
      "id": "alert_006",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "alertType": "final_notice",
      "severity": "critical",
      "message": "Zoya's Rs 1500 balance is 2 days overdue",
      "actionLabel": "Send final notice",
      "status": "dismissed",
      "snoozedUntil": "2026-06-15T10:00:00Z",
      "dismissedAt": "2025-04-14T11:00:00.000Z",
      "actedAt": "2026-06-15T10:00:00Z",
      "shortfallDate": "2026-06-15T10:00:00Z",
      "dueDate": "2025-04-17T00:00:00.000Z",
      "customerId": "customer_006",
      "invoiceId": "invoice_006",
      "billId": "bill_006",
      "dedupeKey": "final_notice:TD-2025-033",
      "isDemo": true,
      "invoiceIds": {}
    }
  ]
};
__NEXEN_MOCK_ROWS__["tutor-profiles"] = __NEXEN_MOCK_ROWS__["tutor_profiles"];
__NEXEN_MOCK_ROWS__["tutorProfiles"] = __NEXEN_MOCK_ROWS__["tutor_profiles"];
__NEXEN_MOCK_ROWS__["invoiceLineItems"] = __NEXEN_MOCK_ROWS__["invoice_line_items"];
__NEXEN_MOCK_ROWS__["invoice-line-items"] = __NEXEN_MOCK_ROWS__["invoice_line_items"];

// ── Sample-data changes: kept for this browser tab ──────────────────────────
const __NEXEN_SAMPLE_KEY__ = 'nexen.sample.6270e8a849f5';
let __sampleLoaded = false;
const __sampleCreated = new Set<string>();
const __sampleAnswered = new WeakMap<object, any>();
function __sampleTables(): string[] {
  const keys = Object.keys(__NEXEN_MOCK_ROWS__);
  return keys.filter((k, i) => keys.findIndex((j) => __NEXEN_MOCK_ROWS__[j] === __NEXEN_MOCK_ROWS__[k]) === i);
}
function __sampleLoad(): void {
  if (__sampleLoaded) return;
  __sampleLoaded = true;
  try {
    const saved = JSON.parse(globalThis.sessionStorage?.getItem(__NEXEN_SAMPLE_KEY__) ?? 'null');
    if (!saved || typeof saved !== 'object') return;
    for (const t of __sampleTables()) {
      const kept = saved.rows?.[t];
      if (Array.isArray(kept)) __NEXEN_MOCK_ROWS__[t].splice(0, __NEXEN_MOCK_ROWS__[t].length, ...kept);
    }
    for (const id of Array.isArray(saved.created) ? saved.created : []) __sampleCreated.add(String(id));
  } catch { /* blocked or unreadable storage: the sample rows as shipped */ }
}
function __sampleSave(): void {
  try {
    const rows: Record<string, any[]> = {};
    for (const t of __sampleTables()) rows[t] = __NEXEN_MOCK_ROWS__[t];
    globalThis.sessionStorage?.setItem(__NEXEN_SAMPLE_KEY__, JSON.stringify({ rows, created: Array.from(__sampleCreated) }));
  } catch { /* full or blocked: kept until the page reloads */ }
  // The IDE preview says, once, that this went to sample data only.
  try {
    if (typeof window !== 'undefined' && window.parent !== window) window.parent.postMessage({ type: 'nexen:sample-write' }, '*');
  } catch { /* no preview around this page */ }
}
function __sampleFind(all: any[], id: string): number {
  return all.findIndex((r) => String(r.id) === String(id) || String(r.slug) === String(id));
}
/** A field the person did not fill, as a new row of theirs would hold it. Links and
 *  status-like values keep a sample row's (pages read them); its text, dates and counts do
 *  not: a new habit showed "Sample description for record 1" and its reminder. */
function __sampleBlank(k: string, v: any): any {
  if (/(Id|_id)$/.test(k) || /status|state|role|type|kind|priority|category|level|currency|unit|visibility/i.test(k)) return v;
  if (Array.isArray(v)) return [];
  if (v && typeof v === 'object') return v;
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return false;
  return null;
}
/** A new row: a sample row's fields (what pages read), the person's values in them. */
function __sampleInsert(table: string, body: any, links?: Record<string, string>): any {
  if (body && typeof body === 'object' && __sampleAnswered.has(body)) return __sampleAnswered.get(body);
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? (__NEXEN_MOCK_ROWS__[table] = []);
  const like: any = all[0] ?? {};
  const now = new Date().toISOString();
  const row: any = {};
  for (const [k, v] of Object.entries(like)) row[k] = __sampleBlank(k, v);
  Object.assign(row, body && typeof body === 'object' ? body : {}, links ?? {});
  row.id = typeof like.id === 'number'
    ? all.reduce((m: number, r: any) => Math.max(m, Number(r.id) || 0), 0) + 1
    : (globalThis.crypto?.randomUUID?.() ?? `sample-${Date.now().toString(36)}`);
  if ('slug' in like && !(body && body.slug)) row.slug = String(row.id);
  for (const k of ['createdAt', 'updatedAt', 'created_at', 'updated_at']) if (k in like) row[k] = now;
  all.unshift(row);
  __sampleCreated.add(String(row.id));
  if (body && typeof body === 'object') __sampleAnswered.set(body, row);
  __sampleSave();
  return row;
}
function __sampleUpdate(table: string, id: string, body: any): any {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  const changes: any = { ...(body && typeof body === 'object' ? body : {}) };
  delete changes.id;
  const i = __sampleFind(all, id);
  if (i < 0) return { ...__mockRow(table, id), ...changes };
  Object.assign(all[i], changes);
  for (const k of ['updatedAt', 'updated_at']) if (k in all[i]) all[i][k] = new Date().toISOString();
  __sampleSave();
  return all[i];
}
function __sampleDelete(table: string, id: string): undefined {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  const i = __sampleFind(all, id);
  if (i >= 0) {
    all.splice(i, 1);
    __sampleSave();
  }
  return undefined;
}
/** A write no designed endpoint answers, applied to the table its path names. */
function __sampleWrite(method: string, path: string, body: any): any {
  const segs = path.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i -= 1) {
    if (!__NEXEN_MOCK_ROWS__[segs[i]]) continue;
    if (i === segs.length - 1 && method === 'POST') return __sampleInsert(segs[i], body);
    if (i === segs.length - 2 && (method === 'PATCH' || method === 'PUT')) return __sampleUpdate(segs[i], decodeURIComponent(segs[i + 1]), body);
    if (i === segs.length - 2 && method === 'DELETE') return __sampleDelete(segs[i], decodeURIComponent(segs[i + 1]));
    return undefined;
  }
  return undefined;
}

function __mockRows(table: string, where?: Record<string, string>): any[] {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  if (!where || !Object.keys(where).length) return all;
  const hit = all.filter((r) => Object.entries(where).every(([k, v]) => String(r[k]) === String(v)));
  // A parent added in this tab has no children yet: none, not every sample row.
  return hit.length || Object.values(where).some((v) => __sampleCreated.has(String(v))) ? hit : all;
}

function __mockRow(table: string, id?: string): any {
  __sampleLoad();
  const all = __NEXEN_MOCK_ROWS__[table] ?? [];
  return (id !== undefined && all.find((r) => String(r.id) === String(id) || String(r.slug) === String(id))) || all[0] || {};
}

/** One answer per designed endpoint, in the shape the API Layer declares for it. */
const __NEXEN_MOCK_ROUTES__: Array<[string, RegExp, (p: string[], body: any) => any]> = [
  ["GET", /^\/api\/invoice-batches\/preview$/, (p, body) => ({ "billing_month": "sample_billing_month_1", "proposed": [({ "customer_id": "customer__001", "customer_name": "sample_customer_name_1", "amount": 3, "due_date": "2026-01-15T10:00:00Z" })], "skipped": [({ "customer_id": "customer__001", "reason": "sample_reason_1" })], "total_amount": 3 })],
  ["POST", /^\/api\/reminders\/drafts-bulk$/, (p, body) => __mockRows("reminders")],
  ["POST", /^\/api\/quick-log\/confirm$/, (p, body) => __mockRow("payments")],
  ["POST", /^\/api\/reminders\/preview$/, (p, body) => ({ "tone": "sample_tone_1", "days_late_at_creation": 3, "message_body": "Sample message_body for record 1", "recently_reminded": true })],
  ["GET", /^\/api\/what-if-scenarios$/, (p, body) => ({ "baseline": ({ "daily": [({ "date": "2026-01-15T10:00:00Z", "balance": 3 })], "lowest_balance": 3, "shortfall_date": "2026-01-15T10:00:00Z" }), "scenario": ({ "daily": [({ "date": "2026-01-15T10:00:00Z", "balance": 3 })], "lowest_balance": 3, "shortfall_date": "2026-01-15T10:00:00Z" }), "lowest_balance_delta": 3, "shortfall_date_delta_days": 3 })],
  ["POST", /^\/api\/quick-log\/parse$/, (p, body) => ({ "amount": 3, "received_on": "sample_received_on_1", "payer_name": "sample_payer_name_1", "method": "sample_method_1", "candidates": [({ "customer_id": "customer__001", "customer_name": "sample_customer_name_1", "score": 3 })], "matched_customer_id": "matched_customer__001", "target_invoice": ({ "id": "id_001", "invoice_number": "sample_invoice_number_1", "outstanding_amount": 3 }) })],
  ["POST", /^\/api\/invoice-batches$/, (p, body) => ({ "created": __mockRows("invoices"), "skipped": [({ "customer_id": "customer__001", "reason": "sample_reason_1" })] })],
  ["GET", /^\/api\/tutor-profiles$/, (p, body) => __mockRow("tutor_profiles")],
  ["GET", /^\/api\/cash-forecast$/, (p, body) => ({ "days": 3, "starting_cash": 3, "lowest_balance": 3, "lowest_balance_date": "2026-01-15T10:00:00Z", "shortfall_date": "2026-01-15T10:00:00Z", "daily": [({ "date": "2026-01-15T10:00:00Z", "balance": 3 })], "explanation": "sample_explanation_1" })],
  ["POST", /^\/api\/demo-data$/, (p, body) => ({ "bills": 3 })],
  ["GET", /^\/api\/dashboard$/, (p, body) => ({ "total_outstanding": 3, "overdue_amount": 3, "collected_this_month": 3, "cash_in_hand": 3, "aging_buckets": [({ "bucket": "sample_bucket_1", "balance": 3, "count": 3 })], "chase_table": [({ "customer_id": "customer__001", "customer_name": "sample_customer_name_1", "overdue_amount": 3, "max_days_late": 3, "rank_score": 3 })] })],
  ["GET", /^\/api\/customers$/, (p, body) => __mockRows("customers").map((r: any) => ({ ...r, ...(({ "current_balance": 3 })) }))],
  ["POST", /^\/api\/customers$/, (p, body) => __sampleInsert("customers", body)],
  ["GET", /^\/api\/reminders$/, (p, body) => __mockRows("reminders")],
  ["POST", /^\/api\/reminders$/, (p, body) => __sampleInsert("reminders", body)],
  ["GET", /^\/api\/invoices$/, (p, body) => [({ "id": "id_001", "invoice_number": "sample_invoice_number_1", "customer_id": "customer__001", "customer_name": "sample_customer_name_1", "due_date": "2026-01-15T10:00:00Z", "total_amount": 3, "outstanding_amount": 3, "status": "active" })]],
  ["POST", /^\/api\/invoices$/, (p, body) => __sampleInsert("invoices", body)],
  ["GET", /^\/api\/payments$/, (p, body) => [({ "id": "id_001", "received_on": "sample_received_on_1", "customer_id": "customer__001", "customer_name": "sample_customer_name_1", "invoice_id": "invoice__001", "invoice_number": "sample_invoice_number_1", "amount": 3, "method": "sample_method_1", "source": "sample_source_1" })]],
  ["POST", /^\/api\/payments$/, (p, body) => __sampleInsert("payments", body)],
  ["GET", /^\/api\/bad-day$/, (p, body) => ({ "is_active": true, "late_customer_count": 3, "ranked": [({ "customer_id": "customer__001", "customer_name": "sample_customer_name_1", "overdue_amount": 3, "days_late": 3, "score": 3 })], "estimated_recovery": 3 })],
  ["GET", /^\/api\/alerts$/, (p, body) => __mockRows("alerts")],
  ["GET", /^\/api\/bills$/, (p, body) => __mockRows("bills")],
  ["POST", /^\/api\/bills$/, (p, body) => __sampleInsert("bills", body)],
  ["GET", /^\/api\/reminders\/([^\/]+)\/whatsapp-link$/, (p, body) => ({ "url": "#" })],
  ["POST", /^\/api\/invoices\/([^\/]+)\/line-items$/, (p, body) => __sampleInsert("invoice_line_items", body, { invoiceId: p[0] })],
  ["POST", /^\/api\/reminders\/([^\/]+)\/mark-sent$/, (p, body) => __mockRow("reminders", p[0])],
  ["POST", /^\/api\/bills\/([^\/]+)\/mark-paid$/, (p, body) => __mockRow("bills", p[0])],
  ["GET", /^\/api\/invoices\/([^\/]+)\/print$/, (p, body) => ({ "invoice_number": "sample_invoice_number_1", "tutor_name": "sample_tutor_name_1", "upi_id": "upi__001", "upi_qr_payload": "sample_upi_qr_payload_1", "customer_name": "sample_customer_name_1", "line_items": __mockRows("invoice_line_items", { invoiceId: p[0] }), "total_amount": 3, "outstanding_amount": 3, "due_date": "2026-01-15T10:00:00Z" })],
  ["POST", /^\/api\/alerts\/([^\/]+)\/dismiss$/, (p, body) => __mockRow("alerts", p[0])],
  ["PATCH", /^\/api\/tutor-profiles\/([^\/]+)$/, (p, body) => __sampleUpdate("tutor_profiles", p[0], body)],
  ["POST", /^\/api\/invoices\/([^\/]+)\/send$/, (p, body) => __mockRow("invoices", p[0])],
  ["POST", /^\/api\/alerts\/([^\/]+)\/snooze$/, (p, body) => __mockRow("alerts", p[0])],
  ["POST", /^\/api\/alerts\/([^\/]+)\/act$/, (p, body) => __mockRow("alerts", p[0])],
  ["GET", /^\/api\/customers\/([^\/]+)$/, (p, body) => ({ "customer": __mockRow("customers", p[0]), "outstanding_total": 3, "average_days_late": 3, "invoices": [({ "invoice": __mockRow("invoices"), "aging_bucket": "sample_aging_bucket_1", "payments": __mockRows("payments", { customerId: p[0] }) })], "habit_markers": [({ "month": "sample_month_1", "marker": "sample_marker_1" })] })],
  ["PATCH", /^\/api\/customers\/([^\/]+)$/, (p, body) => __sampleUpdate("customers", p[0], body)],
  ["DELETE", /^\/api\/customers\/([^\/]+)$/, (p, body) => __sampleDelete("customers", p[0])],
  ["GET", /^\/api\/reminders\/([^\/]+)$/, (p, body) => ({ ...(__mockRow("reminders", p[0])), ...(({ "recently_reminded": true })) })],
  ["PATCH", /^\/api\/reminders\/([^\/]+)$/, (p, body) => __sampleUpdate("reminders", p[0], body)],
  ["DELETE", /^\/api\/reminders\/([^\/]+)$/, (p, body) => __sampleDelete("reminders", p[0])],
  ["GET", /^\/api\/invoices\/([^\/]+)$/, (p, body) => ({ "invoice": __mockRow("invoices", p[0]), "customer_name": "sample_customer_name_1", "line_items": __mockRows("invoice_line_items", { invoiceId: p[0] }), "payments": __mockRows("payments", { invoiceId: p[0] }), "outstanding_amount": 3, "aging_bucket": "sample_aging_bucket_1" })],
  ["PATCH", /^\/api\/invoices\/([^\/]+)$/, (p, body) => __sampleUpdate("invoices", p[0], body)],
  ["DELETE", /^\/api\/invoices\/([^\/]+)$/, (p, body) => __sampleDelete("invoices", p[0])],
  ["GET", /^\/api\/payments\/([^\/]+)$/, (p, body) => ({ "payment": __mockRow("payments", p[0]), "customer_name": "sample_customer_name_1", "invoice": ({ "id": "id_001", "invoice_number": "sample_invoice_number_1", "total_amount": 3, "outstanding_amount": 3, "status": "active" }) })],
  ["PATCH", /^\/api\/payments\/([^\/]+)$/, (p, body) => __sampleUpdate("payments", p[0], body)],
  ["GET", /^\/api\/bills\/([^\/]+)$/, (p, body) => __mockRow("bills", p[0])],
  ["PATCH", /^\/api\/bills\/([^\/]+)$/, (p, body) => __sampleUpdate("bills", p[0], body)],
  ["DELETE", /^\/api\/bills\/([^\/]+)$/, (p, body) => __sampleDelete("bills", p[0])],
  ["PATCH", /^\/api\/invoices\/([^\/]+)\/line-items\/([^\/]+)$/, (p, body) => __sampleUpdate("invoice_line_items", p[1], body)],
  ["DELETE", /^\/api\/invoices\/([^\/]+)\/line-items\/([^\/]+)$/, (p, body) => __sampleDelete("invoice_line_items", p[1])],
];

/** What `http()` returns in mock mode. Sign-in paths hand back the demo
 *  session @/lib/authContext uses. Every endpoint the API Layer designed
 *  answers in its own declared shape (`__NEXEN_MOCK_ROUTES__`), built from
 *  the same sample rows the database seed uses, and passed through the
 *  same `unwrap` a real answer gets — so a screen that works here reads
 *  the fields it will read against the real routes.
 *
 *  The `/me` rule is anchored to the END of the path: unanchored, it
 *  caught `/api/me/orders` and answered every "my ..." screen with the
 *  demo user. */
function __nexenMockResponse(url: string, init?: RequestInit): any {
  const method = (init?.method ?? 'GET').toUpperCase();
  const __path = String(url).split('?')[0].replace(/\/+$/, '') || '/';
  __sampleLoad();
  if (/\/(login|register|signup|sign-up|sign-in|signin)$/.test(__path)) {
    return { token: 'nexen-mock-token', user: __NEXEN_DEMO_USER__ };
  }
  if (/\/(logout|sign-out|signout)$/.test(__path)) return { ok: true };
  let __body: any = {};
  try { __body = init?.body ? JSON.parse(String(init.body)) : {}; } catch { __body = {}; }
  for (const [m, re, answer] of __NEXEN_MOCK_ROUTES__) {
    if (m !== method) continue;
    const hit = re.exec(__path);
    if (hit) return unwrap(answer(hit.slice(1).map(decodeURIComponent), __body));
  }
  if (method === 'GET' && /\/auth\/(me|session|user)$|^\/api\/(me|profile)$|\/users\/me$/.test(__path)) {
    return __NEXEN_DEMO_USER__;
  }
  // No designed answer: a write changes the rows its path names, kept for this
  // tab (`__sampleWrite`); else it echoes its body so optimistic UI still
  // renders. A read finds the rows its path names.
  if (method !== 'GET') {
    const written = __sampleWrite(method, __path, __body);
    if (written !== undefined || method === 'DELETE') return written;
  }
  if (method !== 'GET' && init?.body) return __body;
  const __segs = __path.split('/').filter(Boolean);
  for (let i = __segs.length - 1; i >= 0; i -= 1) {
    const rows = __NEXEN_MOCK_ROWS__[__segs[i]];
    if (!rows) continue;
    const isItem = i === __segs.length - 2;
    return isItem ? __mockRow(__segs[i], __segs[i + 1]) : rows;
  }
  return {};
}

import type { Alert } from '@/types/alert';
import type { Bill } from '@/types/bill';
import type { Customer } from '@/types/customer';
import type { Invoice } from '@/types/invoice';
import type { InvoiceLineItem } from '@/types/invoicelineitem';
import type { Payment } from '@/types/payment';
import type { Reminder } from '@/types/reminder';
import type { TutorProfile } from '@/types/tutorprofile';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function withQuery(
  url: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

// ONE envelope convention, applied here so nothing downstream has to think
// about it: route handlers return the entity WRAPPED — `{ task }`, `{ projects }`
// — matching the `{ error }` shape errors already use and leaving room for
// `{ data, meta }` later. This unwraps it, so hooks and pages only ever see
// entities.
//
// Without a single decision, some generated consumers unwrapped and some did
// not: `useTask` stored `{ task: {...} }` as the task itself while the page
// next to it got it right. Both were plausible readings of an unstated rule.
function unwrap(payload: any): any {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const keys = Object.keys(payload);
  // A single-key object whose key is not a known envelope field IS the
  // envelope. Anything else is already the entity — unwrapping a real
  // one-field entity would be worse than leaving a wrapper on.
  if (keys.length === 1 && !['error', 'message', 'ok'].includes(keys[0])) {
    return payload[keys[0]];
  }
  return payload;
}

async function http(url: string, init?: RequestInit): Promise<any> {
  // No database exists during the preview — answer locally.
  if (__NEXEN_IS_MOCK__) return __nexenMockResponse(url, init);
  // Unified-Next: same-origin relative URLs. Auth is DUAL — the login route
  // sets an httpOnly session cookie AND returns the JWT, which the login form
  // persists via @/lib/authToken. We attach it as `Authorization: Bearer` here
  // because the cookie is withheld inside the IDE preview's cross-site iframe;
  // `credentials: 'include'` keeps the cookie working in a normal browser too.
  const token = typeof window !== 'undefined' ? getToken() : null;
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  }
  if (res.status === 204) return undefined;
  return unwrap(await res.json().catch(() => undefined));
}

export async function getTutorProfiles(query?: Record<string, string | number | boolean | undefined>): Promise<TutorProfile> {
  return http(withQuery(`/api/tutor-profiles`, query));
}
export async function updateTutorProfile(tutorProfileId: string, input: Partial<Omit<TutorProfile, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<TutorProfile> {
  return http(`/api/tutor-profiles/${tutorProfileId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function createDemoData(input: Record<string, unknown>): Promise<number> {
  return http(`/api/demo-data`, { method: 'POST', body: JSON.stringify(input) });
}
export async function deleteDemoData(): Promise<any> {
  return http(`/api/demo-data`, { method: 'DELETE' });
}
export async function getDashboard(query?: Record<string, string | number | boolean | undefined>): Promise<{ total_outstanding: number; overdue_amount: number; collected_this_month: number; cash_in_hand: number; aging_buckets: Array<{ bucket: string; balance: number; count: number }>; chase_table: Array<{ customer_id: string; customer_name: string; overdue_amount: number; max_days_late: number; rank_score: number }> }> {
  return http(withQuery(`/api/dashboard`, query));
}
export async function getCustomers(query?: { q?: string; active?: boolean }): Promise<(Customer & { current_balance: number })[]> {
  return http(withQuery(`/api/customers`, query));
}
export async function createCustomer(input: Partial<Omit<Customer, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Customer> {
  return http(`/api/customers`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getCustomerById(customerId: string, query?: Record<string, string | number | boolean | undefined>): Promise<{ customer: Customer; outstanding_total: number; average_days_late: number | null; invoices: Array<{ invoice: Invoice; aging_bucket: string; payments: Payment[] }>; habit_markers: Array<{ month: string; marker: string }> }> {
  return http(withQuery(`/api/customers/${customerId}`, query));
}
export async function updateCustomer(customerId: string, input: Partial<Omit<Customer, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Customer> {
  return http(`/api/customers/${customerId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function deleteCustomer(customerId: string): Promise<void> {
  return http(`/api/customers/${customerId}`, { method: 'DELETE' });
}
export async function getInvoices(query?: { status?: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue'; customer_id?: string }): Promise<Array<{ id: string; invoice_number: string; customer_id: string; customer_name: string; due_date: string; total_amount: number; outstanding_amount: number; status: string }>> {
  return http(withQuery(`/api/invoices`, query));
}
export async function createInvoice(input: Partial<Omit<Invoice, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Invoice> {
  return http(`/api/invoices`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getInvoiceById(invoiceId: string, query?: Record<string, string | number | boolean | undefined>): Promise<{ invoice: Invoice; customer_name: string; line_items: InvoiceLineItem[]; payments: Payment[]; outstanding_amount: number; aging_bucket: string }> {
  return http(withQuery(`/api/invoices/${invoiceId}`, query));
}
export async function updateInvoice(invoiceId: string, input: Partial<Omit<Invoice, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Invoice> {
  return http(`/api/invoices/${invoiceId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function deleteInvoice(invoiceId: string): Promise<void> {
  return http(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
}
export async function createInvoiceSend(invoiceId: string, input: Record<string, unknown>): Promise<Invoice> {
  return http(`/api/invoices/${invoiceId}/send`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getInvoicePrint(invoiceId: string, query?: Record<string, string | number | boolean | undefined>): Promise<{ invoice_number: string; tutor_name: string; upi_id: string; upi_qr_payload: string; customer_name: string; line_items: InvoiceLineItem[]; total_amount: number; outstanding_amount: number; due_date: string }> {
  return http(withQuery(`/api/invoices/${invoiceId}/print`, query));
}
export async function createInvoiceLineItem(invoiceId: string, input: { description: string; quantity?: number; unit_price: number }): Promise<InvoiceLineItem> {
  return http(`/api/invoices/${invoiceId}/line-items`, { method: 'POST', body: JSON.stringify(input) });
}
export async function updateInvoiceLineItem(invoiceId: string, lineItemId: string, input: Partial<InvoiceLineItem>): Promise<InvoiceLineItem> {
  return http(`/api/invoices/${invoiceId}/line-items/${lineItemId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function deleteInvoiceLineItem(invoiceId: string, lineItemId: string): Promise<any> {
  return http(`/api/invoices/${invoiceId}/line-items/${lineItemId}`, { method: 'DELETE' });
}
export async function getInvoiceBatchePreview(query?: { billing_month?: string }): Promise<{ billing_month: string; proposed: Array<{ customer_id: string; customer_name: string; amount: number; due_date: string }>; skipped: Array<{ customer_id: string; reason: string }>; total_amount: number }> {
  return http(withQuery(`/api/invoice-batches/preview`, query));
}
export async function createInvoiceBatche(input: { billing_month: string; customer_ids: string[] }): Promise<{ created: Invoice[]; skipped: Array<{ customer_id: string; reason: string }> }> {
  return http(`/api/invoice-batches`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getPayments(query?: { from?: string; to?: string; method?: 'upi' | 'cash' | 'bank'; customer_id?: string }): Promise<Array<{ id: string; received_on: string; customer_id: string; customer_name: string; invoice_id: string; invoice_number: string; amount: number; method: string; source: string }>> {
  return http(withQuery(`/api/payments`, query));
}
export async function createPayment(input: Partial<Omit<Payment, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Payment> {
  return http(`/api/payments`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getPaymentById(paymentId: string, query?: Record<string, string | number | boolean | undefined>): Promise<{ payment: Payment; customer_name: string; invoice: { id: string; invoice_number: string; total_amount: number; outstanding_amount: number; status: string } }> {
  return http(withQuery(`/api/payments/${paymentId}`, query));
}
export async function updatePayment(paymentId: string, input: Partial<Omit<Payment, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Payment> {
  return http(`/api/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function createQuickLogParse(input: { text: string }): Promise<{ amount: number | null; received_on: string | null; payer_name: string | null; method: string | null; candidates: Array<{ customer_id: string; customer_name: string; score: number }>; matched_customer_id: string | null; target_invoice: { id: string; invoice_number: string; outstanding_amount: number } | null }> {
  return http(`/api/quick-log/parse`, { method: 'POST', body: JSON.stringify(input) });
}
export async function createQuickLogConfirm(input: { customer_id: string; invoice_id: string; amount: number; received_on: string; reference?: string; pasted_text: string }): Promise<Payment> {
  return http(`/api/quick-log/confirm`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getBills(query?: Record<string, string | number | boolean | undefined>): Promise<Bill[]> {
  return http(withQuery(`/api/bills`, query));
}
export async function createBill(input: Partial<Omit<Bill, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Bill> {
  return http(`/api/bills`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getBillById(billId: string, query?: Record<string, string | number | boolean | undefined>): Promise<Bill> {
  return http(withQuery(`/api/bills/${billId}`, query));
}
export async function updateBill(billId: string, input: Partial<Omit<Bill, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Bill> {
  return http(`/api/bills/${billId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function deleteBill(billId: string): Promise<void> {
  return http(`/api/bills/${billId}`, { method: 'DELETE' });
}
export async function createBillMarkPaid(billId: string, input: { paid_on: string }): Promise<Bill> {
  return http(`/api/bills/${billId}/mark-paid`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getReminders(query?: { status?: 'draft' | 'sent' }): Promise<Reminder[]> {
  return http(withQuery(`/api/reminders`, query));
}
export async function createReminderPreview(input: { customer_id: string; invoice_id: string }): Promise<{ tone: string; days_late_at_creation: number; message_body: string; recently_reminded: boolean }> {
  return http(`/api/reminders/preview`, { method: 'POST', body: JSON.stringify(input) });
}
export async function createReminder(input: Partial<Omit<Reminder, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Reminder> {
  return http(`/api/reminders`, { method: 'POST', body: JSON.stringify(input) });
}
export async function createReminderDraftsBulk(input: { customer_ids: string[] }): Promise<Reminder[]> {
  return http(`/api/reminders/drafts-bulk`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getReminderById(reminderId: string, query?: Record<string, string | number | boolean | undefined>): Promise<Reminder & { recently_reminded: boolean }> {
  return http(withQuery(`/api/reminders/${reminderId}`, query));
}
export async function updateReminder(reminderId: string, input: Partial<Omit<Reminder, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>>): Promise<Reminder> {
  return http(`/api/reminders/${reminderId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export async function deleteReminder(reminderId: string): Promise<void> {
  return http(`/api/reminders/${reminderId}`, { method: 'DELETE' });
}
export async function getReminderWhatsappLink(reminderId: string, query?: Record<string, string | number | boolean | undefined>): Promise<string> {
  return http(withQuery(`/api/reminders/${reminderId}/whatsapp-link`, query));
}
export async function createReminderMarkSent(reminderId: string, input: { sent_at?: string }): Promise<Reminder> {
  return http(`/api/reminders/${reminderId}/mark-sent`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getAlerts(query?: { severity?: 'critical' | 'warning' | 'info'; status?: 'open' | 'snoozed' | 'dismissed' | 'acted' }): Promise<Alert[]> {
  return http(withQuery(`/api/alerts`, query));
}
export async function createAlertAct(alertId: string, input: Record<string, unknown>): Promise<Alert> {
  return http(`/api/alerts/${alertId}/act`, { method: 'POST', body: JSON.stringify(input) });
}
export async function createAlertDismiss(alertId: string, input: Record<string, unknown>): Promise<Alert> {
  return http(`/api/alerts/${alertId}/dismiss`, { method: 'POST', body: JSON.stringify(input) });
}
export async function createAlertSnooze(alertId: string, input: { snoozed_until: string }): Promise<Alert> {
  return http(`/api/alerts/${alertId}/snooze`, { method: 'POST', body: JSON.stringify(input) });
}
export async function getCashForecast(query?: { days?: '30' | '60' | '90' }): Promise<{ days: number; starting_cash: number; lowest_balance: number; lowest_balance_date: string; shortfall_date: string | null; daily: Array<{ date: string; balance: number }>; explanation: string }> {
  return http(withQuery(`/api/cash-forecast`, query));
}
export async function getWhatIfScenarios(query?: { scenario?: 'customer_pays_late' | 'customer_does_not_pay' | 'unexpected_expense' | 'everyone_on_time'; preset?: string; customer_id?: string; days_late?: number; expense_amount?: number; expense_date?: string; days?: '30' | '60' | '90' }): Promise<{ baseline: { daily: Array<{ date: string; balance: number }>; lowest_balance: number; shortfall_date: string | null }; scenario: { daily: Array<{ date: string; balance: number }>; lowest_balance: number; shortfall_date: string | null }; lowest_balance_delta: number; shortfall_date_delta_days: number | null }> {
  return http(withQuery(`/api/what-if-scenarios`, query));
}
export async function getBadDay(query?: Record<string, string | number | boolean | undefined>): Promise<{ is_active: boolean; late_customer_count: number; ranked: Array<{ customer_id: string; customer_name: string; overdue_amount: number; days_late: number; score: number }>; estimated_recovery: number }> {
  return http(withQuery(`/api/bad-day`, query));
}
export async function getDemoData(query?: Record<string, string | number | boolean | undefined>): Promise<any> {
  return http(withQuery(`/api/demo-data`, query));
}
export async function getCustomerReminders(customerId: string, query?: Record<string, string | number | boolean | undefined>): Promise<Reminder[]> {
  return http(withQuery(`/api/customers/${customerId}/reminders`, query));
}
export async function getBadDayDrafts(query?: Record<string, string | number | boolean | undefined>): Promise<any> {
  return http(withQuery(`/api/bad-day/drafts`, query));
}
export async function getDashboardOutstanding(query?: Record<string, string | number | boolean | undefined>): Promise<any> {
  return http(withQuery(`/api/dashboard/outstanding`, query));
}
export async function getDashboardAgingBucketCustomers(bucket: string, query?: Record<string, string | number | boolean | undefined>): Promise<Customer[]> {
  return http(withQuery(`/api/dashboard/aging-buckets/${bucket}/customers`, query));
}
