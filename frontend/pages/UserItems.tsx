import * as React from "react";
import { useParams } from "react-router-dom";
import { Principal } from "@dfinity/principal";
import { toast } from "react-toastify";
import ItemList from "../components/items/ItemList";
import { useEscrow, useGlobalContext } from "../components/Store";
import ReputationBadge from "../components/profile/ReputationBadge";
import UserReviews from "../components/profile/UserReviews";
import { UserStats } from "../api/escrow/service.did";

const PAGE_SIZE = 10;
const MAX_PAGES_TO_SCAN = 200;

const UserItems = () => {
  const { userId } = useParams();
  const escrow = useEscrow();
  const { state: { isAuthed, principal } } = useGlobalContext();

  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [stats, setStats] = React.useState<UserStats | null>(null);
  const [hearting, setHearting] = React.useState(false);
  const [hearted, setHearted] = React.useState(false);

  const isOwner = userId && principal && userId === principal.toString();

  React.useEffect(() => {
    if (!userId) {
      setItems([]);
      setError("Missing user id");
      return;
    }

    let cancelled = false;

    const loadUserItems = async () => {
      try {
        setLoading(true);
        setError("");

        const matchedItems: any[] = [];
        for (let page = 1; page <= MAX_PAGES_TO_SCAN; page++) {
          const pageItems = await escrow.getItems(BigInt(page));
          if (!pageItems || pageItems.length === 0) {
            break;
          }

          matchedItems.push(
            ...pageItems.filter((item) => item.owner?.toString() === userId),
          );

          if (pageItems.length < PAGE_SIZE) {
            break;
          }
        }

        if (!cancelled) {
          setItems(matchedItems);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load this user's listed items");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const loadStats = async () => {
      try {
        const target = Principal.fromText(userId);
        const s = await escrow.getUserStats(target);
        if (!cancelled) setStats(s);
      } catch {
        // stats are best-effort
      }
    };

    loadUserItems();
    loadStats();

    return () => {
      cancelled = true;
    };
  }, [escrow, userId]);

  const handleHeart = () => {
    if (!userId) return;
    setHearting(true);
    escrow.heartUser(Principal.fromText(userId)).then((res) => {
      setHearting(false);
      if (res['ok'] !== undefined) {
        setHearted(true);
        toast.success('❤️ Hearted!');
        // refresh stats
        escrow.getUserStats(Principal.fromText(userId)).then(setStats).catch(() => {});
      } else {
        toast.error(res['err'] ?? 'Failed to heart user');
      }
    }).catch(() => {
      setHearting(false);
      toast.error('Failed to heart user');
    });
  };

  return (
    <div className="mt-4">
      <div className="mb-4 rounded-3xl border border-white/50 bg-white/75 p-5 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Seller Storefront</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Listed items by {userId}
        </h1>
        <p className="mt-1 text-sm text-slate-600">Browse the seller catalog and create protected escrow deals.</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ReputationBadge stats={stats} />
          {isAuthed && !isOwner && (
            <button
              type="button"
              onClick={handleHeart}
              disabled={hearting || hearted}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hearted ? '❤️ Hearted' : hearting ? '…' : '🤍 Heart'}
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-slate-600">Loading items...</p>}
      {!loading && error && <p className="text-rose-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-slate-600">No listed items found for this user.</p>
      )}
      {!loading && !error && items.length > 0 && <ItemList items={items} />}

      {userId && <UserReviews userId={userId} />}
    </div>
  );
};

export default UserItems;