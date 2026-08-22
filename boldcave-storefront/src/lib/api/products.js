export function normalizeImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.url || image.secure_url || "";
}

export function serializeProduct(product, { includeCostPrice = false } = {}) {
  const object = typeof product.toObject === "function" ? product.toObject() : product;

  return {
    id: String(object._id),
    _id: String(object._id),
    name: object.name,
    slug: object.slug,
    audienceTags: Array.isArray(object.audienceTags) && object.audienceTags.length
      ? object.audienceTags
      : [],
    shortDescription: object.shortDescription || "",
    description: object.description || "",
    images: (object.images || []).map((image) =>
      typeof image === "string"
        ? image
        : {
            url: image.url,
            publicId: image.publicId,
            alt: image.alt,
          }
    ),
    fragranceProfile: object.fragranceProfile || "",
    longevity: object.longevity || "",
    projection: object.projection || "",
    concentration: object.concentration || "",
    personality: object.personality || "",
    positioning: object.positioning || "",
    bestFor: object.bestFor || [],
    bestSeason: object.bestSeason || [],
    howToUse: object.howToUse || "",
    storagePrecautions: object.storagePrecautions || "",
    fragranceNotes: object.fragranceNotes || { top: [], heart: [], base: [] },
    variants: (object.variants || []).map((variant) => {
      const publicVariant = {
        size: variant.size,
        sellingPrice: variant.sellingPrice,
        mrp: variant.mrp,
        stock: variant.stock,
        sku: variant.sku,
      };

      if (includeCostPrice) {
        publicVariant.costPrice = variant.costPrice;
      }

      return publicVariant;
    }),
    legalInformation: object.legalInformation || {},
    status: object.status,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
  };
}
