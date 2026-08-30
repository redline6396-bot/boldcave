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
  const [loading, setLoading] = useState(Boolean(currentProductId));

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      if (!currentProductId) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

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
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [currentProductId, currentSlug]);

  if (!loading && !products.length) {
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
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <RelatedProductSkeleton key={index} />
              ))
            : products.map((product) => (
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

function RelatedProductSkeleton() {
  return (
    <article
      className="mx-auto w-full max-w-[388px] border border-[#e8e2d9] bg-white"
      aria-hidden="true"
    >
      <div className="aspect-square w-full bg-neutral-50" />
      <div className="px-3 pb-4 pt-3 text-center max-[450px]:px-2.5 max-[450px]:pb-3 max-[450px]:pt-3 sm:px-6 sm:pb-6 sm:pt-4">
        <div className="mx-auto h-5 w-3/4 bg-neutral-100 max-[450px]:h-4 sm:h-6" />
        <div className="mx-auto mt-2 h-2.5 w-20 bg-neutral-100" />
        <div className="mx-auto mt-3 h-3 w-2/3 bg-neutral-100" />
        <div className="mx-auto mt-4 h-4 w-24 bg-neutral-100" />
        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:mx-auto sm:w-[92%] sm:gap-2">
          <div className="h-10 border border-neutral-200 bg-neutral-50 max-[450px]:h-8 sm:h-9" />
          <div className="h-10 border border-neutral-200 bg-neutral-50 max-[450px]:h-8 sm:h-9" />
        </div>
        <div className="mt-3 h-11 w-full border border-neutral-200 bg-neutral-100 max-[450px]:h-9 sm:mx-auto sm:w-[92%]" />
      </div>
    </article>
  );
}
