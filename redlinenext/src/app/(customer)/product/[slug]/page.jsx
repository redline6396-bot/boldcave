"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gem,
  MarsStroke,
  Minus,
  Plus,
  Share2,
  SprayCan,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { NotificationContext } from "@/context/NotificationContext";

const DEFAULT_SIZE = "50 ML";
const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `Rs. ${formatPrice(value)}`;

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getProductImages = (product) => {
  const images = product?.images?.filter(Boolean) || [];
  return images.length > 0 ? images : [FALLBACK_IMAGE];
};

const productBenefits = [
  { label: "Long Lasting", icon: SprayCan },
  { label: "Premium Craft", icon: Gem },
  { label: "Signature Scent", icon: MarsStroke },
];

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { cart, addToCart } = useCart();
  const notifications = useContext(NotificationContext);
  const slug = normalizeText(params?.slug);

  const product = useMemo(
    () =>
      products.find((item) =>
        [item.slug, item.id].some((value) => normalizeText(value) === slug)
      ),
    [slug]
  );

  const variants = product?.variants || [];
  const defaultVariant =
    variants.find((variant) => variant.size === DEFAULT_SIZE) || variants[0];
  const [selectedSize, setSelectedSize] = useState(
    defaultVariant?.size || DEFAULT_SIZE
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [mobileThumbStart, setMobileThumbStart] = useState(0);
  const gallerySwipeStartRef = useRef(null);
  const galleryWheelLockRef = useRef(false);

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

  useEffect(() => {
    const stock = Number(selectedVariant?.stock) || 0;
    setQuantity((currentQuantity) =>
      Math.max(1, Math.min(currentQuantity, stock || 1))
    );
  }, [selectedVariant]);

  if (!product) {
    return (
      <main className="min-h-screen bg-white px-5 py-20 text-center text-neutral-950">
        <h1 className="text-[30px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-[42px]">
          Product not found
        </h1>
        <p className="mx-auto mt-4 max-w-[420px] text-[14px] leading-6 text-neutral-500">
          The product you are looking for is not available.
        </p>
        <Link
          href="/collection"
          className="mt-8 inline-flex h-11 items-center justify-center border border-neutral-950 px-7 text-[12px] font-semibold uppercase tracking-[0.09em] transition-colors duration-200 hover:bg-neutral-950 hover:text-white"
        >
          Back to Shop
        </Link>
      </main>
    );
  }

  const images = getProductImages(product);
  const galleryImages =
    images.length > 1 ? images : [images[0], images[0], images[0], images[0]];
  const mobileThumbCount = 3;
  const maxMobileThumbStart = Math.max(0, galleryImages.length - mobileThumbCount);
  const visibleMobileThumbnails = galleryImages
    .map((image, index) => ({ image, index }))
    .slice(
      Math.min(mobileThumbStart, maxMobileThumbStart),
      Math.min(mobileThumbStart, maxMobileThumbStart) + mobileThumbCount
    );
  const selectedStock = Number(selectedVariant?.stock) || 0;
  const isOutOfStock = !availableVariant;
  const isSelectedUnavailable = !selectedVariant || selectedStock <= 0;
  const currentCartQuantity =
    cart.find(
      (item) => item.productId === product.id && item.size === selectedSize
    )?.quantity || 0;

  const maxAddableQuantity = Math.max(0, selectedStock - currentCartQuantity);
  const canBuy = !isSelectedUnavailable && maxAddableQuantity > 0;
  const relatedProducts = getRelatedProducts(product);

  const decreaseQuantity = () => {
    setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1));
  };

  const syncMobileThumbWindow = (nextIndex) => {
    setMobileThumbStart(() => {
      if (maxMobileThumbStart <= 0) {
        return 0;
      }

      if (nextIndex <= 0) {
        return 0;
      }

      if (nextIndex >= galleryImages.length - 1) {
        return maxMobileThumbStart;
      }

      return Math.min(maxMobileThumbStart, Math.max(0, nextIndex - 1));
    });
  };

  const selectGalleryImage = (index) => {
    setSelectedImage(index);
    syncMobileThumbWindow(index);
  };

  const showPreviousImage = () => {
    setSelectedImage((currentIndex) => {
      const nextIndex = Math.max(0, currentIndex - 1);
      syncMobileThumbWindow(nextIndex);
      return nextIndex;
    });
  };

  const showNextImage = () => {
    setSelectedImage((currentIndex) => {
      const nextIndex = Math.min(galleryImages.length - 1, currentIndex + 1);
      syncMobileThumbWindow(nextIndex);
      return nextIndex;
    });
  };

  const handleGalleryPointerDown = (event) => {
    gallerySwipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handleGalleryPointerEnd = (event) => {
    if (!gallerySwipeStartRef.current) {
      return;
    }

    const deltaX = event.clientX - gallerySwipeStartRef.current.x;
    const deltaY = event.clientY - gallerySwipeStartRef.current.y;
    gallerySwipeStartRef.current = null;

    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    if (deltaX < 0) {
      showNextImage();
      return;
    }

    showPreviousImage();
  };

  const handleGalleryWheel = (event) => {
    if (
      galleryWheelLockRef.current ||
      Math.abs(event.deltaX) < 28 ||
      Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2
    ) {
      return;
    }

    event.preventDefault();
    galleryWheelLockRef.current = true;

    if (event.deltaX > 0) {
      showNextImage();
    } else {
      showPreviousImage();
    }

    window.setTimeout(() => {
      galleryWheelLockRef.current = false;
    }, 450);
  };

  const increaseQuantity = () => {
    setQuantity((currentQuantity) =>
      Math.min(currentQuantity + 1, Math.max(1, maxAddableQuantity || selectedStock))
    );
  };

  const handleAddToCart = () => {
    if (!canBuy) {
      notifications?.error?.("Selected size is out of stock");
      return;
    }

    const safeQuantity = Math.min(quantity, maxAddableQuantity);
    const didAdd = addToCart(product.id, selectedSize, safeQuantity);

    if (didAdd) {
      notifications?.success?.("Added to cart");
    }
  };

  const handleBuyNow = () => {
    if (!canBuy) {
      notifications?.error?.("Selected size is out of stock");
      return;
    }

    const safeQuantity = Math.min(quantity, maxAddableQuantity);
    const didAdd = addToCart(product.id, selectedSize, safeQuantity);

    if (didAdd) {
      router.push("/place-order");
    }
  };

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <section className="mx-auto hidden max-w-[1280px] px-4 pb-4 pt-7 sm:block sm:px-6 sm:pt-8 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.13em] text-neutral-500"
        >
          <Link href="/" className="hover:text-neutral-950">
            Home
          </Link>
          <span>/</span>
          <Link href="/collection" className="hover:text-neutral-950">
            Collection
          </Link>
          <span>/</span>
          <span className="text-neutral-950">{product.name}</span>
        </nav>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-5 px-5 pb-10 pt-6 sm:gap-7 sm:px-6 sm:pb-14 sm:pt-0 lg:grid-cols-[minmax(0,600px)_minmax(370px,470px)] lg:items-start lg:justify-between lg:gap-8 lg:px-8 xl:gap-14">
        <div className="min-w-0 lg:sticky lg:top-[104px]">
          <div>
            <div
              className="aspect-square w-full touch-pan-y overflow-hidden border border-[#eeeeee] bg-white lg:h-[min(600px,calc(100vh-210px))] lg:min-h-[500px] lg:aspect-auto lg:border-0"
              onPointerDown={handleGalleryPointerDown}
              onPointerUp={handleGalleryPointerEnd}
              onPointerCancel={() => {
                gallerySwipeStartRef.current = null;
              }}
              onWheel={handleGalleryWheel}
            >
              <img
                src={galleryImages[selectedImage]}
                alt={product.name}
                className="h-full w-full object-contain"
                loading="eager"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
            </div>

            <div
              className="mt-4 grid touch-pan-y grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-3 lg:hidden"
              onPointerDown={handleGalleryPointerDown}
              onPointerUp={handleGalleryPointerEnd}
              onPointerCancel={() => {
                gallerySwipeStartRef.current = null;
              }}
              onWheel={handleGalleryWheel}
            >
              <button
                type="button"
                onClick={showPreviousImage}
                disabled={selectedImage === 0}
                className="flex h-8 w-6 cursor-pointer items-center justify-center text-neutral-700 transition-opacity hover:opacity-55 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:opacity-100"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
              </button>

              <div className="grid min-w-0 grid-cols-3 gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {visibleMobileThumbnails.map(({ image, index }) => (
                  <button
                    key={`mobile-${image}-${index}`}
                    type="button"
                    onClick={() => selectGalleryImage(index)}
                    className={[
                      "aspect-square min-w-0 cursor-pointer overflow-hidden bg-white transition-opacity",
                      selectedImage === index
                        ? "border border-neutral-950 opacity-100"
                        : "border border-transparent opacity-55 hover:opacity-100",
                    ].join(" ")}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={showNextImage}
                disabled={selectedImage === galleryImages.length - 1}
                className="flex h-8 w-6 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:opacity-100"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>

            <div className="mt-5 hidden grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-3 sm:mt-6 lg:grid">
                <button
                  type="button"
                  onClick={showPreviousImage}
                  disabled={selectedImage === 0}
                  className="flex h-8 w-7 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
                </button>

                <div className="grid min-w-0 grid-cols-4 gap-2.5 overflow-x-auto [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => selectGalleryImage(index)}
                      className={[
                        "aspect-square min-w-[74px] cursor-pointer overflow-hidden bg-white outline outline-0 outline-offset-0 transition-opacity sm:min-w-0",
                        selectedImage === index && index !== 0
                          ? "opacity-100 outline-1 outline-neutral-950"
                          : "opacity-55 hover:opacity-100",
                      ].join(" ")}
                    >
                      <img
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={showNextImage}
                  disabled={selectedImage === galleryImages.length - 1}
                  className="flex h-8 w-7 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
                </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-white pt-2 sm:pt-1 lg:pt-0">
          <Link
            href={`/collection?category=${encodeURIComponent(product.category)}`}
            className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500 transition-colors hover:text-neutral-950 lg:tracking-[0.18em]"
          >
            REDLINE
          </Link>

          <h1 className="mt-4 max-w-[470px] text-[26px] font-normal leading-[1.22] tracking-0 text-neutral-950 sm:text-[36px] lg:text-[34px] lg:leading-[1.18]">
            {product.name} Eau De Parfum
          </h1>

          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500 lg:mt-4">
            {product.category} fragrance
          </p>

          {product.shortDescription && (
            <p className="mt-5 max-w-[470px] text-[14px] leading-7 text-neutral-600 sm:text-[15px] lg:text-[14px] lg:leading-6">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 font-['Plus_Jakarta_Sans',Arial,sans-serif]">
            <span className="text-[26px] font-normal leading-none tracking-[-0.02em] text-neutral-950 sm:text-[28px] lg:text-[26px]">
              {formatRupees(selectedVariant?.sellingPrice)}
            </span>
            {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
              <span className="text-[13px] font-normal tracking-[-0.01em] text-neutral-500 line-through decoration-neutral-500 decoration-1">
                {formatRupees(selectedVariant.mrp)}
              </span>
            )}
            {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
              <span className="rounded-full bg-[#f4f2ef] px-3.5 py-1.5 text-[12px] font-normal tracking-0 text-neutral-700">
                Sale
              </span>
            )}
          </div>

          <div className="mt-6 border-t border-[#e8e2d9] pt-6 sm:mt-7 sm:pt-7 lg:mt-6 lg:pt-6">
            <p className="text-[13px] font-normal leading-none tracking-0 text-neutral-800">
              Select Size
            </p>

            <div className="mt-3 grid max-w-full grid-cols-2 gap-2.5 sm:max-w-[300px] lg:max-w-[260px] lg:gap-2">
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
                      "h-10 border text-[11px] font-medium uppercase tracking-[0.02em] transition-colors sm:h-11 sm:text-[12px] lg:h-9 lg:text-[11px]",
                      selected
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-300 bg-white text-neutral-950 hover:border-neutral-950",
                      disabled
                        ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400"
                        : "cursor-pointer",
                    ].join(" ")}
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7 sm:mt-8 lg:mt-7">
            <p className="text-[13px] font-normal leading-none tracking-0 text-neutral-800">
              Quantity
              {currentCartQuantity > 0 ? ` (${currentCartQuantity} in cart)` : ""}
            </p>

            <div className="mt-3 inline-grid h-11 grid-cols-[44px_60px_44px] border border-neutral-400 sm:h-[58px] sm:grid-cols-[58px_78px_58px] lg:h-9 lg:grid-cols-[42px_56px_42px] lg:border-neutral-300">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                className="flex cursor-pointer items-center justify-center border-r border-neutral-300 text-neutral-950 transition-colors hover:bg-[#f6f4f1] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" strokeWidth={1.7} />
              </button>
              <span className="flex items-center justify-center text-[15px] font-normal">
                {quantity}
              </span>
              <button
                type="button"
                onClick={increaseQuantity}
                disabled={!canBuy || quantity >= maxAddableQuantity}
                className="flex cursor-pointer items-center justify-center border-l border-neutral-300 text-neutral-950 transition-colors hover:bg-[#f6f4f1] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>

            {isSelectedUnavailable ? (
              <p className="mt-3 text-[13px] font-medium text-neutral-500">
                This size is currently out of stock.
              </p>
            ) : currentCartQuantity >= selectedStock ? (
              <p className="mt-3 text-[13px] font-medium text-neutral-500">
                Selected size stock is already in your cart.
              </p>
            ) : null}
          </div>

          <div className="mt-7 grid max-w-[500px] gap-2.5 lg:max-w-[430px]">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canBuy || isOutOfStock}
              className="h-[50px] border border-neutral-300 bg-white text-[16px] font-normal tracking-[0.04em] text-neutral-950 transition-colors hover:border-neutral-950 sm:h-[56px] sm:text-[18px] lg:h-[46px] lg:text-[15px] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              {isOutOfStock ? "Out of stock" : "Add to cart"}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canBuy || isOutOfStock}
              className="h-[50px] border border-neutral-950 bg-neutral-950 text-[16px] font-semibold tracking-[0.02em] text-white transition-colors hover:bg-neutral-800 sm:h-[56px] sm:text-[18px] lg:h-[46px] lg:text-[15px] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              Buy it now
            </button>
          </div>

          <div className="mt-9 grid max-w-[500px] grid-cols-3 gap-3 sm:mt-12 sm:gap-4 lg:mt-10 lg:max-w-[430px]">
            {productBenefits.map(({ label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="mx-auto h-9 w-9 text-neutral-950" strokeWidth={1.45} />
                <p className="mt-3 text-[12px] font-semibold uppercase leading-4 tracking-[0.08em] text-neutral-950">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <ProductInfoDetails product={product} selectedVariant={selectedVariant} />
        </div>
      </section>

      <RelatedProducts currentProduct={product} products={relatedProducts} />
      <ReviewsPlaceholder />
    </main>
  );
}

function ProductInfoDetails({ product, selectedVariant }) {
  const handleShare = async () => {
    const shareData = {
      title: `${product.name} Eau De Parfum`,
      text: product.shortDescription || product.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      return;
    }
  };

  return (
    <section className="mt-10 max-w-[552px] sm:mt-14">
      <h2 className="text-[24px] font-normal uppercase leading-none tracking-[0.02em] text-neutral-950 sm:text-[34px] sm:tracking-[0.035em]">
        Product Details
      </h2>

      <div className="mt-3 overflow-hidden border border-[#dedede] sm:mt-4">
        <div className="grid grid-cols-[42%_58%] border-b border-[#dedede] bg-[#fafafa] sm:grid-cols-[0.9fr_1.1fr]">
          <div className="border-r border-[#dedede] px-3.5 py-3 text-[13px] font-semibold tracking-0 text-neutral-950 sm:px-5 sm:py-4 sm:text-[14px] sm:tracking-[0.03em]">
            Attribute
          </div>
          <div className="px-3.5 py-3 text-[13px] font-semibold tracking-0 text-neutral-950 sm:px-5 sm:py-4 sm:text-[14px] sm:tracking-[0.03em]">
            Details
          </div>
        </div>

        <DetailRow label="Volume" value={selectedVariant?.size || "50 ML"} />
        <DetailRow label="Concentration" value="Eau De Parfum" />
        <DetailRow label="Category" value={product.category} />
        <DetailRow label="Country of Origin" value="India" />
      </div>

      <div className="mt-6 space-y-3 text-[15px] leading-[1.55] tracking-0 text-neutral-800 sm:mt-9 sm:space-y-5 sm:text-[18px] sm:tracking-[0.02em]">
        <p>{product.description}</p>
        <p>
          Designed for a polished daily ritual, this fragrance balances a clear
          opening with a deeper signature trail that feels modern, confident and
          refined.
        </p>
        <p className="pt-1">Why you&apos;ll love it:</p>
        <ul className="space-y-2 pl-5 sm:space-y-3">
          <li className="list-disc">{product.fragranceProfile}</li>
          <li className="list-disc">{product.positioning}</li>
          <li className="list-disc">
            Best for {product.bestFor?.slice(0, 4).join(", ").toLowerCase()}
          </li>
          <li className="list-disc">
            Works well in {product.bestSeason?.join(", ").toLowerCase()}
          </li>
        </ul>
      </div>

      <div className="mt-7 border border-[#e5dfd6] sm:mt-9">
        <Accordion title="DESCRIPTION">
          <p>{product.description}</p>
        </Accordion>

        <Accordion title="FRAGRANCE NOTES">
          <div className="grid gap-5">
            <NoteGroup title="Top Notes" notes={product.fragranceNotes?.top} />
            <NoteGroup title="Heart Notes" notes={product.fragranceNotes?.heart} />
            <NoteGroup title="Base Notes" notes={product.fragranceNotes?.base} />
          </div>
        </Accordion>

        <Accordion title="SHIPPING & RETURNS">
          <p>
            Shipping, cancellation and refund details are available on the policy
            pages and will be finalized before launch.
          </p>
          <Link
            href="/terms"
            className="mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-950 underline underline-offset-4"
          >
            View Terms & Conditions
          </Link>
        </Accordion>

        <Accordion title="FAQs">
          {product.faq?.length ? (
            <div className="space-y-5">
              {product.faq.map((item) => (
                <div key={item.question}>
                  <h3 className="text-[14px] font-semibold text-neutral-950">
                    {item.question}
                  </h3>
                  <p className="mt-1 text-[14px] leading-6 text-neutral-600">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No FAQs available for this product yet.</p>
          )}
        </Accordion>

        <Accordion title="LEGAL INFORMATION">
          <div className="space-y-4">
            {Object.entries(product.legalInformation || {}).map(([key, value]) => (
              <MetaGroup key={key} title={formatLabel(key)} value={value} />
            ))}
          </div>
        </Accordion>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="mt-6 inline-flex cursor-pointer items-center gap-3 text-[15px] font-normal tracking-0 text-neutral-800 transition-opacity hover:opacity-65 sm:mt-8"
      >
        <Share2 className="h-4 w-4" strokeWidth={1.5} />
        <span>Share</span>
      </button>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[42%_58%] border-b border-[#dedede] last:border-b-0 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="border-r border-[#dedede] px-3.5 py-3 text-[13px] font-semibold leading-5 tracking-0 text-neutral-950 sm:px-5 sm:py-4 sm:text-[15px] sm:tracking-[0.03em]">
        {label}
      </div>
      <div className="px-3.5 py-3 text-[13px] leading-5 tracking-0 text-neutral-700 sm:px-5 sm:py-4 sm:text-[15px] sm:leading-6 sm:tracking-[0.03em]">
        {value}
      </div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }) {
  return (
    <details
      className="group border-b border-[#e5dfd6] last:border-b-0"
      open={defaultOpen}
    >
      <summary className="flex min-h-[50px] cursor-pointer list-none items-center justify-between gap-5 bg-white px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-950 sm:min-h-[59px] sm:px-6 sm:text-[13px] sm:tracking-[0.22em] [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
          strokeWidth={1.6}
        />
      </summary>
      <div className="px-4 pb-5 pt-1 text-[13px] leading-6 text-neutral-600 sm:px-6 sm:pb-6 sm:pt-2 sm:text-[15px] sm:leading-7">
        {children}
      </div>
    </details>
  );
}

function NoteGroup({ title, notes = [] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-neutral-950">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-6 text-neutral-600">
        {notes?.length ? notes.join(" | ") : "Not available"}
      </p>
    </div>
  );
}

function MetaGroup({ title, value }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-neutral-950">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-6 text-neutral-600">{value}</p>
    </div>
  );
}

function RelatedProducts({ currentProduct, products: relatedProducts }) {
  if (!relatedProducts.length) {
    return null;
  }

  const hasOddProductCount = relatedProducts.length % 2 === 1;

  return (
    <section className="bg-white px-2.5 py-8 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-end justify-between gap-4">
          <div>
          <h2 className="text-[21px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-950 sm:text-[28px]">
            RELATED PRODUCTS
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-neutral-500">
            More fragrances to explore.
          </p>
          </div>

          <Link
            href={`/collection?category=${encodeURIComponent(currentProduct.category)}`}
            className="hidden text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-950 transition-opacity hover:opacity-60 sm:inline-flex"
          >
            View All →
          </Link>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-x-2.5 gap-y-8 sm:mt-12 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-4">
          {relatedProducts.map((product, index) => {
            const isCenteredLastMobile =
              hasOddProductCount && index === relatedProducts.length - 1;

            return (
              <div
                key={product.id}
                className={[
                  "min-w-0",
                  isCenteredLastMobile
                    ? "col-span-2 mx-auto w-[calc(50%_-_5px)] sm:w-[calc(50%_-_16px)] lg:col-span-1 lg:w-full"
                    : "",
                ].join(" ")}
              >
                <ProductCard product={product} />
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href={`/collection?category=${encodeURIComponent(currentProduct.category)}`}
            className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-950 underline underline-offset-4 sm:hidden"
          >
            View {currentProduct.category}
          </Link>
        </div>
      </div>
    </section>
  );
}

function ReviewsPlaceholder() {
  return (
    <section className="border-t border-[#ededed] bg-white px-5 py-12 text-center sm:px-6 lg:px-8">
      <h2 className="text-[28px] font-semibold uppercase leading-none tracking-[0.06em] text-neutral-950 sm:text-[42px]">
        REVIEWS
      </h2>
      <p className="mx-auto mt-4 max-w-[520px] text-[14px] leading-6 text-neutral-500">
        Customer reviews will appear here once the review system is connected to
        approved product feedback.
      </p>
    </section>
  );
}

function getRelatedProducts(product) {
  const sameCategory = products.filter(
    (item) => item.id !== product.id && item.category === product.category
  );
  const others = products.filter(
    (item) => item.id !== product.id && item.category !== product.category
  );

  return [...sameCategory, ...others].slice(0, 4);
}

function formatLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
