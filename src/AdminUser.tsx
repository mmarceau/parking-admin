import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from "lucide-react";

export default function AdminUser({
  userId,
  onBack,
}: {
  userId: Id<"users">;
  onBack: () => void;
}) {
  const allUsers = useQuery(api.admin.getAllUsers);
  const userSubscriptions = useQuery(api.admin.getUserSubscriptionsWithDetails, { userId });
  
  const user = allUsers?.find((u) => u._id === userId);
  
  if (!user || !userSubscriptions) {
    return (
      <div className="p-8">
        <div className="text-center py-8">Loading user details...</div>
      </div>
    );
  }

  // Group subscriptions by garage
  const subscriptionsByGarage = userSubscriptions.reduce((acc, sub) => {
    const garageName = sub.garage?.name || "Unknown Garage";
    if (!acc[garageName]) {
      acc[garageName] = [];
    }
    acc[garageName].push(sub);
    return acc;
  }, {} as Record<string, typeof userSubscriptions>);
  
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        {/* User Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {user.firstName} {user.lastName}
                </CardTitle>
                <CardDescription className="mt-2 space-y-1">
                  {user.email && (
                    <p className="flex items-center text-base">
                      <Mail className="h-4 w-4 mr-2" />
                      {user.email}
                    </p>
                  )}
                  {user.phone && (
                    <p className="flex items-center text-base">
                      <Phone className="h-4 w-4 mr-2" />
                      {user.phone}
                    </p>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900">{user.stats.totalSubscriptions}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">{user.stats.activeSubscriptions}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Inactive</p>
                <p className="text-3xl font-bold text-red-600">
                  {user.stats.totalSubscriptions - user.stats.activeSubscriptions}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Roles</p>
                <p className="text-3xl font-bold text-blue-600">{user.stats.roles}</p>
              </div>
            </div>
            {user.stripeUserId && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Stripe Customer ID:</span> {user.stripeUserId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions by Garage */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>
              All subscriptions for this user across all garages ({userSubscriptions.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userSubscriptions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No subscriptions found</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(subscriptionsByGarage).map(([garageName, subs]) => (
                  <div key={garageName} className="space-y-3">
                    <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      {garageName}
                    </h3>
                    
                    {subs.map((subscription) => {
                      const isActive = subscription.endDate === null || new Date(subscription.endDate) > new Date();
                      return (
                        <div
                          key={subscription._id}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {subscription.product?.name || "Unknown Product"}
                                </h4>
                                <Badge variant={isActive ? "default" : "secondary"}>
                                  {isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>
                                  <span className="font-medium">Seats:</span> {subscription.seats}
                                </p>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <p>
                                    <span className="font-medium">Start:</span>{" "}
                                    {new Date(subscription.startDate).toLocaleDateString()}
                                  </p>
                                </div>
                                {subscription.endDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <p>
                                      <span className="font-medium">End:</span>{" "}
                                      {new Date(subscription.endDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                                {subscription.stripeSubscriptionId && (
                                  <p className="text-xs text-gray-400 mt-2">
                                    Stripe: {subscription.stripeSubscriptionId}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

