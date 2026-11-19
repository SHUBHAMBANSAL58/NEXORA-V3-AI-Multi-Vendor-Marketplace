import { CatalogProduct, OrderStage, TrackingCheckpoint, UserReview, PromoDiscount, UserOrder, UserProfile, AchievementBadge } from '../types/index.js';
import { formatCurrencyINR } from './formatters.js';

export const VALID_PROMO_CODES: Record<string, PromoDiscount> = {
  NEXORA10: {
    code: 'NEXORA10',
    type: 'percentage',
    value: 10,
    minSpendPaise: 99900, // ₹999
    description: '10% off on all orders above ₹999',
  },
  STUDIO20: {
    code: 'STUDIO20',
    type: 'percentage',
    value: 20,
    minSpendPaise: 499900, // ₹4,999
    description: '20% off for verified studio equipment above ₹4,999',
  },
  FESTIVE500: {
    code: 'FESTIVE500',
    type: 'fixed',
    value: 50000, // ₹500
    minSpendPaise: 299900, // ₹2,999
    description: 'Flat ₹500 discount on orders above ₹2,999',
  },
  WELCOME100: {
    code: 'WELCOME100',
    type: 'fixed',
    value: 10000, // ₹100
    minSpendPaise: 49900, // ₹499
    description: 'Flat ₹100 discount for new members',
  },
};

/**
 * Calculates loyalty points earned from order total (1 point per ₹100 spent)
 */
export function calculateLoyaltyPoints(totalPaise: number): number {
  if (totalPaise <= 0) return 0;
  return Math.floor(totalPaise / 10000);
}

/**
 * Determines loyalty membership tier based on lifetime points
 */
export function getLoyaltyTier(points: number): 'Silver' | 'Gold' | 'Platinum' {
  if (points >= 1500) return 'Platinum';
  if (points >= 500) return 'Gold';
  return 'Silver';
}

/**
 * Validates a promo coupon against the active subtotal
 */
export function validatePromoCode(
  inputCode: string,
  subtotalPaise: number,
  promoCatalog: Record<string, PromoDiscount> = VALID_PROMO_CODES
): { valid: boolean; discountPaise: number; message: string; promo?: PromoDiscount } {
  const normalized = (inputCode || '').trim().toUpperCase();
  const promo = promoCatalog[normalized];

  if (!promo || promo.isActive === false) {
    return {
      valid: false,
      discountPaise: 0,
      message: 'Invalid or inactive promo code. Try NEXORA10 or FESTIVE500.',
    };
  }

  if (promo.minSpendPaise && subtotalPaise < promo.minSpendPaise) {
    return {
      valid: false,
      discountPaise: 0,
      message: `Requires minimum subtotal of ₹${(promo.minSpendPaise / 100).toLocaleString('en-IN')}`,
    };
  }

  let discountPaise = 0;
  if (promo.type === 'percentage') {
    discountPaise = Math.round((subtotalPaise * promo.value) / 100);
  } else {
    discountPaise = Math.min(subtotalPaise, promo.value);
  }

  return {
    valid: true,
    discountPaise,
    message: `${promo.code} applied! Saved ₹${(discountPaise / 100).toLocaleString('en-IN')}`,
    promo,
  };
}

/**
 * Validates newsletter email address
 */
export function validateNewsletterEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter your email address' };
  }
  // Standard RFC 5322 compliant regex for web email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address (e.g., alex@company.com)' };
  }
  return { valid: true };
}

/**
 * Returns progress percentage for an order tracking stage
 */
export function getOrderProgressPercent(stage: OrderStage): number {
  switch (stage) {
    case 'Processing':
      return 15;
    case 'Dispatched':
      return 45;
    case 'Out for Delivery':
      return 75;
    case 'Delivered':
      return 100;
    case 'Return Requested':
    case 'Returned':
      return 100;
    default:
      return 10;
  }
}

/**
 * Generates an end-to-end timeline with realistic Indian delivery checkpoints
 */
export function generateTrackingTimeline(
  currentStage: OrderStage,
  orderDateStr: string = '09 Nov 2026',
  destinationLabel: string = 'Customer Doorstep (PIN 110001)'
): TrackingCheckpoint[] {
  const stages: OrderStage[] = ['Processing', 'Dispatched', 'Out for Delivery', 'Delivered'];
  const currentIndex = stages.indexOf(currentStage);

  const checkpoints: TrackingCheckpoint[] = [
    {
      stage: 'Processing',
      timestamp: `${orderDateStr}, 10:15 AM`,
      location: 'NEXORA Fulfillment Center, Okhla Phase III, New Delhi',
      description: 'Order confirmed, item inspected, and packaged with tamper-proof security seal.',
      completed: currentIndex >= 0,
    },
    {
      stage: 'Dispatched',
      timestamp: `${orderDateStr}, 03:40 PM`,
      location: 'BlueDart Express Sorting Hub, IGI Airport Area, Delhi',
      description: 'Handed over to carrier. Air Waybill #BD-98234-IN generated with priority air transit.',
      completed: currentIndex >= 1,
    },
    {
      stage: 'Out for Delivery',
      timestamp: `${orderDateStr}, 08:30 AM`,
      location: `Last-Mile Courier Hub · ${destinationLabel}`,
      description: 'Assigned to BlueDart courier executive (Ramesh Kumar). Doorstep OTP delivery scheduled.',
      completed: currentIndex >= 2,
    },
    {
      stage: 'Delivered',
      timestamp: `${orderDateStr}, 01:22 PM`,
      location: destinationLabel,
      description: 'Secure delivery completed. OTP verified and digital signature captured.',
      completed: currentIndex >= 3,
    },
  ];

  if (currentStage === 'Return Requested' || currentStage === 'Returned') {
    checkpoints.push({
      stage: 'Return Requested',
      timestamp: `${orderDateStr}, 04:00 PM`,
      location: `Reverse Logistics Pickup · ${destinationLabel}`,
      description: 'Return request registered. Reverse doorstep pickup scheduled with courier.',
      completed: true,
    });
  }

  return checkpoints;
}

export const TRACKING_TIMELINE_STEPS = [
  'Placed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
] as const;

export type TrackingTimelineStepName = (typeof TRACKING_TIMELINE_STEPS)[number];

export interface TrackingTimelineStepItem {
  key: TrackingTimelineStepName;
  label: TrackingTimelineStepName;
  sublabel: string;
  state: 'completed' | 'current' | 'upcoming' | 'cancelled';
  timestamp: string;
}

export interface TrackingTimelineSummary {
  steps: TrackingTimelineStepItem[];
  activeStepIndex: number;
  activeStepLabel: TrackingTimelineStepName | 'Cancelled';
  progressPercent: number;
  railPercent: number;
  isCancelled: boolean;
  isDelivered: boolean;
  isReturnFlow: boolean;
}

const STEP_SUBLABELS: Record<TrackingTimelineStepName, string> = {
  Placed: 'Order Confirmed',
  Packed: 'QA & Sealed',
  Shipped: 'Carrier Transit',
  'Out for Delivery': 'Last-Mile Courier',
  Delivered: 'OTP Verified',
};

/**
 * Maps any UserOrder status / trackingStage to a dynamic 5-step Tracking Timeline
 * covering Placed -> Packed -> Shipped -> Out for Delivery -> Delivered (plus Cancelled).
 */
export function buildTrackingTimelineStepper(
  order: Pick<UserOrder, 'status' | 'trackingStage' | 'date'>
): TrackingTimelineSummary {
  const statusStr = (order.status || '').trim();
  const stageStr = (order.trackingStage || '').trim();
  const orderDate = order.date || 'Today';

  if (statusStr === 'Cancelled') {
    return {
      steps: TRACKING_TIMELINE_STEPS.map((key) => ({
        key,
        label: key,
        sublabel: STEP_SUBLABELS[key],
        state: 'cancelled',
        timestamp: key === 'Placed' ? `${orderDate}` : 'Cancelled',
      })),
      activeStepIndex: -1,
      activeStepLabel: 'Cancelled',
      progressPercent: 0,
      railPercent: 0,
      isCancelled: true,
      isDelivered: false,
      isReturnFlow: false,
    };
  }

  const isReturnFlow =
    statusStr === 'Return Requested' ||
    statusStr === 'Returned' ||
    stageStr === 'Return Requested' ||
    stageStr === 'Returned';

  // Determine the furthest active step index (0..4) across both status & trackingStage
  let activeStepIndex = 1; // Default to Packed ('Processing')
  if (
    isReturnFlow ||
    stageStr === 'Delivered' ||
    statusStr === 'Delivered'
  ) {
    activeStepIndex = 4;
  } else if (stageStr === 'Out for Delivery' || statusStr === 'Out for Delivery') {
    activeStepIndex = 3;
  } else if (
    stageStr === 'Dispatched' ||
    statusStr === 'Dispatched' ||
    statusStr === 'Shipped'
  ) {
    activeStepIndex = 2;
  } else if (statusStr === 'Confirmed' && (!stageStr || stageStr === 'Processing')) {
    activeStepIndex = statusStr === 'Confirmed' && stageStr !== 'Processing' ? 0 : stageStr === 'Processing' ? 1 : 0;
  } else if (stageStr === 'Processing' || statusStr === 'Processing') {
    activeStepIndex = 1;
  }

  const isDelivered = activeStepIndex === 4;
  const activeStepLabel = TRACKING_TIMELINE_STEPS[activeStepIndex];

  const steps: TrackingTimelineStepItem[] = TRACKING_TIMELINE_STEPS.map((key, idx) => {
    const state: TrackingTimelineStepItem['state'] = isDelivered
      ? 'completed'
      : idx < activeStepIndex
      ? 'completed'
      : idx === activeStepIndex
      ? 'current'
      : 'upcoming';

    const timestamp =
      state === 'upcoming'
        ? 'Pending'
        : idx === 0
        ? orderDate
        : state === 'completed' || state === 'current'
        ? idx === activeStepIndex && !isDelivered
          ? 'In Progress'
          : 'Completed'
        : 'Pending';

    return {
      key,
      label: key,
      sublabel: STEP_SUBLABELS[key],
      state,
      timestamp,
    };
  });

  return {
    steps,
    activeStepIndex,
    activeStepLabel,
    progressPercent: (activeStepIndex + 1) * 20,
    railPercent: Math.round((activeStepIndex / (TRACKING_TIMELINE_STEPS.length - 1)) * 100),
    isCancelled: false,
    isDelivered,
    isReturnFlow,
  };
}

/**
 * Computes average rating and star distribution breakdown
 */
export function calculateAverageRating(reviews: UserReview[]): {
  average: number;
  count: number;
  breakdown: Record<number, number>;
} {
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!reviews || reviews.length === 0) {
    return { average: 5.0, count: 0, breakdown };
  }

  let totalScore = 0;
  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    breakdown[star] = (breakdown[star] || 0) + 1;
    totalScore += r.rating;
  });

  const average = Number((totalScore / reviews.length).toFixed(1));
  return { average, count: reviews.length, breakdown };
}

/**
 * Builds a normalized specification matrix across up to 3 selected products
 */
export function buildSpecificationMatrix(products: CatalogProduct[]): Array<{
  key: string;
  label: string;
  values: Record<string, string>;
}> {
  if (!products || products.length === 0) return [];

  // Collect unique spec keys preserving clean formatting
  const specKeySet = new Set<string>();
  products.forEach((p) => {
    if (p.specs) {
      Object.keys(p.specs).forEach((k) => specKeySet.add(k));
    }
  });

  const standardAttributes = [
    { key: 'brand', label: 'Brand & Studio' },
    { key: 'category', label: 'Department' },
    { key: 'sku', label: 'SKU / Model' },
    { key: 'stock', label: 'Inventory Stock' },
    { key: 'seller', label: 'Verified Seller & City' },
  ];

  const rows: Array<{ key: string; label: string; values: Record<string, string> }> = [];

  // Add standard attributes first
  standardAttributes.forEach((attr) => {
    const values: Record<string, string> = {};
    products.forEach((p) => {
      if (attr.key === 'brand') values[p.id] = p.brand;
      else if (attr.key === 'category') values[p.id] = p.category;
      else if (attr.key === 'sku') values[p.id] = p.sku;
      else if (attr.key === 'stock') values[p.id] = `${p.stock} units available`;
      else if (attr.key === 'seller') values[p.id] = `${p.seller.storeName} (${p.seller.city})`;
    });
    rows.push({ key: attr.key, label: attr.label, values });
  });

  // Add all technical specs
  Array.from(specKeySet).forEach((key) => {
    const values: Record<string, string> = {};
    products.forEach((p) => {
      values[p.id] = p.specs?.[key] || '—';
    });
    rows.push({ key, label: key, values });
  });

  return rows;
}

/**
 * Checks if a given Date falls on a standard business day (Monday through Friday)
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  // 0 is Sunday, 6 is Saturday
  return day !== 0 && day !== 6;
}

export interface AvailableBusinessDay {
  dateString: string; // YYYY-MM-DD for <input type="date">
  displayLabel: string; // e.g. "Fri, 14 Nov"
  dayOfWeek: string; // e.g. "Friday"
  formattedFull: string; // e.g. "Friday, 14 Nov 2026"
  isFastest: boolean;
}

/**
 * Generates an array of upcoming business days (excluding past dates and weekends)
 */
export function getAvailableBusinessDays(
  count: number = 7,
  referenceDate?: Date
): AvailableBusinessDay[] {
  const base = referenceDate ? new Date(referenceDate) : new Date();
  const results: AvailableBusinessDay[] = [];

  // Start checking from tomorrow
  const current = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);

  while (results.length < count) {
    if (isBusinessDay(current)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'long' });
      const displayLabel = current.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
      const formattedFull = current.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      results.push({
        dateString,
        displayLabel,
        dayOfWeek,
        formattedFull,
        isFastest: results.length === 0,
      });
    }
    // advance 1 day
    current.setDate(current.getDate() + 1);
  }

  return results;
}

/**
 * Validates a selected delivery date against business day and past date constraints
 */
export function isValidBusinessDeliveryDate(
  dateStr: string,
  referenceDate?: Date
): { valid: boolean; reason?: string } {
  if (!dateStr || !dateStr.trim()) {
    return { valid: false, reason: 'Delivery date is required' };
  }

  // Parse YYYY-MM-DD or standard parseable string
  const parts = dateStr.split('-');
  let targetDate: Date;
  if (parts.length === 3) {
    targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    targetDate = new Date(dateStr);
  }

  if (isNaN(targetDate.getTime())) {
    return { valid: false, reason: 'Invalid date format' };
  }

  const base = referenceDate ? new Date(referenceDate) : new Date();
  const todayMidnight = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (targetMidnight.getTime() <= todayMidnight.getTime()) {
    return { valid: false, reason: 'Please select a future business date (tomorrow or later)' };
  }

  if (!isBusinessDay(targetMidnight)) {
    const dayName = targetMidnight.toLocaleDateString('en-US', { weekday: 'long' });
    return {
      valid: false,
      reason: `${dayName} is a weekend day. Delivery is only available on business days (Mon–Fri).`,
    };
  }

  return { valid: true };
}

/**
 * Formats a comprehensive text summary of an order for sharing or exporting
 */
export function formatOrderSummaryShareText(order: UserOrder): string {
  const itemsText = order.items
    .map(
      (item, idx) =>
        `  ${idx + 1}. ${item.title} (Qty: ${item.quantity}) - ${formatCurrencyINR(item.pricePaise * item.quantity)}`
    )
    .join('\n');

  const deliveryDateInfo = order.preferredDeliveryDate
    ? `📅 Preferred Delivery Date: ${order.preferredDeliveryDate}`
    : `📅 Estimated Delivery: ${order.estimatedDeliveryDate || 'Standard Dispatch'}`;

  const notesInfo = order.orderNotes ? `\n📝 Delivery Instructions: "${order.orderNotes}"` : '';

  return `📦 NEXORA MARKETPLACE — ORDER SUMMARY
=========================================
Order ID: ${order.id}
Date: ${order.date}
Status: ${order.status} (${order.trackingStage || 'Dispatched'})
Courier: ${order.courierPartner || 'BlueDart Express'} · Waybill: ${order.trackingNumber || 'N/A'}
${deliveryDateInfo}${notesInfo}

Items Ordered:
${itemsText}

Total Amount Paid: ${formatCurrencyINR(order.totalPaise)}
Payment Method: ${order.paymentMethod}
=========================================
Track order status live on NEXORA: https://nexora.shop/account/orders/${order.id}`;
}

/**
 * Computes dynamic achievement badges based on user profile and activity
 */
export function calculateUserAchievementBadges(
  user: UserProfile,
  reviewsCount: number = 2
): AchievementBadge[] {
  const ordersCount = user.orders?.length || 0;
  const lifetimeSpend = (user.orders || []).reduce((acc, o) => acc + o.totalPaise, 0);

  const badges: AchievementBadge[] = [
    {
      id: 'badge-verified-buyer',
      title: 'Verified Buyer',
      description: 'Completed authentic purchases with verified doorstep delivery tracking',
      category: 'shopping',
      icon: 'shield',
      tier: ordersCount >= 3 ? 'gold' : ordersCount >= 1 ? 'silver' : 'bronze',
      unlocked: ordersCount > 0,
      unlockedAt: ordersCount > 0 ? (user.orders[0]?.date || 'Nov 2026') : undefined,
      progress: {
        current: Math.min(ordersCount, 3),
        target: 3,
        unit: 'orders',
      },
    },
    {
      id: 'badge-top-reviewer',
      title: 'Top Reviewer',
      description: 'Shared authentic product impressions and community gear appraisals',
      category: 'review',
      icon: 'star',
      tier: reviewsCount >= 3 ? 'platinum' : reviewsCount >= 1 ? 'gold' : 'silver',
      unlocked: reviewsCount > 0,
      unlockedAt: reviewsCount > 0 ? '08 Nov 2026' : undefined,
      progress: {
        current: Math.min(reviewsCount, 3),
        target: 3,
        unit: 'reviews',
      },
    },
    {
      id: 'badge-loyalty-tier',
      title: `${user.tier || 'Gold'} Patron`,
      description: `Active member of NEXORA Elite Circle with ${user.loyaltyPoints || 517} reward points`,
      category: 'loyalty',
      icon: 'crown',
      tier: user.tier === 'Platinum' ? 'platinum' : user.tier === 'Gold' ? 'gold' : 'silver',
      unlocked: true,
      unlockedAt: '01 Nov 2026',
      progress: {
        current: user.loyaltyPoints || 517,
        target: user.tier === 'Platinum' ? 1500 : 1000,
        unit: 'pts',
      },
    },
    {
      id: 'badge-tech-connoisseur',
      title: 'Tech Connoisseur',
      description: 'Curated high-fidelity acoustic gear and studio workstation peripherals',
      category: 'shopping',
      icon: 'sparkles',
      tier: lifetimeSpend > 5000000 ? 'platinum' : 'gold',
      unlocked: lifetimeSpend >= 2000000 || ordersCount > 0,
      unlockedAt: 'Today',
      progress: {
        current: Math.min(Math.round(lifetimeSpend / 100000), 50),
        target: 50,
        unit: 'k spent',
      },
    },
    {
      id: 'badge-eco-advocate',
      title: 'Green Logistics Partner',
      description: 'Consolidated packaging and scheduled optimal business day deliveries',
      category: 'community',
      icon: 'award',
      tier: 'silver',
      unlocked: ordersCount >= 2,
      unlockedAt: ordersCount >= 2 ? '10 Nov 2026' : undefined,
      progress: {
        current: Math.min(ordersCount, 2),
        target: 2,
        unit: 'consolidations',
      },
    },
    {
      id: 'badge-pioneer',
      title: 'Founding Member',
      description: 'Early adopter during the initial NEXORA V3 Marketplace rollout',
      category: 'community',
      icon: 'zap',
      tier: 'platinum',
      unlocked: true,
      unlockedAt: 'Nov 2026',
    },
  ];

  return badges;
}

export interface ProductFaqItem {
  id: string;
  question: string;
  answer: string;
  answeredBy: string;
  helpfulVotes: number;
}

export type ReviewSortOption = 'recent' | 'rating' | 'helpful';

/**
 * Computes shopping cart subtotal, promo discount, shipping, and payable total in paise
 */
export function calculateCartTotals(
  items: Array<{ variant: { pricePaise: number }; quantity: number }>,
  appliedPromo: PromoDiscount | null = null,
  freeShippingThresholdPaise: number = 99900
): {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  totalQuantity: number;
  freeShippingThresholdPaise: number;
} {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + Math.max(0, item.variant.pricePaise) * Math.max(0, item.quantity),
    0
  );
  const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);

  let discountPaise = 0;
  if (appliedPromo && subtotalPaise > 0) {
    if (appliedPromo.minSpendPaise && subtotalPaise < appliedPromo.minSpendPaise) {
      discountPaise = 0;
    } else if (appliedPromo.type === 'percentage') {
      discountPaise = Math.round((subtotalPaise * appliedPromo.value) / 100);
    } else {
      discountPaise = Math.min(subtotalPaise, appliedPromo.value);
    }
  }

  const shippingPaise =
    items.length === 0 || totalQuantity === 0 || subtotalPaise >= freeShippingThresholdPaise
      ? 0
      : 9900;
  const totalPaise = Math.max(0, subtotalPaise - discountPaise) + shippingPaise;

  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise,
    totalQuantity,
    freeShippingThresholdPaise,
  };
}

/**
 * Deterministically sorts product reviews by recency, rating, or helpful votes
 */
export function sortProductReviews(
  reviews: UserReview[],
  sortBy: ReviewSortOption,
  helpfulMap: Record<string, number> = {}
): UserReview[] {
  const copy = [...reviews];
  if (sortBy === 'rating') {
    return copy.sort((a, b) => b.rating - a.rating || b.helpfulCount - a.helpfulCount);
  }
  if (sortBy === 'helpful') {
    return copy.sort(
      (a, b) =>
        b.helpfulCount + (helpfulMap[b.id] || 0) - (a.helpfulCount + (helpfulMap[a.id] || 0))
    );
  }
  return copy;
}

/**
 * Computes Purchase History KPI metrics for the UserAccount dashboard
 */
export function calculatePurchaseHistorySummary(orders: UserOrder[]): {
  totalSpentPaise: number;
  orderCount: number;
  totalItemsPurchased: number;
  averageOrderValuePaise: number;
  deliveredCount: number;
  activeCount: number;
  giftOrdersCount: number;
} {
  if (!orders || orders.length === 0) {
    return {
      totalSpentPaise: 0,
      orderCount: 0,
      totalItemsPurchased: 0,
      averageOrderValuePaise: 0,
      deliveredCount: 0,
      activeCount: 0,
      giftOrdersCount: 0,
    };
  }

  const totalSpentPaise = orders.reduce((acc, o) => acc + o.totalPaise, 0);
  const totalItemsPurchased = orders.reduce(
    (acc, o) =>
      acc +
      (o.items && o.items.length > 0
        ? o.items.reduce((s, item) => s + item.quantity, 0)
        : o.itemsCount || 1),
    0
  );
  const deliveredCount = orders.filter(
    (o) => o.trackingStage === 'Delivered' || o.status === 'Delivered'
  ).length;
  const giftOrdersCount = orders.filter((o) => Boolean(o.isGiftReceipt)).length;

  return {
    totalSpentPaise,
    orderCount: orders.length,
    totalItemsPurchased,
    averageOrderValuePaise: Math.round(totalSpentPaise / orders.length),
    deliveredCount,
    activeCount: Math.max(0, orders.length - deliveredCount),
    giftOrdersCount,
  };
}

/**
 * Generates Schema.org FAQPage JSON-LD structured data for product Community Q&A
 */
export function buildProductFaqSchema(
  product: CatalogProduct,
  faqs: ProductFaqItem[]
): {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  name: string;
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
} {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: `${product.title} — Community Q&A`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Computes exact per-category product counts (and total under 'all') from a product catalog
 */
export function calculateCategoryProductCounts(
  products: Array<{ categorySlug: string; isPublished?: boolean }>
): Record<string, number> {
  const published = products.filter((p) => p.isPublished !== false);
  const counts: Record<string, number> = { all: published.length };
  for (const product of published) {
    if (product.categorySlug) {
      counts[product.categorySlug] = (counts[product.categorySlug] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Applies single-pass NexWallet deduction, loyalty point redemption, earned points, and tier progression
 */
export function applyOrderWalletAndPoints(params: {
  currentWalletPaise: number;
  currentPoints: number;
  orderTotalPaise: number;
  walletDeductionPaise?: number;
  pointsRedeemed?: number;
}): {
  nextWalletPaise: number;
  nextPoints: number;
  nextTier: 'Silver' | 'Gold' | 'Platinum';
  earnedPoints: number;
  redeemedPoints: number;
} {
  const safeWallet = Math.max(0, params.currentWalletPaise);
  const safeDeduction = Math.max(0, params.walletDeductionPaise || 0);
  const nextWalletPaise = Math.max(0, safeWallet - safeDeduction);

  const safePoints = Math.max(0, params.currentPoints);
  const redeemedPoints = Math.min(safePoints, Math.max(0, params.pointsRedeemed || 0));
  const earnedPoints = calculateLoyaltyPoints(params.orderTotalPaise);
  const nextPoints = Math.max(0, safePoints - redeemedPoints) + earnedPoints;

  return {
    nextWalletPaise,
    nextPoints,
    nextTier: getLoyaltyTier(nextPoints),
    earnedPoints,
    redeemedPoints,
  };
}

/**
 * Validates an Indian 6-digit postal PIN code (cannot start with 0)
 */
export function validateIndianPinCode(pin: string): { valid: boolean; error?: string } {
  const trimmed = (pin || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(trimmed)) {
    return { valid: false, error: 'Enter a valid 6-digit Indian PIN code (e.g. 110001)' };
  }
  return { valid: true };
}

/**
 * Validates a 15-character Indian GSTIN format
 */
export function validateGstin(gstin: string): { valid: boolean; error?: string } {
  const trimmed = (gstin || '').trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmed)) {
    return { valid: false, error: 'Enter a valid 15-character GSTIN (e.g. 29AAACL1234F1Z8)' };
  }
  return { valid: true };
}

/**
 * Maps product category slugs to standard Indian HSN codes
 */
export function getProductHsnCode(categorySlug?: string): string {
  switch ((categorySlug || '').toLowerCase()) {
    case 'smartphones':
      return '85171300';
    case 'audio':
      return '85183000';
    case 'keyboards':
      return '84716040';
    case 'timepieces':
    case 'watches':
      return '91021100';
    case 'workspace':
      return '94033090';
    case 'accessories':
      return '85044090';
    default:
      return '85183000';
  }
}

const INDIAN_STATE_CODES: Record<string, string> = {
  delhi: 'Delhi (07)',
  'new delhi': 'Delhi (07)',
  maharashtra: 'Maharashtra (27)',
  karnataka: 'Karnataka (29)',
  haryana: 'Haryana (06)',
  telangana: 'Telangana (36)',
  'tamil nadu': 'Tamil Nadu (33)',
  'uttar pradesh': 'Uttar Pradesh (09)',
  gujarat: 'Gujarat (24)',
  'west bengal': 'West Bengal (19)',
  rajasthan: 'Rajasthan (08)',
  kerala: 'Kerala (32)',
  punjab: 'Punjab (03)',
};

/**
 * Resolves Indian GST Place of Supply state name with numeric state code
 */
export function getIndianStateCode(state?: string): string {
  const raw = (state || '').trim();
  if (!raw) return 'Delhi (07)';
  const normalized = raw.toLowerCase();
  return INDIAN_STATE_CODES[normalized] || `${raw} (07)`;
}

/**
 * Determines whether an order is eligible for customer self-service cancellation
 */
export function canCancelOrder(order: Pick<UserOrder, 'status' | 'trackingStage'>): boolean {
  if (order.status === 'Cancelled' || order.status === 'Delivered' || order.status === 'Returned' || order.status === 'Return Requested') {
    return false;
  }
  return order.status === 'Processing' || order.status === 'Confirmed' || order.trackingStage === 'Processing';
}

const ORDER_STAGE_TRANSITIONS: Record<string, string[]> = {
  Processing: ['Dispatched', 'Out for Delivery', 'Delivered'],
  Dispatched: ['Out for Delivery', 'Delivered'],
  'Out for Delivery': ['Delivered'],
  Delivered: ['Return Requested'],
  'Return Requested': ['Returned'],
  Returned: [],
};

/**
 * Validates forward order fulfillment transitions for Seller/Admin portals
 */
export function canTransitionOrderStage(currentStage: string, nextStage: string): boolean {
  if (currentStage === nextStage) return true;
  return (ORDER_STAGE_TRANSITIONS[currentStage] || []).includes(nextStage);
}

/**
 * Computes authoritative order pricing (subtotal, coupon discount, shipping, inclusive 18% GST)
 */
export function calculateAuthoritativeOrderPricing(
  items: Array<{ unitPricePaise: number; quantity: number }>,
  promoCode?: string,
  promoCatalog: Record<string, PromoDiscount> = VALID_PROMO_CODES,
  freeShippingThresholdPaise: number = 99900
): {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  gstPaise: number;
  appliedPromoCode?: string;
} {
  const subtotalPaise = items.reduce(
    (sum, i) => sum + Math.max(0, Math.round(i.unitPricePaise)) * Math.max(1, Math.round(i.quantity)),
    0
  );

  let discountPaise = 0;
  let appliedPromoCode: string | undefined;
  if (promoCode && promoCode.trim()) {
    const check = validatePromoCode(promoCode, subtotalPaise, promoCatalog);
    if (check.valid && check.promo) {
      discountPaise = check.discountPaise;
      appliedPromoCode = check.promo.code;
    }
  }

  const shippingPaise = subtotalPaise === 0 || subtotalPaise >= freeShippingThresholdPaise ? 0 : 9900;
  const totalPaise = Math.max(0, subtotalPaise - discountPaise) + shippingPaise;
  const taxableValue = Math.round(totalPaise / 1.18);
  const gstPaise = Math.max(0, totalPaise - taxableValue);

  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise,
    gstPaise,
    appliedPromoCode,
  };
}



