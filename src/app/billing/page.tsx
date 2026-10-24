'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    billingApi, loadRazorpay, fmtCredits, fmtINR, FEATURE_LABEL,
    type LedgerEntry, type RazorpayCheckoutResponse,
} from '@/lib/billing';
import { useBilling } from '@/lib/billing-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Sparkles, 
  Wallet, 
  Activity, 
  History as HistoryIcon, 
  AlertCircle,
  Loader2,
  TrendingUp,
  Zap
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function BillingPage() {
    const { state, loading: contextLoading, refreshBilling, error: contextError } = useBilling();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

    const loadStatement = useCallback(async () => {
        if (!state?.organisation?.id) return;
        try {
            const st = await billingApi.statement(state.organisation.id, 25);
            setEntries(st.entries);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, [state?.organisation?.id]);

    useEffect(() => { 
        if (state?.organisation?.id) {
            loadStatement(); 
        }
    }, [state?.organisation?.id, loadStatement]);

    // ── Subscribe ────────────────────────────────────────────────────
    const subscribe = async (planCode: string) => {
        if (!state) return;
        setBusy('subscribe'); setError(null);
        try {
            const s = await billingApi.subscribe(state.organisation.id, planCode);
            
            const Razorpay = await loadRazorpay();
            new Razorpay({
                key: s.razorpayKeyId,
                subscription_id: s.subscriptionId,
                name: 'LegalDesk',
                description: `${s.planName} — ${fmtCredits(s.includedCredits)} ${state.creditLabel.toLowerCase()} each month`,
                theme: { color: '#2dd4bf' },
                handler: () => {
                    setBusy(null);
                    setError(null);
                    setTimeout(() => { refreshBilling(); }, 2500);
                },
                modal: { ondismiss: () => setBusy(null) },
            }).open();
        } catch (e: any) {
            setError(e.message); setBusy(null);
        }
    };

    // ── Top up (pay as you go) ───────────────────────────────────────
    const topUp = async (packCode: string) => {
        if (!state) return;
        setBusy(packCode); setError(null);
        try {
            const o = await billingApi.topUp(state.organisation.id, packCode);

            const Razorpay = await loadRazorpay();
            new Razorpay({
                key: o.razorpayKeyId,
                order_id: o.orderId,
                amount: Math.round(o.amountInr * 100),
                currency: 'INR',
                name: 'LegalDesk',
                description: `${o.packName} — ${fmtCredits(o.credits)} ${state.creditLabel.toLowerCase()}`,
                theme: { color: '#2dd4bf' },
                handler: async (r: RazorpayCheckoutResponse) => {
                    try {
                        await billingApi.confirmTopUp(state.organisation.id, r);
                        await refreshBilling();
                    } catch (e: any) {
                        setError(`Payment went through but confirmation is pending: ${e.message}.`);
                    } finally { setBusy(null); }
                },
                modal: { ondismiss: () => setBusy(null) },
            }).open();
        } catch (e: any) {
            setError(e.message); setBusy(null);
        }
    };

    // ── Cancel ───────────────────────────────────────────────────────
    const cancel = () => {
        if (!state) return;
        setCancelConfirmOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!state) return;
        setBusy('cancel'); setError(null);
        try {
            await billingApi.cancel(state.organisation.id);
            await refreshBilling();
            setCancelConfirmOpen(false);
        } catch (e: any) {
            setError(e.message);
        } finally { setBusy(null); }
    };

    if (contextLoading || !state) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
                    <p className="text-xs text-[#879292]">Loading billing details...</p>
                </div>
            </AppShell>
        );
    }

    const b = state.balance;
    const label = state.creditLabel;
    const totalForPeriod = b.allocatedCredits + b.toppedUpCredits;
    const usedPct = totalForPeriod > 0
        ? Math.min(100, Math.round((b.consumedCredits / totalForPeriod) * 100))
        : 0;
    const exhausted = b.balanceCredits < state.minBalanceCredits;
    const isAdmin = state.organisation.role === 'ADMIN';
    const displayError = error || contextError;

    return (
        <AppShell>
            <div className="flex flex-col h-full w-full px-6 sm:px-8 py-8 pb-16 space-y-7">
                {/* Header section */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-[#f3f4f5] tracking-tight">Usage & Billing</h1>
                        <p className="text-sm text-[#879292] mt-1">Manage AI token allowances, subscriptions, and ledger balance.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#6f7a7a]">
                            {state.organisation.name}
                        </span>
                        {!state.enforcementEnabled ? (
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20">
                                7-Day Free Trial
                            </span>
                        ) : null}
                    </div>
                </div>

                {!state.enforcementEnabled && (
                    <div className="p-4 rounded-xl bg-[#141717] border border-[#222828] flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-[#2dd4bf] mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-white">Trial Metering Active</p>
                            <p className="text-xs text-[#879292] mt-0.5">
                                All AI legal intelligence and drafting features are currently unlocked. Tokens are tracked below.
                            </p>
                        </div>
                    </div>
                )}

                {displayError && (
                    <div className="flex items-center gap-3 bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] p-4 rounded-xl text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p>{displayError}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Balance Card ─────────────────────────────────────── */}
                    <div className="lg:col-span-2 p-6 rounded-xl bg-[#121515] border border-[#222828] space-y-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs font-mono uppercase tracking-wider text-[#6f7a7a] flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-[#2dd4bf]" />
                                    Available {label}
                                </div>
                                <div className="text-xs text-[#879292] mt-1">
                                    {!state.enforcementEnabled ? (
                                        'Free Trial Allowance'
                                    ) : b.hasSubscription ? (
                                        `Plan ${b.subscriptionStatus}`
                                    ) : (
                                        'Standard Allowance'
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-baseline gap-3">
                                <span className={`text-5xl font-mono font-bold ${exhausted && state.enforcementEnabled ? 'text-[#f87171]' : 'text-white'}`}>
                                    {!state.enforcementEnabled && b.balanceCredits === 0 ? 'Unlimited' : fmtCredits(b.balanceCredits)}
                                </span>
                                <span className="text-xs text-[#879292] font-mono">
                                    {!state.enforcementEnabled ? 'tokens during trial' : `tokens available`}
                                </span>
                            </div>

                            <div className="space-y-2 mt-5">
                                <div className="h-2 w-full bg-[#1c2020] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#2dd4bf] rounded-full transition-all duration-500"
                                        style={{ width: `${!state.enforcementEnabled ? 100 : usedPct}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] font-mono text-[#6f7a7a]">
                                    <span>{fmtCredits(b.consumedCredits)} consumed</span>
                                    {b.toppedUpCredits > 0 && <span className="text-[#2dd4bf]">+{fmtCredits(b.toppedUpCredits)} topped up</span>}
                                </div>
                            </div>
                        </div>

                        {exhausted && state.enforcementEnabled && (
                            <div className="p-3.5 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 flex items-start gap-2.5 text-xs text-[#f87171]">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>
                                    AI token limit reached. Top up to resume automated briefings and drafting.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Top-Up / Plan Card ──────────────────────────────── */}
                    <div className="p-6 rounded-xl bg-[#121515] border border-[#222828] flex flex-col justify-between space-y-4">
                        <div>
                            <div className="text-xs font-mono uppercase tracking-wider text-[#6f7a7a] flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-[#f59e0b]" />
                                {b.hasSubscription ? 'Top-Up Tokens' : 'Plans'}
                            </div>
                            <p className="text-xs text-[#879292] mt-1">
                                {b.hasSubscription ? 'One-off tokens that never expire.' : 'Subscribe for regular legal intelligence.'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {!b.hasSubscription ? (
                                state.plans.map(p => (
                                    <div key={p.code} className="p-3.5 rounded-lg border border-[#272b2b] bg-[#141717] space-y-2">
                                        <div className="flex justify-between items-baseline">
                                            <span className="font-serif font-semibold text-sm text-white">{p.name}</span>
                                            <span className="font-mono text-xs text-[#2dd4bf]">{fmtINR(p.priceInr)}/mo</span>
                                        </div>
                                        <button
                                            onClick={() => subscribe(p.code)}
                                            disabled={!isAdmin || busy !== null}
                                            className="w-full h-8 text-xs bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold rounded-lg transition-colors"
                                        >
                                            {busy === 'subscribe' ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Subscribe'}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                state.packs.map(p => (
                                    <div key={p.code} className="flex items-center justify-between p-3 rounded-lg border border-[#272b2b] bg-[#141717]">
                                        <div>
                                            <div className="font-serif font-medium text-sm text-white">{p.name}</div>
                                            <div className="text-xs font-mono text-[#879292]">{fmtINR(p.priceInr)}</div>
                                        </div>
                                        <button
                                            onClick={() => topUp(p.code)}
                                            disabled={!isAdmin || busy !== null}
                                            className="h-7 px-3 text-xs bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold rounded-lg transition-colors"
                                        >
                                            {busy === p.code ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {b.hasSubscription && isAdmin && (
                            <div className="pt-3 border-t border-[#222828] flex justify-between items-center text-xs">
                                <span className="text-[#879292]">Cancel renewal</span>
                                <button
                                    onClick={cancel}
                                    disabled={busy !== null}
                                    className="text-xs text-[#f87171] hover:underline"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Transaction Statement ───────────────────────────── */}
                {entries.length > 0 && (
                    <div className="rounded-xl border border-[#222828] bg-[#121515] overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#222828] text-xs font-mono uppercase tracking-wider text-[#6f7a7a]">
                            Token Statement
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="text-[10px] font-mono uppercase tracking-wider text-[#6f7a7a] border-b border-[#222828]">
                                    <tr>
                                        <th className="px-5 py-3">Entry</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3 text-right">Tokens</th>
                                        <th className="px-5 py-3 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222828]/60 font-mono">
                                    {entries.map((e, i) => (
                                        <tr key={i} className="hover:bg-white/[0.01]">
                                            <td className="px-5 py-3.5 text-white font-sans">
                                                {e.feature ? (FEATURE_LABEL[e.feature] || e.feature) : e.reason || e.type}
                                            </td>
                                            <td className="px-5 py-3.5 text-[#879292]">
                                                {new Date(e.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={e.credits > 0 ? 'text-[#2dd4bf]' : 'text-[#879292]'}>
                                                    {e.credits > 0 ? '+' : ''}{e.credits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-white">
                                                {fmtCredits(e.balanceAfter)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Cancel Plan Modal */}
            <ConfirmModal
                open={cancelConfirmOpen}
                onOpenChange={setCancelConfirmOpen}
                title="Cancel Plan?"
                description="Are you sure you want to cancel this plan at the end of the current billing period? AI intelligence stays active until then."
                confirmLabel="Cancel Plan"
                loading={busy === 'cancel'}
                onConfirm={handleConfirmCancel}
            />
        </AppShell>
    );
}
