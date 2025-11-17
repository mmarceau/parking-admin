import { query, mutation, internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

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
 * Admin: Get garages by IDs with stats
 * If returnAll is true, returns all garages (for SuperAdmin)
 */
export const getGaragesByIds = query({
  args: { 
    garageIds: v.array(v.id("garages")),
    returnAll: v.optional(v.boolean()),
  },
  handler: async (ctx, { garageIds, returnAll }) => {
    // If returnAll is true (SuperAdmin), fetch all garages
    let garages;
    if (returnAll) {
      garages = await ctx.db.query("garages").collect();
    } else {
      // Fetch all specified garages
      const fetchedGarages = await Promise.all(
        garageIds.map(async (garageId) => {
          return await ctx.db.get(garageId);
        })
      );
      // Filter out null values (in case any garage was deleted)
      garages = fetchedGarages.filter((g) => g !== null);
    }
    
    // Get subscription counts for each garage
    const garagesWithStats = await Promise.all(
      garages.map(async (garage) => {
        const subscriptions = await ctx.db
          .query("subscriptions")
          .filter((q) => q.eq(q.field("garageId"), garage!._id))
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
        
        // Get full role details with garage names
        const rolesWithDetails = await Promise.all(
          userRoles.map(async (userRole) => {
            const role = await ctx.db.get(userRole.roleId);
            // SuperAdmin roles have null garageId
            const garage = userRole.garageId ? await ctx.db.get(userRole.garageId) : null;
            return {
              roleName: role?.name || "Unknown",
              garageName: garage?.name || "System-wide",
            };
          })
        );
        
        // Get unique garages from both roles and subscriptions
        // Filter out null garageIds (SuperAdmin roles)
        const garageIdsFromRoles = userRoles
          .filter(ur => ur.garageId !== null)
          .map(ur => ur.garageId!);
        const garageIdsFromSubs = subscriptions.map(sub => sub.garageId);
        const allGarageIds = [...garageIdsFromRoles, ...garageIdsFromSubs];
        const uniqueGarageIds = Array.from(new Set(allGarageIds.map(id => id.toString()))).map(idStr => {
          const found = allGarageIds.find(id => id.toString() === idStr);
          return found!;
        });
        
        const garages = await Promise.all(
          uniqueGarageIds.map(async (garageId) => {
            const garage = await ctx.db.get(garageId);
            if (!garage) return null;
            return { _id: garage._id, name: garage.name };
          })
        );
        
        const validGarages = garages.filter((g): g is { _id: any; name: string } => g !== null);
        
        // Check if user is SuperAdmin
        const isSuperAdmin = rolesWithDetails.some(r => r.roleName === "SuperAdmin");
        
        return {
          ...user,
          stats: {
            totalSubscriptions: subscriptions.length,
            activeSubscriptions: subscriptions.filter(s => s.endDate === null).length,
            roles: userRoles.length,
          },
          roles: rolesWithDetails,
          garages: validGarages,
          isSuperAdmin,
        };
      })
    );
    
    return usersWithStats;
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
    
    // Create product in database first
    const productId = await ctx.db.insert("products", {
      ...productData,
      garageId,
      stripeProductId: stripeProductId || null,
      createdAt: now,
      updatedAt: now,
    });
    
    // If no Stripe product ID provided, create one in Stripe
    if (!stripeProductId) {
      try {
        // Schedule Stripe product creation
        await ctx.scheduler.runAfter(0, internal.admin.createStripeProductInternal, {
          productId,
          name: productData.name,
          type: productData.type,
          garageId,
          garageName: garage.name,
        });
      } catch (error) {
        console.error("Failed to schedule Stripe product creation:", error);
        // Don't throw error - allow product creation to succeed even if Stripe fails
      }
    }
    
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
    
    // Update product in database
    await ctx.db.patch(productId, {
      ...updates,
      stripeProductId: stripeProductId || product.stripeProductId,
      updatedAt: new Date().toISOString(),
    });
    
    // If product has a Stripe ID, update it in Stripe
    const finalStripeProductId = stripeProductId || product.stripeProductId;
    if (finalStripeProductId) {
      try {
        await ctx.scheduler.runAfter(0, internal.admin.updateStripeProductInternal, {
          stripeProductId: finalStripeProductId,
          name: updates.name,
          isActive: updates.isActive,
        });
      } catch (error) {
        console.error("Failed to schedule Stripe product update:", error);
      }
    }
    
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
    
    // If no Stripe price ID provided and product has a Stripe ID, create price in Stripe
    if (!stripePriceId && product.stripeProductId) {
      try {
        await ctx.scheduler.runAfter(0, internal.admin.createStripePriceInternal, {
          priceId,
          stripeProductId: product.stripeProductId,
          name: priceData.name,
          amount: priceData.amount,
          productType: product.type,
        });
      } catch (error) {
        console.error("Failed to schedule Stripe price creation:", error);
      }
    }
    
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
    
    // Update price in database
    await ctx.db.patch(priceId, {
      ...updates,
      stripePriceId: stripePriceId || price.stripePriceId,
      updatedAt: new Date().toISOString(),
    });
    
    // If price has a Stripe ID, update it in Stripe
    // Note: Stripe only allows updating the active status, not the amount
    const finalStripePriceId = stripePriceId || price.stripePriceId;
    if (finalStripePriceId) {
      try {
        await ctx.scheduler.runAfter(0, internal.admin.updateStripePriceInternal, {
          stripePriceId: finalStripePriceId,
          isActive: updates.isActive,
        });
      } catch (error) {
        console.error("Failed to schedule Stripe price update:", error);
      }
    }
    
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

/**
 * Admin: Get subscriptions for a garage with full details
 */
export const getGarageSubscriptionsWithDetails = query({
  args: { garageId: v.id("garages") },
  handler: async (ctx, { garageId }) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("garageId"), garageId))
      .collect();
    
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (subscription) => {
        const [user, product] = await Promise.all([
          ctx.db.get(subscription.userId),
          ctx.db.get(subscription.productId),
        ]);
        
        return {
          ...subscription,
          user,
          product,
        };
      })
    );
    
    return subscriptionsWithDetails;
  },
});

/**
 * Admin: Get user subscriptions with full details across all garages
 */
export const getUserSubscriptionsWithDetails = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (subscription) => {
        const [user, product, garage] = await Promise.all([
          ctx.db.get(subscription.userId),
          ctx.db.get(subscription.productId),
          ctx.db.get(subscription.garageId),
        ]);
        
        return {
          ...subscription,
          user,
          product,
          garage,
        };
      })
    );
    
    return subscriptionsWithDetails;
  },
});

/**
 * Admin: Create a new subscription
 */
export const createSubscription = mutation({
  args: {
    userId: v.id("users"),
    garageId: v.id("garages"),
    productId: v.id("products"),
    startDate: v.string(),
    endDate: v.union(v.string(), v.null()),
    dueDate: v.string(),
    stripeSubscriptionId: v.string(),
    seats: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Validate garage exists
    const garage = await ctx.db.get(args.garageId);
    if (!garage) {
      throw new Error("Garage not found");
    }
    
    // Validate product exists
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    const now = new Date().toISOString();
    const subscriptionId = await ctx.db.insert("subscriptions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    
    return subscriptionId;
  },
});

/**
 * Admin: Update a subscription
 */
export const updateSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    startDate: v.string(),
    endDate: v.union(v.string(), v.null()),
    dueDate: v.string(),
    stripeSubscriptionId: v.string(),
    seats: v.number(),
  },
  handler: async (ctx, { subscriptionId, ...updates }) => {
    const subscription = await ctx.db.get(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    await ctx.db.patch(subscriptionId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    return subscriptionId;
  },
});

/**
 * Admin: Delete a subscription
 */
export const deleteSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const subscription = await ctx.db.get(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    await ctx.db.delete(subscriptionId);
    return subscriptionId;
  },
});

/**
 * Admin: Get a single subscription by ID
 */
export const getSubscriptionById = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    return await ctx.db.get(subscriptionId);
  },
});

/**
 * Admin: Update subscription end date (internal helper for cancellation)
 */
export const updateSubscriptionEndDate = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    endDate: v.string(),
  },
  handler: async (ctx, { subscriptionId, endDate }) => {
    const subscription = await ctx.db.get(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    await ctx.db.patch(subscriptionId, {
      endDate,
      updatedAt: new Date().toISOString(),
    });
    
    return subscriptionId;
  },
});

/**
 * Admin: Cancel a subscription (cancels in Stripe first, then updates database)
 */
export const cancelSubscription = action({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    // Get subscription from database
    const subscription = await ctx.runQuery(api.admin.getSubscriptionById, { subscriptionId });
    
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    // If subscription has a Stripe ID, cancel it in Stripe first
    if (subscription.stripeSubscriptionId) {
      const result = await ctx.runAction(api.stripe.cancelStripeSubscription, {
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      });
      
      if (!result.success) {
        throw new Error(`Failed to cancel subscription in Stripe: ${result.error}`);
      }
    }
    
    // Only update database after successful Stripe cancellation
    await ctx.runMutation(api.admin.updateSubscriptionEndDate, {
      subscriptionId,
      endDate: new Date().toISOString(),
    });
    
    return subscriptionId;
  },
});

// ========================================
// STRIPE INTEGRATION INTERNAL ACTIONS
// ========================================

/**
 * Internal action: Create a product in Stripe and update database
 */
export const createStripeProductInternal = internalAction({
  args: {
    productId: v.id("products"),
    name: v.string(),
    type: v.string(),
    garageId: v.id("garages"),
    garageName: v.string(),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");
    
    // Call Stripe action to create product
    const result = await ctx.runAction(api.stripe.createStripeProduct, {
      name: args.name,
      description: `${args.type} pass for ${args.garageName}`,
      metadata: {
        productId: args.productId,
        garageId: args.garageId,
        type: args.type,
      },
    });
    
    if (result.success && result.stripeProductId) {
      // Update the product with the Stripe product ID
      await ctx.runMutation(api.admin.patchProductStripeId, {
        productId: args.productId,
        stripeProductId: result.stripeProductId,
      });
    } else {
      console.error("Failed to create Stripe product:", result.error);
    }
  },
});

/**
 * Internal action: Update a product in Stripe
 */
export const updateStripeProductInternal = internalAction({
  args: {
    stripeProductId: v.string(),
    name: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");
    
    // Call Stripe action to update product
    const result = await ctx.runAction(api.stripe.updateStripeProduct, {
      stripeProductId: args.stripeProductId,
      name: args.name,
      active: args.isActive,
    });
    
    if (!result.success) {
      console.error("Failed to update Stripe product:", result.error);
    }
  },
});

/**
 * Internal action: Create a price in Stripe and update database
 */
export const createStripePriceInternal = internalAction({
  args: {
    priceId: v.id("productPrices"),
    stripeProductId: v.string(),
    name: v.string(),
    amount: v.number(),
    productType: v.string(),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");
    
    // Determine if this is a recurring price based on product type
    const recurring = args.productType === "monthly" || args.productType === "annual"
      ? {
          interval: args.productType === "monthly" ? "month" : "year",
          interval_count: 1,
        }
      : undefined;
    
    // Call Stripe action to create price
    const result = await ctx.runAction(api.stripe.createStripePrice, {
      stripeProductId: args.stripeProductId,
      unitAmount: args.amount,
      currency: "usd",
      recurring,
      metadata: {
        priceId: args.priceId,
        name: args.name,
      },
    });
    
    if (result.success && result.stripePriceId) {
      // Update the price with the Stripe price ID
      await ctx.runMutation(api.admin.patchProductPriceStripeId, {
        priceId: args.priceId,
        stripePriceId: result.stripePriceId,
      });
    } else {
      console.error("Failed to create Stripe price:", result.error);
    }
  },
});

/**
 * Internal action: Update a price in Stripe
 */
export const updateStripePriceInternal = internalAction({
  args: {
    stripePriceId: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");
    
    // Call Stripe action to update price
    const result = await ctx.runAction(api.stripe.updateStripePrice, {
      stripePriceId: args.stripePriceId,
      active: args.isActive,
    });
    
    if (!result.success) {
      console.error("Failed to update Stripe price:", result.error);
    }
  },
});

/**
 * Internal helper: Patch product with Stripe product ID
 */
export const patchProductStripeId = mutation({
  args: {
    productId: v.id("products"),
    stripeProductId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      stripeProductId: args.stripeProductId,
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Internal helper: Patch product price with Stripe price ID
 */
export const patchProductPriceStripeId = mutation({
  args: {
    priceId: v.id("productPrices"),
    stripePriceId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.priceId, {
      stripePriceId: args.stripePriceId,
      updatedAt: new Date().toISOString(),
    });
  },
});
