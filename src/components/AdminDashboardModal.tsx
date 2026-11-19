import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Store,
  Package,
  Truck,
  Tag,
  ClipboardList,
  Cpu,
  CheckCircle2,
  Ban,
  Eye,
  EyeOff,
  Plus,
  Layers,
} from 'lucide-react';
import {
  AdminAuditLog,
  CatalogProductWithMeta,
  ManagedCategory,
  OrderStage,
  PromoDiscount,
  SellerProfile,
  UserOrder,
  UserProfile,
} from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  sellers: SellerProfile[];
  products: CatalogProductWithMeta[];
  categories: ManagedCategory[];
  orders: UserOrder[];
  coupons: PromoDiscount[];
  auditLogs: AdminAuditLog[];
  onUpdateSellerGovernance: (
    sellerId: string,
    updates: Partial<Pick<SellerProfile, 'status' | 'commissionRate' | 'isVerified'>>
  ) => void;
  onToggleProductVisibility: (productId: string, isPublished: boolean) => void;
  onCreateCategory: (cat: ManagedCategory) => void;
  onUpsertCoupon: (coupon: PromoDiscount) => void;
  onUpdateOrderStage: (orderId: string, nextStage: OrderStage) => void;
  onOpenCommandCenter?: () => void;
  onNotifyToast: (msg: string) => void;
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

type AdminTab = 'overview' | 'sellers' | 'moderation' | 'orders' | 'coupons' | 'audit';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  sellers,
  products,
  categories,
  orders,
  coupons,
  auditLogs,
  onUpdateSellerGovernance,
  onToggleProductVisibility,
  onCreateCategory,
  onUpsertCoupon,
  onUpdateOrderStage,
  onOpenCommandCenter,
  onNotifyToast,
  getAuthHeaders,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [moderationQuery, setModerationQuery] = useState('');

  // Create Coupon Form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('15');
  const [couponMinSpendInr, setCouponMinSpendInr] = useState('1000');
  const [couponDesc, setCouponDesc] = useState('');

  // Create Category Form
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catHsn, setCatHsn] = useState('85183000');

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const nonCancelledOrders = orders.filter((o) => o.status !== 'Cancelled');
  const totalGmvPaise = nonCancelledOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const commissionRevenuePaise = Math.round(totalGmvPaise * 0.1);
  const approvedSellersCount = sellers.filter((s) => s.status === 'approved').length;
  const pendingSellersCount = sellers.filter((s) => s.status === 'pending').length;

  const filteredModerationProducts = products.filter((p) => {
    const q = moderationQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.seller.storeName.toLowerCase().includes(q)
    );
  });

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    const numericVal = Number(couponValue);
    const minSpendPaise = Math.max(0, Math.round(Number(couponMinSpendInr) * 100));
    if (code.length < 3 || !Number.isFinite(numericVal) || numericVal <= 0) {
      onNotifyToast('Enter a valid promo code and positive discount value.');
      return;
    }

    const coupon: PromoDiscount = {
      code,
      type: couponType,
      value: couponType === 'fixed' ? Math.round(numericVal * 100) : Math.round(numericVal),
      minSpendPaise,
      description:
        couponDesc.trim() ||
        (couponType === 'percentage'
          ? `${numericVal}% Admin Campaign Discount`
          : `Flat ₹${numericVal} Admin Voucher`),
      isActive: true,
      usageCount: 0,
    };

    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      if (headers.Authorization) {
        await fetch('/api/v1/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(coupon),
        });
      }
    } catch {
      // Fall back cleanly to synchronized storefront state
    }

    onUpsertCoupon(coupon);
    setCouponCode('');
    setCouponDesc('');
    onNotifyToast(`Promo coupon ${coupon.code} is now live in Shopping Bag checkout.`);
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catName.trim();
    const cleanSlug = (catSlug.trim() || cleanName)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-');
    if (cleanName.length < 2) {
      onNotifyToast('Category name must be at least 2 characters.');
      return;
    }

    const category: ManagedCategory = {
      id: `cat-${cleanSlug}`,
      name: cleanName,
      slug: cleanSlug,
      description: `${cleanName} curated studio line`,
      hsnDefault: catHsn.trim() || '85183000',
      gstRate: 18,
      itemCount: 0,
    };

    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      if (headers.Authorization) {
        await fetch('/api/v1/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(category),
        });
      }
    } catch {
      // Local synced update
    }

    onCreateCategory(category);
    setCatName('');
    setCatSlug('');
    onNotifyToast(`Category "${category.name}" added to marketplace.`);
  };

  const syncSellerGovernance = async (
    sellerId: string,
    updates: Partial<Pick<SellerProfile, 'status' | 'commissionRate' | 'isVerified'>>,
    toastMsg: string
  ) => {
    onUpdateSellerGovernance(sellerId, updates);
    onNotifyToast(toastMsg);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`/api/v1/admin/sellers/${encodeURIComponent(sellerId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(updates),
      });
    } catch {
      // keep responsive UI state
    }
  };

  const syncProductModeration = async (productId: string, title: string, isPublished: boolean) => {
    onToggleProductVisibility(productId, isPublished);
    onNotifyToast(`${title} visibility set to ${isPublished ? 'Published' : 'Hidden'}.`);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`/api/v1/admin/products/${encodeURIComponent(productId)}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ isPublished }),
      });
    } catch {
      // keep responsive UI state
    }
  };

  const syncAdminOrderStage = async (orderId: string, nextStage: OrderStage) => {
    onUpdateOrderStage(orderId, nextStage);
    onNotifyToast(`Admin updated ${orderId} -> ${nextStage}`);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ trackingStage: nextStage }),
      });
    } catch {
      // keep responsive UI state
    }
  };

  const syncCouponToggle = async (coupon: PromoDiscount) => {
    const nextCoupon: PromoDiscount = { ...coupon, isActive: coupon.isActive === false };
    onUpsertCoupon(nextCoupon);
    onNotifyToast(`${nextCoupon.code} marked ${nextCoupon.isActive ? 'ACTIVE' : 'INACTIVE'}.`);
    if (!getAuthHeaders) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      await fetch('/api/v1/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(nextCoupon),
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
        aria-label="Platform Admin Governance Portal"
        className="w-full max-w-6xl bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Platform Admin Governance
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 uppercase">
                  RBAC Authority
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Operator: {user.name} ({user.email}) · Cloud SQL + Durable Policy Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCommandCenter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCommandCenter();
                }}
                className="px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-500/20 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>4-Agent Command Center</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Admin Governance"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b12]">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Marketplace GMV</p>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {formatCurrencyINR(totalGmvPaise)}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Est. Commission (10%)</p>
            <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrencyINR(commissionRevenuePaise)}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Vendors (Approved / Pending)</p>
            <p className="text-base font-bold font-mono text-cyan-700 dark:text-cyan-400 mt-0.5">
              {approvedSellersCount} / {pendingSellersCount}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Catalog SKUs</p>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {products.length}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Active Coupons</p>
            <p className="text-base font-bold font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">
              {coupons.filter((c) => c.isActive !== false).length}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Overview', icon: ShieldCheck },
              { id: 'sellers', label: `Sellers (${sellers.length})`, icon: Store },
              { id: 'moderation', label: 'Product Moderation', icon: Package },
              { id: 'orders', label: `Orders (${orders.length})`, icon: Truck },
              { id: 'coupons', label: 'Categories & Coupons', icon: Tag },
              { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: ClipboardList },
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
                    ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                <h3 className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Top Vendor Balances (INR)
                </h3>
                <div className="space-y-2">
                  {[...sellers]
                    .sort((a, b) => b.balancePaise - a.balancePaise)
                    .slice(0, 6)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{s.storeName}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            {s.city}, {s.state} · {s.commissionRate}% fee
                          </p>
                        </div>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrencyINR(s.balancePaise)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                <h3 className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Recent Governance Events
                </h3>
                <div className="space-y-2">
                  {auditLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sellers' && (
            <div className="space-y-2.5 text-xs">
              {sellers.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {s.storeName}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          s.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : s.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Owner: {s.ownerName} ({s.email}) · {s.city}, {s.state} · GSTIN:{' '}
                      <span className="font-mono">{s.gstin}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                      <span className="text-slate-600 dark:text-slate-400">Fee:</span>
                      <select
                        aria-label={`Commission rate for ${s.storeName}`}
                        value={s.commissionRate}
                        onChange={(e) => {
                          void syncSellerGovernance(
                            s.id,
                            { commissionRate: Number(e.target.value) },
                            `Updated commission for ${s.storeName} to ${e.target.value}%.`
                          );
                        }}
                        className="bg-transparent font-bold cursor-pointer"
                      >
                        {[6, 8, 9, 10, 11, 12, 15].map((pct) => (
                          <option key={pct} value={pct} className="dark:bg-slate-900">
                            {pct}%
                          </option>
                        ))}
                      </select>
                    </div>

                    {s.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          void syncSellerGovernance(
                            s.id,
                            { status: 'approved', isVerified: true },
                            `Approved vendor ${s.storeName}.`
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {s.status !== 'suspended' && (
                      <button
                        type="button"
                        onClick={() => {
                          void syncSellerGovernance(
                            s.id,
                            { status: 'suspended', isVerified: false },
                            `Suspended vendor ${s.storeName}.`
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Suspend</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="space-y-4 text-xs">
              <input
                type="text"
                value={moderationQuery}
                onChange={(e) => setModerationQuery(e.target.value)}
                placeholder="Filter SKUs by title, brand, or vendor..."
                className="w-full max-w-md px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredModerationProducts.slice(0, 30).map((p) => {
                  const published = p.isPublished !== false;
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{p.title}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                            {p.seller.storeName} ·{' '}
                            <span className="font-mono">{formatCurrencyINR(p.pricePaise)}</span> · Stock:{' '}
                            <span className="font-mono">{p.stock}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void syncProductModeration(p.id, p.title, !published);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          published
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{published ? 'Published' : 'Hidden'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-3 text-xs">
              {orders.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  No marketplace orders recorded in this session yet.
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{ord.id}</span>
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {ord.date} · {ord.itemsCount} items · {formatCurrencyINR(ord.totalPaise)}
                      </p>
                    </div>
                    {ord.status !== 'Cancelled' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(['Processing', 'Dispatched', 'Out for Delivery', 'Delivered'] as OrderStage[]).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                void syncAdminOrderStage(ord.id, st);
                              }}
                              className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${
                                ord.trackingStage === st
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500'
                              }`}
                            >
                              {st}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              {/* Coupon Creator */}
              <div className="space-y-4">
                <form
                  onSubmit={handleCreateCoupon}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3"
                >
                  <h3 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-500" />
                    <span>Create / Activate Promo Coupon</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold mb-1">Coupon Code</label>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ADMIN15"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Discount Type</label>
                      <select
                        value={couponType}
                        onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Flat Discount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">
                        {couponType === 'percentage' ? 'Discount %' : 'Amount (₹)'}
                      </label>
                      <input
                        type="number"
                        value={couponValue}
                        onChange={(e) => setCouponValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Min Spend (₹)</label>
                      <input
                        type="number"
                        value={couponMinSpendInr}
                        onChange={(e) => setCouponMinSpendInr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Description</label>
                    <input
                      type="text"
                      value={couponDesc}
                      onChange={(e) => setCouponDesc(e.target.value)}
                      placeholder="15% off marketplace launch promo"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Coupon</span>
                  </button>
                </form>

                {/* Active Coupons List */}
                <div className="space-y-2">
                  {coupons.map((c) => (
                    <div
                      key={c.code}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-mono font-bold text-slate-900 dark:text-white">{c.code}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{c.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void syncCouponToggle(c)}
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer ${
                          c.isActive === false
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {c.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories Creator & List */}
              <div className="space-y-4">
                <form
                  onSubmit={handleCreateCategorySubmit}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3"
                >
                  <h3 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    <span>Add Marketplace Category</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-semibold mb-1">Display Name</label>
                      <input
                        type="text"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="e.g. Studio Displays"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">URL Slug</label>
                      <input
                        type="text"
                        value={catSlug}
                        onChange={(e) => setCatSlug(e.target.value)}
                        placeholder="displays"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Default HSN</label>
                      <input
                        type="text"
                        value={catHsn}
                        onChange={(e) => setCatHsn(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Category</span>
                  </button>
                </form>

                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.slug}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{cat.name}</p>
                        <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          /{cat.slug} · HSN {cat.hsnDefault} · GST {cat.gstRate}%
                        </p>
                      </div>
                      <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {cat.itemCount} SKUs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2 text-xs">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {log.action}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {log.targetType}:{log.targetId}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{log.details}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Actor: {log.actorEmail} ({log.actorRole})
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
