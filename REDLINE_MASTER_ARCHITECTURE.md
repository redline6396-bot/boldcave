# REDLINE Master Architecture Guide

**Last Updated**: 2026-08-17
**Source**: PROJECT_ARCHITECTURE_PART_1 through PART_4 + workspace inspection
**Status**: CORRECTED - Reconciled against Part 1–4 architecture audits and the latest source inspection

> **Correction pass:** stale route/component names, cart persistence details, provider APIs, and admin dashboard routing from the first master draft have been reconciled. Deep implementation detail remains in Parts 1–4.

---

## 1. Project at a Glance

### Three Applications

The REDLINE monorepo contains three separate Next.js/Express applications:

| App | Purpose | Status | Tech | Key Feature |
|-----|---------|--------|------|---|
| **redlinenext** | Customer storefront + live API backend | 🟢 ACTIVE | Next.js 16 App Router | OTP auth, Razorpay checkout, MongoDB |
| **redlineadmin** | Admin dashboard for operations | 🟢 ACTIVE | Next.js 16 | Email/password login, CORS to redlinenext API |
| **redlineBackend** | Legacy Express service | 🔴 REFERENCE | Express + Firebase | Code reference only; not current runtime |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER JOURNEY                              │
├─────────────────┬──────────────────────┬─────────────────────────┤
│  Browser        │  redlinenext         │  Backend Services       │
│                 │  (Next.js 16)        │                         │
│  HomePage       │  ↓                   │                         │
│  ProductPage    │  Components          │                         │
│  Cart           │  AuthContext         │  ┌─────────────────┐   │
│  Checkout       │  CartContext         │  │  MongoDB        │   │
│  OTP            │  CouponContext       │  ├─────────────────┤   │
│  MyOrders       │  NotificationContext │  │  Razorpay       │   │
│  Review         │  ↓                   │  │  Shiprocket     │   │
│                 │  /api/products       │  │  Cloudinary     │   │
│                 │  /api/auth/send-otp  │  │  OTP Provider   │   │
│                 │  /api/checkout/cod   │  └─────────────────┘   │
│                 │  /api/checkout/rz    │                         │
│                 │  /api/orders         │                         │
│                 │  /api/reviews        │                         │
│                 │  /api/shipping       │                         │
│                 │  (36 total routes)   │                         │
└─────────────────┴──────────────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN JOURNEY                                 │
├──────────────────┬───────────────────────┬─────────────────────┤
│  Admin Browser   │  redlineadmin         │  redlinenext API    │
│                  │  (Next.js 16)         │  (/api/admin/*)     │
│  Dashboard       │  ↓                    │                     │
│  Products        │  Components           │  ┌───────────────┐ │
│  Orders          │  /admin/              │  │  Same MongoDB │ │
│  Users           │  /products            │  │  Same Auth    │ │
│  Coupons         │  /orders              │  │  Same Services│ │
│  Reviews         │  /users               │  └───────────────┘ │
│  Settings        │  /coupons             │                     │
│                  │  /reviews             │                     │
│                  │  ↓                    │                     │
│                  │  lib/api.js           │                     │
│                  │  NotificationContext  │                     │
└──────────────────┴───────────────────────┴─────────────────────┘

LEGACY (Reference only):
┌──────────────────────────────────────────────────────┐
│  redlineBackend (Express + Firebase auth patterns)   │
│  - Do not use as template for new work               │
│  - Useful as code reference only                     │
└──────────────────────────────────────────────────────┘
```

---

## 2. Complete Source-of-Truth Map

| Domain | Source of Truth | Main Files | Notes |
|--------|---|---|---|
| **Customer UI** | redlinenext/src/app + components | Part 1, Section 3-5 | Routes, pages, component tree |
| **Customer Auth** | OTP via redlinenext API | lib/auth/otpProvider.js, models/OtpVerification.js | Mock-only in dev; real provider not implemented |
| **Customer Session** | customer_session JWT cookie (30-day) | lib/auth/session.js, routes: auth/verify-otp | signUserSession(), setUserSessionCookie() |
| **Admin Auth** | Email/password in .env | app/api/admin/auth/login/route.js | Plain-text comparison; acceptable for single account |
| **Admin Session** | admin_session JWT cookie (8-hour) | lib/auth/session.js | signAdminSession(), requireAdmin() |
| **Cart** | Browser localStorage (`"perfume_cart"`) + CartContext | `src/context/CartContext.jsx`, `src/features/customer/cart/CartDrawer.jsx` | Device/browser-local; independent of auth; survives login/logout; cleared only after confirmed order success or an explicit cart clear |
| **Coupons** | MongoDB Coupon collection | models/Coupon.js, lib/orders/pricing.js | Revalidated on every checkout |
| **Products** | MongoDB Product collection | models/Product.js, app/api/products/* | Variants: ["10 ML", "50 ML"]; costPrice hidden from customer |
| **Stock** | Product.variants[].stock | lib/orders/pricing.js (deductStock) | Atomic MongoDB operation ($elemMatch + $inc) |
| **Orders** | MongoDB Order collection | models/Order.js, app/api/checkout/* | Snapshot items; server-authoritative calculation |
| **Addresses** | User.addresses array | models/User.js, app/api/auth/me | Max 10 per user; validated on PATCH |
| **Reviews** | MongoDB Review collection | models/Review.js, app/api/reviews/* | One per user/product; approved before public |
| **Razorpay** | Signature verification + state | lib/payments/razorpay.js, app/api/checkout/razorpay/* | HMAC-SHA256 verification; key pair in .env |
| **Shiprocket** | Token cache + order tracking | lib/shipping/shiprocket.js, app/api/shipping/* | 9-day token caching; serviceability API public |
| **Cloudinary** | Upload signature generation | lib/cloudinary/server.js, app/api/upload/* | Admin only; client uploads directly to Cloudinary |
| **OTP** | Mock OTP (prod not implemented) | lib/auth/otpProvider.js, models/OtpVerification.js | 10-min TTL; 5-attempt limit; HMAC-SHA256 hash |
| **Notifications** | Toast/alert messages | `src/context/NotificationContext.jsx`, `src/components/Notification.jsx` | Transient client UI state; timeout auto-clears |

---

## 3. Simplified Final Folder Tree

This tree intentionally shows the **current source-of-truth paths** and omits disconnected/legacy UI files from the active architecture map.

```text
REDLINE/
├─ redlinenext/                                  [ACTIVE CUSTOMER + ACTIVE API]
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ layout.jsx                           [provider/root layout]
│  │  │  ├─ (auth)/
│  │  │  │  └─ login/page.jsx                   [/login]
│  │  │  ├─ (customer)/
│  │  │  │  ├─ page.jsx                         [/]
│  │  │  │  ├─ about/page.jsx                   [/about]
│  │  │  │  ├─ cart/page.jsx                    [/cart]
│  │  │  │  ├─ collection/page.jsx              [/collection]
│  │  │  │  ├─ contact/page.jsx                 [/contact]
│  │  │  │  ├─ orders/page.jsx                  [/orders]
│  │  │  │  ├─ orders/[orderId]/page.jsx        [/orders/[orderId]]
│  │  │  │  ├─ place-order/page.jsx             [/place-order]
│  │  │  │  ├─ product/[slug]/page.jsx          [/product/[slug]]
│  │  │  │  └─ profile/page.jsx                 [/profile]
│  │  │  ├─ privacy/page.jsx                    [/privacy]
│  │  │  ├─ terms/page.jsx                      [/terms]
│  │  │  └─ api/                                [ACTIVE Next.js backend]
│  │  │     ├─ admin/
│  │  │     ├─ auth/
│  │  │     ├─ checkout/
│  │  │     ├─ coupons/
│  │  │     ├─ health/
│  │  │     ├─ internal/
│  │  │     ├─ orders/
│  │  │     ├─ products/
│  │  │     ├─ reviews/
│  │  │     ├─ shipping/
│  │  │     └─ upload/
│  │  │
│  │  ├─ components/
│  │  │  ├─ RootLayoutClient.jsx
│  │  │  ├─ Notification.jsx
│  │  │  ├─ layout/
│  │  │  │  ├─ AnnouncementBar.jsx
│  │  │  │  ├─ MainNavbar.jsx
│  │  │  │  └─ Footer.jsx
│  │  │  ├─ home/
│  │  │  │  ├─ HeroCarousel.jsx
│  │  │  │  ├─ CollectionSection.jsx
│  │  │  │  ├─ ForHimSection.jsx
│  │  │  │  ├─ OurStorySection.jsx
│  │  │  │  └─ ForHerSection.jsx
│  │  │  └─ product/
│  │  │     └─ ProductCard.jsx
│  │  │
│  │  ├─ context/
│  │  │  ├─ AuthContext.jsx
│  │  │  ├─ CartContext.jsx
│  │  │  ├─ CouponContext.jsx
│  │  │  └─ NotificationContext.jsx
│  │  │
│  │  ├─ features/customer/
│  │  │  ├─ account/AccountPage.jsx
│  │  │  ├─ auth/
│  │  │  │  ├─ AuthModal.jsx
│  │  │  │  └─ PhoneOtpForm.jsx
│  │  │  ├─ cart/CartDrawer.jsx
│  │  │  ├─ checkout/
│  │  │  │  ├─ CheckoutPage.jsx
│  │  │  │  ├─ DeliveryAddress.jsx
│  │  │  │  ├─ CouponSection.jsx
│  │  │  │  ├─ OrderSummary.jsx
│  │  │  │  └─ PaymentMethod.jsx
│  │  │  ├─ orders/
│  │  │  │  ├─ OrdersPage.jsx
│  │  │  │  ├─ OrderCard.jsx
│  │  │  │  ├─ OrderDetails.jsx
│  │  │  │  └─ TrackingInfo.jsx
│  │  │  └─ reviews/ProductReviews.jsx
│  │  │
│  │  ├─ lib/
│  │  │  ├─ clientApi.js
│  │  │  ├─ db.js
│  │  │  ├─ validation.js
│  │  │  ├─ api/
│  │  │  │  ├─ response.js
│  │  │  │  ├─ products.js
│  │  │  │  └─ cors.js
│  │  │  ├─ auth/
│  │  │  │  ├─ session.js
│  │  │  │  └─ otpProvider.js
│  │  │  ├─ orders/pricing.js
│  │  │  ├─ payments/razorpay.js
│  │  │  ├─ shipping/shiprocket.js
│  │  │  └─ cloudinary/server.js
│  │  │
│  │  └─ models/
│  │     ├─ Product.js
│  │     ├─ User.js
│  │     ├─ Order.js
│  │     ├─ Review.js
│  │     ├─ Coupon.js
│  │     └─ OtpVerification.js
│  └─ ...
│
├─ redlineadmin/                                 [ACTIVE ADMIN FRONTEND]
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ page.js                             [/ → /login]
│  │  │  ├─ login/page.jsx                      [/login]
│  │  │  ├─ admin/page.jsx                      [/admin, primary dashboard]
│  │  │  ├─ dashboard/page.jsx                  [/dashboard → /admin redirect]
│  │  │  ├─ add/page.jsx
│  │  │  ├─ edit/[id]/page.jsx
│  │  │  ├─ list/page.jsx
│  │  │  ├─ orders/page.jsx
│  │  │  ├─ users/page.jsx
│  │  │  ├─ reviews/page.jsx
│  │  │  └─ coupon/page.jsx
│  │  ├─ components/
│  │  │  ├─ LayoutWrapper.jsx
│  │  │  ├─ Navbar.jsx
│  │  │  ├─ Sidebar.jsx
│  │  │  └─ Notification.jsx
│  │  ├─ context/NotificationContext.jsx
│  │  ├─ features/admin/
│  │  │  ├─ coupons/
│  │  │  ├─ orders/
│  │  │  ├─ reviews/
│  │  │  └─ users/
│  │  └─ lib/api.js
│  └─ ...
│
├─ redlineBackend/                               [LEGACY / REFERENCE ONLY]
│  └─ Express + Firebase/JWT-era backend; not current runtime
│
├─ PROJECT_ARCHITECTURE_PART_1.md
├─ PROJECT_ARCHITECTURE_PART_2.md
├─ PROJECT_ARCHITECTURE_PART_3.md
├─ PROJECT_ARCHITECTURE_PART_4_ACTIVE_BACKEND.md
└─ REDLINE_MASTER_ARCHITECTURE_CORRECTED.md       [this corrected guide]
```

**Important:** files that still physically exist but are not in the active import/route graph are not shown above as source-of-truth components. Part 1 remains the deep reference for storefront component usage.

## 4. Customer User Journey

Complete active storefront flow, reconciled to Part 1 and Part 4:

| Step | UI Component/Page | Context Used | Client API / Action | Server Endpoint | Data / Service |
|------|---|---|---|---|---|
| **1. View Homepage** | `redlinenext/src/app/(customer)/page.jsx` → `HeroCarousel`, `CollectionSection`, `ForHimSection`, `OurStorySection`, `ForHerSection` | Global providers apply; no page-level auth dependency required | `fetchProducts()` inside `CollectionSection` | `GET /api/products` | Product model |
| **2. Browse Collection** | `redlinenext/src/app/(customer)/collection/page.jsx` | Product cards consume CartContext when adding | `fetchProducts({ category })` | `GET /api/products?category=...` | Published Product records |
| **3. View Product Details** | `redlinenext/src/app/(customer)/product/[slug]/page.jsx` + `ProductReviews` | `useCart`, `NotificationContext`; `ProductReviews` also uses `useAuth` | `fetchProductBySlug()`, `fetchProducts()`, review helpers | Product + review endpoints | Product + Review models |
| **4. Add to Cart** | `redlinenext/src/components/product/ProductCard.jsx` or product page | `CartContext` | `addToCart(product, size, quantity)` | None | `localStorage["perfume_cart"]` + product cache |
| **5. Open Cart Drawer** | `redlinenext/src/features/customer/cart/CartDrawer.jsx` from `MainNavbar` | `CartContext`, `CouponContext` | Cart context operations | Coupon validation only when applying coupon | Device-local cart |
| **6. View Full Cart** | `redlinenext/src/app/(customer)/cart/page.jsx` | `useCart`, `useCoupon` | Context-derived cart items/totals | Coupon validation indirectly | Product metadata already resolved through CartContext catalog fetch |
| **7. Apply Coupon** | Cart Drawer / cart page / `features/customer/checkout/CouponSection.jsx` | `CouponContext`, `CartContext` | `applyCoupon()` → `validateCoupon()` | `POST /api/coupons/validate` | Product + Coupon models; server recalculates totals |
| **8. Proceed to Checkout** | `redlinenext/src/app/(customer)/place-order/page.jsx` → `CheckoutPage.jsx` | `AuthContext`, `CartContext`, `CouponContext` | Auth gate + checkout state | Protected checkout endpoints require session | User + cart payload |
| **9. OTP Login (when required)** | `src/app/(auth)/login/page.jsx` or global `AuthModal` → `PhoneOtpForm.jsx` | `AuthContext` | `sendLoginOtp()`, `verifyLoginOtp()` | `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` | OtpVerification + User; customer_session cookie |
| **10. Select / Save Address** | `CheckoutPage.jsx` + `DeliveryAddress.jsx` | `AuthContext` + checkout-local state | `updateCurrentUser()` when saving | `PATCH /api/auth/me` | `User.addresses` |
| **11. Check Serviceability** | `DeliveryAddress` / checkout flow | Checkout-local state | `checkShippingServiceability()` | `POST /api/shipping/serviceability` | Shiprocket (live behavior unverified) |
| **12. COD** | `CheckoutPage.jsx` | Auth + Cart + Coupon | `placeCodOrder()` | `POST /api/checkout/cod` | Server cart/coupon validation → stock deduction → Order → Shiprocket attempt |
| **13. Razorpay** | `CheckoutPage.jsx` + Razorpay SDK popup | Auth + Cart + Coupon | `createRazorpayCheckout()` → popup → `verifyRazorpayCheckout()` | `/api/checkout/razorpay/create` → `/verify` | Razorpay signature verification → stock → Order → Shiprocket attempt |
| **14. Success** | `CheckoutPage.jsx` | `CartContext`, `CouponContext` | Clear current-device cart/coupon only after confirmed success | None | Navigate to `/orders` |
| **15. View My Orders** | `features/customer/orders/OrdersPage.jsx` | `AuthContext` | `fetchMyOrders()` | `GET /api/orders/my-orders` | Order model |
| **16. View Order Details** | `features/customer/orders/OrderDetails.jsx` | `AuthContext` | `fetchOrder(orderId)` | `GET /api/orders/[orderId]` | Owned Order |
| **17. Track Shipment** | `features/customer/orders/TrackingInfo.jsx` | None directly | `fetchOrderTracking(orderId)` | `GET /api/shipping/tracking?orderId=...` | Order + Shiprocket |
| **18. Write / Edit Review** | `features/customer/reviews/ProductReviews.jsx` | `AuthContext` | review client helpers | `/api/reviews`, `/api/reviews/[reviewId]` | Review model |
| **19. Admin Moderation** | `redlineadmin` Reviews module | Admin session | PATCH review | `PATCH /api/admin/reviews/[reviewId]` | Review approval state |
| **20. Public Approved Review** | `ProductReviews.jsx` | None required for public list | `fetchProductReviews()` | `GET /api/reviews/product/[productId]` | Approved reviews + rating summary |

**Cart/auth invariant:** login and logout do **not** own or merge the cart. The cart belongs to the current browser/device and remains in `perfume_cart` until a confirmed order clears it or cart code explicitly clears it.

## 5. Admin User Journey

The current admin frontend is separate from the storefront. The primary dashboard route is **`/admin`**.

| Step | redlineadmin File | Client API Call | Server Endpoint | Notes |
|------|---|---|---|---|
| **1. Root Entry** | `redlineadmin/src/app/page.js` | None | None | `/` redirects to `/login` |
| **2. Admin Login** | `redlineadmin/src/app/login/page.jsx` | `POST /api/admin/auth/login` | Same | On success sets the HttpOnly `admin_session` cookie server-side and routes to `/admin`; a token value is also stored in localStorage but is not what authorizes the axios API calls |
| **3. Primary Dashboard** | `redlineadmin/src/app/admin/page.jsx` | `GET /api/admin/dashboard` | Same | Real KPI dashboard: orders, revenue, customers, products, recent orders, low stock |
| **4. `/dashboard` compatibility route** | `redlineadmin/src/app/dashboard/page.jsx` | None / redirect behavior | None | Current source inspection identifies this route as redirecting to `/admin`; do not treat it as the primary dashboard implementation |
| **5. Products List** | `redlineadmin/src/app/list/page.jsx` | `GET /api/admin/products` | Same | All products, including draft; admin response includes costPrice |
| **6. Add Product** | `redlineadmin/src/app/add/page.jsx` | Cloudinary signature + `POST /api/admin/products` | Same | Product image upload + create flow |
| **7. Edit Product** | `redlineadmin/src/app/edit/[id]/page.jsx` | `GET` + `PUT/PATCH /api/admin/products/[id]` | Same | Load and update product |
| **8. Orders** | `redlineadmin/src/app/orders/page.jsx` / admin orders feature | `GET /api/admin/orders`, `PATCH /api/admin/orders/[orderId]` | Same | View/filter/update order status |
| **9. Users** | `redlineadmin/src/app/users/page.jsx` / admin users feature | `GET /api/admin/users`, `PATCH /api/admin/users/[userId]` | Same | Search users, suspend/unsuspend |
| **10. Reviews** | `redlineadmin/src/app/reviews/page.jsx` / admin reviews feature | `GET/PATCH/DELETE /api/admin/reviews...` | Same | Moderation and deletion |
| **11. Coupons** | `redlineadmin/src/app/coupon/page.jsx` / coupons feature | `GET/POST/PATCH/DELETE /api/admin/coupons...` | Same | Coupon CRUD |
| **12. Logout** | Admin Navbar | `POST /api/admin/auth/logout` | Same | Clears `admin_session`; protected shell subsequently fails `/api/admin/auth/me` and returns to login |

### What actually authorizes admin requests?

`redlineadmin/src/lib/api.js` uses axios with `withCredentials: true`. The active authorization boundary is the **HttpOnly `admin_session` cookie**, verified by `requireAdmin()` in `redlinenext`. The login response also contains a JWT-like token and the frontend stores a value under localStorage key `token`, but the shared axios client does not depend on that localStorage value for normal admin API authorization.

## 6. Customer Provider Tree

Location: `redlinenext/src/app/layout.jsx`

```text
NotificationProvider
└─ AuthProvider
   └─ CartProvider
      └─ CouponProvider
         └─ RootLayoutClient
            └─ {children}
```

`RootLayoutClient` itself lives at **`redlinenext/src/components/RootLayoutClient.jsx`**; it is not the same file as `src/app/layout.jsx`.

| Provider / Shell | Exact Location | Actual Core State / API | Purpose |
|---|---|---|---|
| **NotificationProvider** | `src/context/NotificationContext.jsx` | `notifications`; `addNotification`, `removeNotification`, `showNotification`, `success`, `error`, `warning`, `info` | Global transient toast queue; `src/components/Notification.jsx` renders it |
| **AuthProvider** | `src/context/AuthContext.jsx` | `user`, `loading`, `isAuthOpen`, `redirectAfterAuth` (and derived auth status where exposed); `refreshUser`, `openAuth`, `closeAuth`, `completeAuth`, `logout` | Restores current user via `/api/auth/me`, controls reusable OTP modal and post-auth redirect. It does not store the customer session in localStorage |
| **CartProvider** | `src/context/CartContext.jsx` | `cart`, `productsById`, load flags; `rememberProducts`, `resolveProduct`, `addToCart`, `updateQuantity`, `removeFromCart`, `clearCart`, `getCartItems`, `getCartCount`, `getCartTotal` | Device/browser cart. Persists minimal `{productId,size,quantity}` records to `localStorage["perfume_cart"]`; loads product catalog metadata; clamps quantities to known stock |
| **CouponProvider** | `src/context/CouponContext.jsx` | `couponCode`, `appliedCoupon`, `discount`, `serverSubtotal`, `serverTotal`, `validating`, `error`, `message`; `applyCoupon`, `revalidateCoupon`, `removeCoupon`, `setCouponCode` | Shared Cart Drawer ↔ checkout coupon state. Persists code under `localStorage["perfume_coupon_code"]` and revalidates against current cart |
| **RootLayoutClient** | `src/components/RootLayoutClient.jsx` | structural shell + pathname/scroll UI behavior | Renders global `Notification`, `AuthModal`, `AnnouncementBar`, `MainNavbar`, page children, and `Footer`; hides site chrome on login surfaces |

### Authentication vs cart

`AuthContext.logout()` clears the authenticated user/session state; it does **not** own or clear `CartContext`. The cart intentionally survives login/logout and remains browser-local. Confirmed order success is what clears the current device cart in the checkout flow.

## 7. Complete Route Cheat Sheet

### Customer Routes (`redlinenext/src/app`)

Next.js route-group parentheses such as `(customer)` and `(auth)` organize source files but **do not appear in the URL**.

| Route | Exact File | Main Active Component / Purpose |
|---|---|---|
| `/` | `src/app/(customer)/page.jsx` | Homepage → HeroCarousel, CollectionSection, For Him, Our Story, For Her |
| `/login` | `src/app/(auth)/login/page.jsx` | `features/customer/auth/PhoneOtpForm.jsx` |
| `/collection` | `src/app/(customer)/collection/page.jsx` | Product listing using `components/product/ProductCard.jsx` |
| `/product/[slug]` | `src/app/(customer)/product/[slug]/page.jsx` | Product detail + related ProductCard + ProductReviews |
| `/cart` | `src/app/(customer)/cart/page.jsx` | Standalone cart using CartContext + CouponContext |
| `/place-order` | `src/app/(customer)/place-order/page.jsx` | Thin route → `features/customer/checkout/CheckoutPage.jsx` |
| `/profile` | `src/app/(customer)/profile/page.jsx` | Thin route → `features/customer/account/AccountPage.jsx` |
| `/orders` | `src/app/(customer)/orders/page.jsx` | Thin route → `features/customer/orders/OrdersPage.jsx` |
| `/orders/[orderId]` | `src/app/(customer)/orders/[orderId]/page.jsx` | Thin route → `features/customer/orders/OrderDetails.jsx` |
| `/about` | `src/app/(customer)/about/page.jsx` | About page |
| `/contact` | `src/app/(customer)/contact/page.jsx` | Contact page |
| `/privacy` | `src/app/privacy/page.jsx` | Privacy policy |
| `/terms` | `src/app/terms/page.jsx` | Terms |

There is no active `/search` route in the Part 1 source-of-truth route map.

### Admin Routes (`redlineadmin/src/app`)

| Route | Exact File | Current Role |
|---|---|---|
| `/` | `src/app/page.js` | Redirects to `/login` |
| `/login` | `src/app/login/page.jsx` | Admin email/password login; success → `/admin` |
| `/admin` | `src/app/admin/page.jsx` | **Primary dashboard implementation** |
| `/dashboard` | `src/app/dashboard/page.jsx` | Compatibility/redirect route → `/admin` per latest source inspection |
| `/add` | `src/app/add/page.jsx` | Add product |
| `/edit/[id]` | `src/app/edit/[id]/page.jsx` | Edit product |
| `/list` | `src/app/list/page.jsx` | Product list |
| `/orders` | `src/app/orders/page.jsx` | Orders management |
| `/users` | `src/app/users/page.jsx` | User management |
| `/reviews` | `src/app/reviews/page.jsx` | Review moderation |
| `/coupon` | `src/app/coupon/page.jsx` | Coupon management |

### API Routes

See **Section 8** and Part 4 for the complete current `redlinenext/src/app/api` surface.

## 8. API Cheat Sheet

Complete endpoint reference. See Part 4 for detailed request/response schemas.

### Products (Public)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/products | None | List published products; filter by category |
| GET | /api/products/[id] | None | Get product by ID |
| GET | /api/products/slug/[slug] | None | Get product by slug |

### Customer Auth

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/auth/send-otp | None | Send OTP to phone (rate-limited) |
| POST | /api/auth/verify-otp | None | Verify OTP, create customer_session cookie |
| GET | /api/auth/me | requireUser | Get authenticated user profile |
| PATCH | /api/auth/me | requireUser | Update user name, email, addresses |
| POST | /api/auth/logout | requireUser | Clear customer_session cookie |

### Checkout

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/checkout/cod | requireUser | Create order with COD payment |
| POST | /api/checkout/razorpay/create | requireUser | Create Razorpay order, return order ID + keypair |
| POST | /api/checkout/razorpay/verify | requireUser | Verify Razorpay signature, complete order |

### Orders (Customer)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/orders/my-orders | requireUser | List user's orders |
| GET | /api/orders/[orderId] | requireUser | Get order details by ID or orderNumber |

### Coupons

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/coupons/validate | None | Validate coupon, recalculate cart total |

### Reviews (Customer)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/reviews | requireUser | Get user's own review for a product (by query param) |
| POST | /api/reviews | requireUser | Create review for product |
| PATCH | /api/reviews/[reviewId] | requireUser | Update user's own review |
| DELETE | /api/reviews/[reviewId] | requireUser | Delete user's own review |
| GET | /api/reviews/product/[productId] | None | Get all approved reviews for product + rating stats |

### Shipping (Customer)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/shipping/serviceability | None | Check if pincode is serviceable by Shiprocket |
| GET | /api/shipping/serviceability | None | Same (query param variant) |
| GET | /api/shipping/tracking | requireUser | Get tracking info by order ID |

### Admin Auth

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/admin/auth/login | None | Admin login with email/password |
| GET | /api/admin/auth/me | requireAdmin | Get admin identity |
| POST | /api/admin/auth/logout | requireAdmin | Clear admin_session cookie |

### Admin Dashboard

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/admin/dashboard | requireAdmin | KPIs: orders, revenue, customers, products, low stock |

### Admin Products

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/admin/products | requireAdmin | List all products (including draft) with costPrice |
| POST | /api/admin/products | requireAdmin | Create product |
| GET | /api/admin/products/[id] | requireAdmin | Get product with costPrice |
| PUT | /api/admin/products/[id] | requireAdmin | Update product |
| PATCH | /api/admin/products/[id] | requireAdmin | Update product (alias to PUT) |
| DELETE | /api/admin/products/[id] | requireAdmin | Delete product |

### Admin Orders

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/admin/orders | requireAdmin | List all orders; filter by status/payment status |
| PATCH | /api/admin/orders/[orderId] | requireAdmin | Update order status (confirmed, processing, shipped, delivered, cancelled) |

### Admin Users

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/admin/users | requireAdmin | List users; search by phone/email/name; filter by status |
| PATCH | /api/admin/users/[userId] | requireAdmin | Update user status (active/suspended) |

### Admin Reviews

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/admin/reviews | requireAdmin | List reviews; filter by approved, rating, product |
| PATCH | /api/admin/reviews/[reviewId] | requireAdmin | Update review (e.g., approve) |
| DELETE | /api/admin/reviews/[reviewId] | requireAdmin | Delete review |

### Admin Coupons

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/admin/coupons | requireAdmin | List all coupons |
| POST | /api/admin/coupons | requireAdmin | Create coupon |
| PATCH | /api/admin/coupons/[couponId] | requireAdmin | Update coupon |
| DELETE | /api/admin/coupons/[couponId] | requireAdmin | Delete coupon |

### Admin Upload

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/upload/cloudinary-signature | requireAdmin | Generate Cloudinary upload signature for admin direct upload |

### Internal / Cron

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/internal/sync-order-status | Bearer CRON_SECRET | Sync order shipment status from Shiprocket (cron job) |

### Health

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/health | None | Health check endpoint |

---

## 9. Database Cheat Sheet

All models use Mongoose + MongoDB connection caching (serverless-safe). See Part 4, Section 3 for detailed schemas.

### Product Model

**File**: `redlinenext/src/models/Product.js`

```
_id: ObjectId (MongoDB)
name: string (required)
slug: string (unique, required)
category: "Men" | "Women" | "Unisex" (required)
description: string (required)
images: [{ url, publicId, alt }]
variants: [
  {
    size: "10 ML" | "50 ML" (required, enum)
    sellingPrice: number (required, >0)
    mrp: number (required, >0)
    costPrice: number (required, >0)  [HIDDEN from customer APIs]
    stock: number (required, >=0)
    sku: string
  }
]
status: "draft" | "published" (default: draft)
featured: boolean
bestseller: boolean
fragranceProfile, personality, positioning: strings
bestFor, bestSeason: arrays
fragranceNotes: { top[], heart[], base[] }
faq: [{ question, answer }]
legalInformation: { ingredients, caution }
timestamps: true

Indexes: category+status, featured+status, bestseller+status, variants.stock
```

### User Model

**File**: `redlinenext/src/models/User.js`

```
_id: ObjectId
phone: string (unique, required)  [10-digit Indian]
phoneVerified: boolean (default: false)
firstName, lastName: strings
email: string
addresses: [
  {
    fullName: string
    email: string
    addressLine: string (required)
    city, state: strings (required)
    pincode: string (6-digit, required)
    type: "Home" | "Work" (default: Home)
    isDefault: boolean
  }
] (max 10)
status: "active" | "suspended" (default: active)
timestamps: true

Indexes: phone (unique), email, status
```

### Order Model

**File**: `redlinenext/src/models/Order.js`

```
_id: ObjectId
orderNumber: string (unique, format: ORD-YYYYMMDD-RANDOM)
user: ObjectId (ref: User)
customer: {
  firstName, lastName, phone, email: strings
  phoneVerified: boolean
}
deliveryAddress: {
  fullName, email, addressLine, city, state, pincode: strings
  type: "Home" | "Work"
}
items: [
  {
    productId: ObjectId (ref: Product)
    name, slug, image: strings
    size: string (10 ML|50 ML)
    quantity: number (>=1)
    unitPrice: number
    mrp: number
  }
]
amounts: {
  subtotal: number
  discount: number
  finalAmount: number
}
coupon: {
  code: string
  discount: number
}
payment: {
  method: "razorpay" | "cod" (required)
  paymentStatus: "pending" | "paid" | "failed" | "cod" (default: pending)
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}
orderStatus: "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
shiprocket: {
  shiprocketOrderId, shipmentId, awbCode: strings
  courierName, trackingUrl: strings
  shipmentStatus: string
  syncStatus: "not_configured" | "pending" | "created" | "failed"
  lastError: string
}
timestamps: true

Indexes: user+createdAt, createdAt, orderStatus, payment.paymentStatus, orderNumber (unique)
```

### Review Model

**File**: `redlinenext/src/models/Review.js`

```
_id: ObjectId
product: ObjectId (ref: Product, required)
user: ObjectId (ref: User, required)
rating: number (1-5, required)
title: string (max 100)
text: string (required)
photos: [{ url, publicId }] (max 2)
approved: boolean (default: false)  [requires admin approval for public display]
verifiedPurchase: boolean (default: false)  [computed from Order history]
timestamps: true

Unique Index: product + user (one review per user per product)
Indexes: product+approved+createdAt
```

### Coupon Model

**File**: `redlinenext/src/models/Coupon.js`

```
_id: ObjectId
code: string (unique, 3-30 chars, pattern: /^[A-Z0-9_-]+$/)
discountType: "percentage" | "fixed" (required)
discountValue: number (required, >0)
minimumOrder: number (default: 0)  [minimum order value to apply coupon]
expiryDate: Date (required, must be future)
active: boolean (default: true)
timestamps: true

Indexes: code (unique), active+expiryDate
```

### OtpVerification Model

**File**: `redlinenext/src/models/OtpVerification.js`

```
_id: ObjectId
phone: string (required)
otpHash: string (HMAC-SHA256(phone:otp, AUTH_SECRET))
attempts: number (default: 0, max 5)
expiresAt: Date (required)  [10 minutes from creation]
consumedAt: Date (default: null)  [set when OTP successfully verified]
timestamps: true

TTL Index: expiresAt (auto-delete expired records)
Indexes: phone
```

### Relationships

```
User (1) ←─→ (many) Order          [Order.user]
User (1) ←─→ (many) Review         [Review.user]
Product (1) ←─→ (many) Review      [Review.product]
Coupon         (not referenced)    [stored as string code in Order]

Order.items[].productId references Product._id (snapshot, not live reference)
```

---

## 10. Authentication Mental Model

### Customer (OTP-Based)

```
Step 1: Phone Input
  ↓
POST /api/auth/send-otp { phone: "10-digit" }
  ↓
Mock OTP Provider:
  - Generate 6-digit OTP
  - Hash: HMAC-SHA256(phone:otp, AUTH_SECRET)
  - Store in OtpVerification (10-min TTL, 5-attempt limit)
  - Return devOtp (in dev mode for testing)
  ↓
Step 2: OTP Input
  ↓
POST /api/auth/verify-otp { phone, otp }
  ↓
Verify OTP hash against OtpVerification record
  ↓
If match:
  - Find or create User with phone
  - Set phoneVerified = true
  - Sign customer_session JWT:
    {
      sub: user._id,
      phone: "10-digit",
      type: "customer",
      exp: now + 30 days
    }
  - Set HttpOnly, Secure (prod), SameSite (none in prod)
  - Return user object
  ↓
Customer_session cookie now sent with all customer API calls
  ↓
requireUser() middleware:
  - Extract JWT from cookie or Authorization header
  - Verify signature
  - Check type === "customer"
  - Load user from MongoDB
  - Check status !== "suspended"
  - Attach user to request.user
```

**What Actually Authorizes Customer API Calls**:
- `customer_session` HttpOnly JWT cookie
- Verified in requireUser() middleware on protected routes
- Phone embedded in token as proof of identity
- User object re-fetched on each protected call to check suspension status

---

### Admin (Email/Password)

```
Step 1: Admin Login
  ↓
POST /api/admin/auth/login { email, password }
  ↓
Verify email === ADMIN_EMAIL (env var, plain text)
Verify password === ADMIN_PASSWORD (env var, plain text)
  ↓
If match:
  - Sign admin_session JWT:
    {
      sub: "admin",
      type: "admin",
      exp: now + 8 hours
    }
  - Set HttpOnly, Secure (prod), SameSite (none in prod)
  - Return success
  ↓
Admin_session cookie now sent with all admin API calls
  ↓
requireAdmin() middleware:
  - Extract JWT from cookie or Authorization header
  - Verify signature using ADMIN_AUTH_SECRET (fallback: AUTH_SECRET)
  - Check type === "admin"
  - Return admin identity
```

**RedlineAdmin Token Storage**:
- redlineadmin stores `{ token: "..." }` in browser localStorage after successful login
- This is just a MARKER (local state); it is NOT the actual auth token
- The real authorization is the `admin_session` HttpOnly cookie sent by the backend
- localStorage token is used by LayoutWrapper.jsx to show/hide admin UI
- On page reload, LayoutWrapper checks localStorage and makes GET /api/admin/auth/me to verify cookie is still valid
- If cookie expired, GET fails; LayoutWrapper redirects to /login

**Why Separate Cookies**:
- customer_session: 30-day TTL (remember me convenience)
- admin_session: 8-hour TTL (security; admin is high-privilege)
- Both HttpOnly (cannot be accessed by JavaScript, only sent with requests)
- Separate cookie names prevent accidental reuse
- CORS restricted on /api/admin/* to whitelisted origins only

---

## 11. Cart Mental Model

### Source of truth

- **Provider:** `redlinenext/src/context/CartContext.jsx`
- **Browser persistence key:** `"perfume_cart"`
- **Persisted shape:** `[{ productId, size, quantity }]`
- **Item identity:** `productId + size`
- **Supported sizes:** `"10 ML"`, `"50 ML"`
- **Product metadata:** resolved/cached from the real Product API; localStorage intentionally stores only minimal identity/quantity

### Active CartContext API

```text
rememberProducts(products)
resolveProduct(productOrId)
addToCart(productOrId, size, quantity = 1)
updateQuantity(productId, size, quantity)
removeFromCart(productId, size)
clearCart()
getCartItems()
getCartCount()
getCartTotal()
```

### Lifecycle

```text
App load
→ CartProvider reads localStorage["perfume_cart"]
→ normalizes minimal cart records
→ fetchProducts() loads current catalog
→ productsById cache is populated
→ invalid / missing / unavailable entries are reconciled
→ current cart is rendered by Cart Drawer, /cart and checkout

Add product
→ addToCart(product, "10 ML" or "50 ML", quantity)
→ identity match = productId + size
→ duplicate identity increments quantity
→ quantity is capped against known variant stock
→ persist minimal cart back to perfume_cart

Update/remove
→ updateQuantity(productId, size, qty)
→ removeFromCart(productId, size)
→ persist updated cart

Checkout
→ frontend sends only productId + size + quantity (+ coupon/address)
→ server re-fetches Product data and recalculates authoritative prices/stock/coupon
→ confirmed order success
→ clearCart() for THIS browser/device
```

### Login/logout behavior

- Login has **no cart merge or replacement step**.
- Logout has **no cart-clearing side effect**.
- The same browser cart survives both login and logout.
- Another device/browser has a different localStorage cart; there is no MongoDB cart and no cross-device synchronization.

### Stock behavior

CartContext can clamp quantity against the currently loaded product/variant stock for UX. The **authoritative stock validation still happens server-side** during coupon/checkout calculation and again during stock deduction, where `STOCK_CHANGED` can be returned.

### Important invariant

The UI may calculate/display totals from resolved variant data, but checkout never trusts a client total. `redlinenext/src/lib/orders/pricing.js` recalculates from MongoDB before an order is finalized.

## 12. Checkout Mental Model

### Complete Checkout Flow (COD + Razorpay)

```
CUSTOMER AT CHECKOUT PAGE
├─ source: /place-order
├─ auth: requireUser (customer_session cookie)
├─ state: CartContext, CouponContext
└─ actions: 
   - Review items (from localStorage cart)
   - Enter/select delivery address
   - Apply coupon (calls POST /api/coupons/validate)
   - Choose payment method (COD or Razorpay)
   - Confirm order

═══════════════════════════════════════════════════════════════

STEP 1: ADDRESS SELECTION
────────────────────────
User selects from saved addresses or enters new address
  ↓
validateAddress():
  - Check fullName, addressLine, city, state, pincode required
  - Pincode: 6 digits (/^\d{6}$/)
  - Email optional
  ↓
(No server call yet; client-side validation only)

═══════════════════════════════════════════════════════════════

STEP 2: SERVICEABILITY CHECK (Optional, improves UX)
────────────────────────────────────────
User enters pincode
  ↓
POST /api/shipping/serviceability { pincode, cod: true/false }
  ↓
Server:
  - Validate pincode format
  - Call Shiprocket API
  - Return serviceable: true/false + available couriers
  ↓
UI Shows:
  - "This area is serviceable"
  - Available couriers (if needed)
  ↓
(Can proceed even if not shown; actual serviceability checked at order create)

═══════════════════════════════════════════════════════════════

STEP 3: COUPON APPLICATION (Optional)
─────────────────────────────────
User enters coupon code (or skips)
  ↓
CouponContext.applyCoupon(code)
  ↓
POST /api/coupons/validate
  {
    items: [ { productId, size, quantity }, ... ],
    code: "COUPON_CODE"
  }
  ↓
Server (lib/orders/pricing.js calculateCart + calculateCouponDiscount):
  1. Re-fetch each Product from MongoDB
  2. Verify variant exists and stock >= quantity
  3. Build normalized items with fresh prices
  4. Calculate subtotal = sum(quantity * sellingPrice)
  5. Find Coupon by code
  6. Validate: active, not expired, subtotal >= minimumOrder
  7. Apply discount:
     - if percentage: discount = (subtotal * discountValue) / 100
     - if fixed: discount = discountValue
  8. Cap discount at subtotal
  9. finalAmount = subtotal - discount
  ↓
Response:
  {
    items: [...normalized...],
    subtotal: number,
    discount: number,
    finalAmount: number,
    coupon: { code, discount }
  }
  ↓
Error codes (if stock changed):
  - STOCK_CHANGED (409): { items: [{productId, size, requestedQty, availableStock}] }
  - COUPON_NOT_FOUND, COUPON_EXPIRED, COUPON_MINIMUM_ORDER, etc.
  ↓
UI Updates:
  - Show coupon applied
  - Update final total
  - Show discount amount
  - If error: notify customer (CartNotification)

═══════════════════════════════════════════════════════════════

STEP 4A: COD CHECKOUT
──────────────────────
User clicks "Confirm Order (COD)"
  ↓
POST /api/checkout/cod
  {
    items: [ { productId, size, quantity }, ... ],
    address: { fullName, addressLine, city, state, pincode, type, email? },
    couponCode: "CODE_OR_NULL"
  }
  ↓
Server (app/api/checkout/cod/route.js):
  ├─ 1. requireUser() middleware: verify customer_session
  │
  ├─ 2. validateAddress(address)
  │     Check all required fields present
  │
  ├─ 3. calculateCart({ items, couponCode })
  │     Re-fetch Products, normalize items, apply coupon
  │     (Same as Step 3)
  │     If error: return STOCK_CHANGED or COUPON error
  │
  ├─ 4. deductStock(items)
  │     For each item:
  │       Product.updateOne(
  │         { _id: productId, variants: { $elemMatch: { size, stock: {$gte: qty} } } },
  │         { $inc: { "variants.$.stock": -qty } }
  │       )
  │     If any modifiedCount !== 1: THROW STOCK_CHANGED
  │
  ├─ 5. Order.create({
  │       orderNumber: generateOrderNumber(),
  │       user: req.user._id,
  │       customer: { firstName, lastName, phone, email, phoneVerified },
  │       deliveryAddress: address,
  │       items: [...normalized items with snapshot...],
  │       amounts: { subtotal, discount, finalAmount },
  │       coupon: { code, discount },
  │       payment: { method: "cod", paymentStatus: "cod" },
  │       orderStatus: "confirmed",
  │       shiprocket: { syncStatus: "pending" }
  │     })
  │
  ├─ 6. createShiprocketOrder(order)  [NON-BLOCKING]
  │     Try: POST to Shiprocket with order details
  │     On success: order.shiprocket = { shiprocketOrderId, shipmentId, awbCode, ... }
  │     On error: order.shiprocket.syncStatus = "failed", lastError = message
  │
  └─ 7. order.save()
       Return order with all fields populated
  ↓
Response (HTTP 201):
  {
    success: true,
    data: { order: {...full order object...} }
  }
  ↓
Client:
  - Store order._id or orderNumber
  - Clear CartContext (CartContext.clearCart())
  - Navigate to `/orders`
  - Show: "Order placed successfully"

═══════════════════════════════════════════════════════════════

STEP 4B: RAZORPAY CHECKOUT
──────────────────────────
User clicks "Pay via Razorpay"
  ↓
POST /api/checkout/razorpay/create
  {
    items: [...],
    address: {...},
    couponCode: "CODE_OR_NULL"
  }
  ↓
Server (app/api/checkout/razorpay/create/route.js):
  ├─ 1-3. Same as COD: validateAddress + calculateCart
  │
  ├─ 4. SKIP stock deduction (deferred until verify)
  │
  ├─ 5. Order.create({
  │       ...,
  │       payment: { method: "razorpay", paymentStatus: "pending" },
  │       ...,
  │       shiprocket: { syncStatus: "pending" }  [NOT created yet]
  │     })
  │
  ├─ 6. createRazorpayOrder({
  │       amount: finalAmount * 100  [convert to paise],
  │       receipt: order._id,
  │       notes: { orderId: order._id, customer: phone, ... }
  │     })
  │     ↓
  │     Razorpay SDK creates order
  │     Returns: { id: "order_XXXXXX", amount, currency, ... }
  │
  └─ 7. Store razorpayOrderId in order.payment.razorpayOrderId
       order.save()
  ↓
Response (HTTP 201):
  {
    success: true,
    data: {
      orderId: "mongodb_order_id",
      orderNumber: "ORD-20250817-ABC123",
      razorpay: {
        keyId: "RAZORPAY_KEY_ID" (public),
        orderId: "order_XXXXXX",
        amount: "finalAmount_in_paise",
        currency: "INR"
      },
      amount: "finalAmount_in_rupees"
    }
  }
  ↓
Client:
  - Open Razorpay popup with keyId, orderId, amount
  - Customer enters card/UPI/wallet details
  - Razorpay processes payment
  - If successful: Razorpay returns:
    {
      razorpay_order_id: "order_XXXXXX",
      razorpay_payment_id: "pay_XXXXXX",
      razorpay_signature: "hex_string"
    }
  - Client sends to:
    POST /api/checkout/razorpay/verify
    {
      orderId: "mongodb_order_id",
      razorpay_order_id: "order_XXXXXX",
      razorpay_payment_id: "pay_XXXXXX",
      razorpay_signature: "hex_string"
    }
  ↓
Server (app/api/checkout/razorpay/verify/route.js):
  ├─ 1. requireUser() middleware
  │
  ├─ 2. Load order from DB by orderId
  │     Check order.user === req.user._id (ownership)
  │
  ├─ 3. verifyRazorpaySignature({
  │       orderId: "order_XXXXXX",
  │       paymentId: "pay_XXXXXX",
  │       signature: "hex_string"
  │     })
  │     ↓
  │     body = `${orderId}|${paymentId}`
  │     expectedSignature = HMAC-SHA256(body, RAZORPAY_KEY_SECRET)
  │     timingSafeEqual(expectedSignature, receivedSignature)
  │     ↓
  │     If FALSE: return PAYMENT_VERIFICATION_FAILED (400)
  │     If TRUE: continue
  │
  ├─ 4. IDEMPOTENCY CHECK:
  │     if (order.payment.paymentStatus === "paid") {
  │       return success({ order, idempotent: true })
  │     }
  │     (Handle case where verify called twice)
  │
  ├─ 5. deductStock(order.items)  [FIRST TIME NOW]
  │     (Same atomic operation as COD)
  │     If STOCK_CHANGED: return 409, order remains incomplete
  │
  ├─ 6. Set order.payment.paymentStatus = "paid"
  │     Store paymentId and signature in order
  │
  ├─ 7. createShiprocketOrder(order)  [NON-BLOCKING]
  │     (Same as COD)
  │
  └─ 8. order.save()
       Return order
  ↓
Response (HTTP 200 or 201):
  {
    success: true,
    data: { order: {...} }
  }
  ↓
Client:
  - Verify response success
  - Clear CartContext
  - Navigate to `/orders`
  - Show: "Payment successful! Order placed."

═══════════════════════════════════════════════════════════════

KEY DIFFERENCES:

┌─────────────────┬──────────────────────┬────────────────┐
│ Step            │ COD                  │ Razorpay       │
├─────────────────┼──────────────────────┼────────────────┤
│ Stock Deduction │ Immediately          │ After verify   │
│ Payment Status  │ Set to "cod"         │ Pending→Paid   │
│ Shiprocket      │ Created after order  │ Created after  │
│ Failure Mode    │ Order exists; ship   │ Order exists;  │
│                 │ status "failed"      │ payment "paid" │
│                 │                      │ but not shipped│
│ Idempotency     │ N/A (single call)    │ verify is safe │
│                 │                      │ to retry       │
└─────────────────┴──────────────────────┴────────────────┘

═══════════════════════════════════════════════════════════════

AFTER ORDER COMPLETION (Both COD + Razorpay)

1. Cart Cleared
   CartContext.clearCart()
   localStorage["perfume_cart"] = []

2. Order Available
   GET /api/orders/my-orders
   Shows new order with orderNumber
   
3. Tracking Available (if Shiprocket)
   GET /api/shipping/tracking?orderId=[id]
   Returns tracking URL + AWB code

4. Review Period
   After order status changes to "delivered":
   User can POST /api/reviews for products in order
   verifiedPurchase: true set by hasVerifiedPurchase()
```

### Summary Table

| Checkpoint | Calculation | Trusts Client | Revalidates |
|-----------|---|---|---|
| Add to cart | No calculation | Yes (UI only) | N/A |
| View cart | Client sum (UI) | Yes (display only) | Product prices via API |
| Apply coupon | POST /api/coupons/validate | NO (server recalcs) | Coupon active + expiry + minimum order |
| Checkout COD | POST /api/checkout/cod | NO (server recalcs) | All above + stock deduction + Shiprocket |
| Checkout Rz | POST /api/checkout/razorpay/create | NO | All above (stock deferred) |
| Verify Rz | POST /api/checkout/razorpay/verify | NO | HMAC signature + ownership + stock deduction |

---

## 13. Razorpay Flow

### Compact Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                    RAZORPAY PAYMENT FLOW                          │
├───────────────────────────────────────────────────────────────────┤

Frontend (redlinenext)
  ↓
[1] User at checkout, enters address, selects "Razorpay"
  ↓
[2] POST /api/checkout/razorpay/create
    Body: { items, address, couponCode }
  ↓
Backend (redlinenext API)
  ├─ calculateCart() → get fresh Product prices, normalize items
  ├─ validateAddress()
  ├─ Order.create() with paymentStatus: "pending"
  ├─ createRazorpayOrder() → Razorpay SDK
  │  └─ amount in paise (finalAmount * 100)
  │  └─ receipt: order._id
  │  └─ Returns: razorpay order ID
  └─ Response: 
    {
      orderId: "mongodb_order_id",
      razorpay: {
        keyId: "rzp_test_XXXXX" (PUBLIC),
        orderId: "order_XXXXXX",
        amount: paise_amount,
        currency: "INR"
      }
    }
  ↓
Frontend
  ├─ Receive razorpay keyId + orderId
  ├─ Open Razorpay Popup
  │  └─ keyId used to identify merchant account
  │  └─ orderId to link payment to order
  │  └─ amount displayed to customer
  ↓
Customer
  ├─ Enters card/UPI/wallet
  ├─ Razorpay processes payment
  ↓
[3] Payment Success
  ├─ Razorpay returns to client:
  │  {
  │    razorpay_order_id: "order_XXXXXX",
  │    razorpay_payment_id: "pay_XXXXXX",
  │    razorpay_signature: "hex_string"  [HMAC-SHA256 on Razorpay side]
  │  }
  ↓
[4] POST /api/checkout/razorpay/verify
    Body:
    {
      orderId: "mongodb_order_id",
      razorpay_order_id: "order_XXXXXX",
      razorpay_payment_id: "pay_XXXXXX",
      razorpay_signature: "hex_string"
    }
  ↓
Backend
  ├─ CRITICAL: Verify signature
  │  body = `${razorpay_order_id}|${razorpay_payment_id}`
  │  expectedSig = HMAC-SHA256(body, RAZORPAY_KEY_SECRET)
  │  timingSafeEqual(expectedSig, receivedSignature)
  │  └─ Prevents signature forgery (timing-safe comparison)
  │  └─ RAZORPAY_KEY_SECRET is server-only (NOT exposed to client)
  │
  ├─ If signature valid:
  │  ├─ deductStock()  [atomic MongoDB operation]
  │  ├─ Set paymentStatus: "paid"
  │  ├─ Store payment IDs
  │  ├─ createShiprocketOrder()
  │  └─ order.save()
  │
  └─ Response: Order with paymentStatus: "paid"
  ↓
Frontend
  ├─ Show "Payment successful!"
  ├─ Clear cart
  ├─ Navigate to `/orders`
  ↓
Webhook (optional, not implemented here)
  └─ Razorpay would notify backend of payment status
     (verify endpoint is synchronous; webhook adds redundancy)
```

### Security Keys

| Key | Value Type | Location | Exposure | Purpose |
|-----|---|---|---|---|
| RAZORPAY_KEY_ID | Public string | .env | Sent to browser | Identifies merchant account to Razorpay SDK |
| RAZORPAY_KEY_SECRET | Secret hex | .env | Server-only | Signs HMAC-SHA256 for verify endpoint |

### Client Never Sees Secret

- Browser receives keyId (public) in Step 2 response
- Browser uses keyId to open Razorpay popup
- Razorpay uses keyId to know which merchant account
- Payment processing happens on Razorpay servers
- Razorpay generates signature using its own secret (client doesn't generate it)
- Client returns signature to backend
- **Backend re-calculates expected signature using RAZORPAY_KEY_SECRET**
- **Backend compares using timingSafeEqual (constant-time comparison)**

### Vulnerability Prevention

**Forgery**: If attacker tries to change order_id or payment_id in verify request:
- expectedSig calculation changes
- timingSafeEqual comparison fails
- Order rejected

**Timing Attack**: If attacker tries to guess signature byte-by-byte:
- timingSafeEqual takes same time regardless of where first mismatch is
- Prevents attacker from using response time to narrow down valid bytes

---

## 14. Shiprocket Flow

### Serviceability Check (Public)

```
POST /api/shipping/serviceability
  {
    pincode: "6-digit",
    cod: true  // optional
  }
  ↓
Server:
  ├─ Validate pincode: /^\d{6}$/
  ├─ Call Shiprocket API:
  │  POST https://apiv2.shiprocket.in/v1/external/courier/serviceability/
  │  Params:
  │    pickup_postcode: SHIPROCKET_PICKUP_PINCODE (env, e.g., "110001")
  │    delivery_postcode: input pincode
  │    cod: 0|1
  │    weight: 0.5 (default)
  │
  └─ Response:
    {
      serviceable: true|false,
      code: "SERVICEABLE" | "UNSERVICEABLE" | "INVALID_PINCODE",
      couriers: [
        {
          courierName: "FedEx",
          rate: 150,
          estimatedDeliveryDays: 2,
          cod: true
        },
        ...
      ]
    }
  ↓
Client:
  ├─ If serviceable: show couriers
  └─ If not: warn customer "We don't deliver here yet"
```

### Order Creation (Called after COD/Razorpay Order)

```
createShiprocketOrder(order)  [Runs non-blocking; errors don't fail checkout]
  ↓
1. Get or refresh Shiprocket token
   └─ Cache token for 9 days with 60s refresh buffer
   └─ POST /auth/login if needed
  ↓
2. POST /orders/create/adhoc
   {
     order_id: "ORD-YYYYMMDD-RANDOM",
     order_date: "ISO_DATE",
     pickup_location: "Primary",
     billing_customer_name: fullName,
     billing_address: addressLine,
     billing_city: city,
     billing_state: state,
     billing_pincode: pincode,
     billing_country: "India",
     billing_email: email || "customer@example.com",
     billing_phone: phone,
     shipping_is_billing: true,
     order_items: [
       {
         name: "Product Name 10 ML",
         sku: "productId-10ML",
         units: quantity,
         selling_price: unitPrice
       },
       ...
     ],
     payment_method: "COD" | "Prepaid" (based on order.payment.method),
     sub_total: finalAmount,
     length: 10,
     breadth: 10,
     height: 10,
     weight: 0.5
   }
  ↓
3. Response (if success):
   {
     shiprocket_order_id: "123456",
     order_id: "ORD-YYYYMMDD-RANDOM",
     shipment_id: "456789",
     awb_code: "AWBXXXXXXXXXX",
     courier_name: "FedEx",
     tracking_url: "https://track.shiprocket.in/...",
     status: "Pending"
   }
  ↓
4. Store in order:
   order.shiprocket = {
     shiprocketOrderId: "123456",
     shipmentId: "456789",
     awbCode: "AWBXXXXXXXXXX",
     courierName: "FedEx",
     trackingUrl: "https://...",
     syncStatus: "created"
   }
  ↓
5. If error:
   order.shiprocket.syncStatus = "failed"
   order.shiprocket.lastError = error message
   └─ Order still created (checkout doesn't fail)
   └─ Admin can manually retry or investigate
```

### Tracking (Customer Request)

```
GET /api/shipping/tracking?orderId=[orderId|orderNumber]
  (requireUser middleware: customer must own order)
  ↓
1. Load order from DB
   └─ Check order.user === req.user._id
  ↓
2. If order.shiprocket.awbCode:
   └─ GET /courier/track/awb/{awbCode}
   └─ Return full Shiprocket tracking data
   ↓
3. If no awbCode:
   └─ Return { available: false }
  ↓
4. Response:
   {
     available: true|false,
     awbCode: "AWBXXXXXXXXXX" | undefined,
     trackingUrl: "https://..." | undefined,
     tracking: { full_shiprocket_response }
   }
  ↓
Frontend:
  ├─ If available:
  │  └─ Show "Track Your Order" button → tracking_url
  │  └─ Show current status + expected delivery
  └─ If not:
     └─ Show "Tracking not available yet"
```

### Status Sync (Cron Job)

```
POST /api/internal/sync-order-status
  (Bearer Token: CRON_SECRET env var)
  ↓
1. Find orders with:
   ├─ awbCode present
   └─ orderStatus in ["confirmed", "processing", "shipped"]
  ↓
2. For each order (limit 25, max):
   ├─ GET /courier/track/awb/{awbCode}
   ├─ Extract shipmentStatus from response
   ├─ Update order.shiprocket.shipmentStatus
   └─ On error: log to errors array, continue
  ↓
3. Response:
   {
     checked: 50,  // orders processed
     updated: 45,  // with status changes
     errors: [     // failed trackings
       { orderNumber: "ORD-...", message: "API timeout" }
     ]
   }
```

**LIVE STATUS**: 
- Code: ✅ SOURCE_VERIFIED (present in route)
- Deployment: ❌ LIVE_UNVERIFIED (cron job setup unknown; may not be running)

---

## 15. Reviews Flow

### Create Review

```
POST /api/reviews (customer authenticated)
  {
    productId: "mongodb_id",
    rating: 1|2|3|4|5 (required),
    title: "Great perfume!" (optional, max 100 chars),
    text: "Smells amazing..." (required, max 2000 chars),
    photos: [
      { url: "https://...", publicId: "..." },
      { url: "https://...", publicId: "..." }
    ] (max 2)
  }
  ↓
Server:
  ├─ requireUser() middleware
  ├─ Validate productId (ObjectId format)
  ├─ Validate rating (1-5)
  ├─ Validate text (required, trim, max 2000)
  ├─ Validate title (optional, max 100)
  ├─ Validate photos (array, max 2, valid URLs)
  │
  ├─ Check unique index: product + user
  │  └─ If exists: return 409 REVIEW_EXISTS
  │
  ├─ Calculate verifiedPurchase:
  │  └─ Query Order.findOne({
  │      user: req.user._id,
  │      "items.productId": productId,
  │      orderStatus: {$in: ["confirmed", "processing", "shipped", "delivered"]},
  │      "payment.paymentStatus": {$in: ["paid", "cod"]}
  │    })
  │  └─ verifiedPurchase = !!order
  │
  └─ Review.create({
      product: productId,
      user: req.user._id,
      rating,
      title,
      text,
      photos,
      approved: false,  [ADMIN MUST APPROVE]
      verifiedPurchase,
      timestamps
    })
  ↓
Response (HTTP 201):
  {
    success: true,
    data: { review: {...} }
  }
```

### Admin Moderation

```
GET /api/admin/reviews?approved=false&limit=50
  (requireAdmin middleware)
  ↓
Server:
  └─ Review.find({ approved: false })
     .populate("product", "name slug")
     .populate("user", "firstName lastName phone email")
     .sort({ createdAt: -1 })
  ↓
Response:
  [
    {
      _id: "review_id",
      rating: 4,
      title: "Great!",
      text: "...",
      approved: false,
      product: { name: "...", slug: "..." },
      user: { firstName: "John", lastName: "Doe", phone: "..." },
      createdAt: "iso-date"
    },
    ...
  ]
  ↓
Admin Action:
  └─ PATCH /api/admin/reviews/[reviewId]
     { approved: true }
  ↓
Server:
  └─ Review.findByIdAndUpdate(id, { approved: true })
```

### Public Display

```
GET /api/reviews/product/[productId]  (PUBLIC, no auth)
  ↓
Server:
  ├─ Review.find({
  │   product: productId,
  │   approved: true  [ONLY APPROVED]
  │ }).populate("user", "firstName lastName")
  │  .sort({ createdAt: -1 })
  │
  └─ Calculate rating stats:
     ├─ Count reviews per rating (1-5)
     ├─ Average = sum(rating * count) / total
     └─ Breakdown: { "1": 0, "2": 5, "3": 10, "4": 80, "5": 50 }
  ↓
Response:
  {
    reviews: [
      {
        rating: 5,
        title: "Excellent!",
        text: "Best scent...",
        verifiedPurchase: true,
        user: { firstName: "Jane", lastName: "Smith" },
        createdAt: "iso-date"
      },
      ...
    ],
    rating: {
      average: 4.6,
      count: 145,
      breakdown: { "1": 0, "2": 5, "3": 10, "4": 80, "5": 50 }
    }
  }
  ↓
Frontend:
  ├─ Display star rating (4.6)
  ├─ Show breakdown chart
  └─ List approved reviews with user names (not phone/email)
```

### One-Review-per-User Enforcement

- MongoDB unique index: `{ product: 1, user: 1 }`
- Duplicate attempt returns 409 DUPLICATE_VALUE
- User can PATCH their own review (re-approval not automatic)
- User can DELETE their own review

---

## 16. Security Boundary

### Server-Only Secrets (Never Expose)

```
MONGODB_URI              Database connection string
AUTH_SECRET              Customer JWT signing + OTP hash secret
ADMIN_AUTH_SECRET        Admin JWT signing secret (fallback to AUTH_SECRET)
ADMIN_PASSWORD           Admin plaintext password
RAZORPAY_KEY_SECRET      Razorpay signature verification secret
SHIPROCKET_EMAIL         Shiprocket login email
SHIPROCKET_PASSWORD      Shiprocket login password
CLOUDINARY_API_SECRET    Cloudinary API signing secret
OTP_API_KEY              OTP provider API key (if using real provider)
CRON_SECRET              Internal cron/sync endpoint bearer token
```

**Where stored**: `.env.local` (local dev) + vercel env (production)
**How accessed**: `process.env.VARIABLE_NAME` in Node.js routes only
**Never in**: Client-side code, browser localStorage, cookies (except HTTPS cookie data)

### Client-Safe (OK to Embed)

```
RAZORPAY_KEY_ID                  [Identifies merchant account]
CLOUDINARY_CLOUD_NAME            [Cloudinary public account]
CLOUDINARY_API_KEY               [Cloudinary public API key]
NEXT_PUBLIC_* env vars           [Explicitly for browser]
```

**How used**: Hardcoded in browser JavaScript, or sent from API responses
**Example**: `POST /api/checkout/razorpay/create` returns `{ razorpay: { keyId, ... } }`

### Hidden Fields

**costPrice** (Product model):
- Stored in MongoDB Product.variants[].costPrice
- Exposed in serializeProduct() ONLY when includeCostPrice: true flag passed
- Customer APIs never use this flag → costPrice never sent to browser
- Admin APIs use this flag → admin sees full cost breakdown

**Passwords**:
- User model has NO password field (OTP-only auth)
- Admin password stored in env var (plaintext, acceptable for single admin)
- Never hashed or encrypted

---

## 17. Environment Variable Checklist

For deployment, required env vars grouped by category:

### Database
- [ ] MONGODB_URI

### Customer Auth
- [ ] AUTH_SECRET
- [ ] OTP_PROVIDER (default: "mock")
- [ ] OTP_MOCK_ENABLED (default: "true")

### Admin Auth
- [ ] ADMIN_EMAIL
- [ ] ADMIN_PASSWORD
- [ ] ADMIN_AUTH_SECRET (optional, falls back to AUTH_SECRET)

### Razorpay (Optional, if payment enabled)
- [ ] RAZORPAY_KEY_ID
- [ ] RAZORPAY_KEY_SECRET

### Shiprocket (Optional, if shipping enabled)
- [ ] SHIPROCKET_EMAIL
- [ ] SHIPROCKET_PASSWORD
- [ ] SHIPROCKET_PICKUP_PINCODE
- [ ] SHIPROCKET_PICKUP_LOCATION (optional, default "Primary")

### Cloudinary (Optional, if image upload enabled)
- [ ] CLOUDINARY_CLOUD_NAME
- [ ] CLOUDINARY_API_KEY
- [ ] CLOUDINARY_API_SECRET

### CORS (Admin API)
- [ ] ADMIN_ALLOWED_ORIGINS (comma-separated, e.g., "http://localhost:3001,https://admin.example.com")

### Cron (Internal)
- [ ] CRON_SECRET (for sync-order-status endpoint)

### Other
- [ ] NODE_ENV ("production" or "development")

---

## 18. Where Do I Edit This?

### CUSTOMER UI

| I want to change | Exact current file |
|---|---|
| Global providers / nesting | `redlinenext/src/app/layout.jsx` |
| Global storefront shell | `redlinenext/src/components/RootLayoutClient.jsx` |
| Announcement bar | `redlinenext/src/components/layout/AnnouncementBar.jsx` |
| Navbar / drawer navigation | `redlinenext/src/components/layout/MainNavbar.jsx` |
| Footer | `redlinenext/src/components/layout/Footer.jsx` |
| Homepage composition | `redlinenext/src/app/(customer)/page.jsx` |
| Homepage hero | `redlinenext/src/components/home/HeroCarousel.jsx` |
| Homepage collection block | `redlinenext/src/components/home/CollectionSection.jsx` |
| For Him block | `redlinenext/src/components/home/ForHimSection.jsx` |
| For Her block | `redlinenext/src/components/home/ForHerSection.jsx` |
| Current homepage story block | `redlinenext/src/components/home/OurStorySection.jsx` |
| Product card | `redlinenext/src/components/product/ProductCard.jsx` |
| Collection page | `redlinenext/src/app/(customer)/collection/page.jsx` |
| Product page | `redlinenext/src/app/(customer)/product/[slug]/page.jsx` |
| Product reviews | `redlinenext/src/features/customer/reviews/ProductReviews.jsx` |
| Cart drawer | `redlinenext/src/features/customer/cart/CartDrawer.jsx` |
| Cart page | `redlinenext/src/app/(customer)/cart/page.jsx` |
| Login page | `redlinenext/src/app/(auth)/login/page.jsx` |
| Reusable auth modal | `redlinenext/src/features/customer/auth/AuthModal.jsx` |
| OTP UI | `redlinenext/src/features/customer/auth/PhoneOtpForm.jsx` |
| Profile/account | `redlinenext/src/features/customer/account/AccountPage.jsx` |
| Checkout controller/UI | `redlinenext/src/features/customer/checkout/CheckoutPage.jsx` |
| Delivery address | `redlinenext/src/features/customer/checkout/DeliveryAddress.jsx` |
| Checkout coupon UI | `redlinenext/src/features/customer/checkout/CouponSection.jsx` |
| Checkout order summary | `redlinenext/src/features/customer/checkout/OrderSummary.jsx` |
| Payment selector | `redlinenext/src/features/customer/checkout/PaymentMethod.jsx` |
| Orders list | `redlinenext/src/features/customer/orders/OrdersPage.jsx` |
| Order card | `redlinenext/src/features/customer/orders/OrderCard.jsx` |
| Order details | `redlinenext/src/features/customer/orders/OrderDetails.jsx` |
| Tracking UI | `redlinenext/src/features/customer/orders/TrackingInfo.jsx` |
| Global notification renderer | `redlinenext/src/components/Notification.jsx` |
| Auth state | `redlinenext/src/context/AuthContext.jsx` |
| Cart state | `redlinenext/src/context/CartContext.jsx` |
| Coupon state | `redlinenext/src/context/CouponContext.jsx` |
| Notification state | `redlinenext/src/context/NotificationContext.jsx` |

### BACKEND API & LOGIC

| I want to change | Exact current file/folder |
|---|---|
| Product schema | `redlinenext/src/models/Product.js` |
| Public/admin product serialization | `redlinenext/src/lib/api/products.js` |
| Product public APIs | `redlinenext/src/app/api/products/` |
| Customer auth/session | `redlinenext/src/lib/auth/session.js` + `src/app/api/auth/` |
| OTP provider | `redlinenext/src/lib/auth/otpProvider.js` |
| User/profile schema | `redlinenext/src/models/User.js` |
| DB connection | `redlinenext/src/lib/db.js` |
| Client API wrapper | `redlinenext/src/lib/clientApi.js` |
| Cart/pricing server calculation | `redlinenext/src/lib/orders/pricing.js` |
| Stock deduction | `redlinenext/src/lib/orders/pricing.js` |
| Coupon calculation | `redlinenext/src/lib/orders/pricing.js` + `src/app/api/coupons/validate/route.js` |
| COD checkout | `redlinenext/src/app/api/checkout/cod/route.js` |
| Razorpay helper | `redlinenext/src/lib/payments/razorpay.js` |
| Razorpay create | `redlinenext/src/app/api/checkout/razorpay/create/route.js` |
| Razorpay verify | `redlinenext/src/app/api/checkout/razorpay/verify/route.js` |
| Order schema | `redlinenext/src/models/Order.js` |
| Customer order APIs | `redlinenext/src/app/api/orders/` |
| Shiprocket helper | `redlinenext/src/lib/shipping/shiprocket.js` |
| Shipping serviceability | `redlinenext/src/app/api/shipping/serviceability/route.js` |
| Tracking | `redlinenext/src/app/api/shipping/tracking/route.js` |
| Shipment status sync | `redlinenext/src/app/api/internal/sync-order-status/route.js` |
| Review schema | `redlinenext/src/models/Review.js` |
| Customer review APIs | `redlinenext/src/app/api/reviews/` |
| Admin review moderation API | `redlinenext/src/app/api/admin/reviews/` |
| Cloudinary signing | `redlinenext/src/lib/cloudinary/server.js` + `src/app/api/upload/cloudinary-signature/route.js` |
| Admin CORS | `redlinenext/src/lib/api/cors.js` |
| Validation | `redlinenext/src/lib/validation.js` |
| API response envelope | `redlinenext/src/lib/api/response.js` |

### ADMIN FRONTEND

| I want to change | Exact current file/folder |
|---|---|
| Protected admin shell/session check | `redlineadmin/src/components/LayoutWrapper.jsx` |
| Navbar | `redlineadmin/src/components/Navbar.jsx` |
| Sidebar | `redlineadmin/src/components/Sidebar.jsx` |
| Login | `redlineadmin/src/app/login/page.jsx` |
| **Primary dashboard** | `redlineadmin/src/app/admin/page.jsx` |
| `/dashboard` compatibility redirect | `redlineadmin/src/app/dashboard/page.jsx` |
| Product list | `redlineadmin/src/app/list/page.jsx` |
| Add product | `redlineadmin/src/app/add/page.jsx` |
| Edit product | `redlineadmin/src/app/edit/[id]/page.jsx` |
| Orders | `redlineadmin/src/app/orders/page.jsx` / `src/features/admin/orders/` |
| Users | `redlineadmin/src/app/users/page.jsx` / `src/features/admin/users/` |
| Reviews | `redlineadmin/src/app/reviews/page.jsx` / `src/features/admin/reviews/` |
| Coupons | `redlineadmin/src/app/coupon/page.jsx` / `src/features/admin/coupons/` |
| API client | `redlineadmin/src/lib/api.js` |
| Notifications | `redlineadmin/src/context/NotificationContext.jsx` + `src/components/Notification.jsx` |

## 19. What NOT to Use

### Legacy runtime

**`redlineBackend/`** is reference-only for the current architecture. New customer/admin work should use `redlinenext/src/app/api`, `redlinenext/src/lib`, and `redlinenext/src/models`.

### Retired architecture concepts

| Do not reintroduce | Current source of truth |
|---|---|
| `ShopContext` mega-context | `AuthContext` + `CartContext` + `CouponContext` + `NotificationContext` |
| `DeliveryContext` mock serviceability/ETA state | Checkout-local address/serviceability state + `/api/shipping/serviceability` |
| Firebase / email magic-link storefront auth | Phone OTP + `customer_session` in active Next.js API |
| MongoDB/account cart | `CartContext` + device-local `localStorage["perfume_cart"]` |
| Cross-device cart sync / guest-account cart merge | No cart sync or merge; each browser/device owns its cart |
| Static `src/data/products.js` as catalog | MongoDB Product model + `/api/products` |
| Old Express ecommerce API | `redlinenext/src/app/api/*` |
| Old/disconnected CartPreview/CartTotal/product/review UI as source-of-truth | Current `features/customer/*`, `components/layout/*`, `components/home/*`, `components/product/ProductCard.jsx` |

### Security / architecture reminders

- Do not make customer auth depend on a localStorage token; the current protected customer API is session-cookie based.
- Do not expose server secrets through `NEXT_PUBLIC_*` variables.
- Do not trust client-side order totals; checkout recalculates products, prices, stock and coupons server-side.
- Do not expose `costPrice` in public product serialization.
- Do not reconnect active customer/admin flows to `redlineBackend` unless a deliberate migration decision is made.

## 20. Active External Services

| Service | Purpose | Source Status | Runtime Status | Notes |
|---------|---------|---|---|---|
| **MongoDB** | Data persistence | ✅ SOURCE_VERIFIED | ❓ UNVERIFIED | Connection pooling configured; requires MONGODB_URI |
| **OTP Provider** | Customer authentication | ⚠️ MOCK/DEV IMPLEMENTED | ❓ LIVE PROVIDER UNVERIFIED | Real provider implementation/configuration is not present in the audited source |
| **Razorpay** | Payment processing | ✅ SOURCE_VERIFIED | ❓ UNVERIFIED | SDK initialization, signature verification present; live API calls not tested |
| **Shiprocket** | Shipping logistics | ✅ SOURCE_VERIFIED | ❓ UNVERIFIED | Token caching, serviceability, order creation, tracking all present; live API calls not tested |
| **Cloudinary** | Image hosting | ✅ SOURCE_VERIFIED | ❓ UNVERIFIED | Signature generation present; direct upload not tested end-to-end |

### Configuration Status

| Service | Required? | Env Var Requirement | Deployment Impact |
|---------|---|---|---|
| MongoDB | YES | MONGODB_URI | App throws 503 if missing |
| OTP (real) | NO | OTP_PROVIDER, OTP_API_KEY | Defaults to "mock" (only works in dev) |
| Razorpay | NO | RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET | Checkout endpoints throw 503 if keys missing |
| Shiprocket | NO | SHIPROCKET_*, SHIPROCKET_PICKUP_PINCODE | Orders created with syncStatus: "not_configured" if missing |
| Cloudinary | NO | CLOUDINARY_* | Upload endpoint throws 503 if keys missing |

---

## 21. Known Unverified Items

From Part 4, items NOT tested at runtime but source-verified:

| Component | Status | Notes |
|-----------|--------|-------|
| **Real OTP Provider** | SOURCE_ONLY | Mock OTP works; real SMS/email provider not implemented |
| **Razorpay Integration (Live)** | SOURCE_ONLY | Code present; signature verification logic solid; actual payment processing not tested |
| **Shiprocket Integration (Live)** | SOURCE_ONLY | Token caching, order creation, tracking calls present; live Shiprocket API not tested |
| **Cloudinary Upload (End-to-End)** | SOURCE_ONLY | Signature generation works; direct upload to Cloudinary + client-side image receive not tested |
| **Cron Deployment** | UNKNOWN | sync-order-status route exists; cron job execution not verified (may not be running in production) |
| **Admin CORS Deployment** | SOURCE_ONLY | CORS logic works; admin.example.com origin setup not verified |
| **Database Connection Pool** | SOURCE_ONLY | Serverless caching configured; production pool behavior under load not tested |

**For Production**:
- ⚠️ Customer OTP mock/dev path = source-documented; real production SMS provider still requires implementation/configuration and runtime testing
- ⚠️ Razorpay = code correct, but test with test keys first
- ⚠️ Shiprocket = code correct, but coordinate with Shiprocket support for test setup
- ⚠️ Cloudinary = code correct, but verify admin uploads work end-to-end
- ⚠️ Cron = set up scheduling manually (Vercel Cron, AWS Lambda, external service, etc.)

---

## 22. Development / Testing Checklist

Manual end-to-end flow for QA:

### Customer Flow

- [ ] Navigate to `http://localhost:3000`
  - [ ] Hero banner displays
  - [ ] Featured products load
  - [ ] Navigation bar shows (no login button if not logged in)

- [ ] Click "Collection" or "For Him"
  - [ ] Product list loads with category filter
  - [ ] Products have images, names, prices
  - [ ] Can see "Add to Cart" button

- [ ] Click product card
  - [ ] Product detail page loads
  - [ ] Variant selector shows "10 ML" / "50 ML"
  - [ ] Price updates with variant
  - [ ] Reviews section visible
  - [ ] "Add to Cart" button works

- [ ] Add product to cart
  - [ ] Cart icon shows quantity badge
  - [ ] Can open cart drawer (slide-out)
  - [ ] Item appears in drawer with quantity selector
  - [ ] "Proceed to Checkout" button visible

- [ ] Navigate to `/cart`
  - [ ] Full cart page shows items
  - [ ] Can update quantities
  - [ ] Subtotal calculated
  - [ ] "Apply Coupon" input visible

- [ ] Apply coupon (optional, if coupon exists)
  - [ ] Admin must create coupon first
  - [ ] POST /api/coupons/validate returns discount
  - [ ] Total updates with discount

- [ ] Click "Proceed to Checkout"
  - [ ] Redirected to `/place-order`
  - [ ] If not logged in: "Login Required" or redirect to `/login`

- [ ] Login with OTP
  - [ ] Enter phone number
  - [ ] Click "Send OTP"
  - [ ] In dev: see devOtp in console or notification
  - [ ] Enter OTP
  - [ ] Click "Verify"
  - [ ] Logged in; redirect to checkout

- [ ] On checkout page
  - [ ] Existing addresses shown (if user has addresses)
  - [ ] Can select address or enter new one
  - [ ] Enter/confirm delivery address: fullName, addressLine, city, state, pincode
  - [ ] Click "Check Serviceability" (optional)
  - [ ] Pincode validated; couriers shown (if serviceable)

- [ ] Choose Payment: COD
  - [ ] Select "Cash on Delivery" radio
  - [ ] Click "Place Order"
  - [ ] POST /api/checkout/cod called
  - [ ] Order created in DB
  - [ ] Notification: "Order placed successfully"
  - [ ] Navigate to `/orders`
  - [ ] Show order number (ORD-YYYYMMDD-RANDOM)

- [ ] Alternative: Choose Payment: Razorpay
  - [ ] Select "Pay with Razorpay" radio
  - [ ] Click "Pay Now"
  - [ ] POST /api/checkout/razorpay/create called
  - [ ] Razorpay popup opens (in test mode)
  - [ ] Use test card: 4111 1111 1111 1111, any future date, any CVV
  - [ ] Complete payment
  - [ ] Razorpay returns signature
  - [ ] POST /api/checkout/razorpay/verify called
  - [ ] Order marked as "paid"
  - [ ] Success notification
  - [ ] Navigate to `/orders`

- [ ] Order Confirmation
  - [ ] Order number, items, total displayed
  - [ ] Cart cleared (empty cart)

- [ ] Navigate to `/orders`
  - [ ] My Orders page shows the new order
  - [ ] Order status: "confirmed"

- [ ] Click on order
  - [ ] Order details page (`/orders/[orderId]`)
  - [ ] Items listed with names, sizes, quantities, prices
  - [ ] Delivery address shown
  - [ ] Order status, payment status displayed
  - [ ] If Shiprocket synced: "Track Your Order" button with URL
  - [ ] If no tracking yet: "Tracking not available"

- [ ] Tracking
  - [ ] If awbCode present: GET /api/shipping/tracking called
  - [ ] Shiprocket tracking URL opens
  - [ ] Shows courier name, AWB code, current status, expected delivery

- [ ] Write Review
  - [ ] Scroll to reviews section on product page (or from order details)
  - [ ] "Write a Review" button
  - [ ] Rate 1-5 stars
  - [ ] Enter title (optional)
  - [ ] Enter text (required)
  - [ ] Upload photos (max 2)
  - [ ] Submit review
  - [ ] Success notification: "Review submitted (pending approval)"

- [ ] Logout
  - [ ] Click profile/logout button
  - [ ] POST /api/auth/logout called
  - [ ] Redirect to login
  - [ ] Verify customer_session cookie cleared

### Admin Flow

- [ ] Navigate to `http://localhost:3001` (redlineadmin)
  - [ ] Redirected to login

- [ ] Admin Login
  - [ ] Email: value of ADMIN_EMAIL (from .env)
  - [ ] Password: value of ADMIN_PASSWORD
  - [ ] Click "Login"
  - [ ] POST /api/admin/auth/login called
  - [ ] Redirect to `/admin`

- [ ] Dashboard
  - [ ] See KPIs: Total Orders, Revenue, Customers, Products
  - [ ] Recent orders list
  - [ ] Low stock products alert

- [ ] Products Management
  - [ ] Click "Products" or "List"
  - [ ] GET /api/admin/products returns all products (including draft)
  - [ ] costPrice shown (should NOT be public to customers)
  - [ ] Can see "Add", "Edit", "Delete" buttons

- [ ] Add Product
  - [ ] Click "Add Product"
  - [ ] Fill form:
    - [ ] Name, slug, category (Men/Women/Unisex)
    - [ ] Description, shortDescription
    - [ ] Images (upload via Cloudinary)
      - [ ] Click upload button
      - [ ] POST /api/upload/cloudinary-signature called
      - [ ] Receive signature, timestamp, folder
      - [ ] Browser uploads directly to Cloudinary
      - [ ] Image URL returned and inserted
    - [ ] Variants: add sizes "10 ML", "50 ML"
      - [ ] Set sellingPrice, mrp, costPrice, stock for each
    - [ ] Set status: draft or published
  - [ ] Click "Create Product"
  - [ ] POST /api/admin/products called
  - [ ] New product appears in list

- [ ] Edit Product
  - [ ] Click edit button on product
  - [ ] GET /api/admin/products/[id] loads product
  - [ ] Form pre-filled
  - [ ] Modify fields
  - [ ] Click "Update"
  - [ ] PUT /api/admin/products/[id] called

- [ ] Orders Management
  - [ ] Click "Orders"
  - [ ] GET /api/admin/orders returns all orders
  - [ ] Can filter by status (confirmed, processing, shipped, delivered, cancelled)
  - [ ] Each order shows: orderNumber, customer, total, status, payment status
  - [ ] Click order row
  - [ ] Can update orderStatus
  - [ ] PATCH /api/admin/orders/[orderId] called

- [ ] Users Management
  - [ ] Click "Users"
  - [ ] GET /api/admin/users returns all users
  - [ ] Can search by phone/email/name
  - [ ] Can filter by status (active, suspended)
  - [ ] Click user
  - [ ] Can toggle status: active ↔ suspended
  - [ ] PATCH /api/admin/users/[userId] called

- [ ] Reviews Moderation
  - [ ] Click "Reviews"
  - [ ] GET /api/admin/reviews returns all reviews
  - [ ] Can filter by approved status, rating, product
  - [ ] See pending reviews (approved: false)
  - [ ] Click "Approve" button
  - [ ] PATCH /api/admin/reviews/[reviewId] { approved: true }
  - [ ] Review now appears public on product page

- [ ] Coupons Management
  - [ ] Click "Coupons"
  - [ ] GET /api/admin/coupons returns all coupons
  - [ ] Can add new coupon:
    - [ ] Code (uppercase, alphanumeric, unique)
    - [ ] discountType: percentage or fixed
    - [ ] discountValue
    - [ ] minimumOrder (optional)
    - [ ] expiryDate (future date)
  - [ ] Click "Create"
  - [ ] POST /api/admin/coupons called
  - [ ] Can edit/delete coupons
  - [ ] PATCH /api/admin/coupons/[id] or DELETE

- [ ] Logout
  - [ ] Click logout
  - [ ] POST /api/admin/auth/logout called
  - [ ] Redirect to login

---

## 23. Deployment Mental Model

### redlinenext (Customer + API)

**Current Hosting**: Likely Vercel (based on vercel.json, open-next.config.ts)

```
├─ Frontend (Next.js App Router)
│  ├─ Serves customer pages: /, /collection, /product/[slug], /cart, /place-order, etc.
│  └─ Client-side routing + hydration
│
├─ API Routes (src/app/api/*)
│  ├─ 36 endpoints (products, auth, checkout, orders, reviews, shipping, admin, internal, health)
│  ├─ All routes run on Node.js runtime (export const runtime = "nodejs")
│  ├─ Each route has requireUser() or requireAdmin() middleware as needed
│  └─ Database: MongoDB (MONGODB_URI env var)
│
├─ External Services
│  ├─ MongoDB: MONGODB_URI
│  ├─ Razorpay: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
│  ├─ Shiprocket: SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_PICKUP_PINCODE
│  ├─ Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
│  └─ OTP: OTP_PROVIDER (default "mock", only works in dev)
│
└─ Deployment: vercel deploy
   ├─ Install: npm install
   ├─ Build: npm run build
   ├─ Start: npm start (or automatic on Vercel)
   └─ Env vars: Set in Vercel dashboard or via .env.production
```

### redlineadmin (Admin Frontend)

**Current Hosting**: Likely Vercel (separate deployment)

```
├─ Frontend (Next.js 16)
│  ├─ Serves: /login, /dashboard, /add, /edit, /list, /orders, /users, /reviews, /coupon
│  ├─ Client-side auth check: localStorage "token" + GET /api/admin/auth/me
│  └─ Protected by LayoutWrapper.jsx
│
├─ API Calls
│  ├─ Base URL: `NEXT_PUBLIC_API_BASE_URL` or fallback `NEXT_PUBLIC_BACKEND_URL`, then localhost fallback
│  ├─ Authorization: admin_session HttpOnly cookie + Bearer token (if fallback)
│  └─ CORS enforced: ADMIN_ALLOWED_ORIGINS on redlinenext side
│
└─ Deployment: vercel deploy
   ├─ Set `NEXT_PUBLIC_API_BASE_URL` (preferred) or `NEXT_PUBLIC_BACKEND_URL` to the redlinenext API origin
   ├─ Env: .env.local or Vercel dashboard
   └─ No backend; calls redlinenext API
```

### Multi-Deployment Relationship

```
Customer Browser @ https://redline.example.com
  ↓
  Calls redlinenext API @ https://redline.example.com/api/*
  
Admin Browser @ https://admin-redline.example.com
  ↓
  Calls redlinenext API @ https://redline.example.com/api/admin/*
  ↓
  CORS check: If origin !== in ADMIN_ALLOWED_ORIGINS, request blocked
  ↓
  Authorization: admin_session HttpOnly cookie + requireAdmin() middleware
```

**Admin Frontend Deployment Must Set**:
- `NEXT_PUBLIC_API_BASE_URL=https://redline.example.com` (or wherever redlinenext lives)
- This tells redlineadmin where to send API requests

**redlinenext Deployment Must Set**:
- `ADMIN_ALLOWED_ORIGINS=https://admin-redline.example.com` (comma-separated if multiple)
- This tells redlinenext which admin origins are allowed to call /api/admin/*

### Environment Variables Checklist for Production

**Shared** (both redlinenext + external services):
- [ ] MONGODB_URI (production DB URL)
- [ ] AUTH_SECRET (random string, 32+ chars)
- [ ] NODE_ENV=production

**redlinenext Only**:
- [ ] ADMIN_EMAIL (admin login email)
- [ ] ADMIN_PASSWORD (admin login password, plaintext)
- [ ] ADMIN_AUTH_SECRET (or defaults to AUTH_SECRET)
- [ ] RAZORPAY_KEY_ID (production key)
- [ ] RAZORPAY_KEY_SECRET (production secret)
- [ ] SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_PICKUP_PINCODE
- [ ] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- [ ] ADMIN_ALLOWED_ORIGINS=https://admin.example.com
- [ ] CRON_SECRET (random string for /api/internal/sync-order-status)
- [ ] OTP_PROVIDER (set to actual provider if not mocking)

**redlineadmin Only**:
- [ ] NEXT_PUBLIC_API_BASE_URL=https://redline.example.com (or IP)

---

## 24. Final 1-Page Mental Model

> **Use this section together with the correction invariants above:** customer cart key is `perfume_cart`, cart survives auth changes, customer homepage lives under `(customer)`, and `/admin` is the primary admin dashboard.

### FRONTEND

**Customer App** (redlinenext)
- Next.js 16 App Router
- Routes: /, /login, /collection, /product/[slug], /cart, /place-order, /profile, /orders, /orders/[id], /about, /contact, /privacy, /terms
- State: AuthContext (user/session UI state), CartContext (`perfume_cart` + product cache), CouponContext (`perfume_coupon_code` + server totals), NotificationContext (toasts)
- Key UI: MainNavbar, HeroCarousel, ProductCard, CartDrawer, CheckoutPage, ProductReviews
- Auth: OTP-based customer login → customer_session HttpOnly cookie (30-day TTL)
- Cart: Browser localStorage only; cleared after checkout; survives logout
- Checkout: Address selection → Serviceability check (optional) → Coupon (optional) → COD or Razorpay

### BACKEND (API)

**redlinenext/src/app/api/** — 36 routes
- **Customer** (requireUser): auth (send/verify OTP, me, logout), checkout (COD, Razorpay create/verify), orders, reviews (CRUD), shipping (tracking)
- **Public**: products (list/by-id/by-slug), reviews (public by product), shipping (serviceability), coupons (validate), health
- **Admin** (requireAdmin + CORS): auth (login, me, logout), dashboard, products (CRUD), orders (get, patch status), users (get, patch status), reviews (get, patch, delete), coupons (CRUD), upload (Cloudinary signature)
- **Internal** (Bearer CRON_SECRET): sync-order-status (cron job)
- **Response Envelope**: `{ success: true/false, data: {...}, error: { code, message, details } }`
- **Auth**: customer_session (30-day JWT cookie) vs admin_session (8-hour JWT cookie); HttpOnly, Secure (prod), SameSite

### ADMIN

**redlineadmin** — Next.js frontend calling redlinenext API
- Routes: /login, /admin (primary dashboard), /dashboard (redirect/compatibility), /add, /edit/[id], /list, /orders, /users, /reviews, /coupon
- API Calls: base URL comes from `NEXT_PUBLIC_API_BASE_URL` or fallback `NEXT_PUBLIC_BACKEND_URL` and points to redlinenext
- Auth: Email/password login → admin_session cookie (also checks localStorage "token" marker for client-side routing)
- CORS: ADMIN_ALLOWED_ORIGINS env var on redlinenext side

### DATABASE

**MongoDB** — 6 models
- **Product**: name, slug, category (Men|Women|Unisex), variants (size: [10ML, 50ML], sellingPrice, mrp, costPrice, stock), status (draft|published), images, FAQ, etc. Indexes: category+status, featured+status, bestseller+status
- **User**: phone (unique), phoneVerified, firstName, lastName, email, addresses (nested array, max 10), status (active|suspended)
- **Order**: orderNumber (unique), user, customer (snapshot), deliveryAddress, items (snapshot: productId, name, size, qty, unitPrice), amounts (subtotal, discount, finalAmount), coupon, payment (method, paymentStatus, razorpayIds), orderStatus, shiprocket (IDs, AWB, syncStatus)
- **Review**: product, user, rating (1-5), title, text, photos (max 2), approved (default false), verifiedPurchase (computed). Unique: product+user
- **Coupon**: code (unique), discountType (percentage|fixed), discountValue, minimumOrder, expiryDate, active
- **OtpVerification**: phone, otpHash (HMAC-SHA256), attempts (max 5), expiresAt (10-min TTL auto-delete), consumedAt

### AUTH

**Customer**:
- Phone → OTP (mock-only; real provider not implemented) → Verify → User → customer_session JWT cookie (sub: user._id, phone, type: "customer", 30-day TTL)
- Each protected call: requireUser() checks cookie, verifies JWT, loads user from DB, checks status !== "suspended"

**Admin**:
- Email/password → admin_session JWT cookie (sub: "admin", type: "admin", 8-hour TTL)
- Each protected call: requireAdmin() checks cookie, verifies JWT, checks type === "admin"
- Separate from customer; both HttpOnly

### CART

- localStorage key: "perfume_cart"
- Items: [{ productId, size, quantity }, ...]
- Persists across page reloads
- Survives logout (intentional)
- Cleared after successful checkout
- Not synced to backend or across devices
- Server recalculates total on checkout (client total never trusted)

### CHECKOUT

**COD Flow**: calculateCart → validateAddress → deductStock → Order.create → createShiprocketOrder → success

**Razorpay Flow**: calculateCart (Step 1) → Razorpay order creation → customer payment → verify signature → deductStock (Step 2) → Order complete → Shiprocket

**Key**: Stock deducted at different times; both flows revalidate coupon + prices

### PAYMENTS

**Razorpay**: 
- Client receives razorpay.keyId (public) + razorpay.orderId from /checkout/razorpay/create
- Client opens Razorpay popup; pays
- Client receives razorpay_order_id, razorpay_payment_id, razorpay_signature
- Server verifies HMAC-SHA256(orderId|paymentId, RAZORPAY_KEY_SECRET) using timingSafeEqual (constant-time, prevents timing attacks)

### SHIPPING

**Serviceability**: POST /shipping/serviceability (public) → Shiprocket API → couriers list or "unserviceable"

**Order Creation**: Non-blocking after COD/Razorpay; if fails, syncStatus = "failed"; admin can retry

**Tracking**: GET /shipping/tracking (customer) → Shiprocket tracking by AWB code

**Status Sync**: Cron job (sync-order-status) polls Shiprocket for shipment status updates (LIVE_UNVERIFIED)

### REVIEWS

- Customer creates → approved: false (pending moderation)
- Admin approves → approved: true
- Public endpoint shows only approved reviews + rating aggregation
- One review per user per product (unique index)
- verifiedPurchase: true if user has paid/cod order with product, not cancelled

### LEGACY

**redlineBackend** (Express + Firebase): Reference only, do not use as model. Old patterns (ShopContext, Firebase auth, cart collection) deprecated.

---

**Maintained by**: [Developer name]
**Last Verified**: 2026-08-17
**NPM Build Status**: PASS (lint + build successful)
**Next Actions**: 
- Test Razorpay with live test keys
- Test Shiprocket with staging account
- Test Cloudinary upload end-to-end
- Set up cron job for sync-order-status
- Implement real OTP provider (if required)
