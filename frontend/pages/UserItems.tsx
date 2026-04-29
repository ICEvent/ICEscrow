import * as React from "react";
import { useParams } from "react-router-dom";
import { Principal } from "@dfinity/principal";
import ItemList from "../components/items/ItemList";
import { useEscrow } from "../components/Store";
import ReputationBadge from "../components/profile/ReputationBadge";
import UserReviews from "../components/profile/UserReviews";
import { UserStats } from "../api/escrow/service.did";
import PrincipalName from "../components/PrincipalName";

const PAGE_SIZE = 10;
const MAX_PAGES_TO_SCAN = 200;

const UserItems = () => {
  const { userId } = useParams();
  const escrow = useEscrow();

  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [stats, setStats] = React.useState<UserStats | null>(null);

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

  return (
    <div className="mt-4">
      <div className="mb-4 rounded-3xl border border-white/50 bg-white/75 p-5 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Seller Storefront</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Listed items by <PrincipalName principal={userId} />
        </h1>
        <p className="mt-1 text-sm text-slate-600">Browse the seller catalog and create protected escrow deals.</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ReputationBadge stats={stats} />
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