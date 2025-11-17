import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * User: Get all users (for impersonation)
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

/**
 * User: Get all garages
 */
export const getAllGarages = query({
  args: {},
  handler: async (ctx) => {
    const garages = await ctx.db.query("garages").collect();
    return garages;
  },
});

/**
 * User: Get public products and prices for a garage
 */
export const getGarageProducts = query({
  args: { garageId: v.id("garages") },
  handler: async (ctx, { garageId }) => {
    // Get all active products for this specific garage
    const products = await ctx.db
      .query("products")
      .filter((q) => 
        q.and(
          q.eq(q.field("garageId"), garageId),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();
    
    // Get public prices for each product
    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const prices = await ctx.db
          .query("productPrices")
          .filter((q) => 
            q.and(
              q.eq(q.field("productId"), product._id),
              q.eq(q.field("isPublic"), true),
              q.eq(q.field("isActive"), true)
            )
          )
          .collect();
        
        return {
          ...product,
          prices,
        };
      })
    );
    
    // Filter out products with no public prices
    return productsWithPrices.filter(p => p.prices.length > 0);
  },
});

/**
 * User: Subscribe to a product
 */
export const subscribe = mutation({
  args: {
    userId: v.id("users"),
    garageId: v.id("garages"),
    productId: v.id("products"),
    seats: v.number(),
  },
  handler: async (ctx, { userId, garageId, productId, seats }) => {
    // Check if user exists
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if garage exists
    const garage = await ctx.db.get(garageId);
    if (!garage) {
      throw new Error("Garage not found");
    }
    
    // Check if product exists and is active
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    if (!product.isActive) {
      throw new Error("Product is not active");
    }
    
    // Check if user already has an active subscription for this garage/product
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("garageId"), garageId),
          q.eq(q.field("productId"), productId),
          q.eq(q.field("endDate"), null)
        )
      )
      .first();
    
    if (existingSubscription) {
      throw new Error("User already has an active subscription for this product at this garage");
    }
    
    // Create subscription
    const now = new Date().toISOString();
    const startDate = new Date();
    
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId,
      garageId,
      productId,
      startDate: startDate.toISOString(),
      endDate: null,
      stripeSubscriptionId: `demo_${Date.now()}`, // Demo stripe ID
      seats,
      createdAt: now,
      updatedAt: now,
    });
    
    return subscriptionId;
  },
});

/**
 * User: Get user's subscriptions
 */
export const getUserSubscriptions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    // Get details for each subscription
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (subscription) => {
        const [garage, product] = await Promise.all([
          ctx.db.get(subscription.garageId),
          ctx.db.get(subscription.productId),
        ]);
        
        return {
          ...subscription,
          garage,
          product,
        };
      })
    );
    
    return subscriptionsWithDetails;
  },
});

/**
 * User: Cancel a subscription
 */
export const cancelSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, { subscriptionId }) => {
    // Get the subscription
    const subscription = await ctx.db.get(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    // Check if subscription is already cancelled
    if (subscription.endDate) {
      throw new Error("Subscription is already cancelled");
    }
    
    // Update the subscription with current date as endDate
    const now = new Date().toISOString();
    await ctx.db.patch(subscriptionId, {
      endDate: now,
      updatedAt: now,
    });
    
    return { success: true };
  },
});

