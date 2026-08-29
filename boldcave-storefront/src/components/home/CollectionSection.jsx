"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { useCart } from "@/context/CartContext";

const sortFeaturedProducts = (products) =>
  [...products]
    .filter((product) => product.featured === true)
    .sort((left, right) => {
      const leftOrder = Number(left.featuredOrder) || Number.MAX_SAFE_INTEGER;
      const rightOrder = Number(right.featuredOrder) || Number.MAX_SAFE_INTEGER;

      return (
        leftOrder - rightOrder ||
        String(left.name || "").localeCompare(String(right.name || ""))
      );
    });

const buildDesktopRows = (products) => {
  const rows = [];

  for (let index = 0; index < products.length; index += 3) {
    rows.push(products.slice(index, index + 3));
  }

  return rows;
};

const formatCollectionSubtitle = (fragranceCount, personalityCount) => {
  const fragranceWord = fragranceCount === 1 ? "fragrance" : "fragrances";
  const personalityWord =
    personalityCount === 1
      ? "distinct personality"
      : "distinct personalities";

  return `${fragranceCount} ${fragranceWord}. ${personalityCount} ${personalityWord}.`;
};

export default function CollectionSection({
  initialProducts = [],
  initialSettings = null,
}) {
  const { rememberProducts } = useCart();
  const [products] = useState(() => sortFeaturedProducts(initialProducts));
  const [settings] = useState(initialSettings);

  useEffect(() => {
    rememberProducts(products);
  }, [products, rememberProducts]);

  const desktopRows = useMemo(() => buildDesktopRows(products), [products]);
  const hasOddMobileProduct = products.length % 2 === 1;

  const fallbackCount = products.filter(
    (product) => product.productType !== "combo"
  ).length;

  const fragranceCount = Number.isFinite(
    Number(settings?.collectionFragranceCount)
  )
    ? Number(settings.collectionFragranceCount)
    : fallbackCount;

  const personalityCount = Number.isFinite(
    Number(settings?.collectionPersonalityCount)
  )
    ? Number(settings.collectionPersonalityCount)
    : fallbackCount;

  return (
    <section className="bg-white px-2.5 pb-8 pt-8 sm:px-6 sm:py-10 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1280px] lg:max-w-[1160px]">
        <div className="text-center">
          <h2 className="whitespace-nowrap text-[28px] font-semibold uppercase leading-none tracking-[0.03em] text-neutral-950 max-[450px]:text-[25px] max-[390px]:text-[23px] sm:text-[38px] sm:tracking-[0.06em] lg:text-[34px] lg:tracking-[0.055em]">
            SHOP THE COLLECTION
          </h2>

          <p className="mt-3 text-[15px] font-normal leading-relaxed text-neutral-500 sm:mt-5 lg:mt-4 lg:text-[14px]">
            {formatCollectionSubtitle(fragranceCount, personalityCount)}
          </p>

          <Link
            href="/collection"
            className="mt-1.5 inline-flex text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-950 sm:mt-2 sm:text-[10px]"
          >
            View all
          </Link>
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
                    <ProductCard product={product} priority={index < 2} />
                  </div>
                );
              })}
            </div>

            <div className="mt-14 hidden space-y-10 lg:mt-11 lg:block lg:space-y-8">
              {desktopRows.map((row, rowIndex) => (
                <div
                  key={`featured-row-${rowIndex}`}
                  className={[
                    "grid justify-center justify-items-center gap-8 lg:gap-7",
                    row.length === 1
                      ? "mx-auto max-w-[388px] grid-cols-1"
                      : row.length === 2
                        ? "mx-auto max-w-[840px] grid-cols-[repeat(2,minmax(0,388px))] lg:max-w-[760px]"
                        : "grid-cols-[repeat(3,minmax(0,388px))]",
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
        ) : null}
      </div>
    </section>
  );
}
