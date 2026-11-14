import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPdfOrderHistoryDocumentData,
  formatPdfCurrencyINR,
} from './pdfInvoiceExporter';
import { UserProfile } from '../types/index';

const MOCK_USER: UserProfile = {
  id: 'usr-test-1',
  name: 'Shubham Bansal',
  email: 'shubham@nexora.in',
  phone: '+91 98765 43210',
  role: 'customer',
  cartCount: 0,
  wishlistCount: 0,
  loyaltyPoints: 400,
  tier: 'Gold',
  addresses: [
    {
      id: 'addr-1',
      name: 'Shubham Bansal',
      phone: '+91 98765 43210',
      street: '42, Barakhamba Road, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pinCode: '110001',
      isDefault: true,
    },
  ],
  orders: [
    {
      id: 'NEX-ORD-9932',
      date: '11 Nov 2026',
      itemsCount: 1,
      totalPaise: 3499900,
      status: 'Processing',
      trackingStage: 'Dispatched',
      courierPartner: 'BlueDart Express',
      trackingNumber: 'BLD-99320148',
      estimatedDeliveryDate: 'Tomorrow by 8:00 PM',
      paymentMethod: 'UPI (Razorpay Verified)',
      items: [
        {
          title: 'Sennheiser Momentum 4 Wireless Flagship',
          image: 'https://example.com/headphones.jpg',
          pricePaise: 3499900,
          quantity: 1,
        },
      ],
    },
    {
      id: 'NEX-ORD-8001',
      date: '05 Nov 2026',
      itemsCount: 2,
      totalPaise: 1180000,
      status: 'Delivered',
      trackingStage: 'Delivered',
      courierPartner: 'BlueDart Express Air',
      trackingNumber: 'BLD-80019922',
      estimatedDeliveryDate: 'Delivered',
      paymentMethod: 'HDFC Credit Card',
      isGiftReceipt: true,
      items: [
        {
          title: 'Gift Bundle Mechanical Keyboard',
          image: 'https://example.com/kb.jpg',
          pricePaise: 590000,
          quantity: 2,
        },
      ],
    },
  ],
};

test('formatPdfCurrencyINR produces ASCII-safe Indian currency string', () => {
  assert.equal(formatPdfCurrencyINR(3499900), 'Rs. 34,999.00');
  assert.equal(formatPdfCurrencyINR(10000000), 'Rs. 1,00,000.00');
  assert.equal(formatPdfCurrencyINR(0), 'Rs. 0.00');
});

test('buildPdfOrderHistoryDocumentData computes GST breakup and preserves payment metadata', () => {
  const data = buildPdfOrderHistoryDocumentData(MOCK_USER, MOCK_USER.orders, new Date('2026-11-14T10:00:00Z'));
  assert.equal(data.customerName, 'Shubham Bansal');
  assert.equal(data.totalOrders, 2);
  assert.equal(data.totalItems, 3);
  assert.equal(data.totalSpentPaise, 4679900);
  assert.equal(data.totalSpentFormatted, 'Rs. 46,799.00');
  assert.equal(data.billingAddressLine, '42, Barakhamba Road, Connaught Place, New Delhi, Delhi - 110001');

  const firstOrder = data.orders[0];
  assert.equal(firstOrder.invoiceNumber, 'INV-2026-9932');
  assert.equal(firstOrder.paymentMethod, 'UPI (Razorpay Verified)');
  assert.equal(firstOrder.totalFormatted, 'Rs. 34,999.00');

  // Gift receipt order masks line totals & payment details cleanly
  const giftOrder = data.orders[1];
  assert.equal(giftOrder.isGiftReceipt, true);
  assert.equal(giftOrder.totalFormatted, '[GIFT MASKED]');
  assert.equal(giftOrder.paymentMethod, 'Prepaid (Gift Masked)');
  assert.equal(giftOrder.items[0].lineTotalFormatted, '[MASKED]');
});

test('buildPdfOrderHistoryDocumentData handles empty orders gracefully', () => {
  const emptyUser: UserProfile = { ...MOCK_USER, orders: [], addresses: [] };
  const data = buildPdfOrderHistoryDocumentData(emptyUser);
  assert.equal(data.totalOrders, 0);
  assert.equal(data.totalItems, 0);
  assert.equal(data.totalSpentPaise, 0);
  assert.equal(data.orders.length, 0);
});
