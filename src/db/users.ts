import { eq } from 'drizzle-orm';
import { sqlDb } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  try {
    const result = await sqlDb
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await sqlDb.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateUserLoyaltyAndWallet(params: {
  uid: string;
  loyaltyPoints: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  walletBalancePaise: number;
}) {
  try {
    const result = await sqlDb
      .update(users)
      .set({
        loyaltyPoints: params.loyaltyPoints,
        tier: params.tier,
        walletBalancePaise: params.walletBalancePaise,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, params.uid))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error('Database query failed in updateUserLoyaltyAndWallet:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
