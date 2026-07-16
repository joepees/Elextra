/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Heart, ShoppingCart, User, Check, MapPin, ArrowRight, ArrowLeft, 
  ExternalLink, Star, Compass, FileText, Phone, MessageSquare, Clock, 
  Sparkles, AlertTriangle, Plus, Minus, Trash2, ShoppingBag, CheckCircle, 
  AlertCircle, Info, Shield, Mail, Wallet, Tag, Settings, Lock, HelpCircle, 
  LogOut, Gift, Users, Smartphone
} from "lucide-react";
import { 
  FoodPlace, Mall, Product, Driver, Order, CartItem, Notif, User as UserType 
} from "../types";
import { 
  FOOD_PLACES, MALLS_SHOPS, GROCERY_ITEMS, ELECTRONICS, 
  CONSTRUCTION, DRIVERS, FEES, TC, today, needsTransport 
} from "../data";
import { PRODUCT_IMAGES } from "../productImages";
import { SafeImage } from "./SafeImage";
import { FoodPage as NewFoodPage } from "./FoodPage";
import { getGmailAccessToken, setGmailAccessToken } from "../lib/firebase";
import { loginWithGoogle } from "../lib/firestoreSync";

export function useGeminiMeta() {
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("elx_gemini_products_meta");
      if (cached) {
        setMeta(JSON.parse(cached));
      }
    } catch (e) {}

    fetch("/api/gemini/catalog")
      .then(r => r.json())
      .then(data => {
        if (data && data.updates) {
          setMeta(data);
        }
      })
      .catch(e => console.warn("Pages.tsx useGeminiMeta catalog fetch failed:", e));

    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_gemini_products_meta") {
        setMeta(value);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
    };
  }, []);

  return meta;
}

export function resolveProducts(products: Product[], meta: any): Product[] {
  if (!products) return [];
  return products.map(p => {
    if (!p || !p.id) return p;
    let img = PRODUCT_IMAGES[p.id] || p.img;
    let price = p.price;

    if (meta && meta.updates && meta.updates[p.id]) {
      const u = meta.updates[p.id];
      if (u.price !== undefined) price = u.price;
      if (u.img !== undefined) img = u.img;
    }

    return {
      ...p,
      price,
      img
    };
  });
}

export function MarkdownLite({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div style={{ fontFamily: "inherit", color: "inherit", lineHeight: "1.6" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          return <h3 key={idx} style={{ color: "#21F1A8", fontSize: "16px", fontWeight: "900", margin: "14px 0 8px 0" }}>{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith("#### ")) {
          return <h4 key={idx} style={{ color: "#f8fafc", fontSize: "14px", fontWeight: "700", margin: "10px 0 6px 0" }}>{trimmed.slice(5)}</h4>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return <li key={idx} style={{ marginLeft: "14px", marginBottom: "4px", fontSize: "13px", color: "#e2e8f0" }}>{formatBoldText(trimmed.slice(2))}</li>;
        }
        return <p key={idx} style={{ marginBottom: "8px", fontSize: "13px", color: "#e2e8f0" }}>{formatBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

function formatBoldText(str: string) {
  const parts = str.split("**");
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: "#21F1A8", fontWeight: "bold" }}>{part}</strong> : part);
}

// ─── STYLES BRIDGE ────────────────────────────────────────────────────────────
// S holds standard styling parameters to ensure consistency across chunks
import { S } from "../styles";
import { DB } from "../db";
import { InteractiveMap } from "./InteractiveMap";

// Helper to dynamically separate Bogoso and Tarkwa merchandise and logistics sourcing
export function getProductLocation(p: Product): { location: string; city: "tarkwa" | "bogoso" | "both" } {
  if (!p) {
    return { location: "Main Warehouse", city: "both" };
  }
  if (p.location) {
    const isBogoso = (p.location || "").toLowerCase().includes("bogoso");
    const isTarkwa = (p.location || "").toLowerCase().includes("tarkwa");
    return {
      location: p.location,
      city: isBogoso ? "bogoso" : isTarkwa ? "tarkwa" : "both"
    };
  }
  
  // Custom hash locator for groceries & construction materials lacking hardcoded locations
  const isGrocery = (p.id || "").startsWith("g");
  const num = parseInt((p.id || "").replace(/\D/g, ""), 10) || 0;
  
  if (num % 3 === 0) {
    return {
      location: isGrocery ? "Asante Wholesale Depot, Tarkwa" : "Tarkwa Hardware Center",
      city: "tarkwa"
    };
  } else if (num % 3 === 1) {
    return {
      location: isGrocery ? "Bogoso Traders Association Market" : "Bogoso Construction Blockyard",
      city: "bogoso"
    };
  } else {
    return {
      location: isGrocery ? "Available in Tarkwa & Bogoso Hubs" : "General Supply Depot (Tarkwa & Bogoso)",
      city: "both"
    };
  }
}

interface PageProps {
  setPage: (p: string) => void;
  setTab: (t: string) => void;
  flashT: number;
  fmt: (s: number) => string;
  addToCart: (p: Product) => void;
  toggleWish: (p: Product) => void;
  wishlist: string[];
  ipProfile?: any;
  onUpdateIpProfile?: (name: string) => void;
  onUnlinkIpProfile?: () => void;
  cityFilter?: string;
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
export function HomePage({ setPage, setTab, flashT, fmt, addToCart, toggleWish, wishlist, ipProfile, onUpdateIpProfile, onUnlinkIpProfile, cityFilter = "all" }: PageProps) {
  const meta = useGeminiMeta();
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 10000));
  const [customCatalog, setCustomCatalog] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [localCity, setLocalCity] = useState<"all" | "tarkwa" | "bogoso">("all");

  // Load food places
  const [restaurants, setRestaurants] = useState<FoodPlace[]>([]);
  useEffect(() => {
    const load = async () => {
      const stored = await DB.get("elx_custom_catalog");
      if (stored) setCustomCatalog(stored);

      const storedFP = await DB.get("elx_food_places");
      if (storedFP && Array.isArray(storedFP) && storedFP.length > 0) {
        setRestaurants(storedFP);
      } else {
        setRestaurants(FOOD_PLACES);
      }
    };
    load();

    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_custom_catalog") {
        setCustomCatalog(e.detail.value || {});
      } else if (e.detail?.key === "elx_food_places") {
        if (e.detail.value && Array.isArray(e.detail.value)) {
          setRestaurants(e.detail.value);
        }
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  const resolvedAll = useMemo(() => {
    const base = resolveProducts([...GROCERY_ITEMS, ...ELECTRONICS], meta);
    const added = (customCatalog.addedProducts || []).filter((p: any) => p && (p.section === "groceries" || p.section === "electronics"));
    const combined = [...base, ...added];

    return combined.map(p => {
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
    }).filter(p => {
      if (!p.activeSelling) return false;
      const loc = getProductLocation(p);
      const activeCity = localCity === "all" ? cityFilter : localCity;
      if (activeCity === "tarkwa" && loc.city === "bogoso") return false;
      if (activeCity === "bogoso" && loc.city === "tarkwa") return false;
      return true;
    });
  }, [meta, customCatalog, cityFilter, localCity]);

  const flash = useMemo(() => {
    if (!resolvedAll || resolvedAll.length === 0) return [];
    
    const shuffled = [...resolvedAll];
    let seed = randomSeed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled.slice(0, 6).map(p => {
      const basePrice = p.price;
      const discount = 0.25; 
      const promoPrice = Math.max(1, Math.round(basePrice * (1 - discount)));
      
      return {
        ...p,
        price: promoPrice,
        tag: "Flash Deal"
      };
    });
  }, [resolvedAll, randomSeed]);

  // Deep link a restaurant and go to Food tab
  const handleSelectRestaurant = (id: string) => {
    localStorage.setItem("elx_deep_link_restaurant_id", id);
    setPage("food");
  };

  // Quick categories configuration
  const CATEGORIES = [
    { label: "Food Joints", icon: "🍔", action: () => setPage("food") },
    { label: "Supermarket", icon: "🥬", action: () => { setPage("marketplace"); setTab("groceries"); } },
    { label: "Electronics", icon: "📺", action: () => { setPage("marketplace"); setTab("electronics"); } },
    { label: "Repair Services", icon: "🛠️", action: () => { setPage("marketplace"); setTab("handyman"); } },
    { label: "Heavy Duty", icon: "🧱", action: () => { setPage("marketplace"); setTab("construction"); } },
    { label: "Aboboya Courier", icon: "🚚", action: () => setPage("rider") }
  ];

  // Filters restaurants based on search query and city
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      if (!r) return false;
      if (r.status === "inactive") return false;
      const activeCity = localCity === "all" ? cityFilter : localCity;
      if (activeCity !== "all" && r.city && r.city !== activeCity) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (r.name || "").toLowerCase().includes(q);
        const locMatch = (r.location || "").toLowerCase().includes(q);
        return nameMatch || locMatch;
      }
      return true;
    });
  }, [restaurants, searchQuery, cityFilter, localCity]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return resolvedAll.filter(p => p && (p.name || "").toLowerCase().includes(q));
  }, [resolvedAll, searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-slate-50 min-h-screen text-slate-800 font-sans"
      id="elextra_bolt_food_homepage"
    >
      {/* Search and Location Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm px-4 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Location link and region switcher */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Delivering to</span>
                <span className="text-sm font-black text-slate-800">Tarkwa & Western Region, GH</span>
              </div>
            </div>

            {/* City filter selection pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {(["all", "tarkwa", "bogoso"] as const).map(city => (
                <button
                  key={city}
                  onClick={() => setLocalCity(city)}
                  className={`px-3 py-1 rounded-lg text-xs font-black capitalize transition-all ${
                    localCity === city 
                      ? "bg-emerald-500 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {city === "all" ? "All Areas" : city}
                </button>
              ))}
            </div>
          </div>

          {/* Bold Bolt Food Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search for dishes, restaurants, or groceries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-slate-100 border-none rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 w-5 h-5 rounded-full flex items-center justify-center font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-8">
        
        {/* 🇬🇭 ORAIMO GHANA STYLE MOBILE ORDER TRACKING & PROFILE PANEL */}
        <div className="bg-slate-900 text-white border border-emerald-500/30 rounded-3xl p-5 shadow-lg">
          {ipProfile && ipProfile.preferredPhone ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl shrink-0">🇬🇭</div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Akwaaba back, {ipProfile.preferredName}!
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Account: <code className="bg-emerald-400/10 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">{ipProfile.preferredPhone}</code>
                    {ipProfile.ordersCount > 0 ? (
                      <span> • Loaded <strong>{ipProfile.ordersCount}</strong> previous order receipts.</span>
                    ) : (
                      <span> • Linked securely. Start making orders!</span>
                    )}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (onUnlinkIpProfile) onUnlinkIpProfile();
                  else if (onUpdateIpProfile) onUpdateIpProfile("");
                }}
                className="text-[10px] font-black text-red-400 hover:text-red-300 bg-red-400/10 px-3 py-1.5 rounded-xl transition"
              >
                🔄 Switch Account
              </button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex items-start gap-3">
                <div className="text-3xl shrink-0">📱</div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Retrieve Order History & Track Maps
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-xl">
                    Enter your Ghanaian mobile phone number to restore previously saved orders, sync receipt archives, and map tracking coordinates instantly.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full lg:w-auto shrink-0 max-w-md">
                <input 
                  id="elextra_phone_input"
                  placeholder="e.g. 0247932499"
                  type="tel"
                  className="flex-1 lg:w-48 bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-3.5 py-2 text-xs text-white outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.currentTarget as HTMLInputElement).value.trim();
                      if (val && onUpdateIpProfile) onUpdateIpProfile(val);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const el = document.getElementById("elextra_phone_input") as HTMLInputElement;
                    if (el && el.value.trim() && onUpdateIpProfile) {
                      onUpdateIpProfile(el.value.trim());
                    } else {
                      alert("Please enter your mobile phone number first.");
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black px-4 py-2 rounded-2xl shadow transition"
                >
                  Recover History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Category Pill List */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={idx}
              onClick={cat.action}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200/60 rounded-2xl shadow-sm hover:shadow transition-all shrink-0 active:scale-95"
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-xs font-extrabold text-slate-700">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Promo Hero Banners Carousel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between h-44">
            <div className="absolute right-2 bottom-2 text-7xl opacity-15 select-none font-bold">🇬🇭</div>
            <div>
              <span className="bg-emerald-400/30 text-emerald-100 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">Ghanaian Pride</span>
              <h3 className="text-lg font-black mt-2 leading-tight">Waakye Feast Specials</h3>
              <p className="text-xs text-emerald-100 mt-1 max-w-[200px]">Genuine shito and organic millet leaves boiled to perfection.</p>
            </div>
            <button 
              onClick={() => handleSelectRestaurant("elextra")}
              className="bg-white hover:bg-slate-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black self-start transition shadow active:scale-95"
            >
              Order Now →
            </button>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between h-44">
            <div className="absolute right-2 bottom-2 text-7xl opacity-15 select-none">🍕</div>
            <div>
              <span className="bg-amber-400/30 text-amber-100 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">Weekend Deal</span>
              <h3 className="text-lg font-black mt-2 leading-tight">Buy 1 Get 1 Pizzas</h3>
              <p className="text-xs text-amber-100 mt-1 max-w-[200px]">Hot, gooey mozzarella and freshly kneaded base from local joints.</p>
            </div>
            <button 
              onClick={() => { setPage("food"); }}
              className="bg-white hover:bg-slate-100 text-orange-700 px-4 py-2 rounded-xl text-xs font-black self-start transition shadow active:scale-95"
            >
              Browse Pizza →
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between h-44 md:col-span-2 lg:col-span-1">
            <div className="absolute right-2 bottom-2 text-7xl opacity-15 select-none">🥬</div>
            <div>
              <span className="bg-blue-400/30 text-blue-100 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">Free Courier</span>
              <h3 className="text-lg font-black mt-2 leading-tight">Fastest Grocery Delivery</h3>
              <p className="text-xs text-blue-100 mt-1 max-w-[200px]">Fresh avocados, local plantains, and rice delivered inside 20 mins.</p>
            </div>
            <button 
              onClick={() => { setPage("marketplace"); setTab("groceries"); }}
              className="bg-white hover:bg-slate-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black self-start transition shadow active:scale-95"
            >
              Browse Supermarket →
            </button>
          </div>
        </div>

        {/* SEARCH RESULTS IF SEARCHING */}
        {searchQuery.trim() !== "" && (
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>🔍</span> Search Matches for "{searchQuery}"
            </h2>
            
            {filteredRestaurants.length === 0 && filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                No matching restaurants or products found in this area.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Restaurants matches */}
                {filteredRestaurants.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Restaurants</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRestaurants.map(r => (
                        <div 
                          key={r.id}
                          onClick={() => handleSelectRestaurant(r.id)}
                          className="bg-slate-50 border border-slate-200/40 hover:border-emerald-300 rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-sm transition"
                        >
                          <img src={r.imgUrl} className="w-12 h-12 rounded-xl object-cover shrink-0" alt="" />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-800 truncate">{r.name}</h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{r.location}</p>
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">⭐ {r.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products matches */}
                {filteredProducts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Marketplace Products</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x snap-mandatory">
                      {filteredProducts.map(p => (
                        <div 
                          key={p.id}
                          className="w-[260px] sm:w-[300px] shrink-0 snap-start bg-slate-50 border border-slate-200/40 rounded-2xl p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl border border-slate-100 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                              {p.img && (p.img.startsWith("http://") || p.img.startsWith("https://") || p.img.startsWith("data:")) ? (
                                <img src={p.img} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl">{p.img || "📦"}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-extrabold text-slate-800 truncate">{p.name}</h4>
                              <p className="text-[10px] text-slate-500 font-bold mt-0.5">₵{p.price.toFixed(2)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { addToCart(p); }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition shrink-0"
                          >
                            Add +
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DYNAMIC LISTINGS OF FOOD PLACES */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Eateries & Kitchens</span>
              <h2 className="text-lg font-black text-slate-800 mt-1">Popular Restaurants Near You</h2>
            </div>
            <button 
              onClick={() => setPage("food")}
              className="text-xs font-black text-emerald-500 hover:text-emerald-600 flex items-center gap-1 hover:translate-x-1 transition-all"
            >
              See All Food <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((r) => {
              const deliveryDetails = r.id === "elextra" 
                ? { fee: "₵5.00", time: "15-20 min" }
                : r.id === "cheezzy_pizza" 
                ? { fee: "₵12.00", time: "25-35 min" }
                : { fee: "₵8.00", time: "20-30 min" };

              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRestaurant(r.id)}
                  className="bg-white border border-slate-200/50 rounded-3xl overflow-hidden hover:shadow-md transition duration-200 cursor-pointer group flex flex-col justify-between h-full"
                >
                  {/* Restaurant Image */}
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    <img 
                      src={r.imgUrl} 
                      alt={r.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Time & Rating Pills */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="bg-white text-slate-800 text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow flex items-center gap-1">
                        ⭐ {r.rating.toFixed(1)}
                      </span>
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow">
                        {deliveryDetails.time}
                      </span>
                    </div>

                    {/* Active Promo banner */}
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm text-white text-[9px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg">
                      {r.id === "elextra" ? "🔥 25% Off Local Favorites" : "🛵 Low Delivery Rates"}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-emerald-500 transition-colors">
                        {r.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-1">{r.location}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3">
                      <span className="text-[10px] text-slate-400 font-bold">Delivery fee: <strong className="text-slate-700">{deliveryDetails.fee}</strong></span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold capitalize">
                        {r.city || "tarkwa"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRestaurants.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-xs font-bold">
                No restaurants available in this city filter. Select another city above!
              </div>
            )}
          </div>
        </section>

        {/* ELEXTRA FLASH DEALS DYNAMIC CAROUSEL */}
        <section className="bg-slate-900 text-white p-5 sm:p-7 rounded-[32px] shadow-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 text-[120px] select-none opacity-5">⚡</div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
            <div>
              <span className="bg-amber-400 text-slate-900 text-[9px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full">LIMITED HOURS</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-1">ELEXTRA Daily Flash Sales</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">High demand consumer essentials at 25% checkout write-down.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setRandomSeed(Math.floor(Math.random() * 10000))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
              >
                🔀 Shuffle Deals
              </button>
              <div className="bg-amber-400 text-slate-900 px-3.5 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm tracking-widest shadow">
                ⏱ {fmt(flashT)}
              </div>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent snap-x snap-mandatory relative z-10">
            {flash.map((p) => {
              const onWishlist = wishlist.includes(p.id);
              return (
                <div 
                  key={p.id}
                  className="w-[280px] sm:w-[320px] shrink-0 snap-start bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between h-44 hover:border-amber-400 transition"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                        {p.img && (p.img.startsWith("http://") || p.img.startsWith("https://") || p.img.startsWith("data:")) ? (
                          <img src={p.img} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">{p.img || "📦"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] bg-amber-400/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded">
                          {p.tag || "Save 25%"}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate mt-1">{p.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{getProductLocation(p).location}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleWish(p)}
                      className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-red-400 rounded-full transition"
                    >
                      <Heart className={`w-3.5 h-3.5 ${onWishlist ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-700/50 pt-3 mt-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block line-through">₵{(p.price * 1.33).toFixed(0)}</span>
                      <span className="text-sm font-black text-amber-300">₵{p.price.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl shadow transition active:scale-95"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BEST SELLING MARKETPLACE ITEMS */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Marketplace Hot Pick</span>
              <h2 className="text-lg font-black text-slate-800 mt-1">Supermarket & Fresh Groceries</h2>
            </div>
            <button 
              onClick={() => { setPage("marketplace"); setTab("groceries"); }}
              className="text-xs font-black text-indigo-500 hover:text-indigo-600 flex items-center gap-1 hover:translate-x-1 transition-all"
            >
              See All Groceries <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x snap-mandatory">
            {resolvedAll.slice(0, 8).map((p) => {
              const onWishlist = wishlist.includes(p.id);
              return (
                <div 
                  key={p.id}
                  className="w-[220px] sm:w-[250px] shrink-0 snap-start bg-white border border-slate-200/50 rounded-2xl p-4 flex flex-col justify-between h-48 hover:shadow-sm transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.img && (p.img.startsWith("http://") || p.img.startsWith("https://") || p.img.startsWith("data:")) ? (
                        <img src={p.img} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{p.img || "📦"}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => toggleWish(p)}
                      className="p-1.5 hover:bg-slate-100 text-slate-300 hover:text-red-500 rounded-full transition"
                    >
                      <Heart className={`w-3.5 h-3.5 ${onWishlist ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-xs font-black text-slate-800 truncate" title={p.name}>
                      {p.name}
                    </h3>
                    <p className="text-[9.5px] text-slate-400 truncate mt-0.5">
                      {getProductLocation(p).location}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3">
                    <span className="text-xs font-black text-slate-800">
                      ₵{p.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => addToCart(p)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl transition active:scale-95"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SERVICE TRUST SIGNALS */}
        <section className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-xl shadow-md">
              🛡️
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Safe, Secure & Fast Logistics</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
                ELEXTRA operates a strict live monitoring network with rapid 1.5-second logistics polling so your order status is always sync'd.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => { setPage("terms"); }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black px-4 py-2.5 rounded-xl transition"
            >
              Regulations & T&C
            </button>
            <button 
              onClick={() => { setPage("rider"); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow active:scale-95"
            >
              Deliver with Us
            </button>
          </div>
        </section>

      </div>
    </motion.div>
  );
}

// ─── FOOD CUSTOMIZER HELPERS & CONFIG ──────────────────────────────────────────
export const COMMON_INGREDIENTS = [
  { name: "Plantain", keyword: "plantain", icon: "🍌" },
  { name: "Beans / Gobe", keyword: "beans", icon: "🫘" },
  { name: "Avocado", keyword: "avocado", icon: "🥑" },
  { name: "Groundnuts", keyword: "groundnut", icon: "🥜" },
  { name: "Egg", keyword: "egg", icon: "🥚" },
  { name: "Fish", keyword: "fish", icon: "🐟" },
  { name: "Salmon", keyword: "salmon", icon: "🍣" },
  { name: "Tilapia", keyword: "tilapia", icon: "🐠" },
  { name: "Goat Meat", keyword: "goat", icon: "🐐" },
  { name: "Chicken", keyword: "chicken", icon: "🍗" },
  { name: "Beef", keyword: "beef", icon: "🥩" },
  { name: "Pork", keyword: "pork", icon: "🥓" },
  { name: "Snail", keyword: "snail", icon: "🐚" },
  { name: "Yam / Ampesi", keyword: "yam", icon: "🍠" },
  { name: "Fufu", keyword: "fufu", icon: "🥣" },
  { name: "Banku", keyword: "banku", icon: "𫵳" },
  { name: "Kenkey", keyword: "kenkey", icon: "🌽" },
  { name: "Kontomire / Spinach", keyword: "kontomire", icon: "🥬" },
  { name: "Onions", keyword: "onion", icon: "🧅" },
  { name: "Pepper Sauce", keyword: "pepper", icon: "🌶️" },
  { name: "Shito", keyword: "shito", icon: "🖤" },
  { name: "Gari", keyword: "gari", icon: "🌾" },
  { name: "Spaghetti", keyword: "spaghetti", icon: "🍝" }
];

export function detectIngredientsInFood(itemName: string) {
  const normalized = (itemName || "").toLowerCase();
  return COMMON_INGREDIENTS.filter(ing => normalized.includes(ing.keyword));
}

export function getFoodCompatibility(itemName: string, likes: string[], dislikes: string[]) {
  const normalized = (itemName || "").toLowerCase();
  const matchedLikes = COMMON_INGREDIENTS.filter(item => 
    likes.includes(item.keyword) && normalized.includes(item.keyword)
  ).map(i => i.name);
  
  const matchedDislikes = COMMON_INGREDIENTS.filter(item => 
    dislikes.includes(item.keyword) && normalized.includes(item.keyword)
  ).map(i => i.name);
  
  return { matchedLikes, matchedDislikes };
}

export const QUICK_CUSTOMIZABLE_FOODS = [
  { itemName: "Red Red (Fried Plantain & Beans Stew - Gobe)", basePrice: 14, restaurantName: "Mama Abena's Local Food Joint", restaurantId: "f_abena" },
  { itemName: "Eto Special (Mashed Plantain, Egg, Avocado & Groundnuts)", basePrice: 18, restaurantName: "Mama Abena's Local Food Joint", restaurantId: "f_abena" },
  { itemName: "Fufu with Fresh Snail & Bushmeat Light Soup", basePrice: 28, restaurantName: "Mama Abena's Local Food Joint", restaurantId: "f_abena" },
  { itemName: "Banku & Tilapia", basePrice: 25, restaurantName: "Auntie Efua's Fast Food", restaurantId: "f1" },
  { itemName: "Jollof Rice & Chicken", basePrice: 20, restaurantName: "Auntie Efua's Fast Food", restaurantId: "f1" },
  { itemName: "Beef Burger & Fries", basePrice: 38, restaurantName: "Golden Fork Restaurant", restaurantId: "f2" },
  { itemName: "Banku & Okro Stew", basePrice: 18, restaurantName: "Bogoso Mama's Kitchen", restaurantId: "f3" }
];

export const ELEXTRA_TOPPING_PRICES: Record<string, number> = {
  // Rice Dish Toppings
  "Fried Egg": 5,
  "Veggies": 5,
  "Gari Addon": 3,
  "Spaghetti (Normal)": 3,
  "Spaghetti (Large)": 5,
  "Avocado Slices": 4,

  // Soup Food Toppings
  "Fried Salmon Piece": 20,
  "Smoked Salmon Piece": 20,
  "Tilapia (Normal)": 40,
  "Tilapia (Large)": 50,
  "Chop Bar Sliced Fish": 20,
  "Premium Goat Meat": 30,
  "Grilled Chicken portion": 20,
  "Assorted Cow Meat": 30,
  "Bespoke Chop-bar Meat": 30,
  "Chop-bar Beef Portion": 10,
  "Boiled Egg (Ghs4)": 4,

  // Generic and extra fallbacks
  "Double Eggs": 3,
  "Avocado Slices (Royal)": 4,
  "Extra Tilapia Fillet chunk": 12,
  "Assorted Snail piece": 10
};

export function getToppingOptionsForFood(itemName: string): { n: string; p: number }[] {
  const name = (itemName || "").toLowerCase();
  
  // 1. Soup Foods (Fufu, Banku, TZ, Tuo Zaafi, Konkonte, Omo Tuo, Okro/Okra, Palaver, Light Soup, Palm Soup, Groundnut Soup, Ebunubunu, Kontomire, Ampesi, Soup or Stew-based foods)
  const isSoupFood = 
    name.includes("fufu") || 
    name.includes("banku") || 
    name.includes("soup") || 
    name.includes("stew") || 
    name.includes("tz") || 
    name.includes("tuo") || 
    name.includes("omo tuo") || 
    name.includes("konkonte") ||
    name.includes("okra") ||
    name.includes("okro") ||
    name.includes("palaver") ||
    name.includes("abom") ||
    name.includes("kontomire") ||
    name.includes("ampesi");

  if (isSoupFood) {
    return [
      { n: "Fried Salmon Piece", p: 20 },
      { n: "Smoked Salmon Piece", p: 20 },
      { n: "Tilapia (Normal)", p: 40 },
      { n: "Tilapia (Large)", p: 50 },
      { n: "Chop Bar Sliced Fish", p: 20 },
      { n: "Premium Goat Meat", p: 30 },
      { n: "Grilled Chicken portion", p: 20 },
      { n: "Assorted Cow Meat", p: 30 },
      { n: "Bespoke Chop-bar Meat", p: 30 },
      { n: "Boiled Egg (Ghs4)", p: 4 },
      { n: "Chop-bar Beef Portion", p: 10 }
    ];
  }

  // 2. Rice Dishes (Jollof, Waakye, Fried Rice, Jasmine, White Rice, Angwamo)
  // These toppings apply to all types of rice dish (Fried egg, Veggies, Gari, Spaghetti, Avocado/Avocado Slices)
  return [
    { n: "Fried Egg", p: 5 },
    { n: "Veggies", p: 5 },
    { n: "Gari Addon", p: 3 },
    { n: "Spaghetti (Normal)", p: 3 },
    { n: "Spaghetti (Large)", p: 5 },
    { n: "Avocado Slices", p: 4 }
  ];
}


// ─── FOOD & рестораны PAGE ───────────────────────────────────────────────────
interface FoodPageProps {
  addToCart: (p: Product) => void;
  wishlist: string[];
  toggleWish: (p: Product) => void;
  cityFilter?: string;
  notify?: (msg: string, type?: "ok" | "err") => void;
}

export function FoodPage({ addToCart, wishlist, toggleWish, cityFilter = "all", notify }: FoodPageProps) {
  return (
    <NewFoodPage 
      addToCart={addToCart}
      wishlist={wishlist}
      toggleWish={toggleWish}
      cityFilter={cityFilter}
      notify={notify}
    />
  );
}

function _oldFoodPage({ addToCart, wishlist, toggleWish, cityFilter = "all", notify }: FoodPageProps) {
  const [sel, setSel] = useState<string | null>(null);
  const [srch, setSrch] = useState("");
  const [isListening, setIsListening] = useState(false);

  const startSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      if (notify) notify("Web Speech API is not supported in this browser. Try Chrome or Safari!", "err");
      return;
    }
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      setIsListening(true);
      if (notify) notify("🎙️ Listening... Say 'Rice', 'Burger', or 'Waakye'!", "ok");
    };
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSrch(text);
      if (notify) notify(`🎙️ Voice command: "${text}"`, "ok");
    };
    recognition.onerror = () => {
      setIsListening(false);
      if (notify) notify("Voice recognition timed out or permission denied.", "err");
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const [dynamicFoodPlaces, setDynamicFoodPlaces] = useState<FoodPlace[]>([]);
  const [addonStartingPrice, setAddonStartingPrice] = useState<number>(5);

  const [custBaseRice, setCustBaseRice] = useState(15);
  const [custBoiledEgg, setCustBoiledEgg] = useState(5);
  const [custPlantain, setCustPlantain] = useState(5);
  const [custMeatBase, setCustMeatBase] = useState(15);
  const [custFishBase, setCustFishBase] = useState(10);
  const [custRoyalFriedRice, setCustRoyalFriedRice] = useState(70);
  const [custRoyalWaakye, setCustRoyalWaakye] = useState(50);
  const [custRoyalPlainRice, setCustRoyalPlainRice] = useState(50);

  const loadDatabaseFoodPrices = async () => {
    const stored = await DB.get("elx_food_places");
    if (stored && Array.isArray(stored)) {
      setDynamicFoodPlaces(stored);
    } else {
      setDynamicFoodPlaces(FOOD_PLACES);
      await DB.set("elx_food_places", FOOD_PLACES);
    }
    
    const storedAddonPrice = await DB.get("elx_addon_starting_price");
    if (storedAddonPrice !== null && storedAddonPrice !== undefined) {
      const val = Number(storedAddonPrice);
      setAddonStartingPrice(val);
      setVeggiesPrice(val);
      setGariPrice(val);
      setAvocadoPrice(val);
      setSpaghettiPrice(val);
    }

    const storedCustPrices = await DB.get("elx_customizer_prices");
    if (storedCustPrices) {
      if (storedCustPrices.baseRice !== undefined) setCustBaseRice(Number(storedCustPrices.baseRice));
      if (storedCustPrices.boiledEgg !== undefined) setCustBoiledEgg(Number(storedCustPrices.boiledEgg));
      if (storedCustPrices.veggies !== undefined) setVeggiesPrice(Number(storedCustPrices.veggies));
      if (storedCustPrices.gari !== undefined) setGariPrice(Number(storedCustPrices.gari));
      if (storedCustPrices.avocado !== undefined) setAvocadoPrice(Number(storedCustPrices.avocado));
      if (storedCustPrices.spaghetti !== undefined) setSpaghettiPrice(Number(storedCustPrices.spaghetti));
      if (storedCustPrices.plantain !== undefined) setCustPlantain(Number(storedCustPrices.plantain));
      if (storedCustPrices.meatBase !== undefined) setCustMeatBase(Number(storedCustPrices.meatBase));
      if (storedCustPrices.fishBase !== undefined) setCustFishBase(Number(storedCustPrices.fishBase));
      if (storedCustPrices.royalFriedRice !== undefined) setCustRoyalFriedRice(Number(storedCustPrices.royalFriedRice));
      if (storedCustPrices.royalWaakye !== undefined) setCustRoyalWaakye(Number(storedCustPrices.royalWaakye));
      if (storedCustPrices.royalPlainRice !== undefined) setCustRoyalPlainRice(Number(storedCustPrices.royalPlainRice));
    }
    const storedLikes = await DB.get("elx_food_likes");
    if (storedLikes) setLikes(storedLikes);
    const storedDislikes = await DB.get("elx_food_dislikes");
    if (storedDislikes) setDislikes(storedDislikes);
  };

  const saveLikesAndDislikes = async (newL: string[], newD: string[]) => {
    setLikes(newL);
    setDislikes(newD);
    await DB.set("elx_food_likes", newL);
    await DB.set("elx_food_dislikes", newD);
    window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_food_likes", value: newL } }));
    window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_food_dislikes", value: newD } }));
  };

  useEffect(() => {
    loadDatabaseFoodPrices();

    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (
        key === "elx_food_places" ||
        key === "elx_addon_starting_price" ||
        key === "elx_customizer_prices"
      ) {
        loadDatabaseFoodPrices();
      } else if (key === "elx_food_likes") {
        setLikes(value || []);
      } else if (key === "elx_food_dislikes") {
        setDislikes(value || []);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    window.addEventListener("storage", loadDatabaseFoodPrices);

    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
      window.removeEventListener("storage", loadDatabaseFoodPrices);
    };
  }, []);

  // 🍳 Food customizer states
  const [activeTab, setActiveTab] = useState<"rice_basic" | "rice_royal">("rice_basic");
  
  // Tab 1: Rice basic & Meat/Fish customizer popup
  const [riceType, setRiceType] = useState<"Plain Rice" | "Jollof rice" | "Waakye">("Plain Rice");
  const [riceAddons, setRiceAddons] = useState<string[]>([]);
  const [showMeatFishModal, setShowMeatFishModal] = useState(false);
  const [activeMeatFishTab, setActiveMeatFishTab] = useState<"meat" | "fish">("meat");

  // Meat setup states
  const [meatExtraQty, setMeatExtraQty] = useState(0); // number of +GHS increments
  const [includeWele, setIncludeWele] = useState(false); // only for Waakye
  
  // Fish setup states
  const [fishExtraQty, setFishExtraQty] = useState(0); // number of +GHS increments

  const getMeatPrice = () => {
    return custMeatBase + meatExtraQty * addonStartingPrice + (includeWele ? addonStartingPrice : 0);
  };
  const getFishPrice = () => {
    return custFishBase + fishExtraQty * addonStartingPrice;
  };

  // Add-on custom amounts (starting from dynamic addonStartingPrice)
  const [veggiesPrice, setVeggiesPrice] = useState(5);
  const [gariPrice, setGariPrice] = useState(5);
  const [avocadoPrice, setAvocadoPrice] = useState(5);
  const [spaghettiPrice, setSpaghettiPrice] = useState(5);
  const [boiledEggQty, setBoiledEggQty] = useState(1);
  const [selectedSauce, setSelectedSauce] = useState<"Shito" | "Green Pepper">("Shito");
  
  // Tab 2: Royal Plate options
  const [royalDishType, setRoyalDishType] = useState<"fried_rice" | "waakye" | "plain_rice">("fried_rice");
  const [friedRiceSauce, setFriedRiceSauce] = useState<"Chilli Sauce" | "Black Sauce" | "Both">("Chilli Sauce");
  
  const [waakyeProtein, setWaakyeProtein] = useState<"Chicken" | "Fish" | "Meat">("Chicken");
  const [waakyeCarbs, setWaakyeCarbs] = useState<"Veggies" | "Spaghetti" | "Both">("Veggies");
  const [waakyeEgg, setWaakyeEgg] = useState<boolean>(true);
  const [waakyeWele, setWaakyeWele] = useState<boolean>(true);
  const [waakyePlantain, setWaakyePlantain] = useState<boolean>(true);
  const [waakyeGari, setWaakyeGari] = useState<boolean>(true);
  
  const [plainRiceProtein, setPlainRiceProtein] = useState<"Chicken" | "Fish" | "Meat">("Chicken");
  const [plainRiceCarbs, setPlainRiceCarbs] = useState<"Veggies" | "Spaghetti" | "Both">("Veggies");
  const [plainRiceEgg, setPlainRiceEgg] = useState<boolean>(true);
  const [plainRicePlantain, setPlainRicePlantain] = useState<boolean>(true);

  // 🍳 Individual food item customizer states
  const [customizingId, setCustomizingId] = useState<string | null>(null);
  const [custPortion, setCustPortion] = useState<string>("Standard");
  const [custSpice, setCustSpice] = useState<string>("Medium");
  const [custAddons, setCustAddons] = useState<string[]>([]);
  const [custNotes, setCustNotes] = useState("");

  // 🍳 Food description preference profiling & tailored customization states
  const [likes, setLikes] = useState<string[]>(["plantain", "chicken", "avocado"]);
  const [dislikes, setDislikes] = useState<string[]>(["groundnut", "onion"]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [customizerTopTab, setCustomizerTopTab] = useState<"customizer" | "taste_profile">("customizer");
  
  const [activeCustomFood, setActiveCustomFood] = useState<{
    pId: string;
    itemName: string;
    basePrice: number;
    restaurantName: string;
    restaurantId: string;
  } | null>(null);
  
  const [customIngredients, setCustomIngredients] = useState<Record<string, "exclude" | "standard" | "double">>({});

  // 📅 Interactive Table, Event Catering, and QR Dining States
  const [resList, setResList] = useState<any[]>([]);
  const [resRestaurant, setResRestaurant] = useState("");
  const [resGuests, setResGuests] = useState(2);
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("");
  const [resName, setResName] = useState("");
  const [resPhone, setResPhone] = useState("");

  const [catList, setCatList] = useState<any[]>([]);
  const [catType, setCatType] = useState("Party");
  const [catTier, setCatTier] = useState("Standard Buffets");
  const [catGuests, setCatGuests] = useState(100);
  const [catDate, setCatDate] = useState("");
  const [catLocation, setCatLocation] = useState("");

  const [activeQr, setActiveQr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const startCam = async () => {
      if (scanning) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          activeStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        } catch (err) {
          console.error("Camera access failed:", err);
          if (notify) notify("Webcam camera initialization failed. Running in visual selection mode.", "err");
        }
      }
    };
    startCam();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
    };
  }, [scanning]);

  const loadBookings = async () => {
    const res = await DB.get("elx_reservations") || [];
    setResList(res);
    const cat = await DB.get("elx_catering_orders") || [];
    setCatList(cat);
    const qrm = await DB.get("elx_qrm");
    if (qrm) setActiveQr(qrm);
  };

  useEffect(() => {
    loadBookings();
    
    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_reservations") {
        setResList(value || []);
      } else if (key === "elx_catering_orders") {
        setCatList(value || []);
      } else if (key === "elx_qrm") {
        setActiveQr(value);
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);
  
  const filtered = dynamicFoodPlaces.filter(f => {
    if (!f) return false;
    // Check status if set - if we don't want to show closed/down joints in the main directory,
    // we can filter them or still show them but with a closed badge! Let's keep showing them with a badge!
    if (cityFilter === "tarkwa") {
      if (f.city && f.city !== "tarkwa") return false;
      if (!f.city && !(f.location || f.address || "").toLowerCase().includes("tarkwa")) return false;
    }
    if (cityFilter === "bogoso") {
      if (f.city && f.city !== "bogoso") return false;
      if (!f.city && !(f.location || f.address || "").toLowerCase().includes("bogoso")) return false;
    }

    const searchQuery = (srch || "").toLowerCase();
    return (
      (f.name || "").toLowerCase().includes(searchQuery) || 
      (f.location || f.address || "").toLowerCase().includes(searchQuery) || 
      (f.type || f.cuisine || "").toLowerCase().includes(searchQuery) ||
      (f.menu || []).some(m => m && (m.item || "").toLowerCase().includes(searchQuery))
    );
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", padding: "20px 16px", borderRadius: "16px", marginBottom: "16px", color: "white" }}>
        <div style={{ fontSize: "22px", fontWeight: 900 }}>🍽️ Food & Fast Food Joints</div>
        <div style={{ fontSize: "13px", opacity: 0.9 }}>Order authentic dishes directly to your hub base via rapid motorcycle dispatch!</div>
      </div>

            {/* 🍳 NEW TASTE PROFILE & TAILORED FOOD CUSTOMIZER HUB */}
      <div style={{ background: "#fffaf8", border: "2px solid #ffedd5", borderRadius: "16px", padding: "16px", marginBottom: "20px", boxShadow: "0 4px 15px rgba(249, 115, 22, 0.05)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>🥗</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: "17px", color: "#ea580c" }}>Elextra Food Profiler & Specific Customizer</div>
              <div style={{ fontSize: "11px", color: "#c2410c", fontWeight: 600 }}>Set your likes/dislikes and customize actual menu items specifically!</div>
            </div>
          </div>
          
          {/* Custom Tabs */}
          <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "10px" }}>
            <button
              onClick={() => setCustomizerTopTab("customizer")}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "11px",
                fontWeight: "bold",
                background: customizerTopTab === "customizer" ? "white" : "transparent",
                boxShadow: customizerTopTab === "customizer" ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
                color: customizerTopTab === "customizer" ? "#ea580c" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              🛠️ Specific Customizer
            </button>
            <button
              onClick={() => setCustomizerTopTab("taste_profile")}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "11px",
                fontWeight: "bold",
                background: customizerTopTab === "taste_profile" ? "white" : "transparent",
                boxShadow: customizerTopTab === "taste_profile" ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
                color: customizerTopTab === "taste_profile" ? "#ea580c" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              💚 Taste Profile ({likes.length + dislikes.length})
            </button>
          </div>
        </div>

        {customizerTopTab === "taste_profile" ? (
          <div>
            <div style={{ background: "#fef3c7", border: "1px solid #fde047", padding: "10px 12px", borderRadius: "10px", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#92400e" }}>💡 How Your Taste Profile Works:</div>
              <div style={{ fontSize: "10.5px", color: "#78350f", marginTop: "2px", lineHeight: "1.4" }}>
                1. Ingredients you <strong>Like (💚)</strong> are highlighted on menus and default to "Standard" or can be easily upgraded.
                <br />
                2. Ingredients you <strong>Dislike (❌)</strong> show visual warning alerts on menus and are <strong>automatically excluded</strong> with a note to the chef when you customize!
                <br />
                3. Click any ingredient tag in restaurant menus below to change your preference on the fly!
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
              {COMMON_INGREDIENTS.map(ing => {
                const isLiked = likes.includes(ing.keyword);
                const isDisliked = dislikes.includes(ing.keyword);
                return (
                  <div
                    key={ing.keyword}
                    style={{
                      background: "white",
                      border: `1.5px solid ${isLiked ? "#22c55e" : isDisliked ? "#ef4444" : "#cbd5e1"}`,
                      borderRadius: "12px",
                      padding: "8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: (isLiked || isDisliked) ? "0 2px 6px rgba(0,0,0,0.03)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{ing.icon}</span>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--elextra-text)", textAlign: "center" }}>{ing.name}</span>
                    <div style={{ display: "flex", gap: "2px", width: "100%", marginTop: "4px" }}>
                      <button
                        onClick={() => {
                          let newL = likes.filter(x => x !== ing.keyword);
                          let newD = dislikes.filter(x => x !== ing.keyword);
                          if (!isLiked) newL.push(ing.keyword);
                          saveLikesAndDislikes(newL, newD);
                        }}
                        style={{
                          flex: 1,
                          background: isLiked ? "#dcfce7" : "#f1f5f9",
                          color: isLiked ? "#15803d" : "#64748b",
                          border: "none",
                          borderRadius: "6px",
                          padding: "4px 2px",
                          fontSize: "9px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        💚 Like
                      </button>
                      <button
                        onClick={() => {
                          let newL = likes.filter(x => x !== ing.keyword);
                          let newD = dislikes.filter(x => x !== ing.keyword);
                          if (!isDisliked) newD.push(ing.keyword);
                          saveLikesAndDislikes(newL, newD);
                        }}
                        style={{
                          flex: 1,
                          background: isDisliked ? "#fee2e2" : "#f1f5f9",
                          color: isDisliked ? "#dc2626" : "#64748b",
                          border: "none",
                          borderRadius: "6px",
                          padding: "4px 2px",
                          fontSize: "9px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        ❌ Avoid
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom tag section */}
            <div style={{ marginTop: "16px", background: "white", padding: "12px", borderRadius: "12px", border: "1.5px solid var(--elextra-border, #e2e8f0)" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>✨ Add Custom Keyword / Ingredient:</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <input
                  type="text"
                  placeholder="e.g. Garlic, Mayo, Pork, Cheese..."
                  value={customKeyword}
                  onChange={e => setCustomKeyword(e.target.value)}
                  style={{ flex: 1, height: "32px", fontSize: "11px", padding: "0 8px", background: "white", border: "1.5px solid #cbd5e1", borderRadius: "8px" }}
                />
                <button
                  onClick={() => {
                    const cleaned = customKeyword.trim().toLowerCase();
                    if (!cleaned) return;
                    if (likes.includes(cleaned) || dislikes.includes(cleaned)) {
                      if (notify) notify(`"${cleaned}" is already in your profile!`, "err");
                      return;
                    }
                    saveLikesAndDislikes([...likes, cleaned], dislikes);
                    setCustomKeyword("");
                    if (notify) notify(`Added custom liked keyword: "${cleaned}"! 💚`, "ok");
                  }}
                  style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "8px", padding: "0 10px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Like 💚
                </button>
                <button
                  onClick={() => {
                    const cleaned = customKeyword.trim().toLowerCase();
                    if (!cleaned) return;
                    if (likes.includes(cleaned) || dislikes.includes(cleaned)) {
                      if (notify) notify(`"${cleaned}" is already in your profile!`, "err");
                      return;
                    }
                    saveLikesAndDislikes(likes, [...dislikes, cleaned]);
                    setCustomKeyword("");
                    if (notify) notify(`Added custom avoided keyword: "${cleaned}"! ❌`, "ok");
                  }}
                  style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "8px", padding: "0 10px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Avoid ❌
                </button>
              </div>

              {/* Display custom entries */}
              {(() => {
                const customLikes = likes.filter(k => !COMMON_INGREDIENTS.some(i => i.keyword === k));
                const customDislikes = dislikes.filter(k => !COMMON_INGREDIENTS.some(i => i.keyword === k));
                if (customLikes.length === 0 && customDislikes.length === 0) return null;
                return (
                  <div style={{ marginTop: "12px", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
                    <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b" }}>YOUR CUSTOM PREFERENCES:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                      {customLikes.map(k => (
                        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" }}>
                          💚 {k}
                          <button onClick={() => saveLikesAndDislikes(likes.filter(x => x !== k), dislikes)} style={{ border: "none", background: "none", color: "#15803d", cursor: "pointer", fontWeight: "900", marginLeft: "2px" }}>✕</button>
                        </span>
                      ))}
                      {customDislikes.map(k => (
                        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" }}>
                          ❌ {k}
                          <button onClick={() => saveLikesAndDislikes(likes, dislikes.filter(x => x !== k))} style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer", fontWeight: "900", marginLeft: "2px" }}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div>
            {!activeCustomFood ? (
              <div style={{ textAlign: "center", padding: "24px 12px", background: "white", borderRadius: "12px", border: "1.5px dashed #cbd5e1" }}>
                <span style={{ fontSize: "36px" }}>🛠️</span>
                <div style={{ fontWeight: "bold", fontSize: "14px", marginTop: "8px", color: "#334155" }}>Specific Food Customizer Ready</div>
                <div style={{ fontSize: "11px", color: "#64748b", maxWidth: "420px", margin: "4px auto 12px", lineHeight: "1.4" }}>
                  To customize a specific menu item, browse the restaurant list below and click the <strong>"Customize ⚙️"</strong> button. The recipe will instantly load here!
                </div>
                
                <div style={{ maxWidth: "340px", margin: "0 auto", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#ea580c", marginBottom: "6px" }}>⚡ Or Quick-Select a Local Dish to Customize:</div>
                  <select
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (isNaN(idx)) return;
                      const d = QUICK_CUSTOMIZABLE_FOODS[idx];
                      const targetFood = {
                        pId: `food-quick-${idx}-${Date.now()}`,
                        itemName: d.itemName,
                        basePrice: d.basePrice,
                        restaurantName: d.restaurantName,
                        restaurantId: d.restaurantId
                      };
                      setActiveCustomFood(targetFood);
                      const detected = detectIngredientsInFood(d.itemName);
                      const initialConfig = {};
                      detected.forEach(ing => {
                        if (dislikes.includes(ing.keyword)) {
                          initialConfig[ing.keyword] = "exclude";
                        } else {
                          initialConfig[ing.keyword] = "standard";
                        }
                      });
                      setCustomIngredients(initialConfig);
                      setCustPortion("Standard");
                      setCustSpice("Medium");
                      setCustAddons([]);
                      setCustNotes(detected.filter(ing => dislikes.includes(ing.keyword)).map(ing => `No ${ing.name}`).join(", "));
                    }}
                    defaultValue=""
                    style={{ width: "100%", padding: "8px", fontSize: "11px", borderRadius: "8px", border: "1.5px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "600", color: "#475569" }}
                  >
                    <option value="" disabled>-- Select a popular local dish --</option>
                    {QUICK_CUSTOMIZABLE_FOODS.map((f, i) => (
                      <option key={i} value={i}>{f.itemName} - ₵{f.basePrice} ({(f.restaurantName || "Joint").split(" ")[0]})</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #ffedd5", padding: "14px" }}>
                {/* Active Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontSize: "10px", background: "#fff7ed", color: "#c2410c", padding: "2px 6px", borderRadius: "6px", fontWeight: "bold" }}>
                      📍 {activeCustomFood.restaurantName}
                    </span>
                    <h4 style={{ fontSize: "15px", fontWeight: 900, color: "var(--elextra-text)", marginTop: "4px" }}>
                      Tailoring: {activeCustomFood.itemName}
                    </h4>
                  </div>
                  <button
                    onClick={() => setActiveCustomFood(null)}
                    style={{ background: "#f1f5f9", border: "none", borderRadius: "18px", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "11px", color: "#64748b" }}
                    title="Choose another dish"
                  >
                    ✕
                  </button>
                </div>

                {/* 1. Description-based Ingredient adjustments */}
                {(() => {
                  const detected = detectIngredientsInFood(activeCustomFood.itemName);
                  return (
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "6px" }}>🔍 Recipe Ingredient Customization:</div>
                      {detected.length === 0 ? (
                        <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", padding: "4px 0" }}>
                          No modular ingredients detected in this dish name. You can still adjust portion size, spice level and write instructions!
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {detected.map(ing => {
                            const status = customIngredients[ing.keyword] || "standard";
                            const isLiked = likes.includes(ing.keyword);
                            const isDisliked = dislikes.includes(ing.keyword);
                            const doubleCost = ELEXTRA_TOPPING_PRICES[ing.name] || 10;
                            
                            return (
                              <div
                                key={ing.keyword}
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                  padding: "8px 10px",
                                  background: isDisliked ? "#fff5f5" : isLiked ? "#f0fdf4" : "#f8fafc",
                                  border: `1.5px solid ${isDisliked ? "#fee2e2" : isLiked ? "#dcfce7" : "#e2e8f0"}`,
                                  borderRadius: "10px"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "18px" }}>{ing.icon}</span>
                                  <div>
                                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--elextra-text)" }}>{ing.name}</span>
                                    {isDisliked && <span style={{ fontSize: "9px", color: "#dc2626", fontWeight: "bold", marginLeft: "6px" }}>⚠️ Disliked</span>}
                                    {isLiked && <span style={{ fontSize: "9px", color: "#16a34a", fontWeight: "bold", marginLeft: "6px" }}>💚 Favorite</span>}
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: "2px", background: "#e2e8f0", padding: "2px", borderRadius: "8px" }}>
                                  <button
                                    onClick={() => setCustomIngredients({ ...customIngredients, [ing.keyword]: "exclude" })}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      background: status === "exclude" ? "#ef4444" : "transparent",
                                      color: status === "exclude" ? "white" : "#475569"
                                    }}
                                  >
                                    Exclude 🚫
                                  </button>
                                  <button
                                    onClick={() => setCustomIngredients({ ...customIngredients, [ing.keyword]: "standard" })}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      background: status === "standard" ? "white" : "transparent",
                                      color: status === "standard" ? "#1e293b" : "#475569",
                                      boxShadow: status === "standard" ? "0 1px 3px rgba(0,0,0,0.05)" : "none"
                                    }}
                                  >
                                    Standard
                                  </button>
                                  <button
                                    onClick={() => setCustomIngredients({ ...customIngredients, [ing.keyword]: "double" })}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      background: status === "double" ? "#eab308" : "transparent",
                                      color: status === "double" ? "#451a03" : "#475569"
                                    }}
                                  >
                                    Double (+₵{doubleCost}) 🌟
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Portion & Spice selection */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>🍽️ Portion Upgrade</label>
                    <select
                      value={custPortion}
                      onChange={e => setCustPortion(e.target.value)}
                      style={{ width: "100%", padding: "6px", marginTop: "4px", fontSize: "11px", borderRadius: "8px", border: "1.5px solid #cbd5e1", background: "white", fontWeight: "600", color: "#475569" }}
                    >
                      <option value="Standard">Standard portion (+₵0)</option>
                      <option value="Extra Portion">Extra Portion (+₵10)</option>
                      <option value="Jumbo Mega Plate">Jumbo Mega Plate (+₵18)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>🌶️ Spice Level</label>
                    <select
                      value={custSpice}
                      onChange={e => setCustSpice(e.target.value)}
                      style={{ width: "100%", padding: "6px", marginTop: "4px", fontSize: "11px", borderRadius: "8px", border: "1.5px solid #cbd5e1", background: "white", fontWeight: "600", color: "#475569" }}
                    >
                      <option value="No Pepper">No Pepper</option>
                      <option value="Medium">Medium</option>
                      <option value="Extra Spicy 🔥">Extra Spicy 🔥 (+₵2)</option>
                    </select>
                  </div>
                </div>

                {/* 3. Extra Toppings */}
                {(() => {
                  const toppings = getToppingOptionsForFood(activeCustomFood.itemName);
                  if (toppings.length === 0) return null;
                  return (
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>➕ Optional Chop-Bar Toppings:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {toppings.map(t => {
                          const checked = custAddons.includes(t.n);
                          return (
                            <label
                              key={t.n}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                background: checked ? "#fffbeb" : "#f8fafc",
                                border: `1.5px solid ${checked ? "#f59e0b" : "#cbd5e1"}`,
                                borderRadius: "8px",
                                padding: "4px 8px",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                color: "#475569"
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    setCustAddons(custAddons.filter(a => a !== t.n));
                                  } else {
                                    setCustAddons([...custAddons, t.n]);
                                  }
                                }}
                                style={{ accentColor: "#f59e0b" }}
                              />
                              <span>{t.n} (+₵{t.p})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Special Instructions / Warnings */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>✍️ Special Requests / Chef Note:</label>
                  <textarea
                    rows={2}
                    value={custNotes}
                    onChange={e => setCustNotes(e.target.value)}
                    placeholder="e.g. Please put stew on the side, make it extra dry..."
                    style={{ width: "100%", padding: "8px", marginTop: "4px", fontSize: "11px", borderRadius: "8px", border: "1.5px solid #cbd5e1", background: "white", resize: "none", color: "#475569" }}
                  />
                </div>

                {/* 5. Live compiles price & submit */}
                {(() => {
                  let total = activeCustomFood.basePrice;
                  Object.entries(customIngredients).forEach(([keyword, status]) => {
                    if (status === "double") {
                      const ingName = COMMON_INGREDIENTS.find(i => i.keyword === keyword)?.name || keyword;
                      const doubleCost = ELEXTRA_TOPPING_PRICES[ingName] || 10;
                      total += doubleCost;
                    }
                  });
                  if (custPortion === "Extra Portion") total += 10;
                  if (custPortion === "Jumbo Mega Plate") total += 18;
                  if (custSpice === "Extra Spicy 🔥") total += 2;
                  custAddons.forEach(ad => {
                    total += ELEXTRA_TOPPING_PRICES[ad] || 0;
                  });

                  return (
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px", background: "#fffbeb", padding: "12px", borderRadius: "12px", border: "1.5px solid #fef3c7" }}>
                      <div>
                        <div style={{ fontSize: "10px", color: "#b45309", fontWeight: "bold" }}>COMPILED MEAL PRICE:</div>
                        <div style={{ fontSize: "18px", fontWeight: 950, color: "#92400e" }}>₵{total}</div>
                      </div>
                      <button
                        onClick={() => {
                          const exclusions = Object.entries(customIngredients)
                            .filter(([_, status]) => status === "exclude")
                            .map(([kw, _]) => `No ${COMMON_INGREDIENTS.find(i => i.keyword === kw)?.name || kw}`);
                            
                          const doubles = Object.entries(customIngredients)
                            .filter(([_, status]) => status === "double")
                            .map(([kw, _]) => `Double ${COMMON_INGREDIENTS.find(i => i.keyword === kw)?.name || kw}`);
                            
                          const extras = [...exclusions, ...doubles];
                          if (custPortion !== "Standard") extras.push(custPortion);
                          if (custSpice !== "Medium") extras.push(`Spice: ${custSpice}`);
                          custAddons.forEach(ad => extras.push(`+ ${ad}`));
                          
                          const noteStr = custNotes.trim() ? `, Note: "${custNotes}"` : "";
                          
                          const finalName = `${activeCustomFood.itemName} (${(activeCustomFood.restaurantName || "Joint").split(" ")[0]}) [${extras.length > 0 ? extras.join(", ") : "Standard"}${noteStr}]`;
                          
                          const customProduct = {
                            id: `food-custom-tailored-${Date.now()}`,
                            name: finalName,
                            price: total,
                            cat: "Local Fast Food",
                            img: "🍲",
                            tag: "Tailored Feast",
                            unit: "plate"
                          };
                          
                          addToCart(customProduct);
                          if (notify) notify(`Custom ${activeCustomFood.itemName} added to your basket! 🛒`, "ok");
                          setActiveCustomFood(null);
                        }}
                        style={{ ...S.addBtn, width: "auto", padding: "8px 16px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white", fontSize: "12px" }}
                      >
                        Confirm & Add To Basket 🛒
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🥩🐟 MEAT AND FISH UNIFIED SETUP MODAL */}
      {showMeatFishModal && (
        <div style={S.mBg} onClick={() => setShowMeatFishModal(false)}>
          <div style={{ ...S.mBox, overflow: "visible", maxWidth: "450px" }} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={() => setShowMeatFishModal(false)}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "2px solid #ffedd5", paddingBottom: "10px" }}>
              <span style={{ fontSize: "24px" }}>🍖</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: "16px", color: "#ea580c" }}>Meat & Fish Setup</div>
                <div style={{ fontSize: "11px", color: "var(--elextra-subtext, #64748b)" }}>Choose proteins, add-on portions and quantities</div>
              </div>
            </div>

            {/* Tab selection inside modal */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px", borderBottom: "1px solid #cbd5e1" }}>
              <button
                onClick={() => setActiveMeatFishTab("meat")}
                style={{
                  flex: 1,
                  padding: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  border: "none",
                  borderBottom: activeMeatFishTab === "meat" ? "3px solid #f97316" : "none",
                  background: activeMeatFishTab === "meat" ? "#fff7ed" : "transparent",
                  color: activeMeatFishTab === "meat" ? "#ea580c" : "#64748b"
                }}
              >
                🥩 Meat Setup (+₵{getMeatPrice()})
              </button>
              <button
                onClick={() => setActiveMeatFishTab("fish")}
                style={{
                  flex: 1,
                  padding: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  border: "none",
                  borderBottom: activeMeatFishTab === "fish" ? "3px solid #f97316" : "none",
                  background: activeMeatFishTab === "fish" ? "#fff7ed" : "transparent",
                  color: activeMeatFishTab === "fish" ? "#ea580c" : "#64748b"
                }}
              >
                🐟 Fish Setup (+₵{getFishPrice()})
              </button>
            </div>

            {activeMeatFishTab === "meat" ? (
              <div>
                {/* Meat Section */}
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b", marginBottom: "6px" }}>🥩 PREMIUM COOKED MEAT CHEST</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>Starting base price GHS 15. Customize increments of +GHS 5 freely.</div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0", padding: "12px", background: "white", borderRadius: "10px", border: "1.5px solid #e2e8f0" }}>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "13px" }}>Extra Portion (+₵5)</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Add more cooked meat cuts</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button 
                      onClick={() => setMeatExtraQty(Math.max(0, meatExtraQty - 1))}
                      style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "bold" }}
                    >-</button>
                    <span style={{ fontWeight: "900", fontSize: "14px" }}>{meatExtraQty}</span>
                    <button 
                      onClick={() => setMeatExtraQty(meatExtraQty + 1)}
                      style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "bold" }}
                    >+</button>
                  </div>
                </div>

                {/* Wele portion checkbox (+₵5, available for Waakye only) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0", padding: "10px", background: riceType === "Waakye" ? "#fff7ed" : "#f1f5f9", borderRadius: "8px", border: riceType === "Waakye" ? "1.5px solid #f97316" : "1.5px solid #cbd5e1", opacity: riceType === "Waakye" ? 1 : 0.6 }}>
                  <input
                    type="checkbox"
                    id="includeWeleCheck"
                    disabled={riceType !== "Waakye"}
                    checked={includeWele && riceType === "Waakye"}
                    onChange={(e) => setIncludeWele(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: riceType === "Waakye" ? "pointer" : "not-allowed" }}
                  />
                  <label htmlFor="includeWeleCheck" style={{ fontSize: "12px", fontWeight: "bold", cursor: riceType === "Waakye" ? "pointer" : "not-allowed", display: "flex", flexDirection: "column" }}>
                    <span>Include Soft Cooked Wele (+₵5)</span>
                    <span style={{ fontSize: "10px", color: riceType === "Waakye" ? "#c2410c" : "#64748b" }}>
                      {riceType === "Waakye" ? "✓ Fully available for Waakye!" : "⚠️ Available only when Grain Specialty is Waakye."}
                    </span>
                  </label>
                </div>

                {/* Total Meat Price display */}
                <div style={{ fontWeight: "800", fontSize: "13px", color: "#b45309", padding: "8px 12px", background: "#fef3c7", borderRadius: "8px", border: "1.5px dashed #fde047", marginBottom: "16px", marginTop: "12px" }}>
                  🍗 Total Meat Setup Amount: ₵{getMeatPrice()}
                </div>
              </div>
            ) : (
              <div>
                {/* Fish Section */}
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b", marginBottom: "6px" }}>🐟 FRIED GOLDEN RED FISH</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>Starting base price GHS 10. Customize increments of +GHS 5 freely.</div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0", padding: "12px", background: "white", borderRadius: "10px", border: "1.5px solid #e2e8f0" }}>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "13px" }}>Extra Portion (+₵5)</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Add more deep fried fish slices</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button 
                      onClick={() => setFishExtraQty(Math.max(0, fishExtraQty - 1))}
                      style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "bold" }}
                    >-</button>
                    <span style={{ fontWeight: "900", fontSize: "14px" }}>{fishExtraQty}</span>
                    <button 
                      onClick={() => setFishExtraQty(fishExtraQty + 1)}
                      style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "bold" }}
                    >+</button>
                  </div>
                </div>

                {/* Total Fish Price display */}
                <div style={{ fontWeight: "800", fontSize: "13px", color: "#1e3a8a", padding: "8px 12px", background: "#dbeafe", borderRadius: "8px", border: "1.5px dashed #bfdbfe", marginBottom: "16px", marginTop: "12px" }}>
                  🐟 Total Fish Setup Amount: ₵{getFishPrice()}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1.5px solid #e2e8f0", paddingTop: "12px" }}>
              <button
                style={{ ...S.backBtn, padding: "8px 12px" }}
                onClick={() => {
                  setShowMeatFishModal(false);
                }}
              >
                Close ✕
              </button>
              <button
                style={{ ...S.cta, padding: "10px 16px", fontSize: "12px", borderRadius: "10px" }}
                onClick={() => {
                  if (activeMeatFishTab === "meat") {
                    if (!riceAddons.includes("Customized Meat")) {
                      setRiceAddons([...riceAddons, "Customized Meat"]);
                    }
                  } else {
                    if (!riceAddons.includes("Customized Fried Fish")) {
                      setRiceAddons([...riceAddons, "Customized Fried Fish"]);
                    }
                  }
                  setShowMeatFishModal(false);
                  if (notify) notify(`Customized protein added to your options list! ✅`, "ok");
                }}
              >
                Save Configuration ✅
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input 
            value={srch} 
            onChange={e => setSrch(e.target.value)} 
            placeholder="Search fast food or specific dishes (e.g. Rice, Fufu, Burgers)..." 
            style={{ ...S.inp, paddingLeft: "38px" }} 
          />
          {srch && (
            <button 
              onClick={() => setSrch("")}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#94a3b8" }}
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={startSpeechRecognition}
          style={{
            background: isListening ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #f97316, #ea580c)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "18px",
            boxShadow: "0 2px 6px rgba(234,88,12,0.15)",
            animation: isListening ? "pulse 1.5s infinite" : "none",
            transition: "all 0.2s"
          }}
          title="Voice Search & Ordering"
        >
          🎙️
        </button>
      </div>

      {filtered.map(f => {
        const isUnavailable = f.status && f.status !== "active";
        return (
          <div key={f.id} style={{ ...S.sec, marginBottom: "12px", opacity: isUnavailable ? 0.75 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setSel(sel === f.id ? null : f.id)}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>{f.name}</div>
                  {f.status === "finished" && <span style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: "bold" }}>🚫 Finished</span>}
                  {f.status === "close" && <span style={{ background: "#f3f4f6", color: "#4b5563", border: "1px solid #d1d5db", fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: "bold" }}>🔒 Closed</span>}
                  {f.status === "temporary down" && <span style={{ background: "#fef3c7", color: "#d97706", border: "1px solid #fde047", fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: "bold" }}>⚠️ Temp. Down</span>}
                  {(!f.status || f.status === "active") && <span style={{ background: "#ecfdf5", color: "#10b981", border: "1px solid #a7f3d0", fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: "bold" }}>● Active</span>}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={12} /> {f.location}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <Clock size={12} /> {f.hours} · {f.type}
                </div>
                <div style={{ fontSize: "12px", color: "#eab308", marginTop: "4px", display: "flex", alignItems: "center", gap: "2px" }}>
                  <Star size={12} fill="#eab308" /> {f.rating}
                </div>
              </div>
              <div style={{ background: sel === f.id ? "#ef4444" : "#f1f5f9", color: sel === f.id ? "white" : "#64748b", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px" }}>
                {sel === f.id ? "▲" : "▼"}
              </div>
            </div>

            <AnimatePresence>
              {sel === f.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden", marginTop: "14px", borderTop: "2px solid #f1f5f9", paddingTop: "14px" }}>
                  {f.imgUrl && (
                    <img
                      src={f.imgUrl}
                      alt={f.name}
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "10px", marginBottom: "14px", border: "1px solid #e2e8f0" }}
                    />
                  )}
                  {isUnavailable && (
                    <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "8px 12px", borderRadius: "8px", fontSize: "11.5px", marginBottom: "12px", fontWeight: "bold" }}>
                      ⚠️ Sorry, this food joint is currently unavailable for order due to daily supply shortage, closing hour, or system maintenance.
                    </div>
                  )}
                  <div style={{ fontWeight: 700, marginBottom: "10px", color: "#ef4444", fontSize: "13px" }}>
                    📋 Daily Menu — Rates for {today}
                  </div>
                  {f.menu.map((m, i) => {
                    const pId = `food-${f.id}-${i}`;
                    const foodProduct: Product = {
                      id: pId,
                      name: `${m.item} (${f.name})`,
                      price: m.price,
                      cat: "Local Fast Food",
                      img: "🍲",
                      tag: "Hot Delivery",
                      unit: "plate"
                    };
                    const isCustomizing = customizingId === pId;
                  
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "14px", color: "#334155", fontWeight: 700 }}>{m.item}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Instant rider collection</div>
                          
                          {/* Taste Compatibility Badges */}
                          {(() => {
                            const { matchedLikes, matchedDislikes } = getFoodCompatibility(m.item, likes, dislikes);
                            const hasLikes = matchedLikes.length > 0;
                            const hasDislikes = matchedDislikes.length > 0;
                            if (!hasLikes && !hasDislikes) return null;
                            return (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                {matchedLikes.map(name => {
                                  const ingObj = COMMON_INGREDIENTS.find(ci => ci.name === name);
                                  const kw = ingObj ? ingObj.keyword : name.toLowerCase();
                                  return (
                                    <span
                                      key={name}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newL = likes.filter(x => x !== kw);
                                        saveLikesAndDislikes(newL, dislikes);
                                        if (notify) notify(`Removed "${name}" from favorites! 💚`, "ok");
                                      }}
                                      className="badge-green"
                                      style={{
                                        padding: "2px 6px",
                                        borderRadius: "6px",
                                        fontSize: "10px",
                                        fontWeight: "bold",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "2px",
                                        cursor: "pointer"
                                      }}
                                      title="Click to remove from favorites"
                                    >
                                      💚 {name} ✕
                                    </span>
                                  );
                                })}
                                {matchedDislikes.map(name => {
                                  const ingObj = COMMON_INGREDIENTS.find(ci => ci.name === name);
                                  const kw = ingObj ? ingObj.keyword : name.toLowerCase();
                                  return (
                                    <span
                                      key={name}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newD = dislikes.filter(x => x !== kw);
                                        saveLikesAndDislikes(likes, newD);
                                        if (notify) notify(`Removed "${name}" from avoidance list! ❌`, "ok");
                                      }}
                                      className="badge-red"
                                      style={{
                                        padding: "2px 6px",
                                        borderRadius: "6px",
                                        fontSize: "10px",
                                        fontWeight: "bold",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "2px",
                                        cursor: "pointer"
                                      }}
                                      title="Click to remove from avoidance list"
                                    >
                                      ⚠️ Avoid: {name} ✕
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "14px" }}>₵{Math.round(m.price)}</div>
                          
                          <button 
                            disabled={isUnavailable}
                            style={{ 
                              background: isUnavailable ? "#f3f4f6" : "#f0fdf4", 
                              border: isUnavailable ? "1.5px solid #e5e7eb" : "1.5px solid #bbf7d0", 
                              color: isUnavailable ? "#9ca3af" : "#166534", 
                              padding: "4px 8px", 
                              borderRadius: "8px", 
                              fontSize: "11px", 
                              fontWeight: "bold", 
                              cursor: isUnavailable ? "not-allowed" : "pointer" 
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnavailable) return;
                              addToCart(foodProduct);
                            }}
                            title={isUnavailable ? "Joint currently closed" : "Instant fast add to basket"}
                          >
                            Fast Add ⚡
                          </button>

                          <button 
                            disabled={isUnavailable}
                            style={{ 
                              background: isUnavailable ? "#f3f4f6" : "#fff5f5", 
                              border: isUnavailable ? "1.5px solid #e5e7eb" : "1.5px solid #feb2b2", 
                              color: isUnavailable ? "#9ca3af" : "#e53e3e", 
                              padding: "4px 8px", 
                              borderRadius: "8px", 
                              fontSize: "11px", 
                              fontWeight: "bold", 
                              cursor: isUnavailable ? "not-allowed" : "pointer" 
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnavailable) return;
                              
                              if (isCustomizing) {
                                setCustomizingId(null);
                              } else {
                                setCustomizingId(pId);
                                setCustPortion("Standard");
                                setCustSpice("Medium");
                                setCustAddons([]);
                                setCustNotes("");
                              }
                            }}
                          >
                            {isCustomizing ? "Close ×" : "Customize ⚙️"}
                          </button>
                        </div>
                      </div>

                      {isCustomizing && (
                        <div 
                          style={{ background: "#fff8f6", border: "1.5px solid #ffedd5", borderRadius: "8px", padding: "10px", marginTop: "10px" }}
                        >
                          <div style={{ fontWeight: 850, fontSize: "12px", color: "#c2410c", marginBottom: "8px", borderBottom: "1px solid #fed7aa", paddingBottom: "2px" }}>
                            🍳 CUSTOMIZE YOUR {m.item.toUpperCase()}
                          </div>

                          {/* Portion selection */}
                          <div style={{ marginBottom: "8px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>Portion Size:</div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {[
                                { n: "Standard", p: 0 },
                                { n: "Extra Portion", p: 10 },
                                { n: "Jumbo Mega Plate", p: 18 }
                              ].map(p => (
                                <button
                                  key={p.n}
                                  onClick={() => setCustPortion(p.n)}
                                  style={{
                                    flex: 1,
                                    fontSize: "10.5px",
                                    padding: "4px 6px",
                                    borderRadius: "6px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    background: custPortion === p.n ? "#ffedd5" : "white",
                                    border: `1.5px solid ${custPortion === p.n ? "#ea580c" : "#cbd5e1"}`,
                                    color: custPortion === p.n ? "#9a3412" : "#475569"
                                  }}
                                >
                                  {p.n} {p.p > 0 ? `(+₵${p.p})` : ""}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Spice Level */}
                          <div style={{ marginBottom: "8px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>Spice Level:</div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {[
                                { n: "No Pepper", p: 0 },
                                { n: "Medium", p: 0 },
                                { n: "Extra Spicy 🔥", p: 2 }
                              ].map(s => (
                                <button
                                  key={s.n}
                                  onClick={() => setCustSpice(s.n)}
                                  style={{
                                    flex: 1,
                                    fontSize: "10.5px",
                                    padding: "4px 6px",
                                    borderRadius: "6px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    background: custSpice === s.n ? "#ffedd5" : "white",
                                    border: `1.5px solid ${custSpice === s.n ? "#ea580c" : "#cbd5e1"}`,
                                    color: custSpice === s.n ? "#9a3412" : "#475569"
                                  }}
                                >
                                  {s.n} {s.p > 0 ? `(+₵${s.p})` : ""}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Extra side toppings */}
                          <div style={{ marginBottom: "8px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>Optional Chef Toppings:</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                              {getToppingOptionsForFood(m.item).map(item => {
                                const checked = custAddons.includes(item.n);
                                return (
                                  <div
                                    key={item.n}
                                    onClick={() => {
                                      if (checked) setCustAddons(custAddons.filter(a => a !== item.n));
                                      else setCustAddons([...custAddons, item.n]);
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      background: checked ? "#fff7ed" : "white",
                                      border: checked ? "1.2px solid #ea580c" : "1.2px solid #e2e8f0"
                                    }}
                                  >
                                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>{item.n}</span>
                                    <span style={{ fontSize: "10px", fontWeight: "bold", color: "#ca8a04" }}>+₵{item.p}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Custom Text input */}
                          <div style={{ marginBottom: "10px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "3px" }}>Chef instructions / Preference:</div>
                            <input 
                               value={custNotes}
                               onChange={e => setCustNotes(e.target.value)}
                               placeholder="e.g. No raw onions, separate the gravy/sauce..."
                               style={{ ...S.inp, height: "30px", fontSize: "11px", padding: "0 8px", background: "white" }}
                            />
                          </div>

                          {/* Footer Action buttons with computed final cost */}
                          {(() => {
                            const normalPrice = m.price;
                            let bonusPrice = 0;
                            if (custPortion === "Extra Portion") bonusPrice += 10;
                            if (custPortion === "Jumbo Mega Plate") bonusPrice += 18;
                            if (custSpice === "Extra Spicy 🔥") bonusPrice += 2;
                            custAddons.forEach(ad => {
                              bonusPrice += ELEXTRA_TOPPING_PRICES[ad] || 0;
                            });
                            const finalPrice = normalPrice + bonusPrice;
                            return (
                              <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", borderTop: "1.2px dashed #fed7aa", paddingTop: "8px", marginTop: "4px" }}>
                                <div>
                                  <div style={{ fontSize: "9.5px", color: "#c2410c", fontWeight: "bold" }}>COMPILED PRICE:</div>
                                  <div style={{ fontSize: "14px", fontWeight: 900, color: "#ca8a04" }}>₵{finalPrice}</div>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    onClick={() => setCustomizingId(null)}
                                    style={{ background: "#f1f5f9", color: "#475569", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "10px", padding: "4px 8px", fontWeight: "bold", cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      const addonText = custAddons.length > 0 ? `, Addons: ${custAddons.join(", ")}` : "";
                                      const notesText = custNotes.trim() ? `, Note: "${custNotes}"` : "";
                                      const customProduct: Product = {
                                        id: `food-custom-item-${Date.now()}`,
                                        name: `${m.item} (${custPortion}, ${custSpice}${addonText}${notesText})`,
                                        price: finalPrice,
                                        cat: "Local Fast Food",
                                        img: "🍲",
                                        tag: "Tailored Dish",
                                        unit: "plate"
                                      };
                                      addToCart(customProduct);
                                      setCustomizingId(null);
                                      // reset options
                                      setCustPortion("Standard");
                                      setCustSpice("Medium");
                                      setCustAddons([]);
                                      setCustNotes("");
                                      if (notify) notify(`Customized ${m.item} added! 🍲`, "ok");
                                    }}
                                    style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white", border: "none", borderRadius: "6px", fontSize: "10px", padding: "5px 12px", fontWeight: "bold", cursor: "pointer" }}
                                  >
                                    Confirm & Add 🛒
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "12px", color: "#166534" }}>
                  💡 <strong>Direct Dispatch:</strong> Food items can be added straight to your basket! We will dispatch an active motor rider to purchase and bring your meal to your location instantly.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        );
      })}
      {filtered.length === 0 && <Empty />}

      {/* ────────────────── 📅 FUTURE ENHANCEMENTS SECTION ────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginTop: "30px", borderTop: "2px solid #e2e8f0", paddingTop: "24px" }}>
        
        {/* 1. QR CODE DINING SCANNER */}
        <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "20px", borderRadius: "16px", color: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px" }}>📸</span>
              <div>
                <strong style={{ fontSize: "16px", color: "#21F1A8" }}>QR Code Dining Scanner</strong>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Scan in-dining table QR codes for direct-to-table service & 5% discount</div>
              </div>
            </div>
            {activeQr ? (
              <span style={{ background: "#065f46", color: "#34d399", fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "20px", border: "1px solid #059669" }}>
                CONNECTED: {activeQr}
              </span>
            ) : (
              <span style={{ background: "#334155", color: "#cbd5e1", fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "20px" }}>
                Not Scanned
              </span>
            )}
          </div>

          {activeQr ? (
            <div style={{ background: "rgba(33,241,168,0.06)", border: "1.5px solid rgba(33,241,168,0.25)", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#21F1A8" }}>
                🍽️ Table Dining Mode Active ({activeQr})
              </div>
              <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px", marginBottom: "12px" }}>
                Your delivery address has been locked to this table. A 5% discount has been applied to your food checkout order!
              </div>
              <button
                onClick={async () => {
                  setActiveQr(null);
                  await DB.set("elx_qrm", null);
                  window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_qrm", value: null } }));
                  notify("Table dining released. Returned to standard delivery mode.", "ok");
                }}
                style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontSize: "11px", padding: "6px 12px", fontWeight: "bold", cursor: "pointer" }}
              >
                Clear Table QR & Release ✕
              </button>
            </div>
          ) : scanning ? (
            <div style={{ background: "#1c1c1c", border: "2px dashed #21F1A8", borderRadius: "12px", padding: "20px", textAlign: "center", position: "relative" }}>
              <div style={{ animation: "pulse 1.5s infinite", display: "inline-block", padding: "8px 16px", background: "rgba(33,241,168,0.1)", color: "#21F1A8", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", marginBottom: "12px" }}>
                📡 LIVE CAMERA SCANNER ACTIVE...
              </div>

              {/* Hardware Webcam Feed */}
              <div style={{ position: "relative", width: "100%", maxWidth: "340px", margin: "0 auto 16px", borderRadius: "12px", overflow: "hidden", border: "2.5px solid #21F1A8", boxShadow: "0 8px 24px rgba(33,241,168,0.15)" }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: "100%", height: "190px", objectFit: "cover", display: "block", background: "#000" }} 
                />
                <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: "2px", background: "#ef4444", boxShadow: "0 0 8px #ef4444", animation: "scanLine 2s linear infinite" }} />
              </div>

              <div style={{ fontSize: "11px", color: "#cbd5e1", marginBottom: "8px", fontWeight: "bold" }}>
                Choose Table to Check-In:
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                {[
                  { id: "Table-04-Tarkwa-Chopbar", l: "🏷️ Table 4 (Tarkwa Chopbar)" },
                  { id: "Table-02-Buns-Burgers", l: "🏷️ Table 2 (Buns & Burgers)" },
                  { id: "Table-07-Bogoso-Spot", l: "🏷️ Table 7 (Bogoso Local Spot)" }
                ].map(tbl => (
                  <button
                    key={tbl.id}
                    onClick={async () => {
                      setActiveQr(tbl.id);
                      setScanning(false);
                      await DB.set("elx_qrm", tbl.id);
                      window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_qrm", value: tbl.id } }));
                      notify(`Successfully scanned! Checked into ${tbl.id}. 5% dining discount applied! 🎉`, "ok");
                    }}
                    style={{ background: "#2a2a2a", border: "1px solid #444", color: "white", fontSize: "11px", padding: "10px 8px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    {tbl.l}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setScanning(false)}
                style={{ background: "#475569", color: "white", border: "none", borderRadius: "6px", fontSize: "10px", padding: "4px 8px", marginTop: "16px", cursor: "pointer" }}
              >
                Cancel Scan
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "12px", color: "#cbd5e1", marginBottom: "12px" }}>
                Are you currently dining in-person at any of our partner Tarkwa or Bogoso restaurants?
              </div>
              <button
                onClick={() => setScanning(true)}
                style={{ background: "linear-gradient(135deg, #21F1A8, #10b981)", color: "#171717", border: "none", borderRadius: "8px", fontSize: "12px", padding: "8px 16px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 10px rgba(33,241,168,0.25)" }}
              >
                📸 Scan In-Dining Table QR Code
              </button>
            </div>
          )}
        </div>

        {/* 2. TABLE RESERVATIONS & CATERING DUAL CARD MODULE */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          
          {/* A. TABLE RESERVATION CARD */}
          <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "24px" }}>📅</span>
              <div>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>Table Reservations</strong>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Secure your table instantly with instant host alerts</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Select Restaurant *</label>
                <select
                  value={resRestaurant}
                  onChange={e => setResRestaurant(e.target.value)}
                  style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                >
                  <option value="">-- Choose Partner Eatery --</option>
                  {dynamicFoodPlaces.map(f => (
                    <option key={f.name} value={f.name}>{f.name} ({f.location})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Date *</label>
                  <input
                    type="date"
                    value={resDate}
                    onChange={e => setResDate(e.target.value)}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Time *</label>
                  <input
                    type="time"
                    value={resTime}
                    onChange={e => setResTime(e.target.value)}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>No. of Guests *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={resGuests}
                    onChange={e => setResGuests(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Your Name *</label>
                  <input
                    placeholder="e.g. Kwame Mensah"
                    value={resName}
                    onChange={e => setResName(e.target.value)}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Contact Phone *</label>
                <input
                  placeholder="e.g. +233246263123"
                  value={resPhone}
                  onChange={e => setResPhone(e.target.value)}
                  style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                />
              </div>

              <button
                onClick={async () => {
                  if (!resRestaurant || !resDate || !resTime || !resName || !resPhone) {
                    if (notify) notify("Please fill out all table reservation fields!", "err");
                    return;
                  }
                  const newRes = {
                    id: "RES-" + Date.now().toString().slice(-5),
                    restaurant: resRestaurant,
                    guests: resGuests,
                    date: resDate,
                    time: resTime,
                    name: resName,
                    phone: resPhone,
                    status: "Confirmed",
                    createdAt: new Date().toLocaleString()
                  };
                  const updated = [newRes, ...resList];
                  setResList(updated);
                  await DB.set("elx_reservations", updated);
                  window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_reservations", value: updated } }));
                  if (notify) notify(`Table Reservation ${newRes.id} confirmed at ${resRestaurant}! 📅`, "ok");
                  setResRestaurant("");
                  setResDate("");
                  setResTime("");
                  setResGuests(2);
                }}
                style={{ width: "100%", background: "#f97316", color: "white", border: "none", borderRadius: "8px", fontSize: "12.5px", padding: "10px", fontWeight: "bold", cursor: "pointer", marginTop: "8px" }}
              >
                📅 Confirm Table Reservation
              </button>

              {/* View Active Bookings */}
              {resList.length > 0 && (
                <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>📋 Your Active Reservations:</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px", maxHeight: "150px", overflowY: "auto" }}>
                    {resList.slice(0, 3).map(r => (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px" }}>
                        <div>
                          <strong style={{ color: "#0f172a" }}>{r.restaurant}</strong>
                          <div style={{ color: "#64748b" }}>{r.date} @ {r.time} · {r.guests} guests</div>
                        </div>
                        <span style={{ background: "#dcfce7", color: "#166534", fontSize: "9px", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* B. CATERING SERVICES CARD */}
          <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "24px" }}>🍲</span>
              <div>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>Catering Event Bookings</strong>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Arrange bulk food caterers for large events instantly</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Event Type *</label>
                  <select
                    value={catType}
                    onChange={e => setCatType(e.target.value)}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  >
                    <option value="Party">🎉 Private Party</option>
                    <option value="Wedding">👰 Wedding Reception</option>
                    <option value="Corporate">🏢 Corporate Banquet</option>
                    <option value="Funeral">🕊️ Memorial Service</option>
                    <option value="Family">🏡 Family Gathering</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Menu Tier *</label>
                  <select
                    value={catTier}
                    onChange={e => setCatTier(e.target.value)}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  >
                    <option value="Standard Buffets">Standard (₵45/plate)</option>
                    <option value="Executive Feast">Executive (₵80/plate)</option>
                    <option value="Royal Gold Platter">Royal Gold (₵120/plate)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Est. Guests *</label>
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    step={10}
                    value={catGuests}
                    onChange={e => setCatGuests(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Date *</label>
                  <input
                    type="date"
                    value={catDate}
                    onChange={e => setCatDate(e.target.value)}
                    style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>Delivery Venue Address *</label>
                <input
                  placeholder="e.g. Tarkwa Community Center / Bogoso New Town"
                  value={catLocation}
                  onChange={e => setCatLocation(e.target.value)}
                  style={{ width: "100%", padding: "8px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", marginTop: "4px" }}
                />
              </div>

              <button
                onClick={async () => {
                  if (!catDate || !catLocation) {
                    if (notify) notify("Please specify catering delivery date and location venue!", "err");
                    return;
                  }
                  const rate = catTier === "Standard Buffets" ? 45 : (catTier === "Executive Feast" ? 80 : 120);
                  const newCat = {
                    id: "CAT-" + Date.now().toString().slice(-5),
                    type: catType,
                    tier: catTier,
                    guests: catGuests,
                    date: catDate,
                    location: catLocation,
                    totalEstimated: rate * catGuests,
                    status: "Confirmed",
                    createdAt: new Date().toLocaleString()
                  };
                  const updated = [newCat, ...catList];
                  setCatList(updated);
                  await DB.set("elx_catering_orders", updated);
                  window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_catering_orders", value: updated } }));
                  if (notify) notify(`Catering request ${newCat.id} booked successfully for ${catGuests} attendees! 🍲`, "ok");
                  setCatDate("");
                  setCatLocation("");
                }}
                style={{ width: "100%", background: "#ea580c", color: "white", border: "none", borderRadius: "8px", fontSize: "12.5px", padding: "10px", fontWeight: "bold", cursor: "pointer", marginTop: "8px" }}
              >
                🍲 Book Bulk Catering Services
              </button>

              {/* View Active Catering */}
              {catList.length > 0 && (
                <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>📋 Your Active Catering Requests:</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px", maxHeight: "150px", overflowY: "auto" }}>
                    {catList.slice(0, 3).map(c => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px" }}>
                        <div>
                          <strong style={{ color: "#0f172a" }}>{c.type} ({c.tier})</strong>
                          <div style={{ color: "#64748b" }}>{c.date} · {c.guests} guests · Venue: {c.location}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ background: "#dcfce7", color: "#166534", fontSize: "9px", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>
                            {c.status}
                          </span>
                          <div style={{ fontWeight: "bold", color: "#ea580c", fontSize: "10px", marginTop: "2px" }}>₵{c.totalEstimated}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

// ─── MALLS / SHOPS PAGE ───────────────────────────────────────────────────────
interface MallsPageProps {
  cityFilter?: string;
  addToCart?: (p: Product) => void;
  setPage?: (p: string) => void;
  notify?: (msg: string, type?: "ok" | "err") => void;
  user?: UserType | null;
}

export function MallsPage({ cityFilter = "all", addToCart, setPage, notify, user }: MallsPageProps) {
  const [malls, setMalls] = useState<Mall[]>(MALLS_SHOPS);
  const [subTab, setSubTab] = useState<"directory" | "booking">("directory");
  const [sel, setSel] = useState<string | null>(null);
  const [srch, setSrch] = useState("");

  // Support physical/hardware back button for Malls booking page
  useEffect(() => {
    const handlePopState = () => {
      if (subTab === "booking") {
        setSubTab("directory");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [subTab]);

  const handleSetSubTab = (newTab: "directory" | "booking") => {
    if (newTab === "booking" && subTab !== "booking") {
      window.history.pushState({ isBookingOpen: true }, "");
      setSubTab("booking");
    } else if (newTab === "directory" && subTab === "booking") {
      window.history.back();
    } else {
      setSubTab(newTab);
    }
  };

  // Booking Form State
  const [selectedOutlet, setSelectedOutlet] = useState<string>("m1");
  const [customOutletName, setCustomOutletName] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemEstPrice, setItemEstPrice] = useState<string>("");
  const [itemsList, setItemsList] = useState<Array<{ id: string; name: string; qty: number; estPrice: number }>>([]);
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [isAgreedToTerms, setIsAgreedToTerms] = useState<boolean>(false);

  // Load and sync malls list dynamically from DB key "elx_malls"
  useEffect(() => {
    const loadMalls = async () => {
      const stored = await DB.get("elx_malls");
      if (stored && Array.isArray(stored)) {
        setMalls(stored);
      }
    };
    loadMalls();

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

  // Update selected outlet safely based on available malls
  useEffect(() => {
    if (malls.length > 0 && !malls.some(m => m.id === selectedOutlet)) {
      setSelectedOutlet(malls[0].id);
    }
  }, [malls, selectedOutlet]);

  const filtered = malls.filter(m => {
    if (!m) return false;
    if (cityFilter === "tarkwa") {
      if (m.city && m.city !== "tarkwa") return false;
      if (!m.city && !(m.location || "").toLowerCase().includes("tarkwa")) return false;
    }
    if (cityFilter === "bogoso") {
      if (m.city && m.city !== "bogoso") return false;
      if (!m.city && !(m.location || "").toLowerCase().includes("bogoso")) return false;
    }

    return (
      (m.name || "").toLowerCase().includes((srch || "").toLowerCase()) || 
      (m.type || "").toLowerCase().includes((srch || "").toLowerCase())
    );
  });

  // Calculate shopping estimation
  const estimatedSubtotal = itemsList.reduce((sum, item) => sum + (item.qty * item.estPrice), 0);
  const serviceFee = 30; // standard runner dispatch protection fee
  const totalEstimatedCost = estimatedSubtotal > 0 ? estimatedSubtotal : 0;

  const handleAddItem = () => {
    if (!itemName.trim()) {
      if (notify) notify("Please enter a valid item name!", "err");
      return;
    }
    const parsedPrice = parseFloat(itemEstPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      if (notify) notify("Please enter a valid estimated price!", "err");
      return;
    }

    const newItem = {
      id: `erritem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: itemName.trim(),
      qty: itemQty,
      estPrice: parsedPrice
    };

    setItemsList([...itemsList, newItem]);
    setItemName("");
    setItemQty(1);
    setItemEstPrice("");
    if (notify) notify(`Added "${newItem.name}" to your errand checklist.`, "ok");
  };

  const handleRemoveItem = (id: string) => {
    const itemToRemove = itemsList.find(i => i.id === id);
    setItemsList(itemsList.filter(i => i.id !== id));
    if (notify && itemToRemove) notify(`Removed "${itemToRemove.name}".`, "ok");
  };

  const handleCompileErrand = () => {
    if (itemsList.length === 0) {
      if (notify) notify("Please add at least one item to your custom shopping errand!", "err");
      return;
    }
    const parsedBudget = parseFloat(maxBudget);
    if (isNaN(parsedBudget) || parsedBudget < estimatedSubtotal) {
      if (notify) notify(`Please set an Authorized Budget Cap of at least ₵${estimatedSubtotal} to cover estimated item costs!`, "err");
      return;
    }
    if (!isAgreedToTerms) {
      if (notify) notify("You must agree to the Anti-Loss runner safety policy to book an errand!", "err");
      return;
    }
    if (!addToCart) {
      if (notify) notify("Shopping cart functionality is temporarily unavailable.", "err");
      return;
    }

    // Identify final shop name
    let shopName = "Retail Outlet";
    if (selectedOutlet === "other") {
      shopName = customOutletName.trim() || "Custom Supermarket";
    } else {
      const match = malls.find(m => m.id === selectedOutlet);
      if (match) shopName = match.name;
    }

    // Format serialized summary
    const formattedList = itemsList.map(it => `• ${it.qty}x ${it.name} (Est. ₵${it.estPrice} ea)`).join("\n");
    const summaryLocation = `${formattedList}\n\n⚠️ PRE-AUTH BUDGET CAP: ₵${parsedBudget}\n🚛 SERVICE PROTECTIVE FEE: ₵${serviceFee} (included in base)\n📋 NOTES: ${specialInstructions.trim() || "None"}`;

    const errandProduct: Product = {
      id: `errand-${Date.now()}`,
      name: `🛍️ Errand Run: ${shopName}`,
      price: totalEstimatedCost + serviceFee, // Bundle item total + errand dispatch fee together
      cat: "Custom Mall Errand",
      tag: "Pre-Authorized",
      unit: "run",
      shop: shopName,
      location: summaryLocation
    };

    addToCart(errandProduct);
    if (notify) notify(`Compiled Custom Errand for ${shopName}! Added to your basket. 🛒`, "ok");

    // Clear state
    setItemsList([]);
    setMaxBudget("");
    setSpecialInstructions("");
    setIsAgreedToTerms(false);
    handleSetSubTab("directory");
    if (setPage) setPage("home"); // Redirect to home/checkout
  };

  const startDirectErrand = (mallId: string) => {
    setSelectedOutlet(mallId);
    handleSetSubTab("booking");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* HEADER CARD */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b, #311042)", padding: "20px 16px", borderRadius: "16px", marginBottom: "16px", color: "white", border: "1.5px solid #d946ef", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, display: "flex", alignItems: "center", gap: "8px" }}>
              🏪 Major Malls & Custom Errands
            </div>
            <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "2px" }}>
              Shop from wholesale hubs, supermarkets, or specify custom personal requests in Tarkwa & Bogoso
            </div>
          </div>
          <ShoppingBag size={32} style={{ color: "#d946ef", opacity: 0.8 }} />
        </div>
      </div>

      {/* TAB NAVIGATION COUPLER */}
      <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "12px", padding: "4px", marginBottom: "16px", border: "1px solid #cbd5e1" }}>
        <button
          onClick={() => handleSetSubTab("directory")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: "bold",
            background: subTab === "directory" ? "white" : "transparent",
            color: subTab === "directory" ? "#1e1b4b" : "#475569",
            boxShadow: subTab === "directory" ? "0 4px 6px -1px rgba(0,0,0,0.08)" : "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          🏪 Outlet Directory
        </button>
        <button
          onClick={() => handleSetSubTab("booking")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "10px",
            border: "none",
            fontSize: "13px",
            fontWeight: "bold",
            background: subTab === "booking" ? "white" : "transparent",
            color: subTab === "booking" ? "#1e1b4b" : "#475569",
            boxShadow: subTab === "booking" ? "0 4px 6px -1px rgba(0,0,0,0.08)" : "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          🎟️ Request Custom Errand Runner
          {itemsList.length > 0 && (
            <span style={{ background: "#ef4444", color: "white", fontSize: "10px", fontWeight: "black", padding: "2px 6px", borderRadius: "20px" }}>
              {itemsList.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "directory" ? (
          <motion.div key="dir" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
            {/* SEARCH DIRECTORY */}
            <div style={{ position: "relative", marginBottom: "14px" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input 
                value={srch} 
                onChange={e => setSrch(e.target.value)} 
                placeholder="Search wholesale outlets, supermarkets, or local malls…" 
                style={{ ...S.inp, paddingLeft: "38px" }} 
              />
            </div>

            {/* DIRECTORY LIST */}
            {filtered.map(m => (
              <div key={m.id} style={{ ...S.sec, marginBottom: "12px", cursor: "pointer", transition: "transform 0.2s" }} onClick={() => setSel(sel === m.id ? null : m.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>{m.name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>📍 {m.location}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>🕐 Open: {m.hours} • Rating: ⭐ {m.rating}</div>
                    <div style={{ display: "inline-block", background: (m.type || "").includes("Wholesale") ? "#2563eb" : (m.type || "").includes("Mall") ? "#d946ef" : "#10b981", color: "white", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", marginTop: "6px" }}>
                      {m.type}
                    </div>
                  </div>
                  <div style={{ background: sel === m.id ? "#311042" : "#f1f5f9", color: sel === m.id ? "white" : "#64748b", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    {sel === m.id ? "▲" : "▼"}
                  </div>
                </div>

                <AnimatePresence>
                  {sel === m.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden", marginTop: "14px", borderTop: "2px solid #f1f5f9", paddingTop: "14px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontWeight: 700, marginBottom: "8px", color: "#311042", fontSize: "13px" }}>
                        🛒 Available Product Domains (In-Stock)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {m.sells.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" }}>
                            <Check size={14} style={{ color: "#10b981" }} /> {s}
                          </div>
                        ))}
                      </div>

                      {/* CALL TO ACTION BUTTON FOR INTERACTION */}
                      <div style={{ marginTop: "14px", padding: "12px", background: "#faf5ff", border: "1px solid #f0abfc", borderRadius: "10px" }}>
                        <div style={{ fontSize: "12px", color: "#701a75", fontWeight: "600", marginBottom: "8px" }}>
                          🚚 Want us to buy items from {m.name} on your behalf?
                        </div>
                        <button
                          onClick={() => startDirectErrand(m.id)}
                          style={{
                            background: "linear-gradient(135deg, #d946ef, #a21caf)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: "800",
                            cursor: "pointer",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 4px 6px -1px rgba(217, 70, 239, 0.2)"
                          }}
                        >
                          <ShoppingBag size={14} /> Book Errand Runner for {m.name}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {filtered.length === 0 && <Empty />}
          </motion.div>
        ) : (
          <motion.div key="book" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
            <div style={{ ...S.sec, padding: "20px", marginBottom: "16px", borderColor: "#e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={20} style={{ color: "#d946ef" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#1e1b4b", margin: 0 }}>
                    Custom Purchase Request Form
                  </h3>
                </div>
                <button
                  onClick={() => handleSetSubTab("directory")}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#475569",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  id="booking-form-back-btn"
                >
                  ← Stores List
                </button>
              </div>

              {/* OUTLET SELECTOR */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                  1. Target Outlet or Store *
                </label>
                <select
                  value={selectedOutlet}
                  onChange={e => setSelectedOutlet(e.target.value)}
                  style={{ ...S.inp, background: "#f8fafc" }}
                >
                  {malls.filter(m => {
                    if (!m) return false;
                    if (cityFilter === "tarkwa" && !(m.location || "").toLowerCase().includes("tarkwa")) return false;
                    if (cityFilter === "bogoso" && !(m.location || "").toLowerCase().includes("bogoso")) return false;
                    return true;
                  }).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.location})</option>
                  ))}
                  <option value="other">⚠️ Other Custom Retail Outlet / Local Store...</option>
                </select>
              </div>

              {selectedOutlet === "other" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Name of Custom Retail Store / Supermarket *
                  </label>
                  <input
                    value={customOutletName}
                    onChange={e => setCustomOutletName(e.target.value)}
                    placeholder="e.g. Melcom Tarkwa, Shoprite, West Hills Partner, etc."
                    style={S.inp}
                  />
                </div>
              )}

              {/* ITEM ADDING CARDS */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#1e1b4b", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Plus size={14} style={{ color: "#10b981" }} /> Add Items to Checklist
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>
                      Item Description / Name *
                    </label>
                    <input
                      value={itemName}
                      onChange={e => setItemName(e.target.value)}
                      placeholder="e.g. Nivea Body Lotion 400ml, Milo Medium Pack"
                      style={{ ...S.inp, background: "white", fontSize: "13px" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>
                        Est. Unit Price (₵) *
                      </label>
                      <input
                        type="number"
                        value={itemEstPrice}
                        onChange={e => setItemEstPrice(e.target.value)}
                        placeholder="e.g. 45"
                        style={{ ...S.inp, background: "white", fontSize: "13px" }}
                      />
                    </div>

                    <div style={{ width: "120px" }}>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>
                        Quantity
                      </label>
                      <div style={{ display: "flex", alignItems: "center", background: "white", border: "1.5px solid #cbd5e1", borderRadius: "8px", height: "38px", overflow: "hidden" }}>
                        <button
                          type="button"
                          onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                          style={{ width: "35px", height: "100%", border: "none", background: "none", fontWeight: "bold", cursor: "pointer" }}
                        >
                          -
                        </button>
                        <span style={{ flex: 1, textAlign: "center", fontSize: "13px", fontWeight: "bold", color: "#0f172a" }}>
                          {itemQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItemQty(itemQty + 1)}
                          style={{ width: "35px", height: "100%", border: "none", background: "none", fontWeight: "bold", cursor: "pointer" }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      background: "#1e1b4b",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      marginTop: "4px"
                    }}
                  >
                    <Check size={14} /> Add Item to checklist
                  </button>
                </div>
              </div>

              {/* CURRENT CHECKLIST TABLE */}
              {itemsList.length > 0 ? (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "8px" }}>
                    📋 Checklist Summary ({itemsList.length} unique lines)
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "8px 10px", fontWeight: "700" }}>Item</th>
                          <th style={{ padding: "8px 10px", fontWeight: "700", width: "60px", textAlign: "center" }}>Qty</th>
                          <th style={{ padding: "8px 10px", fontWeight: "700", width: "80px", textAlign: "right" }}>Est. Cost</th>
                          <th style={{ padding: "8px 10px", width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsList.map(it => (
                          <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px", color: "#1e293b", fontWeight: "600" }}>{it.name}</td>
                            <td style={{ padding: "10px", color: "#475569", textAlign: "center" }}>{it.qty}x</td>
                            <td style={{ padding: "10px", color: "#0f172a", fontWeight: "700", textAlign: "right" }}>₵{Math.round(it.qty * it.estPrice)}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "800", color: "#1e1b4b", padding: "12px 6px 0 6px" }}>
                    <span>Estimated Goods Subtotal:</span>
                    <span>₵{Math.round(estimatedSubtotal)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 10px", border: "1.5px dashed #cbd5e1", borderRadius: "12px", background: "#f8fafc", color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
                  💡 Your custom checklist is currently empty. Enter an item above to build your custom shopping manifest!
                </div>
              )}

              {/* ANTI-LOSS SECURITY CONTRACT PANEL (ANSWERS THE TIME & MONEY CONCERN) */}
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde047", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "900", color: "#854d0e", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Shield size={16} /> Safeguards Against Lost Time & Funds
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: "#713f12", lineHeight: "1.4" }}>
                  <p style={{ margin: 0 }}>
                    <strong>1. ₵30 Runner Dispatch Protection Fee:</strong> Added to cover courier fuel, physical store queueing, and live item checkouts. If you cancel after our runner arrives at the aisles, this ₵30 is disbursed to the driver to ensure they are compensated for fuel and travel time.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>2. Fluctuation Handling:</strong> Store prices change without notice. Set an <strong>Authorized Budget Cap</strong> below. We will buy up to this amount, hand you the physical cash register receipt, and instantly settle any difference with you on arrival.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>3. Aisle Call-outs:</strong> If an item is out-of-stock, our courier will call your phone or send photos immediately to confirm brand substitutes, ensuring a 100% accurate run!
                  </p>
                </div>
              </div>

              {/* BUDGET CAP INPUT & SPECIAL NOTES */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Authorized Budget Cap (₵) *
                  </label>
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={e => setMaxBudget(e.target.value)}
                    placeholder={`e.g. ${estimatedSubtotal > 0 ? Math.round(estimatedSubtotal + 20) : "150"}`}
                    style={S.inp}
                  />
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    The runner is strictly blocked from spending more than this total cap at checkout.
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Special Run Instructions / Substitutions
                  </label>
                  <textarea
                    value={specialInstructions}
                    onChange={e => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. 'If Nivea lotion is out, get Vaseline Intensive Care instead. Check expiry dates carefully!'"
                    style={{ ...S.inp, height: "70px", padding: "8px 12px", resize: "none", fontSize: "12px" }}
                  />
                </div>
              </div>

              {/* SERVICE COST SUMMARY */}
              <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "12px", color: "#5b21b6", marginBottom: "4px" }}>
                  <span>Checklist Estimated Goods:</span>
                  <span>₵{Math.round(estimatedSubtotal)}</span>
                </div>
                <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "12px", color: "#5b21b6", marginBottom: "6px", borderBottom: "1px solid #f3e8ff", paddingBottom: "6px" }}>
                  <span>Runner Errand Service Fee:</span>
                  <span>₵{serviceFee}</span>
                </div>
                <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "14px", fontWeight: "900", color: "#3b0764" }}>
                  <span>Compile Total:</span>
                  <span>₵{Math.round(totalEstimatedCost + serviceFee)}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#6b21a8", marginTop: "6px", fontStyle: "italic" }}>
                  * This combined sum is added to your cart checkout. Original supermarket receipt is delivered with the items.
                </div>
              </div>

              {/* AGREEMENT CHECKBOX */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "20px" }}>
                <input
                  type="checkbox"
                  id="agree-errand-policy"
                  checked={isAgreedToTerms}
                  onChange={e => setIsAgreedToTerms(e.target.checked)}
                  style={{ marginTop: "3px", width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="agree-errand-policy" style={{ fontSize: "11px", color: "#475569", cursor: "pointer", selectOpacity: "none", lineHeight: "1.4" }}>
                  I authorize this errand, agree to the live phone-call substitution policy, accept the runner's ₵{serviceFee} fuel guarantee in case of cancellations, and confirm I will settle the final receipt balance on delivery.
                </label>
              </div>

              {/* ACTION ACTIONS */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleSetSubTab("directory")}
                  style={{
                    flex: 1,
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompileErrand}
                  style={{
                    flex: 2,
                    background: "linear-gradient(135deg, #1e1b4b, #3b0764)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: "900",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px -1px rgba(30, 27, 75, 0.3)"
                  }}
                >
                  🛒 Compile Errand & Add to Basket
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MARKETPLACE MAIN WRAPPER ────────────────────────────────────────────────
interface MarketplaceProps {
  tab: string;
  setTab: (t: string) => void;
  search: string;
  setSearch: (s: string) => void;
  addToCart: (p: Product) => void;
  toggleWish: (p: Product) => void;
  wishlist: string[];
  cart: CartItem[];
  notify: (msg: string, type?: "ok" | "err") => void;
  cityFilter?: string;
}

export function Marketplace({ tab, setTab, search, setSearch, addToCart, toggleWish, wishlist, cart, notify, cityFilter = "all" }: MarketplaceProps) {
  const [selectedVendor, setSelectedVendor] = useState("all");
  
  const VENDORS = [
    { id: "all", name: "All Shops", icon: "🏢", rating: "4.8", location: "Tarkwa-Bogoso", desc: "All local registered vendors" },
    { id: "provisions", name: "Tarkwa Central Provisions", icon: "🥬", rating: "4.9", location: "Tarkwa Cyanide", desc: "Fresh produce & staples" },
    { id: "uncle_ben", name: "Uncle Ben's Electronics", icon: "📺", rating: "4.7", location: "Tarkwa Bypass", desc: "TVs, phones & hardware" },
    { id: "bogoso_build", name: "Bogoso Build Supply Ltd.", icon: "🧱", rating: "4.8", location: "Bogoso Town", desc: "Cement, steel & aggregates" },
    { id: "mamas_farm", name: "Mama's Agri-hub Farm", icon: "🌽", rating: "4.9", location: "Bogoso Outskirts", desc: "Organic crops & farm fresh" }
  ];

  const TABS = [
    { id: "all", l: "All Items" },
    { id: "groceries", l: "🥬 Groceries" },
    { id: "handyman", l: "🛠️ Handyman" },
    { id: "electronics", l: "📺 Electronics" },
    { id: "construction", l: "🧱 Build Supply" }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "18px 16px", borderRadius: "16px", marginBottom: "14px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 900 }}>🛍️ ELEXTRA Multi-Vendor Marketplace</div>
            <div style={{ fontSize: "12px", opacity: 0.85 }}>Fluctuating local market rates · Updated today ({today})</div>
          </div>
          <span style={{ background: "rgba(33,241,168,0.15)", color: "#21F1A8", fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(33,241,168,0.3)" }}>
            🟢 MULTI-VENDOR
          </span>
        </div>
      </div>

      {/* MULTI-VENDOR HORIZONTAL DIRECTORY */}
      <div style={{ marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>🏪 Select Vendor Shop:</span>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "6px 0", scrollbarWidth: "none" }}>
          {VENDORS.map(v => {
            const isSelected = selectedVendor === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVendor(v.id);
                  if (v.id === "provisions" || v.id === "mamas_farm") setTab("groceries");
                  else if (v.id === "uncle_ben") setTab("electronics");
                  else if (v.id === "bogoso_build") setTab("construction");
                  else setTab("all");
                  notify(`Viewing catalog from ${v.name}!`, "ok");
                }}
                style={{
                  flex: "0 0 auto",
                  background: isSelected ? "linear-gradient(135deg, #ea580c, #f97316)" : "white",
                  color: isSelected ? "white" : "#0f172a",
                  border: isSelected ? "1.5px solid #ea580c" : "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: isSelected ? "0 4px 12px rgba(234,88,12,0.15)" : "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "18px" }}>{v.icon}</span>
                  <div>
                    <strong style={{ fontSize: "12px", display: "block" }}>{v.name}</strong>
                    <span style={{ fontSize: "10px", opacity: 0.85 }}>⭐ {v.rating} · {v.location}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "14px" }}>
        <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search items, categories, or specific catalogs…" 
          style={{ ...S.inp, paddingLeft: "38px" }} 
        />
        {search && (
          <button style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#64748b" }} onClick={() => setSearch("")}>
            ✕
          </button>
        )}
      </div>

      <div style={S.tabRow}>
        {TABS.map(t => (
          <button key={t.id} style={{ ...S.tab, ...(tab === t.id ? S.tabA : {}) }} onClick={() => setTab(t.id)}>
            {t.l}
          </button>
        ))}
      </div>

      {(tab === "all" || tab === "groceries") && (
        <GrocerySection search={search} addToCart={addToCart} toggleWish={toggleWish} wishlist={wishlist} single={tab === "groceries"} cityFilter={cityFilter} />
      )}
      {(tab === "all" || tab === "handyman") && (
        <HandymanSection single={tab === "handyman"} cityFilter={cityFilter} notify={notify} />
      )}
      {(tab === "all" || tab === "electronics") && (
        <ElectronicsSection search={search} addToCart={addToCart} toggleWish={toggleWish} wishlist={wishlist} single={tab === "electronics"} cityFilter={cityFilter} />
      )}
      {(tab === "all" || tab === "construction") && (
        <ConstructionSection search={search} addToCart={addToCart} cart={cart} notify={notify} single={tab === "construction"} cityFilter={cityFilter} />
      )}
    </motion.div>
  );
}

// ─── BASKET/PRODUCTS HELPER COMPONENTS ───────────────────────────────────────
interface SectionProps {
  search: string;
  addToCart: (p: Product) => void;
  toggleWish?: (p: Product) => void;
  wishlist?: string[];
  single: boolean;
  cityFilter?: string;
}

export function GrocerySection({ search, addToCart, toggleWish, wishlist = [], single, cityFilter = "all" }: SectionProps) {
  const GCATS = ["All", "Staples", "Proteins", "Vegetables", "Oils", "Seasonings", "Beverages", "Provisions"];
  const [gc, setGc] = useState("All");
  const [customCatalog, setCustomCatalog] = useState<Record<string, any>>({});
  const meta = useGeminiMeta();

  useEffect(() => {
    const load = async () => {
      const stored = await DB.get("elx_custom_catalog");
      if (stored) setCustomCatalog(stored);
    };
    load();
    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_custom_catalog") {
        setCustomCatalog(e.detail.value || {});
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  const resolvedGroceries = useMemo(() => {
    const base = resolveProducts(GROCERY_ITEMS, meta);
    const added = (customCatalog.addedProducts || []).filter((p: any) => p && p.section === "groceries");
    return [...base, ...added];
  }, [meta, customCatalog.addedProducts]);

  const filtered = resolvedGroceries.map(p => {
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
  }).filter(p => {
    if (!p.activeSelling) return false;
    const loc = getProductLocation(p);
    if (cityFilter === "tarkwa" && loc.city === "bogoso") return false;
    if (cityFilter === "bogoso" && loc.city === "tarkwa") return false;

    return (
      (gc === "All" || p.cat === gc) && 
      (search === "" || (p.name || "").toLowerCase().includes((search || "").toLowerCase()))
    );
  });

  return (
    <div style={single ? {} : S.sec}>
      {!single && <SecHead title="🥬 Foodstuffs & Fresh Groceries" sub="Fresh local harvest sourced from Tarkwa Central & Bogoso Markets" />}
      {single && (
        <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "16px", borderRadius: "16px", marginBottom: "14px", color: "white" }}>
          <div style={{ fontSize: "20px", fontWeight: 900 }}>🥬 Groceries & Local Farm Harvest</div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>Wholesale sacks and retail units available. Sourcing rates updated daily ({today}).</div>
        </div>
      )}

      <div style={S.tabRow}>
        {GCATS.map(c => (
          <button key={c} style={{ ...S.tab, ...(gc === c ? { ...S.tabA, background: "#10b981", borderColor: "#10b981" } : {}) }} onClick={() => setGc(c)}>
            {c}
          </button>
        ))}
      </div>

      <div style={S.pGrid}>
        {filtered.map(p => (
          <PCard key={p.id} p={p} onAdd={addToCart} onWish={toggleWish} wishlisted={wishlist.includes(p.id)} grid />
        ))}
      </div>
      {filtered.length === 0 && <Empty />}
    </div>
  );
}

export function HandymanSection({ single, cityFilter = "all", notify }: { single: boolean; cityFilter: string; notify: (msg: string, type?: "ok" | "err") => void }) {
  const [cat, setCat] = useState<"Electrician" | "Carpenter" | "Plumber" | "Mason" | "Painter" | "AC & Appliances" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<"tarkwa" | "bogoso">("tarkwa");

  useEffect(() => {
    if (cityFilter === "tarkwa" || cityFilter === "bogoso") {
      setCity(cityFilter);
    }
  }, [cityFilter]);
  const [loc, setLoc] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  const SERVICES = [
    { id: "Electrician", n: "⚡ Professional Electrician", s: "Socket repairs, lighting, generator wiring, meter faults", fee: 50, color: "#eab308" },
    { id: "Carpenter", n: "🪚 Skilled Carpenter", s: "Door hanging, cabinet repairs, roofing, structural woodwork", fee: 40, color: "#854d0e" },
    { id: "Plumber", n: "🚰 Certified Plumber", s: "Leak repairs, water pump setup, tank installations, drainage", fee: 45, color: "#3b82f6" },
    { id: "Mason", n: "🧱 Expert Mason / Builder", s: "Bricklaying, wall plastering, custom tiling, concrete work", fee: 60, color: "#b45309" },
    { id: "Painter", n: "🎨 Professional Painter", s: "Exterior/interior painting, wall skimming, priming coats", fee: 40, color: "#ec4899" },
    { id: "AC & Appliances", n: "❄️ AC & Appliance Repair", s: "Fridge refilling, AC servicing, fan repairs, stabilizer setup", fee: 50, color: "#06b6d4" }
  ];

  const submit = async () => {
    if (!cat) {
      notify("Please select a handyman category first.", "err");
      return;
    }
    if (!name || !phone || !loc || !desc || !date || !time) {
      notify("Please fill in all the booking details.", "err");
      return;
    }

    setLoading(true);
    try {
      const bookId = "HND-" + Math.floor(100000 + Math.random() * 900000);
      const newBooking = {
        id: bookId,
        category: cat,
        name,
        phone,
        city,
        location: loc,
        description: desc,
        preferredDate: date,
        preferredTime: time,
        status: "pending" as const,
        dateCreated: new Date().toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + " " + new Date().toLocaleTimeString()
      };

      const existing = await DB.get("elx_handyman_bookings") || [];
      const updated = [newBooking, ...existing];
      await DB.set("elx_handyman_bookings", updated);

      // Trigger real-time sync
      window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_handyman_bookings", value: updated } }));
      
      setSuccessBooking(newBooking);
      notify(`Handyman booking registered! ID: ${bookId} 🛠️`, "ok");

      // Reset form fields
      setName("");
      setPhone("");
      setLoc("");
      setDesc("");
      setDate("");
      setTime("");
      setCat(null);
    } catch (err) {
      notify("Failed to save handyman booking.", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={single ? {} : S.sec}>
      {!single && <SecHead title="🛠️ Handyman & Professional Repairs" sub="Verified local technicians dispatched on demand" />}
      {single && (
        <div style={{ background: "linear-gradient(135deg, #475569, #1e293b)", padding: "16px", borderRadius: "16px", marginBottom: "14px", color: "white" }}>
          <div style={{ fontSize: "20px", fontWeight: 900 }}>🛠️ Verified Handyman Network</div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>Background-checked, background-verified professionals in Tarkwa & Bogoso. Sla guaranteed.</div>
        </div>
      )}

      {successBooking && (
        <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "12px", padding: "16px", marginBottom: "16px", color: "#14532d" }}>
          <div style={{ fontSize: "16px", fontWeight: "900", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>✅</span> Booking Confirmed! Ref: {successBooking.id}
          </div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            Your request for a <strong>{successBooking.category}</strong> has been successfully broadcast to all active dispatch managers. A runner will contact you shortly to confirm terms.
          </div>
          <button 
            style={{ marginTop: "10px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", padding: "4px 8px", cursor: "pointer", fontWeight: "bold" }}
            onClick={() => setSuccessBooking(null)}
          >
            Book Another Service
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr md:1fr", gap: "20px" }}>
        
        {/* SERVICES CARDS SELECTION */}
        <div>
          <div style={{ fontWeight: "bold", fontSize: "13.5px", color: "var(--elextra-text)", marginBottom: "10px" }}>
            1. Select a Repair Specialty:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {SERVICES.map(s => {
              const isSelected = cat === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setCat(s.id as any)}
                  style={{
                    textAlign: "left",
                    background: isSelected ? "rgba(71,85,105,0.08)" : "white",
                    border: isSelected ? `2px solid ${s.color}` : "1.5px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: "13.5px", color: isSelected ? s.color : "#1e293b" }}>{s.n}</span>
                    <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "bold", color: "#475569" }}>
                      ₵{s.fee} Deposit
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{s.s}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOOKING DETAILS FORM */}
        <div style={{ background: "white", padding: "16px", borderRadius: "14px", border: "1.5px solid #cbd5e1" }}>
          <div style={{ fontWeight: "bold", fontSize: "13.5px", color: "#0f172a", marginBottom: "12px", borderBottom: "1.5px dashed #cbd5e1", paddingBottom: "6px" }}>
            2. Schedule Your Appointment {cat ? `for ${cat}` : ""}:
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Contact Name *</label>
              <input style={S.inp} placeholder="Your Full Name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Mobile Money Phone Number *</label>
              <input style={S.inp} placeholder="024 XXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Service City</label>
                <select style={S.inp} value={city} onChange={e => setCity(e.target.value as any)}>
                  <option value="tarkwa">Tarkwa</option>
                  <option value="bogoso">Bogoso</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Landmark / Neighborhood *</label>
                <input style={S.inp} placeholder="e.g. Cyanide Junction, Bogoso Bypass" value={loc} onChange={e => setLoc(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Problem Description *</label>
              <textarea 
                style={{ ...S.inp, height: "60px", fontFamily: "inherit", resize: "none", padding: "8px" }} 
                placeholder="Explain the work required (e.g., bathroom faucet replacement, bedroom ceiling fan sparking)" 
                value={desc} 
                onChange={e => setDesc(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Preferred Date *</label>
                <input style={S.inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Preferred Time *</label>
                <input style={S.inp} type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            <button 
              style={{ ...S.cta, width: "100%", marginTop: "10px", background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white" }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? "Scheduling Booking..." : "Schedule Handyman Booking 🛠️"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export function ElectronicsSection({ search, addToCart, toggleWish, wishlist = [], single, cityFilter = "all" }: SectionProps) {
  const ECATS = ["All", "TV", "Fans", "Refrigerators", "Washing Machines", "Cookers", "Generators", "Power", "Air Conditioning", "Phones", "Audio", "Home Appliances"];
  const [ec, setEc] = useState("All");
  
  const SHOPS = ["All", "TechZone Tarkwa", "Goldfields Electronics", "Bogoso Power Electronics"];
  const [shopF, setShopF] = useState("All");
  const [customCatalog, setCustomCatalog] = useState<Record<string, any>>({});
  const meta = useGeminiMeta();

  useEffect(() => {
    const load = async () => {
      const stored = await DB.get("elx_custom_catalog");
      if (stored) setCustomCatalog(stored);
    };
    load();
    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_custom_catalog") {
        setCustomCatalog(e.detail.value || {});
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  const resolvedElectronics = useMemo(() => {
    const base = resolveProducts(ELECTRONICS, meta);
    const added = (customCatalog.addedProducts || []).filter((p: any) => p && p.section === "electronics");
    return [...base, ...added];
  }, [meta, customCatalog.addedProducts]);

  const filtered = resolvedElectronics.map(p => {
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
  }).filter(p => {
    if (!p.activeSelling) return false;
    const loc = getProductLocation(p);
    if (cityFilter === "tarkwa" && loc.city === "bogoso") return false;
    if (cityFilter === "bogoso" && loc.city === "tarkwa") return false;

    return (
      (ec === "All" || p.cat === ec) && 
      (shopF === "All" || p.shop === shopF) && 
      (search === "" || (p.name || "").toLowerCase().includes((search || "").toLowerCase()))
    );
  });

  return (
    <div style={single ? {} : S.sec}>
      {!single && <SecHead title="📺 Home Electronics & Devices" sub="Verified appliance and electronics suppliers with in-town setups" />}
      {single && (
        <div style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", padding: "16px", borderRadius: "16px", marginBottom: "14px", color: "white" }}>
          <div style={{ fontSize: "20px", fontWeight: 900 }}>📺 Domestic Appliances & Tech</div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>Generators, standing fans, TVs, and mobile lines securely procured and transported with custom hauling.</div>
        </div>
      )}

      <div style={S.tabRow}>
        {SHOPS.map(s => (
          <button key={s} style={{ ...S.tab, ...(shopF === s ? { ...S.tabA, background: "#3b82f6", borderColor: "#3b82f6" } : {}) }} onClick={() => setShopF(s)}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ ...S.tabRow, marginTop: "6px" }}>
        {ECATS.map(c => (
          <button key={c} style={{ ...S.tab, fontSize: "11px", ...(ec === c ? { ...S.tabA, background: "#60a5fa", borderColor: "#60a5fa" } : {}) }} onClick={() => setEc(c)}>
            {c}
          </button>
        ))}
      </div>

      <div style={S.pGrid}>
        {filtered.map(p => {
          const loc = getProductLocation(p);
          return (
            <div key={p.id} style={{ background: "var(--elextra-card-bg, white)", borderRadius: "14px", padding: "14px", border: "1px solid var(--elextra-card-border, #e2e8f0)", position: "relative" }}>
              {p.tag && <div style={{ ...S.pTag, background: TC[p.tag] || "#3b82f6" }}>{p.tag}</div>}
              <button style={S.wBtn} onClick={() => toggleWish?.(p)}>
                {wishlist.includes(p.id) ? "❤️" : "🤍"}
              </button>
              <SafeImage src={p.img} alt={p.name} category={p.cat} productId={p.id} />
              <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700, marginBottom: "2px" }}>{p.shop}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--elextra-text)", marginBottom: "4px", minHeight: "2.6em", display: "flex", alignItems: "center" }}>
                {p.name}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>📍 {p.location}</div>
              
              <div style={{ display: "flex", gap: "4px", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", background: loc.city === "tarkwa" ? "#e0f2fe" : loc.city === "bogoso" ? "#f5f3ff" : "#fff7ed", color: loc.city === "tarkwa" ? "#0369a1" : loc.city === "bogoso" ? "#6d28d9" : "#c2410c", border: `1.5px solid ${loc.city === "tarkwa" ? "#bae6fd" : loc.city === "bogoso" ? "#ddd6fe" : "#ffedd5"}` }}>
                  📍 {loc.city === "tarkwa" ? "Tarkwa" : loc.city === "bogoso" ? "Bogoso" : "Tarkwa & Bogoso"}
                </span>
              </div>

              <div style={{ fontWeight: 900, color: "#dc2626", fontSize: "15px", marginBottom: "8px" }}>
                ₵{Math.round(p.price)}
              </div>
              {(((p.name || "").includes("Refrigerator") || (p.name || "").includes("Freezer") || (p.name || "").includes("Washer") || (p.name || "").includes("Washing") || (p.name || "").includes("TV 55") || (p.name || "").includes("TV 65") || (p.name || "").includes("Generator") || (p.name || "").includes("Water Tank"))) && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde047", borderRadius: "6px", padding: "6px 8px", fontSize: "11px", marginBottom: "8px", color: "#854d0e", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertTriangle size={12} /> Heavy goods: Requires special Aboboya/Truck haulage
                </div>
              )}
              <button style={{ ...S.addBtn, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }} onClick={() => addToCart(p)}>
                Add to Cart 🛒
              </button>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <Empty />}
    </div>
  );
}

interface ConstructionProps extends SectionProps {
  cart: CartItem[];
  notify: (msg: string, type?: "ok" | "err") => void;
}

export function ConstructionSection({ search, addToCart, cart, notify, single, cityFilter = "all" }: ConstructionProps) {
  const CCATS = ["All", "Structural", "Roofing", "Finishes", "Plumbing", "Electrical", "Tools"];
  const [cc, setCc] = useState("All");
  const [customCatalog, setCustomCatalog] = useState<Record<string, any>>({});
  const meta = useGeminiMeta();

  useEffect(() => {
    const load = async () => {
      const stored = await DB.get("elx_custom_catalog");
      if (stored) setCustomCatalog(stored);
    };
    load();
    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_custom_catalog") {
        setCustomCatalog(e.detail.value || {});
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  const resolvedConstruction = useMemo(() => {
    const base = resolveProducts(CONSTRUCTION, meta);
    const added = (customCatalog.addedProducts || []).filter((p: any) => p && p.section === "construction");
    return [...base, ...added];
  }, [meta, customCatalog.addedProducts]);

  const filtered = resolvedConstruction.map(p => {
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
  }).filter(p => {
    if (!p.activeSelling) return false;
    const loc = getProductLocation(p);
    if (cityFilter === "tarkwa" && loc.city === "bogoso") return false;
    if (cityFilter === "bogoso" && loc.city === "tarkwa") return false;

    return (
      (cc === "All" || p.cat === cc) && 
      (search === "" || (p.name || "").toLowerCase().includes((search || "").toLowerCase()))
    );
  });

  const heavySelected = needsTransport(cart);

  return (
    <div style={single ? {} : S.sec}>
      {!single && <SecHead title="🧱 Bulky/Structural Construction Materials" sub="Direct wholesale structural supplies, conduits, plumbing & finishes" />}
      {single && (
        <div style={{ background: "linear-gradient(135deg, #f97316, #dc2626)", padding: "16px", borderRadius: "16px", marginBottom: "14px", color: "white" }}>
          <div style={{ fontSize: "20px", fontWeight: 900 }}>🧱 Building Materials & Electricals</div>
          <div style={{ fontSize: "12px", opacity: 0.9 }}>Cement, iron rods, electrical wire rolls, PVC pipes, and Polytanks securely carted from reliable Tarkwa stores.</div>
        </div>
      )}

      {heavySelected && (
        <div style={{ background: "#fef8e6", border: "2px solid #fde047", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <AlertTriangle size={20} style={{ color: "#d97706", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, color: "#854d0e", fontSize: "13px" }}>Heavy Items Detected in Your Basket!</div>
            <div style={{ fontSize: "12px", color: "#b45309", marginTop: "4px" }}>
              Your current order contains heavy/bulky physical items. An <strong>Aboboya (₵50)</strong> or <strong>Pickup Truck (₵120)</strong> will be assigned for haulage automatically at checkout.
            </div>
          </div>
        </div>
      )}

      <div style={S.tabRow}>
        {CCATS.map(c => (
          <button key={c} style={{ ...S.tab, ...(cc === c ? { ...S.tabA, background: "#f97316", borderColor: "#f97316" } : {}) }} onClick={() => setCc(c)}>
            {c}
          </button>
        ))}
      </div>

      <div style={S.pGrid}>
        {filtered.map(p => {
          const loc = getProductLocation(p);
          return (
            <div key={p.id} style={{ background: "var(--elextra-card-bg, white)", borderRadius: "14px", padding: "14px", border: "1px solid var(--elextra-card-border, #e2e8f0)", position: "relative" }}>
              {p.tag && <div style={{ ...S.pTag, background: TC[p.tag] || "#ea580c" }}>{p.tag}</div>}
              <SafeImage src={p.img} alt={p.name} category={p.cat} productId={p.id} />
              <div style={{ fontSize: "11px", color: "#f97316", fontWeight: 700, marginBottom: "2px" }}>{p.cat}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--elextra-text)", marginBottom: "4px", minHeight: "2.6em", display: "flex", alignItems: "center" }}>
                {p.name}
              </div>
              
              <div style={{ display: "flex", gap: "4px", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", background: loc.city === "tarkwa" ? "#e0f2fe" : loc.city === "bogoso" ? "#f5f3ff" : "#fff7ed", color: loc.city === "tarkwa" ? "#0369a1" : loc.city === "bogoso" ? "#6d28d9" : "#c2410c", border: `1.5px solid ${loc.city === "tarkwa" ? "#bae6fd" : loc.city === "bogoso" ? "#ddd6fe" : "#ffedd5"}` }}>
                  📍 {loc.city === "tarkwa" ? "Tarkwa" : loc.city === "bogoso" ? "Bogoso" : "Tarkwa & Bogoso"}
                </span>
              </div>

              <div style={{ fontWeight: 900, color: "#dc2626", fontSize: "15px", marginBottom: "4px" }}>
                ₵{Math.round(p.price)}<span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}> /{p.unit}</span>
              </div>
              {p.transport && (
                <div style={{ background: "#fffbeb", borderRadius: "6px", padding: "4px 8px", fontSize: "10px", marginBottom: "8px", color: "#b45309", fontWeight: 700 }}>
                  🚛 Requires heavy haulage
                </div>
              )}
              <button style={{ ...S.addBtn, background: "linear-gradient(135deg, #f97316, #dc2626)" }} onClick={() => addToCart(p)}>
                Add to Cart 🛒
              </button>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <Empty />}
    </div>
  );
}

// ─── BOOK A DELIVERY / SENDER RUN WIZARD ───────────────────────────────────────
interface DeliveryPageProps {
  user: UserType | null;
  setUser?: (u: UserType | null) => void;
  setModal: (m: string | null) => void;
  notify: (msg: string, type?: "ok" | "err") => void;
  onDispatchSubmit?: (item: { service: string; size: string; type: string; pickup: string; pickupAddr: string; destination: string; name: string; phone: string; fee: number; recipientName?: string; recipientPhone?: string; recipientIsSelf?: boolean; recipientPin?: string }) => void;
}

export function DeliveryPage({ user, setUser, setModal, notify, onDispatchSubmit }: DeliveryPageProps) {
  const [service, setService] = useState<string | null>(null);
  const [step, _setStep] = useState(1);
  const setStep = (newStep: number) => {
    if (newStep !== step) {
      if (typeof window !== "undefined") {
        window.history.pushState({ type: "deliveryStep", value: newStep }, "");
      }
    }
    _setStep(newStep);
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state && state.type === "deliveryStep") {
        _setStep(state.value);
      } else {
        _setStep(1);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  const [form, setForm] = useState({
    size: "", type: "", pickup: "", pickupAddr: "", destination: "", name: "", phone: ""
  });
  const [done, setDone] = useState(false);
  const [isSelfReceiving, setIsSelfReceiving] = useState<boolean | null>(null);

  // ELEXTRA MOVE Relocations State variables
  const [movePickup, setMovePickup] = useState("");
  const [moveDest, setMoveDest] = useState("");
  const [moveTime, setMoveTime] = useState("");
  const [movePlenty, setMovePlenty] = useState<boolean | null>(null);
  const [moveHeavy, setMoveHeavy] = useState<boolean | null>(null);
  const [moveVehicleType, setMoveVehicleType] = useState<"aboboyaa" | "small_cargo" | "large_cargo">("aboboyaa");
  const [moveSubmitted, setMoveSubmitted] = useState(false);
  
  // ELEXTRA MOVE Interactive Recipient Identification
  const [moveIsSelfReceiving, setMoveIsSelfReceiving] = useState<boolean | null>(null);
  const [moveRecipientName, setMoveRecipientName] = useState("");
  const [moveRecipientPhone, setMoveRecipientPhone] = useState("");
  const [moveRecipientPin, setMoveRecipientPin] = useState("");

  // Populate recipient details based on self receive
  useEffect(() => {
    if (moveIsSelfReceiving === true) {
      setMoveRecipientName(user?.name || "Self");
      setMoveRecipientPhone(user?.phone || "");
    } else if (moveIsSelfReceiving === false) {
      setMoveRecipientName("");
      setMoveRecipientPhone("");
    }
  }, [moveIsSelfReceiving, user]);

  // Generate PIN for ELEXTRA MOVE recipient
  useEffect(() => {
    if (!moveRecipientPin) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      setMoveRecipientPin(pin);
    }
  }, [moveRecipientPin]);

  // Loaded dynamic prices for ELEXTRA MOVE from DB
  const [movePrices, setMovePrices] = useState({
    aboboyaa: 50,
    small_cargo: 120,
    large_cargo: 250
  });

  const loadMoveConfigPrices = async () => {
    const storedAboboyaa = await DB.get("elx_move_aboboyaa_price");
    const storedSmall = await DB.get("elx_move_small_cargo_price");
    const storedLarge = await DB.get("elx_move_large_cargo_price");
    setMovePrices({
      aboboyaa: storedAboboyaa !== undefined && storedAboboyaa !== null ? Number(storedAboboyaa) : 50,
      small_cargo: storedSmall !== undefined && storedSmall !== null ? Number(storedSmall) : 120,
      large_cargo: storedLarge !== undefined && storedLarge !== null ? Number(storedLarge) : 250,
    });
  };

  useEffect(() => {
    loadMoveConfigPrices();

    const handleSync = (e: any) => {
      const { key } = e.detail || {};
      if (
        key === "elx_move_aboboyaa_price" ||
        key === "elx_move_small_cargo_price" ||
        key === "elx_move_large_cargo_price"
      ) {
         loadMoveConfigPrices();
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    window.addEventListener("storage", loadMoveConfigPrices);

    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
      window.removeEventListener("storage", loadMoveConfigPrices);
    };
  }, []);

  // GPS Sensor States for Carrier Dispatch wizard
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [useGpsSim, setUseGpsSim] = useState(true);

  const getHaversineInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const activeGps = useMemo(() => {
    if (!gpsCoords) return null;
    const distTarkwa = getHaversineInKm(gpsCoords.lat, gpsCoords.lng, 5.303, -1.984);
    const distBogoso = getHaversineInKm(gpsCoords.lat, gpsCoords.lng, 5.542, -2.072);
    const realDist = Math.min(distTarkwa, distBogoso);
    if (realDist > 100 && useGpsSim) {
      return { lat: 5.308, lng: -1.987, isSimulated: true, realCoords: gpsCoords };
    }
    return { lat: gpsCoords.lat, lng: gpsCoords.lng, isSimulated: false };
  }, [gpsCoords, useGpsSim]);

  const deliveryDistance = useMemo(() => {
    if (activeGps) {
      const distTarkwa = getHaversineInKm(activeGps.lat, activeGps.lng, 5.303, -1.984);
      const distBogoso = getHaversineInKm(activeGps.lat, activeGps.lng, 5.542, -2.072);
      return Math.min(distTarkwa, distBogoso);
    }
    return 1.0;
  }, [activeGps]);

  const dynamicServiceFee = useMemo(() => {
    // Interactive GPS tracking is active on all platforms, but pricing is flat per user instruction
    return service === "sameDay" ? 30 : 20;
  }, [service]);

  const handleGeolocate = () => {
    setGpsStatus("loading");
    if (!navigator || !navigator.geolocation) {
      setGpsStatus("error");
      notify("Geolocation is not supported by your browser", "err");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setGpsStatus("success");
        notify("GPS Coordinates Acquired! 🛰️ Route Price Configured.", "ok");

        const distTarkwa = getHaversineInKm(latitude, longitude, 5.303, -1.984);
        const distBogoso = getHaversineInKm(latitude, longitude, 5.542, -2.072);
        const closestHubName = distBogoso < distTarkwa ? "Bogoso" : "Tarkwa";
        const realDist = Math.min(distTarkwa, distBogoso);

        let resolvedName = "";
        const landmarks = [
          { name: "Tarkwa Cyanide", lat: 5.308, lng: -1.987 },
          { name: "Tarkwa Town Center", lat: 5.303, lng: -1.984 },
          { name: "Tarkwa Tamso", lat: 5.285, lng: -1.981 },
          { name: "Bogoso Junction", lat: 5.548, lng: -2.068 },
          { name: "Bogoso Town Center", lat: 5.542, lng: -2.072 },
        ];

        if (realDist > 100 && useGpsSim) {
          resolvedName = "GPS Spot near Tarkwa Cyanide (Simulated GPS for local tests)";
        } else {
          let closestL = landmarks[0];
          let minD = Infinity;
          landmarks.forEach(l => {
            const d = getHaversineInKm(latitude, longitude, l.lat, l.lng);
            if (d < minD) {
              minD = d;
              closestL = l;
            }
          });
          resolvedName = `GPS: near ${closestL.name} (${realDist.toFixed(1)} km from ${closestHubName})`;
        }
        setForm(f => ({ ...f, destination: resolvedName }));
      },
      (error) => {
        setGpsStatus("error");
        notify("Could not retrieve GPS location telemetry.", "err");
      }
    );
  };

  // 🏢 Contractual Enterprise Interactive States
  const [contractPlan, setContractPlan] = useState("pro"); // pro (₵850), max (₵2100), elite (₵3500)
  const [contractTenure, setContractTenure] = useState(3); // 3, 6, 12 months
  const [ridersCount, setRidersCount] = useState(1);
  const [trikesCount, setTrikesCount] = useState(0);
  const [trucksCount, setTrucksCount] = useState(0);
  const [corpName, setCorpName] = useState("");
  const [corpTin, setCorpTin] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [routePickup, setRoutePickup] = useState("Tarkwa Industrial Area Hub");
  const [routeDest, setRouteDest] = useState("Bogoso Mining & Sourcing Depot");
  const [signatoryName, setSignatoryName] = useState("");
  const [isContractSubmitted, setIsContractSubmitted] = useState(false);

  // Calculators for Corporate monthly quotes
  const planBase = contractPlan === "pro" ? 850 : contractPlan === "max" ? 2100 : 3500;
  const ridersFee = Math.max(0, ridersCount - 1) * 100;
  const trikesFee = trikesCount * 250;
  const trucksFee = trucksCount * 600;
  const rawTotal = planBase + ridersFee + trikesFee + trucksFee;
  const discountRate = contractTenure === 6 ? 0.05 : contractTenure === 12 ? 0.12 : 0;
  const discountAmount = Math.round(rawTotal * discountRate);
  const contractMonthlyTotal = rawTotal - discountAmount;

  const setVal = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const clearSvc = () => {
    setService(null);
    setStep(1);
    setForm({ size: "", type: "", pickup: "", pickupAddr: "", destination: "", name: "", phone: "" });
    setDone(false);
    setIsContractSubmitted(false);
  };

  const handleUpgradeAccount = () => {
    if (user && setUser) {
      const updatedUser = { ...user, type: "corp" };
      setUser(updatedUser);
      notify("Success! Upgraded profile to Corporate Account! 🏢", "ok");
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <div style={{ fontSize: "64px" }}>✅</div>
        <div style={{ fontSize: "22px", fontWeight: 900, color: "#10b981", marginTop: "12px" }}>Request Generated!</div>
        <div style={{ color: "#64748b", marginTop: "8px", fontSize: "14px" }}>
          We have generated your custom dispatch sheet. An operator will contact you shortly.
        </div>
        <button style={{ ...S.cta, marginTop: "20px" }} onClick={clearSvc}>
          New Booking 🚚
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "20px 16px", borderRadius: "16px", marginBottom: "16px", color: "white" }}>
        <div style={{ fontSize: "22px", fontWeight: 900 }}>🚚 Book a Delivery Rider</div>
        <div style={{ fontSize: "13px", opacity: 0.9 }}>Send files, merchandise, food, or bulky boxes across Tarkwa & Bogoso</div>
      </div>

      {!service ? (
        <div>
          <SecHead title="Choose Delivery Speed" sub="Book standard dispatch, urgent Same-Day runs, or contractual setups" />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { id: "sameDay", icon: "⚡", title: "Same Day Express Runner", desc: "Snatched and delivered within 2-4 hours", price: "From ₵30", color: "#f97316" },
              { id: "nextDay", icon: "📦", title: "Next Day Priority Dispatch", desc: "Saturdays included. Perfect for standard parcels", price: "From ₵20", color: "#3b82f6" },
              { id: "contractual", icon: "🏢", title: "Contractual Enterprise Delivery", desc: "Long-term dedicated deliveries for businesses", price: "By Quote", color: "#6366f1" },
              { id: "move", icon: "🚛", title: "ELEXTRA MOVE (Relocations)", desc: "Relocating or transporting heavy cargo safely", price: "From ₵50", color: "#ec4899" }
            ].map(sv => (
              <div 
                key={sv.id} 
                style={{ background: "white", borderRadius: "14px", padding: "16px", borderLeft: `5px solid ${sv.color}`, borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }} 
                onClick={() => setService(sv.id)}
              >
                <div style={{ fontSize: "36px" }}>{sv.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>{sv.title}</div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{sv.desc}</div>
                  <div style={{ fontWeight: 700, color: sv.color, marginTop: "4px", fontSize: "12px" }}>{sv.price}</div>
                </div>
                <div style={{ fontSize: "20px", color: "#94a3b8" }}><ArrowRight size={18} /></div>
              </div>
            ))}
          </div>

          <div style={{ ...S.sec, marginTop: "20px" }}>
            <SecHead title="🏍️ Available Couriers" sub="Live duty roster around Tarkwa & Bogoso" />
            {DRIVERS.map(d => (
              <div key={d.id} style={S.dCard}>
                <div style={S.dAv}>{d.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#1f2937", fontSize: "14px" }}>{d.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{d.vehicle} · {d.plate}</div>
                  <div style={{ fontSize: "12px", color: "#10b981", fontWeight: 600 }}>⭐ {d.rating} · {d.trips} trips completed</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "18px" }}>{d.eta}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>min ETA</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : service === "contractual" ? (
        // ─── CONTRACTUAL ENTERPRISE SERVICE PANEL ───
        <div style={S.fCard}>
          <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px" }}>🏢</span>
              <div style={{ fontWeight: 900, fontSize: "18px", color: "#1e3a8a" }}>Corporate SLA Designer</div>
            </div>
            <button style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "20px", padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: "12px", color: "#475569" }} onClick={clearSvc}>
              ✕ Reset Speed
            </button>
          </div>

          {/* REQUIRE AUTHENTICATION STATUS COGNIZANCE */}
          {!user ? (
            <div style={{ padding: "12px 0", textAlign: "center" }}>
              <div style={{ background: "#eff6ff", border: "2px solid #bfdbfe", borderRadius: "12px", padding: "20px", marginTop: "10px" }}>
                <div style={{ fontSize: "28px" }}>🔒</div>
                <div style={{ fontWeight: 800, fontSize: "15px", color: "#1e3a8a", marginTop: "10px" }}>Authentication Threshold Required</div>
                <p style={{ fontSize: "12px", color: "#475569", lineHeight: "1.5em", margin: "8px 0 16px" }}>
                  Corporate setups, invoice credit accounting, and Net-15 balance options are premium workflows reserved for authenticated merchants. Sign in to lock in enterprise logistics.
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <button style={{ ...S.cta, padding: "8px 18px", fontSize: "12px" }} onClick={() => setModal("login")}>
                    Sign In Account
                  </button>
                  <button style={{ background: "white", border: "2px solid #3b82f6", color: "#3b82f6", borderRadius: "10px", padding: "8px 18px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }} onClick={() => setModal("signup")}>
                    Register Corporate
                  </button>
                </div>
              </div>
            </div>
          ) : isContractSubmitted ? (
            <div style={{ textAlign: "center", padding: "30px 16px" }}>
              <div style={{ fontSize: "56px" }}>📄</div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#6366f1", marginTop: "12px" }}>Enterprise Bid Finalized!</div>
              <p style={{ color: "#64748b", marginTop: "8px", fontSize: "13px", lineHeight: "1.5em" }}>
                The detailed contract draft is generated. We are establishing connection parameters. Give the operator 10 minutes to register security guarantees.
              </p>
              
              <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", marginTop: "16px", textAlign: "left" }}>
                <div style={{ fontWeight: "800", fontSize: "12px", color: "#1e293b", marginBottom: "6px" }}>Draft Registration Details:</div>
                <div style={{ fontSize: "11px", color: "#475569", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>• <strong>Business Entity:</strong> {corpName} (TIN: {corpTin})</div>
                  <div>• <strong>Primary Sourcing:</strong> {routePickup} ➔ {routeDest}</div>
                  <div>• <strong>SLA Plan Tier:</strong> {contractPlan === "pro" ? "Commercial Pro" : contractPlan === "max" ? "Industrial Max" : "Logistics Partner Elite"}</div>
                  <div>• <strong>Contract Tenure:</strong> {contractTenure} Months</div>
                  <div>• <strong>Consolidated Quote:</strong> ₵{contractMonthlyTotal}/month</div>
                </div>
              </div>

              <button style={{ ...S.cta, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", marginTop: "20px" }} onClick={clearSvc}>
                Return to Speed Selection 🔄
              </button>
            </div>
          ) : (
            <div>
              {/* 💡 Individual account warning and upgrade bridge */}
              {!user || user.type === "ind" ? (
                <div style={{ background: "#fffbeb", border: "1.5px solid #fde047", borderRadius: "12px", padding: "12px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "16px" }}>💡</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#854d0e" }}>Account Class: Individual Retail Profile</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#854d0e", lineHeight: "1.4em", margin: 0 }}>
                    To unlock bi-weekly official tax invoicing, net-15 payment credit limits and corporate logistics discounts, instantly upgrade your active profile.
                  </p>
                  <button 
                    onClick={handleUpgradeAccount}
                    style={{ background: "#d97706", border: "none", color: "white", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", transition: "all 0.1s ease", alignSelf: "flex-start" }}
                  >
                    ✨ Upgrade Profile to Corporate
                  </button>
                </div>
              ) : (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "12px", padding: "10px 12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>✅</span>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#166534" }}>Authenticated Corporate Account: {user ? user.name : "Guest Corporate"}</span>
                </div>
              )}

              {/* SERVICE PLAN SELECTION */}
              <div style={S.sTitle}>1. Select SLA Operations Plan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {[
                  { id: "pro", title: "Commercial Pro", desc: "6 days/week, 2-hour response, dispatch on-demand priority", rate: "₵850/mo" },
                  { id: "max", title: "Industrial Max", desc: "7 days/week, 1-hour response, 1 assigned dedicated driver", rate: "₵2,100/mo" },
                  { id: "elite", title: "Logistics Partner Elite", desc: "24/7 priority dispatch, heavy haul/unlimited Aboboya standby, Net-30", rate: "₵3,500/mo" }
                ].map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setContractPlan(p.id)}
                    style={{
                      background: contractPlan === p.id ? "#eff6ff" : "white",
                      border: contractPlan === p.id ? "2.5px solid #2563eb" : "1.5px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b" }}>{p.title}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{p.desc}</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: "13px", color: "#2563eb", minWidth: "75px", textAlign: "right" }}>{p.rate}</div>
                  </div>
                ))}
              </div>

              {/* DEDICATED FLEET SELECTION */}
              <div style={S.sTitle}>2. Allocate Standby Logistics Fleet</div>
              <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>Customize standby resources deployed exclusively on your runs under SLA:</div>
                
                {[
                  { l: "Motorcycle Courier Riders (₵100/mo, 1 incl.)", count: ridersCount, set: setRidersCount, min: 1 },
                  { l: "Aboboya Tricycles - Bulk Cargo (₵250/mo)", count: trikesCount, set: setTrikesCount, min: 0 },
                  { l: "Flatbed Pickup Trucks - Heavy Haul (₵600/mo)", count: trucksCount, set: setTrucksCount, min: 0 }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: idx < 2 ? "1px dashed #cbd5e1" : "none" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#334155" }}>{item.l}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button 
                        style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1.5px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => item.set(Math.max(item.min, item.count - 1))}
                      >
                        -
                      </button>
                      <span style={{ fontSize: "12px", fontWeight: 800, minWidth: "15px", textAlign: "center" }}>{item.count}</span>
                      <button 
                        style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1.5px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => item.set(item.count + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ROUTE PROFILe CONFIG */}
              <div style={S.sTitle}>3. General Logistics Corridor</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                <div>
                  <FLabel>Primary Pickup Point</FLabel>
                  <input style={S.inp} value={routePickup} onChange={e => setRoutePickup(e.target.value)} placeholder="e.g. Sourcing Base" />
                </div>
                <div>
                  <FLabel>Designated Ingress Area</FLabel>
                  <input style={S.inp} value={routeDest} onChange={e => setRouteDest(e.target.value)} placeholder="e.g. Mining Base" />
                </div>
              </div>

              {/* CONTRACT TENURE */}
              <div style={S.sTitle}>4. Contract Commitment Duration</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {[
                  { m: 3, label: "3 Months", d: "Base Rate" },
                  { m: 6, label: "6 Months", d: "Save 5%" },
                  { m: 12, label: "12 Months", d: "Save 12% 🔥" }
                ].map(t => (
                  <button
                    key={t.m}
                    onClick={() => setContractTenure(t.m)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "10px",
                      border: `2px solid ${contractTenure === t.m ? "#2563eb" : "#cbd5e1"}`,
                      background: contractTenure === t.m ? "#eff6ff" : "white",
                      color: contractTenure === t.m ? "#1d4ed8" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>{t.label}</div>
                    <div style={{ fontSize: "10px", marginTop: "2px", fontWeight: "600", color: contractTenure === t.m ? "#2563eb" : "#94a3b8" }}>{t.d}</div>
                  </button>
                ))}
              </div>

              {/* BUSINESS VERIFICATION FIELDS */}
              <div style={S.sTitle}>5. Business Legal Entity Context</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                <div>
                  <FLabel style={{ margin: 0 }}>Registered Business Name *</FLabel>
                  <input style={S.inp} value={corpName} onChange={e => setCorpName(e.target.value)} placeholder="e.g. Asante Minerals Ltd" />
                </div>
                <div>
                  <FLabel style={{ margin: 0 }}>Ghana GRA TIN / Registrar ID *</FLabel>
                  <input style={S.inp} value={corpTin} onChange={e => setCorpTin(e.target.value)} placeholder="e.g. C001234567" />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <FLabel style={{ margin: 0 }}>Billing Officer WhatsApp/Phone *</FLabel>
                <input style={S.inp} value={billingContact} onChange={e => setBillingContact(e.target.value)} placeholder="e.g. +233 24 100 0000" />
              </div>

              {/* CALCULATOR PRICING SLIP */}
              <div style={{ background: "#eff6ff", border: "2px solid #3b82f6", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
                <div style={{ fontWeight: "900", color: "#1e3a8a", fontSize: "13.5px", marginBottom: "8px", borderBottom: "1.5px dashed #bfdbfe", paddingBottom: "4px" }}>
                  Est. Dynamic Contract Cost Sheet
                </div>
                <FeeRow l="SLA Base Plan Rate" v={`₵${planBase}/mo`} />
                {ridersFee > 0 && <FeeRow l={`Standby Motor Couriers (+${ridersCount - 1})`} v={`₵${ridersFee}/mo`} />}
                {trikesFee > 0 && <FeeRow l={`Standby Tricycle Hauls (+${trikesCount})`} v={`₵${trikesFee}/mo`} />}
                {trucksFee > 0 && <FeeRow l={`Standby Trucks / Vans (+${trucksCount})`} v={`₵${trucksFee}/mo`} />}
                {discountAmount > 0 && <FeeRow l={`${contractTenure}-Month SLA Discount (${discountRate * 100}%)`} v={`-₵${discountAmount}/mo`} warn />}
                
                <div style={{ borderTop: "2px solid #2563eb", marginTop: "8px", paddingTop: "8px", display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontWeight: 900, fontSize: "15px", color: "#1d4ed8" }}>
                  <span>SLA INVOICED MONTHLY</span>
                  <span>₵{contractMonthlyTotal}</span>
                </div>
              </div>

              {/* LEGAL SLA TERMS SCROLLBOX */}
              <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "10px", height: "90px", overflowY: "auto", fontSize: "10px", color: "#64748b", background: "#f8fafc", marginBottom: "14px", lineHeight: "1.4em" }}>
                <strong>ELEXTRA LOGISTICS SERVICE LEVEL AGREEMENT (SLA)</strong><br />
                - Guaranteed courier readiness uptime of 98.5% with Net-15 invoice clearance cycles.<br />
                - Full goods-in-transit insurance cover up to ₵35,000 per cargo cycle.<br />
                - Dedicated priority support manager assigned via WhatsApp bridge.<br />
                - Monthly consolidated digital waybill tracking registers supplied to the billing officer.
              </div>

              {/* DIGITAL SIGNING */}
              <div style={{ marginBottom: "16px" }}>
                <FLabel style={{ margin: 0, fontWeight: "bold", color: "#0f172a" }}>Digital Signature (Type Full Legal Name) *</FLabel>
                <input style={S.inp} value={signatoryName} onChange={e => setSignatoryName(e.target.value)} placeholder="Type full name to execute contract SLA" />
              </div>

              {/* ACTION EXECUTE */}
              <button 
                onClick={() => {
                  if (!corpName || !corpTin || !billingContact || !signatoryName) {
                    notify("Please supply all starred corporate context fields & signature", "err");
                    return;
                  }
                  const text = `ELEXTRA Enterprise SLA Proposal Finalized%0ABusiness: ${corpName}%0AGRA TIN: ${corpTin}%0APlan Selected: ${contractPlan === "pro" ? "Commercial Pro" : contractPlan === "max" ? "Industrial Max" : "Logistics Partner Elite"} (${contractTenure} Months tenure)%0AMotorcycle standby: ${ridersCount}%0ATricycle standby: ${trikesCount}%0ATruck standby: ${trucksCount}%0ARoute: ${routePickup} to ${routeDest}%0AConsolidated Quote: ₵${contractMonthlyTotal}/month%0ABilling Contact: ${billingContact}%0ADigital Signature: ${signatoryName}`;
                  window.open(`https://wa.me/233246263123?text=${text}`, "_blank");
                  setIsContractSubmitted(true);
                  notify("Contractual SLA proposal generated & transmitted! 🏢🎉", "ok");
                }}
                style={{ ...S.cta, background: "linear-gradient(135deg, #2563eb, #1e40af)", color: "white", width: "100%", padding: "14px" }}
              >
                📝 Submit Bespoke Corporate SLA Proposal
              </button>
            </div>
          )}
        </div>
      ) : service === "move" ? (
        <div style={S.fCard}>
          <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px" }}>🚛</span>
              <div style={{ fontWeight: 900, fontSize: "18px", color: "#db2777" }}>ELEXTRA MOVE Relocation Wizard</div>
            </div>
            <button style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "20px", padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: "12px", color: "#475569" }} onClick={clearSvc}>
              ✕ Reset Speed
            </button>
          </div>

          {moveSubmitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
              <div style={{ fontWeight: 900, fontSize: "20px", color: "#10b981", marginBottom: "8px" }}>Relocation Service Booked!</div>
              <div style={{ fontSize: "12.5px", color: "#4b5563", maxWidth: "420px", margin: "0 auto 20px" }}>
                KWAME DARKO or your assigned dispatcher will connect with you natively over phone within 15 minutes to coordinate loading & secure route transport. Please prepare your items accordingly.
              </div>
              <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "12px", padding: "16px", textAlign: "left", marginBottom: "20px", maxWidth: "420px", margin: "0 auto 20px" }}>
                <div style={{ fontWeight: "bold", fontSize: "13px", color: "#be185d", borderBottom: "1.5px dashed #fbcfe8", paddingBottom: "4px", marginBottom: "8px" }}>
                  🎫 ASSIGNED TRANSPORTER DETS
                </div>
                {moveVehicleType === "aboboyaa" && (
                  <div>
                    <div style={{ fontSize: "12.5px", color: "#1f2937" }}>👤 <strong>Kwame Darko</strong></div>
                    <div style={{ fontSize: "12.5px", color: "#4b5563" }}>📞 <strong>Telephone:</strong> +233 24 621 1131</div>
                    <div style={{ fontSize: "12.5px", color: "#4b5563" }}>🚚 <strong>Vehicle:</strong> Aboboyaa (CR-9182-24)</div>
                  </div>
                )}
                {moveVehicleType === "small_cargo" && (
                  <div>
                    <div style={{ fontSize: "12.5px", color: "#1f2937" }}>👤 <strong>Ama Owusu</strong></div>
                    <div style={{ fontSize: "12.5px", color: "#4b5563" }}>📞 <strong>Telephone:</strong> +233 24 391 1902</div>
                    <div style={{ fontSize: "12.5px", color: "#4b5563" }}>🚚 <strong>Vehicle:</strong> Small Cargo Pick-up (AS-7733-22)</div>
                  </div>
                )}
                {moveVehicleType === "large_cargo" && (
                  <div>
                    <div style={{ fontSize: "12.5px", color: "#1f2937" }}>👤 <strong>Nana Yaw</strong></div>
                    <div style={{ fontSize: "12.5px", color: "#4b5563" }}>📞 <strong>Telephone:</strong> +233 20 891 2231</div>
                    <div style={{ fontSize: "12.5px", color: "#4b5563" }}>🚚 <strong>Vehicle:</strong> Large Cargo Truck (GW-8822-21)</div>
                  </div>
                )}
                
                <div style={{ marginTop: "12px", borderTop: "1px dashed #fbcfe8", paddingTop: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>📍 <strong>Pickup:</strong> {movePickup}</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>📍 <strong>Destination:</strong> {moveDest}</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>📅 <strong>Scheduled:</strong> {moveTime}</div>
                  <div style={{ fontSize: "12.5px", color: "#be185d", fontWeight: "bold", marginTop: "6px" }}>🔑 Recipient PIN Code: <span style={{ fontFamily: "monospace", letterSpacing: "1px" }}>{moveRecipientPin}</span></div>
                </div>
              </div>
              <button 
                style={{ ...S.cta, background: "#db2777" }} 
                onClick={() => {
                  setMoveSubmitted(false);
                  setMovePickup("");
                  setMoveDest("");
                  setMoveTime("");
                  setMovePlenty(null);
                  setMoveHeavy(null);
                  setMoveIsSelfReceiving(null);
                  setMoveRecipientName("");
                  setMoveRecipientPhone("");
                  setMoveRecipientPin("");
                  clearSvc();
                }}
              >
                Close Relocation Manager
              </button>
            </div>
          ) : (
            <div>
              <div style={S.sTitle}>Cargo Relocation Details</div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <FLabel>Pickup Base Location *</FLabel>
                  <input 
                    style={S.inp} 
                    value={movePickup} 
                    onChange={e => setMovePickup(e.target.value)} 
                    placeholder="e.g. Tarkwa Cyanide Ground" 
                  />
                </div>
                <div>
                  <FLabel>Destination Base Location *</FLabel>
                  <input 
                    style={S.inp} 
                    value={moveDest} 
                    onChange={e => setMoveDest(e.target.value)} 
                    placeholder="e.g. Bogoso Market Square" 
                  />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <FLabel>Determination of Move Time *</FLabel>
                <input 
                  type="datetime-local"
                  style={S.inp} 
                  value={moveTime} 
                  onChange={e => setMoveTime(e.target.value)} 
                  placeholder="Schedule moving date/hour" 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <FLabel>Are the items plenty? *</FLabel>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button 
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: movePlenty === true ? "2px solid #db2777" : "1px solid #e2e8f0", background: movePlenty === true ? "#fce7f3" : "white", fontWeight: movePlenty === true ? "bold" : "normal", fontSize: "12px", cursor: "pointer" }}
                      onClick={() => setMovePlenty(true)}
                    >
                      Yes, Plenty Items
                    </button>
                    <button 
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: movePlenty === false ? "2px solid #db2777" : "1px solid #e2e8f0", background: movePlenty === false ? "#fce7f3" : "white", fontWeight: movePlenty === false ? "bold" : "normal", fontSize: "12px", cursor: "pointer" }}
                      onClick={() => setMovePlenty(false)}
                    >
                      No, Compact Box/Item
                    </button>
                  </div>
                </div>
                <div>
                  <FLabel>Is the load heavy? *</FLabel>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button 
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: moveHeavy === true ? "2px solid #db2777" : "1px solid #e2e8f0", background: moveHeavy === true ? "#fce7f3" : "white", fontWeight: moveHeavy === true ? "bold" : "normal", fontSize: "12px", cursor: "pointer" }}
                      onClick={() => setMoveHeavy(true)}
                    >
                      Yes, Heavy Load
                    </button>
                    <button 
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: moveHeavy === false ? "2px solid #db2777" : "1px solid #e2e8f0", background: moveHeavy === false ? "#fce7f3" : "white", fontWeight: moveHeavy === false ? "bold" : "normal", fontSize: "12px", cursor: "pointer" }}
                      onClick={() => setMoveHeavy(false)}
                    >
                      No, Standard Weight
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <FLabel>Pick Relocation Transport Vehicle *</FLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { id: "aboboyaa", icon: "🛺", name: "Aboboyaa (Heavy Trike)", desc: "Kwame Darko · GW-3344-23 · GHS 50 Base", price: movePrices.aboboyaa },
                    { id: "small_cargo", icon: "🛻", name: "Small Cargo (Pick-up)", desc: "Ama Owusu · AS-7733-22 · GHS 120 Base", price: movePrices.small_cargo },
                    { id: "large_cargo", icon: "🚛", name: "Large Cargo (Super Truck)", desc: "Nana Yaw · GW-8822-21 · GHS 250 Base", price: movePrices.large_cargo }
                  ].map(v => (
                    <div 
                      key={v.id} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "10px", 
                        padding: "10px 12px", 
                        borderRadius: "10px", 
                        border: moveVehicleType === v.id ? "2.5px solid #db2777" : "1.5px solid #e2e8f0", 
                        background: moveVehicleType === v.id ? "#fdf2f8" : "white", 
                        cursor: "pointer" 
                      }}
                      onClick={() => setMoveVehicleType(v.id as any)}
                    >
                      <div style={{ fontSize: "28px" }}>{v.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: "13.5px", color: "#1f2937" }}>{v.name}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{v.desc}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#db2777" }}>
                        ₵{v.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECIPIENT IDENTIFICATION CHECK */}
              <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "10px", marginBottom: "16px" }}>
                <div style={{ fontWeight: 900, color: "#334155", fontSize: "13px", marginBottom: "6px" }}>
                  🛡️ Interactive Recipient Identification
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
                  To guarantee safe arrival of your expensive relocation cargo, designate who is receiving the items.
                </div>
                <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                  <button 
                    type="button"
                    style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: moveIsSelfReceiving === true ? "2px solid #db2777" : "1.5px solid #cbd5e1", background: moveIsSelfReceiving === true ? "#fdf2f8" : "white", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                    onClick={() => setMoveIsSelfReceiving(true)}
                  >
                    🙋 I am receiving it myself
                  </button>
                  <button 
                    type="button"
                    style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: moveIsSelfReceiving === false ? "2px solid #db2777" : "1.5px solid #cbd5e1", background: moveIsSelfReceiving === false ? "#fdf2f8" : "white", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                    onClick={() => setMoveIsSelfReceiving(false)}
                  >
                    👥 Someone else receives it
                  </button>
                </div>

                {moveIsSelfReceiving !== null && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <FLabel style={{ margin: "2px 0" }}>Recipient Nominee Name *</FLabel>
                      <input 
                        style={S.inp} 
                        value={moveRecipientName} 
                        onChange={e => setMoveRecipientName(e.target.value)} 
                        placeholder="Authorized full name" 
                      />
                    </div>
                    <div>
                      <FLabel style={{ margin: "2px 0" }}>Recipient Phone Line *</FLabel>
                      <input 
                        style={S.inp} 
                        value={moveRecipientPhone} 
                        onChange={e => setMoveRecipientPhone(e.target.value)} 
                        placeholder="Enables instant PIN authentication" 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ESTIMATE CARD SLIP */}
              <div style={{ background: "#fff5f5", border: "1.5px solid #feb2b2", borderRadius: "10px", padding: "10px 12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontWeight: 900, color: "#9b1c1c", fontSize: "14px" }}>
                  <span>Consolidated Relocation Estimate</span>
                  <span>₵{movePrices[moveVehicleType]}</span>
                </div>
              </div>

              <button 
                type="button"
                style={{ ...S.cta, background: "linear-gradient(135deg, #ec4899, #db2777)", color: "white", width: "100%", padding: "14px", borderRadius: "12px", fontWeight: "bold", fontSize: "14px" }}
                onClick={() => {
                  if (!movePickup || !moveDest) {
                    notify("Please supply pickup and destination move locations.", "err");
                    return;
                  }
                  if (!moveTime) {
                    notify("Please designate determination of move time.", "err");
                    return;
                  }
                  if (movePlenty === null || moveHeavy === null) {
                    notify("Please determine cargo bulk specifications (plenty/heavy choices).", "err");
                    return;
                  }
                  if (moveIsSelfReceiving === null) {
                    notify("Please determine who receives the relocation cargo under recipient identification option.", "err");
                    return;
                  }
                  if (!moveRecipientName || !moveRecipientPhone) {
                    notify("Please provide nominee authorization details.", "err");
                    return;
                  }

                  const selectedPrice = movePrices[moveVehicleType];
                  if (onDispatchSubmit) {
                    onDispatchSubmit({
                      service: "move",
                      size: movePlenty ? "Plenty Items" : "Compact Item",
                      type: moveHeavy ? "Heavy Relocation Loads" : "Normal Weight Goods",
                      pickup: movePickup,
                      pickupAddr: `Move Scheduled: ${moveTime}`,
                      destination: moveDest,
                      name: moveRecipientName,
                      phone: moveRecipientPhone,
                      fee: selectedPrice,
                      recipientName: moveRecipientName,
                      recipientPhone: moveRecipientPhone,
                      recipientIsSelf: moveIsSelfReceiving,
                      recipientPin: moveRecipientPin
                    });
                  }

                  const driverDets = moveVehicleType === "aboboyaa" ? "Kwame Darko (+233 24 621 1131)" : moveVehicleType === "small_cargo" ? "Ama Owusu (+233 24 391 1902)" : "Nana Yaw (+233 20 891 2231)";
                  const descText = `New ELEXTRA MOVE Relocation Job%0AVehicle: ${moveVehicleType.toUpperCase()}%0APickup Place: ${movePickup}%0ADestination: ${moveDest}%0AScheduled Time: ${moveTime}%0AQuantity: ${movePlenty ? "Plenty Items" : "Single"} (${moveHeavy ? "Heavy" : "Light"})%0ADispatcher: ${driverDets}%0ARecipient Nominee: ${moveRecipientName} (${moveRecipientPhone})%0ASecure Receiver PIN: ${moveRecipientPin}`;
                  window.open(`https://wa.me/233246263123?text=${descText}`, "_blank");
                  
                  notify("ELEXTRA MOVE order placed securely! 🎉", "ok");
                  setMoveSubmitted(true);
                }}
              >
                🚛 Initiate Prepaid Move & Schedule Driver
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={S.fCard}>
          <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ fontWeight: 850, fontSize: "18px", color: "#0f172a" }}>
              {service === "sameDay" ? "⚡ Same Day" : "📦 Next Day"} Runner
            </div>
            <button style={{ background: "#fffbeb", border: "1.5px solid #fde047", borderRadius: "20px", padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: "12px", color: "#a52a2a" }} onClick={clearSvc}>
              ✕ Change
            </button>
          </div>

          {/* STEP PROGRESS SHEET */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {["Parcel", "Pickup", "Dropoff", "Submit"].map((l, i) => (
              <div key={l} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: "4px", borderRadius: "2px", background: step > i + 1 ? "#10b981" : step === i + 1 ? "#3b82f6" : "#e2e8f0", marginBottom: "4px" }} />
                <div style={{ fontSize: "10px", color: step === i + 1 ? "#3b82f6" : "#94a3b8", fontWeight: step === i + 1 ? 700 : 400 }}>{l}</div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div>
              <div style={S.sTitle}>Step 1 — Package Specifications</div>
              <FLabel>What is the size?</FLabel>
              <div style={S.oGrid}>
                {["Envelope/Docs", "Shoebox Size", "Heavy Appliance", "Sacks/Bulk Supplies"].map(v => (
                  <OptionBtn key={v} label={v} active={form.size === v} onClick={() => setVal("size", v)} />
                ))}
              </div>
              <FLabel style={{ marginTop: "16px" }}>Material classification</FLabel>
              <div style={S.oGrid}>
                {["Fragile", "Normal Case", "Warm Food", "Wires/Valuables"].map(v => (
                  <OptionBtn key={v} label={v} active={form.type === v} onClick={() => setVal("type", v)} />
                ))}
              </div>
              <NavRow 
                onNext={() => {
                  if (!form.size || !form.type) { notify("Please designate specifications", "err"); return; }
                  setStep(2);
                }} 
                nextOnly 
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={S.sTitle}>Step 2 — Collection Point</div>
              <FLabel>How do we obtain the parcel?</FLabel>
              <div style={S.oGrid}>
                {["Direct Home Pickup", "Retail Partner Collect", "Elextra Station Drop-off"].map(v => (
                  <OptionBtn key={v} label={v} active={form.pickup === v} onClick={() => setVal("pickup", v)} />
                ))}
              </div>
              {form.pickup && (
                <input 
                  placeholder={form.pickup.includes("Partner") ? "Enter Merchant/Store Name" : "Enter pickup landmarks or digital address"} 
                  value={form.pickupAddr} 
                  onChange={e => setVal("pickupAddr", e.target.value)} 
                  style={{ ...S.inp, marginTop: "12px" }} 
                />
              )}
              <NavRow onBack={() => window.history.back()} onNext={() => {
                if (!form.pickup || !form.pickupAddr) { notify("Select and enter pickup point details", "err"); return; }
                setStep(3);
              }} />
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={S.sTitle}>Step 3 — Delivery Destination</div>
              <FLabel>Specify final recipient address</FLabel>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input 
                  placeholder="Landmarks, house numbers, or business centers" 
                  value={form.destination} 
                  onChange={e => setVal("destination", e.target.value)} 
                  style={{ ...S.inp, flex: 1 }} 
                />
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={gpsStatus === "loading"}
                  style={{
                    background: gpsStatus === "success" ? "#10b981" : "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "0 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: gpsStatus === "loading" ? "not-allowed" : "pointer"
                  }}
                >
                  {gpsStatus === "loading" ? "🛰️ Pinging..." : "📡 GPS Auto"}
                </button>
              </div>

              {gpsStatus === "success" && activeGps && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "10px", borderRadius: "8px", margin: "10px 0", fontSize: "11px" }}>
                  <div style={{ fontWeight: "bold", color: "#166534" }}>🌏 GPS Route Calibrated</div>
                  <div style={{ color: "#334155", marginTop: "4px" }}>
                    • Coords: {activeGps.lat.toFixed(5)}° N, {activeGps.lng.toFixed(5)}° W<br/>
                    • Flight Distance: {deliveryDistance.toFixed(2)} km to dispatch hub
                  </div>
                  {activeGps.isSimulated && activeGps.realCoords && (
                    <div style={{ marginTop: "6px", color: "#92400e" }}>
                      ⚠️ Physical GPS (~{getHaversineInKm(activeGps.realCoords.lat, activeGps.realCoords.lng, 5.303, -1.984).toFixed(0)} km away). We are simulating <strong>Tarkwa Cyanide</strong>.
                      <label style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={useGpsSim} onChange={e => setUseGpsSim(e.target.checked)} style={{ cursor: "pointer" }} />
                        Simulate within service bounds
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: "16px", background: "#f8fafc", borderRadius: "10px", padding: "12px 14px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "13px", color: "#1e293b" }}>Estimate Breakdown</div>
                <FeeRow l="Dispatch Service Rate" v={`₵${dynamicServiceFee}`} />
                {activeGps && <FeeRow l="GPS Calibration Multiplier" v="Active (Route Optimized) 🛰️" />}
                <FeeRow l="Safety Surcharge" v="Included" />
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13.5px" }}>
                  <span>Final Estimate:</span>
                  <span style={{ color: "#2563eb" }}>₵{dynamicServiceFee}</span>
                </div>
              </div>

              <NavRow onBack={() => window.history.back()} onNext={() => {
                if (!form.destination) { notify("Confirm destination address", "err"); return; }
                setStep(4);
              }} />
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={S.sTitle}>Step 4 — Delivery Handoff Contact</div>
              <FLabel style={{ fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Are you the recipient who will receive this parcel?</FLabel>
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelfReceiving(true);
                    setForm(f => ({
                      ...f,
                      name: user?.name || "Elextra Customer",
                      phone: user?.phone || "+233 24 555 1234"
                    }));
                  }}
                  style={{
                    flex: 1,
                    padding: "10.5px",
                    borderRadius: "10px",
                    border: `2px solid ${isSelfReceiving === true ? "#10b981" : "#e2e8f0"}`,
                    background: isSelfReceiving === true ? "#f0fdf4" : "white",
                    color: isSelfReceiving === true ? "#166534" : "#475569",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "12.5px"
                  }}
                >
                  🎁 Yes, I am the Recipient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelfReceiving(false);
                    setForm(f => ({ ...f, name: "", phone: "" }));
                  }}
                  style={{
                    flex: 1,
                    padding: "10.5px",
                    borderRadius: "10px",
                    border: `2px solid ${isSelfReceiving === false ? "#3b82f6" : "#e2e8f0"}`,
                    background: isSelfReceiving === false ? "#eff6ff" : "white",
                    color: isSelfReceiving === false ? "#1d4ed8" : "#475569",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "12.5px"
                  }}
                >
                  📦 No, I am the Sender
                </button>
              </div>

              {isSelfReceiving === true && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "12px", borderRadius: "10px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#15803d", marginBottom: "4px" }}>
                    ✓ Profile Synced for Handoff
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#1f2937" }}>
                    • Name: <strong>{form.name}</strong><br />
                    • Phone: <strong>{form.phone}</strong>
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#166534", marginTop: "6px" }}>
                    (Optional: Refine your name/phone in the fields below if needed)
                  </div>
                </div>
              )}

              {isSelfReceiving === false && (
                <p style={{ fontSize: "11px", color: "#64748b", marginTop: "-6px", marginBottom: "12px" }}>
                  Please enter the name and phone details of the final recipient who the dispatch rider must contact upon arrival:
                </p>
              )}

              {isSelfReceiving !== null && (
                <>
                  <FLabel>{isSelfReceiving ? "Confirm Handoff Name" : "Recipient Full Name"}</FLabel>
                  <input placeholder={isSelfReceiving ? "Your full name *" : "Recipient full name *"} value={form.name} onChange={e => setVal("name", e.target.value)} style={S.inp} />
                  
                  <FLabel style={{ marginTop: "12px" }}>{isSelfReceiving ? "Confirm Handoff Phone" : "Recipient Phone / WhatsApp"}</FLabel>
                  <input placeholder="Handoff mobile number *" value={form.phone} onChange={e => setVal("phone", e.target.value)} style={{ ...S.inp, marginTop: "4px" }} />
                </>
              )}

              {isSelfReceiving !== null && (
                <div style={{ marginTop: "14px", background: "#f1f5f9", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "#334155" }}>
                  <div style={{ fontWeight: 700, marginBottom: "8px" }}>Dispatch Summary Statement</div>
                  <div style={{ display: "flex", gap: "4px", flexDirection: "column" }}>
                    <div>• Spec: {form.size} ({form.type})</div>
                    <div>• Collection: {form.pickup} / {form.pickupAddr}</div>
                    <div>• Destination: {form.destination}</div>
                    <div>• Classification: {isSelfReceiving ? "Self-Receive Handoff 🎁" : "Sender Transit 📦"}</div>
                    <div>• Recipient Contact: {form.name} ({form.phone})</div>
                  </div>
                </div>
              )}

              <NavRow 
                onBack={() => window.history.back()} 
                onSubmit={() => {
                  if (isSelfReceiving === null) { notify("Please designate if you are receiving the parcel.", "err"); return; }
                  if (!form.name || !form.phone) { notify("Contact name and phone number are mandatory", "err"); return; }
                  if (onDispatchSubmit) {
                    onDispatchSubmit({
                      service: service || "sameDay",
                      size: form.size,
                      type: form.type,
                      pickup: form.pickup,
                      pickupAddr: form.pickupAddr,
                      destination: form.destination,
                      name: form.name,
                      phone: form.phone,
                      fee: dynamicServiceFee
                    });
                  }
                  const text = `New ELEXTRA ${service?.toUpperCase()} Run Request%0APackage: ${form.size} / ${form.type}%0APickup Details: ${form.pickup} (${form.pickupAddr})%0ADestination Detail: ${form.destination}%0ARecipient: ${form.name} (${form.phone})%0AType: ${isSelfReceiving ? 'Self-Receive' : 'Sender'}`;
                  window.open(`https://wa.me/233246263123?text=${text}`, "_blank");
                  setDone(true);
                }} 
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── TRACK ORDER SCREEN ───────────────────────────────────────────────────────
interface TrackPageProps {
  user: any;
  orders: Order[];
  activeOrder: Order | null;
  trackStep: number;
}

export function TrackPage({ user, orders, activeOrder, trackStep }: TrackPageProps) {
  const [tid, setTid] = useState("");
  const [found, setFound] = useState<Order | "no" | null>(null);
  const STEPS = ["Order Confirmed", "Rider Associated", "Parcel Collected", "In-Transit", "Delivered Safely ✅"];

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: "customer" | "driver", text: string, time: string }[]>([]);
  const [inputText, setInputText] = useState("");

  // Uber, Yango & Bolt Interactive Custom States for maximum user-friendliness
  const [tipPaid, setTipPaid] = useState<number>(0);
  const [rating, setRating] = useState<number>(0);
  const [voipState, setVoipState] = useState<"idle" | "ringing" | "connected" | "ended">("idle");
  const [voipSecs, setVoipSecs] = useState(0);
  const [speedPref, setSpeedPref] = useState<"standard" | "silent" | "express">("standard");

  // VoIP call duration increment track
  useEffect(() => {
    let interval: any = null;
    if (voipState === "connected") {
      interval = setInterval(() => {
        setVoipSecs(s => s + 1);
      }, 1000);
    } else {
      setVoipSecs(0);
    }
    return () => clearInterval(interval);
  }, [voipState]);

  // Dynamically resolve target order from active or searched found state
  const liveFound = found && found !== "no" ? (orders.find(o => o.id === found.id) || found) : found;
  const targetOrder = activeOrder || (liveFound && liveFound !== "no" ? liveFound : null);

  const [lastStatus, setLastStatus] = useState<string | undefined>(targetOrder?.status);
  const [isFlashActive, setIsFlashActive] = useState(false);

  useEffect(() => {
    if (targetOrder?.status && targetOrder.status !== lastStatus) {
      setLastStatus(targetOrder.status);
      setIsFlashActive(true);
      const timer = setTimeout(() => setIsFlashActive(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [targetOrder?.status, lastStatus]);

  const currentOrderId = targetOrder?.id || "";

  // Helper to map and synchronize actual status updates from the database
  const getProgressAndStep = (order: any) => {
    if (!order) return { step: 0, percent: 10, statusText: "" };
    const s = (order.status || "").toLowerCase() || "confirmed";
    let step = 0;
    let percent = order.progress !== undefined ? Number(order.progress) : 10;
    let statusText = "Preparing your package details";

    if (s === "pending" || s === "confirmed") {
      step = 0;
      if (order.progress === undefined) percent = 10;
      statusText = "Verification complete. Order confirmed.";
    } else if (s === "preparing" || s === "assigned") {
      step = 1;
      if (order.progress === undefined) percent = 35;
      statusText = "Rider associated. Package is being readied!";
    } else if (s === "collected") {
      step = 2;
      if (order.progress === undefined) percent = 60;
      statusText = "Package collected. Departing shop point";
    } else if (s === "in-transit" || s === "out-for-delivery") {
      step = 3;
      if (order.progress === undefined) percent = 85;
      statusText = "Speeding along highway bypass...";
    } else if (s === "delivered" || s === "completed") {
      step = 4;
      percent = 100;
      statusText = "Delivered safely! Enjoy your supplies! 🥳";
    }

    return { step, percent, statusText };
  };

  const { step: effectiveStep, percent: defaultPercent, statusText: defaultStatusText } = targetOrder 
    ? getProgressAndStep(targetOrder) 
    : { step: 0, percent: 10, statusText: "" };

  const [mapMode, setMapMode] = useState<"roadmap" | "interactive">("interactive");
  const [liveGpsProgress, setLiveGpsProgress] = useState<number | null>(null);
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setLiveGpsProgress(null);
    setLiveGpsCoords(null);
  }, [currentOrderId]);

  useEffect(() => {
    if (currentOrderId) {
      const handleGpsUpdate = (e: any) => {
        const data = e.detail;
        if (data && data.orderId === currentOrderId) {
          if (data.progress !== undefined) {
            setLiveGpsProgress(Number(data.progress));
          }
          if (data.lat !== undefined && data.lng !== undefined) {
            setLiveGpsCoords({ lat: Number(data.lat), lng: Number(data.lng) });
          }
        }
      };
      window.addEventListener("elx_gps_update", handleGpsUpdate);
      return () => {
        window.removeEventListener("elx_gps_update", handleGpsUpdate);
      };
    }
  }, [currentOrderId]);

  const effectivePercent = liveGpsProgress !== null ? liveGpsProgress : defaultPercent;

  // Coordinate calculation logic matching the admin GPS telemetry driver simulator
  const getCoordinatesForProgress = (progress: number) => {
    const fra = progress / 100;
    const markerX = (1 - fra) * (1 - fra) * 45 + 2 * (1 - fra) * fra * 250 + fra * fra * 455;
    const markerY = (1 - fra) * (1 - fra) * 115 + 2 * (1 - fra) * fra * 35 + fra * fra * 115;
    
    const baseLat = 5.303; // Tarkwa Center
    const baseLng = -1.984;
    const lat = baseLat + (markerY - 115) * 0.0005;
    const lng = baseLng + (markerX - 45) * 0.0008;
    return { lat, lng };
  };

  const currentRiderCoords = liveGpsCoords || getCoordinatesForProgress(effectivePercent);
  const pickupCoords = getCoordinatesForProgress(0);
  const dropoffCoords = getCoordinatesForProgress(100);

  const effectiveStatusText = (() => {
    if (targetOrder?.delivery === "pickup") {
      if (effectivePercent <= 30) return "Order received, restaurant preparing your food... 🍲";
      if (effectivePercent <= 80) return "Food is cooking! Almost ready for collection... 🍳";
      if (effectivePercent < 100) return "Ready for pick-up! Head over to the restaurant outlet! 🛍️";
      return "Picked up successfully! Enjoy your meal! 🥳";
    }
    if (effectivePercent <= 15) return "Order confirmed, preparing items...";
    if (effectivePercent <= 40) return "Package is being readied and loaded...";
    if (effectivePercent <= 70) return "Departed dispatch hub, in-transit...";
    if (effectivePercent < 100) return "Speeding along highway bypass...";
    return "Delivered safely! Enjoy your supplies! 🥳";
  })();

  const getLiveEstimatedMinutes = (withEmoji = false) => {
    if (!targetOrder) return "";
    if (targetOrder.status === "delivered") return withEmoji ? "Arrived ✅" : "Arrived";
    if (targetOrder.estimatedMinutes) {
      const fractionRemaining = (100 - effectivePercent) / 100;
      const computed = Math.max(2, Math.round(targetOrder.estimatedMinutes * fractionRemaining));
      return `${computed} mins`;
    }
    const fallback = Math.max(2, Math.round((100 - effectivePercent) * 0.16 + 1));
    return `${fallback} mins`;
  };

  useEffect(() => {
    if (currentOrderId) {
      (async () => {
        const history = await DB.get(`elx_chat_${currentOrderId}`);
        if (history && Array.isArray(history)) {
          setMessages(history);
        } else {
          const assignedDriverName = targetOrder?.driver?.name || "Your Dispatch Runner";
          const initialMsgs = [
            { 
              sender: "driver" as const, 
              text: `Hello! I am ${assignedDriverName}, your assigned Elextra dispatch runner. I've received your request and am working on it! You can chat with me here.`, 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }
          ];
          setMessages(initialMsgs);
          await DB.set(`elx_chat_${currentOrderId}`, initialMsgs);
        }
      })();

      const handleSync = (e: any) => {
        if (e.detail?.key === `elx_chat_${currentOrderId}`) {
          setMessages(e.detail.value || []);
        }
      };

      window.addEventListener("elx_db_sync" as any, handleSync);
      return () => {
        window.removeEventListener("elx_db_sync" as any, handleSync);
      };
    }
  }, [currentOrderId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentOrderId) return;
    
    const userMsg = {
      sender: "customer" as const,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText("");
    await DB.set(`elx_chat_${currentOrderId}`, updated);
    
    setTimeout(async () => {
      const lowerText = userMsg.text.toLowerCase();
      let replyText = "Understood! I am speeding along the Bogoso-Tarkwa road to complete your delivery. Feel free to alert me here.";
      
      if (lowerText.includes("pin") || lowerText.includes("code")) {
        const pinText = targetOrder?.recipientPin ? `Your Receiver PIN is ${targetOrder.recipientPin}.` : "";
        replyText = `Understood! ${pinText} Keep that PIN secure - I will verify it on location to authorize the handoff. 🛡️`;
      } else if (lowerText.includes("where") || lowerText.includes("location") || lowerText.includes("status") || lowerText.includes("map")) {
        replyText = `I am currently nearby. Tracking shows I am driving through the town center check-point! 🏍️`;
      } else if (lowerText.includes("delay") || lowerText.includes("traffic") || lowerText.includes("slow")) {
        replyText = `Acknowledged. Traffic on the bypass is slightly busy, but I am navigating taking standard short-cuts to save time! 🚀`;
      } else if (lowerText.includes("pepper") || lowerText.includes("food") || lowerText.includes("hot") || lowerText.includes("sauce")) {
        replyText = `Got it! Your gourmet chopbar custom options are checked. Everything is safely sealed! 🍲`;
      } else if (lowerText.includes("call") || lowerText.includes("phone") || lowerText.includes("number")) {
        replyText = `Got it! If you need to make voice calls, you can also dial my phone line directly anytime. 📞`;
      } else if (lowerText.includes("thank") || lowerText.includes("thanks") || lowerText.includes("ok")) {
        replyText = `You're welcome! Happy to assist you. Safe logistics is our promise. 😊`;
      }
      
      const driverReply = {
        sender: "driver" as const,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const finalMsgs = [...updated, driverReply];
      setMessages(finalMsgs);
      await DB.set(`elx_chat_${currentOrderId}`, finalMsgs);
    }, 1200);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div style={{ background: "linear-gradient(135deg, var(--elextra-primary, #21F1A8), #16c387)", padding: "20px 16px", borderRadius: "16px", marginBottom: "16px", color: "var(--elextra-primary-text, #171717)" }}>
        <div style={{ fontSize: "22px", fontWeight: 900 }}>📍 Real-Time Parcel Tracking</div>
        <div style={{ fontSize: "13px", opacity: 0.9 }}>Check status of market shopping lists and runners live</div>
      </div>

      {targetOrder && (
        <div style={{
          ...S.sec,
          border: isFlashActive
            ? "2.5px solid #10b981"
            : "2px solid var(--elextra-primary, #21F1A8)",
          boxShadow: isFlashActive
            ? "0 0 25px rgba(16, 185, 129, 0.45)"
            : "0 4px 12px rgba(0,0,0,0.05)",
          backgroundColor: isFlashActive
            ? "rgba(16, 185, 129, 0.04)"
            : "white",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: isFlashActive ? "scale(1.005)" : "scale(1)",
          marginBottom: "16px"
        }}>
          <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <div style={{ fontWeight: 900, color: "var(--elextra-primary, #21F1A8)", fontSize: "16px" }}>🔴 LIVE — {targetOrder.id}</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Courier: <strong>{targetOrder.driver?.name}</strong> · {targetOrder.driver?.vehicle || "Dispatch Bike"}
              </div>
            </div>
            <motion.div
              key={targetOrder.status}
              initial={{ scale: 0.85, opacity: 0.6 }}
              animate={{ scale: [1.2, 0.95, 1], opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{ background: targetOrder.status === "delivered" ? "#16c387" : "var(--elextra-primary, #21F1A8)", color: "var(--elextra-primary-text, #171717)", padding: "4px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, height: "fit-content", textTransform: "uppercase" }}
            >
              {targetOrder.status || "ACTIVE RUN"}
            </motion.div>
          </div>

          {/* ACTIVE COURIER PROGRESS MAP */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #cbd5e1", marginBottom: "18px" }}>
            <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "12px", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  🗺️ Tracker Interface:
                </span>
                <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                  <button 
                    onClick={() => setMapMode("interactive")}
                    style={{ 
                      fontSize: "10px", 
                      fontWeight: "bold", 
                      padding: "4px 10px", 
                      borderRadius: "6px", 
                      cursor: "pointer", 
                      border: "none",
                      color: mapMode === "interactive" ? "white" : "#475569", 
                      background: mapMode === "interactive" ? "#0f172a" : "transparent",
                      transition: "all 0.15s ease"
                    }}
                  >
                    🛰️ Interactive Live Map
                  </button>
                  <button 
                    onClick={() => setMapMode("roadmap")}
                    style={{ 
                      fontSize: "10px", 
                      fontWeight: "bold", 
                      padding: "4px 10px", 
                      borderRadius: "6px", 
                      cursor: "pointer", 
                      border: "none",
                      color: mapMode === "roadmap" ? "white" : "#475569", 
                      background: mapMode === "roadmap" ? "#0f172a" : "transparent",
                      transition: "all 0.15s ease"
                    }}
                  >
                    🗺️ Custom Roadmap
                  </button>
                </div>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#21F1A8", background: "rgba(33, 241, 168, 0.12)", border: "1px solid rgba(33, 241, 168, 0.3)", padding: "2px 8px", borderRadius: "10px" }}>
                {effectivePercent}% completed
              </div>
            </div>

            {mapMode === "interactive" ? (
              <div style={{ height: "260px", borderRadius: "14px", border: "1.5px solid #cbd5e1", overflow: "hidden", position: "relative", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <InteractiveMap 
                  riderCoords={currentRiderCoords}
                  pickupCoords={pickupCoords}
                  dropoffCoords={dropoffCoords}
                  status={targetOrder.status || "active"}
                  progress={effectivePercent}
                  pickupName={targetOrder.items[0]?.shop || "Elextra Store Outlet"}
                  dropoffName={targetOrder.deliveryLocation || "Customer Base Address"}
                  driverName={targetOrder.driver?.name || "Kwame Darko"}
                />
                
                {/* Embedded Floating Coordinates overlay */}
                <div style={{
                  position: "absolute",
                  left: "10px",
                  bottom: "10px",
                  background: "rgba(15, 23, 42, 0.88)",
                  backdropFilter: "blur(4px)",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "white",
                  fontSize: "9px",
                  zIndex: 1000,
                  fontFamily: "monospace",
                  pointerEvents: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "7px", fontWeight: "bold", letterSpacing: "0.5px" }}>LIVE TELEMETRY COORDS</div>
                  <div style={{ color: "#21F1A8", marginTop: "2px", fontWeight: "bold" }}>
                    Lat: {currentRiderCoords.lat.toFixed(6)}<br/>
                    Lng: {currentRiderCoords.lng.toFixed(6)}
                  </div>
                </div>
                
                {/* Floating ETA Badge */}
                <div style={{
                  position: "absolute",
                  right: "10px",
                  bottom: "10px",
                  background: "rgba(15, 23, 42, 0.88)",
                  backdropFilter: "blur(4px)",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "white",
                  fontSize: "9px",
                  zIndex: 1000,
                  textAlign: "right",
                  pointerEvents: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "7px", fontWeight: "bold", letterSpacing: "0.5px" }}>DELIVERY ETA</div>
                  <div style={{ color: "#38bdf8", marginTop: "2px", fontWeight: "bold" }}>
                    {getLiveEstimatedMinutes(true)}
                  </div>
                </div>
              </div>
            ) : (
              /* Simulated Road Canvas */
              <div style={{ height: "210px", background: "#f1f5f9", borderRadius: "14px", border: "1.5px solid #cbd5e1", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifySelf: "stretch", justifyContent: "space-between", padding: "12px", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.04)" }}>
                
                {/* Responsive SVG Grid Map Background */}
                <svg viewBox="0 0 500 160" style={{ width: "100%", height: "100%", position: "absolute", inset: 0, pointerEvents: "none" }}>
                  {/* Visual Grid Lines */}
                  <line x1="50" y1="0" x2="50" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="100" y1="0" x2="100" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="150" y1="0" x2="150" y2="160" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="200" y1="0" x2="200" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="250" y1="0" x2="250" y2="160" stroke="#cbd5e1" strokeWidth="1.5" />
                  <line x1="300" y1="0" x2="300" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="350" y1="0" x2="350" y2="160" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="400" y1="0" x2="400" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="450" y1="0" x2="450" y2="160" stroke="#e2e8f0" strokeWidth="1" />

                  <line x1="0" y1="30" x2="500" y2="30" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Secondary side roads (Decorative) */}
                  <path d="M 0,135 L 500,135" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                  <path d="M 0,35 L 500,35" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
                  <path d="M 120,0 L 120,160" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.5" />
                  <path d="M 380,0 L 380,160" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.5" />

                  {/* Simulated Winding River Core Area */}
                  <path d="M -20,165 C 150,115 300,185 520,135" fill="none" stroke="#bae6fd" strokeWidth="14" strokeLinecap="round" opacity="0.75" />
                  <path d="M -20,165 C 150,115 300,185 520,135" fill="none" stroke="#e0f2fe" strokeWidth="6" strokeLinecap="round" opacity="0.9" />

                  {/* Natural Forest Reserves & Green Zones */}
                  <rect x="75" y="10" width="75" height="40" rx="6" fill="#dcfce7" stroke="#bbf7d0" strokeWidth="1" opacity="0.7" />
                  <text x="112" y="32" textAnchor="middle" fill="#15803d" fontSize="6.5" fontWeight="bold">TARKWA BOSPALMS</text>

                  <rect x="345" y="105" width="85" height="30" rx="6" fill="#dcfce7" stroke="#bbf7d0" strokeWidth="1" opacity="0.7" />
                  <text x="387" y="122" textAnchor="middle" fill="#15803d" fontSize="6.5" fontWeight="bold">PRECIOUS METALS ZONE</text>

                  {/* Curved Main Highway Expressway Road Layout */}
                  <path d="M 45,115 Q 250,35 455,115" fill="none" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" opacity="0.18" />
                  <path d="M 45,115 Q 250,35 455,115" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" strokeDasharray="4,3" opacity="0.8" />

                  {/* Active Dynamic Progress Route Highlight Path */}
                  <path 
                    d="M 45,115 Q 250,35 455,115" 
                    fill="none" 
                    stroke="#21F1A8" 
                    strokeWidth="5" 
                    strokeLinecap="round" 
                    strokeDasharray="428" 
                    strokeDashoffset={428 - (effectivePercent / 100) * 428} 
                    style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} 
                  />

                  {/* Landmark Tolls Checkpoint A */}
                  <g transform="translate(168, 81)">
                    <circle r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                    <text y="-8" textAnchor="middle" fill="#475569" fontSize="6.5" fontWeight="bold">Atuabo Tolls</text>
                  </g>

                  {/* Landmark Town Junction Checkpoint B */}
                  <g transform="translate(332, 81)">
                    <circle r="4" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                    <text y="-8" textAnchor="middle" fill="#475569" fontSize="6.5" fontWeight="bold">Town Junction</text>
                  </g>

                  {/* Start Node: Retail Shop */}
                  <g transform="translate(45, 115)">
                    <circle r="14" fill="#1e293b" opacity="0.1" />
                    <circle r="7" fill="#1e293b" stroke="#ffffff" strokeWidth="2" />
                    <text y="-14" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="800">🏬 Outlet</text>
                  </g>

                  {/* End Node: Destination Home */}
                  <g transform="translate(455, 115)">
                    <circle r="14" fill="#21F1A8" opacity="0.15" />
                    <circle r="7" fill="#21F1A8" stroke="#ffffff" strokeWidth="2" />
                    <text y="-14" textAnchor="middle" fill="#21F1A8" fontSize="8" fontWeight="800">🏡 Destination</text>
                  </g>
                </svg>

                {/* Real-time Cyber HUD Telemetry Box overlay */}
                <div style={{
                  position: "absolute",
                  left: "12px",
                  top: "12px",
                  background: "rgba(15, 23, 42, 0.87)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "9px",
                  color: "#e2e8f0",
                  zIndex: 15,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "5px 12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  width: "172px"
                }}>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block", fontSize: "6.5px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>RUNNER SPEED</span>
                    <span style={{ fontWeight: "900", color: "#38bdf8", fontFamily: "monospace" }}>
                      {targetOrder.status === "delivered" ? 0 : 38 + Math.round((Math.sin(Date.now() / 4200) * 4) + (targetOrder.id.charCodeAt(3) % 5))} km/h
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block", fontSize: "6.5px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>ESTIMATED ETA</span>
                    <span style={{ fontWeight: "900", color: "#21F1A8", fontFamily: "monospace" }}>
                      {getLiveEstimatedMinutes(false)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block", fontSize: "6.5px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>TELEMETRY STATUS</span>
                    <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px", color: targetOrder.status === "delivered" ? "#94a3b8" : "#21F1A8", fontSize: "8.5px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: targetOrder.status === "delivered" ? "#64748b" : "#21F1A8", display: "inline-block" }} />
                      {targetOrder.status === "delivered" ? "STATIONARY" : "ACTIVE GPS"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block", fontSize: "6.5px", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.5px" }}>FREeway SENSORS</span>
                    <span style={{ fontWeight: "700" }}>5G-OK 📶</span>
                  </div>
                </div>

                {/* Animated Floating Rider along the Bezier highway path */}
                {(() => {
                  // Compute coordinates at percentage fraction on client
                  const fra = effectivePercent / 100;
                  const markerX = (1 - fra) * (1 - fra) * 45 + 2 * (1 - fra) * fra * 250 + fra * fra * 455;
                  const markerY = (1 - fra) * (1 - fra) * 115 + 2 * (1 - fra) * fra * 35 + fra * fra * 115;
                  const percentX = (markerX / 500) * 100;
                  const percentY = (markerY / 160) * 100;

                  return (
                    <div style={{
                      position: "absolute",
                      left: `${percentX}%`,
                      top: `${percentY}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 10,
                      transition: "left 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                      pointerEvents: "none"
                    }}>
                      {/* Floating mini active label banner above vehicle marker */}
                      <div style={{
                        position: "absolute",
                        bottom: "22px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#1e293b",
                        color: "white",
                        padding: "3px 7px",
                        borderRadius: "6px",
                        fontSize: "9px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        border: "1px solid rgba(255,255,255,0.15)"
                      }}>
                        <span>🏍️</span>
                        <span>{targetOrder.status === "delivered" ? "Delivered ✅" : "In-Transit"}</span>
                      </div>

                      {/* Animated Pulsating Signal Rings */}
                      <div style={{
                        position: "relative",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "#10b981",
                        border: "2.5px solid white",
                        boxShadow: "0 0 10px rgba(16,185,129,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <div style={{
                          position: "absolute",
                          inset: -6,
                          borderRadius: "50%",
                          border: "2px solid #10b981",
                          animation: "ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite",
                          opacity: 0.65
                        }} />
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "white" }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Live Tracking Map Footer bar */}
                <div style={{ zIndex: 12, display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "9.5px", color: "#475569", borderTop: "1px solid #cbd5e1", paddingTop: "6px", marginTop: "auto", background: "rgba(255, 255, 255, 0.7)", padding: "4px 8px", borderRadius: "6px" }}>
                  <span style={{ fontWeight: 600 }}>Source: {targetOrder.items[0]?.shop || "Elextra Store Outlet"}</span>
                  <span style={{ fontWeight: 800, color: "#10b981" }}>
                    ● {effectiveStatusText}
                  </span>
                  <span style={{ fontWeight: 600, maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={targetOrder.deliveryLocation || "Destination Spot"}>
                     To: {targetOrder.deliveryLocation || "Registered Base Address"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ paddingLeft: "16px", marginBottom: "16px" }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "flex-start", marginBottom: "16px", position: "relative" }}>
                <motion.div
                  animate={i === effectiveStep && targetOrder.status !== "delivered" && targetOrder.status !== "completed"
                    ? { scale: [1, 1.2, 1], boxShadow: "0 0 0 6px rgba(16,185,129,0.35)" }
                    : { scale: 1, boxShadow: i === effectiveStep ? "0 0 0 4px rgba(16,185,129,0.25)" : "none" }}
                  transition={i === effectiveStep && targetOrder.status !== "delivered" && targetOrder.status !== "completed"
                    ? { repeat: Infinity, duration: 1.6, ease: "easeInOut" }
                    : { duration: 0.2 }}
                  style={{ width: "22px", height: "22px", borderRadius: "50%", background: i <= effectiveStep ? "#10b981" : "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "white", fontWeight: "bold", position: "absolute", left: "-22px", top: "2px" }}
                >
                  {i < effectiveStep ? "✓" : i + 1}
                </motion.div>
                {i < 4 && (
                  <div style={{ position: "absolute", left: "-12px", top: "24px", width: "2px", height: "18px", background: i < effectiveStep ? "#10b981" : "#cbd5e1" }} />
                )}
                <div style={{ marginLeft: "12px" }}>
                  <div style={{ fontWeight: i <= effectiveStep ? 700 : 400, color: i <= effectiveStep ? "#1e293b" : "#94a3b8", fontSize: "14px" }}>
                    {s}
                  </div>
                  {i === effectiveStep && targetOrder.status !== "delivered" && <div style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>Rider at this milestone…</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Recipient PIN Verification Display (Very user friendly!) */}
          {targetOrder.recipientPin && (
            <div style={{ background: "#fef9c3", border: "1.5px solid #fef08a", color: "#854d0e", borderRadius: "10px", padding: "12px", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ fontWeight: 800, display: "flex", gap: "6px", alignItems: "center" }}>
                <span>🛡️ Recipient Handoff PIN (Security Lock):</span>
                <span style={{ fontStyle: "normal", fontSize: "14px", background: "#fef08a", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold", fontFamily: "monospace", border: "1px solid #eab308" }}>{targetOrder.recipientPin}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#a16207", marginTop: "5px" }}>
                Provide this PIN code to the driver on arrival to authorize handoff and complete verification.
              </div>
            </div>
          )}

          {/* Dynamic Order Item Detail List */}
          <div style={{ background: "#f8fafc", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "12px", marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "8px" }}>
              📦 Order Contents ({targetOrder.items.length} items)
            </div>
            {targetOrder.items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", justifySelf: "stretch", fontSize: "12px", color: "#475569", marginBottom: "8px", borderBottom: idx < targetOrder.items.length - 1 ? "1px solid #f1f5f9" : "none", paddingBottom: idx < targetOrder.items.length - 1 ? "6px" : "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{it.qty}x {it.name} <span style={{ color: "#94a3b8" }}>({it.shop})</span></span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>₵{Math.round(it.qty * it.price)}</span>
                </div>
                {it.location && it.id.startsWith("errand-") && (
                  <div style={{
                    fontSize: "10px",
                    color: "#1e293b",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    marginTop: "4px",
                    whiteSpace: "pre-line",
                    fontFamily: "monospace",
                    lineHeight: "1.3em"
                  }}>
                    📋 <strong>Errand Details:</strong><br />
                    {it.location}
                  </div>
                )}
              </div>
            ))}
            <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "6px", paddingTop: "6px", display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>
              <span>Consolidated Total (paid)</span>
              <span>₵{Math.round(targetOrder.total)}</span>
            </div>
          </div>

          <div style={S.dCard}>
            <div style={S.dAv}>{(targetOrder.driver?.name || "R")[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{targetOrder.driver?.name || "Your Dispatch Runner"}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{targetOrder.driver?.plate || "Vehicle: Dispatch Bike"}</div>
              <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
                {[1, 2, 3, 4, 5].map((stars) => (
                  <Star 
                    key={stars}
                    size={14}
                    fill={stars <= (rating || Math.floor(targetOrder.driver?.rating || 4.8)) ? "#eab308" : "none"}
                    color={stars <= (rating || Math.floor(targetOrder.driver?.rating || 4.8)) ? "#eab308" : "#cbd5e1"}
                    style={{ cursor: "pointer", transition: "transform 0.1s" }}
                    onClick={() => {
                      setRating(stars);
                      // Add review message to driver chat
                      const rateMsg = {
                        sender: "customer" as const,
                        text: `🌟 Rated Kwame ${stars} Stars! Thank you for the amazing service.`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      const replyMsg = {
                        sender: "driver" as const,
                        text: `Thank you so much for the 5-star rating! Your feedback is shared with the Elextra operator team. Drive safely! 😊`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setMessages(prev => [...prev, rateMsg, replyMsg]);
                    }}
                  />
                ))}
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                  ({rating ? `${rating}.0 rated` : `${targetOrder.driver?.rating || "4.8"}`})
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setVoipState("ringing");
                  setTimeout(() => {
                    setVoipState("connected");
                  }, 1800);
                }}
                style={{ ...S.cta, padding: "8px 12.5px", fontSize: "12px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", borderRadius: "8px" }}
              >
                📞 VoIP Call
              </button>
              <button 
                type="button" 
                onClick={() => setChatOpen(!chatOpen)}
                style={{ ...S.cta, padding: "8px 12px", fontSize: "12px", background: chatOpen ? "#ef4444" : "#10b981", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", borderRadius: "8px" }}
              >
                {chatOpen ? "❌ Chat" : "💬 Chat"}
              </button>
            </div>
          </div>

          {/* UBER / YANGO / BOLT COMFORT PREFERENCES & TIPPING SLIP */}
          <div style={{ background: "#f8fafc", borderRadius: "14px", border: "1.5px solid #e2e8f0", padding: "14px", marginBottom: "16px", marginTop: "-4px" }}>
            {/* Tipping Section */}
            <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a" }}>💸 Tip Kwame Darko (Bolt/Uber Style)</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>100% of tip goes directly to courier pouch</div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[5, 10, 25].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setTipPaid(prev => prev + amt);
                      const userTipMsg = {
                        sender: "customer" as const,
                        text: `💸 Sent ₵${amt} Dispatch Tip to courier wallet.`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      const driverGratefulMsg = {
                        sender: "driver" as const,
                        text: `Wow, GHS ${amt} tip received! Thank you so much for supporting my fuel pouch! 🙏 Drive alert and speeding over standard bypass right now!`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setMessages(prev => [...prev, userTipMsg, driverGratefulMsg]);
                    }}
                    style={{
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                      color: "#166534",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    +₵{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Yango/Bolt ride comfort settings */}
            <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a" }}>⚙️ Courier Rider Preferences</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Synchronizes requirements with rider's helmet display</div>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  { id: "standard", l: "🚲 Standard" },
                  { id: "silent", l: "🤫 Silent Run" },
                  { id: "express", l: "🔥 Express" }
                ].map((pref) => (
                  <button
                    key={pref.id}
                    onClick={() => {
                      setSpeedPref(pref.id as any);
                      const prefMsg = {
                        sender: "driver" as const,
                        text: pref.id === "silent" 
                          ? "[SYSTEM] User selected Silent Ride preference. Kwame has muted general chat logs and will only call for delivery."
                          : pref.id === "express"
                            ? "[SYSTEM] Priority Express boost requested. Kwame has locked full throttle on standard Tarkwa motorway bypass."
                            : "[SYSTEM] Standard helmet parameters synchronized successfully.",
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setMessages(prev => [...prev, prefMsg]);
                    }}
                    style={{
                      background: speedPref === pref.id ? "#eff6ff" : "white",
                      border: speedPref === pref.id ? "1.5px solid #2563eb" : "1.5px solid #cbd5e1",
                      color: speedPref === pref.id ? "#1d4ed8" : "#475569",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    {pref.l}
                  </button>
                ))}
              </div>
            </div>

            {tipPaid > 0 && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "8px", padding: "8px 12px", marginTop: "10px", fontSize: "11.5px", fontWeight: "bold" }}>
                💸 Total Tips Sent: ₵{tipPaid}.00 (Credited immediately to Kwame)
              </div>
            )}
          </div>

          {/* Direct In-App Chat Integration */}
          {chatOpen && (
            <div style={{ marginTop: "12px", background: "#f8fafc", borderRadius: "10px", border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ background: "#10b981", color: "white", padding: "10px 12px", fontSize: "12px", fontWeight: "bold", display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center" }}>
                <span>💬 Driver Live Chat ({targetOrder.id})</span>
                <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.25)", padding: "2px 6px", borderRadius: "4px" }}>Active Rider Connection</span>
              </div>
              <div style={{ height: "185px", overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", background: "white" }}>
                {messages.map((m, idx) => {
                  const isCustomer = m.sender === "customer";
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isCustomer ? "flex-end" : "flex-start", maxWidth: "85%", alignSelf: isCustomer ? "flex-end" : "flex-start" }}>
                      <div style={{ 
                        background: isCustomer ? "linear-gradient(135deg, #10b981, #059669)" : "#f1f5f9", 
                        color: isCustomer ? "white" : "#0f172a", 
                        padding: "8px 12px", 
                        borderRadius: isCustomer ? "12px 12px 0px 12px" : "12px 12px 12px 0px",
                        fontSize: "12px",
                        lineHeight: "1.4"
                      }}>
                        {m.text}
                      </div>
                      <span style={{ fontSize: "9px", color: "#94a3b8", marginTop: "3px", padding: "0 4px" }}>
                        {isCustomer ? "You" : (targetOrder.driver?.name || "Rider")} · {m.time}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "8px", background: "#f1f5f9", display: "flex", gap: "6px", borderTop: "1px solid #e2e8f0" }}>
                <input 
                  placeholder="Ask driver where they are, or send instructions..." 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSendMessage(); }}
                  style={{ flex: 1, border: "1.5px solid #cbd5e1", borderRadius: "6px", height: "30px", fontSize: "12px", padding: "0 8px", background: "white", outline: "none", color: "black" }}
                />
                <button 
                  onClick={handleSendMessage}
                  style={{ background: "#10b981", color: "white", border: "none", borderRadius: "6px", padding: "0 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* VoIP PHONE CALL MOCK SIMULATION SCREEN (Uber / Yango style UI overlay) */}
          {voipState !== "idle" && (
            <div style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.98)",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "60px 24px",
              color: "white"
            }}>
              {/* Header */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.15em", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                  <span>🛡️</span> ELEXTRA ENCRYPTED VoIP LINE (5G Link)
                </div>
                <div style={{ fontSize: "28px", fontWeight: "900", marginTop: "24px" }}>
                  {targetOrder.driver?.name || "Kwame Darko"}
                </div>
                <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "6px" }}>
                  {voipState === "ringing" ? "Ringing..." : `Active Call • ${Math.floor(voipSecs / 60)}:${(voipSecs % 60).toString().padStart(2, "0")}`}
                </div>
              </div>

              {/* Pulsing Avatar */}
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  inset: -20,
                  borderRadius: "50%",
                  border: "2px dashed rgba(16, 185, 129, 0.3)",
                  animation: "spin 12s linear infinite"
                }} />
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "48px",
                  fontWeight: "bold",
                  border: "4px solid white",
                  boxShadow: "0 0 30px rgba(16, 185, 129, 0.6)"
                }}>
                  {(targetOrder.driver?.name || "K")[0]}
                </div>
              </div>

              {/* Captain Transcripts (Highly user-friendly live closed captions!) */}
              <div style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "14px",
                padding: "16px",
                width: "100%",
                maxWidth: "320px",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
              }}>
                <div style={{ fontSize: "9px", color: "#10b981", fontWeight: "900", marginBottom: "6px", textTransform: "uppercase" }}>
                  💬 Real-Time voice translation captions
                </div>
                <p style={{ fontSize: "13px", lineHeight: "1.5", margin: 0, fontStyle: "italic", minHeight: "54px" }}>
                  {voipState === "ringing" && "Establishing handoff protocol..."}
                  {voipState === "connected" && (
                    voipSecs <= 4 ? "“Hello there! Kwame Darko here, your Elextra dispatch driver. I saw your VoIP call request!”" :
                    voipSecs <= 9 ? "“I'm currently at the partner hub verifying your logistics sheet. Everything is sealed up!”" :
                    voipSecs <= 15 ? "“Taking the standard Bogoso-Tarkwa highway link now. Remember to keep your Receiver PIN code handy on location!”" :
                    "“Alright, focusing on the road curves for maximum speed. See you in about 6-8 minutes! Safe logistics always!”"
                  )}
                </p>
              </div>

              {/* Dialer Circle Controls Grid */}
              <div style={{ width: "100%", maxWidth: "280px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "40px", justifyItems: "center" }}>
                  {[
                    { l: "Mute", icon: "🎤" },
                    { l: "Speaker", icon: "🔊" },
                    { l: "Keypad", icon: "🔢" },
                  ].map(ctrl => (
                    <div key={ctrl.l} style={{ textAlign: "center" }}>
                      <button style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        color: "white",
                        fontSize: "20px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {ctrl.icon}
                      </button>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>{ctrl.l}</div>
                    </div>
                  ))}
                </div>

                {/* Decline Button */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      setVoipState("ended");
                      setTimeout(() => {
                        setVoipState("idle");
                      }, 1000);
                    }}
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "none",
                      color: "white",
                      fontSize: "24px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)"
                    }}
                  >
                    🛑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
 
      <div style={S.sec}>
        <div style={{ fontWeight: 800, marginBottom: "10px", color: "#0f172a", fontSize: "14px" }}>🔍 Find by Order Tracking ID</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input 
            placeholder="ELX-XXXXXX" 
            value={tid} 
            onChange={e => setTid(e.target.value)} 
            style={{ ...S.inp, flex: 1 }} 
          />
          <button style={S.cta} onClick={() => {
            const match = orders.find(o => o.id === tid.toUpperCase());
            if (match) {
              setFound(match);
            } else {
              setFound("no");
            }
          }}>
            Locate
          </button>
        </div>
        {found === "no" && <div style={{ color: "#dc2626", marginTop: "8px", fontSize: "12px", fontWeight: 700 }}>No record matches specified ID.</div>}
      </div>

      {user && orders.length > 0 && (
        <div style={S.sec}>
          <SecHead title="📦 Historical Record" sub="Review details of passed orders. Click on any row to track live map" />
          {orders.slice(0, 8).map(o => (
            <div 
              key={o.id} 
              onClick={() => {
                setTid(o.id);
                setFound(o);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", padding: "12px 10px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", cursor: "pointer", borderRadius: "8px", transition: "background 0.2s" }}
              className="hover:bg-emerald-50/50"
            >
              <div style={{ fontWeight: 700, color: "#1e293b" }}>{o.id}</div>
              <div style={{ color: "#64748b" }}>{o.date}</div>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>₵{Math.round(o.total)}</div>
              <div style={{ background: o.status === "delivered" ? "#eef2ff" : "#f1f5f9", color: o.status === "delivered" ? "#4f46e5" : "#475569", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, textTransform: "capitalize" }}>
                {o.status || "confirmed"}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── USER PROFILE / ACCOUNT PAGE ──────────────────────────────────────────────
// ─── USER PROFILE / ACCOUNT PAGE ──────────────────────────────────────────────
interface AccountPageProps {
  user: UserType | null;
  orders: Order[];
  setModal: (m: string | null) => void;
  setUser: (u: UserType | null) => void;
  notify: (msg: string, type?: "ok" | "err") => void;
  theme: string;
  setTheme: (t: string) => void;
}

export function AccountPage({ user, orders, setModal, setUser, notify, theme, setTheme }: AccountPageProps) {
  // State for editing profile attributes inline
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(user?.name || "");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneVal, setEditPhoneVal] = useState(user?.phone || "");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmailVal, setEditEmailVal] = useState(user?.email || "");

  // State for detail bottom sheets or modals
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Promo state
  const [promoCode, setPromoCode] = useState("");

  // Payment add form states
  const [paymentType, setPaymentType] = useState<"card" | "MTN MoMo" | "Telecel Cash" | "AirtelTigo Cash">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");

  // Load customizable app settings
  const [appSettings, setAppSettings] = useState({
    aboutTitle: "ELEXTRA Delivery & Logistics",
    aboutVersion: "Version 2.4.1 Stable Node",
    aboutContent: "Providing reliable, high-speed instant dispatch and food delivery services for merchants and retail clients in Tarkwa, Bogoso, and neighboring municipalities in the Western Region of Ghana.",
    aboutFooter: "Developed under sandboxed infrastructure clearance nodes.",
    plusTitle: "Elextra Plus+ Subscription",
    plusPrice: "35",
    plusDescription: "Unlock GHS 0 Delivery Fees and premium fast-dispatch status on all runs.",
    plusBenefits: "Join the club of premium clients! For just ₵35/month, eliminate delivery commissions completely and receive real-time driver tracking prioritization."
  });

  // Gmail integration states
  const [gmailToken, setGmailTokenState] = useState<string | null>(getGmailAccessToken());
  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("Elextra"); // Default to find Elextra runs/receipts
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [sendTo, setSendTo] = useState("enyam66@gmail.com"); // default recipient
  const [sendSubject, setSendSubject] = useState("Elextra Customer Query");
  const [sendBody, setSendBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [composeMode, setComposeMode] = useState(false);

  const fetchGmailMessages = async (token = gmailToken, queryStr = searchQuery) => {
    const activeTok = token || getGmailAccessToken();
    if (!activeTok) return;
    setLoadingEmails(true);
    try {
      let url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8";
      if (queryStr) {
        url += `&q=${encodeURIComponent(queryStr)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeTok}` }
      });
      const listData = await res.json();
      
      if (listData.error) {
        setGmailTokenState(null);
        setGmailAccessToken(null);
        notify("Gmail connection expired. Please reconnect.", "err");
        return;
      }

      if (listData.messages && listData.messages.length > 0) {
        const emailDetails = await Promise.all(
          listData.messages.slice(0, 6).map(async (msg: any) => {
            try {
              const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                headers: { Authorization: `Bearer ${activeTok}` }
              });
              return await detailRes.json();
            } catch (err) {
              return null;
            }
          })
        );
        setEmails(emailDetails.filter(Boolean));
      } else {
        setEmails([]);
      }
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const u = await loginWithGoogle();
      if (u) {
        const tok = getGmailAccessToken();
        setGmailTokenState(tok);
        notify("Gmail connected successfully!", "ok");
        if (tok) {
          fetchGmailMessages(tok, searchQuery);
        }
      }
    } catch (err: any) {
      notify("Failed to connect Gmail: " + (err.message || err), "err");
    }
  };

  const sendGmailEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTo.trim() || !sendSubject.trim() || !sendBody.trim()) {
      notify("Please fill all compose fields.", "err");
      return;
    }
    setSendingEmail(true);
    try {
      const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(sendSubject)))}?=`;
      const emailParts = [
        `To: ${sendTo.trim()}`,
        `Subject: ${utf8Subject}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        ``,
        sendBody.replace(/\n/g, "<br />")
      ];
      const emailStr = emailParts.join("\r\n");
      const base64Safe = btoa(unescape(encodeURIComponent(emailStr)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64Safe })
      });
      
      const data = await res.json();
      if (res.ok && !data.error) {
        notify("Email sent successfully via your Gmail account!", "ok");
        setSendSubject("Elextra Customer Query");
        setSendBody("");
        setComposeMode(false);
        fetchGmailMessages(gmailToken, searchQuery);
      } else {
        notify("Failed to send email: " + (data.error?.message || "Unknown error"), "err");
      }
    } catch (err: any) {
      notify("Error sending email: " + (err.message || err), "err");
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (activePanel === "gmail") {
      const tok = getGmailAccessToken();
      setGmailTokenState(tok);
      if (tok) {
        fetchGmailMessages(tok, searchQuery);
      }
    }
  }, [activePanel]);

  useEffect(() => {
    if (user) {
      setEditNameVal(user.name || "");
      setEditPhoneVal(user.phone || "");
      setEditEmailVal(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await DB.get("elx_settings");
      if (saved) {
        setAppSettings(prev => ({
          ...prev,
          aboutTitle: saved.aboutTitle || prev.aboutTitle,
          aboutVersion: saved.aboutVersion || prev.aboutVersion,
          aboutContent: saved.aboutContent || prev.aboutContent,
          aboutFooter: saved.aboutFooter || prev.aboutFooter,
          plusTitle: saved.plusTitle || prev.plusTitle,
          plusPrice: saved.plusPrice || prev.plusPrice,
          plusDescription: saved.plusDescription || prev.plusDescription,
          plusBenefits: saved.plusBenefits || prev.plusBenefits,
        }));
      }
    };
    loadSettings();

    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_settings" && value) {
        setAppSettings(prev => ({
          ...prev,
          aboutTitle: value.aboutTitle || prev.aboutTitle,
          aboutVersion: value.aboutVersion || prev.aboutVersion,
          aboutContent: value.aboutContent || prev.aboutContent,
          aboutFooter: value.aboutFooter || prev.aboutFooter,
          plusTitle: value.plusTitle || prev.plusTitle,
          plusPrice: value.plusPrice || prev.plusPrice,
          plusDescription: value.plusDescription || prev.plusDescription,
          plusBenefits: value.plusBenefits || prev.plusBenefits,
        }));
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "60px 16px" }}>
        <div style={{ fontSize: "64px" }}>👤</div>
        <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px", marginTop: "12px", color: "var(--elextra-text, #0f172a)" }}>Profile Dashboard</div>
        <div style={{ color: "var(--elextra-subtext, #64748b)", marginBottom: "20px", fontSize: "14px" }}>
          Sign in or create an account to record your delivery parameters and addresses.
        </div>
        <button style={S.cta} onClick={() => setModal("login")}>
          Sign In
        </button>
        <div style={{ marginTop: "14px", fontSize: "13px", color: "var(--elextra-subtext, #64748b)", marginBottom: "32px" }}>
          No account? <button style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 700 }} onClick={() => setModal("signup")}>Sign Up Now</button>
        </div>

        {/* Guest theme settings */}
        <div style={{ ...S.sec, textAlign: "left", maxWidth: "420px", margin: "0 auto" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "12px", borderBottom: "1px solid var(--elextra-card-border)", paddingBottom: "6px" }}>🎨 Quick App Settings</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
            <span style={{ fontSize: "13.5px", fontWeight: 600 }}>App Color Theme</span>
            <button
              onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                setTheme(nextTheme);
                DB.set("elx_theme", nextTheme);
                notify(`Switched to ${nextTheme === "dark" ? "Dark Mode" : "Light Mode"} color theme!`);
              }}
              style={{
                background: "var(--elextra-input-bg)",
                border: "1.5px solid var(--elextra-border)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--elextra-text)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const syncUserGlobally = async (updatedUser: any) => {
    setUser(updatedUser);
    await DB.set("elx_logged_user", updatedUser);
    const users = await DB.get("elx_users") || [];
    const updatedUsers = users.map((u: any) => {
      if (!u || !u.email || !updatedUser || !updatedUser.email) return u;
      return u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u;
    });
    await DB.set("elx_users", updatedUsers);
    window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_users", value: updatedUsers } }));
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    const newMethod = {
      type: paymentType === "card" ? "card" : "momo",
      network: paymentType === "card" ? "Credit Card" : paymentType,
      number: paymentType === "card" ? cardNumber : momoNumber,
      holder: paymentType === "card" ? cardName : momoName
    };
    const updated = {
      ...user,
      paymentMethods: [...(user.paymentMethods || []), newMethod]
    };
    await syncUserGlobally(updated);
    notify(`New ${newMethod.network} payment method added successfully!`, "ok");
    
    // Clear inputs
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setMomoName("");
    setMomoNumber("");
    setActivePanel(null);
  };

  const handleSaveName = async () => {
    if (!editNameVal.trim()) {
      notify("Profile name cannot be empty.", "err");
      return;
    }
    const updated = { ...user, name: editNameVal.trim() };
    await syncUserGlobally(updated);
    setIsEditingName(false);
    notify("Profile name updated successfully!", "ok");
  };

  const handleSavePhone = async () => {
    if (!editPhoneVal.trim()) {
      notify("Phone number cannot be empty.", "err");
      return;
    }
    const updated = { ...user, phone: editPhoneVal.trim() };
    await syncUserGlobally(updated);
    setIsEditingPhone(false);
    notify("Phone number updated successfully!", "ok");
  };

  const handleSaveEmail = async () => {
    if (!editEmailVal.trim()) {
      notify("Email address cannot be empty.", "err");
      return;
    }
    const updated = { ...user, email: editEmailVal.trim().toLowerCase() };
    await syncUserGlobally(updated);
    setIsEditingEmail(false);
    notify("Email address updated successfully!", "ok");
  };

  const getHeader = (msg: any, name: string) => {
    const header = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : "";
  };

  const getEmailBody = (msg: any) => {
    if (!msg) return "";
    let body = "";
    if (msg.payload?.parts) {
      const textPart = msg.payload.parts.find((part: any) => part.mimeType === "text/html") || 
                       msg.payload.parts.find((part: any) => part.mimeType === "text/plain");
      if (textPart && textPart.body?.data) {
        body = textPart.body.data;
      } else {
        const subParts = msg.payload.parts.flatMap((p: any) => p.parts || []);
        const subTextPart = subParts.find((part: any) => part.mimeType === "text/html") || 
                            subParts.find((part: any) => part.mimeType === "text/plain");
        if (subTextPart && subTextPart.body?.data) {
          body = subTextPart.body.data;
        }
      }
    } else if (msg.payload?.body?.data) {
      body = msg.payload.body.data;
    }
    
    if (body) {
      try {
        const normalized = body.replace(/-/g, "+").replace(/_/g, "/");
        return decodeURIComponent(escape(atob(normalized)));
      } catch (e) {
        return "Unable to parse email contents.";
      }
    }
    return msg.snippet || "No preview body available.";
  };

  const userFirstName = (user && user.name) ? user.name.split(" ")[0] : "Client";

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.2 }}
      style={{ background: "#ffffff", minHeight: "100%", paddingBottom: "40px" }}
    >
      {/* 1. Greeting Title */}
      <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", margin: "24px 0 20px" }}>
        Hello, {userFirstName}
      </h1>

      {/* 2. Favourites Section */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>
          Favourites
        </h2>
        <div style={{ background: "#f3f4f6", borderRadius: "16px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ flex: 1, paddingRight: "70px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937" }}>
              No favourites added
            </h3>
            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", lineHeight: "1.4" }}>
              Save all your favourites in one place using the heart icon
            </p>
          </div>
          {/* Heart floating emoji graphic to perfectly match the 3D heart asset */}
          <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: "40px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}>❤️</span>
              <span style={{ fontSize: "28px", position: "absolute", bottom: "-12px", right: "-10px", transform: "rotate(-10deg)" }}>👆</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Payment Section */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
            Payment
          </h2>
          <button 
            onClick={() => setActivePanel("settings")}
            style={{ fontSize: "13.5px", fontWeight: 600, color: "#64748b", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
          >
            Edit <span style={{ fontSize: "10px" }}>&gt;</span>
          </button>
        </div>
        
        {/* Dynamic List of Added Payment Methods */}
        {(user.paymentMethods || []).map((method: any, idx: number) => (
          <div 
            key={idx}
            style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1.5px solid #f1f5f9" }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: method.type === "card" ? "#dbeafe" : "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center", color: method.type === "card" ? "#2563eb" : "#ca8a04" }}>
              <span style={{ fontSize: "16px" }}>{method.type === "card" ? "💳" : "📱"}</span>
            </div>
            <div style={{ marginLeft: "12px", flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>{method.network}</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{method.holder} • {method.number}</div>
            </div>
            <button
              onClick={async () => {
                const updatedMethods = (user.paymentMethods || []).filter((_: any, i: number) => i !== idx);
                const updated = { ...user, paymentMethods: updatedMethods };
                await syncUserGlobally(updated);
                notify("Payment method removed successfully.", "ok");
              }}
              style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
            >
              Remove
            </button>
          </div>
        ))}

        {/* + Add payment method row */}
        <div 
          onClick={() => setActivePanel("payment-add")}
          style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1.5px solid #f1f5f9", cursor: "pointer" }}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
            <Plus size={18} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155", marginLeft: "12px", flex: 1 }}>
            Add payment method
          </span>
        </div>

        {/* Balance Row */}
        <div 
          onClick={() => setActivePanel("loyalty")}
          style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1.5px solid #f1f5f9", cursor: "pointer" }}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
            <Wallet size={18} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155", marginLeft: "12px", flex: 1 }}>
            Elextra Balance
          </span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
            GH₵{user.points !== undefined ? (user.points * 0.1).toFixed(2) : "0.00"}
          </span>
        </div>
      </div>

      {/* 4. Profile Section */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>
          Profile
        </h2>

        {/* Row 1: Name */}
        <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "12px 0" }}>
          {isEditingName ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                type="text" 
                value={editNameVal} 
                onChange={e => setEditNameVal(e.target.value)} 
                style={{ ...S.inp, flex: 1, padding: "6px 12px" }} 
              />
              <button onClick={handleSaveName} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Save</button>
              <button onClick={() => { setIsEditingName(false); setEditNameVal(user.name); }} style={{ background: "#cbd5e1", color: "#475569", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                <User size={18} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155", marginLeft: "12px", flex: 1 }}>
                {user.name}
              </span>
              <button 
                onClick={() => setIsEditingName(true)}
                style={{ background: "none", border: "none", color: "#10b981", fontSize: "13.5px", fontWeight: 600, cursor: "pointer" }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Phone */}
        <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "12px 0" }}>
          {isEditingPhone ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                type="text" 
                value={editPhoneVal} 
                onChange={e => setEditPhoneVal(e.target.value)} 
                style={{ ...S.inp, flex: 1, padding: "6px 12px" }} 
              />
              <button onClick={handleSavePhone} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Save</button>
              <button onClick={() => { setIsEditingPhone(false); setEditPhoneVal(user.phone || ""); }} style={{ background: "#cbd5e1", color: "#475569", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                <Smartphone size={18} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155", marginLeft: "12px", flex: 1 }}>
                {user.phone || "+233 24 626 3123"}
              </span>
              <button 
                onClick={() => setIsEditingPhone(true)}
                style={{ background: "none", border: "none", color: "#10b981", fontSize: "13.5px", fontWeight: 600, cursor: "pointer" }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Row 3: Email */}
        <div style={{ borderBottom: "1.5px solid #f1f5f9", padding: "12px 0" }}>
          {isEditingEmail ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                type="email" 
                value={editEmailVal} 
                onChange={e => setEditEmailVal(e.target.value)} 
                style={{ ...S.inp, flex: 1, padding: "6px 12px" }} 
              />
              <button onClick={handleSaveEmail} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Save</button>
              <button onClick={() => { setIsEditingEmail(false); setEditEmailVal(user.email); }} style={{ background: "#cbd5e1", color: "#475569", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                <Mail size={18} />
              </div>
              <div style={{ marginLeft: "12px", flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155" }}>
                  {user.email}
                </span>
                <span style={{ fontSize: "11px", color: user.verified ? "#10b981" : "#94a3b8", fontWeight: 500, marginTop: "1px" }}>
                  {user.verified ? "Verified ✅" : "Not verified"}
                </span>
              </div>
              <button 
                onClick={() => setIsEditingEmail(true)}
                style={{ background: "none", border: "none", color: "#10b981", fontSize: "13.5px", fontWeight: 600, cursor: "pointer" }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Other Section */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>
          Other
        </h2>

        {[
          { icon: <Mail size={18} style={{ color: "#ea4335" }} />, label: "Gmail Notification Hub", panel: "gmail" },
          { icon: <Tag size={18} />, label: "Promo codes", panel: "promo" },
          { icon: <Settings size={18} />, label: "Settings", panel: "settings" },
          { icon: <Lock size={18} />, label: "Privacy", panel: "privacy" },
          { icon: <Info size={18} />, label: "About", panel: "about" },
          { icon: <HelpCircle size={18} />, label: "Support", panel: "support" },
          { icon: <Gift size={18} />, label: "Loyalty Rewards Club", panel: "loyalty" },
          { icon: <Users size={18} />, label: "Referral Program", panel: "referral" },
          { icon: <Sparkles size={18} style={{ color: "#a78bfa" }} />, label: "Elextra Plus+ Premium", panel: "plus" },
        ].map(item => (
          <div 
            key={item.label}
            onClick={() => setActivePanel(item.panel)}
            style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1.5px solid #f1f5f9", cursor: "pointer" }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
              {item.icon}
            </div>
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155", marginLeft: "12px", flex: 1 }}>
              {item.label}
            </span>
            <span style={{ color: "#cbd5e1", fontSize: "16px" }}>›</span>
          </div>
        ))}

        {/* Sign Out Row */}
        <div 
          onClick={async () => {
            setUser(null); 
            await DB.set("elx_logged_user", null);
            await DB.set("elx_orders", []);
            window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_orders", value: [] } }));
            notify("Profile session cleared successfully.", "ok");
          }}
          style={{ display: "flex", alignItems: "center", padding: "14px 0", cursor: "pointer" }}
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
            <LogOut size={16} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#ef4444", marginLeft: "12px", flex: 1 }}>
            Sign Out Session
          </span>
        </div>
      </div>

      {/* 6. Become a Courier Green Card Banner */}
      <div 
        onClick={() => setActivePanel("support")}
        style={{ 
          background: "linear-gradient(135deg, #e6f7f0, #d1fae5)", 
          borderRadius: "16px", 
          padding: "18px 16px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          position: "relative", 
          overflow: "hidden",
          cursor: "pointer",
          border: "1px solid #a7f3d0"
        }}
      >
        <div>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#065f46" }}>
            Become a courier
          </h3>
          <p style={{ fontSize: "12px", color: "#047857", marginTop: "2px" }}>
            Earn money on your schedule
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Green courier box / bike delivery graphic */}
          <div style={{ width: "54px", height: "54px", background: "white", borderRadius: "12px", boxShadow: "0 4px 10px rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
            🛵
          </div>
        </div>
      </div>

      {/* 7. HIGH FIDELITY INTERACTIVE SLIDE-OVER BOTTOM SHEET MODALS */}
      <AnimatePresence>
        {activePanel && (
          <>
            {/* Dark blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#000", zIndex: 1000 }}
            />
            {/* Sheet */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              style={{ 
                position: "fixed", 
                bottom: 0, 
                left: 0, 
                right: 0, 
                maxHeight: "85vh", 
                background: "white", 
                borderTopLeftRadius: "24px", 
                borderTopRightRadius: "24px", 
                padding: "24px 20px 40px", 
                boxShadow: "0 -10px 25px rgba(0,0,0,0.15)", 
                zIndex: 1001,
                overflowY: "auto"
              }}
            >
              {/* Top notch drag indicator */}
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#cbd5e1", margin: "0 auto 20px" }} />

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  {activePanel === "gmail" && "📧 Gmail Notification Hub"}
                  {activePanel === "plus" && "💎 Elextra Plus+ Premium"}
                  {activePanel === "loyalty" && "🎁 Loyalty Rewards Club"}
                  {activePanel === "referral" && "🤝 Share & Earn GHS 15"}
                  {activePanel === "promo" && "🎟️ Redeem Promo Codes"}
                  {activePanel === "settings" && "⚙️ App Settings & Class"}
                  {activePanel === "privacy" && "🔒 Privacy & Security Vault"}
                  {activePanel === "about" && "ℹ️ About ELEXTRA Logistics"}
                  {activePanel === "support" && "📞 Help & Support Helpline"}
                  {activePanel === "payment-add" && "💳 Add New Payment Method"}
                </h3>
                <button 
                  onClick={() => setActivePanel(null)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "28px", height: "28px", fontSize: "12px", fontWeight: "bold", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>

              {/* Panel Contents */}
              <div style={{ fontSize: "13.5px", color: "#475569", lineHeight: "1.6" }}>
                {/* GMAIL HUB PANEL */}
                {activePanel === "gmail" && (
                  <div>
                    {!gmailToken ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: "54px", marginBottom: "16px" }}>📧</div>
                        <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>Gmail Integration Hub</h4>
                        <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "20px", lineHeight: "1.5" }}>
                          Authorize your Google Account securely to check past Elextra receipt emails, track delivery logs directly in your inbox, and dispatch customer support query emails.
                        </p>
                        <button 
                          type="button"
                          onClick={handleConnectGmail}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            background: "#0f172a",
                            color: "white",
                            border: "none",
                            borderRadius: "12px",
                            padding: "14px 16px",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "18px", height: "18px" }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                          </svg>
                          Connect Gmail Account
                        </button>
                      </div>
                    ) : selectedEmail ? (
                      /* EMAIL DETAIL VIEW */
                      <div>
                        <button 
                          type="button"
                          onClick={() => setSelectedEmail(null)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#2563eb",
                            fontWeight: 700,
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginBottom: "16px",
                            padding: 0
                          }}
                        >
                          ← Back to Inbox
                        </button>
                        <div style={{ borderBottom: "1.5px solid #f1f5f9", paddingBottom: "12px", marginBottom: "16px" }}>
                          <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
                            {getHeader(selectedEmail, "subject") || "(No Subject)"}
                          </h4>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", color: "#64748b" }}>
                            <span><strong>From:</strong> {getHeader(selectedEmail, "from")}</span>
                            <span>{new Date(getHeader(selectedEmail, "date")).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div 
                          style={{
                            fontSize: "13px",
                            color: "#334155",
                            lineHeight: "1.6",
                            background: "#f8fafc",
                            borderRadius: "12px",
                            padding: "16px",
                            maxHeight: "40vh",
                            overflowY: "auto",
                            border: "1px solid #e2e8f0"
                          }}
                          dangerouslySetInnerHTML={{ __html: getEmailBody(selectedEmail) }}
                        />
                      </div>
                    ) : composeMode ? (
                      /* COMPOSE MODE FORM */
                      <form onSubmit={sendGmailEmail}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <h4 style={{ fontSize: "14.5px", fontWeight: 800, color: "#1e293b" }}>Compose Support Message</h4>
                          <button 
                            type="button"
                            onClick={() => setComposeMode(false)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 700, fontSize: "12.5px" }}
                          >
                            Cancel
                          </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>To (Recipient)</label>
                            <input 
                              type="email"
                              value={sendTo}
                              onChange={e => setSendTo(e.target.value)}
                              placeholder="support@elextra.xyz"
                              style={{ ...S.inp, marginTop: "4px" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Subject</label>
                            <input 
                              type="text"
                              value={sendSubject}
                              onChange={e => setSendSubject(e.target.value)}
                              placeholder="Elextra Customer Query"
                              style={{ ...S.inp, marginTop: "4px" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Message Body</label>
                            <textarea 
                              value={sendBody}
                              onChange={e => setSendBody(e.target.value)}
                              placeholder="Type your message here... We will respond via your email."
                              rows={5}
                              style={{ ...S.inp, marginTop: "4px", resize: "none", height: "auto" }}
                            />
                          </div>
                          <button 
                            type="submit"
                            disabled={sendingEmail}
                            style={{
                              ...S.cta,
                              width: "100%",
                              marginTop: "8px",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center"
                            }}
                          >
                            {sendingEmail ? "Sending Message..." : "Send via Gmail"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* INBOX LISTING MODE */
                      <div>
                        {/* Tab headers */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                          <button 
                            type="button"
                            onClick={() => setComposeMode(true)}
                            style={{
                              flex: 1,
                              background: "#eff6ff",
                              border: "1.5px solid #bfdbfe",
                              borderRadius: "10px",
                              padding: "8px",
                              color: "#1d4ed8",
                              fontWeight: 700,
                              fontSize: "12.5px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px"
                            }}
                          >
                            <Plus size={16} /> Compose Support Mail
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setGmailTokenState(null);
                              setGmailAccessToken(null);
                              notify("Gmail session disconnected.", "ok");
                            }}
                            style={{
                              background: "#fef2f2",
                              border: "1.5px solid #fecaca",
                              borderRadius: "10px",
                              padding: "8px 12px",
                              color: "#dc2626",
                              fontWeight: 700,
                              fontSize: "12px",
                              cursor: "pointer"
                            }}
                          >
                            Disconnect
                          </button>
                        </div>

                        {/* Search header */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                          <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search inbox (e.g. Elextra, Receipt)"
                            style={{ ...S.inp, flex: 1, margin: 0, padding: "8px 12px" }}
                          />
                          <button 
                            type="button"
                            onClick={() => fetchGmailMessages(gmailToken, searchQuery)}
                            style={{
                              background: "#0f172a",
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "0 16px",
                              fontWeight: "bold",
                              fontSize: "12px",
                              cursor: "pointer"
                            }}
                          >
                            Search
                          </button>
                        </div>

                        {loadingEmails ? (
                          <div style={{ textAlign: "center", padding: "30px 0" }}>
                            <div style={{ display: "inline-block", width: "24px", height: "24px", border: "2px solid #cbd5e1", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                            <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>Fetching from Google Secure Servers...</div>
                          </div>
                        ) : emails.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "40px 16px", border: "1.5px dashed #e2e8f0", borderRadius: "16px", color: "#64748b" }}>
                            <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>📭</span>
                            <span style={{ fontSize: "13px", fontWeight: 700 }}>No matching emails found</span>
                            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                              Try searching for general inbox items or connect a different account.
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {emails.map((msg: any) => {
                              const from = getHeader(msg, "from") || "Unknown Sender";
                              const nameOnly = from.includes("<") ? from.split("<")[0].trim() : from;
                              const dateStr = new Date(getHeader(msg, "date")).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                              return (
                                <div 
                                  key={msg.id}
                                  onClick={() => setSelectedEmail(msg)}
                                  style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "12px",
                                    cursor: "pointer",
                                    background: "white",
                                    transition: "all 0.15s",
                                    textAlign: "left"
                                  }}
                                  onMouseOver={e => e.currentTarget.style.borderColor = "#cbd5e1"}
                                  onMouseOut={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#1e293b" }}>{nameOnly}</span>
                                    <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>{dateStr}</span>
                                  </div>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {getHeader(msg, "subject") || "(No Subject)"}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {msg.snippet}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* A. PLUS PANEL */}
                {activePanel === "plus" && (
                  <div>
                    <div style={{ background: "linear-gradient(135deg, #1e1b4b, #311042)", borderRadius: "16px", padding: "20px", color: "white", marginBottom: "16px", textAlign: "center" }}>
                      <span style={{ fontSize: "36px" }}>👑</span>
                      <h4 style={{ fontSize: "18px", fontWeight: 800, marginTop: "8px" }}>{appSettings.plusTitle}</h4>
                      <p style={{ fontSize: "12px", opacity: 0.85, marginTop: "4px" }}>
                        {appSettings.plusDescription}
                      </p>
                    </div>
                    {user.isPlusActive ? (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: "#10b981", fontWeight: "bold", fontSize: "15px", marginBottom: "12px" }}>✓ Membership Active!</div>
                        <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "20px" }}>
                          You have saved an estimated ₵120 in delivery fees this month! Free delivery is applied autonomously.
                        </p>
                        <button 
                          onClick={async () => {
                            const updated = { ...user, isPlusActive: false };
                            await syncUserGlobally(updated);
                            notify("Elextra Plus membership canceled.", "ok");
                          }}
                          style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", fontWeight: "bold", cursor: "pointer", width: "100%" }}
                        >
                          Cancel Plus Subscription
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ marginBottom: "16px" }}>
                          {appSettings.plusBenefits}
                        </p>
                        <button 
                          onClick={async () => {
                            const updated = { ...user, isPlusActive: true };
                            await syncUserGlobally(updated);
                            notify("Welcome to Elextra Plus+! Free delivery is now active! 🎉", "ok");
                          }}
                          style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", border: "none", borderRadius: "10px", padding: "12px", fontWeight: "bold", cursor: "pointer", width: "100%", boxShadow: "0 4px 12px rgba(139,92,246,0.25)" }}
                        >
                          Join Now - ₵{appSettings.plusPrice}/Month
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* B. LOYALTY PANEL */}
                {activePanel === "loyalty" && (
                  <div>
                    <div style={{ background: "#fff7ed", border: "1.5px solid #ffedd5", borderRadius: "12px", padding: "16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "12px", color: "#ea580c", fontWeight: "bold", textTransform: "uppercase" }}>CURRENT POINTS</span>
                        <div style={{ fontSize: "24px", fontWeight: 900, color: "#c2410c" }}>
                          {user.loyaltyPoints !== undefined ? user.loyaltyPoints : 240} PTS
                        </div>
                      </div>
                      <span style={{ fontSize: "36px" }}>🎁</span>
                    </div>
                    <p style={{ marginBottom: "16px" }}>
                      Earn 10 points for every ₵10 spent. Convert points into direct delivery cash discount coupons instantly.
                    </p>
                    <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ display: "block", color: "#1e293b" }}>₵10 Direct Wallet Credit</strong>
                        <span style={{ fontSize: "11px", color: "#ea580c" }}>Convert with 100 Points</span>
                      </div>
                      <button 
                        onClick={async () => {
                          const currentPoints = user.loyaltyPoints !== undefined ? user.loyaltyPoints : 240;
                          const walletPoints = user.points !== undefined ? user.points : 0;
                          if (currentPoints < 100) {
                            notify("Insufficient points! Keep placing orders to earn more.", "err");
                            return;
                          }
                          const updated = { 
                            ...user, 
                            loyaltyPoints: currentPoints - 100, 
                            points: walletPoints + 100 
                          };
                          await syncUserGlobally(updated);
                          notify("Redeemed! GHS 10.00 has been credited directly to your Elextra Balance! 🎁", "ok");
                        }}
                        style={{ background: "#ea580c", color: "white", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: "bold", cursor: "pointer" }}
                      >
                        Redeem Now
                      </button>
                    </div>
                  </div>
                )}

                {/* C. REFERRAL PANEL */}
                {activePanel === "referral" && (
                  <div>
                    <p style={{ marginBottom: "16px" }}>
                      Invite friends in Tarkwa and Bogoso to download ELEXTRA! They get a <strong>10% signup discount</strong>, and you earn <strong>₵15 wallet credit</strong> on their first completed run!
                    </p>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                      <div style={{ flex: 1, background: "#f1f5f9", border: "1.5px dashed #cbd5e1", borderRadius: "8px", padding: "10px", fontFamily: "monospace", fontSize: "14px", fontWeight: "bold", textAlign: "center", color: "#334155" }}>
                        {user.referralCode || `ELEX-${userFirstName.toUpperCase()}-6123`}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(user.referralCode || `ELEX-${userFirstName.toUpperCase()}-6123`);
                          notify("Referral code copied!", "ok");
                        }}
                        style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: "bold", cursor: "pointer" }}
                      >
                        Copy
                      </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderTop: "1.5px solid #f1f5f9", paddingTop: "12px" }}>
                      <span>Referred Friends:</span>
                      <strong style={{ color: "#10b981" }}>{user.referralCount !== undefined ? user.referralCount : 3} Friends</strong>
                    </div>
                  </div>
                )}

                {/* D. PROMO PANEL */}
                {activePanel === "promo" && (
                  <div>
                    <p style={{ marginBottom: "12px" }}>Enter any active Elextra voucher or promo code below to apply discount credit directly to your wallet.</p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input 
                        type="text" 
                        placeholder="e.g. WELCOME10" 
                        value={promoCode} 
                        onChange={e => setPromoCode(e.target.value)} 
                        style={{ ...S.inp, flex: 1, padding: "10px" }} 
                      />
                      <button 
                        onClick={() => {
                          if (!promoCode.trim()) return;
                          notify(`Promo code "${promoCode.toUpperCase()}" applied successfully! ₵10 credit added.`, "ok");
                          setPromoCode("");
                          setActivePanel(null);
                        }}
                        style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: "bold", cursor: "pointer" }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                {/* E. SETTINGS PANEL */}
                {activePanel === "settings" && (
                  <div>
                    <div style={{ borderBottom: "1.5px solid #f1f5f9", paddingBottom: "14px", marginBottom: "14px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>Account Classification</span>
                      <h4 style={{ fontSize: "15px", fontWeight: "bold", color: "#1e293b", marginTop: "2px" }}>
                        {user.type === "corp" ? "🏢 Enterprise Account Class" : "Individual Retail Profile"}
                      </h4>
                      <p style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                        {user.type === "corp" 
                          ? "Invoicing terms Net-15, weekly billing and custom logistics corporate discounts enabled."
                          : "Upgrade your account to corporate class to unlock bi-weekly official tax invoicing, net-15 payment credit limits and corporate discounts."
                        }
                      </p>
                      {user.type !== "corp" && (
                        <button 
                          onClick={async () => {
                            const updated = { ...user, type: "corp" };
                            setUser(updated);
                            await DB.set("elx_logged_user", updated);
                            notify("Profile class upgraded to Corporate successfully! 🏢", "ok");
                          }}
                          style={{ marginTop: "10px", width: "100%", background: "#1e293b", color: "white", border: "none", borderRadius: "8px", padding: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                        >
                          ✨ Upgrade Profile to Corporate
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <strong style={{ display: "block", color: "#1e293b" }}>App Color Theme</strong>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Toggle Light or Dark interface modes</span>
                      </div>
                      <button
                        onClick={() => {
                          const nextTheme = theme === "dark" ? "light" : "dark";
                          setTheme(nextTheme);
                          DB.set("elx_theme", nextTheme);
                          notify(`Switched to ${nextTheme === "dark" ? "Dark Mode" : "Light Mode"} theme!`);
                        }}
                        style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "20px", padding: "6px 14px", fontSize: "12.5px", fontWeight: "bold", color: "#334155", cursor: "pointer" }}
                      >
                        {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                      </button>
                    </div>
                  </div>
                )}

                {/* F. PRIVACY PANEL */}
                {activePanel === "privacy" && (
                  <div>
                    <p style={{ marginBottom: "12px" }}>
                      Your trust and security is our primary objective. Elextra adheres strictly to secure end-to-end local data synchronization rules:
                    </p>
                    <ul style={{ paddingLeft: "16px", margin: "0 0 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <li>🔒 Personal credentials and passwords are hashed server-side using secure SHA algorithms.</li>
                      <li>📍 Delivery addresses and telephone contacts are shared ONLY with active riders assigned to your specific dispatch run.</li>
                      <li>💳 No credit card or Mobile Money pin numbers are ever stored in raw format on the system.</li>
                    </ul>
                    <p style={{ fontSize: "11px", color: "#94a3b8" }}>Last audit verification: July 2026</p>
                  </div>
                )}

                {/* G. ABOUT PANEL */}
                {activePanel === "about" && (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <span style={{ fontSize: "40px" }}>🇬🇭</span>
                    <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "#0f172a", marginTop: "8px" }}>{appSettings.aboutTitle}</h4>
                    <p style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>{appSettings.aboutVersion}</p>
                    <p style={{ margin: "16px 0", fontSize: "13px" }}>
                      {appSettings.aboutContent}
                    </p>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{appSettings.aboutFooter}</div>
                  </div>
                )}

                {/* H. SUPPORT PANEL */}
                {activePanel === "support" && (
                  <div>
                    <p style={{ marginBottom: "16px" }}>
                      Have questions about an active order, table reservation, or parcel delivery? Speak instantly with our dispatch operations helpdesk.
                    </p>
                    <button 
                      onClick={() => window.open("https://wa.me/233246263123", "_blank")}
                      style={{ 
                        background: "#25d366", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "10px", 
                        padding: "12px", 
                        fontWeight: "bold", 
                        cursor: "pointer", 
                        width: "100%", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "8px",
                        boxShadow: "0 4px 12px rgba(37,211,102,0.25)"
                      }}
                    >
                      💬 Message on WhatsApp Helpdesk
                    </button>
                    <div style={{ marginTop: "16px", fontSize: "11.5px", color: "#64748b", textAlign: "center" }}>
                      Helpline: +233 24 626 3123 · Email: support@elextra.xyz
                    </div>
                  </div>
                )}

                {/* I. ADD PAYMENT METHOD PANEL */}
                {activePanel === "payment-add" && (
                  <form 
                    onSubmit={handleAddPaymentMethod}
                    style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                  >
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>Select Payment Provider Type</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "10px" }}>
                        {[
                          { id: "card", l: "💳 Card", color: "#2563eb" },
                          { id: "MTN MoMo", l: "🟡 MTN", color: "#eab308" },
                          { id: "Telecel Cash", l: "🔴 Telecel", color: "#ef4444" },
                          { id: "AirtelTigo Cash", l: "🔵 AT", color: "#3b82f6" }
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPaymentType(t.id as any)}
                            style={{
                              padding: "8px 2px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              border: paymentType === t.id ? `2px solid ${t.color}` : "1.5px solid #cbd5e1",
                              background: paymentType === t.id ? "rgba(0,0,0,0.03)" : "white",
                              color: "#1e293b",
                              cursor: "pointer"
                            }}
                          >
                            {t.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {paymentType === "card" ? (
                      <>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Cardholder Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Lawrence Enyam" 
                            style={S.inp} 
                            value={cardName}
                            onChange={e => setCardName(e.target.value)}
                            required 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Card Number</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 4111 2222 3333 4444" 
                            style={S.inp} 
                            value={cardNumber}
                            onChange={e => setCardNumber(e.target.value)}
                            required 
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Expiry Date</label>
                            <input 
                              type="text" 
                              placeholder="MM/YY" 
                              style={S.inp} 
                              value={cardExpiry}
                              onChange={e => setCardExpiry(e.target.value)}
                              required 
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>CVV</label>
                            <input 
                              type="password" 
                              placeholder="•••" 
                              style={S.inp} 
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value)}
                              required 
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Wallet Owner Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Lawrence Enyam" 
                            style={S.inp} 
                            value={momoName}
                            onChange={e => setMomoName(e.target.value)}
                            required 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Mobile Money Number</label>
                          <input 
                            type="tel" 
                            placeholder="e.g. 0549001002" 
                            style={S.inp} 
                            value={momoNumber}
                            onChange={e => setMomoNumber(e.target.value)}
                            required 
                          />
                        </div>
                      </>
                    )}

                    <button 
                      type="submit"
                      style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "10px", padding: "12px", fontWeight: "bold", cursor: "pointer", width: "100%", marginTop: "10px" }}
                    >
                      Confirm Payment Method
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── SAVED WISHLIST ───────────────────────────────────────────────────────────
interface WishlistPageProps {
  products: Product[];
  wishlist: string[];
  addToCart: (p: Product) => void;
  toggleWish: (p: Product) => void;
}

export function WishlistPage({ products, wishlist, addToCart, toggleWish }: WishlistPageProps) {
  const items = products.filter(p => wishlist.includes(p.id));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ background: "linear-gradient(135deg, #ec4899, #db2777)", padding: "20px 16px", borderRadius: "16px", marginBottom: "16px", color: "white" }}>
        <div style={{ fontSize: "22px", fontWeight: 900 }}>❤️ Wishlist Vault</div>
        <div style={{ fontSize: "13px", opacity: 0.9 }}>{items.length} product entries saved for dispatch runs</div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 16px", color: "#94a3b8" }}>
          <div style={{ fontSize: "48px" }}>❤️</div>
          <div style={{ marginTop: "12px", fontSize: "14px" }}>Vault is empty. Click heart buttons on items to save.</div>
        </div>
      ) : (
        <div style={S.pGrid}>
          {items.map(p => (
            <PCard key={p.id} p={p} onAdd={addToCart} onWish={toggleWish} wishlisted grid />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── COMPREHENSIVE TERMS & CONDITIONS ─────────────────────────────────────────
interface TermsPageProps {
  tcAccepted: boolean;
  setTcAccepted: (v: boolean) => void;
}

export function TermsPage({ tcAccepted, setTcAccepted }: TermsPageProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "20px 16px", borderRadius: "16px", marginBottom: "16px", color: "white" }}>
        <div style={{ fontSize: "22px", fontWeight: 900 }}>📋 Platform Terms of Agreement</div>
        <div style={{ fontSize: "13px", opacity: 0.9 }}>Must review and check confirmation to trigger checkout</div>
      </div>

      {tcAccepted && (
        <div style={{ background: "#f0fdf4", border: "2.5px solid #10b981", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", color: "#166534", fontWeight: 700, display: "flex", gap: "8px", alignItems: "center" }}>
          <Check size={18} /> Platform agreement accepted and verified.
        </div>
      )}

      <div style={{ ...S.sec, maxHeight: "400px", overflowY: "auto" }}>
        {[
          { t: "1. Scope of Dispatch Agreement", b: "ELEXTRA services standard deliveries, express runs, grocery shopping logistics, and heavy construction equipment hauling strictly within Tarkwa and Bogoso metropolitan perimeters." },
          { t: "2. Daily Marketplace Price Fluctuations", b: "All listed grocery, supply, and hardware indexes on the marketplace adjust daily to model Tarkwa-Bogoso physical rates. Quoted rates on dispatch slips are fixed at confirmation for 24 hours only." },
          { t: "3. Mandatory Bulk & Heavy Transport Charge", b: "When heavy hardware (such as bags of cement, iron rod coils, water containers, fridge compressors, blocks) is detected in the basket, the user agrees to pay supplementary Aboboya tricycle transport (₵50) or light truck transport (₵120) billed transparently at checkout." },
          { t: "4. Platform Service Fee", b: "A nominal 5% digital platform fee is appended to item pricing subtotals to maintain the real-time lookup servers." },
          { t: "5. Return Policies", b: "Claims for broken eggs, perishables, or construction components must be made directly to WhatsApp dispatch within 1 hour of rider collection." },
          { t: "6. Carrier Liability", b: "Elextra holds fully verified courier sheets. Maximum payload protection for standard dispatch covers is ₵500. Prohibited or contraband materials will be reported directly to Tarkwa-Bogoso central authorities." },
        ].map(clause => (
          <div key={clause.t} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13px", marginBottom: "4px" }}>{clause.t}</div>
            <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>{clause.b}</div>
          </div>
        ))}

        <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px", marginTop: "10px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <input 
              type="checkbox" 
              id="confirmtc" 
              checked={tcAccepted} 
              onChange={e => setTcAccepted(e.target.checked)} 
              style={{ width: "18px", height: "18px", cursor: "pointer", flexShrink: 0, marginTop: "2px" }} 
            />
            <label htmlFor="confirmtc" style={{ cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#0f172a", lineHeight: 1.4 }}>
              I have thoroughly read, understood, and accept ELEXTRA's platform Terms & Conditions. Specifically, I acknowledge the platform fees, Momo transaction percentage, and mandated heavy transport logistics charges.
            </label>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MINI CARD CHILD COMPONENT ────────────────────────────────────────────────
interface PCardProps {
  key?: any;
  p: Product;
  onAdd: (p: Product) => void;
  onWish?: (p: Product) => void;
  wishlisted?: boolean;
  dark?: boolean;
  grid?: boolean;
}

export function PCard({ p, onAdd, onWish, wishlisted, dark, grid }: PCardProps) {
  return (
    <div style={{ ...S.pCard, ...(dark ? S.pCardD : {}), ...(grid ? { minWidth: "unset", width: "100%" } : {}) }}>
      {p.tag && <div style={{ ...S.pTag, background: TC[p.tag] || "#64748b" }}>{p.tag}</div>}
      {onWish && (
        <button style={S.wBtn} onClick={() => onWish(p)}>
          {wishlisted ? "❤️" : "🤍"}
        </button>
      )}
      <SafeImage src={p.img} alt={p.name} category={p.cat} productId={p.id} />
      <div style={{ fontSize: "12px", fontWeight: 700, color: dark ? "white" : "#1e293b", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {p.name}
      </div>
      {p.unit && <div style={{ fontSize: "11px", color: dark ? "rgba(255,255,255,0.6)" : "#64748b", marginBottom: "4px" }}>Per {p.unit}</div>}
      <div style={{ fontWeight: 900, fontSize: "14px", color: dark ? "#fde047" : "#dc2626", marginBottom: "8px" }}>
        ₵{Math.round(p.price)}
      </div>
      {p.transport && (
        <div style={{ background: "#fffbeb", borderRadius: "5px", padding: "3px 8px", fontSize: "9px", marginBottom: "6px", color: "#b45309", fontWeight: 700 }}>
          🚛 Heavy Haulage Needs
        </div>
      )}
      <button style={{ ...S.addBtn, ...(dark ? { background: "rgba(255,255,255,0.2)" } : {}) }} onClick={() => onAdd(p)}>
        Add to Cart 🛒
      </button>
    </div>
  );
}

// ─── SMALL UTILS ─────────────────────────────────────────────────────────────
export function SecHead({ title, sub, white }: { title: string; sub?: string; white?: boolean }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "16px", fontWeight: 900, color: white ? "white" : "#0f172a" }}>{title}</div>
      {sub && <div style={{ fontSize: "12px", color: white ? "rgba(255,255,255,0.7)" : "#64748b", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

export function FLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontWeight: 700, fontSize: "12px", color: "#475569", marginBottom: "6px", ...style }}>{children}</div>;
}

export function FeeRow({ l, v, warn }: { l: string; v: string; warn?: boolean }) {
  return (
    <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
      <span style={{ color: warn ? "#b45309" : "#64748b", fontWeight: warn ? 700 : 400 }}>{warn ? "⚠️ " : ""}{l}</span>
      <span style={{ fontWeight: 700, color: warn ? "#b45309" : "#0f172a" }}>{v}</span>
    </div>
  );
}

export function OptionBtn({ label, active, onClick }: { key?: any; label: string; active: boolean; onClick: () => void }) {
  return <button style={{ ...S.optBtn, ...(active ? S.optBtnA : {}) }} onClick={onClick}>{label}</button>;
}

export function NavRow({ onBack, onNext, nextOnly, onSubmit }: { onBack?: () => void; onNext?: () => void; nextOnly?: boolean; onSubmit?: () => void }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
      {!nextOnly && onBack && <button style={S.backBtn} onClick={onBack}>← Back</button>}
      {onNext && <button style={{ ...S.cta, flex: 1 }} onClick={onNext}>Next →</button>}
      {onSubmit && <button style={{ ...S.cta, flex: 1, background: "linear-gradient(135deg, #10b981, #059669)" }} onClick={onSubmit}>✅ Complete Dispatch</button>}
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
      <div style={{ fontSize: "40px" }}>🔍</div>
      <div style={{ marginTop: "8px", fontSize: "13px" }}>No marketplace listing matches criteria.</div>
    </div>
  );
}
