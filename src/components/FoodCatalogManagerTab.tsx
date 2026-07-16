import React, { useState, useEffect, useMemo } from "react";
import { DB } from "../db";
import { FOOD_PLACES } from "../data";
import { SafeImage } from "./SafeImage";
import { 
  Search, Plus, Trash2, Edit2, X, Check, Tag, Filter, CheckCircle2, 
  AlertCircle, MapPin, DollarSign, Utensils, Percent, Sliders, Shield, 
  Settings, CheckSquare, Square, LogOut, RefreshCw, Layers
} from "lucide-react";

interface FoodAddon {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
  category?: string;
}

interface FoodItem {
  id: string;
  item: string;
  price: number;
  description?: string;
  imgUrl?: string;
  enabled?: boolean;
  addons?: FoodAddon[];
}

interface ElextraAddon {
  id: string;
  name: string;
  price: number;
  category: "Extras" | "Protein Options" | string;
  enabled: boolean;
  meals: string[]; // plain_rice, waakye, jollof_rice
}

interface FoodCatalogManagerTabProps {
  user: any;
  notify: (msg: string, type?: "ok" | "err") => void;
  foodPlaces: any[];
  setFoodPlaces: React.Dispatch<React.SetStateAction<any[]>>;
  syncDBKey: (key: string, data: any) => Promise<void>;
  handleRoleAction: (actionType: string, description: string, payload: any, executeDirectly: () => Promise<void> | void) => Promise<void>;
  pendingApprovals: any[];
}

export default function FoodCatalogManagerTab({
  user,
  notify,
  foodPlaces,
  setFoodPlaces,
  syncDBKey,
  handleRoleAction,
  pendingApprovals
}: FoodCatalogManagerTabProps) {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [elextraAddons, setElextraAddons] = useState<ElextraAddon[]>([]);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);

  // Selected eatery for editing: default is "elextra" (if permitted)
  const isSeller = user?.role === "seller";
  const sellerRestId = user?.shopId || user?.restaurantId || "f_abena"; // Default seller restaurant fallback
  const initialRestId = isSeller ? sellerRestId : "elextra";
  const [selectedRestId, setSelectedRestId] = useState<string>(initialRestId);

  useEffect(() => {
    if (isSeller) {
      setSelectedRestId(user?.shopId || user?.restaurantId || "f_abena");
    }
  }, [user]);

  // States for adding/editing dishes
  const [editingDish, setEditingDish] = useState<FoodItem | null>(null);
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [dishForm, setDishForm] = useState({
    id: "",
    item: "",
    price: 15,
    description: "",
    imgUrl: "",
    enabled: true
  });

  // States for Elextra Shared Add-ons
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ElextraAddon | null>(null);
  const [addonForm, setAddonForm] = useState({
    id: "",
    name: "",
    price: 3.0,
    category: "Extras",
    enabled: true,
    meals: [] as string[]
  });

  // States for Dish-specific Add-ons (Non-Elextra)
  const [dishAddonModalOpen, setDishAddonModalOpen] = useState(false);
  const [targetDishForAddon, setTargetDishForAddon] = useState<FoodItem | null>(null);
  const [editingDishAddon, setEditingDishAddon] = useState<FoodAddon | null>(null);
  const [dishAddonForm, setDishAddonForm] = useState({
    id: "",
    name: "",
    price: 0,
    description: "",
    type: "radio" as "radio" | "checkbox",
    section: "CHOOSE AN OPTION",
    required: true,
    enabled: true
  });

  // Restaurant Profile Customizer States
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [storeRating, setStoreRating] = useState<number>(4.5);
  const [storeReviews, setStoreReviews] = useState<string>("500+");
  const [storeDelFee, setStoreDelFee] = useState<string>("GHS 5.00");
  const [storeDelTime, setStoreDelTime] = useState<string>("20-40 min");
  const [storePromos, setStorePromos] = useState<string>("");
  const [storeType, setStoreType] = useState<string>("");
  const [storeHours, setStoreHours] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");
  const [storeImgUrl, setStoreImgUrl] = useState<string>("");
  const [storeGmapsUrl, setStoreGmapsUrl] = useState<string>("");

  // Category Filter Manager States
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🍽️");

  // Search filtering
  const [searchQuery, setSearchQuery] = useState("");

  // Load state from DB
  const loadManagerData = async () => {
    try {
      const storedFP = await DB.get("elx_food_places") || FOOD_PLACES;
      setRestaurants(storedFP);
      if (setFoodPlaces) setFoodPlaces(storedFP);

      const storedAddons = await DB.get("elx_elextra_addons") || [];
      setElextraAddons(storedAddons);

      const storedLogs = await DB.get("elx_food_change_history") || [];
      setChangeHistory(storedLogs);

      const storedCats = await DB.get("elx_food_categories") || [];
      setCategories(storedCats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadManagerData();

    // Listen for real-time DB sync
    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_food_places") {
        setRestaurants(value || []);
      } else if (key === "elx_elextra_addons") {
        setElextraAddons(value || []);
      } else if (key === "elx_food_change_history") {
        setChangeHistory(value || []);
      } else if (key === "elx_food_categories") {
        setCategories(value || []);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
    };
  }, []);

  // Helper to append a history audit log
  const appendAuditLog = async (actionDesc: string) => {
    const newLog = {
      id: "LOG-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: user?.name || "System",
      role: user?.role || "admin",
      action: actionDesc
    };
    const updatedLogs = [newLog, ...changeHistory];
    setChangeHistory(updatedLogs);
    await syncDBKey("elx_food_change_history", updatedLogs);
  };

  // Find currently active restaurant object
  const activeRestaurant = useMemo(() => {
    return restaurants.find(r => r.id === selectedRestId) || null;
  }, [restaurants, selectedRestId]);

  // Determine current editing privilege level
  const hasDirectEditPrivilege = useMemo(() => {
    return user?.role === "primary_admin" || user?.role === "sub_admin";
  }, [user]);

  // Sync state fields when selectedRestId or activeRestaurant changes
  useEffect(() => {
    if (activeRestaurant) {
      setStoreRating(activeRestaurant.rating || 4.5);
      setStoreReviews(activeRestaurant.reviewsCount !== undefined ? String(activeRestaurant.reviewsCount) : "500+");
      setStoreDelFee(activeRestaurant.deliveryFee || "GHS 5.00");
      setStoreDelTime(activeRestaurant.deliveryTime || "20-40 min");
      setStorePromos(activeRestaurant.promos ? activeRestaurant.promos.join(", ") : "20% off everything, Up to 45% off selected");
      setStoreType(activeRestaurant.type || "");
      setStoreHours(activeRestaurant.hours || "");
      setStoreName(activeRestaurant.name || "");
      setStoreImgUrl(activeRestaurant.imgUrl || "");
      setStoreGmapsUrl(activeRestaurant.googleMapsUrl || "");
    }
  }, [activeRestaurant]);

  // Save changes to the active restaurant's general details
  const saveStoreProfile = async () => {
    if (!activeRestaurant) return;

    const parsedPromos = storePromos.split(",").map(p => p.trim()).filter(Boolean);
    const reviewsVal = String(storeReviews).trim() || "500+";
    const parsedReviews = isNaN(Number(reviewsVal)) ? reviewsVal : Number(reviewsVal);

    const updates = {
      name: String(storeName || "").trim() || activeRestaurant.name,
      rating: Number(storeRating) || 4.5,
      reviewsCount: parsedReviews,
      deliveryFee: String(storeDelFee || "").trim() || "GHS 5.00",
      deliveryTime: String(storeDelTime || "").trim() || "20-40 min",
      promos: parsedPromos,
      type: String(storeType || "").trim() || activeRestaurant.type,
      hours: String(storeHours || "").trim() || activeRestaurant.hours,
      imgUrl: String(storeImgUrl || "").trim() || activeRestaurant.imgUrl,
      googleMapsUrl: String(storeGmapsUrl || "").trim() || activeRestaurant.googleMapsUrl
    };

    const actionDesc = `Update details for restaurant "${activeRestaurant.name}"`;
    const payload = {
      restaurantId: activeRestaurant.id,
      ...updates
    };

    const directAction = async () => {
      const updatedPlaces = restaurants.map(p => {
        if (p.id === activeRestaurant.id) {
          return { ...p, ...updates };
        }
        return p;
      });

      await syncDBKey("elx_food_places", updatedPlaces);
      setRestaurants(updatedPlaces);
      if (setFoodPlaces) setFoodPlaces(updatedPlaces);

      await appendAuditLog(`[Direct] Updated restaurant details for "${activeRestaurant.name}"`);
      notify("Store profile updated successfully!", "ok");
    };

    if (hasDirectEditPrivilege) {
      await directAction();
    } else {
      await handleRoleAction("CUSTOMIZE_REST", actionDesc, payload, directAction);
      notify("Submitted store details update proposal for Admin authorization.", "ok");
    }
  };

  // Add a new food marketplace category filter
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const nextCat = { name: newCatName.trim(), icon: newCatIcon.trim() };
    const updated = [...categories, nextCat];

    const actionDesc = `Add new food marketplace category filter "${nextCat.name}"`;
    const payload = { categories: updated };

    const directAction = async () => {
      await syncDBKey("elx_food_categories", updated);
      setCategories(updated);
      notify(`Added category "${nextCat.name}" successfully!`, "ok");
    };

    if (hasDirectEditPrivilege) {
      await directAction();
    } else {
      await handleRoleAction("UPDATE_MARKETPLACE_CATEGORIES", actionDesc, payload, directAction);
      notify("Submitted category filter proposal for Admin approval.", "ok");
    }
    setNewCatName("");
  };

  // Remove a food marketplace category filter
  const handleRemoveCategory = async (catName: string) => {
    const updated = categories.filter(c => c.name !== catName);
    const actionDesc = `Remove food category filter "${catName}"`;
    const payload = { categories: updated };

    const directAction = async () => {
      await syncDBKey("elx_food_categories", updated);
      setCategories(updated);
      notify(`Removed category "${catName}" successfully!`, "ok");
    };

    if (hasDirectEditPrivilege) {
      await directAction();
    } else {
      await handleRoleAction("UPDATE_MARKETPLACE_CATEGORIES", actionDesc, payload, directAction);
      notify("Submitted category removal proposal for Admin approval.", "ok");
    }
  };

  // Handle Save Dish (Add / Edit)
  const openDishModal = (dish?: FoodItem) => {
    if (dish) {
      setEditingDish(dish);
      setDishForm({
        id: dish.id,
        item: dish.item,
        price: dish.price,
        description: dish.description || "",
        imgUrl: dish.imgUrl || "",
        enabled: dish.enabled !== false
      });
    } else {
      setEditingDish(null);
      setDishForm({
        id: "dish-" + Date.now(),
        item: "",
        price: 15.0,
        description: "",
        imgUrl: "",
        enabled: true
      });
    }
    setDishModalOpen(true);
  };

  const handleSaveDish = async () => {
    if (!dishForm.item.trim()) {
      notify("Please fill in the dish name.", "err");
      return;
    }

    const isEdit = !!editingDish;
    const actionDesc = isEdit 
      ? `Update dish "${editingDish.item}" in ${activeRestaurant?.name}`
      : `Add new dish "${dishForm.item}" to ${activeRestaurant?.name}`;

    const payload = {
      restaurantId: selectedRestId,
      isEdit,
      dishId: dishForm.id,
      dish: {
        id: dishForm.id,
        item: dishForm.item,
        price: Number(dishForm.price) || 15.0,
        description: dishForm.description,
        imgUrl: dishForm.imgUrl,
        enabled: dishForm.enabled,
        addons: isEdit ? editingDish.addons || [] : []
      }
    };

    const directAction = async () => {
      const updatedPlaces = restaurants.map(p => {
        if (p.id === selectedRestId) {
          let updatedMenu = [...(p.menu || [])];
          if (isEdit) {
            updatedMenu = updatedMenu.map(m => m.id === dishForm.id || m.item === editingDish.item ? { ...m, ...payload.dish } : m);
          } else {
            updatedMenu.push(payload.dish);
          }
          return { ...p, menu: updatedMenu };
        }
        return p;
      });

      await syncDBKey("elx_food_places", updatedPlaces);
      setRestaurants(updatedPlaces);
      if (setFoodPlaces) setFoodPlaces(updatedPlaces);
      
      await appendAuditLog(`[Direct] ${actionDesc} to price GHS ${Number(dishForm.price).toFixed(2)}`);
      notify(`${isEdit ? "Updated" : "Added"} "${dishForm.item}" successfully!`, "ok");
    };

    try {
      if (hasDirectEditPrivilege) {
        await directAction();
      } else {
        // Enforce approval workflow for Sellers and Managers
        await handleRoleAction("UPDATE_FOOD_MENU", actionDesc, payload, directAction);
        notify("Change requested! Submitted to clearances queue for Admin verification.", "ok");
      }
      setDishModalOpen(false);
    } catch (err) {
      notify("Error executing dish save.", "err");
    }
  };

  // Remove Dish entirely
  const handleRemoveDish = async (dish: FoodItem) => {
    if (!confirm(`Are you sure you want to delete "${dish.item}"?`)) return;

    const actionDesc = `Delete dish "${dish.item}" from ${activeRestaurant?.name}`;
    const payload = {
      restaurantId: selectedRestId,
      dishId: dish.id,
      dishName: dish.item
    };

    const directAction = async () => {
      const updatedPlaces = restaurants.map(p => {
        if (p.id === selectedRestId) {
          const updatedMenu = (p.menu || []).filter(m => m.id !== dish.id && m.item !== dish.item);
          return { ...p, menu: updatedMenu };
        }
        return p;
      });

      await syncDBKey("elx_food_places", updatedPlaces);
      setRestaurants(updatedPlaces);
      if (setFoodPlaces) setFoodPlaces(updatedPlaces);

      await appendAuditLog(`[Direct] Deleted dish "${dish.item}" from ${activeRestaurant?.name}`);
      notify(`Deleted "${dish.item}" successfully!`, "ok");
    };

    try {
      if (hasDirectEditPrivilege) {
        await directAction();
      } else {
        await handleRoleAction("REMOVE_FOOD_ITEM", actionDesc, payload, directAction);
        notify("Delete requested! Submitted to clearances queue.", "ok");
      }
    } catch (err) {
      notify("Error executing delete.", "err");
    }
  };

  // Toggle Dish Enabled/Disabled state
  const handleToggleDishEnabled = async (dish: FoodItem) => {
    const nextState = dish.enabled === false; // true if it was false
    const actionDesc = `${nextState ? "Enable" : "Disable"} food item "${dish.item}"`;
    const payload = {
      restaurantId: selectedRestId,
      dishId: dish.id,
      updates: { enabled: nextState }
    };

    const directAction = async () => {
      const updatedPlaces = restaurants.map(p => {
        if (p.id === selectedRestId) {
          const updatedMenu = (p.menu || []).map(m => m.id === dish.id || m.item === dish.item ? { ...m, enabled: nextState } : m);
          return { ...p, menu: updatedMenu };
        }
        return p;
      });

      await syncDBKey("elx_food_places", updatedPlaces);
      setRestaurants(updatedPlaces);
      if (setFoodPlaces) setFoodPlaces(updatedPlaces);

      await appendAuditLog(`[Direct] Toggle enabled status of "${dish.item}" to ${nextState}`);
      notify(`"${dish.item}" is now ${nextState ? "Enabled" : "Disabled"}!`, "ok");
    };

    try {
      if (hasDirectEditPrivilege) {
        await directAction();
      } else {
        await handleRoleAction("TOGGLE_FOOD_ITEM", actionDesc, payload, directAction);
        notify("Toggle status requested! Submitted for Admin review.", "ok");
      }
    } catch (err) {
      notify("Error updating status.", "err");
    }
  };

  // ─── ELEXTRA SHARED ADDON OPERATIONS ──────────────────────────────────────────
  const openAddonModal = (addon?: ElextraAddon) => {
    if (addon) {
      setEditingAddon(addon);
      setAddonForm({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        category: addon.category,
        enabled: addon.enabled,
        meals: addon.meals || []
      });
    } else {
      setEditingAddon(null);
      setAddonForm({
        id: "addon-" + Date.now(),
        name: "",
        price: 3.0,
        category: "Extras",
        enabled: true,
        meals: ["plain_rice", "waakye", "jollof_rice"]
      });
    }
    setAddonModalOpen(true);
  };

  const handleSaveElextraAddon = async () => {
    if (!addonForm.name.trim()) {
      notify("Please fill in the add-on name.", "err");
      return;
    }

    const isEdit = !!editingAddon;
    const actionDesc = isEdit 
      ? `Edit Elextra shared add-on "${editingAddon.name}"`
      : `Create new Elextra shared add-on "${addonForm.name}"`;

    const payload = {
      isEdit,
      addonId: addonForm.id,
      addon: {
        id: addonForm.id,
        name: addonForm.name,
        price: Number(addonForm.price) || 1.0,
        category: addonForm.category,
        enabled: addonForm.enabled,
        meals: addonForm.meals
      }
    };

    const directAction = async () => {
      let updatedAddons = [...elextraAddons];
      if (isEdit) {
        updatedAddons = updatedAddons.map(ad => ad.id === addonForm.id ? { ...ad, ...payload.addon } : ad);
      } else {
        updatedAddons.push(payload.addon);
      }

      await syncDBKey("elx_elextra_addons", updatedAddons);
      setElextraAddons(updatedAddons);

      await appendAuditLog(`[Direct] ${actionDesc} to GHS ${Number(addonForm.price).toFixed(2)}`);
      notify(`Elextra shared add-on saved successfully!`, "ok");
    };

    try {
      if (hasDirectEditPrivilege) {
        await directAction();
      } else {
        await handleRoleAction("UPDATE_ELEXTRA_ADDONS", actionDesc, payload, directAction);
        notify("Change requested! Submitted to clearances queue.", "ok");
      }
      setAddonModalOpen(false);
    } catch (e) {
      notify("Failed to save Elextra shared add-on.", "err");
    }
  };

  const handleRemoveElextraAddon = async (addon: ElextraAddon) => {
    if (!confirm(`Are you sure you want to remove Elextra shared add-on "${addon.name}"?`)) return;

    const actionDesc = `Delete Elextra shared add-on "${addon.name}"`;
    const payload = { addonId: addon.id };

    const directAction = async () => {
      const updatedAddons = elextraAddons.filter(ad => ad.id !== addon.id);
      await syncDBKey("elx_elextra_addons", updatedAddons);
      setElextraAddons(updatedAddons);

      await appendAuditLog(`[Direct] Deleted Elextra shared add-on "${addon.name}"`);
      notify(`Deleted "${addon.name}" successfully!`, "ok");
    };

    try {
      if (hasDirectEditPrivilege) {
        await directAction();
      } else {
        await handleRoleAction("REMOVE_ELEXTRA_ADDON", actionDesc, payload, directAction);
        notify("Delete requested! Submitted to clearances queue.", "ok");
      }
    } catch (err) {
      notify("Failed to delete add-on.", "err");
    }
  };

  // Toggle meal selection inside Elextra Addon Form
  const toggleMealInAddonForm = (mealId: string) => {
    let current = [...addonForm.meals];
    if (current.includes(mealId)) {
      current = current.filter(m => m !== mealId);
    } else {
      current.push(mealId);
    }
    setAddonForm({ ...addonForm, meals: current });
  };

  // ─── NON-ELEXTRA DISH-SPECIFIC ADDON OPERATIONS ──────────────────────────────
  const openDishAddonModal = (dish: FoodItem, addon?: FoodAddon) => {
    setTargetDishForAddon(dish);
    if (addon) {
      setEditingDishAddon(addon);
      setDishAddonForm({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        enabled: addon.enabled !== false
      });
    } else {
      setEditingDishAddon(null);
      setDishAddonForm({
        id: "addon-" + Date.now(),
        name: "",
        price: 2.0,
        enabled: true
      });
    }
    setDishAddonModalOpen(true);
  };

  const handleSaveDishAddon = async () => {
    if (!targetDishForAddon) return;
    if (!dishAddonForm.name.trim()) {
      notify("Please fill in the add-on name.", "err");
      return;
    }

    const isEdit = !!editingDishAddon;
    const actionDesc = isEdit 
      ? `Edit unique add-on "${editingDishAddon.name}" for dish "${targetDishForAddon.item}"`
      : `Create unique add-on "${dishAddonForm.name}" for dish "${targetDishForAddon.item}"`;

    const payload = {
      restaurantId: selectedRestId,
      dishId: targetDishForAddon.id,
      addonId: dishAddonForm.id,
      addon: {
        id: dishAddonForm.id,
        name: dishAddonForm.name,
        price: Number(dishAddonForm.price) || 1.0,
        enabled: dishAddonForm.enabled
      }
    };

    const directAction = async () => {
      const updatedPlaces = restaurants.map(p => {
        if (p.id === selectedRestId) {
          const updatedMenu = (p.menu || []).map(m => {
            if (m.id === targetDishForAddon.id) {
              let currentAddons = [...(m.addons || [])];
              if (isEdit) {
                currentAddons = currentAddons.map(ad => ad.id === dishAddonForm.id ? payload.addon : ad);
              } else {
                currentAddons.push(payload.addon);
              }
              return { ...m, addons: currentAddons };
            }
            return m;
          });
          return { ...p, menu: updatedMenu };
        }
        return p;
      });

      await syncDBKey("elx_food_places", updatedPlaces);
      setRestaurants(updatedPlaces);
      if (setFoodPlaces) setFoodPlaces(updatedPlaces);

      await appendAuditLog(`[Direct] Saved unique add-on "${dishAddonForm.name}" for "${targetDishForAddon.item}"`);
      notify(`Saved add-on successfully!`, "ok");
    };

    try {
      if (hasDirectEditPrivilege) {
        await directAction();
      } else {
        await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
        notify("Change requested! Submitted to clearances queue.", "ok");
      }
      setDishAddonModalOpen(false);
    } catch (err) {
      notify("Error saving unique add-on.", "err");
    }
  };

  const handleRemoveDishAddon = async (dish: FoodItem, addonId: string, addonName: string) => {
    if (!confirm(`Are you sure you want to remove unique add-on "${addonName}"?`)) return;

    const actionDesc = `Delete unique add-on "${addonName}" from dish "${dish.item}"`;
    const payload = {
      restaurantId: selectedRestId,
      dishId: dish.id,
      addonId
    };

    const directAction = async () => {
      const updatedPlaces = restaurants.map(p => {
        if (p.id === selectedRestId) {
          const updatedMenu = (p.menu || []).map(m => {
            if (m.id === dish.id) {
              const currentAddons = (m.addons || []).filter(ad => ad.id !== addonId);
              return { ...m, addons: currentAddons };
            }
            return m;
          });
          return { ...p, menu: updatedMenu };
        }
        return p;
      });

      await syncDBKey("elx_food_places", updatedPlaces);
      setRestaurants(updatedPlaces);
      if (setFoodPlaces) setFoodPlaces(updatedPlaces);

      await appendAuditLog(`[Direct] Deleted unique add-on "${addonName}" from "${dish.item}"`);
      notify(`Deleted add-on successfully!`, "ok");
    };

    try {
      if (hasDirectEditPrivilege) {
        await directAction();
      } else {
        await handleRoleAction("REMOVE_DISH_ADDON", actionDesc, payload, directAction);
        notify("Delete requested! Submitted to clearances queue.", "ok");
      }
    } catch (err) {
      notify("Error deleting unique add-on.", "err");
    }
  };

  return (
    <div className="space-y-6" id="food_catalog_management_advanced_container">
      {/* Header section with credentials overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900 text-white p-6 rounded-2xl shadow-lg gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-sans font-black tracking-tight">Eatery & Menu Operations Manager</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl font-bold">
            Roles: {user?.role?.toUpperCase()} | Manage proprietary ELEXTRA menu/add-ons and partners with fully auditable role-clearances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasDirectEditPrivilege && (
            <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs font-black flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>APPROVAL MODE ENABLED</span>
            </div>
          )}
          <button
            onClick={loadManagerData}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh Catalog Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector and Fast filters */}
      <div className="bg-white p-5 rounded-xl border-2 border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Select Kitchen / Restaurant Registry
          </label>
          {isSeller ? (
            <div className="text-sm font-sans font-black text-slate-800 bg-slate-50 border-2 border-slate-150 px-4 py-2.5 rounded-xl inline-block">
              🔒 {activeRestaurant?.name || sellerRestId}
            </div>
          ) : (
            <select
              value={selectedRestId}
              onChange={(e) => setSelectedRestId(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 focus:border-orange-500 text-slate-800 font-bold text-sm rounded-xl px-4 py-2.5 outline-none transition w-full md:w-80 cursor-pointer"
            >
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.id === "elextra" ? "⭐" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={() => openDishModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-150 shadow-md text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Food Dish</span>
        </button>
      </div>

      {/* Dynamic Store Customization & Marketplace Categories Panel */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-sans font-black text-slate-800 uppercase tracking-wider">
              Configure Restaurant Details & Marketplace Filters
            </h3>
          </div>
          <button
            onClick={() => setShowStoreSettings(!showStoreSettings)}
            className="text-xs font-black text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100/50 border border-orange-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            {showStoreSettings ? "Hide Configurations ✖" : "Show Configurations ⚙️"}
          </button>
        </div>

        {showStoreSettings && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 animate-fadeIn">
            {/* COLUMN 1: Active Store Profile General Details */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-150 pb-2.5">
                <span className="text-xs font-sans font-black text-slate-800 uppercase tracking-wide">
                  🏪 Profile Customizer: {activeRestaurant?.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">ID: {activeRestaurant?.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Store Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Conni's Breakfast Joint"
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Cuisines / Specialties (Comma separated)</label>
                  <input
                    type="text"
                    value={storeType}
                    onChange={(e) => setStoreType(e.target.value)}
                    placeholder="e.g. Local Food, Burgers, Pizza"
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Star Rating (1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={storeRating}
                    onChange={(e) => setStoreRating(Number(e.target.value) || 4.5)}
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Reviews Count</label>
                  <input
                    type="text"
                    value={storeReviews}
                    onChange={(e) => setStoreReviews(e.target.value)}
                    placeholder="e.g. 500+"
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Delivery Fee</label>
                  <input
                    type="text"
                    value={storeDelFee}
                    onChange={(e) => setStoreDelFee(e.target.value)}
                    placeholder="e.g. GHS 5.00"
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Delivery Time</label>
                  <input
                    type="text"
                    value={storeDelTime}
                    onChange={(e) => setStoreDelTime(e.target.value)}
                    placeholder="e.g. 20-40 min"
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Opening Hours</label>
                  <input
                    type="text"
                    value={storeHours}
                    onChange={(e) => setStoreHours(e.target.value)}
                    placeholder="e.g. 7:00 AM - 10:00 PM"
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Promotional Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={storePromos}
                    onChange={(e) => setStorePromos(e.target.value)}
                    placeholder="e.g. 20% off everything, Free delivery on weekends"
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    value={storeImgUrl}
                    onChange={(e) => setStoreImgUrl(e.target.value)}
                    placeholder="e.g. https://images.unsplash.com/..."
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Google Maps URL</label>
                  <input
                    type="text"
                    value={storeGmapsUrl}
                    onChange={(e) => setStoreGmapsUrl(e.target.value)}
                    placeholder="e.g. https://maps.google.com/..."
                    className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none transition"
                  />
                </div>
              </div>

              <button
                onClick={saveStoreProfile}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-sans font-black py-3 rounded-xl transition shadow-md text-sm cursor-pointer mt-4"
              >
                💾 Save Store Profile Changes
              </button>
            </div>

            {/* COLUMN 2: Marketplace-Wide Category Filters */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-150 pb-2.5">
                  <span className="text-xs font-sans font-black text-slate-800 uppercase tracking-wide">
                    🏷️ Marketplace Filters / Category Pills
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-full">
                    {categories.length} Total
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                  These categories represent global filters shown in the food ordering storefront. Ensure cuisine specialties exactly match these names for proper tagging.
                </p>

                {/* Categories Grid List */}
                <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {categories.length === 0 ? (
                    <div className="text-center w-full py-8 text-slate-400 text-xs font-bold">
                      No categories configured. Add some below!
                    </div>
                  ) : (
                    categories.map((cat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-sm text-xs text-slate-800 font-bold"
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                        <button
                          onClick={() => handleRemoveCategory(cat.name)}
                          className="ml-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title={`Delete filter "${cat.name}"`}
                        >
                          ✖
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add New Category Form */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 mt-4">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider block">
                  ➕ Define New Marketplace Filter
                </span>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Emoji</label>
                    <select
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-full bg-white border border-slate-250 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none transition cursor-pointer"
                    >
                      <option value="🍽️">🍽️ Dish</option>
                      <option value="🍕">🍕 Pizza</option>
                      <option value="🍔">🍔 Burger</option>
                      <option value="🍲">🍲 Local</option>
                      <option value="🍚">🍚 Rice</option>
                      <option value="🥖">🥖 Bakery</option>
                      <option value="🥤">🥤 Drink</option>
                      <option value="🍨">🍨 Dessert</option>
                      <option value="🍗">🍗 Poultry</option>
                      <option value="🍟">🍟 Snack</option>
                      <option value="🥩">🥩 Meat</option>
                      <option value="🍣">🍣 Sushi</option>
                      <option value="🥞">🥞 Pancake</option>
                      <option value="🌶️">🌶️ Spicy</option>
                      <option value="🥗">🥗 Salad</option>
                    </select>
                  </div>
                  <div className="col-span-8">
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Category Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Vegetarian"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-white border border-slate-250 focus:border-orange-500 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold outline-none transition"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddCategory}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans font-black py-2 rounded-xl transition text-xs cursor-pointer"
                >
                  Create Filter Tag
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main layout split (left side = dishes list, right side = add-on managers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Food Dishes / Meals List */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-slate-200 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-500" />
              <h3 className="text-sm font-sans font-black text-slate-800 uppercase tracking-wider">
                Menu Offerings ({activeRestaurant?.menu?.length || 0})
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {(!activeRestaurant?.menu || activeRestaurant.menu.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold">
                No food items configured on this menu registry. Click 'Add New Food Dish' above to define some!
              </div>
            ) : (
              activeRestaurant.menu.map((m: any, index: number) => {
                const isEnabled = m.enabled !== false;
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border-2 transition duration-150 ${
                      isEnabled ? "border-slate-150 bg-white" : "border-slate-100 bg-slate-50/50 opacity-75"
                    }`}
                  >
                    <div className="flex gap-4">
                      {m.imgUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                          <img 
                            src={m.imgUrl} 
                            alt={m.item} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-sans font-black text-slate-800 text-sm">{m.item}</span>
                            <span className="text-[10px] text-slate-400 block font-semibold mt-0.5 leading-tight">
                              {m.description || "No custom description provided."}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openDishModal(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                              title="Edit Dish Info"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveDish(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Delete Dish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                          <span className="font-sans font-black text-orange-600 text-xs">
                            Base: GHS {Number(m.price).toFixed(2)}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Toggle active switch */}
                            <button
                              onClick={() => handleToggleDishEnabled(m)}
                              className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition ${
                                isEnabled 
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" 
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {isEnabled ? "● Active Live" : "○ Disabled Off"}
                            </button>

                            {/* Customize specific unique addons button */}
                            <button
                              onClick={() => {
                                setTargetDishForAddon(m);
                              }}
                              className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition duration-150 ${
                                targetDishForAddon?.id === m.id 
                                  ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600" 
                                  : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                              }`}
                            >
                              ⚙️ Customize Customizer ({m.addons?.length || 0})
                            </button>
                          </div>
                        </div>

                        {/* Direct rendering of unique addons inline */}
                        {m.addons && m.addons.length > 0 && (
                          <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                              ⚙️ Customizer Options Configured:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {m.addons.map((ad: any) => (
                                <div 
                                  key={ad.id}
                                  className="bg-white border border-slate-250 rounded px-2 py-0.5 text-[10px] font-bold text-slate-700 flex items-center gap-1"
                                >
                                  <span>{ad.name} (+GHS {ad.price.toFixed(2)})</span>
                                  <button
                                    onClick={() => handleRemoveDishAddon(m, ad.id, ad.name)}
                                    className="text-slate-300 hover:text-red-500 font-bold ml-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Customizer Editor & Shared Modules */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* PRIORITY 1: DISH-SPECIFIC CUSTOMIZER OPTION EDITOR */}
          {targetDishForAddon ? (
            <div className="bg-slate-950 text-white p-6 rounded-2xl border-2 border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-orange-400" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-sans font-black uppercase tracking-wider truncate">
                      Customizer: {targetDishForAddon.item}
                    </h3>
                    <span className="text-[10px] text-slate-400 block font-bold mt-0.5">
                      Adjust pricing & selections on client dialog
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setTargetDishForAddon(null)}
                  className="text-slate-400 hover:text-white text-xs font-black px-2.5 py-1 rounded bg-slate-900 transition"
                >
                  Close Editor
                </button>
              </div>

              {/* Add New Option Form */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider block">
                  ➕ Add Customizer Option
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Option / Add-on Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Hot & Crispy"
                      value={dishAddonForm.name}
                      onChange={e => setDishAddonForm({ ...dishAddonForm, name: e.target.value })}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Extra Price (₵)</label>
                    <input 
                      type="number"
                      step="0.5"
                      placeholder="e.g. 0.00"
                      value={dishAddonForm.price}
                      onChange={e => setDishAddonForm({ ...dishAddonForm, price: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Group Section Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. CHOOSE AN OPTION"
                      value={dishAddonForm.section}
                      onChange={e => setDishAddonForm({ ...dishAddonForm, section: e.target.value })}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Option Description</label>
                    <input 
                      type="text"
                      placeholder="e.g. Coated in spiced herbs"
                      value={dishAddonForm.description}
                      onChange={e => setDishAddonForm({ ...dishAddonForm, description: e.target.value })}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Selection Type</label>
                    <select
                      value={dishAddonForm.type}
                      onChange={e => setDishAddonForm({ ...dishAddonForm, type: e.target.value as "radio" | "checkbox" })}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-bold outline-none focus:border-orange-500"
                    >
                      <option value="radio">Radio (Single Choice)</option>
                      <option value="checkbox">Checkbox (Multi Choice)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pl-1">
                    <input 
                      type="checkbox"
                      id="required-addon-toggle"
                      checked={dishAddonForm.required}
                      onChange={e => setDishAddonForm({ ...dishAddonForm, required: e.target.checked })}
                      className="accent-orange-500 cursor-pointer"
                    />
                    <label htmlFor="required-addon-toggle" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                      Required Selection?
                    </label>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!dishAddonForm.name.trim()) {
                      notify("Please provide a name for the customizer option.", "err");
                      return;
                    }
                    const newOpt = {
                      id: "addon-" + Date.now(),
                      name: dishAddonForm.name.trim(),
                      price: Number(dishAddonForm.price) || 0,
                      description: dishAddonForm.description.trim() || undefined,
                      section: dishAddonForm.section.trim() || "Choose Extras",
                      type: dishAddonForm.type,
                      required: dishAddonForm.required,
                      enabled: true
                    };

                    const actionDesc = `Add customizer option "${newOpt.name}" to ${targetDishForAddon.item}`;
                    const payload = {
                      restaurantId: selectedRestId,
                      dishId: targetDishForAddon.id,
                      addon: newOpt
                    };

                    const directAction = async () => {
                      const updatedPlaces = restaurants.map(p => {
                        if (p.id === selectedRestId) {
                          const updatedMenu = (p.menu || []).map(m => {
                            if (m.id === targetDishForAddon.id) {
                              const addons = [...(m.addons || []), newOpt];
                              return { ...m, addons };
                            }
                            return m;
                          });
                          return { ...p, menu: updatedMenu };
                        }
                        return p;
                      });

                      await syncDBKey("elx_food_places", updatedPlaces);
                      setRestaurants(updatedPlaces);
                      if (setFoodPlaces) setFoodPlaces(updatedPlaces);

                      setTargetDishForAddon({
                        ...targetDishForAddon,
                        addons: [...(targetDishForAddon.addons || []), newOpt]
                      });

                      await appendAuditLog(`[Direct] Added customizer option "${newOpt.name}" to "${targetDishForAddon.item}"`);
                      notify(`Added option "${newOpt.name}" successfully!`, "ok");
                    };

                    if (hasDirectEditPrivilege) {
                      await directAction();
                    } else {
                      await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                      notify("Submitted customizer option request for Admin review.", "ok");
                    }

                    setDishAddonForm({
                      id: "",
                      name: "",
                      price: 0,
                      description: "",
                      type: "radio",
                      section: "CHOOSE AN OPTION",
                      required: true,
                      enabled: true
                    });
                  }}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-black py-2 rounded-lg transition"
                >
                  Add Option Instantly
                </button>
              </div>

              {/* Active Options Queue */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                  ⚙️ Configured Customizer Options ({targetDishForAddon.addons?.length || 0})
                </span>
                {(!targetDishForAddon.addons || targetDishForAddon.addons.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-bold">
                    No customizer options defined for this meal yet. Use the form above to add customizers!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {targetDishForAddon.addons.map((ad: any) => (
                      <div key={ad.id} className="p-3.5 bg-slate-900 border border-slate-850 rounded-xl space-y-2.5 text-left">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 block mb-0.5">Option Name</label>
                            <input 
                              type="text"
                              defaultValue={ad.name}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== ad.name) {
                                  const payload = {
                                    restaurantId: selectedRestId,
                                    dishId: targetDishForAddon.id,
                                    addonId: ad.id,
                                    updates: { name: val }
                                  };
                                  const actionDesc = `Update option name of "${ad.name}" to "${val}" on ${targetDishForAddon.item}`;
                                  const directAction = async () => {
                                    const updatedPlaces = restaurants.map(p => {
                                      if (p.id === selectedRestId) {
                                        const updatedMenu = (p.menu || []).map(m => {
                                          if (m.id === targetDishForAddon.id) {
                                            const updatedAddons = (m.addons || []).map(a => a.id === ad.id ? { ...a, name: val } : a);
                                            return { ...m, addons: updatedAddons };
                                          }
                                          return m;
                                        });
                                        return { ...p, menu: updatedMenu };
                                      }
                                      return p;
                                    });
                                    await syncDBKey("elx_food_places", updatedPlaces);
                                    setRestaurants(updatedPlaces);
                                    if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                    setTargetDishForAddon({
                                      ...targetDishForAddon,
                                      addons: (targetDishForAddon.addons || []).map(a => a.id === ad.id ? { ...a, name: val } : a)
                                    });
                                    notify(`Option name updated to: ${val}`, "ok");
                                  };
                                  if (hasDirectEditPrivilege) {
                                    await directAction();
                                  } else {
                                    await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                                    notify("Option update submitted for clearance.", "ok");
                                  }
                                }
                              }}
                              className="bg-slate-850 text-white font-bold text-xs outline-none border border-slate-700 focus:border-orange-500 px-2 py-1 rounded w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 block mb-0.5">Extra Price (₵)</label>
                            <input 
                              type="number"
                              step="0.5"
                              defaultValue={ad.price}
                              onBlur={async (e) => {
                                const val = Number(e.target.value) || 0;
                                if (val !== ad.price) {
                                  const payload = {
                                    restaurantId: selectedRestId,
                                    dishId: targetDishForAddon.id,
                                    addonId: ad.id,
                                    updates: { price: val }
                                  };
                                  const actionDesc = `Update option price of "${ad.name}" to GHS ${val} on ${targetDishForAddon.item}`;
                                  const directAction = async () => {
                                    const updatedPlaces = restaurants.map(p => {
                                      if (p.id === selectedRestId) {
                                        const updatedMenu = (p.menu || []).map(m => {
                                          if (m.id === targetDishForAddon.id) {
                                            const updatedAddons = (m.addons || []).map(a => a.id === ad.id ? { ...a, price: val } : a);
                                            return { ...m, addons: updatedAddons };
                                          }
                                          return m;
                                        });
                                        return { ...p, menu: updatedMenu };
                                      }
                                      return p;
                                    });
                                    await syncDBKey("elx_food_places", updatedPlaces);
                                    setRestaurants(updatedPlaces);
                                    if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                    setTargetDishForAddon({
                                      ...targetDishForAddon,
                                      addons: (targetDishForAddon.addons || []).map(a => a.id === ad.id ? { ...a, price: val } : a)
                                    });
                                    notify(`Option price updated!`, "ok");
                                  };
                                  if (hasDirectEditPrivilege) {
                                    await directAction();
                                  } else {
                                    await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                                    notify("Option update submitted for clearance.", "ok");
                                  }
                                }
                              }}
                              className="bg-slate-850 text-orange-400 font-bold text-xs outline-none border border-slate-700 focus:border-orange-500 px-2 py-1 rounded w-full"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 block mb-0.5">Section Group</label>
                            <input 
                              type="text"
                              defaultValue={ad.section || "Choose Extras"}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== ad.section) {
                                  const payload = {
                                    restaurantId: selectedRestId,
                                    dishId: targetDishForAddon.id,
                                    addonId: ad.id,
                                    updates: { section: val }
                                  };
                                  const actionDesc = `Update section header of "${ad.name}" to "${val}"`;
                                  const directAction = async () => {
                                    const updatedPlaces = restaurants.map(p => {
                                      if (p.id === selectedRestId) {
                                        const updatedMenu = (p.menu || []).map(m => {
                                          if (m.id === targetDishForAddon.id) {
                                            const updatedAddons = (m.addons || []).map(a => a.id === ad.id ? { ...a, section: val } : a);
                                            return { ...m, addons: updatedAddons };
                                          }
                                          return m;
                                        });
                                        return { ...p, menu: updatedMenu };
                                      }
                                      return p;
                                    });
                                    await syncDBKey("elx_food_places", updatedPlaces);
                                    setRestaurants(updatedPlaces);
                                    if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                    setTargetDishForAddon({
                                      ...targetDishForAddon,
                                      addons: (targetDishForAddon.addons || []).map(a => a.id === ad.id ? { ...a, section: val } : a)
                                    });
                                    notify(`Section header updated!`, "ok");
                                  };
                                  if (hasDirectEditPrivilege) {
                                    await directAction();
                                  } else {
                                    await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                                    notify("Option update submitted.", "ok");
                                  }
                                }
                              }}
                              className="bg-slate-850 text-slate-300 font-bold text-xs outline-none border border-slate-700 focus:border-orange-500 px-2 py-1 rounded w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 block mb-0.5">Option Description</label>
                            <input 
                              type="text"
                              defaultValue={ad.description || ""}
                              placeholder="Optional description"
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val !== ad.description) {
                                  const payload = {
                                    restaurantId: selectedRestId,
                                    dishId: targetDishForAddon.id,
                                    addonId: ad.id,
                                    updates: { description: val || undefined }
                                  };
                                  const actionDesc = `Update description of "${ad.name}" to "${val}"`;
                                  const directAction = async () => {
                                    const updatedPlaces = restaurants.map(p => {
                                      if (p.id === selectedRestId) {
                                        const updatedMenu = (p.menu || []).map(m => {
                                          if (m.id === targetDishForAddon.id) {
                                            const updatedAddons = (m.addons || []).map(a => a.id === ad.id ? { ...a, description: val || undefined } : a);
                                            return { ...m, addons: updatedAddons };
                                          }
                                          return m;
                                        });
                                        return { ...p, menu: updatedMenu };
                                      }
                                      return p;
                                    });
                                    await syncDBKey("elx_food_places", updatedPlaces);
                                    setRestaurants(updatedPlaces);
                                    if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                    setTargetDishForAddon({
                                      ...targetDishForAddon,
                                      addons: (targetDishForAddon.addons || []).map(a => a.id === ad.id ? { ...a, description: val || undefined } : a)
                                    });
                                    notify(`Description updated!`, "ok");
                                  };
                                  if (hasDirectEditPrivilege) {
                                    await directAction();
                                  } else {
                                    await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                                    notify("Option update submitted.", "ok");
                                  }
                                }
                              }}
                              className="bg-slate-850 text-slate-400 font-bold text-xs outline-none border border-slate-700 focus:border-orange-500 px-2 py-1 rounded w-full"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 items-center">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 block mb-0.5">Selection Type</label>
                            <select
                              defaultValue={ad.type || "radio"}
                              onChange={async (e) => {
                                const val = e.target.value;
                                if (val !== ad.type) {
                                  const payload = {
                                    restaurantId: selectedRestId,
                                    dishId: targetDishForAddon.id,
                                    addonId: ad.id,
                                    updates: { type: val }
                                  };
                                  const actionDesc = `Update selection type of "${ad.name}" to "${val}"`;
                                  const directAction = async () => {
                                    const updatedPlaces = restaurants.map(p => {
                                      if (p.id === selectedRestId) {
                                        const updatedMenu = (p.menu || []).map(m => {
                                          if (m.id === targetDishForAddon.id) {
                                            const updatedAddons = (m.addons || []).map(a => a.id === ad.id ? { ...a, type: val } : a);
                                            return { ...m, addons: updatedAddons };
                                          }
                                          return m;
                                        });
                                        return { ...p, menu: updatedMenu };
                                      }
                                      return p;
                                    });
                                    await syncDBKey("elx_food_places", updatedPlaces);
                                    setRestaurants(updatedPlaces);
                                    if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                    setTargetDishForAddon({
                                      ...targetDishForAddon,
                                      addons: (targetDishForAddon.addons || []).map(a => a.id === ad.id ? { ...a, type: val } : a)
                                    });
                                    notify(`Selection type updated!`, "ok");
                                  };
                                  if (hasDirectEditPrivilege) {
                                    await directAction();
                                  } else {
                                    await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                                    notify("Option update submitted.", "ok");
                                  }
                                }
                              }}
                              className="bg-slate-850 text-slate-300 font-bold text-[11px] outline-none border border-slate-700 focus:border-orange-500 px-2 py-1 rounded w-full"
                            >
                              <option value="radio">Radio (Single Choice)</option>
                              <option value="checkbox">Checkbox (Multi Choice)</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 mt-3.5 pl-1">
                            <input 
                              type="checkbox"
                              id={`req-ad-${ad.id}`}
                              defaultChecked={ad.required}
                              onChange={async (e) => {
                                const val = e.target.checked;
                                if (val !== ad.required) {
                                  const payload = {
                                    restaurantId: selectedRestId,
                                    dishId: targetDishForAddon.id,
                                    addonId: ad.id,
                                    updates: { required: val }
                                  };
                                  const actionDesc = `Update required status of "${ad.name}" to ${val}`;
                                  const directAction = async () => {
                                    const updatedPlaces = restaurants.map(p => {
                                      if (p.id === selectedRestId) {
                                        const updatedMenu = (p.menu || []).map(m => {
                                          if (m.id === targetDishForAddon.id) {
                                            const updatedAddons = (m.addons || []).map(a => a.id === ad.id ? { ...a, required: val } : a);
                                            return { ...m, addons: updatedAddons };
                                          }
                                          return m;
                                        });
                                        return { ...p, menu: updatedMenu };
                                      }
                                      return p;
                                    });
                                    await syncDBKey("elx_food_places", updatedPlaces);
                                    setRestaurants(updatedPlaces);
                                    if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                    setTargetDishForAddon({
                                      ...targetDishForAddon,
                                      addons: (targetDishForAddon.addons || []).map(a => a.id === ad.id ? { ...a, required: val } : a)
                                    });
                                    notify(`Required flag updated!`, "ok");
                                  };
                                  if (hasDirectEditPrivilege) {
                                    await directAction();
                                  } else {
                                    await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                                    notify("Option update submitted.", "ok");
                                  }
                                }
                              }}
                              className="accent-orange-500 cursor-pointer w-4 h-4"
                            />
                            <label htmlFor={`req-ad-${ad.id}`} className="text-[11px] font-bold text-slate-400 cursor-pointer select-none">
                              Required?
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 mt-1">
                          <span className="text-[10px] text-slate-500 font-mono">ID: {ad.id}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const nextE = ad.enabled !== false ? false : true;
                                const payload = {
                                  restaurantId: selectedRestId,
                                  dishId: targetDishForAddon.id,
                                  addonId: ad.id,
                                  updates: { enabled: nextE }
                                };
                                const actionDesc = `${nextE ? "Enable" : "Disable"} option "${ad.name}"`;
                                const directAction = async () => {
                                  const updatedPlaces = restaurants.map(p => {
                                    if (p.id === selectedRestId) {
                                      const updatedMenu = (p.menu || []).map(m => {
                                        if (m.id === targetDishForAddon.id) {
                                          const updatedAddons = (m.addons || []).map(a => a.id === ad.id ? { ...a, enabled: nextE } : a);
                                          return { ...m, addons: updatedAddons };
                                        }
                                        return m;
                                      });
                                      return { ...p, menu: updatedMenu };
                                    }
                                    return p;
                                  });
                                  await syncDBKey("elx_food_places", updatedPlaces);
                                  setRestaurants(updatedPlaces);
                                  if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                  setTargetDishForAddon({
                                    ...targetDishForAddon,
                                    addons: (targetDishForAddon.addons || []).map(a => a.id === ad.id ? { ...a, enabled: nextE } : a)
                                  });
                                  notify(`Option status updated!`, "ok");
                                };
                                if (hasDirectEditPrivilege) {
                                  await directAction();
                                } else {
                                  await handleRoleAction("UPDATE_DISH_ADDON", actionDesc, payload, directAction);
                                  notify("Option status update submitted.", "ok");
                                }
                              }}
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border transition ${
                                ad.enabled !== false 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : "bg-slate-800 text-slate-500 border-slate-700"
                              }`}
                            >
                              {ad.enabled !== false ? "Active" : "Disabled"}
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete "${ad.name}"?`)) return;
                                const actionDesc = `Remove option "${ad.name}" from ${targetDishForAddon.item}`;
                                const payload = {
                                  restaurantId: selectedRestId,
                                  dishId: targetDishForAddon.id,
                                  addonId: ad.id
                                };
                                const directAction = async () => {
                                  const updatedPlaces = restaurants.map(p => {
                                    if (p.id === selectedRestId) {
                                      const updatedMenu = (p.menu || []).map(m => {
                                        if (m.id === targetDishForAddon.id) {
                                          const updatedAddons = (m.addons || []).filter(a => a.id !== ad.id);
                                          return { ...m, addons: updatedAddons };
                                        }
                                        return m;
                                      });
                                      return { ...p, menu: updatedMenu };
                                    }
                                    return p;
                                  });
                                  await syncDBKey("elx_food_places", updatedPlaces);
                                  setRestaurants(updatedPlaces);
                                  if (setFoodPlaces) setFoodPlaces(updatedPlaces);
                                  setTargetDishForAddon({
                                    ...targetDishForAddon,
                                    addons: (targetDishForAddon.addons || []).filter(a => a.id !== ad.id)
                                  });
                                  notify(`Removed "${ad.name}" from customizer.`, "ok");
                                };
                                if (hasDirectEditPrivilege) {
                                  await directAction();
                                } else {
                                  await handleRoleAction("REMOVE_DISH_ADDON", actionDesc, payload, directAction);
                                  notify("Remove option request submitted.", "ok");
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : selectedRestId === "elextra" ? (
            /* B. SHARED ELEXTRA ADDON PANEL (WHEN NO SPECIFIC DISH SELECTED) */
            <div className="bg-slate-900 text-white p-6 rounded-2xl border-2 border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-orange-400" />
                  <h3 className="text-sm font-sans font-black uppercase tracking-wider">
                    Elextra Shared Add-ons
                  </h3>
                </div>
                <button
                  onClick={() => openAddonModal()}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Shared Add-on
                </button>
              </div>

              <div className="space-y-2">
                {elextraAddons.length === 0 ? (
                  <div className="text-slate-400 text-center py-6 text-xs font-bold border border-dashed border-slate-800 rounded-xl">
                    No shared ELEXTRA add-ons defined.
                  </div>
                ) : (
                  elextraAddons.map(ad => (
                    <div 
                      key={ad.id} 
                      className={`p-3 bg-slate-850 rounded-xl border transition ${
                        ad.enabled ? "border-slate-800" : "border-red-900/30 opacity-75"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-black text-sm text-slate-100">{ad.name}</span>
                            <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded uppercase">
                              {ad.category}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
                            Price: GHS {ad.price.toFixed(2)} | Active in: {(ad.meals || []).join(", ") || "No meals assigned"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openAddonModal(ad)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit Add-on Info"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveElextraAddon(ad)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition"
                            title="Delete Add-on"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* C. DYNAMIC SELECTION PROMPT FOR PARTNERS */
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-6 rounded-2xl text-center space-y-3">
              <Settings className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-black text-slate-600">Granular Dish Customizer Editor</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure dish-specific customizer options, toppings, extras, and customizable prices in real-time.
              </p>
              <div className="text-[11px] bg-orange-50 text-orange-700 border border-orange-200 p-2.5 rounded-lg font-bold">
                👈 Select any dish on the left and click "⚙️ Customize Customizer" to launch the interactive live customizer editor here!
              </div>
            </div>
          )}

          {/* C. CHANGE HISTORY LOG SECTION FOR ACCOUNTABILITY */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-sans font-black text-slate-800 uppercase tracking-wider">
                🛡️ CHANGE HISTORY LOG
              </span>
              <button
                onClick={() => {
                  if (confirm("Reset audit history logs?")) {
                    syncDBKey("elx_food_change_history", []);
                    setChangeHistory([]);
                  }
                }}
                className="text-[10px] font-black text-slate-400 hover:text-red-500 transition"
              >
                Clear logs
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {changeHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-[11px] font-bold">
                  No logged administrative operations.
                </div>
              ) : (
                changeHistory.map((log: any) => (
                  <div key={log.id} className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-150 leading-tight">
                    <div className="flex justify-between items-center text-slate-400 font-bold mb-0.5">
                      <span>{log.user} ({log.role})</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-700 font-bold">{log.action}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 1. DISH CREATOR / EDITOR MODAL ─── */}
      {dishModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-sans font-black text-slate-800 uppercase tracking-wider">
                {editingDish ? "Edit Dish Properties" : "Create New Dish Offering"}
              </h3>
              <button 
                onClick={() => setDishModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Dish / Meal Title
                </label>
                <input 
                  type="text" 
                  value={dishForm.item}
                  onChange={e => setDishForm({ ...dishForm, item: e.target.value })}
                  placeholder="e.g. Waakye Special, Cheese Burger"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-xl p-3 text-xs font-bold outline-none text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Price (GHS)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={dishForm.price}
                  onChange={e => setDishForm({ ...dishForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-xl p-3 text-xs font-bold outline-none text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Description
                </label>
                <textarea 
                  value={dishForm.description}
                  onChange={e => setDishForm({ ...dishForm, description: e.target.value })}
                  placeholder="Include ingredients, portions size..."
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-xl p-3 h-16 text-xs font-bold outline-none text-slate-800 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Food Cover Image URL
                </label>
                <input 
                  type="text" 
                  value={dishForm.imgUrl}
                  onChange={e => setDishForm({ ...dishForm, imgUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-xl p-3 text-xs font-bold outline-none text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDishModalOpen(false)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold p-3 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDish}
                className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold p-3 rounded-xl shadow transition"
              >
                Submit Offering
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. ELEXTRA SHARED ADDON CREATOR / EDITOR MODAL ─── */}
      {addonModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-sans font-black text-slate-800 uppercase tracking-wider">
                {editingAddon ? "Edit Shared Add-on" : "Define Shared Add-on"}
              </h3>
              <button 
                onClick={() => setAddonModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Add-on Option Name
                </label>
                <input 
                  type="text" 
                  value={addonForm.name}
                  onChange={e => setAddonForm({ ...addonForm, name: e.target.value })}
                  placeholder="e.g. Avocado, Gari, Egg"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-xl p-3 text-xs font-bold outline-none text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Price (GHS)
                </label>
                <input 
                  type="number" 
                  step="0.10"
                  value={addonForm.price}
                  onChange={e => setAddonForm({ ...addonForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-xl p-3 text-xs font-bold outline-none text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={addonForm.category}
                  onChange={e => setAddonForm({ ...addonForm, category: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-xl p-3 text-xs font-bold outline-none text-slate-800 cursor-pointer"
                >
                  <option value="Extras">Extras</option>
                  <option value="Protein Options">Protein Options</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Assign to ELEXTRA Meals:
                </label>
                <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {restaurants.find(r => r.id === "elextra")?.menu?.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => toggleMealInAddonForm(m.id)}
                      className="flex items-center gap-2.5 text-xs text-slate-700 font-bold hover:text-slate-900 text-left cursor-pointer"
                    >
                      {addonForm.meals.includes(m.id) ? (
                        <CheckSquare className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{m.item}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAddonModalOpen(false)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold p-3 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveElextraAddon}
                className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold p-3 rounded-xl shadow transition"
              >
                Save Add-on
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. PARTNER FOOD-SPECIFIC DISH ADDON CREATOR / EDITOR MODAL ─── */}
      {dishAddonModalOpen && targetDishForAddon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-sans font-black text-slate-800 uppercase tracking-wider">
                Manage Unique Addons for: {targetDishForAddon.item}
              </h3>
              <button 
                onClick={() => setDishAddonModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* List of existing custom addons */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Existing Custom Addons:
              </span>
              {(!targetDishForAddon.addons || targetDishForAddon.addons.length === 0) ? (
                <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-250 text-slate-400 text-xs font-bold">
                  No custom addons configured yet. Define one below!
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                  {targetDishForAddon.addons.map(ad => (
                    <div key={ad.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                      <span className="font-bold text-slate-700">{ad.name} (+GHS {ad.price.toFixed(2)})</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingDishAddon(ad);
                            setDishAddonForm({
                              id: ad.id,
                              name: ad.name,
                              price: ad.price,
                              enabled: ad.enabled !== false
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 transition"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemoveDishAddon(targetDishForAddon, ad.id, ad.name)}
                          className="p-1 text-slate-400 hover:text-red-500 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editor form */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                {editingDishAddon ? "✏️ Edit Custom Addon Details:" : "➕ Define New Custom Addon:"}
              </span>

              <div className="space-y-1">
                <input 
                  type="text" 
                  value={dishAddonForm.name}
                  onChange={e => setDishAddonForm({ ...dishAddonForm, name: e.target.value })}
                  placeholder="e.g. Extra Avocado, Extra Pepperoni"
                  className="w-full bg-white border-2 border-slate-200 focus:border-slate-400 rounded-xl p-2.5 text-xs font-bold outline-none text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase block">Price (GHS)</label>
                <input 
                  type="number" 
                  step="0.50"
                  value={dishAddonForm.price}
                  onChange={e => setDishAddonForm({ ...dishAddonForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border-2 border-slate-200 focus:border-slate-400 rounded-xl p-2.5 text-xs font-bold outline-none text-slate-800"
                />
              </div>

              <div className="flex gap-1.5 pt-1">
                {editingDishAddon && (
                  <button
                    onClick={() => {
                      setEditingDishAddon(null);
                      setDishAddonForm({ id: "addon-" + Date.now(), name: "", price: 2.0, enabled: true });
                    }}
                    className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 rounded-lg transition"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={handleSaveDishAddon}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg shadow transition"
                >
                  {editingDishAddon ? "Apply Edit" : "Insert Addon Accessory"}
                </button>
              </div>
            </div>

            <button
              onClick={() => setDishAddonModalOpen(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition text-center"
            >
              Done / Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
