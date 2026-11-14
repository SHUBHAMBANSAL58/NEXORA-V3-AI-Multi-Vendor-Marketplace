import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8')
);
const rulesContent = fs.readFileSync(
  path.resolve(process.cwd(), fs.existsSync('firestore.rules') ? 'firestore.rules' : 'DRAFT_firestore.rules'),
  'utf8'
);

function simulateBlueprintValidation(
  entityName: keyof typeof blueprint.entities,
  payload: Record<string, unknown>
): boolean {
  const entity = blueprint.entities[entityName];
  if (!entity) return false;
  const props = entity.properties;
  const required = entity.required || [];
  const allowedKeys = Object.keys(props);

  for (const reqKey of required) {
    if (!(reqKey in payload)) return false;
  }
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.includes(key)) return false;
    const def = props[key];
    const val = payload[key];
    if (def.type === 'string') {
      if (typeof val !== 'string') return false;
      if (def.minLength !== undefined && val.length < def.minLength) return false;
      if (def.maxLength !== undefined && val.length > def.maxLength) return false;
      if (def.pattern && !new RegExp(def.pattern).test(val)) return false;
      if (def.enum && !def.enum.includes(val)) return false;
    } else if (def.type === 'integer') {
      if (typeof val !== 'number' || !Number.isInteger(val)) return false;
    }
  }
  return true;
}

test('Firestore security rules include Eight Pillars guards and zero blanket reads', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2';/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /existing\(\)\.status != 'cancelled'/);
  assert.doesNotMatch(rulesContent, /allow read:\s*if\s*isSignedIn\(\);/);
  assert.doesNotMatch(rulesContent, /allow list:\s*if\s*isSignedIn\(\);/);
});

test('Dirty Dozen adversarial payloads are rejected by blueprint & rules invariants', () => {
  const now = new Date().toISOString();

  // 1. Shadow field injection
  assert.equal(
    simulateBlueprintValidation('UserPublicProfile', {
      uid: 'alice-1',
      displayName: 'Alice',
      role: 'customer',
      tier: 'Silver',
      loyaltyPoints: 0,
      isAdmin: true,
      createdAt: now,
      updatedAt: now,
    }),
    false
  );

  // 2. Self-assigned admin role
  assert.equal(
    simulateBlueprintValidation('UserPublicProfile', {
      uid: 'alice-1',
      displayName: 'Alice',
      role: 'admin',
      tier: 'Platinum',
      loyaltyPoints: 0,
      createdAt: now,
      updatedAt: now,
    }),
    false
  );

  // 3. Invalid ID poisoning (>128 chars)
  assert.equal(
    simulateBlueprintValidation('WishlistItem', {
      uid: 'alice-1',
      productId: 'x'.repeat(200),
      productTitle: 'Headphones',
      pricePaise: 1000,
      createdAt: now,
      updatedAt: now,
    }),
    false
  );

  // 4. Denial of wallet long displayName string
  assert.equal(
    simulateBlueprintValidation('UserPublicProfile', {
      uid: 'alice-1',
      displayName: 'A'.repeat(500),
      role: 'customer',
      tier: 'Silver',
      loyaltyPoints: 0,
      createdAt: now,
      updatedAt: now,
    }),
    false
  );

  // 5. Valid owner public profile passes blueprint validation
  assert.equal(
    simulateBlueprintValidation('UserPublicProfile', {
      uid: 'alice-1',
      displayName: 'Alice',
      role: 'customer',
      tier: 'Gold',
      loyaltyPoints: 300,
      createdAt: now,
      updatedAt: now,
    }),
    true
  );
});
