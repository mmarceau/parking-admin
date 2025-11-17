/**
 * Convex HTTP Router
 * 
 * This file defines HTTP endpoints that are publicly accessible.
 * These endpoints are served at: https://[your-deployment].convex.cloud/[path]
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

/**
 * Stripe Webhook Endpoint
 * 
 * This endpoint receives webhook events from Stripe and processes them.
 * 
 * Public URL: https://[your-deployment].convex.cloud/stripe/webhook
 * 
 * Configure this URL in your Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 */
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get the Stripe signature from headers for verification
    const signature = request.headers.get("stripe-signature");
    
    if (!signature) {
      console.error("No stripe-signature header found");
      return new Response("Missing signature", { status: 400 });
    }

    // Get the raw body (needed for signature verification)
    const body = await request.text();
    
    // Verify webhook secret is configured
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET environment variable not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Verify and construct the Stripe event
    let event: Stripe.Event;
    
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-10-29.clover",
      });
      
      // Verify the webhook signature to ensure it came from Stripe
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      
      console.log(`✓ Webhook verified: ${event.type} (${event.id})`);
    } catch (err: any) {
      console.error(`⚠ Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event asynchronously
    try {
      // Schedule the webhook handler to process the event
      await ctx.runAction(internal.webhooks.handleStripeWebhook, {
        eventType: event.type,
        eventData: JSON.stringify(event.data.object),
        eventId: event.id,
      });
      
      console.log(`→ Scheduled handler for: ${event.type}`);
    } catch (err: any) {
      console.error(`⚠ Error scheduling webhook handler: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 500 });
    }

    // Return success to Stripe immediately
    return new Response(
      JSON.stringify({ received: true, eventType: event.type }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

/**
 * Health check endpoint
 * 
 * Public URL: https://[your-deployment].convex.cloud/health
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        service: "convex-stripe-integration"
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;

