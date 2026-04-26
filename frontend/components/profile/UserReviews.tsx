import * as React from 'react';
import moment from 'moment';
import { useEscrow } from '../Store';
import { Principal } from '@dfinity/principal';
import { Review } from '../../api/escrow/service.did';
import PrincipalName from '../PrincipalName';

interface UserReviewsProps {
  userId: string;
}

const StarRow: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="text-amber-400 tracking-tight">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n}>{n <= rating ? '★' : '☆'}</span>
    ))}
  </span>
);

const UserReviews: React.FC<UserReviewsProps> = ({ userId }) => {
  const escrow = useEscrow();
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!userId || !escrow) return;
    setLoading(true);
    try {
      const principal = Principal.fromText(userId);
      escrow.getUserReviews(principal).then((res) => {
        setReviews(res);
        setLoading(false);
      }).catch(() => setLoading(false));
    } catch {
      setLoading(false);
    }
  }, [escrow, userId]);

  if (loading) {
    return <div className="mt-4 h-8 animate-pulse rounded-xl bg-slate-200" />;
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/75 p-4 text-sm text-slate-500">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Reviews ({reviews.length})</p>
      {reviews.map((r) => {
        const rating = Number(r.rating);
        const timeMs = Number(r.ctime) / 1_000_000;
        return (
          <div
            key={String(r.id)}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <StarRow rating={rating} />
              <span className="text-xs text-slate-400">
                {moment(timeMs).format('YYYY-MM-DD')}
              </span>
            </div>
            {r.comment && (
              <p className="mt-2 text-sm text-slate-700">{r.comment}</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              by <PrincipalName principal={r.reviewer} />
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default UserReviews;
