# MilesWeb Deployment

This project can run on MilesWeb Node.js hosting through cPanel Application Manager.

## Build Settings

- Node.js version: 20 or newer
- Application startup file: `server.js`
- Build command: `npm run build`
- Start command: `npm run start:milesweb`
- Environment: `NODE_ENV=production`

## Required Environment Variables

Set these in cPanel Application Manager, not in source control:

- `MONGODB_URI`
- `AUTH_SECRET`
- `JWT_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SHIPROCKET_EMAIL`
- `SHIPROCKET_PASSWORD`
- `SHIPROCKET_PICKUP_PINCODE`
- `SHIPROCKET_PICKUP_LOCATION`
- `SHIPROCKET_WEBHOOK_SECRET`
- `OTP_PROVIDER`
- `OTP_API_KEY`
- `OTP_MOCK_ENABLED`
- `OTP_TEST_PHONES`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_ALLOWED_ORIGINS`

Do not set `DB_RUNTIME=cloudflare` on MilesWeb. That setting is only for the Cloudflare runtime.

## Performance Notes

- Product pages use ISR with a 5 minute revalidation window.
- Public product APIs already send shared-cache headers.
- Public review data is cacheable for shared caches.
- Product and Cloudinary image dimensions/quality are unchanged.

For best production speed on MilesWeb, put Cloudflare CDN in front of the domain and let it respect origin `Cache-Control` headers.
