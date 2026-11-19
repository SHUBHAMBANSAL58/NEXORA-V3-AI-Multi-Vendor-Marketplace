export interface ProductVariant {
  id: string;
  name: string;
  colorName: string;
  colorHex: string;
  pricePaise: number;
  originalPricePaise?: number;
  sku: string;
  inventoryCount: number;
  image?: string;
}

export interface CatalogProduct {
  id: string;
  title: string;
  slug: string;
  brand: string;
  category: string;
  categorySlug: string;
  tagline: string;
  description: string;
  pricePaise: number;
  originalPricePaise?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  image: string;
  images: string[];
  tags: string[];
  specs: Record<string, string>;
  seller: {
    id: string;
    storeName: string;
    isVerified: boolean;
    rating: number;
    city: string;
  };
  variants?: ProductVariant[];
}

export interface Product extends CatalogProduct {
  highlights: string[];
  badges?: string[];
  deliveryInfo: {
    freeDelivery: boolean;
    estimatedDays: number;
  };
  variants: ProductVariant[];
}

export interface UserAddress {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

export type OrderStage = 'Processing' | 'Dispatched' | 'Out for Delivery' | 'Delivered' | 'Return Requested' | 'Returned';

export interface TrackingCheckpoint {
  stage: OrderStage;
  timestamp: string;
  location: string;
  description: string;
  completed: boolean;
}

export interface OrderReturnInfo {
  requestedDate: string;
  reason: string;
  rmaNumber: string;
  pickupScheduledDate: string;
  refundStatus: 'Pending Pickup' | 'Inspected' | 'Refund Completed';
}

export interface UserOrder {
  id: string;
  date: string;
  itemsCount: number;
  totalPaise: number;
  status: OrderStage | 'Confirmed' | 'Shipped' | 'Cancelled';
  trackingStage: OrderStage;
  courierPartner: string;
  trackingNumber: string;
  estimatedDeliveryDate: string;
  paymentMethod: string;
  items: Array<{
    title: string;
    image: string;
    pricePaise: number;
    quantity: number;
  }>;
  deliveryAddress?: UserAddress;
  preferredDeliveryDate?: string;
  orderNotes?: string;
  isGiftReceipt?: boolean;
  giftMessage?: string;
  checkpoints?: TrackingCheckpoint[];
  returnInfo?: OrderReturnInfo;
  cancelledAt?: string;
  cancellationReason?: string;
  promoCode?: string;
  discountPaise?: number;
  gstPaise?: number;
  paymentMode?: 'live' | 'sandbox-demo';
}

export interface BulkOrderInquiry {
  id: string;
  productId: string;
  productTitle: string;
  brand: string;
  sellerStoreName: string;
  quantity: number;
  offeredUnitPaise: number;
  standardPricePaise: number;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  gstin?: string;
  notes?: string;
  createdAt: string;
  status: 'Pending Review' | 'Accepted' | 'Negotiation';
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: 'shopping' | 'review' | 'loyalty' | 'community';
  icon: 'shield' | 'star' | 'crown' | 'sparkles' | 'award' | 'zap';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
}

export interface UserReview {
  id: string;
  productId: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
}

export interface PriceAlert {
  id: string;
  productId: string;
  productTitle: string;
  targetPricePaise: number;
  currentPricePaise: number;
  userEmail: string;
  createdAt: string;
  triggered?: boolean;
}

export interface PromoDiscount {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (e.g. 10 for 10%) or paise (e.g. 50000 for ₹500)
  minSpendPaise?: number;
  description: string;
  isActive?: boolean;
  usageCount?: number;
}

export interface SellerProfile {
  id: string;
  storeName: string;
  ownerName: string;
  gstin: string;
  email: string;
  city: string;
  state: string;
  isVerified: boolean;
  status: 'pending' | 'approved' | 'suspended';
  commissionRate: number;
  balancePaise: number;
  createdAt?: string;
}

export interface ManagedCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hsnDefault: string;
  gstRate: number;
  itemCount: number;
}

export interface AdminAuditLog {
  id: string;
  actorEmail: string;
  actorRole: 'admin' | 'seller' | 'customer' | 'system';
  action: string;
  targetType: 'seller' | 'product' | 'order' | 'category' | 'coupon' | 'inquiry' | 'user' | 'orchestrator';
  targetId: string;
  details: string;
  timestamp: string;
}

export interface CatalogProductWithMeta extends CatalogProduct {
  hsnCode?: string;
  isPublished?: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: 'customer' | 'seller' | 'admin';
  cartCount: number;
  wishlistCount: number;
  loyaltyPoints: number;
  walletBalancePaise?: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  addresses: UserAddress[];
  orders: UserOrder[];
  priceAlerts?: PriceAlert[];
  badges?: AchievementBadge[];
  bulkInquiries?: BulkOrderInquiry[];
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  itemCount?: string;
  icon?: string;
}
