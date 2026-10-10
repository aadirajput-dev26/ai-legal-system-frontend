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
    <div className="bg-[#14101e] border border-[#A855F7]/30 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-[#A855F7] mb-4 uppercase tracking-widest">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input 
            value={contacts[role].name} 
            onChange={(e) => handleChange(role, 'name', e.target.value)} 
            className="bg-[#111111] border-white/10 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Phone</Label>
          <Input 
            value={contacts[role].phone} 
            onChange={(e) => handleChange(role, 'phone', e.target.value)} 
            className="bg-[#111111] border-white/10 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input 
            value={contacts[role].email} 
            onChange={(e) => handleChange(role, 'email', e.target.value)} 
            className="bg-[#111111] border-white/10 h-9"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold">Contacts & Parties</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage communication details for all parties involved in this matter.</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="bg-[#A855F7] hover:bg-[#9333ea] text-white">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
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
