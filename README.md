# Parking Subscription POC

A parking subscription management system built with Convex and Stripe. This POC demonstrates subscription management, payment processing, and admin dashboards for parking garages.

## Prerequisites

- **Node.js v22** - Use NVM to manage Node versions:
  ```bash
  nvm install 22
  nvm use 22
  ```

## Setup Instructions

### 1. Convex Setup

Follow the initial Convex setup at [docs.convex.dev/tutorial](https://docs.convex.dev/tutorial) to create your Convex project.

```bash
npm install
npx convex dev
```

This will prompt you to create a Convex account and project if you haven't already.

### 2. Setup Environment Variables

Create a `.env.local` file in the project root:

```bash
# Your Convex deployment URL (get this from running npx convex dev)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

**Example:** See `env.local-example` for reference.

### 3. Setup Stripe Sandbox

#### Get Your Stripe Test Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

#### Configure Stripe in Convex

Set your Stripe secret key and frontend URL:

```bash
npx convex env set STRIPE_SECRET_KEY sk_test_your_secret_key_here
npx convex env set FRONTEND_URL http://localhost:5173
```

#### Install Stripe CLI

The Stripe CLI is needed for webhook forwarding during development.

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows/Linux:** See https://stripe.com/docs/stripe-cli#install

Then authenticate:
```bash
stripe login
```

### 4. Seed Database

Populate your database with test data:

```bash
npx convex run seed:seedAll
```

This creates test users, garages, products, subscriptions, and related data.

### 5. Run the Development Server

Start the application with Stripe webhook forwarding:

```bash
npm run dev
```

This starts:
- Convex backend
- Vite frontend (React app at http://localhost:5173)
- Stripe webhook forwarding

### 6. Setup Stripe Webhook URL

After starting the dev server, you need to configure the webhook endpoint in Stripe:

1. Get your Convex deployment URL from the terminal output or from `.env.local`
2. Go to https://dashboard.stripe.com/test/webhooks
3. Click **"Add endpoint"**
4. Enter: `https://your-deployment.convex.cloud/stripe/webhook`
5. Select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.*`
   - `invoice.payment_failed`
   - `payment_intent.payment_failed`
   - `product.*`
   - `price.*`
6. Click **"Add endpoint"**

**Note:** For quick POC testing, webhooks will work without configuring the webhook secret (you'll see warnings in logs, but functionality works). For production, copy the webhook signing secret and run:
```bash
npx convex env set STRIPE_WEBHOOK_SECRET whsec_your_webhook_secret_here
```

### 7. Access the Application

Open your browser to http://localhost:5173

## Testing the Application

Follow these steps to test the complete subscription workflow:

### 8. Navigate to Admin Users

1. In the application, click on the **"Users"** tab in the admin interface

### 9. Select a User

1. Choose any user from the list (these are seeded test users)
2. Click on the user to view their details

### 10. Create a Subscription

1. Click **"Add Subscription"** or **"Subscribe"** button
2. Select a garage and product/pass
3. Click **"Subscribe"** to open Stripe Checkout
4. Use a test credit card:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiration:** Any future date (e.g., 12/25)
   - **CVC:** Any 3 digits (e.g., 123)
   - **ZIP:** Any 5 digits (e.g., 12345)
5. Complete the payment

### 11. After Successful Payment

1. You'll be redirected back to the application
2. You should see a success message
3. Click on **"Admin Portal"** or navigate back to the admin interface

### 12. Access SuperAdmin View

1. In the admin interface, click on **"SuperAdmin"** tab or section

### 13. Verify Subscription

1. Select the garage you just subscribed to
2. Verify that the subscription appears in the list
3. Check that the subscription status is **Active**
4. Verify the subscription details (user, dates, product)

✅ **Success!** You've completed the full subscription workflow.

## Test Credit Cards

Use these Stripe test cards for different scenarios:

| Card Number | Scenario | Details |
|-------------|----------|---------|
| `4242 4242 4242 4242` | ✅ Success | Standard successful payment |
| `4000 0025 0000 3155` | 🔐 3D Secure | Requires authentication |
| `4000 0000 0000 9995` | ❌ Declined | Insufficient funds |
| `4000 0000 0000 0002` | ❌ Declined | Card declined |
| `4000 0000 0000 9987` | ❌ Declined | Lost card |

**For all cards:**
- Use any future expiration date
- Use any 3-digit CVC
- Use any 5-digit ZIP code

More test cards: https://stripe.com/docs/testing

## Troubleshooting

### Convex Connection Issues

**Problem:** Can't connect to Convex

**Solution:**
```bash
npx convex dev
# Make sure you see "Convex functions ready" message
```

### Stripe API Errors

**Problem:** Products not syncing to Stripe

**Solution:** Verify your Stripe secret key is set:
```bash
npx convex env list
# Should show STRIPE_SECRET_KEY
```

### Webhook Not Working

**Problem:** Subscriptions not creating after payment

**Solution:**
1. Make sure `npm run dev` is running (includes webhook forwarding)
2. Check terminal for webhook events
3. Verify `FRONTEND_URL` is set correctly: `npx convex env list`

### Port Already in Use

**Problem:** Port 5173 is already in use

**Solution:**
```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9
# Or change the port in vite.config.mts
```

### Node Version Issues

**Problem:** Errors about Node version

**Solution:**
```bash
nvm use 22
# If not installed: nvm install 22
```

## Project Structure

```
convex-tutorial/
├── convex/              # Backend (Convex functions)
│   ├── schema.ts       # Database schema
│   ├── admin.ts        # Admin queries/mutations
│   ├── checkout.ts     # Stripe checkout logic
│   ├── stripe.ts       # Stripe API integration
│   ├── webhooks.ts     # Stripe webhook handlers
│   ├── http.ts         # HTTP endpoints
│   └── seed.ts         # Database seeding
├── src/                # Frontend (React)
│   ├── AdminPage.tsx   # Admin dashboard
│   ├── UserPage.tsx    # User subscription portal
│   └── components/     # UI components
└── .env.local          # Environment variables
```

## Key Features

- ✅ **Admin Dashboard** - Manage garages, users, products, and subscriptions
- ✅ **User Portal** - Subscribe to parking passes with Stripe Checkout
- ✅ **Stripe Integration** - Secure payment processing with test mode
- ✅ **Webhook Sync** - Automatic updates from Stripe events
- ✅ **Seed Data** - Realistic test data with Faker.js
- ✅ **SuperAdmin View** - Overview of all garages and subscriptions

## Environment Variables Reference

| Variable | Location | Example | Required |
|----------|----------|---------|----------|
| `VITE_CONVEX_URL` | `.env.local` | `https://xxxxx.convex.cloud` | ✅ Yes |
| `STRIPE_SECRET_KEY` | Convex (CLI) | `sk_test_...` | ✅ Yes |
| `FRONTEND_URL` | Convex (CLI) | `http://localhost:5173` | ✅ Yes |
| `STRIPE_WEBHOOK_SECRET` | Convex (CLI) | `whsec_...` | ⚠️ Optional for POC |

## Useful Commands

```bash
# Start everything (recommended)
npm run dev

# Start without Stripe webhooks
npm run dev:nostripe

# Seed database
npx convex run seed:seedAll

# Clear all data
npx convex run seed:clearAll

# View environment variables
npx convex env list

# View Convex logs
npx convex dev
```

## Need Help?

- **Convex Dashboard:** Check your deployment at https://dashboard.convex.dev
- **Stripe Dashboard:** View payments/webhooks at https://dashboard.stripe.com/test
- **Convex Logs:** Run `npx convex dev` to see real-time logs
- **Convex Docs:** https://docs.convex.dev
- **Stripe Docs:** https://stripe.com/docs

---

**Ready to test!** 🚀 Follow the setup steps above, then test the subscription workflow in steps 8-13.
