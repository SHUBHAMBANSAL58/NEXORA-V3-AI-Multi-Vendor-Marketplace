import React, { useState } from 'react';
import {
  Star,
  ShieldCheck,
  Truck,
  Check,
  ShoppingBag,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Product, ProductVariant } from '../types/index.js';
import { formatCurrencyINR, calculateDiscountPercentage } from '../utils/formatters.js';
import { SafeImage } from './SafeImage.js';

interface FeaturedProductCardProps {
  product: Product;
  onAddToCart: (variant: ProductVariant) => void;
  onAddToWishlist: (product: Product) => void;
}

export const FeaturedProductCard: React.FC<FeaturedProductCardProps> = ({
  product,
  onAddToCart,
  onAddToWishlist,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0]
  );
  const [isAdded, setIsAdded] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);

  const discountPercent = calculateDiscountPercentage(
    selectedVariant.originalPricePaise || 0,
    selectedVariant.pricePaise
  );

  const handleAdd = () => {
    setIsAdded(true);
    onAddToCart(selectedVariant);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <div className="relative group rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-cyan-950/10 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-cyan-500/40">
      {/* Decorative ambient corner glow */}
      <div
        className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 transition-all pointer-events-none"
        style={{ backgroundColor: selectedVariant.colorHex === '#0c0f17' ? '#06b6d4' : selectedVariant.colorHex }}
      />

      {/* Top Banner: Marketplace Pick & Seller Attribution */}
      <div className="px-5 pt-4 pb-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Spotlight Release
          </span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
            {product.brand}
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-mono">{product.rating}</span>
          <span className="text-slate-400 dark:text-slate-500">({product.reviewCount})</span>
        </div>
      </div>

      {/* Product Visual Area with Real High-Resolution Studio Photograph */}
      <div className="relative p-4 flex flex-col items-center justify-center bg-radial from-slate-100 to-slate-200/50 dark:from-slate-800/40 dark:to-slate-950/60 overflow-hidden min-h-[195px] sm:min-h-[215px]">
        {/* Real Product Photograph */}
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 ease-out">
          <SafeImage
            src={
              selectedVariant.id === 'var-obsidian'
                ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
                : selectedVariant.id === 'var-cyan'
                ? 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
                : 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80'
            }
            alt={`${product.title} - ${selectedVariant.name}`}
            fallbackLabel={product.title}
            className="w-full h-full object-cover rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-800/80 transition-all duration-300"
          />

          {/* Active Colorway Tag */}
          <div className="absolute bottom-2 px-3 py-1 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-xs flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border border-slate-400"
              style={{ backgroundColor: selectedVariant.colorHex }}
            />
            <span>{selectedVariant.name}</span>
          </div>
        </div>
      </div>

      {/* Product Details & Actions */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Title and Short Description */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {product.title}
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              SKU: {selectedVariant.sku}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {product.tagline}
          </p>
        </div>

        {/* Pricing & Stock Status */}
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formatCurrencyINR(selectedVariant.pricePaise)}
            </span>
            {selectedVariant.originalPricePaise && (
              <span className="text-xs text-slate-400 line-through font-mono">
                {formatCurrencyINR(selectedVariant.originalPricePaise)}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {selectedVariant.inventoryCount} units left
            </span>
          </div>
        </div>

        {/* Variant Selector: Color Choices */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
            <span>Colorway</span>
            <span className="text-slate-500 font-normal">{selectedVariant.name}</span>
          </label>
          <div className="flex items-center gap-2">
            {product.variants.map((v) => {
              const isSelected = v.id === selectedVariant.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-slate-400"
                    style={{ backgroundColor: v.colorHex }}
                  />
                  <span>{v.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Seller Info & Shipping Note */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
              <span>Fulfilled by {product.seller.storeName}</span>
            </span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
              GST Verified
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <span>Free Express Delivery to Delhi (110001) by Tomorrow</span>
          </div>
        </div>

        {/* Action Buttons: Add to Bag & Quick Specs */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdded}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-md cursor-pointer ${
              isAdded
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-cyan-500/25 active:scale-[0.98]'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added to Bag</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Bag · {formatCurrencyINR(selectedVariant.pricePaise)}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSpecs(!showSpecs)}
            className="p-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle technical specifications"
            title="View Specifications"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Tech Specs Drawer */}
        {showSpecs && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 animate-in fade-in duration-200">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">
              Engineering Specs:
            </div>
            {product.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-cyan-500 shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
