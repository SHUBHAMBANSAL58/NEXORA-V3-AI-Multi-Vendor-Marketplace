import React from 'react';
import { ShieldCheck, Sparkles, Heart } from 'lucide-react';
import { NewsletterSubscribe } from './NewsletterSubscribe.js';

interface FooterProps {
  onNotifyToast?: (message: string) => void;
  onSelectCategory?: (categorySlug: string) => void;
  onOpenUserAccount?: (tab?: 'profile' | 'addresses' | 'orders' | 'login') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNotifyToast,
  onSelectCategory,
  onOpenUserAccount,
}) => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#060911] text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 1. SUBSCRIBE TO NEWSLETTER SECTION */}
        <NewsletterSubscribe onNotifyToast={onNotifyToast} className="mb-12" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                N
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                NEXORA V3
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              India's premier AI-powered multi-vendor e-commerce marketplace. Connecting verified Indian creators, studios, and labs with discerning patrons.
            </p>
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-cyan-500" />
              <span>Razorpay Test Gateway · 100% Buyer Protection</span>
            </div>
          </div>

          {/* Column 1: Marketplace */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3">
              Marketplace
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#featured-section"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory?.('audio');
                  }}
                  className="hover:text-cyan-500 transition-colors"
                >
                  Acoustics & Audio
                </a>
              </li>
              <li>
                <a
                  href="#featured-section"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory?.('keyboards');
                  }}
                  className="hover:text-cyan-500 transition-colors"
                >
                  Mechanical Keyboards
                </a>
              </li>
              <li>
                <a
                  href="#featured-section"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory?.('watches');
                  }}
                  className="hover:text-cyan-500 transition-colors"
                >
                  Precision Timepieces
                </a>
              </li>
              <li>
                <a
                  href="#featured-section"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory?.('workspace');
                  }}
                  className="hover:text-cyan-500 transition-colors"
                >
                  Workspace Ergonomics
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Creator & Vendor Hub */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3">
              Sellers & Studios
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onOpenUserAccount?.('profile');
                    onNotifyToast?.('Use One-Click Role Switcher to preview Seller Central.');
                  }}
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  Apply as Seller
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenUserAccount?.('profile')}
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  Seller Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNotifyToast?.('Verified Vendor Commission: 8%–12% transparent fee with zero hidden charges.')
                  }
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  Commission Structure
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNotifyToast?.('Pan-India BlueDart Air & Delhivery Express: Free over ₹999.')
                  }
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  Shipping Guidelines
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Policies */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3">
              Consumer Trust
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNotifyToast?.('7-Day Hassle-Free Return Policy with doorstep courier pickup.')
                  }
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  Return Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onOpenUserAccount?.('orders');
                    onNotifyToast?.('18% GST Tax Invoices can be downloaded for every order.');
                  }}
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  GST Invoicing
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNotifyToast?.('NEXORA Buyer Protection & Escrow Terms active.')}
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNotifyToast?.('Zero third-party ad tracking. Local & session encrypted.')}
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 NEXORA Marketplace Inc. Built with Four-Agent Engineering Architecture.</p>
          <div className="flex items-center gap-4">
            <span>Primary Market: India (₹ INR)</span>
            <span aria-hidden="true">·</span>
            <span>All Prices Inclusive of GST</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
