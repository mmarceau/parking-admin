# Testing and Seeding Guide

This guide explains how to use the seed and test functions for your Convex database with Ents.

## Overview

The testing setup includes:
- **seed.ts** - Functions to populate the database with realistic test data using Faker
- **tests.ts** - Query functions to verify relationships and test data integrity

## Seeding the Database

### Seed All Data at Once

The easiest way to populate your database with test data:

```bash
# In your Convex dashboard, run this mutation:
npx convex run seed:seedAll
```

This will create:
- 10 Users
- 5 Garages
- 5 Products
- 5 Roles (Admin, Manager, Attendant, Customer, Supervisor)
- 10-15 Passes (2-3 per garage)
- 10-30 Invoices (1-3 per user)
- Multiple Invoice Items per invoice
- 10-20 Subscriptions (1-2 per user)
- Multiple Transactions
- Multiple User Role assignments

### Seed Individual Tables

You can also seed tables individually:

```bash
# Seed users
npx convex run seed:seedUsers

# Seed garages
npx convex run seed:seedGarages

# Seed products
npx convex run seed:seedProducts

# Seed roles
npx convex run seed:seedRoles

# Seed passes (requires garages and products first)
npx convex run seed:seedPasses

# Seed invoices (requires users first)
npx convex run seed:seedInvoices

# Seed invoice items (requires invoices first)
npx convex run seed:seedInvoiceItems

# Seed subscriptions (requires users and passes first)
npx convex run seed:seedSubscriptions

# Seed transactions (requires invoices and subscriptions first)
npx convex run seed:seedTransactions

# Seed user roles (requires users, garages, and roles first)
npx convex run seed:seedUserRoles
```

### Clear All Data

⚠️ **Warning**: This will delete all data from all tables!

```bash
npx convex run seed:clearAll
```
