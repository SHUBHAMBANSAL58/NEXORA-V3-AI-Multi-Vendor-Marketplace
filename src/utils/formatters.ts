/**
 * Currency formatting utility for the Indian market.
 * Stores money as integer paise and formats to INR (₹) at the presentation layer.
 */
export function formatCurrencyINR(paise: number): string {
  if (isNaN(paise) || paise < 0) {
    return '₹0';
  }

  const rupees = Math.floor(paise / 100);
  // Format using Indian Numbering system (lakhs, crores: e.g. 1,50,000)
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rupees);

  return `₹${formatted}`;
}

/**
 * Calculates discount percentage given original and current prices in paise.
 */
export function calculateDiscountPercentage(
  originalPaise: number,
  currentPaise: number
): number {
  if (!originalPaise || originalPaise <= currentPaise) {
    return 0;
  }
  const discount = ((originalPaise - currentPaise) / originalPaise) * 100;
  return Math.round(discount);
}

/**
 * Filters items by query string matching title, category, or brand.
 */
export function filterItemsByQuery<T extends { title: string; category?: string; brand?: string }>(
  items: T[],
  query: string
): T[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return items;

  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(cleanQuery);
    const categoryMatch = item.category?.toLowerCase().includes(cleanQuery);
    const brandMatch = item.brand?.toLowerCase().includes(cleanQuery);
    return titleMatch || categoryMatch || brandMatch;
  });
}
