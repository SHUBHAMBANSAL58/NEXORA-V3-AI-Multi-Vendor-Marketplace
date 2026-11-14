import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderDate, calculateSpendingTrends } from './spendingTrends.js';
import { UserOrder } from '../types/index.js';

test('parseOrderDate extracts month and year correctly from different date formats', () => {
  const res1 = parseOrderDate('Today, 11 Nov 2026');
  assert.equal(res1.year, 2026);
  assert.equal(res1.monthIndex, 10); // Nov is 10

  const res2 = parseOrderDate('14 Oct 2026');
  assert.equal(res2.year, 2026);
  assert.equal(res2.monthIndex, 9); // Oct is 9

  const res3 = parseOrderDate('2026-08-15');
  assert.equal(res3.year, 2026);
  assert.equal(res3.monthIndex, 7); // Aug is 7
});

test('calculateSpendingTrends aggregates monthly spend, orders, and peak month accurately', () => {
  const mockOrders: UserOrder[] = [
    {
      id: 'ORD-1',
      date: '14 Oct 2026',
      itemsCount: 1,
      totalPaise: 1000000, // ₹10,000
      status: 'Delivered',
      trackingStage: 'Delivered',
      courierPartner: 'BlueDart',
      trackingNumber: 'BLD-1',
      estimatedDeliveryDate: '16 Oct',
      paymentMethod: 'UPI',
      items: [{ title: 'Item 1', image: '', pricePaise: 1000000, quantity: 1 }],
    },
    {
      id: 'ORD-2',
      date: '28 Oct 2026',
      itemsCount: 2,
      totalPaise: 1500000, // ₹15,000
      status: 'Delivered',
      trackingStage: 'Delivered',
      courierPartner: 'Delhivery',
      trackingNumber: 'DLH-2',
      estimatedDeliveryDate: '30 Oct',
      paymentMethod: 'Card',
      items: [{ title: 'Item 2', image: '', pricePaise: 1500000, quantity: 2 }],
    },
    {
      id: 'ORD-3',
      date: 'Today, 11 Nov 2026',
      itemsCount: 1,
      totalPaise: 3500000, // ₹35,000
      status: 'Processing',
      trackingStage: 'Dispatched',
      courierPartner: 'BlueDart',
      trackingNumber: 'BLD-3',
      estimatedDeliveryDate: 'Tomorrow',
      paymentMethod: 'UPI',
      items: [{ title: 'Item 3', image: '', pricePaise: 3500000, quantity: 1 }],
    },
  ];

  const summary = calculateSpendingTrends(mockOrders);

  // Total spend should be 10,000 + 15,000 + 35,000 = 60,000 (6,000,000 paise)
  assert.equal(summary.totalSpendPaise, 6000000);
  assert.equal(summary.totalOrders, 3);
  assert.equal(summary.totalItems, 4);

  // Peak month should be Nov 2026 with ₹35,000
  assert.ok(summary.peakMonth);
  assert.equal(summary.peakMonth.month, 'Nov');
  assert.equal(summary.peakMonth.totalRupees, 35000);

  // October total should be ₹25,000
  const octData = summary.data.find((d) => d.month === 'Oct');
  assert.ok(octData);
  assert.equal(octData.totalRupees, 25000);
  assert.equal(octData.orderCount, 2);

  // Month-over-month growth: (35000 - 25000)/25000 = +40%
  assert.equal(summary.monthOverMonthGrowth, 40);
});

test('calculateSpendingTrends handles empty orders gracefully', () => {
  const summary = calculateSpendingTrends([]);
  assert.equal(summary.totalSpendPaise, 0);
  assert.equal(summary.data.length, 0);
  assert.equal(summary.peakMonth, null);
});
