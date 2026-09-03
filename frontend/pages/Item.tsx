import * as React from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { useEscrow } from '../components/Store';
import OfferDetail from '../components/offers/OfferDetail';
import { Item } from 'frontend/api/escrow/service.did';

export default () => {
    const escrow = useEscrow();
    const navigate = useNavigate();
    const params = useParams();

    const [offer, setOffer] = React.useState<Item | null>();

    React.useEffect(() => {
        escrow.getItem(BigInt(params.id)).then(res => {
            setOffer(res[0]);
        });
    }, []);

    return (
        <section className="mt-4 space-y-4">
            <div className="glass-panel rounded-2xl p-3 sm:p-4">
                <button
                    type="button"
                    onClick={() => navigate('/market')}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-500 hover:text-orange-700"
                >
                    ← Back to Marketplace
                </button>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Product Detail</p>
            </div>

            {offer ? (
                <OfferDetail offer={offer} />
            ) : (
                <div className="rounded-3xl border border-white/50 bg-white/75 p-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                    Loading item details...
                </div>
            )}
        </section>
    );
}
