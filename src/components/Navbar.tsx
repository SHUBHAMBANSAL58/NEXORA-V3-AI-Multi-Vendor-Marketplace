import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Package,
  MapPin,
  Store,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { CATEGORIES, SEARCH_SUGGESTIONS } from '../data/mockData.js';
import { filterItemsByQuery } from '../utils/formatters.js';
import { UserProfile } from '../types/index.js';

interface NavbarProps {
  cartCount: number;
  wishlistCount: number;
  currentUser?: UserProfile;
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
  onSelectCategory?: (categorySlug: string) => void;
  onSearchSubmit?: (query: string) => void;
  onOpenCommandCenter?: () => void;
  onOpenUserAccount?: (tab?: 'profile' | 'addresses' | 'orders' | 'login') => void;
  onOpenNovaAssistant?: () => void;
  onQuickFilter?: (filter: 'top-sellers' | 'new-releases' | 'studio-deals') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  wishlistCount,
  currentUser,
  onOpenCart,
  onOpenWishlist,
  onSelectCategory,
  onSearchSubmit,
  onOpenCommandCenter,
  onOpenUserAccount,
  onOpenNovaAssistant,
  onQuickFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Initialize theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Keyboard shortcut listener ('/' to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchSubmit?.(searchQuery.trim());
      setIsSearchFocused(false);
      setIsMobileSearchActive(false);
    }
  };

  const filteredSuggestions = filterItemsByQuery(SEARCH_SUGGESTIONS, searchQuery);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#070b12]/95 transition-colors">
      {/* Top Notification / Trust Bar */}
      <div className="bg-slate-900 text-slate-300 dark:bg-slate-950 dark:text-slate-400 px-4 py-1 text-xs text-center border-b border-slate-800 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>NEXORA V3 Exclusive Marketplace · Pan-India Express Delivery</span>
          </span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Currency: INR (₹)</span>
            <span aria-hidden="true">·</span>
            <span>Razorpay Secured</span>
            <button
              type="button"
              onClick={onOpenNovaAssistant}
              className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ask NOVA AI</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenCommandCenter}
              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Cpu className="w-3 h-3" />
              <span>4-Agent Command Center</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4 lg:gap-8">
          
          {/* ZONE 1: BRAND LOGO */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="/"
              className="group flex items-center gap-2 sm:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-0.5 sm:p-1"
              aria-label="NEXORA Home"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
                <span className="text-white font-black text-base sm:text-lg tracking-wider">N</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                  NEXORA
                </span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-slate-400 dark:text-slate-500 hidden sm:block">
                  Marketplace
                </span>
              </div>
            </a>
          </div>

          {/* ZONE 2: SEARCH BAR (Desktop) */}
          <div className="flex-1 max-w-2xl hidden md:block relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <label htmlFor="desktop-product-search" className="sr-only">
                Search products, brands, and categories
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="desktop-product-search"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search products, brands, audio, mechanical keyboards..."
                  autoComplete="off"
                  className="w-full pl-10 pr-20 py-2 text-sm bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                      aria-label="Clear search input"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
                    /
                  </kbd>
                </div>
              </div>
            </form>

            {/* Live Search Autocomplete Dropdown */}
            {isSearchFocused && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 transition-all">
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Popular suggestions</span>
                  <span>Press Esc to close</span>
                </div>
                <div className="py-1 max-h-72 overflow-y-auto">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery(item.title);
                          setIsSearchFocused(false);
                          onSearchSubmit?.(item.title);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500" />
                          <span>{item.title}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            in {item.category}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-medium text-cyan-600 dark:text-cyan-400">
                          {item.price}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No matching products found for "{searchQuery}". Try "Aura", "Keyboard", or "Audio".
                    </div>
                  )}
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Looking for custom vendor inventory?</span>
                  <button
                    onClick={() => {
                      setIsSearchFocused(false);
                      onSearchSubmit?.(searchQuery);
                    }}
                    className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all results</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ZONE 3: ACTIONS & USER PROFILE */}
          <div className="flex items-center gap-0.5 sm:gap-2.5 shrink-0">
            
            {/* Mobile Search Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileSearchActive(!isMobileSearchActive)}
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg md:hidden cursor-pointer"
              aria-label="Toggle mobile search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Dark/Light Theme Switch */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />}
            </button>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="relative p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              type="button"
              onClick={onOpenCart}
              className="relative flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-all cursor-pointer"
              aria-label={`Shopping bag with ${cartCount} items`}
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-semibold hidden sm:inline-block">Bag</span>
              <span className="px-1.5 py-0.5 text-[11px] sm:text-xs font-mono font-bold bg-cyan-600 text-white rounded-full">
                {cartCount}
              </span>
            </button>

            {/* Command Center Quick Access */}
            <button
              type="button"
              onClick={onOpenCommandCenter}
              className="hidden sm:inline-flex p-2 text-indigo-500 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Open NEXORA 4-Agent Command Center"
              title="Four-Agent Command Center"
            >
              <Cpu className="w-5 h-5 text-indigo-400" />
            </button>

            {/* USER PROFILE PLACEHOLDER & DROPDOWN */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (onOpenUserAccount) {
                    onOpenUserAccount('profile');
                  } else {
                    setIsProfileOpen(!isProfileOpen);
                  }
                }}
                className="flex items-center gap-2 p-1 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                aria-expanded={isProfileOpen}
                aria-label="User profile account menu"
              >
                {/* User Avatar */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                  {currentUser
                    ? currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'SB'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {currentUser ? currentUser.name.split(' ')[0] : 'Shubham'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    Account & Orders
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              </button>

              {/* Accessible Profile Menu Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50 text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 text-white font-bold text-sm flex items-center justify-center">
                        {currentUser
                          ? currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                          : 'SB'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {currentUser ? currentUser.name : 'Shubham Bansal'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                          {currentUser ? currentUser.email : 'bansalshubham662@gmail.com'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-md">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {currentUser?.role === 'customer'
                          ? 'Verified Customer'
                          : currentUser?.role === 'seller'
                          ? 'Verified Vendor'
                          : 'Platform Admin'}
                      </span>
                      <span>IN (₹)</span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenUserAccount?.('orders');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>My Orders & Invoices ({currentUser?.orders.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenUserAccount?.('addresses');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>Delivery Addresses ({currentUser?.addresses.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenWishlist?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-slate-400" />
                      <span>My Wishlist ({wishlistCount})</span>
                    </button>
                  </div>

                  {/* Multi-Vendor Role Switches */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800 py-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenUserAccount?.('profile');
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors font-medium text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="w-4 h-4" />
                        <span>Seller Central Hub</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300">
                        Vendor
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenUserAccount?.('profile');
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors font-medium text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Admin Governance</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Admin
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenCommandCenter?.();
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-indigo-400 hover:bg-indigo-950/30 transition-colors font-medium text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-indigo-400" />
                        <span>Command Center</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300">
                        4-Agent
                      </span>
                    </button>
                  </div>

                  {/* Sign Out / Switch Accounts */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenUserAccount?.('login');
                      }}
                      className="w-full text-left px-4 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      Switch / Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg lg:hidden cursor-pointer"
              aria-label="Open mobile navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Full-Width Search Input (Collapsible) */}
        {isMobileSearchActive && (
          <div className="pb-3 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <label htmlFor="mobile-product-search" className="sr-only">
                Search products
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                <input
                  id="mobile-product-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products in India..."
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Category Navigation Bar (Desktop) */}
        <nav
          aria-label="Product categories"
          className="hidden lg:flex items-center justify-between py-2.5 border-t border-slate-100 dark:border-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => onSelectCategory?.('all')}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              All Departments
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory?.(cat.slug)}
                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap cursor-pointer"
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 shrink-0">
            <button
              type="button"
              onClick={() => onQuickFilter?.('top-sellers')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Top Sellers
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onQuickFilter?.('new-releases')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              New Releases
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onQuickFilter?.('studio-deals')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Direct Studio Deals
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 lg:hidden bg-black/60 backdrop-blur-xs flex">
          <div className="w-full max-w-xs bg-white dark:bg-[#090d16] border-r border-slate-200 dark:border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* User overview on mobile */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 text-white font-bold text-sm flex items-center justify-center">
                  {currentUser
                    ? currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'SB'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {currentUser ? currentUser.name : 'Shubham Bansal'}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {currentUser ? currentUser.email : 'bansalshubham662@gmail.com'}
                  </p>
                </div>
              </div>

              {/* Mobile Category Links */}
              <div>
                <h5 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">
                  Shop By Category
                </h5>
                <ul className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => {
                          onSelectCategory?.(cat.slug);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-cyan-500"
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Marketplace Portals */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenUserAccount?.('profile');
                  }}
                  className="w-full flex items-center gap-2 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 cursor-pointer"
                >
                  <Store className="w-4 h-4" />
                  <span>Become a Verified Seller</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenUserAccount?.('orders');
                  }}
                  className="w-full flex items-center gap-2 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Track Orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenCommandCenter?.();
                  }}
                  className="w-full flex items-center gap-2 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  <Cpu className="w-4 h-4" />
                  <span>4-Agent Command Center</span>
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <p>NEXORA V3 · All Rights Reserved</p>
              <p className="mt-1">Primary Market: India (₹ INR)</p>
            </div>
          </div>

          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
