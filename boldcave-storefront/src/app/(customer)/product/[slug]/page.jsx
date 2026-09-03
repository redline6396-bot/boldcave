import { cache } from "react";
import ProductDetailClient from "./ProductDetailClient";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { getProductBySlug } from "@/lib/products/public";
import {
  DEFAULT_DESCRIPTION,
  PRIVATE_ROBOTS,
  PUBLIC_ROBOTS,
  SITE_NAME,
  canonicalUrl,
  getProductImageUrls,
  getProductJsonLd,
  getProductSeoDescription,
  getProductSeoTitle,
  jsonLdScriptProps,
} from "@/lib/seo";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

function getProductLoadErrorType(error) {
  if (error?.code === "PRODUCT_NOT_FOUND") {
    return "not-found";
  }

  return "temporary";
}

const getPublishedProduct = cache((slug) =>
  withRuntimeDatabase(() => getProductBySlug(slug))
);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const safeSlug = String(slug || "").trim().toLowerCase();
  const fallbackCanonical = canonicalUrl(`/product/${safeSlug}`);

  try {
    const product = await getPublishedProduct(safeSlug);

    if (!product) {
      return {
        title: "Product Not Found",
        description:
          "The Bold Cave product you are looking for is not available.",
        alternates: {
          canonical: fallbackCanonical,
        },
        robots: PRIVATE_ROBOTS,
      };
    }

    const title = getProductSeoTitle(product);
    const description = getProductSeoDescription(product);
    const canonical = canonicalUrl(`/product/${product.slug}`);
    const images = getProductImageUrls(product);

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      robots: PUBLIC_ROBOTS,
      openGraph: {
        type: "website",
        url: canonical,
        siteName: SITE_NAME,
        title: `${title} | ${SITE_NAME}`,
        description,
        ...(images.length
          ? {
              images: images.map((url) => ({
                url,
                alt: product.name,
              })),
            }
          : {}),
      },
      twitter: {
        card: images.length ? "summary_large_image" : "summary",
        title: `${title} | ${SITE_NAME}`,
        description,
        ...(images.length ? { images: [images[0]] } : {}),
      },
    };
  } catch {
    return {
      title: "Bold Cave Perfume",
      description: DEFAULT_DESCRIPTION,
      alternates: {
        canonical: fallbackCanonical,
      },
    };
  }
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  let product = null;
  let loadError = "";
  let loadErrorType = "";

  try {
    product = await getPublishedProduct(slug);
  } catch (error) {
    loadErrorType = getProductLoadErrorType(error);
    loadError =
      loadErrorType === "temporary"
        ? "Please try again."
        : "The product you are looking for is not available.";
  }

  return (
    <>
      {product && <script {...jsonLdScriptProps(getProductJsonLd(product))} />}
      <ProductDetailClient
        initialProduct={product}
        initialReviewSummary={null}
        initialLoadError={loadError}
        initialLoadErrorType={loadErrorType}
      />
    </>
  );
}
