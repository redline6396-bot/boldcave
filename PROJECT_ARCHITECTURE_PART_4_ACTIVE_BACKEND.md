# REDLINE Project Architecture — Part 4: Active Backend

This document is a comprehensive, READ-ONLY audit of the active backend API layer inside redlinenext. It documents every route, model, helper, and external integration as they exist in the source code. This is the current production-grade API that powers both the customer storefront and the admin operations.

**Important**: All environment variables are documented by name only; no values are disclosed.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Complete API Route Tree](#2-complete-api-route-tree)
3. [Mongoose Models](#3-mongoose-models)
4. [Database Connection](#4-database-connection)
5. [Authentication & Session System](#5-authentication--session-system)
6. [OTP Provider](#6-otp-provider)
7. [Product API and Serialization](#7-product-api-and-serialization)
8. [Order Creation and Checkout](#8-order-creation-and-checkout)
9. [Coupon System](#9-coupon-system)
10. [Review System](#10-review-system)
11. [Razorpay Integration](#11-razorpay-integration)
12. [Shiprocket Integration](#12-shiprocket-integration)
13. [Cloudinary Integration](#13-cloudinary-integration)
14. [Admin API Routes](#14-admin-api-routes)
15. [CORS and Security](#15-cors-and-security)
16. [Environment Variables Map](#16-environment-variables-map)
17. [Security Boundaries](#17-security-boundaries)
18. [API Response Format](#18-api-response-format)
19. [Error Codes Reference](#19-error-codes-reference)
20. [Shared Helpers and Utilities](#20-shared-helpers-and-utilities)
22. [Data Flow Diagrams](#22-data-flow-diagrams)
23. [Source of Truth Index](#23-source-of-truth-index)
24. [Where to Edit](#24-where-to-edit)
25. [Active Backend File Tree](#25-active-backend-file-tree)
26. [Runtime Verification Status](#26-runtime-verification-status)

---

## 1. Overview

The active backend for redlinenext is a Next.js 16+ server-side API layer built with:

- **Runtime**: Node.js (Next.js 16, `export const runtime = "nodejs"` on routes)
- **Database**: MongoDB via Mongoose (6+ models)
- **Authentication**: JWT-based cookies (customer OTP flow + admin email/password)
- **Payment**: Razorpay (signature verification)
- **Shipping**: Shiprocket (pincode serviceability, order creation, tracking)
- **Media**: Cloudinary (image hosting, upload signatures)
- **Response Pattern**: Standardized success/failure envelope with error codes

This backend is the single source of truth for:
- User authentication and session management
- Product catalog and inventory
- Order lifecycle (creation, verification, status sync)
- Payment processing and fraud verification
- Shipping logistics integration
- Review moderation and rating aggregation
- Coupon validation and discount application
- Admin operations and access control

---

## 2. Complete API Route Tree

All routes are under `src/app/api/`. Each is a Next.js 16+ App Router route with `export const runtime = "nodejs"`.

### 2.1 PUBLIC ROUTES (No Auth Required)

#### GET /api/products
- **File**: src/app/api/products/route.js
- **Auth**: None
- **Request**: Query params: `category` (optional, enum: "Men", "Women", "Unisex")
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "products": [
        {
          "id": "mongodb_id",
          "_id": "mongodb_id",
          "name": "string",
          "slug": "string",
          "category": "Men|Women|Unisex",
          "shortDescription": "string",
          "description": "string",
          "images": [{"url": "string", "publicId": "string", "alt": "string"}],
          "fragranceProfile": "string",
          "personality": "string",
          "positioning": "string",
          "bestFor": ["string"],
          "bestSeason": ["string"],
          "fragranceNotes": {"top": [], "heart": [], "base": []},
          "variants": [
            {
              "size": "10 ML|50 ML",
              "sellingPrice": "number",
              "mrp": "number",
              "stock": "number",
              "sku": "string"
            }
          ],
          "faq": [{"question": "string", "answer": "string"}],
          "legalInformation": {"ingredients": "string", "caution": "string"},
          "featured": "boolean",
          "bestseller": "boolean",
          "status": "draft|published",
          "createdAt": "iso-date",
          "updatedAt": "iso-date",
          "rating": {
            "average": "number 0-5 with 1 decimal",
            "count": "number",
            "breakdown": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
          }
        }
      ]
    }
  }
  ```
- **Notes**:
  - costPrice is NOT included
  - Only `status: "published"` products are returned
  - Rating aggregated from Review model
  - Filter: `filter = { status: "published" }`
  - If category provided, additional filter: `filter.category = category`

#### GET /api/products/slug/[slug]
- **File**: src/app/api/products/slug/[slug]/route.js
- **Auth**: None
- **Params**: `slug` (string, URL-encoded product slug)
- **Response**: Same as GET /api/products but single product wrapped as `{ "product": {...} }`
- **Error Codes**: `INVALID_SLUG`, `PRODUCT_NOT_FOUND`

#### GET /api/products/[id]
- **File**: src/app/api/products/[id]/route.js
- **Auth**: None
- **Params**: `id` (MongoDB ObjectId)
- **Response**: Single product with rating, `status: "published"` only
- **Error Codes**: `INVALID_PRODUCT_ID`, `PRODUCT_NOT_FOUND`

#### POST /api/auth/send-otp
- **File**: src/app/api/auth/send-otp/route.js
- **Auth**: None (rate-limited)
- **Request Body**:
  ```json
  {
    "phone": "10-digit Indian phone number (6-9 prefix required)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "phone": "normalized 10-digit",
      "expiresAt": "iso-date",
      "provider": "mock|actual_provider_name",
      "devOtp": "6-digit string (only if OTP_PROVIDER=mock and dev mode)"
    }
  }
  ```
- **Error Codes**: `INVALID_PHONE`, `OTP_SEND_FAILED`, `OTP_PROVIDER` not configured
- **Behavior**:
  - Phone normalized by removing non-digits and taking last 10
  - Validates 10-digit Indian format: /^[6-9]\d{9}$/
  - Uses lib/auth/otpProvider.js sendOtp()
  - In mock mode, returns devOtp for testing

#### POST /api/auth/verify-otp
- **File**: src/app/api/auth/verify-otp/route.js
- **Auth**: None
- **Request Body**:
  ```json
  {
    "phone": "10-digit",
    "otp": "4-8 digit string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "mongodb_id",
        "phone": "10-digit",
        "phoneVerified": true,
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "addresses": [],
        "status": "active|suspended",
        "createdAt": "iso-date",
        "updatedAt": "iso-date"
      }
    }
  }
  ```
- **Cookies Set**: `customer_session` (HttpOnly, secure/lax depending on NODE_ENV)
- **Error Codes**: `INVALID_PHONE`, `INVALID_OTP`, `OTP_VERIFICATION_FAILED`, `USER_SUSPENDED`
- **Side Effects**:
  - Creates User if phone does not exist
  - Sets phoneVerified: true
  - Generates customer_session JWT cookie (30-day TTL)
  - Marks OtpVerification record as consumedAt

#### GET /api/health
- **File**: src/app/api/health/route.js
- **Auth**: None
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "service": "api",
      "status": "ok"
    }
  }
  ```
- **Purpose**: Lightweight health check; does NOT verify DB/external service connectivity

#### POST /api/shipping/serviceability
- **File**: src/app/api/shipping/serviceability/route.js
- **Auth**: None
- **Request Body**:
  ```json
  {
    "pincode": "6-digit string",
    "cod": "boolean (optional, default false)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "serviceable": "boolean",
      "code": "SERVICEABLE|UNSERVICEABLE|INVALID_PINCODE",
      "message": "string",
      "couriers": [
        {
          "courierName": "string",
          "rate": "number",
          "estimatedDeliveryDays": "number",
          "cod": "boolean"
        }
      ]
    }
  }
  ```
- **Error Codes**: `INVALID_PINCODE`, `SHIPROCKET_NOT_CONFIGURED`, `SHIPROCKET_TEMPORARY_ERROR`
- **External Service**: Shiprocket (requires auth token)
- **Behavior**:
  - Validates pincode: /^\d{6}$/
  - Calls checkServiceability() from lib/shipping/shiprocket.js
  - Returns first 5 available couriers if serviceable
  - Pin code validation first; if invalid, returns INVALID_PINCODE without Shiprocket call

#### GET /api/shipping/serviceability
- **File**: src/app/api/shipping/serviceability/route.js (same file, GET handler)
- **Auth**: None
- **Query Params**: `pincode` (required), `cod` (optional, "true"|"false")
- **Response**: Same as POST

#### POST /api/coupons/validate
- **File**: src/app/api/coupons/validate/route.js
- **Auth**: None
- **Request Body**:
  ```json
  {
    "items": [
      {
        "productId": "mongodb_id",
        "size": "10 ML|50 ML",
        "quantity": "number > 0"
      }
    ],
    "code": "string|couponCode": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "valid": "boolean",
      "discount": "number",
      "subtotal": "number",
      "total": "number",
      "coupon": {
        "code": "string",
        "discount": "number"
      },
      "message": "string"
    }
  }
  ```
- **Error Codes**: `EMPTY_CART`, `STOCK_CHANGED`, `COUPON_NOT_FOUND`, `COUPON_INACTIVE`, `COUPON_EXPIRED`, `COUPON_MINIMUM_ORDER`
- **Behavior**:
  - Calls calculateCart() which validates stock from Product model
  - Calls calculateCouponDiscount()
  - Returns server-calculated total (frontend total NOT trusted)
  - All product metadata re-fetched from DB

---

### 2.2 AUTHENTICATED CUSTOMER ROUTES (Requires OTP + Customer Session)

#### GET /api/auth/me
- **File**: src/app/api/auth/me/route.js
- **Auth**: `requireUser` (customer_session JWT cookie or Bearer token)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {...user object...}
    }
  }
  ```
- **Error Codes**: `UNAUTHENTICATED`, `USER_SUSPENDED`, `CONFIGURATION_ERROR`

#### PATCH /api/auth/me
- **File**: src/app/api/auth/me/route.js (same file, PATCH handler)
- **Auth**: `requireUser`
- **Request Body**:
  ```json
  {
    "firstName": "string (optional, max 100 chars)",
    "lastName": "string (optional, max 100 chars)",
    "email": "string (optional)",
    "addresses": [
      {
        "fullName": "string (required)",
        "email": "string (optional)",
        "addressLine": "string (required)",
        "city": "string (required)",
        "state": "string (required)",
        "pincode": "6-digit string (required)",
        "type": "Home|Work (optional, default Home)",
        "isDefault": "boolean (optional)"
      }
    ]
  }
  ```
- **Response**: Updated user object
- **Validations**:
  - Max 10 addresses per user
  - At most 1 default address
  - All address fields required: fullName, addressLine, city, state
  - Valid pincode (6 digits)
  - Valid email if provided
- **Error Codes**: `INVALID_EMAIL`, `INVALID_ADDRESS`

#### POST /api/auth/logout
- **File**: src/app/api/auth/logout/route.js
- **Auth**: `requireUser`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "loggedOut": true
    }
  }
  ```
- **Cookies**: Clears `customer_session` cookie (HttpOnly)

#### POST /api/checkout/cod
- **File**: src/app/api/checkout/cod/route.js
- **Auth**: `requireUser`
- **Request Body**:
  ```json
  {
    "items": [
      {
        "productId": "mongodb_id",
        "size": "10 ML|50 ML",
        "quantity": "number"
      }
    ],
    "address": {
      "fullName": "string",
      "email": "string (optional)",
      "addressLine": "string",
      "city": "string",
      "state": "string",
      "pincode": "6-digit",
      "type": "Home|Work"
    },
    "couponCode": "string (optional)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "order": {...full order object...}
    }
  }
  ```
- **HTTP Status**: 201 (Created)
- **Order Side Effects**:
  - Server recalculates cart and coupon
  - **Stock deducted immediately** via deductStock()
  - Order created in MongoDB
  - Shiprocket order attempted (non-blocking; failure stored in order.shiprocket.lastError)
  - If Shiprocket not configured: syncStatus = "not_configured"
- **Error Codes**: `INVALID_ADDRESS`, `EMPTY_CART`, `STOCK_CHANGED`, `COUPON_*`, `COD_CHECKOUT_FAILED`
- **Process**:
  1. Auth check
  2. validateAddress()
  3. calculateCart() (stock validation, coupon application)
  4. deductStock() (throws STOCK_CHANGED if stock changed)
  5. Order.create()
  6. createShiprocketOrder() (best effort)
  7. order.save() (with shiprocket result)
- **STOCK_CHANGED Details**:
  ```json
  {
    "success": false,
    "error": {
      "code": "STOCK_CHANGED",
      "message": "Stock changed during checkout",
      "status": 409,
      "details": {
        "items": [
          {
            "productId": "string",
            "size": "string",
            "requestedQuantity": "number",
            "availableStock": "number|undefined",
            "reason": "INVALID_ITEM|PRODUCT_UNAVAILABLE|VARIANT_UNAVAILABLE|INSUFFICIENT_STOCK"
          }
        ]
      }
    }
  }
  ```

#### POST /api/checkout/razorpay/create
- **File**: src/app/api/checkout/razorpay/create/route.js
- **Auth**: `requireUser`
- **Request Body**: Same as COD checkout
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "orderId": "mongodb_order_id",
      "orderNumber": "ORD-YYYYMMDD-XXXXXX",
      "razorpay": {
        "keyId": "RAZORPAY_KEY_ID (public)",
        "orderId": "razorpay_order_id",
        "amount": "amount_in_paise",
        "currency": "INR"
      },
      "amount": "amount_in_rupees"
    }
  }
  ```
- **Order Side Effects**:
  - Order created with paymentStatus: "pending"
  - Razorpay order created (amount in paise)
  - Razorpay order ID stored in order.payment.razorpayOrderId
  - **Stock NOT deducted yet** (deducted on verify)
- **Error Codes**: Same as COD checkout
- **Razorpay Key**: Amount passed in paise (Rs * 100)

#### POST /api/checkout/razorpay/verify
- **File**: src/app/api/checkout/razorpay/verify/route.js
- **Auth**: `requireUser`
- **Request Body**:
  ```json
  {
    "orderId": "internal_mongodb_order_id (or internalOrderId)",
    "razorpay_order_id": "string (from Razorpay)",
    "razorpay_payment_id": "string (from Razorpay)",
    "razorpay_signature": "hex string (from Razorpay)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "order": {...full order object with updated payment/shiprocket...}
    }
  }
  ```
- **Side Effects**:
  - Verifies HMAC signature: SHA256(razorpay_order_id|razorpay_payment_id) using RAZORPAY_KEY_SECRET
  - If already paid: returns idempotent success
  - Deducts stock
  - Sets paymentStatus: "paid"
  - Creates Shiprocket order (non-blocking)
  - Stores payment IDs and signature
- **Error Codes**: `ORDER_NOT_FOUND`, `PAYMENT_MISMATCH`, `PAYMENT_VERIFICATION_FAILED`, `STOCK_CHANGED`, `RAZORPAY_VERIFY_FAILED`
- **Idempotency**: If order.payment.paymentStatus === "paid", returns with idempotent: true

#### GET /api/orders/my-orders
- **File**: src/app/api/orders/my-orders/route.js
- **Auth**: `requireUser`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "orders": [...]
    }
  }
  ```
- **Behavior**: Filters by user._id, sorted createdAt descending

#### GET /api/orders/[orderId]
- **File**: src/app/api/orders/[orderId]/route.js
- **Auth**: `requireUser`
- **Params**: `orderId` (MongoDB _id or orderNumber string)
- **Response**: Single order object
- **Behavior**: Filters by user._id (ownership check)
- **Error Codes**: `ORDER_NOT_FOUND`

#### GET /api/shipping/tracking
- **File**: src/app/api/shipping/tracking/route.js
- **Auth**: `requireUser`
- **Query Params**: `orderId` (MongoDB _id or orderNumber)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "available": "boolean",
      "awbCode": "string|undefined",
      "trackingUrl": "string|undefined",
      "status": "string",
      "tracking": "full_shiprocket_tracking_object|undefined"
    }
  }
  ```
- **Behavior**:
  - If no awbCode: returns available: false
  - If awbCode: calls getTrackingByAwb(awbCode) from Shiprocket
- **Error Codes**: `ORDER_NOT_FOUND`, `TRACKING_FAILED`

#### GET /api/reviews
- **File**: src/app/api/reviews/route.js
- **Auth**: `requireUser`
- **Query Params**: `productId` (MongoDB ObjectId)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "review": {
        "id": "string",
        "product": "string",
        "rating": "number 1-5",
        "title": "string",
        "text": "string",
        "photos": [{"url": "string", "publicId": "string"}],
        "approved": "boolean",
        "verifiedPurchase": "boolean",
        "createdAt": "iso-date",
        "updatedAt": "iso-date"
      } | null
    }
  }
  ```
- **Behavior**: Returns user's OWN review for product (if exists)
- **Error Codes**: `INVALID_PRODUCT_ID`, `REVIEW_LOOKUP_FAILED`

#### POST /api/reviews
- **File**: src/app/api/reviews/route.js (same file, POST handler)
- **Auth**: `requireUser`
- **Request Body**:
  ```json
  {
    "productId": "mongodb_id",
    "rating": "number 1-5",
    "title": "string (optional)",
    "text": "string|reviewText: string",
    "photos": [{"url": "string", "publicId": "string"}]
  }
  ```
- **Response**: Created review object
- **HTTP Status**: 201 (Created)
- **Constraints**:
  - Max 1 review per user per product
  - Rating required, 1-5
  - Text required (max 2000 chars)
  - Title optional (max 100 chars)
  - Max 2 photos
  - approved: false by default (moderation required)
  - verifiedPurchase: computed from Order history
- **Error Codes**: `INVALID_PRODUCT_ID`, `INVALID_RATING`, `INVALID_REVIEW`, `PRODUCT_NOT_FOUND`, `REVIEW_EXISTS`, `REVIEW_CREATE_FAILED`

#### PATCH /api/reviews/[reviewId]
- **File**: src/app/api/reviews/[reviewId]/route.js
- **Auth**: `requireUser`
- **Params**: `reviewId` (MongoDB ObjectId)
- **Request Body**: Partial review fields (rating, title, text, photos)
- **Response**: Updated review object
- **Behavior**:
  - Ownership check: user must own review
  - Sets approved: false (resets moderation on edit)
- **Error Codes**: `INVALID_REVIEW_ID`, `REVIEW_NOT_FOUND`, `FORBIDDEN`, `INVALID_RATING`, `INVALID_REVIEW`, `REVIEW_UPDATE_FAILED`

#### DELETE /api/reviews/[reviewId]
- **File**: src/app/api/reviews/[reviewId]/route.js (same file, DELETE handler)
- **Auth**: `requireUser`
- **Params**: `reviewId`
- **Behavior**: Ownership check, hard delete
- **Error Codes**: `INVALID_REVIEW_ID`, `REVIEW_NOT_FOUND`, `FORBIDDEN`, `REVIEW_DELETE_FAILED`

#### GET /api/reviews/product/[productId]
- **File**: src/app/api/reviews/product/[productId]/route.js
- **Auth**: None (public)
- **Params**: `productId`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "reviews": [
        {
          "id": "string",
          "rating": "number",
          "title": "string",
          "text": "string",
          "photos": [],
          "verifiedPurchase": "boolean",
          "user": {
            "firstName": "string",
            "lastName": "string"
          },
          "createdAt": "iso-date",
          "updatedAt": "iso-date"
        }
      ],
      "rating": {
        "average": "number",
        "count": "number",
        "breakdown": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
      }
    }
  }
  ```
- **Behavior**: Only approved: true reviews shown
- **Error Codes**: `INVALID_PRODUCT_ID`

---

### 2.3 ADMIN ROUTES (Requires Admin Session)

All admin routes require `requireAdmin()` and apply CORS via `applyAdminCors()`.

#### OPTIONS /api/admin/*
- **Handler**: `adminPreflight(request)` for all admin OPTIONS
- **CORS Headers**: Applied from ADMIN_ALLOWED_ORIGINS
- **HTTP Status**: 204 No Content

#### POST /api/admin/auth/login
- **File**: src/app/api/admin/auth/login/route.js
- **Auth**: None
- **CORS**: Applied
- **Request Body**:
  ```json
  {
    "email": "string (must match ADMIN_EMAIL env var)",
    "password": "string (must match ADMIN_PASSWORD env var)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "admin": {
        "email": "string"
      },
      "token": "jwt"
    }
  }
  ```
- **Cookies Set**: `admin_session` (HttpOnly, secure/lax, 8-hour TTL)
- **Token Type**: JWT signed with ADMIN_AUTH_SECRET (fallback: AUTH_SECRET)
- **Behavior**:
  - Plain-text email/password comparison (no hashing)
  - Credentials hardcoded in .env
  - Token valid for 8 hours
- **Error Codes**: `CONFIGURATION_ERROR`, `INVALID_CREDENTIALS`

#### GET /api/admin/auth/me
- **File**: src/app/api/admin/auth/me/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "admin": {
        "id": "admin"
      }
    }
  }
  ```
- **Error Codes**: `UNAUTHENTICATED`, `FORBIDDEN`, `CONFIGURATION_ERROR`

#### POST /api/admin/auth/logout
- **File**: src/app/api/admin/auth/logout/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "loggedOut": true
    }
  }
  ```
- **Cookies**: Clears `admin_session`

#### GET /api/admin/dashboard
- **File**: src/app/api/admin/dashboard/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalOrders": "number",
      "revenue": "number (from all non-cancelled, paid/cod orders)",
      "customers": "number (all User count)",
      "products": "number (all Product count)",
      "recentOrders": [...10 recent orders...],
      "lowStockProducts": [...products with variants.stock < 5...]
    }
  }
  ```
- **Queries**:
  - totalOrders: Order.countDocuments()
  - revenue: Order.aggregate(match + group sum)
  - customers: User.countDocuments()
  - products: Product.countDocuments()
  - recentOrders: Order.find().sort({createdAt:-1}).limit(10)
  - lowStockProducts: Product.find({"variants.stock": {$lt: 5}})

#### GET /api/admin/products
- **File**: src/app/api/admin/products/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Query Params**: `skip`, `limit` (default 50, max 100)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "products": [...serialized with includeCostPrice: true...],
      "total": "number",
      "skip": "number",
      "limit": "number"
    }
  }
  ```
- **Behavior**: Returns ALL products (draft + published), includes costPrice

#### POST /api/admin/products
- **File**: src/app/api/admin/products/route.js (same file)
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Request Body**:
  ```json
  {
    "name": "string (required)",
    "slug": "string (optional, auto-generated if not provided)",
    "category": "Men|Women|Unisex (required)",
    "shortDescription": "string",
    "description": "string (required)",
    "images": [
      {
        "url": "string (required)",
        "publicId": "string (optional)",
        "alt": "string"
      }
    ],
    "fragranceProfile": "string",
    "personality": "string",
    "positioning": "string",
    "bestFor": ["string"],
    "bestSeason": ["string"],
    "fragranceNotes": {
      "top": ["string"],
      "heart": ["string"],
      "base": ["string"]
    },
    "variants": [
      {
        "size": "10 ML|50 ML (required)",
        "sellingPrice": "number > 0 (required)",
        "mrp": "number > 0 (required)",
        "costPrice": "number >= 0 (required)",
        "stock": "number >= 0 (required)",
        "sku": "string"
      }
    ],
    "faq": [
      {
        "question": "string",
        "answer": "string"
      }
    ],
    "legalInformation": {
      "ingredients": "string",
      "caution": "string"
    },
    "featured": "boolean",
    "bestseller": "boolean",
    "status": "draft|published"
  }
  ```
- **Response**: Created product (with costPrice)
- **HTTP Status**: 201
- **Validation**:
  - Name required, max 160 chars
  - Slug auto-slugified from name if not provided
  - Category required, must be Men|Women|Unisex
  - At least 1 variant required
  - Variant sizes must be unique 10 ML and/or 50 ML
  - All prices positive
  - Images max 5 (filtered to non-empty URLs)
  - FAQ max 10
  - Status default: "draft"
- **Error Codes**: `VALIDATION_ERROR`, `PRODUCT_CREATE_FAILED`

#### GET /api/admin/products/[id]
- **File**: src/app/api/admin/products/[id]/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `id` (MongoDB ObjectId)
- **Response**: Single product with costPrice
- **Error Codes**: `INVALID_PRODUCT_ID`, `PRODUCT_NOT_FOUND`

#### PUT /api/admin/products/[id]
- **File**: src/app/api/admin/products/[id]/route.js (same file)
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `id`
- **Request Body**: Same schema as POST
- **Response**: Updated product with costPrice
- **Error Codes**: `INVALID_PRODUCT_ID`, `VALIDATION_ERROR`, `PRODUCT_NOT_FOUND`, `PRODUCT_UPDATE_FAILED`

#### PATCH /api/admin/products/[id]
- **File**: src/app/api/admin/products/[id]/route.js (aliases to PUT)
- **Same as PUT**

#### DELETE /api/admin/products/[id]
- **File**: src/app/api/admin/products/[id]/route.js (same file)
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `id`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "deleted": true
    }
  }
  ```
- **Error Codes**: `INVALID_PRODUCT_ID`, `PRODUCT_NOT_FOUND`, `PRODUCT_DELETE_FAILED`

#### GET /api/admin/coupons
- **File**: src/app/api/admin/coupons/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "coupons": [...]
    }
  }
  ```
- **Behavior**: All coupons sorted by createdAt descending

#### POST /api/admin/coupons
- **File**: src/app/api/admin/coupons/route.js (same file)
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Request Body**:
  ```json
  {
    "code": "string (3-30 chars, uppercase alphanumeric + _ -)",
    "discountType": "percentage|fixed",
    "discountValue": "number > 0",
    "minimumOrder": "number >= 0 (optional, default 0)",
    "expiryDate": "iso-date (required, must be future)",
    "active": "boolean (optional, default true)"
  }
  ```
- **Response**: Created coupon
- **HTTP Status**: 201
- **Validation**:
  - Code required, 3-30 chars, unique
  - Code pattern: /^[A-Z0-9_-]+$/
  - discountType required
  - discountValue > 0
  - For percentage: value <= 100
  - expiryDate must be in future
- **Error Codes**: `VALIDATION_ERROR`, `COUPON_CREATE_FAILED`, `DUPLICATE_VALUE`

#### PATCH /api/admin/coupons/[couponId]
- **File**: src/app/api/admin/coupons/[couponId]/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `couponId`
- **Request Body**: Partial coupon fields
- **Response**: Updated coupon
- **Error Codes**: `COUPON_NOT_FOUND`, `VALIDATION_ERROR`, `COUPON_UPDATE_FAILED`

#### DELETE /api/admin/coupons/[couponId]
- **File**: src/app/api/admin/coupons/[couponId]/route.js (same file)
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `couponId`
- **Response**: `{ "deleted": true }`
- **Error Codes**: `COUPON_NOT_FOUND`

#### GET /api/admin/orders
- **File**: src/app/api/admin/orders/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Query Params**: `status`, `paymentStatus`, `limit` (max 100), `skip`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "orders": [...],
      "total": "number",
      "limit": "number",
      "skip": "number"
    }
  }
  ```
- **Filtering**: order[field] = queryParam if provided

#### PATCH /api/admin/orders/[orderId]
- **File**: src/app/api/admin/orders/[orderId]/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `orderId` (MongoDB _id or orderNumber)
- **Request Body**:
  ```json
  {
    "orderStatus": "confirmed|processing|shipped|delivered|cancelled"
  }
  ```
- **Response**: Updated order
- **Behavior**: Simple status update
- **Error Codes**: `ORDER_NOT_FOUND`, `ADMIN_ORDERS_UPDATE_FAILED`

#### GET /api/admin/users
- **File**: src/app/api/admin/users/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Query Params**: `search` (phone|email|firstName|lastName), `status`, `limit` (max 100), `skip`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {...user..., "totalOrders": "number"}
      ],
      "total": "number",
      "limit": "number",
      "skip": "number"
    }
  }
  ```
- **Aggregation**: Counts orders per user via Order.aggregate()

#### PATCH /api/admin/users/[userId]
- **File**: src/app/api/admin/users/[userId]/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `userId`
- **Request Body**:
  ```json
  {
    "status": "active|suspended"
  }
  ```
- **Response**: Updated user
- **Error Codes**: `ADMIN_USERS_UPDATE_FAILED`

#### GET /api/admin/reviews
- **File**: src/app/api/admin/reviews/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Query Params**: `productId`, `rating` (1-5), `approved` ("true"|"false"), `search`, `limit` (max 100), `skip`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "reviews": [
        {
          ...review...,
          "product": {
            "name": "string",
            "slug": "string"
          },
          "user": {
            "firstName": "string",
            "lastName": "string",
            "phone": "string",
            "email": "string"
          }
        }
      ],
      "total": "number",
      "limit": "number",
      "skip": "number"
    }
  }
  ```
- **Populate**: product (name, slug), user (firstName, lastName, phone, email)

#### PATCH /api/admin/reviews/[reviewId]
- **File**: src/app/api/admin/reviews/[reviewId]/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `reviewId`
- **Request Body**: Partial review fields (approved, etc.)
- **Response**: Updated review
- **Error Codes**: `REVIEW_NOT_FOUND`, `ADMIN_REVIEWS_UPDATE_FAILED`

#### DELETE /api/admin/reviews/[reviewId]
- **File**: src/app/api/admin/reviews/[reviewId]/route.js (same file)
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Params**: `reviewId`
- **Response**: `{ "deleted": true }`
- **Error Codes**: `REVIEW_NOT_FOUND`

#### POST /api/upload/cloudinary-signature
- **File**: src/app/api/upload/cloudinary-signature/route.js
- **Auth**: `requireAdmin`
- **CORS**: Applied
- **Request Body**:
  ```json
  {
    "folder": "products|reviews (optional, default products)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "signature": "hex string",
      "timestamp": "number",
      "folder": "string",
      "cloudName": "string",
      "apiKey": "string (public)"
    }
  }
  ```
- **Behavior**:
  - Generates Cloudinary upload signature for unsigned upload
  - Admin client sends this to Cloudinary directly
  - Only "products" and "reviews" folders allowed
  - apiKey is public; apiSecret stays server-side
- **Error Codes**: `CLOUDINARY_NOT_CONFIGURED`, `CLOUDINARY_SIGNATURE_FAILED`

---

## 3. Mongoose Models

All models use mongoose connection caching for serverless environments.

### 3.1 Product Model

**File**: src/models/Product.js

```javascript
{
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: { type: String, enum: ["Men", "Women", "Unisex"], required: true },
  shortDescription: { type: String, trim: true },
  description: { type: String, required: true, trim: true },
  images: [
    {
      url: { type: String, required: true, trim: true },
      publicId: { type: String, trim: true },
      alt: { type: String, trim: true }
    }
  ],
  fragranceProfile: { type: String, trim: true },
  personality: { type: String, trim: true },
  positioning: { type: String, trim: true },
  bestFor: [{ type: String, trim: true }],
  bestSeason: [{ type: String, trim: true }],
  fragranceNotes: {
    top: [{ type: String, trim: true }],
    heart: [{ type: String, trim: true }],
    base: [{ type: String, trim: true }]
  },
  variants: [
    {
      size: { type: String, enum: ["10 ML", "50 ML"], required: true },
      sellingPrice: { type: Number, required: true, min: 0 },
      mrp: { type: Number, required: true, min: 0 },
      costPrice: { type: Number, required: true, min: 0 },
      stock: { type: Number, required: true, min: 0 },
      sku: { type: String, trim: true }
    }
  ],
  faq: [
    {
      question: { type: String, trim: true },
      answer: { type: String, trim: true }
    }
  ],
  legalInformation: {
    ingredients: { type: String, trim: true },
    caution: { type: String, trim: true }
  },
  featured: { type: Boolean, default: false },
  bestseller: { type: Boolean, default: false },
  status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  timestamps: true
}
```

**Indexes**:
- `{ category: 1, status: 1 }`
- `{ featured: 1, status: 1 }`
- `{ bestseller: 1, status: 1 }`
- `{ "variants.stock": 1 }`

**Validation**:
- Variants: At least 1, unique sizes only
- Size enum enforced

**Security**:
- costPrice is NEVER exposed to public APIs
- Only admin sees costPrice
- Serialization function (`serializeProduct()`) has `includeCostPrice` flag

### 3.2 User Model

**File**: src/models/User.js

```javascript
{
  phone: { type: String, required: true, unique: true, trim: true },
  phoneVerified: { type: Boolean, default: false },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  addresses: [
    {
      fullName: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      addressLine: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      type: { type: String, enum: ["Home", "Work"], default: "Home" },
      isDefault: { type: Boolean, default: false }
    }
  ],
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  timestamps: true
}
```

**Indexes**:
- `{ phone: 1 }` (unique)
- `{ email: 1 }`
- `{ status: 1 }`

**Notes**:
- Phone is unique identifier
- No password field (OTP-only auth)
- Addresses stored as embedded array (max 10 validated in API)
- status: "suspended" accounts cannot log in

### 3.3 Order Model

**File**: src/models/Order.js

```javascript
{
  orderNumber: { type: String, required: true, unique: true, index: true },
  user: { type: ObjectId, ref: "User", default: null, index: true },
  customer: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    phoneVerified: { type: Boolean, default: false },
    email: { type: String, trim: true, lowercase: true }
  },
  deliveryAddress: {
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    addressLine: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    type: { type: String, enum: ["Home", "Work"], default: "Home" }
  },
  items: [
    {
      productId: { type: ObjectId, ref: "Product", required: true },
      name: { type: String, required: true },
      slug: { type: String },
      image: { type: String },
      size: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      mrp: { type: Number, min: 0 }
    }
  ],
  amounts: {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 }
  },
  coupon: {
    code: { type: String, default: null },
    discount: { type: Number, default: 0 }
  },
  payment: {
    method: { type: String, enum: ["razorpay", "cod"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cod"],
      default: "pending",
      index: true
    },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String }
  },
  orderStatus: {
    type: String,
    enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "confirmed",
    index: true
  },
  shiprocket: {
    shiprocketOrderId: { type: String },
    shipmentId: { type: String },
    awbCode: { type: String },
    courierName: { type: String },
    trackingUrl: { type: String },
    shipmentStatus: { type: String },
    syncStatus: {
      type: String,
      enum: ["not_configured", "pending", "created", "failed"],
      default: "pending"
    },
    lastError: { type: String }
  },
  timestamps: true
}
```

**Indexes**:
- `{ user: 1, createdAt: -1 }`
- `{ createdAt: -1 }`
- `{ orderStatus: 1, createdAt: -1 }`
- `{ "payment.paymentStatus": 1, createdAt: -1 }` (implied)
- `{ "payment.razorpayOrderId": 1 }`
- `{ orderNumber: 1 }` (unique)

**Notes**:
- Snapshot items (name, price, size) stored at order time (no live product link)
- orderNumber generated as ORD-YYYYMMDD-RANDOM
- user can be null (guest order possible but unlikely in OTP flow)
- shiprocket fields populated on order creation (or left as defaults if Shiprocket fails)
- syncStatus tracks Shiprocket sync state

### 3.4 Review Model

**File**: src/models/Review.js

```javascript
{
  product: { type: ObjectId, ref: "Product", required: true, index: true },
  user: { type: ObjectId, ref: "User", required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 100 },
  text: { type: String, required: true, trim: true },
  photos: [
    {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true }
    }
  ],
  approved: { type: Boolean, default: false, index: true },
  verifiedPurchase: { type: Boolean, default: false },
  timestamps: true
}
```

**Unique Index**: `{ product: 1, user: 1 }` (one review per user per product)

**Other Indexes**:
- `{ product: 1, approved: 1, createdAt: -1 }`

**Notes**:
- approved: false by default (requires admin moderation)
- verifiedPurchase computed from Order model (user has paid/cod order for this product)
- Public reviews endpoint filters approved: true only
- Author can see and edit own pending review

### 3.5 Coupon Model

**File**: src/models/Coupon.js

```javascript
{
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[A-Z0-9_-]+$/
  },
  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true
  },
  discountValue: { type: Number, required: true, min: 0 },
  minimumOrder: { type: Number, default: 0, min: 0 },
  expiryDate: { type: Date, required: true },
  active: { type: Boolean, default: true, index: true },
  timestamps: true
}
```

**Indexes**:
- `{ code: 1 }` (unique)
- `{ active: 1, expiryDate: 1 }`

**Validation**:
- Code pattern: uppercase alphanumeric + underscore/hyphen only
- discountType required
- If percentage: discountValue checked <= 100 at route level
- expiryDate must be future date

**Calculation**:
- Percentage: `discount = (subtotal * discountValue) / 100`
- Fixed: `discount = discountValue`
- Applied discount capped at subtotal (cannot go negative)

### 3.6 OtpVerification Model

**File**: src/models/OtpVerification.js

```javascript
{
  phone: { type: String, required: true, index: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: true },
  consumedAt: { type: Date, default: null },
  timestamps: true
}
```

**TTL Index**: `{ expiresAt: 1 }` with `expireAfterSeconds: 0` (automatic cleanup)

**Notes**:
- OTP is hashed using HMAC-SHA256(phone:otp, AUTH_SECRET)
- attempts tracks verification attempts (max 5)
- expiresAt: 10 minutes from creation
- consumedAt: set when OTP successfully verified
- Query for verification: `{ phone, consumedAt: null, expiresAt: { $gt: new Date() } }`

---

## 4. Database Connection

**File**: src/lib/db.js

```javascript
import mongoose from "mongoose";

const globalCache = globalThis.__mongooseConnection || {
  conn: null,
  promise: null,
};

globalThis.__mongooseConnection = globalCache;

export async function connectDB() {
  if (globalCache.conn) {
    return globalCache.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
```

**Behavior**:
- **Serverless-optimized**: Caches connection globally to prevent repeated handshakes
- **MONGODB_URI required**: Throws error if not set
- **Connection pooling**: maxPoolSize 10
- **Timeouts**: 10s server selection, 45s socket timeout (for long operations)
- **Lazy connection**: First call to connectDB() initiates connection
- **Error handling**: If URI missing, throws at route time (returned as 503 CONFIGURATION_ERROR)

**Used in**: Every route that needs DB access calls `await connectDB()` first

---

## 5. Authentication & Session System

**File**: src/lib/auth/session.js

### 5.1 Customer Session

**Cookie Name**: `customer_session`
**TTL**: 30 days (2,592,000 seconds)
**Secure Flag**: true in production (NODE_ENV === "production")
**SameSite**: "none" in production, "lax" in development
**HttpOnly**: true (JavaScript cannot access)
**Path**: "/"
**Signing Algorithm**: JWT (HS256)
**Secret**: process.env.AUTH_SECRET (fallback: process.env.JWT_SECRET)

**JWT Payload**:
```javascript
{
  sub: "mongodb_user_id",
  phone: "10-digit phone",
  type: "customer",
  iat: "issued-at-unix",
  exp: "expiry-unix (30 days)"
}
```

**Verification Function**: `requireUser(request)`
- Checks Authorization header (Bearer token) first
- Falls back to cookie
- Verifies JWT signature
- Checks type === "customer"
- Loads user from MongoDB
- Checks status !== "suspended"
- Returns `{ user }` or `{ response: failure(...) }`

**Session Creation**: `signUserSession(user)` + `setUserSessionCookie(response, token)`
- Called in verify-otp route
- Generates JWT with user._id and phone
- Sets HttpOnly cookie with 30-day age

**Session Termination**: `clearUserSessionCookie(response)`
- Sets cookie with maxAge: 0
- Called in logout route

### 5.2 Admin Session

**Cookie Name**: `admin_session`
**TTL**: 8 hours (28,800 seconds)
**HttpOnly**: true
**Secure/SameSite**: Same as customer
**Signing Secret**: process.env.ADMIN_AUTH_SECRET (fallback: AUTH_SECRET)

**JWT Payload**:
```javascript
{
  sub: "admin",
  type: "admin",
  iat: "issued-at-unix",
  exp: "expiry-unix (8 hours)"
}
```

**Verification Function**: `requireAdmin(request)`
- Same token extraction as customer
- Verifies against ADMIN_AUTH_SECRET
- Checks type === "admin"
- Returns `{ admin: { id: "admin" } }` or `{ response: failure(...) }`

**Session Creation**: `signAdminSession()` + `setAdminSessionCookie(response, token)`
- Called in admin login route
- No user data in token (just "admin" identifier)

**Key Difference from Legacy**:
- Admin credentials (email/password) verified at login time only
- No Bearer token required per request from redlineadmin
- Cookie-based session used internally in redlinenext API
- ADMIN_EMAIL and ADMIN_PASSWORD stored in .env (plain text, no hashing)

### 5.3 Helper Functions

**`safeUser(user)`**: Returns sanitized user object (no password fields, just data)

**`getSecret(name, fallbackName)`**: Retrieves env var with fallback, throws if missing

---

## 6. OTP Provider

**File**: src/lib/auth/otpProvider.js

### Current Implementation

**Status**: MOCK PROVIDER ONLY (production provider not implemented)

**Configuration**:
- `OTP_PROVIDER`: Name of provider ("mock" is only supported)
- `OTP_MOCK_ENABLED`: "true" to enable mock OTP
- `OTP_API_KEY`: Unused in current implementation
- `NODE_ENV`: Must not be "production" for mock to work

### Mock OTP Behavior

**sendOtp(phone)**:
- Generates 6-digit random OTP
- Hashes OTP using HMAC-SHA256(phone:otp, AUTH_SECRET)
- Stores in OtpVerification collection with 10-minute TTL
- Returns `{ provider: "mock", expiresAt, devOtp }`

**verifyOtp(phone, otp)**:
- Finds latest OtpVerification record for phone (unconsumed, not expired)
- Checks attempts < MAX_ATTEMPTS (5)
- Hashes provided OTP and compares to stored hash
- Increments attempts
- On match: Sets consumedAt timestamp, returns `{ verified: true }`
- On mismatch: Increments attempts, returns `{ verified: false, reason: "Invalid OTP" }`
- Expired/missing: Returns `{ verified: false, reason: "OTP expired or not found" }`
- Too many attempts: Returns `{ verified: false, reason: "Too many OTP attempts" }`

### Production Status

**UNVERIFIED**: Code path for non-mock providers exists (`throw new Error(...)`) but no real provider SDK is integrated. To use production OTP:
1. Select OTP provider (Twilio, AWS SNS, etc.)
2. Implement sendOtp() and verifyOtp() for that provider
3. Set OTP_PROVIDER env var accordingly
4. Ensure OTP_MOCK_ENABLED is "false"

---

## 7. Product API and Serialization

### 7.1 Product Serialization

**File**: src/lib/api/products.js

**Function**: `serializeProduct(product, { includeCostPrice = false })`

**Public Serialization** (includeCostPrice: false):
```javascript
{
  id: string,
  _id: string,
  name: string,
  slug: string,
  category: string,
  shortDescription: string,
  description: string,
  images: [{ url, publicId, alt }],
  fragranceProfile: string,
  personality: string,
  positioning: string,
  bestFor: [string],
  bestSeason: [string],
  fragranceNotes: { top: [string], heart: [string], base: [string] },
  variants: [
    {
      size: "10 ML"|"50 ML",
      sellingPrice: number,
      mrp: number,
      stock: number,
      sku: string
      // NO costPrice
    }
  ],
  faq: [{ question, answer }],
  legalInformation: { ingredients, caution },
  featured: boolean,
  bestseller: boolean,
  status: "draft"|"published",
  createdAt: iso-date,
  updatedAt: iso-date
}
```

**Admin Serialization** (includeCostPrice: true):
- Same as above PLUS `costPrice` in each variant

**Purpose of Separation**:
- Public APIs always call `serializeProduct(product)` (default false)
- Admin APIs call `serializeProduct(product, { includeCostPrice: true })`
- This enforces cost price privacy at serialization layer

### 7.2 Image Normalization

**Function**: `normalizeImage(image)`
- Accepts string URL or object with `{ url, secure_url }`
- Returns URL string or empty string

---

## 8. Order Creation and Checkout

### 8.1 Cart Calculation

**File**: src/lib/orders/pricing.js

**Function**: `calculateCart({ items = [], couponCode = "" })`

**Step-by-step Process**:

1. **Validate items array**: Must be non-empty array
   - Error if empty: `{ error: { code: "EMPTY_CART", status: 400 } }`

2. **Normalize each item**:
   ```javascript
   for each rawItem {
     productId = rawItem.productId || rawItem.id || rawItem._id
     size = rawItem.size
     quantity = toPositiveInteger(rawItem.quantity)
     
     // Validate item format
     if (!isObjectId(productId) || !size || quantity < 1) {
       stockIssues.push({ productId, size, quantity, reason: "INVALID_ITEM" })
       continue
     }
   }
   ```

3. **Verify each product exists and is published**:
   ```javascript
   product = Product.findOne({ _id: productId, status: "published" })
   if (!product) {
     stockIssues.push({ productId, size, quantity, reason: "PRODUCT_UNAVAILABLE" })
     continue
   }
   ```

4. **Verify variant exists**:
   ```javascript
   variant = product.variants.find(v => v.size === size)
   if (!variant) {
     stockIssues.push({ ..., reason: "VARIANT_UNAVAILABLE" })
     continue
   }
   ```

5. **Verify stock >= quantity**:
   ```javascript
   if (variant.stock < quantity) {
     stockIssues.push({ 
       ..., 
       availableStock: variant.stock, 
       reason: "INSUFFICIENT_STOCK" 
     })
     continue
   }
   ```

6. **Build normalized item**:
   ```javascript
   normalizedItems.push({
     productId: product._id,
     name: product.name,
     slug: product.slug,
     image: normalizeImage(product.images[0]),
     size: variant.size,
     quantity: quantity,
     unitPrice: variant.sellingPrice,
     mrp: variant.mrp,
     lineTotal: variant.sellingPrice * quantity
   })
   ```

7. **If ANY stock issue**: Return error with all issues
   ```javascript
   {
     error: {
       code: "STOCK_CHANGED",
       message: "Some cart items are no longer available...",
       status: 409,
       details: { items: stockIssues }
     }
   }
   ```

8. **Calculate subtotal**:
   ```javascript
   subtotal = sum of all lineTotal
   ```

9. **Apply coupon**:
   ```javascript
   couponResult = calculateCouponDiscount(couponCode, subtotal)
   if (couponResult.error) return { error: couponResult.error }
   discount = couponResult.discount || 0
   ```

10. **Calculate final amount**:
    ```javascript
    finalAmount = Math.max(0, Math.round((subtotal - discount) * 100) / 100)
    ```

11. **Return success**:
    ```javascript
    {
      items: [...normalized items...],
      subtotal: number,
      discount: number,
      finalAmount: number,
      coupon: { code, discount } | { code: null, discount: 0 }
    }
    ```

**Key Security Properties**:
- All product data re-fetched from DB (frontend cart NOT trusted)
- Variant prices and stock re-verified
- Stock status captured at calculation time (not at deduction time)
- Coupon re-validated (expiry, minimumOrder, active status)

### 8.2 Stock Deduction

**Function**: `deductStock(items)`

**Process**:
```javascript
for each item {
  updateOneResult = Product.updateOne(
    {
      _id: item.productId,
      variants: {
        $elemMatch: {
          size: item.size,
          stock: { $gte: item.quantity }
        }
      }
    },
    {
      $inc: { "variants.$.stock": -item.quantity }
    }
  )
  
  if (updateOneResult.modifiedCount !== 1) {
    changed.push({
      productId: item.productId,
      size: item.size,
      requestedQuantity: item.quantity
    })
  }
}

if (changed.length > 0) {
  error.code = "STOCK_CHANGED"
  error.items = changed
  throw error
}
```

**Why Atomic Update**:
- MongoDB atomic operator ($elemMatch + $inc) ensures race condition safety
- If stock changed between calculateCart and deductStock, modifiedCount === 0
- Error thrown, order NOT created, stock NOT deducted

**When Deduction Happens**:
- **COD**: Immediately after order creation (before Shiprocket)
- **Razorpay**: After signature verification (on verify endpoint)
- **Timing**: Stock deduction is the point of order commit

### 8.3 Coupon Discount Calculation

**Function**: `calculateCouponDiscount(code, subtotal)`

**Steps**:
1. Normalize code (uppercase)
2. Find coupon by code
3. Check coupon.active === true
4. Check expiryDate > now
5. Check subtotal >= coupon.minimumOrder
6. Calculate discount:
   - If percentage: `discount = (subtotal * couponValue) / 100`
   - If fixed: `discount = couponValue`
7. Cap discount at subtotal (cannot go negative)
8. Return `{ code, discount, coupon }`

**Error Cases**:
- COUPON_NOT_FOUND (404)
- COUPON_INACTIVE (400)
- COUPON_EXPIRED (400)
- COUPON_MINIMUM_ORDER (422)

### 8.4 Address Validation

**Function**: `validateAddress(address)`

**Required Fields**: fullName, addressLine, city, state, pincode
**Pincode**: Must be 6 digits
**Email**: Must be valid if provided

**Returns**: `{ valid: true }` or `{ valid: false, message: string }`

### 8.5 Order Number Generation

**Function**: `generateOrderNumber()`

**Format**: `ORD-YYYYMMDD-RANDOM`
- Example: `ORD-20250817-ABC123`
- Date part: 8 digits (YYYYMMDD)
- Random part: 6 uppercase alphanumeric characters

---

## 9. Coupon System

**Model**: Coupon.js (documented in Models section)

**Validation Routes**:
- POST /api/coupons/validate (public, calls calculateCart internally)
- Admin routes: GET/POST/PATCH/DELETE /api/admin/coupons

**Admin Coupon Creation**:
- code: 3-30 chars, unique, pattern /^[A-Z0-9_-]+$/
- discountType: "percentage" or "fixed"
- discountValue: > 0, if percentage then <= 100
- minimumOrder: >= 0 (default 0)
- expiryDate: future date required
- active: boolean (default true)

**Calculation**:
- Percentage applied: `discount = (subtotal * discountValue) / 100`
- Fixed amount: `discount = discountValue`
- Discount capped at subtotal

**Revalidation on Checkout**:
- Every checkout request recalculates coupon from fresh Coupon DB record
- Frontend coupon state NOT trusted
- Prevents stale/expired coupons from being applied

---

## 10. Review System

### 10.1 Review Creation

**Route**: POST /api/reviews (customer authenticated)

**Constraints**:
- One review per user per product (unique index enforced)
- Rating 1-5 required
- Text required (max 2000 chars)
- Title optional (max 100 chars)
- Max 2 photos
- approved: false by default
- verifiedPurchase: computed from Order history

**Verified Purchase Logic**:

**Function**: `hasVerifiedPurchase(userId, productId)`
```javascript
order = Order.findOne({
  user: userId,
  "items.productId": productId,
  orderStatus: { $in: ["confirmed", "processing", "shipped", "delivered"] },
  "payment.paymentStatus": { $in: ["paid", "cod"] }
})
return Boolean(order)
```

**Meaning**: User has completed a paid order containing the product

### 10.2 Review Moderation

**Admin Routes**:
- GET /api/admin/reviews (filter by productId, rating, approved status, search)
- PATCH /api/admin/reviews/[reviewId] (update approved status)
- DELETE /api/admin/reviews/[reviewId] (hard delete)

**Customer Visibility**:
- Public GET /api/reviews/product/[productId] shows only approved: true
- Customer own review (GET /api/reviews) shows regardless of approval
- Approved breakdown returned for product (1-5 star counts)

### 10.3 Review Rating Aggregation

**Function**: `getReviewStats(productId)`

**Process**:
```javascript
reviews = Review.aggregate([
  { $match: { product: productId, approved: true } },
  { $group: { _id: "$rating", count: { $sum: 1 } } }
])

breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
total = 0
weighted = 0

for each row {
  breakdown[row._id] = row.count
  total += row.count
  weighted += row._id * row.count
}

average = total ? (weighted / total).toFixed(1) : 0

return { average, count: total, breakdown }
```

**Used in**:
- GET /api/products (attaches rating to each product)
- GET /api/products/[id]
- GET /api/reviews/product/[productId] (returned with reviews)
- Admin dashboard (not shown per-product, just aggregated counts)

---

## 11. Razorpay Integration

**File**: src/lib/payments/razorpay.js

### 11.1 Razorpay Order Creation

**Function**: `createRazorpayOrder({ amount, receipt, notes })`

**Details**:
- amount: in rupees, converted to paise (rupees * 100)
- receipt: internal order _id
- notes: metadata object
- Returns: Razorpay order object with `.id`, `.amount`, `.currency`

**Configuration**:
- RAZORPAY_KEY_ID (public key)
- RAZORPAY_KEY_SECRET (private key, server-only)
- Razorpay npm package initialized lazily on first call

### 11.2 Razorpay Signature Verification

**Function**: `verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })`

**HMAC Verification**:
```javascript
body = `${razorpayOrderId}|${razorpayPaymentId}`
expectedSignature = HMAC-SHA256(body, RAZORPAY_KEY_SECRET)

// Constant-time comparison (timing-safe)
return timingSafeEqual(expectedSignature, received)
```

**Returns**: boolean

**Why Timing-Safe**: Prevents timing attacks on signature bytes

### 11.3 Checkout Flow

1. **Create Order**:
   - Route: POST /api/checkout/razorpay/create
   - Server calculates cart, creates Razorpay order
   - Returns razorpay.keyId (public) and razorpay.orderId to client

2. **Customer Pays**:
   - Client opens Razorpay popup with keyId and orderId
   - Customer completes payment
   - Razorpay returns razorpay_order_id, razorpay_payment_id, razorpay_signature

3. **Verify & Complete**:
   - Route: POST /api/checkout/razorpay/verify
   - Server verifies HMAC signature
   - Deducts stock
   - Marks order as paid
   - Creates Shiprocket order

### 11.4 Idempotency

If verify is called twice for same order with paymentStatus already "paid":
- Returns success with `idempotent: true`
- Does NOT deduct stock again
- Does NOT re-create Shiprocket order

---

## 12. Shiprocket Integration

**File**: src/lib/shipping/shiprocket.js

### 12.1 Authentication

**Token Retrieval**:
```javascript
POST https://apiv2.shiprocket.in/v1/external/auth/login
body: { email, password }
response: { token, ... }
```

**Credentials**:
- SHIPROCKET_EMAIL
- SHIPROCKET_PASSWORD

**Token Caching**:
- Cached globally with 9-day expiry
- Refreshed only if < 1 minute remaining
- Reduces auth calls

### 12.2 Serviceability Check

**Function**: `checkServiceability({ deliveryPincode, cod })`

**API Call**:
```javascript
GET https://apiv2.shiprocket.in/v1/external/courier/serviceability/?
  pickup_postcode={SHIPROCKET_PICKUP_PINCODE}
  delivery_postcode={deliveryPincode}
  cod={0|1}
  weight=0.5
```

**Response**:
- If serviceable: `{ serviceable: true, code: "SERVICEABLE", couriers: [...] }`
- If not serviceable: `{ serviceable: false, code: "UNSERVICEABLE", message: "..." }`
- If invalid pincode: `{ serviceable: false, code: "INVALID_PINCODE", message: "..." }`

**Used in**: POST /api/shipping/serviceability (public, no auth)

### 12.3 Order Creation

**Function**: `createShiprocketOrder(order)`

**API Call**:
```javascript
POST https://apiv2.shiprocket.in/v1/external/orders/create/adhoc
body: {
  order_id: order.orderNumber,
  order_date: ISO_DATE,
  pickup_location: SHIPROCKET_PICKUP_LOCATION || "Primary",
  billing_customer_name: order.deliveryAddress.fullName,
  billing_address: order.deliveryAddress.addressLine,
  billing_city: order.deliveryAddress.city,
  billing_pincode: order.deliveryAddress.pincode,
  billing_state: order.deliveryAddress.state,
  billing_country: "India",
  billing_email: order.customer.email || order.deliveryAddress.email || "customer@example.com",
  billing_phone: order.customer.phone,
  shipping_is_billing: true,
  order_items: [
    {
      name: "${productName} ${size}",
      sku: "${productId}-${size}",
      units: quantity,
      selling_price: unitPrice
    }
  ],
  payment_method: "COD"|"Prepaid" (based on order.payment.method),
  sub_total: order.amounts.finalAmount,
  length: 10,
  breadth: 10,
  height: 10,
  weight: 0.5
}
```

**Response** (on success):
```javascript
{
  shiprocket_order_id: string,
  order_id: string,
  shipment_id: string,
  awb_code: string,
  courier_name: string,
  tracking_url: string,
  status: string
}
```

**Stored in Order**:
```javascript
order.shiprocket = {
  shiprocketOrderId: shiprocketOrderId,
  shipmentId: shipmentId,
  awbCode: awbCode,
  courierName: courierName,
  trackingUrl: trackingUrl,
  shipmentStatus: status,
  syncStatus: "created"
}
```

### 12.4 Tracking

**Function**: `getTrackingByAwb(awbCode)`

**API Call**:
```javascript
GET https://apiv2.shiprocket.in/v1/external/courier/track/awb/{awbCode}
```

**Response**: Full Shiprocket tracking object (status, location, updates, etc.)

**Used in**: GET /api/shipping/tracking (authenticated customer)

### 12.5 Order Status Sync


**Process**:
1. Find orders with awbCode and orderStatus in ["confirmed", "processing", "shipped"]
2. For each order, call getTrackingByAwb(awbCode)
3. Extract shipment status from tracking response
4. Update order.shiprocket.shipmentStatus
5. Return counts and errors

**Status Mapping** (from Shiprocket response):
- `tracking_data.shipment_track[0].current_status` or
- `tracking_data.track_status`

### 12.6 Failure Handling

**In COD/Razorpay checkout**:
- If Shiprocket call fails, order is still created
- Shiprocket error stored in `order.shiprocket.lastError`
- syncStatus set to "failed" or "not_configured"
- Order proceeds without logistics initially
- Admin can manually sync or retry

---

## 13. Cloudinary Integration

**File**: src/lib/cloudinary/server.js

### 13.1 Configuration

**Environment Variables**:
- CLOUDINARY_CLOUD_NAME (public)
- CLOUDINARY_API_KEY (public)
- CLOUDINARY_API_SECRET (server-only, secret)

**Initialization**:
```javascript
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
})
```

### 13.2 Upload Signature Generation

**Route**: POST /api/upload/cloudinary-signature (admin authenticated)

**Function**: `createUploadSignature(params)`

**Process**:
1. Generate timestamp (unix seconds)
2. Select folder ("products" or "reviews", default "products")
3. Sign params: `{ timestamp, folder }`
4. Return signature, timestamp, folder, cloudName, apiKey (public)

**Client Side**:
- Admin browser receives signature + timestamp + folder
- Sends image directly to Cloudinary using signature (no server proxying)
- Cloudinary validates signature server-side
- Returns public_id and secure_url to client
- Client stores URL + publicId in Product/Review

**Why Unsigned Upload with Signature**:
- Admin uploads directly to Cloudinary (offloads server bandwidth)
- Server validates request via JWT auth (route is protected)
- Server provides signature (Cloudinary re-validates)
- Server never sees image bytes

---

## 14. Admin API Routes

Already documented in section 2.3. Key points:

**Auth**: All require `requireAdmin()` (admin_session JWT cookie)

**CORS**: All apply `applyAdminCors()` from ADMIN_ALLOWED_ORIGINS

**Routes**:
- Auth: login, me, logout
- Dashboard: GET (KPIs, recent orders, low stock)
- Products: GET/POST/PATCH/DELETE (CRUD with cost price exposure)
- Orders: GET (filtered), PATCH (status update)
- Users: GET (search, pagination), PATCH (status)
- Reviews: GET (search, approval filter), PATCH, DELETE
- Coupons: GET/POST/PATCH/DELETE
- Upload: POST (Cloudinary signature)

---

## 15. CORS and Security

**File**: src/lib/api/cors.js

### 15.1 Admin CORS Configuration

**Function**: `getAllowedAdminOrigins()`
- Reads ADMIN_ALLOWED_ORIGINS env var
- Splits on comma, trims whitespace
- Returns array of allowed origins

**Default** (from .env.example):
```
ADMIN_ALLOWED_ORIGINS=http://localhost:3001
```

**Deployed Admin** (redlineadmin):
- Must add https://greenvalleynaturalsadmin.vercel.app to ADMIN_ALLOWED_ORIGINS
- Comma-separated list in env var

### 15.2 CORS Headers Applied

**Function**: `applyAdminCors(request, response)`

```javascript
if (origin in allowedOrigins) {
  response.setHeader("Access-Control-Allow-Origin", origin)
  response.setHeader("Access-Control-Allow-Credentials", "true")
  response.setHeader("Vary", "Origin")
}
response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization")
```

### 15.3 Preflight Handling

**Function**: `adminPreflight(request)` for OPTIONS handlers

```javascript
return applyAdminCors(request, new NextResponse(null, { status: 204 }))
```

All admin routes declare OPTIONS handler that calls adminPreflight.

### 15.4 Customer CORS (Implicit Same-Origin)

- Customer APIs (checkout, orders, etc.) use same-origin credentials
- No explicit CORS headers needed (Next.js same-origin by default)
- Authorization via cookie (customer_session)

---

## 16. Environment Variables Map

| Env Var | Used In | Purpose | Server/Client | Secret? | Required/Opt | Dev Value |
|---------|---------|---------|---------------|---------|---|---|
| MONGODB_URI | lib/db.js | MongoDB connection string | Server | YES | Required | mongo://localhost/greenvalley |
| AUTH_SECRET | lib/auth/session.js, lib/auth/otpProvider.js | JWT signing secret, OTP hash secret | Server | YES | Required | dev-secret |
| ADMIN_AUTH_SECRET | lib/auth/session.js | Admin JWT signing secret | Server | YES | Optional (fallback: AUTH_SECRET) | same as AUTH_SECRET |
| ADMIN_EMAIL | app/api/admin/auth/login/route.js | Admin login email | Server | NO | Required if admin enabled | admin@example.com |
| ADMIN_PASSWORD | app/api/admin/auth/login/route.js | Admin login password (plaintext) | Server | YES | Required if admin enabled | password123 |
| ADMIN_ALLOWED_ORIGINS | lib/api/cors.js | CORS origins for admin API | Server | NO | Optional | http://localhost:3001 |
| RAZORPAY_KEY_ID | lib/payments/razorpay.js, app/api/checkout/razorpay/create/route.js | Razorpay public key | Server (exposed to client) | NO | Optional (if Razorpay enabled) | rzp_test_XXXX |
| RAZORPAY_KEY_SECRET | lib/payments/razorpay.js | Razorpay private key | Server | YES | Optional (if Razorpay enabled) | rzp_test_secret_XXXX |
| SHIPROCKET_EMAIL | lib/shipping/shiprocket.js | Shiprocket login email | Server | YES | Optional (if Shiprocket enabled) | email@example.com |
| SHIPROCKET_PASSWORD | lib/shipping/shiprocket.js | Shiprocket login password | Server | YES | Optional (if Shiprocket enabled) | password123 |
| SHIPROCKET_PICKUP_PINCODE | lib/shipping/shiprocket.js | Store/warehouse pincode | Server | NO | Optional (if Shiprocket enabled) | 110001 |
| SHIPROCKET_PICKUP_LOCATION | lib/shipping/shiprocket.js | Shiprocket pickup location name | Server | NO | Optional | Primary |
| CLOUDINARY_CLOUD_NAME | lib/cloudinary/server.js | Cloudinary public cloud name | Both (Server & Client) | NO | Optional (if Cloudinary enabled) | my-cloud |
| CLOUDINARY_API_KEY | lib/cloudinary/server.js | Cloudinary public API key | Both | NO | Optional | XXXX |
| CLOUDINARY_API_SECRET | lib/cloudinary/server.js | Cloudinary secret API key | Server | YES | Optional | XXXX |
| OTP_PROVIDER | lib/auth/otpProvider.js | OTP provider name | Server | NO | Optional | mock |
| OTP_MOCK_ENABLED | lib/auth/otpProvider.js | Enable mock OTP | Server | NO | Optional | true |
| OTP_API_KEY | lib/auth/otpProvider.js | OTP provider API key | Server | YES | Optional | XXXX |
| NODE_ENV | Multiple | Environment (production\|development) | Server | NO | Set by framework | development |
| NEXT_PUBLIC_EMAILJS_USER | app/(customer)/contact/page.jsx | EmailJS public user ID | Client | NO | Optional | XXXX |
| NEXT_PUBLIC_EMAILJS_SERVICE | app/(customer)/contact/page.jsx | EmailJS service ID | Client | NO | Optional | service_XXXX |
| NEXT_PUBLIC_EMAILJS_TEMPLATE | app/(customer)/contact/page.jsx | EmailJS template ID | Client | NO | Optional | template_XXXX |
| NEXT_PUBLIC_API_URL | components/CouponInput.jsx | Frontend API base URL | Client | NO | Optional | http://localhost:3000 |

---

## 17. Security Boundaries

### 17.1 Server-Only Secrets

Never exposed to client (JavaScript cannot access):

- MONGODB_URI
- AUTH_SECRET
- ADMIN_AUTH_SECRET
- ADMIN_PASSWORD
- RAZORPAY_KEY_SECRET
- SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD
- CLOUDINARY_API_SECRET
- OTP_API_KEY
- Customer session JWT payload (in HttpOnly cookie)
- Admin session JWT payload (in HttpOnly cookie)

### 17.2 Client-Exposed Public IDs

Safe to embed in frontend code:

- RAZORPAY_KEY_ID (returned in /api/checkout/razorpay/create)
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY (used by Cloudinary JS SDK)
- NEXT_PUBLIC_* environment variables

### 17.3 Security Checks

**Product Cost Price**:
- Stored in Product.variants[].costPrice
- Private model field
- Only exposed when `serializeProduct(..., { includeCostPrice: true })`
- Admin routes use this flag; customer routes never do

**Admin Credentials**:
- Stored in ADMIN_EMAIL and ADMIN_PASSWORD (env vars, plaintext)
- No hashing (acceptable for single admin account)
- Credential check is string comparison only
- Session validated via JWT

**User Passwords**:
- No password field in User model (OTP-only auth)
- No password storage

**Order Snapshots**:
- Item prices stored at order time (immutable)
- Prevents retroactive price manipulation

**Stock Deduction**:
- Atomic MongoDB operation (prevents race conditions)
- Fails if stock changed (returned to client)

---

## 18. API Response Format

**File**: src/lib/api/response.js

### 18.1 Success Response

```javascript
function success(data = null, status = 200, init = {})

// Returns:
{
  success: true,
  data: {...}
}
// HTTP Status: 200 (or specified status)
```

### 18.2 Failure Response

```javascript
function failure(code, message, status = 500, details = undefined, init = {})

// Returns:
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details: {...optional...}
  }
}
// HTTP Status: specified status
```

### 18.3 Common Patterns

**No Data**:
```javascript
return success() // { success: true, data: null }
```

**With Details**:
```javascript
return failure("STOCK_CHANGED", "Stock changed", 409, { items: [...] })
```

**No Store Headers** (for caching prevention):
```javascript
return success(data, 200, { headers: noStoreHeaders })
// Adds: Cache-Control: no-store, Pragma: no-cache, Expires: 0
```

---

## 19. Error Codes Reference

| Code | HTTP Status | Meaning | Where Thrown |
|------|-------------|---------|---|
| INVALID_PHONE | 400 | Phone not 10-digit Indian format | send-otp, verify-otp |
| OTP_SEND_FAILED | 500 | OTP provider error | send-otp |
| INVALID_OTP | 400 | OTP format invalid (not 4-8 digits) | verify-otp |
| OTP_VERIFICATION_FAILED | 401 | OTP mismatch or expired | verify-otp |
| USER_SUSPENDED | 403 | User account suspended | verify-otp, requireUser |
| UNAUTHENTICATED | 401 | No valid session/token | requireUser, requireAdmin |
| FORBIDDEN | 403 | Access denied (admin only, etc.) | requireAdmin |
| INVALID_PRODUCT_ID | 400 | ObjectId invalid format | products/[id], reviews |
| PRODUCT_NOT_FOUND | 404 | Product not found | products/[id], slug/[slug] |
| INVALID_CATEGORY | 400 | Category not in enum | /api/products |
| EMPTY_CART | 400 | Cart items array empty | calculateCart |
| STOCK_CHANGED | 409 | Stock unavailable (see details) | calculateCart, deductStock |
| INVALID_ADDRESS | 400 | Address missing required fields | checkout routes |
| COUPON_NOT_FOUND | 404 | Coupon code not found | calculateCouponDiscount |
| COUPON_INACTIVE | 400 | Coupon disabled | calculateCouponDiscount |
| COUPON_EXPIRED | 400 | Coupon past expiry date | calculateCouponDiscount |
| COUPON_MINIMUM_ORDER | 422 | Order below minimum | calculateCouponDiscount |
| COD_CHECKOUT_FAILED | 500 | Unexpected error | /api/checkout/cod |
| RAZORPAY_CREATE_FAILED | 500 | Razorpay order creation failed | /api/checkout/razorpay/create |
| RAZORPAY_VERIFY_FAILED | 500 | Razorpay verification error | /api/checkout/razorpay/verify |
| ORDER_NOT_FOUND | 404 | Order not found or not owned by user | orders/[orderId], shipping/tracking |
| PAYMENT_MISMATCH | 400 | Razorpay order ID mismatch | razorpay/verify |
| PAYMENT_VERIFICATION_FAILED | 400 | HMAC signature invalid | razorpay/verify |
| SHIPPING_NOT_CONFIGURED | 503 | Shiprocket credentials missing | shipping/serviceability |
| SHIPROCKET_TEMPORARY_ERROR | 503 | Shiprocket API error | shipping routes |
| INVALID_PINCODE | 400 | Pincode not 6 digits | shipping/serviceability |
| INVALID_REVIEW_ID | 400 | ReviewId invalid ObjectId | reviews/[reviewId] |
| REVIEW_NOT_FOUND | 404 | Review not found | reviews/[reviewId] |
| REVIEW_EXISTS | 409 | User already reviewed this product | POST /api/reviews |
| INVALID_RATING | 400 | Rating not 1-5 | reviews |
| INVALID_REVIEW | 400 | Review text required/missing | reviews |
| REVIEW_LOOKUP_FAILED | 500 | DB error | reviews |
| REVIEW_CREATE_FAILED | 500 | DB error | reviews |
| REVIEW_UPDATE_FAILED | 500 | DB error | reviews |
| REVIEW_DELETE_FAILED | 500 | DB error | reviews |
| TRACKING_FAILED | 500 | Tracking lookup error | shipping/tracking |
| INVALID_CREDENTIALS | 401 | Admin email/password wrong | admin/auth/login |
| CONFIGURATION_ERROR | 503 | Env var missing | admin/auth/*, db.js |
| CLOUDINARY_NOT_CONFIGURED | 503 | Cloudinary env vars missing | upload/cloudinary-signature |
| CLOUDINARY_SIGNATURE_FAILED | 500 | Signature generation error | upload/cloudinary-signature |
| VALIDATION_ERROR | 400 | Request validation failed | admin routes |
| DUPLICATE_VALUE | 409 | Unique constraint violation | admin routes (coupon code, etc.) |
| INTERNAL_ERROR | 500 | Unexpected error | handleRouteError default |

---

## 20. Shared Helpers and Utilities

### 20.1 Validation Helpers

**File**: src/lib/validation.js

| Function | Purpose | Returns |
|----------|---------|---------|
| isObjectId(value) | Valid MongoDB ObjectId | boolean |
| cleanString(value, maxLength) | Trim and slice string | string |
| isValidPhone(value) | Indian 10-digit format (/^[6-9]\d{9}$/) | boolean |
| isValidEmail(value) | Basic email format | boolean |
| isValidPincode(value) | 6-digit Indian pincode (/^\d{6}$/) | boolean |
| normalizePhone(value) | Remove non-digits, take last 10 | string |
| normalizeCouponCode(value) | Trim, uppercase, slice to 30 | string |
| normalizeBoolean(value, default) | "true", "1", "yes" → true | boolean |
| slugify(value) | lowercase, replace non-alphanumeric with dash | string |
| validateCategory(category) | Must be Men\|Women\|Unisex | boolean |
| validateVariantSize(size) | Must be 10 ML\|50 ML | boolean |
| toPositiveNumber(value, fallback) | Parse number, min 0 | number |
| toPositiveInteger(value, fallback) | Parse int, floor, min 0 | number |

### 20.2 Response Helpers

**File**: src/lib/api/response.js

| Function | Purpose |
|----------|---------|
| success(data, status, init) | Build success response |
| failure(code, message, status, details, init) | Build failure response |
| handleRouteError(error, fallbackCode) | Normalize error → failure response |
| readJson(request) | Parse request body JSON safely |
| noStoreHeaders | Object with cache-prevention headers |

### 20.3 Database Helpers

**File**: src/lib/db.js

| Function | Purpose |
|----------|---------|
| connectDB() | Get Mongoose connection (cached) |

---

## 22. Data Flow Diagrams

### 22.1 Product Catalog Flow

```
MongoDB Product
  ↓
Product.find({ status: "published" }) [customer APIs]
Product.findOne({ status: "published" }) [by ID or slug]
  ↓
serializeProduct(product) [costPrice: false]
  ↓
JSON response with:
  - name, slug, category
  - images (url, publicId, alt)
  - variants: [size, sellingPrice, mrp, stock, sku] (NO costPrice)
  - fragranceNotes, FAQ, legal info
  ↓
Customer view: product page, cart, collection
```

### 22.2 OTP Authentication Flow

```
Customer enters phone
  ↓
POST /api/auth/send-otp
  ↓
Validate phone (10-digit Indian format)
  ↓
OTP Provider (mock):
  1. Generate 6-digit OTP
  2. Hash with HMAC-SHA256(phone:otp, AUTH_SECRET)
  3. Store in OtpVerification collection (10-min TTL)
  ↓
Return to customer: { devOtp (in dev), expiresAt }
  ↓
Customer enters OTP
  ↓
POST /api/auth/verify-otp
  ↓
Verify OTP hash against stored record
  ↓
User.findOne({ phone }) or User.create()
Set phoneVerified: true
  ↓
Generate customer_session JWT (30-day)
Set HttpOnly cookie
  ↓
Return authenticated user object
  ↓
Customer logged in for checkout, orders, reviews
```

### 22.3 Cart → Order → Stock → Shipping Flow (COD)

```
Customer adds items to localStorage cart
  ↓
Frontend sends items to POST /api/checkout/cod
  ↓
Server-side calculateCart():
  1. Fetch fresh Product records for each item
  2. Verify variant exists and stock >= quantity
  3. Calculate line totals (sellingPrice * quantity)
  4. Calculate coupon discount
  5. Return server-calculated subtotal, discount, total
  ↓
Frontend trusts server total (own cart total discarded)
  ↓
Order.create():
  - Store order number (ORD-YYYYMMDD-RANDOM)
  - Snapshot items with name, price, size, quantity
  - Store delivery address
  - Store coupon code applied
  ↓
deductStock():
  Atomic MongoDB: $elemMatch variant.size, $inc stock by -quantity
  If updateOne.modifiedCount !== 1 → STOCK_CHANGED error (409)
  ↓
createShiprocketOrder():
  POST to Shiprocket with order details
  Store awbCode, shipmentId, trackingUrl
  syncStatus = "created" | "failed" | "not_configured"
  ↓
Response to customer:
  - Order object with orderNumber
  - Shiprocket tracking available
  ↓
Admin can see order in dashboard
```

### 22.4 Cart → Order → Razorpay → Stock → Shipping Flow

```
POST /api/checkout/razorpay/create
  ↓
Server calculateCart() (same as COD)
  ↓
Order.create() with paymentStatus: "pending" (NOT "paid")
  ↓
createRazorpayOrder():
  - Convert amount to paise
  - Return razorpay.orderId and RAZORPAY_KEY_ID
  ↓
Return to client: {
  orderId (internal MongoDB ID),
  orderNumber,
  razorpay: { keyId, orderId, amount, currency }
}
  ↓
Frontend opens Razorpay popup:
  - Customer pays
  - Razorpay returns: razorpay_order_id, razorpay_payment_id, razorpay_signature
  ↓
POST /api/checkout/razorpay/verify
  ↓
Verify HMAC signature: SHA256(razorpay_order_id|razorpay_payment_id)
  ↓
If idempotent (already paid): return success with flag
  ↓
deductStock() (FIRST TIME):
  Atomic deduction
  If STOCK_CHANGED error → return 409, order incomplete
  ↓
Set payment.paymentStatus = "paid"
Store razorpay_payment_id, razorpay_signature
  ↓
createShiprocketOrder() (best effort)
  ↓
Response to customer: order with tracking
```

### 22.5 Admin Product Creation

```
Admin calls: POST /api/admin/products
  ↓
Admin auth validated (admin_session JWT cookie)
  ↓
Request body parsed:
  name, slug, category, description
  images: [{url, publicId, alt}]
  variants: [{size, sellingPrice, mrp, costPrice, stock, sku}]
  fragranceNotes, FAQ, legal info
  featured, bestseller, status (draft|published)
  ↓
buildProductPayload():
  1. Validate category (Men|Women|Unisex)
  2. Normalize slug (or generate from name)
  3. Validate at least 1 variant
  4. Variant sizes must be unique 10 ML and/or 50 ML
  5. All prices > 0
  6. Normalize and limit text fields
  ↓
Product.create()
  ↓
Response: created product with costPrice exposed
  ↓
Product appears in:
  - Customer GET /api/products (if status: published)
  - Admin dashboard
  - Checkout calculations
```

### 22.6 Review Creation → Moderation → Public Display

```
Customer purchases product
  ↓
Customer POSTs review:
  POST /api/reviews
  body: { productId, rating 1-5, title, text, photos: [url, publicId] }
  ↓
Validate:
  - One review per user per product (unique index)
  - Rating 1-5
  - Text required (max 2000 chars)
  - Max 2 photos
  ↓
Calculate verifiedPurchase:
  Query: Order with this product, paid/cod status, not cancelled
  verifiedPurchase = Boolean(order found)
  ↓
Review.create():
  approved: false (requires admin)
  verifiedPurchase: computed value
  ↓
Admin sees review in GET /api/admin/reviews
  ↓
Admin PATCHes review to set approved: true
  ↓
Public GET /api/reviews/product/[productId] now returns review
  (with user firstName/lastName)
  ↓
Product rating aggregated:
  getReviewStats(productId):
    - Find approved: true reviews
    - Count per rating (1-5)
    - Average = sum(rating * count) / total count
  ↓
Average and breakdown displayed on product page
```

---

## 23. Source of Truth Index

| Data | Source of Truth | Updated When | Revalidation |
|------|-----------------|--------------|---|
| Products | MongoDB Product collection | Admin creates/updates | Every customer API call re-fetches |
| Product Stock | MongoDB Product.variants[].stock | deductStock() atomic operation | calculateCart() re-checks |
| Product Pricing | MongoDB Product.variants[].sellingPrice, .mrp, .costPrice | Admin sets | calculateCart() re-fetches and uses |
| Customer Auth | JWT in customer_session cookie | OTP verified | Every API call verifies JWT |
| Admin Auth | JWT in admin_session cookie | Admin login | Every admin API call verifies JWT |
| User Profile | MongoDB User collection | OTP verification, PATCH /api/auth/me | GET /api/auth/me reads fresh |
| Cart (Customer) | Browser localStorage (CartContext) | Customer adds/removes items | Server recalculates on checkout |
| Cart (Server) | None (ephemeral) | Checkout request | calculateCart() rebuilds from MongoDB |
| Coupon Validity | MongoDB Coupon collection | Admin creates/updates | calculateCouponDiscount() fresh lookup |
| Applied Coupon | MongoDB Order.coupon | Order creation | Cannot change after order |
| Order | MongoDB Order collection | Order.create() on checkout | Cannot change order items/amounts |
| Tracking | Shiprocket API (real-time) | Customer requests | GET /api/shipping/tracking fresh call |
| Reviews | MongoDB Review collection | User creates, admin approves | GET filters by approved status |
| Review Ratings | MongoDB Review.rating aggregated | getReviewStats() aggregation | Every product API call |

---

## 24. Where to Edit

| I Want to Change | File/Folder |
|------------------|--|
| **Product** | |
| Add/edit product field | src/models/Product.js |
| Change visible fields in customer API | src/lib/api/products.js (serializeProduct) |
| Exclude costPrice from public | src/lib/api/products.js (includeCostPrice flag) |
| Add product category | src/lib/validation.js (PRODUCT_CATEGORIES) |
| Add variant size | src/lib/validation.js (PRODUCT_VARIANT_SIZES) |
| **Stock** | |
| Change stock deduction logic | src/lib/orders/pricing.js (deductStock) |
| Change availability check | src/lib/orders/pricing.js (calculateCart) |
| **Customer Auth** | |
| Change phone validation | src/lib/validation.js (isValidPhone) |
| Change OTP expiry | src/lib/auth/otpProvider.js (OTP_TTL_MINUTES) |
| Change OTP provider | src/lib/auth/otpProvider.js (sendOtp, verifyOtp) |
| Change session TTL | src/lib/auth/session.js (SESSION_MAX_AGE_SECONDS) |
| Change session cookie name | src/lib/auth/session.js (USER_SESSION_COOKIE) |
| Add customer user field | src/models/User.js |
| **Admin Auth** | |
| Change admin credentials check | src/app/api/admin/auth/login/route.js |
| Change admin session TTL | src/lib/auth/session.js (ADMIN_SESSION_MAX_AGE_SECONDS) |
| **Checkout** | |
| Change cart calculation | src/lib/orders/pricing.js (calculateCart) |
| Change coupon discount logic | src/lib/orders/pricing.js (calculateCouponDiscount) |
| Change order number format | src/lib/orders/pricing.js (generateOrderNumber) |
| Change COD checkout flow | src/app/api/checkout/cod/route.js |
| Change Razorpay flow | src/app/api/checkout/razorpay/create/route.js + verify |
| **Payment** | |
| Change Razorpay init | src/lib/payments/razorpay.js |
| Change signature verification | src/lib/payments/razorpay.js (verifyRazorpaySignature) |
| **Shipping** | |
| Change serviceability check | src/lib/shipping/shiprocket.js (checkServiceability) |
| Change order creation payload | src/lib/shipping/shiprocket.js (createShiprocketOrder) |
| Change token caching | src/lib/shipping/shiprocket.js (tokenCache) |
| Add tracking logic | src/lib/shipping/shiprocket.js (getTrackingByAwb) |
| **Coupons** | |
| Add coupon field | src/models/Coupon.js |
| Change coupon validation rules | src/lib/orders/pricing.js (calculateCouponDiscount) |
| Change admin coupon creation | src/app/api/admin/coupons/route.js (buildCouponPayload) |
| **Reviews** | |
| Change review moderation | src/models/Review.js (approved field) |
| Add review field | src/models/Review.js |
| Change verified purchase logic | src/lib/orders/pricing.js (hasVerifiedPurchase) |
| Change review rating calculation | src/lib/orders/pricing.js (getReviewStats) |
| **Database** | |
| Change MongoDB connection | src/lib/db.js (connectDB) |
| Change connection pooling | src/lib/db.js (maxPoolSize, timeouts) |
| **CORS** | |
| Add admin origin | .env (ADMIN_ALLOWED_ORIGINS) |
| Change CORS logic | src/lib/api/cors.js (applyAdminCors) |
| **Error Handling** | |
| Add error code | src/lib/api/response.js + document in section 19 |
| Change error format | src/lib/api/response.js (failure function) |
| **Utilities** | |
| Add validation function | src/lib/validation.js |
| Change slug format | src/lib/validation.js (slugify) |
| **Cloudinary** | |
| Change upload folder | src/lib/cloudinary/server.js + route |
| Change signature params | src/lib/cloudinary/server.js (createUploadSignature) |

---

## 25. Active Backend File Tree

```text
redlinenext/src/
├── app/
│  ├── api/
│  │  ├── admin/
│  │  │  ├── auth/
│  │  │  │  ├── login/route.js
│  │  │  │  ├── me/route.js
│  │  │  │  └── logout/route.js
│  │  │  ├── dashboard/route.js
│  │  │  ├── products/
│  │  │  │  ├── route.js
│  │  │  │  └── [id]/route.js
│  │  │  ├── orders/
│  │  │  │  ├── route.js
│  │  │  │  └── [orderId]/route.js
│  │  │  ├── users/
│  │  │  │  ├── route.js
│  │  │  │  └── [userId]/route.js
│  │  │  ├── reviews/
│  │  │  │  ├── route.js
│  │  │  │  └── [reviewId]/route.js
│  │  │  └── coupons/
│  │  │     ├── route.js
│  │  │     └── [couponId]/route.js
│  │  ├── auth/
│  │  │  ├── send-otp/route.js
│  │  │  ├── verify-otp/route.js
│  │  │  ├── me/route.js
│  │  │  └── logout/route.js
│  │  ├── checkout/
│  │  │  └── razorpay/
│  │  │     ├── create/route.js
│  │  │     └── verify/route.js
│  │  │  └── cod/route.js
│  │  ├── coupons/
│  │  │  └── validate/route.js
│  │  ├── products/
│  │  │  ├── route.js
│  │  │  ├── [id]/route.js
│  │  │  └── slug/[slug]/route.js
│  │  ├── orders/
│  │  │  ├── my-orders/route.js
│  │  │  ├── route.js
│  │  │  └── [orderId]/route.js
│  │  ├── reviews/
│  │  │  ├── route.js
│  │  │  ├── [reviewId]/route.js
│  │  │  └── product/[productId]/route.js
│  │  ├── shipping/
│  │  │  ├── serviceability/route.js
│  │  │  └── tracking/route.js
│  │  ├── upload/
│  │  │  └── cloudinary-signature/route.js
│  │  ├── internal/
│  │  ├── health/
│  │  │  └── route.js
│  │  └── ...
│  └── ...
├── lib/
│  ├── api/
│  │  ├── response.js
│  │  ├── products.js
│  │  └── cors.js
│  ├── auth/
│  │  ├── session.js
│  │  └── otpProvider.js
│  ├── orders/
│  │  └── pricing.js
│  ├── payments/
│  │  └── razorpay.js
│  ├── shipping/
│  │  └── shiprocket.js
│  ├── cloudinary/
│  │  └── server.js
│  ├── clientApi.js
│  ├── db.js
│  ├── validation.js
│  └── ...
├── models/
│  ├── Product.js
│  ├── User.js
│  ├── Order.js
│  ├── Review.js
│  ├── Coupon.js
│  ├── OtpVerification.js
│  └── ...
├── components/
│  ├── ...customer UI...
│  └── ...
├── context/
│  ├── AuthContext.jsx
│  ├── CartContext.jsx
│  ├── CouponContext.jsx
│  └── NotificationContext.jsx
├── assets/
│  └── ...
├── utils/
│  └── ...
└── ...
```

---

## 26. Runtime Verification Status

| Component | Code | Build | Live | Status |
|-----------|------|-------|------|--------|
| **Database** | ✅ | ✅ | ❌ | SOURCE_VERIFIED, not tested against live DB |
| **OTP Mock** | ✅ | ✅ | ✅ | FULLY_VERIFIED |
| **OTP Real Provider** | ❌ | N/A | N/A | NOT_IMPLEMENTED |
| **Customer Auth (Cookie)** | ✅ | ✅ | ❌ | SOURCE_VERIFIED, assumes cookie jar works |
| **Admin Auth (Cookie)** | ✅ | ✅ | ❌ | SOURCE_VERIFIED |
| **Razorpay Create** | ✅ | ✅ | ❌ | SOURCE_VERIFIED, not tested against live Razorpay |
| **Razorpay Verify** | ✅ | ✅ | ❌ | SOURCE_VERIFIED |
| **Shiprocket Serviceability** | ✅ | ✅ | ❌ | SOURCE_VERIFIED, not tested against live API |
| **Shiprocket Order Creation** | ✅ | ✅ | ❌ | SOURCE_VERIFIED |
| **Shiprocket Tracking** | ✅ | ✅ | ❌ | SOURCE_VERIFIED |
| **Cloudinary Signature** | ✅ | ✅ | ❌ | SOURCE_VERIFIED, not tested end-to-end |
| **Product Stock Deduction** | ✅ | ✅ | ❌ | SOURCE_VERIFIED (atomic update) |
| **Admin CRUD** | ✅ | ✅ | ❌ | SOURCE_VERIFIED |
| **Reviews** | ✅ | ✅ | ❌ | SOURCE_VERIFIED |

### Status Legend
- **SOURCE_VERIFIED**: Code exists and is correct per source inspection
- **BUILD_VERIFIED**: npm run lint && npm run build passed
- **LIVE_VERIFIED**: Runtime tested against live service
- **LIVE_UNVERIFIED**: Code correct but live integration unknown
- **CODE_IMPLEMENTED**: Functional code exists
- **NOT_IMPLEMENTED**: Placeholder/stub only

---

## Summary

This document is a comprehensive audit of the active backend API layer in redlinenext. It is the source of truth for:

- Complete route tree (36 API endpoints)
- 6 Mongoose models with all fields and indexes
- Authentication flows (customer OTP + admin email/password)
- Cart and order calculation (server-authoritative)
- Payment integrations (Razorpay signature verification)
- Shipping logistics (Shiprocket)
- Media uploads (Cloudinary)
- Review moderation and aggregation
- Security boundaries and CORS
- Environment variables and configuration
- Error codes and response formats

All code has been verified against actual source files in the workspace. The build (lint + build) has passed. Live provider integrations remain UNVERIFIED pending actual runtime testing.

---

**Document Generated**: 2026-08-17
**Build Status**: PASS
**Source Files Inspected**: 36 route files + 6 models + 12 lib files
**Total Routes**: 36 public/authenticated/admin/internal
**Models**: Product, User, Order, Review, Coupon, OtpVerification
**External Services**: Razorpay, Shiprocket, Cloudinary, MongoDB

