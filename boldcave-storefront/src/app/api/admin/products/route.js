import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { revalidateProductPaths } from "@/lib/cache/revalidate";
import { COMBO_VARIANT_SIZE, findVariantByIdentifier, serializeProductWithCombos } from "@/lib/api/products";
import { clearProductCache } from "@/lib/productCache";
import {
  cleanString,
  isObjectId,
  slugify,
  toPositiveNumber,
  validateCategory,
} from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";
const MAX_PRODUCT_IMAGES = 6;
const MAX_VARIANT_IMAGES = 6;
const SHIPPING_FIELDS = ["weightKg", "lengthCm", "breadthCm", "heightCm"];

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

function hasShippingMetadata(variant) {
  return (
    cleanString(variant.sku, 100) &&
    SHIPPING_FIELDS.every((field) => {
      const number = Number(variant[field]);
      return Number.isFinite(number) && number > 0;
    })
  );
}

function normalizeHsnCode(value) {
  const hsnCode = cleanString(value, 20);
  if (!hsnCode) return { hsnCode: "" };
  if (!/^\d+$/.test(hsnCode)) {
    return { error: "HSN Code must contain numbers only" };
  }
  return { hsnCode };
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
        Number(variant.stock) < 0 ||
        SHIPPING_FIELDS.some((field) => Number(variant[field]) < 0)
    )
  ) {
    return { error: "Variant prices, stock and shipping metadata cannot be negative" };
  }

  const normalized = variants.map((variant) => {
    const images = normalizeImages(variant.images);
    const legacyImage = normalizeImages(variant.image ? [variant.image] : [])[0];

    return {
      size: cleanString(variant.size, 40),
      sellingPrice: toPositiveNumber(variant.sellingPrice),
      mrp: toPositiveNumber(variant.mrp),
      costPrice: toPositiveNumber(variant.costPrice),
      stock: toPositiveNumber(variant.stock),
      sku: cleanString(variant.sku, 100),
      weightKg: toPositiveNumber(variant.weightKg),
      lengthCm: toPositiveNumber(variant.lengthCm),
      breadthCm: toPositiveNumber(variant.breadthCm),
      heightCm: toPositiveNumber(variant.heightCm),
      image: legacyImage,
      images,
    };
  });

  if (normalized.some((variant) => variant.images.length > MAX_VARIANT_IMAGES)) {
    return { error: `Maximum ${MAX_VARIANT_IMAGES} images allowed per variant` };
  }

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

async function validateComboItems(comboItems = [], currentProductId = "") {
  if (!Array.isArray(comboItems) || !comboItems.length) {
    return { error: "At least one included product is required" };
  }

  const normalized = comboItems
    .map((item) => ({
      productId: cleanString(item.productId || item.id || item._id, 80),
      variantId: cleanString(item.variantId || item.size, 100),
      quantity: toPositiveNumber(item.quantity || 1),
    }))
    .filter((item) => item.productId && item.variantId && item.quantity > 0);

  if (!normalized.length || normalized.length !== comboItems.length) {
    return { error: "Each included product must have product, variant and quantity" };
  }

  const comboItemKeys = normalized.map(
    (item) => `${item.productId}:${item.variantId.toLowerCase()}`
  );
  if (comboItemKeys.length !== new Set(comboItemKeys).size) {
    return { error: "Duplicate included product and variant entries are not allowed" };
  }

  const productIds = Array.from(new Set(normalized.map((item) => item.productId)));
  if (productIds.some((productId) => !isObjectId(productId))) {
    return { error: "Included product id is invalid" };
  }
  if (currentProductId && productIds.includes(String(currentProductId))) {
    return { error: "A combo cannot include itself" };
  }

  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(products.map((product) => [String(product._id), product]));

  for (const item of normalized) {
    const product = productsById.get(item.productId);
    if (!product) return { error: "Included product was not found" };
    if (product.productType === "combo") return { error: "A combo cannot include another combo" };
    if (!findVariantByIdentifier(product, item.variantId)) {
      return { error: `Variant ${item.variantId} was not found for ${product.name}` };
    }
  }

  return { comboItems: normalized };
}

async function buildComboPayload(body, currentProductId = "") {
  const name = cleanString(body.name, 160);
  const slug = slugify(body.slug || name);
  if (!name || !slug) return { error: "Combo name and slug are required" };
  if (!cleanString(body.description, 5000)) return { error: "Description is required" };

  const comboItemsResult = await validateComboItems(body.comboItems, currentProductId);
  if (comboItemsResult.error) return comboItemsResult;

  const mrp = toPositiveNumber(body.mrp ?? body.comboMrp ?? body.variants?.[0]?.mrp);
  const sellingPrice = toPositiveNumber(
    body.sellingPrice ?? body.comboSellingPrice ?? body.variants?.[0]?.sellingPrice
  );
  const costPrice = toPositiveNumber(body.costPrice ?? body.comboCostPrice ?? body.variants?.[0]?.costPrice);
  const hsnResult = normalizeHsnCode(body.hsnCode);
  if (hsnResult.error) return hsnResult;

  if (mrp <= 0 || sellingPrice <= 0) {
    return { error: "MRP and selling price must be greater than zero" };
  }
  if (mrp < sellingPrice) {
    return { error: "MRP must be greater than or equal to selling price" };
  }

  const images = normalizeImages(body.images);
  if (images.length > MAX_PRODUCT_IMAGES) {
    return { error: `Maximum ${MAX_PRODUCT_IMAGES} images allowed` };
  }

  const comboShippingInput = {
    weightKg: body.weightKg ?? body.variants?.[0]?.weightKg,
    lengthCm: body.lengthCm ?? body.variants?.[0]?.lengthCm,
    breadthCm: body.breadthCm ?? body.variants?.[0]?.breadthCm,
    heightCm: body.heightCm ?? body.variants?.[0]?.heightCm,
  };
  if (SHIPPING_FIELDS.some((field) => Number(comboShippingInput[field]) < 0)) {
    return { error: "Combo shipping weight and dimensions cannot be negative" };
  }

  const comboVariant = {
    size: COMBO_VARIANT_SIZE,
    sellingPrice,
    mrp,
    costPrice,
    stock: 0,
    sku: cleanString(body.sku, 100) || `${slug.toUpperCase()}-COMBO`,
    weightKg: toPositiveNumber(comboShippingInput.weightKg),
    lengthCm: toPositiveNumber(comboShippingInput.lengthCm),
    breadthCm: toPositiveNumber(comboShippingInput.breadthCm),
    heightCm: toPositiveNumber(comboShippingInput.heightCm),
  };

  if (body.status === "published" && (!hsnResult.hsnCode || !hasShippingMetadata(comboVariant))) {
    return { error: "Published combos need Combo SKU, HSN Code, weight and dimensions" };
  }

  return {
    payload: {
      productType: "combo",
      name,
      slug,
      audienceTags: normalizeAudienceTags(body.audienceTags),
      shortDescription: cleanString(body.shortDescription, 500),
      description: cleanString(body.description, 5000),
      hsnCode: hsnResult.hsnCode,
      images,
      featured: Boolean(body.featured),
      featuredOrder: toPositiveNumber(body.featuredOrder || 0),
      positioning: cleanString(body.positioning, 250),
      whatYouGet: "",
      bestFor: Array.isArray(body.bestFor)
        ? body.bestFor.map((entry) => cleanString(entry, 100)).filter(Boolean)
        : [],
      howToUse: cleanString(body.howToUse, 2000),
      storagePrecautions: cleanString(body.storagePrecautions, 2000),
      variants: [comboVariant],
      comboItems: comboItemsResult.comboItems,
      legalInformation: {
        caution: cleanString(body.legalInformation?.caution, 2000),
      },
      status: body.status === "published" ? "published" : "draft",
    },
  };
}

async function buildProductPayload(body, currentProductId = "", existingProduct = null) {
  if (body.productType === "combo") {
    return buildComboPayload(body, currentProductId);
  }

  const variantResult = normalizeVariants(body.variants);
  if (variantResult.error) return { error: variantResult.error };
  const hsnResult = normalizeHsnCode(body.hsnCode);
  if (hsnResult.error) return hsnResult;

  const name = cleanString(body.name, 160);
  const slug = slugify(body.slug || name);
  if (!name || !slug) {
    return { error: "Name and slug are required" };
  }

  const images = Array.isArray(body.images)
    ? normalizeImages(body.images)
    : normalizeImages(existingProduct?.images);

  if (images.length > MAX_PRODUCT_IMAGES) {
    return { error: `Maximum ${MAX_PRODUCT_IMAGES} images allowed` };
  }
  if (
    body.status === "published" &&
    (!hsnResult.hsnCode ||
      variantResult.variants.some(
        (variant) => Number(variant.stock) > 0 && !hasShippingMetadata(variant)
      ))
  ) {
    return { error: "Published orderable variants need SKU, HSN Code, weight and dimensions" };
  }

  return {
    payload: {
      productType: "product",
      name,
      slug,
      audienceTags: normalizeAudienceTags(body.audienceTags),
      shortDescription: cleanString(body.shortDescription, 500),
      description: cleanString(body.description, 5000),
      hsnCode: hsnResult.hsnCode,
      images,
      featured: Boolean(body.featured),
      featuredOrder: toPositiveNumber(body.featuredOrder || 0),
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
      comboItems: [],
      whatYouGet: "",
      legalInformation: {
        ingredients: cleanString(body.legalInformation?.ingredients, 2000),
        caution: cleanString(body.legalInformation?.caution, 2000),
      },
      status: body.status === "published" ? "published" : "draft",
    },
  };
}

export async function GET(request) {
  return withRuntimeDatabase(() => getAdminProductsRoute(request));
}

async function getAdminProductsRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    await connectDB();
    const products = await Product.find().sort({ createdAt: -1 });
    return applyAdminCors(
      request,
      success({
        products: await Promise.all(
          products.map((product) => serializeProductWithCombos(product, { includeCostPrice: true }))
        ),
      })
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function POST(request) {
  return withRuntimeDatabase(() => createAdminProductRoute(request));
}

async function createAdminProductRoute(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const body = await readJson(request);
    await connectDB();
    const result = await buildProductPayload(body);

    if (result.error) {
      return applyAdminCors(request, failure("VALIDATION_ERROR", result.error, 400));
    }

    const product = await Product.create(result.payload);
    clearProductCache();
    revalidateProductPaths([product.slug]);
    return applyAdminCors(
      request,
      success({ product: await serializeProductWithCombos(product, { includeCostPrice: true }) }, 201)
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "PRODUCT_CREATE_FAILED"));
  }
}

export { buildProductPayload };
