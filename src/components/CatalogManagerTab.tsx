import React, { useState, useMemo, useRef } from "react";
import { DB } from "../db";
import { GROCERY_ITEMS, ELECTRONICS, CONSTRUCTION } from "../data";
import { PRODUCT_IMAGES } from "../productImages";
import { SafeImage } from "./SafeImage";
import { resizeImageToThumbnail } from "../lib/imageUtils";
import { 
  Search, Plus, Trash2, Edit2, RotateCcw, Upload, X, Check, 
  Package, Tag, Filter, CheckCircle2, AlertCircle, ShoppingBag, 
  Layers, MapPin, DollarSign, Image as ImageIcon
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  cat?: string;
  category?: string;
  img?: string;
  section?: string;
  location?: string;
  activeSelling?: boolean;
}

interface CatalogManagerTabProps {
  user: any;
  notify: (msg: string, type?: "ok" | "err") => void;
  customCatalog: any;
  syncDBKey: (key: string, data: any) => Promise<void>;
  handleRoleAction: (actionType: string, description: string, payload: any, executeDirectly: () => Promise<void> | void) => Promise<void>;
  pendingApprovals: any[];
}

export default function CatalogManagerTab({
  user,
  notify,
  customCatalog,
  syncDBKey,
  handleRoleAction,
  pendingApprovals
}: CatalogManagerTabProps) {
  // Tabs & filters
  const [activeSection, setActiveSection] = useState<"all" | "groceries" | "electronics" | "construction">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "removed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formSection, setFormSection] = useState<"groceries" | "electronics" | "construction">("groceries");
  const [formCategory, setFormCategory] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formImgUrl, setFormImgUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combine and override products
  const allResolvedProducts = useMemo(() => {
    // 1. Compile base hardcoded products
    const groceries = GROCERY_ITEMS.map(p => ({ ...p, section: "groceries" }));
    const electronics = ELECTRONICS.map(p => ({ ...p, section: "electronics" }));
    const construction = CONSTRUCTION.map(p => ({ ...p, section: "construction" }));
    
    const baseList: Product[] = [...groceries, ...electronics, ...construction];

    // 2. Resolve hardcoded items with overrides
    const resolvedBase = baseList.map(p => {
      const override = customCatalog[p.id];
      if (override) {
        return {
          ...p,
          price: typeof override.price === "number" ? override.price : p.price,
          img: override.img || p.img,
          name: override.name || p.name,
          activeSelling: override.activeSelling !== false
        };
      }
      return { ...p, activeSelling: true };
    });

    // 3. Include custom added products
    const customAdded = (customCatalog.addedProducts || []).map((p: any) => {
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        cat: p.cat || p.category || "General",
        category: p.cat || p.category || "General",
        img: p.img,
        section: p.section || "groceries",
        location: p.location || "Sourced from Local Market",
        activeSelling: p.activeSelling !== false
      };
    }).filter(Boolean) as Product[];

    return [...resolvedBase, ...customAdded];
  }, [customCatalog]);

  // Filter products based on inputs
  const filteredProducts = useMemo(() => {
    return allResolvedProducts.filter(p => {
      // Section filter
      if (activeSection !== "all" && p.section !== activeSection) return false;

      // Status filter
      if (statusFilter === "active" && !p.activeSelling) return false;
      if (statusFilter === "removed" && p.activeSelling) return false;

      // Search query filter
      if (searchQuery.trim() !== "") {
        const query = (searchQuery || "").toLowerCase();
        const nameMatch = (p.name || "").toLowerCase().includes(query);
        const catMatch = (p.cat || p.category || "").toLowerCase().includes(query);
        const idMatch = (p.id || "").toLowerCase().includes(query);
        if (!nameMatch && !catMatch && !idMatch) return false;
      }

      return true;
    });
  }, [allResolvedProducts, activeSection, statusFilter, searchQuery]);

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const resizedBase64 = await resizeImageToThumbnail(file, 400, 0.75);
      setFormImgUrl(resizedBase64);
      notify("📸 Image compressed and loaded as local asset thumbnail!", "ok");
    } catch (err) {
      console.error(err);
      notify("Failed to compress or upload image file.", "err");
    } finally {
      setIsUploading(false);
    }
  };

  // Pre-fill fields for adding
  const openAddModal = () => {
    setFormName("");
    setFormPrice("");
    setFormSection("groceries");
    setFormCategory("Staples");
    setFormLocation("Tarkwa Central Market");
    setFormImgUrl("");
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  // Pre-fill fields for editing
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormSection((p.section as any) || "groceries");
    setFormCategory(p.cat || p.category || "");
    setFormLocation(p.location || "Local Source");
    setFormImgUrl(p.img || "");
    setIsAddModalOpen(true);
  };

  // Execute Direct modifications (Primary Admins only)
  const handleAddProductDirectly = async (newProd: any) => {
    const updated = { ...customCatalog };
    const added = updated.addedProducts || [];
    updated.addedProducts = [
      ...added.filter((p: any) => p && p.id !== newProd.id),
      newProd
    ];
    await syncDBKey("elx_custom_catalog", updated);
  };

  const handleUpdateProductDirectly = async (productId: string, updates: any) => {
    const updated = { ...customCatalog };
    if (productId.startsWith("cust-")) {
      const added = updated.addedProducts || [];
      updated.addedProducts = added.map((p: any) => {
        if (p.id === productId) {
          return { ...p, ...updates };
        }
        return p;
      });
    } else {
      const existing = updated[productId] || {};
      updated[productId] = {
        ...existing,
        ...updates
      };
    }
    await syncDBKey("elx_custom_catalog", updated);
  };

  // Handle Form Submission (Add or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice.trim()) {
      notify("Please fill in the Name and Price fields.", "err");
      return;
    }

    const priceNum = Math.round(Number(formPrice));
    if (isNaN(priceNum) || priceNum <= 0) {
      notify("Please enter a valid numeric price.", "err");
      return;
    }

    const finalImg = formImgUrl.trim() || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";

    if (editingProduct) {
      // UPDATE PRODUCT
      const productId = editingProduct.id;
      const updates = {
        name: formName.trim(),
        price: priceNum,
        img: finalImg,
        cat: formCategory.trim() || undefined,
        location: formLocation.trim() || undefined
      };

      const actionType = "UPDATE_CATALOG_PRODUCT";
      const description = `Modify product details for "${editingProduct.name}" (ID: ${productId})`;
      const payload = { productId, updates };

      try {
        await handleRoleAction(actionType, description, payload, async () => {
          await handleUpdateProductDirectly(productId, updates);
          notify(`Product "${formName}" updated successfully!`, "ok");
        });
        setIsAddModalOpen(false);
      } catch (err) {
        notify("Failed to apply product updates.", "err");
      }

    } else {
      // ADD NEW PRODUCT
      const newId = "cust-" + Date.now() + Math.floor(Math.random() * 100);
      const newProd = {
        id: newId,
        name: formName.trim(),
        price: priceNum,
        cat: formCategory.trim() || "Staples",
        section: formSection,
        img: finalImg,
        location: formLocation.trim() || "Local Market",
        activeSelling: true
      };

      const actionType = "ADD_CATALOG_PRODUCT";
      const description = `Add new product "${newProd.name}" under ${newProd.section}`;
      const payload = { product: newProd, section: formSection };

      try {
        await handleRoleAction(actionType, description, payload, async () => {
          await handleAddProductDirectly(newProd);
          notify(`New product "${newProd.name}" added successfully!`, "ok");
        });
        setIsAddModalOpen(false);
      } catch (err) {
        notify("Failed to add new product.", "err");
      }
    }
  };

  // Remove/Delete Product
  const handleRemoveProduct = async (p: Product) => {
    const actionType = "UPDATE_CATALOG_PRODUCT";
    const description = `Deactivate/remove product "${p.name}" from catalog`;
    const payload = { productId: p.id, updates: { activeSelling: false } };

    try {
      await handleRoleAction(actionType, description, payload, async () => {
        await handleUpdateProductDirectly(p.id, { activeSelling: false });
        notify(`Product "${p.name}" removed from catalog successfully!`, "ok");
      });
    } catch (err) {
      notify("Failed to remove product.", "err");
    }
  };

  // Restore/Reactivate Product
  const handleRestoreProduct = async (p: Product) => {
    const actionType = "UPDATE_CATALOG_PRODUCT";
    const description = `Reactivate/restore product "${p.name}" to active selling`;
    const payload = { productId: p.id, updates: { activeSelling: true } };

    try {
      await handleRoleAction(actionType, description, payload, async () => {
        await handleUpdateProductDirectly(p.id, { activeSelling: true });
        notify(`Product "${p.name}" restored to catalog!`, "ok");
      });
    } catch (err) {
      notify("Failed to restore product.", "err");
    }
  };

  return (
    <div className="bg-[#1f2937] p-5 rounded-2xl shadow-xl border border-gray-700/60 text-white">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-emerald-400">
            <Package size={22} />
            Unified Catalog Inventory Manager
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Browse, search, edit, add, and remove items across all department catalogs dynamically.
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-emerald-950/20 transition duration-150 flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Add Custom Catalog Product
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search items by name, ID or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Section Filters */}
        <div className="lg:col-span-5 flex items-center gap-1.5 bg-gray-800 p-1 rounded-xl border border-gray-700 overflow-x-auto">
          {[
            { id: "all", l: "📁 All Departments" },
            { id: "groceries", l: "🥬 Groceries" },
            { id: "electronics", l: "🔌 Electronics" },
            { id: "construction", l: "🧱 Construction" }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeSection === s.id 
                  ? "bg-emerald-500 text-white shadow-md" 
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="lg:col-span-3 flex items-center gap-1.5 bg-gray-800 p-1 rounded-xl border border-gray-700">
          {[
            { id: "all", l: "All" },
            { id: "active", l: "Active Selling" },
            { id: "removed", l: "Hidden/Removed" }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === st.id 
                  ? "bg-gray-700 text-emerald-400 shadow-inner" 
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {st.l}
            </button>
          ))}
        </div>
      </div>

      {/* COMPLIANCE WARNING IF ROLE IS NOT PRIMARY ADMIN */}
      {user?.role && user.role !== "primary_admin" && (
        <div className="bg-amber-950/40 border border-amber-800/60 p-3.5 rounded-xl mb-6 flex items-start gap-2.5 text-amber-200">
          <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Staff Role Authorization Queue:</span> As a <span className="underline decoration-amber-400 font-bold">{user.role}</span>, 
            your catalog updates (name edits, price modifications, deletions, or new additions) will be dispatched as proposals to the **Primary Admin Approvals Queue** before applying permanently.
          </div>
        </div>
      )}

      {/* PRODUCTS DISPLAY LIST */}
      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/80 border-b border-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider">
              <th className="p-4">Item Details</th>
              <th className="p-4">Category / Source</th>
              <th className="p-4">Price</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-sm">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 text-xs">
                  No products matched the active search filters or category.
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => {
                const isCustom = p.id.startsWith("cust-");
                return (
                  <tr key={p.id} className="hover:bg-gray-800/30 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0 border border-gray-700 flex items-center justify-center">
                          <SafeImage src={p.img} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-100 flex items-center gap-1.5">
                            {p.name}
                            {isCustom && (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/55 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tight font-extrabold">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {p.id}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="text-xs text-gray-300 font-semibold flex items-center gap-1">
                        <Tag size={12} className="text-emerald-500" />
                        {p.cat || p.category || "General"}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 uppercase font-semibold">
                        <MapPin size={10} />
                        {p.location || "Tarkwa / Bogoso"}
                      </div>
                    </td>

                    <td className="p-4 font-bold text-gray-200 text-xs">
                      GH₵ {p.price.toFixed(2)}
                    </td>

                    <td className="p-4">
                      {p.activeSelling ? (
                        <span className="bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Active Selling
                        </span>
                      ) : (
                        <span className="bg-red-900/30 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Deactivated / Hidden
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Name & Price"
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition hover:text-emerald-400 cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        
                        {p.activeSelling ? (
                          <button
                            onClick={() => handleRemoveProduct(p)}
                            title="Deactivate Product"
                            className="p-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestoreProduct(p)}
                            title="Reactivate Product"
                            className="p-1.5 bg-gray-800 hover:bg-emerald-900/40 text-gray-400 hover:text-emerald-400 rounded-lg transition cursor-pointer"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1f2937] border border-gray-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-gray-800 p-4 border-b border-gray-700">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-emerald-400">
                <ShoppingBag size={18} />
                {editingProduct ? `Edit Item: ${editingProduct.name}` : "Create Custom Catalog Item"}
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white transition bg-gray-700/50 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              
              {/* Product Name */}
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1.5">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium White Long-Grain Rice (50kg)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600"
                />
              </div>

              {/* Price & Section Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1.5">Price (GH₵) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs font-bold">
                      GH₵
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="180"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full pl-11 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1.5">Department *</label>
                  <select
                    disabled={!!editingProduct}
                    value={formSection}
                    onChange={(e: any) => setFormSection(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="groceries">🥬 Groceries & Staples</option>
                    <option value="electronics">🔌 Electricals & Elx</option>
                    <option value="construction">🧱 Building Materials</option>
                  </select>
                </div>
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1.5">Category Group</label>
                  <input
                    type="text"
                    placeholder="e.g. Staples, Lighting, Cement"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1.5">Sourcing Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Tarkwa Central, Bogoso"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600"
                  />
                </div>
              </div>

              {/* Product Image Selection & Upload */}
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1.5">Product Asset Image</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/... or upload photo"
                      value={formImgUrl}
                      onChange={(e) => setFormImgUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600 font-mono"
                    />
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition cursor-pointer"
                    >
                      <Upload size={14} />
                      Upload
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Thumbnail Preview box */}
                  <div className="flex items-center gap-3 p-2 bg-gray-900/60 rounded-xl border border-gray-800">
                    <div className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden border border-gray-700 flex items-center justify-center shrink-0">
                      <SafeImage src={formImgUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Asset Thumbnail Preview</div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[280px]">
                        {formImgUrl ? (formImgUrl.startsWith("data:") ? "Direct thumbnail base64 image asset" : formImgUrl) : "No custom asset image. Using standard fallback."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer / CTA */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-emerald-900/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? "Uploading..." : editingProduct ? "Apply Modifications" : "Publish Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
