/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Search, Heart, ShoppingCart } from "lucide-react";
import { LangCode, getTxt } from "./lang";

// ─── MODULE IMPORTS ──────────────────────────────────────────────────────────
import { User, Order, CartItem, Product, Notif } from "./types";
import { DB } from "./db";
import { DRIVERS, today, needsTransport, today as dateToday, GROCERY_ITEMS, ELECTRONICS, CONSTRUCTION } from "./data";
import { S } from "./styles";
import { DispatchJob } from "./components/AdminPage";
import { saveUserToFirestore, saveOrderToFirestore, syncLocalOrdersToFirestore, getOrdersFromFirestore, getUsersFromFirestore } from "./lib/firestoreSync";

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
import { 
  HomePage, FoodPage, MallsPage, Marketplace, DeliveryPage, TrackPage, 
  AccountPage, WishlistPage, TermsPage 
} from "./components/Pages";
import { 
  LoginModal, SignupModal, CheckoutModal, SuccessModal 
} from "./components/Modals";
import { GeminiChatBox } from "./components/GeminiChatBox";
import { OnboardingForm } from "./components/OnboardingForm";
import { sendPushNotification, PushNotificationManager } from "./components/PushNotificationManager";

export default function App() {
  const [page, _setPage] = useState("home");
  const [tab, setTab] = useState("all"); 
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [modal, _setModal] = useState<string | null>(null);

  const setPage = (p: string) => {
    if (p !== page) {
      if (typeof window !== "undefined") {
        window.history.pushState({ type: "page", value: p }, "");
      }
    }
    _setPage(p);
  };

  const setModal = (m: string | null) => {
    if (m) {
      if (typeof window !== "undefined") {
        (window as any).elx_modal_history_count = 1;
        window.history.pushState({ type: "modal", value: m }, "");
      }
      _setModal(m);
    } else {
      if (typeof window !== "undefined") {
        const count = (window as any).elx_modal_history_count || 0;
        if (count > 0) {
          (window as any).elx_modal_history_count = 0;
          window.history.go(-count);
        } else {
          _setModal(null);
        }
      } else {
        _setModal(null);
      }
    }
  };

  // Synchronize browser history and physical back buttons with Page & Modal states
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.history.state || !window.history.state.type) {
        window.history.replaceState({ type: "page", value: "home" }, "");
      }

      const handlePopState = (e: PopStateEvent) => {
        const state = e.state;
        if (state) {
          if (state.type === "page") {
            _setPage(state.value);
            _setModal(null);
          } else if (state.type === "modal") {
            _setModal(state.value);
          }
        } else {
          _setPage("home");
          _setModal(null);
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, []);
  const [notif, setNotif] = useState<Notif | null>(null);
  const [search, setSearch] = useState("");
  const [flashT, setFlashT] = useState(7200);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [trackStep, setTrackStep] = useState(0);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [cityFilter, setCityFilter] = useState("all");
  const [locationsList, setLocationsList] = useState<any[]>([
    { id: "all", name: "All Areas", label: "🌐 All Areas (Tarkwa & Bogoso)", emoji: "🌐" },
    { id: "tarkwa", name: "Tarkwa", label: "🏙️ Tarkwa Only", emoji: "🏙️" },
    { id: "bogoso", name: "Bogoso", label: "🏘️ Bogoso Only", emoji: "🏘️" }
  ]);
  const [theme, setTheme] = useState("light");
  const [dispatchJobs, setDispatchJobs] = useState<DispatchJob[]>([]);
  const lastSyncedStateRef = useRef<Record<string, string>>({});

  // Localized & Extended states
  const [lang, setLang] = useState<LangCode>("EN");
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [qrModeActive, setQrModeActive] = useState<string | null>(null); // table details if scanned

  // 💻 Desktop site mode & 🌐 IP address personalization state definitions
  const [desktopMode, setDesktopMode] = useState<boolean>(true);
  const [ipProfile, setIpProfile] = useState<any>(null);
  const [geminiMeta, setGeminiMeta] = useState<any>(null);

  // Load persistence index on mounting
  const loadPersistentData = async () => {
    const u = await DB.get("elx_user");
    const o = await DB.get("elx_orders");
    const c = await DB.get("elx_cart");
    const w = await DB.get("elx_wishlist");
    const tc = await DB.get("elx_tc");
    const th = await DB.get("elx_theme");
    const d = await DB.get("elx_dispatch");
    const ln = await DB.get("elx_lang");
    const pwa = await DB.get("elx_pwa");
    const qrm = await DB.get("elx_qrm");
    const gm = await DB.get("elx_gemini_products_meta");
    const settings = await DB.get("elx_settings");
    
    if (gm) setGeminiMeta(gm);
    if (settings && settings.locations && Array.isArray(settings.locations)) {
      setLocationsList(settings.locations);
    }
    if (u) {
      if (u.role && ["seller", "rider", "manager", "sub_admin", "primary_admin"].includes(u.role)) {
        await DB.set("elx_user", null);
        setUser(null);
      } else {
        setUser(u);
        // Sync user profile and orders from Firestore
        try {
          saveUserToFirestore(u); // keep Firestore profile up-to-date
          const fsOrders = await getOrdersFromFirestore(u.email);
          if (fsOrders && fsOrders.length > 0) {
            const merged = [...fsOrders, ...(o || [])];
            const seen = new Set();
            const cleanMerged = merged.filter((item: any) => {
              if (!item || !item.id) return false;
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
            setOrders(cleanMerged);
            await DB.set("elx_orders", cleanMerged);
          }
        } catch (fsErr) {
          console.warn("Could not sync from Firestore on startup:", fsErr);
        }
      }
    }
    if (o) {
      const seen = new Set();
      const cleanO = o.filter((item: any) => {
        if (!item || !item.id) return false;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setOrders(cleanO);
      // Background upload local orders to Firestore for backup
      if (cleanO.length > 0) {
        syncLocalOrdersToFirestore(cleanO);
      }
    }
    if (c) setCart(c);
    if (w) setWishlist(w);
    if (tc !== null && tc !== undefined) setTcAccepted(tc);
    if (th) setTheme(th);
    if (ln) setLang(ln);
    if (pwa) setPwaInstalled(pwa);
    if (qrm) setQrModeActive(qrm);
    if (d) {
      const seen = new Set();
      const cleanD = d.filter((item: any) => {
        if (!item || !item.id) return false;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setDispatchJobs(cleanD);
    }
  };

  useEffect(() => {
    loadPersistentData();

    // Fetch initial Gemini catalog updates on boot
    fetch("/api/gemini/catalog")
      .then(res => res.json())
      .then(data => {
        if (data && data.updates) {
          setGeminiMeta(data);
          DB.set("elx_gemini_products_meta", data);
        }
      })
      .catch(err => console.warn("Failed to load Gemini catalog on boot:", err));

    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_gemini_products_meta") {
        setGeminiMeta(value);
      } else if (key === "elx_orders") {
        const val = value || [];
        const seen = new Set();
        const cleanO = val.filter((item: any) => {
          if (!item || !item.id) return false;
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        setOrders(cleanO);
        if (activeOrder && Array.isArray(value)) {
          const fresh = value.find((o: any) => o.id === activeOrder.id);
          if (fresh) {
            setActiveOrder(fresh);
          }
        }
      } else if (key === "elx_dispatch") {
        const val = value || [];
        const seen = new Set();
        const cleanD = val.filter((item: any) => {
          if (!item || !item.id) return false;
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        setDispatchJobs(cleanD);
      } else if (key === "elx_user") {
        setUser(value);
      } else if (key === "elx_theme" && value) {
        setTheme(value);
      } else if (key === "elx_lang" && value) {
        setLang(value);
      } else if (key === "elx_pwa") {
        setPwaInstalled(!!value);
      } else if (key === "elx_qrm") {
        setQrModeActive(value);
      } else if (key === "elx_cart" && value) {
        setCart(value || []);
      } else if (key === "elx_wishlist" && value) {
        setWishlist(value || []);
      } else if (key === "elx_tc") {
        setTcAccepted(!!value);
      } else if (key === "elx_settings" && value?.locations) {
        setLocationsList(value.locations);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    window.addEventListener("storage", loadPersistentData);

    // Background polling sync for shared backend-backed db keys
    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/db/sync");
        if (res.ok) {
          const data = await res.json();
          // Iterate over keys and dispatch sync event if value changed
          Object.entries(data).forEach(([key, value]) => {
            const stringified = JSON.stringify(value);
            if (lastSyncedStateRef.current[key] !== stringified) {
              lastSyncedStateRef.current[key] = stringified;
              window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key, value } }));
            }
          });
        }
      } catch (err) {
        console.warn("[App.tsx] Shared DB background polling failed:", err);
      }
    }, 1500);

    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
      window.removeEventListener("storage", loadPersistentData);
      clearInterval(syncInterval);
    };
  }, [activeOrder]);

  const fetchIpProfile = async () => {
    try {
      const storedProfile = localStorage.getItem("elx_phone_profile");
      if (storedProfile) {
        const prof = JSON.parse(storedProfile);
        setIpProfile(prof);
        
        // Background fetch to ensure fresh synchronization of their orders
        const res = await fetch(`/api/orders-lookup?phone=${encodeURIComponent(prof.preferredPhone)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setIpProfile(data.profile);
            localStorage.setItem("elx_phone_profile", JSON.stringify(data.profile));
            
            if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
              setOrders(prev => {
                const currentOrders = [...prev];
                data.orders.forEach((newOrder: any) => {
                  if (!currentOrders.some((o: any) => o.id === newOrder.id)) {
                    currentOrders.push(newOrder);
                  }
                });
                return currentOrders.sort((a, b) => b.id.localeCompare(a.id));
              });
            }
          }
        }
      } else {
        setIpProfile(null);
      }
    } catch (err) {
      console.warn("Failed to retrieve phone profile:", err);
    }
  };

  const onUpdateIpProfile = async (phone: string) => {
    if (!phone) {
      onUnlinkIpProfile();
      return;
    }
    
    try {
      const res = await fetch(`/api/orders-lookup?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIpProfile(data.profile);
          localStorage.setItem("elx_phone_profile", JSON.stringify(data.profile));
          
          if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
            setOrders(prev => {
              const currentOrders = [...prev];
              data.orders.forEach((newOrder: any) => {
                if (!currentOrders.some((o: any) => o.id === newOrder.id)) {
                  currentOrders.push(newOrder);
                }
              });
              return currentOrders.sort((a, b) => b.id.localeCompare(a.id));
            });
            notify(`Akwaba! Retrieved ${data.orders.length} historical records linked to ${phone}. 👋`, "ok");
          } else {
            notify(`Mobile profile linked successfully to: ${phone}. No past orders found yet. 👋`, "ok");
          }
        }
      }
    } catch (err) {
      console.warn("Failed to link phone profile:", err);
      notify("Authentication microserver is currently unreachable.", "err");
    }
  };

  const onUnlinkIpProfile = () => {
    setIpProfile(null);
    localStorage.removeItem("elx_phone_profile");
    notify("Mobile profile unlinked successfully. Active orders remain stored on this browser.", "ok");
  };

  useEffect(() => {
    // 🖥️ Desktop vs Mobile screen mode detection on mount
    if (typeof window !== "undefined") {
      setDesktopMode(window.innerWidth >= 1024);
    }
    fetchIpProfile();
  }, []);

  // Dynamically configure colors in CSS variables on theme updates
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--elextra-primary", "#FF5A1F");
    root.style.setProperty("--elextra-primary-text", "#FFFFFF");
    root.style.setProperty("--elextra-secondary", "#10B981");
    root.style.setProperty("--elextra-dark-grey", "#1E1B18");

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      root.style.setProperty("--elextra-bg", "#0F172A");
      root.style.setProperty("--elextra-text", "#FFFFFF");
      root.style.setProperty("--elextra-card-bg", "#1E293B");
      root.style.setProperty("--elextra-border", "#334155");
      root.style.setProperty("--elextra-card-border", "#1E293B");
      root.style.setProperty("--elextra-input-bg", "#0F172A");
      root.style.setProperty("--elextra-subtext", "#E2E8F0");
      root.style.setProperty("--elextra-inactive-text", "#94A3B8");
      root.style.setProperty("--elextra-tab-bg", "#1E293B");
      root.style.setProperty("--elextra-tab-border", "#334155");
      root.style.setProperty("--elextra-bottom-nav-bg", "#0F172A");
      root.style.setProperty("--elextra-white", "#0F172A");
      root.style.setProperty("--elextra-soft-bg", "rgba(255, 90, 31, 0.15)");
      root.style.setProperty("--elextra-secondary-soft", "rgba(16, 185, 129, 0.2)");
      document.body.style.backgroundColor = "#0F172A";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      root.style.setProperty("--elextra-bg", "#FAF9F5");
      root.style.setProperty("--elextra-text", "#000000");
      root.style.setProperty("--elextra-card-bg", "#FFFFFF");
      root.style.setProperty("--elextra-border", "#CBD5E1");
      root.style.setProperty("--elextra-card-border", "#E2E8F0");
      root.style.setProperty("--elextra-input-bg", "#F1F5F9");
      root.style.setProperty("--elextra-subtext", "#1E293B");
      root.style.setProperty("--elextra-inactive-text", "#475569");
      root.style.setProperty("--elextra-tab-bg", "#FFFFFF");
      root.style.setProperty("--elextra-tab-border", "#CBD5E1");
      root.style.setProperty("--elextra-bottom-nav-bg", "#FFFFFF");
      root.style.setProperty("--elextra-white", "#FFFFFF");
      root.style.setProperty("--elextra-soft-bg", "rgba(255, 90, 31, 0.08)");
      root.style.setProperty("--elextra-secondary-soft", "rgba(16, 185, 129, 0.12)");
      document.body.style.backgroundColor = "#FAF9F5";
    }
  }, [theme]);

  // Flash promo timer countdown
  useEffect(() => {
    const t = setInterval(() => setFlashT(x => (x > 0 ? x - 1 : 7200)), 1000);
    return () => clearInterval(t);
  }, []);

  const notify = (msg: string, type: "ok" | "err" = "ok") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3200);
  };

  const addToCart = (product: Product) => {
    const upd = [...cart];
    const idx = upd.findIndex(i => i.id === product.id);
    if (idx > -1) {
      upd[idx].qty++;
    } else {
      upd.push({ ...product, qty: 1 });
    }
    setCart(upd);
    DB.set("elx_cart", upd);
    notify(`Added to basket: ${product.name} 🛒`);
  };

  const removeFromCart = (id: string) => {
    const upd = cart.filter(i => i.id !== id);
    setCart(upd);
    DB.set("elx_cart", upd);
  };

  const updateQty = (id: string, delta: number) => {
    const upd = cart.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i);
    setCart(upd);
    DB.set("elx_cart", upd);
  };

  const toggleWish = (product: Product) => {
    const upd = wishlist.includes(product.id) 
      ? wishlist.filter(i => i !== product.id) 
      : [...wishlist, product.id];
    setWishlist(upd);
    DB.set("elx_wishlist", upd);
    notify(upd.includes(product.id) ? "Saved to wishlist ❤️" : "Removed from wishlist");
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const platformFee = (() => {
    if (cart.length === 0) return 0;
    let totalFee = 0;
    for (const item of cart) {
      if (!item) continue;
      let rate = 0.05; // default 5%
      const id = (item.id || "").toLowerCase();
      if (id.startsWith("food-")) {
        rate = 0.02; // 2% commission on Food items
      } else if (id.startsWith("g")) {
        rate = 0.015; // 1.5% commission on Groceries staples/proteins
      } else if (id.startsWith("c") || id.startsWith("const-")) {
        rate = 0.03; // 3% commission on Construction materials
      } else if (id.startsWith("e")) {
        rate = 0.04; // 4% commission on Electronics
      } else if (id.startsWith("sh") || id.includes("fashion")) {
        rate = 0.035; // 3.5% commission on Fashion items
      }
      totalFee += item.price * item.qty * rate;
    }
    // Platform commission capped at maximum 15 GHS
    return Math.min(15, Math.round(totalFee * 100) / 100);
  })();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const heavyInCart = needsTransport(cart);

  const placeOrder = async (
    delivery: string, 
    payment: string, 
    customDelivFee?: number, 
    customDeliveryLocation?: string,
    recipientName?: string,
    recipientPhone?: string,
    recipientIsSelf?: boolean,
    recipientPin?: string,
    exactPlatformFee?: number,
    exactTransportFee?: number,
    exactPayFee?: number,
    exactTotal?: number,
    couponCode?: string,
    couponDiscount?: number,
    estimatedTimeRange?: string,
    estimatedMinutes?: number
  ) => {
    const isFoodOnly = cart.length > 0 && cart.every(item => 
      item && (
        (item.id || "").toLowerCase().startsWith("food") || 
        (item.cat && (item.cat || "").toLowerCase().includes("food"))
      )
    );
    const effectiveDelivery = (isFoodOnly && delivery === "pickup") ? "pickup" : (isFoodOnly ? "sameDay" : delivery);
    const delivFee = customDelivFee !== undefined
      ? customDelivFee
      : (effectiveDelivery === "pickup"
        ? 0
        : (effectiveDelivery === "sameDay" 
          ? (isFoodOnly ? 10 : 30) 
          : (effectiveDelivery === "express" ? 20 : 10)));
    
    const transportFee = exactTransportFee !== undefined
      ? exactTransportFee
      : (heavyInCart 
        ? (effectiveDelivery === "standard" ? 50 : 120) 
        : 0);
        
    const subtotalAfterDiscount = Math.max(0, subtotal - (couponDiscount || 0));
        
    const payFee = exactPayFee !== undefined
      ? exactPayFee
      : (payment === "momo" 
        ? Math.max(1, Math.floor(subtotalAfterDiscount / 100)) 
        : payment === "card" 
          ? Math.round(subtotalAfterDiscount * 0.015 * 100) / 100 
          : 0);
    
    const pFee = exactPlatformFee !== undefined ? exactPlatformFee : platformFee;
    const total = exactTotal !== undefined ? exactTotal : (subtotalAfterDiscount + pFee + delivFee + transportFee + payFee);
    
    // Associating a courier
    const assignedDriver = DRIVERS.find(d => heavyInCart ? d.heavy : !d.heavy) || DRIVERS[0];
    
    const order: Order = {
      id: "ELX-" + Date.now().toString().slice(-6),
      items: [...cart],
      subtotal,
      platformFee: pFee,
      delivFee,
      transportFee,
      payFee,
      total,
      delivery: effectiveDelivery,
      deliveryLocation: customDeliveryLocation || "Tarkwa Center",
      payment,
      status: "confirmed",
      date: dateToday,
      driver: assignedDriver,
      recipientName,
      recipientPhone,
      recipientIsSelf,
      recipientPin,
      couponCode,
      couponDiscount,
      estimatedTimeRange,
      estimatedMinutes
    };

    const updatedOrders = [order, ...orders];
    setOrders(updatedOrders);
    setActiveOrder(order);
    setTrackStep(0);
    await DB.set("elx_orders", updatedOrders);
    await saveOrderToFirestore(order);

    // Trigger instant push notification for admins and managers
    sendPushNotification(
      "🛍️ New Order Received!",
      `${order.recipientName || "Client"} placed Order #${order.id} for GHS ${order.total.toFixed(2)}`,
      {
        targetRole: ["primary_admin", "sub_admin", "manager"],
        link: { page: "orders", orderId: order.id }
      }
    ).catch(e => console.error("Push notify failed", e));

    // Automatically link mobile number profile on successful checkout
    const autoProfile = {
      preferredPhone: recipientPhone,
      preferredName: recipientName,
      ordersCount: (ipProfile?.ordersCount || 0) + 1,
      favoriteCategory: "Provisions/Food"
    };
    setIpProfile(autoProfile);
    localStorage.setItem("elx_phone_profile", JSON.stringify(autoProfile));

    // 💬 AUTOMATED IN-APP SELLER WHATSAPP INTEGRATION
    const hasFoodItems = order.items.some(item => 
      item && (
        (item.id || "").toLowerCase().startsWith("food") || 
        (item.cat && (item.cat || "").toLowerCase().includes("food"))
      )
    );
    if (hasFoodItems) {
      try {
        const numbers = await DB.get("elx_seller_whatsapp_numbers") || [
          { id: "def-1", name: "Chopbar Operations Hub", phone: "+233246263123", active: true },
          { id: "def-2", name: "Elextra Food Logistics Support", phone: "+233503531153", active: true }
        ];
        const activeNumbers = numbers.filter((n: any) => n.active);
        if (activeNumbers.length > 0) {
          const itemsText = order.items.map(item => `• ${item.name} x${item.qty} (₵${(item.price * item.qty).toFixed(2)})`).join("\n");
          const messageText = `*🚨 NEW ELEXTRA FOOD ORDER PLACED* 🚨\n\n*Order ID:* ${order.id}\n*Date/Time:* ${new Date().toLocaleString()}\n\n*Items Purchased:*\n${itemsText}\n\n*Subtotal:* ₵${order.subtotal.toFixed(2)}\n*Delivery Fee:* ₵${order.delivFee.toFixed(2)}\n*Platform Fee:* ₵${order.platformFee.toFixed(2)}\n*Total Paid:* ₵${order.total.toFixed(2)}\n\n*Delivery Address:* ${order.delivery === "pickup" ? "🛍️ SELF PICK-UP (Customer will pick up from restaurant)" : (order.deliveryLocation || "Tarkwa Center")}\n*Customer Name:* ${order.recipientName || "Valued Client"}\n*Customer Phone:* ${order.recipientPhone || "N/A"}\n\n*Payment Method:* ${order.payment.toUpperCase()}\n\n_Generated automatically via Elextra Dispatch Engine_`;

          const existingLogs = await DB.get("elx_whatsapp_logs") || [];
          const newLogs = activeNumbers.map((num: any) => ({
            id: "WALOG-" + Date.now().toString().slice(-6) + "-" + Math.floor(100 + Math.random() * 900),
            orderId: order.id,
            phone: num.phone,
            recipientName: num.name,
            messageText,
            timestamp: new Date().toLocaleString(),
            status: "delivered"
          }));
          const updatedLogs = [...newLogs, ...existingLogs];
          await DB.set("elx_whatsapp_logs", updatedLogs);
          notify("Automatically dispatched WhatsApp seller receipts! 💬");
        }
      } catch (err) {
        console.error("Failed to automatically dispatch seller WhatsApp alerts:", err);
      }
    }
    
    // Clear cart state
    setCart([]);
    await DB.set("elx_cart", []);
    setModal("success");
    notify("Dispatch order placed! 🎉");
  };

  const handleDispatchSubmit = async (item: {
    service: string;
    size: string;
    type: string;
    pickup: string;
    pickupAddr: string;
    destination: string;
    name: string;
    phone: string;
    fee: number;
    recipientName?: string;
    recipientPhone?: string;
    recipientIsSelf?: boolean;
    recipientPin?: string;
  }) => {
    const job: DispatchJob = {
      id: "DISP-" + Math.floor(100000 + Math.random() * 900000),
      service: item.service as any,
      size: item.size,
      type: item.type,
      pickup: item.pickup,
      pickupAddr: item.pickupAddr,
      destination: item.destination,
      name: item.name,
      phone: item.phone,
      status: "pending",
      date: dateToday,
      fee: item.fee,
      recipientName: item.recipientName,
      recipientPhone: item.recipientPhone,
      recipientIsSelf: item.recipientIsSelf,
      recipientPin: item.recipientPin
    };
    const updated = [job, ...dispatchJobs];
    setDispatchJobs(updated);
    await DB.set("elx_dispatch", updated);
    notify(`Logistics runner dispatch saved as ${job.id}! 🚚`, "ok");
  };

  const fmt = (s: number) => {
    const hrs = String(Math.floor(s / 3600)).padStart(2, "0");
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const secs = String(s % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div style={S.app}>
      {notif && (
        <div style={{ ...S.notif, background: notif.type === "ok" ? "#10b981" : "#dc2626" }}>
          {notif.type === "ok" ? "✔ " : "⚠️ "} {notif.msg}
        </div>
      )}

      <Header 
        page={page} 
        setPage={setPage} 
        cartCount={cartCount} 
        user={user} 
        setModal={setModal} 
        search={search} 
        setSearch={setSearch} 
        setTab={setTab} 
        lang={lang}
        setLang={setLang}
      />

      {/* GLOBAL DISPATCH AREA SELECTION - SEPARATING BOGOSO & TARKWA */}
      <div style={{ background: "var(--elextra-bg, #f8fafc)", borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--elextra-text, #475569)" }}>🌐 Service Location:</span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {locationsList.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setCityFilter(opt.id);
                  notify(`Viewing catalog for: ${opt.label || opt.name}`);
                }}
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "5px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  border: "1.5px solid",
                  borderColor: cityFilter === opt.id ? "#2563eb" : "var(--elextra-border, #cbd5e1)",
                  background: cityFilter === opt.id ? "rgba(37,99,235,0.15)" : "var(--elextra-card-bg, white)",
                  color: cityFilter === opt.id ? "#3b82f6" : "var(--elextra-text, #475569)",
                  boxShadow: cityFilter === opt.id ? "0 2px 4px rgba(37,99,235,0.06)" : "none",
                  transition: "all 0.1s ease"
                }}
              >
                {opt.label || `${opt.emoji} ${opt.name}`}
              </button>
            ))}
          </div>
        </div>

        {/* 💻 DESKTOP SITE MODE TOGGLE CONTROL & PERSISTENT THEME TOGGLE */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Theme switcher accessible even when logged out, satisfies requirement 5 */}
          <button
            onClick={() => {
              const nextTheme = theme === "dark" ? "light" : "dark";
              setTheme(nextTheme);
              DB.set("elx_theme", nextTheme);
              notify(`Switched to ${nextTheme === "dark" ? "Dark Mode" : "Light Mode"} color theme!`);
            }}
            style={{
              fontSize: "11px",
              fontWeight: 800,
              padding: "5px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              border: "1.5px solid var(--elextra-border, #cbd5e1)",
              background: "var(--elextra-card-bg, white)",
              color: "var(--elextra-text, #171717)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>

          <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-text, #475569)" }}>🖥️ View Mode:</span>
          <button
            onClick={() => {
              const nextMode = !desktopMode;
              setDesktopMode(nextMode);
              notify(`Switched to ${nextMode ? "Desktop Layout Mode" : "Mobile Compact Mode"}`);
            }}
            style={{
              fontSize: "11px",
              fontWeight: 800,
              padding: "5px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              border: "1.5px solid #21F1A8",
              background: desktopMode ? "linear-gradient(135deg, #1e293b, #0f172a)" : "var(--elextra-card-bg, white)",
              color: desktopMode ? "#21F1A8" : "var(--elextra-text, #475569)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            {desktopMode ? "🖥️ Desktop Site: Active" : "📱 Mobile Compact"}
          </button>
        </div>
      </div>

      <main style={{ ...S.main, maxWidth: desktopMode ? "1350px" : "800px", paddingBottom: desktopMode ? "16px" : "84px", transition: "all 0.3s ease" }}>
        {page === "home" && (
          <HomePage 
            setPage={setPage} 
            setTab={setTab} 
            flashT={flashT} 
            fmt={fmt} 
            addToCart={addToCart} 
            toggleWish={toggleWish} 
            wishlist={wishlist} 
            ipProfile={ipProfile}
            onUpdateIpProfile={onUpdateIpProfile}
            onUnlinkIpProfile={onUnlinkIpProfile}
            cityFilter={cityFilter}
          />
        )}
        {page === "food" && (
          <FoodPage 
            addToCart={addToCart} 
            wishlist={wishlist} 
            toggleWish={toggleWish} 
            cityFilter={cityFilter}
            notify={notify}
          />
        )}
        {page === "malls" && (
          <MallsPage 
            cityFilter={cityFilter} 
            addToCart={addToCart} 
            setPage={setPage} 
            notify={notify} 
            user={user} 
          />
        )}
        {page === "marketplace" && (
          <Marketplace 
            tab={tab} 
            setTab={setTab} 
            search={search} 
            setSearch={setSearch} 
            addToCart={addToCart} 
            toggleWish={toggleWish} 
            wishlist={wishlist} 
            cart={cart} 
            notify={notify} 
            cityFilter={cityFilter}
          />
        )}
        {page === "delivery" && (
          <DeliveryPage 
            user={user} 
            setUser={setUser} 
            setModal={setModal} 
            notify={notify} 
            onDispatchSubmit={handleDispatchSubmit} 
          />
        )}
        {page === "track" && <TrackPage user={user} orders={orders} activeOrder={activeOrder} trackStep={trackStep} />}
        {page === "account" && <AccountPage user={user} orders={orders} setModal={setModal} setUser={setUser} notify={notify} theme={theme} setTheme={setTheme} />}
        {page === "wishlist" && (
          <WishlistPage 
            products={[...GROCERY_ITEMS, ...ELECTRONICS, ...CONSTRUCTION]} 
            wishlist={wishlist} 
            addToCart={addToCart} 
            toggleWish={toggleWish} 
          />
        )}
        {page === "partners" && (
          <OnboardingForm notify={notify} />
        )}
        {page === "terms" && <TermsPage tcAccepted={tcAccepted} setTcAccepted={v => { setTcAccepted(v); DB.set("elx_tc", v); }} />}
      </main>

      {modal === "login" && (
        <LoginModal 
          onClose={() => setModal(null)} 
          onLogin={async (u) => { 
            setUser(u); 
            await DB.set("elx_user", u); 
            await saveUserToFirestore(u);
            setModal(null); 
            notify(`Welcome back, ${u.name}! 👋`); 
          }} 
          setModal={setModal} 
        />
      )}
      {modal === "signup" && (
        <SignupModal 
          onClose={() => setModal(null)} 
          onSignup={async (u) => { 
            setUser(u); 
            await DB.set("elx_user", u); 
            await saveUserToFirestore(u);
            const currentUsers = await DB.get("elx_users") || [];
            const updatedUsers = [
              ...currentUsers.filter((x: any) => {
                if (!x || !x.email || !u || !u.email) return true;
                return x.email.toLowerCase() !== u.email.toLowerCase();
              }),
              u
            ];
            await DB.set("elx_users", updatedUsers);
            window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_users", value: updatedUsers } }));
            setModal(null); 
            notify(`Welcome to ELEXTRA, ${u.name}! 🎉`); 
          }} 
          setModal={setModal} 
          tcAccepted={tcAccepted} 
        />
      )}
      {modal === "checkout" && (
        <CheckoutModal 
          cart={cart} 
          subtotal={subtotal} 
          platformFee={platformFee} 
          onClose={() => setModal(null)} 
          onOrder={placeOrder} 
          removeFromCart={removeFromCart} 
          updateQty={updateQty} 
          user={user} 
          setModal={setModal} 
          heavyInCart={heavyInCart} 
          tcAccepted={tcAccepted} 
          setPage={setPage} 
          notify={notify} 
          cityFilter={cityFilter}
          addToCart={addToCart}
        />
      )}
      {modal === "success" && <SuccessModal order={activeOrder} onClose={() => { setModal(null); setPage("track"); }} />}

      {!desktopMode && <BottomNav page={page} setPage={setPage} />}

      <GeminiChatBox 
        cityFilter={cityFilter} 
        onAddToCart={addToCart} 
        notify={notify} 
        desktopMode={desktopMode} 
        setCityFilter={setCityFilter}
        setPage={setPage}
        setSearch={setSearch}
      />
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
interface HeaderProps {
  page: string;
  setPage: (p: string) => void;
  cartCount: number;
  user: User | null;
  setModal: (m: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  setTab: (t: string) => void;
  lang: LangCode;
  setLang: (l: LangCode) => void;
}

function Header({ page, setPage, cartCount, user, setModal, search, setSearch, setTab, lang, setLang }: HeaderProps) {
  return (
    <header style={S.header}>
      <div style={S.hTop}>
        <div style={S.logoW} onClick={() => setPage("home")}>
          <img 
            src="https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg" 
            alt="ELEXTRA" 
            style={S.logoImg} 
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} 
          />
          <div>
            <div style={S.logoTxt}>ELEXTRA</div>
            <div style={S.logoSub}>{getTxt(lang, "logo_sub", "Tarkwa · Bogoso · Ghana")}</div>
          </div>
        </div>

        <div style={S.searchW}>
          <Search size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder={getTxt(lang, "search_placeholder", "Search catalogs, food, shops…")} 
            style={S.sInput}
            onFocus={() => { setPage("marketplace"); setTab("all"); }}
          />
          {search && (
            <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "14px" }} onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        <div style={S.hRight}>
          {/* Language Switcher Dropdown */}
          <select 
            value={lang} 
            onChange={async (e) => {
              const val = e.target.value as LangCode;
              setLang(val);
              await DB.set("elx_lang", val);
              window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_lang", value: val } }));
            }}
            style={{
              background: "#1e293b",
              color: "#21F1A8",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="EN">🇬🇧 EN</option>
            <option value="TW">🇬🇭 TW</option>
            <option value="FN">🇬🇭 FN</option>
          </select>

          <button style={S.iBtn} onClick={() => setPage("wishlist")} aria-label="Wishlist">
            <Heart size={20} style={{ color: "white" }} />
          </button>
          
          {/* Push Notifications Hub */}
          <PushNotificationManager user={user} setPage={setPage} setTab={setTab} />

          <button style={S.iBtn} onClick={() => setModal("checkout")} aria-label="Shopping Cart">
            <ShoppingCart size={20} style={{ color: "white" }} />
            {cartCount > 0 && <span style={S.badge}>{cartCount}</span>}
          </button>
          {user ? (
            <button style={S.avBtn} onClick={() => setPage("account")}>
              {user.name?.[0]?.toUpperCase() || "U"}
            </button>
          ) : (
            <button style={S.loginBtn} onClick={() => setModal("login")}>
              {getTxt(lang, "sign_in", "Sign In")}
            </button>
          )}
        </div>
      </div>
      
      <nav style={S.nav}>
        {[
          { id: "home", key: "nav_home", fallback: "🏠 Home" },
          { id: "food", key: "nav_food", fallback: "🍽️ Fast Food" },
          { id: "malls", key: "nav_malls", fallback: "🏪 Retail Stores" },
          { id: "marketplace", key: "nav_market", fallback: "🛍️ Market" },
          { id: "delivery", key: "nav_dispatch", fallback: "🚚 Dispatch" },
          { id: "track", key: "nav_track", fallback: "📍 Track" },
          { id: "partners", key: "nav_partners", fallback: "🤝 Partner Hub" },
          { id: "terms", key: "nav_terms", fallback: "📋 T&C" }
        ].map(n => (
          <button 
            key={n.id} 
            style={{ ...S.nBtn, ...(page === n.id ? S.nActive : {}) }} 
            onClick={() => setPage(n.id)}
          >
            {getTxt(lang, n.key, n.fallback)}
          </button>
        ))}
      </nav>
    </header>
  );
}

// ─── BOTTOM NAVIGATION ────────────────────────────────────────────────────────
interface BottomNavProps {
  page: string;
  setPage: (p: string) => void;
}

function BottomNav({ page, setPage }: BottomNavProps) {
  return (
    <div style={S.bNav}>
      {[
        { id: "home", i: "🏠", l: "Home" },
        { id: "food", i: "🍽️", l: "Fast Food" },
        { id: "marketplace", i: "🛍s", l: "Shop" },
        { id: "delivery", i: "🚚", l: "Send/Run" },
        { id: "track", i: "📍", l: "Track" }
      ].map(n => (
        <button 
          key={n.id} 
          style={{ ...S.bBtn, ...(page === n.id ? S.bAct : {}) }} 
          onClick={() => setPage(n.id)}
        >
          <span style={{ fontSize: "20px" }}>{n.i}</span>
          <span style={{ fontSize: "10px", marginTop: "2px", fontWeight: "bold" }}>{n.l}</span>
        </button>
      ))}
    </div>
  );
}
