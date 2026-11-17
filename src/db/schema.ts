import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export interface OrderLineItemRecord {
  title: string;
  image: string;
  pricePaise: number;
  quantity: number;
}

export interface OrderDeliveryAddressRecord {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

export interface OrderReturnInfoRecord {
  requestedDate: string;
  reason: string;
  rmaNumber: string;
  pickupScheduledDate: string;
  refundStatus: 'Pending Pickup' | 'Inspected' | 'Refund Completed';
}

// Authenticated users synchronized from Firebase Authentication UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('customer'),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  tier: text('tier').notNull().default('Silver'),
  walletBalancePaise: integer('wallet_balance_paise').notNull().default(500000),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Persistent orders linked to authenticated users
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderCode: text('order_code').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  date: text('date').notNull(),
  itemsCount: integer('items_count').notNull(),
  totalPaise: integer('total_paise').notNull(),
  status: text('status').notNull(),
  trackingStage: text('tracking_stage').notNull(),
  courierPartner: text('courier_partner').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  estimatedDeliveryDate: text('estimated_delivery_date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  itemsJson: jsonb('items_json').$type<OrderLineItemRecord[]>().notNull(),
  deliveryAddressJson: jsonb('delivery_address_json').$type<OrderDeliveryAddressRecord | null>(),
  preferredDeliveryDate: text('preferred_delivery_date'),
  orderNotes: text('order_notes'),
  isGiftReceipt: boolean('is_gift_receipt').notNull().default(false),
  giftMessage: text('gift_message'),
  cancelledAt: text('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  returnInfoJson: jsonb('return_info_json').$type<OrderReturnInfoRecord | null>(),
  promoCode: text('promo_code'),
  discountPaise: integer('discount_paise'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Persistent B2B bulk inquiries linked to authenticated users
export const bulkInquiries = pgTable('bulk_inquiries', {
  id: serial('id').primaryKey(),
  inquiryCode: text('inquiry_code').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  productId: text('product_id').notNull(),
  productTitle: text('product_title').notNull(),
  brand: text('brand').notNull(),
  sellerStoreName: text('seller_store_name').notNull(),
  quantity: integer('quantity').notNull(),
  offeredUnitPaise: integer('offered_unit_paise').notNull(),
  standardPricePaise: integer('standard_price_paise').notNull(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone').notNull(),
  gstin: text('gstin'),
  notes: text('notes'),
  status: text('status').notNull(),
  createdAtLabel: text('created_at_label').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Multi-vendor seller registry
export const sellers = pgTable('sellers', {
  id: serial('id').primaryKey(),
  sellerCode: text('seller_code').notNull().unique(),
  storeName: text('store_name').notNull(),
  ownerName: text('owner_name').notNull(),
  gstin: text('gstin').notNull(),
  email: text('email').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  status: text('status').notNull().default('pending'),
  isVerified: boolean('is_verified').notNull().default(false),
  commissionRate: integer('commission_rate').notNull().default(10),
  balancePaise: integer('balance_paise').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Managed marketplace categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  categoryCode: text('category_code').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  hsnDefault: text('hsn_default').notNull().default('85183000'),
  gstRate: integer('gst_rate').notNull().default(18),
  createdAt: timestamp('created_at').defaultNow(),
});

// Seller product listings
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  productCode: text('product_code').notNull().unique(),
  title: text('title').notNull(),
  brand: text('brand').notNull(),
  categorySlug: text('category_slug').notNull(),
  pricePaise: integer('price_paise').notNull(),
  stock: integer('stock').notNull().default(0),
  sellerId: text('seller_id').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  hsnCode: text('hsn_code').notNull().default('85183000'),
  payloadJson: jsonb('payload_json').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Promotional coupons managed by admins
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(),
  value: integer('value').notNull(),
  minSpendPaise: integer('min_spend_paise').default(0),
  description: text('description').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Verified customer product reviews
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  reviewCode: text('review_code').notNull().unique(),
  productId: text('product_id').notNull(),
  author: text('author').notNull(),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  comment: text('comment').notNull(),
  verifiedPurchase: boolean('verified_purchase').notNull().default(false),
  helpfulCount: integer('helpful_count').notNull().default(0),
  dateLabel: text('date_label').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Newsletter subscribers
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Governance audit logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  logCode: text('log_code').notNull().unique(),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: text('details').notNull(),
  timestampLabel: text('timestamp_label').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  bulkInquiries: many(bulkInquiries),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const bulkInquiriesRelations = relations(bulkInquiries, ({ one }) => ({
  customer: one(users, {
    fields: [bulkInquiries.userId],
    references: [users.id],
  }),
}));
