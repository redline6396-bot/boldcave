"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { fetchHomepageSettings, fetchProducts } from "@/lib/clientApi";

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

export default function CollectionSection() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);

    Promise.all([fetchProducts(), fetchHomepageSettings().catch(() => null)])
      .then(([apiProducts, homepageSettings]) => {
        if (isMounted) {
          setProducts(sortFeaturedProducts(apiProducts));
          setSettings(homepageSettings);
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
          <h2 className="whitespace-nowrap text-[24px] font-semibold uppercase leading-none tracking-[0.035em] text-neutral-950 sm:text-[38px] sm:tracking-[0.06em] lg:text-[34px] lg:tracking-[0.055em]">
            SHOP THE COLLECTION
          </h2>

          <p className="mt-3 text-[15px] font-normal leading-relaxed text-neutral-500 sm:mt-5 lg:mt-4 lg:text-[14px]">
            {formatCollectionSubtitle(fragranceCount, personalityCount)}
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
                  {row.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ))}
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

        <div className="grid grid-cols-3 justify-items-center gap-8 lg:gap-7">
          {Array.from({ length: 3 }).map((_, index) => (
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
