"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { fetchProducts } from "@/lib/clientApi";

function getProductId(product) {
  return String(product?._id || product?.id || "");
}

function pickRandomProducts(products, currentProductId, currentSlug, count = 4) {
  const filtered = products.filter((product) => {
    const sameId =
      currentProductId &&
      getProductId(product) === String(currentProductId);

    const sameSlug =
      currentSlug &&
      product?.slug &&
      product.slug === currentSlug;

    return !sameId && !sameSlug;
  });

  const shuffled = [...filtered];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
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
        const response = await fetchProducts();

        const allProducts = Array.isArray(response)
          ? response
          : Array.isArray(response?.products)
            ? response.products
            : [];

        if (!cancelled) {
          setProducts(
            pickRandomProducts(
              allProducts,
              currentProductId,
              currentSlug,
              4
            )
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}
