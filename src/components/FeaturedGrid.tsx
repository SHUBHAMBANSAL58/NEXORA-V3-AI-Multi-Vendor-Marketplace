import React, { useState, useMemo, useEffect } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  Search,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Heart,
} from 'lucide-react';
import { CatalogProduct, CatalogProductWithMeta, CategoryItem } from '../types/index.js';
import { PRODUCTS_CATALOG, EXPANDED_CATEGORIES } from '../data/productsCatalog.js';
import { calculateCategoryProductCounts } from '../utils/commerceFeatures.js';
import { ProductCard } from './ProductCard.js';
import { RecentlyViewed } from './RecentlyViewed.js';

interface FeaturedGridProps {
  products?: CatalogProductWithMeta[];
  categories?: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  searchFilter: string;
  onQuickAdd: (product: CatalogProduct) => void;
  onQuickView: (product: CatalogProduct) => void;
  wishlistedIds?: Set<string>;
  onToggleWishlist?: (product: CatalogProduct) => void;
  comparedIds?: Set<string>;
  onToggleCompare?: (product: CatalogProduct) => void;
  onOpenPriceAlert?: (product: CatalogProduct) => void;
  recentlyViewed?: CatalogProduct[];
  onClearRecentlyViewed?: () => void;
  quickFilter?: 'all' | 'top-sellers' | 'new-releases' | 'studio-deals';
  onClearQuickFilter?: () => void;
  onClearSearch?: () => void;
}

const ITEMS_PER_PAGE = 12;

export const FeaturedGrid: React.FC<FeaturedGridProps> = ({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  searchFilter,
  onQuickAdd,
  onQuickView,
  wishlistedIds = new Set(),
  onToggleWishlist,
  comparedIds = new Set(),
  onToggleCompare,
  onOpenPriceAlert,
  recentlyViewed = [],
  onClearRecentlyViewed,
  quickFilter = 'all',
  onClearQuickFilter,
  onClearSearch,
}) => {
  // Filter States
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest'>('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [showWishlistOnly, setShowWishlistOnly] = useState<boolean>(false);

  // Reset pagination to page 1 when parent-controlled filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchFilter, quickFilter]);

  const activeCatalog = useMemo(() => {
    const source: CatalogProductWithMeta[] =
      products && products.length > 0 ? products : PRODUCTS_CATALOG;
    return source.filter((p) => p.isPublished !== false);
  }, [products]);

  const activeCategories = useMemo(
    () => (categories && categories.length > 0 ? categories : EXPANDED_CATEGORIES),
    [categories]
  );

  // Extract unique brands from catalogue
  const allBrands = useMemo(() => {
    const brands = new Set<string>();
    activeCatalog.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [activeCatalog]);

  const categoryCounts = useMemo(
    () => calculateCategoryProductCounts(activeCatalog),
    [activeCatalog]
  );

  // Combined search term (from Navbar searchFilter prop OR local input)
  const activeSearch = (localSearch || searchFilter || '').trim().toLowerCase();

  // Filtered & Sorted Products computation
  const filteredProducts = useMemo(() => {
    let list = [...activeCatalog];

    // 0. Wishlist Only Filter
    if (showWishlistOnly) {
      list = list.filter((p) => wishlistedIds.has(p.id));
    }

    // 1. Category Filter
    if (selectedCategory && selectedCategory !== 'all') {
      list = list.filter((p) => p.categorySlug === selectedCategory);
    }

    // 2. Search Query Filter
    if (activeSearch) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(activeSearch) ||
          p.description.toLowerCase().includes(activeSearch) ||
          p.brand.toLowerCase().includes(activeSearch) ||
          p.tagline.toLowerCase().includes(activeSearch) ||
          p.tags?.some((t) => t.toLowerCase().includes(activeSearch))
      );
    }

    // 3. Brand Filter
    if (selectedBrand !== 'all') {
      list = list.filter((p) => p.brand === selectedBrand);
    }

    // 4. Price Filter
    if (priceRange === 'under-5000') {
      list = list.filter((p) => p.pricePaise < 500000);
    } else if (priceRange === '5000-20000') {
      list = list.filter((p) => p.pricePaise >= 500000 && p.pricePaise <= 2000000);
    } else if (priceRange === '20000-50000') {
      list = list.filter((p) => p.pricePaise >= 2000000 && p.pricePaise <= 5000000);
    } else if (priceRange === 'above-50000') {
      list = list.filter((p) => p.pricePaise > 5000000);
    }

    // 5. Rating Filter
    if (minRating > 0) {
      list = list.filter((p) => p.rating >= minRating);
    }

    // 6. Quick Nav Filter (Top Sellers / New Releases / Studio Deals)
    if (quickFilter === 'top-sellers') {
      list = list.filter((p) => p.rating >= 4.8);
    } else if (quickFilter === 'studio-deals') {
      list = list.filter((p) => (p.originalPricePaise || 0) > p.pricePaise);
    } else if (quickFilter === 'new-releases') {
      list = [...list].reverse();
    }

    // 7. Sorting
    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => a.pricePaise - b.pricePaise);
        break;
      case 'price-desc':
        list.sort((a, b) => b.pricePaise - a.pricePaise);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case 'newest':
        if (quickFilter !== 'new-releases') {
          list.sort((a, b) => {
            const aTime = (a as CatalogProductWithMeta).createdAt ? Date.parse((a as CatalogProductWithMeta).createdAt!) : 0;
            const bTime = (b as CatalogProductWithMeta).createdAt ? Date.parse((b as CatalogProductWithMeta).createdAt!) : 0;
            return bTime - aTime;
          });
          if (list.every((p) => !(p as CatalogProductWithMeta).createdAt)) {
            list.reverse();
          }
        }
        break;
      case 'featured':
      default:
        break;
    }

    return list;
  }, [activeCatalog, selectedCategory, activeSearch, selectedBrand, priceRange, minRating, sortBy, showWishlistOnly, wishlistedIds, quickFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleResetFilters = () => {
    onSelectCategory('all');
    setSelectedBrand('all');
    setPriceRange('all');
    setMinRating(0);
    setSortBy('featured');
    setLocalSearch('');
    setShowWishlistOnly(false);
    setCurrentPage(1);
    onClearQuickFilter?.();
    onClearSearch?.();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const element = document.getElementById('featured-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="featured-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
      {/* 1. HEADER & DISCOVERY INTRO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Catalog · {activeCatalog.length} Masterworks</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Discover Exceptional Engineering
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
            Each product is rigorously audited for acoustic fidelity, tactile perfection, and mechanical craftsmanship.
          </p>
        </div>

        {/* Live Active Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredProducts.length}</strong> products
          </span>
          {(selectedCategory !== 'all' || activeSearch || selectedBrand !== 'all' || priceRange !== 'all' || minRating > 0 || showWishlistOnly || quickFilter !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-cyan-700 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CATEGORY TABS (Zero-Pill Discipline: Segmented Controls) */}
      <div className="mb-6 overflow-x-auto no-scrollbar">
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
          {activeCategories.map((cat) => {
            const isSelected = !showWishlistOnly && selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setShowWishlistOnly(false);
                  onSelectCategory(cat.slug);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                {cat.slug !== 'all' && (
                  <span className="ml-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                    ({categoryCounts[cat.slug] ?? 0})
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Wishlist Tab */}
          <button
            type="button"
            onClick={() => {
              setShowWishlistOnly((prev) => !prev);
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              showWishlistOnly
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showWishlistOnly ? 'fill-white text-white' : 'text-rose-600 dark:text-rose-400'}`} />
            <span>Wishlist</span>
            <span className={`text-[10px] font-mono ${showWishlistOnly ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
              ({wishlistedIds.size})
            </span>
          </button>
        </div>
      </div>

      {/* 3. MULTI-FACET FILTER & SORT BAR */}
      <div className="mb-8 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Left Side: Brand & Price & Rating Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Quick Search Within Catalogue */}
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Filter catalog by keyword or model"
              placeholder="Filter by keyword or model..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
            />
          </div>

          {/* Brand Filter Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by brand"
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none px-3 py-1.5 pr-7 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="all">All Brands ({allBrands.length})</option>
              {allBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Price Range Filter */}
          <div className="relative">
            <select
              aria-label="Filter by price range"
              value={priceRange}
              onChange={(e) => {
                setPriceRange(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none px-3 py-1.5 pr-7 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="all">All Prices</option>
              <option value="under-5000">Under ₹5,000</option>
              <option value="5000-20000">₹5,000 to ₹20,000</option>
              <option value="20000-50000">₹20,000 to ₹50,000</option>
              <option value="above-50000">Above ₹50,000</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Rating Filter */}
          <div className="relative">
            <select
              aria-label="Filter by minimum rating"
              value={minRating}
              onChange={(e) => {
                setMinRating(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none px-3 py-1.5 pr-7 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value={0}>All Ratings</option>
              <option value={4.8}>★ 4.8 & Above</option>
              <option value={4.5}>★ 4.5 & Above</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Sorting */}
        <div className="flex items-center gap-2">
          <span className="text-slate-700 dark:text-slate-300 font-medium">Sort by:</span>
          <div className="relative">
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none px-3 py-1.5 pr-7 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="featured">Featured & Curated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Releases</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. PRODUCT CARDS GRID */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <Filter className="w-10 h-10 text-slate-500 dark:text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No products match the selected criteria
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your category, price range, or clearing the search query to view available engineering pieces.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-cyan-500 dark:text-slate-950 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
                onQuickView={onQuickView}
                onAddToCart={onQuickAdd}
                isWishlisted={wishlistedIds.has(product.id)}
                onToggleWishlist={onToggleWishlist}
                isCompared={comparedIds.has(product.id)}
                onToggleCompare={onToggleCompare}
                onOpenPriceAlert={onOpenPriceAlert}
              />
            ))}
          </div>

          {/* 5. PAGINATION CONTROLS (FIX-07: Counter immediately adjacent to pills, right-aligned on desktop) */}
          {totalPages > 1 && (
            <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-6">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Page <strong className="font-mono text-slate-900 dark:text-white">{validCurrentPage}</strong> of{' '}
                <strong className="font-mono text-slate-900 dark:text-white">{totalPages}</strong> ({filteredProducts.length} items total)
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={validCurrentPage === 1}
                  onClick={() => handlePageChange(validCurrentPage - 1)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    aria-label={`Page ${page}`}
                    aria-current={validCurrentPage === page ? 'page' : undefined}
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      validCurrentPage === page
                        ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-xs'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={validCurrentPage === totalPages}
                  onClick={() => handlePageChange(validCurrentPage + 1)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 6. RECOMMENDED FOR YOU (Personalized Picks) */}
          {selectedCategory === 'all' && !activeSearch && validCurrentPage === 1 && (
            <div className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Algorithmic Recommendation Engine</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Recommended For Your Setup
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeCatalog.filter((p) => p.rating >= 4.85)
                  .slice(0, 4)
                  .map((product) => (
                    <ProductCard
                      key={`rec-${product.id}`}
                      product={product}
                      onQuickView={onQuickView}
                      onAddToCart={onQuickAdd}
                      isWishlisted={wishlistedIds.has(product.id)}
                      onToggleWishlist={onToggleWishlist}
                      isCompared={comparedIds.has(product.id)}
                      onToggleCompare={onToggleCompare}
                      onOpenPriceAlert={onOpenPriceAlert}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* 7. RECENTLY VIEWED CAROUSEL */}
          <RecentlyViewed
            products={recentlyViewed}
            onQuickView={onQuickView}
            onAddToCart={onQuickAdd}
            onClear={onClearRecentlyViewed || (() => {})}
          />
        </>
      )}
    </section>
  );
};
