import * as React from "react";
import { useParams } from "react-router-dom";
import { Container, Typography } from "@mui/material";
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
    <Container sx={{ mt: 8 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Listed items by {userId}
      </Typography>

      {loading && <Typography>Loading items...</Typography>}
      {!loading && error && <Typography color="error">{error}</Typography>}
      {!loading && !error && items.length === 0 && (
        <Typography>No listed items found for this user.</Typography>
      )}
      {!loading && !error && items.length > 0 && <ItemList items={items} />}
    </Container>
  );
};

export default UserItems;