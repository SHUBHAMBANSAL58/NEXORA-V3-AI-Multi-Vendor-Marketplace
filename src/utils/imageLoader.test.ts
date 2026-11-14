import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductImageCandidates, isSafeImageUrl } from './imageLoader';

test('isSafeImageUrl validates supported image paths and protocols', () => {
  assert.equal(isSafeImageUrl('/assets/products/vr_headset.jpg'), true);
  assert.equal(isSafeImageUrl('https://images.unsplash.com/photo-123'), true);
  assert.equal(isSafeImageUrl('http://localhost:3000/img.png'), true);
  assert.equal(isSafeImageUrl('data:image/png;base64,AAA'), true);

  assert.equal(isSafeImageUrl(''), false);
  assert.equal(isSafeImageUrl('   '), false);
  assert.equal(isSafeImageUrl(null), false);
  assert.equal(isSafeImageUrl(undefined), false);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
});

test('buildProductImageCandidates deduplicates and preserves primary-first order', () => {
  const candidates = buildProductImageCandidates(' /assets/main.jpg ', [
    '/assets/main.jpg',
    'https://cdn.example.com/alt-1.jpg',
    '',
    'javascript:void(0)',
    'https://cdn.example.com/alt-2.jpg',
    'https://cdn.example.com/alt-1.jpg',
  ]);

  assert.deepEqual(candidates, [
    '/assets/main.jpg',
    'https://cdn.example.com/alt-1.jpg',
    'https://cdn.example.com/alt-2.jpg',
  ]);
});

test('buildProductImageCandidates handles missing primary URL with valid gallery fallbacks', () => {
  const candidates = buildProductImageCandidates('', [
    undefined,
    'https://cdn.example.com/gallery-1.jpg',
  ]);
  assert.deepEqual(candidates, ['https://cdn.example.com/gallery-1.jpg']);
});
