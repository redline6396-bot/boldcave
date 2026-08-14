"use client";

import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";

export default function CollectionSection() {
  const topRowProducts = products.slice(0, 3);
  const bottomRowProducts = products.slice(3, 5);
  const hasOddMobileProduct = products.length % 2 === 1;

  return (
    <section className="bg-white px-2.5 pb-8 pt-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="text-center">
          <h2 className="whitespace-nowrap text-[24px] font-semibold uppercase leading-none tracking-[0.035em] text-neutral-950 sm:text-[38px] sm:tracking-[0.06em]">
            SHOP THE COLLECTION
          </h2>
          <p className="mt-3 text-[15px] font-normal leading-relaxed text-neutral-500 sm:mt-5">
            Five fragrances. Five distinct personalities.
          </p>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-x-2.5 gap-y-8 sm:mt-14 sm:gap-x-8 sm:gap-y-10 lg:hidden">
          {products.map((product, index) => {
            const isCenteredLast =
              hasOddMobileProduct && index === products.length - 1;

            return (
              <div
                key={product.id}
                className={[
                  "min-w-0",
                  isCenteredLast ? "col-span-2 mx-auto w-[calc(50%_-_5px)] sm:w-[calc(50%_-_16px)]" : "",
                ].join(" ")}
              >
                <ProductCard product={product} />
              </div>
            );
          })}
        </div>

        <div className="mt-14 hidden space-y-10 lg:block">
          <div className="grid grid-cols-3 justify-items-center gap-8">
            {topRowProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mx-auto grid max-w-[840px] grid-cols-2 justify-items-center gap-8">
            {bottomRowProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
