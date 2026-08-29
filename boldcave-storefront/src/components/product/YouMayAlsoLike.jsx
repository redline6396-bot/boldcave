"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { fetchRelatedProducts } from "@/lib/clientApi";

function getProductId(product) {
  return String(product?._id || product?.id || "");
}

export default function YouMayAlsoLike({
  currentProductId = "",
  currentSlug = "",
}) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetchRelatedProducts(currentProductId);

        if (!cancelled) {
          setProducts(
            response.filter((product) => product?.slug !== currentSlug)
          );
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [currentProductId, currentSlug]);

  if (!products.length) {
    return null;
  }

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-[1380px] px-5 sm:px-6 lg:px-8">
        <div className="mb-6 text-center sm:mb-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
            Discover More
          </p>

          <h2 className="mt-2 font-serif text-[30px] font-normal tracking-[-0.02em] text-black sm:text-[36px] lg:text-[40px]">
            You May Also Like
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product) => (
            <ProductCard
              key={getProductId(product) || product.slug}
              product={product}
              priority={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
