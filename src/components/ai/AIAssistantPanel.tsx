'use client';

import { useState } from 'react';
import type { MessageItem } from './AIMessageList';
import { AIMessageList } from './AIMessageList';
import { AIInput } from './AIInput';
import { AISuggestionChips } from './AISuggestionChips';

export interface AIAssistantPanelProps {
  role: 'CUSTOMER' | 'DRIVER';
  title?: string;
  subtitle?: string;
  className?: string;
  onClose?: () => void;
}

export function AIAssistantPanel({
  role,
  title,
  subtitle,
  className = '',
  onClose,
}: AIAssistantPanelProps) {
  const defaultTitle = role === 'CUSTOMER' ? 'Customer AI Concierge' : 'Driver AI Copilot';
  const defaultSubtitle = role === 'CUSTOMER' ? 'Smart booking assistant & trip guide' : 'Shift briefing, earnings & operational guide';

  const [messages, setMessages] = useState<MessageItem[]>(() => [
    {
      id: 'welcome-msg',
      sender: 'ASSISTANT',
      content: role === 'CUSTOMER'
        ? '👋 Hello! I am your GET APNA DRIVER AI Concierge. I can help prefill bookings, check fare quotes, find active promotions, review loyalty rewards, or assist with active trips. How can I help you today?'
        : '👋 Good day, Captain! I am your GET APNA DRIVER Copilot. I can provide your daily shift briefing, summarize earnings, track incentive progress, check shift schedules, or guide you to customer pickup points. What would you like to know?',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    const userMsgId = `user-${Date.now()}`;
    const newMsg: MessageItem = {
      id: userMsgId,
      sender: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const endpoint = role === 'CUSTOMER' ? '/api/customer/ai' : '/api/driver/ai';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      });

      if (!res.ok) {
        throw new Error('AI request failed');
      }

      const data = await res.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMsg: MessageItem = {
        id: `ast-${Date.now()}`,
        sender: 'ASSISTANT',
        content: data.message || 'Thank you.',
        actions: data.actions,
        citations: data.citations,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ASSISTANT',
          content: 'I am temporarily unable to connect to the AI service. You can continue using the standard application features.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            {title || defaultTitle}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle || defaultSubtitle}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close Assistant"
          >
            ✕
          </button>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto px-5 min-h-[300px] max-h-[500px]">
        <AIMessageList messages={messages} loading={loading} />
      </div>

      {/* Footer / Input Zone */}
      <div className="p-4 bg-slate-850 border-t border-slate-800 space-y-2">
        <AISuggestionChips role={role} onSelectChip={handleSendMessage} disabled={loading} />
        <AIInput onSendMessage={handleSendMessage} loading={loading} />
      </div>
    </div>
  );
}
