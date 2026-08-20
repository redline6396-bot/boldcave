"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { getProductImageUrl } from "@/lib/clientApi";

const CURRENCY = "\u20b9";
const PLACEHOLDER_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `${CURRENCY} ${formatPrice(value)}`;

const getDefaultVariant = (variants) =>
  variants.find((variant) => Number(variant.stock) > 0) || variants[0];

export default function ProductCard({ product }) {
  const router = useRouter();
  const { addToCart } = useCart();

  const variants = product?.variants || [];

  const defaultVariant = getDefaultVariant(variants);

  const [selectedSize, setSelectedSize] = useState(
    defaultVariant?.size || ""
  );

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.size === selectedSize),
    [selectedSize, variants]
  );

  useEffect(() => {
    if (!variants.length) {
      return;
    }

    const currentVariant = variants.find(
      (variant) => variant.size === selectedSize
    );

    if (currentVariant) {
      return;
    }

    setSelectedSize(getDefaultVariant(variants)?.size || "");
  }, [selectedSize, variants]);

  if (!product) {
    return null;
  }

  const isSelectedOutOfStock = !selectedVariant || Number(selectedVariant.stock) <= 0;

  const productImage =
    getProductImageUrl(product.images?.[0]) || PLACEHOLDER_IMAGE;

  const hoverImage =
    getProductImageUrl(product.images?.[1]) || "";

  const hasHoverImage = Boolean(hoverImage);

  const productUrl = `/product/${product.slug}`;

  const profileLine =
    product.fragranceNotes?.top?.slice(0, 3).join(" | ") ||
    product.fragranceProfile;

  const handleNavigate = () => {
    router.push(productUrl);
  };

  const handleAddToCart = () => {
    if (isSelectedOutOfStock) {
      return;
    }

    addToCart(product, selectedSize, 1);
  };

  return (
    <article className="group mx-auto w-full max-w-[388px] cursor-pointer border border-[#e8e2d9] bg-white">
      {/* PRODUCT IMAGE */}
      <button
        type="button"
        onClick={handleNavigate}
        className="block w-full cursor-pointer bg-white"
        aria-label={`View ${product.name}`}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-white">
          <img
            src={productImage}
            alt={product.name}
            className={[
              "absolute inset-0 h-full w-full object-contain transition-opacity duration-200",
              isSelectedOutOfStock ? "grayscale-[45%] opacity-85" : "",
              hasHoverImage
                ? "opacity-100 group-hover:opacity-0"
                : "opacity-100",
            ].join(" ")}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
          />

          {hasHoverImage && (
            <img
              src={hoverImage}
              alt={`${product.name} alternate view`}
              className={[
                "absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                isSelectedOutOfStock ? "grayscale-[45%]" : "",
              ].join(" ")}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      </button>

      {/* PRODUCT INFORMATION */}
      <div className="px-3 pb-4 pt-3 text-center max-[370px]:px-2 max-[370px]:pb-3 sm:px-6 sm:pb-6 sm:pt-4">

        {/* PRODUCT NAME */}
        <button
          type="button"
          onClick={handleNavigate}
          className="inline-block cursor-pointer text-[14px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-950 max-[370px]:text-[12px] sm:text-[21px] sm:tracking-[0.09em]"
        >
          <span className="decoration-neutral-500 decoration-[0.75px] underline-offset-[5px] group-hover:underline">
            {product.name}
          </span>
        </button>

        {/* BRAND */}
        <p className="mt-1.5 text-[8px] font-normal uppercase leading-none tracking-[0.16em] text-neutral-400 max-[370px]:text-[7px] sm:mt-2 sm:text-[10px] sm:tracking-[0.18em]">
          by Bold Cave
        </p>

        {/* FRAGRANCE NOTES */}
        <p className="mt-2 min-h-4 truncate text-[10px] font-normal leading-normal text-neutral-500 max-[370px]:text-[9px] sm:mt-2.5 sm:text-[13px] sm:tracking-[0.01em]">
          {profileLine}
        </p>

        {/* PRICE */}
        <div className="mt-3 flex flex-nowrap items-baseline justify-center gap-1 sm:mt-4 sm:gap-1.5">
          {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
            <span className="whitespace-nowrap text-[10px] font-normal text-neutral-400 line-through decoration-neutral-400 decoration-1 underline-offset-2 max-[370px]:text-[9px] sm:text-[12px]">
              {formatRupees(selectedVariant.mrp)}
            </span>
          )}

          <span className="whitespace-nowrap text-[13px] font-medium text-neutral-950 max-[370px]:text-[11px] sm:text-[17px]">
            {formatRupees(selectedVariant?.sellingPrice)}
          </span>
        </div>

        {/* SIZE SELECTOR */}
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-1.5 sm:mx-auto sm:mt-4 sm:w-[92%] sm:gap-2">
          {variants.map((variant) => {
            const unavailable = Number(variant.stock) <= 0;
            const selected = variant.size === selectedSize;

            return (
              <button
                key={variant.size}
                type="button"
                onClick={() => setSelectedSize(variant.size)}
                className={[
                  "h-8 border px-1 text-[10px] uppercase tracking-[0.03em] transition max-[370px]:h-7 max-[370px]:text-[9px] max-[370px]:tracking-[0.015em] sm:h-9 sm:px-3 sm:text-xs sm:tracking-[0.05em]",
                  selected
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-300 bg-white text-neutral-800",
                  unavailable && !selected
                    ? "cursor-pointer border-neutral-200 bg-neutral-50 text-neutral-400"
                    : "cursor-pointer hover:border-neutral-950",
                ].join(" ")}
              >
                {variant.size}
              </button>
            );
          })}
        </div>

        {/* ADD TO CART */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isSelectedOutOfStock}
          className="mt-3 h-9 w-full cursor-pointer border border-neutral-950 bg-neutral-950 px-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-white transition hover:bg-white hover:text-neutral-950 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400 max-[370px]:h-8 max-[370px]:text-[9px] max-[370px]:tracking-[0.03em] sm:mx-auto sm:h-11 sm:w-[92%] sm:px-4 sm:text-[12px] sm:tracking-[0.08em]"
        >
          {isSelectedOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
        </button>
      </div>
    </article>
  );
}
