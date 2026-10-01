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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold">Fee Tracker</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage billing, milestones, and track payments.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setScheduleModalOpen(true)} variant="outline" className="border-white/10 bg-[#111111] hover:bg-white/5 text-xs h-9">
            Update Total Fee
          </Button>
          <Button onClick={() => setMilestoneModalOpen(true)} variant="outline" className="border-[#A855F7]/30 text-[#A855F7] hover:bg-[#A855F7]/10 text-xs h-9">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Milestone
          </Button>
          <Button onClick={() => setPaymentModalOpen(true)} className="bg-[#4ADE80] text-black hover:bg-[#34d399] text-xs h-9 font-semibold">
            <CreditCard className="w-3.5 h-3.5 mr-1" /> Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#14101e] border border-white/5 rounded-xl p-5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Total Agreed Fee</div>
          <div className="text-2xl font-mono font-medium text-foreground">₹{summary?.total_agreed_fee || 0}</div>
        </div>
        <div className="bg-[#1a231f] border border-[#4ADE80]/30 rounded-xl p-5">
          <div className="text-[10px] text-[#4ADE80]/80 uppercase tracking-widest font-bold mb-1">Total Received</div>
          <div className="text-2xl font-mono font-medium text-[#4ADE80]">₹{summary?.total_received || 0}</div>
        </div>
        <div className="bg-[#241315] border border-red-500/30 rounded-xl p-5">
          <div className="text-[10px] text-red-400/80 uppercase tracking-widest font-bold mb-1">Outstanding Balance</div>
          <div className="text-2xl font-mono font-medium text-red-400">₹{summary?.outstanding_balance || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Milestones</h3>
          {milestones.length === 0 ? (
            <div className="text-xs text-muted-foreground bg-[#111111] p-4 rounded-xl border border-white/5">No milestones set.</div>
          ) : (
            <div className="space-y-2">
              {milestones.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-[#111111]">
                  <div>
                    <div className="text-sm font-medium">{m.stage_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">₹{m.amount}</div>
                    <div className={`text-[10px] font-bold tracking-wider uppercase mt-1 ${m.status === 'PAID' ? 'text-[#4ADE80]' : 'text-orange-400'}`}>
                      {m.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent Payments</h3>
          {payments.length === 0 ? (
            <div className="text-xs text-muted-foreground bg-[#111111] p-4 rounded-xl border border-white/5">No payments recorded.</div>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-[#111111]">
                  <div className="w-8 h-8 rounded-full bg-[#1a231f] flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-[#4ADE80]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">₹{p.amount_paid} <span className="text-xs text-muted-foreground font-normal ml-1">via {p.payment_mode}</span></div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.receipt_number ? `Receipt: ${p.receipt_number}` : 'No receipt no.'}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right whitespace-nowrap">
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
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Total Fee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSchedule} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Total Agreed Amount (₹)</Label>
              <Input type="number" required value={totalAgreedFee} onChange={e => setTotalAgreedFee(e.target.value)} className="bg-[#111111] border-white/10" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-[#4ADE80] text-black w-full">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Milestone Modal */}
      <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMilestone} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Stage / Event Name</Label>
              <Input required placeholder="e.g. Filing Fees" value={milestoneForm.stage_name} onChange={e => setMilestoneForm({...milestoneForm, stage_name: e.target.value})} className="bg-[#111111] border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" required value={milestoneForm.amount} onChange={e => setMilestoneForm({...milestoneForm, amount: e.target.value})} className="bg-[#111111] border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (Optional)</Label>
              <Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm({...milestoneForm, due_date: e.target.value})} className="bg-[#111111] border-white/10" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-[#A855F7] text-white w-full">Create Milestone</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Amount Paid (₹)</Label>
                <Input type="number" required value={paymentForm.amount_paid} onChange={e => setPaymentForm({...paymentForm, amount_paid: e.target.value})} className="bg-[#111111] border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <select value={paymentForm.payment_mode} onChange={e => setPaymentForm({...paymentForm, payment_mode: e.target.value})} className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none">
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Receipt / Ref No.</Label>
                <Input value={paymentForm.receipt_number} onChange={e => setPaymentForm({...paymentForm, receipt_number: e.target.value})} className="bg-[#111111] border-white/10" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Link to Milestone (Optional)</Label>
                <select value={paymentForm.milestone_id} onChange={e => setPaymentForm({...paymentForm, milestone_id: e.target.value})} className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none">
                  <option value="">-- None --</option>
                  {milestones.filter((m: any) => m.status === 'PENDING').map((m: any) => (
                    <option key={m.id} value={m.id}>{m.stage_name} (₹{m.amount})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={submitting} className="bg-[#4ADE80] text-black w-full">Confirm Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
