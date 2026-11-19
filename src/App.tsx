import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Navbar } from './components/Navbar.js';
import { Hero } from './components/Hero.js';
import { TrustBar } from './components/TrustBar.js';
import { FeaturedGrid } from './components/FeaturedGrid.js';
import { CartDrawer, CartLineItem } from './components/CartDrawer.js';
import { NovaModal } from './components/NovaModal.js';
import { Footer } from './components/Footer.js';
import { UserAccount, DEMO_USERS } from './components/UserAccount.js';
import { QuickViewModal } from './components/QuickViewModal.js';
import { WishlistDrawer } from './components/WishlistDrawer.js';
import { RazorpayModal } from './components/RazorpayModal.js';
import { ProductCompareModal } from './components/ProductCompareModal.js';
import { CompareFloatingDock } from './components/CompareFloatingDock.js';
import { PriceAlertModal } from './components/PriceAlertModal.js';
import {
  ProductVariant,
  CatalogProduct,
  CatalogProductWithMeta,
  Product,
  UserProfile,
  UserAddress,
  UserOrder,
  UserReview,
  PriceAlert,
  PromoDiscount,
  BulkOrderInquiry,
  SellerProfile,
  ManagedCategory,
  AdminAuditLog,
  OrderStage,
  CategoryItem,
} from './types/index.js';
import { FEATURED_PRODUCT } from './data/mockData.js';
import { PRODUCTS_CATALOG, EXPANDED_CATEGORIES } from './data/productsCatalog.js';
import { formatCurrencyINR } from './utils/formatters.js';
import {
  calculateCartTotals,
  calculateCategoryProductCounts,
  applyOrderWalletAndPoints,
  VALID_PROMO_CODES,
  getProductHsnCode,
  canCancelOrder,
} from './utils/commerceFeatures.js';
import { useAuth } from './contexts/AuthContext.js';
import {
  addWishlistItemToFirestore,
  removeWishlistItemFromFirestore,
  savePriceAlertToFirestore,
  subscribeUserWishlist,
  syncUserRecordsToFirestore,
} from './services/firestoreSync.js';

const CommandCenter = React.lazy(() =>
  import('./components/CommandCenter.js').then((m) => ({ default: m.CommandCenter }))
);
const SellerDashboardModal = React.lazy(() =>
  import('./components/SellerDashboardModal.js').then((m) => ({ default: m.SellerDashboardModal }))
);
const AdminDashboardModal = React.lazy(() =>
  import('./components/AdminDashboardModal.js').then((m) => ({ default: m.AdminDashboardModal }))
);

const INITIAL_SELLERS: SellerProfile[] = [
  {
    id: 's-tech-1',
    storeName: 'Aether Technologies Bangalore',
    ownerName: 'Vikramaditya Sen',
    gstin: '29AAACL1234F1Z8',
    email: 'contact@aethermobile.in',
    city: 'Bengaluru',
    state: 'Karnataka',
    isVerified: true,
    status: 'approved',
    commissionRate: 10,
    balancePaise: 48500000,
  },
  {
    id: 's-tech-2',
    storeName: 'Vortex Studio Gurgaon',
    ownerName: 'Rohan Malhotra',
    gstin: '06AABCV7201L1Z9',
    email: 'ops@vortexstudio.in',
    city: 'Gurugram',
    state: 'Haryana',
    isVerified: true,
    status: 'approved',
    commissionRate: 9,
    balancePaise: 27400000,
  },
  {
    id: 's-tech-3',
    storeName: 'Digital Craft Hub Mumbai',
    ownerName: 'Meera Deshmukh',
    gstin: '27AABCD3398K1Z1',
    email: 'craft@digitalhub.in',
    city: 'Mumbai',
    state: 'Maharashtra',
    isVerified: true,
    status: 'approved',
    commissionRate: 11,
    balancePaise: 19800000,
  },
  {
    id: 's-tech-4',
    storeName: 'Kala Studio Systems Hyderabad',
    ownerName: 'Karthik Reddy',
    gstin: '36AABCK4812P1Z4',
    email: 'studio@kalasystems.in',
    city: 'Hyderabad',
    state: 'Telangana',
    isVerified: true,
    status: 'approved',
    commissionRate: 10,
    balancePaise: 31200000,
  },
  {
    id: 's-audio-1',
    storeName: 'Lumina Soundworks Studio',
    ownerName: 'Arjun Nambiar',
    gstin: '07AAACL5678M1Z2',
    email: 'contact@luminasound.in',
    city: 'New Delhi',
    state: 'Delhi',
    isVerified: true,
    status: 'approved',
    commissionRate: 8,
    balancePaise: 32400000,
  },
  {
    id: 's-audio-2',
    storeName: 'Acoustic Mastery Pune',
    ownerName: 'Ananya Hegde',
    gstin: '27AABCA9921R1Z3',
    email: 'labs@acoustica.in',
    city: 'Pune',
    state: 'Maharashtra',
    isVerified: true,
    status: 'approved',
    commissionRate: 9,
    balancePaise: 24500000,
  },
  {
    id: 's-audio-3',
    storeName: 'Vriksh Woodcraft Mysore',
    ownerName: 'Harsha Gowda',
    gstin: '29AABCV3104G1Z8',
    email: 'atelier@vrikshwood.in',
    city: 'Mysuru',
    state: 'Karnataka',
    isVerified: true,
    status: 'approved',
    commissionRate: 9,
    balancePaise: 14200000,
  },
  {
    id: 's-kb-1',
    storeName: 'KeyCraft Studio Bangalore',
    ownerName: 'Devansh Nair',
    gstin: '29AABCK7741M1Z2',
    email: 'builds@keycraft.in',
    city: 'Bengaluru',
    state: 'Karnataka',
    isVerified: true,
    status: 'approved',
    commissionRate: 10,
    balancePaise: 18600000,
  },
  {
    id: 's-kb-2',
    storeName: 'Kala Keyworks Chennai',
    ownerName: 'Sundar Subramanian',
    gstin: '33AABCK8820D1Z6',
    email: 'desk@kalakeyworks.in',
    city: 'Chennai',
    state: 'Tamil Nadu',
    isVerified: true,
    status: 'approved',
    commissionRate: 10,
    balancePaise: 15900000,
  },
  {
    id: 's-watch-1',
    storeName: 'Titan Horology Works Mumbai',
    ownerName: 'Rohit Kulkarni',
    gstin: '27AABCT9012N1Z5',
    email: 'concierge@titanhorology.com',
    city: 'Mumbai',
    state: 'Maharashtra',
    isVerified: true,
    status: 'approved',
    commissionRate: 12,
    balancePaise: 92000000,
  },
  {
    id: 's-watch-2',
    storeName: 'Kavach Horology Jaipur',
    ownerName: 'Yuvraj Rathore',
    gstin: '08AABCK4429E1Z1',
    email: 'horology@kavach.in',
    city: 'Jaipur',
    state: 'Rajasthan',
    isVerified: true,
    status: 'approved',
    commissionRate: 11,
    balancePaise: 26300000,
  },
  {
    id: 's-work-1',
    storeName: 'Kavach Leathercraft Jaipur',
    ownerName: 'Maheshwari Singh',
    gstin: '08AABCK9102R1Z3',
    email: 'studio@kavachleather.in',
    city: 'Jaipur',
    state: 'Rajasthan',
    isVerified: true,
    status: 'approved',
    commissionRate: 10,
    balancePaise: 17400000,
  },
  {
    id: 's-work-2',
    storeName: 'ErgoForm Living Pune',
    ownerName: 'Pranav Joshi',
    gstin: '27AABCE3190H1Z7',
    email: 'ergonomics@ergoform.in',
    city: 'Pune',
    state: 'Maharashtra',
    isVerified: true,
    status: 'approved',
    commissionRate: 10,
    balancePaise: 22900000,
  },
];

const INITIAL_MANAGED_CATEGORIES: ManagedCategory[] = EXPANDED_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  description: `${c.name} curated collection`,
  hsnDefault: getProductHsnCode(c.slug),
  gstRate: 18,
  itemCount:
    c.slug === 'all'
      ? PRODUCTS_CATALOG.length
      : PRODUCTS_CATALOG.filter((p) => p.categorySlug === c.slug).length,
}));

const INITIAL_CATALOG_PRODUCTS: CatalogProductWithMeta[] = PRODUCTS_CATALOG.map((p) => ({
  ...p,
  hsnCode: getProductHsnCode(p.categorySlug),
  isPublished: true,
}));

const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'aud-boot-01',
    actorEmail: 'bansalshubham662@gmail.com',
    actorRole: 'system',
    action: 'PLATFORM_INITIALIZED',
    targetType: 'category',
    targetId: 'marketplace-v3',
    details: 'NEXORA V3 multi-vendor marketplace governance bootstrapped.',
    timestamp: new Date().toISOString(),
  },
];

const INITIAL_REVIEWS: UserReview[] = [
  {
    id: 'rev-01',
    productId: 'prod-tech-01',
    author: 'Aditya Sharma',
    rating: 5,
    date: '02 Nov 2026',
    title: 'Absolute masterclass in acoustic separation and ANC',
    comment:
      'The titanium drivers deliver an expansive holographic soundstage. The spatial audio tracking with Apple Silicon & Android LDAC is flawless. Worth every rupee.',
    verifiedPurchase: true,
    helpfulCount: 24,
  },
  {
    id: 'rev-02',
    productId: 'prod-tech-01',
    author: 'Meera Nambiar',
    rating: 5,
    date: '28 Oct 2026',
    title: 'Comfortable for 10-hour studio mastering sessions',
    comment:
      'Memory foam ear cushions wrapped in soft alcantara feel completely weightless. 60-hour battery life with fast charging is incredible.',
    verifiedPurchase: true,
    helpfulCount: 18,
  },
  {
    id: 'rev-03',
    productId: 'prod-kb-01',
    author: 'Karan Malhotra',
    rating: 5,
    date: '05 Nov 2026',
    title: 'The gasket dampening creates pure creamy thock sound',
    comment:
      'Pre-lubed linear switches and CNC anodized aluminum case. The rotary brass knob has satisfying indexed tactile resistance.',
    verifiedPurchase: true,
    helpfulCount: 15,
  },
  {
    id: 'rev-04',
    productId: 'prod-audio-01',
    author: 'Rohan Varma',
    rating: 5,
    date: '01 Nov 2026',
    title: 'Industry standard noise cancellation for frequent flyers',
    comment:
      'Dual processors cancel aircraft cabin rumble with uncanny silence. Multipoint connectivity between MacBook Pro and Pixel 9 is instant.',
    verifiedPurchase: true,
    helpfulCount: 31,
  },
];

export default function App() {
  const { firebaseUser, authReady, refreshToken } = useAuth();
  const [viewMode, setViewMode] = useState<'storefront' | 'command-center'>('storefront');

  // Dynamic Multi-Vendor Marketplace State
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductWithMeta[]>(INITIAL_CATALOG_PRODUCTS);
  const [sellers, setSellers] = useState<SellerProfile[]>(INITIAL_SELLERS);
  const [managedCategories, setManagedCategories] = useState<ManagedCategory[]>(INITIAL_MANAGED_CATEGORIES);
  const [coupons, setCoupons] = useState<PromoDiscount[]>(() =>
    Object.values(VALID_PROMO_CODES).map((c) => ({ ...c, isActive: true, usageCount: 0 }))
  );
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(INITIAL_AUDIT_LOGS);

  // Portal Modals State
  const [isSellerPortalOpen, setIsSellerPortalOpen] = useState<boolean>(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState<boolean>(false);

  // Shopping Cart & User State (persisted safely in localStorage)
  const [cartItems, setCartItems] = useState<CartLineItem[]>(() => {
    try {
      const saved = window.localStorage.getItem('nexora_cart_items');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as CartLineItem[];
      }
    } catch {
      // ignore localStorage errors
    }
    return [
      {
        variant: {
          id: 'var-obsidian',
          name: 'Obsidian Black',
          colorName: 'Obsidian Black',
          colorHex: '#0c0f17',
          pricePaise: 2499900,
          sku: 'NEX-AP-OBS-01',
          inventoryCount: 8,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        },
        quantity: 1,
        productTitle: 'NEXORA Aura Pulse Pro Flagship Headphones',
      },
    ];
  });

  // Wishlist State (persisted safely in localStorage)
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(() => {
    try {
      const saved = window.localStorage.getItem('nexora_wishlist_ids');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((x): x is string => typeof x === 'string'));
        }
      }
    } catch {
      // ignore localStorage errors
    }
    return new Set(['prod-tech-01', 'prod-audio-01', 'prod-kb-01', 'prod-watch-01']);
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);

  // User Account State
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS.customer);
  const [isUserAccountOpen, setIsUserAccountOpen] = useState<boolean>(false);
  const [userAccountTab, setUserAccountTab] = useState<'profile' | 'addresses' | 'orders' | 'login' | 'register'>('profile');

  // Comparison State (up to 3 products, persisted in localStorage)
  const [comparedIds, setComparedIds] = useState<Set<string>>(() => {
    try {
      const saved = window.localStorage.getItem('nexora_compared_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((x): x is string => typeof x === 'string').slice(0, 3));
        }
      }
    } catch {
      // ignore localStorage errors
    }
    return new Set();
  });
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  // Hydrate public marketplace catalog, categories, sellers, active coupons, and reviews on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, catRes, selRes, coupRes, revRes] = await Promise.all([
          fetch('/api/v1/products?limit=200'),
          fetch('/api/v1/categories'),
          fetch('/api/v1/sellers'),
          fetch('/api/v1/coupons/active'),
          fetch('/api/v1/reviews'),
        ]);
        if (cancelled) return;

        if (prodRes.ok) {
          const json = await prodRes.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setCatalogProducts(json.data);
          }
        }
        if (catRes.ok) {
          const json = await catRes.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setManagedCategories(json.data);
          }
        }
        if (selRes.ok) {
          const json = await selRes.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setSellers(json.data);
          }
        }
        if (coupRes.ok) {
          const json = await coupRes.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setCoupons(json.data);
          }
        }
        if (revRes.ok) {
          const json = await revRes.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setReviews(json.data);
          }
        }
      } catch {
        // graceful offline resilience with seeded local catalog
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('nexora_compared_ids', JSON.stringify(Array.from(comparedIds)));
    } catch {
      // ignore localStorage errors
    }
  }, [comparedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem('nexora_cart_items', JSON.stringify(cartItems));
    } catch {
      // ignore localStorage errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem('nexora_wishlist_ids', JSON.stringify(Array.from(wishlistedIds)));
    } catch {
      // ignore localStorage errors
    }
  }, [wishlistedIds]);

  // Hydrate authenticated user profile, orders, bulk inquiries, and Firestore profile/wishlist
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    let cancelled = false;
    let unsubscribeWishlist: (() => void) | undefined;

    setCurrentUser((prev) => ({
      ...prev,
      id: firebaseUser.uid,
      name: firebaseUser.displayName || prev.name,
      email: firebaseUser.email || prev.email,
      avatarUrl: firebaseUser.photoURL || prev.avatarUrl,
    }));

    (async () => {
      try {
        const token = await refreshToken();
        if (!token || cancelled) return;

        const headers = { Authorization: `Bearer ${token}` };
        const [meRes, ordersRes, inquiriesRes] = await Promise.all([
          fetch('/api/v1/auth/me', { headers }),
          fetch('/api/v1/orders', { headers }),
          fetch('/api/v1/bulk-inquiries', { headers }),
        ]);
        const meJson = meRes.ok ? await meRes.json() : null;
        const ordersJson = ordersRes.ok ? await ordersRes.json() : null;
        const inquiriesJson = inquiriesRes.ok ? await inquiriesRes.json() : null;
        if (cancelled) return;

        if (meJson?.success && meJson.data) {
          setCurrentUser((prev) => ({
            ...prev,
            role: meJson.data.role || prev.role,
            loyaltyPoints: meJson.data.loyaltyPoints ?? prev.loyaltyPoints,
            tier: meJson.data.tier ?? prev.tier,
            walletBalancePaise: meJson.data.walletBalancePaise ?? prev.walletBalancePaise,
          }));

          if (meJson.data.role === 'admin') {
            fetch('/api/v1/admin/overview', { headers })
              .then((r) => (r.ok ? r.json() : null))
              .then((ov) => {
                if (!cancelled && ov?.success && ov.data) {
                  if (Array.isArray(ov.data.sellers)) setSellers(ov.data.sellers);
                  if (Array.isArray(ov.data.auditLogs)) setAuditLogs(ov.data.auditLogs);
                  if (Array.isArray(ov.data.coupons)) setCoupons(ov.data.coupons);
                }
              })
              .catch(() => {});
          }
        }

        const serverOrders = Array.isArray(ordersJson?.data)
          ? (ordersJson.data as UserOrder[])
          : [];
        const serverInquiries = Array.isArray(inquiriesJson?.data)
          ? (inquiriesJson.data as BulkOrderInquiry[])
          : [];

        if (serverOrders.length > 0 || serverInquiries.length > 0) {
          setCurrentUser((prev) => {
            const existingOrderIds = new Set(prev.orders.map((o) => o.id));
            const mergedOrders = [
              ...serverOrders.filter((o) => !existingOrderIds.has(o.id)),
              ...prev.orders,
            ];

            const prevInquiries = prev.bulkInquiries || [];
            const existingInquiryIds = new Set(prevInquiries.map((inq) => inq.id));
            const mergedInquiries = [
              ...serverInquiries.filter((inq) => !existingInquiryIds.has(inq.id)),
              ...prevInquiries,
            ];

            return {
              ...prev,
              orders: mergedOrders,
              bulkInquiries: mergedInquiries,
            };
          });
        }

        if (firebaseUser.emailVerified) {
          await syncUserRecordsToFirestore({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || currentUser.name,
            email: firebaseUser.email || currentUser.email,
            role: currentUser.role,
            tier: currentUser.tier,
            loyaltyPoints: currentUser.loyaltyPoints,
            phone: currentUser.phone,
            defaultPinCode: currentUser.addresses.find((a) => a.isDefault)?.pinCode,
          }).catch(() => {});

          unsubscribeWishlist = subscribeUserWishlist(firebaseUser.uid, (firestoreIds) => {
            if (!cancelled && firestoreIds.length > 0) {
              setWishlistedIds((prev) => new Set([...prev, ...firestoreIds]));
            }
          });
        }
      } catch {
        // non-blocking offline resilience
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribeWishlist) unsubscribeWishlist();
    };
  }, [authReady, firebaseUser?.uid]);

  // Price Drop Alert State
  const [priceAlertProduct, setPriceAlertProduct] = useState<CatalogProduct | null>(null);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState<boolean>(false);

  // Reviews State
  const [reviews, setReviews] = useState<UserReview[]>(INITIAL_REVIEWS);

  // Promo Voucher State
  const [appliedPromo, setAppliedPromo] = useState<PromoDiscount | null>(null);

  // Recently Viewed State
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([
    'prod-tech-01',
    'prod-audio-01',
    'prod-kb-01',
  ]);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState<boolean>(false);
  const [isNovaOpen, setIsNovaOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogProduct | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);

  // Search & Navigation Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'top-sellers' | 'new-releases' | 'studio-deals'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const couponMap = useMemo(() => {
    const map: Record<string, PromoDiscount> = {};
    coupons.forEach((c) => {
      map[c.code.toUpperCase()] = c;
    });
    return map;
  }, [coupons]);

  const managedCategoriesWithCounts = useMemo(() => {
    const published = catalogProducts.filter((p) => p.isPublished !== false);
    const counts = calculateCategoryProductCounts(published);
    return managedCategories.map((c) => ({
      ...c,
      itemCount: c.slug === 'all' ? counts.all || 0 : counts[c.slug] || 0,
    }));
  }, [managedCategories, catalogProducts]);

  const categoryItemsForGrid: CategoryItem[] = useMemo(
    () =>
      managedCategoriesWithCounts.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        itemCount: `${c.itemCount} products`,
      })),
    [managedCategoriesWithCounts]
  );

  // Compute total quantity in cart
  const cartTotals = calculateCartTotals(cartItems, appliedPromo);
  const cartCount = cartTotals.totalQuantity;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const appendLocalAudit = (entry: Omit<AdminAuditLog, 'id' | 'timestamp'>) => {
    setAuditLogs((prev) => [
      {
        ...entry,
        id: `aud-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!firebaseUser) return {};
    const token = await refreshToken().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Comparison Handlers
  const handleToggleCompare = (product: CatalogProduct) => {
    setComparedIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
        showToast(`Removed ${product.title} from comparison`);
      } else {
        if (next.size >= 3) {
          showToast('You can compare a maximum of 3 products at a time');
          return prev;
        }
        next.add(product.id);
        showToast(`Added ${product.title} to comparison (${next.size}/3)`);
      }
      return next;
    });
  };

  const handleRemoveCompare = (productId: string) => {
    setComparedIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleClearCompare = () => {
    setComparedIds(new Set());
    setIsCompareOpen(false);
    showToast('Comparison cleared');
  };

  const comparedProducts = catalogProducts.filter((p) => comparedIds.has(p.id));

  // Price Drop Alert Handlers
  const handleOpenPriceAlert = (product: CatalogProduct) => {
    setPriceAlertProduct(product);
    setIsPriceAlertOpen(true);
  };

  const handleSavePriceAlert = (alert: PriceAlert) => {
    if (firebaseUser && firebaseUser.emailVerified) {
      savePriceAlertToFirestore(firebaseUser.uid, alert).catch(() => {});
    }
    showToast(`Price alert confirmed for ${alert.productTitle} at ${formatCurrencyINR(alert.targetPricePaise)}!`);
  };

  const handleSimulatePriceDrop = (product: CatalogProduct, alertPricePaise: number) => {
    showToast(
      `Live Price Drop Alert: ${product.title} dropped to ${formatCurrencyINR(alertPricePaise)} (Target reached!)`
    );
  };

  // Review Submission Handler
  const handleSubmitReview = (newRev: Omit<UserReview, 'id' | 'date' | 'helpfulCount'>) => {
    const fullReview: UserReview = {
      ...newRev,
      id: `rev-${Date.now()}`,
      date: 'Today',
      helpfulCount: 0,
    };
    setReviews((prev) => [fullReview, ...prev]);

    fetch('/api/v1/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRev),
    }).catch(() => {});

    showToast(`Thank you ${newRev.author}! Your verified review has been published.`);
  };

  // Add Hero product variant to Cart
  const handleAddToCart = (variant: ProductVariant) => {
    const maxStock = variant.inventoryCount ?? 99;
    if (maxStock <= 0) {
      showToast(`${FEATURED_PRODUCT.title} (${variant.name}) is currently out of stock`);
      return;
    }
    const existing = cartItems.find((item) => item.variant.id === variant.id);
    if (existing && existing.quantity >= maxStock) {
      showToast(`Maximum available stock (${maxStock}) already in your bag`);
      return;
    }

    setCartItems((prev) => {
      const current = prev.find((item) => item.variant.id === variant.id);
      if (current) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: Math.min(maxStock, item.quantity + 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          variant: {
            ...variant,
            image:
              variant.image ||
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          },
          quantity: 1,
          productTitle: FEATURED_PRODUCT.title,
        },
      ];
    });
    showToast(`Added ${FEATURED_PRODUCT.title} (${variant.name}) to your bag`);
  };

  // Add Catalog Product to Cart
  const handleQuickAdd = (product: CatalogProduct) => {
    if (product.stock <= 0) {
      showToast(`${product.title} is currently out of stock`);
      return;
    }
    const variant: ProductVariant = {
      id: `var-${product.id}`,
      name: product.brand,
      colorName: 'Standard Edition',
      colorHex: '#06b6d4',
      pricePaise: product.pricePaise,
      sku: product.sku,
      inventoryCount: product.stock,
      image: product.image,
    };

    const existing = cartItems.find((item) => item.variant.id === variant.id);
    if (existing && existing.quantity >= product.stock) {
      showToast(`Maximum available stock (${product.stock}) for ${product.title} is already in your bag`);
      return;
    }

    setCartItems((prev) => {
      const current = prev.find((item) => item.variant.id === variant.id);
      if (current) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          variant,
          quantity: 1,
          productTitle: product.title,
        },
      ];
    });
    showToast(`Added ${product.title} to your bag`);
  };

  // Add from Quick View Modal with quantity
  const handleAddFromQuickView = (product: CatalogProduct, quantity: number) => {
    if (product.stock <= 0) {
      showToast(`${product.title} is currently out of stock`);
      return;
    }
    const variant: ProductVariant = {
      id: `var-${product.id}`,
      name: product.brand,
      colorName: 'Standard Edition',
      colorHex: '#06b6d4',
      pricePaise: product.pricePaise,
      sku: product.sku,
      inventoryCount: product.stock,
      image: product.image,
    };

    const existing = cartItems.find((item) => item.variant.id === variant.id);
    const currentQty = existing?.quantity || 0;
    const allowedAdd = Math.max(0, Math.min(quantity, product.stock - currentQty));
    if (allowedAdd <= 0) {
      showToast(`Maximum available stock (${product.stock}) already in your bag`);
      return;
    }

    setCartItems((prev) => {
      const current = prev.find((item) => item.variant.id === variant.id);
      if (current) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + allowedAdd) }
            : item
        );
      }
      return [
        ...prev,
        {
          variant,
          quantity: allowedAdd,
          productTitle: product.title,
        },
      ];
    });
    showToast(`Added ${allowedAdd} × ${product.title} to your bag`);
  };

  // Toggle Wishlist status for any product (maps featured spotlight ID to catalog ID)
  const handleToggleWishlist = (product: CatalogProduct | Product) => {
    const normalizedId = product.id === 'prod-featured-01' ? 'prod-tech-01' : product.id;
    const isRemoving = wishlistedIds.has(normalizedId);

    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedId)) {
        next.delete(normalizedId);
        showToast(`Removed ${product.title} from wishlist`);
      } else {
        next.add(normalizedId);
        showToast(`Saved ${product.title} to your wishlist`);
      }
      return next;
    });

    if (firebaseUser && firebaseUser.emailVerified) {
      if (isRemoving) {
        removeWishlistItemFromFirestore(firebaseUser.uid, normalizedId).catch(() => {});
      } else {
        addWishlistItemToFirestore(firebaseUser.uid, {
          id: normalizedId,
          title: product.title,
          pricePaise: product.pricePaise,
        }).catch(() => {});
      }
    }
  };

  const handleClearWishlist = () => {
    const currentIds = Array.from(wishlistedIds);
    setWishlistedIds(new Set());
    if (firebaseUser && firebaseUser.emailVerified) {
      currentIds.forEach((id) => {
        removeWishlistItemFromFirestore(firebaseUser.uid, id).catch(() => {});
      });
    }
    showToast('Wishlist cleared');
  };

  const handleOpenQuickView = (product: CatalogProduct) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);

    // Track in recently viewed
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== product.id);
      return [product.id, ...filtered].slice(0, 5);
    });
  };

  const handleUpdateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(variantId);
      return;
    }
    const targetItem = cartItems.find((item) => item.variant.id === variantId);
    const maxStock = targetItem?.variant.inventoryCount;
    const clamped =
      typeof maxStock === 'number' && maxStock > 0
        ? Math.min(quantity, maxStock)
        : quantity;
    if (typeof maxStock === 'number' && maxStock > 0 && quantity > maxStock) {
      showToast(`Maximum available stock (${maxStock}) reached`);
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.variant.id === variantId ? { ...item, quantity: clamped } : item
      )
    );
  };

  const handleRemoveItem = (variantId: string) => {
    setCartItems((prev) => prev.filter((item) => item.variant.id !== variantId));
    showToast('Item removed from shopping bag');
  };

  // Shopping Cart calculations via pure commerce helper
  const { subtotalPaise, shippingPaise, totalPaise } = cartTotals;

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    setIsRazorpayOpen(true);
  };

  const handleBulkInquirySubmit = (inquiry: BulkOrderInquiry) => {
    setCurrentUser((prev) => ({
      ...prev,
      bulkInquiries: [inquiry, ...(prev.bulkInquiries || [])],
    }));

    if (firebaseUser) {
      refreshToken()
        .then((token) => {
          if (!token) return;
          return fetch('/api/v1/bulk-inquiries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(inquiry),
          });
        })
        .catch(() => {});
    }

    showToast(`Bulk inquiry ${inquiry.id} sent to ${inquiry.sellerStoreName}!`);
  };

  const handleUpdateUserWallet = (newBalancePaise: number) => {
    setCurrentUser((prev) => ({
      ...prev,
      walletBalancePaise: newBalancePaise,
    }));
  };

  const handlePaymentSuccess = (paymentInfo: {
    paymentId: string;
    method: string;
    deliveryAddress: UserAddress;
    preferredDeliveryDate?: string;
    orderNotes?: string;
    isGiftReceipt?: boolean;
    giftMessage?: string;
    walletDeductionPaise?: number;
    pointsRedeemed?: number;
  }) => {
    if (cartItems.length === 0) return;

    const newOrder: UserOrder = {
      id: `NEX-ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      itemsCount: cartItems.length,
      totalPaise,
      status: 'Processing',
      trackingStage: 'Processing',
      courierPartner: 'BlueDart Express Air',
      trackingNumber: `BLD-${Math.floor(10000000 + Math.random() * 90000000)}`,
      estimatedDeliveryDate: paymentInfo.preferredDeliveryDate || 'Tomorrow by 8:00 PM',
      deliveryAddress: paymentInfo.deliveryAddress,
      preferredDeliveryDate: paymentInfo.preferredDeliveryDate,
      orderNotes: paymentInfo.orderNotes,
      isGiftReceipt: paymentInfo.isGiftReceipt,
      giftMessage: paymentInfo.giftMessage,
      promoCode: appliedPromo?.code,
      discountPaise: cartTotals.discountPaise,
      paymentMode: 'sandbox-demo',
      paymentMethod: `${paymentInfo.method} · Ref #${paymentInfo.paymentId}`,
      items: cartItems.map((item) => ({
        title: item.productTitle,
        image: item.variant.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        pricePaise: item.variant.pricePaise,
        quantity: item.quantity,
      })),
    };

    const outcome = applyOrderWalletAndPoints({
      currentWalletPaise: currentUser.walletBalancePaise ?? 500000,
      currentPoints: currentUser.loyaltyPoints || 0,
      orderTotalPaise: totalPaise,
      walletDeductionPaise: paymentInfo.walletDeductionPaise,
      pointsRedeemed: paymentInfo.pointsRedeemed,
    });

    setCurrentUser((prev) => ({
      ...prev,
      loyaltyPoints: outcome.nextPoints,
      tier: outcome.nextTier,
      walletBalancePaise: outcome.nextWalletPaise,
      orders: [newOrder, ...prev.orders],
    }));

    // Deduct stock in storefront state and update coupon usage count
    setCatalogProducts((prev) =>
      prev.map((prod) => {
        const matchedQty = cartItems
          .filter((ci) => ci.productTitle.trim().toLowerCase() === prod.title.trim().toLowerCase())
          .reduce((sum, ci) => sum + ci.quantity, 0);
        if (matchedQty <= 0) return prod;
        return { ...prod, stock: Math.max(0, prod.stock - matchedQty) };
      })
    );

    if (appliedPromo) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.code.toUpperCase() === appliedPromo.code.toUpperCase()
            ? { ...c, usageCount: (c.usageCount || 0) + 1 }
            : c
        )
      );
    }

    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'ORDER_CREATED',
      targetType: 'order',
      targetId: newOrder.id,
      details: `Order placed for ${formatCurrencyINR(totalPaise)} (${paymentInfo.deliveryAddress.city}, ${paymentInfo.deliveryAddress.pinCode})`,
    });

    if (firebaseUser) {
      refreshToken()
        .then(async (token) => {
          if (!token) return;
          const resp = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...newOrder,
              walletDeductionPaise: paymentInfo.walletDeductionPaise,
              pointsRedeemed: paymentInfo.pointsRedeemed,
            }),
          });
          if (resp.ok) {
            const payload = await resp.json();
            if (payload?.account) {
              setCurrentUser((prev) => ({
                ...prev,
                loyaltyPoints: payload.account.loyaltyPoints ?? prev.loyaltyPoints,
                tier: payload.account.tier ?? prev.tier,
                walletBalancePaise: payload.account.walletBalancePaise ?? prev.walletBalancePaise,
              }));
            }
          }
        })
        .catch(() => {});
    }

    setCartItems([]);
    setAppliedPromo(null);
    setIsRazorpayOpen(false);
    showToast(
      `Order ${newOrder.id} confirmed! Scheduled for ${newOrder.preferredDeliveryDate || newOrder.estimatedDeliveryDate}.`
    );
  };

  // Customer Order Cancellation (with stock restoration & backend sync)
  const handleCancelOrder = (orderId: string, reason = 'Cancelled by customer') => {
    const targetOrder = currentUser.orders.find((o) => o.id === orderId);
    if (!targetOrder || !canCancelOrder(targetOrder)) return;

    const cancelledAt = new Date().toISOString();
    setCurrentUser((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Cancelled',
              cancelledAt,
              cancellationReason: reason,
            }
          : o
      ),
    }));

    // Restore stock for cancelled items
    setCatalogProducts((prev) =>
      prev.map((prod) => {
        const restoredQty = targetOrder.items
          .filter((it) => it.title.trim().toLowerCase() === prod.title.trim().toLowerCase())
          .reduce((sum, it) => sum + it.quantity, 0);
        if (restoredQty <= 0) return prod;
        return { ...prod, stock: prod.stock + restoredQty };
      })
    );

    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'ORDER_CANCELLED',
      targetType: 'order',
      targetId: orderId,
      details: `${reason} — inventory restored`,
    });

    if (firebaseUser) {
      getAuthHeaders()
        .then((headers) => {
          if (!headers.Authorization) return;
          return fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ reason }),
          });
        })
        .catch(() => {});
    }

    showToast(`Order ${orderId} cancelled and inventory restored.`);
  };

  // Multi-Vendor Seller & Admin State Handlers
  const handleCreateSellerProduct = (product: CatalogProductWithMeta) => {
    setCatalogProducts((prev) => [product, ...prev]);
    setManagedCategories((prev) =>
      prev.map((c) => {
        if (c.slug === 'all' || c.slug === product.categorySlug) {
          return { ...c, itemCount: c.itemCount + 1 };
        }
        return c;
      })
    );
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'PRODUCT_CREATED',
      targetType: 'product',
      targetId: product.id,
      details: `${product.title} (${formatCurrencyINR(product.pricePaise)})`,
    });
  };

  const handleUpdateSellerProduct = (productId: string, updates: Partial<CatalogProductWithMeta>) => {
    setCatalogProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'PRODUCT_UPDATED',
      targetType: 'product',
      targetId: productId,
      details: `Updated fields: ${Object.keys(updates).join(', ')}`,
    });
  };

  const handleDeleteSellerProduct = (productId: string) => {
    const removed = catalogProducts.find((p) => p.id === productId);
    setCatalogProducts((prev) => prev.filter((p) => p.id !== productId));
    if (removed) {
      setManagedCategories((prev) =>
        prev.map((c) => {
          if (c.slug === 'all' || c.slug === removed.categorySlug) {
            return { ...c, itemCount: Math.max(0, c.itemCount - 1) };
          }
          return c;
        })
      );
    }
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'PRODUCT_DELETED',
      targetType: 'product',
      targetId: productId,
      details: removed ? `Deleted ${removed.title}` : `Deleted ${productId}`,
    });
  };

  const handleUpdateOrderStage = (orderId: string, nextStage: OrderStage) => {
    setCurrentUser((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, trackingStage: nextStage, status: nextStage } : o
      ),
    }));
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'ORDER_STAGE_UPDATED',
      targetType: 'order',
      targetId: orderId,
      details: `Fulfillment transitioned to ${nextStage}`,
    });
  };

  const handleUpdateBulkInquiryStatus = (
    inquiryId: string,
    status: BulkOrderInquiry['status']
  ) => {
    setCurrentUser((prev) => ({
      ...prev,
      bulkInquiries: (prev.bulkInquiries || []).map((inq) =>
        inq.id === inquiryId ? { ...inq, status } : inq
      ),
    }));
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'BULK_INQUIRY_UPDATED',
      targetType: 'inquiry',
      targetId: inquiryId,
      details: `Bulk quote status set to ${status}`,
    });
  };

  const handleOnboardSeller = (seller: SellerProfile) => {
    setSellers((prev) => [seller, ...prev]);
    appendLocalAudit({
      actorEmail: seller.email,
      actorRole: 'seller',
      action: 'SELLER_ONBOARD_APPLIED',
      targetType: 'seller',
      targetId: seller.id,
      details: `${seller.storeName} (GSTIN: ${seller.gstin})`,
    });
  };

  const handleUpdateSellerGovernance = (
    sellerId: string,
    updates: Partial<Pick<SellerProfile, 'status' | 'commissionRate' | 'isVerified'>>
  ) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, ...updates } : s))
    );
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: 'admin',
      action: 'SELLER_GOVERNANCE_UPDATED',
      targetType: 'seller',
      targetId: sellerId,
      details: JSON.stringify(updates),
    });
  };

  const handleToggleProductVisibility = (productId: string, isPublished: boolean) => {
    setCatalogProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isPublished } : p))
    );
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: 'admin',
      action: isPublished ? 'PRODUCT_PUBLISHED' : 'PRODUCT_HIDDEN',
      targetType: 'product',
      targetId: productId,
      details: `Catalog visibility set to ${isPublished}`,
    });
  };

  const handleCreateCategory = (cat: ManagedCategory) => {
    setManagedCategories((prev) => {
      if (prev.some((c) => c.slug === cat.slug)) return prev;
      return [...prev, cat];
    });
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: 'admin',
      action: 'CATEGORY_CREATED',
      targetType: 'category',
      targetId: cat.slug,
      details: `${cat.name} (HSN ${cat.hsnDefault})`,
    });
  };

  const handleUpsertCoupon = (coupon: PromoDiscount) => {
    setCoupons((prev) => {
      const idx = prev.findIndex((c) => c.code.toUpperCase() === coupon.code.toUpperCase());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = coupon;
        return next;
      }
      return [coupon, ...prev];
    });
    appendLocalAudit({
      actorEmail: currentUser.email,
      actorRole: 'admin',
      action: 'COUPON_UPSERTED',
      targetType: 'coupon',
      targetId: coupon.code,
      details: `${coupon.type} ${coupon.value} (${coupon.isActive !== false ? 'active' : 'paused'})`,
    });
  };

  const handleMoveAllToCart = (products: CatalogProduct[]) => {
    const inStock = products.filter((p) => p.stock > 0);
    inStock.forEach((p) => {
      handleQuickAdd(p);
    });
    setIsWishlistOpen(false);
    setIsCartOpen(true);
    if (inStock.length < products.length) {
      showToast(`Transferred ${inStock.length} in-stock saved items (out-of-stock skipped)`);
    } else {
      showToast(`Transferred ${inStock.length} saved items to your bag`);
    }
  };

  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSearchFilter('');
    const element = document.getElementById('featured-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchSubmit = (query: string) => {
    setSearchFilter(query);
    const element = document.getElementById('featured-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => catalogProducts.find((p) => p.id === id))
    .filter((p): p is CatalogProductWithMeta => Boolean(p));

  const handleOpenUserAccountTab = (tab: 'profile' | 'addresses' | 'orders' | 'login' | 'register' = 'profile') => {
    setUserAccountTab(tab);
    setIsUserAccountOpen(true);
  };

  const handleQuickFilter = (filter: 'top-sellers' | 'new-releases' | 'studio-deals') => {
    setViewMode('storefront');
    setSelectedCategory('all');
    setSearchFilter('');
    setQuickFilter(filter);
    const el = document.getElementById('featured-section');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col bg-slate-50 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-200 max-w-[calc(100vw-3rem)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. RESPONSIVE NAVIGATION BAR */}
      <Navbar
        cartCount={cartCount}
        wishlistCount={wishlistedIds.size}
        currentUser={currentUser}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onSelectCategory={handleCategorySelect}
        onSearchSubmit={handleSearchSubmit}
        onOpenCommandCenter={() => setViewMode('command-center')}
        onOpenUserAccount={(tab) => handleOpenUserAccountTab(tab || 'profile')}
        onOpenSellerPortal={() => setIsSellerPortalOpen(true)}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        onOpenNovaAssistant={() => setIsNovaOpen(true)}
        onQuickFilter={handleQuickFilter}
      />

      {/* VIEWPORT SWITCHER: Storefront vs Support Center */}
      {viewMode === 'command-center' ? (
        <Suspense fallback={<div className="p-12 text-center text-xs text-slate-600 dark:text-slate-400">Loading NEXORA Support Center...</div>}>
          <CommandCenter
            onBackToStore={() => setViewMode('storefront')}
            currentUser={currentUser}
          />
        </Suspense>
      ) : (
        <>
          {/* 2. HERO SECTION COMPONENT */}
          <main className="flex-1">
            <Hero
              onAddToCart={handleAddToCart}
              onExploreCatalog={() => {
                const el = document.getElementById('featured-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenNovaAssistant={() => setIsNovaOpen(true)}
              onAddToWishlist={handleToggleWishlist}
            />

            {/* 3. TRUST & LOGISTICS BAR */}
            <TrustBar />

            {/* 4. EXPANDED DISCOVERY & CATALOG SECTION */}
            <FeaturedGrid
              products={catalogProducts}
              categories={categoryItemsForGrid}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchFilter={searchFilter}
              onQuickAdd={handleQuickAdd}
              onQuickView={handleOpenQuickView}
              wishlistedIds={wishlistedIds}
              onToggleWishlist={handleToggleWishlist}
              comparedIds={comparedIds}
              onToggleCompare={handleToggleCompare}
              onOpenPriceAlert={handleOpenPriceAlert}
              recentlyViewed={recentlyViewedProducts}
              onClearRecentlyViewed={() => setRecentlyViewedIds([])}
              quickFilter={quickFilter}
              onClearQuickFilter={() => setQuickFilter('all')}
              onClearSearch={() => setSearchFilter('')}
            />
          </main>

          {/* 5. FOOTER */}
          <Footer
            onNotifyToast={showToast}
            onSelectCategory={handleCategorySelect}
            onOpenUserAccount={(tab) => handleOpenUserAccountTab(tab || 'profile')}
            onOpenSellerPortal={() => setIsSellerPortalOpen(true)}
            onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
          />
        </>
      )}

      {/* 6. SLIDE-OVER SHOPPING BAG WITH PROMO DISCOUNT */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        appliedPromo={appliedPromo}
        onApplyPromo={(promo) => setAppliedPromo(promo)}
        onRemovePromo={() => setAppliedPromo(null)}
        availablePromos={couponMap}
      />

      {/* 7. SLIDE-OVER WISHLIST DRAWER */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistedIds={wishlistedIds}
        products={catalogProducts}
        onRemoveWishlist={handleToggleWishlist}
        onAddToCart={handleQuickAdd}
        onMoveAllToCart={handleMoveAllToCart}
        onQuickView={handleOpenQuickView}
        onClearWishlist={handleClearWishlist}
      />

      {/* 8. RAZORPAY SANDBOX PAYMENT GATEWAY MODAL */}
      <RazorpayModal
        isOpen={isRazorpayOpen}
        onClose={() => setIsRazorpayOpen(false)}
        totalPaise={totalPaise}
        subtotalPaise={subtotalPaise}
        shippingPaise={shippingPaise}
        currentUser={currentUser}
        onSuccess={handlePaymentSuccess}
        onUpdateUserWallet={handleUpdateUserWallet}
        getAuthHeaders={getAuthHeaders}
      />

      {/* 9. QUICK VIEW MODAL WITH SPECS & CUSTOMER REVIEWS */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={handleAddFromQuickView}
        isWishlisted={quickViewProduct ? wishlistedIds.has(quickViewProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        isCompared={quickViewProduct ? comparedIds.has(quickViewProduct.id) : false}
        onToggleCompare={handleToggleCompare}
        onOpenPriceAlert={handleOpenPriceAlert}
        reviews={reviews}
        onSubmitReview={handleSubmitReview}
        currentUser={currentUser}
        onSubmitBulkInquiry={handleBulkInquirySubmit}
      />

      {/* 10. USER ACCOUNT & AUTHENTICATION MODAL */}
      <UserAccount
        isOpen={isUserAccountOpen}
        onClose={() => setIsUserAccountOpen(false)}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
        onCancelOrder={handleCancelOrder}
        initialTab={userAccountTab}
        onOpenWishlist={() => {
          setIsUserAccountOpen(false);
          setIsWishlistOpen(true);
        }}
        onOpenCommandCenter={() => {
          setIsUserAccountOpen(false);
          setViewMode('command-center');
        }}
        onOpenSellerPortal={() => {
          setIsUserAccountOpen(false);
          setIsSellerPortalOpen(true);
        }}
        onOpenAdminPortal={() => {
          setIsUserAccountOpen(false);
          setIsAdminPortalOpen(true);
        }}
      />

      {/* 11. NOVA AI ASSISTANT MODAL */}
      <NovaModal
        isOpen={isNovaOpen}
        onClose={() => setIsNovaOpen(false)}
        onSelectProduct={(title) => {
          setIsNovaOpen(false);
          setSearchFilter(title);
          const el = document.getElementById('featured-section');
          el?.scrollIntoView({ behavior: 'smooth' });
          showToast(`Filter applied for ${title}`);
        }}
      />

      {/* 12. SIDE-BY-SIDE PRODUCT COMPARISON MODAL */}
      <ProductCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        products={comparedProducts}
        onRemoveProduct={handleRemoveCompare}
        onAddToCart={handleQuickAdd}
        onClearAll={handleClearCompare}
      />

      {/* 13. FLOATING COMPARE TRAY DOCK */}
      <CompareFloatingDock
        products={comparedProducts}
        onOpenCompare={() => setIsCompareOpen(true)}
        onClearAll={handleClearCompare}
        onRemoveProduct={handleRemoveCompare}
      />

      {/* 14. SET PRICE DROP ALERT MODAL */}
      <PriceAlertModal
        isOpen={isPriceAlertOpen}
        onClose={() => {
          setIsPriceAlertOpen(false);
          setPriceAlertProduct(null);
        }}
        product={priceAlertProduct}
        userEmail={currentUser.email}
        onSaveAlert={handleSavePriceAlert}
        onSimulatePriceDrop={handleSimulatePriceDrop}
      />

      {/* 15. SELLER CENTRAL PORTAL */}
      <Suspense fallback={null}>
        <SellerDashboardModal
          isOpen={isSellerPortalOpen}
          onClose={() => setIsSellerPortalOpen(false)}
          user={currentUser}
          sellers={sellers}
          products={catalogProducts}
          categories={managedCategories}
          orders={currentUser.orders}
          bulkInquiries={currentUser.bulkInquiries || []}
          onCreateProduct={handleCreateSellerProduct}
          onUpdateProduct={handleUpdateSellerProduct}
          onDeleteProduct={handleDeleteSellerProduct}
          onUpdateOrderStage={handleUpdateOrderStage}
          onUpdateBulkInquiryStatus={handleUpdateBulkInquiryStatus}
          onOnboardSeller={handleOnboardSeller}
          onNotifyToast={showToast}
          getAuthHeaders={getAuthHeaders}
        />
      </Suspense>

      {/* 16. PLATFORM ADMIN GOVERNANCE PORTAL */}
      <Suspense fallback={null}>
        <AdminDashboardModal
          isOpen={isAdminPortalOpen}
          onClose={() => setIsAdminPortalOpen(false)}
          user={currentUser}
          sellers={sellers}
          products={catalogProducts}
          categories={managedCategoriesWithCounts}
          orders={currentUser.orders}
          coupons={coupons}
          auditLogs={auditLogs}
          onUpdateSellerGovernance={handleUpdateSellerGovernance}
          onToggleProductVisibility={handleToggleProductVisibility}
          onCreateCategory={handleCreateCategory}
          onUpsertCoupon={handleUpsertCoupon}
          onUpdateOrderStage={handleUpdateOrderStage}
          onOpenCommandCenter={() => setViewMode('command-center')}
          onNotifyToast={showToast}
          getAuthHeaders={getAuthHeaders}
        />
      </Suspense>
    </div>
  );
}
