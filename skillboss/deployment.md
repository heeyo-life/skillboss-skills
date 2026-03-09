# Deployment

## Deployment Types (Choose ONE -- Never Both)

Every project uses **exactly one** deployment type. These are **mutually exclusive**:

| Type | Command | Use When |
|------|---------|----------|
| **Static** | `publish-static` | Pure frontend only (HTML/CSS/JS), no server code whatsoever |
| **Worker** | `publish-worker` | Has ANY server-side code (Hono routes, API endpoints, D1 database, etc.) |

**CRITICAL:** Never run both `publish-static` AND `publish-worker` for the same project.

- **Full-stack app (React + Hono backend)?** -> Use `publish-worker` ONLY. It automatically serves your built frontend (`dist/` or `build/`) via Cloudflare's assets binding.
- **Pure static site (no `index.ts`, no API)?** -> Use `publish-static` ONLY.

Common mistake: A Vite project with `index.ts` using Hono is ONE Worker deployment -- not a static site plus a worker. The Worker serves both your API routes and your React app's static files.

## Full-Stack Deployment (React + Worker)

For React apps with a Worker backend (e.g., Vite + Hono), use `publish-worker` only -- this is ONE deployment that serves both your API and frontend.

> **WARNING: One deployment, not two.** NEVER run `publish-static` for a full-stack app. The `publish-worker` command already serves your static files (`dist/` or `build/`) via Cloudflare's assets binding.

```bash
# Build your React app first
npm run build

# Deploy Worker + React app together
node ./scripts/serve-build.js publish-worker . --name my-fullstack-app
```

**Auto-detected folders:**
- `dist/` - Vite, Create React App, or custom builds
- `build/` - Create React App default

The static assets are served via Cloudflare's assets binding, so your Worker can serve both:
- API routes (e.g., `/api/*`, `/todos`)
- React app (all other routes, with SPA fallback to `index.html`)

## E-Commerce & Worker Deployment

For projects that need backend functionality (e-commerce, APIs, databases), use Worker deployment.

### Payment Architecture

SkillBoss uses a **centralized shopping service** for payment processing:

```
Your Worker  -->  shopping.heybossai.com  -->  Stripe
    |                    |
    |                    \--- Handles webhooks, subscriptions, refunds
    v
HeyBoss Dashboard (Product Management)
```

**Why this pattern?**
- Stripe secret keys never leave HeyBoss infrastructure
- No Stripe SDK needed in your worker code
- Products are managed via dashboard, not code
- Automatic webhook handling for payment events

**Your worker only needs `PROJECT_ID`** - no `STRIPE_SECRET_KEY` required.

### 1. Connect Stripe (one-time setup)

```bash
node ./scripts/stripe-connect.js
```

This opens your browser to complete Stripe Express account onboarding. Required for accepting payments.

### 2. Create Products

Products are stored in the HeyBoss shopping service database (NOT Stripe, NOT local D1):
- **Via Dashboard:** Use the HeyBoss dashboard UI to create products
- **Via API:** Call `/admin-products` on the shopping service

Products are created with: name, price (in cents), currency, billingType (one_time/recurring), etc.
See `workflows/ecommerce/README.md` for full API documentation.

### 3. Create your Worker

Use the e-commerce template:
```bash
cp -r ./templates/worker-ecommerce ./my-store
```

Or add shopping service endpoints to your existing worker. See `workflows/ecommerce/README.md` for details.

### 4. Deploy Worker

```bash
node ./scripts/serve-build.js publish-worker ./worker
```

Returns a `*.heyboss.live` URL. D1 databases and PROJECT_ID are auto-provisioned.

> $ **Monthly Cost:** D1 database storage costs 100 credits/GB/month ($5/GB/month), minimum 0.1 GB.

> $ **Monthly Cost:** Custom domains cost 200 credits/month ($10/month) per domain bound to a project.

### Worker Configuration

Create a `wrangler.toml` in your Worker folder:
```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-db"

[vars]
API_VERSION = "1.0"
```

### Pilot API in Code

To use Pilot in TypeScript/JavaScript apps, see the code examples in `api-integration.md`. The Pilot endpoint is `POST ${API_BASE}/pilot`.
