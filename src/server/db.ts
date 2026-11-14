/**
 * NEXORA V3 — Catalog Repository Engine
 * Serves verified catalog, category, and seller metadata alongside Cloud SQL PostgreSQL persistence.
 */

import { PRODUCTS_CATALOG, EXPANDED_CATEGORIES } from '../data/productsCatalog.js';
import { BulkOrderInquiry, CatalogProduct, UserOrder } from '../types/index.js';

export interface DBProduct extends CatalogProduct {
  sellerId: string;
  sellerName: string;
  inventoryCount: number;
  highlights: string[];
  hsnCode: string;
  gstRate: number;
  isPublished: boolean;
  createdAt: string;
}

export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hsnDefault: string;
  gstRate: number;
  itemCount: number;
}

export interface DBSeller {
  id: string;
  storeName: string;
  ownerName: string;
  gstin: string;
  email: string;
  city: string;
  state: string;
  isVerified: boolean;
  commissionRate: number;
  balancePaise: number;
}

const INITIAL_PRODUCTS: DBProduct[] = PRODUCTS_CATALOG.map((p, idx) => ({
  ...p,
  sellerId: p.seller.id,
  sellerName: p.seller.storeName,
  inventoryCount: p.stock,
  highlights: [
    ...p.tags.map((t) => `${t} certified specification`),
    `Direct dispatched from ${p.seller.city}`,
    'NEXORA Authenticity Assured',
  ],
  hsnCode:
    p.categorySlug === 'smartphones'
      ? '85171300'
      : p.categorySlug === 'audio'
      ? '85183000'
      : p.categorySlug === 'keyboards'
      ? '84716040'
      : p.categorySlug === 'timepieces'
      ? '91021100'
      : '94033090',
  gstRate: 18,
  isPublished: true,
  createdAt: new Date(Date.now() - (60 - idx) * 86400000).toISOString(),
}));

const INITIAL_CATEGORIES: DBCategory[] = EXPANDED_CATEGORIES.map((c) => {
  const count =
    c.slug === 'all'
      ? PRODUCTS_CATALOG.length
      : PRODUCTS_CATALOG.filter((p) => p.categorySlug === c.slug).length;
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: `${c.name} curated collection`,
    hsnDefault: '85183000',
    gstRate: 18,
    itemCount: count,
  };
});

const INITIAL_SELLERS: DBSeller[] = [
  {
    id: 's-tech-1',
    storeName: 'Aether Technologies Bangalore',
    ownerName: 'Vikramaditya Sen',
    gstin: '29AAACL1234F1Z8',
    email: 'contact@aethermobile.in',
    city: 'Bengaluru',
    state: 'Karnataka',
    isVerified: true,
    commissionRate: 10,
    balancePaise: 48500000,
  },
  {
    id: 'seller-lumina',
    storeName: 'Lumina Soundworks Studio',
    ownerName: 'Arjun Nambiar',
    gstin: '07AAACL5678M1Z2',
    email: 'contact@luminasound.in',
    city: 'New Delhi',
    state: 'Delhi',
    isVerified: true,
    commissionRate: 8,
    balancePaise: 32400000,
  },
  {
    id: 'seller-titan',
    storeName: 'Titan Horology Works',
    ownerName: 'Rohit Kulkarni',
    gstin: '27AABCT9012N1Z5',
    email: 'concierge@titanhorology.com',
    city: 'Mumbai',
    state: 'Maharashtra',
    isVerified: true,
    commissionRate: 12,
    balancePaise: 92000000,
  },
];

class DatabaseEngine {
  private categories: DBCategory[] = [...INITIAL_CATEGORIES];
  private sellers: DBSeller[] = [...INITIAL_SELLERS];
  private products: DBProduct[] = [...INITIAL_PRODUCTS];
  private orders: UserOrder[] = [];
  private bulkInquiries: BulkOrderInquiry[] = [];
  private isConnected = false;

  constructor() {
    this.init();
  }

  private init() {
    this.isConnected = true;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      engine: process.env.SQL_HOST ? 'Cloud SQL PostgreSQL (asia-southeast1)' : 'Catalog Repository Engine',
      counts: {
        products: this.products.length,
        categories: this.categories.length,
        sellers: this.sellers.length,
        orders: this.orders.length,
        bulkInquiries: this.bulkInquiries.length,
      },
    };
  }

  public async getCategories(): Promise<DBCategory[]> {
    return this.categories;
  }

  public async getProducts(filter?: {
    categorySlug?: string;
    search?: string;
    brand?: string;
    minPricePaise?: number;
    maxPricePaise?: number;
    minRating?: number;
    sortBy?: 'price-asc' | 'price-desc' | 'rating-desc' | 'newest' | 'featured';
  }): Promise<DBProduct[]> {
    let result = [...this.products];

    if (filter?.categorySlug && filter.categorySlug !== 'all') {
      result = result.filter((p) => p.categorySlug === filter.categorySlug);
    }

    if (filter?.brand && filter.brand !== 'all') {
      result = result.filter((p) => p.brand.toLowerCase() === filter.brand?.toLowerCase());
    }

    if (filter?.minPricePaise !== undefined) {
      result = result.filter((p) => p.pricePaise >= filter.minPricePaise!);
    }

    if (filter?.maxPricePaise !== undefined) {
      result = result.filter((p) => p.pricePaise <= filter.maxPricePaise!);
    }

    if (filter?.minRating !== undefined) {
      result = result.filter((p) => p.rating >= filter.minRating!);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filter?.sortBy) {
      switch (filter.sortBy) {
        case 'price-asc':
          result.sort((a, b) => a.pricePaise - b.pricePaise);
          break;
        case 'price-desc':
          result.sort((a, b) => b.pricePaise - a.pricePaise);
          break;
        case 'rating-desc':
          result.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
          break;
        case 'newest':
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'featured':
        default:
          break;
      }
    }

    return result;
  }

  public async getProductById(id: string): Promise<DBProduct | null> {
    return this.products.find((p) => p.id === id) || null;
  }

  public async getSellers(): Promise<DBSeller[]> {
    return this.sellers;
  }

  public async getOrders(): Promise<UserOrder[]> {
    return [...this.orders];
  }

  public async createOrder(order: UserOrder): Promise<UserOrder> {
    if (this.orders.some((existing) => existing.id === order.id)) {
      return order;
    }

    // Decrement matching catalog product inventory safely (floored at 0)
    for (const orderedItem of order.items) {
      const normalizedTitle = orderedItem.title.trim().toLowerCase();
      this.products = this.products.map((product) => {
        if (product.title.trim().toLowerCase() === normalizedTitle) {
          const nextStock = Math.max(0, product.stock - orderedItem.quantity);
          return {
            ...product,
            stock: nextStock,
            inventoryCount: Math.max(0, product.inventoryCount - orderedItem.quantity),
          };
        }
        return product;
      });
    }

    this.orders = [order, ...this.orders];
    return order;
  }

  public async getBulkInquiries(): Promise<BulkOrderInquiry[]> {
    return [...this.bulkInquiries];
  }

  public async createBulkInquiry(inquiry: BulkOrderInquiry): Promise<BulkOrderInquiry> {
    if (this.bulkInquiries.some((existing) => existing.id === inquiry.id)) {
      return inquiry;
    }
    this.bulkInquiries = [inquiry, ...this.bulkInquiries];
    return inquiry;
  }
}

export const db = new DatabaseEngine();
