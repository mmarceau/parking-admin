import { mutation } from "./_generated/server";
import { faker } from "@faker-js/faker";

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
        const baseAmount = product.type === "monthly" ? 100 : 
                          product.type === "weekly" ? 40 : 
                          product.type === "daily" ? 15 :
                          product.type === "annual" ? 1000 : 50;
        
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
 * Creates test subscriptions for users, garages, and products
 * Requires users, garages, and products to exist first
 */
export const seedSubscriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const subscriptions = [];
    const now = new Date().toISOString();

    // Get all users, garages, and products
    const users = await ctx.db.query("users").collect();
    const garages = await ctx.db.query("garages").collect();
    const products = await ctx.db.query("products").collect();

    if (users.length === 0 || garages.length === 0 || products.length === 0) {
      throw new Error("Please seed users, garages, and products first");
    }

    // Create 1-2 subscriptions per user
    for (let user of users) {
      const numSubscriptions = faker.number.int({ min: 0, max: 2 });

      for (let i = 0; i < numSubscriptions; i++) {
        const garage = faker.helpers.arrayElement(garages);
        
        // Get products that belong to this garage
        const garageProducts = products.filter(p => p.garageId === garage._id);
        
        // Skip if this garage has no products
        if (garageProducts.length === 0) continue;
        
        const product = faker.helpers.arrayElement(garageProducts);
        const startDate = faker.date.past({ years: 1 });
        
        // 30% chance subscription has ended
        let endDate = null;
        if (faker.datatype.boolean(0.3)) {
          endDate = faker.date.between({ 
            from: startDate, 
            to: new Date() 
          }).toISOString();
        }

        // Due date is typically monthly from start
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + 1);

        const subscriptionId = await ctx.db.insert("subscriptions", {
          userId: user._id,
          garageId: garage._id,
          productId: product._id,
          startDate: startDate.toISOString(),
          endDate: endDate,
          dueDate: dueDate.toISOString(),
          stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
          seats: product.availableSeats || 1,
          createdAt: now,
          updatedAt: now,
        });
        subscriptions.push(subscriptionId);
      }
    }

    return { count: subscriptions.length, ids: subscriptions };
  },
});

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
 * Seed All Data
 * Seeds all tables in the correct order to maintain relationships
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
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
    for (let i = 0; i < 15; i++) {
      await ctx.db.insert("users", {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        phone: faker.phone.number(),
        stripeUserId: faker.datatype.boolean(0.7) ? `cus_${faker.string.alphanumeric(14)}` : null,
        createdAt: now,
        updatedAt: now,
      });
      results.users++;
    }

    // 2. Seed Garages
    console.log("Seeding garages...");
    const garageNames = [
      "Downtown Parking Center",
      "City Square Garage",
      "Waterfront Parking",
      "Airport Long-Term Parking",
      "Medical Center Garage",
      "Shopping District Parking",
      "Convention Center Garage",
    ];

    for (let garageName of garageNames) {
      await ctx.db.insert("garages", {
        name: garageName,
        address1: faker.location.streetAddress(),
        address2: faker.helpers.arrayElement([
          faker.location.secondaryAddress(),
          "",
        ]),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        postalCode: faker.location.zipCode(),
        createdAt: now,
        updatedAt: now,
      });
      results.garages++;
    }

    // 3. Seed Products
    console.log("Seeding products...");
    const allGarages = await ctx.db.query("garages").collect();
    
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
        await ctx.db.insert("products", {
          name: config.name,
          isActive: isActive,
          type: config.type,
          availableSeats: config.seats,
          stripeProductId: isActive ? `prod_${faker.string.alphanumeric(14)}` : null,
          garageId: garage._id,
          createdAt: now,
          updatedAt: now,
        });
        results.products++;
      }
    }

    // 4. Seed Roles
    console.log("Seeding roles...");
    const roleNames = ["Admin", "Manager", "Attendant", "Customer", "Supervisor", "Billing"];
    for (let roleName of roleNames) {
      await ctx.db.insert("roles", {
        name: roleName,
        createdAt: now,
        updatedAt: now,
      });
      results.roles++;
    }

    // Get all created data for relationships
    const users = await ctx.db.query("users").collect();
    const garages = await ctx.db.query("garages").collect();
    const products = await ctx.db.query("products").collect();
    const roles = await ctx.db.query("roles").collect();

    // 5. Seed Product Prices
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
        const baseAmount = product.type === "monthly" ? 100 : 
                          product.type === "weekly" ? 40 : 
                          product.type === "daily" ? 15 :
                          product.type === "annual" ? 1000 : 50;
        
        await ctx.db.insert("productPrices", {
          productId: product._id,
          isActive: faker.datatype.boolean(0.85),
          name: tier.name,
          amount: baseAmount * (i + 1),
          stripePriceId: product.stripeProductId ? `price_${faker.string.alphanumeric(14)}` : null,
          isPublic: tier.isPublic,
          createdAt: now,
          updatedAt: now,
        });
        results.productPrices++;
      }
    }

    // 6. Seed Subscriptions
    console.log("Seeding subscriptions...");
    for (let user of users) {
      const numSubscriptions = faker.number.int({ min: 0, max: 2 });
      
      for (let i = 0; i < numSubscriptions; i++) {
        const garage = faker.helpers.arrayElement(garages);
        
        // Get products that belong to this garage
        const garageProducts = products.filter(p => p.garageId === garage._id);
        
        // Skip if this garage has no products
        if (garageProducts.length === 0) continue;
        
        const product = faker.helpers.arrayElement(garageProducts);
        const startDate = faker.date.past({ years: 1 });
        
        let endDate = null;
        if (faker.datatype.boolean(0.3)) {
          endDate = faker.date.between({ 
            from: startDate, 
            to: new Date() 
          }).toISOString();
        }

        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + 1);

        await ctx.db.insert("subscriptions", {
          userId: user._id,
          garageId: garage._id,
          productId: product._id,
          startDate: startDate.toISOString(),
          endDate: endDate,
          dueDate: dueDate.toISOString(),
          stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
          seats: product.availableSeats || 1,
          createdAt: now,
          updatedAt: now,
        });
        results.subscriptions++;
      }
    }

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

        await ctx.db.insert("userRoles", {
          userId: user._id,
          garageId: garage._id,
          roleId: role._id,
          createdAt: now,
          updatedAt: now,
        });
        results.userRoles++;
      }
    }

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
