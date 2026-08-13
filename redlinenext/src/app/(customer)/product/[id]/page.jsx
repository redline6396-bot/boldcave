"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShopContext } from "@/context/ShopContext";
import { NotificationContext } from "@/context/NotificationContext";
import ReviewSection from "@/components/ReviewSection";
import RelatedProducts from "@/components/RelatedProducts";
import CartPreview from "@/components/CartPreview";
import { sampleProducts } from "@/assets/sampleProducts";
import {
  Minus,
  Plus,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
} from "lucide-react";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

export default function ProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  const { products, cartItems, updateQuantity } = useContext(ShopContext);
  const { success } = useContext(NotificationContext);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [showImageModal, setShowImageModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const reviewSectionRef = useRef(null);

  const allProducts = products && products.length > 0 ? products : sampleProducts;

  const product = allProducts.find((item) => {
    const itemId = String(item.id || item._id);
    return itemId === String(productId);
  });

  useEffect(() => {
    if (product?.variants?.length > 0) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product]);

  useEffect(() => {
    if (showImageModal) {
      setZoomLevel(1);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showImageModal]);

  if (!product) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#fbf8f1] px-5 py-24 text-center font-body">
        <h1 className="font-display text-[38px] font-medium tracking-[-0.04em] text-[#332519]">
          Product not found
        </h1>

        <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-[#5f5648]">
          The product you are looking for does not exist or may have been
          removed.
        </p>

        <button
          type="button"
          onClick={() => router.push("/collection")}
          className="mt-8 inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-7 text-sm font-semibold text-white"
        >
          Back to Collection
        </button>
      </main>
    );
  }

  const finalProductId = product.id || product._id;

  const images = (() => {
    const rawImages = product.images || (product.image ? [product.image] : []);

    const normalized = rawImages
      .map((image) => (typeof image === "string" ? image : image?.url))
      .filter(Boolean);

    return normalized.length > 0 ? normalized : [FALLBACK_IMAGE];
  })();

  const rating = Number(product.rating || product.averageRating || 0);
  const reviewCount = Number(product.reviews || product.reviewCount || 0);

  const category =
    product.categories && product.categories[0]
      ? product.categories[0]
      : product.category || "Products";

  const selectedStock = Number(selectedVariant?.stockQty || 0);
  const isSelectedVariantOutOfStock = selectedVariant && selectedStock <= 0;

  const isProductOutOfStock = (targetProduct) => {
    if (!targetProduct.variants || targetProduct.variants.length === 0) {
      return false;
    }

    return targetProduct.variants.every(
      (variant) => Number(variant.stockQty || 0) === 0
    );
  };

  const getDiscount = () => {
    if (selectedVariant?.sellingPrice && selectedVariant?.originalPrice) {
      const discountPercent = Math.round(
        ((selectedVariant.originalPrice - selectedVariant.sellingPrice) /
          selectedVariant.originalPrice) *
          100
      );

      return discountPercent > 0 ? discountPercent : 0;
    }

    return 0;
  };

  const discount = getDiscount();

  const getCartQuantity = () => {
    if (!product || !selectedVariant) return 0;

    const cartItem = cartItems?.[finalProductId];

    if (!cartItem) return 0;

    if (typeof cartItem === "object") {
      const normalizedWeight = String(selectedVariant.weight).trim();
      return Number(cartItem[normalizedWeight]) || 0;
    }

    return 0;
  };

  const cartQuantity = getCartQuantity();

  const handleScrollToReviews = () => {
    reviewSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleShare = () => {
    const productUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/product/${finalProductId}`
        : "";

    const shareText = `Check out ${product.name} on Green Valley Naturals.`;

    if (navigator.share) {
      navigator
        .share({
          title: "Green Valley Naturals",
          text: shareText,
          url: productUrl,
        })
        .catch((error) => console.log("Share cancelled or failed:", error));

      return;
    }

    navigator.clipboard
      .writeText(productUrl)
      .then(() => success?.("Product link copied to clipboard"))
      .catch(() => console.error("Failed to copy to clipboard"));
  };

  const handleAddToCart = () => {
    if (!selectedVariant || isSelectedVariantOutOfStock || cartQuantity > 0) {
      return;
    }

    updateQuantity(finalProductId, 1, selectedVariant?.weight);
  };

  const handleBuyNow = () => {
    if (cartQuantity > 0) {
      router.push("/cart");
      return;
    }

    if (!selectedVariant || isSelectedVariantOutOfStock) return;

    updateQuantity(finalProductId, 1, selectedVariant?.weight);
    router.push("/cart");
  };

  const handleQuantityChange = (newQuantity) => {
    updateQuantity(
      finalProductId,
      Math.max(0, newQuantity),
      selectedVariant?.weight
    );
  };

  const isAddDisabled =
    isSelectedVariantOutOfStock || cartQuantity > 0 || !selectedVariant;

  const isBuyDisabled = isSelectedVariantOutOfStock || !selectedVariant;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf8f1] pb-[104px] font-body text-[#332519] sm:pb-0">
      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-7 md:px-8 lg:px-12">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-[#73695a]">
          <button
            type="button"
            onClick={() => router.push("/collection")}
            className="shrink-0 text-[#405526] hover:opacity-70"
          >
            Shop
          </button>

          <span className="shrink-0">/</span>

          <button
            type="button"
            onClick={() => router.push(`/collection?category=${category}`)}
            className="shrink-0 text-[#405526] hover:opacity-70"
          >
            {category}
          </button>

          <span className="shrink-0">/</span>

          <span className="min-w-0 truncate">{product.name}</span>
        </div>
      </div>

      {/* Main Product Area */}
      <section className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-7 md:px-8 lg:px-12 lg:py-7">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(390px,0.78fr)] lg:gap-8 xl:gap-10">
          {/* Image Gallery */}
          <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <div className="min-w-0 overflow-hidden rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8]">
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="relative flex h-[360px] w-full items-center justify-center bg-[#fbf7ef] p-5 sm:h-[520px] sm:p-8 lg:h-[590px] lg:p-9"
              >
                {discount > 0 && !isProductOutOfStock(product) && (
                  <span className="absolute left-4 top-4 rounded-[4px] bg-[#f6a313] px-2 py-1 text-[11px] font-bold text-[#332519]">
                    {discount}% Off
                  </span>
                )}

                {isProductOutOfStock(product) && (
                  <span className="absolute left-4 top-4 rounded-[4px] bg-[#6b6258] px-2 py-1 text-[11px] font-bold text-white">
                    Out of Stock
                  </span>
                )}

                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className={`max-h-full max-w-full object-contain ${
                    isProductOutOfStock(product) ? "opacity-70 grayscale" : ""
                  }`}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
              </button>

              {images.length > 1 && (
                <div className="max-w-full overflow-x-auto border-t border-[#e8dfd1] bg-[#fffdf8] p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max max-w-none gap-2">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(index)}
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[8px] border bg-[#fbf7ef] p-1.5 transition-colors sm:h-20 sm:w-20 ${
                          selectedImage === index
                            ? "border-[#405526]"
                            : "border-[#e8dfd1] hover:border-[#cbbb9d]"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} view ${index + 1}`}
                          className="h-full w-full object-contain"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="min-w-0 rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8] p-4 shadow-[0_12px_34px_rgba(58,45,29,0.04)] sm:p-6 lg:p-7">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526] sm:text-[11px]">
                  {category}
                </p>

                <h1 className="mt-3 break-words font-display text-[31px] font-medium leading-[1.02] tracking-[-0.045em] text-[#332519] sm:text-[44px] lg:text-[46px]">
                  {product.name}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ded4c3] bg-[#fffdf8] text-[#405526] transition-colors hover:border-[#405526] sm:h-10 sm:w-10"
                  aria-label="Share product"
                >
                  <Share2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.7} />
                </button>
              </div>
            </div>

            {/* Rating */}
            {reviewCount > 0 ? (
              <button
                type="button"
                onClick={handleScrollToReviews}
                className="mt-5 flex min-w-0 items-center gap-2 text-left text-[13px] text-[#5f5648] transition-opacity hover:opacity-75"
              >
                <span className="flex shrink-0 items-center gap-[1px] text-[#f29b14]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index} className="text-[13px] leading-none">
                      {index < Math.round(rating) ? "★" : "☆"}
                    </span>
                  ))}
                </span>

                <span className="shrink-0 font-medium text-[#332519]">
                  {rating.toFixed(1)}
                </span>

                <span className="shrink-0">·</span>

                <span className="min-w-0 truncate">{reviewCount} reviews</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleScrollToReviews}
                className="mt-5 text-left text-[13px] text-[#6f6658] transition-opacity hover:opacity-75"
              >
                No reviews yet
              </button>
            )}

            {/* Price */}
            <div className="mt-5 border-y border-[#eee6d9] py-5">
              <div className="flex min-w-0 flex-wrap items-end gap-3">
                {selectedVariant && (
                  <>
                    <span className="font-display text-[33px] font-semibold leading-none tracking-[-0.04em] text-[#332519] sm:text-[40px]">
                      ₹{selectedVariant.sellingPrice}
                    </span>

                    {selectedVariant.originalPrice && (
                      <span className="pb-1 text-[16px] text-[#9a9183] line-through sm:text-[18px]">
                        ₹{selectedVariant.originalPrice}
                      </span>
                    )}

                    {discount > 0 && (
                      <span className="mb-1 rounded-full bg-[#f4eddf] px-3 py-1 text-[12px] font-semibold text-[#405526]">
                        Save {discount}%
                      </span>
                    )}
                  </>
                )}
              </div>

              <p className="mt-2 text-[12px] text-[#6f6658]">
                Inclusive of all taxes.
              </p>
            </div>

            {/* Description */}
            {product.description && (
              <p className="mt-5 line-clamp-3 text-[14px] leading-7 text-[#4f463c] sm:line-clamp-none">
                {product.description}
              </p>
            )}

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#332519]">
                    Size / Weight
                  </p>

                  {selectedVariant && selectedStock > 0 && selectedStock < 5 && (
                    <span className="shrink-0 rounded-full bg-[#fff3df] px-3 py-1 text-[11px] font-medium text-[#a45a00]">
                      Only {selectedStock} left
                    </span>
                  )}
                </div>

                <div className="flex max-w-full flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const active = selectedVariant?.weight === variant.weight;
                    const unavailable = Number(variant.stockQty || 0) <= 0;

                    return (
                      <button
                        key={variant.weight}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                          active
                            ? "border-[#405526] bg-[#405526] text-white"
                            : "border-[#ded4c3] bg-[#fffdf8] text-[#332519] hover:border-[#405526]"
                        } ${unavailable ? "opacity-50" : ""}`}
                      >
                        {variant.weight}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock Status */}
            {selectedVariant && selectedStock <= 0 && (
              <div className="mt-5 rounded-[10px] border border-[#f0c9c6] bg-[#fff2f1] px-4 py-3 text-sm font-medium text-[#c9504a]">
                This selected size is currently out of stock.
              </div>
            )}

            {/* Quantity in Cart */}
            {cartQuantity > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-[#332519]">
                  Quantity in cart
                </p>

                <div className="inline-flex items-center rounded-full border border-[#ded4c3] bg-[#fffdf8]">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(cartQuantity - 1)}
                    className="flex h-10 w-11 items-center justify-center rounded-full text-[#5f5648] transition-colors hover:bg-[#f1eadf] hover:text-[#405526]"
                  >
                    <Minus className="h-4 w-4" strokeWidth={1.8} />
                  </button>

                  <span className="min-w-10 text-center text-sm font-semibold text-[#332519]">
                    {cartQuantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(cartQuantity + 1)}
                    className="flex h-10 w-11 items-center justify-center rounded-full text-[#5f5648] transition-colors hover:bg-[#f1eadf] hover:text-[#405526]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddDisabled}
                className={`flex h-12 items-center justify-center rounded-[6px] text-sm font-semibold transition-colors ${
                  isAddDisabled
                    ? "cursor-not-allowed bg-[#d7d0c4] text-white"
                    : "bg-[#405526] text-white hover:bg-[#30421e]"
                }`}
              >
                {cartQuantity > 0 ? "Already in Cart" : "Add to Cart"}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isBuyDisabled}
                className={`flex h-12 items-center justify-center rounded-[6px] border text-sm font-semibold transition-colors ${
                  isBuyDisabled
                    ? "cursor-not-allowed border-[#d7d0c4] bg-[#f4efe7] text-[#aaa394]"
                    : "border-[#405526] bg-[#fffdf8] text-[#405526] hover:bg-[#f4eee2]"
                }`}
              >
                {cartQuantity > 0 ? "View Cart" : "Buy Now"}
              </button>
            </div>

            {/* Assurance */}
            <div className="mt-7 border-t border-[#eee6d9] pt-5">
              <div className="grid min-w-0 divide-y divide-[#eee6d9] rounded-[10px] border border-[#eee6d9] bg-[#fffdf8] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <ProductAssurance title="Delivery" text="Free above ₹499" />
                <ProductAssurance title="Freshness" text="Packed with care" />
                <ProductAssurance title="Payment" text="Secure checkout" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-7 md:px-8 lg:px-12">
        <div className="min-w-0 rounded-[14px] border border-[#e8dfd1] bg-[#fffdf8] p-4 sm:p-6 lg:p-7">
          <div className="flex max-w-full gap-6 overflow-x-auto border-b border-[#e8dfd1] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["description", "specifications"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 border-b-2 pb-4 text-[13px] font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? "border-[#405526] text-[#405526]"
                    : "border-transparent text-[#6f6658] hover:text-[#332519]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="pt-6">
            {activeTab === "description" && (
              <div className="grid min-w-0 gap-7 lg:grid-cols-[1fr_340px]">
                <div className="min-w-0">
                  <h2 className="font-display text-[28px] font-medium leading-none text-[#332519] sm:text-[30px]">
                    About this product
                  </h2>

                  <p className="mt-4 max-w-[760px] text-[14px] leading-7 text-[#4f463c]">
                    {product.description ||
                      "A carefully sourced everyday staple made for Indian kitchens."}
                  </p>
                </div>

                <div className="min-w-0 rounded-[12px] bg-[#fbf7ef] p-4">
                  <h3 className="text-sm font-semibold text-[#332519]">
                    Key features
                  </h3>

                  <ul className="mt-4 space-y-3 text-[13px] text-[#4f463c]">
                    <FeatureItem text="Naturally sourced pantry staple" />
                    <FeatureItem text="No artificial colours or preservatives" />
                    <FeatureItem text="Packed for everyday freshness" />
                    <FeatureItem text="Premium quality checked" />
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="min-w-0 overflow-hidden rounded-[12px] border border-[#eee6d9]">
                <SpecRow label="Name" value={product.name} />
                <SpecRow
                  label="Category"
                  value={
                    product.categories && product.categories.length > 0
                      ? product.categories.join(", ")
                      : "Uncategorized"
                  }
                />
                <SpecRow
                  label="Price"
                  value={`₹${
                    selectedVariant?.sellingPrice ||
                    product.variants?.[0]?.sellingPrice ||
                    "N/A"
                  }`}
                  highlight
                />
                <SpecRow label="SKU" value={product.sku || "N/A"} />
                <SpecRow
                  label="Stock"
                  value={selectedStock > 0 ? "Available" : "Out of Stock"}
                  highlight={selectedStock > 0}
                  danger={selectedStock <= 0}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <div ref={reviewSectionRef} className="min-w-0 overflow-x-hidden">
        <ReviewSection productId={productId} />
      </div>

      <div className="min-w-0 overflow-x-hidden">
        <RelatedProducts />
      </div>

      {showImageModal && (
        <ImageModal
          images={images}
          productName={product.name}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          onClose={() => setShowImageModal(false)}
        />
      )}

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e8dfd1] bg-[#fffdf8]/95 px-4 py-3 backdrop-blur-md sm:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0">
            <p className="text-[11px] text-[#6f6658]">Total</p>
            <p className="text-[18px] font-bold leading-none text-[#332519]">
              ₹{selectedVariant?.sellingPrice || 0}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (cartQuantity > 0) {
                router.push("/cart");
                return;
              }

              handleAddToCart();
            }}
            disabled={isSelectedVariantOutOfStock || !selectedVariant}
            className={`min-w-0 flex h-11 flex-1 items-center justify-center rounded-[6px] text-sm font-semibold ${
              isSelectedVariantOutOfStock || !selectedVariant
                ? "bg-[#d7d0c4] text-white"
                : "bg-[#405526] text-white"
            }`}
          >
            {cartQuantity > 0 ? "View Cart" : "Add to Cart"}
          </button>
        </div>
      </div>

      <CartPreview />
    </main>
  );
}

function ProductAssurance({ title, text }) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#405526] sm:text-[12px]">
        {title}
      </p>

      <p className="mt-1 text-[13px] text-[#5f5648]">{text}</p>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex min-w-0 items-start gap-2">
      <Check
        className="mt-0.5 h-4 w-4 shrink-0 text-[#405526]"
        strokeWidth={1.8}
      />
      <span className="min-w-0">{text}</span>
    </li>
  );
}

function SpecRow({ label, value, highlight = false, danger = false }) {
  return (
    <div className="grid min-w-0 grid-cols-[105px_minmax(0,1fr)] border-b border-[#eee6d9] last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="bg-[#fbf7ef] px-3 py-3 text-[12px] font-semibold text-[#332519] sm:px-4 sm:text-[13px]">
        {label}
      </div>

      <div
        className={`min-w-0 break-words px-3 py-3 text-[12px] sm:px-4 sm:text-[13px] ${
          danger
            ? "font-medium text-[#c9504a]"
            : highlight
              ? "font-medium text-[#405526]"
              : "text-[#5f5648]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ImageModal({
  images,
  productName,
  selectedImage,
  setSelectedImage,
  zoomLevel,
  setZoomLevel,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black/75 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full max-h-[92vh] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-[16px] bg-[#fffdf8]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[#e8dfd1] px-4 py-4 sm:px-5">
          <h3 className="min-w-0 truncate text-sm font-semibold text-[#332519]">
            {productName}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3ede2] text-[#332519]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1">
          {images.length > 1 && (
            <div className="hidden w-[92px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-[#e8dfd1] bg-[#fbf7ef] p-3 lg:flex">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-[8px] border bg-[#fffdf8] p-1.5 ${
                    selectedImage === index
                      ? "border-[#405526]"
                      : "border-[#e8dfd1] opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${productName} view ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-auto bg-white">
            <img
              src={images[selectedImage]}
              alt={productName}
              className="max-h-full max-w-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center",
              }}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage((index) => Math.max(0, index - 1))
                  }
                  disabled={selectedImage === 0}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#405526]/85 text-white disabled:opacity-30 sm:left-4 sm:h-11 sm:w-11"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage((index) =>
                      Math.min(images.length - 1, index + 1)
                    )
                  }
                  disabled={selectedImage === images.length - 1}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#405526]/85 text-white disabled:opacity-30 sm:right-4 sm:h-11 sm:w-11"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {images.length > 1 && (
              <div className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white sm:right-4 sm:top-4">
                {selectedImage + 1} / {images.length}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-[#e8dfd1] bg-[#fbf7ef] px-4 py-4 sm:px-5">
          <div className="shrink-0 text-xs text-[#6f6658]">
            {selectedImage + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto lg:hidden">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`h-14 w-14 shrink-0 rounded-[8px] border bg-[#fffdf8] p-1 ${
                    selectedImage === index
                      ? "border-[#405526]"
                      : "border-[#e8dfd1] opacity-60"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${productName} thumbnail ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => setZoomLevel((level) => Math.max(1, level - 0.2))}
              disabled={zoomLevel <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#d8cebb] bg-[#fffdf8] disabled:opacity-35"
            >
              −
            </button>

            <div className="min-w-[70px] rounded-[6px] border border-[#d8cebb] bg-[#fffdf8] px-3 py-2 text-center text-xs font-medium">
              {Math.round(zoomLevel * 100)}%
            </div>

            <button
              type="button"
              onClick={() => setZoomLevel((level) => Math.min(3, level + 0.2))}
              disabled={zoomLevel >= 3}
              className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#d8cebb] bg-[#fffdf8] disabled:opacity-35"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              disabled={zoomLevel === 1}
              className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#d8cebb] bg-[#fffdf8] disabled:opacity-35"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
