import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import AdminProducts from "./AdminProducts";
import AdminSubscriptions from "./AdminSubscriptions";
import AdminUser from "./AdminUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  ArrowLeft,
  Search,
  User
} from "lucide-react";

type View = "admin-selection" | "admin-dashboard" | "product-management" | "subscription-management" | "user-management";

// Search Box Component for Admin Page
function SearchBox() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const users = useQuery(api.admin.getAllUsers);
  const garages = useQuery(api.admin.getAllGarages);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = users?.filter((user) =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredGarages = garages?.filter((garage) =>
    `${garage.name} ${garage.city} ${garage.state}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const hasResults = filteredUsers.length > 0 || filteredGarages.length > 0;
  const showDropdown = isOpen && searchTerm.length > 0;

  const adminId = searchParams.get("adminId");

  return (
    <div ref={searchRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search users or garages..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-4"
        />
      </div>

      {showDropdown && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto shadow-lg z-50">
          <div className="p-2">
            {!hasResults ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No users or garages found
              </div>
            ) : (
              <>
                {filteredUsers.length > 0 && (
                  <div className="mb-3">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Users ({filteredUsers.slice(0, 5).length})
                    </div>
                    {filteredUsers.slice(0, 5).map((user) => (
                      <button
                        key={user._id}
                        onClick={() => {
                          setIsOpen(false);
                          setSearchTerm("");
                          if (adminId) {
                            navigate(`/admin?adminId=${adminId}&userId=${user._id}`);
                          }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {user.email || "No email"}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {user.stats?.activeSubscriptions || 0} subs
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {filteredGarages.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Garages ({filteredGarages.slice(0, 5).length})
                    </div>
                    {filteredGarages.slice(0, 5).map((garage) => (
                      <button
                        key={garage._id}
                        onClick={() => {
                          setIsOpen(false);
                          setSearchTerm("");
                          if (adminId) {
                            navigate(`/admin?adminId=${adminId}&garageId=${garage._id}`);
                          }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{garage.name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {garage.city}, {garage.state}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {garage.stats?.activeSubscriptions || 0} subs
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>("admin-selection");
  const [selectedAdminId, setSelectedAdminId] = useState<Id<"users"> | null>(null);
  const [selectedGarageId, setSelectedGarageId] = useState<Id<"garages"> | null>(null);
  const [productManagementGarageId, setProductManagementGarageId] = useState<Id<"garages"> | null>(null);
  const [subscriptionManagementGarageId, setSubscriptionManagementGarageId] = useState<Id<"garages"> | null>(null);
  const [userManagementUserId, setUserManagementUserId] = useState<Id<"users"> | null>(null);
  
  const users = useQuery(api.admin.getAllUsers);

  // Handle URL parameters on mount and when they change
  useEffect(() => {
    const adminId = searchParams.get("adminId");
    const garageId = searchParams.get("garageId");
    const userId = searchParams.get("userId");
    const view = searchParams.get("view");
    const productGarageId = searchParams.get("productGarageId");
    const subscriptionGarageId = searchParams.get("subscriptionGarageId");
    
    if (adminId) {
      setSelectedAdminId(adminId as Id<"users">);
      if (view === "product-management" && productGarageId) {
        setCurrentView("product-management");
        setProductManagementGarageId(productGarageId as Id<"garages">);
      } else if (view === "subscription-management" && subscriptionGarageId) {
        setCurrentView("subscription-management");
        setSubscriptionManagementGarageId(subscriptionGarageId as Id<"garages">);
      } else if (userId) {
        setCurrentView("user-management");
        setUserManagementUserId(userId as Id<"users">);
      } else if (garageId) {
        setSelectedGarageId(garageId as Id<"garages">);
        setCurrentView("admin-dashboard");
      } else {
        setCurrentView("admin-dashboard");
      }
    }
  }, [searchParams]);

  const handleAdminSelect = (userId: Id<"users">) => {
    setSelectedAdminId(userId);
    setCurrentView("admin-dashboard");
    setSearchParams({ adminId: userId });
  };

  const handleBackToAdminSelection = () => {
    setSelectedAdminId(null);
    setSelectedGarageId(null);
    setCurrentView("admin-selection");
    setSearchParams({});
  };

  const handleGarageSelect = (garageId: Id<"garages">) => {
    setSelectedGarageId(garageId);
    setSearchParams({ adminId: selectedAdminId!, garageId });
  };

  const handleGarageBack = () => {
    setSelectedGarageId(null);
    const params = new URLSearchParams();
    if (selectedAdminId) params.set("adminId", selectedAdminId);
    setSearchParams(params);
  };

  const handleNavigateToProductManagement = (garageId: Id<"garages">) => {
    setProductManagementGarageId(garageId);
    setCurrentView("product-management");
    setSearchParams({ 
      adminId: selectedAdminId!, 
      view: "product-management", 
      productGarageId: garageId 
    });
  };

  const handleBackFromProductManagement = () => {
    setProductManagementGarageId(null);
    setCurrentView("admin-dashboard");
    const params = new URLSearchParams();
    if (selectedAdminId) params.set("adminId", selectedAdminId);
    setSearchParams(params);
  };

  const handleNavigateToSubscriptionManagement = (garageId: Id<"garages">) => {
    setSubscriptionManagementGarageId(garageId);
    setCurrentView("subscription-management");
    setSearchParams({ 
      adminId: selectedAdminId!, 
      view: "subscription-management", 
      subscriptionGarageId: garageId 
    });
  };

  const handleBackFromSubscriptionManagement = () => {
    setSubscriptionManagementGarageId(null);
    setCurrentView("admin-dashboard");
    const params = new URLSearchParams();
    if (selectedAdminId) params.set("adminId", selectedAdminId);
    setSearchParams(params);
  };

  const handleNavigateToUserManagement = (userId: Id<"users">) => {
    setUserManagementUserId(userId);
    setCurrentView("user-management");
    setSearchParams({ 
      adminId: selectedAdminId!, 
      userId: userId 
    });
  };

  const handleBackFromUserManagement = () => {
    setUserManagementUserId(null);
    setCurrentView("admin-dashboard");
    const params = new URLSearchParams();
    if (selectedAdminId) params.set("adminId", selectedAdminId);
    setSearchParams(params);
  };

  const selectedAdmin = users?.find((u) => u._id === selectedAdminId);

  // View 1: Admin Selection
  if (currentView === "admin-selection") {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-600 mt-2">Select an admin user to access the dashboard</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Admin</CardTitle>
              <CardDescription>Choose a user to access admin features</CardDescription>
            </CardHeader>
            <CardContent>
              {!users ? (
                <p className="text-gray-500">Loading users...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleAdminSelect(user._id)}
                      className="p-4 rounded-lg border-2 text-left transition-all border-gray-200 hover:border-indigo-500 hover:bg-indigo-50"
                    >
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{user.email || "No email"}</div>
                      
                      {/* Roles Section */}
                      {user.isSuperAdmin ? (
                        <div className="mb-2 space-y-1">
                          <div className="text-xs text-gray-700">
                            <Badge variant="outline" className="text-xs">
                              All Garages
                            </Badge>
                          </div>
                        </div>
                      ) : user.roles && user.roles.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {user.roles.slice(0, 2).map((role, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              <Badge variant="outline" className="text-xs">
                                {role.roleName} @ {role.garageName}
                              </Badge>
                            </div>
                          ))}
                          {user.roles.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{user.roles.length - 2} more role{user.roles.length - 2 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Garages Section - Only show for regular Admin, not SuperAdmin */}
                      {!user.isSuperAdmin && user.garages && user.garages.length > 0 && (
                        <div className="text-xs text-gray-600 mb-2">
                          {user.garages.length === 1 ? (
                            <span>{user.garages[0].name}</span>
                          ) : (
                            <span>{user.garages.length} garages</span>
                          )}
                        </div>
                      )}
                      
                      {user.isSuperAdmin ? (
                        <Badge className="mt-2 text-xs bg-orange-100 text-orange-700 hover:bg-orange-100">Super Admin</Badge>
                      ) : (
                        <Badge className="mt-2 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Admin</Badge>
                      )}
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

  // View 2: Product Management
  if (currentView === "product-management" && productManagementGarageId) {
    return (
      <AdminProducts 
        garageId={productManagementGarageId}
        onBack={handleBackFromProductManagement}
      />
    );
  }

  // View 3: Subscription Management
  if (currentView === "subscription-management" && subscriptionManagementGarageId) {
    return (
      <AdminSubscriptions 
        garageId={subscriptionManagementGarageId}
        onBack={handleBackFromSubscriptionManagement}
      />
    );
  }

  // View 4: User Management
  if (currentView === "user-management" && userManagementUserId) {
    return (
      <AdminUser 
        userId={userManagementUserId}
        onBack={handleBackFromUserManagement}
      />
    );
  }

  // View 5: Admin Dashboard
  if (currentView === "admin-dashboard") {
    return (
      <div>
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Logged in as: {selectedAdmin?.firstName} {selectedAdmin?.lastName}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="flex-1 max-w-2xl">
                  <SearchBox />
                </div>
                <Badge className="text-sm px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 whitespace-nowrap">Admin Access</Badge>
                <Button variant="outline" onClick={handleBackToAdminSelection}>
                  Change Admin
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Garages View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedGarageId ? (
          <GarageDetail 
            garageId={selectedGarageId} 
            onBack={handleGarageBack}
            onNavigateToProducts={handleNavigateToProductManagement}
            onNavigateToSubscriptions={handleNavigateToSubscriptionManagement}
          />
        ) : (
          <GaragesList 
            onSelectGarage={handleGarageSelect} 
            garageIds={selectedAdmin?.garages?.map(g => g._id) || []}
            onBackToUsers={handleBackToAdminSelection}
            isSuperAdmin={selectedAdmin?.isSuperAdmin || false}
          />
        )}
      </div>
    </div>
    );
  }

  return null;
}

// Garages List Component
function GaragesList({ 
  onSelectGarage, 
  garageIds,
  onBackToUsers,
  isSuperAdmin 
}: { 
  onSelectGarage: (id: Id<"garages">) => void;
  garageIds: Id<"garages">[];
  onBackToUsers: () => void;
  isSuperAdmin: boolean;
}) {
  const garages = useQuery(
    api.admin.getGaragesByIds,
    isSuperAdmin 
      ? { garageIds: [], returnAll: true }
      : garageIds.length > 0 ? { garageIds } : "skip"
  );

  if (!garages) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">Loading garages...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBackToUsers}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Users
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>{isSuperAdmin ? "All Garages" : "Your Garages"}</CardTitle>
          <CardDescription>Click on a garage to view details and manage ({garages.length} total)</CardDescription>
        </CardHeader>
        <CardContent>
        {garages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No garages associated with this user</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {garages.map((garage) => (
              <div
                key={garage._id}
                onClick={() => onSelectGarage(garage._id)}
                className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="mb-2">
                  <h3 className="font-semibold text-lg">{garage.name}</h3>
                </div>
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <p className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {garage.city}, {garage.state}
                  </p>
                  <p className="text-xs">{garage.address1}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs">
                    <span className="text-gray-500">Subscriptions: </span>
                    <span className="font-medium">{garage.stats.totalSubscriptions}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500">Active: </span>
                    <span className="font-medium text-green-600">{garage.stats.activeSubscriptions}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

// Garage Detail Component
function GarageDetail({ 
  garageId, 
  onBack, 
  onNavigateToProducts,
  onNavigateToSubscriptions 
}: { 
  garageId: Id<"garages">; 
  onBack: () => void;
  onNavigateToProducts: (garageId: Id<"garages">) => void;
  onNavigateToSubscriptions: (garageId: Id<"garages">) => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"products" | "subscriptions">("subscriptions");
  const [formData, setFormData] = useState({
    name: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const garageData = useQuery(api.admin.getGarageRelationships, { garageId });
  const subscriptionData = useQuery(api.admin.getGarageSubscriptions, { garageId });
  const allUsers = useQuery(api.admin.getAllUsers);
  const allRoles = useQuery(api.admin.getAllRoles);
  const allProducts = useQuery(api.admin.getAllProducts);
  const updateGarage = useMutation(api.admin.updateGarage);

  if (!garageData || !subscriptionData || !allUsers || !allRoles || !allProducts) {
    return <div className="text-center py-8">Loading garage details...</div>;
  }

  const { garage, stats } = garageData;

  const handleEditClick = () => {
    setFormData({
      name: garage.name,
      address1: garage.address1,
      address2: garage.address2,
      city: garage.city,
      state: garage.state,
      postalCode: garage.postalCode,
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    try {
      await updateGarage({
        garageId,
        ...formData,
      });
      setIsEditOpen(false);
      alert("Garage updated successfully!");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Garages
      </Button>

      {/* Garage Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{garage.name}</CardTitle>
              <CardDescription className="mt-2">
                <div className="space-y-1">
                  <p className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    {garage.address1}
                  </p>
                  {garage.address2 && <p className="text-sm ml-6">{garage.address2}</p>}
                  <p className="text-sm ml-6">
                    {garage.city}, {garage.state} {garage.postalCode}
                  </p>
                </div>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant={currentView === "subscriptions" ? "default" : "outline"}
              onClick={() => setCurrentView("subscriptions")}
            >
              Manage Subscriptions
            </Button>
            <Button 
              variant={currentView === "products" ? "default" : "outline"}
              onClick={() => setCurrentView("products")}
            >
              Manage Products
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conditional Content */}
      {currentView === "products" && (
        <div className="mt-6">
          <AdminProducts 
            garageId={garageId}
            onBack={() => setCurrentView("subscriptions")}
          />
        </div>
      )}

      {currentView === "subscriptions" && (
        <div className="mt-6">
          <AdminSubscriptions 
            garageId={garageId}
            onBack={() => setCurrentView("subscriptions")}
          />
        </div>
      )}



      {/* Edit Garage Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Garage Details</DialogTitle>
            <DialogDescription>
              Update the garage information below
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Garage Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter garage name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address1">Address Line 1</Label>
              <Input
                id="address1"
                value={formData.address1}
                onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                placeholder="Enter street address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                value={formData.address2}
                onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                placeholder="Apt, suite, etc. (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Enter postal code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
