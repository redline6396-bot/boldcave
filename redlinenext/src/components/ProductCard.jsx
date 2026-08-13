"use client";

import React, { useContext } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { ShopContext } from "@/context/ShopContext";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const getFirstVariant = (product) => {
  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    return product.variants[0];
  }

  return {};
};

const getBackendRating = (product) => {
  const rating =
    product?.rating ??
    product?.averageRating ??
    product?.avgRating ??
    product?.ratingsAverage ??
    0;

  return Number(rating) || 0;
};

const getBackendReviewCount = (product) => {
  const reviews =
    product?.reviews ??
    product?.reviewCount ??
    product?.numReviews ??
    product?.totalReviews ??
    0;

  return Number(reviews) || 0;
};

const getBackendBestseller = (product) => {
  const tags = Array.isArray(product?.tags) ? product.tags : [];

  return (
    product?.isBestseller === true ||
    product?.bestseller === true ||
    product?.bestSeller === true ||
    tags.some((tag) => String(tag).toLowerCase() === "bestseller")
  );
};

export default function ProductCard({
  product,
  productId,
  isOutOfStock,
  getProductImage,
}) {
  const router = useRouter();
  const { addToCart } = useContext(ShopContext);

  const variant = getFirstVariant(product);

  const productImage =
    typeof getProductImage === "function"
      ? getProductImage(product)
      : product?.image || FALLBACK_IMAGE;

  const sellingPrice = Number(variant?.sellingPrice || product?.price || 0);

  const originalPrice = Number(
    variant?.originalPrice || product?.originalPrice || sellingPrice || 0
  );

  const discount =
    originalPrice > sellingPrice && sellingPrice > 0
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : 0;

  const weight = variant?.weight || product?.weight || product?.unit || "";

  const rating = getBackendRating(product);
  const reviewCount = getBackendReviewCount(product);

  const outOfStock =
    typeof isOutOfStock === "function" ? isOutOfStock(product) : false;

  const isBestseller = getBackendBestseller(product);

  const handleCardClick = () => {
    if (!productId) return;
    router.push(`/product/${productId}`);
  };

  const handleAddToCart = (event) => {
    event.stopPropagation();

    if (outOfStock || !productId) return;

    const variantWeight = variant?.weight || null;
    addToCart(productId, 1, variantWeight);
  };

  return (
    <article
      onClick={handleCardClick}
      className="group relative h-full cursor-pointer overflow-hidden rounded-[9px] border border-[#e6ddcf] bg-[#fffdf8] transition-colors duration-200 hover:border-[#c9b99c]"
    >
      {/* Top Badge */}
      {outOfStock ? (
        <span className="absolute left-2 top-2 z-10 rounded-[3px] bg-[#6b6258] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.02em] text-white">
          Out of stock
        </span>
      ) : isBestseller ? (
        <span className="absolute left-2 top-2 z-10 rounded-[3px] bg-[#f6a313] px-1.5 py-0.5 text-[8px] font-bold text-[#332519]">
          Bestseller
        </span>
      ) : discount > 0 ? (
        <span className="absolute left-2 top-2 z-10 rounded-[3px] bg-[#f6a313] px-1.5 py-0.5 text-[12px] font-bold text-[#332519]">
          {discount}% Off
        </span>
      ) : null}

      {/* Image Area */}
      <div className="relative flex h-[180px] items-center justify-center bg-[#fbf7ef] px-3 pt-4 sm:h-[210px] lg:h-[240px] xl:h-[260px]">
        <img
          src={productImage}
          alt={product?.name || "Product"}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
          className={`h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.025] ${
            outOfStock ? "opacity-70 grayscale" : ""
          }`}
        />
      </div>

      {/* Info Area */}
      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 md:px-6 md:pb-6">
        <h3 className="line-clamp-2 min-h-[28px] text-[16px] font-medium leading-[1.35] text-[#272018] sm:text-[17px] md:text-[18px]">
          {product?.name || "Product Name"}
        </h3>

         <div className="flex items-center gap-1.5">
          <PointedStars rating={rating} />

          <span className="text-[12px] text-[#7c7468] sm:text-[12.5px]">
            {rating > 0 ? rating.toFixed(1) : "0.0"} ({reviewCount})
          </span>
        </div>

        {weight && (
          <p className="mt-2 text-[12px] leading-none text-[#81796b] sm:text-[12.5px]">
            {weight}
          </p>
        )}

        {/* Rating from backend only */}
       

        {/* Price + Cart */}
        <div className="mt-3.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            {originalPrice > sellingPrice && (
              <p className="text-[12px] leading-none text-[#9a9183] line-through sm:text-[13px]">
                ₹{originalPrice}
              </p>
            )}

            <p className="text-[21px] font-bold leading-none text-[#16120d] sm:text-[22px] md:text-[24px]">
              ₹{sellingPrice}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock}
            aria-label={outOfStock ? "Out of stock" : "Add to cart"}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-200 ${
              outOfStock
                ? "cursor-not-allowed border-[#d0c8ba] bg-[#eee8dd] text-[#9a9183]"
                : "border-[#405526] bg-[#fffdf8] text-[#405526] hover:bg-[#405526] hover:text-white"
            }`}
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </article>
  );
}

function PointedStars({ rating = 0 }) {
  const normalizedRating = Math.max(0, Math.min(5, Math.round(Number(rating))));

  return (
    <div className="flex gap-[1px] text-[10px] leading-none text-[#f29b14]">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index}>
          {index < normalizedRating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}


