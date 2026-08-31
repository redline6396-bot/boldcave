import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { serializeProductWithCombos } from "@/lib/api/products";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { revalidateProductPaths } from "@/lib/cache/revalidate";
import { clearProductCache } from "@/lib/productCache";
import { isObjectId } from "@/lib/validation";
import Product from "@/models/Product";
import Review from "@/models/Review";
import { buildProductPayload } from "../route";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request, context) {
  return withRuntimeDatabase(() => getAdminProductRoute(request, context));
}

async function getAdminProductRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { id } = await params;
    if (!isObjectId(id)) return applyAdminCors(request, failure("INVALID_PRODUCT_ID", "Invalid product id", 400));

    await connectDB();
    const product = await Product.findById(id);
    if (!product) return applyAdminCors(request, failure("PRODUCT_NOT_FOUND", "Product not found", 404));

    return applyAdminCors(request, success({ product: await serializeProductWithCombos(product, { includeCostPrice: true }) }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PUT(request, context) {
  return withRuntimeDatabase(() => updateAdminProductRoute(request, context));
}

async function updateAdminProductRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { id } = await params;
    if (!isObjectId(id)) return applyAdminCors(request, failure("INVALID_PRODUCT_ID", "Invalid product id", 400));

    await connectDB();
    const existingProduct = await Product.findById(id);
    if (!existingProduct) return applyAdminCors(request, failure("PRODUCT_NOT_FOUND", "Product not found", 404));

    const body = await readJson(request);
    const result = await buildProductPayload(body, id, existingProduct);
    if (result.error) return applyAdminCors(request, failure("VALIDATION_ERROR", result.error, 400));

    const product = await Product.findByIdAndUpdate(id, result.payload, {
      returnDocument: "after",
      runValidators: true,
    });

    clearProductCache();
    revalidateProductPaths([existingProduct.slug, product.slug]);
    return applyAdminCors(request, success({ product: await serializeProductWithCombos(product, { includeCostPrice: true }) }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "PRODUCT_UPDATE_FAILED"));
  }
}

export async function PATCH(request, context) {
  return withRuntimeDatabase(() => updateAdminProductRoute(request, context));
}

export async function DELETE(request, context) {
  return withRuntimeDatabase(() => deleteAdminProductRoute(request, context));
}

async function deleteAdminProductRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { id } = await params;
    if (!isObjectId(id)) return applyAdminCors(request, failure("INVALID_PRODUCT_ID", "Invalid product id", 400));

    await connectDB();
    const product = await Product.findByIdAndDelete(id);
    if (!product) return applyAdminCors(request, failure("PRODUCT_NOT_FOUND", "Product not found", 404));

    await Review.deleteMany({ product: product._id });

    clearProductCache();
    revalidateProductPaths([product.slug]);
    return applyAdminCors(request, success({ deleted: true }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "PRODUCT_DELETE_FAILED"));
  }
}
