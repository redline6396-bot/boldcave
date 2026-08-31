import { revalidatePath } from "next/cache";

const PUBLIC_PRODUCT_LIST_PATHS = ["/", "/collection"];

function getProductPath(slug) {
  const cleanSlug = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
  return cleanSlug ? `/product/${cleanSlug}` : "";
}

export function revalidatePublicProductListPaths() {
  PUBLIC_PRODUCT_LIST_PATHS.forEach((path) => revalidatePath(path));
}

export function revalidateProductPaths(slugs = []) {
  const paths = new Set(PUBLIC_PRODUCT_LIST_PATHS);

  slugs.map(getProductPath).filter(Boolean).forEach((path) => paths.add(path));

  paths.forEach((path) => revalidatePath(path));
}
