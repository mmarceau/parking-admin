import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";

export default function AdminSubscriptions({
  garageId,
  onBack,
}: {
  garageId: Id<"garages">;
  onBack: () => void;
}) {
  // Queries
  const garage = useQuery(api.admin.getAllGarages)?.find((g) => g._id === garageId);
  const subscriptions = useQuery(api.admin.getGarageSubscriptionsWithDetails, { garageId });
  
  // Actions
  const cancelSubscription = useAction(api.admin.cancelSubscription);

  const handleCancelSubscription = async (subscriptionId: Id<"subscriptions">) => {
    if (confirm("Cancel this subscription? This will set the end date to today.")) {
      try {
        await cancelSubscription({ subscriptionId });
      } catch (error) {
        alert("Failed to cancel: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const isActive = (subscription: any) => {
    return subscription.endDate === null || new Date(subscription.endDate) > new Date();
  };

  if (!garage || !subscriptions) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>{subscriptions.length} total subscriptions</CardDescription>
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
                      className="border rounded-lg p-4 transition-all hover:border-gray-300 hover:shadow-sm"
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
                            {subscription.stripeSubscriptionId && (
                              <p className="text-xs text-gray-500">
                                Stripe: {subscription.stripeSubscriptionId}
                              </p>
                            )}
                          </div>
                        </div>
                        {active && (
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelSubscription(subscription._id)}
                            >
                              Cancel Subscription
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
