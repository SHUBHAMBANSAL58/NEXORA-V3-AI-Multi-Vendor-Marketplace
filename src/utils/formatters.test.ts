import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrencyINR,
  calculateDiscountPercentage,
  filterItemsByQuery,
} from './formatters.js';

test('formatCurrencyINR correctly formats paise into Indian Rupee format', () => {
  assert.equal(formatCurrencyINR(0), '₹0');
  assert.equal(formatCurrencyINR(99900), '₹999');
  assert.equal(formatCurrencyINR(2499900), '₹24,999');
  assert.equal(formatCurrencyINR(14990000), '₹1,49,900');
  assert.equal(formatCurrencyINR(-500), '₹0');
});

test('calculateDiscountPercentage accurately determines percentage off', () => {
  assert.equal(calculateDiscountPercentage(3499900, 2499900), 29);
  assert.equal(calculateDiscountPercentage(100000, 100000), 0);
  assert.equal(calculateDiscountPercentage(100000, 120000), 0);
  assert.equal(calculateDiscountPercentage(200000, 100000), 50);
});

test('filterItemsByQuery filters by title, category, and brand case-insensitively', () => {
  const items = [
    { title: 'Aura Pro Wireless Headphones', category: 'Audio', brand: 'Lumina' },
    { title: 'Titan Chrono Watch', category: 'Accessories', brand: 'Horology' },
    { title: 'Aeris Mechanical Keyboard', category: 'Computing', brand: 'KeyCraft' },
  ];

  assert.equal(filterItemsByQuery(items, 'aura').length, 1);
  assert.equal(filterItemsByQuery(items, 'audio').length, 1);
  assert.equal(filterItemsByQuery(items, 'horology').length, 1);
  assert.equal(filterItemsByQuery(items, 'nonexistent').length, 0);
  assert.equal(filterItemsByQuery(items, ' ').length, 3);
});
