import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Store,
  Package,
  Plus,
  Truck,
  Building2,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ArrowRight,
  IndianRupee,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  BulkOrderInquiry,
  CatalogProductWithMeta,
  ManagedCategory,
  OrderStage,
  SellerProfile,
  UserOrder,
  UserProfile,
} from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import {
  canTransitionOrderStage,
  getProductHsnCode,
  validateGstin,
} from '../utils/commerceFeatures.js';

interface SellerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  sellers: SellerProfile[];
  products: CatalogProductWithMeta[];
  categories: ManagedCategory[];
  orders: UserOrder[];
  bulkInquiries: BulkOrderInquiry[];
  onCreateProduct: (product: CatalogProductWithMeta) => void;
  onUpdateProduct: (productId: string, updates: Partial<CatalogProductWithMeta>) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateOrderStage: (orderId: string, nextStage: OrderStage) => void;
  onUpdateBulkInquiryStatus: (inquiryId: string, status: BulkOrderInquiry['status']) => void;
  onOnboardSeller: (seller: SellerProfile) => void;
  onNotifyToast: (msg: string) => void;
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

type SellerTab = 'catalog' | 'orders' | 'inquiries' | 'onboarding';

const SAMPLE_PRODUCT_IMAGES = [
  { label: 'GaN Station Studio', url: '/assets/products/gan_charging_station_1794589602157.jpg' },
  { label: 'Spatial VR Optics', url: '/assets/products/vr_headset_1794589601919.jpg' },
  { label: 'Acoustic Headphones', url: '/assets/products/earphones.jpg' },
  { label: 'Mechanical Keyboard', url: '/assets/products/keyboard.jpg' },
  { label: 'Chronograph Watch', url: '/assets/products/watch.jpg' },
];

export const SellerDashboardModal: React.FC<SellerDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  sellers,
  products,
  categories,
  orders,
  bulkInquiries,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStage,
  onUpdateBulkInquiryStatus,
  onOnboardSeller,
  onNotifyToast,
  getAuthHeaders,
}) => {
  const [activeTab, setActiveTab] = useState<SellerTab>('catalog');
  const [selectedSellerId, setSelectedSellerId] = useState<string>(sellers[0]?.id || 's-tech-1');

  // New Product Form State
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [categorySlug, setCategorySlug] = useState('audio');
  const [priceInr, setPriceInr] = useState('14999');
  const [stock, setStock] = useState('18');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(SAMPLE_PRODUCT_IMAGES[0].url);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Onboarding Form State
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState(user.name || '');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [stateName, setStateName] = useState('Karnataka');
  const [onboardError, setOnboardError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const activeSeller = useMemo(
    () => sellers.find((s) => s.id === selectedSellerId) || sellers[0],
    [sellers, selectedSellerId]
  );

  const sellerProducts = useMemo(() => {
    if (!activeSeller) return [];
    return products.filter((p) => p.seller.id === activeSeller.id);
  }, [products, activeSeller]);

  const sellerOrders = useMemo(() => {
    const productTitles = new Set(sellerProducts.map((p) => p.title.trim().toLowerCase()));
    const matched = orders.filter((o) =>
      o.items.some((it) => productTitles.has(it.title.trim().toLowerCase()))
    );
    return matched.length > 0 ? matched : orders;
  }, [orders, sellerProducts]);

  const sellerInquiries = useMemo(() => {
    if (!activeSeller) return bulkInquiries;
    const storeOrders = bulkInquiries.filter(
      (b) => b.sellerStoreName.toLowerCase() === activeSeller.storeName.toLowerCase()
    );
    return storeOrders.length > 0 ? storeOrders : bulkInquiries;
  }, [bulkInquiries, activeSeller]);

  if (!isOpen) return null;

  const grossSellerRevenue = sellerOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalPaise, 0);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length < 3) {
      setFormError('Product title must be at least 3 characters.');
      return;
    }
    if (brand.trim().length < 2) {
      setFormError('Brand name is required.');
      return;
    }
    const parsedPrice = Number(priceInr);
    const parsedStock = Number(stock);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 100) {
      setFormError('Enter a valid price in INR (minimum ₹100).');
      return;
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setFormError('Stock must be 0 or greater.');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Description must be at least 10 characters.');
      return;
    }

    const seller = activeSeller || sellers[0];
    const pricePaise = Math.round(parsedPrice * 100);
    const cat = categories.find((c) => c.slug === categorySlug);
    const id = `p-vnd-${Date.now().toString(36)}`;
    const cleanSku = sku.trim() || `NXR-${id.slice(-5).toUpperCase()}`;

    setIsSubmitting(true);
    let createdFromServer: CatalogProductWithMeta | null = null;
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      if (headers.Authorization) {
        const resp = await fetch('/api/v1/seller/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            title: title.trim(),
            brand: brand.trim(),
            categorySlug,
            pricePaise,
            stock: Math.round(parsedStock),
            sku: cleanSku,
            description: description.trim(),
            image: imageUrl.trim() || SAMPLE_PRODUCT_IMAGES[0].url,
            sellerId: seller.id,
          }),
        });
        if (resp.ok) {
          const payload = await resp.json();
          if (payload?.success && payload.data) {
            createdFromServer = payload.data;
          }
        }
      }
    } catch {
      // Fallback to synced local/sandbox listing cleanly
    }

    const newProduct: CatalogProductWithMeta = createdFromServer || {
      id,
      title: title.trim(),
      slug: `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(-4)}`,
      brand: brand.trim(),
      category: cat?.name || categorySlug,
      categorySlug,
      tagline: `${brand.trim()} flagship multi-vendor release`,
      description: description.trim(),
      pricePaise,
      rating: 4.8,
      reviewCount: 1,
      stock: Math.round(parsedStock),
      sku: cleanSku,
      image: imageUrl.trim() || SAMPLE_PRODUCT_IMAGES[0].url,
      images: [imageUrl.trim() || SAMPLE_PRODUCT_IMAGES[0].url],
      tags: [brand.trim(), cat?.name || categorySlug],
      specs: {
        Manufacturer: brand.trim(),
        DispatchHub: `${seller.city}, ${seller.state}`,
        HSN: getProductHsnCode(categorySlug),
        Warranty: '1 Year Indian Warranty',
      },
      seller: {
        id: seller.id,
        storeName: seller.storeName,
        isVerified: seller.isVerified,
        rating: 4.9,
        city: seller.city,
      },
      variants: [
        {
          id: `${id}-std`,
          name: 'Standard Edition',
          colorName: 'Obsidian',
          colorHex: '#1e293b',
          pricePaise,
          sku: cleanSku,
          inventoryCount: Math.round(parsedStock),
          image: imageUrl.trim() || SAMPLE_PRODUCT_IMAGES[0].url,
        },
      ],
      hsnCode: getProductHsnCode(categorySlug),
      isPublished: true,
    };

    onCreateProduct(newProduct);
    setTitle('');
    setBrand('');
    setSku('');
    setDescription('');
    setIsSubmitting(false);
    onNotifyToast(`Published "${newProduct.title}" to live marketplace storefront.`);
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);
    if (storeName.trim().length < 3 || ownerName.trim().length < 2) {
      setOnboardError('Store name and owner name are required.');
      return;
    }
    const gstCheck = validateGstin(gstin);
    if (!gstCheck.valid) {
      setOnboardError(gstCheck.error || 'Invalid GSTIN');
      return;
    }

    let createdSeller: SellerProfile | null = null;
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      if (headers.Authorization) {
        const resp = await fetch('/api/v1/seller/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            storeName: storeName.trim(),
            ownerName: ownerName.trim(),
            gstin: gstin.trim().toUpperCase(),
            city: city.trim(),
            state: stateName.trim(),
            email: user.email,
          }),
        });
        if (resp.ok) {
          const payload = await resp.json();
          if (payload?.success) createdSeller = payload.data;
        }
      }
    } catch {
      // Sandbox fallback
    }

    const newSeller: SellerProfile = createdSeller || {
      id: `s-vnd-${Date.now().toString(36)}`,
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      gstin: gstin.trim().toUpperCase(),
      email: user.email,
      city: city.trim(),
      state: stateName.trim(),
      isVerified: false,
      status: 'pending',
      commissionRate: 10,
      balancePaise: 0,
      createdAt: new Date().toISOString(),
    };

    onOnboardSeller(newSeller);
    setStoreName('');
    setGstin('');
    onNotifyToast(`Application submitted for ${newSeller.storeName}. Pending Admin Governance review.`);
  };

  const syncSellerProductUpdate = async (productId: string, updates: Partial<CatalogProductWithMeta>) => {
    onUpdateProduct(productId, updates);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`/api/v1/seller/products/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(updates),
      });
    } catch {
      // keep responsive UI state on offline/sandbox runs
    }
  };

  const syncSellerProductDelete = async (productId: string, title: string) => {
    onDeleteProduct(productId);
    onNotifyToast(`Removed ${title} from seller catalog.`);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`/api/v1/seller/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers,
      });
    } catch {
      // keep responsive UI state
    }
  };

  const syncSellerOrderStage = async (orderId: string, nextStage: OrderStage) => {
    onUpdateOrderStage(orderId, nextStage);
    onNotifyToast(`Order ${orderId} advanced to ${nextStage}.`);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`/api/v1/seller/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ trackingStage: nextStage }),
      });
    } catch {
      // keep responsive UI state
    }
  };

  const syncSellerInquiryStatus = async (inquiryId: string, status: BulkOrderInquiry['status'], toastMsg: string) => {
    onUpdateBulkInquiryStatus(inquiryId, status);
    onNotifyToast(toastMsg);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`/api/v1/seller/inquiries/${encodeURIComponent(inquiryId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status }),
      });
    } catch {
      // keep responsive UI state
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seller Central Hub"
        className="w-full max-w-6xl bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Seller Central Hub
                </h2>
                {activeSeller && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                      activeSeller.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : activeSeller.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {activeSeller.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {activeSeller?.storeName} · GSTIN:{' '}
                <span className="font-mono">{activeSeller?.gstin}</span> · Commission:{' '}
                <span className="font-mono">{activeSeller?.commissionRate}%</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Select seller storefront"
              value={activeSeller?.id || ''}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.storeName} ({s.city})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Seller Central"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b12]">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Payout Wallet Balance</p>
            <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrencyINR(activeSeller?.balancePaise || 0)}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Active Store SKUs</p>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {sellerProducts.length}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Orders Queue</p>
            <p className="text-base font-bold font-mono text-cyan-700 dark:text-cyan-400 mt-0.5">
              {sellerOrders.length}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Session GMV Routed</p>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {formatCurrencyINR(grossSellerRevenue)}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(
            [
              { id: 'catalog', label: 'Products & Inventory', icon: Package },
              { id: 'orders', label: `Fulfillment Orders (${sellerOrders.length})`, icon: Truck },
              { id: 'inquiries', label: `B2B Bulk Inquiries (${sellerInquiries.length})`, icon: Building2 },
              { id: 'onboarding', label: 'Apply / Register New Store', icon: Store },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'catalog' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Create Product Form */}
              <form
                onSubmit={handleAddProduct}
                className="lg:col-span-5 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3 h-fit"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-500" />
                  <span>List New Marketplace Product</span>
                </h3>

                {formError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Product Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Aether Reference Open-Back DAC Studio"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Brand / Studio
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g. Aether"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Department
                      </label>
                      <select
                        value={categorySlug}
                        onChange={(e) => setCategorySlug(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        {categories
                          .filter((c) => c.slug !== 'all')
                          .map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Price (₹ INR)
                      </label>
                      <input
                        type="number"
                        min={100}
                        value={priceInr}
                        onChange={(e) => setPriceInr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Initial Stock
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        SKU Code
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Auto"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Verified Product Asset
                    </label>
                    <select
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      {SAMPLE_PRODUCT_IMAGES.map((img) => (
                        <option key={img.url} value={img.url}>
                          {img.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Product Specification Summary
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe acoustics, CNC finish, warranty, and India GST compliance..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Publishing SKU...' : 'Publish Product to Marketplace'}</span>
                </button>
              </form>

              {/* Store SKU Inventory Table */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Store Inventory ({sellerProducts.length} SKUs)
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {sellerProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                            SKU: {p.sku} · HSN: {p.hsnCode || getProductHsnCode(p.categorySlug)} ·{' '}
                            <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                              {formatCurrencyINR(p.pricePaise)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => void syncSellerProductUpdate(p.id, { stock: p.stock + 5 })}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono font-semibold hover:border-cyan-500 cursor-pointer"
                          title="Restock +5 units"
                        >
                          Stock: {p.stock} (+5)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void syncSellerProductUpdate(p.id, { isPublished: p.isPublished === false })
                          }
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            p.isPublished === false
                              ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                              : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                          }`}
                          title={p.isPublished === false ? 'Hidden — Click to publish' : 'Published'}
                          aria-label={p.isPublished === false ? `Publish ${p.title}` : `Hide ${p.title}`}
                        >
                          {p.isPublished === false ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void syncSellerProductDelete(p.id, p.title)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-500 cursor-pointer"
                          aria-label={`Delete ${p.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-3">
              {sellerOrders.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                  No customer orders placed for this store yet. Place an order on the storefront to manage fulfillment stages here.
                </div>
              ) : (
                sellerOrders.map((ord) => {
                  const stage = ord.trackingStage;
                  const nextStage: OrderStage | null =
                    stage === 'Processing'
                      ? 'Dispatched'
                      : stage === 'Dispatched'
                      ? 'Out for Delivery'
                      : stage === 'Out for Delivery'
                      ? 'Delivered'
                      : null;
                  const canAdvance =
                    nextStage &&
                    ord.status !== 'Cancelled' &&
                    canTransitionOrderStage(stage, nextStage);

                  return (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {ord.id}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-400">
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                          {ord.items.map((i) => `${i.title} ×${i.quantity}`).join(', ')}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          AWB: {ord.trackingNumber} · {ord.deliveryAddress ? `${ord.deliveryAddress.city} (${ord.deliveryAddress.pinCode})` : 'New Delhi'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm">
                          {formatCurrencyINR(ord.totalPaise)}
                        </span>
                        {canAdvance && nextStage && (
                          <button
                            type="button"
                            onClick={() => void syncSellerOrderStage(ord.id, nextStage)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Mark {nextStage}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'inquiries' && (
            <div className="space-y-3">
              {sellerInquiries.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                  No B2B institutional quotes submitted yet.
                </div>
              ) : (
                sellerInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {inq.companyName}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold">
                          {inq.status}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        {inq.productTitle} · Qty: <strong className="font-mono">{inq.quantity}</strong> · Offer:{' '}
                        <strong className="font-mono">{formatCurrencyINR(inq.offeredUnitPaise)}/unit</strong>
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Contact: {inq.contactName} ({inq.contactEmail})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void syncSellerInquiryStatus(
                            inq.id,
                            'Accepted',
                            `Accepted corporate quote ${inq.id}.`
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        Accept Quote
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void syncSellerInquiryStatus(
                            inq.id,
                            'Negotiation',
                            `Marked quote ${inq.id} for negotiation.`
                          )
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 font-semibold cursor-pointer"
                      >
                        Negotiate
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'onboarding' && (
            <form
              onSubmit={handleOnboardSubmit}
              className="max-w-xl p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-4 text-xs"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Apply as a Verified NEXORA Vendor Partner
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Requires valid 15-character Indian GSTIN. Applications enter Admin Governance verification queue.
                </p>
              </div>

              {onboardError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{onboardError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Store / Studio Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Prism Acoustics Pune"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Authorized Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">15-Digit GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="29AAACL1234F1Z8"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">State</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Vendor Verification Application</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
