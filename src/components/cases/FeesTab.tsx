'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, CreditCard, Receipt, FileText } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

import { fees } from '@/lib/api'; 

export function FeesTab({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ summary: null, milestones: [], payments: [] });

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [totalAgreedFee, setTotalAgreedFee] = useState('');
  
  const [milestoneForm, setMilestoneForm] = useState({ stage_name: '', amount: '', due_date: '' });
  const [paymentForm, setPaymentForm] = useState({ milestone_id: '', amount_paid: '', payment_mode: 'BANK_TRANSFER', receipt_number: '', notes: '' });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFees();
  }, [caseId]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const res = await fees.getSummary(caseId);
      setData(res.data);
      if (res.data.summary) {
        setTotalAgreedFee(res.data.summary.total_agreed_fee);
      }
    } catch (err) {
      console.error('Failed to fetch fees', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await fees.updateSchedule(caseId, { total_agreed_fee: Number(totalAgreedFee) });
      setScheduleModalOpen(false);
      fetchFees();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await fees.createMilestone(caseId, { 
        stage_name: milestoneForm.stage_name, 
        amount: Number(milestoneForm.amount), 
        due_date: milestoneForm.due_date 
      });
      setMilestoneModalOpen(false);
      setMilestoneForm({ stage_name: '', amount: '', due_date: '' });
      fetchFees();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await fees.recordPayment(caseId, { 
        ...paymentForm,
        amount_paid: Number(paymentForm.amount_paid)
      });
      setPaymentModalOpen(false);
      setPaymentForm({ milestone_id: '', amount_paid: '', payment_mode: 'BANK_TRANSFER', receipt_number: '', notes: '' });
      fetchFees();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const { summary, milestones, payments } = data;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-normal text-white">Fee Tracker</h2>
          <p className="text-xs text-[#879292] mt-0.5">Manage billing, milestones, and track payments.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setScheduleModalOpen(true)} variant="outline" className="border-[#272b2b] bg-transparent hover:bg-[#1a1e1e] text-xs h-8 text-[#e5e7eb]">
            Update Total Fee
          </Button>
          <Button onClick={() => setMilestoneModalOpen(true)} variant="outline" className="border-[#272b2b] bg-transparent hover:bg-[#1a1e1e] text-xs h-8 text-[#e5e7eb]">
            <Plus className="w-3.5 h-3.5 mr-1 text-[#2dd4bf]" /> Add Milestone
          </Button>
          <Button onClick={() => setPaymentModalOpen(true)} className="bg-[#2dd4bf] text-[#091b18] hover:bg-[#34d399] text-xs h-8 font-semibold">
            <CreditCard className="w-3.5 h-3.5 mr-1" /> Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141717] border border-[#272b2b] rounded-xl p-5">
          <div className="text-[10px] font-mono text-[#879292] uppercase tracking-wider mb-1">Total Agreed Fee</div>
          <div className="text-2xl font-mono font-medium text-white">₹{summary?.total_agreed_fee || 0}</div>
        </div>
        <div className="bg-[#141717] border border-[#2dd4bf]/30 rounded-xl p-5">
          <div className="text-[10px] font-mono text-[#2dd4bf] uppercase tracking-wider mb-1">Total Received</div>
          <div className="text-2xl font-mono font-medium text-[#2dd4bf]">₹{summary?.total_received || 0}</div>
        </div>
        <div className="bg-[#141717] border border-red-500/30 rounded-xl p-5">
          <div className="text-[10px] font-mono text-red-400 uppercase tracking-wider mb-1">Outstanding Balance</div>
          <div className="text-2xl font-mono font-medium text-red-400">₹{summary?.outstanding_balance || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#879292]">Milestones</h3>
          {milestones.length === 0 ? (
            <div className="text-xs text-[#879292] bg-[#141717] p-4 rounded-xl border border-[#272b2b]">No milestones set.</div>
          ) : (
            <div className="space-y-2">
              {milestones.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3.5 rounded-xl border border-[#272b2b] bg-[#141717]">
                  <div>
                    <div className="text-sm font-medium text-white">{m.stage_name}</div>
                    <div className="text-xs text-[#879292] font-mono mt-0.5">Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white font-medium">₹{m.amount}</div>
                    <div className={`text-[10px] font-mono tracking-wider uppercase mt-0.5 ${m.status === 'PAID' ? 'text-[#2dd4bf]' : 'text-[#f59e0b]'}`}>
                      {m.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#879292]">Recent Payments</h3>
          {payments.length === 0 ? (
            <div className="text-xs text-[#879292] bg-[#141717] p-4 rounded-xl border border-[#272b2b]">No payments recorded.</div>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-[#272b2b] bg-[#141717]">
                  <div className="w-8 h-8 rounded-lg bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-[#2dd4bf]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">₹{p.amount_paid} <span className="text-xs text-[#879292] font-normal ml-1">via {p.payment_mode}</span></div>
                    <div className="text-[10px] font-mono text-[#879292] truncate">{p.receipt_number ? `Receipt: ${p.receipt_number}` : 'No receipt no.'}</div>
                  </div>
                  <div className="text-[10px] font-mono text-[#879292] text-right whitespace-nowrap">
                    {new Date(p.payment_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-normal text-foreground tracking-tight">Update Total Fee</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans mt-0.5 leading-relaxed">
              Set the overall fee agreed with the client for this matter.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSchedule} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Total Agreed Amount (₹)</Label>
              <Input type="number" required value={totalAgreedFee} onChange={e => setTotalAgreedFee(e.target.value)} className="bg-background border-input text-foreground h-9 text-xs font-sans rounded-lg" />
            </div>
            <DialogFooter className="-mx-6 -mb-6 mt-4 flex flex-col-reverse gap-2.5 rounded-b-2xl border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end items-center">
              <Button type="button" variant="outline" onClick={() => setScheduleModalOpen(false)} className="h-9 px-4 text-xs font-medium rounded-lg font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted">Cancel</Button>
              <Button type="submit" disabled={submitting} className="h-9 px-4 text-xs font-semibold rounded-lg font-sans bg-foreground text-background hover:bg-foreground/90">Save Fee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Milestone Modal */}
      <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-normal text-foreground tracking-tight">Add Milestone</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans mt-0.5 leading-relaxed">
              Define a billing event or procedural stage milestone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMilestone} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Stage / Event Name</Label>
              <Input required placeholder="e.g. Filing Fees" value={milestoneForm.stage_name} onChange={e => setMilestoneForm({...milestoneForm, stage_name: e.target.value})} className="bg-background border-input text-foreground h-9 text-xs font-sans rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Amount (₹)</Label>
              <Input type="number" required value={milestoneForm.amount} onChange={e => setMilestoneForm({...milestoneForm, amount: e.target.value})} className="bg-background border-input text-foreground h-9 text-xs font-sans rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Due Date (Optional)</Label>
              <Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm({...milestoneForm, due_date: e.target.value})} className="bg-background border-input text-foreground h-9 text-xs font-sans rounded-lg" />
            </div>
            <DialogFooter className="-mx-6 -mb-6 mt-4 flex flex-col-reverse gap-2.5 rounded-b-2xl border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end items-center">
              <Button type="button" variant="outline" onClick={() => setMilestoneModalOpen(false)} className="h-9 px-4 text-xs font-medium rounded-lg font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted">Cancel</Button>
              <Button type="submit" disabled={submitting} className="h-9 px-4 text-xs font-semibold rounded-lg font-sans bg-foreground text-background hover:bg-foreground/90">Create Milestone</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-normal text-foreground tracking-tight">Record Payment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans mt-0.5 leading-relaxed">
              Log an incoming fee payment from the client.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-muted-foreground font-sans">Amount Paid (₹)</Label>
                <Input type="number" required value={paymentForm.amount_paid} onChange={e => setPaymentForm({...paymentForm, amount_paid: e.target.value})} className="bg-background border-input text-foreground h-9 text-xs font-sans rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground font-sans">Payment Mode</Label>
                <select value={paymentForm.payment_mode} onChange={e => setPaymentForm({...paymentForm, payment_mode: e.target.value})} className="w-full bg-background border border-input rounded-lg h-9 px-3 text-xs text-foreground focus:outline-none font-sans">
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground font-sans">Receipt / Ref No.</Label>
                <Input value={paymentForm.receipt_number} onChange={e => setPaymentForm({...paymentForm, receipt_number: e.target.value})} className="bg-background border-input text-foreground h-9 text-xs font-sans rounded-lg" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-muted-foreground font-sans">Link to Milestone (Optional)</Label>
                <select value={paymentForm.milestone_id} onChange={e => setPaymentForm({...paymentForm, milestone_id: e.target.value})} className="w-full bg-background border border-input rounded-lg h-9 px-3 text-xs text-foreground focus:outline-none font-sans">
                  <option value="">-- None --</option>
                  {milestones.filter((m: any) => m.status === 'PENDING').map((m: any) => (
                    <option key={m.id} value={m.id}>{m.stage_name} (₹{m.amount})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="-mx-6 -mb-6 mt-4 flex flex-col-reverse gap-2.5 rounded-b-2xl border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end items-center">
              <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)} className="h-9 px-4 text-xs font-medium rounded-lg font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted">Cancel</Button>
              <Button type="submit" disabled={submitting} className="h-9 px-4 text-xs font-semibold rounded-lg font-sans bg-foreground text-background hover:bg-foreground/90">Confirm Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
