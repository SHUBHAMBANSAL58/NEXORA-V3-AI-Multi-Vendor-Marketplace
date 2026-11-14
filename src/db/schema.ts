import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export interface OrderLineItemRecord {
  title: string;
  image: string;
  pricePaise: number;
  quantity: number;
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
  preferredDeliveryDate: text('preferred_delivery_date'),
  orderNotes: text('order_notes'),
  isGiftReceipt: boolean('is_gift_receipt').notNull().default(false),
  giftMessage: text('gift_message'),
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
