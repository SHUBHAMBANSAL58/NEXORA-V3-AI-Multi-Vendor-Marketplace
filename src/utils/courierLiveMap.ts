import { OrderStage, UserAddress, UserOrder } from '../types/index.js';

export interface LatLngPoint {
  lat: number;
  lng: number;
  label: string;
  role: 'origin' | 'hub' | 'destination';
}

export interface CourierTelemetrySnapshot {
  orderId: string;
  courierDisplayName: string;
  trackingNumber: string;
  stage: OrderStage;
  progressRatio: number;
  currentPosition: { lat: number; lng: number };
  headingDegrees: number;
  speedKmh: number;
  distanceRemainingKm: number;
  etaLabel: string;
  currentCheckpointLabel: string;
  nextCheckpointLabel: string;
  waypoints: LatLngPoint[];
  completedPath: Array<[number, number]>;
  remainingPath: Array<[number, number]>;
}

const CITY_DESTINATION_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  'new delhi': { lat: 28.6315, lng: 77.2167, label: 'Connaught Place, New Delhi' },
  delhi: { lat: 28.6315, lng: 77.2167, label: 'Connaught Place, New Delhi' },
  gurugram: { lat: 28.495, lng: 77.0895, label: 'Cyber City DLF Phase 2, Gurugram' },
  bengaluru: { lat: 12.9716, lng: 77.5946, label: 'Indiranagar Hub, Bengaluru' },
  mumbai: { lat: 19.076, lng: 72.8777, label: 'BKC Express Zone, Mumbai' },
  hyderabad: { lat: 17.385, lng: 78.4867, label: 'HITEC City, Hyderabad' },
  pune: { lat: 18.5204, lng: 73.8567, label: 'Koregaon Park Hub, Pune' },
  chennai: { lat: 13.0827, lng: 80.2707, label: 'T. Nagar Express Zone, Chennai' },
  kolkata: { lat: 22.5726, lng: 88.3639, label: 'Park Street Hub, Kolkata' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, label: 'SG Highway Hub, Ahmedabad' },
  jaipur: { lat: 26.9124, lng: 75.7873, label: 'MI Road Dispatch Hub, Jaipur' },
};

/**
 * Returns true when an order uses BlueDart Express tracking and is eligible for route visualization.
 */
export function isBlueDartExpressOrder(order: UserOrder): boolean {
  const isTrackableState =
    order.status !== 'Cancelled' &&
    order.status !== 'Returned' &&
    order.trackingStage !== 'Returned';
  if (!isTrackableState) return false;
  return (order.courierPartner || '').toLowerCase().includes('bluedart');
}

/**
 * Filters orders that are actively in transit (not Delivered, Returned, or Cancelled),
 * prioritizing BlueDart Express / BlueDart Air Apex shipments.
 */
export function getActiveCourierOrders(orders: UserOrder[]): UserOrder[] {
  const active = orders.filter((order) => {
    const stage = order.trackingStage || order.status;
    return (
      stage !== 'Delivered' &&
      stage !== 'Returned' &&
      order.status !== 'Delivered' &&
      order.status !== 'Returned' &&
      order.status !== 'Cancelled'
    );
  });

  // Sort BlueDart orders first so BlueDart Express is selected by default
  return [...active].sort((a, b) => {
    const aBlueDart = (a.courierPartner || '').toLowerCase().includes('bluedart') ? 0 : 1;
    const bBlueDart = (b.courierPartner || '').toLowerCase().includes('bluedart') ? 0 : 1;
    return aBlueDart - bBlueDart;
  });
}

/**
 * Returns all trackable orders for the mini interactive map (excluding Cancelled/Returned),
 * ordering active transit shipments (BlueDart first) ahead of Delivered shipments.
 */
export function getTrackableOrdersForMiniMap(orders: UserOrder[]): UserOrder[] {
  const trackable = orders.filter(
    (order) =>
      order.status !== 'Cancelled' &&
      order.status !== 'Returned' &&
      order.trackingStage !== 'Returned'
  );

  return [...trackable].sort((a, b) => {
    const aDelivered =
      a.status === 'Delivered' || a.trackingStage === 'Delivered' ? 1 : 0;
    const bDelivered =
      b.status === 'Delivered' || b.trackingStage === 'Delivered' ? 1 : 0;
    if (aDelivered !== bDelivered) return aDelivered - bDelivered;

    const aBlueDart = (a.courierPartner || '').toLowerCase().includes('bluedart') ? 0 : 1;
    const bBlueDart = (b.courierPartner || '').toLowerCase().includes('bluedart') ? 0 : 1;
    return aBlueDart - bBlueDart;
  });
}

/**
 * Filters and sorts BlueDart Express orders, prioritizing active in-transit shipments ahead of Delivered ones.
 */
export function getBlueDartTrackableOrders(orders: UserOrder[]): UserOrder[] {
  return getTrackableOrdersForMiniMap(orders.filter(isBlueDartExpressOrder));
}

function resolveDestinationPoint(
  addresses: UserAddress[],
  orderAddress?: UserAddress
): LatLngPoint {
  const targetAddr = orderAddress || addresses.find((a) => a.isDefault) || addresses[0];
  if (!targetAddr) {
    return {
      lat: 28.6315,
      lng: 77.2167,
      label: 'Customer Doorstep · New Delhi (110001)',
      role: 'destination',
    };
  }

  const cityKey = targetAddr.city.trim().toLowerCase();
  const matched = CITY_DESTINATION_COORDS[cityKey];
  if (matched) {
    return {
      lat: matched.lat,
      lng: matched.lng,
      label: `Customer Doorstep · ${targetAddr.city} (${targetAddr.pinCode})`,
      role: 'destination',
    };
  }

  return {
    lat: 28.6315,
    lng: 77.2167,
    label: `Customer Doorstep · ${targetAddr.city} (${targetAddr.pinCode})`,
    role: 'destination',
  };
}

function getStageProgressBounds(stage: OrderStage): [number, number] {
  switch (stage) {
    case 'Processing':
      return [0.08, 0.25];
    case 'Dispatched':
      return [0.35, 0.68];
    case 'Out for Delivery':
      return [0.72, 0.96];
    case 'Delivered':
      return [1.0, 1.0];
    default:
      return [0.25, 0.55];
  }
}

export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeBearingDegrees(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.round((toDeg(Math.atan2(y, x)) + 360) % 360);
}

/**
 * Builds deterministic real-time GPS route telemetry for a BlueDart Express courier shipment.
 * @param liveCycleProgress Value in [0, 1] representing live movement within the order's active stage.
 */
export function buildCourierRouteTelemetry(
  order: UserOrder,
  addresses: UserAddress[] = [],
  liveCycleProgress: number = 0.5
): CourierTelemetrySnapshot {
  const destination = resolveDestinationPoint(addresses, order.deliveryAddress);
  const isMetroSouth = destination.lat < 22;

  const waypoints: LatLngPoint[] = isMetroSouth
    ? [
        {
          lat: destination.lat - 0.14,
          lng: destination.lng - 0.16,
          label: 'NEXORA Regional Fulfillment Hub',
          role: 'origin',
        },
        {
          lat: destination.lat - 0.08,
          lng: destination.lng - 0.06,
          label: 'BlueDart Express Air Cargo Terminal',
          role: 'hub',
        },
        {
          lat: destination.lat - 0.03,
          lng: destination.lng - 0.02,
          label: 'BlueDart Express City Dispatch Center',
          role: 'hub',
        },
        destination,
      ]
    : [
        {
          lat: 28.5355,
          lng: 77.2732,
          label: 'NEXORA Okhla Fulfillment Hub, New Delhi',
          role: 'origin',
        },
        {
          lat: 28.5562,
          lng: 77.1089,
          label: 'BlueDart Express IGI Air Sorting Hub',
          role: 'hub',
        },
        {
          lat: 28.5921,
          lng: 77.1754,
          label: 'BlueDart Express Central Delhi Van Bay',
          role: 'hub',
        },
        destination,
      ];

  const stage: OrderStage =
    order.trackingStage || (order.status as OrderStage) || 'Dispatched';
  const clampedCycle = Math.min(1, Math.max(0, liveCycleProgress));
  const [minP, maxP] = getStageProgressBounds(stage);
  const progressRatio = minP + (maxP - minP) * clampedCycle;

  // Map progressRatio (0..1) across the N-1 segments
  const totalSegments = waypoints.length - 1;
  const scaled = progressRatio * totalSegments;
  const segIndex = Math.min(totalSegments - 1, Math.floor(scaled));
  const segT = scaled - segIndex;

  const segStart = waypoints[segIndex];
  const segEnd = waypoints[segIndex + 1];

  const currentPosition = {
    lat: Number((segStart.lat + (segEnd.lat - segStart.lat) * segT).toFixed(5)),
    lng: Number((segStart.lng + (segEnd.lng - segStart.lng) * segT).toFixed(5)),
  };

  const completedPath: Array<[number, number]> = waypoints
    .slice(0, segIndex + 1)
    .map((p) => [p.lat, p.lng]);
  completedPath.push([currentPosition.lat, currentPosition.lng]);

  const remainingPath: Array<[number, number]> = [
    [currentPosition.lat, currentPosition.lng],
    ...waypoints.slice(segIndex + 1).map((p) => [p.lat, p.lng] as [number, number]),
  ];

  // Remaining path distance in km
  let distanceRemainingKm = 0;
  for (let i = 0; i < remainingPath.length - 1; i += 1) {
    distanceRemainingKm += haversineDistanceKm(
      { lat: remainingPath[i][0], lng: remainingPath[i][1] },
      { lat: remainingPath[i + 1][0], lng: remainingPath[i + 1][1] }
    );
  }
  distanceRemainingKm = Number(distanceRemainingKm.toFixed(1));

  const speedKmh =
    stage === 'Delivered' ? 0 : stage === 'Processing' ? 24 : stage === 'Out for Delivery' ? 38 : 54;
  const etaMinutes = speedKmh > 0 ? Math.max(4, Math.round((distanceRemainingKm / speedKmh) * 60)) : 0;
  const etaLabel =
    stage === 'Delivered'
      ? 'Delivered'
      : etaMinutes >= 60
      ? `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`
      : `${etaMinutes} mins`;

  const courierPartnerRaw = order.courierPartner || 'BlueDart Express';
  const courierDisplayName =
    courierPartnerRaw.trim().toLowerCase() === 'bluedart express'
      ? 'BlueDart Express'
      : courierPartnerRaw.toLowerCase().includes('bluedart')
      ? `BlueDart Express (${courierPartnerRaw})`
      : courierPartnerRaw;

  return {
    orderId: order.id,
    courierDisplayName,
    trackingNumber: order.trackingNumber || 'BLD-99320148',
    stage,
    progressRatio: Number(progressRatio.toFixed(3)),
    currentPosition,
    headingDegrees: computeBearingDegrees(segStart, segEnd),
    speedKmh,
    distanceRemainingKm,
    etaLabel,
    currentCheckpointLabel: segStart.label,
    nextCheckpointLabel: segEnd.label,
    waypoints,
    completedPath,
    remainingPath,
  };
}
