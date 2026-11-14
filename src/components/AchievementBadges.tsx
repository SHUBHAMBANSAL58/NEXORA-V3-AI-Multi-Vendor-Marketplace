import React, { useState } from 'react';
import {
  ShieldCheck,
  Star,
  Crown,
  Sparkles,
  Award,
  Zap,
  CheckCircle2,
  Lock,
  X,
  PartyPopper,
} from 'lucide-react';
import { AchievementBadge } from '../types/index.js';

interface AchievementBadgesProps {
  badges: AchievementBadge[];
  onBadgeClick?: (badge: AchievementBadge) => void;
  className?: string;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({
  badges,
  className = '',
}) => {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedBadge, setCelebratedBadge] = useState<AchievementBadge | null>(null);

  const getBadgeIcon = (iconName: string, classNameStr: string) => {
    switch (iconName) {
      case 'shield':
        return <ShieldCheck className={classNameStr} />;
      case 'star':
        return <Star className={classNameStr} />;
      case 'crown':
        return <Crown className={classNameStr} />;
      case 'sparkles':
        return <Sparkles className={classNameStr} />;
      case 'award':
        return <Award className={classNameStr} />;
      case 'zap':
        return <Zap className={classNameStr} />;
      default:
        return <Award className={classNameStr} />;
    }
  };

  const getTierStyles = (tier: string, unlocked: boolean) => {
    if (!unlocked) {
      return {
        badgeBg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/60 text-slate-400 opacity-60',
        glow: '',
        iconColor: 'text-slate-400',
        label: 'text-slate-500 dark:text-slate-400',
      };
    }

    switch (tier) {
      case 'platinum':
        return {
          badgeBg: 'bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-cyan-500/15 border-purple-400/40 text-purple-700 dark:text-purple-300 shadow-xs shadow-purple-500/20',
          glow: 'from-purple-500 to-indigo-500',
          iconColor: 'text-purple-500 dark:text-purple-300',
          label: 'text-purple-700 dark:text-purple-300 font-semibold',
        };
      case 'gold':
        return {
          badgeBg: 'bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-orange-500/15 border-amber-400/50 text-amber-800 dark:text-amber-300 shadow-xs shadow-amber-500/20',
          glow: 'from-amber-400 to-yellow-500',
          iconColor: 'text-amber-500 dark:text-amber-300',
          label: 'text-amber-800 dark:text-amber-300 font-semibold',
        };
      case 'silver':
        return {
          badgeBg: 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border-cyan-400/40 text-cyan-800 dark:text-cyan-300 shadow-xs shadow-cyan-500/15',
          glow: 'from-cyan-400 to-blue-500',
          iconColor: 'text-cyan-500 dark:text-cyan-300',
          label: 'text-cyan-800 dark:text-cyan-300 font-semibold',
        };
      default: // bronze
        return {
          badgeBg: 'bg-gradient-to-r from-amber-700/15 to-orange-600/15 border-amber-600/30 text-amber-800 dark:text-amber-400',
          glow: 'from-amber-700 to-orange-600',
          iconColor: 'text-amber-600 dark:text-amber-400',
          label: 'text-amber-800 dark:text-amber-400 font-medium',
        };
    }
  };

  const handleTriggerCelebrate = (badge: AchievementBadge) => {
    setSelectedBadge(badge);
    if (badge.unlocked) {
      setCelebratedBadge(badge);
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
      }, 3500);
    }
  };

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Profile Achievement Badges</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300/40">
            {unlockedCount} / {badges.length} Unlocked
          </span>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Click any badge for perks & criteria
        </span>
      </div>

      {/* Badges Grid / Pill Row */}
      <div className="flex flex-wrap items-center gap-2">
        {badges.map((badge) => {
          const styles = getTierStyles(badge.tier, badge.unlocked);

          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => handleTriggerCelebrate(badge)}
              title={`${badge.title} (${badge.unlocked ? 'Unlocked' : 'In Progress'})`}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${styles.badgeBg}`}
            >
              <div className="relative">
                {getBadgeIcon(badge.icon, `w-4 h-4 transition-transform group-hover:rotate-6 ${styles.iconColor}`)}
                {!badge.unlocked && (
                  <Lock className="w-2.5 h-2.5 text-slate-500 absolute -top-1 -right-1" />
                )}
              </div>
              <span className={`text-[11px] tracking-tight ${styles.label}`}>
                {badge.title}
              </span>

              {badge.unlocked && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Confetti & Sparkle Celebratory Burst Overlay */}
      {showCelebration && celebratedBadge && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
          {/* Confetti SVG Particle Shower */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(24)].map((_, i) => {
              const colors = ['#f59e0b', '#06b6d4', '#8b5cf6', '#10b981', '#ec4899', '#eab308'];
              const color = colors[i % colors.length];
              const angle = (i / 24) * 360;
              const radius = 120 + (i % 4) * 40;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full animate-out fade-out duration-1000"
                  style={{
                    backgroundColor: color,
                    transform: `translate(${x}px, ${y}px) rotate(${i * 15}deg)`,
                    transition: 'transform 1s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 1s',
                  }}
                />
              );
            })}
          </div>

          {/* Celebratory Floating Pill */}
          <div className="relative bg-slate-900/95 text-white px-5 py-3 rounded-2xl border border-amber-400/50 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in zoom-in-95 duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <PartyPopper className="w-5 h-5 text-slate-950 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Achievement Unlocked & Verified!</span>
              </div>
              <p className="text-sm font-black text-white">{celebratedBadge.title}</p>
              <p className="text-[11px] text-slate-400">{celebratedBadge.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Badge Modal Inspection */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl text-slate-900 dark:text-slate-100 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-md ${
                  getTierStyles(selectedBadge.tier, selectedBadge.unlocked).badgeBg
                }`}
              >
                {getBadgeIcon(
                  selectedBadge.icon,
                  `w-6 h-6 ${getTierStyles(selectedBadge.tier, selectedBadge.unlocked).iconColor}`
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedBadge.title}
                  </h4>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                    {selectedBadge.tier}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Category: <span className="capitalize">{selectedBadge.category}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {selectedBadge.description}
            </p>

            {/* Progress or Unlock Date */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Status</span>
                {selectedBadge.unlocked ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Unlocked {selectedBadge.unlockedAt ? `· ${selectedBadge.unlockedAt}` : ''}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <Lock className="w-3.5 h-3.5" />
                    Locked · In Progress
                  </span>
                )}
              </div>

              {selectedBadge.progress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Target Requirement</span>
                    <span>
                      {selectedBadge.progress.current} / {selectedBadge.progress.target}{' '}
                      {selectedBadge.progress.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (selectedBadge.progress.current / selectedBadge.progress.target) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              {selectedBadge.unlocked && (
                <button
                  type="button"
                  onClick={() => handleTriggerCelebrate(selectedBadge)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold cursor-pointer"
                >
                  <PartyPopper className="w-3.5 h-3.5" />
                  <span>Celebrate Badge</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="ml-auto px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
