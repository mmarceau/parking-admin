import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { faker } from "@faker-js/faker";
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
      "Run: npx convex env set STRIPE_SECRET_KEY sk_test_..."
    );
  }
  
  return new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
  });
}

/**
 * Seed Users
 * Creates test users with realistic data
 */
export const seedUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = [];
    const now = new Date().toISOString();

    for (let i = 0; i < 15; i++) {
      const userId = await ctx.db.insert("users", {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        phone: faker.phone.number(),
        stripeUserId: faker.datatype.boolean(0.7) ? `cus_${faker.string.alphanumeric(14)}` : null,
        createdAt: now,
        updatedAt: now,
      });
      users.push(userId);
    }

    return { count: users.length, ids: users };
  },
});

/**
 * Seed Garages
 * Creates test garages with realistic address data
 */
export const seedGarages = mutation({
  args: {},
  handler: async (ctx) => {
    const garages = [];
    const now = new Date().toISOString();

    const garageNames = [
      "Downtown Parking Center",
      "City Square Garage",
      "Waterfront Parking",
      "Airport Long-Term Parking",
      "Medical Center Garage",
      "Shopping District Parking",
      "Convention Center Garage",
    ];

    for (let i = 0; i < garageNames.length; i++) {
      const garageId = await ctx.db.insert("garages", {
        name: garageNames[i],
        address1: faker.location.streetAddress(),
        address2: faker.helpers.arrayElement([
          faker.location.secondaryAddress(),
          "",
          "Suite " + faker.number.int({ min: 100, max: 999 }),
        ]),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        postalCode: faker.location.zipCode(),
        createdAt: now,
        updatedAt: now,
      });
      garages.push(garageId);
    }

    return { count: garages.length, ids: garages };
  },
});

/**
 * Seed Products (PassOfferings)
 * Creates test products for parking passes linked to garages
 */
export const seedProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const products = [];
    const now = new Date().toISOString();

    // Get all garages first
    const garages = await ctx.db.query("garages").collect();
    
    if (garages.length === 0) {
      throw new Error("No garages found. Please seed garages first.");
    }

    const productConfigs = [
      { name: "Monthly Unlimited", type: "monthly", seats: 1 },
      { name: "Weekly Pass", type: "weekly", seats: 1 },
      { name: "Daily Pass", type: "daily", seats: 1 },
      { name: "Annual Unlimited", type: "annual", seats: 1 },
      { name: "Monthly Reserved", type: "monthly", seats: 1 },
      { name: "Carpool Pass (4 seats)", type: "monthly", seats: 4 },
      { name: "Weekend Pass", type: "weekend", seats: 1 },
    ];

    // Create products for each garage
    for (let garage of garages) {
      // Each garage gets 3-5 random products
      const productsToCreate = faker.number.int({ min: 3, max: 5 });
      const selectedConfigs = faker.helpers.shuffle(productConfigs).slice(0, productsToCreate);
      
      for (let config of selectedConfigs) {
        const isActive = faker.datatype.boolean(0.9); // 90% active
        const productId = await ctx.db.insert("products", {
          name: config.name,
          isActive: isActive,
          type: config.type,
          availableSeats: config.seats,
          stripeProductId: isActive ? `prod_${faker.string.alphanumeric(14)}` : null,
          garageId: garage._id,
          createdAt: now,
          updatedAt: now,
        });
        products.push(productId);
      }
    }

    return { count: products.length, ids: products };
  },
});

/**
 * Seed Roles
 * Creates test roles for the system
 */
export const seedRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const roles = [];
    const now = new Date().toISOString();

    const roleNames = [
      "Admin",
      "Manager",
      "Attendant",
      "Customer",
      "Supervisor",
      "Billing",
      "Support",
    ];

    for (let roleName of roleNames) {
      const roleId = await ctx.db.insert("roles", {
        name: roleName,
        createdAt: now,
        updatedAt: now,
      });
      roles.push(roleId);
    }

    return { count: roles.length, ids: roles };
  },
});

/**
 * Seed Product Prices (PassOfferingPrices)
 * Creates pricing tiers for products
 * Requires products to exist first
 */
export const seedProductPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const productPrices = [];
    const now = new Date().toISOString();

    // Get all products
    const products = await ctx.db.query("products").collect();

    if (products.length === 0) {
      throw new Error("Please seed products first");
    }

    // Create 2-3 price tiers per product
    for (let product of products) {
      const numPrices = faker.number.int({ min: 2, max: 3 });

      const priceTiers = [
        { name: "Standard", amount: 100, isPublic: true },
        { name: "Premium", amount: 150, isPublic: true },
        { name: "Corporate", amount: 200, isPublic: false },
      ];

      for (let i = 0; i < numPrices; i++) {
        const tier = priceTiers[i];
        // Base amounts in CENTS (not dollars)
        const baseAmount = product.type === "monthly" ? 15000 : 
                          product.type === "weekly" ? 5000 : 
                          product.type === "daily" ? 2000 :
                          product.type === "annual" ? 150000 : 7500;
        
        const priceId = await ctx.db.insert("productPrices", {
          productId: product._id,
          isActive: faker.datatype.boolean(0.85), // 85% active
          name: tier.name,
          amount: baseAmount * (i + 1),
          stripePriceId: product.stripeProductId ? `price_${faker.string.alphanumeric(14)}` : null,
          isPublic: tier.isPublic,
          createdAt: now,
          updatedAt: now,
        });
        productPrices.push(priceId);
      }
    }

    return { count: productPrices.length, ids: productPrices };
  },
});

/**
 * Seed Subscriptions
 * 
 * NOTE: Subscriptions are now created via Stripe webhooks when users complete checkout.
 * This seeder has been removed to prevent conflicts with the webhook-based subscription creation.
 * If you need test subscriptions, use the actual Stripe checkout flow.
 */

/**
 * Seed User Roles
 * Creates test user role assignments
 * Requires users, garages, and roles to exist first
 */
export const seedUserRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const userRoleIds: string[] = [];
    const now = new Date().toISOString();

    // Get all users, garages, and roles
    const users = await ctx.db.query("users").collect();
    const garages = await ctx.db.query("garages").collect();
    const roles = await ctx.db.query("roles").collect();

    if (users.length === 0 || garages.length === 0 || roles.length === 0) {
      throw new Error("Please seed users, garages, and roles first");
    }

    // Find specific roles
    const customerRole = roles.find(r => r.name === "Customer");
    const managerRole = roles.find(r => r.name === "Manager");
    const attendantRole = roles.find(r => r.name === "Attendant");

    // Track created combinations to avoid duplicates
    const createdCombinations = new Set<string>();

    // Assign roles to users
    for (let user of users) {
      const numRoles = faker.number.int({ min: 1, max: 2 });

      for (let i = 0; i < numRoles; i++) {
        const garage = faker.helpers.arrayElement(garages);
        
        // Weight role selection (more customers, fewer managers)
        let role;
        const roleChance = Math.random();
        if (roleChance < 0.7 && customerRole) {
          role = customerRole;
        } else if (roleChance < 0.85 && attendantRole) {
          role = attendantRole;
        } else if (managerRole) {
          role = managerRole;
        } else {
          role = faker.helpers.arrayElement(roles);
        }

        // Check if this combination already exists to avoid duplicates
        const combinationKey = `${user._id}-${garage._id}-${role._id}`;
        
        if (!createdCombinations.has(combinationKey)) {
          const userRoleId = await ctx.db.insert("userRoles", {
            userId: user._id,
            garageId: garage._id,
            roleId: role._id,
            createdAt: now,
            updatedAt: now,
          });
          userRoleIds.push(userRoleId);
          createdCombinations.add(combinationKey);
        }
      }
    }

    return { count: userRoleIds.length, ids: userRoleIds };
  },
});

/**
 * Internal helper queries for seedAll action
 */
import { query } from "./_generated/server";

export const getAllGarages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("garages").collect();
  },
});

export const getAllProducts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getAllRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});

/**
 * Internal helper mutation to insert a product
 * Used by seedAll action
 */
export const insertProduct = mutation({
  args: {
    name: v.string(),
    isActive: v.boolean(),
    type: v.string(),
    availableSeats: v.number(),
    stripeProductId: v.union(v.string(), v.null()),
    garageId: v.id("garages"),
    createdAt: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", args);
  },
});

/**
 * Internal helper mutation to insert a product price
 * Used by seedAll action
 */
export const insertProductPrice = mutation({
  args: {
    productId: v.id("products"),
    isActive: v.boolean(),
    name: v.string(),
    amount: v.number(),
    stripePriceId: v.union(v.string(), v.null()),
    isPublic: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("productPrices", args);
  },
});

/**
 * Internal helper mutation to insert a role
 * Used by seedAll action
 */
export const insertRole = mutation({
  args: {
    name: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("roles", args);
  },
});


/**
 * Internal helper mutation to insert a user role
 * Used by seedAll action
 */
export const insertUserRole = mutation({
  args: {
    userId: v.id("users"),
    garageId: v.id("garages"),
    roleId: v.id("roles"),
    createdAt: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userRoles", args);
  },
});

/**
 * Seed All Data
 * Seeds all tables in the correct order to maintain relationships
 * Creates real Stripe products and prices
 */
export const seedAll = action({
  args: {},
  handler: async (ctx) => {
    // Initialize Stripe client
    const stripe = getStripeClient();
    const { api } = await import("./_generated/api");
    const results = {
      users: 0,
      garages: 0,
      products: 0,
      roles: 0,
      productPrices: 0,
      subscriptions: 0,
      userRoles: 0,
    };

    const now = new Date().toISOString();

    // 1. Seed Users
    console.log("Seeding users...");
    const usersResult = await ctx.runMutation(api.seed.seedUsers);
    results.users = usersResult.count;
    console.log(`✓ Created ${results.users} users`);

    // 2. Seed Garages
    console.log("Seeding garages...");
    const garagesResult = await ctx.runMutation(api.seed.seedGarages);
    results.garages = garagesResult.count;
    console.log(`✓ Created ${results.garages} garages`);

    // 3. Seed Products with Stripe Integration
    console.log("Seeding products...");
    const allGarages = await ctx.runQuery(api.seed.getAllGarages);
    
    const productConfigs = [
      { name: "Monthly Unlimited", type: "monthly", seats: 1 },
      { name: "Weekly Pass", type: "weekly", seats: 1 },
      { name: "Daily Pass", type: "daily", seats: 1 },
      { name: "Annual Unlimited", type: "annual", seats: 1 },
      { name: "Monthly Reserved", type: "monthly", seats: 1 },
      { name: "Carpool Pass (4 seats)", type: "monthly", seats: 4 },
    ];

    // Create products for each garage
    for (let garage of allGarages) {
      // Each garage gets 3-4 random products
      const productsToCreate = faker.number.int({ min: 3, max: 4 });
      const selectedConfigs = faker.helpers.shuffle(productConfigs).slice(0, productsToCreate);
      
      for (let config of selectedConfigs) {
        const isActive = faker.datatype.boolean(0.9);
        
        // Create product in Stripe first
        let stripeProductId = null;
        try {
          console.log(`Creating Stripe product: ${config.name} for ${garage.name}`);
          const stripeProduct = await stripe.products.create({
            name: `${config.name} - ${garage.name}`,
            description: `${config.type} parking pass at ${garage.name}`,
            metadata: {
              garageId: garage._id,
              garageName: garage.name,
              productType: config.type,
              seats: config.seats.toString(),
            },
          });
          stripeProductId = stripeProduct.id;
          console.log(`✓ Created Stripe product: ${stripeProductId}`);
        } catch (error: any) {
          console.error(`Failed to create Stripe product for ${config.name}:`, error.message);
          throw new Error(`Stripe product creation failed: ${error.message}`);
        }
        
        // Insert product into Convex database
        await ctx.runMutation(api.seed.insertProduct, {
          name: config.name,
          isActive: isActive,
          type: config.type,
          availableSeats: config.seats,
          stripeProductId: stripeProductId,
          garageId: garage._id,
          createdAt: now,
          updatedAt: now,
        });
        results.products++;
      }
    }
    console.log(`✓ Created ${results.products} products with Stripe integration`);

    // 4. Seed Roles
    console.log("Seeding roles...");
    const roleNames = ["Admin", "Manager", "Attendant", "Customer", "Supervisor", "Billing"];
    for (let roleName of roleNames) {
      await ctx.runMutation(api.seed.insertRole, {
        name: roleName,
        createdAt: now,
        updatedAt: now,
      });
      results.roles++;
    }
    console.log(`✓ Created ${results.roles} roles`);

    // Get all created data for relationships
    const users = await ctx.runQuery(api.seed.getAllUsers);
    const garages = await ctx.runQuery(api.seed.getAllGarages);
    const products = await ctx.runQuery(api.seed.getAllProducts);
    const roles = await ctx.runQuery(api.seed.getAllRoles);

    // 5. Seed Product Prices with Stripe Integration
    console.log("Seeding product prices...");
    for (let product of products) {
      const numPrices = faker.number.int({ min: 2, max: 3 });
      const priceTiers = [
        { name: "Standard", isPublic: true },
        { name: "Premium", isPublic: true },
        { name: "Corporate", isPublic: false },
      ];

      for (let i = 0; i < numPrices; i++) {
        const tier = priceTiers[i];
        // Base amounts in CENTS (not dollars)
        const baseAmount = product.type === "monthly" ? 15000 : 
                          product.type === "weekly" ? 5000 : 
                          product.type === "daily" ? 2000 :
                          product.type === "annual" ? 150000 : 7500;
        
        const amount = baseAmount * (i + 1);
        const isActive = faker.datatype.boolean(0.85);
        
        // Create price in Stripe with recurring intervals
        let stripePriceId = null;
        if (product.stripeProductId) {
          try {
            console.log(`Creating Stripe price: ${tier.name} for product ${product.name}`);
            
            // Determine recurring interval based on product type
            let recurring = undefined;
            if (product.type === "monthly") {
              recurring = { interval: "month" as const, interval_count: 1 };
            } else if (product.type === "annual") {
              recurring = { interval: "year" as const, interval_count: 1 };
            } else if (product.type === "weekly") {
              recurring = { interval: "week" as const, interval_count: 1 };
            }
            // For daily, weekend, and other types, leave recurring undefined (one-time payment)
            
            const stripePrice = await stripe.prices.create({
              product: product.stripeProductId,
              unit_amount: amount, // Amount is already in cents
              currency: "usd",
              recurring: recurring,
              metadata: {
                productId: product._id,
                productName: product.name,
                priceTier: tier.name,
              },
            });
            stripePriceId = stripePrice.id;
            console.log(`✓ Created Stripe price: ${stripePriceId} (${recurring ? recurring.interval + 'ly recurring' : 'one-time'})`);
          } catch (error: any) {
            console.error(`Failed to create Stripe price for ${product.name}:`, error.message);
            throw new Error(`Stripe price creation failed: ${error.message}`);
          }
        }
        
        await ctx.runMutation(api.seed.insertProductPrice, {
          productId: product._id,
          isActive: isActive,
          name: tier.name,
          amount: amount,
          stripePriceId: stripePriceId,
          isPublic: tier.isPublic,
          createdAt: now,
          updatedAt: now,
        });
        results.productPrices++;
      }
    }
    console.log(`✓ Created ${results.productPrices} product prices with Stripe integration`);

    // 6. Skip Subscription Seeding
    // Note: Subscriptions are now created via Stripe webhooks
    console.log("Skipping subscription seeding (created via Stripe webhooks)");

    // 7. Seed User Roles
    console.log("Seeding user roles...");
    const customerRole = roles.find(r => r.name === "Customer");
    const managerRole = roles.find(r => r.name === "Manager");
    const attendantRole = roles.find(r => r.name === "Attendant");

    for (let user of users) {
      const numRoles = faker.number.int({ min: 1, max: 2 });

      for (let i = 0; i < numRoles; i++) {
        const garage = faker.helpers.arrayElement(garages);
        
        let role;
        const roleChance = Math.random();
        if (roleChance < 0.7 && customerRole) {
          role = customerRole;
        } else if (roleChance < 0.85 && attendantRole) {
          role = attendantRole;
        } else if (managerRole) {
          role = managerRole;
        } else {
          role = faker.helpers.arrayElement(roles);
        }

        await ctx.runMutation(api.seed.insertUserRole, {
          userId: user._id,
          garageId: garage._id,
          roleId: role._id,
          createdAt: now,
          updatedAt: now,
        });
        results.userRoles++;
      }
    }
    console.log(`✓ Created ${results.userRoles} user roles`);

    return {
      success: true,
      totals: results,
      message: `Successfully seeded database with ${Object.values(results).reduce((a, b) => a + b, 0)} total records`,
    };
  },
});

/**
 * Clear All Data
 * Deletes all data from all tables (use with caution!)
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Clearing all data...");

    // Delete in reverse order to avoid relationship issues
    const tables = [
      "userRoles",
      "subscriptions",
      "productPrices",
      "roles",
      "products",
      "garages",
      "users",
    ];

    const results: Record<string, number> = {};

    for (const table of tables) {
      const docs = await ctx.db.query(table as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      results[table] = docs.length;
      console.log(`✓ Deleted ${docs.length} ${table}`);
    }

    return {
      success: true,
      deleted: results,
      message: `Cleared ${Object.values(results).reduce((a, b) => a + b, 0)} total records`,
    };
  },
});
