import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, Trash2, Bot, User as UserIcon, Loader2, X, MessageSquare, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { aiService, ChatMessage } from '../services/api';
import { Link } from 'react-router-dom';

const QUICK_TUTOR_PROMPTS = [
  'Can I afford a purchase this month?',
  'How do I save ₹20,000 in 3 months?',
  'Am I following the 50/30/20 rule?',
  'How do I set up a financial goal?'
];

function renderInlineMarkdown(text: string, isUser: boolean): React.ReactNode[] {
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <strong key={index} className={`font-bold italic ${isUser ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {part.slice(3, -3)}
        </strong>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className={`font-bold ${isUser ? 'text-white font-extrabold' : 'text-slate-900 dark:text-white'}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className={`px-1.5 py-0.5 rounded text-xs font-mono ${isUser ? 'bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-slate-600 text-purple-700 dark:text-purple-300'}`}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function WidgetMarkdownMessage({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1 text-xs sm:text-sm">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        if (trimmed.startsWith('#')) {
          const headingText = trimmed.replace(/^#{1,6}\s*/, '');
          return (
            <h5 key={i} className={`font-bold text-xs sm:text-sm mt-1.5 mb-0.5 ${isUser ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
              {renderInlineMarkdown(headingText, isUser)}
            </h5>
          );
        }

        if (/^[-*+]\s+/.test(trimmed)) {
          const listText = trimmed.replace(/^[-*+]\s+/, '');
          return (
            <div key={i} className="flex items-start gap-1.5 pl-1">
              <span className={`font-bold text-[10px] mt-1 ${isUser ? 'text-indigo-200' : 'text-indigo-500'}`}>•</span>
              <div className="flex-1">{renderInlineMarkdown(listText, isUser)}</div>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-1.5 pl-0.5">
              <span className={`font-bold text-xs mt-0.5 ${isUser ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {numMatch[1]}.
              </span>
              <div className="flex-1">{renderInlineMarkdown(numMatch[2], isUser)}</div>
            </div>
          );
        }

        return <p key={i}>{renderInlineMarkdown(line, isUser)}</p>;
      })}
    </div>
  );
}

export function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await aiService.getHistory();
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingHistory(false);
      scrollToBottom();
    }
  }, [scrollToBottom]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen, messages.length, loadHistory]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, sending, isOpen, scrollToBottom]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setSending(true);

    try {
      const res = await aiService.sendMessage(text);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: res.data.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (!isOpen) setHasUnread(true);
    } catch (error: any) {
      const errMsg = error?.message || 'Failed to send message.';
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear AI Tutor history?')) return;
    try {
      await aiService.clearHistory();
      setMessages([]);
      toast.success('Chat history cleared');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to clear chat');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="pointer-events-auto mb-4 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-3.5 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Sparkles className="w-4 h-4 text-purple-200" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 leading-none">
                  GeniusAI Tutor
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-indigo-100 mt-0.5">Your 24/7 Financial Coach</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                to="/dashboard/ai-assistant"
                title="Open Fullscreen Page"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                onClick={handleClear}
                title="Clear History"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-slate-900/50">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white">Hi! I'm your GeniusAI Tutor</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Ask me anything about your current expenses, savings roadmap, or budgeting advice!
                  </p>
                </div>
                <div className="space-y-1.5 w-full mt-2">
                  {QUICK_TUTOR_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={msg._id || idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-purple-100 dark:bg-slate-700 text-purple-600 dark:text-purple-300'
                    }`}
                  >
                    {msg.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-tl-xs border border-gray-100 dark:border-slate-600 shadow-xs'
                      }`}
                    >
                      <WidgetMarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-slate-700 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl rounded-tl-xs px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask GeniusAI Tutor..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-xs text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-[80px]"
              />
              <button
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="pointer-events-auto relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <div className="relative">
          <Sparkles className="w-5 h-5 text-purple-200 group-hover:rotate-12 transition-transform" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-700 animate-ping" />
          )}
        </div>
        <span className="font-semibold text-xs sm:text-sm tracking-wide">GeniusAI Tutor</span>
        {isOpen ? (
          <X className="w-4 h-4 ml-1 opacity-80" />
        ) : (
          <MessageSquare className="w-4 h-4 ml-0.5 opacity-80" />
        )}
      </button>
    </div>
  );
}
