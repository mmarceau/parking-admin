import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Edit2, Trash2, DollarSign } from "lucide-react";

export default function ProductManagementPage({
  garageId,
  onBack,
}: {
  garageId: Id<"garages">;
  onBack: () => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<Id<"productPrices"> | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    isActive: true,
    type: "monthly",
    availableSeats: 1,
    stripeProductId: "",
  });

  const [priceForm, setPriceForm] = useState({
    name: "",
    amount: 0,
    isActive: true,
    isPublic: true,
    stripePriceId: "",
  });

  // Queries
  const garage = useQuery(api.admin.getAllGarages)?.find((g) => g._id === garageId);
  const products = useQuery(api.admin.getGarageProducts, { garageId });
  const prices = useQuery(
    api.admin.getProductPrices,
    selectedProductId ? { productId: selectedProductId } : "skip"
  );

  // Mutations
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const deleteProduct = useMutation(api.admin.deleteProduct);
  const createPrice = useMutation(api.admin.createProductPrice);
  const updatePrice = useMutation(api.admin.updateProductPrice);
  const deletePrice = useMutation(api.admin.deleteProductPrice);

  // Product handlers
  const handleAddProduct = () => {
    setProductForm({
      name: "",
      isActive: true,
      type: "monthly",
      availableSeats: 1,
      stripeProductId: "",
    });
    setIsAddingProduct(true);
    setIsEditingProduct(false);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProductId(product._id);
    setProductForm({
      name: product.name,
      isActive: product.isActive,
      type: product.type,
      availableSeats: product.availableSeats,
      stripeProductId: product.stripeProductId || "",
    });
    setIsEditingProduct(true);
    setIsAddingProduct(false);
  };

  const handleSaveProduct = async () => {
    try {
      if (isEditingProduct && selectedProductId) {
        await updateProduct({
          productId: selectedProductId,
          ...productForm,
          stripeProductId: productForm.stripeProductId || undefined,
        });
      } else {
        await createProduct({
          garageId,
          ...productForm,
          stripeProductId: productForm.stripeProductId || undefined,
        });
      }
      setIsAddingProduct(false);
      setIsEditingProduct(false);
      setSelectedProductId(null);
    } catch (error) {
      alert("Failed to save product: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteProduct = async (productId: Id<"products">) => {
    if (confirm("Delete this product? This will also delete all associated prices.")) {
      try {
        await deleteProduct({ productId });
        if (selectedProductId === productId) {
          setSelectedProductId(null);
        }
      } catch (error) {
        alert("Failed to delete: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const handleCancelProductEdit = () => {
    setIsAddingProduct(false);
    setIsEditingProduct(false);
    setSelectedProductId(null);
  };

  // Price handlers
  const handleAddPrice = () => {
    setPriceForm({
      name: "",
      amount: 0,
      isActive: true,
      isPublic: true,
      stripePriceId: "",
    });
    setIsAddingPrice(true);
    setIsEditingPrice(false);
    setEditingPriceId(null);
  };

  const handleEditPrice = (price: any) => {
    setPriceForm({
      name: price.name,
      amount: price.amount,
      isActive: price.isActive,
      isPublic: price.isPublic,
      stripePriceId: price.stripePriceId || "",
    });
    setIsEditingPrice(true);
    setIsAddingPrice(false);
    setEditingPriceId(price._id);
  };

  const handleSavePrice = async () => {
    if (!selectedProductId) return;

    try {
      if (isEditingPrice && editingPriceId) {
        await updatePrice({
          priceId: editingPriceId,
          ...priceForm,
          stripePriceId: priceForm.stripePriceId || undefined,
        });
      } else {
        await createPrice({
          productId: selectedProductId,
          ...priceForm,
          stripePriceId: priceForm.stripePriceId || undefined,
        });
      }
      setIsAddingPrice(false);
      setIsEditingPrice(false);
      setEditingPriceId(null);
    } catch (error) {
      alert("Failed to save price: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeletePrice = async (priceId: Id<"productPrices">) => {
    if (confirm("Delete this price?")) {
      try {
        await deletePrice({ priceId });
      } catch (error) {
        alert("Failed to delete: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const handleCancelPriceEdit = () => {
    setIsAddingPrice(false);
    setIsEditingPrice(false);
    setEditingPriceId(null);
  };

  const selectedProduct = products?.find((p) => p._id === selectedProductId);

  if (!garage || !products) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
                  <p className="text-sm text-gray-500 mt-1">{garage.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Products */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>{products.length} total products</CardDescription>
                  </div>
                  <Button onClick={handleAddProduct} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {products.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No products yet</p>
                ) : (
                  products.map((product) => (
                    <div
                      key={product._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedProductId === product._id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => setSelectedProductId(product._id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{product.name}</h4>
                            <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                              {product.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Type: {product.type}</p>
                            <p>Seats: {product.availableSeats}</p>
                            {product.stripeProductId && (
                              <p className="text-xs text-gray-500">Stripe: {product.stripeProductId}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProduct(product);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(product._id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Product Form */}
            {(isAddingProduct || isEditingProduct) && (
              <Card>
                <CardHeader>
                  <CardTitle>{isEditingProduct ? "Edit Product" : "Add New Product"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="e.g., Monthly Unlimited Pass"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="type">Type *</Label>
                    <Input
                      id="type"
                      value={productForm.type}
                      onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                      placeholder="e.g., monthly, daily, annual"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="seats">Available Seats *</Label>
                      <Input
                        id="seats"
                        type="number"
                        min="1"
                        value={productForm.availableSeats}
                        onChange={(e) =>
                          setProductForm({ ...productForm, availableSeats: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status *</Label>
                      <select
                        id="status"
                        value={productForm.isActive ? "true" : "false"}
                        onChange={(e) => setProductForm({ ...productForm, isActive: e.target.value === "true" })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="stripeProductId">Stripe Product ID (Optional)</Label>
                    <Input
                      id="stripeProductId"
                      value={productForm.stripeProductId}
                      onChange={(e) => setProductForm({ ...productForm, stripeProductId: e.target.value })}
                      placeholder="prod_..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveProduct} disabled={!productForm.name || !productForm.type}>
                      {isEditingProduct ? "Update Product" : "Create Product"}
                    </Button>
                    <Button variant="outline" onClick={handleCancelProductEdit}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Prices */}
          <div className="space-y-4">
            {selectedProduct ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Prices for {selectedProduct.name}</CardTitle>
                        <CardDescription>{prices?.length || 0} pricing options</CardDescription>
                      </div>
                      <Button onClick={handleAddPrice} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Price
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!prices || prices.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No prices yet</p>
                    ) : (
                      prices.map((price) => (
                        <div key={price._id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{price.name}</h4>
                                <Badge variant={price.isActive ? "default" : "secondary"} className="text-xs">
                                  {price.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant={price.isPublic ? "default" : "outline"} className="text-xs">
                                  {price.isPublic ? "Public" : "Private"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-2">
                                <DollarSign className="h-5 w-5" />
                                {(price.amount / 100).toFixed(2)}
                              </div>
                              {price.stripePriceId && (
                                <p className="text-xs text-gray-500">Stripe: {price.stripePriceId}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditPrice(price)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeletePrice(price._id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Price Form */}
                {(isAddingPrice || isEditingPrice) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{isEditingPrice ? "Edit Price" : "Add New Price"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="priceName">Price Name *</Label>
                        <Input
                          id="priceName"
                          value={priceForm.name}
                          onChange={(e) => setPriceForm({ ...priceForm, name: e.target.value })}
                          placeholder="e.g., Monthly, Annual, Weekend"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount (in cents) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          value={priceForm.amount}
                          onChange={(e) => setPriceForm({ ...priceForm, amount: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 5000 for $50.00"
                        />
                        <p className="text-xs text-gray-500">Preview: ${(priceForm.amount / 100).toFixed(2)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="priceStatus">Status *</Label>
                          <select
                            id="priceStatus"
                            value={priceForm.isActive ? "true" : "false"}
                            onChange={(e) => setPriceForm({ ...priceForm, isActive: e.target.value === "true" })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="visibility">Visibility *</Label>
                          <select
                            id="visibility"
                            value={priceForm.isPublic ? "true" : "false"}
                            onChange={(e) => setPriceForm({ ...priceForm, isPublic: e.target.value === "true" })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="true">Public</option>
                            <option value="false">Private</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="stripePriceId">Stripe Price ID (Optional)</Label>
                        <Input
                          id="stripePriceId"
                          value={priceForm.stripePriceId}
                          onChange={(e) => setPriceForm({ ...priceForm, stripePriceId: e.target.value })}
                          placeholder="price_..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSavePrice}
                          disabled={!priceForm.name || priceForm.amount <= 0}
                        >
                          {isEditingPrice ? "Update Price" : "Create Price"}
                        </Button>
                        <Button variant="outline" onClick={handleCancelPriceEdit}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-gray-500">Select a product to manage its prices</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

