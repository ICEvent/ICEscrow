import * as React from "react";
import { useParams } from "react-router-dom";
import ItemList from "../components/items/ItemList";
import { useEscrow } from "../components/Store";

const PAGE_SIZE = 10;
const MAX_PAGES_TO_SCAN = 200;

const UserItems = () => {
  const { userId } = useParams();
  const escrow = useEscrow();

  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

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

    loadUserItems();

    return () => {
      cancelled = true;
    };
  }, [escrow, userId]);

  return (
    <div className="mt-8">
      <h1 className="mb-3 text-2xl font-semibold text-slate-900">
        Listed items by {userId}
      </h1>

      {loading && <p className="text-slate-600">Loading items...</p>}
      {!loading && error && <p className="text-rose-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-slate-600">No listed items found for this user.</p>
      )}
      {!loading && !error && items.length > 0 && <ItemList items={items} />}
    </div>
  );
};

export default UserItems;