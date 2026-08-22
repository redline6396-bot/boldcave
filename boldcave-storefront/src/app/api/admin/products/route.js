import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { serializeProduct } from "@/lib/api/products";
import { clearProductCache } from "@/lib/productCache";
import {
  cleanString,
  slugify,
  toPositiveNumber,
  validateCategory,
} from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

function normalizeImages(images = []) {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => {
      if (typeof image === "string") return { url: image };
      return {
        url: cleanString(image.url, 2000),
        publicId: cleanString(image.publicId || image.public_id, 500),
        alt: cleanString(image.alt, 200),
      };
    })
    .filter((image) => image.url);
}

function normalizeVariants(variants = []) {
  if (!Array.isArray(variants) || !variants.length) {
    return { error: "At least one variant is required" };
  }

  if (
    variants.some(
      (variant) =>
        Number(variant.sellingPrice) < 0 ||
        Number(variant.mrp) < 0 ||
        Number(variant.costPrice) < 0 ||
        Number(variant.stock) < 0
    )
  ) {
    return { error: "Variant prices and stock cannot be negative" };
  }

  const normalized = variants.map((variant) => ({
    size: cleanString(variant.size, 40),
    sellingPrice: toPositiveNumber(variant.sellingPrice),
    mrp: toPositiveNumber(variant.mrp),
    costPrice: toPositiveNumber(variant.costPrice),
    stock: toPositiveNumber(variant.stock),
    sku: cleanString(variant.sku, 100),
  }));

  const sizes = normalized.map((variant) => variant.size);
  if (!sizes.every(Boolean)) {
    return { error: "Variant size label is required" };
  }

  const normalizedSizes = sizes.map((size) => size.toLowerCase());
  if (normalizedSizes.length !== new Set(normalizedSizes).size) {
    return { error: "Duplicate variant sizes are not allowed" };
  }

  if (normalized.some((variant) => variant.sellingPrice <= 0 || variant.mrp <= 0)) {
    return { error: "MRP and selling price must be greater than zero" };
  }

  return { variants: normalized };
}

function normalizeAudienceTags(tags) {
  const rawTags = Array.isArray(tags) ? tags : [];
  const normalized = rawTags
    .map((tag) => cleanString(tag, 30))
    .filter(validateCategory);

  return Array.from(new Set(normalized.length ? normalized : ["Unisex"]));
}

function buildProductPayload(body) {
  const variantResult = normalizeVariants(body.variants);
  if (variantResult.error) return { error: variantResult.error };

  const name = cleanString(body.name, 160);
  const slug = slugify(body.slug || name);
  if (!name || !slug) {
    return { error: "Name and slug are required" };
  }

  return {
    payload: {
      name,
      slug,
      audienceTags: normalizeAudienceTags(body.audienceTags),
      shortDescription: cleanString(body.shortDescription, 500),
      description: cleanString(body.description, 5000),
      images: normalizeImages(body.images),
      fragranceProfile: cleanString(body.fragranceProfile, 250),
      longevity: cleanString(body.longevity, 250),
      projection: cleanString(body.projection, 250),
      concentration: cleanString(body.concentration, 120),
      personality: cleanString(body.personality, 250),
      positioning: cleanString(body.positioning, 250),
      bestFor: Array.isArray(body.bestFor) ? body.bestFor.map((entry) => cleanString(entry, 100)).filter(Boolean) : [],
      bestSeason: Array.isArray(body.bestSeason) ? body.bestSeason.map((entry) => cleanString(entry, 100)).filter(Boolean) : [],
      howToUse: cleanString(body.howToUse, 2000),
      storagePrecautions: cleanString(body.storagePrecautions, 2000),
      fragranceNotes: {
        top: Array.isArray(body.fragranceNotes?.top) ? body.fragranceNotes.top.map((entry) => cleanString(entry, 80)).filter(Boolean) : [],
        heart: Array.isArray(body.fragranceNotes?.heart) ? body.fragranceNotes.heart.map((entry) => cleanString(entry, 80)).filter(Boolean) : [],
        base: Array.isArray(body.fragranceNotes?.base) ? body.fragranceNotes.base.map((entry) => cleanString(entry, 80)).filter(Boolean) : [],
      },
      variants: variantResult.variants,
      legalInformation: {
        ingredients: cleanString(body.legalInformation?.ingredients, 2000),
        caution: cleanString(body.legalInformation?.caution, 2000),
      },
      status: body.status === "published" ? "published" : "draft",
    },
  };
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();
    const products = await Product.find().sort({ createdAt: -1 });
    return applyAdminCors(
      request,
      success({ products: products.map((product) => serializeProduct(product, { includeCostPrice: true })) })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    const result = buildProductPayload(body);

    if (result.error) {
      return applyAdminCors(request, failure("VALIDATION_ERROR", result.error, 400));
    }

    await connectDB();
    const product = await Product.create(result.payload);
    clearProductCache();
    return applyAdminCors(
      request,
      success({ product: serializeProduct(product, { includeCostPrice: true }) }, 201)
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "PRODUCT_CREATE_FAILED"));
  }
}

export { buildProductPayload };
