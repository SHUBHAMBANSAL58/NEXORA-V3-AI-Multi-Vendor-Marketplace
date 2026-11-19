import React, { useState } from 'react';
import { X, RotateCcw, Check, Calendar, AlertCircle, ShieldCheck } from 'lucide-react';
import { UserOrder, UserProfile, OrderReturnInfo } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';

interface OrderReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: UserOrder | null;
  user?: UserProfile;
  onSubmitReturn: (orderId: string, returnInfo: OrderReturnInfo) => void;
}

const RETURN_REASONS = [
  'Defective or damaged hardware',
  'Different from website specifications / photo',
  'Incorrect size, color, or variant received',
  'Missing accessories or cable attachments',
  'Changed mind / would prefer a different model',
];

export const OrderReturnModal: React.FC<OrderReturnModalProps> = ({
  isOpen,
  onClose,
  order,
  user,
  onSubmitReturn,
}) => {
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState('');
  const [refundMethod, setRefundMethod] = useState<'source' | 'store-credit'>('source');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen || !order) return null;

  const pickupAddr =
    order.deliveryAddress ||
    user?.addresses.find((a) => a.isDefault) ||
    user?.addresses[0];
  const pickupLocationLabel = pickupAddr
    ? `${pickupAddr.pinCode}, ${pickupAddr.street}, ${pickupAddr.city}`
    : '110001, Connaught Place, New Delhi';

  // Compute pickup date 2 days from now
  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + 2);
  const pickupDateFormatted = pickupDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const rmaNumber = `RMA-NX${Math.floor(100000 + Math.random() * 900000)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const returnInfo: OrderReturnInfo = {
      requestedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      reason: `${reason}${details ? ` — Note: ${details}` : ''}`,
      rmaNumber,
      pickupScheduledDate: pickupDateFormatted,
      refundStatus: 'Pending Pickup',
    };

    setTimeout(() => {
      onSubmitReturn(order.id, returnInfo);
      setIsSubmitting(false);
      setIsCompleted(true);
      setTimeout(() => {
        setIsCompleted(false);
        onClose();
      }, 1800);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close return modal"
          className="absolute top-4 right-4 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Initiate Return & Reverse Pickup
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Order Ref: <span className="font-mono font-bold">{order.id}</span>
            </p>
          </div>
        </div>

        {/* Order mini summary */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 mb-4 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Delivered On: {order.date}</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              Refund Value: {formatCurrencyINR(order.totalPaise)}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            {order.items.map((it, idx) => (
              <span key={idx}>
                {it.title} (Qty: {it.quantity})
                {idx < order.items.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Select Reason for Return
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-medium cursor-pointer"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Additional Comments / Fault Description (Optional)
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Left earcup intermittent audio drop on Bluetooth 5.4 connection..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Refund Destination
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundMethod('source')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  refundMethod === 'source'
                    ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <p className="font-bold">Original Payment Method</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">2-4 business days</p>
              </button>

              <button
                type="button"
                onClick={() => setRefundMethod('store-credit')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  refundMethod === 'store-credit'
                    ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <p className="font-bold">Instant NEXORA Credit</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+5% Bonus Points</p>
              </button>
            </div>
          </div>

          {/* Reverse Pickup details box */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <Calendar className="w-3.5 h-3.5 text-cyan-500" />
              <span>Doorstep Reverse Pickup Scheduled: {pickupDateFormatted}</span>
            </div>
            <p>
              BlueDart / Delhivery courier agent will inspect original packaging and box contents at your registered delivery address ({pickupLocationLabel}).
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompleted}
              className="px-5 py-2.5 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isCompleted ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Return Request Submitted!</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Submit Return Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
