import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  CheckCircle,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  Volume2,
} from 'lucide-react';

interface NovaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (productTitle: string) => void;
}

interface Message {
  role: 'assistant' | 'user';
  text: string;
  suggestion?: string;
  recommendedProductTitle?: string;
  isError?: boolean;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const SOUND_WAVE_BARS = [
  { delay: '0ms', heightClass: 'h-3' },
  { delay: '120ms', heightClass: 'h-6' },
  { delay: '240ms', heightClass: 'h-4' },
  { delay: '60ms', heightClass: 'h-7' },
  { delay: '180ms', heightClass: 'h-5' },
  { delay: '300ms', heightClass: 'h-7' },
  { delay: '90ms', heightClass: 'h-4' },
  { delay: '210ms', heightClass: 'h-6' },
  { delay: '150ms', heightClass: 'h-3' },
];

export const NovaModal: React.FC<NovaModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Namaste! I'm NOVA, your NEXORA AI Shopping Assistant connected to our live verified catalog via server-side Gemini inference. Ask me about headphones, mechanical keyboards, watches, GST billing, or India express delivery.",
      suggestion: 'Compare Aura Pulse Pro with Sennheiser Momentum 4',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inferenceMode, setInferenceMode] = useState<'gemini-live' | 'offline-catalog-fallback'>('gemini-live');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatusNote, setVoiceStatusNote] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSend = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) return;

    const historyForApi = messages
      .filter((m) => !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setIsLoading(true);
    setVoiceStatusNote(null);

    try {
      const response = await fetch('/api/v1/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        const errorText =
          payload?.error ||
          'NOVA AI service is currently unavailable. Please verify GEMINI_API_KEY configuration on the server.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: errorText,
            isError: true,
          },
        ]);
        return;
      }

      const data = payload.data || {};
      if (data.mode === 'offline-catalog-fallback' || data.mode === 'gemini-live') {
        setInferenceMode(data.mode);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || 'No response text returned.',
          recommendedProductTitle: data.recommendedProductTitle,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to reach /api/v1/nova/chat. Ensure the Express server is running.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setVoiceStatusNote(null);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsListening(true);
      setVoiceStatusNote(
        'Microphone capture active — browser SpeechRecognition unavailable here, type your query or click Stop.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognitionRef.current = recognition;
      setIsListening(true);
      setVoiceStatusNote('Listening for your voice command (English - India)...');

      recognition.onresult = (event) => {
        let transcript = '';
        let final = false;
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) final = true;
        }
        if (transcript.trim()) {
          setInput(transcript.trim());
        }
        if (final && transcript.trim()) {
          setIsListening(false);
          setVoiceStatusNote(null);
          void handleSend(transcript.trim());
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceStatusNote('Voice input could not access a microphone. You can type your question below.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceStatusNote('Voice capture unavailable in this browser context.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[560px] max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="NOVA AI Shopping Assistant"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <span>NOVA AI Shopping Assistant</span>
                <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/80 px-1.5 py-0.5 rounded font-semibold">
                  {inferenceMode === 'offline-catalog-fallback' ? 'Catalog Fallback' : 'Gemini Live'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Live catalog & verified seller intelligence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-xs'
                    : m.isError
                    ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 rounded-bl-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                }`}
              >
                {m.isError && (
                  <div className="flex items-center gap-1.5 font-semibold mb-1 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Live Inference Status</span>
                  </div>
                )}
                <p className="whitespace-pre-line">{m.text}</p>
              </div>

              {m.suggestion && (
                <button
                  type="button"
                  onClick={() => void handleSend(m.suggestion!)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Try: {m.suggestion}</span>
                </button>
              )}

              {m.recommendedProductTitle && (
                <button
                  type="button"
                  onClick={() => onSelectProduct(m.recommendedProductTitle!)}
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 text-[11px] text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 font-semibold cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Filter Catalog for {m.recommendedProductTitle}</span>
                </button>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start">
              <div className="px-3.5 py-2.5 rounded-xl rounded-bl-xs bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                <span>NOVA is checking verified catalog specs...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Active Voice Listening Sound Wave Bar Visualizer */}
        {(isListening || voiceStatusNote) && (
          <div
            data-testid="nova-voice-wave-panel"
            className="mx-3 mb-2 p-3 rounded-xl border border-cyan-300 dark:border-cyan-800/70 bg-cyan-50/90 dark:bg-cyan-950/40 flex items-center justify-between gap-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300">
                  {isListening ? 'NOVA Active Voice Listening' : 'Voice Input Notice'}
                </p>
                <p className="text-[10px] text-cyan-700/80 dark:text-cyan-300/80 truncate">
                  {voiceStatusNote || 'Speak clearly about products, specs, or prices...'}
                </p>
              </div>
            </div>

            {isListening && (
              <div
                aria-label="Voice sound wave animation"
                className="flex items-center gap-1 h-8 px-2 shrink-0"
              >
                {SOUND_WAVE_BARS.map((bar, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-gradient-to-t from-cyan-600 to-blue-400 dark:from-cyan-400 dark:to-sky-300 ${bar.heightClass} animate-bounce`}
                    style={{
                      animationDelay: bar.delay,
                      animationDuration: '750ms',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend(input);
          }}
          className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60"
        >
          <button
            type="button"
            onClick={toggleVoiceInput}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            title={isListening ? 'Stop listening' : 'Voice Search'}
            className={`p-2 rounded-lg border transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-500/25 animate-pulse'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about specs, variants, return policy, delivery..."
            className="flex-1 min-w-0 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg cursor-pointer shrink-0"
            aria-label="Send message to NOVA"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
