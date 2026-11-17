import { desc, eq } from 'drizzle-orm';
import { sqlDb } from './index.ts';
import { bulkInquiries, orders, users } from './schema.ts';
import { BulkOrderInquiry, OrderStage, UserOrder } from '../types/index.ts';

export async function getUserOrdersByUid(uid: string): Promise<UserOrder[]> {
  try {
    const rows = await sqlDb
      .select({
        orderCode: orders.orderCode,
        date: orders.date,
        itemsCount: orders.itemsCount,
        totalPaise: orders.totalPaise,
        status: orders.status,
        trackingStage: orders.trackingStage,
        courierPartner: orders.courierPartner,
        trackingNumber: orders.trackingNumber,
        estimatedDeliveryDate: orders.estimatedDeliveryDate,
        paymentMethod: orders.paymentMethod,
        itemsJson: orders.itemsJson,
        deliveryAddressJson: orders.deliveryAddressJson,
        preferredDeliveryDate: orders.preferredDeliveryDate,
        orderNotes: orders.orderNotes,
        isGiftReceipt: orders.isGiftReceipt,
        giftMessage: orders.giftMessage,
        cancelledAt: orders.cancelledAt,
        cancellationReason: orders.cancellationReason,
        returnInfoJson: orders.returnInfoJson,
        promoCode: orders.promoCode,
        discountPaise: orders.discountPaise,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(orders.id));

    return rows.map((row) => ({
      id: row.orderCode,
      date: row.date,
      itemsCount: row.itemsCount,
      totalPaise: row.totalPaise,
      status: row.status as UserOrder['status'],
      trackingStage: row.trackingStage as OrderStage,
      courierPartner: row.courierPartner,
      trackingNumber: row.trackingNumber,
      estimatedDeliveryDate: row.estimatedDeliveryDate,
      paymentMethod: row.paymentMethod,
      items: row.itemsJson,
      deliveryAddress: row.deliveryAddressJson ?? undefined,
      preferredDeliveryDate: row.preferredDeliveryDate ?? undefined,
      orderNotes: row.orderNotes ?? undefined,
      isGiftReceipt: row.isGiftReceipt ?? false,
      giftMessage: row.giftMessage ?? undefined,
      cancelledAt: row.cancelledAt ?? undefined,
      cancellationReason: row.cancellationReason ?? undefined,
      returnInfo: row.returnInfoJson ?? undefined,
      promoCode: row.promoCode ?? undefined,
      discountPaise: row.discountPaise ?? undefined,
    }));
  } catch (error) {
    console.error('Database query failed in getUserOrdersByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function saveUserOrder(userId: number, order: UserOrder): Promise<UserOrder> {
  try {
    await sqlDb
      .insert(orders)
      .values({
        orderCode: order.id,
        userId,
        date: order.date,
        itemsCount: order.itemsCount,
        totalPaise: order.totalPaise,
        status: order.status,
        trackingStage: order.trackingStage,
        courierPartner: order.courierPartner,
        trackingNumber: order.trackingNumber,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        paymentMethod: order.paymentMethod,
        itemsJson: order.items,
        deliveryAddressJson: order.deliveryAddress ?? null,
        preferredDeliveryDate: order.preferredDeliveryDate ?? null,
        orderNotes: order.orderNotes ?? null,
        isGiftReceipt: Boolean(order.isGiftReceipt),
        giftMessage: order.giftMessage ?? null,
        cancelledAt: order.cancelledAt ?? null,
        cancellationReason: order.cancellationReason ?? null,
        returnInfoJson: order.returnInfo ?? null,
        promoCode: order.promoCode ?? null,
        discountPaise: order.discountPaise ?? null,
      })
      .onConflictDoNothing({ target: orders.orderCode });

    return order;
  } catch (error) {
    console.error('Database query failed in saveUserOrder:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateUserOrderStateSql(
  orderCode: string,
  updates: Partial<{
    status: string;
    trackingStage: string;
    cancelledAt: string | null;
    cancellationReason: string | null;
    returnInfoJson: UserOrder['returnInfo'] | null;
  }>
): Promise<void> {
  try {
    await sqlDb
      .update(orders)
      .set(updates)
      .where(eq(orders.orderCode, orderCode));
  } catch (error) {
    console.error('Database query failed in updateUserOrderStateSql:', error);
  }
}

export async function getUserBulkInquiriesByUid(uid: string): Promise<BulkOrderInquiry[]> {
  try {
    const rows = await sqlDb
      .select({
        inquiryCode: bulkInquiries.inquiryCode,
        productId: bulkInquiries.productId,
        productTitle: bulkInquiries.productTitle,
        brand: bulkInquiries.brand,
        sellerStoreName: bulkInquiries.sellerStoreName,
        quantity: bulkInquiries.quantity,
        offeredUnitPaise: bulkInquiries.offeredUnitPaise,
        standardPricePaise: bulkInquiries.standardPricePaise,
        companyName: bulkInquiries.companyName,
        contactName: bulkInquiries.contactName,
        contactEmail: bulkInquiries.contactEmail,
        contactPhone: bulkInquiries.contactPhone,
        gstin: bulkInquiries.gstin,
        notes: bulkInquiries.notes,
        status: bulkInquiries.status,
        createdAtLabel: bulkInquiries.createdAtLabel,
      })
      .from(bulkInquiries)
      .innerJoin(users, eq(bulkInquiries.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(bulkInquiries.id));

    return rows.map((row) => ({
      id: row.inquiryCode,
      productId: row.productId,
      productTitle: row.productTitle,
      brand: row.brand,
      sellerStoreName: row.sellerStoreName,
      quantity: row.quantity,
      offeredUnitPaise: row.offeredUnitPaise,
      standardPricePaise: row.standardPricePaise,
      companyName: row.companyName,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      gstin: row.gstin ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.createdAtLabel,
      status: row.status as BulkOrderInquiry['status'],
    }));
  } catch (error) {
    console.error('Database query failed in getUserBulkInquiriesByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function saveUserBulkInquiry(
  userId: number,
  inquiry: BulkOrderInquiry
): Promise<BulkOrderInquiry> {
  try {
    await sqlDb
      .insert(bulkInquiries)
      .values({
        inquiryCode: inquiry.id,
        userId,
        productId: inquiry.productId,
        productTitle: inquiry.productTitle,
        brand: inquiry.brand,
        sellerStoreName: inquiry.sellerStoreName,
        quantity: inquiry.quantity,
        offeredUnitPaise: inquiry.offeredUnitPaise,
        standardPricePaise: inquiry.standardPricePaise,
        companyName: inquiry.companyName,
        contactName: inquiry.contactName,
        contactEmail: inquiry.contactEmail,
        contactPhone: inquiry.contactPhone,
        gstin: inquiry.gstin ?? null,
        notes: inquiry.notes ?? null,
        status: inquiry.status,
        createdAtLabel: inquiry.createdAt,
      })
      .onConflictDoNothing({ target: bulkInquiries.inquiryCode });

    return inquiry;
  } catch (error) {
    console.error('Database query failed in saveUserBulkInquiry:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
