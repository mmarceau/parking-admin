# Quick Start Guide - Testing with Faker

This project now includes comprehensive testing and seeding capabilities using Faker.js to generate realistic test data for all your models.

## What's Been Added

### 📁 New Files

1. **`convex/seed.ts`** - Seed functions to populate your database with test data
   - Individual seed functions for each table
   - `seedAll()` - One command to seed everything
   - `clearAll()` - Reset your database

2. **`convex/tests.ts`** - Query functions to test relationships and data integrity
   - Test user relationships
   - Test garage relationships
   - Test invoices and subscriptions
   - Get financial summaries
   - Query users by role

3. **`src/TestDashboard.tsx`** - React component with a UI for testing
   - Seed and clear data with buttons
   - View database statistics
   - Explore relationships
   - Business metrics dashboard

4. **`convex/TESTING.md`** - Complete documentation for all test functions

## 🚀 Getting Started

### Step 1: Start Your Convex Dev Server

```bash
npm run dev
```

### Step 2: Seed Your Database

Open your Convex dashboard or use the CLI:

```bash
npx convex run seed:seedAll
```

This creates:
- ✅ 10 Users with realistic names, emails, and phone numbers
- ✅ 5 Garages with full addresses
- ✅ 5 Products
- ✅ 5 Roles (Admin, Manager, Attendant, Customer, Supervisor)
- ✅ 10-15 Passes (linked to garages and products)
- ✅ 10-30 Invoices (linked to users)
- ✅ Multiple Invoice Items per invoice
- ✅ 10-20 Subscriptions (linked to users and passes)
- ✅ Multiple Transactions
- ✅ Multiple User Role assignments

### Step 3: Test Your Data

```bash
# Get statistics
npx convex run tests:getDataStats

# Test relationships (use an ID from the stats output)
npx convex run tests:testUserRelationships '{"userId": "YOUR_USER_ID"}'
npx convex run tests:testGarageRelationships '{"garageId": "YOUR_GARAGE_ID"}'
```

## 🎨 Using the Test Dashboard (Optional)

Add the TestDashboard component to your app:

```tsx
// In your src/App.tsx or create a new route
import TestDashboard from "./TestDashboard";

function App() {
  return <TestDashboard />;
}
```

The dashboard provides:
- 🌱 One-click database seeding
- 🗑️ One-click data clearing
- 📊 Real-time statistics
- 💼 Business metrics
- 🔗 Relationship exploration

## 📊 Example Data Generated

### Users
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "(555) 123-4567",
  "createdAt": "2024-11-14T...",
  "updatedAt": "2024-11-14T..."
}
```

### Garages
```json
{
  "name": "Smith Parking Services Parking Garage",
  "address1": "123 Main Street",
  "address2": "Suite 100",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "createdAt": "2024-11-14T...",
  "updatedAt": "2024-11-14T..."
}
```

### Invoices with Items
```json
{
  "invoice": {
    "invoiceDate": "2024-10-15T...",
    "startDate": "2024-10-10T...",
    "endDate": "2024-11-10T...",
    "dueDate": "2024-10-30T...",
    "userId": "user_id_here"
  },
  "items": [
    {
      "description": "Premium parking space",
      "rate": 150.00,
      "quantity": 2,
      "total": 300.00
    }
  ]
}
```

## 🧪 Available Test Functions

### Database Operations
- `seed:seedAll` - Seed all tables with test data
- `seed:clearAll` - Clear all data (⚠️ use with caution!)
- `seed:seedUsers`, `seed:seedGarages`, etc. - Seed individual tables

### Relationship Testing
- `tests:testUserRelationships` - Get user with all related data
- `tests:testGarageRelationships` - Get garage with passes and staff
- `tests:testInvoiceDetails` - Get invoice with items and transactions
- `tests:testSubscriptionDetails` - Get subscription with all related entities

### Business Queries
- `tests:getDataStats` - Get counts and business metrics
- `tests:getUsersByRole` - Find users with a specific role
- `tests:getGarageRevenue` - Get revenue summary for a garage
- `tests:getUserFinancials` - Get financial overview for a user

## 🔗 Entity Relationships

Your schema now uses **Convex Ents** for proper foreign key relationships:

```
users
├── has many → invoices
├── has many → subscriptions
└── has many → userRoles

garages
├── has many → passes
└── has many → userRoles

products
└── has many → passes

passes
├── belongs to → garage
├── belongs to → product
└── has many → subscriptions

invoices
├── belongs to → user
├── has many → invoiceItems
└── has many → transactions

subscriptions
├── belongs to → user
├── belongs to → pass
└── has many → transactions
```

## 📖 More Information

See `convex/TESTING.md` for complete documentation including:
- Detailed usage of each function
- Relationship dependencies
- Troubleshooting guide
- Advanced testing examples

## 🎯 Common Tasks

### Reset and Reseed
```bash
npx convex run seed:clearAll && npx convex run seed:seedAll
```

### Check if Data Exists
```bash
npx convex run tests:getDataStats
```

### Test a Specific User's Data
```bash
# 1. Get stats to find a user ID
npx convex run tests:getDataStats

# 2. Test that user (replace with actual ID)
npx convex run tests:testUserRelationships '{"userId": "jx7..."}'

# 3. Get their financial overview
npx convex run tests:getUserFinancials '{"userId": "jx7..."}'
```

### Find All Admins
```bash
npx convex run tests:getUsersByRole '{"roleName": "Admin"}'
```

## 💡 Tips

1. **Start Fresh**: Always run `clearAll` before `seedAll` for clean data
2. **Use Dashboard**: The Convex dashboard is great for exploring your data visually
3. **Customize Amounts**: Edit `seed.ts` to change how much data is generated
4. **Production Warning**: Never run seed functions in production! These are for testing only.

## 🐛 Troubleshooting

**"Please seed X first" error**: You're trying to seed a table that depends on another table. Use `seedAll` to seed everything in the correct order.

**No data showing**: Make sure you've run `seedAll` and your Convex dev server is running.

**Type errors**: Run `npx convex dev` to regenerate types after schema changes.

## 📚 Resources

- [Convex Ents Documentation](https://labs.convex.dev/convex-ents/schema)
- [Faker.js Documentation](https://fakerjs.dev/)
- [Convex Documentation](https://docs.convex.dev/)

---

Happy testing! 🎉

