import { escapeHtml, sendEmail, textToEmailHtml } from "@/lib/email";
import { getStoreSettings, serializeAdminNotifications } from "@/lib/storeSettings";
import { isValidEmail } from "@/lib/validation";
import AdminNotification from "@/models/AdminNotification";
import MessageDelivery from "@/models/MessageDelivery";

const OWNER_EVENT_CONFIG = {
  new_customer: { setting: "newCustomer", route: "/users" },
  new_order: { setting: "newOrder", route: "/orders" },
  order_cancelled: { setting: "orderCancelled", route: "/orders" },
};

function clean(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(Number.isNaN(date.getTime()) ? new Date() : date);
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function getCustomerDisplayName(user) {
  const name = [user?.firstName, user?.lastName].map((part) => clean(part, 80)).filter(Boolean).join(" ");
  if (name) return name;
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  return clean(addresses.at(-1)?.fullName, 160) || "there";
}

export function getCustomerEmail(user) {
  const directEmail = clean(user?.email, 320).toLowerCase();
  if (directEmail && isValidEmail(directEmail)) return directEmail;
  const addresses = Array.isArray(user?.addresses) ? [...user.addresses].reverse() : [];
  const addressEmail = addresses
    .map((address) => clean(address?.email, 320).toLowerCase())
    .find((email) => email && isValidEmail(email));
  return addressEmail || "";
}

export function resolveCustomerMessage({ template, user, couponCode = "", siteUrl }) {
  let message = String(template || "").trim();
  const normalizedCouponCode = clean(couponCode, 30).toUpperCase();
  if (!normalizedCouponCode) {
    message = message
      .split(/\r?\n/)
      .filter((line) => !/{{\s*coupon_code\s*}}/i.test(line))
      .join("\n");
  }

  const values = {
    name: getCustomerDisplayName(user),
    coupon_code: normalizedCouponCode,
    site_url: clean(siteUrl, 500),
  };

  message = message.replace(/{{\s*(name|coupon_code|site_url)\s*}}/gi, (_, key) => {
    return values[String(key).toLowerCase()] || "";
  });
  message = message.replace(/\n{3,}/g, "\n\n").trim();

  if (/{{[^{}]+}}/.test(message)) {
    throw new Error("Message contains an unsupported or unresolved variable.");
  }
  if (!message) throw new Error("Message cannot be empty.");
  if (message.length > 10000) throw new Error("Resolved message is too long.");
  return message;
}

function getAdminLink(route) {
  const baseUrl = clean(process.env.ADMIN_BASE_URL, 500).replace(/\/$/, "");
  if (!baseUrl) return "";
  try {
    const parsed = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return `${baseUrl}${route}`;
  } catch {
    return "";
  }
}

function ownerMessageForUser(user) {
  const name = getCustomerDisplayName(user);
  const lines = [
    `Customer: ${name === "there" ? "Not provided" : name}`,
    `Verified phone: ${clean(user?.phone) || "Not provided"}`,
    `Email: ${getCustomerEmail(user) || "Not provided"}`,
    `Registered: ${formatDateTime(user?.createdAt)}`,
  ];
  return { subject: "New Customer Joined Bold Cave", lines };
}

function ownerMessageForOrder(kind, order) {
  const orderNumber = clean(order?.orderNumber) || clean(order?._id) || "Unknown";
  const customerName =
    [order?.customer?.firstName, order?.customer?.lastName].map((part) => clean(part, 80)).filter(Boolean).join(" ") ||
    clean(order?.deliveryAddress?.fullName, 160) ||
    "Not provided";
  const commonLines = [
    `Order: #${orderNumber}`,
    `Customer: ${customerName}`,
    `Phone: ${clean(order?.customer?.phone) || "Not provided"}`,
    `Email: ${clean(order?.customer?.email) || clean(order?.deliveryAddress?.email) || "Not provided"}`,
    `Amount: ${formatMoney(order?.amounts?.finalAmount)}`,
  ];

  if (kind === "order_cancelled") {
    return {
      subject: `Order Cancelled - #${orderNumber}`,
      lines: [
        ...commonLines,
        `Reason: ${clean(order?.cancellation?.reason) || "Not provided"}`,
        `Order status: ${clean(order?.orderStatus) || "cancelled"}`,
        `Payment status: ${clean(order?.payment?.paymentStatus) || "Not provided"}`,
        `Cancelled: ${formatDateTime(order?.cancellation?.cancelledAt)}`,
      ],
    };
  }

  return {
    subject: `New Order Received - #${orderNumber}`,
    lines: [
      ...commonLines,
      `Payment method: ${clean(order?.payment?.method) || "Not provided"}`,
      `Payment status: ${clean(order?.payment?.paymentStatus) || "Not provided"}`,
      `Order status: ${clean(order?.orderStatus) || "Not provided"}`,
      `Placed: ${formatDateTime(order?.createdAt)}`,
    ],
  };
}

function buildOwnerContent({ kind, user, order, route }) {
  const content = kind === "new_customer"
    ? ownerMessageForUser(user)
    : ownerMessageForOrder(kind, order);
  const adminLink = getAdminLink(route);
  const text = [...content.lines, ...(adminLink ? [`Admin: ${adminLink}`] : [])].join("\n");
  const html = `${textToEmailHtml(content.lines.join("\n"))}${
    adminLink
      ? `<div style="margin:0 auto;max-width:640px;padding:0 18px 24px;font-family:Arial,sans-serif"><a href="${escapeHtml(adminLink)}" style="display:inline-block;border-radius:6px;background:#111827;color:#fff;padding:10px 16px;text-decoration:none">Open Admin</a></div>`
      : ""
  }`;
  return { ...content, text, html };
}

export async function safeSendOwnerNotification({ kind, eventId, user = null, order = null }) {
  const config = OWNER_EVENT_CONFIG[kind];
  if (!config || !eventId) return { skipped: true, reason: "invalid_event" };

  const eventKey = `${kind}:${String(eventId)}`;
  const content = buildOwnerContent({ kind, user, order, route: config.route });
  let inAppStored = false;

  try {
    await AdminNotification.updateOne(
      { _id: eventKey },
      {
        $setOnInsert: {
          kind,
          title: content.subject,
          message: content.lines.join("\n"),
          href: config.route,
          userId: user?._id || order?.user || undefined,
          orderId: order?._id || undefined,
        },
      },
      { upsert: true }
    );
    inAppStored = true;
  } catch (error) {
    console.error("Admin notification could not be stored", {
      kind,
      eventId: String(eventId),
      code: clean(error?.code || error?.name || "UNKNOWN", 100),
    });
  }

  try {
    const settings = await getStoreSettings();
    const notifications = serializeAdminNotifications(settings?.adminNotifications);
    const recipient = notifications.email;
    if (!notifications[config.setting]) {
      return { inAppStored, skipped: true, reason: "email_disabled" };
    }
    if (!recipient || !isValidEmail(recipient)) {
      return { inAppStored, skipped: true, reason: "email_recipient_not_configured" };
    }

    let record;
    try {
      record = await MessageDelivery.create({
        _id: eventKey,
        audience: "owner",
        kind,
        eventKey,
        userId: user?._id || order?.user || undefined,
        orderId: order?._id || undefined,
        channel: "email",
        recipient,
        subject: content.subject,
        message: content.text,
        status: "failed",
        errorCode: "DELIVERY_PENDING",
        errorSummary: "Delivery has not completed.",
      });
    } catch (error) {
      if (error?.code === 11000) {
        return { inAppStored, skipped: true, reason: "email_already_attempted" };
      }
      throw error;
    }

    try {
      const result = await sendEmail({
        to: recipient,
        subject: content.subject,
        text: content.text,
        html: content.html,
        idempotencyKey: eventKey,
      });
      record.status = "sent";
      record.providerMessageId = result.messageId;
      record.errorCode = "";
      record.errorSummary = "";
      record.sentAt = new Date();
      await record.save();
      return { inAppStored, sent: true };
    } catch (error) {
      record.errorCode = clean(error?.code || "EMAIL_SEND_FAILED", 100);
      record.errorSummary = clean(error?.message || "Email delivery failed", 300);
      await record.save().catch(() => {});
      console.error("Owner notification email failed", {
        kind,
        eventId: String(eventId),
        code: record.errorCode,
      });
      return { inAppStored, sent: false, error: record.errorCode };
    }
  } catch (error) {
    console.error("Owner notification handling failed", {
      kind,
      eventId: String(eventId),
      code: clean(error?.code || error?.name || "UNKNOWN", 100),
    });
    return { inAppStored, sent: false, error: "NOTIFICATION_HANDLING_FAILED" };
  }
}
