import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VALID_PROMO_CODES,
  calculateLoyaltyPoints,
  getLoyaltyTier,
  validatePromoCode,
  generateTrackingTimeline,
  calculateAverageRating,
  buildSpecificationMatrix,
  validateNewsletterEmail,
  getOrderProgressPercent,
  isBusinessDay,
  getAvailableBusinessDays,
  isValidBusinessDeliveryDate,
  formatOrderSummaryShareText,
  calculateUserAchievementBadges,
  calculateCartTotals,
  sortProductReviews,
  calculatePurchaseHistorySummary,
  buildProductFaqSchema,
  calculateCategoryProductCounts,
  applyOrderWalletAndPoints,
  validateIndianPinCode,
  validateGstin,
  getProductHsnCode,
  getIndianStateCode,
  canCancelOrder,
  canTransitionOrderStage,
  calculateAuthoritativeOrderPricing,
} from './commerceFeatures.js';
import { CatalogProduct, UserReview, UserOrder, UserProfile } from '../types/index.js';

test('calculateLoyaltyPoints calculates 1 point per 100 INR spent', () => {
  assert.equal(calculateLoyaltyPoints(0), 0);
  assert.equal(calculateLoyaltyPoints(9900), 0); // ₹99
  assert.equal(calculateLoyaltyPoints(10000), 1); // ₹100
  assert.equal(calculateLoyaltyPoints(2499900), 249); // ₹24,999 -> 249 points
  assert.equal(calculateLoyaltyPoints(11999900), 1199); // ₹1,19,999 -> 1199 points
});

test('getLoyaltyTier assigns correct tier based on threshold', () => {
  assert.equal(getLoyaltyTier(100), 'Silver');
  assert.equal(getLoyaltyTier(499), 'Silver');
  assert.equal(getLoyaltyTier(500), 'Gold');
  assert.equal(getLoyaltyTier(1499), 'Gold');
  assert.equal(getLoyaltyTier(1500), 'Platinum');
  assert.equal(getLoyaltyTier(3500), 'Platinum');
});

test('validatePromoCode validates percentage and fixed discounts', () => {
  // Invalid code
  const invalid = validatePromoCode('BOGUSCODE', 250000);
  assert.equal(invalid.valid, false);

  // NEXORA10 (10% off, min ₹999)
  const belowMin = validatePromoCode('NEXORA10', 50000); // ₹500
  assert.equal(belowMin.valid, false);

  const validPercent = validatePromoCode('nexora10', 1000000); // ₹10,000
  assert.equal(validPercent.valid, true);
  assert.equal(validPercent.discountPaise, 100000); // ₹1,000 discount

  // FESTIVE500 (Flat ₹500 off, min ₹2,999)
  const validFixed = validatePromoCode('FESTIVE500', 300000); // ₹3,000
  assert.equal(validFixed.valid, true);
  assert.equal(validFixed.discountPaise, 50000); // ₹500 discount
});

test('generateTrackingTimeline returns chronological checkpoints', () => {
  const timelineProcessing = generateTrackingTimeline('Processing');
  assert.equal(timelineProcessing.length, 4);
  assert.equal(timelineProcessing[0].completed, true);
  assert.equal(timelineProcessing[1].completed, false);

  const timelineDelivered = generateTrackingTimeline('Delivered');
  assert.equal(timelineDelivered.every((c) => c.completed), true);

  const timelineReturn = generateTrackingTimeline('Return Requested');
  assert.equal(timelineReturn.length, 5);
  assert.equal(timelineReturn[4].stage, 'Return Requested');
});

test('calculateAverageRating computes mean and distribution', () => {
  const mockReviews: UserReview[] = [
    {
      id: 'r1',
      productId: 'p1',
      author: 'Arjun',
      rating: 5,
      date: '02 Nov 2026',
      title: 'Flawless',
      comment: 'Superb build quality',
      verifiedPurchase: true,
      helpfulCount: 12,
    },
    {
      id: 'r2',
      productId: 'p1',
      author: 'Priya',
      rating: 4,
      date: '03 Nov 2026',
      title: 'Very good',
      comment: 'Audio is crisp, slightly heavy',
      verifiedPurchase: true,
      helpfulCount: 4,
    },
  ];

  const result = calculateAverageRating(mockReviews);
  assert.equal(result.count, 2);
  assert.equal(result.average, 4.5);
  assert.equal(result.breakdown[5], 1);
  assert.equal(result.breakdown[4], 1);
  assert.equal(result.breakdown[1], 0);
});

test('buildSpecificationMatrix generates combined comparison matrix', () => {
  const p1: CatalogProduct = {
    id: 'prod-1',
    title: 'Phone A',
    slug: 'phone-a',
    brand: 'Aether',
    category: 'Smartphones',
    categorySlug: 'smartphones',
    tagline: 'Flagship',
    description: 'Desc',
    pricePaise: 999900,
    rating: 4.8,
    reviewCount: 100,
    stock: 5,
    sku: 'SKU-A',
    image: 'https://example.com/a.jpg',
    images: [],
    tags: ['Flagship'],
    specs: {
      Processor: 'Snapdragon 8 Gen 3',
      Battery: '5000 mAh',
    },
    seller: {
      id: 's1',
      storeName: 'Aether Store',
      isVerified: true,
      rating: 4.9,
      city: 'Bengaluru',
    },
  };

  const p2: CatalogProduct = {
    id: 'prod-2',
    title: 'Phone B',
    slug: 'phone-b',
    brand: 'Vortex',
    category: 'Smartphones',
    categorySlug: 'smartphones',
    tagline: 'Compact',
    description: 'Desc',
    pricePaise: 549900,
    rating: 4.6,
    reviewCount: 50,
    stock: 8,
    sku: 'SKU-B',
    image: 'https://example.com/b.jpg',
    images: [],
    tags: ['Compact'],
    specs: {
      Processor: 'Dimensity 9300',
      Screen: '6.1 OLED',
    },
    seller: {
      id: 's2',
      storeName: 'Vortex Labs',
      isVerified: true,
      rating: 4.7,
      city: 'Gurugram',
    },
  };

  const matrix = buildSpecificationMatrix([p1, p2]);
  assert.ok(matrix.length >= 7); // 5 standard + at least 3 unique specs

  const processorRow = matrix.find((r) => r.key === 'Processor');
  assert.ok(processorRow);
  assert.equal(processorRow?.values['prod-1'], 'Snapdragon 8 Gen 3');
  assert.equal(processorRow?.values['prod-2'], 'Dimensity 9300');

  const batteryRow = matrix.find((r) => r.key === 'Battery');
  assert.ok(batteryRow);
  assert.equal(batteryRow?.values['prod-1'], '5000 mAh');
  assert.equal(batteryRow?.values['prod-2'], '—'); // missing in p2
});

test('validateNewsletterEmail validates email format correctly', () => {
  // Empty or whitespace
  assert.equal(validateNewsletterEmail('').valid, false);
  assert.equal(validateNewsletterEmail('   ').valid, false);

  // Invalid formats
  assert.equal(validateNewsletterEmail('invalidemail').valid, false);
  assert.equal(validateNewsletterEmail('alex@').valid, false);
  assert.equal(validateNewsletterEmail('alex@domain').valid, false);
  assert.equal(validateNewsletterEmail('@domain.com').valid, false);

  // Valid formats
  assert.equal(validateNewsletterEmail('alex@studio.io').valid, true);
  assert.equal(validateNewsletterEmail('bansalshubham662@gmail.com').valid, true);
  assert.equal(validateNewsletterEmail('user.name+tag@sub.domain.co.in').valid, true);
});

test('getOrderProgressPercent maps order stages to monotonic percentages', () => {
  assert.equal(getOrderProgressPercent('Processing'), 15);
  assert.equal(getOrderProgressPercent('Dispatched'), 45);
  assert.equal(getOrderProgressPercent('Out for Delivery'), 75);
  assert.equal(getOrderProgressPercent('Delivered'), 100);
});

test('isBusinessDay correctly identifies business days vs weekends', () => {
  // 2026-11-13 is Friday (day 5)
  assert.equal(isBusinessDay(new Date(2026, 10, 13)), true);
  // 2026-11-14 is Saturday (day 6)
  assert.equal(isBusinessDay(new Date(2026, 10, 14)), false);
  // 2026-11-15 is Sunday (day 0)
  assert.equal(isBusinessDay(new Date(2026, 10, 15)), false);
  // 2026-11-16 is Monday (day 1)
  assert.equal(isBusinessDay(new Date(2026, 10, 16)), true);
});

test('getAvailableBusinessDays yields only future non-weekend business days', () => {
  const refWednesday = new Date(2026, 10, 11); // Wednesday Nov 11, 2026
  const days = getAvailableBusinessDays(5, refWednesday);

  assert.equal(days.length, 5);
  // Should start from Thursday Nov 12
  assert.equal(days[0].dateString, '2026-11-12');
  assert.equal(days[0].dayOfWeek, 'Thursday');
  assert.equal(days[0].isFastest, true);

  // Friday Nov 13
  assert.equal(days[1].dateString, '2026-11-13');
  assert.equal(days[1].dayOfWeek, 'Friday');

  // Skips Sat Nov 14 and Sun Nov 15! Next is Monday Nov 16
  assert.equal(days[2].dateString, '2026-11-16');
  assert.equal(days[2].dayOfWeek, 'Monday');

  // Tuesday Nov 17
  assert.equal(days[3].dateString, '2026-11-17');
  // Wednesday Nov 18
  assert.equal(days[4].dateString, '2026-11-18');
});

test('isValidBusinessDeliveryDate rejects past dates and weekends', () => {
  const refDate = new Date(2026, 10, 11); // Nov 11, 2026

  // Past date
  const pastRes = isValidBusinessDeliveryDate('2026-11-10', refDate);
  assert.equal(pastRes.valid, false);
  assert.ok(pastRes.reason?.includes('future'));

  // Same day (cutoff)
  const todayRes = isValidBusinessDeliveryDate('2026-11-11', refDate);
  assert.equal(todayRes.valid, false);

  // Weekend Saturday (Nov 14)
  const satRes = isValidBusinessDeliveryDate('2026-11-14', refDate);
  assert.equal(satRes.valid, false);
  assert.ok(satRes.reason?.includes('Saturday'));

  // Valid Friday (Nov 13)
  const friRes = isValidBusinessDeliveryDate('2026-11-13', refDate);
  assert.equal(friRes.valid, true);

  // Valid Monday (Nov 16)
  const monRes = isValidBusinessDeliveryDate('2026-11-16', refDate);
  assert.equal(monRes.valid, true);
});

test('formatOrderSummaryShareText produces comprehensive formatted text summary', () => {
  const mockOrder: UserOrder = {
    id: 'NEX-ORD-1234',
    date: '12 Nov 2026',
    itemsCount: 1,
    totalPaise: 2499900,
    status: 'Processing',
    trackingStage: 'Dispatched',
    courierPartner: 'BlueDart Air Apex',
    trackingNumber: 'BLD-998877',
    estimatedDeliveryDate: '14 Nov 2026',
    preferredDeliveryDate: 'Friday, 14 Nov 2026',
    orderNotes: 'Leave package with security desk at tower B',
    paymentMethod: 'UPI (Razorpay Verified)',
    items: [
      {
        title: 'Aura Pulse Pro Headphones',
        image: 'https://example.com/h.jpg',
        pricePaise: 2499900,
        quantity: 1,
      },
    ],
  };

  const text = formatOrderSummaryShareText(mockOrder);
  assert.ok(text.includes('NEX-ORD-1234'));
  assert.ok(text.includes('Aura Pulse Pro Headphones'));
  assert.ok(text.includes('Friday, 14 Nov 2026'));
  assert.ok(text.includes('security desk at tower B'));
  assert.ok(text.includes('BlueDart Air Apex'));
  assert.ok(text.includes('₹24,999'));
});

test('calculateUserAchievementBadges generates dynamic achievement badges', () => {
  const mockUser: UserProfile = {
    id: 'usr-1',
    name: 'Shubham Bansal',
    email: 'bansal@example.com',
    role: 'customer',
    cartCount: 0,
    wishlistCount: 0,
    loyaltyPoints: 600,
    tier: 'Gold',
    addresses: [],
    orders: [
      {
        id: 'ord-1',
        date: 'Today',
        itemsCount: 1,
        totalPaise: 3500000,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'BlueDart',
        trackingNumber: 'BLD-1',
        estimatedDeliveryDate: 'Delivered',
        paymentMethod: 'UPI',
        items: [],
      },
    ],
  };

  const badges = calculateUserAchievementBadges(mockUser, 2);
  assert.ok(badges.length >= 5);

  const verifiedBadge = badges.find((b) => b.id === 'badge-verified-buyer');
  assert.ok(verifiedBadge);
  assert.equal(verifiedBadge?.unlocked, true);

  const reviewerBadge = badges.find((b) => b.id === 'badge-top-reviewer');
  assert.ok(reviewerBadge);
  assert.equal(reviewerBadge?.unlocked, true);

  const loyaltyBadge = badges.find((b) => b.id === 'badge-loyalty-tier');
  assert.ok(loyaltyBadge);
  assert.equal(loyaltyBadge?.unlocked, true);
  assert.ok(loyaltyBadge?.title.includes('Gold'));
});

test('calculateCartTotals computes subtotal, percentage/fixed discounts, and free shipping threshold', () => {
  const smallCart = calculateCartTotals([{ variant: { pricePaise: 50000 }, quantity: 1 }]);
  assert.equal(smallCart.subtotalPaise, 50000);
  assert.equal(smallCart.shippingPaise, 9900);
  assert.equal(smallCart.totalPaise, 59900);

  const promoCart = calculateCartTotals(
    [{ variant: { pricePaise: 200000 }, quantity: 2 }],
    VALID_PROMO_CODES.NEXORA10
  );
  assert.equal(promoCart.subtotalPaise, 400000);
  assert.equal(promoCart.discountPaise, 40000);
  assert.equal(promoCart.shippingPaise, 0);
  assert.equal(promoCart.totalPaise, 360000);

  const emptyCart = calculateCartTotals([]);
  assert.equal(emptyCart.totalPaise, 0);
  assert.equal(emptyCart.shippingPaise, 0);
});

test('sortProductReviews sorts by rating or helpful count including live increments', () => {
  const mockReviews: UserReview[] = [
    {
      id: 'r1',
      productId: 'p1',
      author: 'A',
      rating: 4,
      date: '01 Nov 2026',
      title: 'Good',
      comment: 'Solid',
      verifiedPurchase: true,
      helpfulCount: 2,
    },
    {
      id: 'r2',
      productId: 'p1',
      author: 'B',
      rating: 5,
      date: '02 Nov 2026',
      title: 'Great',
      comment: 'Excellent',
      verifiedPurchase: true,
      helpfulCount: 1,
    },
  ];

  const byRating = sortProductReviews(mockReviews, 'rating');
  assert.equal(byRating[0].id, 'r2');

  const byHelpfulBoosted = sortProductReviews(mockReviews, 'helpful', { r2: 5 });
  assert.equal(byHelpfulBoosted[0].id, 'r2');
});

test('calculatePurchaseHistorySummary aggregates spent total, item counts, and gift orders', () => {
  const orders: UserOrder[] = [
    {
      id: 'ORD-1',
      date: '10 Nov 2026',
      itemsCount: 2,
      totalPaise: 300000,
      status: 'Delivered',
      trackingStage: 'Delivered',
      courierPartner: 'BlueDart',
      trackingNumber: 'BLD-1',
      estimatedDeliveryDate: 'Delivered',
      paymentMethod: 'UPI',
      isGiftReceipt: true,
      items: [
        { title: 'Item A', image: 'a.jpg', pricePaise: 100000, quantity: 2 },
        { title: 'Item B', image: 'b.jpg', pricePaise: 100000, quantity: 1 },
      ],
    },
    {
      id: 'ORD-2',
      date: '12 Nov 2026',
      itemsCount: 1,
      totalPaise: 500000,
      status: 'Processing',
      trackingStage: 'Dispatched',
      courierPartner: 'BlueDart',
      trackingNumber: 'BLD-2',
      estimatedDeliveryDate: 'Tomorrow',
      paymentMethod: 'NexWallet',
      items: [{ title: 'Item C', image: 'c.jpg', pricePaise: 500000, quantity: 1 }],
    },
  ];

  const summary = calculatePurchaseHistorySummary(orders);
  assert.equal(summary.totalSpentPaise, 800000);
  assert.equal(summary.orderCount, 2);
  assert.equal(summary.totalItemsPurchased, 4);
  assert.equal(summary.averageOrderValuePaise, 400000);
  assert.equal(summary.deliveredCount, 1);
  assert.equal(summary.activeCount, 1);
  assert.equal(summary.giftOrdersCount, 1);
});

test('buildProductFaqSchema produces valid Schema.org FAQPage JSON-LD', () => {
  const product: CatalogProduct = {
    id: 'prod-test',
    title: 'Aura Pulse Pro',
    slug: 'aura-pulse-pro',
    brand: 'NEXORA',
    category: 'Audio',
    categorySlug: 'audio',
    tagline: 'ANC',
    description: 'Studio headphones',
    pricePaise: 2499900,
    rating: 4.9,
    reviewCount: 10,
    stock: 15,
    sku: 'NEX-1',
    image: 'https://example.com/1.jpg',
    images: [],
    tags: ['ANC'],
    specs: {},
    seller: { id: 's1', storeName: 'Lumina', isVerified: true, rating: 4.9, city: 'New Delhi' },
  };
  const schema = buildProductFaqSchema(product, [
    {
      id: 'f1',
      question: 'Does it include GST invoice?',
      answer: 'Yes, 18% GST tax invoice is included.',
      answeredBy: 'NEXORA Verified Support',
      helpfulVotes: 12,
    },
  ]);

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'FAQPage');
  assert.equal(schema.mainEntity.length, 1);
  assert.equal(schema.mainEntity[0]['@type'], 'Question');
  assert.equal(schema.mainEntity[0].acceptedAnswer['@type'], 'Answer');
});

test('calculateCategoryProductCounts computes accurate counts per category slug', () => {
  const counts = calculateCategoryProductCounts([
    { categorySlug: 'audio' },
    { categorySlug: 'audio' },
    { categorySlug: 'smartphones' },
    { categorySlug: 'keyboards' },
  ]);

  assert.equal(counts.all, 4);
  assert.equal(counts.audio, 2);
  assert.equal(counts.smartphones, 1);
  assert.equal(counts.keyboards, 1);
  assert.equal(counts.timepieces, undefined);
});

test('applyOrderWalletAndPoints applies single wallet deduction and deducts redeemed points', () => {
  // Wallet ₹5,000 (500000 paise), Points 517, Order ₹24,999 -> Redeem 517 pts (₹51.70), Net pay ₹24,947.30
  // Assume wallet had ₹30,000 (3000000 paise) and paid 2994730 paise
  const res = applyOrderWalletAndPoints({
    currentWalletPaise: 3000000,
    currentPoints: 517,
    orderTotalPaise: 2494730,
    walletDeductionPaise: 2494730,
    pointsRedeemed: 517,
  });

  // Wallet deducted ONCE: 3000000 - 2494730 = 505270 paise
  assert.equal(res.nextWalletPaise, 505270);
  // Points redeemed: 517 -> 0, plus earned 249 points -> 249
  assert.equal(res.redeemedPoints, 517);
  assert.equal(res.earnedPoints, 249);
  assert.equal(res.nextPoints, 249);
  assert.equal(res.nextTier, 'Silver');

  // Verify non-negative clamp and tier promotion
  const highTierRes = applyOrderWalletAndPoints({
    currentWalletPaise: 100000,
    currentPoints: 1400,
    orderTotalPaise: 2500000, // +250 pts
    walletDeductionPaise: 150000, // capped at 0
    pointsRedeemed: 50,
  });
  assert.equal(highTierRes.nextWalletPaise, 0);
  assert.equal(highTierRes.nextPoints, 1600);
  assert.equal(highTierRes.nextTier, 'Platinum');
});

test('validateIndianPinCode and validateGstin enforce Indian statutory formats', () => {
  assert.equal(validateIndianPinCode('110001').valid, true);
  assert.equal(validateIndianPinCode('010001').valid, false);
  assert.equal(validateIndianPinCode('11001').valid, false);

  assert.equal(validateGstin('29aaacl1234f1z8').valid, true);
  assert.equal(validateGstin('INVALIDGSTIN123').valid, false);
});

test('getProductHsnCode and getIndianStateCode map Indian GST metadata dynamically', () => {
  assert.equal(getProductHsnCode('smartphones'), '85171300');
  assert.equal(getProductHsnCode('audio'), '85183000');
  assert.equal(getProductHsnCode('keyboards'), '84716040');
  assert.equal(getProductHsnCode('timepieces'), '91021100');

  assert.equal(getIndianStateCode('Karnataka'), 'Karnataka (29)');
  assert.equal(getIndianStateCode('Maharashtra'), 'Maharashtra (27)');
  assert.equal(getIndianStateCode(''), 'Delhi (07)');
});

test('canCancelOrder and canTransitionOrderStage enforce order lifecycle rules', () => {
  assert.equal(canCancelOrder({ status: 'Processing', trackingStage: 'Processing' }), true);
  assert.equal(canCancelOrder({ status: 'Delivered', trackingStage: 'Delivered' }), false);
  assert.equal(canCancelOrder({ status: 'Cancelled', trackingStage: 'Processing' }), false);

  assert.equal(canTransitionOrderStage('Processing', 'Dispatched'), true);
  assert.equal(canTransitionOrderStage('Dispatched', 'Processing'), false);
  assert.equal(canTransitionOrderStage('Delivered', 'Return Requested'), true);
});

test('calculateAuthoritativeOrderPricing computes server-side INR totals and 18% inclusive GST', () => {
  const pricing = calculateAuthoritativeOrderPricing(
    [{ unitPricePaise: 2499900, quantity: 1 }],
    'NEXORA10'
  );
  assert.equal(pricing.subtotalPaise, 2499900);
  assert.equal(pricing.discountPaise, 249990);
  assert.equal(pricing.shippingPaise, 0);
  assert.equal(pricing.totalPaise, 2249910);
  assert.equal(pricing.appliedPromoCode, 'NEXORA10');
  assert.ok(pricing.gstPaise > 0);
});




