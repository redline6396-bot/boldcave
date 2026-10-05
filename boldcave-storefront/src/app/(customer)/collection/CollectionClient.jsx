"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import CollectionCategoryNav from "@/components/collection/CollectionCategoryNav";
import ProductCard from "@/components/product/ProductCard";
import { useCart } from "@/context/CartContext";
import {
  matchesProductCategory,
  normalizeProductCategory,
} from "@/lib/products/categories";

const chunkProducts = (items, size) => {
  const rows = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
};

function CollectionContent({ initialProducts = [], initialError = "" }) {
  const searchParams = useSearchParams();
  const { rememberProducts } = useCart();
  const selectedCategory =
    normalizeProductCategory(searchParams.get("category")) || "all";

  useEffect(() => {
    rememberProducts(initialProducts);
  }, [initialProducts, rememberProducts]);

  const visibleProducts = useMemo(
    () =>
      initialProducts.filter((product) =>
        matchesProductCategory(product, selectedCategory)
      ),
    [initialProducts, selectedCategory]
  );

  const hasOddProductCount = visibleProducts.length % 2 === 1;
  const desktopRows = useMemo(
    () => chunkProducts(visibleProducts, 3),
    [visibleProducts]
  );
  return (
    <main className="min-h-screen bg-[#ffffff] text-neutral-950">
      <section className="bg-[#ffffff] px-4 pb-3 pt-7 sm:px-6 sm:pb-6 sm:pt-11 lg:px-8 lg:pb-4 lg:pt-10">
        <div className="mx-auto max-w-[1160px]">
          <div className="text-center">
            <h1 className="text-[28px] font-semibold uppercase leading-[1.05] tracking-[0.08em] sm:text-[40px] lg:text-[44px] lg:tracking-[0.072em]">
              Shop the Collection
            </h1>

            <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-6 text-neutral-500 sm:mt-4 sm:text-[16px] lg:text-[15px]">
              Explore the complete Bold Cave collection.
            </p>
          </div>

          <CollectionCategoryNav
            activeCategory={selectedCategory}
            className="mt-5 sm:mt-8 lg:mt-7"
          />
        </div>
      </section>

      <section className="bg-[#ffffff] px-2.5 pb-8 pt-4 sm:px-6 sm:pb-11 sm:pt-7 lg:px-8 lg:pb-12 lg:pt-6">
        <div className="mx-auto max-w-[1160px]">
          {visibleProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:hidden">
                {visibleProducts.map((product, index) => {
                  const isCenteredLastMobile =
                    hasOddProductCount &&
                    index === visibleProducts.length - 1;

                  return (
                    <div
                      key={product.id}
                      className={[
                        "min-w-0",
                        isCenteredLastMobile
                          ? "col-span-2 mx-auto w-[calc(50%_-_5px)] sm:w-[calc(50%_-_16px)]"
                          : "",
                      ].join(" ")}
                    >
                      <ProductCard product={product} priority={index < 2} />
                    </div>
                  );
                })}
              </div>

              <div className="hidden space-y-10 lg:block">
                {desktopRows.map((row, rowIndex) => (
                  <div
                    key={row.map((product) => product.id).join("-")}
                    className={[
                      "grid justify-center justify-items-center gap-x-10 gap-y-10",
                      row.length === 1
                        ? "mx-auto max-w-[360px] grid-cols-1"
                        : row.length === 2
                          ? "mx-auto max-w-[760px] grid-cols-[repeat(2,minmax(0,360px))]"
                          : "grid-cols-[repeat(3,minmax(0,360px))]",
                    ].join(" ")}
                  >
                    {row.map((product, productIndex) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        priority={rowIndex === 0 && productIndex < 3}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-[520px] border border-[#e8e2d9] px-5 py-14 text-center sm:px-8 sm:py-16">
              <p className="text-[22px] font-semibold uppercase leading-tight tracking-[0.04em] text-neutral-950 sm:text-[28px]">
                {initialError || "No products available in this collection yet."}
              </p>

              <Link
                href="/collection"
                className="mt-7 inline-flex h-11 cursor-pointer items-center justify-center border border-neutral-950 px-7 text-[12px] font-semibold uppercase tracking-[0.09em] text-neutral-950 transition-colors duration-200 hover:bg-neutral-950 hover:text-white"
              >
                SHOP ALL
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function CollectionClient({ initialProducts = [], initialError = "" }) {
  return (
    <Suspense fallback={null}>
      <CollectionContent
        initialProducts={initialProducts}
        initialError={initialError}
      />
    </Suspense>
  );
}
