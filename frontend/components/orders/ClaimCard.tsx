import * as React from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';
import { useEscrow, useGlobalContext } from '../Store';

const MS_TO_NANOSECONDS = BigInt(1_000_000);
const unwrapClosedAt = (value: any) => (Array.isArray(value) ? value[0] : value);
const toClosedAtShape = (template: any, value: bigint) => (Array.isArray(template) ? [value] : value);

interface ClaimCardProps {
    claim: any;
    role: 'buyer' | 'seller';
    onUpdated: (updated: any) => void;
}

const ClaimCard: React.FC<ClaimCardProps> = ({ claim, role, onUpdated }) => {
    const escrow = useEscrow();
    const { state: { principal } } = useGlobalContext();

    const [showComments, setShowComments] = React.useState(false);
    const [commentText, setCommentText] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [closing, setClosing] = React.useState(false);

    const comments: any[] = claim.comments ?? [];
    const closedAt = unwrapClosedAt(claim.closedAt);
    const isClosed = closedAt !== undefined && closedAt !== null;

    const saveComment = async () => {
        const text = commentText.trim();
        if (!text) return;
        setSaving(true);
        try {
            const res = await escrow.commentOnClaim(claim.id, text);
            if (res['ok'] !== undefined) {
                toast.success('Comment saved');
                setCommentText('');
                // Optimistically append so UI updates instantly
                const newComment = {
                    user: principal,
                    comment: text,
                    ctime: BigInt(Date.now()) * BigInt(1_000_000),
                };
                onUpdated({ ...claim, comments: [...comments, newComment] });
                setShowComments(true);
            } else {
                toast.error(res['err'] ?? 'Failed to save comment');
            }
        } catch {
            toast.error('Failed to save comment');
        } finally {
            setSaving(false);
        }
    };

    const closeClaim = async () => {
        if (isClosed) return;
        setClosing(true);
        try {
            const res = await escrow.closeClaim(claim.id);
            if (res['ok'] !== undefined) {
                toast.success('Claim closed');
                const optimisticClosedAt = toClosedAtShape(
                    claim.closedAt,
                    BigInt(Date.now()) * MS_TO_NANOSECONDS,
                );
                onUpdated({ ...claim, closedAt: optimisticClosedAt });
            } else {
                toast.error(res['err'] ?? 'Failed to close claim');
            }
        } catch {
            toast.error('Failed to close claim');
        } finally {
            setClosing(false);
        }
    };

    const shortPrincipal = (p: any) => {
        const s = p?.toString() ?? '';
        return s.length > 10 ? `${s.slice(0, 5)}...${s.slice(-5)}` : s;
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{claim.itemName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {role === 'buyer' ? 'Claimed' : 'Received claim'}{' '}
                        {moment(Number(claim.ctime) / 1e6).fromNow()}
                        {' · '}Claim #{String(claim.id)}
                    </p>
                    {role === 'seller' ? (
                        <p className="mt-0.5 text-xs text-slate-400 break-all">
                            Buyer: {claim.buyer.toString()}
                        </p>
                    ) : (
                        <p className="mt-0.5 text-xs text-slate-400 break-all">
                            Seller: {claim.seller.toString()}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {comments.length > 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {comments.length} msg{comments.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isClosed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isClosed ? 'Closed' : role === 'buyer' ? 'Waiting for seller' : 'Pending'}
                    </span>
                    {role === 'seller' && !isClosed && (
                        <button
                            type="button"
                            onClick={closeClaim}
                            disabled={closing}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                        >
                            {closing ? 'Closing…' : 'Close Claim'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowComments((v) => !v)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-orange-400 hover:text-orange-700"
                    >
                        {showComments ? 'Hide' : 'Message'}
                    </button>
                </div>
            </div>

            {/* Comment thread */}
            {showComments && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    {comments.length === 0 && (
                        <p className="mb-3 text-xs text-slate-400">No messages yet. Start the conversation below.</p>
                    )}
                    {comments.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {comments.map((c, i) => {
                                const isMe = c.user?.toString() === principal?.toString();
                                return (
                                    <div
                                        key={i}
                                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                                                isMe
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-slate-100 text-slate-800'
                                            }`}
                                        >
                                            {c.comment}
                                        </div>
                                        <span className="mt-0.5 text-[10px] text-slate-400">
                                            {isMe ? 'You' : shortPrincipal(c.user)}
                                            {' · '}
                                            {moment(Number(c.ctime) / 1e6).fromNow()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveComment(); } }}
                            placeholder="Type a message…"
                            disabled={saving || isClosed}
                            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={saveComment}
                            disabled={saving || isClosed || !commentText.trim()}
                            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimCard;
