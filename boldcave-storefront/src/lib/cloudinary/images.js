const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/";

function normalizeCloudinaryImage(image) {
  if (!image) return { url: "", publicId: "" };
  if (typeof image === "string") return { url: image, publicId: "" };

  return {
    url: image.url || image.secure_url || "",
    publicId: image.publicId || image.public_id || "",
  };
}

function getCloudNameFromUrl(url) {
  const match = String(url || "").match(
    /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\//
  );
  return match?.[1] || "";
}

function getPublicIdFromCloudinaryUrl(url) {
  const source = String(url || "");
  const uploadIndex = source.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
  if (uploadIndex === -1) return "";

  const path = source
    .slice(uploadIndex + CLOUDINARY_UPLOAD_SEGMENT.length)
    .split("?")[0];
  const parts = path.split("/").filter(Boolean);

  if (parts[0]?.includes(",") || /^[a-z]_[^/]+/.test(parts[0] || "")) {
    parts.shift();
  }

  if (/^v\d+$/.test(parts[0] || "")) {
    parts.shift();
  }

  return parts.join("/").replace(/\.[a-z0-9]+$/i, "");
}

function getUrlVersionSegment(url) {
  const match = String(url || "").match(/\/image\/upload\/(?:[^/]+\/)?(v\d+)\//);
  return match?.[1] || "";
}

export function getCloudinaryImageUrl(image, options = {}) {
  const { url, publicId } = normalizeCloudinaryImage(image);
  const cloudName =
    getCloudNameFromUrl(url) || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const safePublicId = publicId || getPublicIdFromCloudinaryUrl(url);

  if (!cloudName || !safePublicId) {
    return url;
  }

  const width = Math.max(1, Math.round(Number(options.width) || 0));
  const quality = options.quality || "q_auto:best";
  const transforms = [
    "f_auto",
    quality,
    width ? `w_${width}` : "",
    options.dpr === "auto" ? "dpr_auto" : "",
  ].filter(Boolean);
  const version = getUrlVersionSegment(url);
  const encodedPublicId = safePublicId
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return [
    `https://res.cloudinary.com/${cloudName}/image/upload`,
    transforms.join(","),
    version,
    encodedPublicId,
  ]
    .filter(Boolean)
    .join("/");
}

export function getCloudinarySrcSet(image, widths = []) {
  return widths
    .map((width) => {
      const url = getCloudinaryImageUrl(image, { width });
      return url ? `${url} ${width}w` : "";
    })
    .filter(Boolean)
    .join(", ");
}
