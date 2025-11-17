# Stripe Integration Guide

Complete guide for the Stripe integration in your parking subscription application.

## 🎯 What's Integrated

✅ **Admin Portal** - Create products/prices → Auto-syncs to Stripe  
✅ **User Portal** - Subscribe with Stripe Checkout (secure payment page)  
✅ **Webhooks** - Bidirectional sync between Stripe and your database  
✅ **Security** - All secret keys stored server-side, PCI compliant payments  

---

## 🚀 Quick Setup

### Step 1: Get Your Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (`pk_test_...`)
3. Copy **Secret key** (`sk_test_...`)

### Step 2: Configure Environment Variables

**Frontend** - Create/update `.env.local`:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Backend** - Set in Convex:
```bash
npx convex env set STRIPE_SECRET_KEY sk_test_your_secret_key_here
npx convex env set FRONTEND_URL http://localhost:5173
```

### Step 3: Start Development

```bash
npm run dev
```

That's it! You're ready to test.

---

## 🧪 Testing the Integration

### Test Product Creation (Admin)

1. Navigate to `/admin`
2. Select a garage → "Manage Products"
3. Create a product:
   - Name: "Monthly Pass"
   - Type: "monthly"
   - Seats: 10
   - Status: Active
4. Add a price:
   - Name: "Standard"
   - Amount: 5000 (= $50.00)
   - Status: Active
5. **Verify**: Check Stripe Dashboard - product should appear!

### Test Checkout Flow (User)

1. Navigate to `/user`
2. Select a user → "Add Subscription"
3. Choose a garage and product
4. Click "Subscribe"
5. **Use test card**: `4242 4242 4242 4242`
   - Any future expiration date
   - Any 3-digit CVC
   - Any ZIP code
6. Complete payment
7. You should be redirected back with success message

### Additional Test Cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure |
| `4000 0000 0000 9995` | ❌ Declined (insufficient funds) |

More: https://stripe.com/docs/testing

---

## 🔄 How It Works

### Admin Creates Product
```
Admin UI → Convex Database → Stripe API
Product stored with stripeProductId
```

### User Subscribes
```
User clicks "Subscribe" 
  → Convex creates Checkout Session
  → Redirects to Stripe's secure page
  → User pays with card
  → Stripe sends webhook
  → Convex creates subscription
  → User redirected back with success
```

### Stripe Webhook Sync
```
Admin updates product in Stripe Dashboard
  → Stripe sends webhook to Convex
  → Convex updates database
  → Changes reflected in Admin UI
```

---

## 🔗 Webhook Setup (Optional for Local Testing)

Webhooks enable Stripe to notify your app when events occur (like payment completion).

### For Local Development

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login**:
   ```bash
   stripe login
   ```

3. **Find your Convex webhook URL**:
   ```bash
   npx convex dev
   # Look for: deployment URL: https://your-deployment.convex.cloud
   ```
   Your webhook URL is: `https://your-deployment.convex.cloud/stripe/webhook`

4. **Forward webhooks**:
   ```bash
   stripe listen --forward-to https://your-deployment.convex.cloud/stripe/webhook
   ```

5. **Copy webhook secret** (from terminal output):
   ```bash
   npx convex env set STRIPE_WEBHOOK_SECRET whsec_xxxxxxxxxxxxx
   ```

6. **Test webhook**:
   ```bash
   stripe trigger checkout.session.completed
   ```

### For Production

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter: `https://your-deployment.convex.site/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `invoice.payment_failed`
   - `payment_intent.payment_failed`
   - `product.*`
   - `price.*`
   - `customer.subscription.*`
5. Copy webhook signing secret
6. Set in Convex:
   ```bash
   npx convex env set --prod STRIPE_WEBHOOK_SECRET whsec_xxxxxxxxxxxxx
   ```

---

## 🚢 Production Deployment

### 1. Get Live Keys

1. Complete Stripe account verification
2. Go to https://dashboard.stripe.com/apikeys (toggle to Live mode)
3. Copy live publishable and secret keys

### 2. Update Environment Variables

**Frontend**:
```bash
# Update .env.local or your build environment
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
```

**Backend**:
```bash
npx convex env set --prod STRIPE_SECRET_KEY sk_live_your_secret_key
npx convex env set --prod FRONTEND_URL https://yourdomain.com
```

### 3. Set Up Production Webhooks

Follow the "For Production" webhook steps above.

### 4. Deploy

```bash
npx convex deploy --prod
npm run build
# Deploy your frontend to your hosting service
```

---

## 🐛 Troubleshooting

### Product Not Syncing to Stripe

**Check**:
```bash
npx convex env list
# Verify STRIPE_SECRET_KEY is set
```

**Look at logs**:
```bash
npx convex dev
# Check for Stripe API errors
```

### Checkout Redirect Not Working

**Symptoms**: After payment, redirected to wrong URL or broken page

**Solution**: Verify `FRONTEND_URL` is set correctly:
```bash
npx convex env set FRONTEND_URL http://localhost:5173
```

Make sure it points to where your React app is actually running (check your terminal).

### "Payment not configured" Warning

**Cause**: Price doesn't have a Stripe price ID

**Solution**: 
1. Create products through Admin UI (they auto-sync to Stripe)
2. Wait a moment for sync to complete
3. Refresh and try again

### Webhooks Not Creating Subscriptions

**Check**:
1. `STRIPE_WEBHOOK_SECRET` is set: `npx convex env list`
2. Webhook endpoint URL is correct in Stripe Dashboard
3. Check Convex logs for webhook processing errors
4. Check Stripe Dashboard → Webhooks → Recent deliveries

### Node Version Error with Convex CLI

**Symptoms**: `ReferenceError: File is not defined`

**Solution**:
```bash
nvm use  # Use the version in .nvmrc
npx convex env set FRONTEND_URL http://localhost:5173
```

---

## 📊 Environment Variables Reference

| Variable | Where | Value | Public? |
|----------|-------|-------|---------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `.env.local` | `pk_test_...` | ✅ Yes (frontend) |
| `STRIPE_SECRET_KEY` | Convex | `sk_test_...` | ❌ No (backend only) |
| `STRIPE_WEBHOOK_SECRET` | Convex | `whsec_...` | ❌ No (backend only) |
| `FRONTEND_URL` | Convex | `http://localhost:5173` | ✅ Yes (for redirects) |

### Test vs Live Mode

Always use matching keys:
- **Test mode**: `pk_test_...` with `sk_test_...`
- **Live mode**: `pk_live_...` with `sk_live_...`

Never mix test and live keys!

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `convex/stripe.ts` | Stripe API actions (create/update products/prices) |
| `convex/checkout.ts` | Checkout session creation |
| `convex/webhooks.ts` | Webhook event handlers |
| `convex/http.ts` | HTTP endpoint for webhooks |
| `convex/admin.ts` | Admin mutations with Stripe sync |
| `src/AdminProducts.tsx` | Product management UI |
| `src/UserPage.tsx` | User subscription flow |

---

## 🔐 Security Best Practices

✅ **Never commit secret keys** - Use environment variables  
✅ **Use test mode in development** - Switch to live only in production  
✅ **Verify webhook signatures** - Already implemented  
✅ **Keep Stripe.js updated** - Check for security updates  
✅ **Use HTTPS in production** - Required for payment processing  

---

## 📚 Additional Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Convex Documentation**: https://docs.convex.dev
- **Stripe Dashboard**: https://dashboard.stripe.com

---

## ✨ Features Implemented

✅ Product & price management with Stripe sync  
✅ Secure checkout via Stripe-hosted page  
✅ Automatic subscription creation after payment  
✅ Webhook integration for bidirectional sync  
✅ Support for one-time and recurring payments  
✅ Payment failure handling and subscription grace periods  
✅ Test mode for safe development  
✅ Production-ready implementation  

---

## 💳 Payment Failure Handling

Your integration automatically handles payment failures for recurring subscriptions:

### How It Works

1. **Grace Period**: After a payment fails, Stripe automatically retries according to your retry schedule
2. **Automatic Retries**: Your subscription remains active during the first 3 payment attempts
3. **Subscription Expiration**: After 3 failed attempts, the subscription is automatically marked as expired

### What Happens on Payment Failure

```
Payment fails → Stripe retries automatically
  ├─ Attempt 1-2: Subscription stays active (grace period)
  └─ Attempt 3+: Subscription marked as expired
```

### Webhook Events Handled

Your app processes these payment failure events:

- **`invoice.payment_failed`** - Recurring payment failed
  - Tracks attempt count
  - Expires subscription after 3 attempts
  - Logs retry schedule

- **`payment_intent.payment_failed`** - Payment processing failed
  - Logs failure reason (card_declined, insufficient_funds, etc.)
  - Used for analytics and debugging

- **`checkout.session.async_payment_failed`** - Initial checkout payment failed
  - Customer must retry checkout
  - No subscription created until successful payment

### Testing Payment Failures

Use Stripe's test cards to simulate failures:

```bash
# Declined card
4000 0000 0000 0002

# Insufficient funds
4000 0000 0000 9995

# Expired card
4000 0000 0000 0069
```

Then monitor the webhook events:
```bash
npx convex dev
# Watch for payment failure logs
```

### Viewing Failed Payments

**In Stripe Dashboard**:
1. Go to https://dashboard.stripe.com/test/payments
2. Filter by "Failed"
3. Click any payment to see failure reason

**In Convex Logs**:
```bash
npx convex dev
# Look for "⚠ Invoice payment failed" messages
```

### Subscription Expiration Logic

```typescript
// After 3 failed payment attempts:
if (attemptCount >= 3) {
  // Subscription is expired
  subscription.endDate = now()
} else {
  // Still in grace period
  // Stripe will retry automatically
}
```

### Custom Retry Settings

To customize Stripe's retry behavior:

1. Go to https://dashboard.stripe.com/settings/billing/automatic
2. Configure your retry schedule
3. Set maximum retry attempts
4. Configure dunning emails (payment reminders)

---

## 🎉 You're All Set!

Your parking subscription system now has:
- ✅ Secure payment processing
- ✅ Automatic Stripe synchronization
- ✅ Professional checkout experience
- ✅ Production-ready infrastructure

**Start accepting payments!** 🚀

---

**Need Help?**
- Check Convex logs: `npx convex dev`
- Check Stripe Dashboard for payment/webhook logs
- Verify environment variables: `npx convex env list`

