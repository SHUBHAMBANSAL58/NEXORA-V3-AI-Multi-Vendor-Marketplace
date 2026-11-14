import { UserOrder } from '../types/index.js';

export interface MonthlySpendingPoint {
  key: string; // e.g. '2026-06'
  month: string; // e.g. 'Jun'
  year: number; // e.g. 2026
  label: string; // e.g. 'Jun 2026'
  totalPaise: number;
  totalRupees: number;
  orderCount: number;
  itemsCount: number;
}

export interface SpendingTrendsSummary {
  data: MonthlySpendingPoint[];
  totalSpendPaise: number;
  averageMonthlyPaise: number;
  peakMonth: MonthlySpendingPoint | null;
  totalOrders: number;
  totalItems: number;
  monthOverMonthGrowth: number; // percentage difference vs prior active month
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Extracts month (0-11) and year from various date string formats used in NEXORA:
 * e.g. "Today, 11 Nov 2026", "08 Nov 2026", "2026-11-11", "14 Oct 2026"
 */
export function parseOrderDate(dateStr: string): { year: number; monthIndex: number } {
  const cleanStr = dateStr.replace(/Today,?\s*/i, '').trim();

  // Try standard Date parsing
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
    return {
      year: parsed.getFullYear(),
      monthIndex: parsed.getMonth(),
    };
  }

  // Fallback: match 3-letter month and 4-digit year via regex
  const monthMatch = cleanStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  const yearMatch = cleanStr.match(/\b(20\d\d)\b/);

  const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
  let monthIndex = 10; // Default to Nov (10)

  if (monthMatch) {
    const m = monthMatch[1].toLowerCase();
    const foundIdx = MONTH_NAMES.findIndex((name) => name.toLowerCase() === m);
    if (foundIdx !== -1) {
      monthIndex = foundIdx;
    }
  }

  return { year, monthIndex };
}

/**
 * Aggregates user orders into continuous monthly spending trends for D3 visualization.
 */
export function calculateSpendingTrends(orders: UserOrder[]): SpendingTrendsSummary {
  if (!orders || orders.length === 0) {
    return {
      data: [],
      totalSpendPaise: 0,
      averageMonthlyPaise: 0,
      peakMonth: null,
      totalOrders: 0,
      totalItems: 0,
      monthOverMonthGrowth: 0,
    };
  }

  // Map to store aggregated values by 'YYYY-MM'
  const monthlyMap = new Map<string, { totalPaise: number; orderCount: number; itemsCount: number; year: number; monthIndex: number }>();

  orders.forEach((order) => {
    const { year, monthIndex } = parseOrderDate(order.date);
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    const existing = monthlyMap.get(key) || {
      totalPaise: 0,
      orderCount: 0,
      itemsCount: 0,
      year,
      monthIndex,
    };

    existing.totalPaise += order.totalPaise;
    existing.orderCount += 1;
    existing.itemsCount += order.itemsCount || (order.items?.length ?? 1);

    monthlyMap.set(key, existing);
  });

  // Sort keys chronologically
  const sortedKeys = Array.from(monthlyMap.keys()).sort();

  // If there are fewer than 5 months, fill in any missing continuous months up to the latest month
  if (sortedKeys.length > 0) {
    const [startYear, startMonth] = sortedKeys[0].split('-').map(Number);
    const [endYear, endMonth] = sortedKeys[sortedKeys.length - 1].split('-').map(Number);

    let curY = startYear;
    let curM = startMonth;

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      const key = `${curY}-${String(curM).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          totalPaise: 0,
          orderCount: 0,
          itemsCount: 0,
          year: curY,
          monthIndex: curM - 1,
        });
      }
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
  }

  const finalSortedKeys = Array.from(monthlyMap.keys()).sort();

  const data: MonthlySpendingPoint[] = finalSortedKeys.map((key) => {
    const val = monthlyMap.get(key)!;
    const monthName = MONTH_NAMES[val.monthIndex] || 'Month';
    return {
      key,
      month: monthName,
      year: val.year,
      label: `${monthName} ${val.year}`,
      totalPaise: val.totalPaise,
      totalRupees: Math.round(val.totalPaise / 100),
      orderCount: val.orderCount,
      itemsCount: val.itemsCount,
    };
  });

  const totalSpendPaise = data.reduce((sum, d) => sum + d.totalPaise, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orderCount, 0);
  const totalItems = data.reduce((sum, d) => sum + d.itemsCount, 0);

  const monthsWithSpend = data.filter((d) => d.totalPaise > 0);
  const averageMonthlyPaise = monthsWithSpend.length > 0 ? Math.round(totalSpendPaise / monthsWithSpend.length) : 0;

  // Find peak month
  let peakMonth: MonthlySpendingPoint | null = null;
  data.forEach((d) => {
    if (!peakMonth || d.totalPaise > peakMonth.totalPaise) {
      peakMonth = d;
    }
  });

  // Calculate Month-over-Month growth
  let monthOverMonthGrowth = 0;
  if (data.length >= 2) {
    const lastMonth = data[data.length - 1];
    const prevMonth = data[data.length - 2];
    if (prevMonth.totalPaise > 0) {
      monthOverMonthGrowth = Math.round(((lastMonth.totalPaise - prevMonth.totalPaise) / prevMonth.totalPaise) * 100);
    } else if (lastMonth.totalPaise > 0) {
      monthOverMonthGrowth = 100;
    }
  }

  return {
    data,
    totalSpendPaise,
    averageMonthlyPaise,
    peakMonth,
    totalOrders,
    totalItems,
    monthOverMonthGrowth,
  };
}
