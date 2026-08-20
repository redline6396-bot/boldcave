# REDLINE Project Architecture — Part 3

This document is the source-of-truth architecture record for the legacy backend in redlineBackend. It is intentionally written in the same style and evidentiary mode as Part 1 and Part 2: it focuses on what is actually present in the source tree, how the code is organized, and how it differs from the current active runtime in redlinenext and the separate admin app in redlineadmin.

---

## 1. Repository Context

The repository currently contains three main application areas:

```text
C:\Users\kushg\OneDrive\Desktop\REDLINE
├─ redlinenext/        # Current active customer storefront + live app API
├─ redlineadmin/       # Separate admin frontend for operations and management
├─ redlineBackend/     # Legacy Express backend with older Firebase-based patterns
├─ PROJECT_ARCHITECTURE_PART_1.md
├─ PROJECT_ARCHITECTURE_PART_2.md
├─ PROJECT_ARCHITECTURE_PART_3.md
└─ ...
```

### Architectural interpretation

- The active runtime for the storefront is redlinenext.
- The admin UI sits in redlineadmin and is separate from the customer app.
- redlineBackend is a historical Express service with a server.js entry point, route modules, controllers, middleware, models, and config helpers.

This legacy backend may still be useful as a code reference, but it is not the active source-of-truth for the current customer/admin runtime that was traced in the earlier architecture parts.

---

## 2. redlineBackend Project Structure

Actual tree observed in the workspace:

```text
redlineBackend/
├─ .env
├─ .gitignore
├─ config/
│  ├─ cloudinary.js
│  ├─ firebaseAdmin.js
│  ├─ mongodb.js
│  └─ ...
├─ controllers/
│  ├─ cartController.js
│  ├─ couponController.js
│  ├─ orderController.js
│  ├─ productController.js
│  ├─ reviewController.js
│  └─ userController.js
├─ middleware/
│  ├─ adminAuth.js
│  ├─ auth.js
│  ├─ mergeUserData.js
│  ├─ multer.js
│  ├─ validate.js
│  └─ ...
├─ models/
│  ├─ couponModel.js
│  ├─ orderModel.js
│  ├─ pendingCartModel.js
│  ├─ productModel.js
│  ├─ reviewModel.js
│  ├─ userModel.js
│  └─ ...
├─ routes/
│  ├─ cartRoute.js
│  ├─ couponRoute.js
│  ├─ orderRoute.js
│  ├─ productRoute.js
│  ├─ reviewRoute.js
│  └─ userRoute.js
├─ services/
├─ utils/
│  └─ generateReviewSummary.js
├─ package.json
├─ server.js
├─ serviceAccountKey.json
├─ ...
```

### Interpretation

This is a conventional Express backend:

- server.js bootstraps express and attaches routes
- routes/ handle endpoint registration
- controllers/ implement business logic
- models/ hold Mongo models
- middleware/ performs auth, validation, file uploads, etc.
- config/ handles firebase, Mongo, Cloudinary, and environment setup

This backend contains the older architecture of the product domain before the active runtime was moved to the Next.js app in redlinenext.

---

## 3. Server Bootstrapping

The boot entry is redlineBackend/server.js.

```js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import dns from 'dns';
import util from 'util';
import nodemailer from 'nodemailer';
import validator from 'validator';
import admin from './config/firebaseAdmin.js';
import pendingCartModel from './models/pendingCartModel.js';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import couponRouter from './routes/couponRoute.js';
import { validateBody } from './middleware/validate.js';

const app = express();
const port = process.env.PORT || 4000;
```

The server does several key things:

- starts an Express app
- connects to MongoDB
- connects Cloudinary
- configures CORS
- sets cache-control and security headers
- adds rate limiting
- sets up SMTP using Brevo/Nodemailer
- mounts route modules for user, product, cart, order, review, and coupon flows

This makes the backend a full-stack service layer for the store, even if the current customer runtime is elsewhere.

---

## 4. CORS and Request Security Configuration

The server sets an allowlist for certain origins:

```js
const allowedOrigins = new Set([
  'https://greenvalleynaturalsbackend.vercel.app',
  'https://greenvalleynaturalsadmin.vercel.app',
  'https://greenvalleynaturals01.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4000',
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    console.error('❌ Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
```

### Why this matters

The legacy backend heavily expected frontend access from multiple deployed origins and local development ports. This shows it was built to support a separate frontend architecture, which is now split across redlinenext and redlineadmin.

---

## 5. Rate Limiting and API Hardening

The server applies limits in a structured way:

```js
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);
app.use('/api/user', authLimiter);
```

This indicates the backend was hardened for production-like API access and had explicit controls around authentication endpoints.

---

## 6. Email and Login Link Behavior

The legacy backend has an explicit email login flow built around Firebase auth and magic links.

```js
app.post('/api/user/send-login-link', authLimiter, validateBody(['email']), async (req, res) => {
  const { email, redirectPath, cartItems } = req.body;
  ...
  const link = await admin
    .auth()
    .generateSignInWithEmailLink(email, actionCodeSettings);

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Sign in to Green Valley Naturals',
    html: `...`
  };

  await transporter.sendMail(mailOptions);
```

This is very important historically because it demonstrates a different auth pattern than the current OTP-based auth in redlinenext:

- legacy backend: Firebase email/magic-link flow
- active storefront: OTP-based flow under redlinenext/src/app/api/auth

This is a concrete example of an older auth architecture that still exists in the repo but isn’t the current runtime flow.

---

## 7. Contact Form and Mailer Setup

The backend also includes a contact endpoint:

```js
app.post('/api/contact/send-message', authLimiter, validateBody(['name','email','projectType','message']), async (req, res) => {
  ...
  await transporter.sendMail(mailOptions);
  res.json({ success: true, message: 'Message sent successfully' });
});
```

This suggests the legacy app included a business website contact flow and used SMTP through Brevo for outbound email.

---

## 8. Route Modules

The route structure shows the backend was built to support the full commerce domain.

### userRoute.js

```js
userRouter.post('/register', validateBody(['name','email','password']), registerUser)
userRouter.post('/login', validateBody(['email','password']), loginUser)
userRouter.post('/admin', validateBody(['email','password']), adminLogin)
userRouter.get('/profile', authUser, getUserProfile)
userRouter.put('/update-profile', authUser, updateProfile)
userRouter.get('/reverse-geocode', reverseGeocodeLocation)
```

### productRoute.js

```js
productRouter.post('/add',adminAuth, upload.fields([...]), addProduct);
productRouter.put('/update/:productId', adminAuth, upload.fields([...]), updateProduct);
productRouter.post('/single', singleProduct);
productRouter.get('/single', singleProduct);
productRouter.post('/remove',adminAuth, removeProduct);
productRouter.post('/download', auth, getDownloadLink);
productRouter.get('/list', listProducts);
productRouter.get('/dashboard/stats', adminAuth, getDashboardStats);
```

These route definitions show a complete product lifecycle:

- add/update/remove product
- fetch single product or list products
- dashboard stats
- protected admin routes
- user-side product downloads

---

## 9. Controller Pattern

The backend uses a standard Express controller design, with route files importing functions from controllers.

For example, userController.js includes:

- loginUser
- registerUser
- adminLogin
- getUserProfile
- reverseGeocodeLocation
- updateProfile

This is a total service-layer pattern: the route handles HTTP, the controller handles validation and application logic, and the model layer handles persistence.

---

## 10. Authentication Model in the Legacy Backend

The legacy backend has an older, direct token-based auth flow.

### User auth

```js
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}
```

User registration and login create JWT tokens for the user.

### Admin auth

```js
import jwt from 'jsonwebtoken'

const adminAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({ success: false, message: "Not Authorized Login Again" });
        }
        const token = authHeader.split(' ')[1];
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        if(token_decode !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            return res.json({success : false, message: "Not Authorized Login Again"})
        }
        next()
    }
    catch (error){
        return res.json({ success: false, message: "Not Authorized Login Again" })
    }
}
```

This differs from the active redlinenext design, which uses cookie/session-based auth with OTP flows and browser-side client API wrappers.

---

## 11. Database and Cloud Integration

The legacy backend includes direct infrastructure setup.

### MongoDB config

```js
mongoose.connect(`${process.env.MONGODB_URI}/greenvalley`, {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  minPoolSize: 1,
});
```

### Cloudinary config

The backend includes a dedicated Cloudinary configuration file and uses upload middleware for image handling.

### Firebase admin config

```js
import admin from 'firebase-admin';
```

This confirms the legacy backend integrated with Firebase for authentication and/or backend identity flows. The active customer app in redlinenext does not rely on that as the primary auth pattern.

---

## 12. Relationship to the Active Runtime

The key distinction is this:

- redlinenext contains the current app router, customer pages, cookie-based auth flow, and routing decisions for the storefront
- redlineadmin contains a separate admin UI for operations and management
- redlineBackend contains an older, independent Express backend with Firebase/email magic-link patterns and a more classic commerce API design

The backend persists as a legacy artifact and a useful code reference, but it is not the runtime path currently used by the verified active customer flow and admin UI described in earlier parts.

---

## 13. Evidence from the Codebase

This part is based on direct source evidence from:

- redlineBackend/server.js
- redlineBackend/routes/userRoute.js
- redlineBackend/routes/productRoute.js
- redlineBackend/controllers/userController.js
- redlineBackend/middleware/adminAuth.js
- redlineBackend/config/mongodb.js
- redlineBackend/package.json

This is enough to conclude that it is structurally a working legacy backend capable of handling store operations, but it is not the active app runtime according to the app-router architecture in redlinenext and the admin frontend in redlineadmin.

---

## 14. Summary

The legacy backend is a conventional Express commerce API with:

- route-based endpoint organization
- controller-layer business logic
- model-driven MongoDB persistence
- cloud upload integration
- Firebase and JWT auth patterns
- email and contact flows
- admin protection middleware

It is clearly a real project in the repo, but it sits behind the active runtime split: redlinenext is the current storefront and redlineadmin is the current admin frontend. The legacy backend remains historically important, but it is not the current source-of-truth for the system’s active architecture.
