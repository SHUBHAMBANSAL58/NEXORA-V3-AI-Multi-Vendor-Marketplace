import React, { useState } from 'react';
import {
  Star,
  ShieldCheck,
  ShoppingBag,
  Eye,
  Heart,
  Check,
  AlertCircle,
  ArrowLeftRight,
  Bell,
  Share2,
} from 'lucide-react';
import { CatalogProduct } from '../types/index.js';
import { formatCurrencyINR, calculateDiscountPercentage } from '../utils/formatters.js';
import { SafeImage } from './SafeImage.js';

interface ProductCardProps {
  product: CatalogProduct;
  onQuickView: (product: CatalogProduct) => void;
  onAddToCart: (product: CatalogProduct) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: CatalogProduct) => void;
  isCompared?: boolean;
  onToggleCompare?: (product: CatalogProduct) => void;
  onOpenPriceAlert?: (product: CatalogProduct) => void;
  onNotifyToast?: (msg: string) => void;
  priority?: boolean;
}

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(15);
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCart,
  isWishlisted = false,
  onToggleWishlist,
  isCompared = false,
  onToggleCompare,
  onOpenPriceAlert,
  onNotifyToast,
  priority = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [sharedRecently, setSharedRecently] = useState(false);

  const discountPercent = product.originalPricePaise
    ? calculateDiscountPercentage(product.originalPricePaise, product.pricePaise)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setIsAdding(true);
    onAddToCart(product);
    setTimeout(() => {
      setIsAdding(false);
    }, 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    onToggleWishlist?.(product);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nexora.market';
    const shareUrl = `${origin}/?product=${product.id}#${product.categorySlug || 'catalog'}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: product.title,
          text: `${product.title} — ${formatCurrencyINR(product.pricePaise)} on NEXORA`,
          url: shareUrl,
        });
        setSharedRecently(true);
        onNotifyToast?.(`Shared ${product.title}`);
        setTimeout(() => setSharedRecently(false), 2000);
        return;
      }
    } catch {
      // fall through to clipboard
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setSharedRecently(true);
      onNotifyToast?.(`Copied link for ${product.title}`);
      setTimeout(() => setSharedRecently(false), 2000);
    } catch {
      setSharedRecently(true);
      onNotifyToast?.(`Ready to share ${product.title}`);
      setTimeout(() => setSharedRecently(false), 2000);
    }
  };

  return (
    <div
      onClick={() => {
        triggerHaptic();
        onQuickView(product);
      }}
      className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-cyan-500/40 transition-all duration-300 cursor-pointer"
    >
      {/* 1. PHOTOGRAPH & BADGES CONTAINER */}
      <div className="relative w-full aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden">
        <SafeImage
          src={product.image}
          fallbackSrcs={product.images}
          alt={product.title}
          fallbackLabel={product.brand}
          loading={priority ? 'eager' : 'lazy'}
          className="w-full h-full object-cover object-center transform transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Gradient Scrim for Top Badges */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950/50 to-transparent pointer-events-none" />

        {/* Top Badges (Zero-Pill: Clean Geometric Badges) */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center z-10 pointer-events-none">
          {discountPercent > 0 && (
            <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white shadow-xs">
              {discountPercent}% OFF
            </span>
          )}
          {product.tags && product.tags[0] && (
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-900 shadow-xs">
              {product.tags[0]}
            </span>
          )}
        </div>

        {/* Top Right Action Buttons Cluster */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className={`p-2 rounded-xl transition-all shadow-md cursor-pointer ${
              sharedRecently
                ? 'bg-emerald-500 text-white'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-cyan-500 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-xs opacity-0 group-hover:opacity-100'
            }`}
            title="Share product link"
            aria-label={`Share ${product.title}`}
          >
            {sharedRecently ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Price Alert Button */}
          {onOpenPriceAlert && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPriceAlert(product);
              }}
              className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-cyan-500 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-xs shadow-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Set Price Drop Alert"
              aria-label="Set Price Drop Alert"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Compare Toggle Button */}
          {onToggleCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(product);
              }}
              className={`p-2 rounded-xl transition-all shadow-md cursor-pointer ${
                isCompared
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-cyan-500 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-xs opacity-0 group-hover:opacity-100'
              }`}
              title={isCompared ? 'Remove from Compare' : 'Add to Compare'}
              aria-label="Compare product"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlist}
            className={`p-2 rounded-xl transition-all shadow-md cursor-pointer ${
              isWishlisted
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-xs'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Quick View Hover Trigger overlay button */}
        <div className="absolute inset-x-0 bottom-3 px-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-950 text-xs font-semibold shadow-lg flex items-center gap-1.5 backdrop-blur-xs pointer-events-auto">
            <Eye className="w-3.5 h-3.5" />
            Quick Specs
          </span>
        </div>
      </div>

      {/* 2. PRODUCT DETAILS & PRICING */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Metadata Row: Category & Rating */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium truncate max-w-[150px]">{product.category}</span>
            <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-semibold">{product.rating}</span>
              <span className="text-[11px] text-slate-400">({product.reviewCount})</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {product.title}
          </h3>

          {/* Tagline / Subtitle */}
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
            {product.tagline}
          </p>

          {/* Seller / Verified Tag */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3 h-3 text-cyan-500 shrink-0" />
            <span className="truncate">{product.seller.storeName}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="shrink-0">{product.seller.city}</span>
          </div>
        </div>

        {/* Pricing & Add-to-Bag Row */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrencyINR(product.pricePaise)}
              </span>
              {product.originalPricePaise && (
                <span className="text-xs line-through text-slate-400 font-mono">
                  {formatCurrencyINR(product.originalPricePaise)}
                </span>
              )}
            </div>
            {product.stock <= 5 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-2.5 h-2.5" />
                Only {product.stock} left in stock
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              isAdding
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950'
            }`}
            aria-label={`Add ${product.title} to bag`}
          >
            {isAdding ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
