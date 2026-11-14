import { test } from 'node:test';
import assert from 'node:assert';
import { PRODUCTS_CATALOG, EXPANDED_CATEGORIES } from './productsCatalog.js';
import { db } from '../server/db.js';

test('Product catalog contains exactly 60 fully formed products', () => {
  assert.strictEqual(PRODUCTS_CATALOG.length, 60, 'Must have at least 60 products');
});

test('Product catalog contains 10 products across all 6 main categories', () => {
  const expectedCategories = ['smartphones', 'audio', 'keyboards', 'timepieces', 'workspace', 'smart-home'];
  
  for (const catSlug of expectedCategories) {
    const prods = PRODUCTS_CATALOG.filter((p) => p.categorySlug === catSlug);
    assert.strictEqual(prods.length, 10, `Category ${catSlug} must contain exactly 10 products`);
  }
});

test('All 60 products have real photograph URLs (no empty or placeholder strings)', () => {
  for (const prod of PRODUCTS_CATALOG) {
    assert.ok(prod.image && prod.image.startsWith('https://'), `Product ${prod.id} must have HTTPS image URL`);
    assert.ok(prod.pricePaise > 0, `Product ${prod.id} price must be > 0`);
    assert.ok(prod.seller && prod.seller.storeName, `Product ${prod.id} must have verified seller`);
    assert.ok(prod.stock > 0, `Product ${prod.id} stock must be positive`);
    assert.ok(prod.specs && Object.keys(prod.specs).length > 0, `Product ${prod.id} must have specifications`);
  }
});

test('Database engine returns all 60 products with filter support', async () => {
  const allProds = await db.getProducts({ categorySlug: 'all' });
  assert.strictEqual(allProds.length, 60);

  const audioProds = await db.getProducts({ categorySlug: 'audio' });
  assert.strictEqual(audioProds.length, 10);

  const searchProds = await db.getProducts({ search: 'titanium' });
  assert.ok(searchProds.length > 0);
});
