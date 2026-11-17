import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCourierRouteTelemetry,
  getActiveCourierOrders,
  getBlueDartTrackableOrders,
  getTrackableOrdersForMiniMap,
  haversineDistanceKm,
  isBlueDartExpressOrder,
} from './courierLiveMap';
import { UserAddress, UserOrder } from '../types/index';

const SAMPLE_ADDRESSES: UserAddress[] = [
  {
    id: 'addr-1',
    name: 'Shubham Bansal',
    phone: '+91 98765 43210',
    street: '42, Barakhamba Road',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110001',
    isDefault: true,
  },
];

const SAMPLE_ORDERS: UserOrder[] = [
  {
    id: 'ORD-DELIVERED',
    date: '08 Nov 2026',
    itemsCount: 1,
    totalPaise: 100000,
    status: 'Delivered',
    trackingStage: 'Delivered',
    courierPartner: 'BlueDart Express Air',
    trackingNumber: 'BLD-100',
    estimatedDeliveryDate: 'Delivered',
    paymentMethod: 'UPI',
    items: [],
  },
  {
    id: 'ORD-ACTIVE-OTHER',
    date: '10 Nov 2026',
    itemsCount: 1,
    totalPaise: 200000,
    status: 'Processing',
    trackingStage: 'Processing',
    courierPartner: 'Delhivery Surface',
    trackingNumber: 'DLH-200',
    estimatedDeliveryDate: 'Tomorrow',
    paymentMethod: 'Card',
    items: [],
  },
  {
    id: 'ORD-ACTIVE-BLUEDART',
    date: '11 Nov 2026',
    itemsCount: 1,
    totalPaise: 3499900,
    status: 'Processing',
    trackingStage: 'Dispatched',
    courierPartner: 'BlueDart Air Apex',
    trackingNumber: 'BLD-99320148',
    estimatedDeliveryDate: 'Tomorrow by 8:00 PM',
    paymentMethod: 'UPI',
    items: [],
  },
];

test('getActiveCourierOrders filters out delivered/cancelled and prioritizes BlueDart orders', () => {
  const active = getActiveCourierOrders(SAMPLE_ORDERS);
  assert.equal(active.length, 2);
  assert.equal(active[0].id, 'ORD-ACTIVE-BLUEDART');
  assert.equal(active[1].id, 'ORD-ACTIVE-OTHER');
});

test('getTrackableOrdersForMiniMap prioritizes active shipments ahead of delivered ones', () => {
  const trackable = getTrackableOrdersForMiniMap(SAMPLE_ORDERS);
  assert.equal(trackable.length, 3);
  assert.equal(trackable[0].id, 'ORD-ACTIVE-BLUEDART');
  assert.equal(trackable[1].id, 'ORD-ACTIVE-OTHER');
  assert.equal(trackable[2].id, 'ORD-DELIVERED');

  const deliveredSnap = buildCourierRouteTelemetry(trackable[2], SAMPLE_ADDRESSES, 0.5);
  assert.equal(deliveredSnap.stage, 'Delivered');
  assert.equal(deliveredSnap.progressRatio, 1);
  assert.equal(deliveredSnap.etaLabel, 'Delivered');
});

test('buildCourierRouteTelemetry interpolates live BlueDart Express coordinates along route', () => {
  const activeOrder = SAMPLE_ORDERS[2];
  const startSnap = buildCourierRouteTelemetry(activeOrder, SAMPLE_ADDRESSES, 0);
  const laterSnap = buildCourierRouteTelemetry(activeOrder, SAMPLE_ADDRESSES, 1);

  assert.equal(startSnap.orderId, 'ORD-ACTIVE-BLUEDART');
  assert.ok(startSnap.courierDisplayName.includes('BlueDart Express'));
  assert.equal(startSnap.waypoints.length, 4);
  assert.ok(laterSnap.progressRatio > startSnap.progressRatio);
  assert.ok(laterSnap.distanceRemainingKm <= startSnap.distanceRemainingKm);
  assert.ok(startSnap.completedPath.length >= 2);
  assert.ok(startSnap.remainingPath.length >= 2);
});

test('haversineDistanceKm calculates realistic distance between Delhi hubs', () => {
  const dist = haversineDistanceKm(
    { lat: 28.5355, lng: 77.2732 },
    { lat: 28.6315, lng: 77.2167 }
  );
  assert.ok(dist > 8 && dist < 16);
});

test('getBlueDartTrackableOrders filters strictly to non-cancelled BlueDart orders', () => {
  const mixedOrders: UserOrder[] = [
    ...SAMPLE_ORDERS,
    {
      ...SAMPLE_ORDERS[2],
      id: 'ORD-CANCELLED-BLUEDART',
      status: 'Cancelled',
    },
  ];
  assert.equal(isBlueDartExpressOrder(SAMPLE_ORDERS[1]), false);
  assert.equal(isBlueDartExpressOrder(SAMPLE_ORDERS[2]), true);

  const bluedartOnly = getBlueDartTrackableOrders(mixedOrders);
  assert.deepEqual(
    bluedartOnly.map((o) => o.id),
    ['ORD-ACTIVE-BLUEDART', 'ORD-DELIVERED']
  );
});

test('buildCourierRouteTelemetry prioritizes order.deliveryAddress over default profile address', () => {
  const mumbaiOrder: UserOrder = {
    ...SAMPLE_ORDERS[2],
    courierPartner: 'BlueDart Express',
    deliveryAddress: {
      id: 'addr-mumbai',
      name: 'Shubham Bansal',
      phone: '+91 98765 43210',
      street: 'Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400051',
      isDefault: false,
    },
  };
  const snap = buildCourierRouteTelemetry(mumbaiOrder, SAMPLE_ADDRESSES, 0.5);
  assert.equal(snap.courierDisplayName, 'BlueDart Express');
  assert.ok(snap.waypoints[3].label.includes('Mumbai (400051)'));
  assert.ok(Math.abs(snap.waypoints[3].lat - 19.076) < 0.01);
});
