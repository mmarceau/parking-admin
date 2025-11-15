# Admin Page Implementation Guide

## Overview
Created a comprehensive Admin Dashboard with tabbed interface using shadcn UI components.

## Files Created

### 1. `src/AdminPage.tsx`
Main admin dashboard with:
- **4 Tabs**: Garages, Users, Subscriptions, Products
- **Garage Management**: 
  - Grid view of all garages with stats
  - Click-through to detailed garage view
  - Action buttons for future functionality
  - Shows subscriptions and staff for each garage
- **Stats Overview**: Real-time counts and metrics
- **Modern UI**: Using shadcn components (Tabs, Card, Button, Badge)

### 2. `convex/admin.ts`
Admin-specific Convex queries:
- `getAllGarages` - Fetch all garages with subscription stats
- `getAllUsers` - Fetch all users with stats
- `getAllSubscriptions` - Fetch subscriptions with related data
- `getAllProducts` - Fetch products with pricing info
- `getAllRoles` - Fetch roles with user counts
- `getDashboardOverview` - Comprehensive dashboard metrics

### 3. `src/App.tsx` (Updated)
Simplified to render the AdminPage directly.

## Features

### Garages Tab (Primary Focus)
✅ **List View**:
- Grid layout showing all garages
- Each card displays:
  - Garage name and location
  - Pass type badge
  - Total and active subscriptions count
- Hover effects and clickable cards

✅ **Detail View** (when garage clicked):
- Full garage information (name, address, pass type)
- Stats cards (subscriptions, active, staff)
- **Action Buttons Section** with 6 buttons:
  - Edit Garage Details
  - Manage Subscriptions
  - View Reports
  - Manage Staff
  - Configure Pricing
  - Deactivate Garage (destructive style)
- Active subscriptions list
- Staff & roles list
- Back button to return to list

### Other Tabs
- **Users Tab**: Placeholder with action buttons
- **Subscriptions Tab**: Shows metrics and counts
- **Products Tab**: Displays all products with pricing details

## Usage

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Seed data** (if needed):
   - Go to Convex dashboard
   - Run `seedAll` mutation
   - Or individual seed functions

3. **Navigate**:
   - Dashboard loads with overview stats
   - Click "Garages" tab (default)
   - Click any garage card to view details
   - Use action buttons (ready for implementation)
   - Click "Back to Garages" to return

## UI Components Used

- `Tabs` - Main navigation
- `Card` - Content containers
- `Button` - Actions and navigation
- `Badge` - Status indicators
- Custom CSS - Hover effects and transitions

## Next Steps / Future Enhancements

The action buttons in the garage detail view are ready for implementation:
1. **Edit Garage Details** - Open modal/form to edit garage info
2. **Manage Subscriptions** - View/edit subscriptions for this garage
3. **View Reports** - Analytics and reporting
4. **Manage Staff** - Add/remove staff roles
5. **Configure Pricing** - Manage product prices for this garage
6. **Deactivate Garage** - Soft delete/deactivation

You can implement these by:
- Adding `onClick` handlers to the buttons
- Creating modal components
- Adding mutation functions in Convex
- Building forms for data entry

## Data Flow

```
AdminPage
  ↓
api.admin.getAllGarages (Convex query)
  ↓
Display garages in grid
  ↓
User clicks garage
  ↓
api.tests.testGarageRelationships (detail data)
  ↓
Show detail view with action buttons
```

## Styling

- Uses Tailwind CSS classes
- Responsive design (mobile, tablet, desktop)
- shadcn default theme
- Gray/blue color scheme for admin interface
- Red badge for admin access indicator

