import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  Heart,
  ShoppingBag,
  Check,
  Layers,
  ArrowLeftRight,
  Bell,
  MessageSquare,
  Share2,
  Building2,
  HelpCircle,
  Send,
} from 'lucide-react';
import { CatalogProduct, UserReview, UserProfile, BulkOrderInquiry } from '../types/index.js';
import { formatCurrencyINR, calculateDiscountPercentage } from '../utils/formatters.js';
import { buildProductImageCandidates } from '../utils/imageLoader.js';
import { buildProductFaqSchema, ProductFaqItem } from '../utils/commerceFeatures.js';
import { CustomerReviews } from './CustomerReviews.js';
import { SocialSharePanel } from './SocialSharePanel.js';
import { BulkOrderInquiryModal } from './BulkOrderInquiryModal.js';
import { SafeImage } from './SafeImage.js';

interface QuickViewModalProps {
  product: CatalogProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: CatalogProduct, quantity: number) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: CatalogProduct) => void;
  isCompared?: boolean;
  onToggleCompare?: (product: CatalogProduct) => void;
  onOpenPriceAlert?: (product: CatalogProduct) => void;
  reviews?: UserReview[];
  onSubmitReview?: (review: Omit<UserReview, 'id' | 'date' | 'helpfulCount'>) => void;
  currentUser?: UserProfile;
  onSubmitBulkInquiry?: (inquiry: BulkOrderInquiry) => void;
}

function getDefaultFaqsForProduct(product: CatalogProduct): ProductFaqItem[] {
  return [
    {
      id: `${product.id}-faq-1`,
      question: `Does ${product.title} include a GST tax invoice and manufacturer warranty in India?`,
      answer: `Yes, all orders include an 18% GST compliant tax invoice issued by ${product.seller.storeName} (${product.seller.city}) along with full 1-year verified studio warranty.`,
      answeredBy: product.seller.storeName,
      helpfulVotes: 19,
    },
    {
      id: `${product.id}-faq-2`,
      question: 'What is the return policy and delivery timeline for metro pin codes?',
      answer:
        'Dispatched within 24 hours via BlueDart Air Apex or Delhivery Express. Eligible for a 7-day hassle-free doorstep pickup return.',
      answeredBy: 'NEXORA Verified Support',
      helpfulVotes: 14,
    },
  ];
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  isWishlisted = false,
  onToggleWishlist,
  isCompared = false,
  onToggleCompare,
  onOpenPriceAlert,
  reviews = [],
  onSubmitReview,
  currentUser,
  onSubmitBulkInquiry,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'share'>('specs');
  const [showBulkInquiry, setShowBulkInquiry] = useState(false);
  const [customFaqsByProduct, setCustomFaqsByProduct] = useState<Record<string, ProductFaqItem[]>>({});
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setActiveTab('specs');
    setShowBulkInquiry(false);
  }, [product?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showBulkInquiry) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, showBulkInquiry, onClose]);

  if (!isOpen || !product) return null;

  const defaultAddr = currentUser?.addresses?.find((a) => a.isDefault) || currentUser?.addresses?.[0];

  const images = buildProductImageCandidates(product.image, product.images);
  const activeImage = images[selectedImageIndex] || product.image;
  const fallbackGallery = images.filter((img) => img !== activeImage);

  const discountPercent = product.originalPricePaise
    ? calculateDiscountPercentage(product.originalPricePaise, product.pricePaise)
    : 0;

  const productReviews = reviews.filter((r) => r.productId === product.id);
  const productFaqs = [
    ...getDefaultFaqsForProduct(product),
    ...(customFaqsByProduct[product.id] || []),
  ];
  const faqSchema = buildProductFaqSchema(product, productFaqs);

  const isSoldOut = product.stock <= 0;

  const handleAdd = () => {
    if (isSoldOut) return;
    setIsAdded(true);
    onAddToCart(product, Math.min(quantity, product.stock));
    setTimeout(() => {
      setIsAdded(false);
    }, 1800);
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newQuestion.trim();
    if (!trimmed) return;

    const newItem: ProductFaqItem = {
      id: `faq-${Date.now()}`,
      question: trimmed.endsWith('?') ? trimmed : `${trimmed}?`,
      answer: `Submitted to ${product.seller.storeName} (${product.seller.city}). Verified studio specialists typically respond within 2 business hours.`,
      answeredBy: 'Community Queue · Pending Studio Reply',
      helpfulVotes: 1,
    };

    setCustomFaqsByProduct((prev) => ({
      ...prev,
      [product.id]: [...(prev[product.id] || []), newItem],
    }));
    setNewQuestion('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row max-h-[92vh] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 p-2 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-700 shadow-sm transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: Large Photo Gallery */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 shrink-0">
          {/* Main Photo View */}
          <div className="relative h-56 sm:h-64 md:h-auto md:aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-inner shrink-0">
            <SafeImage
              src={activeImage}
              fallbackSrcs={fallbackGallery}
              alt={product.title}
              fallbackLabel={product.brand}
              loading="eager"
              className="w-full h-full object-cover transition-all duration-300"
            />

            {discountPercent > 0 && (
              <span className="absolute top-3.5 left-3.5 text-xs font-mono font-bold tracking-wider px-2.5 py-1 rounded-lg bg-rose-600 text-white shadow-md">
                {discountPercent}% OFF
              </span>
            )}

            {/* Quick compare, alert & share overlays positioned bottom-right so they never collide with modal Close button */}
            <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('share')}
                className={`p-2 rounded-xl shadow-md backdrop-blur-xs cursor-pointer transition-colors ${
                  activeTab === 'share'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-cyan-500'
                }`}
                title="Share product with network"
                aria-label="Share product with network"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {onOpenPriceAlert && (
                <button
                  type="button"
                  onClick={() => onOpenPriceAlert(product)}
                  className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-cyan-500 shadow-md backdrop-blur-xs cursor-pointer"
                  title="Set Price Alert"
                  aria-label="Set Price Alert"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}
              {onToggleCompare && (
                <button
                  type="button"
                  onClick={() => onToggleCompare(product)}
                  className={`p-2 rounded-xl shadow-md backdrop-blur-xs cursor-pointer transition-colors ${
                    isCompared
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-cyan-500'
                  }`}
                  title={isCompared ? 'Remove from comparison' : 'Compare with other products'}
                  aria-label={isCompared ? 'Remove from comparison' : 'Compare with other products'}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Thumbnails Gallery */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                      : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${product.title} thumbnail ${idx + 1}`}
                    fallbackLabel={product.brand}
                    compactFallback
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Seller / Verified Card */}
          <div className="mt-4 p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white block truncate">
                  {product.seller.storeName}
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Verified Merchant · {product.seller.city}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
              <span>{product.seller.rating}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Product Details, Tabs & Purchase */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 md:overflow-y-auto flex flex-col justify-between space-y-5">
          <div>
            {/* Header: Category & Rating */}
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600 dark:text-slate-400 mb-2 md:pr-10">
              <span className="uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400">
                {product.category}
              </span>
              <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 shrink-0">
                <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
                <span className="font-bold">{product.rating}</span>
                <span className="text-slate-600 dark:text-slate-400">({product.reviewCount} reviews)</span>
              </div>
            </div>

            {/* Title & Tagline */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {product.title}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{product.tagline}</p>

            {/* Price Row */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {formatCurrencyINR(product.pricePaise)}
                </span>
                {product.originalPricePaise && (
                  <span className="ml-2 text-xs line-through text-slate-600 dark:text-slate-400 font-mono">
                    {formatCurrencyINR(product.originalPricePaise)}
                  </span>
                )}
                <span className="block text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Inclusive of 18% GST (HSN: {product.categorySlug === 'smartphones' ? '85171300' : '85183000'})
                </span>
              </div>
              {isSoldOut ? (
                <span className="text-[11px] font-mono font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded shrink-0">
                  Out of Stock
                </span>
              ) : (
                <span className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded shrink-0">
                  In Stock ({product.stock} units)
                </span>
              )}
            </div>

            {/* High Inventory B2B Bulk Order Inquiry Banner */}
            {product.stock >= 10 && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-indigo-50/80 to-cyan-50/80 dark:from-indigo-950/40 dark:to-cyan-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-2 text-xs shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-indigo-500 text-white shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 block text-[11px]">
                      High Inventory · B2B Wholesale Tier Available
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400">
                      Tiered bulk discounts from 15% to 30% for commercial orders
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBulkInquiry(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Bulk Inquiry →
                </button>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            <div className="mt-4 flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'specs'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Overview & Specs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'reviews'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Reviews ({productReviews.length || product.reviewCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('share')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'share'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Share</span>
              </button>
            </div>

            {/* TAB 1: SPECS, OVERVIEW & COMMUNITY Q&A */}
            {activeTab === 'specs' && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {product.description}
                </p>

                {/* Technical Specifications Table */}
                {product.specs && Object.keys(product.specs).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                      <span>Technical Specifications</span>
                    </h4>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {Object.entries(product.specs).map(([specKey, specVal]) => (
                        <div key={specKey} className="px-3.5 py-2 flex items-center justify-between gap-3">
                          <span className="text-slate-600 dark:text-slate-400">{specKey}</span>
                          <span className="font-medium text-slate-900 dark:text-white text-right">
                            {specVal}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Promise */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900 text-xs text-cyan-900 dark:text-cyan-300">
                  <Truck className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" />
                  <span>
                    Free Express Delivery to{' '}
                    <strong className="font-semibold">
                      {defaultAddr ? `${defaultAddr.city} (${defaultAddr.pinCode})` : 'New Delhi (110001)'}
                    </strong>
                    . Doorstep tracking with BlueDart.
                  </span>
                </div>

                {/* Inline Quick Share Trigger */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                    <span>Share with Creators &amp; Network</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('share')}
                    className="px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors cursor-pointer"
                  >
                    Copy Link &amp; Socials →
                  </button>
                </div>

                {/* Community Q&A + FAQPage JSON-LD Structured Data */}
                <div className="pt-2 space-y-3">
                  <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                  />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                    <span>Community Q&amp;A ({productFaqs.length})</span>
                  </h4>

                  <div className="space-y-2">
                    {productFaqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs space-y-1"
                      >
                        <p className="font-semibold text-slate-900 dark:text-white">
                          Q: {faq.question}
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          A: {faq.answer}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 pt-0.5">
                          <span>Answered by {faq.answeredBy}</span>
                          <span>{faq.helpfulVotes} found helpful</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAskQuestion} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Ask the studio or verified buyers a question..."
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Send className="w-3 h-3" />
                      <span>Ask</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: VERIFIED CUSTOMER REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="mt-4">
                <CustomerReviews
                  productId={product.id}
                  productTitle={product.title}
                  reviews={productReviews}
                  onSubmitReview={onSubmitReview || (() => {})}
                />
              </div>
            )}

            {/* TAB 3: SOCIAL MEDIA SHARING */}
            {activeTab === 'share' && (
              <div className="mt-4">
                <SocialSharePanel product={product} />
              </div>
            )}
          </div>

          {/* Action Row: Quantity + Add to Bag + Wishlist */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
            {/* Quantity Selector */}
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 text-xs">
              <button
                type="button"
                disabled={isSoldOut || quantity <= 1}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-white">
                {isSoldOut ? 0 : quantity}
              </span>
              <button
                type="button"
                disabled={isSoldOut || quantity >= product.stock}
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {/* Add to Bag Button */}
            <button
              type="button"
              disabled={isSoldOut}
              onClick={handleAdd}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
                isSoldOut
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                  : isAdded
                  ? 'bg-emerald-600 text-white cursor-pointer'
                  : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 cursor-pointer'
              }`}
            >
              {isSoldOut ? (
                <span>Sold Out</span>
              ) : isAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added {quantity} to Bag</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag · {formatCurrencyINR(product.pricePaise * quantity)}</span>
                </>
              )}
            </button>

            {/* Wishlist Toggle Button */}
            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(product)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isWishlisted
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wholesale Bulk Order Inquiry Modal */}
      {showBulkInquiry && (
        <BulkOrderInquiryModal
          isOpen={showBulkInquiry}
          onClose={() => setShowBulkInquiry(false)}
          product={product}
          currentUser={
            currentUser || {
              id: 'usr-guest',
              name: 'Guest Customer',
              email: 'guest@nexora.market',
              phone: '+91 98765 43210',
              role: 'customer',
              cartCount: 0,
              wishlistCount: 0,
              loyaltyPoints: 0,
              tier: 'Silver',
              addresses: [],
              orders: [],
            }
          }
          onSubmitInquiry={(inquiry) => {
            if (onSubmitBulkInquiry) {
              onSubmitBulkInquiry(inquiry);
            }
          }}
        />
      )}
    </div>
  );
};
