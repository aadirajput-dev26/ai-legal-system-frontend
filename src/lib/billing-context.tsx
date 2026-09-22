'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { billingApi, type BillingState } from '@/lib/billing';
import { useOrg } from '@/lib/org-context';
import { useAuth } from '@/lib/auth-context';

interface BillingContextType {
  state: BillingState | null;
  loading: boolean;
  error: string | null;
  refreshBilling: () => Promise<void>;
  isExhausted: boolean;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    if (!user || !currentOrg) {
      setState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const s = await billingApi.get(currentOrg.id);
      setState(s);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing state');
    } finally {
      setLoading(false);
    }
  }, [user, currentOrg]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const isExhausted = state ? (state.balance.balanceCredits < state.minBalanceCredits && state.enforcementEnabled) : false;

  return (
    <BillingContext.Provider value={{ state, loading, error, refreshBilling: fetchBilling, isExhausted }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within a BillingProvider');
  return ctx;
}
