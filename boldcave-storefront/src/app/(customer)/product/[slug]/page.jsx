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
import YouMayAlsoLike from "@/components/product/YouMayAlsoLike";
import { useCart } from "@/context/CartContext";
import { NotificationContext } from "@/context/NotificationContext";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import ProductReviews from "@/features/customer/reviews/ProductReviews";
import {
  fetchProductBySlug,
  fetchProductReviews,
  getProductImageUrl,
} from "@/lib/clientApi";
import { requestCartDrawerOpen } from "@/lib/cartEvents";

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
    : [];

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
  const { acceptingOrders } = useStoreSettings();
  const notifications = useContext(NotificationContext);
  const slug = normalizeText(params?.slug);
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reviewSummary, setReviewSummary] = useState(null);

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
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError("");

    fetchProductBySlug(slug)
      .then((apiProduct) => {
        if (!isMounted) {
          return;
        }

        setProduct(apiProduct);
        rememberProducts([apiProduct].filter(Boolean));
        setSelectedImage(0);
        setMobileThumbStart(0);
        setDesktopThumbStart(0);
      })
      .catch((error) => {
        if (isMounted) {
          setProduct(null);
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

  useEffect(() => {
    if (!product?.id) {
      setReviewSummary(null);
      return;
    }

    let isMounted = true;

    fetchProductReviews(product.id)
      .then((result) => {
        if (!isMounted) return;

        const resultRating = result?.rating || {};
        const reviewCount =
          Number(resultRating.count) ||
          (Array.isArray(result?.reviews) ? result.reviews.length : 0);

        setReviewSummary({
          average: Number(resultRating.average) || 0,
          count: reviewCount,
        });
      })
      .catch(() => {
        if (isMounted) {
          setReviewSummary({ average: 0, count: 0 });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [product?.id]);

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
  const audienceTags = getAudienceTags(product);
  const audienceTagKeys = new Set(audienceTags.map(normalizeText));
  const profileTags = getProfileTags(product).filter(
    (tag, index, tags) =>
      normalizeText(tag) &&
      !audienceTagKeys.has(normalizeText(tag)) &&
      tags.findIndex((item) => normalizeText(item) === normalizeText(tag)) ===
        index
  );

  const handleScrollToReviews = () => {
    document.getElementById("customer-reviews")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

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
      requestCartDrawerOpen();
    }
  };

  const handleBuyNow = () => {
    if (!acceptingOrders) {
      notifications?.error?.("We are currently not accepting orders.");
      return;
    }

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

      <section className="mx-auto grid max-w-[1180px] gap-5 px-5 pb-10 pt-6 min-[600px]:max-w-[620px] min-[600px]:px-5 min-[600px]:pb-12 min-[600px]:pt-0 min-[820px]:max-w-[1180px] min-[820px]:grid-cols-[minmax(0,1fr)_minmax(260px,0.92fr)] min-[820px]:items-start min-[820px]:gap-5 lg:grid-cols-[minmax(0,600px)_minmax(360px,460px)] lg:gap-10 lg:px-8 lg:pb-14 xl:gap-14">
        <div className="min-w-0 min-[820px]:sticky min-[820px]:top-[92px] lg:top-[104px]">
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
                className="h-full w-full object-contain transition-opacity duration-200"
                loading="eager"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
            </div>

            <div
              className="mx-auto mt-4 grid w-full max-w-[380px] touch-pan-y grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-3 min-[820px]:hidden lg:hidden"
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
                      className="h-full w-full object-contain transition-opacity duration-200"
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

            <div
              className="mt-4 hidden touch-pan-y grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2.5 min-[820px]:grid lg:hidden"
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

              <div className="grid min-w-0 grid-cols-3 gap-2.5">
                {visibleMobileThumbnails.map(({ image, index }) => (
                  <button
                    key={`tablet-${image}-${index}`}
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
                      className="h-full w-full object-contain transition-opacity duration-200"
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

            <div className="mt-4 hidden grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-3 lg:grid">
                <button
                  type="button"
                  onClick={showPreviousImage}
                  disabled={selectedImage === 0}
                  className="flex h-8 w-7 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
                </button>

                <div className="grid min-w-0 grid-cols-4 gap-2 min-[900px]:gap-2.5 sm:gap-3">
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
                        className="h-full w-full object-contain transition-opacity duration-200"
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

        <div className="mx-auto w-full max-w-[360px] min-w-0 bg-white pt-0 min-[600px]:mx-auto min-[600px]:w-full min-[600px]:max-w-[460px] min-[600px]:pt-1 min-[820px]:mx-0 min-[820px]:max-w-none lg:w-full lg:max-w-[460px] lg:justify-self-start">
          <Link
            href={
              getAudienceTags(product)[0]
                ? `/collection?category=${encodeURIComponent(getAudienceTags(product)[0])}`
                : "/collection"
            }
            className="text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-neutral-950 sm:text-[11px] min-[600px]:text-[10px] lg:tracking-[0.18em]"
          >
            BOLD CAVE
          </Link>

          <h1 className="mt-1 flex max-w-[460px] flex-wrap items-baseline gap-x-2 gap-y-0.5 text-neutral-950 min-[600px]:max-w-[320px] min-[600px]:gap-x-2 lg:mt-2 lg:max-w-[460px]">
            <span className="text-[34px] font-normal uppercase leading-none tracking-0 min-[600px]:text-[30px] min-[760px]:text-[34px] lg:text-[44px]">
              {product.name}
            </span>
            <span className="text-[8.5px] font-medium uppercase tracking-[0.22em] text-neutral-500 min-[600px]:text-[8px] min-[600px]:tracking-[0.16em] min-[760px]:text-[9px] min-[760px]:tracking-[0.19em] lg:text-[12px] lg:tracking-[0.24em]">
              - {PRODUCT_TITLE_DESCRIPTOR}
            </span>
          </h1>

          <div className="min-h-[22px]">
            {reviewSummary && (
              <button
                type="button"
                onClick={handleScrollToReviews}
                className="mt-2 inline-flex cursor-pointer items-center gap-2.5 text-[12px] text-neutral-700 transition-colors hover:text-neutral-950 min-[600px]:mt-1.5 min-[600px]:text-[12px] lg:mt-2 lg:text-[13px]"
                aria-label={
                  reviewSummary.count
                    ? `Read ${reviewSummary.count} customer reviews`
                    : "Go to customer reviews"
                }
              >
                <ProductRatingStars value={reviewSummary.average} />
                <span className="leading-none">
                  {reviewSummary.count
                    ? `${reviewSummary.average.toFixed(1)} · ${reviewSummary.count} ${
                        reviewSummary.count === 1 ? "review" : "reviews"
                      }`
                    : "No reviews yet"}
                </span>
              </button>
            )}
          </div>

          <div className="mt-2.5 flex max-w-[460px] flex-nowrap items-center gap-1 overflow-visible min-[600px]:mt-2 lg:mt-2.5 min-[600px]:max-w-[340px] lg:max-w-[460px]">
            {audienceTags.map((tag) => (
              <InfoPill key={`audience-${tag}`}>{tag}</InfoPill>
            ))}
            {profileTags.map((tag) => (
              <InfoPill key={`profile-${tag}`}>{tag}</InfoPill>
            ))}
          </div>

          {product.shortDescription && (
            <p className="mt-4 max-w-[315px] text-[14px] leading-[1.55] text-neutral-700 min-[600px]:mt-3 min-[600px]:max-w-[300px] min-[600px]:text-[13px] min-[600px]:leading-[1.5] lg:mt-3 lg:max-w-[300px] lg:text-[16px] lg:leading-[1.6]">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1.5 sm:mt-3.5 min-[600px]:mt-3 lg:mt-4">
            <span className="text-[27px] font-normal leading-none tracking-[-0.015em] text-neutral-950 sm:text-[27px] min-[600px]:text-[25px] lg:text-[30px]">
              {formatRupees(selectedVariant?.sellingPrice)}
            </span>
            {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
              <span className="text-[12px] font-normal tracking-0 text-neutral-500 line-through decoration-neutral-500 decoration-1 sm:text-[13px] lg:text-[13px]">
                {formatRupees(selectedVariant.mrp)}
              </span>
            )}
          </div>

          <div className="mt-4 border-t border-[#e8e2d9] pt-3.5 sm:mt-4 sm:pt-4 min-[600px]:mt-3 min-[600px]:pt-3 lg:mt-4 lg:pt-4">
            <p className="text-[12px] font-normal leading-none tracking-0 text-neutral-800 sm:text-[13px] min-[600px]:text-[12px] lg:text-[15px]">
              Select Size
            </p>

            <div className="mt-2 flex flex-wrap gap-2 sm:mt-2.5 sm:gap-2.5 min-[600px]:gap-2">
              {variants.map((variant) => {
                const unavailable = Number(variant.stock) <= 0;
                const selected = variant.size === selectedSize;

                return (
                  <button
                    key={variant.size}
                    type="button"
                    onClick={() => setSelectedSize(variant.size)}
                    className={[
                      "h-9 min-w-[94px] border px-3 text-[11px] font-medium uppercase tracking-[0.01em] transition-colors min-[600px]:h-10 min-[600px]:min-w-[108px] min-[600px]:px-4 lg:h-11 lg:min-w-[126px] lg:text-[11px]",
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

          <div className="mt-3 sm:mt-4 min-[600px]:mt-3 lg:mt-[18px]">
            <p className="flex items-baseline gap-1.5 text-[12px] font-normal leading-none tracking-0 text-neutral-800 sm:text-[13px] min-[600px]:text-[12px] lg:text-[15px]">
              <span>Quantity</span>
              {currentCartQuantity > 0 && (
                <span className="text-[10px] font-normal text-neutral-500 sm:text-[11px] min-[600px]:text-[10.5px] lg:text-[12px]">
                  {currentCartQuantity} in cart
                </span>
              )}
            </p>

            <div className="mt-2 inline-grid h-9 grid-cols-[34px_44px_34px] border border-neutral-400 sm:mt-2.5 min-[600px]:h-10 min-[600px]:grid-cols-[40px_54px_40px] lg:h-10 lg:grid-cols-[46px_60px_46px] lg:border-neutral-300">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                className="flex cursor-pointer items-center justify-center border-r border-neutral-300 text-neutral-950 transition-colors hover:bg-[#f6f4f1] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5 lg:h-[18px] lg:w-[18px]" strokeWidth={1.7} />
              </button>
              <span className="flex items-center justify-center text-[13px] font-normal min-[600px]:text-[14px] lg:text-[17px]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={increaseQuantity}
                disabled={!canBuy || quantity >= maxAddableQuantity}
                className="flex cursor-pointer items-center justify-center border-l border-neutral-300 text-neutral-950 transition-colors hover:bg-[#f6f4f1] disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-white"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5 lg:h-[18px] lg:w-[18px]" strokeWidth={1.7} />
              </button>
            </div>

            {isSelectedUnavailable ? (
              <p className="mt-3 text-[13px] font-medium text-neutral-500 min-[600px]:text-[12px] lg:text-[14px]">
                This size is currently out of stock.
              </p>
            ) : currentCartQuantity >= selectedStock ? (
              <p className="mt-3 text-[13px] font-medium text-neutral-500 min-[600px]:text-[12px] lg:text-[14px]">
                Maximum available quantity for this size is already in your cart.
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid w-full max-w-[360px] gap-2 sm:mt-4 sm:max-w-[380px] min-[600px]:mt-3.5 min-[600px]:max-w-[320px] lg:mt-[18px] lg:max-w-[390px] lg:gap-2.5">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canBuy}
              className="h-10 border cursor-pointer border-neutral-300 bg-white text-[13px] font-normal tracking-[0.015em] text-neutral-950 transition-colors hover:border-neutral-950 min-[600px]:h-10 min-[600px]:text-[13px] lg:h-[46px] lg:text-[15px] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              {isSelectedUnavailable ? "Out of stock" : "Add to cart"}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canBuy || !acceptingOrders}
              className="h-10 border cursor-pointer border-neutral-950 bg-neutral-950 text-[13px] font-semibold tracking-[0.01em] text-white transition-colors hover:bg-neutral-800 min-[600px]:h-10 min-[600px]:text-[13px] lg:h-[46px] lg:text-[15px] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              {acceptingOrders ? "Buy it now" : "Currently not accepting orders"}
            </button>
          </div>

          <ProductInfoDetails product={product} selectedVariant={selectedVariant} />
        </div>
      </section>

      <YouMayAlsoLike
        currentProductId={product?._id || product?.id}
        currentSlug={product?.slug}
      />
      <div id="customer-reviews" className="scroll-mt-[96px]">
        <ProductReviews productId={product.id} />
      </div>
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
        <h2 className="text-[20px] font-normal uppercase leading-none tracking-[0.02em] text-neutral-950 min-[600px]:text-[18px] min-[760px]:text-[20px] lg:text-[30px] lg:tracking-[0.035em]">
          Product Details
        </h2>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-neutral-500 transition-colors hover:text-neutral-950 sm:w-auto sm:gap-1.5 sm:px-1"
          aria-label="Share product"
        >
          <Share2 className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden text-[12px] font-normal normal-case tracking-0 sm:inline">
            Share
          </span>
        </button>
      </div>

      <div className="mt-3 overflow-hidden border-y border-neutral-200 sm:border sm:border-neutral-200 lg:mt-4">
        <div className="grid grid-cols-[40%_60%] border-b border-neutral-200 bg-neutral-50 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="px-2.5 py-2.5 text-[12px] font-semibold tracking-0 text-neutral-950 sm:border-r sm:border-neutral-200 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:tracking-[0.03em]">
            Attribute
          </div>
          <div className="px-2.5 py-2.5 text-[12px] font-semibold tracking-0 text-neutral-950 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:tracking-[0.03em]">
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

      <div className="mt-6 max-w-[520px] space-y-4 text-[13px] leading-[1.65] tracking-0 text-neutral-800 sm:mt-7 sm:text-[14px] lg:mt-8 lg:space-y-4 lg:text-[15px] lg:leading-[1.65]">
        <p>{product.description}</p>
        <p>
          Designed for a polished daily ritual, this fragrance balances a clear
          opening with a deeper signature trail that feels modern, confident and
          refined.
        </p>
        <p className="pt-1 font-medium text-neutral-950">Why you&apos;ll love it:</p>
        <ul className="space-y-2 pl-5 sm:space-y-2.5 lg:space-y-3">
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

        <Accordion title="HOW TO USE">
          <p>{howToUse}</p>
        </Accordion>

        <Accordion title="STORAGE & PRECAUTIONS">
          <p>{storagePrecautions}</p>
        </Accordion>

        <Accordion title="INGREDIENTS">
          <p>{legalInformation.ingredients || "Not available"}</p>
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
      </div>

    </section>
  );
}

function ProductRatingStars({ value }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <span
      className="flex items-center gap-[2px] lg:gap-[3px]"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercent =
          Math.max(0, Math.min(1, rating - (star - 1))) * 100;

        return (
          <span
            key={star}
            className="relative block h-[13px] w-[13px] shrink-0 lg:h-[16px] lg:w-[16px]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="absolute inset-0 h-full w-full text-neutral-500"
            >
              <polygon
                points="12 1.6 15.18 8.11 22.35 9.12 17.16 14.16 18.42 21.28 12 17.88 5.58 21.28 6.84 14.16 1.65 9.12 8.82 8.11"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinejoin="miter"
              />
            </svg>

            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercent}%` }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-full w-[13px] text-neutral-950 lg:w-[16px]"
              >
                <polygon
                  points="12 1.6 15.18 8.11 22.35 9.12 17.16 14.16 18.42 21.28 12 17.88 5.58 21.28 6.84 14.16 1.65 9.12 8.82 8.11"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  strokeLinejoin="miter"
                />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

function InfoPill({ children }) {
  return (
    <span className="inline-flex min-h-5 shrink-0 items-center border border-neutral-300 bg-white px-1.5 text-[8px] font-medium uppercase leading-none tracking-[0.035em] text-neutral-800 min-[600px]:px-1.5 min-[600px]:text-[8px] min-[600px]:tracking-[0.04em] lg:min-h-6 lg:px-2.5 lg:text-[10px] lg:tracking-[0.11em]">
      {children}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[40%_60%] border-b border-neutral-200 last:border-b-0 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="px-2.5 py-2.5 text-[12px] font-semibold leading-[1.45] tracking-0 text-neutral-950 sm:border-r sm:border-neutral-200 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:text-[14px] lg:tracking-[0.02em]">
        {label}
      </div>
      <div className="min-w-0 break-words px-2.5 py-2.5 text-[12px] leading-[1.5] tracking-0 text-neutral-700 sm:px-4 sm:py-3 sm:text-[13px] lg:px-5 lg:py-4 lg:text-[14px] lg:leading-6 lg:tracking-[0.01em]">
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

function formatLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
