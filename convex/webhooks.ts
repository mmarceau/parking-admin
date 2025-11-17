/**
 * Stripe Webhook Handlers
 * 
 * This file processes webhook events from Stripe and syncs data
 * back to the Convex database.
 */

import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Main webhook event handler
 * 
 * This action is called by the HTTP endpoint and routes events
 * to the appropriate handler based on event type.
 */
export const handleStripeWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventData: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const data = JSON.parse(args.eventData);
    
    console.log(`📥 Processing Stripe webhook: ${args.eventType} (${args.eventId})`);
    
    try {
      // Handle different event types
      switch (args.eventType) {
        // Product events
        case "product.created":
          console.log(`  → Product created in Stripe: ${data.id}`);
          await handleProductCreated(ctx, data);
          break;
          
        case "product.updated":
          console.log(`  → Product updated in Stripe: ${data.id}`);
          await handleProductUpdated(ctx, data);
          break;
          
        case "product.deleted":
          console.log(`  → Product deleted in Stripe: ${data.id}`);
          await handleProductDeleted(ctx, data);
          break;
        
        // Price events
        case "price.created":
          console.log(`  → Price created in Stripe: ${data.id}`);
          await handlePriceCreated(ctx, data);
          break;
          
        case "price.updated":
          console.log(`  → Price updated in Stripe: ${data.id}`);
          await handlePriceUpdated(ctx, data);
          break;
        
        // Checkout events
        case "checkout.session.completed":
          console.log(`  → Checkout completed: ${data.id}`);
          await handleCheckoutCompleted(ctx, data);
          break;
          
        case "checkout.session.async_payment_succeeded":
          console.log(`  → Checkout async payment succeeded: ${data.id}`);
          await handleCheckoutCompleted(ctx, data);
          break;
        
        // Subscription events
        case "customer.subscription.created":
          console.log(`  → Subscription created: ${data.id}`);
          await handleSubscriptionCreated(ctx, data);
          break;
          
        case "customer.subscription.updated":
          console.log(`  → Subscription updated: ${data.id}`);
          await handleSubscriptionUpdated(ctx, data);
          break;
          
        case "customer.subscription.deleted":
          console.log(`  → Subscription deleted: ${data.id}`);
          await handleSubscriptionDeleted(ctx, data);
          break;
        
        // Payment events
        case "payment_intent.succeeded":
          console.log(`  → Payment succeeded: ${data.id} - $${data.amount / 100}`);
          break;
          
        case "payment_intent.payment_failed":
          console.log(`  ⚠ Payment intent failed: ${data.id}`);
          await handlePaymentIntentFailed(ctx, data);
          break;
        
        // Invoice payment events
        case "invoice.payment_failed":
          console.log(`  ⚠ Invoice payment failed: ${data.id}`);
          await handleInvoicePaymentFailed(ctx, data);
          break;
        
        case "checkout.session.async_payment_failed":
          console.log(`  ⚠ Checkout async payment failed: ${data.id}`);
          await handleCheckoutPaymentFailed(ctx, data);
          break;
        
        default:
          console.log(`  ℹ Unhandled event type: ${args.eventType}`);
      }
      
      console.log(`✓ Webhook processed successfully`);
    } catch (error: any) {
      console.error(`⚠ Error processing webhook: ${error.message}`);
      throw error;
    }
  },
});

// ========================================
// Product Event Handlers
// ========================================

async function handleProductCreated(ctx: any, data: any) {
  const { api } = await import("./_generated/api");
  
  // Check if product already exists in our database
  const existingProducts = await ctx.runQuery(api.webhooks.findProductByStripeId, {
    stripeProductId: data.id,
  });
  
  if (existingProducts.length > 0) {
    console.log(`  ℹ Product already exists in database, skipping creation`);
    return;
  }
  
  // If the product has metadata with a garageId, we could auto-create it
  // For now, just log that a new product was created in Stripe
  console.log(`  ℹ New product created in Stripe (manual sync may be needed)`);
}

async function handleProductUpdated(ctx: any, data: any) {
  const { api } = await import("./_generated/api");
  
  const products = await ctx.runQuery(api.webhooks.findProductByStripeId, {
    stripeProductId: data.id,
  });
  
  if (products.length === 0) {
    console.log(`  ⚠ Product ${data.id} not found in database`);
    return;
  }
  
  const product = products[0];
  
  // Update the product in our database to match Stripe
  await ctx.runMutation(internal.webhooks.updateProductFromStripe, {
    productId: product._id,
    name: data.name,
    isActive: data.active,
  });
  
  console.log(`  ✓ Updated product ${product._id} from Stripe`);
}

async function handleProductDeleted(ctx: any, data: any) {
  console.log(`  ℹ Product ${data.id} deleted in Stripe`);
  // You might want to mark it as inactive rather than delete
}

// ========================================
// Price Event Handlers
// ========================================

async function handlePriceCreated(ctx: any, data: any) {
  const { api } = await import("./_generated/api");
  
  const existingPrices = await ctx.runQuery(api.webhooks.findPriceByStripeId, {
    stripePriceId: data.id,
  });
  
  if (existingPrices.length > 0) {
    console.log(`  ℹ Price already exists in database, skipping creation`);
    return;
  }
  
  console.log(`  ℹ New price created in Stripe (manual sync may be needed)`);
}

async function handlePriceUpdated(ctx: any, data: any) {
  const { api } = await import("./_generated/api");
  
  const prices = await ctx.runQuery(api.webhooks.findPriceByStripeId, {
    stripePriceId: data.id,
  });
  
  if (prices.length === 0) {
    console.log(`  ⚠ Price ${data.id} not found in database`);
    return;
  }
  
  const price = prices[0];
  
  // Update the price active status
  await ctx.runMutation(internal.webhooks.updatePriceFromStripe, {
    priceId: price._id,
    isActive: data.active,
  });
  
  console.log(`  ✓ Updated price ${price._id} from Stripe`);
}

// ========================================
// Checkout Event Handlers
// ========================================

async function handleCheckoutCompleted(ctx: any, data: any) {
  // Extract metadata from checkout session
  const metadata = data.metadata;
  
  if (!metadata || !metadata.userId || !metadata.garageId || !metadata.productId || !metadata.priceId) {
    console.log(`  ⚠ Checkout session missing required metadata`);
    return;
  }
  
  try {
    // Create subscription in database
    const now = new Date().toISOString();
    const startDate = new Date();
    const dueDate = new Date(startDate);
    
    // Set due date based on subscription type
    const productName = metadata.productName?.toLowerCase() || "";
    if (productName.includes("annual") || productName.includes("yearly")) {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1); // Default to monthly
    }
    
    await ctx.runMutation(async (ctx: any) => {
      await ctx.db.insert("subscriptions", {
        userId: metadata.userId,
        garageId: metadata.garageId,
        productId: metadata.productId,
        startDate: startDate.toISOString(),
        endDate: null,
        dueDate: dueDate.toISOString(),
        stripeSubscriptionId: data.subscription || data.id, // Use subscription ID or session ID
        seats: parseInt(metadata.seats || "1"),
        createdAt: now,
        updatedAt: now,
      });
    });
    
    console.log(`  ✓ Created subscription for user ${metadata.userId}`);
  } catch (error: any) {
    console.error(`  ⚠ Failed to create subscription: ${error.message}`);
  }
}

// ========================================
// Subscription Event Handlers
// ========================================

async function handleSubscriptionCreated(ctx: any, data: any) {
  console.log(`  ℹ Subscription created: ${data.id}`);
  // This is called when a subscription is created in Stripe
  // If using Stripe subscriptions directly, you might sync here
}

async function handleSubscriptionUpdated(ctx: any, data: any) {
  console.log(`  ℹ Subscription updated: ${data.id}`);
  // Handle subscription updates (e.g., plan changes, quantity updates)
  // Find subscription by stripeSubscriptionId and update
}

async function handleSubscriptionDeleted(ctx: any, data: any) {
  console.log(`  ℹ Subscription deleted: ${data.id}`);
  // Handle subscription cancellation
  // Set endDate on the subscription
}

// ========================================
// Payment Failure Handlers
// ========================================

async function handleInvoicePaymentFailed(ctx: any, data: any) {
  const { api } = await import("./_generated/api");
  
  // Extract invoice details
  const subscriptionId = data.subscription;
  const attemptCount = data.attempt_count;
  const nextPaymentAttempt = data.next_payment_attempt;
  const amountDue = data.amount_due;
  
  console.log(`  → Payment attempt ${attemptCount} failed`);
  console.log(`  → Subscription: ${subscriptionId}`);
  console.log(`  → Amount: $${amountDue / 100}`);
  
  if (nextPaymentAttempt) {
    const nextAttempt = new Date(nextPaymentAttempt * 1000);
    console.log(`  → Next retry: ${nextAttempt.toISOString()}`);
  }
  
  // Find subscription in database
  const subscriptions = await ctx.runQuery(api.webhooks.findSubscriptionByStripeId, {
    stripeSubscriptionId: subscriptionId,
  });
  
  if (subscriptions.length === 0) {
    console.log(`  ⚠ Subscription ${subscriptionId} not found in database`);
    return;
  }
  
  const subscription = subscriptions[0];
  
  // Update subscription based on attempt count
  if (attemptCount >= 3) {
    // After 3 failed attempts, mark as expired
    console.log(`  → Marking subscription as expired after ${attemptCount} failed attempts`);
    await ctx.runAction(internal.webhooks.expireSubscription, {
      subscriptionId: subscription._id,
      reason: `Payment failed after ${attemptCount} attempts`,
    });
  } else {
    console.log(`  → Subscription in grace period (attempt ${attemptCount}/3)`);
    // Subscription remains active during retry period
    // Stripe will automatically retry according to retry schedule
  }
}

async function handleCheckoutPaymentFailed(ctx: any, data: any) {
  console.log(`  → Checkout session payment failed`);
  console.log(`  → Session: ${data.id}`);
  
  // Extract metadata from checkout session
  const metadata = data.metadata;
  
  if (metadata) {
    console.log(`  → User: ${metadata.userId || 'unknown'}`);
    console.log(`  → Product: ${metadata.productName || 'unknown'}`);
    console.log(`  → Customer can retry checkout from your app`);
  }
  
  // Customer will need to initiate a new checkout session to retry
  // No database updates needed since subscription was never created
}

async function handlePaymentIntentFailed(ctx: any, data: any) {
  const failureCode = data.last_payment_error?.code;
  const failureMessage = data.last_payment_error?.message;
  const amount = data.amount;
  
  console.log(`  → Payment intent failed`);
  console.log(`  → Amount: $${amount / 100}`);
  console.log(`  → Failure code: ${failureCode || 'unknown'}`);
  console.log(`  → Message: ${failureMessage || 'No details'}`);
  
  // Common failure codes:
  // - card_declined
  // - insufficient_funds
  // - expired_card
  // - incorrect_cvc
  // - processing_error
  
  // Log for analytics/debugging
  // Customer will receive error during checkout flow
}

// ========================================
// Database Query Helpers
// ========================================

/**
 * Find a product by its Stripe product ID
 */
export const findProductByStripeId = query({
  args: { stripeProductId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("stripeProductId"), args.stripeProductId))
      .collect();
  },
});

/**
 * Find a price by its Stripe price ID
 */
export const findPriceByStripeId = query({
  args: { stripePriceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productPrices")
      .filter((q) => q.eq(q.field("stripePriceId"), args.stripePriceId))
      .collect();
  },
});

/**
 * Find a subscription by its Stripe subscription ID
 */
export const findSubscriptionByStripeId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId))
      .collect();
  },
});

/**
 * Get a subscription by ID (internal only)
 */
export const getSubscription = internalQuery({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.subscriptionId);
  },
});

// ========================================
// Database Update Helpers
// ========================================

/**
 * Update a product from Stripe webhook data
 */
export const updateProductFromStripe = internalAction({
  args: {
    productId: v.id("products"),
    name: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");
    
    await ctx.runMutation(api.admin.updateProduct, {
      productId: args.productId,
      name: args.name,
      isActive: args.isActive,
      // Note: We need to fetch the current values for required fields
      // This is a simplified version - you might want to fetch first
      type: "monthly", // placeholder
      availableSeats: 1, // placeholder
    });
  },
});

/**
 * Update a price from Stripe webhook data
 */
export const updatePriceFromStripe = internalAction({
  args: {
    priceId: v.id("productPrices"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");
    
    await ctx.runMutation(api.admin.updateProductPrice, {
      priceId: args.priceId,
      isActive: args.isActive,
      // Note: Placeholders for required fields
      name: "Updated from Stripe",
      amount: 0,
      isPublic: true,
    });
  },
});

/**
 * Internal mutation to update subscription status to expired
 */
export const updateSubscriptionStatus = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      endDate: args.endDate,
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Expire a subscription due to payment failure
 */
export const expireSubscription = internalAction({
  args: {
    subscriptionId: v.id("subscriptions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.runQuery(internal.webhooks.getSubscription, {
      subscriptionId: args.subscriptionId,
    });
    
    if (!subscription) {
      console.log(`  ⚠ Subscription ${args.subscriptionId} not found`);
      return;
    }
    
    // Only expire if not already expired
    if (subscription.endDate === null) {
      await ctx.runMutation(internal.webhooks.updateSubscriptionStatus, {
        subscriptionId: args.subscriptionId,
        endDate: new Date().toISOString(),
      });
      
      console.log(`  ✓ Subscription expired: ${args.reason}`);
    } else {
      console.log(`  ℹ Subscription already expired`);
    }
  },
});

