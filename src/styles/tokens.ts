/**
 * NEXORA V3 — Centralized Design System Tokens
 * Aligned with the Locked Design Specification (Rule 5)
 */

export const DESIGN_TOKENS = {
  brand: {
    name: 'NEXORA',
    version: 'V3 — Ultimate Elite Edition',
    tagline: 'Discover More. Shop Smarter. Experience Beyond.',
    market: 'India',
    currency: 'INR (₹)',
  },
  colors: {
    dark: {
      canvas: '#060911',
      surface: '#090d16',
      elevated: '#0f172a',
      border: '#1e293b',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      accentElectricBlue: '#3b82f6',
      accentAuroraCyan: '#06b6d4',
      accentCosmicViolet: '#8b5cf6',
      highlightAmber: '#f59e0b',
      successEmerald: '#10b981',
      dangerRose: '#f43f5e',
    },
    light: {
      canvas: '#f8fafc',
      surface: '#ffffff',
      elevated: '#f1f5f9',
      border: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      accentElectricBlue: '#2563eb',
      accentAuroraCyan: '#0891b2',
      accentCosmicViolet: '#7c3aed',
      highlightAmber: '#d97706',
      successEmerald: '#059669',
      dangerRose: '#e11d48',
    },
  },
  typography: {
    fontSans:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    fontMono:
      "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
    scale: {
      display: 'clamp(2.5rem, 5vw, 4rem)',
      h1: 'clamp(2rem, 4vw, 3rem)',
      h2: '1.875rem', // 30px
      h3: '1.5rem', // 24px
      h4: '1.25rem', // 20px
      bodyLarge: '1.125rem', // 18px
      body: '0.9375rem', // 15px
      caption: '0.75rem', // 12px
      micro: '0.6875rem', // 11px
    },
  },
  layout: {
    containerMaxWidth: '1280px',
    desktopBaseline: '1440px',
    mobileBreak: '768px',
    tabletBreak: '1024px',
    headerHeight: '64px',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: '300ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  radii: {
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    full: '9999px',
  },
};
