"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { fetchProducts } from "@/lib/clientApi";

export default function CollectionSection() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let isMounted = true;

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

        {products.length > 0 && (
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
        )}
      </div>
    </section>
  );
}
