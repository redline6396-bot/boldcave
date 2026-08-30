import mongoose from "mongoose";

import { createRuntimeModel } from "@/lib/runtimeModel";

const shiprocketAuthCacheSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, unique: true },
    accessToken: { type: String },
    tokenExpiresAt: { type: Date },
    refreshLockUntil: { type: Date },
    refreshLockOwner: { type: String },
    credentialFingerprint: { type: String },
    authCooldownUntil: { type: Date },
    lastAuthFailureStatus: { type: Number },
    lastAuthFailureAt: { type: Date },
    lastAuthFailureMessage: { type: String, trim: true },
  },
  { timestamps: true }
);

const REQUIRED_SHIPROCKET_AUTH_CACHE_PATHS = [
  "provider",
  "accessToken",
  "tokenExpiresAt",
  "refreshLockUntil",
  "refreshLockOwner",
  "credentialFingerprint",
  "authCooldownUntil",
  "lastAuthFailureStatus",
  "lastAuthFailureAt",
  "lastAuthFailureMessage",
];

if (
  mongoose.models.ShiprocketAuthCache &&
  REQUIRED_SHIPROCKET_AUTH_CACHE_PATHS.some(
    (path) => !mongoose.models.ShiprocketAuthCache.schema?.path(path)
  )
) {
  delete mongoose.models.ShiprocketAuthCache;
}

export const ShiprocketAuthCacheSchema = shiprocketAuthCacheSchema;

const ShiprocketAuthCacheModel =
  mongoose.models.ShiprocketAuthCache ||
  mongoose.model("ShiprocketAuthCache", shiprocketAuthCacheSchema);

export default createRuntimeModel("ShiprocketAuthCache", ShiprocketAuthCacheModel);
