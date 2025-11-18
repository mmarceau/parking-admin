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

*** Convex create a .env.local file your you automatically ***
If Convex does not create an .env.local file, please manually use the env.local-example and update it accordingly.


### 3. Setup Stripe Sandbox

#### Get Your Stripe Test Keys

1. Go into Stripe and create a new Sandbox
2. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_`)

#### Configure Stripe in Convex

Set your Stripe secret key and frontend URL:

```bash
npx convex env set STRIPE_SECRET_KEY sk_test_your_secret_key_here
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

*** Note: You must have stripe cli working before seeding the database ***
Populate your database with test data: 

```bash
npx convex run seed:seedAll
```
After about 30 seconds...

```bash
[CONVEX ?(seed:seedAll)] [LOG] '✓ Created 23 user roles'
{
  message: 'Successfully seeded database with 141 total records',
  success: true,
  totals: {
    garages: 7,
    productPrices: 63,
    products: 26,
    roles: 7,
    subscriptions: 0,
    userRoles: 23,
    users: 15
  }
}
```

This creates test users, garages, products, subscriptions, and related data.


### 5. Setup Stripe Webhook URL

After starting the dev server, you need to configure the webhook endpoint in Stripe. To get the URL do the following:

```bash
cat .env.local

```
You should see something like:
VITE_CONVEX_URL=https://smiling-yak-278.convex.cloud

Your webhook url is slightly different:
https://shocking-yak-278.convex.site/webhooks/stripe

*** Notice that the TLD is 'site' and not 'cloud' ***
You can also view this proper URL going into the Convex dashboard and clicking on:
Settings --> URL & Deploy Key --> HTTP Actions URL

After you have your webhooks endpoint, Go into the Stripe dashboard and then:
1. Click on **Developers** (At the bottom)
2. Click on the **webhooks** tab
3. Click **"Create an Event Destination"**
4. Add the URL from above.
5. Click **"Select Events"**
6. Choose **All**
7. Click **"Add Events"**
8. Click **"Add Endpoint"**

### 6. Run the Development Server

Start the application with Stripe webhook forwarding:

```bash
npm run dev
```

This starts:
- Convex backend
- Vite frontend (React app at http://localhost:5173)

### 7. Access the Application

Open your browser to http://localhost:5173

## Testing the Application

Follow these steps to test the complete subscription workflow:

### 8. Navigate to Admin Users

1. In the application, click on the **"Users Portal"** tab in the admin interface

### 9. Select a User

1. Choose any user from the list (these are seeded test users)
2. Click on the user to view their details

### 10. Create a Subscription

1. Click **"Add Subscription"** button
2. Select a garage
3. Click **"Subscribe"** on a pass to open Stripe Checkout
4. Use a test credit card:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiration:** Any future date (e.g., 12/25)
   - **CVC:** Any 3 digits (e.g., 123)
   - **ZIP:** Any 5 digits (e.g., 12345)
5. Complete the payment

### 11. After Successful Payment

1. You'll be redirected back to the application
2. You should see a success message and the new subscription on the User Portal


### 12. Access SuperAdmin View
1. Click on **"Admin Portal"** or navigate back to the admin interface
2. In the admin interface, click on **"SuperAdmin"** tab or section

### 13. Verify Subscription

1. Select the garage you just subscribed to
2. Verify that the subscription appears in the list
3. Check that the subscription status is **Active**
4. Verify the subscription details (user, dates, product)

✅ **Success!** You've completed the full subscription workflow.


### 14. Cancellation 
You can cancel subscriptions from either the User or Admin panel. Try cancelling a subscription and verifying the subscription has been cancelled in Stripe

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
3. Verify proper URL is added to Stripe Webhooks dashboard

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


## Key Features

- ✅ **Admin Dashboard** - Manage garages, users, products, and subscriptions
- ✅ **User Portal** - Subscribe to parking passes with Stripe Checkout
- ✅ **Stripe Integration** - Secure payment processing with test mode
- ✅ **Webhook Sync** - Automatic updates from Stripe events
- ✅ **Seed Data** - Realistic test data with Faker.js
- ✅ **SuperAdmin View** - Overview of all garages and subscriptions

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
