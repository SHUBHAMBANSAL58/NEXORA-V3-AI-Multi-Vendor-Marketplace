import React from 'react';
import { Clock, Eye, ShoppingBag, ArrowRight } from 'lucide-react';
import { CatalogProduct } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { SafeImage } from './SafeImage.js';

interface RecentlyViewedProps {
  products: CatalogProduct[];
  onQuickView: (product: CatalogProduct) => void;
  onAddToCart: (product: CatalogProduct) => void;
  onClear: () => void;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  products,
  onQuickView,
  onAddToCart,
  onClear,
}) => {
  if (products.length === 0) return null;

  return (
    <div className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recently Viewed Engineering
          </h3>
          <span className="text-xs text-slate-500 font-mono">({products.length})</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            onClick={() => onQuickView(product)}
            className="group p-3 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200/90 dark:border-slate-800/90 hover:border-cyan-500/40 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 mb-2.5">
                <SafeImage
                  src={product.image}
                  alt={product.title}
                  fallbackLabel={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                {product.brand}
              </span>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-cyan-500 transition-colors">
                {product.title}
              </h4>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrencyINR(product.pricePaise)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-cyan-500 dark:hover:text-slate-950 transition-colors cursor-pointer"
                title="Add to bag"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
