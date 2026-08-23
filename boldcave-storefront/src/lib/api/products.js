export function normalizeImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.url || image.secure_url || "";
}

function serializeImage(image) {
  if (!image) return undefined;
  if (typeof image === "string") return image ? { url: image } : undefined;

  const url = image.url || image.secure_url || "";
  if (!url) return undefined;

  return {
    url,
    publicId: image.publicId || image.public_id || "",
    alt: image.alt || "",
  };
}

export function getVariantProductImage(variant, product) {
  return (
    normalizeImage(variant?.images?.[0]) ||
    normalizeImage(variant?.image) ||
    normalizeImage(product?.images?.[0])
  );
}

export const COMBO_VARIANT_SIZE = "Combo";

const normalizeVariantKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isComboProduct = (product) => {
  const object = typeof product?.toObject === "function" ? product.toObject() : product;
  return object?.productType === "combo";
};

export function findVariantByIdentifier(product, identifier) {
  const key = normalizeVariantKey(identifier);
  const object = typeof product?.toObject === "function" ? product.toObject() : product;
  return (object?.variants || []).find((variant) => {
    const variantObject = typeof variant?.toObject === "function" ? variant.toObject() : variant;
    return (
      normalizeVariantKey(variantObject?._id) === key ||
      normalizeVariantKey(variantObject?.size) === key ||
      normalizeVariantKey(variantObject?.sku) === key
    );
  });
}

function getProductObject(product) {
  return typeof product?.toObject === "function" ? product.toObject() : product;
}

function getProductId(product) {
  const object = getProductObject(product);
  return String(object?._id || object?.id || "");
}

export function aggregateComboRequirements(comboItems = []) {
  const requirements = new Map();

  comboItems.forEach((item) => {
    const productId = String(item?.productId?._id || item?.productId || "").trim();
    const variantId = String(item?.variantId || item?.size || "").trim();
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    if (!productId || !variantId) return;

    const key = `${productId}:${normalizeVariantKey(variantId)}`;
    const current = requirements.get(key) || { productId, variantId, quantity: 0 };
    current.quantity += quantity;
    requirements.set(key, current);
  });

  return Array.from(requirements.values());
}

export function getComboAvailability(comboItems = [], productsById = new Map()) {
  const requirements = new Map();

  comboItems.forEach((item) => {
    const productId = String(item?.productId?._id || item?.productId || "").trim();
    const product = productsById.get(productId);
    const variant = findVariantByIdentifier(product, item?.variantId || item?.size);
    const variantId = variant?.size || item?.variantId || item?.size || "";
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    if (!productId || !variantId) return;

    const key = `${productId}:${normalizeVariantKey(variantId)}`;
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

  if (!requirements.size) {
    return 0;
  }

  return Array.from(requirements.values()).reduce((available, requirement) => {
    const possibleQuantity = Math.floor(requirement.stock / requirement.quantity);
    return Math.min(available, possibleQuantity);
  }, Number.POSITIVE_INFINITY);
}

export async function serializeProductWithCombos(product, options = {}) {
  const object = getProductObject(product);
  if (!isComboProduct(object)) {
    return serializeProduct(object, options);
  }

  const Product = (await import("@/models/Product")).default;
  const rawComboItems = object.comboItems || [];
  const referencedIds = Array.from(
    new Set(
      rawComboItems
        .map((item) => String(item?.productId?._id || item?.productId || "").trim())
        .filter(Boolean)
    )
  );

  const referencedProducts = referencedIds.length
    ? await Product.find({ _id: { $in: referencedIds } })
    : [];
  const productsById = new Map(referencedProducts.map((entry) => [getProductId(entry), entry]));
  const comboAvailability = getComboAvailability(rawComboItems, productsById);

  return serializeProduct(
    {
      ...object,
      comboAvailability,
      comboItems: rawComboItems.map((item) => {
        const productId = String(item?.productId?._id || item?.productId || "");
        const referencedProduct = productsById.get(productId);
        const variant = findVariantByIdentifier(referencedProduct, item.variantId);
        const referencedObject = getProductObject(referencedProduct);

        return {
          productId,
          variantId: item.variantId,
          size: variant?.size || item.variantId,
          quantity: Number(item.quantity) || 1,
          name: referencedObject?.name || "",
          slug: referencedObject?.slug || "",
          image: getVariantProductImage(variant, referencedObject),
          shortDescription: referencedObject?.shortDescription || "",
          fragranceProfile: referencedObject?.fragranceProfile || "",
        };
      }),
    },
    options
  );
}

export async function serializeProductsWithCombos(products, options = {}) {
  return Promise.all((products || []).map((product) => serializeProductWithCombos(product, options)));
}

export function serializeProduct(product, { includeCostPrice = false } = {}) {
  const object = typeof product.toObject === "function" ? product.toObject() : product;
  const productType = object.productType === "combo" ? "combo" : "product";
  const isCombo = productType === "combo";

  return {
    id: String(object._id),
    _id: String(object._id),
    productType,
    name: object.name,
    slug: object.slug,
    audienceTags: Array.isArray(object.audienceTags) && object.audienceTags.length
      ? object.audienceTags
      : [],
    shortDescription: object.shortDescription || "",
    description: object.description || "",
    featured: Boolean(object.featured),
    featuredOrder: Number(object.featuredOrder) || 0,
    images: (object.images || []).map((image) =>
      typeof image === "string" ? image : serializeImage(image)
    ).filter(Boolean),
    fragranceProfile: object.fragranceProfile || "",
    longevity: object.longevity || "",
    projection: object.projection || "",
    concentration: object.concentration || "",
    personality: object.personality || "",
    positioning: object.positioning || "",
    whatYouGet: object.whatYouGet || "",
    bestFor: object.bestFor || [],
    bestSeason: object.bestSeason || [],
    howToUse: object.howToUse || "",
    storagePrecautions: object.storagePrecautions || "",
    fragranceNotes: object.fragranceNotes || { top: [], heart: [], base: [] },
    variants: (object.variants || []).map((variant) => {
      const variantImages = (variant.images || [])
        .map((image) => (typeof image === "string" ? image : serializeImage(image)))
        .filter(Boolean);

      const publicVariant = {
        size: isCombo ? COMBO_VARIANT_SIZE : variant.size,
        sellingPrice: variant.sellingPrice,
        mrp: variant.mrp,
        stock: isCombo ? Number(object.comboAvailability) || 0 : variant.stock,
        sku: variant.sku,
        image: isCombo ? undefined : serializeImage(variant.image),
        images: isCombo ? [] : variantImages,
      };

      if (includeCostPrice) {
        publicVariant.costPrice = variant.costPrice;
      }

      return publicVariant;
    }),
    comboItems: (object.comboItems || []).map((item) => ({
      productId: String(item.productId?._id || item.productId || ""),
      variantId: item.variantId,
      size: item.size || item.variantId,
      quantity: Number(item.quantity) || 1,
      name: item.name || "",
      slug: item.slug || "",
      image: item.image || "",
      shortDescription: item.shortDescription || "",
      fragranceProfile: item.fragranceProfile || "",
    })),
    comboAvailability: isCombo ? Number(object.comboAvailability) || 0 : undefined,
    legalInformation: object.legalInformation || {},
    status: object.status,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
  };
}
