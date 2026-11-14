import React from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { CatalogProduct } from '../types/index.js';
import { SafeImage } from './SafeImage.js';

interface CompareFloatingDockProps {
  products: CatalogProduct[];
  onOpenCompare: () => void;
  onClearAll: () => void;
  onRemoveProduct: (id: string) => void;
}

export const CompareFloatingDock: React.FC<CompareFloatingDockProps> = ({
  products,
  onOpenCompare,
  onClearAll,
  onRemoveProduct,
}) => {
  if (products.length === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-1.5rem)] sm:w-auto max-w-xl bg-slate-900/95 dark:bg-[#0c121e]/95 text-white backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-700/80 dark:border-cyan-500/30 shadow-2xl flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-bold leading-tight">Compare Products</p>
          <p className="text-[10px] text-slate-400">
            {products.length}/3 selected
          </p>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex items-center gap-1.5">
        {products.map((p) => (
          <div
            key={p.id}
            className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 group"
          >
            <SafeImage src={p.image} alt={p.title} fallbackLabel={p.title} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveProduct(p.id)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {Array.from({ length: 3 - products.length }).map((_, i) => (
          <div
            key={i}
            className="w-10 h-10 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono"
          >
            +{i + 1}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
        <button
          type="button"
          onClick={onOpenCompare}
          className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          Compare Now
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="p-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          title="Clear compare tray"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
