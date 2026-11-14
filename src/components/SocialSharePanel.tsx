import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Twitter,
  Linkedin,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Link2,
  Send,
} from 'lucide-react';
import { CatalogProduct } from '../types/index.js';
import { formatCurrencyINR } from '../utils/formatters.js';

interface SocialSharePanelProps {
  product: CatalogProduct;
  onLinkCopied?: () => void;
}

export const SocialSharePanel: React.FC<SocialSharePanelProps> = ({ product, onLinkCopied }) => {
  const [copied, setCopied] = useState(false);

  // Determine canonical product link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nexora.market';
  const shareUrl = `${origin}/?product=${product.id}#${product.categorySlug || 'catalog'}`;
  const shareText = `Discover ${product.title} on NEXORA Marketplace. ${product.tagline} · ${formatCurrencyINR(product.pricePaise)}`;

  const handleCopyLink = async () => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      }
    } catch {
      // Permission restricted in automated/headless context, fall through to textarea execCommand
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        success = true;
      } catch (err) {
        console.warn('Fallback copy failed', err);
      }
    }

    setCopied(true);
    onLinkCopied?.();
    setTimeout(() => setCopied(false), 2400);
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Check out ${product.title} on NEXORA — ${product.tagline}`
  )}&url=${encodeURIComponent(shareUrl)}&hashtags=NEXORA,LuxuryDesign,CraftedInIndia`;

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Check out ${product.title} on NEXORA: ${shareUrl}`
  )}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.tagline,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-500" />
            <span>Share Masterwork & Earn Rewards</span>
          </h4>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
            Share this verified product with your network. Referrals earn +100 NEXORA points.
          </p>
        </div>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Native Share
          </button>
        )}
      </div>

      {/* Copy Direct Link Box */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 space-y-2">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-cyan-500" />
          <span>Direct Product Link</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-[11px] select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 shadow-xs'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Integrated Social Platforms Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Twitter / X */}
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600 transition-all text-left group cursor-pointer block"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
              <Twitter className="w-3.5 h-3.5" />
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white block text-xs">
            Share on X
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Post to followers
          </span>
        </a>

        {/* LinkedIn */}
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600 transition-all text-left group cursor-pointer block"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#0077b5] text-white flex items-center justify-center">
              <Linkedin className="w-3.5 h-3.5" />
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white block text-xs">
            LinkedIn
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Professional feed
          </span>
        </a>

        {/* WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600 transition-all text-left group cursor-pointer block"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#25d366] text-white flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <Send className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white block text-xs">
            WhatsApp
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Direct message / chat
          </span>
        </a>
      </div>

      {/* Referral Incentive Badge */}
      <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-gradient-to-r dark:from-cyan-950/40 dark:via-indigo-950/30 dark:to-purple-950/30 border border-cyan-200 dark:border-cyan-900/40 flex items-center justify-between text-[11px] text-cyan-800 dark:text-cyan-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>Earn 100 NEXORA Club points on friend checkout.</span>
        </div>
        <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold shrink-0">₹10 value</span>
      </div>
    </div>
  );
};
