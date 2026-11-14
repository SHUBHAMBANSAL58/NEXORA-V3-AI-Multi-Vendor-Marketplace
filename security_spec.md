# Security Specification — NEXORA V3 Firestore Rules

## 1. Data Invariants
1. **Identity Isolation**: Every user document under `/users/{userId}/...` MUST belong to `request.auth.uid == userId`, with `data.uid == userId` immutable after creation.
2. **Verified Email Requirement**: All client writes (`create`, `update`, `delete`) require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation (Split Collection)**: Contact PII (`email`, `phone`, `defaultPinCode`) is stored exclusively in `/users/{userId}/private/{docId}` and never exposed to non-owners via `get` or `list`.
4. **Prevent Self-Assigned Roles**: `UserPublicProfile.role` only permits `'customer'` or `'seller'`. Client writes cannot grant `'admin'`; `/admins/{adminId}` is locked against client writes.
5. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on `create` and remain equal to `existing().createdAt` on `update`; `updatedAt` must equal `request.time` on both `create` and `update`.
6. **Volumetric & Type Safety**: All document IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), all string fields enforce explicit `.size()` bounds matching `firebase-blueprint.json`, and all entity maps enforce `keys().hasAll(...) && keys().hasOnly(...)` plus `affectedKeys().hasOnly(...)` on updates.
7. **Terminal State Locking**: A `PriceAlertRecord` in status `'cancelled'` cannot be mutated back to `'active'` or `'triggered'` by non-admin clients.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Shadow Field Injection (Public Profile Create)**: `{ uid: "alice", displayName: "Alice", role: "customer", tier: "Silver", loyaltyPoints: 0, isAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected (`keys().hasOnly` blocks `isAdmin`).
2. **Self-Assigned Admin Privilege Escalation**: `{ uid: "alice", displayName: "Alice", role: "admin", tier: "Platinum", loyaltyPoints: 0, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected (`role in ['customer', 'seller']` blocks `'admin'`).
3. **UID Spoofing (Cross-User Wishlist Write)**: User `"bob"` creates `/users/alice/wishlist/prod-1` with `{ uid: "alice", ... }` -> Rejected (`isOwner("alice")` fails).
4. **Mismatched Body UID**: User `"alice"` creates `/users/alice/wishlist/prod-1` with `{ uid: "bob", ... }` -> Rejected (`data.uid == userId` fails).
5. **Email Spoofing / Unverified Token**: Token has `email: "bansalshubham662@gmail.com"` and `email_verified: false` -> Rejected (`isVerifiedUser()` blocks access).
6. **PII Blanket Read Attempt**: Authenticated user `"bob"` reads `/users/alice/private/info` -> Rejected (`isOwner("alice")` fails).
7. **Unscoped List Scraping**: Authenticated user queries `collectionGroup` or attempts `list` without owner predicate -> Rejected (`allow list` evaluates `isOwner(userId) && resource.data.uid == request.auth.uid`).
8. **ID Poisoning (1.5KB Junk Doc ID)**: Write to `/users/alice/wishlist/${"x".repeat(1500)}` -> Rejected (`isValidId` blocks `id.size() > 128` and invalid chars).
9. **String Overflow / Denial of Wallet**: `{ displayName: "A".repeat(500), ... }` -> Rejected (`displayName.size() <= 120` fails).
10. **Client-Forged Timestamp**: `{ ..., createdAt: "2020-01-01T00:00:00Z", updatedAt: SERVER_TIME }` -> Rejected (`createdAt == request.time` fails).
11. **Terminal State Shortcutting (Cancelled Price Alert Re-Activation)**: Updating alert where `existing().status == 'cancelled'` to `{ status: "active" }` -> Rejected (terminal state lock blocks non-admin re-activation).
12. **Immortal Field Tampering**: Updating `/users/alice/public/profile` with altered `uid` or `createdAt` -> Rejected (`affectedKeys().hasOnly(...)` and equality guards reject mutation).
