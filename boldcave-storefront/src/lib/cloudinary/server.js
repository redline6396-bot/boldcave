import { v2 as cloudinary } from "cloudinary";

export const PROMOTIONAL_IMAGE_FOLDER = "boldcave/promotional-messages";
export const MAX_PROMOTIONAL_IMAGE_BYTES = 5 * 1024 * 1024;

const PROMOTIONAL_IMAGE_PUBLIC_ID_PATTERN =
  /^boldcave\/promotional-messages\/promo_[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const ALLOWED_PROMOTIONAL_FORMATS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_PROMOTIONAL_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

let configured = false;

export function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    configured = true;
  }

  return cloudinary;
}

export function createUploadSignature(params = {}) {
  const cloudinaryClient = getCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = params.folder || "products";

  const signatureParams = {
    timestamp,
    folder,
  };

  const signature = cloudinaryClient.utils.api_sign_request(
    signatureParams,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  };
}

export function isOwnedPromotionalImagePublicId(publicId) {
  return PROMOTIONAL_IMAGE_PUBLIC_ID_PATTERN.test(String(publicId || "").trim());
}

export function validatePromotionalImageBuffer(buffer, declaredMimeType) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  const mimeType = String(declaredMimeType || "").trim().toLowerCase();

  if (!ALLOWED_PROMOTIONAL_MIME_TYPES.has(mimeType)) {
    throw new Error("PROMOTIONAL_IMAGE_TYPE_INVALID");
  }
  if (!bytes.length) throw new Error("PROMOTIONAL_IMAGE_EMPTY");
  if (bytes.length > MAX_PROMOTIONAL_IMAGE_BYTES) {
    throw new Error("PROMOTIONAL_IMAGE_TOO_LARGE");
  }

  const detectedFormat = detectImageFormat(bytes);
  const declaredFormat = ALLOWED_PROMOTIONAL_MIME_TYPES.get(mimeType);
  const matches =
    detectedFormat === declaredFormat ||
    (detectedFormat === "jpeg" && declaredFormat === "jpg");

  if (!matches) throw new Error("PROMOTIONAL_IMAGE_CONTENT_INVALID");
  return { bytes, format: detectedFormat === "jpeg" ? "jpg" : detectedFormat };
}

export async function uploadPromotionalImage(buffer, declaredMimeType) {
  const validated = validatePromotionalImageBuffer(buffer, declaredMimeType);
  const cloudinaryClient = getCloudinary();
  const publicId = `promo_${globalThis.crypto.randomUUID()}`;
  const dataUri = `data:${declaredMimeType};base64,${validated.bytes.toString("base64")}`;

  const uploaded = await cloudinaryClient.uploader.upload(dataUri, {
    resource_type: "image",
    type: "upload",
    folder: PROMOTIONAL_IMAGE_FOLDER,
    public_id: publicId,
    overwrite: false,
    unique_filename: false,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  });

  if (
    !isOwnedPromotionalImagePublicId(uploaded.public_id) ||
    uploaded.resource_type !== "image" ||
    !ALLOWED_PROMOTIONAL_FORMATS.has(String(uploaded.format || "").toLowerCase()) ||
    Number(uploaded.bytes || 0) > MAX_PROMOTIONAL_IMAGE_BYTES
  ) {
    if (isOwnedPromotionalImagePublicId(uploaded.public_id)) {
      await cloudinaryClient.uploader.destroy(uploaded.public_id, {
        resource_type: "image",
        type: "upload",
        invalidate: true,
      }).catch(() => {});
    }
    throw new Error("PROMOTIONAL_IMAGE_UPLOAD_INVALID");
  }

  return serializePromotionalImageAsset(uploaded);
}

export async function verifyPromotionalImage(publicId) {
  if (!isOwnedPromotionalImagePublicId(publicId)) {
    throw new Error("PROMOTIONAL_IMAGE_NOT_OWNED");
  }

  const asset = await getCloudinary().api.resource(publicId, {
    resource_type: "image",
    type: "upload",
  });

  if (
    asset.resource_type !== "image" ||
    !ALLOWED_PROMOTIONAL_FORMATS.has(String(asset.format || "").toLowerCase()) ||
    Number(asset.bytes || 0) > MAX_PROMOTIONAL_IMAGE_BYTES
  ) {
    throw new Error("PROMOTIONAL_IMAGE_UPLOAD_INVALID");
  }

  return serializePromotionalImageAsset(asset);
}

export async function destroyPromotionalImage(publicId) {
  if (!isOwnedPromotionalImagePublicId(publicId)) {
    throw new Error("PROMOTIONAL_IMAGE_NOT_OWNED");
  }

  return getCloudinary().uploader.destroy(publicId, {
    resource_type: "image",
    type: "upload",
    invalidate: true,
  });
}

function serializePromotionalImageAsset(asset) {
  return {
    url: String(asset.secure_url || ""),
    publicId: String(asset.public_id || ""),
    width: Number(asset.width || 0),
    height: Number(asset.height || 0),
    format: String(asset.format || "").toLowerCase(),
    bytes: Number(asset.bytes || 0),
  };
}

function detectImageFormat(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return "";
}
