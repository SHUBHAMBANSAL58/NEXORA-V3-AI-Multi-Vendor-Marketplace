import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, Sparkles, X, Gift, ShieldCheck, ArrowRight } from 'lucide-react';
import { validateNewsletterEmail } from '../utils/commerceFeatures.js';

interface NewsletterSubscribeProps {
  onNotifyToast?: (message: string) => void;
  className?: string;
}

export const NewsletterSubscribe: React.FC<NewsletterSubscribeProps> = ({
  onNotifyToast,
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Auto-dismiss floating toast notification
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateNewsletterEmail(email);
    if (!validation.valid) {
      setError(validation.error || 'Please enter a valid email address');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const confirmedEmail = email.trim();

    try {
      const response = await fetch('/api/v1/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmedEmail }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error || 'Could not process subscription right now.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setIsSubscribed(true);
      setSubscribedEmail(confirmedEmail);
      setEmail('');

      const msg = payload.data?.alreadySubscribed
        ? `${confirmedEmail} is already in NEXORA Circle! Coupon FESTIVE500 remains active.`
        : `Welcome to NEXORA Circle! ₹500 discount voucher sent to ${confirmedEmail}.`;
      setToastMessage(msg);
      setShowToast(true);
      onNotifyToast?.(msg);
    } catch {
      setIsSubmitting(false);
      setError('Unable to reach server. Please try again in a moment.');
    }
  };

  const handleReset = () => {
    setIsSubscribed(false);
    setError(null);
    setEmail('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* SUCCESS TOAST NOTIFICATION (Fixed bottom-right with viewport presence) */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] p-4 rounded-xl bg-slate-900/95 dark:bg-[#0c121e]/95 backdrop-blur-md border border-cyan-500/50 text-white shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Subscription Confirmed
              </h5>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                VIP Drop
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-snug">
              {toastMessage}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-cyan-400 font-mono">
              <Gift className="w-3.5 h-3.5" />
              <span>Promo Code: <strong>FESTIVE500</strong></span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            aria-label="Close notification"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN NEWSLETTER SUBSCRIPTION CARD */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#0b1424] border border-cyan-500/30 text-white shadow-xl relative overflow-hidden">
        {/* Subtle background ambient blur */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Header & Value Proposition */}
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono font-semibold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>NEXORA CHRONICLE · WEEKLY CURATED DROPS</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Discover First. Shop Smarter. Never Miss a Drop.
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Join discerning creators and studio engineers across India. Receive private batch releases, architectural teardowns, and an instant <strong>₹500 welcome credit</strong>.
            </p>
          </div>

          {/* Form / Subscribed Confirmation State */}
          <div className="w-full lg:max-w-md">
            {isSubscribed ? (
              <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>You're officially subscribed!</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We've linked <strong className="text-white">{subscribedEmail}</strong>. Use your exclusive coupon at checkout:
                </p>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white tracking-wider">FESTIVE500</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">Flat ₹500 Off</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                >
                  Subscribe another email address →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Enter your email (e.g. name@studio.io)"
                      className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-slate-950/80 border text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        error
                          ? 'border-rose-500 focus:ring-rose-500/40'
                          : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30'
                      }`}
                      aria-invalid={!!error}
                      aria-describedby={error ? 'newsletter-error' : undefined}
                      disabled={isSubmitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 hover:from-cyan-300 hover:to-teal-300 transition-all shadow-md hover:shadow-cyan-500/20 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Validation Error Banner */}
                {error && (
                  <div
                    id="newsletter-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/50 border border-rose-800/80 px-3 py-1.5 rounded-lg animate-in fade-in duration-200"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Guarantee & Privacy Footnote */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Zero spam</span>
                  </span>
                  <span>·</span>
                  <span>One-click unsubscribe</span>
                  <span>·</span>
                  <span>Instant ₹500 Voucher</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
