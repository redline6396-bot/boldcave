"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Share2,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { useCart } from "@/context/CartContext";
import { NotificationContext } from "@/context/NotificationContext";
import ProductReviews from "@/features/customer/reviews/ProductReviews";
import {
  fetchProductBySlug,
  fetchProducts,
  getProductImageUrl,
} from "@/lib/clientApi";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `\u20b9${formatPrice(value)}`;

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getProductImages = (product) => {
  const images = product?.images?.map(getProductImageUrl).filter(Boolean) || [];
  return images.length > 0 ? images : [FALLBACK_IMAGE];
};

const getAudienceTags = (product) =>
  Array.isArray(product?.audienceTags) && product.audienceTags.length
    ? product.audienceTags
    : [product?.category].filter(Boolean);

const getProfileTags = (product) =>
  String(product?.fragranceProfile || "")
    .split(/[•,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

const getDefaultVariant = (variants) =>
  variants.find((variant) => Number(variant.stock) > 0) || variants[0];

const PRODUCT_TITLE_DESCRIPTOR = "EXTRAIT DE PARFUM";

const DEFAULT_LEGAL_INFORMATION = {
  countryOfOrigin: "India",
  caution: "Avoid contact with eyes. Keep away from children and open flames.",
};

const DEFAULT_HOW_TO_USE =
  "Apply lightly to pulse points such as the wrists, neck and behind the ears. Avoid rubbing the fragrance after application.";
const DEFAULT_STORAGE_PRECAUTIONS =
  "Store in a cool, dry place away from direct sunlight, excessive heat and moisture.";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { cart, addToCart, rememberProducts } = useCart();
  const notifications = useContext(NotificationContext);
  const slug = normalizeText(params?.slug);
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const variants = product?.variants || [];
  const defaultVariant = getDefaultVariant(variants);
  const [selectedSize, setSelectedSize] = useState(
    defaultVariant?.size || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [mobileThumbStart, setMobileThumbStart] = useState(0);
  const [desktopThumbStart, setDesktopThumbStart] = useState(0);
  const gallerySwipeStartRef = useRef(null);
  const galleryWheelLockRef = useRef(false);

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      setAllProducts([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError("");

    Promise.all([fetchProductBySlug(slug), fetchProducts()])
      .then(([apiProduct, apiProducts]) => {
        if (!isMounted) {
          return;
        }

        setProduct(apiProduct);
        setAllProducts(apiProducts);
        rememberProducts([apiProduct, ...apiProducts]);
        setSelectedImage(0);
        setMobileThumbStart(0);
        setDesktopThumbStart(0);
      })
      .catch((error) => {
        if (isMounted) {
          setProduct(null);
          setAllProducts([]);
          setLoadError(error.message || "Product not found");
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
  }, [rememberProducts, slug]);

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

  useEffect(() => {
    setQuantity(1);
  }, [selectedSize]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white px-5 py-8 text-neutral-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,600px)_minmax(370px,470px)]">
          <div className="aspect-square animate-pulse bg-neutral-100 lg:h-[560px] lg:aspect-auto" />
          <div className="space-y-5 pt-2 lg:pt-10">
            <div className="h-8 w-48 animate-pulse bg-neutral-100" />
            <div className="h-4 w-64 max-w-full animate-pulse bg-neutral-100" />
            <div className="h-4 w-full max-w-[420px] animate-pulse bg-neutral-100" />
            <div className="h-10 w-64 animate-pulse bg-neutral-100" />
            <div className="h-12 w-full max-w-[360px] animate-pulse bg-neutral-100" />
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-white px-5 py-20 text-center text-neutral-950">
        <h1 className="text-[30px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-[42px]">
          Product not found
        </h1>
        <p className="mx-auto mt-4 max-w-[420px] text-[14px] leading-6 text-neutral-500">
          {loadError || "The product you are looking for is not available."}
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

  const galleryImages = getProductImages(product);

  const mobileThumbCount = 3;
  const maxMobileThumbStart = Math.max(
    0,
    galleryImages.length - mobileThumbCount
  );
  const visibleMobileThumbnails = galleryImages
    .map((image, index) => ({ image, index }))
    .slice(
      Math.min(mobileThumbStart, maxMobileThumbStart),
      Math.min(mobileThumbStart, maxMobileThumbStart) + mobileThumbCount
    );

  const desktopThumbCount = 4;
  const maxDesktopThumbStart = Math.max(
    0,
    galleryImages.length - desktopThumbCount
  );
  const visibleDesktopThumbnails = galleryImages
    .map((image, index) => ({ image, index }))
    .slice(
      Math.min(desktopThumbStart, maxDesktopThumbStart),
      Math.min(desktopThumbStart, maxDesktopThumbStart) + desktopThumbCount
  );
  const selectedStock = Number(selectedVariant?.stock) || 0;
  const isSelectedUnavailable = !selectedVariant || selectedStock <= 0;
  const currentCartQuantity =
    cart.find(
      (item) => item.productId === product.id && item.size === selectedSize
    )?.quantity || 0;

  const maxAddableQuantity = Math.max(0, selectedStock - currentCartQuantity);
  const canBuy = !isSelectedUnavailable && maxAddableQuantity > 0;
  const relatedProducts = getRelatedProducts(product, allProducts);
  const audienceTags = getAudienceTags(product);
  const profileTags = getProfileTags(product);

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

  const syncDesktopThumbWindow = (nextIndex) => {
    setDesktopThumbStart((currentStart) => {
      if (maxDesktopThumbStart <= 0) {
        return 0;
      }

      const lastVisibleIndex = Math.min(
        currentStart + desktopThumbCount - 1,
        galleryImages.length - 1
      );

      if (nextIndex === lastVisibleIndex && currentStart < maxDesktopThumbStart) {
        return currentStart + 1;
      }

      if (nextIndex === currentStart && currentStart > 0) {
        return currentStart - 1;
      }

      if (nextIndex < currentStart) {
        return Math.max(0, nextIndex);
      }

      if (nextIndex > lastVisibleIndex) {
        return Math.min(
          maxDesktopThumbStart,
          nextIndex - desktopThumbCount + 1
        );
      }

      return currentStart;
    });
  };

  const selectGalleryImage = (index) => {
    setSelectedImage(index);
    syncMobileThumbWindow(index);
    syncDesktopThumbWindow(index);
  };

  const showPreviousImage = () => {
    setSelectedImage((currentIndex) => {
      const nextIndex = Math.max(0, currentIndex - 1);
      syncMobileThumbWindow(nextIndex);
      syncDesktopThumbWindow(nextIndex);
      return nextIndex;
    });
  };

  const showNextImage = () => {
    setSelectedImage((currentIndex) => {
      const nextIndex = Math.min(galleryImages.length - 1, currentIndex + 1);
      syncMobileThumbWindow(nextIndex);
      syncDesktopThumbWindow(nextIndex);
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
      Math.min(currentQuantity + 1, Math.max(1, maxAddableQuantity))
    );
  };

  const handleAddToCart = () => {
    if (!canBuy) {
      notifications?.error?.(
        isSelectedUnavailable
          ? "Selected size is out of stock"
          : "Maximum available quantity is already in your cart"
      );
      return;
    }

    const safeQuantity = Math.min(quantity, maxAddableQuantity);
    const didAdd = addToCart(product, selectedSize, safeQuantity);

    if (didAdd) {
      setQuantity(1);
      notifications?.success?.("Added to cart");
    }
  };

  const handleBuyNow = () => {
    if (!canBuy) {
      notifications?.error?.("Selected size is out of stock");
      return;
    }

    const safeQuantity = Math.min(quantity, maxAddableQuantity);
    const didAdd = addToCart(product, selectedSize, safeQuantity);

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
                className={[
                  "h-full w-full object-contain transition-[filter,opacity] duration-200",
                  isSelectedUnavailable ? "grayscale-[45%] opacity-85" : "",
                ].join(" ")}
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
                        : "border border-neutral-200 opacity-100 hover:border-neutral-500",
                    ].join(" ")}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      className={[
                        "h-full w-full object-contain transition-[filter,opacity] duration-200",
                        isSelectedUnavailable ? "grayscale-[45%] opacity-85" : "",
                      ].join(" ")}
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

                <div className="grid min-w-0 grid-cols-4 gap-2.5 sm:gap-3">
                  {visibleDesktopThumbnails.map(({ image, index }) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => selectGalleryImage(index)}
                      className={[
                        "aspect-square min-w-0 cursor-pointer overflow-hidden bg-white border transition-colors",
                        selectedImage === index
                          ? "border-neutral-950"
                          : "border-neutral-200 hover:border-neutral-500",
                      ].join(" ")}
                      aria-label={`Show image ${index + 1}`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        className={[
                          "h-full w-full object-contain transition-[filter,opacity] duration-200",
                          isSelectedUnavailable ? "grayscale-[45%] opacity-85" : "",
                        ].join(" ")}
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
                  className="flex h-8 w-7 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
                </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-white pt-1 lg:w-full lg:max-w-[450px] lg:justify-self-end lg:translate-y-5 lg:pt-0">
          <Link
            href={`/collection?category=${encodeURIComponent(getAudienceTags(product)[0] || product.category)}`}
            className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-neutral-950 sm:text-[11px] lg:tracking-[0.18em]"
          >
            BOLD CAVE
          </Link>

          <h1 className="mt-1.5 flex max-w-[450px] flex-wrap items-baseline gap-x-3 gap-y-1 text-neutral-950 lg:mt-2">
            <span className="text-[32px] font-normal uppercase leading-[1.08] tracking-0 sm:text-[36px] lg:text-[44px]">
              {product.name}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-500 sm:text-[11px] lg:text-[12px]">
              - {PRODUCT_TITLE_DESCRIPTOR}
            </span>
          </h1>

          <div className="mt-3 flex max-w-[450px] flex-wrap gap-1.5">
            {audienceTags.length > 0 && (
              <InfoPill>{audienceTags.join(" / ")}</InfoPill>
            )}
            {profileTags.map((tag) => (
              <InfoPill key={tag}>{tag}</InfoPill>
            ))}
          </div>

          {product.shortDescription && (
            <p className="mt-2.5 max-w-[440px] text-[14px] leading-[1.6] text-neutral-600 sm:text-[14px] lg:mt-3 lg:text-[16px] lg:leading-[1.6]">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap items-baseline gap-x-2 gap-y-1.5 lg:mt-4">
            <span className="text-[25px] font-normal leading-none tracking-[-0.015em] text-neutral-950 sm:text-[27px] lg:text-[30px]">
              {formatRupees(selectedVariant?.sellingPrice)}
            </span>
            {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
              <span className="text-[13px] font-normal tracking-0 text-neutral-500 line-through decoration-neutral-500 decoration-1 sm:text-[13px] lg:text-[13px]">
                {formatRupees(selectedVariant.mrp)}
              </span>
            )}
          </div>

          <div className="mt-3.5 border-t border-[#e8e2d9] pt-3.5 sm:mt-4 sm:pt-4 lg:mt-4 lg:pt-4">
            <p className="text-[13px] font-normal leading-none tracking-0 text-neutral-800 sm:text-[13px] lg:text-[15px]">
              Select Size
            </p>

            <div className="mt-2.5 grid w-full max-w-[340px] grid-cols-[repeat(auto-fit,minmax(86px,1fr))] gap-2 sm:max-w-[360px] lg:max-w-[340px] lg:gap-2">
              {variants.map((variant) => {
                const unavailable = Number(variant.stock) <= 0;
                const selected = variant.size === selectedSize;

                return (
                  <button
                    key={variant.size}
                    type="button"
                    onClick={() => setSelectedSize(variant.size)}
                    className={[
                      "h-8 border text-[10px] font-medium uppercase tracking-[0.02em] transition-colors sm:h-10 sm:text-[11px] lg:h-9 lg:text-[11px]",
                      selected
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-300 bg-white text-neutral-950 hover:border-neutral-950",
                      unavailable && !selected
                        ? "cursor-pointer border-neutral-200 bg-neutral-50 text-neutral-400"
                        : "cursor-pointer",
                    ].join(" ")}
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 sm:mt-4 lg:mt-[18px]">
            <p className="flex items-baseline gap-1.5 text-[13px] font-normal leading-none tracking-0 text-neutral-800 sm:text-[13px] lg:text-[15px]">
              <span>Quantity</span>
              {currentCartQuantity > 0 && (
                <span className="text-[11px] font-normal text-neutral-500 sm:text-[11px] lg:text-[12px]">
                  {currentCartQuantity} in cart
                </span>
              )}
            </p>

            <div className="mt-2.5 inline-grid h-10 grid-cols-[40px_54px_40px] border border-neutral-400 sm:h-11 sm:grid-cols-[44px_60px_44px] lg:h-10 lg:grid-cols-[46px_60px_46px] lg:border-neutral-300">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                className="flex cursor-pointer items-center justify-center border-r border-neutral-300 text-neutral-950 transition-colors hover:bg-[#f6f4f1] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4 lg:h-[18px] lg:w-[18px]" strokeWidth={1.7} />
              </button>
              <span className="flex items-center justify-center text-[14px] font-normal sm:text-[15px] lg:text-[17px]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={increaseQuantity}
                disabled={!canBuy || quantity >= maxAddableQuantity}
                className="flex cursor-pointer items-center justify-center border-l border-neutral-300 text-neutral-950 transition-colors hover:bg-[#f6f4f1] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4 lg:h-[18px] lg:w-[18px]" strokeWidth={1.7} />
              </button>
            </div>

            {isSelectedUnavailable ? (
              <p className="mt-3 text-[13px] font-medium text-neutral-500 lg:text-[14px]">
                This size is currently out of stock.
              </p>
            ) : currentCartQuantity >= selectedStock ? (
              <p className="mt-3 text-[13px] font-medium text-neutral-500 lg:text-[14px]">
                Maximum available quantity for this size is already in your cart.
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid w-full max-w-[340px] gap-2 sm:max-w-[380px] lg:mt-[18px] lg:max-w-[430px] lg:gap-2.5">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canBuy}
              className="h-11 border cursor-pointer border-neutral-300 bg-white text-[14px] font-normal tracking-[0.025em] text-neutral-950 transition-colors hover:border-neutral-950 sm:h-12 sm:text-[15px] lg:h-[46px] lg:text-[15px] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              {isSelectedUnavailable ? "Out of stock" : "Add to cart"}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canBuy}
              className="h-11 border cursor-pointer border-neutral-950 bg-neutral-950 text-[14px] font-semibold tracking-[0.015em] text-white transition-colors hover:bg-neutral-800 sm:h-12 sm:text-[15px] lg:h-[46px] lg:text-[15px] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              Buy it now
            </button>
          </div>

          <ProductInfoDetails product={product} selectedVariant={selectedVariant} />
        </div>
      </section>

      <RelatedProducts currentProduct={product} products={relatedProducts} />
      <ProductReviews productId={product.id} />
    </main>
  );
}

function ProductInfoDetails({ product, selectedVariant }) {
  const hasCustomLegalInformation =
    product.legalInformation &&
    Object.entries(product.legalInformation).some(([key, value]) =>
      String(value || "").trim()
    );

  const legalInformation = hasCustomLegalInformation
    ? product.legalInformation
    : {
        ...DEFAULT_LEGAL_INFORMATION,
        netQuantity: selectedVariant?.size || product.variants?.[0]?.size || "",
      };
  const audienceTags = getAudienceTags(product);
  const howToUse = product.howToUse || DEFAULT_HOW_TO_USE;
  const storagePrecautions = product.storagePrecautions || DEFAULT_STORAGE_PRECAUTIONS;

  const handleShare = async () => {
    const shareData = {
      title: `${product.name} ${PRODUCT_TITLE_DESCRIPTOR}`,
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
    <section className="mt-8 max-w-[552px] sm:mt-10 lg:mt-14">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[20px] font-normal uppercase leading-none tracking-[0.02em] text-neutral-950 sm:text-[24px] sm:tracking-[0.025em] lg:text-[30px] lg:tracking-[0.035em]">
          Product Details
        </h2>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-neutral-600 transition-colors hover:text-neutral-950 sm:text-[13px]"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.6} />
          <span>Share</span>
        </button>
      </div>

      <div className="mt-3 overflow-hidden border border-[#dedede] lg:mt-4">
        <div className="grid grid-cols-[42%_58%] border-b border-[#dedede] bg-[#fafafa] sm:grid-cols-[0.9fr_1.1fr]">
          <div className="border-r border-[#dedede] px-3 py-2.5 text-[12px] font-semibold tracking-0 text-neutral-950 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:tracking-[0.03em]">
            Attribute
          </div>
          <div className="px-3 py-2.5 text-[12px] font-semibold tracking-0 text-neutral-950 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:tracking-[0.03em]">
            Details
          </div>
        </div>

        <DetailRow label="Volume" value={selectedVariant?.size || product.variants?.[0]?.size || "Not available"} />
        <DetailRow label="Concentration" value={product.concentration || "25% Fragrance Oil"} />
        <DetailRow label="Audience" value={audienceTags.join(" / ")} />
        {product.longevity && <DetailRow label="Longevity" value={product.longevity} />}
        {product.projection && <DetailRow label="Projection" value={product.projection} />}
        <DetailRow label="Country of Origin" value="India" />
      </div>

      <div className="mt-5 space-y-3 text-[13px] leading-[1.55] tracking-0 text-neutral-800 sm:mt-6 sm:text-[14px] lg:mt-8 lg:space-y-4 lg:text-[16px] lg:tracking-[0.01em]">
        <p>{product.description}</p>
        <p>
          Designed for a polished daily ritual, this fragrance balances a clear
          opening with a deeper signature trail that feels modern, confident and
          refined.
        </p>
        <p className="pt-1">Why you&apos;ll love it:</p>
        <ul className="space-y-1.5 pl-5 sm:space-y-2 lg:space-y-3">
          {product.fragranceProfile && <li className="list-disc">{product.fragranceProfile}</li>}
          {product.bestFor?.length > 0 && (
            <li className="list-disc">
              Best for {product.bestFor.slice(0, 4).join(", ").toLowerCase()}
            </li>
          )}
          {product.bestSeason?.length > 0 && (
            <li className="list-disc">
              Best season: {product.bestSeason.join(", ")}
            </li>
          )}
        </ul>
      </div>

      <div className="mt-6 border border-[#e5dfd6] sm:mt-7 lg:mt-9">
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

        <Accordion title="HOW TO USE">
          <p>{howToUse}</p>
        </Accordion>

        <Accordion title="STORAGE & PRECAUTIONS">
          <p>{storagePrecautions}</p>
        </Accordion>

        <Accordion title="LEGAL INFORMATION">
          <div className="space-y-3">
            {Object.entries(legalInformation).map(([key, value]) => (
              <MetaGroup key={key} title={formatLabel(key)} value={value} />
            ))}
          </div>
        </Accordion>
      </div>

    </section>
  );
}

function InfoPill({ children }) {
  return (
    <span className="inline-flex min-h-6 items-center border border-neutral-300 bg-white px-2.5 text-[10px] font-medium uppercase leading-none tracking-[0.11em] text-neutral-800">
      {children}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[42%_58%] border-b border-[#dedede] last:border-b-0 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="border-r border-[#dedede] px-3 py-2.5 text-[12px] font-semibold leading-5 tracking-0 text-neutral-950 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:text-[14px] lg:tracking-[0.02em]">
        {label}
      </div>
      <div className="px-3 py-2.5 text-[12px] leading-5 tracking-0 text-neutral-700 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:text-[14px] lg:leading-6 lg:tracking-[0.01em]">
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
      <summary className="flex min-h-[50px] cursor-pointer list-none items-center justify-between gap-5 bg-white px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-950 sm:min-h-[57px] sm:px-6 sm:text-[12px] sm:tracking-[0.2em] [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
          strokeWidth={1.6}
        />
      </summary>
      <div className="px-4 pb-5 pt-1 text-[13px] leading-6 text-neutral-600 sm:px-6 sm:pb-5 sm:pt-2 sm:text-[14px] sm:leading-6">
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
      <p className="mt-2 text-[13px] leading-6 text-neutral-600">
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
      <p className="mt-1 whitespace-pre-line text-[13px] leading-6 text-neutral-600">{value}</p>
    </div>
  );
}

function RelatedProducts({ currentProduct, products: relatedProducts }) {
  if (!relatedProducts.length) {
    return null;
  }

  const hasOddProductCount = relatedProducts.length % 2 === 1;
  const collectionCategory = getAudienceTags(currentProduct)[0] || currentProduct.category;

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
            href={`/collection?category=${encodeURIComponent(collectionCategory)}`}
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
            href={`/collection?category=${encodeURIComponent(collectionCategory)}`}
            className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-950 underline underline-offset-4 sm:hidden"
          >
            View {collectionCategory}
          </Link>
        </div>
      </div>
    </section>
  );
}

function getRelatedProducts(product, products) {
  const currentTags = getAudienceTags(product);
  const sameCategory = products.filter(
    (item) =>
      item.id !== product.id &&
      getAudienceTags(item).some((tag) => currentTags.includes(tag))
  );
  const others = products.filter(
    (item) =>
      item.id !== product.id &&
      !getAudienceTags(item).some((tag) => currentTags.includes(tag))
  );

  return [...sameCategory, ...others].slice(0, 4);
}

function formatLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
