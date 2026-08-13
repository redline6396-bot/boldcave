"use client";

import React, { useContext, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ShopContext } from "../context/ShopContext";
import ProductCard from "./ProductCard";

const FALLBACK_PRODUCT_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

export function HomeProducts() {
  const { products = [] } = useContext(ShopContext);

  const topProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.slice(0, 6);
  }, [products]);

  const isProductOutOfStock = (product) => {
    if (!product?.variants || product.variants.length === 0) return false;

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

  return (
    <section className="w-full bg-[#fbf8f1] px-4 py-5 font-body sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="overflow-hidden rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8] shadow-[0_12px_34px_rgba(58,45,29,0.04)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-5 sm:px-6 lg:px-7">
            <div>
              <h2 className="font-display text-[24px] font-medium leading-none tracking-[-0.035em] text-[#332519] sm:text-[27px]">
                Top Selling Products
              </h2>

              <p className="mt-1.5 text-[12px] text-[#5f5648]">
                Bestsellers this week
              </p>
            </div>

            <Link
              href="/collection"
              className="mt-1 hidden items-center gap-1.5 text-[12px] font-semibold text-[#26351f] transition-opacity hover:opacity-70 sm:inline-flex"
            >
              View all products
              <ArrowRight className="h-[14px] w-[14px]" strokeWidth={1.9} />
            </Link>
          </div>

          {/* Product row */}
          {topProducts.length > 0 ? (
            <>
              {/* Grid on mobile/tablet, Scroll on desktop */}
              <div className="hidden lg:block overflow-x-auto px-4 pb-5 [scrollbar-width:none] sm:px-6 lg:px-7 [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-4 sm:gap-5">
                  {topProducts.map((product) => {
                    const productId = product.id || product._id;

                    return (
                      <div
                        key={productId}
                        className="w-[240px] shrink-0 lg:w-[240px] xl:w-[265px]"
                      >
                        <ProductCard
                          product={product}
                          productId={productId}
                          isOutOfStock={isProductOutOfStock}
                          getProductImage={getProductImage}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid on mobile/tablet */}
              <div className="lg:hidden px-4 pb-5 sm:px-6 md:px-7">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:gap-6">
                  {topProducts.map((product) => {
                    const productId = product.id || product._id;

                    return (
                      <div key={productId}>
                        <ProductCard
                          product={product}
                          productId={productId}
                          isOutOfStock={isProductOutOfStock}
                          getProductImage={getProductImage}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 pb-8 text-center">
              <p className="text-sm font-medium text-[#332519]">
                No products available yet.
              </p>

              <p className="mt-1 text-xs text-[#6f6658]">
                Add products from your admin panel to show them here.
              </p>
            </div>
          )}

          {/* Mobile View All */}
          <div className="border-t border-[#eee6d9] px-4 py-4 sm:hidden">
            <Link
              href="/collection"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[5px] border border-[#405526] text-sm font-semibold text-[#405526]"
            >
              View all products
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeProducts;
