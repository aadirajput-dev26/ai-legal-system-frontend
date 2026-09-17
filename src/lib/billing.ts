/**
 * billing.ts — typed client for the billing API.
 *
 * The browser NEVER grants credits. Every call here either reads state or asks
 * the server to create something at Razorpay. Entitlement moves only when the
 * server says so.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface BalanceSummary {
    balanceCredits: number;
    allocatedCredits: number;
    toppedUpCredits: number;
    consumedCredits: number;
    periodStart: string | null;
    periodEnd: string | null;
    hasSubscription: boolean;
    subscriptionStatus: string | null;
}

export interface BillingState {
    organisation: { id: string; name: string; role: string };
    creditLabel: string;
    enforcementEnabled: boolean;
    minBalanceCredits: number;
    razorpayKeyId: string | null;
    razorpayConfigured: boolean;
    balance: BalanceSummary;
    plans: Array<{
        code: string; name: string; description: string;
        priceInr: number; includedCredits: number; seatLimit: number | null; ready: boolean;
    }>;
    packs: Array<{ code: string; name: string; priceInr: number; credits: number }>;
    breakdown: {
        byUser: Array<{ userId: string; name: string; email: string; credits: number; operations: number }>;
        byFeature: Array<{ feature: string; credits: number; underlyingCostMicro: number; operations: number }>;
    };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers || {}),
        },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body?.error?.message || `Request failed (${res.status})`), { code: body?.error?.code, status: res.status });
    return body.data as T;
}

export const billingApi = {
    get: () => req<BillingState>('/billing/me'),
    statement: (limit = 50) => req<{ entries: LedgerEntry[] }>(`/billing/statement?limit=${limit}`),
    subscribe: (planCode: string) =>
        req<{ subscriptionId: string; razorpayKeyId: string; planName: string; amountInr: number; includedCredits: number }>(
            '/billing/subscribe', { method: 'POST', body: JSON.stringify({ planCode }) }),
    topUp: (packCode: string) =>
        req<{ orderId: string; razorpayKeyId: string; amountInr: number; credits: number; packName: string }>(
            '/billing/topup', { method: 'POST', body: JSON.stringify({ packCode }) }),
    confirmTopUp: (p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        req<{ balance: BalanceSummary }>('/billing/topup/confirm', { method: 'POST', body: JSON.stringify(p) }),
    cancel: () => req<{ cancelAtPeriodEnd: boolean }>('/billing/cancel', { method: 'POST' }),
};

export interface LedgerEntry {
    type: string; credits: number; balanceAfter: number;
    reason: string | null; feature: string | null; model: string | null;
    tokens: number | null; at: string;
}

/** Razorpay Checkout is loaded on demand — it is not needed on any other page. */
export function loadRazorpay(): Promise<any> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return reject(new Error('Not in a browser'));
        if ((window as any).Razorpay) return resolve((window as any).Razorpay);
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve((window as any).Razorpay);
        s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
        document.body.appendChild(s);
    });
}

export const fmtCredits = (n: number) => n.toLocaleString('en-IN');
export const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const FEATURE_LABEL: Record<string, string> = {
    AI_CHAT: 'Case questions',
    DRAFT_GENERATE: 'Draft generation',
    DRAFT_REFINE: 'Draft refinement',
    DOC_OCR: 'Document processing',
    DOC_INDEX: 'Document indexing',
    DOC_REINDEX: 'Document re-indexing',
    TOOL_RUN: 'Automations',
};
