export const SITE_URL = "https://boldcave.com";
export const SITE_NAME = "Bold Cave";
export const DEFAULT_TITLE = "Bold Cave | Premium Perfumes & Fragrances";
export const DEFAULT_DESCRIPTION =
  "Discover Bold Cave premium perfumes and fragrances for men, women and unisex collections. Explore distinctive scents and shop the official Bold Cave collection.";
export const BRAND_LOGO_PATH = "/images/brand/bold-cave-logo.png";
export const BRAND_ICON_PATH = "/images/brand/bold-cave-icon.png";

export const PUBLIC_ROBOTS = {
  index: true,
  follow: true,
};

export const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
};

export function canonicalUrl(path = "/") {
  const cleanPath = String(path || "/").startsWith("/")
    ? String(path || "/")
    : `/${path}`;

  return new URL(cleanPath, SITE_URL).toString();
}

export function absoluteUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  try {
    return new URL(text).toString();
  } catch {
    return canonicalUrl(text);
  }
}

export function cleanSeoText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateSeoDescription(value, maxLength = 160) {
  const text = cleanSeoText(value);
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");

  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trim()}...`;
}

export function jsonLdScriptProps(data) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  };
}

export function getHomeJsonLd() {
  const organizationId = `${SITE_URL}/#organization`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: SITE_NAME,
      url: SITE_URL,
      logo: canonicalUrl(BRAND_LOGO_PATH),
      image: canonicalUrl(BRAND_ICON_PATH),
      sameAs: [
        "https://x.com/boldcave",
        "https://www.facebook.com/profile.php?id=61593546664572",
        "https://www.instagram.com/bold_cave/",
        "https://www.youtube.com/@BoldCave",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: {
        "@id": organizationId,
      },
    },
  ];
}

function normalizeImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return absoluteUrl(image);
  return absoluteUrl(image.url || image.secure_url || "");
}

export function getProductImageUrls(product) {
  const urls = [
    ...(product?.images || []).map(normalizeImageUrl),
    ...(product?.variants || []).flatMap((variant) => [
      normalizeImageUrl(variant?.image),
      ...(variant?.images || []).map(normalizeImageUrl),
    ]),
  ].filter(Boolean);

  return Array.from(new Set(urls));
}

export function getProductSeoTitle(product) {
  const name = cleanSeoText(product?.name) || "Perfume";

  if (/\b(perfume|fragrance|cologne|eau de parfum|edp)\b/i.test(name)) {
    return name;
  }

  return `${name} Perfume`;
}

export function getProductSeoDescription(product) {
  return (
    truncateSeoDescription(product?.shortDescription || product?.description) ||
    DEFAULT_DESCRIPTION
  );
}

export function getProductJsonLd(product) {
  const productUrl = canonicalUrl(`/product/${product.slug}`);
  const description = getProductSeoDescription(product);
  const imageUrls = getProductImageUrls(product);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const offers = variants
    .map((variant) => {
      const price = Number(variant?.sellingPrice);

      if (!Number.isFinite(price) || price < 0) {
        return null;
      }

      return {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "INR",
        price,
        availability:
          Number(variant?.stock) > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        name: [product.name, variant?.size].filter(Boolean).join(" - "),
        ...(variant?.sku ? { sku: String(variant.sku) } : {}),
      };
    })
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cleanSeoText(product.name),
    image: imageUrls,
    description,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    url: productUrl,
    ...(offers.length ? { offers } : {}),
  };
}
