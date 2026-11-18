import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPdfOrderHistoryDocumentData,
  formatPdfCurrencyINR,
  resolveOrderItemHsnCode,
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

test('resolveOrderItemHsnCode resolves catalog and category HSN codes accurately', () => {
  assert.equal(resolveOrderItemHsnCode({ title: 'Sennheiser Momentum 4 Wireless Flagship' }), '85183000');
  assert.equal(resolveOrderItemHsnCode({ title: 'Aeris 75% Gasket Mechanical Keyboard' }), '84716040');
  assert.equal(resolveOrderItemHsnCode({ title: 'Titanium Pro Flagship Smartphone 256GB' }), '85171300');
  assert.equal(resolveOrderItemHsnCode({ title: 'Gift Bundle Mechanical Keyboard' }), '84716040');
  assert.equal(resolveOrderItemHsnCode({ title: 'Custom Audio DAC', hsnCode: '85198100' }), '85198100');
});

test('buildPdfOrderHistoryDocumentData computes per-item HSN and GST breakup cleanly', () => {
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
  assert.equal(firstOrder.placeOfSupply, 'Delhi (07)');

  // Per-item HSN & GST breakdown
  const item = firstOrder.items[0];
  assert.equal(item.hsnCode, '85183000');
  assert.equal(item.gstRateLabel, '18%');
  assert.equal(item.taxableFormatted, 'Rs. 29,660.17');
  assert.equal(item.cgstFormatted, 'Rs. 2,669.42');
  assert.equal(item.sgstFormatted, 'Rs. 2,669.41');
  assert.equal(item.gstFormatted, 'Rs. 5,338.83');

  // Gift receipt order masks line totals & payment details cleanly while keeping HSN
  const giftOrder = data.orders[1];
  assert.equal(giftOrder.isGiftReceipt, true);
  assert.equal(giftOrder.totalFormatted, '[GIFT MASKED]');
  assert.equal(giftOrder.paymentMethod, 'Prepaid (Gift Masked)');
  assert.equal(giftOrder.items[0].hsnCode, '84716040');
  assert.equal(giftOrder.items[0].lineTotalFormatted, '[MASKED]');
  assert.equal(giftOrder.items[0].gstFormatted, '[MASKED]');
});

test('buildPdfOrderHistoryDocumentData handles empty orders gracefully', () => {
  const emptyUser: UserProfile = { ...MOCK_USER, orders: [], addresses: [] };
  const data = buildPdfOrderHistoryDocumentData(emptyUser);
  assert.equal(data.totalOrders, 0);
  assert.equal(data.totalItems, 0);
  assert.equal(data.totalSpentPaise, 0);
  assert.equal(data.orders.length, 0);
});
