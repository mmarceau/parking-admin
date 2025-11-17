import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Convex Schema Definition
// Note: Convex automatically adds _id and _creationTime fields to all documents

export default defineSchema({
  garages: defineTable({
    name: v.string(),
    address1: v.string(),
    address2: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  // Products (i.e. PassOffering)
  products: defineTable({
    name: v.string(),
    isActive: v.boolean(),
    type: v.string(),
    availableSeats: v.number(),
    stripeProductId: v.union(v.string(), v.null()),
    garageId: v.id("garages"),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  // ProductPrices (i.e. PassOfferingPrice)
  productPrices: defineTable({
    productId: v.id("products"),
    isActive: v.boolean(),
    name: v.string(),
    amount: v.number(),
    stripePriceId: v.union(v.string(), v.null()),
    isPublic: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  roles: defineTable({
    name: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  subscriptions: defineTable({
    userId: v.id("users"),
    garageId: v.id("garages"),
    productId: v.id("products"),
    startDate: v.string(),
    endDate: v.union(v.string(), v.null()),
    stripeSubscriptionId: v.string(),
    seats: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  users: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.union(v.string(), v.null()),
    phone: v.union(v.string(), v.null()),
    stripeUserId: v.union(v.string(), v.null()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  userRoles: defineTable({
    userId: v.id("users"),
    garageId: v.union(v.id("garages"), v.null()),
    roleId: v.id("roles"),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),
});
