import React from 'react';
import { X, Heart, ShoppingBag, Trash2, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { CatalogProduct } from '../types/index.js';
import { PRODUCTS_CATALOG } from '../data/productsCatalog.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { SafeImage } from './SafeImage.js';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistedIds: Set<string>;
  products?: CatalogProduct[];
  onRemoveWishlist: (product: CatalogProduct) => void;
  onAddToCart: (product: CatalogProduct) => void;
  onMoveAllToCart: (products: CatalogProduct[]) => void;
  onQuickView: (product: CatalogProduct) => void;
  onClearWishlist: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistedIds,
  products,
  onRemoveWishlist,
  onAddToCart,
  onMoveAllToCart,
  onQuickView,
  onClearWishlist,
}) => {
  if (!isOpen) return null;

  const catalogSource = products && products.length > 0 ? products : PRODUCTS_CATALOG;
  // Resolve wishlisted products from catalog
  const wishlistedProducts = catalogSource.filter((p) => wishlistedIds.has(p.id));

  const totalValuePaise = wishlistedProducts.reduce((sum, item) => sum + item.pricePaise, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-500">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Saved Wishlist</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {wishlistedProducts.length} items saved · {formatCurrencyINR(totalValuePaise)} total value
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            aria-label="Close wishlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {wishlistedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-400">
                <Heart className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Your wishlist is empty</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Save audio gear, mechanical keyboards, smartphones, and smart workspace items while browsing to review or purchase anytime.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  const el = document.getElementById('featured-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-cyan-600 dark:hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                <span>Browse {catalogSource.length} Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            wishlistedProducts.map((product) => (
              <div
                key={product.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex gap-3.5 group"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => onQuickView(product)}
                  className="w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 cursor-pointer relative"
                >
                  <SafeImage
                    src={product.image}
                    alt={product.title}
                    fallbackLabel={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono bg-black/70 text-white backdrop-blur-xs">
                    ★ {product.rating}
                  </span>
                </div>

                {/* Information */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold truncate">
                        {product.brand} · {product.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveWishlist(product)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        title="Remove from wishlist"
                        aria-label={`Remove ${product.title} from wishlist`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4
                      onClick={() => onQuickView(product)}
                      className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                    >
                      {product.title}
                    </h4>

                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-bold text-xs font-mono text-slate-900 dark:text-white">
                        {formatCurrencyINR(product.pricePaise)}
                      </span>
                      {product.originalPricePaise && product.originalPricePaise > product.pricePaise && (
                        <span className="text-[10px] font-mono text-slate-400 line-through">
                          {formatCurrencyINR(product.originalPricePaise)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onAddToCart(product)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Add to Bag</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickView(product)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                      title="Quick View specifications"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Actions */}
        {wishlistedProducts.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2.5">
            <button
              type="button"
              onClick={() => onMoveAllToCart(wishlistedProducts)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Move All ({wishlistedProducts.length}) to Shopping Bag</span>
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={onClearWishlist}
                className="text-slate-500 hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All Items</span>
              </button>

              <span className="text-[11px] text-slate-400 font-mono">
                Free Pan-India Delivery
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
