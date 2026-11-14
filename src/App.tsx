import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Hero } from './components/Hero.js';
import { TrustBar } from './components/TrustBar.js';
import { FeaturedGrid } from './components/FeaturedGrid.js';
import { CartDrawer, CartLineItem } from './components/CartDrawer.js';
import { NovaModal } from './components/NovaModal.js';
import { Footer } from './components/Footer.js';
import { CommandCenter } from './components/CommandCenter.js';
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
  Product,
  UserProfile,
  UserOrder,
  UserReview,
  PriceAlert,
  PromoDiscount,
  BulkOrderInquiry,
} from './types/index.js';
import { FEATURED_PRODUCT } from './data/mockData.js';
import { PRODUCTS_CATALOG } from './data/productsCatalog.js';
import { formatCurrencyINR } from './utils/formatters.js';
import {
  calculateCartTotals,
  applyOrderWalletAndPoints,
} from './utils/commerceFeatures.js';
import { useAuth } from './contexts/AuthContext.js';
import {
  addWishlistItemToFirestore,
  removeWishlistItemFromFirestore,
  savePriceAlertToFirestore,
  subscribeUserWishlist,
  syncUserRecordsToFirestore,
} from './services/firestoreSync.js';

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

  // Hydrate authenticated user orders, bulk inquiries, and Firestore profile/wishlist
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
        const [ordersRes, inquiriesRes] = await Promise.all([
          fetch('/api/v1/orders', { headers }),
          fetch('/api/v1/bulk-inquiries', { headers }),
        ]);
        const ordersJson = ordersRes.ok ? await ordersRes.json() : null;
        const inquiriesJson = inquiriesRes.ok ? await inquiriesRes.json() : null;
        if (cancelled) return;

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

  // Compute total quantity in cart
  const cartTotals = calculateCartTotals(cartItems, appliedPromo);
  const cartCount = cartTotals.totalQuantity;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
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

  const comparedProducts = PRODUCTS_CATALOG.filter((p) => comparedIds.has(p.id));

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
      `⚡ Live Price Drop Alert: ${product.title} dropped to ${formatCurrencyINR(alertPricePaise)} (Target reached!)`
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
    showToast(`Thank you ${newRev.author}! Your verified review has been published.`);
  };

  // Add Hero product variant to Cart
  const handleAddToCart = (variant: ProductVariant) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
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
      }
    });
    showToast(`Added ${FEATURED_PRODUCT.title} (${variant.name}) to your bag`);
  };

  // Add Catalog Product to Cart
  const handleQuickAdd = (product: CatalogProduct) => {
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

    setCartItems((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            variant,
            quantity: 1,
            productTitle: product.title,
          },
        ];
      }
    });
    showToast(`Added ${product.title} to your bag`);
  };

  // Add from Quick View Modal with quantity
  const handleAddFromQuickView = (product: CatalogProduct, quantity: number) => {
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

    setCartItems((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [
          ...prev,
          {
            variant,
            quantity,
            productTitle: product.title,
          },
        ];
      }
    });
    showToast(`Added ${quantity} × ${product.title} to your bag`);
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
    setCartItems((prev) =>
      prev.map((item) =>
        item.variant.id === variantId ? { ...item, quantity } : item
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
      preferredDeliveryDate: paymentInfo.preferredDeliveryDate,
      orderNotes: paymentInfo.orderNotes,
      isGiftReceipt: paymentInfo.isGiftReceipt,
      giftMessage: paymentInfo.giftMessage,
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

    if (firebaseUser) {
      refreshToken()
        .then((token) => {
          if (!token) return;
          return Promise.all([
            fetch('/api/v1/orders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(newOrder),
            }),
            fetch('/api/v1/account/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                loyaltyPoints: outcome.nextPoints,
                tier: outcome.nextTier,
                walletBalancePaise: outcome.nextWalletPaise,
              }),
            }),
          ]);
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

  const handleMoveAllToCart = (products: CatalogProduct[]) => {
    products.forEach((p) => {
      handleQuickAdd(p);
    });
    setIsWishlistOpen(false);
    setIsCartOpen(true);
    showToast(`Transferred ${products.length} saved items to your bag`);
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
    .map((id) => PRODUCTS_CATALOG.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => Boolean(p));

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
        onOpenNovaAssistant={() => setIsNovaOpen(true)}
        onQuickFilter={handleQuickFilter}
      />

      {/* VIEWPORT SWITCHER: Storefront vs 4-Agent Command Center */}
      {viewMode === 'command-center' ? (
        <CommandCenter
          onBackToStore={() => setViewMode('storefront')}
          currentUser={currentUser}
        />
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
      />

      {/* 7. SLIDE-OVER WISHLIST DRAWER */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistedIds={wishlistedIds}
        onRemoveWishlist={handleToggleWishlist}
        onAddToCart={handleQuickAdd}
        onMoveAllToCart={handleMoveAllToCart}
        onQuickView={handleOpenQuickView}
        onClearWishlist={() => {
          setWishlistedIds(new Set());
          showToast('Wishlist cleared');
        }}
      />

      {/* 8. RAZORPAY SECURE PAYMENT GATEWAY MODAL */}
      <RazorpayModal
        isOpen={isRazorpayOpen}
        onClose={() => setIsRazorpayOpen(false)}
        totalPaise={totalPaise}
        subtotalPaise={subtotalPaise}
        shippingPaise={shippingPaise}
        currentUser={currentUser}
        onSuccess={handlePaymentSuccess}
        onUpdateUserWallet={handleUpdateUserWallet}
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
        initialTab={userAccountTab}
        onOpenWishlist={() => {
          setIsUserAccountOpen(false);
          setIsWishlistOpen(true);
        }}
        onOpenCommandCenter={() => {
          setIsUserAccountOpen(false);
          setViewMode('command-center');
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
    </div>
  );
}
