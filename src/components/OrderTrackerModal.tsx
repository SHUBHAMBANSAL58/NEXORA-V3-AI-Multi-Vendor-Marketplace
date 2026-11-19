import React, { useEffect } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { UserOrder, UserProfile, OrderStage } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { buildTrackingTimelineStepper, generateTrackingTimeline } from '../utils/commerceFeatures.js';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: UserOrder | null;
  user?: UserProfile;
  onAdvanceStage: (orderId: string) => void;
}

const STAGE_ADVANCE_LABEL: Record<string, string> = {
  Placed: 'Packed',
  Packed: 'Shipped',
  Shipped: 'Out for Delivery',
  'Out for Delivery': 'Delivered',
};

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen,
  onClose,
  order,
  user,
  onAdvanceStage,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const timeline = buildTrackingTimelineStepper(order);
  const currentStage: OrderStage = order.trackingStage || (order.status as OrderStage) || 'Processing';
  const isFinalDelivered = timeline.isDelivered;
  const nextStepLabel = STAGE_ADVANCE_LABEL[timeline.activeStepLabel] || 'Delivered';

  const deliveryAddr =
    order.deliveryAddress ||
    user?.addresses.find((a) => a.isDefault) ||
    user?.addresses[0];
  const destinationLabel = deliveryAddr
    ? `${deliveryAddr.city}, ${deliveryAddr.state} (${deliveryAddr.pinCode})`
    : 'New Delhi, India (110001)';

  // Get or generate checkpoints
  const checkpoints =
    order.checkpoints && order.checkpoints.length > 0
      ? order.checkpoints
      : generateTrackingTimeline(currentStage, order.date, destinationLabel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Real-Time Dispatch Tracker for ${order.id}`}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Real-Time Dispatch Tracker
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 font-bold">
                  {order.id}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Courier: {order.courierPartner || 'BlueDart Express Air'} · AWB:{' '}
                <span className="font-mono">{order.trackingNumber || 'BLD-84920481'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dispatch tracker"
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. VISUAL PROGRESSION STEPPER (5 STEPS) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Tracking Timeline
              </span>
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  timeline.isCancelled
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-cyan-600 dark:text-cyan-400'
                }`}
              >
                {!timeline.isCancelled && (
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                )}
                <span>Live Stage: {timeline.activeStepLabel}</span>
              </span>
            </div>

            {/* 5-Step Stepper bar */}
            <div className="relative grid grid-cols-5 gap-1">
              {/* Background Line */}
              <div className="absolute left-[10%] right-[10%] top-4 h-1 bg-slate-200 dark:bg-slate-800 -z-0" />
              {/* Active Fill Line */}
              {!timeline.isCancelled && (
                <div
                  className="absolute left-[10%] top-4 h-1 bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500 -z-0"
                  style={{ width: `${timeline.railPercent * 0.8}%` }}
                />
              )}

              {timeline.steps.map((step, idx) => {
                const isCompleted = step.state === 'completed';
                const isCurrent = step.state === 'current';
                const isCancelledStep = step.state === 'cancelled';

                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isCancelledStep
                          ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-500'
                          : isCurrent
                          ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20 shadow-md font-bold'
                          : isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-mono font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-2 text-center leading-tight ${
                        isCancelledStep
                          ? 'text-rose-700 dark:text-rose-400'
                          : isCurrent
                          ? 'text-cyan-700 dark:text-cyan-400 font-bold'
                          : isCompleted
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. ORDER DETAILS PREVIEW */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                Destination: {destinationLabel}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                Estimated Delivery:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {order.estimatedDeliveryDate || 'Tomorrow by 8:00 PM'}
                </strong>
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrencyINR(order.totalPaise)}
              </p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400">{order.itemsCount} Items</p>
            </div>
          </div>

          {/* 3. CHECKPOINT TIMELINE */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
              <span>Verified Courier Checkpoints</span>
            </h4>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {checkpoints.map((cp, idx) => (
                <div key={idx} className="relative group">
                  {/* Dot */}
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      cp.completed
                        ? 'bg-emerald-500 border-white dark:border-[#0c121e]'
                        : 'bg-slate-300 dark:bg-slate-700 border-white dark:border-[#0c121e]'
                    }`}
                  />

                  <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {cp.stage}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {cp.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      {cp.description}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">
                      <MapPin className="w-3 h-3" />
                      <span>{cp.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer with Live Simulation Trigger */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" />
            <span>Simulated logistics telemetry · NEXORA Express Gateway</span>
          </div>

          {timeline.isCancelled ? (
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              Order Cancelled
            </span>
          ) : !isFinalDelivered ? (
            <button
              type="button"
              onClick={() => onAdvanceStage(order.id)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Simulate Next Stage ({nextStepLabel})</span>
            </button>
          ) : (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Package Successfully Delivered</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
