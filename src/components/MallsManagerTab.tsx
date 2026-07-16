import React, { useState, useEffect } from "react";
import { DB } from "../db";
import { Mall } from "../types";
import { MALLS_SHOPS } from "../data";
import { 
  Search, Plus, Trash2, Edit2, X, Check, Tag, Building, Clock, Star, Save, RefreshCw, AlertTriangle
} from "lucide-react";

interface MallsManagerTabProps {
  user: any;
  notify: (msg: string, type?: "ok" | "err") => void;
  syncDBKey: (key: string, data: any) => Promise<void>;
  handleRoleAction?: (actionType: string, description: string, payload: any, executeDirectly: () => Promise<void> | void) => Promise<void>;
}

export default function MallsManagerTab({ user, notify, syncDBKey, handleRoleAction }: MallsManagerTabProps) {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editingMall, setEditingMall] = useState<Mall | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [mallToDelete, setMallToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form fields state
  const [mallForm, setMallForm] = useState<{
    id: string;
    name: string;
    location: string;
    type: string;
    hours: string;
    rating: number;
    sellsText: string;
    googleMapsUrl: string;
    city: "tarkwa" | "bogoso";
  }>({
    id: "",
    name: "",
    location: "Tarkwa",
    type: "Shopping Mall",
    hours: "8am–9pm",
    rating: 4.5,
    sellsText: "",
    googleMapsUrl: "",
    city: "tarkwa"
  });

  // Load malls list on mount
  useEffect(() => {
    const loadMalls = async () => {
      setLoading(true);
      try {
        const stored = await DB.get("elx_malls");
        if (stored && Array.isArray(stored)) {
          setMalls(stored);
        } else {
          // Initialize DB with fallback MALLS_SHOPS if none exists
          setMalls(MALLS_SHOPS);
          await syncDBKey("elx_malls", MALLS_SHOPS);
        }
      } catch (err) {
        console.error("Failed to load malls in MallsManagerTab:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMalls();

    // Listen to real-time synchronization updates
    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_malls") {
        if (e.detail.value && Array.isArray(e.detail.value)) {
          setMalls(e.detail.value);
        }
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
    };
  }, []);

  const handleOpenAddForm = () => {
    setIsAddingNew(true);
    setEditingMall(null);
    setMallForm({
      id: `m-${Date.now()}`,
      name: "",
      location: "Tarkwa",
      type: "Shopping Mall",
      hours: "8am–10pm",
      rating: 4.5,
      sellsText: "",
      googleMapsUrl: "",
      city: "tarkwa"
    });
  };

  const handleOpenEditForm = (mall: Mall) => {
    setEditingMall(mall);
    setIsAddingNew(false);
    setMallForm({
      id: mall.id,
      name: mall.name,
      location: mall.location,
      type: mall.type,
      hours: mall.hours,
      rating: mall.rating,
      sellsText: mall.sells.join(", "),
      googleMapsUrl: mall.googleMapsUrl || "",
      city: mall.city || ((mall.location || "").toLowerCase().includes("bogoso") ? "bogoso" : "tarkwa")
    });
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingMall(null);
  };

  const handleSaveMall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mallForm.name.trim()) {
      notify("Please enter a valid store/mall name", "err");
      return;
    }
    if (!mallForm.location.trim()) {
      notify("Please specify the store/mall location", "err");
      return;
    }

    const sellItems = mallForm.sellsText
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const updatedMall: Mall = {
      id: mallForm.id,
      name: mallForm.name.trim(),
      location: mallForm.location.trim(),
      type: mallForm.type.trim(),
      hours: mallForm.hours.trim(),
      rating: Number(mallForm.rating) || 4.5,
      sells: sellItems,
      googleMapsUrl: mallForm.googleMapsUrl.trim(),
      city: mallForm.city
    };

    let updatedList: Mall[] = [];
    if (isAddingNew) {
      updatedList = [...malls, updatedMall];
    } else {
      updatedList = malls.map(m => m.id === updatedMall.id ? updatedMall : m);
    }

    const executeUpdate = async () => {
      setMalls(updatedList);
      await syncDBKey("elx_malls", updatedList);
      setIsAddingNew(false);
      setEditingMall(null);
      if (isAddingNew) {
        notify(`Successfully added outlet "${updatedMall.name}"`, "ok");
      } else {
        notify(`Successfully updated details for "${updatedMall.name}"`, "ok");
      }
    };

    if (user?.role === "primary_admin") {
      await executeUpdate();
    } else if (handleRoleAction) {
      const desc = isAddingNew 
        ? `Rider/Manager requested to add store "${updatedMall.name}"`
        : `Rider/Manager requested store edit for "${updatedMall.name}"`;
      await handleRoleAction("UPDATE_MALL_LIST", desc, { updatedList }, executeUpdate);
      notify(`Store details change request submitted for Admin clearance.`, "ok");
      setIsAddingNew(false);
      setEditingMall(null);
    } else {
      await executeUpdate();
    }
  };

  const handleDeleteMall = (mallId: string, name: string) => {
    setMallToDelete({ id: mallId, name });
  };

  const filteredMalls = malls.filter(m => 
    (m.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (m.location || "").toLowerCase().includes((searchQuery || "").toLowerCase()) ||
    (m.type || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <div className="bg-[#111827] text-white p-6 rounded-2xl border border-[#1e293b] shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-[#1e293b]">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-violet-400">
            <Building className="w-5 h-5" /> Major Malls & Retail Outlets Directory
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Create, update, and remove supermarket, mall, and provision store targets for custom errand shopping couriers.
          </p>
        </div>
        <button
          onClick={handleOpenAddForm}
          className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition shadow-lg shadow-violet-900/20"
        >
          <Plus className="w-4 h-4" /> Add New Outlet
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LIST */}
        <div className={`lg:col-span-${isAddingNew || editingMall ? "7" : "12"}`}>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search outlets by name, location, or type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1f2937] border border-[#374151] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : filteredMalls.length === 0 ? (
            <div className="text-center py-12 bg-[#1f2937] rounded-xl border border-dashed border-[#374151] text-gray-400">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-semibold">No outlets found matching your criteria</p>
              <p className="text-xs mt-1">Try clarifying your search keywords or add a new outlet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredMalls.map(m => (
                <div
                  key={m.id}
                  onClick={() => handleOpenEditForm(m)}
                  className={`p-4 rounded-xl border transition cursor-pointer text-left ${
                    (editingMall?.id === m.id)
                      ? "bg-[#2d1b4e] border-violet-500 shadow-md"
                      : "bg-[#1f2937] border-[#374151] hover:border-[#4b5563]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-[#f3f4f6] text-base">{m.name}</div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="text-[#a78bfa]">📍</span> {m.location}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="text-emerald-400">🕐</span> Hours: {m.hours}
                      </div>
                      {m.googleMapsUrl && (
                        <div className="text-xs mt-1 flex items-center gap-1">
                          <span className="text-blue-400">🔗</span> 
                          <a 
                            href={m.googleMapsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="text-blue-400 underline font-semibold hover:text-blue-300"
                          >
                            Google Maps Redirect
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-[#312e81] text-[#c4b5fd] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#4338ca]">
                        {m.type}
                      </span>
                      <span className="flex items-center gap-0.5 bg-amber-950 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-800">
                        <Star className="w-3 h-3 fill-amber-300" /> {m.rating}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#374151]/50 flex flex-wrap gap-1">
                    {m.sells && m.sells.map((s, idx) => (
                      <span key={idx} className="bg-[#111827] text-gray-300 text-[10px] px-2 py-1 rounded-md border border-[#374151]">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#374151]/40" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEditForm(m)}
                      className="flex items-center gap-1 text-xs text-violet-400 hover:text-white hover:bg-violet-600/30 px-2.5 py-1.5 rounded-md border border-violet-500/20 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Modify
                    </button>
                    <button
                      onClick={() => handleDeleteMall(m.id, m.name)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-white hover:bg-red-600/30 px-2.5 py-1.5 rounded-md border border-red-500/20 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FORMS */}
        {(isAddingNew || editingMall) && (
          <div className="lg:col-span-5 bg-[#1f2937] p-5 rounded-xl border border-[#374151] shadow-lg animate-fadeIn text-left">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#374151]">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-violet-400">
                {isAddingNew ? <Plus className="w-4 h-4 text-emerald-400" /> : <Edit2 className="w-4 h-4" />}
                {isAddingNew ? "Add New Retail Store" : `Edit "${editingMall?.name}"`}
              </h3>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-white bg-[#111827] p-1.5 rounded-lg border border-[#374151] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Store/Outlet Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Melcom Tarkwa, Bogoso Main Store"
                  value={mallForm.name}
                  onChange={e => setMallForm({ ...mallForm, name: e.target.value })}
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Location / Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tarkwa Central, Bogoso Road"
                    value={mallForm.location}
                    onChange={e => setMallForm({ ...mallForm, location: e.target.value })}
                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Operating City/Hub *
                  </label>
                  <select
                    value={mallForm.city}
                    onChange={e => setMallForm({ ...mallForm, city: e.target.value as "tarkwa" | "bogoso" })}
                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                  >
                    <option value="tarkwa">Tarkwa Only</option>
                    <option value="bogoso">Bogoso Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Outlet Type *
                  </label>
                  <select
                    value={mallForm.type}
                    onChange={e => setMallForm({ ...mallForm, type: e.target.value })}
                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                  >
                    <option value="Shopping Mall">Shopping Mall</option>
                    <option value="Market Complex">Market Complex</option>
                    <option value="Shopping Centre">Shopping Centre</option>
                    <option value="Provision Shop">Provision Shop</option>
                    <option value="Wholesale Store">Wholesale Store</option>
                    <option value="Supermarket">Supermarket</option>
                    <option value="Local Groceries">Local Groceries</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Opening Hours *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8am–9pm, 24 Hours"
                    value={mallForm.hours}
                    onChange={e => setMallForm({ ...mallForm, hours: e.target.value })}
                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Store Rating (1.0–5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    placeholder="4.5"
                    value={mallForm.rating}
                    onChange={e => setMallForm({ ...mallForm, rating: parseFloat(e.target.value) || 4.5 })}
                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex justify-between">
                  <span>In-Stock Domains / Sells (Comma separated)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Use commas to split domains</span>
                </label>
                <textarea
                  placeholder="e.g. Clothing & Fashion, Groceries, Toiletries, Electronics, Baby Foods"
                  value={mallForm.sellsText}
                  onChange={e => setMallForm({ ...mallForm, sellsText: e.target.value })}
                  rows={3}
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex justify-between">
                  <span>Google Maps URL</span>
                  <span className="text-[10px] text-gray-400 font-normal">For riders/couriers navigation redirect</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://maps.google.com/?q=Tarkwa+Super+Mall"
                  value={mallForm.googleMapsUrl}
                  onChange={e => setMallForm({ ...mallForm, googleMapsUrl: e.target.value })}
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex-1 bg-[#111827] hover:bg-black border border-[#374151] rounded-lg py-2.5 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isAddingNew ? "Add Outlet" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {mallToDelete && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#1e293b",
            border: "1.5px solid #ef4444",
            borderRadius: "16px",
            maxWidth: "420px",
            width: "100%",
            padding: "24px",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto"
            }}>
              <AlertTriangle size={28} />
            </div>
            
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "white", marginBottom: "8px" }}>
              Remove Retail Outlet?
            </h3>
            
            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.5", marginBottom: "24px" }}>
              Are you absolutely sure you want to remove <strong style={{ color: "white" }}>"{mallToDelete.name}"</strong>? Customers will no longer be able to select it or request custom errand shopping for it.
            </p>
            
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setMallToDelete(null)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  background: "#334155",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                No, Cancel
              </button>
              <button
                onClick={async () => {
                  const updatedList = malls.filter(m => m.id !== mallToDelete.id);
                  const executeDelete = async () => {
                    setMalls(updatedList);
                    await syncDBKey("elx_malls", updatedList);
                    notify(`Outlet "${mallToDelete.name}" has been removed.`, "ok");
                    if (editingMall?.id === mallToDelete.id) {
                      setEditingMall(null);
                    }
                    setMallToDelete(null);
                  };

                  if (user?.role === "primary_admin") {
                    await executeDelete();
                  } else if (handleRoleAction) {
                    const desc = `Rider/Manager requested to delete store "${mallToDelete.name}"`;
                    await handleRoleAction("UPDATE_MALL_LIST", desc, { updatedList }, executeDelete);
                    notify(`Removal request for "${mallToDelete.name}" submitted for Admin clearance.`, "ok");
                    setMallToDelete(null);
                  } else {
                    await executeDelete();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
