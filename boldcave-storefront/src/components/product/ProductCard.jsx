"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { requestCartDrawerOpen } from "@/lib/cartEvents";
import {
  getProductImageUrl,
  getVariantProductGalleryUrls,
} from "@/lib/clientApi";
import { getCloudinaryImageUrl, getCloudinarySrcSet } from "@/lib/cloudinary/images";

const CURRENCY = "\u20b9";
const PLACEHOLDER_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `${CURRENCY} ${formatPrice(value)}`;
const BULLET = "\u2022";
const MULTIPLY = "\u00d7";

const normalizeSize = (size) =>
  String(size || "")
    .replace(/\s+/g, "")
    .toUpperCase();

const isDefaultSize = (variant) => normalizeSize(variant?.size) === "50ML";

const getDefaultVariant = (variants) =>
  variants.find(
    (variant) => isDefaultSize(variant) && Number(variant.stock) > 0
  ) ||
  variants.find((variant) => Number(variant.stock) > 0) ||
  variants.find(isDefaultSize) ||
  variants[0];

const getDisplayVariants = (variants) =>
  [...variants].sort((leftVariant, rightVariant) => {
    if (isDefaultSize(leftVariant)) return -1;
    if (isDefaultSize(rightVariant)) return 1;
    return 0;
  });

const getComboNamesLine = (comboItems = []) => {
  const names = comboItems
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean);

  return names.length ? names.join(` ${BULLET} `) : "Perfume Combo";
};

const getComboSizeSummary = (comboItems = []) => {
  const sizeCounts = new Map();
  let totalQuantity = 0;

  comboItems.forEach((item) => {
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    const size = String(item?.size || item?.variantId || "").trim();
    totalQuantity += quantity;
    if (!size) return;

    const key = size.toLowerCase();
    const current = sizeCounts.get(key) || { size, quantity: 0 };
    current.quantity += quantity;
    sizeCounts.set(key, current);
  });

  if (!totalQuantity) return "";

  const groups = Array.from(sizeCounts.values());
  if (!groups.length) {
    return `${totalQuantity} perfume${totalQuantity === 1 ? "" : "s"}`;
  }

  return groups
    .map((group) => `${group.quantity} ${MULTIPLY} ${group.size}`)
    .join(" + ");
};

const splitNotes = (value) =>
  String(value || "")
    .split(/[\u2022\u00b7|,]/)
    .map((note) => note.trim())
    .filter(Boolean);

const getProductNotesLine = (product) => {
  const topNotes = Array.isArray(product?.fragranceNotes?.top)
    ? product.fragranceNotes.top.flatMap(splitNotes)
    : [];

  if (topNotes.length) return topNotes.slice(0, 3).join(` ${BULLET} `);

  return splitNotes(product?.fragranceProfile).slice(0, 3).join(` ${BULLET} `);
};

function getVariantProductImageSource(product, variant) {
  return variant?.images?.[0] || variant?.image || product?.images?.[0];
}

export default function ProductCard({ product, priority = false }) {
  const router = useRouter();
  const { addToCart } = useCart();

  const variants = product?.variants || [];
  const isCombo = product?.productType === "combo";
  const displayVariants = useMemo(() => getDisplayVariants(variants), [variants]);

  const defaultVariant = getDefaultVariant(variants);

  const [selectedSize, setSelectedSize] = useState(defaultVariant?.size || "");
  const [isHoverRequested, setIsHoverRequested] = useState(false);
  const [isHoverLoaded, setIsHoverLoaded] = useState(false);

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

  const isSelectedOutOfStock =
    !selectedVariant || Number(selectedVariant.stock) <= 0;

  const productImageSource = getVariantProductImageSource(product, selectedVariant);
  const productImageSourceUrl = getProductImageUrl(productImageSource);
  const productImage =
    getCloudinaryImageUrl(productImageSource, {
      width: 960,
      dpr: "auto",
    }) || PLACEHOLDER_IMAGE;
  const productImageSrcSet = getCloudinarySrcSet(
    productImageSource,
    [480, 640, 800, 960, 1200]
  );

  const selectedVariantGallery = getVariantProductGalleryUrls(
    product,
    selectedVariant
  );

  const hoverImageSource =
    selectedVariant?.images?.[1] ||
    selectedVariantGallery.find((image) => image !== productImageSourceUrl) ||
    product?.images?.[1] ||
    "";
  const hoverImage =
    getCloudinaryImageUrl(hoverImageSource, { width: 960, dpr: "auto" }) ||
    getProductImageUrl(product?.images?.[1]) ||
    "";
  const hoverImageSrcSet = getCloudinarySrcSet(hoverImageSource, [
    480,
    800,
    960,
    1200,
  ]);

  const hasHoverImage = Boolean(hoverImage);
  const shouldRenderHoverImage = hasHoverImage && isHoverRequested;
  const productUrl = `/product/${product.slug}`;

  const profileLine = getProductNotesLine(product);
  const comboNamesLine = isCombo ? getComboNamesLine(product.comboItems) : "";
  const comboSizeSummary = isCombo ? getComboSizeSummary(product.comboItems) : "";

  useEffect(() => {
    setIsHoverLoaded(false);
  }, [hoverImage]);

  if (!product) {
    return null;
  }

  const handleNavigate = () => {
    router.push(productUrl);
  };

  const handleCardClick = (event) => {
    if (event.target.closest("button, a")) {
      return;
    }

    handleNavigate();
  };

  const handleAddToCart = () => {
    if (isSelectedOutOfStock) {
      return;
    }

    const didAdd = addToCart(product, selectedSize, 1);

    if (didAdd) {
      requestCartDrawerOpen();
    }
  };

  return (
    <article
      onClick={handleCardClick}
      onPointerEnter={() => setIsHoverRequested(true)}
      onFocusCapture={() => setIsHoverRequested(true)}
      className="group mx-auto w-full max-w-[388px] cursor-pointer border border-[#e8e2d9] bg-white"
    >
      <button
        type="button"
        onClick={handleNavigate}
        className="block w-full cursor-pointer bg-white"
        aria-label={`View ${product.name}`}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-white">
          <img
            src={productImage}
            srcSet={productImageSrcSet || undefined}
            sizes="(min-width: 1024px) 360px, (min-width: 640px) calc((100vw - 72px) / 2), calc((100vw - 30px) / 2)"
            alt={product.name}
            className={[
              "absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-300 ease-out group-hover:scale-[1.025]",
              shouldRenderHoverImage && isHoverLoaded
                ? "opacity-100 group-hover:opacity-0"
                : "opacity-100",
            ].join(" ")}
            style={{
              filter: isSelectedOutOfStock ? "grayscale(45%)" : undefined,
            }}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
          />

          {shouldRenderHoverImage && (
            <img
              src={hoverImage}
              srcSet={hoverImageSrcSet || undefined}
              sizes="(min-width: 1024px) 360px, (min-width: 640px) calc((100vw - 72px) / 2), calc((100vw - 30px) / 2)"
              alt={`${product.name} alternate view`}
              className={[
                "absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-200 ease-out group-hover:scale-[1.025]",
                isHoverLoaded ? "opacity-0 group-hover:opacity-100" : "opacity-0",
              ].join(" ")}
              style={{
                filter: isSelectedOutOfStock ? "grayscale(45%)" : undefined,
              }}
              loading="lazy"
              fetchPriority="low"
              decoding="async"
              onLoad={() => setIsHoverLoaded(true)}
              onError={(event) => {
                event.currentTarget.style.display = "none";
                setIsHoverLoaded(true);
              }}
            />
          )}

          {isSelectedOutOfStock && (
            <div
              className="pointer-events-none absolute inset-0 bg-white/20"
              aria-hidden="true"
            />
          )}
        </div>
      </button>

      <div className="px-3 pb-4 pt-3 text-center max-[450px]:px-2.5 max-[450px]:pb-3 max-[450px]:pt-3 sm:px-6 sm:pb-6 sm:pt-4">
        <button
          type="button"
          onClick={handleNavigate}
          className="inline-block cursor-pointer text-[18px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-950 max-[450px]:text-[14px] max-[450px]:tracking-[0.05em] sm:text-[21px] sm:tracking-[0.09em]"
        >
          <span className="decoration-neutral-500 decoration-[0.75px] underline-offset-[5px] group-hover:underline">
            {product.name}
          </span>
        </button>

        <p className="mt-1.5 text-[9px] font-normal uppercase leading-none tracking-[0.16em] text-neutral-400 max-[450px]:mt-1.5 max-[450px]:text-[8px] max-[450px]:tracking-[0.14em] sm:mt-2 sm:text-[10px] sm:tracking-[0.18em]">
          by Bold Cave
        </p>

        {isCombo && (
          <p className="mt-2 inline-flex border border-neutral-300 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-600">
            COMBO
          </p>
        )}

        {isCombo ? (
          <div className="mt-2 max-[450px]:mt-2 sm:mt-2.5">
            <p className="overflow-hidden text-[12px] font-normal leading-snug text-neutral-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] max-[450px]:text-[11px] max-[410px]:text-[9px] sm:truncate sm:text-[13px] sm:tracking-[0.01em]">
              {comboNamesLine}
            </p>
            {comboSizeSummary && (
              <p className="mt-1 text-[10px] font-normal uppercase leading-none tracking-[0.12em] text-neutral-400 max-[450px]:text-[9px] sm:text-[10px]">
                {comboSizeSummary}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 truncate text-[12px] font-normal leading-normal text-neutral-500 max-[450px]:mt-2 max-[450px]:text-[11px] max-[410px]:text-[9px] sm:mt-2.5 sm:text-[13px] sm:tracking-[0.01em]">
            {profileLine}
          </p>
        )}

        <div className="mt-3 flex flex-nowrap items-baseline justify-center gap-1 max-[450px]:mt-2.5 sm:mt-4 sm:gap-1.5">
          {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
            <span className="whitespace-nowrap text-[11px] font-normal text-neutral-400 line-through decoration-neutral-400 decoration-1 underline-offset-2 max-[450px]:text-[10px] sm:text-[12px]">
              {formatRupees(selectedVariant.mrp)}
            </span>
          )}

          <span className="whitespace-nowrap text-[15px] font-medium text-neutral-950 max-[450px]:text-[14px] sm:text-[17px]">
            {formatRupees(selectedVariant?.sellingPrice)}
          </span>
        </div>

        {!isCombo && (
          <div className="mt-3 grid grid-cols-2 gap-1.5 max-[450px]:mt-2.5 sm:mx-auto sm:mt-4 sm:w-[92%] sm:gap-2">
            {displayVariants.map((variant) => {
              const unavailable = Number(variant.stock) <= 0;
              const selected = variant.size === selectedSize;

              return (
                <button
                  key={variant.size}
                  type="button"
                  onClick={() => setSelectedSize(variant.size)}
                  className={[
                    "h-10 border px-1 text-[11px] uppercase tracking-[0.03em] transition max-[450px]:h-8 max-[450px]:text-[10px] max-[450px]:tracking-[0.025em] sm:h-9 sm:px-3 sm:text-xs sm:tracking-[0.05em]",
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
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isSelectedOutOfStock}
          className="mt-3 h-11 w-full cursor-pointer border border-neutral-950 bg-neutral-950 px-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-white transition hover:bg-white hover:text-neutral-950 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400 max-[450px]:mt-2.5 max-[450px]:h-9 max-[450px]:text-[10px] max-[450px]:tracking-[0.035em] sm:mx-auto sm:w-[92%] sm:px-4 sm:text-[12px] sm:tracking-[0.08em]"
        >
          {isSelectedOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
        </button>
      </div>
    </article>
  );
}
