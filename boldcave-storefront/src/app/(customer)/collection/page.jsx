import CollectionClient from "./CollectionClient";
import { getCatalogProducts } from "@/lib/products/public";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  let initialProducts = [];
  let initialError = "";

  try {
    initialProducts = await getCatalogProducts();
  } catch (error) {
    initialError = error?.message || "Unable to load products.";
  }

  return (
    <CollectionClient
      initialProducts={initialProducts}
      initialError={initialError}
    />
  );
}
