import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { buildProductImageCandidates } from '../utils/imageLoader.js';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrcs?: string[];
  fallbackLabel?: string;
  showSkeleton?: boolean;
  compactFallback?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrcs,
  fallbackLabel,
  showSkeleton = true,
  compactFallback = false,
  className = '',
  onLoad,
  onError,
  ...rest
}) => {
  const candidates = useMemo(
    () => buildProductImageCandidates(src, fallbackSrcs),
    [src, fallbackSrcs]
  );
  const candidatesKey = candidates.join('|');

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(() =>
    candidates.length > 0 ? 'loading' : 'error'
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setCandidateIndex(0);
    setStatus(candidates.length > 0 ? 'loading' : 'error');
  }, [candidatesKey, candidates.length]);

  const activeSrc = candidates[candidateIndex];

  const handleFallbackAdvance = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((idx) => idx + 1);
      setStatus('loading');
    } else {
      setStatus('error');
    }
  };

  useEffect(() => {
    const el = imgRef.current;
    if (!el || status === 'error') return;
    if (el.complete) {
      if (el.naturalWidth > 0) {
        setStatus('loaded');
      } else {
        handleFallbackAdvance();
      }
    }
  }, [activeSrc, candidateIndex, candidates.length, status]);

  if (status === 'error' || !activeSrc) {
    return (
      <div
        role="img"
        aria-label={`${alt} (image not found)`}
        data-testid="image-not-found-fallback"
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 p-3 text-center select-none ${className}`}
      >
        <div
          className={`flex items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/70 dark:border-slate-700/80 ${
            compactFallback ? 'w-8 h-8 mb-1' : 'w-11 h-11 mb-2'
          }`}
        >
          <ImageOff
            aria-hidden="true"
            data-icon="image-not-found"
            className={`${compactFallback ? 'w-4 h-4' : 'w-5 h-5'} text-cyan-600 dark:text-cyan-400 shrink-0`}
          />
        </div>
        {!compactFallback && (
          <>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[92%]">
              {fallbackLabel || alt}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Image Not Available
            </span>
          </>
        )}
      </div>
    );
  }

  const tokens = className.trim().split(/\s+/).filter(Boolean);
  const wrapperTokens: string[] = [];
  const imgTokens: string[] = [];
  const wrapperPattern =
    /^(?:w-|h-|min-w-|max-w-|min-h-|max-h-|shrink|grow|flex-|rounded|border|bg-|aspect-|shadow)/;

  for (const tok of tokens) {
    const base = tok.split(':').pop() || tok;
    if (wrapperPattern.test(base)) {
      wrapperTokens.push(tok);
    } else {
      imgTokens.push(tok);
    }
  }

  const hasWidth = wrapperTokens.some((t) => /^(?:w-|min-w-)/.test(t.split(':').pop() || t));
  const hasHeight = wrapperTokens.some((t) => /^(?:h-|min-h-)/.test(t.split(':').pop() || t));
  const wrapperClass = [
    'relative overflow-hidden',
    hasWidth ? '' : 'w-full',
    hasHeight ? '' : 'h-full',
    ...wrapperTokens,
  ]
    .filter(Boolean)
    .join(' ');
  const imgClass = ['w-full h-full', ...imgTokens].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      {showSkeleton && status === 'loading' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-200/75 dark:bg-slate-800/75 animate-pulse flex items-center justify-center"
        >
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Loading photo...
          </span>
        </div>
      )}
      <img
        ref={imgRef}
        src={activeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth > 0) {
            setStatus('loaded');
            onLoad?.(e);
          } else {
            handleFallbackAdvance();
          }
        }}
        onError={(e) => {
          handleFallbackAdvance();
          onError?.(e);
        }}
        className={`${imgClass} transition-opacity duration-300 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        {...rest}
      />
    </div>
  );
};
