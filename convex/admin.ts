import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Admin: Get all garages
 */
export const getAllGarages = query({
  args: {},
  handler: async (ctx) => {
    const garages = await ctx.db.query("garages").collect();
    
    // Get subscription counts for each garage
    const garagesWithStats = await Promise.all(
      garages.map(async (garage) => {
        const subscriptions = await ctx.db
          .query("subscriptions")
          .filter((q) => q.eq(q.field("garageId"), garage._id))
          .collect();
        
        const activeSubscriptions = subscriptions.filter(s => s.endDate === null);
        
        return {
          ...garage,
          stats: {
            totalSubscriptions: subscriptions.length,
            activeSubscriptions: activeSubscriptions.length,
          },
        };
      })
    );
    
    return garagesWithStats;
  },
});

/**
 * Admin: Get all users
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    // Get subscription and role counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const subscriptions = await ctx.db
          .query("subscriptions")
          .filter((q) => q.eq(q.field("userId"), user._id))
          .collect();
        
        const userRoles = await ctx.db
          .query("userRoles")
          .filter((q) => q.eq(q.field("userId"), user._id))
          .collect();
        
        return {
          ...user,
          stats: {
            totalSubscriptions: subscriptions.length,
            activeSubscriptions: subscriptions.filter(s => s.endDate === null).length,
            roles: userRoles.length,
          },
        };
      })
    );
    
    return usersWithStats;
  },
});

/**
 * Admin: Get all subscriptions with details
 */
export const getAllSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    
    // Get user, garage, and product details for each subscription
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (subscription) => {
        const user = await ctx.db.get(subscription.userId);
        const garage = await ctx.db.get(subscription.garageId);
        const product = await ctx.db.get(subscription.productId);
        
        return {
          subscription,
          user,
          garage,
          product,
        };
      })
    );
    
    return subscriptionsWithDetails;
  },
});

/**
 * Admin: Get all products with pricing
 */
export const getAllProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    
    // Get prices and subscription counts for each product
    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        const prices = await ctx.db
          .query("productPrices")
          .filter((q) => q.eq(q.field("productId"), product._id))
          .collect();
        
        const subscriptions = await ctx.db
          .query("subscriptions")
          .filter((q) => q.eq(q.field("productId"), product._id))
          .collect();
        
        return {
          product,
          prices,
          stats: {
            totalPrices: prices.length,
            activePrices: prices.filter(p => p.isActive).length,
            totalSubscriptions: subscriptions.length,
            activeSubscriptions: subscriptions.filter(s => s.endDate === null).length,
          },
        };
      })
    );
    
    return productsWithDetails;
  },
});

/**
 * Admin: Get all roles with user counts
 */
export const getAllRoles = query({
  args: {},
  handler: async (ctx) => {
    const roles = await ctx.db.query("roles").collect();
    
    // Get user count for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userRoles = await ctx.db
          .query("userRoles")
          .filter((q) => q.eq(q.field("roleId"), role._id))
          .collect();
        
        // Get unique user IDs
        const uniqueUsers = new Set(userRoles.map(ur => ur.userId));
        
        return {
          ...role,
          stats: {
            totalAssignments: userRoles.length,
            uniqueUsers: uniqueUsers.size,
          },
        };
      })
    );
    
    return rolesWithCounts;
  },
});

/**
 * Admin: Get dashboard overview
 */
export const getDashboardOverview = query({
  args: {},
  handler: async (ctx) => {
    const [garages, users, products, subscriptions, userRoles, productPrices] = await Promise.all([
      ctx.db.query("garages").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("subscriptions").collect(),
      ctx.db.query("userRoles").collect(),
      ctx.db.query("productPrices").collect(),
    ]);
    
    const activeSubscriptions = subscriptions.filter(s => s.endDate === null);
    const expiredSubscriptions = subscriptions.filter(s => s.endDate !== null);
    
    // Get revenue potential (sum of active subscription seats)
    const totalActiveSeats = activeSubscriptions.reduce((sum, s) => sum + s.seats, 0);
    
    return {
      counts: {
        garages: garages.length,
        users: users.length,
        products: products.length,
        subscriptions: subscriptions.length,
        roles: userRoles.length,
        productPrices: productPrices.length,
      },
      businessMetrics: {
        activeSubscriptions: activeSubscriptions.length,
        expiredSubscriptions: expiredSubscriptions.length,
        subscriptionRetentionRate: subscriptions.length > 0
          ? Math.round((activeSubscriptions.length / subscriptions.length) * 100)
          : 0,
        totalSeats: totalActiveSeats,
        averageSeatsPerSubscription: activeSubscriptions.length > 0
          ? Math.round(totalActiveSeats / activeSubscriptions.length)
          : 0,
        activeProducts: products.filter(p => p.isActive).length,
        inactiveProducts: products.filter(p => !p.isActive).length,
      },
    };
  },
});

/**
 * Admin: Get garage relationships (subscriptions, user roles, stats)
 */
export const getGarageRelationships = query({
  args: { garageId: v.id("garages") },
  handler: async (ctx, { garageId }) => {
    const garage = await ctx.db.get(garageId);
    if (!garage) {
      throw new Error("Garage not found");
    }
    
    const [subscriptions, userRoles] = await Promise.all([
      ctx.db
        .query("subscriptions")
        .filter((q) => q.eq(q.field("garageId"), garageId))
        .collect(),
      ctx.db
        .query("userRoles")
        .filter((q) => q.eq(q.field("garageId"), garageId))
        .collect(),
    ]);
    
    const activeSubscriptions = subscriptions.filter(s => s.endDate === null);
    
    return {
      garage,
      userRoles,
      stats: {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        totalStaff: userRoles.length,
      },
    };
  },
});

/**
 * Admin: Get garage subscriptions with details
 */
export const getGarageSubscriptions = query({
  args: { garageId: v.id("garages") },
  handler: async (ctx, { garageId }) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("garageId"), garageId))
      .collect();
    
    const activeSubscriptions = subscriptions.filter(s => s.endDate === null);
    
    return {
      subscriptions: activeSubscriptions,
      stats: {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
      },
    };
  },
});

/**
 * Admin: Update garage details
 */
export const updateGarage = mutation({
  args: {
    garageId: v.id("garages"),
    name: v.string(),
    address1: v.string(),
    address2: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
  },
  handler: async (ctx, { garageId, ...updates }) => {
    const garage = await ctx.db.get(garageId);
    if (!garage) {
      throw new Error("Garage not found");
    }
    
    await ctx.db.patch(garageId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    return garageId;
  },
});

/**
 * Admin: Get products for a garage
 */
export const getGarageProducts = query({
  args: { garageId: v.id("garages") },
  handler: async (ctx, { garageId }) => {
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("garageId"), garageId))
      .collect();
    
    return products;
  },
});

/**
 * Admin: Create a new product
 */
export const createProduct = mutation({
  args: {
    garageId: v.id("garages"),
    name: v.string(),
    isActive: v.boolean(),
    type: v.string(),
    availableSeats: v.number(),
    stripeProductId: v.optional(v.string()),
  },
  handler: async (ctx, { garageId, stripeProductId, ...productData }) => {
    const garage = await ctx.db.get(garageId);
    if (!garage) {
      throw new Error("Garage not found");
    }
    
    const now = new Date().toISOString();
    const productId = await ctx.db.insert("products", {
      ...productData,
      garageId,
      stripeProductId: stripeProductId || null,
      createdAt: now,
      updatedAt: now,
    });
    
    return productId;
  },
});

/**
 * Admin: Update a product
 */
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    isActive: v.boolean(),
    type: v.string(),
    availableSeats: v.number(),
    stripeProductId: v.optional(v.string()),
  },
  handler: async (ctx, { productId, stripeProductId, ...updates }) => {
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    await ctx.db.patch(productId, {
      ...updates,
      stripeProductId: stripeProductId || null,
      updatedAt: new Date().toISOString(),
    });
    
    return productId;
  },
});

/**
 * Admin: Delete a product
 */
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    // Check if product has any associated subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("productId"), productId))
      .collect();
    
    if (subscriptions.length > 0) {
      throw new Error("Cannot delete product with active subscriptions");
    }
    
    // Check if product has any associated prices
    const prices = await ctx.db
      .query("productPrices")
      .filter((q) => q.eq(q.field("productId"), productId))
      .collect();
    
    // Delete associated prices first
    for (const price of prices) {
      await ctx.db.delete(price._id);
    }
    
    await ctx.db.delete(productId);
    return productId;
  },
});

/**
 * Admin: Get product prices for a product
 */
export const getProductPrices = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const prices = await ctx.db
      .query("productPrices")
      .filter((q) => q.eq(q.field("productId"), productId))
      .collect();
    
    return prices;
  },
});

/**
 * Admin: Create a new product price
 */
export const createProductPrice = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    amount: v.number(),
    isActive: v.boolean(),
    isPublic: v.boolean(),
    stripePriceId: v.optional(v.string()),
  },
  handler: async (ctx, { productId, stripePriceId, ...priceData }) => {
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    const now = new Date().toISOString();
    const priceId = await ctx.db.insert("productPrices", {
      ...priceData,
      productId,
      stripePriceId: stripePriceId || null,
      createdAt: now,
      updatedAt: now,
    });
    
    return priceId;
  },
});

/**
 * Admin: Update a product price
 */
export const updateProductPrice = mutation({
  args: {
    priceId: v.id("productPrices"),
    name: v.string(),
    amount: v.number(),
    isActive: v.boolean(),
    isPublic: v.boolean(),
    stripePriceId: v.optional(v.string()),
  },
  handler: async (ctx, { priceId, stripePriceId, ...updates }) => {
    const price = await ctx.db.get(priceId);
    if (!price) {
      throw new Error("Price not found");
    }
    
    await ctx.db.patch(priceId, {
      ...updates,
      stripePriceId: stripePriceId || null,
      updatedAt: new Date().toISOString(),
    });
    
    return priceId;
  },
});

/**
 * Admin: Delete a product price
 */
export const deleteProductPrice = mutation({
  args: { priceId: v.id("productPrices") },
  handler: async (ctx, { priceId }) => {
    const price = await ctx.db.get(priceId);
    if (!price) {
      throw new Error("Price not found");
    }
    
    await ctx.db.delete(priceId);
    return priceId;
  },
});

