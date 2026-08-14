"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";

const categoryLinks = [
  { label: "SHOP ALL", value: "all", href: "/collection" },
  { label: "MEN", value: "men", href: "/collection?category=Men" },
  { label: "WOMEN", value: "women", href: "/collection?category=Women" },
  { label: "UNISEX", value: "unisex", href: "/collection?category=Unisex" },
];

const normalizeCategory = (value) => String(value || "").trim().toLowerCase();

const chunkProducts = (items, size) => {
  const rows = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
};

export default function CollectionPage() {
  const searchParams = useSearchParams();
  const selectedCategory = normalizeCategory(searchParams.get("category")) || "all";

  const visibleProducts = useMemo(() => {
    if (selectedCategory === "all") {
      return products;
    }

    return products.filter(
      (product) => normalizeCategory(product.category) === selectedCategory
    );
  }, [selectedCategory]);

  const hasOddProductCount = visibleProducts.length % 2 === 1;
  const desktopRows = useMemo(() => chunkProducts(visibleProducts, 3), [visibleProducts]);
  const activeCategory =
    categoryLinks.find((category) => category.value === selectedCategory) ||
    categoryLinks[0];

  return (
    <main className="min-h-screen bg-[#ffffff] text-neutral-950">
      <section className="bg-[#ffffff] px-4 pb-3 pt-7 sm:px-6 sm:pb-6 sm:pt-11 lg:px-8 lg:pb-5 lg:pt-12">
        <div className="mx-auto max-w-[1240px]">
          <div className="text-center">
            <h1 className="text-[28px] font-semibold uppercase leading-[1.05] tracking-[0.08em] sm:text-[40px] lg:text-[48px] lg:tracking-[0.075em]">
              Shop the Collection
            </h1>
            <p className="mx-auto mt-3 max-w-[560px] text-[14px] leading-6 text-neutral-500 sm:mt-4 sm:text-[16px]">
              Five fragrances. Five distinct personalities.
            </p>
          </div>

          <nav
            aria-label="Collection categories"
            className="mx-auto mt-5 flex max-w-[620px] flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:mt-8 sm:gap-x-8 lg:gap-x-10"
          >
            {categoryLinks.map((category) => {
              const isActive = activeCategory.value === category.value;

              return (
                <Link
                  key={category.value}
                  href={category.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "flex h-8 shrink-0 items-center justify-center px-1 text-[11px] font-semibold uppercase leading-none tracking-[0.11em] transition-colors duration-200 sm:h-9 sm:text-[12px]",
                    isActive
                      ? "bg-[#ffffff] text-neutral-950 underline decoration-neutral-950 decoration-1 underline-offset-[6px]"
                      : "bg-[#ffffff] text-neutral-500 hover:text-neutral-950",
                  ].join(" ")}
                >
                  {category.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <section className="bg-[#ffffff] px-2.5 pb-8 pt-4 sm:px-6 sm:pb-11 sm:pt-7 lg:px-8 lg:pb-14 lg:pt-8">
        <div className="mx-auto max-w-[1240px]">
          {visibleProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:hidden">
                {visibleProducts.map((product, index) => {
                  const isCenteredLastMobile =
                    hasOddProductCount && index === visibleProducts.length - 1;

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
                      <ProductCard product={product} />
                    </div>
                  );
                })}
              </div>

              <div className="hidden space-y-12 lg:block">
                {desktopRows.map((row) => (
                  <div
                    key={row.map((product) => product.id).join("-")}
                    className={[
                      "grid justify-center justify-items-center gap-x-12 gap-y-12",
                      row.length === 1
                        ? "mx-auto max-w-[388px] grid-cols-1"
                      : row.length === 2
                          ? "mx-auto max-w-[824px] grid-cols-[repeat(2,minmax(0,388px))]"
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
          ) : (
            <div className="mx-auto max-w-[520px] border border-[#e8e2d9] px-5 py-14 text-center sm:px-8 sm:py-16">
              <p className="text-[22px] font-semibold uppercase leading-tight tracking-[0.04em] text-neutral-950 sm:text-[28px]">
                No products available in this collection yet.
              </p>
              <Link
                href="/collection"
                className="mt-7 inline-flex h-11 items-center justify-center border border-neutral-950 px-7 text-[12px] font-semibold uppercase tracking-[0.09em] text-neutral-950 transition-colors duration-200 hover:bg-neutral-950 hover:text-white"
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
