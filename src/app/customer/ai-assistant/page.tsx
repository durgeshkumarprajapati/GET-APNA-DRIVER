'use client';

import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';

export default function CustomerAIAssistantPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Customer AI Concierge
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Natural language booking planning, fare estimates, promotion assistance, and reward
            insights.
          </p>
        </div>

        <AIAssistantPanel role="CUSTOMER" className="w-full h-[650px]" />
      </div>
    </div>
  );
}
