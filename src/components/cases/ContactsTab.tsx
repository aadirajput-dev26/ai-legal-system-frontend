'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { cases as casesApi } from '@/lib/api';

export function ContactsTab({ caseId, caseData, onUpdate }: { caseId: string, caseData: any, onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState({
    client: { name: '', phone: '', email: '' },
    opponent: { name: '', phone: '', email: '' },
    opponent_advocate: { name: '', phone: '', email: '' }
  });

  useEffect(() => {
    if (caseData?.contact_details) {
      setContacts({
        client: { ...contacts.client, ...caseData.contact_details.client },
        opponent: { ...contacts.opponent, ...caseData.contact_details.opponent },
        opponent_advocate: { ...contacts.opponent_advocate, ...caseData.contact_details.opponent_advocate }
      });
    }
  }, [caseData]);

  const handleChange = (role: 'client' | 'opponent' | 'opponent_advocate', field: string, value: string) => {
    setContacts(prev => ({
      ...prev,
      [role]: { ...prev[role], [field]: value }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await casesApi.update(caseId, { contact_details: contacts });
      onUpdate();
    } catch (err) {
      console.error('Failed to update contacts', err);
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (title: string, role: 'client' | 'opponent' | 'opponent_advocate') => (
    <div className="bg-[#141717] border border-[#272b2b] rounded-xl p-5">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#879292] mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-mono text-[#879292]">Name</Label>
          <Input 
            value={contacts[role].name} 
            onChange={(e) => handleChange(role, 'name', e.target.value)} 
            className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 focus:border-[#2dd4bf]/60"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-mono text-[#879292]">Phone</Label>
          <Input 
            value={contacts[role].phone} 
            onChange={(e) => handleChange(role, 'phone', e.target.value)} 
            className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 focus:border-[#2dd4bf]/60"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-mono text-[#879292]">Email</Label>
          <Input 
            value={contacts[role].email} 
            onChange={(e) => handleChange(role, 'email', e.target.value)} 
            className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 focus:border-[#2dd4bf]/60"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-normal text-white">Contacts & Parties</h2>
          <p className="text-xs text-[#879292] mt-0.5">Manage communication details for all parties involved in this matter.</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs h-8">
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Contacts
        </Button>
      </div>

      <div className="space-y-4">
        {renderSection('Client Details', 'client')}
        {renderSection('Opponent Details', 'opponent')}
        {renderSection('Opponent Advocate', 'opponent_advocate')}
      </div>
    </div>
  );
}
