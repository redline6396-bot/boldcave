"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gem,
  MarsStroke,
  Minus,
  Plus,
  SprayCan,
  Truck,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { NotificationContext } from "@/context/NotificationContext";

const DEFAULT_SIZE = "50 ML";
const CURRENCY = "\u20b9";
const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRupees = (value) => `${CURRENCY} ${formatPrice(value)}`;

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

      <section className="mx-auto grid max-w-[1280px] gap-7 px-5 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-0 lg:grid-cols-[minmax(0,700px)_minmax(410px,552px)] lg:items-start lg:justify-between lg:px-8 xl:gap-24">
        <div className="min-w-0 lg:sticky lg:top-[104px]">
          <div>
            <div className="aspect-square w-full overflow-hidden border border-[#eeeeee] bg-white lg:aspect-[1/1.03] lg:border-0">
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

            <div className="mt-6 flex items-center justify-center gap-8 lg:hidden">
              <button
                type="button"
                onClick={() =>
                  setSelectedImage((index) =>
                    index === 0 ? galleryImages.length - 1 : index - 1
                  )
                }
                className="flex h-8 w-8 cursor-pointer items-center justify-center text-neutral-700 transition-opacity hover:opacity-55"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
              </button>

              <span className="text-[13px] font-normal leading-none tracking-[0.02em] text-neutral-600">
                {selectedImage + 1}/{galleryImages.length}
              </span>

              <button
                type="button"
                onClick={() =>
                  setSelectedImage((index) =>
                    index === galleryImages.length - 1 ? 0 : index + 1
                  )
                }
                className="flex h-8 w-8 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>

            <div className="mt-5 hidden grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-3 sm:mt-6 lg:grid">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage((index) =>
                      index === 0 ? galleryImages.length - 1 : index - 1
                    )
                  }
                  className="flex h-8 w-7 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
                </button>

                <div className="grid min-w-0 grid-cols-4 gap-2.5 overflow-x-auto [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={[
                        "aspect-square min-w-[74px] cursor-pointer overflow-hidden bg-white transition-opacity sm:min-w-0",
                        selectedImage === index
                          ? "opacity-100"
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
                  onClick={() =>
                    setSelectedImage((index) =>
                      index === galleryImages.length - 1 ? 0 : index + 1
                    )
                  }
                  className="flex h-8 w-7 cursor-pointer items-center justify-center text-neutral-950 transition-opacity hover:opacity-55"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
                </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-white lg:pt-1">
          <Link
            href={`/collection?category=${encodeURIComponent(product.category)}`}
            className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500 transition-colors hover:text-neutral-950 lg:tracking-[0.18em]"
          >
            REDLINE
          </Link>

          <h1 className="mt-5 max-w-[560px] text-[28px] font-normal leading-[1.25] tracking-0 text-neutral-950 sm:text-[39px] lg:text-[42px] lg:leading-[1.18]">
            {product.name} Eau De Parfum
          </h1>

          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500 lg:mt-4">
            {product.category} fragrance
          </p>

          {product.shortDescription && (
            <p className="mt-5 max-w-[520px] text-[14px] leading-7 text-neutral-600">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-4">
            <span className="text-[26px] font-medium leading-none text-neutral-950 sm:text-[30px]">
              {formatRupees(selectedVariant?.sellingPrice)}
            </span>
            {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
              <span className="text-[15px] font-normal text-neutral-500 line-through decoration-neutral-500 decoration-1">
                {formatRupees(selectedVariant.mrp)}
              </span>
            )}
            {selectedVariant?.mrp > selectedVariant?.sellingPrice && (
              <span className="rounded-full bg-[#f3f1ee] px-4 py-2 text-[12px] font-medium tracking-0 text-neutral-700">
                Sale
              </span>
            )}
          </div>

          <div className="mt-7 border-t border-[#e8e2d9] pt-6 lg:mt-8 lg:pt-7">
            <p className="text-[13px] font-normal leading-none tracking-0 text-neutral-800">
              Select Size
            </p>

            <div className="mt-3 grid max-w-[328px] grid-cols-2 gap-2.5">
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
                      "h-11 border text-[13px] font-normal uppercase tracking-0 transition-colors",
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

          <div className="mt-7">
            <p className="text-[13px] font-normal leading-none tracking-0 text-neutral-800">
              Quantity
              {currentCartQuantity > 0 ? ` (${currentCartQuantity} in cart)` : ""}
            </p>

            <div className="mt-3 inline-grid h-[58px] grid-cols-[58px_78px_58px] border border-neutral-400 lg:h-11 lg:grid-cols-[48px_66px_48px] lg:border-neutral-300">
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

          <div className="mt-8 grid max-w-[552px] gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canBuy || isOutOfStock}
              className="h-[58px] border border-neutral-300 bg-white text-[19px] font-normal tracking-[0.12em] text-neutral-950 transition-colors hover:border-neutral-950 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              {isOutOfStock ? "Out of stock" : "Add to cart"}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canBuy || isOutOfStock}
              className="h-[58px] border border-neutral-950 bg-neutral-950 text-[19px] font-semibold tracking-[0.08em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              Buy it now
            </button>
          </div>

          <div className="mt-14 grid max-w-[552px] grid-cols-3 gap-4">
            {productBenefits.map(({ label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="mx-auto h-9 w-9 text-neutral-950" strokeWidth={1.45} />
                <p className="mt-3 text-[12px] font-semibold uppercase leading-4 tracking-[0.08em] text-neutral-950">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <DeliveryAvailability />
          <ProductInfoDetails product={product} selectedVariant={selectedVariant} />
        </div>
      </section>

      <RelatedProducts currentProduct={product} products={relatedProducts} />
      <ReviewsPlaceholder />
    </main>
  );
}

function DeliveryAvailability() {
  return (
    <section className="mt-10 max-w-[552px] rounded-[14px] border border-[#eee7dd] bg-[#fdfbf8] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f1eb]">
          <Truck className="h-5 w-5 text-neutral-950" strokeWidth={1.4} />
        </span>
        <h2 className="text-[13px] font-medium uppercase tracking-[0.18em] text-neutral-950">
          Delivery Availability
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Enter delivery pincode"
          className="h-12 w-full border border-[#ded6ca] bg-white px-4 text-[15px] outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950"
          aria-label="Enter delivery pincode"
        />
        <button
          type="button"
          className="h-12 border border-neutral-950 bg-neutral-950 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-neutral-800"
        >
          Check
        </button>
      </div>
    </section>
  );
}

function ProductInfoDetails({ product, selectedVariant }) {
  return (
    <section className="mt-14 max-w-[552px]">
      <h2 className="text-[30px] font-normal uppercase leading-none tracking-[0.035em] text-neutral-950 sm:text-[34px]">
        Product Details
      </h2>

      <div className="mt-4 overflow-hidden border border-[#dedede]">
        <div className="grid grid-cols-[0.9fr_1.1fr] border-b border-[#dedede] bg-[#fafafa]">
          <div className="border-r border-[#dedede] px-5 py-4 text-[14px] font-semibold tracking-[0.03em] text-neutral-950">
            Attribute
          </div>
          <div className="px-5 py-4 text-[14px] font-semibold tracking-[0.03em] text-neutral-950">
            Details
          </div>
        </div>

        <DetailRow label="Volume" value={selectedVariant?.size || "50 ML"} />
        <DetailRow label="Concentration" value="Eau De Parfum" />
        <DetailRow label="Category" value={product.category} />
        <DetailRow label="Country of Origin" value="India" />
      </div>

      <div className="mt-9 space-y-5 text-[18px] leading-[1.55] tracking-[0.035em] text-neutral-800">
        <p>{product.description}</p>
        <p>
          Designed for a polished daily ritual, this fragrance balances a clear
          opening with a deeper signature trail that feels modern, confident and
          refined.
        </p>
        <p>Why you&apos;ll love it:</p>
        <ul className="space-y-3 pl-5">
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

      <div className="mt-9 border border-[#e5dfd6]">
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
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] border-b border-[#dedede] last:border-b-0">
      <div className="border-r border-[#dedede] px-5 py-4 text-[15px] font-semibold tracking-[0.04em] text-neutral-950">
        {label}
      </div>
      <div className="px-5 py-4 text-[15px] leading-6 tracking-[0.04em] text-neutral-700">
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
      <summary className="flex min-h-[59px] cursor-pointer list-none items-center justify-between gap-6 bg-white px-5 text-[13px] font-medium uppercase tracking-[0.22em] text-neutral-950 transition-colors hover:bg-[#faf8f5] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
          strokeWidth={1.6}
        />
      </summary>
      <div className="border-t border-[#eee9e1] px-5 pb-6 pt-5 text-[14px] leading-7 text-neutral-600 sm:px-6 sm:text-[15px]">
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
    <section className="bg-white px-2.5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
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
