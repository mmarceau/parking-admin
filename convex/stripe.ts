/**
 * Stripe Integration for Convex
 * 
 * This file contains Convex actions that interact with the Stripe API
 * to manage products and prices.
 * 
 * Actions are used instead of mutations because they can make external API calls.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

/**
 * Get Stripe client instance
 * Note: The STRIPE_SECRET_KEY must be set in your Convex environment variables
 */
function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Please add it to your Convex environment variables. " +
      "See STRIPE_SETUP.md for instructions."
    );
  }
  
  return new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
  });
}

/**
 * Create a product in Stripe
 */
export const createStripeProduct = action({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const product = await stripe.products.create({
        name: args.name,
        description: args.description,
        metadata: args.metadata || {},
      });
      
      return {
        success: true,
        stripeProductId: product.id,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
        },
      };
    } catch (error: any) {
      console.error("Stripe product creation failed:", error);
      return {
        success: false,
        error: error.message || "Failed to create Stripe product",
      };
    }
  },
});

/**
 * Update a product in Stripe
 */
export const updateStripeProduct = action({
  args: {
    stripeProductId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const { stripeProductId, ...updates } = args;
      const product = await stripe.products.update(stripeProductId, updates);
      
      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
        },
      };
    } catch (error: any) {
      console.error("Stripe product update failed:", error);
      return {
        success: false,
        error: error.message || "Failed to update Stripe product",
      };
    }
  },
});

/**
 * Create a price in Stripe
 */
export const createStripePrice = action({
  args: {
    stripeProductId: v.string(),
    unitAmount: v.number(),
    currency: v.optional(v.string()),
    recurring: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const price = await stripe.prices.create({
        product: args.stripeProductId,
        unit_amount: args.unitAmount,
        currency: args.currency || "usd",
        recurring: args.recurring,
        metadata: args.metadata || {},
      });
      
      return {
        success: true,
        stripePriceId: price.id,
        price: {
          id: price.id,
          product: price.product,
          unit_amount: price.unit_amount,
          currency: price.currency,
          active: price.active,
          recurring: price.recurring,
        },
      };
    } catch (error: any) {
      console.error("Stripe price creation failed:", error);
      return {
        success: false,
        error: error.message || "Failed to create Stripe price",
      };
    }
  },
});

/**
 * Update a price in Stripe
 * Note: Most price properties cannot be changed after creation.
 * You can only update active status and metadata.
 */
export const updateStripePrice = action({
  args: {
    stripePriceId: v.string(),
    active: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const { stripePriceId, ...updates } = args;
      const price = await stripe.prices.update(stripePriceId, updates);
      
      return {
        success: true,
        price: {
          id: price.id,
          product: price.product,
          unit_amount: price.unit_amount,
          currency: price.currency,
          active: price.active,
          recurring: price.recurring,
        },
      };
    } catch (error: any) {
      console.error("Stripe price update failed:", error);
      return {
        success: false,
        error: error.message || "Failed to update Stripe price",
      };
    }
  },
});

/**
 * Archive (soft delete) a product in Stripe
 */
export const archiveStripeProduct = action({
  args: {
    stripeProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const product = await stripe.products.update(args.stripeProductId, {
        active: false,
      });
      
      return {
        success: true,
        product: {
          id: product.id,
          active: product.active,
        },
      };
    } catch (error: any) {
      console.error("Stripe product archive failed:", error);
      return {
        success: false,
        error: error.message || "Failed to archive Stripe product",
      };
    }
  },
});

/**
 * Retrieve a product from Stripe
 */
export const getStripeProduct = action({
  args: {
    stripeProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const product = await stripe.products.retrieve(args.stripeProductId);
      
      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
        },
      };
    } catch (error: any) {
      console.error("Stripe product retrieval failed:", error);
      return {
        success: false,
        error: error.message || "Failed to retrieve Stripe product",
      };
    }
  },
});

/**
 * Retrieve a price from Stripe
 */
export const getStripePrice = action({
  args: {
    stripePriceId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const price = await stripe.prices.retrieve(args.stripePriceId);
      
      return {
        success: true,
        price: {
          id: price.id,
          product: price.product,
          unit_amount: price.unit_amount,
          currency: price.currency,
          active: price.active,
          recurring: price.recurring,
          metadata: price.metadata,
        },
      };
    } catch (error: any) {
      console.error("Stripe price retrieval failed:", error);
      return {
        success: false,
        error: error.message || "Failed to retrieve Stripe price",
      };
    }
  },
});

