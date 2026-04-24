import * as React from 'react';
import { toast } from 'react-toastify';
import { useEscrow } from '../Store';

interface ReviewFormProps {
  orderId: bigint;
  onSubmitted?: () => void;
}

const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className={`text-2xl transition ${n <= value ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
        aria-label={`${n} star${n > 1 ? 's' : ''}`}
      >
        ★
      </button>
    ))}
  </div>
);

const ReviewForm: React.FC<ReviewFormProps> = ({ orderId, onSubmitted }) => {
  const escrow = useEscrow();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  if (submitted) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        ✅ Thank you! Your review has been submitted.
      </div>
    );
  }

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      toast.error('Please select a star rating (1–5)');
      return;
    }
    setLoading(true);
    escrow.leaveReview(orderId, BigInt(rating), comment).then((res) => {
      setLoading(false);
      if (res['ok'] !== undefined) {
        toast.success('Review submitted!');
        setSubmitted(true);
        onSubmitted?.();
      } else {
        toast.error(res['err'] ?? 'Failed to submit review');
      }
    }).catch(() => {
      setLoading(false);
      toast.error('Failed to submit review');
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-700">Leave a Review</p>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Rating</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Comment <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share your experience with this seller..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-400"
          />
        </div>
        <button
          type="button"
          disabled={loading || rating === 0}
          onClick={handleSubmit}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default ReviewForm;
