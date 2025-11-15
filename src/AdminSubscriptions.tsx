import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit2, Trash2, Calendar, User } from "lucide-react";

export default function AdminSubscriptions({
  garageId,
  onBack,
}: {
  garageId: Id<"garages">;
  onBack: () => void;
}) {
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<Id<"subscriptions"> | null>(null);
  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  const [isAddingSubscription, setIsAddingSubscription] = useState(false);

  const [subscriptionForm, setSubscriptionForm] = useState({
    userId: "" as Id<"users"> | "",
    productId: "" as Id<"products"> | "",
    startDate: "",
    endDate: "",
    dueDate: "",
    stripeSubscriptionId: "",
    seats: 1,
  });

  // Queries
  const garage = useQuery(api.admin.getAllGarages)?.find((g) => g._id === garageId);
  const subscriptions = useQuery(api.admin.getGarageSubscriptionsWithDetails, { garageId });
  const users = useQuery(api.admin.getAllUsers);
  const products = useQuery(api.admin.getGarageProducts, { garageId });

  // Mutations
  const createSubscription = useMutation(api.admin.createSubscription);
  const updateSubscription = useMutation(api.admin.updateSubscription);
  const deleteSubscription = useMutation(api.admin.deleteSubscription);

  // Subscription handlers
  const handleAddSubscription = () => {
    setSubscriptionForm({
      userId: "",
      productId: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      dueDate: new Date().toISOString().split("T")[0],
      stripeSubscriptionId: "",
      seats: 1,
    });
    setIsAddingSubscription(true);
    setIsEditingSubscription(false);
  };

  const handleEditSubscription = (subscription: any) => {
    setSelectedSubscriptionId(subscription._id);
    setSubscriptionForm({
      userId: subscription.userId,
      productId: subscription.productId,
      startDate: subscription.startDate.split("T")[0],
      endDate: subscription.endDate ? subscription.endDate.split("T")[0] : "",
      dueDate: subscription.dueDate.split("T")[0],
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      seats: subscription.seats,
    });
    setIsEditingSubscription(true);
    setIsAddingSubscription(false);
  };

  const handleSaveSubscription = async () => {
    try {
      if (isEditingSubscription && selectedSubscriptionId) {
        await updateSubscription({
          subscriptionId: selectedSubscriptionId,
          startDate: new Date(subscriptionForm.startDate).toISOString(),
          endDate: subscriptionForm.endDate ? new Date(subscriptionForm.endDate).toISOString() : null,
          dueDate: new Date(subscriptionForm.dueDate).toISOString(),
          stripeSubscriptionId: subscriptionForm.stripeSubscriptionId,
          seats: subscriptionForm.seats,
        });
      } else {
        if (!subscriptionForm.userId || !subscriptionForm.productId) {
          alert("Please select a user and product");
          return;
        }
        await createSubscription({
          userId: subscriptionForm.userId as Id<"users">,
          garageId,
          productId: subscriptionForm.productId as Id<"products">,
          startDate: new Date(subscriptionForm.startDate).toISOString(),
          endDate: subscriptionForm.endDate ? new Date(subscriptionForm.endDate).toISOString() : null,
          dueDate: new Date(subscriptionForm.dueDate).toISOString(),
          stripeSubscriptionId: subscriptionForm.stripeSubscriptionId,
          seats: subscriptionForm.seats,
        });
      }
      setIsAddingSubscription(false);
      setIsEditingSubscription(false);
      setSelectedSubscriptionId(null);
    } catch (error) {
      alert("Failed to save subscription: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteSubscription = async (subscriptionId: Id<"subscriptions">) => {
    if (confirm("Delete this subscription?")) {
      try {
        await deleteSubscription({ subscriptionId });
        if (selectedSubscriptionId === subscriptionId) {
          setSelectedSubscriptionId(null);
        }
      } catch (error) {
        alert("Failed to delete: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const handleCancelSubscriptionEdit = () => {
    setIsAddingSubscription(false);
    setIsEditingSubscription(false);
    setSelectedSubscriptionId(null);
  };

  const isActive = (subscription: any) => {
    return subscription.endDate === null || new Date(subscription.endDate) > new Date();
  };

  if (!garage || !subscriptions || !users || !products) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subscriptions</CardTitle>
                <CardDescription>{subscriptions.length} total subscriptions</CardDescription>
              </div>
              <Button onClick={handleAddSubscription} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No subscriptions yet</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((subscription) => {
                  const active = isActive(subscription);
                  return (
                    <div
                      key={subscription._id}
                      className={`border rounded-lg p-4 transition-all ${
                        selectedSubscriptionId === subscription._id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <h4 className={`font-semibold ${!active ? "line-through text-gray-400" : ""}`}>
                              {subscription.user?.firstName} {subscription.user?.lastName}
                            </h4>
                            <Badge
                              hidden={active}
                              variant={active ? "default" : "secondary"}
                              className={`text-xs ${active ? "bg-blue-500 hover:bg-blue-600" : ""}`}
                            >
                              {active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Product: {subscription.product?.name}</p>
                            <p>Seats: {subscription.seats}</p>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <p>
                                Start: {new Date(subscription.startDate).toLocaleDateString()}
                              </p>
                            </div>
                            {subscription.endDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <p>
                                  End: {new Date(subscription.endDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <p>
                                Due: {new Date(subscription.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            {subscription.stripeSubscriptionId && (
                              <p className="text-xs text-gray-500">
                                Stripe: {subscription.stripeSubscriptionId}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSubscription(subscription)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSubscription(subscription._id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Subscription Modal */}
      <Dialog
        open={isAddingSubscription || isEditingSubscription}
        onOpenChange={(open) => !open && handleCancelSubscriptionEdit()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditingSubscription ? "Edit Subscription" : "Add New Subscription"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!isEditingSubscription && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="userId">User *</Label>
                  <select
                    id="userId"
                    value={subscriptionForm.userId}
                    onChange={(e) =>
                      setSubscriptionForm({ ...subscriptionForm, userId: e.target.value as Id<"users"> | "" })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a user</option>
                    {users?.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="productId">Product *</Label>
                  <select
                    id="productId"
                    value={subscriptionForm.productId}
                    onChange={(e) =>
                      setSubscriptionForm({ ...subscriptionForm, productId: e.target.value as Id<"products"> | "" })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a product</option>
                    {products?.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={subscriptionForm.startDate}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={subscriptionForm.endDate}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={subscriptionForm.dueDate}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, dueDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seats">Seats *</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  value={subscriptionForm.seats}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, seats: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stripeSubscriptionId">Stripe Subscription ID *</Label>
              <Input
                id="stripeSubscriptionId"
                value={subscriptionForm.stripeSubscriptionId}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, stripeSubscriptionId: e.target.value })}
                placeholder="sub_..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelSubscriptionEdit}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSubscription}
                disabled={
                  !subscriptionForm.startDate ||
                  !subscriptionForm.dueDate ||
                  !subscriptionForm.stripeSubscriptionId ||
                  (!isEditingSubscription && (!subscriptionForm.userId || !subscriptionForm.productId))
                }
              >
                {isEditingSubscription ? "Update Subscription" : "Create Subscription"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

