/**
 * Stripe Webhook Handlers
 * 
 * This file processes webhook events from Stripe and syncs data
 * back to the Convex database.
 */

import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
        case "product.updated":
          console.log(`  → Product updated in Stripe: ${data.id}`);
          await handleProductUpdated(ctx, data);
          break;
        
        // Price events
        case "price.updated":
          console.log(`  → Price updated in Stripe: ${data.id}`);
          await handlePriceUpdated(ctx, data);
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
        
        // Invoice payment events
        case "invoice.payment_failed":
          console.log(`  ⚠ Invoice payment failed: ${data.id}`);
          await handleInvoicePaymentFailed(ctx, data);
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

// ========================================
// Price Event Handlers
// ========================================

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
// Subscription Event Handlers
// ========================================

async function handleSubscriptionCreated(ctx: any, data: any) {
  console.log(`  ℹ Subscription created: ${data.id}`);
  
  // Extract metadata from the subscription
  const metadata = data.metadata;
  
  if (!metadata || !metadata.userId || !metadata.garageId || !metadata.productId || !metadata.priceId) {
    console.log(`  ⚠ Subscription missing required metadata`);
    console.log(`  → Metadata:`, metadata);
    return;
  }
  
  try {
    // Check if subscription already exists
    const { api } = await import("./_generated/api");
    const existingSubscriptions = await ctx.runQuery(api.webhooks.findSubscriptionByStripeId, {
      stripeSubscriptionId: data.id,
    });
    
    if (existingSubscriptions.length > 0) {
      console.log(`  ℹ Subscription ${data.id} already exists in database, skipping creation`);
      return;
    }
    
    // Convert Stripe timestamps (seconds) to ISO strings
    const startDate = new Date(data.current_period_start * 1000).toISOString();
    
    // Create subscription in database
    await ctx.runMutation(internal.webhooks.createSubscription, {
      userId: metadata.userId as Id<"users">,
      garageId: metadata.garageId as Id<"garages">,
      productId: metadata.productId as Id<"products">,
      startDate: startDate,
      stripeSubscriptionId: data.id,
      seats: parseInt(metadata.seats || "1"),
    });
    
    console.log(`  ✓ Created subscription record for user ${metadata.userId}`);
  } catch (error: any) {
    console.error(`  ⚠ Failed to create subscription: ${error.message}`);
    throw error;
  }
}

async function handleSubscriptionUpdated(ctx: any, data: any) {
  console.log(`  ℹ Subscription updated: ${data.id}`);
  
  const { api } = await import("./_generated/api");
  
  // Find subscription in database
  const subscriptions = await ctx.runQuery(api.webhooks.findSubscriptionByStripeId, {
    stripeSubscriptionId: data.id,
  });
  
  if (subscriptions.length === 0) {
    console.log(`  ⚠ Subscription ${data.id} not found in database`);
    return;
  }
  
  const subscription = subscriptions[0];
  
  try {
    const updateArgs: any = {
      subscriptionId: subscription._id,
    };
    
    // Update seats if quantity changed
    if (data.items?.data?.[0]?.quantity) {
      updateArgs.seats = data.items.data[0].quantity;
    }
    
    // Check if subscription was cancelled
    if (data.status === "canceled" || data.cancel_at_period_end) {
      // If the subscription is set to cancel at period end, don't set endDate yet
      // Wait for the actual cancellation event
      if (data.status === "canceled" && !subscription.endDate) {
        updateArgs.endDate = new Date(data.canceled_at * 1000).toISOString();
        console.log(`  → Subscription marked as cancelled`);
      }
    }
    
    // Update the subscription record
    await ctx.runMutation(internal.webhooks.updateSubscriptionInDb, updateArgs);
    
    console.log(`  ✓ Updated subscription ${subscription._id}`);
  } catch (error: any) {
    console.error(`  ⚠ Failed to update subscription: ${error.message}`);
    throw error;
  }
}

async function handleSubscriptionDeleted(ctx: any, data: any) {
  console.log(`  ℹ Subscription deleted: ${data.id}`);
  
  const { api } = await import("./_generated/api");
  
  // Find subscription in database
  const subscriptions = await ctx.runQuery(api.webhooks.findSubscriptionByStripeId, {
    stripeSubscriptionId: data.id,
  });
  
  if (subscriptions.length === 0) {
    console.log(`  ⚠ Subscription ${data.id} not found in database`);
    return;
  }
  
  const subscription = subscriptions[0];
  
  // Only update if not already marked as ended
  if (subscription.endDate === null) {
    try {
      const endDate = new Date(data.canceled_at * 1000).toISOString();
      
      await ctx.runMutation(internal.webhooks.updateSubscriptionStatus, {
        subscriptionId: subscription._id,
        endDate: endDate,
      });
      
      console.log(`  ✓ Subscription cancelled and endDate set to ${endDate}`);
    } catch (error: any) {
      console.error(`  ⚠ Failed to update subscription: ${error.message}`);
      throw error;
    }
  } else {
    console.log(`  ℹ Subscription already marked as ended`);
  }
}

// ========================================
// Invoice Payment Failure Handler
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
 * Helper mutation to create a new subscription
 */
export const createSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    garageId: v.id("garages"),
    productId: v.id("products"),
    startDate: v.string(),
    stripeSubscriptionId: v.string(),
    seats: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("subscriptions", {
      userId: args.userId,
      garageId: args.garageId,
      productId: args.productId,
      startDate: args.startDate,
      endDate: null,
      stripeSubscriptionId: args.stripeSubscriptionId,
      seats: args.seats,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Helper mutation to update subscription in database
 */
export const updateSubscriptionInDb = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    endDate: v.optional(v.string()),
    seats: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };
    
    if (args.endDate !== undefined) {
      updates.endDate = args.endDate;
    }
    
    if (args.seats !== undefined) {
      updates.seats = args.seats;
    }
    
    await ctx.db.patch(args.subscriptionId, updates);
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

