import { CategoryItem, Product } from '../types/index.js';

export const CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Acoustics & Audio', slug: 'audio', itemCount: '142 products' },
  { id: 'cat-2', name: 'Mechanical Keyboards', slug: 'keyboards', itemCount: '88 products' },
  { id: 'cat-3', name: 'Precision Timepieces', slug: 'timepieces', itemCount: '64 products' },
  { id: 'cat-4', name: 'Studio & Workspace', slug: 'workspace', itemCount: '110 products' },
  { id: 'cat-5', name: 'Minimalist Leather', slug: 'leather', itemCount: '56 products' },
  { id: 'cat-6', name: 'Smart Living', slug: 'smart-home', itemCount: '95 products' },
];

export const FEATURED_PRODUCT: Product = {
  id: 'prod-featured-01',
  title: 'NEXORA Aura Pulse Pro',
  slug: 'nexora-aura-pulse-pro',
  tagline: 'Flagship Studio-Grade Wireless ANC Headphones',
  description:
    'Custom-tuned 45mm neodymium acoustic drivers with hybrid active noise cancellation, lossless Bluetooth 5.4 transmission, and 52 hours of uninterrupted high-fidelity audio.',
  category: 'Acoustics & Audio',
  categorySlug: 'audio',
  brand: 'NEXORA Lab & Lumina',
  pricePaise: 2499900,
  originalPricePaise: 3499900,
  stock: 8,
  sku: 'NEX-AP-OBS-01',
  image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  images: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
  ],
  tags: ['Flagship', 'Studio ANC', 'Lossless Audio'],
  specs: {
    'Driver Size': '45mm Neodymium',
    'Frequency Response': '10Hz - 45,000Hz',
    'Battery Life': '52 Hours (ANC On)',
    'Connectivity': 'Bluetooth 5.4 / USB-C Lossless',
  },
  seller: {
    id: 'seller-lumina',
    storeName: 'Lumina Soundworks Studio',
    isVerified: true,
    rating: 4.9,
    city: 'New Delhi',
  },
  rating: 4.9,
  reviewCount: 1420,
  variants: [
    {
      id: 'var-obsidian',
      name: 'Obsidian Black',
      colorName: 'Obsidian Black',
      colorHex: '#0c0f17',
      pricePaise: 2499900,
      originalPricePaise: 3499900,
      sku: 'NEX-AP-OBS-01',
      inventoryCount: 8,
    },
    {
      id: 'var-cyan',
      name: 'Aurora Cyan',
      colorName: 'Aurora Cyan',
      colorHex: '#06b6d4',
      pricePaise: 2599900,
      originalPricePaise: 3599900,
      sku: 'NEX-AP-CYA-02',
      inventoryCount: 14,
    },
    {
      id: 'var-silver',
      name: 'Platinum Silver',
      colorName: 'Platinum Silver',
      colorHex: '#e2e8f0',
      pricePaise: 2499900,
      originalPricePaise: 3499900,
      sku: 'NEX-AP-SLV-03',
      inventoryCount: 5,
    },
  ],
  highlights: [
    'Dual 45mm Titanium-Coated Drivers',
    'Up to -42dB Hybrid Active Noise Cancellation',
    '52-Hour Playback with Ultra-Fast Warp Charge',
    'Lossless LDAC & aptX HD Wireless Audio',
  ],
  badges: ['Marketplace Pick', 'Verified Seller', 'Limited Batch'],
  deliveryInfo: {
    freeDelivery: true,
    estimatedDays: 1,
  },
};

export const SEARCH_SUGGESTIONS = [
  { id: 's-1', title: 'Aura Pulse Pro ANC Headphones', category: 'Audio', price: '₹24,999' },
  { id: 's-2', title: 'Aeris 75% Mechanical Keyboard', category: 'Keyboards', price: '₹14,499' },
  { id: 's-3', title: 'Vanguard Chrono Automatic Watch', category: 'Timepieces', price: '₹38,500' },
  { id: 's-4', title: 'Artisan Full-Grain Desk Pad', category: 'Workspace', price: '₹4,299' },
  { id: 's-5', title: 'Lumina Studio Ambient Lightbar', category: 'Smart Living', price: '₹7,999' },
];
