'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    billingApi, loadRazorpay, fmtCredits, fmtINR, FEATURE_LABEL,
    type LedgerEntry, type RazorpayCheckoutResponse,
} from '@/lib/billing';
import { useBilling } from '@/lib/billing-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Sparkles, 
  Wallet, 
  Activity, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/AppShell';

export default function BillingPage() {
    const { state, loading: contextLoading, refreshBilling, error: contextError } = useBilling();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [statementLoading, setStatementLoading] = useState(false);

    const loadStatement = useCallback(async () => {
        if (!state?.organisation?.id) return;
        setStatementLoading(true);
        try {
            const st = await billingApi.statement(state.organisation.id, 25);
            setEntries(st.entries);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setStatementLoading(false);
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
            
            // If dev mock succeeded, refresh and exit
            if ((s as any).mocked) {
                await refreshBilling();
                setBusy(null);
                return;
            }

            const Razorpay = await loadRazorpay();
            new Razorpay({
                key: s.razorpayKeyId,
                subscription_id: s.subscriptionId,
                name: 'LegalDesk',
                description: `${s.planName} — ${fmtCredits(s.includedCredits)} ${state.creditLabel.toLowerCase()} each month`,
                theme: { color: '#8b5cf6' },
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
            
            // If dev mock succeeded, refresh and exit
            if ((o as any).mocked) {
                await refreshBilling();
                setBusy(null);
                return;
            }

            const Razorpay = await loadRazorpay();
            new Razorpay({
                key: o.razorpayKeyId,
                order_id: o.orderId,
                amount: Math.round(o.amountInr * 100),
                currency: 'INR',
                name: 'LegalDesk',
                description: `${o.packName} — ${fmtCredits(o.credits)} ${state.creditLabel.toLowerCase()}`,
                theme: { color: '#8b5cf6' },
                handler: async (r: RazorpayCheckoutResponse) => {
                    try {
                        await billingApi.confirmTopUp(state.organisation.id, r);
                        await refreshBilling();
                    } catch (e: any) {
                        setError(`Payment went through but we could not confirm it yet: ${e.message}.`);
                    } finally { setBusy(null); }
                },
                modal: { ondismiss: () => setBusy(null) },
            }).open();
        } catch (e: any) {
            setError(e.message); setBusy(null);
        }
    };

    // ── Cancel ───────────────────────────────────────────────────────
    const cancel = async () => {
        if (!state) return;
        if (!window.confirm('Cancel this plan at the end of the current billing period? AI stays available until then.')) return;
        setBusy('cancel'); setError(null);
        try {
            await billingApi.cancel(state.organisation.id);
            await refreshBilling();
        } catch (e: any) {
            setError(e.message);
        } finally { setBusy(null); }
    };

    if (contextLoading || !state) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading billing details...</p>
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
            <div className="flex flex-col h-full max-w-6xl mx-auto pb-16 space-y-8 animate-in fade-in duration-300">
                {/* Header section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs tracking-wider uppercase font-semibold">
                                {state.organisation.name}
                            </Badge>
                            {!state.enforcementEnabled ? (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 font-semibold text-xs px-2.5 py-0.5">
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    7-Day Free Trial
                                </Badge>
                            ) : isAdmin ? (
                                <Badge variant="secondary" className="text-[10px]">ADMIN</Badge>
                            ) : null}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Usage & Billing</h1>
                        <p className="text-sm text-muted-foreground mt-2">Manage your AI credits, subscriptions, and payment history.</p>
                    </div>
                </div>

                {!state.enforcementEnabled && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                        <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-300">7-Day Free Trial Active</p>
                            <p className="text-xs text-emerald-400/90 mt-0.5">
                                All AI features (Associate AI Chat &amp; Legal Document Drafting) are fully unlocked for your law firm. Usage is metered and tracked below.
                            </p>
                        </div>
                    </div>
                )}

                {displayError && (
                    <div className="flex items-center gap-3 bg-destructive/15 border border-destructive/30 text-destructive-foreground p-4 rounded-xl">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{displayError}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* ── Balance Card ─────────────────────────────────────── */}
                    <Card className={`lg:col-span-2 overflow-hidden border-0 shadow-lg relative ${exhausted && state.enforcementEnabled ? 'bg-destructive/5' : 'bg-card'}`}>
                        {/* Decorative gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                        
                        <CardHeader className="pb-2 relative z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-primary" />
                                        Available {label}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {!state.enforcementEnabled ? (
                                            <span className="text-emerald-400 font-medium">7-Day Free Trial Access</span>
                                        ) : b.hasSubscription ? (
                                            `Plan ${b.subscriptionStatus}`
                                        ) : (
                                            'No active plan'
                                        )}
                                        {b.periodStart && b.periodEnd && (
                                            <span className="ml-2 pl-2 border-l border-border">
                                                {new Date(b.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(b.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                                {!state.enforcementEnabled && (
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                        Free Trial Active
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        
                        <CardContent className="relative z-10 pt-4">
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className={`text-6xl font-bold tracking-tighter ${exhausted && state.enforcementEnabled ? 'text-destructive' : 'text-foreground'}`}>
                                    {!state.enforcementEnabled && b.balanceCredits === 0 ? 'Unlimited' : fmtCredits(b.balanceCredits)}
                                </span>
                                <span className="text-muted-foreground font-medium">
                                    {!state.enforcementEnabled ? 'during Free Trial' : `of ${fmtCredits(totalForPeriod)} this period`}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="h-4 w-full bg-secondary/50 rounded-full overflow-hidden flex">
                                    <div
                                        className={`h-full transition-all duration-1000 ease-out ${exhausted && state.enforcementEnabled ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-purple-500'}`}
                                        style={{ width: `${!state.enforcementEnabled ? 100 : usedPct}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                    <span>{fmtCredits(b.consumedCredits)} used</span>
                                    {b.toppedUpCredits > 0 && <span className="text-primary/80">+{fmtCredits(b.toppedUpCredits)} topped up</span>}
                                </div>
                            </div>

                            {exhausted && state.enforcementEnabled && (
                                <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive-foreground">
                                        AI features are paused because your balance is exhausted. Please add more {label.toLowerCase()} to continue using AI tools.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                {/* ── Plans or TopUps Side Card ──────────────────────────────── */}
                <Card className="flex flex-col border border-border/50 shadow-md bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {b.hasSubscription ? <Zap className="w-5 h-5 text-yellow-500" /> : <Sparkles className="w-5 h-5 text-primary" />}
                            {b.hasSubscription ? 'Add Top-Up' : 'Choose a Plan'}
                        </CardTitle>
                        <CardDescription>
                            {b.hasSubscription 
                                ? 'One-off credits that never expire while your plan is active.' 
                                : 'Subscribe to unlock LegalDesk AI features.'}
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1 space-y-4">
                        {!state.razorpayConfigured && process.env.NODE_ENV === 'production' ? (
                            <div className="text-sm text-muted-foreground p-4 bg-secondary/30 rounded-lg text-center">
                                Payments are not switched on for this server yet.
                            </div>
                        ) : !b.hasSubscription ? (
                            <div className="space-y-3">
                                {state.plans.map(p => (
                                    <div key={p.code} className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{p.name}</div>
                                            <div className="text-right">
                                                <div className="font-bold text-foreground">{fmtINR(p.priceInr)}</div>
                                                <div className="text-[10px] text-muted-foreground">/ month</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{p.description}</p>
                                        <Button
                                            onClick={() => subscribe(p.code)}
                                            disabled={!isAdmin || busy !== null}
                                            className="w-full text-xs h-8"
                                            variant={p.code === 'PRO' ? 'default' : 'secondary'}
                                        >
                                            {busy === 'subscribe' ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                            {busy === 'subscribe' ? 'Opening...' : 'Subscribe'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {state.packs.map(p => (
                                    <div key={p.code} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors">
                                        <div>
                                            <div className="font-semibold text-sm">{p.name}</div>
                                            <div className="text-xs text-muted-foreground font-medium">{fmtINR(p.priceInr)}</div>
                                        </div>
                                        <Button
                                            onClick={() => topUp(p.code)}
                                            disabled={!isAdmin || busy !== null}
                                            size="sm"
                                            variant="outline"
                                            className="h-8 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                                        >
                                            {busy === p.code ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                            {busy === p.code ? 'Processing...' : 'Buy'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>

                    {b.hasSubscription && isAdmin && (
                        <CardFooter className="pt-4 border-t border-border/50 bg-secondary/20">
                            <div className="flex items-center justify-between w-full gap-4">
                                <div>
                                    <div className="text-xs font-semibold">Cancel plan</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        Stops renewal. AI stays until {b.periodEnd ? new Date(b.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : 'end of period'}.
                                    </div>
                                </div>
                                <Button
                                    onClick={cancel}
                                    disabled={busy !== null}
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 text-[10px] px-2.5"
                                >
                                    {busy === 'cancel' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel'}
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>

            {/* ── Where it went ───────────────────────────────── */}
            {state.breakdown.byFeature.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <Card className="border-0 shadow-md bg-card/40">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                                <Activity className="w-4 h-4 text-primary" /> Usage by Feature
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {state.breakdown.byFeature.map(f => (
                                    <div key={f.feature} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{FEATURE_LABEL[f.feature] || f.feature}</div>
                                                <div className="text-[10px] text-muted-foreground">{f.operations} ops</div>
                                            </div>
                                        </div>
                                        <div className="font-semibold text-sm">{fmtCredits(f.credits)}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {state.breakdown.byUser.length > 0 && (
                        <Card className="border-0 shadow-md bg-card/40">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                                    <CreditCard className="w-4 h-4 text-primary" /> Usage by Person
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {state.breakdown.byUser.map(u => (
                                        <div key={u.userId} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                                                    {u.name.substring(0,2)}
                                                </div>
                                                <div className="text-sm font-medium truncate max-w-[150px]">{u.name}</div>
                                            </div>
                                            <div className="font-semibold text-sm">{fmtCredits(u.credits)}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ── Statement ───────────────────────────────────── */}
            {entries.length > 0 && (
                <Card className="border-0 shadow-md overflow-hidden bg-card/40">
                    <CardHeader className="pb-4 border-b border-border/50">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                            <History className="w-4 h-4 text-primary" /> Transaction Statement
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Entry / Feature</th>
                                    <th className="px-6 py-4 font-semibold">Date & Time</th>
                                    <th className="px-6 py-4 font-semibold text-right">{label}</th>
                                    <th className="px-6 py-4 font-semibold text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {entries.map((e, i) => (
                                    <tr key={i} className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">
                                                {e.feature ? (FEATURE_LABEL[e.feature] || e.feature) : e.reason || e.type}
                                            </div>
                                            {e.tokens != null && (
                                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                                    {e.tokens.toLocaleString('en-IN')} tokens {e.model ? `· ${e.model}` : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs tabular-nums">
                                            {new Date(e.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 text-right tabular-nums">
                                            <Badge variant={e.credits > 0 ? 'default' : 'outline'} className={`font-mono text-[11px] ${e.credits > 0 ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20' : 'border-border/60 text-muted-foreground'}`}>
                                                {e.credits > 0 ? '+' : ''}{e.credits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground font-medium">
                                            {fmtCredits(e.balanceAfter)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
            </div>
        </AppShell>
    );
}
