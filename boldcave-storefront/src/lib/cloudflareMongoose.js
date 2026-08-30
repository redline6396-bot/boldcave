import mongoose from "mongoose";
import { isObjectId } from "@/lib/validation";

const CLOUDFLARE_MONGOOSE_OPTIONS = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
};

export function isCloudflareDbRuntime() {
  return process.env.DB_RUNTIME === "cloudflare";
}

async function getConnectionModels(connection) {
  const [{ ProductSchema }, { ReviewSchema }, { UserSchema }] = await Promise.all([
    import("@/models/Product"),
    import("@/models/Review"),
    import("@/models/User"),
  ]);

  const Product =
    connection.models.Product || connection.model("Product", ProductSchema);
  const User = connection.models.User || connection.model("User", UserSchema);
  const Review =
    connection.models.Review || connection.model("Review", ReviewSchema);

  return { Product, Review, User };
}

export async function withCloudflareMongooseModels(operation) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const connection = mongoose.createConnection(uri, CLOUDFLARE_MONGOOSE_OPTIONS);

  try {
    await connection.asPromise();
    const models = await getConnectionModels(connection);
    return await operation({ connection, ...models });
  } finally {
    await connection.close().catch(() => {});
  }
}

export async function getReviewStatsForModel(ReviewModel, productId) {
  const productObjectId =
    typeof productId === "string" && isObjectId(productId)
      ? new mongoose.Types.ObjectId(productId)
      : productId;

  const rows = await ReviewModel.aggregate([
    {
      $match: {
        product: productObjectId,
        approved: true,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let weighted = 0;

  rows.forEach((row) => {
    breakdown[row._id] = row.count;
    total += row.count;
    weighted += row._id * row.count;
  });

  return {
    average: total ? Number((weighted / total).toFixed(1)) : 0,
    count: total,
    breakdown,
  };
}
