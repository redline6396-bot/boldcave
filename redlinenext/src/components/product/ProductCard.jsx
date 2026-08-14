"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

const DEFAULT_SIZE = "50 ML";
const CURRENCY = "\u20b9";
const PLACEHOLDER_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `${CURRENCY} ${formatPrice(value)}`;

export default function ProductCard({ product }) {
  const router = useRouter();
  const { addToCart } = useCart();

  const variants = product?.variants || [];
  const defaultVariant =
    variants.find((variant) => variant.size === DEFAULT_SIZE) || variants[0];

  const [selectedSize, setSelectedSize] = useState(
    defaultVariant?.size || DEFAULT_SIZE
  );

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.size === selectedSize),
    [selectedSize, variants]
  );

  const availableVariant = useMemo(
    () => variants.find((variant) => Number(variant.stock) > 0),
    [variants]
  );

  useEffect(() => {
    if (!variants.length) {
      return;
    }

    const currentVariant = variants.find(
      (variant) => variant.size === selectedSize
    );

    if (currentVariant && Number(currentVariant.stock) > 0) {
      return;
    }

    if (availableVariant) {
      setSelectedSize(availableVariant.size);
    }
  }, [availableVariant, selectedSize, variants]);

  if (!product) {
    return null;
  }

  const isOutOfStock = !availableVariant;
  const productImage = product.images?.[0] || PLACEHOLDER_IMAGE;
  const productUrl = `/product/${product.slug}`;
  const profileLine =
    product.fragranceNotes?.top?.slice(0, 3).join(" | ") ||
    product.fragranceProfile;

  const handleNavigate = () => {
    router.push(productUrl);
  };

  const handleAddToCart = () => {
    if (isOutOfStock || !selectedVariant) {
      return;
    }

    addToCart(product.id, selectedSize, 1);
  };

  return (
    <article className="mx-auto w-full max-w-[388px] cursor-pointer border border-[#e8e2d9] bg-white">
      <button
        type="button"
        onClick={handleNavigate}
        className="block w-full cursor-pointer bg-white"
        aria-label={`View ${product.name}`}
      >
        <div className="aspect-[1/1.04] w-full overflow-hidden bg-[#f4f4f4]">
          <img
            src={productImage}
            alt={product.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      </button>

      <div className="px-3 pb-4 pt-3 text-center max-[370px]:px-2 max-[370px]:pb-3 sm:px-6 sm:pb-6 sm:pt-4">
        <button
          type="button"
          onClick={handleNavigate}
          className="cursor-pointer text-[13px] font-semibold uppercase leading-tight tracking-[0.04em] text-neutral-950 max-[370px]:text-[11px] max-[370px]:tracking-[0.03em] sm:text-[21px] sm:tracking-[0.05em]"
        >
          <span>
            {product.name}
          </span>{" "}
          | {product.category}
        </button>

        <p className="mt-2 min-h-4 truncate text-[10px] font-normal leading-normal tracking-0 text-neutral-500 max-[370px]:text-[9px] sm:mt-2.5 sm:text-[13px] sm:tracking-[0.01em]">
          {profileLine}
        </p>

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

        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mx-auto sm:mt-4 sm:w-[92%] sm:gap-2">
          {variants.map((variant) => {
            const disabled = Number(variant.stock) <= 0;
            const selected = variant.size === selectedSize;

            return (
              <button
                key={variant.size}
                type="button"
                onClick={() => setSelectedSize(variant.size)}
                disabled={disabled}
                className={[
                  "h-8 border px-1 text-[10px] uppercase tracking-[0.03em] transition max-[370px]:h-7 max-[370px]:text-[9px] max-[370px]:tracking-[0.015em] sm:h-9 sm:px-3 sm:text-xs sm:tracking-[0.05em]",
                  selected
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-300 bg-white text-neutral-800",
                  disabled
                    ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400"
                    : "cursor-pointer hover:border-neutral-950",
                ].join(" ")}
              >
                {variant.size}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="mt-3 h-9 w-full cursor-pointer border border-neutral-950 bg-neutral-950 px-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-white transition hover:bg-white hover:text-neutral-950 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400 max-[370px]:h-8 max-[370px]:text-[9px] max-[370px]:tracking-[0.03em] sm:mx-auto sm:h-11 sm:w-[92%] sm:px-4 sm:text-[12px] sm:tracking-[0.08em]"
        >
          {isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
        </button>
      </div>
    </article>
  );
}
