import React, { useState, useRef, useEffect } from 'react';
import { usePreferences } from '../store/preferences.js';
import { api } from '../services/api.js';
import type { ChatMessage } from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  Bot,
  BookOpen,
  Brain,
} from 'lucide-react';

export const AskAirwisePage: React.FC = () => {
  const { preferences } = usePreferences();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm **AIRWISE**, your urban air quality and environmental health assistant.\n\nI have your current preferences for **${preferences?.location.city || 'your city'}** loaded. How can I help you navigate today's air? You can ask about outdoor exercise safety, commute adjustments, room ventilation timing, or indoor filtration hacks.`,
      timestamp: new Date().toISOString(),
      isAiGenerated: false,
      sources: ['CPCB NAQI Guidelines (2014)', 'WHO Air Quality Guidelines'],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    'Should I exercise outside today?',
    'How should I ventilate my bedroom today?',
    'What mask should I wear during my commute?',
    'How to improve air quality without a purifier?',
    'Are outdoor activities safe for my children today?',
  ];

  const handleSend = async (messageToSend?: string) => {
    const text = messageToSend || input;
    if (!text.trim() || !preferences || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
      isAiGenerated: false,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.sendChatMessage(text.trim(), preferences, history);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I experienced an issue connecting to the AI assistant. However, based on deterministic CPCB guidelines: during elevated pollution, keep windows sealed, avoid vigorous outdoor workouts, and utilize certified N95 respirators for outdoor transit.',
          timestamp: new Date().toISOString(),
          isAiGenerated: false,
          sources: ['CPCB Advisory (2014)'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!preferences) {
    return (
      <div className="py-12 text-center text-surface-500">
        Please complete onboarding first.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center shadow-sm">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
              <span>Ask Airwise AI</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                Context-Aware
              </span>
            </h1>
            <p className="text-xs text-surface-500">
              Personalized guidance for {preferences.location.city} based on CPCB standards and WHO science.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <Card padding="none" className="flex flex-col h-[560px] border-surface-200 shadow-md overflow-hidden bg-surface-50/50">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-brand-700 text-white'
                      : 'bg-white border border-surface-200 text-brand-800 shadow-sm'
                  }`}
                  aria-hidden="true"
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-brand-700 text-white rounded-tr-none'
                        : 'bg-white border border-surface-200 text-surface-800 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>

                  {/* Sources pill for assistant messages */}
                  {!isUser && m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-surface-400 pl-1">
                      <BookOpen className="w-3 h-3 text-surface-400" />
                      <span>Evidence: {m.sources.join(' • ')}</span>
                      {m.isAiGenerated && (
                        <span className="flex items-center gap-0.5 text-brand-700 font-semibold ml-1">
                          <Brain className="w-2.5 h-2.5" /> Gemini
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white border border-surface-200 text-brand-800 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-surface-200 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-surface-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600 animate-spin" />
                <span>Evaluating environmental context and formulating recommendation...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 border-t border-surface-200 bg-white/60 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          <span className="text-[10px] uppercase font-bold text-surface-400 shrink-0">
            Suggested:
          </span>
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-full bg-surface-100 hover:bg-brand-50 hover:text-brand-800 border border-surface-200 text-surface-600 whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-surface-200 flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a practical question about your daily routine, commute, or indoor air..."
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none rounded-xl border border-surface-200 p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none max-h-32"
          />

          <Button
            size="md"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="rounded-xl px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
