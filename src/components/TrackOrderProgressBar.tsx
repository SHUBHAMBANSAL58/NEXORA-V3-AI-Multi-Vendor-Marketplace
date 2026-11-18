import React, { useState } from 'react';
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FastForward,
  ExternalLink,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import { UserOrder, OrderStage, TrackingCheckpoint } from '../types/index.js';
import {
  buildTrackingTimelineStepper,
  generateTrackingTimeline,
  TrackingTimelineStepName,
} from '../utils/commerceFeatures.js';

interface TrackOrderProgressBarProps {
  order: UserOrder;
  onAdvanceStage?: (orderId: string) => void;
  onOpenDetailedTracker?: (order: UserOrder) => void;
}

const STEP_ICONS: Record<TrackingTimelineStepName, React.FC<{ className?: string }>> = {
  Placed: ShoppingBag,
  Packed: Package,
  Shipped: Truck,
  'Out for Delivery': MapPin,
  Delivered: CheckCircle2,
};

export const TrackOrderProgressBar: React.FC<TrackOrderProgressBarProps> = ({
  order,
  onAdvanceStage,
  onOpenDetailedTracker,
}) => {
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  const timeline = buildTrackingTimelineStepper(order);
  const currentStage: OrderStage = order.trackingStage || (order.status as OrderStage) || 'Processing';

  // Generate or read checkpoints
  const checkpoints: TrackingCheckpoint[] =
    order.checkpoints && order.checkpoints.length > 0
      ? order.checkpoints
      : generateTrackingTimeline(currentStage, order.date);

  return (
    <div
      data-testid={`tracking-timeline-${order.id}`}
      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-3.5 transition-all"
    >
      {/* 1. STATUS HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {timeline.isCancelled ? (
              <XCircle className="w-4 h-4 text-rose-500" />
            ) : (
              <>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    timeline.isDelivered ? 'bg-emerald-500' : 'bg-cyan-500 animate-ping'
                  }`}
                />
                <span
                  className={`absolute w-2 h-2 rounded-full ${
                    timeline.isDelivered ? 'bg-emerald-500' : 'bg-cyan-500'
                  }`}
                />
              </>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white text-xs">
              <span>Tracking Timeline:</span>
              <span
                className={`font-bold ${
                  timeline.isCancelled
                    ? 'text-rose-600 dark:text-rose-400'
                    : timeline.isDelivered
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-cyan-600 dark:text-cyan-400'
                }`}
              >
                {timeline.activeStepLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {order.courierPartner || 'BlueDart Express'} · AWB:{' '}
              <span className="font-mono">{order.trackingNumber || 'BLD-993201'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] self-start sm:self-center">
          <span className="text-slate-500 dark:text-slate-400">
            {timeline.isCancelled
              ? 'Status:'
              : timeline.isDelivered
              ? 'Delivered on time'
              : 'Estimated Delivery:'}
          </span>
          <span
            className={`font-bold px-2 py-0.5 rounded-md ${
              timeline.isCancelled
                ? 'text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60'
                : 'text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800'
            }`}
          >
            {timeline.isCancelled
              ? order.cancellationReason || 'Cancelled before dispatch'
              : order.estimatedDeliveryDate || 'Tomorrow by 8:00 PM'}
          </span>
        </div>
      </div>

      {/* 2. DYNAMIC 5-STEP TRACKING TIMELINE STEPPER (Placed -> Packed -> Shipped -> Out for Delivery -> Delivered) */}
      <div className="pt-2 pb-1">
        <div className="relative">
          {/* Background rail */}
          <div className="absolute left-[10%] right-[10%] top-4 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 -z-0" />

          {/* Animated gradient progress fill */}
          {!timeline.isCancelled && (
            <div
              className="absolute left-[10%] top-4 h-1.5 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 shadow-xs shadow-cyan-500/50 transition-all duration-700 ease-out -z-0"
              style={{ width: `calc(${timeline.railPercent * 0.8}%)` }}
            />
          )}

          {/* 5 Step Nodes */}
          <div
            role="list"
            aria-label="Tracking Timeline"
            className="relative z-10 grid grid-cols-5 gap-1"
          >
            {timeline.steps.map((step) => {
              const Icon = STEP_ICONS[step.key];
              const isCompleted = step.state === 'completed';
              const isCurrent = step.state === 'current';
              const isCancelledStep = step.state === 'cancelled';

              return (
                <div
                  key={step.key}
                  role="listitem"
                  aria-current={isCurrent ? 'step' : undefined}
                  data-step-state={step.state}
                  className="flex flex-col items-center text-center min-w-0"
                >
                  {/* Node Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCancelledStep
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300/80 dark:border-rose-800 text-rose-500'
                        : isCurrent
                        ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/30 shadow-md font-bold scale-105'
                        : isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Label */}
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold mt-2 leading-tight px-0.5 ${
                      isCancelledStep
                        ? 'text-rose-600 dark:text-rose-400'
                        : isCurrent
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>

                  {/* Sub-label */}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block mt-0.5 truncate max-w-full">
                    {step.sublabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS (EXPAND CHECKPOINTS / ADVANCE DEMO / OPEN MODAL) */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Toggle detailed checkpoints inline */}
        <button
          type="button"
          onClick={() => setShowCheckpoints(!showCheckpoints)}
          className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          {showCheckpoints ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Real-Time Checkpoints</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>
                View Real-Time Milestones ({checkpoints.filter((c) => c.completed).length}/{checkpoints.length})
              </span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* Stage advance simulation button for active non-cancelled orders */}
          {onAdvanceStage && !timeline.isDelivered && !timeline.isCancelled && (
            <button
              type="button"
              onClick={() => onAdvanceStage(order.id)}
              title="Simulate courier progress to next checkpoint"
              className="px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-200 dark:hover:bg-cyan-900 transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <FastForward className="w-3 h-3" />
              <span>Advance Status</span>
            </button>
          )}

          {/* Full modal open */}
          {onOpenDetailedTracker && (
            <button
              type="button"
              onClick={() => onOpenDetailedTracker(order)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Full Route</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. EXPANDABLE REAL-TIME MILESTONES LIST */}
      {showCheckpoints && (
        <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-slate-400">
            <span>Logistics Journey Log</span>
            <span>Live Sync: Just Now</span>
          </div>

          <div className="space-y-2">
            {checkpoints.map((cp, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors ${
                  cp.completed
                    ? 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800'
                    : 'bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    cp.completed
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {cp.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-semibold ${
                        cp.completed ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                      }`}
                    >
                      {cp.stage}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {cp.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium truncate mt-0.5">
                    📍 {cp.location}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {cp.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
