# REDLINE Project Architecture — Part 2

This document is the source-of-truth architecture record for the admin application in redlineadmin. It is intentionally scoped to the admin frontend as it exists in the current workspace, and it treats the live customer storefront in redlinenext as the primary runtime for commerce operations. The goal is to describe how the admin app is structured, how it authenticates, how it calls backend services, and where it fits in the larger repo split.

---

## 1. Repository Placement and Scope

The repository currently contains three separate application areas:

```text
C:\Users\kushg\OneDrive\Desktop\REDLINE
├─ redlinenext/        # Active customer storefront + live app API
├─ redlineadmin/       # Separate admin frontend for store management
├─ redlineBackend/     # Legacy Express backend; not the active runtime for the current customer/admin flow
├─ PROJECT_ARCHITECTURE_PART_1.md
├─ PROJECT_ARCHITECTURE_PART_2.md
└─ PROJECT_ARCHITECTURE_PART_3.md
```

### Meaning of the split

- redlinenext is the active storefront and API runtime under the current customer flow.
- redlineadmin is an independent admin frontend that uses Next.js routes and a session/token check before showing protected screens.
- redlineBackend exists as a historical/legacy backend with Express routes and Firebase-based auth patterns, but it is not the current source-of-truth for the active customer admin runtime.

The admin app should therefore be read as a distinct app front-end with its own state and auth layer, even though it interacts with backend APIs under the same overall product domain.

---

## 2. redlineadmin Project Structure

Actual current tree from the workspace:

```text
redlineadmin/
├─ eslint.config.mjs
├─ jsconfig.json
├─ next.config.mjs
├─ package.json
├─ postcss.config.mjs
├─ README.md
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ add/
│  │  ├─ admin/
│  │  ├─ coupon/
│  │  ├─ dashboard/
│  │  ├─ edit/
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.js
│  │  ├─ list/
│  │  ├─ login/
│  │  ├─ orders/
│  │  ├─ page.js
│  │  ├─ reviews/
│  │  └─ users/
│  ├─ assets/
│  ├─ components/
│  │  ├─ LayoutWrapper.jsx
│  │  ├─ Navbar.jsx
│  │  ├─ Notification.jsx
│  │  ├─ Sidebar.jsx
│  │  └─ ...
│  ├─ context/
│  │  └─ NotificationContext.jsx
│  ├─ features/
│  │  └─ admin/
│  │     ├─ coupons/
│  │     ├─ orders/
│  │     ├─ reviews/
│  │     └─ users/
│  ├─ lib/
│  │  └─ api.js
│  └─ ...
└─ ...
```

### Interpretation

The admin app follows a normal Next.js app-router structure:

- app routes define each section of the admin UI
- components contain the layout shell, navigation, and UI chrome
- features/admin contains module-level admin flows such as coupons, orders, users, reviews
- lib/api.js centralizes HTTP configuration and request helpers
- context/NotificationContext.jsx provides toasts and transient messages

This is a classic page-based admin dashboard pattern rather than a deeply componentized state-manager architecture.

---

## 3. App Entry and Root Shell

The root app layout is defined in redlineadmin/src/app/layout.js.

```jsx
import "./globals.css";
import NotificationProvider from "@/context/NotificationContext";
import Notification from "@/components/Notification";
import LayoutWrapper from "@/components/LayoutWrapper";

export const metadata = {
  title: "Admin Panel",
  description: "Admin Panel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          <Notification />
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </NotificationProvider>
      </body>
    </html>
  );
}
```

### Meaning

- The app wraps all pages in NotificationProvider.
- It renders a global Notification component.
- It boots LayoutWrapper around every page.

This means the admin app is built around a route-aware shell that checks auth and controls whether the user sees the full dashboard or only the login view.

---

## 4. Auth Model and Route Protection

The auth gating logic sits in redlineadmin/src/components/LayoutWrapper.jsx.

```jsx
const LayoutWrapper = ({ children }) => {
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const checkSession = async () => {
      try {
        await api.get('/api/admin/auth/me');
        if (!mounted) return;
        setAuthenticated(true);
        if (isLoginPage) router.replace('/admin');
      } catch {
        if (!mounted) return;
        setAuthenticated(false);
        localStorage.removeItem('token');
        if (!isLoginPage) router.replace('/login');
      } finally {
        if (mounted) setChecked(true);
      }
    };

    checkSession();
  }, [isLoginPage, pathname, router]);

  if (!checked) {
    return <div>Checking admin session...</div>;
  }

  if (isLoginPage || !authenticated) {
    return <>{children}</>;
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar onLogout={() => setAuthenticated(false)} />
      <div className='flex min-h-[calc(100vh-57px)] w-full'>
        <Sidebar />
        <main className='w-full min-w-0 p-4 md:p-8'>{children}</main>
      </div>
    </div>
  );
};
```

### Auth behavior

- The app checks the user session by calling /api/admin/auth/me.
- If the user is authenticated and on /login, it redirects to /admin.
- If unauthenticated and not on /login, it redirects back to /login.
- For protected dashboard pages, it renders Navbar and Sidebar, and wraps the content in a page area.

### Key takeaway

This is a client-side guard in the admin frontend. It does not manage global auth state in a provider; instead, it runs a session check on route changes and then conditionally renders protected shell content.

---

## 5. Login Flow

The login page is in redlineadmin/src/app/login/page.jsx.

```jsx
const onSubmitHandler = async (event) => {
  event.preventDefault();
  setIsLoading(true);

  try {
    const response = await api.post('/api/admin/auth/login', { email, password });
    localStorage.setItem('token', response.data.data?.token || 'session');
    success('Welcome back');
    router.push('/admin');
  } catch (error) {
    showError(getErrorMessage(error, 'Unable to login. Please try again'));
  } finally {
    setIsLoading(false);
  }
};
```

### Observations

- The login uses a standard email/password form.
- On success, it stores a token in localStorage.
- The app then routes to /admin.
- Toast notifications are handled through NotificationContext.

### Important architectural note

The admin frontend is clearly designed around a token-based session that is checked through the backend admin auth route. The localStorage token is part of the client session pattern, and the shell relies on that state for route-level access decisions.

---

## 6. Shared HTTP Layer

The central HTTP client is redlineadmin/src/lib/api.js.

```js
import axios from "axios";

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3000";

export const API_BASE_URL = configuredBaseUrl.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Request pattern

- Base URL is resolved from NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_BACKEND_URL.
- Fallback is localhost:3000.
- It creates an axios instance with credentials enabled.
- This means most admin screens use the same HTTP wrappers for all CRUD and status operations.

### Design quality

This is a clean single point for API configuration. All pages and feature modules share the same client instance and avoid ad hoc fetch logic.

---

## 7. Notification Pattern

The admin app uses a lightweight notification context in redlineadmin/src/context/NotificationContext.jsx.

```jsx
const [notification, setNotification] = useState(null);

const showNotification = (message, type = 'info', duration = 4000) => {
  setNotification({ message, type });
  setTimeout(() => setNotification(null), duration);
};

const success = (message) => showNotification(message, 'success');
const error = (message) => showNotification(message, 'error');
const warning = (message) => showNotification(message, 'warning');
const info = (message) => showNotification(message, 'info');
```

### Observations

- The toast pattern is very simple, purely client-side.
- The root layout renders Notification globally so all pages can trigger success/error messages.
- This is used heavily for login, CRUD operations, and status updates.

---

## 8. Admin Page Structure

The public entry page for the app is redlineadmin/src/app/page.js.

```jsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
```

This means the root URL immediately redirects to /login. It is a clean entry design for the dashboard.

### Actual admin route map

From the current app tree:

```text
src/app/
├─ add/page.jsx
├─ admin/page.jsx
├─ coupon/page.jsx
├─ dashboard/page.jsx
├─ edit/[id]/page.jsx
├─ list/page.jsx
├─ login/page.jsx
├─ orders/page.jsx
├─ reviews/page.jsx
├─ users/page.jsx
└─ page.js
```

### Route interpretation

The app is structured around the main operations of a commerce admin panel:

- product management: add, list, edit
- dashboard overview
- orders management
- coupon management
- user management
- review moderation

These are not hidden behind a single monolithic component; they are split into page-level routes and feature modules.

---

## 9. Admin Dashboard Features

The main dashboard page redlineadmin/src/app/admin/page.jsx loads key KPIs from /api/admin/dashboard.

```jsx
const response = await api.get('/api/admin/dashboard');
setDashboard(response.data.data);
```

The dashboard shows:

- product count
- total orders
- customer counts
- revenue
- recent orders
- low stock products

This indicates the admin app is structured as a business operations dashboard, not merely a product catalog admin.

### Dashboard responsibility

The page acts as a central operational overview and uses network data from the API layer to summarize the business health of the store.

---

## 10. Product Management Modules

The admin app includes dedicated routes for product management:

- add product
- list products
- edit individual products
- delete products

These are probably implemented as page-level flows, and they connect to /api/admin/products endpoints.

Observed usage from the codebase:

```text
redlineadmin/src/app/add/page.jsx -> POST /api/admin/products
redlineadmin/src/app/list/page.jsx -> GET /api/admin/products
redlineadmin/src/app/edit/[id]/page.jsx -> GET /api/admin/products/:id and PATCH /api/admin/products/:id
```

This means the admin UI is aligned with a standard CRUD lifecycle for product records.

---

## 11. Coupon, Orders, Reviews, and Users

The app includes separated feature modules under redlineadmin/src/features/admin/:

```text
src/features/admin/
├─ coupons/CouponsPage.jsx
├─ orders/OrdersPage.jsx
├─ reviews/ReviewsPage.jsx
└─ users/UsersPage.jsx
```

This is important because it shows a real module breakdown even though the app uses a route-based shell. The app is not just a single dashboard page; it has business-specific management panels.

### Observed API patterns

- Coupons: GET /api/admin/coupons, POST /api/admin/coupons, PATCH /api/admin/coupons/:id, DELETE /api/admin/coupons/:id
- Orders: GET /api/admin/orders?..., PATCH /api/admin/orders/:id
- Reviews: GET /api/admin/reviews?..., PATCH /api/admin/reviews/:id, DELETE /api/admin/reviews/:id
- Users: GET /api/admin/users?limit=100, PATCH /api/admin/users/:id

This reveals a clear pattern: the admin app is the operational control surface for the store, and the backend API exposes admin-specific endpoints under /api/admin.

---

## 12. Admin Navigation and Screen Composition

The global navbar and sidebar are driven by LayoutWrapper.jsx, which creates the real dashboard shell after login.

Essential structure:

- Navbar sits at the top
- Sidebar sits on the left
- Page content lives in the main area

This gives the app a classic admin layout rather than a single-page dashboard.

The real shell uses the path route as state and conditionally shows the dashboard chrome only when the user is authenticated.

---

## 13. Data Contracts and Client Assumptions

The admin app is built around expected payloads like:

```js
response.data.data
response.data.data?.token
error.response.data.error.message
```

The client utility centralizes these expectations:

```js
export function getErrorMessage(error, fallback = "Request failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}
```

### Implication

The admin front-end is designed around the assumption that the backend returns a structured envelope with data, success status, and error payloads. This is consistent with a separately hosted admin API layer.

---

## 14. High-Level Role in the Repo

The current architecture can be summarized as:

- redlinenext = customer app + customer API + real storefront product flow
- redlineadmin = admin control panel + token-session UI + dashboard operations
- redlineBackend = legacy Express service with older auth and route patterns

The admin app is not a small helper project; it is a separate, route-driven application that manages the business side of the shop. It depends on a backend API layer that exposes admin functions under /api/admin routes. The current active runtime for the broader commerce system is still the storefront app in redlinenext, while the admin app is a separate operational surface built around the same product domain.

---

## 15. Current Status and Confidence Level

This documentation is based on the actual app tree and the current admin source files in the workspace, including:

- redlineadmin/src/app/layout.js
- redlineadmin/src/components/LayoutWrapper.jsx
- redlineadmin/src/app/login/page.jsx
- redlineadmin/src/app/admin/page.jsx
- redlineadmin/src/lib/api.js
- redlineadmin/src/context/NotificationContext.jsx
- redlineadmin/package.json

The verified status is: the admin app exists as a separate Next.js project, has a route-aware auth shell, uses token checks with localStorage, and calls an admin API surface under /api/admin. It is a distinct operational layer of the repo, not a duplicate of the customer app.

---

## 16. Summary

The admin project is a clean, route-based store management app with:

- a protected shell around authenticated pages
- a direct login flow and session check
- centralized API configuration
- consistent toast notifications
- module-based admin management areas for products, orders, coupons, users, and reviews

It lives as a separate frontend in the repo and should be understood as a companion application to the active customer storefront rather than as the source of truth for the storefront itself.
