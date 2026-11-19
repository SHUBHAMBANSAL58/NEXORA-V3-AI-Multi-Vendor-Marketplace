import React, { useState } from 'react';
import { Clock, Check, Plus } from 'lucide-react';
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
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  if (products.length === 0) return null;

  const handleAdd = (product: CatalogProduct) => {
    if (product.stock <= 0) return;
    onAddToCart(product);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  return (
    <div className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recently Viewed Products
          </h3>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">({products.length})</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => {
          const isSoldOut = product.stock <= 0;
          const isAdded = !!addedIds[product.id];
          return (
            <article
              key={product.id}
              className="group p-3 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200/90 dark:border-slate-800/90 hover:border-cyan-500/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <button
                type="button"
                onClick={() => onQuickView(product)}
                className="text-left w-full cursor-pointer"
                aria-label={`Quick view ${product.title}`}
              >
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 mb-2.5">
                  <SafeImage
                    src={product.image}
                    fallbackSrcs={product.images}
                    alt={product.title}
                    fallbackLabel={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  {product.brand}
                </span>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
                  {product.title}
                </h4>
              </button>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrencyINR(product.pricePaise)}
                </span>
                <button
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => handleAdd(product)}
                  aria-label={isSoldOut ? `${product.title} is sold out` : `Add ${product.title} to bag`}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isSoldOut
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                      : isAdded
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 cursor-pointer'
                  }`}
                >
                  {isSoldOut ? (
                    <span>Sold Out</span>
                  ) : isAdded ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
