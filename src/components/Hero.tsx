import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Shield,
  Layers,
  Flame,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { FEATURED_PRODUCT } from '../data/mockData.js';
import { FeaturedProductCard } from './FeaturedProductCard.js';
import { ProductVariant, Product } from '../types/index.js';

interface HeroProps {
  onAddToCart: (variant: ProductVariant) => void;
  onExploreCatalog: () => void;
  onOpenNovaAssistant?: () => void;
  onAddToWishlist?: (product: Product) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onAddToCart,
  onExploreCatalog,
  onOpenNovaAssistant,
  onAddToWishlist,
}) => {
  const [backdropTheme, setBackdropTheme] = useState<'obsidian' | 'aurora' | 'minimal'>(
    'obsidian'
  );

  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-100 min-h-[560px] flex flex-col justify-center">
      {/* =========================================================================
          BACKGROUND IMAGE PLACEHOLDER (Engineered with Pure Tailwind CSS)
          Atmospheric studio backdrop with ambient glow, geometric radial scrim,
          and architectural depth layers without fragile external dependencies.
          ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        {/* Layer 1: Base Gradient Field */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            backdropTheme === 'obsidian'
              ? 'bg-gradient-to-b from-[#060911] via-[#090f1d] to-[#04060a]'
              : backdropTheme === 'aurora'
              ? 'bg-gradient-to-tr from-[#031124] via-[#071d2c] to-[#0a0f1d]'
              : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black'
          }`}
        />

        {/* Layer 2: Geometric Dot Grid Texture Overlay */}
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(56,189,248,0.25)_1px,transparent_1px)] [background-size:28px_28px]" />

        {/* Layer 3: Atmospheric Volumetric Light Cones */}
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-20 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[150px]" />
        <div className="absolute -bottom-32 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[130px]" />

        {/* Layer 4: Architectural Vignette & Bottom Edge Scrim */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/80" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Backdrop Switcher Controls (Demonstrating Tailwind background flexibility) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 min-w-0">
            <span className="text-cyan-400 font-semibold uppercase tracking-wider text-[10px]">
              Studio Atmosphere
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <div className="inline-flex flex-wrap items-center p-0.5 bg-slate-900/80 border border-slate-800 rounded-lg max-w-full">
              <button
                type="button"
                onClick={() => setBackdropTheme('obsidian')}
                className={`px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
                  backdropTheme === 'obsidian'
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Obsidian Deep
              </button>
              <button
                type="button"
                onClick={() => setBackdropTheme('aurora')}
                className={`px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
                  backdropTheme === 'aurora'
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Aurora Cyan
              </button>
              <button
                type="button"
                onClick={() => setBackdropTheme('minimal')}
                className={`px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
                  backdropTheme === 'minimal'
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Graphite
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Over 2,400 orders placed in India today</span>
          </div>
        </div>

        {/* 2-Column Split Hero Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: HERO HEADLINE & CALLS TO ACTION */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Editorial Kicker (Zero-Pill Compliance) */}
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>NEXORA V3 PREMIER MARKETPLACE</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">DIRECT FROM VERIFIED STUDIOS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] text-balance">
              Discover More.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
                Shop Smarter.
              </span>{' '}
              Experience Beyond.
            </h1>

            {/* Sub-headline Prose */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              India's premier multi-vendor e-commerce destination. Connecting verified acoustic labs,
              artisanal mechanical workshops, and designer studios directly with discerning buyers.
              Zero counterfeit risk, transparent GST pricing, and Razorpay-protected settlements.
            </p>

            {/* CALL TO ACTION BUTTONS */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              {/* Primary Call to Action Button */}
              <button
                type="button"
                onClick={onExploreCatalog}
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Secondary Call to Action Button */}
              <button
                type="button"
                onClick={() => {
                  const elem = document.getElementById('featured-section');
                  elem?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-medium text-sm rounded-xl backdrop-blur-xs transition-colors cursor-pointer"
              >
                <span>Meet Verified Studios</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>

              {/* NOVA AI Quick Access Button */}
              <button
                type="button"
                onClick={onOpenNovaAssistant}
                className="inline-flex items-center gap-1.5 px-4 py-3.5 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 text-cyan-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ask NOVA AI</span>
              </button>
            </div>

            {/* Key Trust Checkmarks */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Free Pan-India Delivery &gt; ₹999</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Razorpay Test Gateway Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>7-Day Return Guarantee</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: FEATURED PRODUCT DISPLAY */}
          <div className="lg:col-span-5 relative">
            <div className="relative">
              {/* Background ambient ring behind card */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/25 to-blue-600/25 rounded-3xl blur-xl opacity-75 pointer-events-none" />
              
              {/* Featured Product Display Component */}
              <FeaturedProductCard
                product={FEATURED_PRODUCT}
                onAddToCart={onAddToCart}
                onAddToWishlist={(p) => onAddToWishlist?.(p)}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
