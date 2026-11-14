import React, { useState } from 'react';
import {
  X,
  Building2,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Send,
  Sparkles,
  Phone,
  Mail,
  User,
  FileCheck,
} from 'lucide-react';
import { CatalogProduct, UserProfile, BulkOrderInquiry } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { SafeImage } from './SafeImage.js';

interface BulkOrderInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CatalogProduct | null;
  currentUser: UserProfile;
  onSubmitInquiry: (inquiry: BulkOrderInquiry) => void;
}

export const BulkOrderInquiryModal: React.FC<BulkOrderInquiryModalProps> = ({
  isOpen,
  onClose,
  product,
  currentUser,
  onSubmitInquiry,
}) => {
  const [quantity, setQuantity] = useState(15);
  const [companyName, setCompanyName] = useState('AuraSound Audio Labs LLP');
  const [contactName, setContactName] = useState(currentUser.name || 'Shubham Bansal');
  const [contactEmail, setContactEmail] = useState(currentUser.email || 'bansalshubham662@gmail.com');
  const [contactPhone, setContactPhone] = useState(currentUser.phone || '+91 98765 43210');
  const [gstin, setGstin] = useState('07AABCA1234F1Z8');
  const [notes, setNotes] = useState('Looking to equip 15 workstation studios with acoustic gear by month end. Requesting expedited logistics.');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState('');

  if (!isOpen || !product) return null;

  // Tiered volume discount calculation
  let discountPercent = 15;
  if (quantity >= 50) {
    discountPercent = 30;
  } else if (quantity >= 25) {
    discountPercent = 22;
  }

  const standardUnitPaise = product.pricePaise;
  const wholesaleUnitPaise = Math.round(standardUnitPaise * (1 - discountPercent / 100));
  const standardTotalPaise = standardUnitPaise * quantity;
  const wholesaleTotalPaise = wholesaleUnitPaise * quantity;
  const totalSavingsPaise = standardTotalPaise - wholesaleTotalPaise;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ticketId = `B2B-INQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const inquiry: BulkOrderInquiry = {
      id: ticketId,
      productId: product.id,
      productTitle: product.title,
      brand: product.brand,
      sellerStoreName: product.seller.storeName,
      quantity,
      offeredUnitPaise: wholesaleUnitPaise,
      standardPricePaise: standardUnitPaise,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      gstin: gstin.trim() ? gstin.trim() : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      createdAt: 'Just now',
      status: 'Pending Review',
    };

    onSubmitInquiry(inquiry);
    setGeneratedTicket(ticketId);
    setIsSubmitted(true);
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={handleResetAndClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Wholesale & Bulk Order Inquiry</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  B2B Direct
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Negotiate tiered volume pricing directly with {product.seller.storeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
            aria-label="Close wholesale modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isSubmitted ? (
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Wholesale Inquiry Dispatched!
              </h3>
              <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                Reference Ticket: {generatedTicket}
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
              Your inquiry for <strong>{quantity} units</strong> of <strong>{product.title}</strong> has been transmitted to <strong>{product.seller.storeName}</strong>'s commercial team. A formal proforma quotation and delivery contract will be dispatched to <strong>{contactEmail}</strong> within 4 business hours.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Back to Catalog
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            {/* Product & Current Inventory Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <SafeImage
                src={product.image}
                alt={product.title}
                fallbackLabel={product.brand}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono uppercase text-cyan-600 dark:text-cyan-400 font-bold block">
                  {product.brand} · In Stock ({product.stock} units available)
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {product.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span>Standard MRP: <strong>{formatCurrencyINR(standardUnitPaise)}</strong></span>
                  <span>·</span>
                  <span>Verified Merchant: <strong>{product.seller.storeName}</strong></span>
                </div>
              </div>
            </div>

            {/* Quantity Slider & Volume Tier Calculator */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-cyan-50/40 dark:from-indigo-950/20 dark:to-cyan-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Select Bulk Quantity</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Minimum wholesale batch: 10 units
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-600 text-white shadow-xs">
                    {quantity} units
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {discountPercent}% OFF
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={10}
                max={Math.max(product.stock, 100)}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-slate-500">
                <div className={`p-1.5 rounded-lg border text-center ${quantity < 25 ? 'border-indigo-500 bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400' : 'border-transparent'}`}>
                  10–24 units (15% OFF)
                </div>
                <div className={`p-1.5 rounded-lg border text-center ${quantity >= 25 && quantity < 50 ? 'border-indigo-500 bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400' : 'border-transparent'}`}>
                  25–49 units (22% OFF)
                </div>
                <div className={`p-1.5 rounded-lg border text-center ${quantity >= 50 ? 'border-indigo-500 bg-white dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400' : 'border-transparent'}`}>
                  50+ units (30% OFF)
                </div>
              </div>

              {/* Pricing breakdown preview */}
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Proposed Unit Price</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {formatCurrencyINR(wholesaleUnitPaise)}
                  </span>
                  <span className="text-[10px] line-through text-slate-400 ml-1.5 font-mono">
                    {formatCurrencyINR(standardUnitPaise)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Estimated Total Savings</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Save {formatCurrencyINR(totalSavingsPaise)}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    Lot Total: {formatCurrencyINR(wholesaleTotalPaise)}
                  </span>
                </div>
              </div>
            </div>

            {/* Business Contact Form Fields */}
            <div className="space-y-3 text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                Company & Buyer Particulars
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Business / Studio Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Media Corp LLP"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    GSTIN / Tax ID (Optional for GST Input Credit)
                  </label>
                  <div className="relative">
                    <FileCheck className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Contact Person
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Delivery Window & Wholesale Negotiation Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mention delivery deadlines, custom packaging requirements, or payment terms..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Wholesale Inquiry ({quantity} Units)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
