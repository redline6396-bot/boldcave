import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";

export const metadata = {
  title: "Product Card Preview",
};

export default function ProductCardPreviewPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf6] px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1180px]">
        <div className="grid grid-cols-1 justify-items-center gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
