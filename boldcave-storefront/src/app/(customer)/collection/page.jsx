import CollectionClient from "./CollectionClient";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getCatalogProducts } from "@/lib/products/public";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Perfume Collection",
  description:
    "Shop Bold Cave premium perfumes and fragrances across men, women and unisex collections.",
  alternates: {
    canonical: "/collection",
  },
};

export default async function CollectionPage() {
  let initialProducts = [];
  let initialError = "";

  try {
    initialProducts = await withRuntimeDatabase(() => getCatalogProducts());
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
