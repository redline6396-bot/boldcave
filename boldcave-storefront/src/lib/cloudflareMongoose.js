import mongoose from "mongoose";

import connectDB from "@/lib/db";
import {
  getRuntimeDatabaseContext,
  runWithRuntimeDatabaseContext,
} from "@/lib/runtimeDatabaseContext";

const CLOUDFLARE_MONGOOSE_OPTIONS = {
  bufferCommands: false,

  // Request-scoped Cloudflare connections should not
  // perform automatic index/collection setup.
  autoIndex: false,
  autoCreate: false,

  serverMonitoringMode: "poll",

  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,

  minPoolSize: 0,
  maxPoolSize: 2,
  maxConnecting: 1,
  waitQueueTimeoutMS: 5000,
};

async function getConnectionModels(connection) {
  const [
    { CouponSchema },
    { CouponUsageSchema },
    { HomepageSettingsSchema },
    { OrderSchema },
    { OtpRateLimitSchema },
    { OtpVerificationSchema },
    { ProductSchema },
    { RazorpayAttemptSchema },
    { ReviewSchema },
    { ShiprocketAuthCacheSchema },
    { StoreSettingsSchema },
    { UserSchema },
  ] = await Promise.all([
    import("@/models/Coupon"),
    import("@/models/CouponUsage"),
    import("@/models/HomepageSettings"),
    import("@/models/Order"),
    import("@/models/OtpRateLimit"),
    import("@/models/OtpVerification"),
    import("@/models/Product"),
    import("@/models/RazorpayAttempt"),
    import("@/models/Review"),
    import("@/models/ShiprocketAuthCache"),
    import("@/models/StoreSettings"),
    import("@/models/User"),
  ]);

  const modelDefinitions = {
    Coupon: CouponSchema,
    CouponUsage: CouponUsageSchema,
    HomepageSettings: HomepageSettingsSchema,
    Order: OrderSchema,
    OtpRateLimit: OtpRateLimitSchema,
    OtpVerification: OtpVerificationSchema,
    Product: ProductSchema,
    RazorpayAttempt: RazorpayAttemptSchema,
    Review: ReviewSchema,
    ShiprocketAuthCache: ShiprocketAuthCacheSchema,
    StoreSettings: StoreSettingsSchema,
    User: UserSchema,
  };

  return Object.fromEntries(
    Object.entries(modelDefinitions).map(
      ([name, schema]) => [
        name,
        connection.models[name] ||
          connection.model(name, schema),
      ],
    ),
  );
}

export function isCloudflareDbRuntime() {
  return process.env.DB_RUNTIME === "cloudflare";
}

export async function withRuntimeDatabase(operation) {
  const currentContext =
    getRuntimeDatabaseContext();

  // Nested DB work inside the same request should reuse
  // the existing request-scoped connection.
  if (
    currentContext?.connection &&
    currentContext?.models
  ) {
    return operation({
      ...currentContext,
      ...currentContext.models,
    });
  }

  // Preserve existing fast Vercel / Node behavior.
  if (!isCloudflareDbRuntime()) {
    const connection = await connectDB();

    return operation({
      connection,
      runtime: "node",
    });
  }

  return withCloudflareRuntimeDatabase(operation);
}

async function withCloudflareRuntimeDatabase(
  operation,
) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured",
    );
  }

  const connection =
    mongoose.createConnection(
      uri,
      CLOUDFLARE_MONGOOSE_OPTIONS,
    );

  try {
    await connection.asPromise();

    const models =
      await getConnectionModels(connection);

    return await runWithRuntimeDatabaseContext(
      {
        connection,
        models,
        runtime: "cloudflare",
      },
      () =>
        operation({
          connection,
          models,
          runtime: "cloudflare",
          ...models,
        }),
    );
  } finally {
    // destroy() also removes this request-scoped
    // connection from Mongoose's connection list.
    // Fallback is only for older Mongoose versions.
    if (
      typeof connection.destroy === "function"
    ) {
      await connection
        .destroy()
        .catch(() => {});
    } else {
      await connection
        .close()
        .catch(() => {});
    }
  }
}