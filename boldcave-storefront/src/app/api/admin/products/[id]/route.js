import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { serializeProduct } from "@/lib/api/products";
import { clearProductCache } from "@/lib/productCache";
import { isObjectId } from "@/lib/validation";
import Product from "@/models/Product";
import { buildProductPayload } from "../route";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { id } = await params;
    if (!isObjectId(id)) return applyAdminCors(request, failure("INVALID_PRODUCT_ID", "Invalid product id", 400));

    await connectDB();
    const product = await Product.findById(id);
    if (!product) return applyAdminCors(request, failure("PRODUCT_NOT_FOUND", "Product not found", 404));

    return applyAdminCors(request, success({ product: serializeProduct(product, { includeCostPrice: true }) }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error));
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { id } = await params;
    if (!isObjectId(id)) return applyAdminCors(request, failure("INVALID_PRODUCT_ID", "Invalid product id", 400));

    const body = await readJson(request);
    const result = buildProductPayload(body);
    if (result.error) return applyAdminCors(request, failure("VALIDATION_ERROR", result.error, 400));

    await connectDB();
    const product = await Product.findByIdAndUpdate(id, result.payload, {
      new: true,
      runValidators: true,
    });
    if (!product) return applyAdminCors(request, failure("PRODUCT_NOT_FOUND", "Product not found", 404));

    clearProductCache();
    return applyAdminCors(request, success({ product: serializeProduct(product, { includeCostPrice: true }) }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "PRODUCT_UPDATE_FAILED"));
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);

    const { id } = await params;
    if (!isObjectId(id)) return applyAdminCors(request, failure("INVALID_PRODUCT_ID", "Invalid product id", 400));

    await connectDB();
    const product = await Product.findByIdAndDelete(id);
    if (!product) return applyAdminCors(request, failure("PRODUCT_NOT_FOUND", "Product not found", 404));

    clearProductCache();
    return applyAdminCors(request, success({ deleted: true }));
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "PRODUCT_DELETE_FAILED"));
  }
}
