import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  ShieldCheck,
  Package,
  MapPin,
  Heart,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  LogOut,
  Building,
  Store,
  ChevronRight,
  ExternalLink,
  Award,
  Crown,
  Gift,
  FileText,
  RotateCcw,
  Sparkles,
  Share2,
  Copy,
  Check,
  CalendarCheck,
  MessageSquare,
  Download,
} from 'lucide-react';
import { UserProfile, UserAddress, UserOrder, OrderStage, OrderReturnInfo } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import {
  calculateLoyaltyPoints,
  getLoyaltyTier,
  generateTrackingTimeline,
  formatOrderSummaryShareText,
  calculateUserAchievementBadges,
  calculatePurchaseHistorySummary,
} from '../utils/commerceFeatures.js';
import { exportOrderHistoryToPdf } from '../utils/pdfInvoiceExporter.js';
import { OrderTrackerModal } from './OrderTrackerModal.js';
import { OrderReturnModal } from './OrderReturnModal.js';
import { GSTInvoiceModal } from './GSTInvoiceModal.js';
import { TrackOrderProgressBar } from './TrackOrderProgressBar.js';
import { AchievementBadges } from './AchievementBadges.js';
import { OrderMilestoneGauge } from './OrderMilestoneGauge.js';
import { CourierLiveMap } from './CourierLiveMap.js';
import { SafeImage } from './SafeImage.js';
import { useAuth } from '../contexts/AuthContext.js';

interface UserAccountProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onOpenWishlist?: () => void;
  onOpenCommandCenter?: () => void;
  initialTab?: 'profile' | 'addresses' | 'orders' | 'login' | 'register';
}

export const DEMO_USERS: Record<string, UserProfile> = {
  customer: {
    id: 'usr-customer-01',
    name: 'Shubham Bansal',
    email: 'bansalshubham662@gmail.com',
    phone: '+91 98765 43210',
    role: 'customer',
    cartCount: 2,
    wishlistCount: 4,
    loyaltyPoints: 517,
    tier: 'Gold',
    addresses: [
      {
        id: 'addr-1',
        name: 'Shubham Bansal',
        phone: '+91 98765 43210',
        street: '42, Barakhamba Road, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
        isDefault: true,
      },
      {
        id: 'addr-2',
        name: 'Shubham Bansal (Studio)',
        phone: '+91 98765 43210',
        street: 'Level 4, Cyber City Tower B, DLF Phase 2',
        city: 'Gurugram',
        state: 'Haryana',
        pinCode: '122002',
        isDefault: false,
      },
    ],
    orders: [
      {
        id: 'NEX-ORD-9932',
        date: 'Today, 11 Nov 2026',
        itemsCount: 1,
        totalPaise: 3499900,
        status: 'Processing',
        trackingStage: 'Dispatched',
        courierPartner: 'BlueDart Air Apex',
        trackingNumber: 'BLD-99320148',
        estimatedDeliveryDate: 'Tomorrow by 8:00 PM',
        preferredDeliveryDate: 'Friday, 13 Nov 2026',
        orderNotes: 'Please ring bell twice and leave package with security concierge at Tower B reception.',
        paymentMethod: 'UPI (Razorpay Verified)',
        items: [
          {
            title: 'Sennheiser Momentum 4 Wireless Flagship',
            image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
            pricePaise: 3499900,
            quantity: 1,
          },
        ],
      },
      {
        id: 'NEX-ORD-9281',
        date: '08 Nov 2026',
        itemsCount: 1,
        totalPaise: 2499900,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'BlueDart Express Air',
        trackingNumber: 'BLD-92810471',
        estimatedDeliveryDate: 'Delivered on 08 Nov',
        preferredDeliveryDate: 'Friday, 08 Nov 2026',
        orderNotes: 'Deliver after 3 PM. Call customer phone on approach.',
        paymentMethod: 'UPI (Razorpay Verified)',
        items: [
          {
            title: 'NEXORA Aura Pulse Pro (Obsidian Black)',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
            pricePaise: 2499900,
            quantity: 1,
          },
        ],
      },
      {
        id: 'NEX-ORD-8742',
        date: '28 Oct 2026',
        itemsCount: 2,
        totalPaise: 1879800,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'Delhivery Surface Pro',
        trackingNumber: 'DLH-87429184',
        estimatedDeliveryDate: 'Delivered on 30 Oct',
        preferredDeliveryDate: 'Wednesday, 29 Oct 2026',
        orderNotes: 'Fragile acoustic equipment inside. Keep upright and deliver to front porch.',
        paymentMethod: 'HDFC Credit Card EMI',
        items: [
          {
            title: 'Aeris 75% Gasket Mechanical Keyboard',
            image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
            pricePaise: 1449900,
            quantity: 1,
          },
          {
            title: 'Artisan Full-Grain Leather Desk Pad',
            image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
            pricePaise: 429900,
            quantity: 1,
          },
        ],
      },
      {
        id: 'NEX-ORD-7401',
        date: '14 Oct 2026',
        itemsCount: 1,
        totalPaise: 799900,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'BlueDart Express Air',
        trackingNumber: 'BLD-74019283',
        estimatedDeliveryDate: 'Delivered on 16 Oct',
        paymentMethod: 'NetBanking (ICICI)',
        items: [
          {
            title: 'Lumina Studio Pro Monitor Lightbar',
            image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
            pricePaise: 799900,
            quantity: 1,
          },
        ],
      },
      {
        id: 'NEX-ORD-6912',
        date: '22 Sep 2026',
        itemsCount: 1,
        totalPaise: 4899000,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'BlueDart Air Apex',
        trackingNumber: 'BLD-69128471',
        estimatedDeliveryDate: 'Delivered on 24 Sep',
        paymentMethod: 'UPI (Razorpay Verified)',
        items: [
          {
            title: 'Nordic Chrono Ceramic Minimalist Watch',
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
            pricePaise: 4899000,
            quantity: 1,
          },
        ],
      },
      {
        id: 'NEX-ORD-6409',
        date: '15 Aug 2026',
        itemsCount: 1,
        totalPaise: 1525000,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'Delhivery Surface Pro',
        trackingNumber: 'DLH-64093821',
        estimatedDeliveryDate: 'Delivered on 18 Aug',
        paymentMethod: 'HDFC Credit Card',
        items: [
          {
            title: 'Aura True Wireless Ceramic Earbuds',
            image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
            pricePaise: 1525000,
            quantity: 1,
          },
        ],
      },
      {
        id: 'NEX-ORD-5840',
        date: '20 Jul 2026',
        itemsCount: 2,
        totalPaise: 2180000,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'BlueDart Express Air',
        trackingNumber: 'BLD-58402914',
        estimatedDeliveryDate: 'Delivered on 23 Jul',
        paymentMethod: 'UPI (Razorpay Verified)',
        items: [
          {
            title: 'Artisan Full-Grain Leather Sleeve',
            image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
            pricePaise: 680000,
            quantity: 1,
          },
          {
            title: 'Acoustic Master Hi-Fi Monitor IEMs',
            image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
            pricePaise: 1500000,
            quantity: 1,
          },
        ],
      },
      {
        id: 'NEX-ORD-5192',
        date: '10 Jun 2026',
        itemsCount: 1,
        totalPaise: 1249900,
        status: 'Delivered',
        trackingStage: 'Delivered',
        courierPartner: 'Delhivery Express Air',
        trackingNumber: 'DLH-51920831',
        estimatedDeliveryDate: 'Delivered on 12 Jun',
        paymentMethod: 'NetBanking (SBI)',
        items: [
          {
            title: 'Ergonomic Aircraft-Grade Monitor Arm',
            image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
            pricePaise: 1249900,
            quantity: 1,
          },
        ],
      },
    ],
  },
  seller: {
    id: 'usr-seller-01',
    name: 'Vikramaditya Sen',
    email: 'contact@luminasound.in',
    phone: '+91 99887 76655',
    role: 'seller',
    cartCount: 0,
    wishlistCount: 1,
    loyaltyPoints: 120,
    tier: 'Silver',
    addresses: [
      {
        id: 'addr-seller-1',
        name: 'Lumina Soundworks Studio Hub',
        phone: '+91 99887 76655',
        street: 'Plot 18, Okhla Industrial Area Phase III',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110020',
        isDefault: true,
      },
    ],
    orders: [
      {
        id: 'NEX-ORD-SEL-104',
        date: '07 Nov 2026',
        itemsCount: 4,
        totalPaise: 9999600,
        status: 'Shipped',
        trackingStage: 'Dispatched',
        courierPartner: 'BlueDart B2B Cargo',
        trackingNumber: 'BLD-SEL-104928',
        estimatedDeliveryDate: '10 Nov 2026',
        paymentMethod: 'B2B Bank Transfer',
        items: [
          {
            title: 'Lumina Soundworks Acoustic Sample Batch',
            image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
            pricePaise: 9999600,
            quantity: 4,
          },
        ],
      },
    ],
  },
  admin: {
    id: 'usr-admin-01',
    name: 'Nexora Platform Governance',
    email: 'governance@nexora.internal',
    phone: '+91 11 4000 8899',
    role: 'admin',
    cartCount: 0,
    wishlistCount: 0,
    loyaltyPoints: 0,
    tier: 'Platinum',
    addresses: [
      {
        id: 'addr-admin-1',
        name: 'NEXORA Corporate Headquarters',
        phone: '+91 11 4000 8899',
        street: 'Regal Building, Sansad Marg, CP',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110001',
        isDefault: true,
      },
    ],
    orders: [],
  },
};

export const UserAccount: React.FC<UserAccountProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onOpenWishlist,
  onOpenCommandCenter,
  initialTab = 'profile',
}) => {
  const { firebaseUser, isSigningIn, authError, signInWithGoogle, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders' | 'login' | 'register'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setEditName(currentUser.name);
      setEditPhone(currentUser.phone || '');
    }
  }, [isOpen, initialTab, currentUser.id]);
  
  // Auth Form State
  const [loginEmail, setLoginEmail] = useState('bansalshubham662@gmail.com');
  const [loginPassword, setLoginPassword] = useState('••••••••••••');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'customer' | 'seller'>('customer');
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');

  // Address Form State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrState, setNewAddrState] = useState('Delhi');
  const [newAddrPin, setNewAddrPin] = useState('');
  const [newAddrDefault, setNewAddrDefault] = useState(false);

  // Active Modals for Order Actions
  const [trackingOrder, setTrackingOrder] = useState<UserOrder | null>(null);
  const [returnOrder, setReturnOrder] = useState<UserOrder | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<UserOrder | null>(null);

  // Share Order & Order Notes View State
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [copiedNotesId, setCopiedNotesId] = useState<string | null>(null);
  const [orderFilterTab, setOrderFilterTab] = useState<'all' | 'notes'>('all');
  const [shareSuccessToast, setShareSuccessToast] = useState<string | null>(null);

  // Dynamic Achievement Badges Memoization
  const userBadges = React.useMemo(() => {
    return currentUser.badges || calculateUserAchievementBadges(currentUser);
  }, [currentUser]);

  // Share Order Details Handler (Clipboard with Web Share fallback)
  const handleShareOrder = async (order: UserOrder) => {
    const text = formatOrderSummaryShareText(order);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `NEXORA Order #${order.id}`,
          text,
        });
        setShareSuccessToast(`Shared order ${order.id} summary!`);
        setTimeout(() => setShareSuccessToast(null), 3000);
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedOrderId(order.id);
        setShareSuccessToast(`Order #${order.id} details copied to clipboard!`);
        setTimeout(() => {
          setCopiedOrderId(null);
          setShareSuccessToast(null);
        }, 3000);
      }
    } catch {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(text);
        setCopiedOrderId(order.id);
        setShareSuccessToast(`Order #${order.id} details copied to clipboard!`);
        setTimeout(() => {
          setCopiedOrderId(null);
          setShareSuccessToast(null);
        }, 3000);
      } catch {
        // clipboard unavailable
      }
    }
  };

  const handleCopyNotes = async (orderId: string, notes: string) => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopiedNotesId(orderId);
      setShareSuccessToast('Delivery instructions copied to clipboard!');
      setTimeout(() => {
        setCopiedNotesId(null);
        setShareSuccessToast(null);
      }, 2500);
    } catch {
      // ignore
    }
  };

  // Advance Order Stage Handler
  const handleAdvanceStage = (orderId: string) => {
    const STAGES: OrderStage[] = ['Processing', 'Dispatched', 'Out for Delivery', 'Delivered'];
    const updatedOrders = currentUser.orders.map((o) => {
      if (o.id !== orderId) return o;
      const current = o.trackingStage || (o.status as OrderStage) || 'Processing';
      const idx = STAGES.indexOf(current);
      const nextStage = idx < STAGES.length - 1 ? STAGES[idx + 1] : 'Delivered';
      const checkpoints = generateTrackingTimeline(nextStage, o.date);
      return {
        ...o,
        status: nextStage,
        trackingStage: nextStage,
        checkpoints,
      };
    });

    const updatedUser = { ...currentUser, orders: updatedOrders };
    onUpdateUser(updatedUser);
    const updatedTarget = updatedOrders.find((o) => o.id === orderId) || null;
    setTrackingOrder(updatedTarget);
    setAuthSuccessMsg(`Order ${orderId} logistics progression updated to: ${updatedTarget?.trackingStage}`);
    setTimeout(() => setAuthSuccessMsg(null), 3000);
  };

  // Submit Return Request Handler
  const handleReturnSubmit = (orderId: string, returnInfo: OrderReturnInfo) => {
    const updatedOrders = currentUser.orders.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        status: 'Return Requested' as const,
        trackingStage: 'Return Requested' as const,
        returnInfo,
      };
    });

    const updatedUser = { ...currentUser, orders: updatedOrders };
    onUpdateUser(updatedUser);
    setAuthSuccessMsg(`Return requested for Order ${orderId}. RMA: ${returnInfo.rmaNumber}`);
    setTimeout(() => setAuthSuccessMsg(null), 3500);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !trackingOrder && !returnOrder && !invoiceOrder) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, trackingOrder, returnOrder, invoiceOrder, onClose]);

  const handleExportOrderHistoryPdf = () => {
    if (currentUser.orders.length === 0) return;
    try {
      const result = exportOrderHistoryToPdf(currentUser, currentUser.orders);
      setShareSuccessToast(
        `Exported PDF invoice (${result.orderCount} orders · ${result.filename})`
      );
      setTimeout(() => setShareSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to generate order history PDF:', err);
      setShareSuccessToast('Unable to generate PDF invoice right now.');
      setTimeout(() => setShareSuccessToast(null), 3000);
    }
  };

  if (!isOpen) return null;

  const handleQuickLogin = (roleKey: 'customer' | 'seller' | 'admin') => {
    const user = DEMO_USERS[roleKey];
    onUpdateUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setAuthSuccessMsg(`Logged in successfully as ${user.name} (${user.role.toUpperCase()})`);
    setActiveTab('profile');
    setTimeout(() => setAuthSuccessMsg(null), 3000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = Object.values(DEMO_USERS).find(
      (u) => u.email.toLowerCase() === loginEmail.toLowerCase()
    ) || {
      ...DEMO_USERS.customer,
      email: loginEmail,
      name: loginEmail.split('@')[0],
    };
    onUpdateUser(found);
    setAuthSuccessMsg(`Welcome back, ${found.name}!`);
    setActiveTab('profile');
    setTimeout(() => setAuthSuccessMsg(null), 3000);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail) return;
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: regName,
      email: regEmail,
      phone: regPhone,
      role: regRole,
      cartCount: 0,
      wishlistCount: 0,
      loyaltyPoints: 0,
      tier: 'Silver',
      addresses: [
        {
          id: `addr-${Date.now()}`,
          name: regName,
          phone: regPhone || '+91 98765 00000',
          street: '1st Cross, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560038',
          isDefault: true,
        },
      ],
      orders: [],
    };
    onUpdateUser(newUser);
    setAuthSuccessMsg(`Account created successfully for ${newUser.name}`);
    setActiveTab('profile');
    setTimeout(() => setAuthSuccessMsg(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentUser,
      name: editName,
      phone: editPhone,
    };
    onUpdateUser(updated);
    setIsEditingProfile(false);
    setAuthSuccessMsg('Profile updated successfully.');
    setTimeout(() => setAuthSuccessMsg(null), 2500);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet || !newAddrCity || !newAddrPin) return;

    const newAddress: UserAddress = {
      id: `addr-${Date.now()}`,
      name: newAddrName || currentUser.name,
      phone: newAddrPhone || currentUser.phone || '+91 98765 43210',
      street: newAddrStreet,
      city: newAddrCity,
      state: newAddrState,
      pinCode: newAddrPin,
      isDefault: newAddrDefault || currentUser.addresses.length === 0,
    };

    let updatedAddresses = [...currentUser.addresses];
    if (newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map((a) => ({ ...a, isDefault: false }));
    }
    updatedAddresses.push(newAddress);

    onUpdateUser({
      ...currentUser,
      addresses: updatedAddresses,
    });

    setShowAddAddress(false);
    setNewAddrName('');
    setNewAddrPhone('');
    setNewAddrStreet('');
    setNewAddrCity('');
    setNewAddrPin('');
    setAuthSuccessMsg('New delivery address added.');
    setTimeout(() => setAuthSuccessMsg(null), 2500);
  };

  const handleSetDefaultAddress = (addressId: string) => {
    const updated = currentUser.addresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    onUpdateUser({ ...currentUser, addresses: updated });
    setAuthSuccessMsg('Default delivery address updated.');
    setTimeout(() => setAuthSuccessMsg(null), 2000);
  };

  const handleDeleteAddress = (addressId: string) => {
    const updated = currentUser.addresses.filter((a) => a.id !== addressId);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    onUpdateUser({ ...currentUser, addresses: updated });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="User Account & Order History"
        className="relative w-full max-w-3xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'NX'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  {currentUser.name}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close user account modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {authSuccessMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900 px-4 sm:px-6 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{authSuccessMsg}</span>
          </div>
        )}

        {/* Horizontal Tab Navigation (Zero-Pill Discipline: Segmented Controls) */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar bg-slate-50/30 dark:bg-slate-900/30 text-[11px] sm:text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            My Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Saved Addresses ({currentUser.addresses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Order History ({currentUser.orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'login'
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Switch / Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'register'
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Register New
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-teal-400 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {currentUser.name[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                      <span>{currentUser.name}</span>
                      <ShieldCheck className="w-4 h-4 text-cyan-500" />
                      {userBadges.filter((b) => b.unlocked).slice(0, 2).map((b) => (
                        <span
                          key={b.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1 shadow-2xs"
                        >
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>{b.title}</span>
                        </span>
                      ))}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Member since Nov 2026 · Tier 1 Prime Authenticated
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ● Active Status
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {currentUser.role === 'customer'
                          ? 'Verified Consumer'
                          : currentUser.role === 'seller'
                          ? 'Verified Vendor Partner'
                          : 'Platform Administrator'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/80 rounded-lg hover:bg-cyan-100 transition-colors cursor-pointer"
                >
                  {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>

              {/* DYNAMIC USER ACHIEVEMENT BADGES PANEL */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-900/60 dark:to-slate-950/40 border border-slate-200 dark:border-slate-800 shadow-xs">
                <AchievementBadges badges={userBadges} />
              </div>

              {/* B2B BULK ORDER INQUIRIES TRACKER */}
              {(currentUser.bulkInquiries || []).length > 0 && (
                <div
                  data-testid="bulk-inquiries-panel"
                  className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        B2B Bulk Order Inquiries ({currentUser.bulkInquiries!.length})
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                      Direct Seller Desk
                    </span>
                  </div>
                  <div className="space-y-2">
                    {currentUser.bulkInquiries!.map((inq) => (
                      <div
                        key={inq.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {inq.id}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">
                              {inq.status}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                            {inq.productTitle}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {inq.companyName} · Qty: <strong className="font-mono">{inq.quantity} units</strong> · Seller: {inq.sellerStoreName}
                          </p>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block">Target Unit Offer</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrencyINR(inq.offeredUnitPaise)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Profile Form */}
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Update Account Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Address</span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Primary Phone</span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">
                      {currentUser.phone || '+91 Not Linked'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Default Dispatch PIN</span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">
                      {currentUser.addresses.find((a) => a.isDefault)?.pinCode || '110001 (New Delhi)'}
                    </p>
                  </div>
                </div>
              )}

              {/* LOYALTY REWARDS & TIER STATUS */}
              {(() => {
                const lifetimeSpentPaise = currentUser.orders.reduce((sum, o) => sum + o.totalPaise, 0);
                const points = currentUser.loyaltyPoints ?? calculateLoyaltyPoints(lifetimeSpentPaise);
                const tier = currentUser.tier ?? getLoyaltyTier(points);
                const redeemValueINR = (points * 0.1).toFixed(2);
                const progressToNext = tier === 'Silver' ? Math.min(100, (points / 250) * 100) : tier === 'Gold' ? Math.min(100, ((points - 250) / 750) * 100) : 100;

                return (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#0e1726] border border-cyan-500/30 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-slate-950 font-black flex items-center justify-center shadow-lg">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base tracking-tight">NEXORA Club Rewards</span>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                              {tier} Tier
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Earn 1 Point per ₹100 spent · 10 Points = ₹1.00 instant checkout credit
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">Available Balance</span>
                        <div className="flex items-baseline gap-1.5 sm:justify-end">
                          <span className="text-2xl font-black font-mono text-cyan-400">{points}</span>
                          <span className="text-xs text-slate-300 font-semibold">Points</span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-mono font-medium block">
                          ≈ ₹{redeemValueINR} Redeemable Value
                        </span>
                      </div>
                    </div>

                    {/* Tier Progress Meter */}
                    <div className="relative z-10 pt-4 space-y-2 text-xs">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Current Tier: <strong className="text-white">{tier}</strong></span>
                        <span>{tier === 'Platinum' ? 'Highest Tier Unlocked' : `${tier === 'Silver' ? 250 - points : 1000 - points} pts to next tier`}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 rounded-full transition-all duration-700"
                          style={{ width: `${progressToNext}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                        <span className={tier === 'Silver' ? 'text-cyan-400 font-bold' : ''}>Silver (0+)</span>
                        <span className={tier === 'Gold' ? 'text-amber-400 font-bold' : ''}>Gold (250+)</span>
                        <span className={tier === 'Platinum' ? 'text-purple-400 font-bold' : ''}>Platinum (1,000+)</span>
                      </div>
                    </div>

                    {/* Member Privileges Pill List */}
                    <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                      <span className="flex items-center gap-1.5 text-cyan-300">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Zero-Cost Express Delivery</span>
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <Gift className="w-3.5 h-3.5" />
                        <span>Priority 48-Hour Return Doorstep Pickup</span>
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="flex items-center gap-1.5 text-teal-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Early Access Drops</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Role Fast-Switcher for Demonstrations */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      One-Click Role Demonstration
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Switch between verified stakeholder roles to test customized platform capabilities.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('customer')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      currentUser.role === 'customer'
                        ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <User className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Customer</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">Shubham Bansal</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('seller')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      currentUser.role === 'seller'
                        ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Store className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Vendor Partner</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">Lumina Soundworks</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      currentUser.role === 'admin'
                        ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Building className="w-3.5 h-3.5 text-purple-500" />
                      <span>Admin Governance</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">Nexora Admin</p>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleQuickLogin('customer');
                  }}
                  className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Reset / Re-authenticate</span>
                </button>

                <div className="flex items-center gap-2">
                  {onOpenWishlist && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenWishlist();
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                    >
                      Saved Wishlist ({currentUser.wishlistCount})
                    </button>
                  )}
                  {currentUser.role === 'admin' && onOpenCommandCenter && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCommandCenter();
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Open Command Center</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SAVED ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Delivery Addresses in India
                  </h3>
                  <p className="text-xs text-slate-500">
                    Used for hyper-local GST calculation and next-day express delivery.
                  </p>
                </div>
                {!showAddAddress && (
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Address</span>
                  </button>
                )}
              </div>

              {/* Add Address Form */}
              {showAddAddress && (
                <form
                  onSubmit={handleAddAddress}
                  className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-50/20 dark:bg-cyan-950/20 space-y-3 text-xs"
                >
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Add New Dispatch Address
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        placeholder={currentUser.name}
                        value={newAddrName}
                        onChange={(e) => setNewAddrName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        10-Digit Mobile Phone
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={newAddrPhone}
                        onChange={(e) => setNewAddrPhone(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      Street Address & Building / Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 14B, Janpath Road, Connaught Place"
                      value={newAddrStreet}
                      onChange={(e) => setNewAddrStreet(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="New Delhi"
                        value={newAddrCity}
                        onChange={(e) => setNewAddrCity(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        placeholder="Delhi"
                        value={newAddrState}
                        onChange={(e) => setNewAddrState(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        placeholder="110001"
                        maxLength={6}
                        value={newAddrPin}
                        onChange={(e) => setNewAddrPin(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="addr-default"
                      checked={newAddrDefault}
                      onChange={(e) => setNewAddrDefault(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="addr-default" className="text-slate-600 dark:text-slate-300 text-xs">
                      Make this my default delivery address
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg cursor-pointer"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}

              {/* Address Cards List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentUser.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border transition-all ${
                      addr.isDefault
                        ? 'border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                        {addr.name}
                      </span>
                      {addr.isDefault ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500 text-slate-950">
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                        >
                          Set as Default
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {addr.street}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {addr.city}, {addr.state} — <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{addr.pinCode}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Phone: {addr.phone}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        title="Delete address"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>My Orders & Invoices</span>
                    {currentUser.orders.length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                        {currentUser.orders.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    GST compliance invoices, doorstep tracking, and delivery instructions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="export-orders-pdf-btn"
                    onClick={handleExportOrderHistoryPdf}
                    disabled={currentUser.orders.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Export full order history & payment details as a PDF invoice"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export PDF Invoice</span>
                  </button>

                  {/* Sub-Tabs: All Orders vs Order Notes History */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setOrderFilterTab('all')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        orderFilterTab === 'all'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      All Orders ({currentUser.orders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilterTab('notes')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        orderFilterTab === 'notes'
                          ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Order Notes ({currentUser.orders.filter((o) => !!o.orderNotes).length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Purchase History Summary KPIs */}
              {(() => {
                const summary = calculatePurchaseHistorySummary(currentUser.orders);
                return (
                  <div
                    data-testid="purchase-history-kpis"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
                  >
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                        Total Spent
                      </span>
                      <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                        {formatCurrencyINR(summary.totalSpentPaise)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                        Orders & Items
                      </span>
                      <span className="text-sm font-black font-mono text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                        {summary.orderCount} · {summary.totalItemsPurchased} items
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                        Avg Order Value
                      </span>
                      <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                        {formatCurrencyINR(summary.averageOrderValuePaise)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                        Delivered / Active
                      </span>
                      <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {summary.deliveredCount} / {summary.activeCount}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Leaflet Live Courier Map for Active BlueDart Express Shipments */}
              {currentUser.orders.length > 0 && orderFilterTab === 'all' && (
                <CourierLiveMap
                  orders={currentUser.orders}
                  addresses={currentUser.addresses}
                  onOpenOrderTracker={(targetOrder) => setTrackingOrder(targetOrder)}
                />
              )}

              {/* D3 Circular Order Milestone Gauge for Latest Order */}
              {currentUser.orders.length > 0 && orderFilterTab === 'all' && (
                <div className="mb-3">
                  <OrderMilestoneGauge
                    order={currentUser.orders[0]}
                    onAdvanceStage={handleAdvanceStage}
                  />
                </div>
              )}

              {/* VIEW A: DEDICATED ORDER NOTES & DELIVERY INSTRUCTIONS HISTORY */}
              {orderFilterTab === 'notes' ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 text-xs text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span>
                      Review special delivery instructions provided during checkout across all your historical orders.
                    </span>
                  </div>

                  {currentUser.orders.filter((o) => !!o.orderNotes).length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                      <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">No order notes recorded yet.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        You can add custom delivery instructions (e.g., gate codes, ring doorbell twice) in the checkout modal.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentUser.orders
                        .filter((o) => !!o.orderNotes)
                        .map((order) => (
                          <div
                            key={`note-${order.id}`}
                            className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-900/40 pb-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {order.id}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-500">{order.date}</span>
                                {order.preferredDeliveryDate && (
                                  <>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                                      <CalendarCheck className="w-3 h-3" />
                                      {order.preferredDeliveryDate}
                                    </span>
                                  </>
                                )}
                              </div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {formatCurrencyINR(order.totalPaise)}
                              </span>
                            </div>

                            {/* Prominent Instruction Quote Card */}
                            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-800 text-xs space-y-1">
                              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Recorded Delivery Instruction</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyNotes(order.id, order.orderNotes!)}
                                  className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                                >
                                  {copiedNotesId === order.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span className="text-emerald-500 font-bold">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy for Next Order</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-slate-800 dark:text-slate-200 italic pt-1">
                                "{order.orderNotes}"
                              </p>
                            </div>

                            {/* Footer with Courier Compliance and Share */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                              <span>
                                Assigned Courier: <strong>{order.courierPartner || 'BlueDart Express'}</strong> ({order.trackingNumber || 'BLD-9281'})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleShareOrder(order)}
                                className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {copiedOrderId === order.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-500">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>Share Order Details</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW B: ALL ORDERS LIST */
                <div>
                  {currentUser.orders.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                      <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No past orders found in this account.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentUser.orders.map((order) => {
                        const STAGES: OrderStage[] = ['Processing', 'Dispatched', 'Out for Delivery', 'Delivered'];
                        const currentStage: OrderStage = order.trackingStage || (order.status as OrderStage) || 'Processing';
                        const stageIdx = STAGES.indexOf(currentStage);
                        const isDelivered = currentStage === 'Delivered';
                        const isReturnRequested = order.status === 'Return Requested';

                        return (
                          <div
                            key={order.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                          >
                            {/* Top Row: ID, Date, Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                  {order.id}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-slate-500">{order.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isReturnRequested
                                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                                      : isDelivered
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400'
                                  }`}
                                >
                                  {order.status}
                                </span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {formatCurrencyINR(order.totalPaise)}
                                </span>
                              </div>
                            </div>

                            {/* Preferred Delivery Window & Gift Receipt Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              {order.preferredDeliveryDate && (
                                <div className="flex items-center gap-1.5 text-[11px] text-cyan-700 dark:text-cyan-300 bg-cyan-50/80 dark:bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-200/80 dark:border-cyan-800/60 font-medium w-fit">
                                  <CalendarCheck className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                  <span>Preferred Delivery: <strong className="font-semibold">{order.preferredDeliveryDate}</strong></span>
                                </div>
                              )}
                              {order.isGiftReceipt && (
                                <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200/80 dark:border-purple-800/60 font-medium w-fit">
                                  <Gift className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                  <span>Gift Receipt (Prices Masked)</span>
                                </div>
                              )}
                            </div>

                            {/* Order Items */}
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <SafeImage
                                    src={item.image}
                                    alt={item.title}
                                    fallbackLabel={item.title}
                                    className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                      {item.title}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      Qty: {item.quantity} · {formatCurrencyINR(item.pricePaise)} each
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Special Delivery Instructions / Notes Card */}
                            {order.orderNotes && (
                              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-amber-800 dark:text-amber-300">Delivery Instructions: </span>
                                  <span className="italic">"{order.orderNotes}"</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyNotes(order.id, order.orderNotes!)}
                                  className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-mono cursor-pointer shrink-0"
                                  title="Copy delivery note"
                                >
                                  {copiedNotesId === order.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Note</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Track Order Visual Progress Bar Component */}
                            {!isReturnRequested && (
                              <TrackOrderProgressBar
                                order={order}
                                onAdvanceStage={handleAdvanceStage}
                                onOpenDetailedTracker={(targetOrd) => setTrackingOrder(targetOrd)}
                              />
                            )}

                            {/* Reverse Logistics Return Alert Card */}
                            {isReturnRequested && order.returnInfo && (
                              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300">
                                  <span className="flex items-center gap-1.5">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Return Initiated · RMA: {order.returnInfo.rmaNumber}</span>
                                  </span>
                                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                                    {order.returnInfo.refundStatus}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  Reason: {order.returnInfo.reason}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Reverse Doorstep Pickup Scheduled: <strong>{order.returnInfo.pickupScheduledDate}</strong>
                                </p>
                              </div>
                            )}

                            {/* Order Actions Toolbar */}
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
                              <span className="truncate max-w-[200px]">
                                {order.courierPartner || 'BlueDart Express'} · {order.trackingNumber || 'BLD-9281'}
                              </span>

                              <div className="flex items-center gap-3">
                                {/* Share Order Details */}
                                <button
                                  type="button"
                                  onClick={() => handleShareOrder(order)}
                                  className="font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-500 flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Export or copy order summary"
                                >
                                  {copiedOrderId === order.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="text-emerald-500">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="w-3.5 h-3.5" />
                                      <span>Share Order</span>
                                    </>
                                  )}
                                </button>

                                {/* Track Dispatch */}
                                <button
                                  type="button"
                                  onClick={() => setTrackingOrder(order)}
                                  className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Track Live</span>
                                </button>

                                {/* Download Tax Invoice */}
                                <button
                                  type="button"
                                  onClick={() => setInvoiceOrder(order)}
                                  className="font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-500 flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>GST Invoice</span>
                                </button>

                                {/* Request Return Flow (Delivered orders) */}
                                {isDelivered && !isReturnRequested && (
                                  <button
                                    type="button"
                                    onClick={() => setReturnOrder(order)}
                                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Request Return</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SWITCH / SIGN IN */}
          {activeTab === 'login' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Sign in to your NEXORA Account
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sync your cart, orders, GST invoices, and saved wishlist across sessions.
                </p>
              </div>

              {/* Google Sign-In (Firebase Authentication) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
                {firebaseUser ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Signed in with Google
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-200 truncate">
                        {firebaseUser.displayName || firebaseUser.email}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{firebaseUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOutUser();
                        setAuthSuccessMsg('Signed out from Google session.');
                        setTimeout(() => setAuthSuccessMsg(null), 3000);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={async () => {
                      const signedIn = await signInWithGoogle();
                      if (signedIn) {
                        onUpdateUser({
                          ...currentUser,
                          id: signedIn.uid,
                          name: signedIn.displayName || currentUser.name,
                          email: signedIn.email || currentUser.email,
                          avatarUrl: signedIn.photoURL || currentUser.avatarUrl,
                        });
                        setAuthSuccessMsg(`Authenticated via Google as ${signedIn.email}`);
                        setActiveTab('profile');
                        setTimeout(() => setAuthSuccessMsg(null), 3500);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-cyan-500 text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>{isSigningIn ? 'Signing in with Google...' : 'Continue with Google'}</span>
                  </button>
                )}
                {authError && (
                  <p className="text-[11px] text-rose-500 text-center">{authError}</p>
                )}
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                    <span>Remember this device</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthSuccessMsg(`Password reset instructions sent to ${loginEmail || currentUser.email}.`);
                      setTimeout(() => setAuthSuccessMsg(null), 3500);
                    }}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 dark:bg-cyan-500 dark:text-slate-950 rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Sign In to NEXORA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Demo Logins */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 text-center">
                  Or Instant Demo Stakeholder Logins:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('customer')}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-center text-xs cursor-pointer"
                  >
                    <span className="font-semibold block">Customer</span>
                    <span className="text-[10px] text-slate-500">Shubham</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('seller')}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-center text-xs cursor-pointer"
                  >
                    <span className="font-semibold block">Vendor</span>
                    <span className="text-[10px] text-slate-500">Lumina</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-center text-xs cursor-pointer"
                  >
                    <span className="font-semibold block">Admin</span>
                    <span className="text-[10px] text-slate-500">Governance</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REGISTER NEW */}
          {activeTab === 'register' && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="text-center">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Create your NEXORA Account
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Join India's next-generation curated commerce ecosystem.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="priya.sharma@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Mobile Number (+91)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Choose Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2.5 rounded-lg border text-center cursor-pointer transition-colors ${
                        regRole === 'customer'
                          ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="regRole"
                        value="customer"
                        checked={regRole === 'customer'}
                        onChange={() => setRegRole('customer')}
                        className="sr-only"
                      />
                      <span>Customer / Buyer</span>
                    </label>
                    <label
                      className={`p-2.5 rounded-lg border text-center cursor-pointer transition-colors ${
                        regRole === 'seller'
                          ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="regRole"
                        value="seller"
                        checked={regRole === 'seller'}
                        onChange={() => setRegRole('seller')}
                        className="sr-only"
                      />
                      <span>Verified Seller / Brand</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Set Secure Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Complete Registration</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Modals for Real-Time Dispatch Tracking, Returns, and GST Invoices */}
      <OrderTrackerModal
        isOpen={!!trackingOrder}
        onClose={() => setTrackingOrder(null)}
        order={trackingOrder}
        onAdvanceStage={handleAdvanceStage}
      />

      <OrderReturnModal
        isOpen={!!returnOrder}
        onClose={() => setReturnOrder(null)}
        order={returnOrder}
        onSubmitReturn={handleReturnSubmit}
      />

      <GSTInvoiceModal
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        order={invoiceOrder}
        user={currentUser}
      />

      {/* Floating Action Toast Notification */}
      {shareSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-cyan-500/40 text-xs flex items-center gap-2 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{shareSuccessToast}</span>
        </div>
      )}
    </div>
  );
};
