import { useState, useEffect, useRef } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

type View = "user-selection" | "user-dashboard" | "add-subscription";

type SubscriptionWithDetails = {
  _id: Id<"subscriptions">;
  userId: Id<"users">;
  garageId: Id<"garages">;
  productId: Id<"products">;
  startDate: string;
  endDate: string | null;
  dueDate: string;
  stripeSubscriptionId: string;
  seats: number;
  createdAt: string;
  updatedAt: string;
  garage: any;
  product: any;
};

export default function UserPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>("user-selection");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedGarageId, setSelectedGarageId] = useState<Id<"garages"> | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Track if we've shown the checkout message to prevent duplicates
  const checkoutMessageShown = useRef<string | null>(null);

  // Queries
  const users = useQuery(api.user.getAllUsers);
  const garages = useQuery(api.user.getAllGarages);
  const products = useQuery(
    api.user.getGarageProducts,
    selectedGarageId ? { garageId: selectedGarageId } : "skip"
  );
  const userSubscriptions = useQuery(
    api.user.getUserSubscriptions,
    selectedUserId ? { userId: selectedUserId } : "skip"
  );

  // Actions
  const createCheckoutSession = useAction(api.checkout.createCheckoutSession);
  const cancelStripeSubscription = useAction(api.stripe.cancelStripeSubscription);
  
  // Mutations
  const cancelSubscription = useMutation(api.user.cancelSubscription);

  // Handle URL parameters on mount and when they change
  useEffect(() => {
    const userId = searchParams.get("userId");
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    
    if (userId) {
      setSelectedUserId(userId as Id<"users">);
      setCurrentView("user-dashboard");
      
      // Handle checkout success/cancel
      if (checkout === "success" && sessionId) {
        // Only show the message once per session ID
        if (checkoutMessageShown.current !== sessionId) {
          checkoutMessageShown.current = sessionId;
          alert("🎉 Payment successful! Your subscription is now active.");
          // Clean up URL params
          setSearchParams({ userId });
        }
      } else if (checkout === "cancelled") {
        // Only show the message once per URL state
        const cancelKey = `cancelled_${userId}`;
        if (checkoutMessageShown.current !== cancelKey) {
          checkoutMessageShown.current = cancelKey;
          alert("Payment was cancelled. You can try again anytime.");
          // Clean up URL params
          setSearchParams({ userId });
        }
      }
    }
  }, [searchParams, setSearchParams]);

  const handleUserSelect = (userId: Id<"users">) => {
    setSelectedUserId(userId);
    setCurrentView("user-dashboard");
    setSearchParams({ userId });
  };

  const handleAddSubscription = () => {
    setSelectedGarageId(null); // Reset garage selection
    setCurrentView("add-subscription");
  };

  const handleBackToDashboard = () => {
    setCurrentView("user-dashboard");
  };

  const handleBackToUserSelection = () => {
    setSelectedUserId(null);
    setSelectedGarageId(null);
    setCurrentView("user-selection");
    setSearchParams({});
  };

  const handleSubscribe = async (
    productId: Id<"products">, 
    priceId: Id<"productPrices">,
    seats: number
  ) => {
    if (!selectedUserId || !selectedGarageId) {
      alert("Please select a user and a garage first");
      return;
    }

    setIsProcessingCheckout(true);

    try {
      // Create a Stripe Checkout session
      const result = await createCheckoutSession({
        priceId,
        productId,
        userId: selectedUserId,
        garageId: selectedGarageId,
        quantity: seats,
      });

      if (!result.success || !result.sessionId) {
        throw new Error(result.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      // Use the session URL directly (recommended approach)
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessingCheckout(false);
    }
  };

  const handleSubscriptionClick = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setIsDetailsDialogOpen(true);
    setShowCancelConfirm(false);
  };

  const handleCloseDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedSubscription(null);
    setShowCancelConfirm(false);
  };

  const handleCancelSubscription = async () => {
    if (!selectedSubscription) return;

    setIsCancelling(true);
    try {
      // Cancel in Stripe first
      const stripeResult = await cancelStripeSubscription({
        stripeSubscriptionId: selectedSubscription.stripeSubscriptionId,
      });

      if (!stripeResult.success) {
        throw new Error(stripeResult.error || "Failed to cancel subscription in Stripe");
      }

      // Then update in our database
      await cancelSubscription({ subscriptionId: selectedSubscription._id });

      alert("✅ Subscription cancelled successfully");
      handleCloseDialog();
    } catch (error) {
      console.error("Cancellation error:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const selectedUser = users?.find((u) => u._id === selectedUserId);
  const selectedGarage = garages?.find((g) => g._id === selectedGarageId);

  // View 1: User Selection
  if (currentView === "user-selection") {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Portal</h1>
            <p className="text-gray-600 mt-2">Select a user to impersonate</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select User</CardTitle>
              <CardDescription>Choose a user to browse as</CardDescription>
            </CardHeader>
            <CardContent>
              {!users ? (
                <p className="text-gray-500">Loading users...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleUserSelect(user._id)}
                      className="p-4 rounded-lg border-2 text-left transition-all border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-600">{user.email || "No email"}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // View 2: User Dashboard
  if (currentView === "user-dashboard") {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedUser?.firstName} {selectedUser?.lastName}'s Dashboard
              </h1>
              <p className="text-gray-600 mt-2">{selectedUser?.email || "No email"}</p>
            </div>
            <Button variant="outline" onClick={handleBackToUserSelection}>
              Change User
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Subscriptions</CardTitle>
              <CardDescription>Your active and past subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {!userSubscriptions ? (
                <p className="text-gray-500">Loading subscriptions...</p>
              ) : userSubscriptions.length === 0 ? (
                <p className="text-gray-500">No subscriptions yet</p>
              ) : (
                <div className="space-y-2">
                  {userSubscriptions.map((sub) => (
                    <button
                      key={sub._id}
                      onClick={() => handleSubscriptionClick(sub)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-left"
                    >
                      <div>
                        <div className="font-medium text-lg">
                          {sub.product?.name} at {sub.garage?.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {sub.seats} seat{sub.seats !== 1 ? "s" : ""} • Started{" "}
                          {new Date(sub.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={sub.endDate ? "secondary" : "default"}>
                        {sub.endDate ? "Expired" : "Active"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleAddSubscription}>
              Add Subscription
            </Button>
          </div>
        </div>
        
        {/* Subscription Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Subscription Details</DialogTitle>
              <DialogDescription>
                View and manage your subscription
              </DialogDescription>
            </DialogHeader>

            {selectedSubscription && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Product</label>
                    <p className="text-base font-medium">{selectedSubscription.product?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Garage</label>
                    <p className="text-base font-medium">{selectedSubscription.garage?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge variant={selectedSubscription.endDate ? "secondary" : "default"}>
                        {selectedSubscription.endDate ? "Cancelled" : "Active"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Seats</label>
                    <p className="text-base font-medium">{selectedSubscription.seats}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Start Date</label>
                    <p className="text-base">
                      {new Date(selectedSubscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedSubscription.endDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">End Date</label>
                      <p className="text-base">
                        {new Date(selectedSubscription.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Stripe Subscription ID</label>
                  <p className="text-base font-mono text-sm bg-gray-100 p-2 rounded mt-1">
                    {selectedSubscription.stripeSubscriptionId}
                  </p>
                </div>

                {!selectedSubscription.endDate && (
                  <div className="pt-4 border-t">
                    {!showCancelConfirm ? (
                      <Button
                        variant="destructive"
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full"
                      >
                        Cancel Subscription
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800 font-medium">
                            Are you sure you want to cancel this subscription?
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            This action cannot be undone.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            onClick={handleCancelSubscription}
                            disabled={isCancelling}
                            className="flex-1"
                          >
                            {isCancelling ? "Cancelling..." : "Yes, Cancel Subscription"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelConfirm(false)}
                            disabled={isCancelling}
                            className="flex-1"
                          >
                            No, Keep It
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // View 3: Add Subscription (Garages on left, Products on right)
  if (currentView === "add-subscription") {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add Subscription</h1>
              <p className="text-gray-600 mt-2">
                Select a garage and choose a product to subscribe
              </p>
            </div>
            <Button variant="outline" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Garages List */}
            <Card>
              <CardHeader>
                <CardTitle>Select a Garage</CardTitle>
                <CardDescription>Choose a garage to browse products</CardDescription>
              </CardHeader>
              <CardContent>
                {!garages ? (
                  <p className="text-gray-500">Loading garages...</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {garages.map((garage) => (
                      <button
                        key={garage._id}
                        onClick={() => setSelectedGarageId(garage._id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          selectedGarageId === garage._id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-gray-900 text-lg">{garage.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {garage.address1}
                          {garage.address2 && `, ${garage.address2}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {garage.city}, {garage.state} {garage.postalCode}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Side: Products */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedGarage ? `Products at ${selectedGarage.name}` : "Select a Garage"}
                </CardTitle>
                <CardDescription>
                  {selectedGarage
                    ? "Choose a product and subscribe"
                    : "Select a garage to see available products"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedGarageId ? (
                  <p className="text-gray-500">Please select a garage from the left</p>
                ) : !products ? (
                  <p className="text-gray-500">Loading products...</p>
                ) : products.length === 0 ? (
                  <p className="text-gray-500">No public products available at this garage</p>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {products.map((product) => (
                      <div key={product._id} className="border rounded-lg p-4 bg-white">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold">{product.name}</h3>
                          <div className="flex gap-2 mt-2">
                            <Badge>{product.type}</Badge>
                            <Badge variant="outline">
                              {product.availableSeats} seats available
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Available Prices:</p>
                          {product.prices.map((price) => (
                            <div
                              key={price._id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <div className="font-medium">{price.name}</div>
                                <div className="text-lg font-bold text-blue-600">
                                  ${(price.amount / 100).toFixed(2)}
                                </div>
                                {!price.stripePriceId && (
                                  <div className="text-xs text-amber-600 mt-1">
                                    ⚠️ Payment not configured for this price
                                  </div>
                                )}
                              </div>
                              <Button
                                onClick={() => handleSubscribe(product._id, price._id, 1)}
                                size="sm"
                                disabled={isProcessingCheckout || !price.stripePriceId}
                              >
                                {isProcessingCheckout ? "Processing..." : "Subscribe"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

