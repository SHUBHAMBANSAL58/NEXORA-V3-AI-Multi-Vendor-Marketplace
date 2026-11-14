import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  CreditCard,
  Calendar,
  Sparkles,
  BarChart3,
  LineChart,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { UserOrder } from '../types/index.js';
import { calculateSpendingTrends, MonthlySpendingPoint } from '../utils/spendingTrends.js';
import { formatCurrencyINR } from '../utils/formatters.js';

interface SpendingTrendChartProps {
  orders: UserOrder[];
  userName?: string;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  orders,
  userName = 'Current User',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [activeMetric, setActiveMetric] = useState<'spend' | 'orders'>('spend');
  const [hoveredPoint, setHoveredPoint] = useState<MonthlySpendingPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.classList.contains('dark'));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const summary = calculateSpendingTrends(orders);
  const { data, totalSpendPaise, averageMonthlyPaise, peakMonth, monthOverMonthGrowth, totalOrders } =
    summary;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 760;
    const height = 300;
    const margin = { top: 28, right: 32, bottom: 44, left: 68 };

    const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
    const domainStroke = isDark ? '#334155' : '#cbd5e1';
    const xLabelFill = isDark ? '#94a3b8' : '#475569';
    const yLabelFill = isDark ? '#64748b' : '#64748b';
    const areaFadeStop = isDark ? '#090d16' : '#f8fafc';

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('class', 'w-full h-auto overflow-visible');

    const defs = svg.append('defs');

    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'spendingAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.42);
    areaGradient.append('stop').attr('offset', '65%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.14);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', areaFadeStop).attr('stop-opacity', 0.0);

    const lineGradient = defs
      .append('linearGradient')
      .attr('id', 'spendingLineGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    lineGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4');
    lineGradient.append('stop').attr('offset', '50%').attr('stop-color', '#0284c7');
    lineGradient.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1');

    const barGradient = defs
      .append('linearGradient')
      .attr('id', 'spendingBarGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    barGradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4');
    barGradient.append('stop').attr('offset', '100%').attr('stop-color', '#4f46e5');

    const filter = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.35);

    const maxVal =
      activeMetric === 'spend'
        ? d3.max(data, (d) => d.totalRupees) || 10000
        : d3.max(data, (d) => d.orderCount) || 5;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxVal * 1.2])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const yTicks = yScale.ticks(5);
    const gridGroup = svg.append('g').attr('class', 'grid-lines');

    yTicks.forEach((tickVal) => {
      gridGroup
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', yScale(tickVal))
        .attr('y2', yScale(tickVal))
        .attr('stroke', gridStroke)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1);
    });

    const xAxisGroup = svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickSize(0).tickPadding(10));

    xAxisGroup.select('.domain').attr('stroke', domainStroke).attr('stroke-width', 1);
    xAxisGroup
      .selectAll('text')
      .attr('fill', xLabelFill)
      .attr('font-size', '11px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', '500');

    const yAxisGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(0)
          .tickPadding(12)
          .tickFormat((d) => {
            const num = Number(d);
            if (activeMetric === 'spend') {
              if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
              if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`;
              return `₹${num}`;
            }
            return `${num} orders`;
          })
      );

    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', yLabelFill)
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace');

    if (chartType === 'area') {
      const getValue = (d: MonthlySpendingPoint) =>
        activeMetric === 'spend' ? d.totalRupees : d.orderCount;

      const areaGen = d3
        .area<MonthlySpendingPoint>()
        .x((d) => xScale(d.label)! + xScale.bandwidth() / 2)
        .y0(height - margin.bottom)
        .y1((d) => yScale(getValue(d)))
        .curve(d3.curveMonotoneX);

      const lineGen = d3
        .line<MonthlySpendingPoint>()
        .x((d) => xScale(d.label)! + xScale.bandwidth() / 2)
        .y((d) => yScale(getValue(d)))
        .curve(d3.curveMonotoneX);

      svg.append('path').datum(data).attr('d', areaGen).attr('fill', 'url(#spendingAreaGrad)');

      svg
        .append('path')
        .datum(data)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', 'url(#spendingLineGrad)')
        .attr('stroke-width', 2.8)
        .attr('stroke-linecap', 'round')
        .attr('filter', isDark ? 'url(#glow)' : null);

      data.forEach((d) => {
        const cx = xScale(d.label)! + xScale.bandwidth() / 2;
        const cy = yScale(getValue(d));
        const isHovered = hoveredPoint?.key === d.key;

        if (d.totalPaise > 0) {
          svg
            .append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', isHovered ? 8 : 5)
            .attr('fill', '#06b6d4')
            .attr('fill-opacity', isHovered ? 0.35 : 0.15)
            .attr('class', 'transition-all duration-200');
        }

        svg
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', isHovered ? 5 : 3.5)
          .attr('fill', isHovered ? '#38bdf8' : '#0e7490')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .attr('class', 'transition-all duration-200');
      });
    } else {
      data.forEach((d) => {
        const x = xScale(d.label)!;
        const barWidth = xScale.bandwidth();
        const val = activeMetric === 'spend' ? d.totalRupees : d.orderCount;
        const y = yScale(val);
        const barHeight = Math.max(0, height - margin.bottom - y);
        const isHovered = hoveredPoint?.key === d.key;

        svg
          .append('rect')
          .attr('x', x)
          .attr('y', margin.top)
          .attr('width', barWidth)
          .attr('height', height - margin.bottom - margin.top)
          .attr('fill', isHovered ? 'rgba(6, 182, 212, 0.08)' : 'transparent')
          .attr('rx', 2);

        if (barHeight > 0) {
          svg
            .append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr('fill', isHovered ? '#38bdf8' : 'url(#spendingBarGrad)')
            .attr('rx', 3)
            .attr('filter', isHovered && isDark ? 'url(#glow)' : null)
            .attr('class', 'transition-all duration-200');
        }
      });
    }

    data.forEach((d) => {
      const x = xScale(d.label)!;
      const w = xScale.bandwidth();

      svg
        .append('rect')
        .attr('x', x - 8)
        .attr('y', margin.top)
        .attr('width', w + 16)
        .attr('height', height - margin.bottom - margin.top)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mouseenter', (event) => {
          setHoveredPoint(d);
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltipPos({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            });
          }
        })
        .on('mousemove', (event) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltipPos({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            });
          }
        })
        .on('mouseleave', () => {
          setHoveredPoint(null);
          setTooltipPos(null);
        });
    });
  }, [data, chartType, activeMetric, hoveredPoint, isDark]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Personal Spending Trends &amp; Telemetry</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 font-semibold uppercase">
                D3 Real-Time Visualizer
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical transaction velocity and category spend analysis for{' '}
            <strong className="text-slate-800 dark:text-slate-200">{userName}</strong>.
          </p>
        </div>

        {/* View Toggle Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMetric('spend')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMetric === 'spend'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Amount (₹)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('orders')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMetric === 'orders'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Order Count
            </button>
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Curved Area Flow"
              aria-label="Curved Area Flow"
            >
              <LineChart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Geometric Bar Chart"
              aria-label="Geometric Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-900/50 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Expenditure</span>
            <CreditCard className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrencyINR(totalSpendPaise)}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Across {totalOrders} verified orders
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-900/50 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Monthly Average</span>
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-cyan-700 dark:text-cyan-300">
            {formatCurrencyINR(averageMonthlyPaise)}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">Active buying cadence</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-900/50 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Peak Spending Month</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-indigo-700 dark:text-indigo-300">
            {peakMonth ? peakMonth.label : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {peakMonth ? formatCurrencyINR(peakMonth.totalPaise) : '0'}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-900/50 space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>MoM Growth</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </span>
          <p
            className={`text-xl sm:text-2xl font-black font-mono ${
              monthOverMonthGrowth >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {monthOverMonthGrowth > 0 ? `+${monthOverMonthGrowth}%` : `${monthOverMonthGrowth}%`}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">vs Previous active month</p>
        </div>
      </div>

      {/* D3 Chart Canvas Container */}
      <div
        ref={containerRef}
        className="relative p-2 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-[#060911] border border-slate-200 dark:border-slate-800/80"
      >
        <svg ref={svgRef} className="w-full" aria-label="Monthly Spending Trend D3 Chart" role="img" />

        {hoveredPoint && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-cyan-500/50 shadow-xl backdrop-blur-md text-xs space-y-1 font-mono transition-transform duration-75"
            style={{
              left: `${Math.min(
                Math.max(tooltipPos.x - 70, 10),
                (containerRef.current?.clientWidth || 400) - 170
              )}px`,
              top: `${Math.max(tooltipPos.y - 85, 10)}px`,
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-1 text-slate-500 dark:text-slate-400 font-semibold">
              <span>{hoveredPoint.label}</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400">
                {totalSpendPaise > 0
                  ? `${Math.round((hoveredPoint.totalPaise / totalSpendPaise) * 100)}% share`
                  : ''}
              </span>
            </div>
            <div className="pt-0.5 space-y-0.5">
              <p className="text-slate-900 dark:text-white font-bold text-sm">
                {formatCurrencyINR(hoveredPoint.totalPaise)}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                {hoveredPoint.orderCount} {hoveredPoint.orderCount === 1 ? 'order' : 'orders'} ·{' '}
                {hoveredPoint.itemsCount} items
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Telemetry Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-mono border-t border-slate-200 dark:border-slate-800/60 pt-3">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-500 shrink-0" />
          <span>Calculated deterministically from user order timeline (inclusive of 18% GST).</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-cyan-500 inline-block" />
            <span>Monthly Spend Line</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-indigo-500/70 inline-block" />
            <span>Telemetry Volume</span>
          </span>
        </div>
      </div>
    </div>
  );
};
