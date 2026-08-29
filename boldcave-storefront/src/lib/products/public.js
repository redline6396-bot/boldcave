import connectDB from "@/lib/db";
import { serializeProductWithCombos } from "@/lib/api/products";
import { getProductCache, setProductCache } from "@/lib/productCache";
import { PRODUCT_CATEGORIES, isObjectId } from "@/lib/validation";
import Product from "@/models/Product";

const CATALOG_SELECT = [
  "productType",
  "name",
  "slug",
  "audienceTags",
  "shortDescription",
  "images",
  "fragranceProfile",
  "fragranceNotes",
  "variants.size",
  "variants.sellingPrice",
  "variants.mrp",
  "variants.stock",
  "variants.image",
  "variants.images",
  "comboItems",
  "featured",
  "featuredOrder",
  "status",
  "createdAt",
].join(" ");

const COMBO_REFERENCE_SELECT = [
  "name",
  "slug",
  "shortDescription",
  "fragranceProfile",
  "images",
  "variants.size",
  "variants.stock",
  "variants.image",
  "variants.images",
].join(" ");

const CATALOG_SORT = { createdAt: -1 };
const FEATURED_SORT = { featuredOrder: 1, name: 1 };

const toObject = (value) =>
  typeof value?.toObject === "function" ? value.toObject() : value;

const toId = (value) => String(value?._id || value?.id || value || "").trim();

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const serializeImage = (image) => {
  if (!image) return undefined;
  if (typeof image === "string") return image ? { url: image } : undefined;

  const url = image.url || image.secure_url || "";
  if (!url) return undefined;

  return {
    url,
    publicId: image.publicId || image.public_id || "",
    alt: image.alt || "",
  };
};

const findVariant = (product, identifier) => {
  const key = normalizeText(identifier);
  return (toObject(product)?.variants || []).find((variant) => {
    const object = toObject(variant);
    return (
      normalizeText(object?._id) === key ||
      normalizeText(object?.size) === key ||
      normalizeText(object?.sku) === key
    );
  });
};

const getVariantProductImage = (variant, product) => {
  const variantObject = toObject(variant);
  const productObject = toObject(product);

  return (
    serializeImage(variantObject?.images?.[0]) ||
    serializeImage(variantObject?.image) ||
    serializeImage(productObject?.images?.[0])
  );
};

function getComboAvailability(comboItems = [], productsById = new Map()) {
  const requirements = new Map();

  comboItems.forEach((item) => {
    const productId = toId(item?.productId);
    const product = productsById.get(productId);
    const variant = findVariant(product, item?.variantId || item?.size);
    const variantId = variant?.size || item?.variantId || item?.size || "";
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    if (!productId || !variantId) return;

    const key = `${productId}:${normalizeText(variantId)}`;
    const current = requirements.get(key) || {
      productId,
      variantId,
      quantity: 0,
      stock: Number(variant?.stock) || 0,
    };
    current.quantity += quantity;
    current.stock = Number(variant?.stock) || 0;
    requirements.set(key, current);
  });

  if (!requirements.size) return 0;

  return Array.from(requirements.values()).reduce((available, requirement) => {
    const possibleQuantity = Math.floor(requirement.stock / requirement.quantity);
    return Math.min(available, possibleQuantity);
  }, Number.POSITIVE_INFINITY);
}

function serializeVariant(variant, isCombo, comboAvailability) {
  return {
    size: isCombo ? "Combo" : variant.size,
    sellingPrice: Number(variant.sellingPrice) || 0,
    mrp: Number(variant.mrp) || 0,
    stock: isCombo ? Number(comboAvailability) || 0 : Number(variant.stock) || 0,
    image: isCombo ? undefined : serializeImage(variant.image),
    images: isCombo
      ? []
      : (variant.images || []).map(serializeImage).filter(Boolean).slice(0, 2),
  };
}

function serializeCatalogProduct(product, productsById = new Map()) {
  const object = toObject(product);
  const isCombo = object.productType === "combo";
  const comboItems = object.comboItems || [];
  const comboAvailability = isCombo
    ? getComboAvailability(comboItems, productsById)
    : undefined;

  return {
    id: toId(object),
    _id: toId(object),
    productType: isCombo ? "combo" : "product",
    name: object.name,
    slug: object.slug,
    audienceTags: Array.isArray(object.audienceTags) ? object.audienceTags : [],
    shortDescription: object.shortDescription || "",
    featured: Boolean(object.featured),
    featuredOrder: Number(object.featuredOrder) || 0,
    images: (object.images || []).map(serializeImage).filter(Boolean).slice(0, 2),
    fragranceProfile: object.fragranceProfile || "",
    fragranceNotes: {
      top: Array.isArray(object.fragranceNotes?.top)
        ? object.fragranceNotes.top.slice(0, 3)
        : [],
    },
    variants: (object.variants || []).map((variant) =>
      serializeVariant(variant, isCombo, comboAvailability)
    ),
    comboItems: comboItems.map((item) => {
      const productId = toId(item?.productId);
      const referencedProduct = productsById.get(productId);
      const variant = findVariant(referencedProduct, item.variantId);
      const referencedObject = toObject(referencedProduct);

      return {
        productId,
        variantId: item.variantId,
        size: variant?.size || item.variantId,
        quantity: Math.max(1, Number(item.quantity) || 1),
        name: referencedObject?.name || "",
        slug: referencedObject?.slug || "",
        image: getVariantProductImage(variant, referencedObject),
        shortDescription: referencedObject?.shortDescription || "",
        fragranceProfile: referencedObject?.fragranceProfile || "",
      };
    }),
    comboAvailability,
  };
}

function buildCatalogFilter({ category = "", ids = [], featuredOnly = false } = {}) {
  const filter = { status: "published" };

  if (ids.length) {
    filter._id = { $in: ids };
    return filter;
  }

  if (featuredOnly) {
    filter.featured = true;
  }

  if (category === "Men" || category === "Women") {
    filter.audienceTags = { $in: [category, "Unisex"] };
  } else if (category === "Unisex") {
    filter.audienceTags = "Unisex";
  }

  return filter;
}

async function getComboReferenceMap(products) {
  const referencedIds = Array.from(
    new Set(
      products
        .flatMap((product) => product.comboItems || [])
        .map((item) => toId(item?.productId))
        .filter(Boolean)
    )
  );

  if (!referencedIds.length) return new Map();

  const referencedProducts = await Product.find({ _id: { $in: referencedIds } })
    .select(COMBO_REFERENCE_SELECT)
    .lean();

  return new Map(referencedProducts.map((product) => [toId(product), product]));
}

export function normalizeCatalogCategory(category) {
  const value = String(category || "").trim();
  if (!value || value.toLowerCase() === "all") return "";
  return PRODUCT_CATEGORIES.includes(value) ? value : null;
}

export async function getCatalogProducts(options = {}) {
  const category = normalizeCatalogCategory(options.category);
  if (category === null) {
    const error = new Error("Invalid product category");
    error.code = "INVALID_CATEGORY";
    throw error;
  }

  const rawIds = Array.isArray(options.ids)
    ? options.ids.map(toId).filter(Boolean)
    : [];
  const hasIdFilter = Array.isArray(options.ids);
  const ids = rawIds.filter(isObjectId);

  if (hasIdFilter && rawIds.length !== ids.length) {
    const error = new Error("Invalid product id");
    error.code = "INVALID_PRODUCT_ID";
    throw error;
  }

  if (hasIdFilter && !ids.length) {
    return [];
  }
  const cacheKey = ids.length
    ? `catalog-products:${ids.sort().join(",")}`
    : `catalog-products:${category || "all"}`;
  const cached = options.cache !== false ? getProductCache(cacheKey) : null;
  if (cached) return cached.products;

  await connectDB();

  const products = await Product.find(
    buildCatalogFilter({ category, ids, featuredOnly: options.featuredOnly })
  )
    .select(CATALOG_SELECT)
    .sort(options.featuredOnly ? FEATURED_SORT : CATALOG_SORT)
    .lean();
  const filteredProducts = products;
  const productsById = await getComboReferenceMap(filteredProducts);
  const serializedProducts = filteredProducts.map((product) =>
    serializeCatalogProduct(product, productsById)
  );

  if (options.cache !== false) {
    setProductCache(cacheKey, { products: serializedProducts });
  }

  return serializedProducts;
}

export async function getFeaturedCatalogProducts() {
  return getCatalogProducts({ featuredOnly: true });
}

export async function getProductBySlug(slug, { includeRating = false } = {}) {
  const cleanSlug = normalizeText(slug);
  if (!cleanSlug) return null;

  const cacheKey = `product-slug:${cleanSlug}:${includeRating ? "rating" : "plain"}`;
  const cached = getProductCache(cacheKey);
  if (cached) return cached;

  await connectDB();
  const product = await Product.findOne({ slug: cleanSlug, status: "published" });
  if (!product) return null;

  const data = await serializeProductWithCombos(product);

  if (includeRating) {
    const { getReviewStats } = await import("@/lib/orders/pricing");
    data.rating = await getReviewStats(product._id);
  }

  return setProductCache(cacheKey, data);
}

export async function getRelatedCatalogProducts(productId, limit = 4) {
  const id = toId(productId);
  if (!isObjectId(id)) {
    const error = new Error("Invalid product id");
    error.code = "INVALID_PRODUCT_ID";
    throw error;
  }

  const cacheKey = `related-products:${id}:${limit}`;
  const cached = getProductCache(cacheKey);
  if (cached) return cached.products;

  await connectDB();

  const currentProduct = await Product.findOne({ _id: id, status: "published" })
    .select("_id")
    .lean();
  if (!currentProduct) {
    const error = new Error("Product not found");
    error.code = "PRODUCT_NOT_FOUND";
    throw error;
  }

  const relatedProducts = await Product.aggregate([
    {
      $match: {
        _id: { $ne: currentProduct._id },
        status: "published",
      },
    },
    { $sample: { size: limit } },
    {
      $project: {
        productType: 1,
        name: 1,
        slug: 1,
        audienceTags: 1,
        shortDescription: 1,
        images: 1,
        fragranceProfile: 1,
        fragranceNotes: 1,
        variants: 1,
        comboItems: 1,
        featured: 1,
        featuredOrder: 1,
        status: 1,
        createdAt: 1,
      },
    },
  ]);
  const productsById = await getComboReferenceMap(relatedProducts);
  const products = relatedProducts.map((product) =>
    serializeCatalogProduct(product, productsById)
  );

  return setProductCache(cacheKey, { products }).products;
}
