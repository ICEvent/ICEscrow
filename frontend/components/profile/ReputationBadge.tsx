import * as React from 'react';
import { UserStats } from '../../api/escrow/service.did';

interface ReputationBadgeProps {
  stats: UserStats | null;
}

const ReputationBadge: React.FC<ReputationBadgeProps> = ({ stats }) => {
  if (!stats) return null;

  const avgRating = typeof stats.avgRating === 'number' ? stats.avgRating : Number(stats.avgRating);
  const reviewCount = Number(stats.reviewCount);
  const hearts = Number(stats.heartsReceived);
  const sales = Number(stats.salesCompleted);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {reviewCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
          ⭐ {avgRating.toFixed(1)}
          <span className="font-normal text-amber-600">({reviewCount})</span>
        </span>
      )}
      {hearts > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-600">
          ❤️ {hearts}
        </span>
      )}
      {sales > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
          📦 {sales} sales
        </span>
      )}
      {reviewCount === 0 && hearts === 0 && sales === 0 && (
        <span className="text-xs text-slate-400">No reputation yet</span>
      )}
    </div>
  );
};

export default ReputationBadge;
