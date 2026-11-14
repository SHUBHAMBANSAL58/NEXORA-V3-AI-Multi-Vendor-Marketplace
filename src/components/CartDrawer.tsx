import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag, Check, AlertCircle, Percent } from 'lucide-react';
import { ProductVariant, PromoDiscount } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { validatePromoCode, calculateCartTotals } from '../utils/commerceFeatures.js';
import { SafeImage } from './SafeImage.js';

export interface CartLineItem {
  variant: ProductVariant;
  quantity: number;
  productTitle: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartLineItem[];
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onCheckout: () => void;
  appliedPromo?: PromoDiscount | null;
  onApplyPromo?: (promo: PromoDiscount) => void;
  onRemovePromo?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  appliedPromo = null,
  onApplyPromo,
  onRemovePromo,
}) => {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise,
    freeShippingThresholdPaise: freeShippingThreshold,
  } = calculateCartTotals(items, appliedPromo);

  const handleApplyCode = (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim();
    if (!code) return;

    const result = validatePromoCode(code, subtotalPaise);
    if (!result.valid || !result.promo) {
      setPromoError(result.message || 'Invalid coupon code');
      setPromoSuccess(null);
      return;
    }

    onApplyPromo?.(result.promo);
    setPromoError(null);
    setPromoSuccess(`Applied ${result.promo.code}: ${result.promo.description}`);
    setPromoInput('');
    setTimeout(() => setPromoSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-bold text-base tracking-tight">Shopping Bag</h3>
            <span className="text-xs text-slate-500 font-mono">
              ({items.reduce((acc, curr) => acc + curr.quantity, 0)} items)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
          {subtotalPaise >= freeShippingThreshold ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Qualified for Free Pan-India Express Delivery
            </span>
          ) : (
            <span>
              Add {formatCurrencyINR(freeShippingThreshold - subtotalPaise)} more for Free Shipping
            </span>
          )}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Your bag is empty</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Explore our curated marketplace and add studio-grade electronics and accessories.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.variant.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 flex gap-3.5"
              >
                {/* Visual Avatar with Real Photograph */}
                <div className="w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {item.variant.image ? (
                    <SafeImage
                      src={item.variant.image}
                      alt={item.productTitle}
                      className="w-full h-full object-cover"
                      fallbackLabel={item.productTitle}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: item.variant.colorHex }}
                    >
                      <ShoppingBag className="w-6 h-6 text-white/80" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.productTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Color: {item.variant.name} · SKU: {item.variant.sku}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrencyINR(item.variant.pricePaise)}
                    </span>

                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.variant.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-2 py-0.5 text-xs font-mono">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.variant.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.variant.id)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Promo Code and Calculations */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
            {/* Promo Code Input & Suggestions */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-cyan-500" />
                  <span>Promo / Discount Voucher</span>
                </span>
                {appliedPromo && (
                  <button
                    type="button"
                    onClick={onRemovePromo}
                    className="text-rose-500 hover:underline font-normal text-[10px] cursor-pointer"
                  >
                    Remove Code
                  </button>
                )}
              </label>

              {appliedPromo ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">
                        {appliedPromo.code}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                        {appliedPromo.description}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    -{formatCurrencyINR(discountPaise)}
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Promo code"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    placeholder="Enter NEXORA10 or STUDIO20"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCode()}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl hover:bg-cyan-600 dark:hover:bg-cyan-400 transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Promo Error or Success Alerts */}
              {promoError && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{promoError}</span>
                </p>
              )}
              {promoSuccess && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3 shrink-0" />
                  <span>{promoSuccess}</span>
                </p>
              )}

              {/* Quick Suggestion Chips */}
              {!appliedPromo && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400">Try:</span>
                  {['NEXORA10', 'STUDIO20', 'FESTIVE500'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleApplyCode(chip)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80 hover:bg-cyan-100 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Subtotal (Inclusive of GST)</span>
                <span className="font-mono">{formatCurrencyINR(subtotalPaise)}</span>
              </div>
              {appliedPromo && discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Voucher Discount ({appliedPromo.code})</span>
                  <span className="font-mono">-{formatCurrencyINR(discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping (India)</span>
                <span className="font-mono">
                  {shippingPaise === 0 ? 'FREE' : formatCurrencyINR(shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Total Amount</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400">
                  {formatCurrencyINR(totalPaise)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>Razorpay Test Mode Checkout · 256-Bit SSL Encryption</span>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

