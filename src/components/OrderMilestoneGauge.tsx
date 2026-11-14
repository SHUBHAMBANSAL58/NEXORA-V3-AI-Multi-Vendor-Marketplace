import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Package,
  Clock,
  Truck,
  MapPin,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { OrderStage, UserOrder } from '../types/index.js';

interface OrderMilestoneGaugeProps {
  order: UserOrder;
  onAdvanceStage?: (orderId: string) => void;
  className?: string;
}

const MILESTONE_STAGES: Array<{
  stage: OrderStage;
  label: string;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    stage: 'Processing',
    label: 'Order Placed & Verified',
    percentage: 25,
    icon: Package,
    description: 'Inventory reserved & merchant QA verified',
  },
  {
    stage: 'Dispatched',
    label: 'Dispatched from Hub',
    percentage: 50,
    icon: Truck,
    description: 'Manifested with BlueDart Air Apex',
  },
  {
    stage: 'Out for Delivery',
    label: 'Out for Delivery',
    percentage: 75,
    icon: MapPin,
    description: 'Courier agent on route to doorstep',
  },
  {
    stage: 'Delivered',
    label: 'Delivered to Recipient',
    percentage: 100,
    icon: CheckCircle2,
    description: 'Handed over & digital OTP confirmed',
  },
];

export const OrderMilestoneGauge: React.FC<OrderMilestoneGaugeProps> = ({
  order,
  onAdvanceStage,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

  // Normalize current stage percentage
  const currentStage = order.trackingStage || (order.status as OrderStage) || 'Processing';
  const stageIndex = MILESTONE_STAGES.findIndex((m) => m.stage === currentStage);
  const activePercentage = stageIndex >= 0 ? MILESTONE_STAGES[stageIndex].percentage : 25;

  const width = 340;
  const height = 230;
  const radius = 115;
  const innerRadius = 96;

  // Arc angles from -125 degrees to +125 degrees (open bottom circular sweep)
  const startAngle = (-125 * Math.PI) / 180;
  const endAngle = (125 * Math.PI) / 180;
  const totalAngleSpan = endAngle - startAngle;

  // D3 animated render effect
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height * 0.58})`);

    // Linear gradient for progress arc
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', `milestone-gradient-${order.id}`)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4'); // cyan-500
    gradient.append('stop').attr('offset', '65%').attr('stop-color', '#3b82f6'); // blue-500
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#10b981'); // emerald-500

    // Filter for glowing arc shadow
    const filter = defs
      .append('filter')
      .attr('id', `glow-${order.id}`)
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter
      .append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    filter
      .append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    // Background track arc
    const backgroundArcGenerator = d3
      .arc<void>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(10);

    g.append('path')
      .attr('d', backgroundArcGenerator() || '')
      .attr('class', 'fill-slate-200 dark:fill-slate-800/80')
      .attr('stroke', 'rgba(255,255,255,0.05)')
      .attr('stroke-width', 1);

    // Active progress arc generator
    const targetEndAngle = startAngle + (totalAngleSpan * activePercentage) / 100;

    const progressArcGenerator = d3
      .arc<{ endAngle: number }>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle((d) => d.endAngle)
      .cornerRadius(10);

    // Progress path with D3 transition
    const progressPath = g
      .append('path')
      .datum({ endAngle: startAngle })
      .attr('fill', `url(#milestone-gradient-${order.id})`)
      .attr('filter', `url(#glow-${order.id})`)
      .attr('d', progressArcGenerator);

    progressPath
      .transition()
      .duration(1100)
      .ease(d3.easeCubicOut)
      .attrTween('d', (d) => {
        const interpolate = d3.interpolate(d.endAngle, targetEndAngle);
        return (t) => {
          d.endAngle = interpolate(t);
          return progressArcGenerator(d) || '';
        };
      });

    // Milestone tick dots along the arc
    const arcCenterRadius = (radius + innerRadius) / 2;
    MILESTONE_STAGES.forEach((stage, idx) => {
      const nodeAngle = startAngle + (totalAngleSpan * stage.percentage) / 100;
      // D3 arc angles have 0 at 12 o'clock (top), clockwise
      // In cartesian: x = r * sin(angle), y = -r * cos(angle)
      const x = arcCenterRadius * Math.sin(nodeAngle);
      const y = -arcCenterRadius * Math.cos(nodeAngle);

      const isCompleted = activePercentage >= stage.percentage;
      const isCurrent = stageIndex === idx;

      const nodeGroup = g
        .append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('class', 'cursor-pointer')
        .on('click', () => setSelectedMilestone(idx));

      // Outer halo for current or completed
      if (isCurrent) {
        nodeGroup
          .append('circle')
          .attr('r', 10)
          .attr('fill', 'none')
          .attr('stroke', '#06b6d4')
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.8)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '9;14;9')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');
      }

      // Core node circle
      nodeGroup
        .append('circle')
        .attr('r', isCurrent ? 7 : 5)
        .attr('fill', isCompleted ? (isCurrent ? '#ffffff' : '#06b6d4') : '#64748b')
        .attr('stroke', isCompleted ? '#0891b2' : '#334155')
        .attr('stroke-width', 2);
    });
  }, [order.id, activePercentage, stageIndex]);

  const activeMilestone =
    selectedMilestone !== null
      ? MILESTONE_STAGES[selectedMilestone]
      : MILESTONE_STAGES[Math.max(0, stageIndex)];

  const ActiveIcon = activeMilestone.icon;

  return (
    <div
      className={`relative p-5 rounded-2xl bg-white dark:bg-[#0b1322] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}
    >
      {/* Background radial accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
              Order Milestone Gauge
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              ID: {order.id} · {order.courierPartner}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            {activePercentage}% Completed
          </span>
          {onAdvanceStage && stageIndex < MILESTONE_STAGES.length - 1 && (
            <button
              type="button"
              onClick={() => onAdvanceStage(order.id)}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-cyan-500 dark:text-slate-950 hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              title="Simulate advance to next milestone"
            >
              <span>Next Stage</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas and Center Overlay */}
      <div className="relative flex items-center justify-center my-1">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible select-none drop-shadow-xs"
        />

        {/* Center Gauge Reading Hub */}
        <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-1">
            <ActiveIcon className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            {activePercentage}%
          </span>
          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 max-w-[130px] leading-tight mt-0.5">
            {currentStage}
          </span>
          <span className="text-[9px] font-mono text-slate-400 mt-0.5">
            {order.estimatedDeliveryDate}
          </span>
        </div>
      </div>

      {/* Milestone Checkpoints Row below the gauge */}
      <div className="relative z-10 grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {MILESTONE_STAGES.map((milestone, idx) => {
          const isPassed = activePercentage >= milestone.percentage;
          const isCurrent = stageIndex === idx;
          const isInspected = selectedMilestone === idx;

          return (
            <button
              key={milestone.stage}
              type="button"
              onClick={() => setSelectedMilestone(idx)}
              className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                isInspected
                  ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 shadow-xs'
                  : isCurrent
                  ? 'border-cyan-400/60 bg-slate-50 dark:bg-slate-900'
                  : isPassed
                  ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-slate-400">0{idx + 1}</span>
                {isPassed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                )}
              </div>
              <div
                className={`text-[10px] font-bold truncate leading-tight ${
                  isCurrent
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : isPassed
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-400'
                }`}
              >
                {milestone.stage}
              </div>
              <div className="text-[9px] text-slate-500 truncate mt-0.5">
                {milestone.percentage}% mark
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Milestone Info Card Callout */}
      <div className="relative z-10 mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] block">
              {activeMilestone.label}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {activeMilestone.description}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">
            Courier Waybill
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
            {order.trackingNumber}
          </span>
        </div>
      </div>
    </div>
  );
};
