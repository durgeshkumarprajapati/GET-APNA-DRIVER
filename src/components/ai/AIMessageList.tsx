'use client';

import type { AIAssistantAction, AIDataReference } from '@/modules/ai/ai-types';
import { AIActionCard } from './AIActionCard';

export interface MessageItem {
  id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  actions?: AIAssistantAction[];
  citations?: AIDataReference[];
  createdAt?: string;
}

export interface AIMessageListProps {
  messages: MessageItem[];
  loading?: boolean;
  onConfirmAction?: (action: AIAssistantAction) => void;
}

export function AIMessageList({ messages, loading = false }: AIMessageListProps) {
  return (
    <div className="space-y-4 py-4">
      {messages.map((msg) => {
        const isUser = msg.sender === 'USER';

        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                isUser
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
                  : 'bg-slate-850 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Action Cards */}
              {!isUser && msg.actions && msg.actions.length > 0 && (
                <div className="space-y-2 mt-2">
                  {msg.actions.map((act, idx) => (
                    <AIActionCard key={idx} action={act} />
                  ))}
                </div>
              )}

              {/* Data References / Citations */}
              {!isUser && msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                  <div className="font-semibold text-slate-500 uppercase tracking-wider">Source References</div>
                  {msg.citations.map((c, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="font-medium text-slate-300">{c.label}</span>
                      {c.details && <span className="text-slate-500">({c.details})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>AI Assistant is analyzing domain context...</span>
          </div>
        </div>
      )}
    </div>
  );
}
