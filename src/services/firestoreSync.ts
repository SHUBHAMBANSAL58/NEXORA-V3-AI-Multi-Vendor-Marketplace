import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.js';
import { CatalogProduct, PriceAlert } from '../types/index.js';

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function sanitizeString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function assertValidId(id: string, fieldName: string): string {
  const cleaned = id.trim();
  if (!cleaned || cleaned.length > 128 || !ID_REGEX.test(cleaned)) {
    throw new Error(`Invalid ${fieldName} identifier format.`);
  }
  return cleaned;
}

export async function syncUserRecordsToFirestore(params: {
  uid: string;
  displayName: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
  tier: 'Silver' | 'Gold' | 'Platinum';
  loyaltyPoints: number;
  phone?: string;
  defaultPinCode?: string;
}): Promise<void> {
  const uid = assertValidId(params.uid, 'uid');
  const publicPath = `users/${uid}/public/profile`;
  const privatePath = `users/${uid}/private/info`;

  const safeRole: 'customer' | 'seller' = params.role === 'seller' ? 'seller' : 'customer';
  const safeName = sanitizeString(params.displayName || 'NEXORA Member', 120);
  const safePoints = Math.max(0, Math.min(10000000, Math.trunc(params.loyaltyPoints || 0)));

  try {
    const publicRef = doc(db, 'users', uid, 'public', 'profile');
    const existingPublic = await getDoc(publicRef);
    if (existingPublic.exists()) {
      await updateDoc(publicRef, {
        displayName: safeName,
        role: safeRole,
        tier: params.tier,
        loyaltyPoints: safePoints,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(publicRef, {
        uid,
        displayName: safeName,
        role: safeRole,
        tier: params.tier,
        loyaltyPoints: safePoints,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  try {
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    const existingPrivate = await getDoc(privateRef);
    const privateUpdates: Record<string, unknown> = {
      email: sanitizeString(params.email, 200),
      updatedAt: serverTimestamp(),
    };
    if (params.phone) {
      privateUpdates.phone = sanitizeString(params.phone, 32);
    }
    if (params.defaultPinCode) {
      privateUpdates.defaultPinCode = sanitizeString(params.defaultPinCode, 16);
    }

    if (existingPrivate.exists()) {
      await updateDoc(privateRef, privateUpdates);
    } else {
      await setDoc(privateRef, {
        uid,
        ...privateUpdates,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export async function addWishlistItemToFirestore(
  uid: string,
  product: Pick<CatalogProduct, 'id' | 'title' | 'pricePaise'>
): Promise<void> {
  const safeUid = assertValidId(uid, 'uid');
  const safeProductId = assertValidId(product.id, 'productId').slice(0, 64);
  const path = `users/${safeUid}/wishlist/${safeProductId}`;

  try {
    await setDoc(doc(db, 'users', safeUid, 'wishlist', safeProductId), {
      uid: safeUid,
      productId: safeProductId,
      productTitle: sanitizeString(product.title, 200),
      pricePaise: Math.max(0, Math.min(1000000000, Math.trunc(product.pricePaise))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeWishlistItemFromFirestore(
  uid: string,
  productId: string
): Promise<void> {
  const safeUid = assertValidId(uid, 'uid');
  const safeProductId = assertValidId(productId, 'productId').slice(0, 64);
  const path = `users/${safeUid}/wishlist/${safeProductId}`;

  try {
    await deleteDoc(doc(db, 'users', safeUid, 'wishlist', safeProductId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserWishlist(
  uid: string,
  onChange: (productIds: string[]) => void
): () => void {
  const safeUid = assertValidId(uid, 'uid');
  const path = `users/${safeUid}/wishlist`;
  const q = query(collection(db, 'users', safeUid, 'wishlist'), where('uid', '==', safeUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const ids = snapshot.docs
        .map((d) => d.data().productId as string)
        .filter((id): id is string => typeof id === 'string');
      onChange(ids);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function savePriceAlertToFirestore(
  uid: string,
  alert: PriceAlert
): Promise<void> {
  const safeUid = assertValidId(uid, 'uid');
  const safeAlertId = assertValidId(alert.id, 'alertId');
  const safeProductId = assertValidId(alert.productId, 'productId').slice(0, 64);
  const path = `users/${safeUid}/priceAlerts/${safeAlertId}`;

  try {
    await setDoc(doc(db, 'users', safeUid, 'priceAlerts', safeAlertId), {
      uid: safeUid,
      productId: safeProductId,
      productTitle: sanitizeString(alert.productTitle, 200),
      targetPricePaise: Math.max(0, Math.min(1000000000, Math.trunc(alert.targetPricePaise))),
      currentPricePaise: Math.max(0, Math.min(1000000000, Math.trunc(alert.currentPricePaise))),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
