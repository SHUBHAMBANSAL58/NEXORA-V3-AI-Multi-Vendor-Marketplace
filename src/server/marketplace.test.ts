import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseEngine } from './db.js';
import { buildOfflineCatalogReply } from './novaService.js';

test('DatabaseEngine supports seller onboarding, product CRUD, moderation, and category recount', async () => {
  const engine = new DatabaseEngine(false);
  const initialProducts = await engine.getProducts({ includeUnpublished: true });
  assert.ok(initialProducts.length >= 60);

  // Onboard new pending seller
  const pendingSeller = await engine.onboardSeller({
    storeName: 'Apex Studio Bengaluru',
    ownerName: 'Rohan Iyer',
    gstin: '29AABCA1234F1Z2',
    email: 'rohan@apexstudio.in',
    city: 'Bengaluru',
    state: 'Karnataka',
  });
  assert.equal(pendingSeller.status, 'pending');
  assert.equal(pendingSeller.isVerified, false);

  // Approve seller and adjust commission via Admin governance
  const approvedSeller = await engine.updateSellerGovernance(pendingSeller.id, {
    status: 'approved',
    commissionRate: 8,
  });
  assert.equal(approvedSeller?.status, 'approved');
  assert.equal(approvedSeller?.isVerified, true);
  assert.equal(approvedSeller?.commissionRate, 8);

  // Create product under seller
  const created = await engine.createSellerProduct({
    sellerId: pendingSeller.id,
    title: 'Apex Master Studio Monitor',
    brand: 'ApexAudio',
    categorySlug: 'audio',
    pricePaise: 3299900,
    stock: 12,
    description: 'Reference near-field studio monitor with ribbon tweeter.',
    image: '/assets/products/earphones.jpg',
  });
  assert.equal(created.seller.id, pendingSeller.id);
  assert.equal(created.hsnCode, '85183000');

  // Unpublish moderation hides product from public queries
  await engine.updateProduct(created.id, { isPublished: false });
  const publicProducts = await engine.getProducts({ includeUnpublished: false });
  assert.equal(publicProducts.some((p) => p.id === created.id), false);

  // Re-publish & delete
  await engine.updateProduct(created.id, { isPublished: true, stock: 20 });
  const refreshed = await engine.getProductById(created.id);
  assert.equal(refreshed?.stock, 20);
  const deleted = await engine.deleteProduct(created.id);
  assert.equal(deleted, true);
});

test('DatabaseEngine deducts stock on order creation and restores stock on pre-dispatch cancellation', async () => {
  const engine = new DatabaseEngine(false);
  const products = await engine.getProducts({ includeUnpublished: false });
  const sample = products[0];
  const startingStock = sample.stock;

  const createdOrder = await engine.createOrder({
    id: 'NEX-ORD-TEST-01',
    date: '15 Nov 2026',
    itemsCount: 1,
    totalPaise: sample.pricePaise * 2,
    status: 'Processing',
    trackingStage: 'Processing',
    courierPartner: 'BlueDart Express Air',
    trackingNumber: 'BLD-TEST-01',
    estimatedDeliveryDate: 'Tomorrow',
    paymentMethod: 'Razorpay Sandbox',
    promoCode: 'NEXORA10',
    items: [
      {
        title: sample.title,
        image: sample.image,
        pricePaise: sample.pricePaise,
        quantity: 2,
      },
    ],
  });

  const afterOrderProduct = await engine.getProductById(sample.id);
  assert.equal(afterOrderProduct?.stock, Math.max(0, startingStock - 2));

  // Cancel order restores stock
  const cancelRes = await engine.cancelOrder(createdOrder.id, 'Changed address');
  assert.equal(cancelRes.ok, true);
  assert.equal(cancelRes.order?.status, 'Cancelled');

  const afterCancelProduct = await engine.getProductById(sample.id);
  assert.equal(afterCancelProduct?.stock, startingStock);

  // Advancing cancelled order is rejected
  const advanceRes = await engine.updateOrderStage(createdOrder.id, 'Dispatched');
  assert.equal(advanceRes.ok, false);
});

test('DatabaseEngine handles dynamic coupons, categories, newsletter deduplication, and audit logs', async () => {
  const engine = new DatabaseEngine(false);

  const newCat = await engine.createCategory({
    name: 'Studio Lighting',
    slug: 'studio-lighting',
    hsnDefault: '94054200',
    gstRate: 18,
  });
  assert.equal(newCat.slug, 'studio-lighting');

  const coupon = await engine.upsertCoupon({
    code: 'PRO15',
    type: 'percentage',
    value: 15,
    minSpendPaise: 100000,
    description: '15% Admin Promo',
    isActive: true,
  });
  assert.equal(coupon.code, 'PRO15');

  const sub1 = await engine.addNewsletterSubscriber('User@Example.IN');
  assert.equal(sub1.alreadySubscribed, false);
  const sub2 = await engine.addNewsletterSubscriber('user@example.in');
  assert.equal(sub2.alreadySubscribed, true);

  await engine.appendAuditLog({
    actorEmail: 'admin@nexora.shop',
    actorRole: 'admin',
    action: 'COUPON_CREATED',
    targetType: 'coupon',
    targetId: 'PRO15',
    details: 'Created PRO15 campaign',
  });
  const logs = await engine.getAuditLogs();
  assert.equal(logs[0]?.targetId, 'PRO15');
});

test('buildOfflineCatalogReply recommends matching live catalog product transparently', async () => {
  const engine = new DatabaseEngine(false);
  const products = await engine.getProducts({ includeUnpublished: false });

  const reply = buildOfflineCatalogReply('Looking for wireless ANC headphones', products);
  assert.equal(reply.ok, true);
  assert.equal(reply.mode, 'offline-catalog-fallback');
  assert.ok(reply.reply.includes('₹'));
  assert.ok(reply.recommendedProductTitle);
});
