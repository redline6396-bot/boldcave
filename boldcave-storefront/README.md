# Bold Cave Storefront

Customer storefront and API routes for Bold Cave.

## Local commands

- `npm run dev` starts the app on port 3000.
- `npm run build` runs the production Next.js build.
- `npm run lint` runs ESLint.
- `npm run upload` builds the Cloudflare worker bundle and uploads it.
- `npm run deploy` builds and deploys through OpenNext Cloudflare.
- `npm run start:milesweb` starts the production Node server for MilesWeb/cPanel.

Configure production secrets in the target host, not in source control.
`SHIPPING_PROVIDER` is optional and defaults to `delhivery`; set
`SHIPPING_PROVIDER=delhivery` explicitly when documenting an environment.
Shadowfax is implemented behind an explicit opt-in and must remain disabled
unless a safe test/production rollout is intended:

```env
SHIPPING_PROVIDER=delhivery
SHADOWFAX_API_ENABLED=false
SHADOWFAX_ENV=production
SHADOWFAX_API_TOKEN=
SHADOWFAX_BASE_URL=
SHADOWFAX_SERVICEABILITY_CACHE_TTL_MS=
SHADOWFAX_TRACKING_CACHE_TTL_MS=
SHADOWFAX_WEIGHT_UNIT_CONFIRMED=
SHADOWFAX_PICKUP_NAME=
SHADOWFAX_PICKUP_CONTACT=
SHADOWFAX_PICKUP_ADDRESS_LINE_1=
SHADOWFAX_PICKUP_ADDRESS_LINE_2=
SHADOWFAX_PICKUP_CITY=
SHADOWFAX_PICKUP_STATE=
SHADOWFAX_PICKUP_PINCODE=
SHADOWFAX_PICKUP_LATITUDE=
SHADOWFAX_PICKUP_LONGITUDE=
SHADOWFAX_PICKUP_UNIQUE_CODE=
SHADOWFAX_RTO_NAME=
SHADOWFAX_RTO_CONTACT=
SHADOWFAX_RTO_ADDRESS_LINE_1=
SHADOWFAX_RTO_ADDRESS_LINE_2=
SHADOWFAX_RTO_CITY=
SHADOWFAX_RTO_STATE=
SHADOWFAX_RTO_PINCODE=
```

Delhivery B2C uses production APIs only and is also explicitly enabled:

```env
SHIPPING_PROVIDER=delhivery
DELHIVERY_API_ENABLED=true
DELHIVERY_API_TOKEN=
DELHIVERY_CLIENT_NAME=
DELHIVERY_PICKUP_LOCATION=BOLD CAVE B2C
DELHIVERY_PICKUP_TIME=14:00:00
DELHIVERY_SHIPPING_MODE=Surface
DELHIVERY_FRAGILE_SHIPMENT=true
DELHIVERY_SELLER_GSTIN=
DELHIVERY_CLIENT_GSTIN=
DELHIVERY_WEBHOOK_SECRET=
DELHIVERY_SERVICEABILITY_CACHE_TTL_MS=
DELHIVERY_TRACKING_CACHE_TTL_MS=
```

Register Delhivery Scan Push against `POST /api/webhooks/delhivery` and send
the configured secret in `X-Delhivery-Webhook-Secret`.

For MilesWeb setup, see `MILESWEB_DEPLOYMENT.md`.
