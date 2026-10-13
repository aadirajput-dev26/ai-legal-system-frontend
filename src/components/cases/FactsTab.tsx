'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { CaseItem } from '@/lib/types';
import { cases as casesApi } from '@/lib/api';

interface FactsTabProps {
  caseId: string;
  caseData: CaseItem;
  onUpdate: () => void;
}

export function FactsTab({ caseId, caseData, onUpdate }: FactsTabProps) {
  const [facts, setFacts] = useState(caseData.facts || '');
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveFacts = async () => {
    try {
      setIsSaving(true);
      await casesApi.update(caseId, { facts });
      setSuccessMsg('Facts saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
      onUpdate();
    } catch (err) {
      console.error('Failed to save facts:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessTranscript = async () => {
    if (!transcript.trim()) return;
    try {
      setIsProcessing(true);
      const res = await casesApi.processTranscript(caseId, transcript);
      if (res.data) {
        setFacts(res.data.facts || '');
        setTranscript('');
        setSuccessMsg('Transcript processed and facts updated.');
        setTimeout(() => setSuccessMsg(''), 3000);
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to process transcript:', err);
      alert('Failed to process transcript. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-[#141717] border border-[#272b2b] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2dd4bf]" />
            Facts of the Case
          </h3>
          <div className="flex items-center gap-2">
            {successMsg && (
              <span className="text-[11px] font-mono text-[#2dd4bf] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {successMsg}
              </span>
            )}
            <Button
              size="sm"
              onClick={handleSaveFacts}
              disabled={isSaving}
              className="h-8 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs"
            >
              {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Save Facts
            </Button>
          </div>
        </div>

        <textarea
          value={facts}
          onChange={(e) => setFacts(e.target.value)}
          placeholder="Document the established facts, dates, events, and parties here..."
          className="w-full h-64 bg-[#101313] border border-[#272b2b] rounded-lg p-3 text-sm text-[#f3f4f5] placeholder:text-[#879292]/60 focus:outline-none focus:border-[#2dd4bf]/60 resize-y leading-relaxed font-sans"
        />
      </div>

      <div className="bg-[#141717] border border-[#272b2b] rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#818cf8]"></div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#818cf8]" />
          <h3 className="text-[11px] font-mono font-medium text-[#818cf8] tracking-widest uppercase">
            Process Consultation Transcript
          </h3>
        </div>
        <p className="text-xs text-[#879292] mb-4">
          Paste a transcript from a client consultation. Our AI will analyze the conversation, extract relevant dates, parties, and events, and automatically append them to the Facts of the Case above.
        </p>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste consultation transcript here..."
          className="w-full h-32 bg-[#101313] border border-[#272b2b] rounded-lg p-3 text-sm text-[#f3f4f5] placeholder:text-[#879292]/60 focus:outline-none focus:border-[#818cf8]/60 mb-4 resize-y leading-relaxed font-sans"
        />

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleProcessTranscript}
            disabled={isProcessing || !transcript.trim()}
            className="h-8 bg-[#818cf8] hover:bg-[#6366f1] text-white font-medium text-xs gap-1.5"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Extract Facts
          </Button>
        </div>
      </div>
    </div>
  );
}
