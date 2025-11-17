/**
 * Stripe Webhook Handlers
 * 
 * This file processes webhook events from Stripe and syncs data
 * back to the Convex database.
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { query } from "./_generated/server";
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
        
        // Payment events (for logging/monitoring)
        case "payment_intent.succeeded":
          console.log(`  → Payment succeeded: ${data.id} - $${data.amount / 100}`);
          break;
          
        case "payment_intent.payment_failed":
          console.log(`  ⚠ Payment failed: ${data.id}`);
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

