
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

// Avoid 304 Not Modified responses for API routes (ETag revalidation can drop/skip
// CORS headers on some CDN/serverless paths, which breaks the admin panel).
app.disable('etag');

connectDB();
connectCloudinary();

app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(express.json({ limit: '1mb' }));

// Never cache API responses (prevents conditional GETs like If-None-Match -> 304)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

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

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.error('❌ Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));


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

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error) => {
  if (error) console.error('SMTP verify failed:', error.message);
  else console.log('SMTP connection verified');
});

const resolveMx = util.promisify(dns.resolveMx);

app.post('/api/user/send-login-link', authLimiter, validateBody(['email']), async (req, res) => {
  const { email, redirectPath, cartItems } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }
    const domain = email.split('@')[1];
    await resolveMx(domain);

    if (cartItems && typeof cartItems === 'object') {
      const normalized = {};
      Object.entries(cartItems).forEach(([itemId, value]) => {
        if (value == null) return;
        if (typeof value === 'object') {
          normalized[itemId] = Object.values(value).reduce((s, v) => s + (Number(v) || 0), 0);
        } else {
          normalized[itemId] = Number(value) || 0;
        }
      });
      await pendingCartModel.findByIdAndUpdate(
        normalizedEmail,
        { _id: normalizedEmail, cartData: normalized },
        { upsert: true, new: true }
      );
    }

    const baseUrl = `${process.env.FRONTEND_URL}/finish-login`;
    const url = new URL(baseUrl);
    url.searchParams.set('email', email);
    if (redirectPath) {
      url.searchParams.set('redirect', redirectPath);
    }
    const actionCodeSettings = {
      url: url.toString(),
      handleCodeInApp: true
    };

    const link = await admin
      .auth()
      .generateSignInWithEmailLink(email, actionCodeSettings);

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Sign in to Green Valley Naturals',
      html: `
        <div style="padding:20px;font-family:sans-serif">
          <h2>Welcome to Green Valley Naturals</h2>
          <p>Click below to sign in</p>
          <a href="${link}" style="padding:12px 20px;background:black;color:white;text-decoration:none">
            Sign In
          </a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Magic link sent' });
  } catch (error) {
    console.error('Send login link error:', error);
    res.json({
      success: false,
      message: error.message || 'Failed to send email'
    });
  }
});

app.post('/api/contact/send-message', authLimiter, validateBody(['name','email','projectType','message']), async (req, res) => {
  const { name, email, phone, projectType, budget, message } = req.body;

  if (!name || !email || !projectType || !message) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (!validator.isEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Invalid email' });
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: 'greenvalleynaturals01@gmail.com',
      replyTo: normalizedEmail,
      subject: `New Project Inquiry from ${name}`,
      html: `
        <div style="padding:20px;font-family:sans-serif;color:#333">
          <h2 style="color:#22d3ee">New Project Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          <p><strong>Project Type:</strong> ${projectType}</p>
          ${budget ? `<p><strong>Budget:</strong> ${budget}</p>` : ''}
          <p><strong>Message:</strong></p>
          <p style="background:#f5f5f5;padding:15px;border-left:4px solid #22d3ee">${message.replace(/\n/g, '<br>')}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send contact message error:', error);
    res.json({
      success: false,
      message: error.message || 'Failed to send message'
    });
  }
});

app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/review', reviewRouter);
app.use('/api/coupon', couponRouter);

// Debug endpoint to test token verification (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/debug/verify-token', async (req, res) => {
    try {
      const header = req.headers.authorization || '';
      const [type, idToken] = header.split(' ');
      
      if (type !== 'Bearer' || !idToken) {
        return res.json({ success: false, message: 'Invalid header format' });
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      
      res.json({ 
        success: true, 
        message: 'Token verified',
        decoded: {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name
        }
      });
    } catch (error) {
      console.error('Debug - Token verification failed:', {
        message: error.message,
        code: error.code,
      });
      res.status(401).json({ 
        success: false, 
        message: 'Token verification failed',
        error: error.message,
        code: error.code
      });
    }
  });
}

app.get('/', (req, res) => {
  res.send('API working');
});

// In serverless environments like Vercel, we export the app
// instead of starting a dedicated HTTP listener.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

export default app;
