"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  X,
  RotateCcw,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { ShopContext } from "@/context/ShopContext";
import CartPreview from "@/components/CartPreview";
import ProductCard from "@/components/ProductCard";

const FALLBACK_PRODUCT_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-low" },
  { label: "Price: High to Low", value: "price-high" },
  { label: "Highest Rated", value: "rating" },
];

export default function CollectionPage() {
  const searchParams = useSearchParams();
  const { products = [] } = useContext(ShopContext);

  const allProducts = Array.isArray(products) ? products : [];

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams.get("category");

    if (categoryParam) setSelectedCategory(categoryParam);
  }, [searchParams]);

  useEffect(() => {
    document.body.style.overflow = showMobileFilters ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showMobileFilters]);

  const categories = useMemo(() => {
    const dynamicCategories = allProducts.flatMap((product) => {
      if (Array.isArray(product.categories)) return product.categories;
      if (product.category) return [product.category];
      return [];
    });

    return ["All", ...new Set(dynamicCategories.filter(Boolean))];
  }, [allProducts]);

  const tags = useMemo(() => {
    const dynamicTags = allProducts.flatMap((product) => {
      return Array.isArray(product.tags) ? product.tags : [];
    });

    return ["All", ...new Set(dynamicTags.filter(Boolean))];
  }, [allProducts]);

  const getProductPrice = (product) => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return Number(product.variants[0].sellingPrice) || 0;
    }

    return Number(product?.price) || 0;
  };

  const isProductOutOfStock = (product) => {
    if (!Array.isArray(product?.variants) || product.variants.length === 0) {
      return false;
    }

    return product.variants.every(
      (variant) => Number(variant.stockQty || 0) === 0
    );
  };

  const getProductImage = (product) => {
    if (product?.image) return product.image;

    if (Array.isArray(product?.images) && product.images.length > 0) {
      const firstImage = product.images[0];

      if (typeof firstImage === "string") return firstImage;
      if (firstImage?.url) return firstImage.url;
    }

    return FALLBACK_PRODUCT_IMAGE;
  };

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const productCategories = Array.isArray(product.categories)
        ? product.categories
        : product.category
          ? [product.category]
          : [];

      const productTags = Array.isArray(product.tags) ? product.tags : [];

      const categoryMatch =
        selectedCategory === "All" ||
        productCategories.includes(selectedCategory);

      const tagMatch = selectedTag === "All" || productTags.includes(selectedTag);

      return categoryMatch && tagMatch;
    });
  }, [allProducts, selectedCategory, selectedTag]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === "price-low") return getProductPrice(a) - getProductPrice(b);
      if (sortBy === "price-high") return getProductPrice(b) - getProductPrice(a);

      if (sortBy === "rating") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }

      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();

      if (bTime || aTime) return bTime - aTime;

      return String(b._id || b.id || "").localeCompare(
        String(a._id || a.id || "")
      );
    });
  }, [filteredProducts, sortBy]);

  const hasActiveFilters =
    selectedCategory !== "All" || selectedTag !== "All";

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedTag("All");
    setSortBy("newest");
  };

  return (
    <main className="min-h-screen bg-[#fbf8f1] font-body text-[#332519]">
      {/* Compact Header */}
      <section className="border-b border-[#e8dfd1] bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 md:px-8 lg:px-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#405526]">
                Shop Collection
              </p>

              <h1 className="font-display text-[34px] font-medium leading-[0.98] tracking-[-0.045em] text-[#332519] sm:text-[40px] md:text-[44px]">
                Your Daily Kitchen
              </h1>

              <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#5f5648] sm:text-[14px]">
                Browse atta, rice, pulses, millets and everyday pantry
                essentials for Indian kitchens.
              </p>
            </div>

            <div className="hidden text-right lg:block">
              <p className="text-[13px] text-[#5f5648]">
                Showing{" "}
                <span className="font-semibold text-[#332519]">
                  {sortedProducts.length}
                </span>{" "}
                products
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tools + Chips */}
      <section className="border-b border-[#e8dfd1] bg-[#fbf8f1]">
        <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-7 md:px-8 lg:px-12">
          {/* Sort Row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[13px] text-[#5f5648]">
                Refine products by category or tag.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#5f5648] lg:hidden sm:text-[14px]">
                <span className="font-semibold text-[#332519]">
                  {sortedProducts.length}
                </span>{" "}
                products
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#ded4c3] bg-[#fffdf8] px-4 text-[13px] font-medium text-[#332519] sm:text-[14px] md:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={1.7} />
                  Filters
                </button>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-10 appearance-none rounded-full border border-[#ded4c3] bg-[#fffdf8] pl-4 pr-9 text-[13px] font-medium text-[#332519] sm:text-[14px] outline-none transition-colors focus:border-[#405526]"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#405526]"
                    strokeWidth={1.7}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop / Tablet Category Chips */}
          <div className="mt-5 hidden flex-wrap gap-2 md:flex">
            {categories.map((category) => (
              <FilterChip
                key={category}
                label={category}
                active={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              />
            ))}
          </div>

          {/* Tags - only if useful */}
          {tags.length > 1 && (
            <div className="mt-3 hidden flex-wrap gap-2 md:flex">
              {tags.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  active={selectedTag === tag}
                  onClick={() => setSelectedTag(tag)}
                  subtle
                />
              ))}
            </div>
          )}

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {selectedCategory !== "All" && (
                <ActivePill
                  label={selectedCategory}
                  onRemove={() => setSelectedCategory("All")}
                />
              )}

              {selectedTag !== "All" && (
                <ActivePill
                  label={selectedTag}
                  onRemove={() => setSelectedTag("All")}
                />
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] sm:text-[13px] font-medium text-[#405526] hover:bg-[#f1eadf]"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
                Reset
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-[1440px] px-5 py-6 sm:px-7 md:px-8 lg:px-12 lg:py-8">
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-5 xl:gap-6">
            {sortedProducts.map((product) => {
              const productId = product.id || product._id;

              return (
                <ProductCard
                  key={productId}
                  product={product}
                  productId={productId}
                  isOutOfStock={isProductOutOfStock}
                  getProductImage={getProductImage}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState resetFilters={resetFilters} />
        )}
      </section>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[100] bg-[#172111]/45 md:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 h-full w-full"
            onClick={() => setShowMobileFilters(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-[22px] bg-[#fffdf8] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8dfd1] bg-[#fffdf8] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#405526]">
                  Refine
                </p>
                <h2 className="mt-1 font-display text-[28px] font-medium leading-none text-[#332519]">
                  Filters
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3ede2] text-[#332519]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-7 px-5 py-5">
              <MobileFilterGroup title="Categories">
                {categories.map((category) => (
                  <FilterChip
                    key={category}
                    label={category}
                    active={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </MobileFilterGroup>

              {tags.length > 1 && (
                <MobileFilterGroup title="Tags">
                  {tags.map((tag) => (
                    <FilterChip
                      key={tag}
                      label={tag}
                      active={selectedTag === tag}
                      onClick={() => setSelectedTag(tag)}
                      subtle
                    />
                  ))}
                </MobileFilterGroup>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex h-11 items-center justify-center rounded-[6px] border border-[#405526] text-sm font-semibold text-[#405526]"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="flex h-11 items-center justify-center rounded-[6px] bg-[#405526] text-sm font-semibold text-white"
                >
                  Show {sortedProducts.length}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartPreview />
    </main>
  );
}

function FilterChip({ label, active, onClick, subtle = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full border px-4 text-[13px] sm:text-[14px] transition-colors ${
        active
          ? "border-[#405526] bg-[#405526] font-medium text-white"
          : subtle
            ? "border-[#ded4c3] bg-[#fffdf8] text-[#5f5648] hover:border-[#bfb094]"
            : "border-[#ded4c3] bg-[#fffdf8] text-[#332519] hover:border-[#405526]"
      }`}
    >
      {label}
    </button>
  );
}

function ActivePill({ label, onRemove }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[#d8ceb9] bg-[#fffdf8] pl-3 pr-2 text-[12px] sm:text-[13px] text-[#4f463c]">
      {label}

      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f3ede2] text-[#405526]"
      >
        <X className="h-3 w-3" strokeWidth={1.8} />
      </button>
    </span>
  );
}

function MobileFilterGroup({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7a756b]">
        {title}
      </h3>

      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function EmptyState({ resetFilters }) {
  return (
    <div className="rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8] px-5 py-16 text-center">
      <p className="font-display text-[30px] font-medium text-[#332519]">
        No products found.
      </p>

      <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-[#5f5648]">
        Try changing your category, tag or search term to see more products.
      </p>

      <button
        type="button"
        onClick={resetFilters}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-6 text-sm font-semibold text-white"
      >
        Reset filters
      </button>
    </div>
  );
}
