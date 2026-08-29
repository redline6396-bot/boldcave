export function serializeAdminReview(review) {
  const source = typeof review?.toObject === "function" ? review.toObject() : review;
  const product = source?.product;
  const user = source?.user;

  return {
    id: String(source?._id || source?.id || ""),
    rating: Number(source?.rating) || 0,
    title: source?.title || "",
    text: source?.text || "",
    photos: Array.isArray(source?.photos) ? source.photos : [],
    approved: Boolean(source?.approved),
    verifiedPurchase: Boolean(source?.verifiedPurchase),
    product:
      product && typeof product === "object"
        ? {
            id: String(product._id || product.id || ""),
            name: product.name || "Deleted product",
            slug: product.slug || "",
            deleted: false,
          }
        : {
            id: "",
            name: "Deleted product",
            slug: "",
            deleted: true,
          },
    user:
      user && typeof user === "object"
        ? {
            id: String(user._id || user.id || ""),
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            email: user.email || "",
            deleted: false,
          }
        : {
            id: "",
            firstName: "Customer",
            lastName: "",
            phone: "",
            email: "",
            deleted: true,
          },
    createdAt: source?.createdAt || null,
    updatedAt: source?.updatedAt || null,
  };
}
