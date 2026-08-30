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
For MilesWeb setup, see `MILESWEB_DEPLOYMENT.md`.
