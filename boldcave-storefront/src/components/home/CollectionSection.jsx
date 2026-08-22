"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { fetchProducts } from "@/lib/clientApi";

export default function CollectionSection() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);

    fetchProducts()
      .then((apiProducts) => {
        if (isMounted) {
          setProducts(apiProducts.slice(0, 5));
        }
      })
      .catch(() => {
        if (isMounted) {
          setProducts([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const topRowProducts = useMemo(() => products.slice(0, 3), [products]);
  const bottomRowProducts = useMemo(() => products.slice(3, 5), [products]);
  const hasOddMobileProduct = products.length % 2 === 1;

  return (
    <section className="bg-white px-2.5 pb-8 pt-8 sm:px-6 sm:py-10 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1280px] lg:max-w-[1160px]">
        <div className="text-center">
          <h2 className="whitespace-nowrap text-[24px] font-semibold uppercase leading-none tracking-[0.035em] text-neutral-950 sm:text-[38px] sm:tracking-[0.06em] lg:text-[34px] lg:tracking-[0.055em]">
            SHOP THE COLLECTION
          </h2>

          <p className="mt-3 text-[15px] font-normal leading-relaxed text-neutral-500 sm:mt-5 lg:mt-4 lg:text-[14px]">
            Five fragrances. Five distinct personalities.
          </p>
        </div>

        {products.length > 0 ? (
          <>
            <div className="mt-9 grid grid-cols-2 gap-x-2.5 gap-y-8 sm:mt-14 sm:gap-x-8 sm:gap-y-10 lg:hidden">
              {products.map((product, index) => {
                const isCenteredLast =
                  hasOddMobileProduct && index === products.length - 1;

                return (
                  <div
                    key={product.id}
                    className={[
                      "min-w-0",
                      isCenteredLast
                        ? "col-span-2 mx-auto w-[calc(50%_-_5px)] sm:w-[calc(50%_-_16px)]"
                        : "",
                    ].join(" ")}
                  >
                    <ProductCard product={product} />
                  </div>
                );
              })}
            </div>

            <div className="mt-14 hidden space-y-10 lg:mt-11 lg:block lg:space-y-8">
              <div className="grid grid-cols-3 justify-items-center gap-8 lg:gap-7">
                {topRowProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mx-auto grid max-w-[840px] grid-cols-2 justify-items-center gap-8 lg:max-w-[760px] lg:gap-7">
                {bottomRowProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </>
        ) : isLoading ? (
          <CollectionSkeleton />
        ) : null}
      </div>
    </section>
  );
}

function CollectionSkeleton() {
  return (
    <>
      <div className="mt-9 grid grid-cols-2 gap-x-2.5 gap-y-8 sm:mt-14 sm:gap-x-8 sm:gap-y-10 lg:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>

      <div className="mt-14 hidden space-y-10 lg:mt-11 lg:block lg:space-y-8">
        <div className="grid grid-cols-3 justify-items-center gap-8 lg:gap-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
        <div className="mx-auto grid max-w-[840px] grid-cols-2 justify-items-center gap-8 lg:max-w-[760px] lg:gap-7">
          {Array.from({ length: 2 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[388px] border border-[#e8e2d9] bg-white">
      <div className="aspect-square animate-pulse bg-neutral-100" />
      <div className="px-3 pb-4 pt-3 text-center sm:px-6 sm:pb-6 sm:pt-4">
        <div className="mx-auto h-4 w-28 animate-pulse bg-neutral-100 sm:h-5 sm:w-40" />
        <div className="mx-auto mt-2 h-2.5 w-20 animate-pulse bg-neutral-100 sm:w-24" />
        <div className="mx-auto mt-3 h-3 w-32 animate-pulse bg-neutral-100 sm:w-44" />
        <div className="mx-auto mt-4 h-4 w-24 animate-pulse bg-neutral-100 sm:w-28" />
        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:gap-2">
          <div className="h-8 animate-pulse bg-neutral-100 sm:h-9" />
          <div className="h-8 animate-pulse bg-neutral-100 sm:h-9" />
        </div>
        <div className="mt-3 h-9 animate-pulse bg-neutral-100 sm:mx-auto sm:h-11 sm:w-[92%]" />
      </div>
    </div>
  );
}
