import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Principal } from '@dfinity/principal';
import { toast } from 'react-toastify';
import { useEscrow, useGlobalContext, useMenu } from '../components/Store';
import { Item } from 'frontend/api/escrow/escrow.did';
import { MENU_HOME } from '../lib/constants';

export default function GiveAwayPage() {
    const escrow = useEscrow();
    const navigate = useNavigate();
    const { setMenu } = useMenu();
    const params = useParams();
    const { state: { isAuthed, principal } } = useGlobalContext();

    const [item, setItem] = React.useState<Item | null>(null);
    const [recipient, setRecipient] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [recipientError, setRecipientError] = React.useState('');

    React.useEffect(() => {
        if (!params.id) return;
        escrow.getItem(BigInt(params.id)).then(res => {
            setItem(res[0] ?? null);
        });
    }, []);

    const isOwner = item && principal && item.owner.toString() === principal.toString();

    const validateRecipient = (value: string): boolean => {
        if (!value.trim()) {
            setRecipientError('Recipient principal is required');
            return false;
        }
        try {
            Principal.fromText(value.trim());
            setRecipientError('');
            return true;
        } catch {
            setRecipientError('Invalid principal ID format');
            return false;
        }
    };

    const handleGiveAway = () => {
        if (!item) return;
        if (!validateRecipient(recipient)) return;
        setLoading(true);
        escrow.delegateItem(item.id, Principal.fromText(recipient.trim())).then(res => {
            setLoading(false);
            if (res['ok']) {
                toast.success('Item sent successfully!');
                setMenu(MENU_HOME);
                navigate('/');
            } else {
                toast.error(res['err'] ?? 'Failed to give away item');
            }
        });
    };

    return (
        <section className="mt-4 space-y-4">
            <div className="glass-panel rounded-2xl p-3 sm:p-4">
                <button
                    type="button"
                    onClick={() => {
                        setMenu(MENU_HOME);
                        navigate('/');
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-500 hover:text-orange-700"
                >
                    Back to Marketplace
                </button>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Give Away Free Item</p>
            </div>

            {!item && (
                <div className="rounded-3xl border border-white/50 bg-white/75 p-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                    Loading item details...
                </div>
            )}

            {item && !isOwner && (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
                    You do not own this item and cannot give it away.
                </div>
            )}

            {item && isOwner && (
                <div className="reveal-up rounded-3xl border border-white/50 bg-gradient-to-b from-white to-emerald-50/30 p-5 shadow-xl sm:p-6">
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Give Away Free Item</p>
                        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{item.name}</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Send this item directly to someone. They will receive ownership without any payment.
                        </p>
                    </div>

                    {item.image && (
                        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <img
                                className="h-48 w-full object-cover"
                                src={item.image}
                                alt={item.name}
                            />
                        </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 mb-5">
                        <p className="font-semibold text-slate-800 mb-1">Item details</p>
                        <p>{item.description || 'No description provided.'}</p>
                        <p className="mt-2">Type: <span className="font-semibold">{Object.getOwnPropertyNames(item.itype)[0]}</span></p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Recipient Principal ID
                            </label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={(e) => {
                                    setRecipient(e.target.value);
                                    if (recipientError) validateRecipient(e.target.value);
                                }}
                                placeholder="e.g. aaaaa-aa or full principal text"
                                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 ${
                                    recipientError ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                                }`}
                            />
                            {recipientError && (
                                <p className="mt-1 text-xs text-rose-600">{recipientError}</p>
                            )}
                            <p className="mt-1 text-xs text-slate-500">
                                Enter the Internet Computer principal ID of the person you want to give this item to.
                            </p>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            ⚠️ This action is irreversible. The recipient will receive the item once they complete the order flow (no payment required).
                        </div>

                        <button
                            type="button"
                            onClick={handleGiveAway}
                            disabled={loading || !recipient.trim() || !!recipientError}
                            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Sending…
                                </span>
                            ) : (
                                'Give Away Item'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
