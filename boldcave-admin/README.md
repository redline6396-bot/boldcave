# Bold Cave Admin

Admin panel for Bold Cave operations.

## Local commands

- `npm run dev` starts the app on port 3001.
- `npm run build` runs the production Next.js build.
- `npm run lint` runs ESLint.
- `npm run upload` builds the Cloudflare worker bundle and uploads it.
- `npm run deploy` builds and deploys through OpenNext Cloudflare.

For production admin deployments, set `STOREFRONT_API_ORIGIN` to the deployed storefront/API origin.
Browser API requests use the same-origin `/backend` rewrite in production.
`NEXT_PUBLIC_API_BASE_URL` is still supported for local development.
