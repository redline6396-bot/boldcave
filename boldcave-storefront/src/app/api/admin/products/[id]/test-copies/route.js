import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, success } from "@/lib/api/response";
import { serializeProductWithCombos } from "@/lib/api/products";
import { requireAdmin } from "@/lib/auth/session";
import { clearProductCache } from "@/lib/productCache";
import { cleanString, isObjectId, slugify } from "@/lib/validation";
import Product from "@/models/Product";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

const copyProductFields = (source, copyNumber) => {
  const sourceObject =
    typeof source.toObject === "function" ? source.toObject() : source;
  const baseSlug = slugify(sourceObject.slug || sourceObject.name);
  const name = `${sourceObject.name} TEST ${copyNumber}`;
  const slug = `${baseSlug}-test-${copyNumber}`;

  return {
    productType: "product",
    name,
    slug,
    audienceTags: [...(sourceObject.audienceTags || [])],
    shortDescription: sourceObject.shortDescription || "",
    description: sourceObject.description || "",
    images: (sourceObject.images || []).map((image) => ({
      url: image.url,
      publicId: image.publicId || "",
      alt: image.alt || "",
    })),
    fragranceProfile: sourceObject.fragranceProfile || "",
    longevity: sourceObject.longevity || "",
    projection: sourceObject.projection || "",
    concentration: sourceObject.concentration || "",
    personality: sourceObject.personality || "",
    positioning: sourceObject.positioning || "",
    bestFor: [...(sourceObject.bestFor || [])],
    bestSeason: [...(sourceObject.bestSeason || [])],
    howToUse: sourceObject.howToUse || "",
    storagePrecautions: sourceObject.storagePrecautions || "",
    fragranceNotes: {
      top: [...(sourceObject.fragranceNotes?.top || [])],
      heart: [...(sourceObject.fragranceNotes?.heart || [])],
      base: [...(sourceObject.fragranceNotes?.base || [])],
    },
    variants: (sourceObject.variants || []).map((variant, index) => {
      const sourceSku = cleanString(variant.sku, 50);
      const sizeSlug = slugify(variant.size) || `variant-${index + 1}`;
      const variantKey = `${cleanString(sizeSlug, 24)}-${index + 1}`.toUpperCase();

      return {
        size: variant.size,
        sellingPrice: variant.sellingPrice,
        mrp: variant.mrp,
        costPrice: variant.costPrice,
        stock: variant.stock,
        sku: cleanString(
          sourceSku
            ? `${sourceSku}-TEST-${copyNumber}-${variantKey}`
            : `${slug}-${sizeSlug}`.toUpperCase(),
          100
        ),
        image: variant.image
          ? {
              url: variant.image.url,
              publicId: variant.image.publicId || "",
              alt: variant.image.alt || "",
            }
          : undefined,
      };
    }),
    legalInformation: {
      ingredients: sourceObject.legalInformation?.ingredients || "",
      caution: sourceObject.legalInformation?.caution || "",
    },
    status: sourceObject.status,
  };
};

export async function POST(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { id } = await params;
    if (!isObjectId(id)) {
      return applyAdminCors(
        request,
        failure("INVALID_PRODUCT_ID", "Invalid product id", 400)
      );
    }

    await connectDB();
    const source = await Product.findById(id);
    if (!source) {
      return applyAdminCors(
        request,
        failure("PRODUCT_NOT_FOUND", "Product not found", 404)
      );
    }
    if (source.productType === "combo") {
      return applyAdminCors(
        request,
        failure("UNSUPPORTED_PRODUCT_TYPE", "Test copies are only available for normal products", 400)
      );
    }

    const baseSlug = slugify(source.slug || source.name);
    const targetSlugs = [1, 2, 3].map((number) => `${baseSlug}-test-${number}`);
    const existingCopies = await Product.find({
      slug: { $in: targetSlugs },
    }).select("slug");
    const existingSlugs = new Set(existingCopies.map((product) => product.slug));
    const missingCopyNumbers = [1, 2, 3].filter(
      (number) => !existingSlugs.has(`${baseSlug}-test-${number}`)
    );

    if (!missingCopyNumbers.length) {
      return applyAdminCors(
        request,
        failure(
          "TEST_COPIES_EXIST",
          "Test copies already exist for this product.",
          409
        )
      );
    }

    const copies = await Product.insertMany(
      missingCopyNumbers.map((copyNumber) =>
        copyProductFields(source, copyNumber)
      ),
      { ordered: true }
    );
    clearProductCache();

    return applyAdminCors(
      request,
      success(
        {
          created: copies.length,
          products: await Promise.all(
            copies.map((product) =>
              serializeProductWithCombos(product, { includeCostPrice: true })
            )
          ),
        },
        201
      )
    );
  } catch (error) {
    return applyAdminCors(
      request,
      handleRouteError(error, "TEST_PRODUCT_COPY_FAILED")
    );
  }
}
