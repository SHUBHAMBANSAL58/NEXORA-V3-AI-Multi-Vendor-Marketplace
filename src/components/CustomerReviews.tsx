import React, { useState } from 'react';
import { Star, ShieldCheck, ThumbsUp, MessageSquare, Check, Plus } from 'lucide-react';
import { UserReview } from '../types/index.js';
import {
  calculateAverageRating,
  sortProductReviews,
  ReviewSortOption,
} from '../utils/commerceFeatures.js';

interface CustomerReviewsProps {
  productId: string;
  productTitle: string;
  reviews: UserReview[];
  onSubmitReview: (review: Omit<UserReview, 'id' | 'date' | 'helpfulCount'>) => void;
  currentUserName?: string;
}

export const CustomerReviews: React.FC<CustomerReviewsProps> = ({
  productId,
  productTitle,
  reviews,
  onSubmitReview,
  currentUserName = 'Shubham Bansal',
}) => {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [author, setAuthor] = useState(currentUserName);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Helpful click tracker local state
  const [helpfulMap, setHelpfulMap] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<ReviewSortOption>('recent');

  const summary = calculateAverageRating(reviews);
  const sortedReviews = React.useMemo(
    () => sortProductReviews(reviews, sortBy, helpfulMap),
    [reviews, sortBy, helpfulMap]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !title.trim()) return;

    onSubmitReview({
      productId,
      author: author.trim() || 'Verified Customer',
      rating,
      title: title.trim(),
      comment: comment.trim(),
      verifiedPurchase: true,
    });

    setSubmitted(true);
    setTimeout(() => {
      setShowForm(false);
      setSubmitted(false);
      setTitle('');
      setComment('');
      setRating(5);
    }, 1500);
  };

  const handleHelpful = (reviewId: string) => {
    setHelpfulMap((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1,
    }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Rating Summary & Breakdown Grid */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score Big Display */}
        <div className="text-center md:border-r border-slate-200 dark:border-slate-800 pr-0 md:pr-4">
          <div className="text-4xl font-black font-mono text-slate-900 dark:text-white">
            {summary.average.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 my-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(summary.average)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Based on {summary.count} verified ratings
          </p>
        </div>

        {/* Breakdown Bars */}
        <div className="space-y-1.5 md:col-span-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.breakdown[stars] || 0;
            const percentage =
              summary.count > 0 ? (count / summary.count) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-slate-500 font-mono text-[11px] text-right">
                  {stars}★
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-[11px] text-slate-400 font-mono text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Write Review Action Button & Sort Selector */}
      {!showForm ? (
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Customer Feedback ({reviews.length})
          </h4>
          <div className="flex items-center gap-2">
            {reviews.length > 1 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ReviewSortOption)}
                aria-label="Sort customer reviews"
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="rating">Highest Rated</option>
                <option value="helpful">Most Helpful</option>
              </select>
            )}
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-cyan-500 dark:text-slate-950 rounded-lg hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write a Review</span>
            </button>
          </div>
        </div>
      ) : (
        /* 3. Review Submission Form */
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 rounded-2xl border border-cyan-500/40 bg-cyan-50/20 dark:bg-cyan-950/20 space-y-4 text-xs animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-white">
              Write Your Experience for {productTitle}
            </h4>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          {/* Star selector */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
              Overall Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-slate-300 dark:text-slate-700 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      s <= (hoverRating || rating)
                        ? 'text-amber-400 fill-amber-400'
                        : ''
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                {rating} / 5 Stars
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Shubham Bansal"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Headline / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Exceptional acoustic precision and build quality"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Detailed Written Feedback
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe soundstage, comfort, packaging, battery performance, etc..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitted}
              className="px-4 py-1.5 font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitted ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Submitted Verified Review!</span>
                </>
              ) : (
                <span>Publish Review</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 4. Review Cards List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              Be the first to leave a verified review for this masterpiece!
            </p>
          </div>
        ) : (
          sortedReviews.map((rev) => {
            const extraHelpful = helpfulMap[rev.id] || 0;
            const currentHelpful = rev.helpfulCount + extraHelpful;

            return (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {rev.author}
                    </span>
                    {rev.verifiedPurchase && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {rev.date}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {rev.title}
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rev.comment}
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500">
                  <span>Helpful review?</span>
                  <button
                    type="button"
                    onClick={() => handleHelpful(rev.id)}
                    className="flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>Helpful ({currentHelpful})</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
