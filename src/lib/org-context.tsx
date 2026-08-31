'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { organisations as orgApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Organisation } from '@/lib/types';

interface OrgContextType {
  currentOrg: Organisation | null;
  orgs: Organisation[];
  loading: boolean;
  switchOrg: (orgId: string) => void;
  refreshOrgs: () => Promise<void>;
  createOrg: (name: string, description?: string) => Promise<Organisation>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    if (!user) {
      setOrgs([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await orgApi.list();
      const orgList: Organisation[] = res.data || [];
      setOrgs(orgList);

      if (orgList.length > 0) {
        // Retrieve previously selected org or pick first
        const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('activeOrgId') : null;
        const matched = orgList.find(o => o.id === savedOrgId);
        const selected = matched || orgList[0];
        setCurrentOrg(selected);
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeOrgId', selected.id);
        }
      } else {
        // If user has no organization yet, auto-create a default one
        try {
          const newOrgRes = await orgApi.create({
            name: `${user.name ? user.name.split(' ')[0] : 'My'} Law Chambers`,
            description: 'Litigation & Legal Practice',
          });
          if (newOrgRes.data) {
            setOrgs([newOrgRes.data]);
            setCurrentOrg(newOrgRes.data);
            if (typeof window !== 'undefined') {
              localStorage.setItem('activeOrgId', newOrgRes.data.id);
            }
          }
        } catch (createErr) {
          console.error('Auto-create org error:', createErr);
        }
      }
    } catch (err) {
      console.error('Failed to load organisations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const switchOrg = (orgId: string) => {
    const matched = orgs.find(o => o.id === orgId);
    if (matched) {
      setCurrentOrg(matched);
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeOrgId', matched.id);
      }
    }
  };

  const createOrg = async (name: string, description?: string) => {
    const res = await orgApi.create({ name, description });
    const newOrg = res.data;
    setOrgs(prev => [...prev, newOrg]);
    setCurrentOrg(newOrg);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeOrgId', newOrg.id);
    }
    return newOrg;
  };

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        orgs,
        loading,
        switchOrg,
        refreshOrgs: fetchOrgs,
        createOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider');
  return ctx;
}
