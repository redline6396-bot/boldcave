# REDLINE Project Architecture — Part 1

This document is a source-of-truth architecture record for the currently active customer storefront in redlinenext. It intentionally focuses on the live app structure and route/component flow that is present in the current workspace. It does not attempt to redesign or rewrite the app, and it intentionally excludes deep analysis of redlineadmin and redlineBackend beyond the repo-level split described below.

---

## 1. Root Repository Structure

Actual repository layout from the current workspace:

```text
C:\Users\kushg\OneDrive\Desktop\REDLINE
├─ redlineadmin/
│  ├─ eslint.config.mjs
│  ├─ jsconfig.json
│  ├─ next.config.mjs
│  ├─ package.json
│  ├─ postcss.config.mjs
│  ├─ README.md
│  ├─ public/
│  └─ src/
│     ├─ app/
│     ├─ assets/
│     ├─ components/
│     ├─ context/
│     ├─ features/
│     ├─ lib/
│     └─ ...
├─ redlineBackend/
│  ├─ package.json
│  ├─ server.js
│  ├─ config/
│  ├─ controllers/
│  ├─ middleware/
│  ├─ models/
│  ├─ routes/
│  ├─ services/
│  └─ utils/
├─ redlinenext/
│  ├─ .env.example
│  ├─ .env.local
│  ├─ eslint.config.mjs
│  ├─ jsconfig.json
│  ├─ next.config.mjs
│  ├─ open-next.config.ts
│  ├─ package.json
│  ├─ postcss.config.mjs
│  ├─ README.md
│  ├─ vercel.json
│  ├─ wrangler.jsonc
│  ├─ public/
│  └─ src/
│     ├─ app/
│     ├─ assets/
│     ├─ components/
│     ├─ context/
│     ├─ data/
│     ├─ features/
│     ├─ hooks/
│     ├─ lib/
│     ├─ models/
│     ├─ utils/
│     └─ ...
├─ PROJECT_ARCHITECTURE_PART_1.md
└─ ...
```

### Repository-level interpretation

- redlinenext is the active storefront and API application in the source tree.
- redlineadmin is a separate Next.js application for admin management and it calls the server routes under redlinenext, not a separate customer backend.
- redlineBackend is still present in the repo but is not the active runtime path for the customer or admin flows traced in this architecture audit.
- The core business logic, order processing, auth/session enforcement, and product/catalog logic in the current source are concentrated in redlinenext/src.

---

## 2. redlinenext Structure

Actual real tree for the active app:

```text
redlinenext/
├─ .dev.vars
├─ .env.example
├─ .env.local
├─ .gitignore
├─ .next/
├─ .open-next/
├─ dev-server-3000.err.log
├─ dev-server-3000.log
├─ dev-server-3001.err.log
├─ dev-server-3001.log
├─ dev-server.err.log
├─ dev-server.log
├─ eslint.config.mjs
├─ jsconfig.json
├─ next.config.mjs
├─ node_modules/
├─ open-next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public/
├─ README.md
├─ src/
│  ├─ app/
│  │  ├─ (auth)/
│  │  │  └─ login/
│  │  ├─ (customer)/
│  │  │  ├─ about/
│  │  │  ├─ cart/
│  │  │  ├─ collection/
│  │  │  ├─ contact/
│  │  │  ├─ orders/
│  │  │  ├─ page.jsx
│  │  │  ├─ place-order/
│  │  │  ├─ product/
│  │  │  ├─ profile/
│  │  │  └─ ...
│  │  ├─ api/
│  │  │  ├─ admin/
│  │  │  ├─ auth/
│  │  │  ├─ checkout/
│  │  │  ├─ coupons/
│  │  │  ├─ health/
│  │  │  ├─ internal/
│  │  │  ├─ orders/
│  │  │  ├─ products/
│  │  │  ├─ reviews/
│  │  │  ├─ shipping/
│  │  │  └─ upload/
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.jsx
│  │  ├─ privacy/
│  │  └─ terms/
│  ├─ assets/
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ AuthPrompt.jsx
│  │  ├─ BenefitsSection.jsx
│  │  ├─ Hero.jsx
│  │  ├─ Notification.css
│  │  ├─ Notification.jsx
│  │  ├─ OurStorySection.jsx
│  │  ├─ PhotoGalleryLightbox.jsx
│  │  ├─ ReviewCard.jsx
│  │  ├─ ReviewForm.jsx
│  │  ├─ ReviewList.jsx
│  │  ├─ ReviewsSection.jsx
│  │  ├─ RootLayoutClient.jsx
│  │  ├─ StarRating.jsx
│  │  ├─ account/
│  │  ├─ cart/
│  │  ├─ checkout/
│  │  ├─ common/
│  │  ├─ home/
│  │  ├─ layout/
│  │  ├─ product/
│  │  └─ ...
│  ├─ context/
│  │  ├─ AuthContext.jsx
│  │  ├─ CartContext.jsx
│  │  ├─ CouponContext.jsx
│  │  └─ NotificationContext.jsx
│  ├─ data/
│  ├─ features/
│  │  └─ customer/
│  │     ├─ account/
│  │     ├─ auth/
│  │     ├─ cart/
│  │     ├─ checkout/
│  │     ├─ orders/
│  │     └─ reviews/
│  ├─ hooks/
│  ├─ lib/
│  │  ├─ api/
│  │  ├─ auth/
│  │  ├─ clientApi.js
│  │  ├─ db.js
│  │  ├─ orders/
│  │  ├─ payments/
│  │  ├─ shipping/
│  │  ├─ validation.js
│  │  └─ ...
│  ├─ models/
│  │  ├─ Coupon.js
│  │  ├─ Order.js
│  │  ├─ OtpVerification.js
│  │  ├─ Product.js
│  │  ├─ Review.js
│  │  └─ User.js
│  ├─ utils/
│  └─ ...
└─ ...
```

### Structural interpretation

The active app is modelled as:

- app router pages in src/app
- global shell and provider nesting in src/app/layout.jsx
- shared UI chrome in src/components and src/components/layout
- customer feature pages in src/features/customer
- global state in src/context
- client API wrappers in src/lib/clientApi.js
- server routes in src/app/api
- Mongo models in src/models

---

## 3. src Structure

Important current folders and files in the active app:

### src/app

Primary route tree used by the live storefront.

```text
src/app/
├─ (auth)/
│  └─ login/page.jsx
├─ (customer)/
│  ├─ about/page.jsx
│  ├─ cart/page.jsx
│  ├─ collection/page.jsx
│  ├─ contact/page.jsx
│  ├─ orders/page.jsx
│  ├─ orders/[orderId]/page.jsx
│  ├─ page.jsx
│  ├─ place-order/page.jsx
│  ├─ product/[slug]/page.jsx
│  ├─ profile/page.jsx
│  └─ ...
├─ api/
│  ├─ admin/
│  ├─ auth/
│  ├─ checkout/
│  ├─ coupons/
│  ├─ health/
│  ├─ internal/
│  ├─ orders/
│  ├─ products/
│  ├─ reviews/
│  ├─ shipping/
│  ├─ upload/
│  └─ ...
├─ globals.css
├─ layout.jsx
├─ privacy/page.jsx
├─ terms/page.jsx
└─ favicon.ico
```

### src/context

```text
src/context/
├─ AuthContext.jsx
├─ CartContext.jsx
├─ CouponContext.jsx
└─ NotificationContext.jsx
```

These are the live app-wide providers used by the root layout.

### src/lib

```text
src/lib/
├─ clientApi.js
├─ db.js
├─ validation.js
├─ api/
├─ auth/
├─ orders/
├─ payments/
├─ shipping/
├─ ...
```

This is the network boundary and server-side business logic layer for the current app.

### src/features/customer

```text
src/features/customer/
├─ account/
│  └─ AccountPage.jsx
├─ auth/
│  ├─ AuthModal.jsx
│  └─ PhoneOtpForm.jsx
├─ cart/
│  └─ CartDrawer.jsx
├─ checkout/
│  ├─ CheckoutPage.jsx
│  ├─ CouponSection.jsx
│  ├─ DeliveryAddress.jsx
│  ├─ OrderSummary.jsx
│  └─ PaymentMethod.jsx
├─ orders/
│  ├─ OrderCard.jsx
│  ├─ OrderDetails.jsx
│  ├─ OrdersAuthGate.jsx
│  ├─ OrdersPage.jsx
│  ├─ TrackingInfo.jsx
│  └─ ...
├─ reviews/
│  └─ ProductReviews.jsx
└─ ...
```

### src/components

```text
src/components/
├─ AuthPrompt.jsx
├─ BenefitsSection.jsx
├─ Hero.jsx
├─ Notification.css
├─ Notification.jsx
├─ OurStorySection.jsx
├─ PhotoGalleryLightbox.jsx
├─ ReviewCard.jsx
├─ ReviewForm.jsx
├─ ReviewList.jsx
├─ ReviewsSection.jsx
├─ RootLayoutClient.jsx
├─ StarRating.jsx
├─ home/
│  ├─ CollectionSection.jsx
│  ├─ ForHerSection.jsx
│  ├─ ForHimSection.jsx
│  ├─ HeroCarousel.jsx
│  └─ OurStorySection.jsx
├─ layout/
│  ├─ AnnouncementBar.jsx
│  ├─ Footer.jsx
│  └─ MainNavbar.jsx
├─ product/
│  └─ ProductCard.jsx
├─ ...
```

### src/models

```text
src/models/
├─ Coupon.js
├─ Order.js
├─ OtpVerification.js
├─ Product.js
├─ Review.js
└─ User.js
```

These models are the live persistence layer for catalog, auth, orders, reviews, and coupons.

---

## 4. App Router

This is the actual route map for the active customer storefront and auth flow.

### 4.1 Customer routes

| URL | Page file | Main component imported | Contexts used | APIs used | Purpose |
|---|---|---|---|---|---|
| / | src/app/(customer)/page.jsx | src/components/home/HeroCarousel.jsx, src/components/home/CollectionSection.jsx, src/components/home/ForHimSection.jsx, src/components/home/OurStorySection.jsx, src/components/home/ForHerSection.jsx | None at page-level; global providers still apply | fetchProducts() via src/lib/clientApi.js | Homepage storefront landing page |
| /about | src/app/(customer)/about/page.jsx | local page component | None discovered in file | None discovered in file | About page |
| /cart | src/app/(customer)/cart/page.jsx | local page component | useCart, useCoupon | cart state only; coupon validation through CouponContext -> validateCoupon() | Standalone cart page |
| /collection | src/app/(customer)/collection/page.jsx | src/components/product/ProductCard.jsx | None at page-level | fetchProducts({ category }) | Product listing with category filters |
| /contact | src/app/(customer)/contact/page.jsx | local page component | NotificationContext via useContext | None discovered in file | Contact form page |
| /orders | src/app/(customer)/orders/page.jsx | src/features/customer/orders/OrdersPage.jsx | useAuth | fetchMyOrders() | My orders dashboard |
| /orders/[orderId] | src/app/(customer)/orders/[orderId]/page.jsx | src/features/customer/orders/OrderDetails.jsx | useAuth | fetchOrder(orderId) and fetchOrderTracking() in child TrackingInfo | Single order detail + tracking |
| /place-order | src/app/(customer)/place-order/page.jsx | src/features/customer/checkout/CheckoutPage.jsx | useAuth, useCart, useCoupon | checkShippingServiceability(), placeCodOrder(), createRazorpayCheckout(), verifyRazorpayCheckout(), updateCurrentUser() | Checkout flow |
| /product/[slug] | src/app/(customer)/product/[slug]/page.jsx | local page component, ProductReviews | useCart, NotificationContext | fetchProductBySlug(), fetchProducts(), fetchProductReviews(), createProductReview(), etc. via child review section | Product detail and related products |
| /profile | src/app/(customer)/profile/page.jsx | src/features/customer/account/AccountPage.jsx | useAuth | updateCurrentUser() | Account settings + address management |
| /privacy | src/app/privacy/page.jsx | local static page | None | None | Privacy policy |
| /terms | src/app/terms/page.jsx | local static page | None | None | Terms page |

### 4.2 Auth route

| URL | Page file | Main component imported | Contexts used | APIs used | Purpose |
|---|---|---|---|---|---|
| /login | src/app/(auth)/login/page.jsx | src/features/customer/auth/PhoneOtpForm.jsx | useAuth | sendLoginOtp(), verifyLoginOtp() | OTP login page |

### 4.3 Login redirect behavior

The login page is intentionally a redirect surface, not a separate auth model:

- src/app/(auth)/login/page.jsx reads the redirect query param via useSearchParams()
- It resolves redirectTo to /profile unless a safe redirect is provided
- It automatically redirects authenticated users away from the login page
- The actual OTP UI is rendered by src/features/customer/auth/PhoneOtpForm.jsx

### 4.4 API route surface used by the customer app

The active app uses these API routes from src/app/api:

```text
src/app/api/
├─ auth/
│  ├─ me/route.js
│  ├─ send-otp/route.js
│  ├─ verify-otp/route.js
│  └─ logout/route.js
├─ products/route.js
├─ products/slug/[slug]/route.js
├─ coupons/validate/route.js
├─ shipping/serviceability/route.js
├─ shipping/tracking/route.js
├─ checkout/cod/route.js
├─ checkout/razorpay/create/route.js
├─ checkout/razorpay/verify/route.js
├─ orders/my-orders/route.js
├─ orders/[orderId]/route.js
├─ reviews/route.js
├─ reviews/product/[productId]/route.js
├─ reviews/[reviewId]/route.js
└─ ...
```

These are the real server endpoints reached by src/lib/clientApi.js.

---

## 5. Layout & Provider Tree

The provider nesting is defined in src/app/layout.jsx.

```text
src/app/layout.jsx
└─ <html>
   └─ <body>
      └─ NotificationProvider
         └─ AuthProvider
            └─ CartProvider
               └─ CouponProvider
                  └─ RootLayoutClient>{children}</RootLayoutClient>
```

### Exact source

```jsx
<NotificationProvider>
  <AuthProvider>
    <CartProvider>
      <CouponProvider>
        <RootLayoutClient>{children}</RootLayoutClient>
      </CouponProvider>
    </CartProvider>
  </AuthProvider>
</NotificationProvider>
```

This means all app-wide state is deliberately layered in order:

1. NotificationProvider sits at the outside
2. AuthProvider is the user/session source of truth
3. CartProvider is product/cart state
4. CouponProvider depends on the cart and validates coupons
5. RootLayoutClient renders the site chrome and modal overlay

This layering matters because src/context/CouponContext.jsx imports useCart from src/context/CartContext.jsx.

---

## 6. RootLayoutClient

File: src/components/RootLayoutClient.jsx

This client component is the shell for the full storefront. It does the following:

- reads pathname using usePathname()
- decides whether to render the global site chrome based on login pages
- renders global notification UI: src/components/Notification.jsx
- renders global login modal: src/features/customer/auth/AuthModal.jsx
- renders AnnouncementBar, MainNavbar, and Footer when not on login pages
- stores scroll state in sessionStorage and localStorage for back/forward navigation behavior
- handles resize detection and route-change scroll resetting

### Exact layer logic

```jsx
const isLoginPage = ['/login', '/auth/login'].includes(pathname);
const shouldShowSiteChrome = !isLoginPage;
```

### Global shell output

```jsx
<div>
  <Notification />
  <AuthModal />
  {shouldShowSiteChrome && (
    <>
      <AnnouncementBar />
      <MainNavbar />
    </>
  )}
  <main>{children}</main>
  {shouldShowSiteChrome && <Footer />}
</div>
```

### Real UI chrome

- src/components/layout/AnnouncementBar.jsx: rotating announcement banner
- src/components/layout/MainNavbar.jsx: site nav, cart drawer, mobile menu, login interactions
- src/components/layout/Footer.jsx: multi-column footer
- src/components/Notification.jsx: toast/notification queue rendering
- src/features/customer/auth/AuthModal.jsx: modal OTP login overlay

---

## 7. Context Architecture

### 7.1 AuthContext

File: src/context/AuthContext.jsx

#### State

- user: current authenticated customer object or null
- loading: initial fetch status
- isAuthOpen: login modal open/closed
- redirectAfterAuth: redirect target after successful OTP verification

#### Key exposed functions

- refreshUser()
- openAuth(redirectTo = "")
- closeAuth()
- completeAuth(redirectTo)
- logout()

#### API usage

- fetchCurrentUser() from src/lib/clientApi.js
- logoutCurrentUser() from src/lib/clientApi.js

#### Lifecycle behavior

- On mount, AuthProvider calls refreshUser() in useEffect
- If fetchCurrentUser() fails, it clears user and stops loading
- completeAuth() calls refreshUser(), closes the modal, and router.push(target)
- logout() calls logoutCurrentUser() and clears the local user state

#### Consumers

- src/app/(auth)/login/page.jsx
- src/components/layout/MainNavbar.jsx
- src/features/customer/account/AccountPage.jsx
- src/features/customer/auth/AuthModal.jsx
- src/features/customer/auth/PhoneOtpForm.jsx
- src/features/customer/checkout/CheckoutPage.jsx
- src/features/customer/orders/OrderDetails.jsx
- src/features/customer/orders/OrdersPage.jsx
- src/features/customer/reviews/ProductReviews.jsx

#### Auth router flow

```text
PhoneOtpForm.jsx
→ verifyLoginOtp({ phone, otp })
→ completeAuth(redirectTo)
→ refreshUser()
→ fetchCurrentUser()/api/auth/me
→ user saved in AuthContext
```

#### LocalStorage / cookies

This context itself does not persist user state in localStorage. The session is actually created on the server-side in the API layer and lives in cookies via the auth session helpers, then validated through /api/auth/me.

### 7.2 CartContext

File: src/context/CartContext.jsx

#### State

- cart: the normalized cart array containing productId, size, quantity
- productsById: local product cache for quick lookup
- hasLoadedCart
- hasLoadedProductCatalog

#### LocalStorage

- key: "perfume_cart"
- source: window.localStorage.getItem("perfume_cart")
- values: [{ productId, size, quantity }]

#### Key functions

- rememberProducts(products)
- resolveProduct(productOrId)
- addToCart(productOrId, size, quantity = 1)
- updateQuantity(productId, size, quantity)
- removeFromCart(productId, size)
- clearCart()
- getCartItems()
- getCartCount()
- getCartTotal()

#### Data flow

- On first load, CartProvider reads localStorage and normalizes it
- It then fetches products via fetchProducts() from src/lib/clientApi.js
- It stores them in productsById
- It filters invalid/stockless items and re-normalizes cart items
- Whenever cart changes, it persists back to localStorage

#### Internal rules

- Normalizes valid sizes to "10 ML" and "50 ML"
- Prevents invalid sizes and duplicate cart item entries
- Clamps quantity against available stock
- Removes out-of-stock or missing products from cart payloads
- Most cart calculations are based on variant.sellingPrice

#### Consumers

- src/components/layout/MainNavbar.jsx
- src/features/customer/cart/CartDrawer.jsx
- src/app/(customer)/cart/page.jsx
- src/app/(customer)/product/[slug]/page.jsx
- src/components/product/ProductCard.jsx
- src/features/customer/checkout/CheckoutPage.jsx
- src/context/CouponContext.jsx

### 7.3 CouponContext

File: src/context/CouponContext.jsx

#### State

- couponCode
- appliedCoupon
- discount
- serverSubtotal
- serverTotal
- validating
- error
- message

#### LocalStorage

- key: "perfume_coupon_code"
- applied during provider initialization, and written after successful validation

#### Key functions

- applyCoupon(codeOverride)
- revalidateCoupon()
- removeCoupon()
- setCouponCode()

#### API usage

- validateCoupon({ items, couponCode }) from src/lib/clientApi.js
- This calls /api/coupons/validate

#### Lifecycle behavior

- On mount, it tries to restore a coupon code from localStorage
- It watches the cart signature via cartPayload(cart)
- If cart changes and a coupon is applied, it revalidates automatically
- If the cart becomes empty, it clears the coupon immediately

#### Critical coupling

This provider depends on useCart() from CartContext. That is the reason coupon revalidation is tied to the cart payload. The coupon is not independent; it is recalculated against the current cart items.

### 7.4 NotificationContext

File: src/context/NotificationContext.jsx

#### State

- notifications: array of { message, type, id }

#### Exposed functions

- addNotification(message, type = 'success', duration = 3500)
- removeNotification(id)
- showNotification(message, type = 'success', duration = 3500)
- success(message, duration)
- error(message, duration)
- warning(message, duration)
- info(message, duration)

#### Rendering location

- src/components/Notification.jsx reads NotificationContext and renders active toasts

#### Consumers

- src/app/(customer)/contact/page.jsx
- src/app/(customer)/product/[slug]/page.jsx
- multiple other components using useContext(NotificationContext)

#### Lifecycle behavior

- Every notification gets a generated ID and an auto-remove timeout
- Duration can be null/false to disable removal
- It is designed as a global app-toaster, not a server-managed queue

---

## 8. Customer Feature Architecture

### 8.1 src/features/customer/auth

#### FILE: src/features/customer/auth/AuthModal.jsx
- ROLE: Global login modal overlay for the storefront
- IMPORTED BY: src/components/RootLayoutClient.jsx
- IMPORTS: useAuth from src/context/AuthContext.jsx; PhoneOtpForm from src/features/customer/auth/PhoneOtpForm.jsx
- CONTEXTS: useAuth
- API CALLS: none directly; delegates to PhoneOtpForm
- STATE: none beyond modal open state managed in AuthContext
- USER FLOW: modal opens when AuthContext.openAuth() is called; user completes OTP; redirectAfterAuth is used to return to requested route

#### FILE: src/features/customer/auth/PhoneOtpForm.jsx
- ROLE: OTP-based phone login UI for the storefront
- IMPORTED BY: src/app/(auth)/login/page.jsx and src/features/customer/auth/AuthModal.jsx
- IMPORTS: sendLoginOtp, verifyLoginOtp from src/lib/clientApi.js; useAuth from src/context/AuthContext.jsx
- CONTEXTS: useAuth
- API CALLS: /api/auth/send-otp, /api/auth/verify-otp
- STATE: step (phone or otp), phone, otp, message, error, loading, devOtp
- USER FLOW:
  1. validates 10-digit Indian phone number
  2. calls sendLoginOtp(phone)
  3. sets message and devOtp if present
  4. verifies OTP with verifyLoginOtp({ phone, otp })
  5. completes auth via completeAuth(redirectTo)

### 8.2 src/features/customer/account

#### FILE: src/features/customer/account/AccountPage.jsx
- ROLE: customer profile/address management page
- IMPORTED BY: src/app/(customer)/profile/page.jsx
- IMPORTS: useAuth, updateCurrentUser from src/lib/clientApi.js
- CONTEXTS: useAuth
- API CALLS: /api/auth/me via PATCH
- STATE: activeView, profileDraft, addressDraft, selected address state, save states, error/message
- USER FLOW:
  1. checks auth; if unauthenticated, triggers openAuth('/profile')
  2. loads user profile from AuthContext
  3. allows profile edits for firstName, lastName, email
  4. allows add/edit default address
  5. calls updateCurrentUser({...}) and refreshUser()

### 8.3 src/features/customer/cart

#### FILE: src/features/customer/cart/CartDrawer.jsx
- ROLE: floating cart panel used from MainNavbar
- IMPORTED BY: src/components/layout/MainNavbar.jsx
- IMPORTS: useCart, useCoupon, getProductImageUrl from src/lib/clientApi.js
- CONTEXTS: useCart, useCoupon
- API CALLS: no direct API calls; coupon validation is delegated to CouponContext
- STATE: derived from cart + coupon context; open/close is parent-controlled
- USER FLOW:
  1. reads cart items via getCartItems()
  2. shows each product, size, quantity, price, coupon area, subtotal and total
  3. supports quantity updates/removal
  4. routes to /place-order on checkout click

### 8.4 src/features/customer/checkout

#### FILE: src/features/customer/checkout/CheckoutPage.jsx
- ROLE: full order checkout flow
- IMPORTED BY: src/app/(customer)/place-order/page.jsx
- IMPORTS: useAuth, useCart, useCoupon, client API methods: checkShippingServiceability, createRazorpayCheckout, placeCodOrder, verifyRazorpayCheckout, updateCurrentUser
- CONTEXTS: useAuth, useCart, useCoupon
- API CALLS:
  - /api/shipping/serviceability
  - /api/auth/me (PATCH) for saving addresses
  - /api/checkout/cod
  - /api/checkout/razorpay/create
  - /api/checkout/razorpay/verify
- STATE:
  - address state
  - selectedAddressIndex
  - saveAddress
  - paymentMethod
  - serviceability result and status
  - submitting, error, notice, authPrompted
- USER FLOW:
  1. If not authenticated, openAuth('/place-order')
  2. loads saved user addresses into the form
  3. validates address and pincode
  4. checks shipping serviceability before payment proceed
  5. allows COD or Razorpay pay
  6. create order via placeCodOrder or createRazorpayCheckout
  7. Razorpay flow uses JS SDK and verify endpoint
  8. stock reconciliation is performed if checkout fails with STOCK_CHANGED

#### FILE: src/features/customer/checkout/CouponSection.jsx
- ROLE: coupon UI block inside checkout; likely reused in checkout page flow
- IMPORTED BY: CheckoutPage.jsx
- IMPORTS: useCoupon
- CONTEXTS: useCoupon
- API CALLS: none directly; delegates to CouponContext.applyCoupon()
- STATE: derived from coupon context

#### FILE: src/features/customer/checkout/DeliveryAddress.jsx
- ROLE: address form and validation utilities for checkout
- IMPORTED BY: CheckoutPage.jsx
- IMPORTS: none beyond local helpers
- CONTEXTS: none
- API CALLS: none directly
- STATE: local object fields in CheckoutPage, but normalization/validation helpers live here
- USER FLOW: validates address before serviceability and before order submission

#### FILE: src/features/customer/checkout/OrderSummary.jsx
- ROLE: cart subtotal, coupon display, final total summary
- IMPORTED BY: CheckoutPage.jsx
- IMPORTS: likely uses cart state and coupon state
- CONTEXTS: useCart/useCoupon or props passed from parent
- API CALLS: none
- STATE: derived from props or context

#### FILE: src/features/customer/checkout/PaymentMethod.jsx
- ROLE: payment option selector for COD and Razorpay
- IMPORTED BY: CheckoutPage.jsx
- IMPORTS: UI icons and props
- CONTEXTS: none directly
- API CALLS: none directly
- STATE: selected payment method in parent CheckoutPage

### 8.5 src/features/customer/orders

#### FILE: src/features/customer/orders/OrdersPage.jsx
- ROLE: list all customer orders
- IMPORTED BY: src/app/(customer)/orders/page.jsx
- IMPORTS: useAuth, fetchMyOrders, OrderCard
- CONTEXTS: useAuth
- API CALLS: /api/orders/my-orders
- STATE: orders, loading, error
- USER FLOW:
  - if not authenticated, openAuth('/orders')
  - fetchMyOrders() after login
  - map each order to OrderCard

#### FILE: src/features/customer/orders/OrderCard.jsx
- ROLE: per-order summary card in list view
- IMPORTED BY: OrdersPage.jsx
- IMPORTS: format helpers, Link or router usage
- CONTEXTS: none
- API CALLS: none
- STATE: derived from order object
- USER FLOW: routes to /orders/[orderId] on card click or CTA

#### FILE: src/features/customer/orders/OrderDetails.jsx
- ROLE: single-order detail page data + delivery/payment summary + tracking display
- IMPORTED BY: src/app/(customer)/orders/[orderId]/page.jsx
- IMPORTS: useAuth, fetchOrder, TrackingInfo, helper formatters
- CONTEXTS: useAuth
- API CALLS: /api/orders/[orderId], then fetchOrderTracking in TrackingInfo
- STATE: order, loading, error
- USER FLOW:
  - require login
  - fetchOrder(orderId)
  - render amounts, payment status, delivery address, items, tracking

#### FILE: src/features/customer/orders/TrackingInfo.jsx
- ROLE: tracking display and refresh
- IMPORTED BY: OrderDetails.jsx
- IMPORTS: fetchOrderTracking from src/lib/clientApi.js
- CONTEXTS: none
- API CALLS: /api/shipping/tracking?orderId=...
- STATE: tracking, loading, error
- USER FLOW: calls fetchOrderTracking(orderId) and renders AWB/courier/tracking link if available

#### FILE: src/features/customer/orders/OrdersAuthGate.jsx
- ROLE: alternate auth gate wrapper for order flows
- IMPORTED BY: UNVERIFIED from current route tree
- IMPORTS: useAuth
- CONTEXTS: useAuth
- API CALLS: none discovered
- STATE: none discovered
- USER FLOW: UNVERIFIED from current route map; file exists but not directly linked to a route in the active customer route tree as inspected

### 8.6 src/features/customer/reviews

#### FILE: src/features/customer/reviews/ProductReviews.jsx
- ROLE: public reviews section for a product page
- IMPORTED BY: src/app/(customer)/product/[slug]/page.jsx
- IMPORTS: useAuth, createProductReview, deleteProductReview, fetchMyProductReview, fetchProductReviews, updateProductReview
- CONTEXTS: useAuth
- API CALLS:
  - /api/reviews/product/[productId]
  - /api/reviews?productId=
  - /api/reviews
  - /api/reviews/[reviewId]
- STATE: reviews, rating summary, ownReview, loading, saving, error, message, showForm, editing
- USER FLOW:
  - fetches public reviews and current user review
  - if guest and user tries to review, opens auth modal
  - allows add/edit/delete review
  - marks review as pending approval until approved by backend logic

---

## 9. Components Architecture

### 9.1 Global layout components

#### FILE: src/components/layout/AnnouncementBar.jsx
- ROLE: horizontal rotating announcement bar
- IMPORTED BY: src/components/RootLayoutClient.jsx
- IMPORTS: React hooks and lucide-react icons
- CONTEXTS: none
- API CALLS: none
- STATE: currentIndex, previousIndex, direction, isMoving
- USER FLOW: rotates through a short announcement list every few seconds

#### FILE: src/components/layout/MainNavbar.jsx
- ROLE: main store navigation, drawer menu, cart preview, tabbed nav
- IMPORTED BY: src/components/RootLayoutClient.jsx
- IMPORTS: useCart, useAuth, CartDrawer
- CONTEXTS: useCart, useAuth
- API CALLS: none directly
- STATE: isDrawerOpen, isCartDrawerOpen, pathname
- USER FLOW:
  - opens mobile drawer menu
  - opens cart drawer
  - routes to /collection, /about, /contact, /orders, /login, /cart
  - uses auth gate for protected navigation such as MY ORDERS

#### FILE: src/components/layout/Footer.jsx
- ROLE: site footer with menu columns and social links
- IMPORTED BY: src/components/RootLayoutClient.jsx
- IMPORTS: Link and social icons from react-icons
- CONTEXTS: none
- API CALLS: none
- STATE: none beyond year generation
- USER FLOW: static navigational footer that links to collection, orders, contact, privacy, terms

### 9.2 Homepage components

#### FILE: src/components/home/HeroCarousel.jsx
- ROLE: top homepage hero slideshow
- IMPORTED BY: src/app/(customer)/page.jsx
- IMPORTS: local static slide data and simple carousel logic
- CONTEXTS: none
- API CALLS: none
- STATE: carousel index and animation state
- USER FLOW: auto-rotates hero slide imagery and CTA styling

#### FILE: src/components/home/CollectionSection.jsx
- ROLE: homepage product showcase section
- IMPORTED BY: src/app/(customer)/page.jsx
- IMPORTS: ProductCard and fetchProducts from src/lib/clientApi.js
- CONTEXTS: none
- API CALLS: /api/products
- STATE: products
- USER FLOW: fetches first products and renders a grid of ProductCard cards

#### FILE: src/components/home/ForHimSection.jsx
- ROLE: static homepage category block for men collection
- IMPORTED BY: src/app/(customer)/page.jsx
- IMPORTS: static image URLs and Link
- CONTEXTS: none
- API CALLS: none
- STATE: none
- USER FLOW: CTA to collection/category route

#### FILE: src/components/home/ForHerSection.jsx
- ROLE: static homepage category block for women collection
- IMPORTED BY: src/app/(customer)/page.jsx
- IMPORTS: static image URLs and Link
- CONTEXTS: none
- API CALLS: none
- STATE: none
- USER FLOW: CTA to collection/category route

#### FILE: src/components/home/OurStorySection.jsx
- ROLE: brand/story block on homepage
- IMPORTED BY: src/app/(customer)/page.jsx
- IMPORTS: static image and Link
- CONTEXTS: none
- API CALLS: none
- STATE: none
- USER FLOW: informational brand block

### 9.3 Product UI

#### FILE: src/components/product/ProductCard.jsx
- ROLE: reusable product tile for collection pages and homepage sections
- IMPORTED BY:
  - src/app/(customer)/collection/page.jsx
  - src/components/home/CollectionSection.jsx
  - src/app/(customer)/product/[slug]/page.jsx (related product list)
- IMPORTS: useRouter, useCart, getProductImageUrl from src/lib/clientApi.js
- CONTEXTS: useCart
- API CALLS: none directly
- STATE: selectedSize and local variant selection
- USER FLOW:
  1. click image or title to navigate to /product/[slug]
  2. select size
  3. click ADD TO CART
  4. addToCart(product, selectedSize, 1)

### 9.4 Shared review UI

#### FILE: src/components/ReviewCard.jsx
- ROLE: legacy/shared review card UI used in other review components
- IMPORTED BY: src/components/ReviewList.jsx and possibly other older review screens
- IMPORTS: ReviewForm, PhotoGalleryLightbox
- CONTEXTS: none
- API CALLS: none directly discovered in the current active route tree
- STATE: local review UI state and modal image lightbox state
- NOTE: present in the source tree, but the currently active product review UI is src/features/customer/reviews/ProductReviews.jsx.

#### FILE: src/components/ReviewsSection.jsx
- ROLE: another older review presentation component in the source tree
- IMPORTED BY: UNVERIFIED from the active route tree
- IMPORTS: review card UI and static review data
- CONTEXTS: none
- API CALLS: none discovered
- STATE: local review formatting state
- NOTE: it is present but not part of the current route graph traced in the active customer app.

### 9.5 Root-level shared components worth recognizing

- src/components/Hero.jsx: file exists in src/components/; not currently mapped into the active route tree seen in src/app/(customer)/page.jsx.
- src/components/AuthPrompt.jsx: exists, but not part of the main route flow traced in the current app.
- src/components/PhotoGalleryLightbox.jsx: exists alongside review components; currently not traced as part of the active review flow in src/features/customer/reviews/ProductReviews.jsx.

These are not necessarily dead, but they are not the active source-of-truth path for the storefront as mapped in this document.

---

## 10. Homepage Dependency Flow

The homepage route is:

```text
src/app/(customer)/page.jsx
```

Dependency chain:

```text
/ (home)
→ src/app/(customer)/page.jsx
   ├─ HeroCarousel
   │  └─ static homepage hero content
   ├─ CollectionSection
   │  └─ fetchProducts() from src/lib/clientApi.js
   │     └─ GET /api/products
   │        └─ Product.find({ status: 'published' })
   │           └─ serializeProduct(product)
   │              └─ ProductCard
   │                 └─ product variant selection + addToCart(product, size, 1)
   ├─ ForHimSection
   │  └─ static promotional category block
   ├─ OurStorySection
   │  └─ static brand section
   └─ ForHerSection
      └─ static promotional category block
```

### Product data flow for homepage

```text
CollectionSection.jsx
→ fetchProducts()
→ /api/products
→ Product model
→ serializeProduct(product)
→ ProductCard.jsx
→ useCart().addToCart(...)
```

### Navigation flow

The site chrome for the homepage is rendered by RootLayoutClient, which includes:

- AnnouncementBar
- MainNavbar
- Footer
- Notification
- AuthModal

The Navbar itself links to:

- /collection
- /collection?category=Men
- /collection?category=Women
- /collection?category=Unisex
- /about
- /contact
- /orders
- /login
- /cart

---

## 11. Route → Component Map

### /
- file: src/app/(customer)/page.jsx
- component chain: HeroCarousel → CollectionSection → ProductCard
- data: fetchProducts from src/lib/clientApi.js
- purpose: home landing and product teaser page

### /login
- file: src/app/(auth)/login/page.jsx
- component chain: PhoneOtpForm
- context: AuthContext
- API: sendLoginOtp + verifyLoginOtp
- purpose: OTP-based user access

### /collection
- file: src/app/(customer)/collection/page.jsx
- component: ProductCard
- context: none at page level
- API: fetchProducts({ category })
- purpose: category-filtered product listing

### /product/[slug]
- file: src/app/(customer)/product/[slug]/page.jsx
- child components: ProductReviews, ProductCard (related products)
- contexts: useCart, NotificationContext
- API: fetchProductBySlug, fetchProducts, fetchProductReviews
- purpose: single product detail, variant selection, quantity, add-to-cart, reviews

### /cart
- file: src/app/(customer)/cart/page.jsx
- component: local page component using useCart/useCoupon
- contexts: CartContext, CouponContext
- API: coupon validation indirectly through CouponContext -> /api/coupons/validate
- purpose: cart summary and coupon editing

### /place-order
- file: src/app/(customer)/place-order/page.jsx
- component: src/features/customer/checkout/CheckoutPage.jsx
- contexts: AuthContext, CartContext, CouponContext
- API: shipping/serviceability, checkout/cod, checkout/razorpay/create, checkout/razorpay/verify
- purpose: authenticated checkout flow

### /profile
- file: src/app/(customer)/profile/page.jsx
- component: src/features/customer/account/AccountPage.jsx
- context: AuthContext
- API: /api/auth/me PATCH
- purpose: customer profile and address management

### /orders
- file: src/app/(customer)/orders/page.jsx
- component: src/features/customer/orders/OrdersPage.jsx
- context: AuthContext
- API: /api/orders/my-orders
- purpose: customer order list

### /orders/[orderId]
- file: src/app/(customer)/orders/[orderId]/page.jsx
- component: src/features/customer/orders/OrderDetails.jsx
- context: AuthContext
- API: /api/orders/[orderId], /api/shipping/tracking
- purpose: single order details and tracking

### /about
- file: src/app/(customer)/about/page.jsx
- component: local page component
- purpose: brand/about page

### /contact
- file: src/app/(customer)/contact/page.jsx
- component: local page component
- notification: NotificationContext
- purpose: contact form page

### /privacy and /terms
- files: src/app/privacy/page.jsx and src/app/terms/page.jsx
- purpose: legal pages

---

## 12. UI → Where Do I Edit It?

| I want to change | Exact file |
|---|---|
| Navbar | src/components/layout/MainNavbar.jsx |
| Announcement bar | src/components/layout/AnnouncementBar.jsx |
| Footer | src/components/layout/Footer.jsx |
| Global app shell | src/components/RootLayoutClient.jsx |
| Global providers and nesting | src/app/layout.jsx |
| Homepage | src/app/(customer)/page.jsx |
| Homepage hero | src/components/home/HeroCarousel.jsx |
| Homepage collection block | src/components/home/CollectionSection.jsx |
| For Him block | src/components/home/ForHimSection.jsx |
| For Her block | src/components/home/ForHerSection.jsx |
| Brand story block | src/components/home/OurStorySection.jsx |
| Product card | src/components/product/ProductCard.jsx |
| Product page | src/app/(customer)/product/[slug]/page.jsx |
| Product reviews | src/features/customer/reviews/ProductReviews.jsx |
| Cart drawer | src/features/customer/cart/CartDrawer.jsx |
| Cart page | src/app/(customer)/cart/page.jsx |
| Checkout | src/features/customer/checkout/CheckoutPage.jsx |
| Address form | src/features/customer/checkout/DeliveryAddress.jsx |
| Coupon UI | src/features/customer/checkout/CouponSection.jsx |
| Order summary | src/features/customer/checkout/OrderSummary.jsx |
| Payment selector | src/features/customer/checkout/PaymentMethod.jsx |
| Login modal | src/features/customer/auth/AuthModal.jsx |
| OTP login UI | src/features/customer/auth/PhoneOtpForm.jsx |
| Profile | src/features/customer/account/AccountPage.jsx |
| Orders list | src/features/customer/orders/OrdersPage.jsx |
| Single order page | src/features/customer/orders/OrderDetails.jsx |
| Tracking info | src/features/customer/orders/TrackingInfo.jsx |
| Global notifications | src/components/Notification.jsx |
| Auth state | src/context/AuthContext.jsx |
| Cart state | src/context/CartContext.jsx |
| Coupon state | src/context/CouponContext.jsx |
| Notification state | src/context/NotificationContext.jsx |

---

## 13. Component Dependency Diagrams

### Customer checkout dependency tree

```text
src/app/(customer)/place-order/page.jsx
└─ src/features/customer/checkout/CheckoutPage.jsx
   ├─ src/features/customer/checkout/DeliveryAddress.jsx
   ├─ src/features/customer/checkout/CouponSection.jsx
   ├─ src/features/customer/checkout/OrderSummary.jsx
   ├─ src/features/customer/checkout/PaymentMethod.jsx
   ├─ useAuth() from src/context/AuthContext.jsx
   ├─ useCart() from src/context/CartContext.jsx
   └─ useCoupon() from src/context/CouponContext.jsx
```

### Product page dependency tree

```text
src/app/(customer)/product/[slug]/page.jsx
├─ ProductReviews
│  └─ src/features/customer/reviews/ProductReviews.jsx
├─ ProductCard (related products)
│  └─ src/components/product/ProductCard.jsx
├─ useCart() from src/context/CartContext.jsx
├─ NotificationContext from src/context/NotificationContext.jsx
└─ fetchProductBySlug + fetchProducts from src/lib/clientApi.js
```

### Global app shell dependency tree

```text
src/app/layout.jsx
└─ RootLayoutClient
   ├─ Notification
   ├─ AuthModal
   ├─ AnnouncementBar
   ├─ MainNavbar
   │  ├─ CartDrawer
   │  └─ AuthContext + CartContext
   └─ Footer
```

### Order details dependency tree

```text
src/app/(customer)/orders/[orderId]/page.jsx
└─ src/features/customer/orders/OrderDetails.jsx
   ├─ useAuth()
   ├─ fetchOrder(orderId)
   └─ TrackingInfo
      └─ fetchOrderTracking(orderId)
```

### Homepage dependency tree

```text
src/app/(customer)/page.jsx
├─ HeroCarousel
├─ CollectionSection
│  └─ fetchProducts()
│     └─ ProductCard
├─ ForHimSection
├─ OurStorySection
└─ ForHerSection
```

---

## 14. Source-of-Truth Tree

This is the simplified current architecture tree that matters most for continuation work.

```text
REDLINE active customer app
├─ app shell
│  ├─ src/app/layout.jsx
│  └─ src/components/RootLayoutClient.jsx
├─ global providers
│  ├─ src/context/NotificationContext.jsx
│  ├─ src/context/AuthContext.jsx
│  ├─ src/context/CartContext.jsx
│  └─ src/context/CouponContext.jsx
├─ route surfaces
│  ├─ src/app/(customer)/page.jsx
│  ├─ src/app/(customer)/collection/page.jsx
│  ├─ src/app/(customer)/product/[slug]/page.jsx
│  ├─ src/app/(customer)/cart/page.jsx
│  ├─ src/app/(customer)/place-order/page.jsx
│  ├─ src/app/(customer)/profile/page.jsx
│  ├─ src/app/(customer)/orders/page.jsx
│  └─ src/app/(auth)/login/page.jsx
├─ client API boundary
│  └─ src/lib/clientApi.js
├─ server route layer
│  ├─ src/app/api/auth/
│  ├─ src/app/api/products/
│  ├─ src/app/api/checkout/
│  ├─ src/app/api/orders/
│  ├─ src/app/api/coupons/
│  ├─ src/app/api/shipping/
│  └─ src/app/api/reviews/
├─ business models and validation
│  ├─ src/models/Product.js
│  ├─ src/models/User.js
│  ├─ src/models/Order.js
│  ├─ src/models/Review.js
│  ├─ src/models/Coupon.js
│  └─ src/models/OtpVerification.js
├─ shared customer UI
│  ├─ src/components/layout/MainNavbar.jsx
│  ├─ src/components/layout/Footer.jsx
│  ├─ src/components/product/ProductCard.jsx
│  ├─ src/features/customer/cart/CartDrawer.jsx
│  ├─ src/features/customer/checkout/CheckoutPage.jsx
│  ├─ src/features/customer/orders/OrdersPage.jsx
│  └─ src/features/customer/reviews/ProductReviews.jsx
└─ external service integrations
   ├─ src/lib/payments/razorpay.js
   ├─ src/lib/shipping/shiprocket.js
   └─ src/lib/auth/otpProvider.js
```

### Bottom line

The current live app architecture is not a single monolithic page tree. It is a layered app-router storefront with:

- cookie/session-based auth in the server route layer
- localStorage-backed cart and coupon state in client state providers
- product and review data pulled from /api/products and /api/reviews
- order lifecycle managed through checkout and order routes
- global UI chrome managed by RootLayoutClient and the layout providers

This is the source-of-truth architecture for the project as it exists right now in the workspace.

---

END OF PART 1
