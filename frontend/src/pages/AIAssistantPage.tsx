import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, Trash2, Bot, User as UserIcon, Loader2, Wallet, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { aiService, ChatMessage } from '../services/api';

const SUGGESTED_PROMPTS = [
  { icon: Wallet, text: 'Can I afford buying a ₹50,000 smartphone this month?' },
  { icon: PiggyBank, text: 'How can I save ₹20,000 over the next 3 months?' },
  { icon: Sparkles, text: 'Is my spending on track with the 50/30/20 rule this month?' },
  { icon: Sparkles, text: 'Where can I cut costs to hit my savings goals faster?' },
];

const formatTime = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

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

function MarkdownMessage({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        if (trimmed.startsWith('#')) {
          const headingText = trimmed.replace(/^#{1,6}\s*/, '');
          return (
            <h4 key={i} className={`font-bold text-base mt-2 mb-1 ${isUser ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
              {renderInlineMarkdown(headingText, isUser)}
            </h4>
          );
        }

        if (/^[-*+]\s+/.test(trimmed)) {
          const listText = trimmed.replace(/^[-*+]\s+/, '');
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className={`font-bold text-xs mt-1 ${isUser ? 'text-indigo-200' : 'text-indigo-500'}`}>•</span>
              <div className="flex-1">{renderInlineMarkdown(listText, isUser)}</div>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 pl-0.5">
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

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await aiService.getHistory();
        setMessages(res.data.messages);
      } catch (error) {
        // Silent — a fresh conversation is a fine fallback
        console.error(error);
      } finally {
        setLoadingHistory(false);
        scrollToBottom();
      }
    };
    loadHistory();
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

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
    } catch (error: any) {
      const errMsg = error?.message || 'Something went wrong. Please try again.';
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
    if (!window.confirm('Clear this entire conversation? This cannot be undone.')) return;
    setClearing(true);
    try {
      await aiService.clearHistory();
      setMessages([]);
      toast.success('Conversation cleared');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to clear conversation');
    } finally {
      setClearing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden mb-6 flex-shrink-0">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">GeniusAI Assistant</h1>
              <p className="text-indigo-200 text-sm">Your personal AI financial coach — grounded in your real transactions</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            disabled={clearing || messages.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-md flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6 py-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-700 flex items-center justify-center">
                <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ask me anything about your money</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 max-w-md">
                  I can see your live budget, goals, subscriptions and investments — ask affordability
                  questions, savings roadmaps, or general financial advice.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
                    className="flex items-start gap-2 text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors text-sm text-gray-700 dark:text-slate-200"
                  >
                    <p.icon className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg._id || idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-purple-100 dark:bg-slate-700 text-purple-600 dark:text-purple-300'
                  }`}
                >
                  {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-tl-sm'
                    }`}
                  >
                    <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
                  </div>
                  {msg.createdAt && (
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-slate-700 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-100 dark:border-slate-700 p-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a purchase, a savings goal, or your budget..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-4 py-3 text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-[120px]"
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
            GeniusAI can make mistakes. Verify important financial decisions with a professional.
          </p>
        </div>
      </div>
    </div>
  );
}
