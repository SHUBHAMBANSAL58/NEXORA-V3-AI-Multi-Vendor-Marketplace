import React from 'react';
import { X, Check, Trash2, ShoppingBag, ArrowLeftRight, Star, ShieldCheck, Truck } from 'lucide-react';
import { CatalogProduct } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';
import { buildSpecificationMatrix } from '../utils/commerceFeatures.js';
import { SafeImage } from './SafeImage.js';

interface ProductCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CatalogProduct[];
  onRemoveProduct: (productId: string) => void;
  onAddToCart: (product: CatalogProduct) => void;
  onClearAll: () => void;
}

export const ProductCompareModal: React.FC<ProductCompareModalProps> = ({
  isOpen,
  onClose,
  products,
  onRemoveProduct,
  onAddToCart,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const specMatrix = buildSpecificationMatrix(products);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Side-by-Side Product Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Comparing {products.length} of 3 maximum products
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {products.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Close comparison modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {products.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <ArrowLeftRight className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No products selected for comparison
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click the "Compare" button on any product card in the catalog to add up to 3 products and evaluate specifications side-by-side.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Cards Row */}
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
                }}
              >
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between relative group"
                  >
                    <button
                      type="button"
                      onClick={() => onRemoveProduct(product.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 shadow-xs cursor-pointer z-10"
                      title="Remove product from comparison"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 mb-3">
                        <SafeImage
                          src={product.image}
                          alt={product.title}
                          fallbackLabel={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        {product.brand}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                        {product.title}
                      </h4>
                      <div className="mt-2 flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrencyINR(product.pricePaise)}
                        </span>
                        {product.originalPricePaise && (
                          <span className="line-through text-slate-400 text-[11px]">
                            {formatCurrencyINR(product.originalPricePaise)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {product.rating}
                        </span>
                        <span>({product.reviewCount} reviews)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddToCart(product)}
                      className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Bag</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* General Highlights Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Core Logistics & Attributes
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {/* Category */}
                  <div className="grid grid-cols-4 p-3 bg-white dark:bg-slate-900/60">
                    <span className="font-semibold text-slate-500 col-span-1">Category</span>
                    <div
                      className="col-span-3 grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {products.map((p) => (
                        <span key={p.id} className="text-slate-800 dark:text-slate-200 truncate">
                          {p.category}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div className="grid grid-cols-4 p-3 bg-slate-50/50 dark:bg-slate-900/40">
                    <span className="font-semibold text-slate-500 col-span-1">Availability</span>
                    <div
                      className="col-span-3 grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {products.map((p) => (
                        <span
                          key={p.id}
                          className="font-medium text-emerald-600 dark:text-emerald-400"
                        >
                          ✓ In Stock ({p.stock} units)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Seller */}
                  <div className="grid grid-cols-4 p-3 bg-white dark:bg-slate-900/60">
                    <span className="font-semibold text-slate-500 col-span-1">Seller Partner</span>
                    <div
                      className="col-span-3 grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {products.map((p) => (
                        <div key={p.id} className="text-slate-800 dark:text-slate-200">
                          <p className="font-medium truncate">{p.seller.storeName}</p>
                          <p className="text-[10px] text-slate-500">{p.seller.city}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="grid grid-cols-4 p-3 bg-slate-50/50 dark:bg-slate-900/40">
                    <span className="font-semibold text-slate-500 col-span-1">Delivery</span>
                    <div
                      className="col-span-3 grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {products.map((p) => (
                        <span
                          key={p.id}
                          className="text-cyan-700 dark:text-cyan-300 font-medium flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5 shrink-0" />
                          <span>Express (1-2 Days)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Matrix */}
              {specMatrix.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Technical Specifications Matrix
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {specMatrix.map((row, idx) => (
                      <div
                        key={row.key}
                        className={`grid grid-cols-4 p-3 ${
                          idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900/60'
                            : 'bg-slate-50/50 dark:bg-slate-900/40'
                        }`}
                      >
                        <span className="font-semibold text-slate-500 col-span-1 truncate">
                          {row.label}
                        </span>
                        <div
                          className="col-span-3 grid gap-4"
                          style={{
                            gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`,
                          }}
                        >
                          {products.map((p) => (
                            <span
                              key={p.id}
                              className="text-slate-800 dark:text-slate-200 font-medium"
                            >
                              {row.values[p.id] || '—'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
