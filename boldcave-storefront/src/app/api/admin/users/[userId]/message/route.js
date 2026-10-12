import connectDB from "@/lib/db";
import { applyAdminCors, adminPreflight } from "@/lib/api/cors";
import { failure, handleRouteError, noStoreHeaders, readJson, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { withRuntimeDatabase } from "@/lib/cloudflareMongoose";
import { isOwnedPromotionalImagePublicId, verifyPromotionalImage } from "@/lib/cloudinary/server";
import { isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { hasPreviousOrder } from "@/lib/orders/pricing";
import {
  getCustomerDisplayName,
  getCustomerEmail,
  resolveCustomerMessage,
} from "@/lib/notifications";
import {
  getStoreSettings,
  normalizeStorefrontUrl,
  serializeCustomerMessaging,
} from "@/lib/storeSettings";
import { cleanString, isObjectId } from "@/lib/validation";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import MessageDelivery from "@/models/MessageDelivery";
import User from "@/models/User";

export const runtime = "nodejs";

export function OPTIONS(request) {
  return adminPreflight(request);
}

export async function GET(request, context) {
  return withRuntimeDatabase(() => getMessageRoute(request, context));
}

export async function POST(request, context) {
  return withRuntimeDatabase(() => sendMessageRoute(request, context));
}

async function getMessageRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const { userId } = await params;
    if (!isObjectId(userId)) {
      return applyAdminCors(request, failure("INVALID_USER_ID", "Invalid user id", 400));
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return applyAdminCors(request, failure("USER_NOT_FOUND", "User not found", 404));

    const [settings, coupons, lastMessage] = await Promise.all([
      getStoreSettings(),
      getEligibleCouponsForUser(user._id),
      MessageDelivery.findOne({ userId: user._id, audience: "customer" })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return applyAdminCors(
      request,
      success(
        {
          user: serializeMessageUser(user),
          customerMessaging: serializeCustomerMessaging(settings?.customerMessaging),
          emailDeliveryConfigured: isEmailDeliveryConfigured(),
          coupons,
          lastMessage: serializeDelivery(lastMessage),
        },
        200,
        { headers: noStoreHeaders }
      )
    );
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "CUSTOMER_MESSAGE_LOAD_FAILED"));
  }
}

async function sendMessageRoute(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return applyAdminCors(request, auth.response);
    const { userId } = await params;
    if (!isObjectId(userId)) {
      return applyAdminCors(request, failure("INVALID_USER_ID", "Invalid user id", 400));
    }

    const body = await readJson(request);
    const template = cleanString(body.message, 5001);
    const couponId = cleanString(body.couponId, 100);
    const requestedImagePublicId = cleanString(body.promotionalImage?.publicId, 301);
    if (!template) {
      return applyAdminCors(request, failure("MESSAGE_REQUIRED", "Message is required.", 400));
    }
    if (template.length > 5000) {
      return applyAdminCors(request, failure("MESSAGE_TOO_LONG", "Message is too long.", 400));
    }
    if (couponId && !isObjectId(couponId)) {
      return applyAdminCors(request, failure("INVALID_COUPON_ID", "Invalid coupon selection.", 400));
    }

    await connectDB();
    const [user, settings, eligibleCoupons] = await Promise.all([
      User.findById(userId),
      getStoreSettings(),
      getEligibleCouponsForUser(userId),
    ]);
    if (!user) return applyAdminCors(request, failure("USER_NOT_FOUND", "User not found", 404));

    const recipient = getCustomerEmail(user);
    if (!recipient) {
      return applyAdminCors(
        request,
        failure("CUSTOMER_EMAIL_MISSING", "This customer does not have an email address.", 422)
      );
    }

    const selectedCoupon = couponId
      ? eligibleCoupons.find((coupon) => coupon.id === couponId)
      : null;
    if (couponId && !selectedCoupon) {
      return applyAdminCors(
        request,
        failure("COUPON_NOT_ELIGIBLE", "This coupon is no longer available for this customer.", 409)
      );
    }

    const messaging = serializeCustomerMessaging(settings?.customerMessaging);
    const siteUrl = messaging.siteUrl;
    if (!normalizeStorefrontUrl(siteUrl)) {
      return applyAdminCors(
        request,
        failure("STOREFRONT_URL_REQUIRED", "Configure a valid storefront URL before sending.", 409)
      );
    }

    let resolvedMessage;
    try {
      resolvedMessage = resolveCustomerMessage({
        template,
        user,
        couponCode: selectedCoupon?.code || "",
        siteUrl,
      });
    } catch (error) {
      return applyAdminCors(
        request,
        failure("MESSAGE_VARIABLE_ERROR", error.message || "Message variables are invalid.", 400)
      );
    }

    let promotionalImage = null;
    if (requestedImagePublicId) {
      if (!isOwnedPromotionalImagePublicId(requestedImagePublicId)) {
        return applyAdminCors(
          request,
          failure("PROMOTIONAL_IMAGE_INVALID", "Select a valid promotional image.", 400)
        );
      }
      if (requestedImagePublicId === messaging.promotionalImage?.publicId) {
        promotionalImage = messaging.promotionalImage;
      } else {
        try {
          promotionalImage = await verifyPromotionalImage(requestedImagePublicId);
        } catch {
          return applyAdminCors(
            request,
            failure("PROMOTIONAL_IMAGE_INVALID", "The promotional image could not be verified.", 400)
          );
        }
      }
    }

    const subject = selectedCoupon
      ? `${selectedCoupon.code} - a special offer from Bold Cave`
      : "A message from Bold Cave";
    const delivery = await MessageDelivery.create({
      audience: "customer",
      kind: "customer_message",
      userId: user._id,
      channel: "email",
      recipient,
      subject,
      message: resolvedMessage,
      couponCode: selectedCoupon?.code || undefined,
      promotionalImageUrl: promotionalImage?.url || undefined,
      promotionalImagePublicId: promotionalImage?.publicId || undefined,
      status: "failed",
      errorCode: "DELIVERY_PENDING",
      errorSummary: "Delivery has not completed.",
    });

    try {
      const result = await sendEmail({
        to: recipient,
        subject,
        text: resolvedMessage,
        idempotencyKey: `customer-message:${delivery._id}`,
      });
      delivery.status = "sent";
      delivery.providerMessageId = result.messageId;
      delivery.errorCode = "";
      delivery.errorSummary = "";
      delivery.sentAt = new Date();
      await delivery.save();
      return applyAdminCors(request, success({ delivery: serializeDelivery(delivery) }, 201));
    } catch (error) {
      delivery.errorCode = cleanString(error?.code || "EMAIL_SEND_FAILED", 100);
      delivery.errorSummary = cleanString(error?.message || "Email delivery failed.", 300);
      await delivery.save().catch(() => {});
      return applyAdminCors(
        request,
        failure(
          "CUSTOMER_EMAIL_SEND_FAILED",
          "Email could not be sent. You can retry.",
          502,
          { delivery: serializeDelivery(delivery) }
        )
      );
    }
  } catch (error) {
    return applyAdminCors(request, handleRouteError(error, "CUSTOMER_MESSAGE_SEND_FAILED"));
  }
}

async function getEligibleCouponsForUser(userId) {
  const now = new Date();
  const coupons = await Coupon.find({
    active: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] },
      {
        $or: [
          { eligibleUserIds: { $exists: false } },
          { eligibleUserIds: { $size: 0 } },
          { eligibleUserIds: userId },
        ],
      },
      {
        $expr: {
          $or: [
            { $eq: [{ $ifNull: ["$usageLimit", null] }, null] },
            { $lt: [{ $ifNull: ["$usedCount", 0] }, "$usageLimit"] },
          ],
        },
      },
    ],
  }).sort({ code: 1 });

  if (!coupons.length) return [];
  const [hasOrdered, usageRows] = await Promise.all([
    hasPreviousOrder(userId),
    CouponUsage.aggregate([
      { $match: { userId, couponId: { $in: coupons.map((coupon) => coupon._id) } } },
      { $group: { _id: "$couponId", count: { $sum: 1 } } },
    ]),
  ]);
  const usageCounts = new Map(
    usageRows.map((row) => [String(row._id), Number(row.count) || 0])
  );

  return coupons
    .filter((coupon) => !coupon.firstOrderOnly || !hasOrdered)
    .filter((coupon) => {
      const limit = Number(coupon.perCustomerLimit);
      return !Number.isFinite(limit) || limit <= 0 || (usageCounts.get(String(coupon._id)) || 0) < limit;
    })
    .map((coupon) => ({
      id: String(coupon._id),
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumOrder: coupon.minimumOrder,
      expiryDate: coupon.expiryDate,
    }));
}

function serializeMessageUser(user) {
  return {
    id: String(user._id),
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    name: getCustomerDisplayName(user),
    phone: user.phone || "",
    email: getCustomerEmail(user),
  };
}

function serializeDelivery(delivery) {
  if (!delivery) return null;
  return {
    id: String(delivery._id),
    channel: delivery.channel,
    recipient: delivery.recipient,
    status: delivery.status,
    couponCode: delivery.couponCode || "",
    promotionalImageUrl: delivery.promotionalImageUrl || "",
    sentAt: delivery.sentAt || null,
    createdAt: delivery.createdAt || null,
    errorSummary: delivery.status === "failed" ? delivery.errorSummary || "Email delivery failed." : "",
  };
}

