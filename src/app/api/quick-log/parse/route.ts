
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MAX_TEXT_LENGTH = 500;
const MATCH_THRESHOLD = 0.5;
const CERTAIN_MATCH = 0.8;
const OPEN_STATUSES = ['sent', 'partial', 'overdue'] as const;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

type PaymentMethodValue = 'upi' | 'cash' | 'bank';

interface CandidateItem {
  customer_id: string;
  customer_name: string;
  score: number;
}

interface TargetInvoice {
  id: string;
  invoice_number: string;
  outstanding_amount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Today's calendar date in India (IST), as YYYY-MM-DD. */
function istToday(): string {
  const shifted = new Date(Date.now() + 330 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function toYmd(year: number, month: number, day: number): string | null {
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

function parseAmount(text: string): number | null {
  const patterns = [
    /(?:₹|\brs\.?|\binr\b)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
    /\b(?:received|paid|credited|credit of|payment of|amount)\s+(?:of\s+)?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) {
        return round2(value);
      }
    }
  }
  return null;
}

function parseDate(text: string, today: string): string | null {
  const todayYear = Number(today.slice(0, 4));

  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return toYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dmy = text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})\b/);
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    return toYmd(year, Number(dmy[2]), Number(dmy[1]));
  }

  const monthPattern = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';

  const dMon = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+(${monthPattern})[a-z]*\\.?(?:[\\s,-]+(\\d{4}))?\\b`, 'i'),
  );
  const monD = text.match(
    new RegExp(`\\b(${monthPattern})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i'),
  );

  let day: number | null = null;
  let month: number | null = null;
  let explicitYear: number | null = null;

  if (dMon) {
    day = Number(dMon[1]);
    month = MONTHS[dMon[2].toLowerCase()];
    explicitYear = dMon[3] ? Number(dMon[3]) : null;
  } else if (monD) {
    month = MONTHS[monD[1].toLowerCase()];
    day = Number(monD[2]);
    explicitYear = monD[3] ? Number(monD[3]) : null;
  }

  if (day === null || month === undefined) return null;

  if (explicitYear !== null) {
    return toYmd(explicitYear, month, day);
  }

  // No year written: use the current year, or the previous one if the date would be in the future.
  let candidate = toYmd(todayYear, month, day);
  if (candidate && candidate > today) {
    candidate = toYmd(todayYear - 1, month, day);
  }
  return candidate;
}

function parseMethod(text: string): PaymentMethodValue | null {
  const lower = text.toLowerCase();
  if (/\bupi\b|gpay|phonepe|paytm|bhim/.test(lower)) return 'upi';
  if (/\bneft\b|\brtgs\b|\bimps\b|\bbank\b|\bcheque\b|\bchq\b/.test(lower)) return 'bank';
  if (/\bcash\b/.test(lower)) return 'cash';
  return null;
}

function parsePayerName(text: string): string | null {
  const match = text.match(/\b(?:from|by)\s+([A-Za-z][A-Za-z .'-]{1,59})/i);
  if (!match) return null;

  const raw = match[1]
    .split(/[,;:\n]|\s+(?:on|via|for|through|ref|using|dated|at|in|to|upi|utr|txn|bank|cash|neft|imps|rtgs)\b/i)[0]
    .replace(/[.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (raw.length < 2 || raw.length > 60) return null;
  return raw;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** Fuzzy score between the payer name in the message and one stored name, 0 to 1. */
function nameScore(payer: string, stored: string): number {
  const p = normalizeName(payer);
  const n = normalizeName(stored);
  if (!p || !n) return 0;
  if (p === n) return 1;

  const payerTokens = p.split(' ');
  const nameTokens = n.split(' ');

  let total = 0;
  const matchedNameTokens = new Set<number>();

  for (const token of payerTokens) {
    let best = 0;
    let bestIndex = -1;
    nameTokens.forEach((candidate, index) => {
      const similarity = tokenSimilarity(token, candidate);
      if (similarity > best) {
        best = similarity;
        bestIndex = index;
      }
    });
    if (best >= 0.75) {
      total += best;
      matchedNameTokens.add(bestIndex);
    }
  }

  const average = total / payerTokens.length;
  const coverage = matchedNameTokens.size / nameTokens.length;
  return round2(average * (0.8 + 0.2 * coverage));
}

function extractText(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'text' in body) {
    const value = (body as { text: unknown }).text;
    if (typeof value === 'string') return value.trim();
  }
  return '';
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = extractText(body);

  if (!text) {
    return NextResponse.json(
      { error: "Paste a payment message first, for example 'Received Rs 2500 from Ramesh Kumar on 20 Nov via UPI'." },
      { status: 400 },
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: 'This message is too long. Paste only the payment part of the message (up to 500 characters).' },
      { status: 400 },
    );
  }

  try {
    const today = istToday();

    const amount = parseAmount(text);
    const parsedDate = parseDate(text, today);
    const received_on = parsedDate ?? today;
    const payer_name = parsePayerName(text);
    const method = parseMethod(text);

    let candidates: CandidateItem[] = [];

    if (payer_name) {
      const customers = await db.customer.findMany({
        select: { id: true, parentName: true, studentName: true },
      });

      candidates = customers
        .map((customer) => {
          const score = Math.max(
            nameScore(payer_name, customer.parentName),
            nameScore(payer_name, customer.studentName),
          );
          return {
            customer_id: customer.id,
            customer_name: `${customer.parentName} / ${customer.studentName}`,
            score,
          };
        })
        .filter((candidate) => candidate.score >= MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

    const top = candidates[0];
    const runnerUp = candidates[1];
    const matched_customer_id =
      top && top.score >= CERTAIN_MATCH && (!runnerUp || runnerUp.score < CERTAIN_MATCH)
        ? top.customer_id
        : null;

    let target_invoice: TargetInvoice | null = null;

    if (matched_customer_id) {
      const invoices = await db.invoice.findMany({
        where: {
          customerId: matched_customer_id,
          status: { in: [...OPEN_STATUSES] },
        },
        orderBy: { dueDate: 'asc' },
        include: { payments: { select: { amount: true } } },
      });

      for (const invoice of invoices) {
        const total = Number(invoice.totalAmount.toString());
        const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount.toString()), 0);
        const outstanding = round2(total - paid);
        if (outstanding > 0) {
          target_invoice = {
            id: invoice.id,
            invoice_number: invoice.invoiceNumber,
            outstanding_amount: outstanding,
          };
          break;
        }
      }
    }

    const draft = {
      amount,
      received_on,
      payer_name,
      method,
      candidates,
      matched_customer_id,
      target_invoice,
    };

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('quick-log parse failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}