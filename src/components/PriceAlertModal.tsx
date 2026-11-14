import React, { useState, useEffect } from 'react';
import { X, Bell, Check, TrendingDown, Sparkles } from 'lucide-react';
import { CatalogProduct, PriceAlert } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { SafeImage } from './SafeImage.js';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CatalogProduct | null;
  userEmail: string;
  onSaveAlert: (alert: PriceAlert) => void;
  onSimulatePriceDrop: (product: CatalogProduct, alertPricePaise: number) => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  product,
  userEmail,
  onSaveAlert,
  onSimulatePriceDrop,
}) => {
  const defaultTargetRupees = product ? Math.round((product.pricePaise * 0.9) / 100) : 0;
  const [targetRupees, setTargetRupees] = useState<number>(defaultTargetRupees);
  const [email, setEmail] = useState<string>(userEmail || 'bansalshubham662@gmail.com');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (product) {
      setTargetRupees(Math.round((product.pricePaise * 0.9) / 100));
      setSaved(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const targetPaise = targetRupees * 100;
  const savingsPaise = Math.max(0, product.pricePaise - targetPaise);
  const savingsPercent = Math.round((savingsPaise / product.pricePaise) * 100);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPaise <= 0 || targetPaise >= product.pricePaise) return;

    const alert: PriceAlert = {
      id: `alert-${Date.now()}`,
      productId: product.id,
      productTitle: product.title,
      targetPricePaise: targetPaise,
      currentPricePaise: product.pricePaise,
      userEmail: email,
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    onSaveAlert(alert);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const handleSimulate = () => {
    onSimulatePriceDrop(product, targetPaise);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Set Price Drop Alert
            </h3>
            <p className="text-xs text-slate-500">
              Get notified immediately when this item drops below your target.
            </p>
          </div>
        </div>

        {/* Product mini summary */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3 mb-5">
          <SafeImage
            src={product.image}
            alt={product.title}
            fallbackLabel={product.brand}
            className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className="text-slate-500">Current Price:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrencyINR(product.pricePaise)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Target Price Threshold (in INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
              <input
                type="number"
                min={100}
                max={Math.floor(product.pricePaise / 100) - 1}
                value={targetRupees}
                onChange={(e) => setTargetRupees(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono font-bold text-slate-900 dark:text-white text-sm"
                required
              />
            </div>
            <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500">
              <span>Potential Savings:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrencyINR(savingsPaise)} ({savingsPercent}% OFF)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Notification Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
              required
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={saved}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Alert Activated!</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Set Price Alert at {formatCurrencyINR(targetPaise)}</span>
                </>
              )}
            </button>

            {/* Test simulator button */}
            <button
              type="button"
              onClick={handleSimulate}
              className="w-full py-2.5 bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold text-xs rounded-xl border border-cyan-200 dark:border-cyan-800/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Simulate Live Price Drop Alert</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
