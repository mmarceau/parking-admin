/**
 * Stripe Checkout Integration
 * 
 * This file handles creating Stripe Checkout Sessions for subscription purchases.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

/**
 * Get Stripe client instance
 */
function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Please add it to your Convex environment variables."
    );
  }
  
  return new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
  });
}

/**
 * Create a Stripe Checkout Session for subscription purchase
 * 
 * This action creates a checkout session and returns the session ID,
 * which the frontend uses to redirect to Stripe's hosted checkout page.
 */
export const createCheckoutSession = action({
  args: {
    priceId: v.id("productPrices"),
    productId: v.id("products"),
    userId: v.id("users"),
    garageId: v.id("garages"),
    quantity: v.number(), // Number of seats
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");
    
    // Fetch the price and product details using internal queries
    const price: any = await ctx.runQuery(api.checkout.getPrice, { priceId: args.priceId });
    const product: any = await ctx.runQuery(api.checkout.getProduct, { productId: args.productId });
    const user: any = await ctx.runQuery(api.checkout.getUser, { userId: args.userId });
    const garage: any = await ctx.runQuery(api.checkout.getGarage, { garageId: args.garageId });
    
    if (!price || !product || !user || !garage) {
      throw new Error("Invalid price, product, user, or garage");
    }
    
    if (!price.stripePriceId) {
      throw new Error("This price doesn't have a Stripe price ID. Please contact support.");
    }
    
    const stripe = getStripeClient();
    
    try {
      // Determine the success and cancel URLs
      // These will be your app's URLs that Stripe redirects to after payment
      // IMPORTANT: FRONTEND_URL should point to your React app, not Convex backend
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const successUrl = `${baseUrl}/user?userId=${args.userId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/user?userId=${args.userId}&checkout=cancelled`;
      
      console.log(`✓ Checkout URLs - Success: ${successUrl}, Cancel: ${cancelUrl}`);
      
      // Create the checkout session
      const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
        mode: product.type === "monthly" || product.type === "annual" || product.type === "weekly" ? "subscription" : "payment",
        line_items: [
          {
            price: price.stripePriceId,
            quantity: args.quantity,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email || undefined,
        client_reference_id: args.userId, // Store user ID for webhook processing
        metadata: {
          userId: args.userId,
          garageId: args.garageId,
          productId: args.productId,
          priceId: args.priceId,
          seats: args.quantity.toString(),
          garageName: garage.name,
          productName: product.name,
        },
        // Enable automatic tax calculation if configured
        // automatic_tax: { enabled: true },
      });
      
      console.log(`✓ Created checkout session: ${session.id} for user ${args.userId}`);
      
      return {
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
      };
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      return {
        success: false,
        error: error.message || "Failed to create checkout session",
      };
    }
  },
});

/**
 * Retrieve a checkout session
 * 
 * Used to verify payment status after redirect from Stripe
 */
export const getCheckoutSession = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripeClient();
    
    try {
      const session = await stripe.checkout.sessions.retrieve(args.sessionId);
      
      return {
        success: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          customer_email: session.customer_email,
          amount_total: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
        },
      };
    } catch (error: any) {
      console.error("Failed to retrieve checkout session:", error);
      return {
        success: false,
        error: error.message || "Failed to retrieve checkout session",
      };
    }
  },
});

// ========================================
// Helper Queries (for internal use)
// ========================================

import { query } from "./_generated/server";

export const getPrice = query({
  args: { priceId: v.id("productPrices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.priceId);
  },
});

export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getGarage = query({
  args: { garageId: v.id("garages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.garageId);
  },
});

