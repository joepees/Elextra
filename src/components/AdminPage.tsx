/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, Users, Truck, CreditCard, Clock, CheckCircle2, AlertCircle, 
  Trash2, ShieldAlert, Plus, ShieldCheck, Database, RefreshCw, 
  Search, MapPin, Phone, Check, X, FileText, Bell, Store, Settings, 
  Sparkles, ClipboardList, Tag, ArrowRight, DollarSign, Power, HelpCircle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Order, Driver, User, FoodPlace, SellerWhatsAppNumber, WhatsAppLog, Mall } from "../types";
import { DRIVERS, today, FOOD_PLACES, MALLS_SHOPS, GROCERY_ITEMS, ELECTRONICS, CONSTRUCTION } from "../data";
import { DB } from "../db";
import { S } from "../styles";
import { InteractiveMap } from "./InteractiveMap";
import GeminiCopilotTab from "./GeminiCopilotTab.tsx";
import { ImageVerificationTab } from "./ImageVerificationTab";
import CatalogManagerTab from "./CatalogManagerTab";
import FoodCatalogManagerTab from "./FoodCatalogManagerTab";
import MallsManagerTab from "./MallsManagerTab";
import CrossSellManagerTab from "./CrossSellManagerTab";
import { sendPushNotification, PushNotificationManager } from "./PushNotificationManager";

// Web Audio API custom synthesized real-time delivery buzzer chime
function playOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    const playChirp = (frequency: number, delay: number, duration: number) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      }, delay);
    };

    // Double chirp high-pitched alert (similar to professional delivery tablets)
    playChirp(523.25, 0, 0.15);  // C5
    playChirp(659.25, 120, 0.20); // E5
  } catch (err) {
    console.warn("Chime failed to play:", err);
  }
}

export interface DispatchJob {
  id: string;
  orderId?: string;
  isDispatchJob?: boolean;
  progress?: number;
  service: "sameDay" | "nextDay" | "contractual" | "move";
  size: string;
  type: string;
  pickup: string;
  pickupAddr: string;
  destination: string;
  name: string;
  phone: string;
  status: "pending" | "assigned" | "collected" | "in-transit" | "delivered" | "canceled";
  date: string;
  fee: number;
  driver?: Driver;
  driverId?: string;
  driverName?: string;
  notes?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientIsSelf?: boolean;
  recipientPin?: string;
}

interface AdminPageProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  dispatchJobs: DispatchJob[];
  setDispatchJobs: React.Dispatch<React.SetStateAction<DispatchJob[]>>;
  user: any; // Staff object
  notify: (msg: string, type?: "ok" | "err") => void;
}

export function AdminPage({ 
  orders, 
  setOrders, 
  dispatchJobs, 
  setDispatchJobs, 
  user, 
  notify 
}: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [cityFilter, setCityFilter] = useState<string>(() => {
    if (user?.designatedLocation && (user.designatedLocation || "").toLowerCase() !== "all") {
      return (user.designatedLocation || "").toLowerCase();
    }
    return "all";
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchJob | null>(null);
  const [riderActiveTab, setRiderActiveTab] = useState<"jobs" | "earnings">("jobs");
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [riderLedger, setRiderLedger] = useState<any[]>([]);
  const [riderSubTab, setRiderSubTab] = useState<"fleet" | "payouts" | "ledger">("fleet");
  const [adjustingRiderId, setAdjustingRiderId] = useState<string | null>(null);
  const [adjType, setAdjType] = useState<"credit" | "debit">("credit");
  const [adjAmount, setAdjAmount] = useState<string>("");
  const [adjReason, setAdjReason] = useState<string>("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState<Record<string, string>>({});
  const [exportDailyOnly, setExportDailyOnly] = useState<boolean>(true);

  const handleExportCSV = (onlyToday = true) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const filtered = onlyToday
      ? riderLedger.filter(l => l.timestamp && l.timestamp.startsWith(todayStr))
      : riderLedger;

    if (filtered.length === 0) {
      notify(onlyToday ? "No transactions found for today to export." : "No ledger transactions found to export.", "err");
      return;
    }

    const headers = ["Transaction ID", "Rider ID", "Rider Name", "Type", "Amount (GHS)", "Description", "Timestamp", "Performed By"];
    const rows = filtered.map(l => [
      l.id || "",
      l.riderId || "",
      l.riderName || "",
      l.type || "",
      Number(l.amount || 0).toFixed(2),
      `"${(l.description || "").replace(/"/g, '""')}"`,
      l.timestamp || "",
      l.performedBy || ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `elextra_wallet_transactions_${onlyToday ? "today" : "all"}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`CSV export of ${filtered.length} transactions completed successfully! 🚀`, "ok");
  };

  const logLedgerEntry = async (riderId: string, riderName: string, type: string, amount: number, description: string, performedBy: string) => {
    try {
      const currentLedger = await DB.get("elx_rider_ledger") || [];
      const entry = {
        id: "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        riderId,
        riderName,
        type,
        amount,
        description,
        timestamp: new Date().toISOString(),
        performedBy
      };
      const updatedLedger = [entry, ...currentLedger];
      await syncDBKey("elx_rider_ledger", updatedLedger);
      setRiderLedger(updatedLedger);
    } catch (err) {
      console.error("Error logging ledger entry:", err);
    }
  };

  // Real-time polling & sound notifications state
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [lastPollTime, setLastPollTime] = useState<string>("");
  const [isPolling, setIsPolling] = useState(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const knownDispatchIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Lists and stats persisted in DB
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [handymanBookings, setHandymanBookings] = useState<any[]>([]);
  const [catalogProposals, setCatalogProposals] = useState<any[]>([]);
  const [customCatalog, setCustomCatalog] = useState<Record<string, any>>({});
  const [riderNotifications, setRiderNotifications] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [foodRequests, setFoodRequests] = useState<any[]>([]);
  const [foodPlaces, setFoodPlaces] = useState<any[]>([]);
  const [malls, setMalls] = useState<any[]>([]);

  const [handymenRegistry, setHandymenRegistry] = useState<any[]>([]);
  const [customizerPrices, setCustomizerPrices] = useState({
    baseRice: 15,
    boiledEgg: 4,
    veggies: 5,
    gari: 3,
    avocado: 4,
    spaghetti: 3,
    plantain: 5,
    meatBase: 20,
    fishBase: 20,
    royalFriedRice: 45,
    royalWaakye: 50,
    royalPlainRice: 40
  });

  // Coupons state
  const [couponsSetting, setCouponsSetting] = useState<any[]>([
    { code: "ELEXTRA50", discount: 50, desc: "GHS 50.00 Flat Off Coupon" },
    { code: "TARKWA_DRIVE", discount: 15, desc: "15% off delivery charges" }
  ]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponValue, setNewCouponValue] = useState("");

  // New handyman form states
  const [newHmName, setNewHmName] = useState("");
  const [newHmPhone, setNewHmPhone] = useState("");
  const [newHmSkill, setNewHmSkill] = useState("");
  const [newHmCity, setNewHmCity] = useState("Tarkwa");

  // New staff form states
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("manager");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [usersSubTab, setUsersSubTab] = useState("customers");

  // Food requests form states
  const [managerFoodReqType, setManagerFoodReqType] = useState<string>("ADD_ITEM");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [selectedFoodItemIndex, setSelectedFoodItemIndex] = useState<number>(-1);
  const [reqItemName, setReqItemName] = useState<string>("");
  const [reqItemPrice, setReqItemPrice] = useState<string>("");
  const [reqItemDesc, setReqItemDesc] = useState<string>("");
  const [reqItemImg, setReqItemImg] = useState<string>("");
  const [reqItemOnSale, setReqItemOnSale] = useState<boolean>(false);
  const [rejectionInputId, setRejectionInputId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState<string>("");

  // Seller Fast Food Menu Requests States
  const [sellerMenuReqType, setSellerMenuReqType] = useState<"ADD_ITEM" | "PRICE_ADJUSTMENT" | "REMOVE_ITEM" | "MARK_ON_SALE" | "EDIT_DETAILS">("ADD_ITEM");
  const [sellerReqItemName, setSellerReqItemName] = useState<string>("");
  const [sellerReqItemPrice, setSellerReqItemPrice] = useState<string>("");
  const [sellerReqItemDesc, setSellerReqItemDesc] = useState<string>("");
  const [sellerReqItemImg, setSellerReqItemImg] = useState<string>("");
  const [sellerReqItemOnSale, setSellerReqItemOnSale] = useState<boolean>(false);
  const [sellerActiveTab, setSellerActiveTab] = useState<"dashboard" | "menu" | "requests" | "orders">("dashboard");
  const [sellerReqFilter, setSellerReqFilter] = useState<"all" | "pending" | "approved" | "rejected" | "canceled">("all");

  // Management board and communication states
  const [managementMemos, setManagementMemos] = useState<any[]>([]);
  const [newMemoText, setNewMemoText] = useState<string>("");
  const [memoUrgent, setMemoUrgent] = useState<boolean>(false);
  const [memoRecipientId, setMemoRecipientId] = useState<string>("");

  // Manager candidate onboarding form states
  const [onboardType, setOnboardType] = useState<"seller" | "rider">("seller");
  const [onboardName, setOnboardName] = useState<string>("");
  const [onboardEmail, setOnboardEmail] = useState<string>("");
  const [onboardPhone, setOnboardPhone] = useState<string>("");
  const [onboardCategory, setOnboardCategory] = useState<string>("provisions");
  const [onboardAddress, setOnboardAddress] = useState<string>("");
  const [onboardVehicleType, setOnboardVehicleType] = useState<string>("Motorcycle");
  const [onboardPlateNumber, setOnboardPlateNumber] = useState<string>("");
  const [onboardPassword, setOnboardPassword] = useState<string>("");

  // Direct Add Joint Form States
  const [directJointName, setDirectJointName] = useState<string>("");
  const [directJointCuisine, setDirectJointCuisine] = useState<string>("");
  const [directJointCity, setDirectJointCity] = useState<string>("Tarkwa");
  const [directJointHours, setDirectJointHours] = useState<string>("8:00 AM - 10:00 PM");
  const [directJointImgUrl, setDirectJointImgUrl] = useState<string>("");
  const [directJointEmail, setDirectJointEmail] = useState<string>("");
  const [directJointPassword, setDirectJointPassword] = useState<string>("");

  // Settings configs
  const [settings, setSettings] = useState({
    mtnFee: "1.2",
    telecelFee: "1.0",
    primaryMomoNumber: "+233549001002",
    primaryMomoName: "ELEXTRA Logistics Ltd.",
    adminGateUser: "enyam66@gmail.com",
    adminGatePass: "Coded6123@",
    apiEndpoint: "https://api.elextra.xyz/v2",
    locations: [
      { id: "all", name: "All Areas", label: "🌐 All Areas (Tarkwa & Bogoso)", emoji: "🌐" },
      { id: "tarkwa", name: "Tarkwa", label: "🏙️ Tarkwa Only", emoji: "🏙️" },
      { id: "bogoso", name: "Bogoso", label: "🏘️ Bogoso Only", emoji: "🏘️" }
    ],
    aboutTitle: "ELEXTRA Delivery & Logistics",
    aboutVersion: "Version 2.4.1 Stable Node",
    aboutContent: "Providing reliable, high-speed instant dispatch and food delivery services for merchants and retail clients in Tarkwa, Bogoso, and neighboring municipalities in the Western Region of Ghana.",
    aboutFooter: "Developed under sandboxed infrastructure clearance nodes.",
    plusTitle: "Elextra Plus+ Subscription",
    plusPrice: "35",
    plusDescription: "Unlock GHS 0 Delivery Fees and premium fast-dispatch status on all runs.",
    plusBenefits: "Join the club of premium clients! For just ₵35/month, eliminate delivery commissions completely and receive real-time driver tracking prioritization."
  });

  const [newLocId, setNewLocId] = useState("");
  const [newLocName, setNewLocName] = useState("");
  const [newLocEmoji, setNewLocEmoji] = useState("📍");

  // Editing forms state
  const [editPriceProductId, setEditPriceProductId] = useState<string | null>(null);
  const [newPriceVal, setNewPriceVal] = useState("");

  // Setup initial states & listen to db changes
  useEffect(() => {
    const loadSharedState = async () => {
      let staff = await DB.get("elx_staff_accounts") || [];
      let migrated = false;
      staff = staff.map((s: any) => {
        if (s.id === "STAFF-004" && s.earnings === 140) {
          migrated = true;
          return { ...s, earnings: 0, completedJobsCount: 0 };
        }
        return s;
      });
      if (migrated) {
        await DB.set("elx_staff_accounts", staff);
      }
      const approvals = await DB.get("elx_pending_approvals") || [];
      const apps = await DB.get("elx_applications") || [];
      const handymen = await DB.get("elx_handyman_bookings") || [];
      const catProps = await DB.get("elx_catalog_proposals") || [];
      const custCat = await DB.get("elx_custom_catalog") || {};
      const riderNotifs = await DB.get("elx_rider_notifications") || [];
      const uList = await DB.get("elx_users") || [];
      const savedSettings = await DB.get("elx_settings") || settings;
      const savedCoupons = await DB.get("elx_coupons") || couponsSetting;
      const savedFoodReqs = await DB.get("elx_food_requests") || [];
      const savedFoodPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
      const savedMalls = await DB.get("elx_malls") || MALLS_SHOPS;
      const savedPayoutReqs = await DB.get("elx_payout_requests") || [];
      const savedMemos = await DB.get("elx_management_memos") || [];
      const savedLedger = await DB.get("elx_rider_ledger") || [];

      const registry = await DB.get("elx_handyman_registry") || [
        { id: "hm-1", name: "Akwasi Carpenter", phone: "+233241112222", skill: "Carpentry & Repairs", city: "Tarkwa" },
        { id: "hm-2", name: "Yaw Plumber", phone: "+233243334444", skill: "Plumbing & Leak Fixes", city: "Tarkwa" }
      ];
      const savedPrices = await DB.get("elx_customizer_prices") || {
        baseRice: 15,
        boiledEgg: 4,
        veggies: 5,
        gari: 3,
        avocado: 4,
        spaghetti: 3,
        plantain: 5,
        meatBase: 20,
        fishBase: 20,
        royalFriedRice: 45,
        royalWaakye: 50,
        royalPlainRice: 40
      };

      setStaffAccounts(staff);
      setPendingApprovals(approvals);
      setApplications(apps);
      setHandymanBookings(handymen);
      setCatalogProposals(catProps);
      setCustomCatalog(custCat);
      setRiderNotifications(riderNotifs);
      setUsersList(uList);
      setSettings({ ...settings, ...savedSettings });
      setCouponsSetting(savedCoupons);
      setHandymenRegistry(registry);
      setCustomizerPrices(savedPrices);
      setFoodRequests(savedFoodReqs);
      setFoodPlaces(savedFoodPlaces);
      setMalls(savedMalls);
      setPayoutRequests(savedPayoutReqs);
      setManagementMemos(savedMemos);
      setRiderLedger(savedLedger);
    };

    loadSharedState();

    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_staff_accounts") setStaffAccounts(value || []);
      else if (key === "elx_pending_approvals") setPendingApprovals(value || []);
      else if (key === "elx_applications") setApplications(value || []);
      else if (key === "elx_handyman_bookings") setHandymanBookings(value || []);
      else if (key === "elx_catalog_proposals") setCatalogProposals(value || []);
      else if (key === "elx_custom_catalog") setCustomCatalog(value || {});
      else if (key === "elx_rider_notifications") setRiderNotifications(value || []);
      else if (key === "elx_users") setUsersList(value || []);
      else if (key === "elx_settings") setSettings(prev => ({ ...prev, ...(value || {}) }));
      else if (key === "elx_coupons") setCouponsSetting(value || couponsSetting);
      else if (key === "elx_handyman_registry") setHandymenRegistry(value || []);
      else if (key === "elx_food_requests") setFoodRequests(value || []);
      else if (key === "elx_food_places") setFoodPlaces(value || []);
      else if (key === "elx_malls") setMalls(value || []);
      else if (key === "elx_payout_requests") setPayoutRequests(value || []);
      else if (key === "elx_management_memos") setManagementMemos(value || []);
      else if (key === "elx_rider_ledger") setRiderLedger(value || []);
      else if (key === "elx_customizer_prices") {
        if (value) setCustomizerPrices(value);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  // Real-time auto-refreshing polling loop for orders & dispatch jobs
  useEffect(() => {
    let intervalId: any;
    
    // Set initial known IDs on mount so we don't alert for existing orders
    if (orders && orders.length > 0) {
      orders.forEach(o => {
        if (o && o.id) knownOrderIdsRef.current.add(o.id);
      });
    }
    if (dispatchJobs && dispatchJobs.length > 0) {
      dispatchJobs.forEach(j => {
        if (j && j.id) knownDispatchIdsRef.current.add(j.id);
      });
    }
    
    // Allow the first load to settle before triggering chime alerts
    const timer = setTimeout(() => {
      isFirstLoadRef.current = false;
    }, 1500);

    setLastPollTime(new Date().toLocaleTimeString());

    const pollDatabase = async () => {
      setIsPolling(true);
      try {
        const res = await fetch("/api/db/sync");
        if (res.ok) {
          const data = await res.json();
          setLastPollTime(new Date().toLocaleTimeString());
          setIsLiveConnected(true);
          
          // 1. Sync orders and detect real-time incoming delivery requests
          if (data && data.elx_orders && Array.isArray(data.elx_orders)) {
            const incomingOrders: Order[] = data.elx_orders;
            
            let hasNewOrder = false;
            let newOrderCount = 0;
            
            incomingOrders.forEach(o => {
              if (o && o.id && !knownOrderIdsRef.current.has(o.id)) {
                knownOrderIdsRef.current.add(o.id);
                newOrderCount++;
                hasNewOrder = true;
              }
            });

            if (hasNewOrder && !isFirstLoadRef.current) {
              playOrderChime();
              notify(`📣 Real-time Alert: ${newOrderCount} new customer delivery request(s) received!`, "ok");
            }
            
            // Deduplicate and filter out nulls/invalid elements
            const seenIds = new Set();
            const cleanOrders = incomingOrders.filter(item => {
              if (!item || !item.id) return false;
              if (seenIds.has(item.id)) return false;
              seenIds.add(item.id);
              return true;
            });
            setOrders(cleanOrders);
          }

          // 2. Sync dispatch jobs and detect new logistics requests
          if (data && data.elx_dispatch && Array.isArray(data.elx_dispatch)) {
            const incomingDispatch: DispatchJob[] = data.elx_dispatch;
            
            let hasNewDispatch = false;
            let newDispatchCount = 0;
            
            incomingDispatch.forEach(j => {
              if (j && j.id && !knownDispatchIdsRef.current.has(j.id)) {
                knownDispatchIdsRef.current.add(j.id);
                newDispatchCount++;
                hasNewDispatch = true;
              }
            });

            if (hasNewDispatch && !isFirstLoadRef.current) {
              playOrderChime();
              notify(`🚚 Real-time Alert: New logistics dispatch job posted!`, "ok");
            }
            
            const seenJobIds = new Set();
            const cleanJobs = incomingDispatch.filter(item => {
              if (!item || !item.id) return false;
              if (seenJobIds.has(item.id)) return false;
              seenJobIds.add(item.id);
              return true;
            });
            setDispatchJobs(cleanJobs);
          }
        }
      } catch (err) {
        console.warn("Real-time auto-refresh polling failed:", err);
        setIsLiveConnected(false);
      } finally {
        setIsPolling(false);
      }
    };

    // Active real-time polling running every 1.5 seconds for active staff dashboard
    intervalId = setInterval(pollDatabase, 1500);
    
    // Dual mechanism: also bind to local elx_db_sync events for instant client-side refreshes
    const handleSyncEvent = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_orders" && Array.isArray(value)) {
        let hasNewOrder = false;
        value.forEach((o: any) => {
          if (o && o.id && !knownOrderIdsRef.current.has(o.id)) {
            knownOrderIdsRef.current.add(o.id);
            hasNewOrder = true;
          }
        });
        if (hasNewOrder && !isFirstLoadRef.current) {
          playOrderChime();
          notify("📣 Real-time Alert: Fresh customer order sync occurred!", "ok");
        }
        setOrders(value);
      } else if (key === "elx_dispatch" && Array.isArray(value)) {
        let hasNewDispatch = false;
        value.forEach((j: any) => {
          if (j && j.id && !knownDispatchIdsRef.current.has(j.id)) {
            knownDispatchIdsRef.current.add(j.id);
            hasNewDispatch = true;
          }
        });
        if (hasNewDispatch && !isFirstLoadRef.current) {
          playOrderChime();
        }
        setDispatchJobs(value);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSyncEvent);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timer);
      window.removeEventListener("elx_db_sync" as any, handleSyncEvent);
    };
  }, []);

  // Sync update helper
  const syncDBKey = async (key: string, data: any) => {
    await DB.set(key, data);
    window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key, value: data } }));
  };

  // Role Action check - Routes to approvals if sub_admin, manager, or seller (unless has direct editing privileges)
  const handleRoleAction = async (actionType: string, description: string, payload: any, executeDirectly: () => Promise<void> | void) => {
    const currentStaff = staffAccounts.find((s: any) => s.id === user?.id);
    const hasDirectEdit = currentStaff?.directEditing || false;

    if (user?.role && user.role !== "primary_admin" && !hasDirectEdit) {
      const newProposal = {
        id: "PROP-" + Date.now(),
        proposer: user.name,
        proposerEmail: user.email,
        actionType,
        description,
        payload,
        status: "pending",
        timestamp: new Date().toISOString()
      };
      const updated = [...pendingApprovals, newProposal];
      await syncDBKey("elx_pending_approvals", updated);
      
      // Dispatch push notification to primary_admin
      sendPushNotification(
        "🔔 New Clearance Proposal",
        `${user.name} (${user.role}) requested: ${description}`,
        {
          targetRole: ["primary_admin"],
          link: { page: "approvals" }
        }
      ).catch(e => console.error(e));

      notify("🛡️ Proposal submitted to primary admin for approval.", "ok");
    } else {
      await executeDirectly();
      if (hasDirectEdit && user?.role !== "primary_admin") {
        notify("⚡ Instantly updated via Direct Editing privilege! 🚀", "ok");
      }
    }
  };

  // Location Designation Filters for managers/sub-admins
  const filterByLocation = (locStr: any) => {
    if (!locStr || typeof locStr !== "string") return false;
    const lowerLoc = locStr.toLowerCase();
    if (user?.designatedLocation && (user.designatedLocation || "").toLowerCase() !== "all") {
      const target = (user.designatedLocation || "").toLowerCase(); // "tarkwa" or "bogoso"
      if (!lowerLoc.includes(target)) {
        return false;
      }
    }
    if (cityFilter !== "all") {
      return lowerLoc.includes(cityFilter);
    }
    return true;
  };

  const filteredOrders = orders.filter(o => {
    return filterByLocation(o.deliveryLocation || o.delivery);
  });

  const filteredDispatchJobs = dispatchJobs.filter(j => {
    return filterByLocation(j.pickup) || filterByLocation(j.destination);
  });

  const filteredHandymanBookings = handymanBookings.filter(bk => {
    const addressStr = `${bk.city || ""} ${bk.location || bk.address || ""}`.toLowerCase();
    return filterByLocation(addressStr);
  });

  const filteredFoodPlaces = foodPlaces.filter(place => {
    const addressStr = `${place.address || ""} ${place.city || ""}`.toLowerCase();
    return filterByLocation(addressStr);
  });

  // Metrics
  const totalOrdersSales = filteredOrders.reduce((sum, o) => o.status === "completed" ? sum + (o.total || 0) : sum, 0);
  const totalDispatchSales = filteredDispatchJobs.reduce((sum, j) => j.status === "delivered" ? sum + (j.fee || 0) : sum, 0);
  const grossSales = totalOrdersSales + totalDispatchSales;

  // Render Charts Data
  const chartData = [
    { name: "Mon", Sales: Math.round(grossSales * 0.1) || 240 },
    { name: "Tue", Sales: Math.round(grossSales * 0.15) || 380 },
    { name: "Wed", Sales: Math.round(grossSales * 0.12) || 310 },
    { name: "Thu", Sales: Math.round(grossSales * 0.22) || 540 },
    { name: "Fri", Sales: Math.round(grossSales * 0.28) || 720 },
    { name: "Sat", Sales: Math.round(grossSales * 0.35) || 980 },
    { name: "Sun", Sales: Math.round(grossSales) || 1200 },
  ];

  // ==========================================
  // RIDER ROLE CONSOLE RENDER
  // ==========================================
  if (user?.role === "rider") {
    const activeRiderLogisticsJobs = dispatchJobs.filter(
      j => j.driverId === user.id && j.status !== "delivered" && j.status !== "canceled"
    ).map(j => ({ ...j, isDispatchJob: true }));

    const activeRiderOrderJobs = orders.filter(
      o => (o.driver?.id === user.id || o.driver?.name === user.name) && 
           o.status !== "delivered" && o.status !== "completed" && o.status !== "canceled"
    ).map(o => ({
      id: o.id,
      service: "sameDay" as const,
      size: `${o.items.length} Items`,
      type: "Store Order",
      pickup: o.items[0]?.shop || "Elextra Store Outlet",
      pickupAddr: "Tarkwa Central",
      destination: o.deliveryLocation || "Tarkwa Center",
      name: o.recipientName || "Customer",
      phone: o.recipientPhone || "N/A",
      status: o.status as any,
      date: o.date,
      fee: o.delivFee || 15,
      recipientPin: o.recipientPin || "4491",
      isDispatchJob: false,
      progress: o.progress !== undefined ? Number(o.progress) : 10,
      isPaid: o.isPaid
    }));

    const activeRiderJobs = [...activeRiderLogisticsJobs, ...activeRiderOrderJobs];
    const notifications = riderNotifications.filter(n => n.recipientId === user.id);
    const riderAccount = staffAccounts.find((s: any) => s.id === user.id) || user;

    // Filter unassigned dispatch jobs that are around this rider's location
    const unassignedJobs = dispatchJobs.filter(j => {
      if (!j) return false;
      const isUnassigned = !j.driverId && j.status === "pending";
      if (!isUnassigned) return false;

      const riderLoc = ((riderAccount && riderAccount.designatedLocation) || "all").toLowerCase();
      if (riderLoc === "all") return true;

      // Check if job matches Tarkwa or Bogoso
      const pickupStr = `${j.pickup || ""} ${j.pickupAddr || ""}`.toLowerCase();
      const destStr = (j.destination || "").toLowerCase();
      
      return pickupStr.includes(riderLoc) || destStr.includes(riderLoc);
    });

    const handleApplyForJob = async (jobId: string) => {
      // 1. Update the dispatch job
      const updatedJobs = dispatchJobs.map(j => {
        if (j.id === jobId) {
          return {
            ...j,
            status: "assigned" as const,
            driverId: user.id,
            driverName: user.name,
            progress: 15
          };
        }
        return j;
      });
      await syncDBKey("elx_dispatch", updatedJobs);
      setDispatchJobs(updatedJobs);

      // 2. If it's linked to an order, update the order as well
      const targetJob = dispatchJobs.find(j => j.id === jobId);
      if (targetJob && targetJob.orderId) {
        const updatedOrders = orders.map(o => {
          if (o.id === targetJob.orderId) {
            return {
              ...o,
              status: "preparing" as const,
              progress: 15,
              driver: {
                id: user.id,
                name: user.name,
                plate: riderAccount.plateNumber || "GW-RIDER-26",
                phone: riderAccount.phone || ""
              }
            };
          }
          return o;
        });
        await syncDBKey("elx_orders", updatedOrders);
      }

      notify(`Job #${jobId} has been successfully applied for and automatically granted! 🎉`, "ok");
    };

    const toggleOnlineStatus = async () => {
      const updatedStaff = staffAccounts.map((s: any) => {
        if (s.id === user.id) {
          const newStatus = s.status === "active" ? "offline" : "active";
          notify(`You are now ${newStatus.toUpperCase()}`, "ok");
          return { ...s, status: newStatus };
        }
        return s;
      });
      await syncDBKey("elx_staff_accounts", updatedStaff);
    };

    const handleAcceptJob = async (jobId: string, isDispatchJob: boolean) => {
      if (isDispatchJob) {
        const updated = dispatchJobs.map(j => {
          if (j.id === jobId) return { ...j, status: "in-transit" as const, progress: 30 };
          return j;
        });
        await syncDBKey("elx_dispatch", updated);
      } else {
        const updated = orders.map(o => {
          if (o.id === jobId) return { ...o, status: "in-transit" as const, progress: 30 };
          return o;
        });
        await syncDBKey("elx_orders", updated);
      }
      notify("Delivery accepted! Live Navigation co-pilot initialized.", "ok");
    };

    const handleDeclineJob = async (jobId: string, isDispatchJob: boolean) => {
      if (isDispatchJob) {
        const updated = dispatchJobs.map(j => {
          if (j.id === jobId) return { ...j, status: "pending" as const, driverId: undefined, driverName: undefined, progress: undefined };
          return j;
        });
        await syncDBKey("elx_dispatch", updated);
      } else {
        const updated = orders.map(o => {
          if (o.id === jobId) return { ...o, status: "confirmed" as const, progress: 10 };
          return o;
        });
        await syncDBKey("elx_orders", updated);
      }
      notify("Delivery returned to pending logistics pool.", "err");
    };

    const handleCompleteJob = async (jobId: string, isDispatchJob: boolean, inputPin: string) => {
      const targetJob = activeRiderJobs.find(j => j.id === jobId);
      if (!targetJob) return;

      const correctPin = targetJob.recipientPin || "4491";
      if (inputPin.trim() !== correctPin) {
        notify("Incorrect client verification PIN. Ask customer for delivery pin code.", "err");
        return;
      }

      const deliveryFee = targetJob.fee || 35;
      const riderPortion = Number((deliveryFee * 0.70).toFixed(2));
      const elextraPortion = Number((deliveryFee * 0.30).toFixed(2));

      if (isDispatchJob) {
        const updatedJobs = dispatchJobs.map(j => {
          if (j.id === jobId) return { ...j, status: "delivered" as const, progress: 100 };
          return j;
        });
        await syncDBKey("elx_dispatch", updatedJobs);
      } else {
        const updatedOrders = orders.map(o => {
          if (o.id === jobId) return { ...o, status: "delivered" as const, progress: 100 };
          return o;
        });
        await syncDBKey("elx_orders", updatedOrders);
      }

      // Increment rider stats and earnings (Current Upload Balance gets 70% split)
      const updatedStaff = staffAccounts.map((s: any) => {
        if (s.id === user.id) {
          return {
            ...s,
            earnings: Number(((s.earnings || 0) + riderPortion).toFixed(2)),
            completedJobsCount: (s.completedJobsCount || 0) + 1
          };
        }
        return s;
      });
      await syncDBKey("elx_staff_accounts", updatedStaff);

      await logLedgerEntry(
        user.id,
        user.name,
        "delivery_earnings",
        riderPortion,
        `Earned 70% delivery fee (GHS ${riderPortion.toFixed(2)}) for completed job #${jobId}. Elextra 30% commission (GHS ${elextraPortion.toFixed(2)}) deducted. Path: ${targetJob.pickup} ➔ ${targetJob.destination}`,
        "system"
      );

      notify(`Delivery completed! GHS ${riderPortion.toFixed(2)} (70%) credited to your Upload Balance, GHS ${elextraPortion.toFixed(2)} (30%) Elextra platform split applied.`, "ok");
    };

    const handleUpdateProgress = async (jobId: string, isDispatchJob: boolean, progress: number) => {
      let status: any = "in-transit";
      if (progress <= 15) {
        status = "confirmed";
      } else if (progress <= 40) {
        status = "preparing";
      } else if (progress <= 70) {
        status = "collected";
      } else if (progress < 100) {
        status = "in-transit";
      } else {
        status = "in-transit"; // Remain in transit until PIN is verified
      }

      if (isDispatchJob) {
        const updated = dispatchJobs.map(j => {
          if (j.id === jobId) return { ...j, progress, status };
          return j;
        });
        await syncDBKey("elx_dispatch", updated);
      } else {
        const updated = orders.map(o => {
          if (o.id === jobId) return { ...o, progress, status };
          return o;
        });
        await syncDBKey("elx_orders", updated);
      }

      // Compute mock coordinates along the quadratic Bezier highway and stream live GPS websocket broadcast
      const fra = progress / 100;
      const markerX = (1 - fra) * (1 - fra) * 45 + 2 * (1 - fra) * fra * 250 + fra * fra * 455;
      const markerY = (1 - fra) * (1 - fra) * 115 + 2 * (1 - fra) * fra * 35 + fra * fra * 115;

      const baseLat = 5.303; // Tarkwa Center
      const baseLng = -1.984;
      const mockLat = baseLat + (markerY - 115) * 0.0005;
      const mockLng = baseLng + (markerX - 45) * 0.0008;

      DB.sendGpsUpdate(jobId, mockLat, mockLng, progress);
    };

    const [payoutPhone, setPayoutPhone] = useState("");
    const [payoutNetwork, setPayoutNetwork] = useState("MTN MoMo");
    const [payoutName, setPayoutName] = useState("");

    const completedLogistics = dispatchJobs.filter(
      j => j.driverId === user.id && j.status === "delivered"
    );
    const completedStoreOrders = orders.filter(
      o => (o.driver?.id === user.id || o.driver?.name === user.name) && o.status === "delivered"
    );
    const riderCompletedJobs = [
      ...completedLogistics.map(j => ({ ...j, isDispatchJob: true })),
      ...completedStoreOrders.map(o => ({
        id: o.id,
        fee: o.delivFee || 15,
        isDispatchJob: false,
        date: o.date
      }))
    ];
    const totalFeesEarned = riderCompletedJobs.reduce((sum, j) => sum + Number((j as any).fee || 0), 0);
    const totalTipsEarned = riderCompletedJobs.reduce((sum, j) => sum + Number((j as any).tip || 0), 0);
    const myPayouts = payoutRequests.filter(p => p.riderId === user.id);

    return (
      <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
        {/* Rider Header */}
        <div style={{ ...S.sec, background: "linear-gradient(135deg, #10b981, #047857)", color: "white", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "bold", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "10px" }}>
                Active Courier Node
              </span>
              <h2 style={{ fontSize: "24px", fontWeight: 900, marginTop: "4px" }}>Welcome, {riderAccount.name}!</h2>
              <p style={{ fontSize: "12px", opacity: 0.9 }}>Vehicle Plate: <strong>{riderAccount.plateNumber || "N/A"}</strong> ({riderAccount.vehicleType || "Motorcycle"})</p>
            </div>

            <button 
              onClick={toggleOnlineStatus}
              style={{
                background: riderAccount.status === "active" ? "#dc2626" : "#10b981",
                border: "2.5px solid white",
                color: "white",
                borderRadius: "30px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Power size={14} />
              {riderAccount.status === "active" ? "GO OFFLINE" : "GO ONLINE"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "10px" }}>
            <div>
              <div style={{ fontSize: "10px", opacity: 0.8 }}>ACCUMULATED WALLET BALANCE</div>
              <div style={{ fontSize: "20px", fontWeight: 900 }}>GHS {(riderAccount.earnings || 0).toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", opacity: 0.8 }}>COMPLETED LOGISTICS JOBS</div>
              <div style={{ fontSize: "20px", fontWeight: 900 }}>{riderAccount.completedJobsCount || 0} Delivered</div>
            </div>
          </div>

          {/* ABOUT APP BRANDING CONFIGURATION */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
              ℹ️ About App Branding Configuration
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>About Title</label>
                  <input 
                    style={S.inp} 
                    value={settings.aboutTitle || ""} 
                    onChange={e => setSettings({ ...settings, aboutTitle: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>App Build Version</label>
                  <input 
                    style={S.inp} 
                    value={settings.aboutVersion || ""} 
                    onChange={e => setSettings({ ...settings, aboutVersion: e.target.value })} 
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>About Narrative / Content Text</label>
                <textarea 
                  style={{ ...S.inp, height: "80px", fontFamily: "inherit", resize: "none" }} 
                  value={settings.aboutContent || ""} 
                  onChange={e => setSettings({ ...settings, aboutContent: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Footer Compliance / License Text</label>
                <input 
                  style={S.inp} 
                  value={settings.aboutFooter || ""} 
                  onChange={e => setSettings({ ...settings, aboutFooter: e.target.value })} 
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={async () => {
                    await syncDBKey("elx_settings", settings);
                    notify("Branding details successfully updated!", "ok");
                  }}
                  style={{ ...S.cta, width: "200px" }}
                >
                  Save About Config
                </button>
              </div>
            </div>
          </div>

          {/* ELEXTRA PLUS PREMIUM SUBSCRIPTION TERMS */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#8b5cf6", display: "flex", alignItems: "center", gap: "6px" }}>
              👑 Elextra Plus Premium Pricing & Membership Terms
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Subscription Tier Title</label>
                  <input 
                    style={S.inp} 
                    value={settings.plusTitle || ""} 
                    onChange={e => setSettings({ ...settings, plusTitle: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Monthly Pricing (GHS)</label>
                  <input 
                    type="number"
                    style={S.inp} 
                    value={settings.plusPrice || ""} 
                    onChange={e => setSettings({ ...settings, plusPrice: e.target.value })} 
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Short Description Tagline</label>
                <input 
                  style={S.inp} 
                  value={settings.plusDescription || ""} 
                  onChange={e => setSettings({ ...settings, plusDescription: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Detailed Plus Membership Benefits Narrative</label>
                <textarea 
                  style={{ ...S.inp, height: "80px", fontFamily: "inherit", resize: "none" }} 
                  value={settings.plusBenefits || ""} 
                  onChange={e => setSettings({ ...settings, plusBenefits: e.target.value })} 
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={async () => {
                    await syncDBKey("elx_settings", settings);
                    notify("Elextra Plus Subscription parameters updated!", "ok");
                  }}
                  style={{ ...S.cta, width: "200px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                >
                  Save Plus Config
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
          <button
            onClick={() => setRiderActiveTab("jobs")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "13px",
              cursor: "pointer",
              background: riderActiveTab === "jobs" ? "#10b981" : "transparent",
              color: riderActiveTab === "jobs" ? "white" : "#475569",
              transition: "all 0.2s"
            }}
          >
            📋 My Deliveries & Jobs ({activeRiderJobs.length})
          </button>
          <button
            onClick={() => setRiderActiveTab("earnings")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "13px",
              cursor: "pointer",
              background: riderActiveTab === "earnings" ? "#10b981" : "transparent",
              color: riderActiveTab === "earnings" ? "white" : "#475569",
              transition: "all 0.2s"
            }}
          >
            💰 My Earnings & Payouts History
          </button>
          <button
            onClick={() => setRiderActiveTab("suggestions")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "13px",
              cursor: "pointer",
              background: riderActiveTab === "suggestions" ? "#10b981" : "transparent",
              color: riderActiveTab === "suggestions" ? "white" : "#475569",
              transition: "all 0.2s"
            }}
          >
            💡 Suggest Vendor/Shop
          </button>
        </div>

        {/* TAB 1: ACTIVE JOBS */}
        {riderActiveTab === "jobs" && (
          <div>
            {/* Live Rider Notifications */}
            {notifications.length > 0 && (
              <div style={{ ...S.sec, borderColor: "#3b82f6", background: "#f0f7ff", marginBottom: "20px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Bell size={16} className="animate-bounce" /> Live Assignment Notifications ({notifications.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ background: "white", padding: "10px", borderRadius: "8px", border: "1.5px solid #bfdbfe", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", color: "#1e40af" }}>{n.message}</div>
                      <button 
                        onClick={async () => {
                          const updated = riderNotifications.filter(x => x.id !== n.id);
                          await syncDBKey("elx_rider_notifications", updated);
                        }}
                        style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AVAILABLE OPEN JOBS (Apply & Auto-Grant) */}
            <div style={{ ...S.sec, borderColor: "#10b981", background: "rgba(16, 185, 129, 0.03)", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "#065f46", display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                🌍 Open Dispatch Jobs (Auto-Assign Near You)
              </h3>
              <p style={{ fontSize: "11px", color: "#047857", marginBottom: "12px" }}>
                Riders in {riderAccount.designatedLocation?.toUpperCase() || "TARKWA"} or nearby can apply for these active dispatch jobs and get auto-granted instantly.
              </p>
              {unassignedJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px", color: "#047857", fontSize: "11.5px", background: "white", borderRadius: "8px", border: "1px dashed #a7f3d0" }}>
                  ✨ No open dispatch jobs currently in your territory. Check back soon!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {unassignedJobs.map(job => {
                    return (
                      <div key={job.id} style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1.5px solid #a7f3d0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "11px", background: "#d1fae5", color: "#065f46", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                              {job.type?.replace("_", " ").toUpperCase() || "DELIVERY"}
                            </span>
                            <strong style={{ fontSize: "13px", color: "#065f46" }}>#{job.id}</strong>
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#1f2937", marginTop: "4px" }}>
                            📍 From: <strong>{job.pickup}</strong> → To: <strong>{job.destination}</strong>
                          </div>
                          <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
                            📦 Size: {job.size || "Standard Package"} · Fee: <strong style={{ color: "#10b981" }}>GH₵ {job.fee?.toFixed(2) || "15.00"}</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApplyForJob(job.id)}
                          style={{
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px 14px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            transition: "transform 0.1s",
                            boxShadow: "0 2px 4px rgba(16,185,129,0.2)"
                          }}
                        >
                          ⚡ Apply & Get Granted
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px" }}>📋 Assigned Jobs Queue</h3>
            {activeRiderJobs.length === 0 ? (
              <div style={{ ...S.sec, textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                <Truck size={36} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                <p style={{ fontSize: "13px", fontWeight: "bold" }}>No Active Deliveries Assigned</p>
                <p style={{ fontSize: "11px", marginTop: "4px" }}>Keep your online status active to receive dispatches from managers.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {activeRiderJobs.map(job => (
                  <RiderJobCard 
                    key={job.id} 
                    job={job} 
                    onAccept={handleAcceptJob} 
                    onDecline={handleDeclineJob} 
                    onComplete={handleCompleteJob} 
                    onUpdateProgress={handleUpdateProgress} 
                    foodPlaces={foodPlaces}
                    malls={malls}
                    showPin={user?.role === "primary_admin" || user?.role === "sub_admin"}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EARNINGS & PAYOUTS */}
        {riderActiveTab === "earnings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Summary Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div style={{ ...S.sec, background: "#f8fafc", padding: "12px" }}>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>DELIVERY FEES EARNED</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>GHS {totalFeesEarned.toFixed(2)}</div>
              </div>
              <div style={{ ...S.sec, background: "#ecfdf5", padding: "12px" }}>
                <div style={{ fontSize: "10px", color: "#047857", fontWeight: "bold" }}>TIPS COLLECTED</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#047857" }}>GHS {totalTipsEarned.toFixed(2)}</div>
              </div>
              <div style={{ ...S.sec, background: "#fffbeb", padding: "12px" }}>
                <div style={{ fontSize: "10px", color: "#b45309", fontWeight: "bold" }}>CURRENT UNPAID BAL</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#b45309" }}>GHS {(riderAccount.earnings || 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Cash Out Request Form */}
            <div style={S.sec}>
              <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "6px", marginBottom: "12px", color: "#10b981" }}>
                💸 Request Mobile Money (MoMo) Payout
              </h4>
              
              {riderAccount.earnings <= 0 ? (
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                  You have GHS 0.00 outstanding balance. Earn delivery fees first to cash out!
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>MoMo Provider</label>
                      <select 
                        value={payoutNetwork} 
                        onChange={e => setPayoutNetwork(e.target.value)} 
                        style={S.inp}
                      >
                        <option value="MTN MoMo">MTN Mobile Money</option>
                        <option value="Telecel Cash">Telecel Cash</option>
                        <option value="AT Money">AT Money (AirtelTigo)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>MoMo Wallet Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Samuel Kofi" 
                        value={payoutName} 
                        onChange={e => setPayoutName(e.target.value)} 
                        style={S.inp} 
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Mobile Wallet Phone Number (+233)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0540123456" 
                      value={payoutPhone} 
                      onChange={e => setPayoutPhone(e.target.value)} 
                      style={S.inp} 
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!payoutPhone || !payoutName) {
                        notify("Please enter MoMo name and phone number.", "err");
                        return;
                      }
                      const requestAmount = riderAccount.earnings;
                      const newRequest = {
                        id: "PAY-" + Date.now(),
                        riderId: user.id,
                        riderName: user.name,
                        amount: requestAmount,
                        provider: payoutNetwork,
                        walletName: payoutName,
                        walletPhone: payoutPhone,
                        status: "pending",
                        requestedAt: new Date().toISOString()
                      };

                      // Clear rider earnings locally/db to show "requested" status
                      const updatedStaff = staffAccounts.map((s: any) => {
                        if (s.id === user.id) {
                          return { ...s, earnings: 0 };
                        }
                        return s;
                      });

                      const updatedPayouts = [newRequest, ...payoutRequests];
                      await syncDBKey("elx_payout_requests", updatedPayouts);
                      await syncDBKey("elx_staff_accounts", updatedStaff);

                      setPayoutRequests(updatedPayouts);
                      setPayoutPhone("");
                      setPayoutName("");

                      await logLedgerEntry(
                        user.id,
                        user.name,
                        "payout_request",
                        requestAmount,
                        `Requested MoMo payout of GHS ${requestAmount.toFixed(2)} to ${payoutPhone} (${payoutNetwork})`,
                        user.name
                      );

                      notify(`Payout of GHS ${requestAmount.toFixed(2)} requested successfully! MoMo transfer pending clearance. 🚀`, "ok");
                    }}
                    style={{ ...S.cta, background: "#10b981", marginTop: "8px" }}
                  >
                    🚀 Withdraw GHS {(riderAccount.earnings || 0).toFixed(2)} to Mobile Money
                  </button>
                </div>
              )}
            </div>

            {/* Payout Logs */}
            <div style={S.sec}>
              <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "6px", marginBottom: "12px", color: "#1e293b" }}>
                📜 Payout Logs & Status
              </h4>
              {myPayouts.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>No payout requests logged yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                  {myPayouts.map((p: any) => (
                    <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "bold" }}>GHS {Number(p.amount).toFixed(2)}</div>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>{p.provider} · {p.walletPhone} ({p.walletName})</div>
                          <div style={{ fontSize: "9px", color: "#94a3b8" }}>{new Date(p.requestedAt).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: p.status === "approved" ? "#d1fae5" : p.status === "pending" ? "#fef3c7" : "#fee2e2",
                            color: p.status === "approved" ? "#065f46" : p.status === "pending" ? "#b45309" : "#991b1b"
                          }}>
                            {p.status?.toUpperCase() || "PENDING"}
                          </span>
                        </div>
                      </div>

                      {p.status === "approved" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: p.riderConfirmedReceived ? "#ecfdf5" : "#fff", padding: "6px 10px", borderRadius: "6px", border: p.riderConfirmedReceived ? "1px solid #86efac" : "1px solid #cbd5e1" }}>
                          <input
                            type="checkbox"
                            id={`rider-confirm-rec-${p.id}`}
                            checked={p.riderConfirmedReceived || false}
                            disabled={p.riderConfirmedReceived || false}
                            onChange={async (e) => {
                              if (p.riderConfirmedReceived) return;
                              const checked = e.target.checked;
                              if (!checked) return;
                              const updatedPayouts = payoutRequests.map((r: any) => {
                                if (r.id === p.id) {
                                  return {
                                    ...r,
                                    riderConfirmedReceived: true,
                                    riderConfirmedAt: new Date().toISOString()
                                  };
                                }
                                return r;
                              });
                              await syncDBKey("elx_payout_requests", updatedPayouts);
                              setPayoutRequests(updatedPayouts);
                              notify("Payment receipt successfully confirmed! Admins notified. ✅", "ok");
                            }}
                            style={{ width: "15px", height: "15px", cursor: p.riderConfirmedReceived ? "default" : "pointer", accentColor: "#10b981" }}
                          />
                          <label htmlFor={`rider-confirm-rec-${p.id}`} style={{ fontSize: "11px", fontWeight: "bold", color: p.riderConfirmedReceived ? "#166534" : "#475569", cursor: p.riderConfirmedReceived ? "default" : "pointer", userSelect: "none" }}>
                            {p.riderConfirmedReceived ? "✅ Money Received & Confirmed" : "⬜ Confirm Money Received"}
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Synced Wallet Transaction Ledger */}
            <div style={S.sec}>
              <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "6px", marginBottom: "12px", color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>💳 Synced Wallet Ledger History</span>
                <span style={{ fontSize: "10px", background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: "4px" }}>
                  Real-time sync
                </span>
              </h4>
              {riderLedger.filter((l: any) => l.riderId === user.id).length === 0 ? (
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>No wallet transaction ledger entries found yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {riderLedger.filter((l: any) => l.riderId === user.id).map((l: any) => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{
                            fontSize: "9px",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: l.type?.includes("credit") || l.type === "delivery_earnings" ? "#ecfdf5" : "#fef2f2",
                            color: l.type?.includes("credit") || l.type === "delivery_earnings" ? "#059669" : "#dc2626"
                          }}>
                            {l.type?.replace("_", " ").toUpperCase()}
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {new Date(l.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#1e293b", margin: "4px 0 0 0", fontWeight: 500 }}>
                          {l.description}
                        </p>
                        <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
                          Ref: {l.id} · Performed by: {l.performedBy}
                        </div>
                      </div>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: l.type?.includes("credit") || l.type === "delivery_earnings" ? "#10b981" : "#ef4444"
                      }}>
                        {l.type?.includes("credit") || l.type === "delivery_earnings" ? "+" : "-"} GHS {Number(l.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Job History logs */}
            <div style={S.sec}>
              <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "6px", marginBottom: "12px", color: "#1e293b" }}>
                📦 Completed Deliveries History logs
              </h4>
              {riderCompletedJobs.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>No completed jobs registered in history.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {riderCompletedJobs.map((j: any) => (
                    <div key={j.id} style={{ padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <strong>Job ID: #{j.id}</strong>
                        <span style={{ color: "#10b981", fontWeight: "bold" }}>DELIVERED</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                        Route: {j.pickup} ➔ {j.destination}<br />
                        Fee: <strong>GHS {j.fee}</strong> {j.tip ? `· Tip: GHS ${j.tip}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: SUGGEST A VENDOR OR SHOP */}
        {riderActiveTab === "suggestions" && (
          <RiderSuggestionForm 
            user={user} 
            notify={notify} 
            handleRoleAction={handleRoleAction} 
          />
        )}
      </div>
    );
  }

  // ==========================================
  // SELLER ROLE CONSOLE RENDER
  // ==========================================
  if (user?.role === "seller") {
    // Determine product category
    const sellerCategory = user.shopId || "provisions";
    const categoryLabel = user.shopName || "Tarkwa Central Provisions";

    // Filter products matching seller categories
    const sellerProducts = [...GROCERY_ITEMS, ...ELECTRONICS, ...CONSTRUCTION].filter(p => {
      if (sellerCategory === "provisions") return p.id.startsWith("gro-");
      if (sellerCategory === "electronics") return p.id.startsWith("ele-");
      if (sellerCategory === "construction") return p.id.startsWith("con-");
      return true;
    });

    const sellerPlace = foodPlaces.find((p: any) => p.id === user.shopId) || foodPlaces[0];
    const isFoodSeller = !["provisions", "electronics", "construction"].includes(sellerCategory);

    // Filter orders specific to this seller
    const sellerOrders = orders.filter(o => {
      if (isFoodSeller) {
        return o.items?.some((it: any) => it.restaurantId === sellerPlace?.id || it.shopId === sellerPlace?.id);
      }
      return o.items?.some((it: any) => {
        if (sellerCategory === "provisions") return it.id?.startsWith("gro-") || it.category === "groceries" || !it.id;
        if (sellerCategory === "electronics") return it.id?.startsWith("ele-") || it.category === "electronics";
        if (sellerCategory === "construction") return it.id?.startsWith("con-") || it.category === "construction";
        return true;
      });
    });

    // Propose price change for standard merchandise
    const handleProposePriceChange = async (productId: string, name: string, currentPrice: number, proposedPrice: number) => {
      if (!proposedPrice || proposedPrice <= 0) {
        notify("Please provide a valid market price update value.", "err");
        return;
      }

      const proposal = {
        id: "CAT-PRO-" + Date.now(),
        shopId: sellerCategory,
        shopName: categoryLabel,
        productId,
        productName: name,
        originalPrice: currentPrice,
        proposedPrice,
        status: "pending",
        proposer: user.name,
        submittedAt: new Date().toISOString()
      };

      const updated = [...catalogProposals, proposal];
      await syncDBKey("elx_catalog_proposals", updated);
      setCatalogProposals(updated);
      setEditPriceProductId(null);
      setNewPriceVal("");
      notify("Price adjustment proposal submitted for Primary Admin clearance.", "ok");
    };

    // Cancel pending food request
    const handleCancelFoodRequest = async (requestId: string) => {
      try {
        const updatedRequests = foodRequests.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: "canceled" as const,
              approvalHistory: [
                ...(r.approvalHistory || []),
                {
                  status: "canceled",
                  timestamp: new Date().toISOString(),
                  actor: user.name,
                  details: `Withdrawn and canceled by vendor ${user.name}.`
                }
              ]
            };
          }
          return r;
        });
        await syncDBKey("elx_food_requests", updatedRequests);
        setFoodRequests(updatedRequests);
        notify("Modification request has been successfully canceled.", "ok");
      } catch (err) {
        notify("Failed to cancel modification request.", "err");
      }
    };

    // Cancel pending catalog proposal
    const handleCancelCatalogProposal = async (proposalId: string) => {
      try {
        const updated = catalogProposals.map(p => {
          if (p.id === proposalId) {
            return { ...p, status: "canceled" as const };
          }
          return p;
        });
        await syncDBKey("elx_catalog_proposals", updated);
        setCatalogProposals(updated);
        notify("Price proposal has been successfully canceled.", "ok");
      } catch (err) {
        notify("Failed to cancel price proposal.", "err");
      }
    };

    // Aggregate requests for tracking
    const activeModifications = (() => {
      if (isFoodSeller) {
        // filter food requests belonging to this restaurant
        return foodRequests.filter((r: any) => r.restaurantId === sellerPlace?.id);
      } else {
        // filter catalog proposals belonging to this shop category
        return catalogProposals.filter((p: any) => p.shopId === sellerCategory);
      }
    })();

    // Count states
    const pendingModificationsCount = activeModifications.filter((m: any) => m.status === "pending" || !m.status).length;
    const activeOrdersCount = sellerOrders.filter(o => o.status !== "delivered" && o.status !== "canceled").length;
    const totalMenuCount = isFoodSeller ? (sellerPlace?.menu?.length || 0) : sellerProducts.length;

    return (
      <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
        
        {/* PREMIUM SELLER HEADER */}
        <div style={{ 
          background: "linear-gradient(135deg, #1e293b, #0f172a)", 
          padding: "24px", 
          borderRadius: "16px", 
          color: "white", 
          marginBottom: "20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ 
                fontSize: "10px", 
                textTransform: "uppercase", 
                fontWeight: "black", 
                background: "linear-gradient(135deg, #ec4899, #db2777)", 
                padding: "3px 10px", 
                borderRadius: "20px" 
              }}>
                Vendor Partner Portal
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>ID: {user.shopId || "standard"}</span>
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 900, letterSpacing: "-0.5px" }}>
              Welcome, {user.name}!
            </h2>
            <p style={{ fontSize: "14px", color: "#cbd5e1", marginTop: "4px" }}>
              Trading name: <strong style={{ color: "#ec4899" }}>{categoryLabel}</strong> · Category: {isFoodSeller ? "FAST FOOD JOINT" : sellerCategory.toUpperCase()}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", borderRadius: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>LIVE ITEMS</span>
              <strong style={{ fontSize: "16px", color: "#ec4899" }}>{totalMenuCount}</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", borderRadius: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>PENDING CLEARANCE</span>
              <strong style={{ fontSize: "16px", color: "#f59e0b" }}>{pendingModificationsCount}</strong>
            </div>
          </div>
        </div>

        {/* TACTILE SELLER TABS ROW */}
        <div style={{ 
          display: "flex", 
          gap: "8px", 
          marginBottom: "24px", 
          borderBottom: "1px solid #e2e8f0", 
          paddingBottom: "8px",
          overflowX: "auto"
        }}>
          <button 
            onClick={() => setSellerActiveTab("dashboard")}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: sellerActiveTab === "dashboard" ? "#fdf2f8" : "transparent",
              color: sellerActiveTab === "dashboard" ? "#db2777" : "#475569",
              fontWeight: "bold",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
          >
            <TrendingUp size={16} /> Dashboard Overview
          </button>
          
          <button 
            onClick={() => setSellerActiveTab("menu")}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: sellerActiveTab === "menu" ? "#fdf2f8" : "transparent",
              color: sellerActiveTab === "menu" ? "#db2777" : "#475569",
              fontWeight: "bold",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
          >
            <Store size={16} /> Menu & Catalog Manager
          </button>

          <button 
            onClick={() => setSellerActiveTab("requests")}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: sellerActiveTab === "requests" ? "#fdf2f8" : "transparent",
              color: sellerActiveTab === "requests" ? "#db2777" : "#475569",
              fontWeight: "bold",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              position: "relative",
              transition: "all 0.2s"
            }}
          >
            <RefreshCw size={16} /> Modification Tracker
            {pendingModificationsCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#f59e0b",
                color: "white",
                fontSize: "10px",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold"
              }}>
                {pendingModificationsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setSellerActiveTab("orders")}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: sellerActiveTab === "orders" ? "#fdf2f8" : "transparent",
              color: sellerActiveTab === "orders" ? "#db2777" : "#475569",
              fontWeight: "bold",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              position: "relative",
              transition: "all 0.2s"
            }}
          >
            <ClipboardList size={16} /> Store Orders
            {activeOrdersCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#ec4899",
                color: "white",
                fontSize: "10px",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold"
              }}>
                {activeOrdersCount}
              </span>
            )}
          </button>
        </div>

        {/* ==========================================
            TAB 1: STORE DASHBOARD OVERVIEW
            ========================================== */}
        {sellerActiveTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Bento statistics grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div style={{ ...S.sec, borderLeft: "4px solid #ec4899", padding: "16px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "bold" }}>Menu Directory</span>
                <h3 style={{ fontSize: "28px", fontWeight: "black", margin: "4px 0", color: "#1e293b" }}>{totalMenuCount} Items</h3>
                <p style={{ fontSize: "11.5px", color: "#94a3b8" }}>{isFoodSeller ? "Gourmet recipe selections" : "Retail commodities listed"}</p>
              </div>

              <div style={{ ...S.sec, borderLeft: "4px solid #f59e0b", padding: "16px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "bold" }}>Pending Changes</span>
                <h3 style={{ fontSize: "28px", fontWeight: "black", margin: "4px 0", color: "#1e293b" }}>{pendingModificationsCount} Requests</h3>
                <p style={{ fontSize: "11.5px", color: "#94a3b8" }}>Awaiting Primary Admin clearance</p>
              </div>

              <div style={{ ...S.sec, borderLeft: "4px solid #10b981", padding: "16px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "bold" }}>Live Orders</span>
                <h3 style={{ fontSize: "28px", fontWeight: "black", margin: "4px 0", color: "#1e293b" }}>{activeOrdersCount} Active</h3>
                <p style={{ fontSize: "11.5px", color: "#94a3b8" }}>Ready for preparation & dispatch</p>
              </div>

              <div style={{ ...S.sec, borderLeft: "4px solid #3b82f6", padding: "16px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", fontWeight: "bold" }}>Settlement Mode</span>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: "8px 0 4px 0", color: "#1e293b" }}>MTN / Telecel Cash</h3>
                <p style={{ fontSize: "11.5px", color: "#94a3b8" }}>Managed instantly by Elextra pay</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
              
              {/* Fleet Bulletin & Operations Board */}
              <div style={S.sec}>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", color: "#ec4899" }}>
                  <Bell size={16} /> Partner Operational Guidelines
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: "#475569" }}>
                  <p>
                    📌 <strong>Menu Adjustments:</strong> To preserve price uniformity across our offline flyer booklets and standard consumer checkouts, all custom pricing proposals undergo verification by our Primary Administrator.
                  </p>
                  <p>
                    📌 <strong>Real-time Stock Updates:</strong> You can temporarily hide items that are out of stock instantly without Admin clearance! This updates our client-side menu lists within seconds.
                  </p>
                  <p>
                    📌 <strong>Service Agreement:</strong> Preparing times should be kept within <strong>15 minutes</strong> from ordering. Once prepared, tap <strong>Ready for Dispatch</strong> so local riders receive pickup coordinates.
                  </p>
                  <p>
                    📌 <strong>Revenue Payouts:</strong> For questions regarding Momos, contact the Finance Desk at <strong>{settings.primaryMomoNumber}</strong> (A/C: {settings.primaryMomoName}).
                  </p>
                </div>
              </div>

              {/* Management Memos */}
              <div style={S.sec}>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", color: "#3b82f6" }}>
                  <ShieldCheck size={16} /> Latest Management Announcements
                </h4>
                {managementMemos.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "20px" }}>
                    No announcements from the head office today.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                    {managementMemos.map((memo: any) => (
                      <div key={memo.id} style={{ 
                        padding: "10px", 
                        background: memo.urgent ? "#fff1f2" : "#f8fafc", 
                        borderLeft: memo.urgent ? "3px solid #ef4444" : "3px solid #cbd5e1",
                        borderRadius: "4px"
                      }}>
                        <div style={{ fontSize: "10px", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                          <span>From: {memo.sender || "System Admin"}</span>
                          <span>{new Date(memo.date || "").toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: "11.5px", marginTop: "4px", color: "#1e293b", fontWeight: memo.urgent ? "bold" : "normal" }}>
                          {memo.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            TAB 2: MENU & CATALOG CATALOGUE
            ========================================== */}
        {sellerActiveTab === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* FAST FOOD JOINT LAYOUT */}
            {isFoodSeller ? (
              <>
                {/* Fast Food Joint Profile Details */}
                {sellerPlace && (
                  <div style={S.sec}>
                    <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#ec4899", display: "flex", alignItems: "center", gap: "6px" }}>
                      ⚙️ Edit Fast Food Joint Profile details (Awaiting Admin clearance)
                    </h3>
                    <p style={{ fontSize: "11.5px", color: "#64748b", marginBottom: "12px" }}>
                      Update details about your eatery. Admin verification is required prior to deployment.
                    </p>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Restaurant/Shop Name</label>
                        <input 
                          type="text"
                          defaultValue={sellerPlace.name}
                          style={S.inp}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val && val !== sellerPlace.name) {
                              await handleRoleAction(
                                "CUSTOMIZE_REST",
                                `Seller requested shop name change from "${sellerPlace.name}" to "${val}"`,
                                { restaurantId: sellerPlace.id, name: val },
                                async () => {
                                  const updated = foodPlaces.map((p: any) => p.id === sellerPlace.id ? { ...p, name: val } : p);
                                  await syncDBKey("elx_food_places", updated);
                                  setFoodPlaces(updated);
                                  notify("Store name updated!", "ok");
                                }
                              );
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Cuisine Specialties</label>
                        <input 
                          type="text"
                          defaultValue={sellerPlace.cuisine}
                          style={S.inp}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val && val !== sellerPlace.cuisine) {
                              await handleRoleAction(
                                "CUSTOMIZE_REST",
                                `Seller requested cuisine specialty change to "${val}"`,
                                { restaurantId: sellerPlace.id, cuisine: val },
                                async () => {
                                  const updated = foodPlaces.map((p: any) => p.id === sellerPlace.id ? { ...p, cuisine: val } : p);
                                  await syncDBKey("elx_food_places", updated);
                                  setFoodPlaces(updated);
                                  notify("Cuisine specialties updated!", "ok");
                                }
                              );
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Street Address</label>
                        <input 
                          type="text"
                          defaultValue={sellerPlace.address || "Tarkwa"}
                          style={S.inp}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val !== sellerPlace.address) {
                              await handleRoleAction(
                                "CUSTOMIZE_REST",
                                `Seller requested location change of "${sellerPlace.name}" to "${val}"`,
                                { restaurantId: sellerPlace.id, address: val },
                                async () => {
                                  const updated = foodPlaces.map((p: any) => p.id === sellerPlace.id ? { ...p, address: val } : p);
                                  await syncDBKey("elx_food_places", updated);
                                  setFoodPlaces(updated);
                                  notify("Store address updated!", "ok");
                                }
                              );
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Service Hours</label>
                        <input 
                          type="text"
                          defaultValue={sellerPlace.hours || "8:00 AM - 10:00 PM"}
                          style={S.inp}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val && val !== sellerPlace.hours) {
                              await handleRoleAction(
                                "CUSTOMIZE_REST",
                                `Seller requested operational hours update: "${val}"`,
                                { restaurantId: sellerPlace.id, hours: val },
                                async () => {
                                  const updated = foodPlaces.map((p: any) => p.id === sellerPlace.id ? { ...p, hours: val } : p);
                                  await syncDBKey("elx_food_places", updated);
                                  setFoodPlaces(updated);
                                  notify("Operational hours updated!", "ok");
                                }
                              );
                            }
                          }}
                        />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Banner Header Image URL</label>
                        <input 
                          type="text"
                          defaultValue={sellerPlace.imgUrl}
                          style={S.inp}
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val && val !== sellerPlace.imgUrl) {
                              await handleRoleAction(
                                "CUSTOMIZE_REST",
                                `Seller requested new banner background layout for "${sellerPlace.name}"`,
                                { restaurantId: sellerPlace.id, imgUrl: val },
                                async () => {
                                  const updated = foodPlaces.map((p: any) => p.id === sellerPlace.id ? { ...p, imgUrl: val } : p);
                                  await syncDBKey("elx_food_places", updated);
                                  setFoodPlaces(updated);
                                  notify("Store banner image updated!", "ok");
                                }
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Eatery dishes catalogue manager - Rich Interactive Food Menu Inventory & Customizer */}
                {sellerPlace && (
                  <div style={{ ...S.sec, marginTop: "10px", background: "white", border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#ec4899", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🍔</span> Food Menu Inventory and customizer
                    </h3>
                    <FoodCatalogManagerTab
                      user={user}
                      notify={notify}
                      foodPlaces={foodPlaces}
                      setFoodPlaces={setFoodPlaces}
                      syncDBKey={syncDBKey}
                      handleRoleAction={handleRoleAction}
                      pendingApprovals={pendingApprovals}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* MERCHANDISE SELLER LAYOUT */}
                <div style={S.sec}>
                  <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Store size={18} style={{ color: "#ec4899" }} /> Your Store Catalog & Price Sheets
                  </h3>
                  <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
                    To ensure platform alignment, updates to item prices require authorization from the Primary Administrator. 
                    Changes proposed here will enter the approvals loop.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "500px", overflowY: "auto" }}>
                    {sellerProducts.map(p => {
                      const currentPrice = customCatalog[p.id]?.price || p.price;
                      const hasPendingProposal = catalogProposals.some(pr => pr.productId === p.id && pr.status === "pending");
                      const isActiveSelling = customCatalog[p.id]?.activeSelling !== false;

                      return (
                        <div key={p.id} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong style={{ fontSize: "12.5px" }}>{p.name}</strong>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                              Base Cost: GHS {p.price.toFixed(2)} · Active Retail: <span style={{ color: "#ec4899", fontWeight: "bold" }}>GHS {currentPrice.toFixed(2)}</span>
                            </div>
                            
                            <button
                              onClick={async () => {
                                const existing = customCatalog[p.id] || { price: p.price };
                                const updatedCatalog = {
                                  ...customCatalog,
                                  [p.id]: {
                                    ...existing,
                                    activeSelling: !isActiveSelling
                                  }
                                };
                                await syncDBKey("elx_custom_catalog", updatedCatalog);
                                setCustomCatalog(updatedCatalog);
                                notify(`${p.name} status updated to ${!isActiveSelling ? "SELLING" : "HIDING / OUT OF STOCK"}.`, "ok");
                              }}
                              style={{
                                background: isActiveSelling ? "#d1fae5" : "#fee2e2",
                                color: isActiveSelling ? "#065f46" : "#ef4444",
                                border: "none",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                marginTop: "6px"
                              }}
                            >
                              {isActiveSelling ? "🟢 Active (Selling)" : "🔴 Hidden (Out of stock)"}
                            </button>
                          </div>

                          <div>
                            {hasPendingProposal ? (
                              <span style={{ fontSize: "10px", background: "#fef3c7", color: "#d97706", padding: "3px 8px", borderRadius: "12px", fontWeight: "bold" }}>
                                ⌛ Pending Approval
                              </span>
                            ) : editPriceProductId === p.id ? (
                              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                <input 
                                  type="number" 
                                  placeholder="GHS" 
                                  value={newPriceVal}
                                  onChange={e => setNewPriceVal(e.target.value)}
                                  style={{ width: "70px", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                />
                                <button 
                                  onClick={() => handleProposePriceChange(p.id, p.name, currentPrice, Number(newPriceVal))}
                                  style={{ background: "#ec4899", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                  Submit
                                </button>
                                <button 
                                  onClick={() => setEditPriceProductId(null)}
                                  style={{ background: "#64748b", color: "white", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => { setEditPriceProductId(p.id); setNewPriceVal(currentPrice.toString()); }}
                                style={{ background: "white", color: "#ec4899", border: "1.5px solid #ec4899", borderRadius: "4px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                              >
                                Propose Price Change
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </>
            )}

          </div>
        )}

        {/* ==========================================
            TAB 3: MODIFICATION REQUESTS & TRACKER
            ========================================== */}
        {sellerActiveTab === "requests" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div style={{ ...S.sec, background: "#faf5ff", borderLeft: "4px solid #a855f7" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "#7e22ce", display: "flex", alignItems: "center", gap: "6px" }}>
                ⌛ Catalog Modification Proposals History
              </h3>
              <p style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                View current status of proposed additions, deletions, or pricing updates. You can cancel pending adjustments if they are no longer required.
              </p>
            </div>

            {/* Status filtering buttons */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
              {(["all", "pending", "approved", "rejected", "canceled"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSellerReqFilter(f)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "1px solid #cbd5e1",
                    background: sellerReqFilter === f ? "#7e22ce" : "white",
                    color: sellerReqFilter === f ? "white" : "#475569",
                    fontWeight: "bold",
                    fontSize: "11px",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.1s"
                  }}
                >
                  {f === "all" ? "🌐 Show All" : f === "pending" ? "⌛ Under Review" : f === "approved" ? "✅ Approved" : f === "rejected" ? "❌ Declined" : "⚪ Canceled"}
                </button>
              ))}
            </div>

            {/* Requests Listing */}
            {(() => {
              // Apply filters to aggregate requests
              const filteredList = activeModifications.filter((r: any) => {
                const reqStatus = r.status || "pending";
                if (sellerReqFilter === "all") return true;
                return reqStatus === sellerReqFilter;
              });

              if (filteredList.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                    <HelpCircle size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                    <p style={{ fontSize: "12px", fontWeight: "bold" }}>No modification requests found matching this filter.</p>
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {filteredList.map((req: any) => {
                    const reqStatus = req.status || "pending";
                    
                    // Style config per status
                    let statusBg = "#fef3c7";
                    let statusText = "#d97706";
                    let statusLabel = "⌛ Under Review";
                    
                    if (reqStatus === "approved") {
                      statusBg = "#d1fae5";
                      statusText = "#065f46";
                      statusLabel = "✅ Approved & Live";
                    } else if (reqStatus === "rejected") {
                      statusBg = "#fee2e2";
                      statusText = "#b91c1c";
                      statusLabel = "❌ Declined";
                    } else if (reqStatus === "canceled") {
                      statusBg = "#f1f5f9";
                      statusText = "#475569";
                      statusLabel = "⚪ Canceled";
                    }

                    const isFoodReq = !!req.type; // food requests have type (ADD_ITEM, PRICE_ADJUSTMENT, REMOVE_ITEM etc)
                    const titleText = isFoodReq 
                      ? `Proposal: [${req.type.replace("_", " ")}]` 
                      : `Proposal: [PRICE CHANGE]`;
                      
                    const dateVal = req.dateSubmitted || req.submittedAt || new Date().toISOString();

                    return (
                      <div key={req.id} style={{ 
                        background: "white", 
                        borderRadius: "10px", 
                        border: "1.5px solid #cbd5e1", 
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        overflow: "hidden"
                      }}>
                        {/* Header bar of request */}
                        <div style={{ 
                          padding: "10px 14px", 
                          background: "#f8fafc", 
                          borderBottom: "1px solid #cbd5e1", 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center" 
                        }}>
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>REQ ID: {req.id}</span>
                            <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "10px" }}>Submitted: {new Date(dateVal).toLocaleString()}</span>
                          </div>
                          <span style={{ 
                            fontSize: "11px", 
                            background: statusBg, 
                            color: statusText, 
                            padding: "3px 8px", 
                            borderRadius: "12px", 
                            fontWeight: "bold" 
                          }}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Body contents of request */}
                        <div style={{ padding: "14px" }}>
                          <strong style={{ fontSize: "13.5px", color: "#1e293b", textTransform: "uppercase" }}>{titleText}</strong>
                          
                          {isFoodReq ? (
                            <div style={{ marginTop: "6px", fontSize: "12.5px", color: "#475569" }}>
                              Target Food Item: <strong>{req.payload?.itemName}</strong> <br />
                              Proposed Retail: <span style={{ color: "#db2777", fontWeight: "bold" }}>GHS {req.payload?.proposedPrice?.toFixed(2) || "N/A"}</span>
                              {req.payload?.description && <p style={{ fontSize: "11.5px", fontStyle: "italic", marginTop: "4px", color: "#64748b" }}>Description: "{req.payload?.description}"</p>}
                              {req.payload?.imgUrl && <span style={{ fontSize: "10.5px", color: "#3b82f6", display: "block", marginTop: "4px" }}>Custom photo path: {req.payload.imgUrl}</span>}
                              {req.payload?.isOnSale && <span style={{ fontSize: "10.5px", background: "#fecdd3", color: "#9f1239", padding: "1px 6px", borderRadius: "4px", display: "inline-block", marginTop: "6px", fontWeight: "bold" }}>On Discount Special Sale</span>}
                            </div>
                          ) : (
                            <div style={{ marginTop: "6px", fontSize: "12.5px", color: "#475569" }}>
                              Target Product: <strong>{req.productName}</strong> <br />
                              Current Rate: GHS {req.originalPrice?.toFixed(2)} ➔ Proposed Rate: <span style={{ color: "#db2777", fontWeight: "bold" }}>GHS {req.proposedPrice?.toFixed(2)}</span>
                            </div>
                          )}

                          {/* REJECTION REASON CALLOUT BOX (ADMIN FEEDBACK) */}
                          {reqStatus === "rejected" && (
                            <div style={{ 
                              marginTop: "12px", 
                              padding: "10px 14px", 
                              background: "#fef2f2", 
                              border: "1px solid #fee2e2", 
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px"
                            }}>
                              <AlertCircle size={16} style={{ color: "#ef4444", marginTop: "2px", flexShrink: 0 }} />
                              <div>
                                <strong style={{ fontSize: "12px", color: "#991b1b", display: "block" }}>Administrator Clearance Feedback:</strong>
                                <p style={{ fontSize: "12px", color: "#b91c1c", marginTop: "2px", fontStyle: "italic" }}>
                                  "{req.rejectionReason || "Price sheet discrepancy or formatting error. Please review rates."}"
                                </p>
                              </div>
                            </div>
                          )}

                          {/* CANCEL ACTION FOR PENDING REVIEW */}
                          {reqStatus === "pending" && (
                            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                              <button
                                onClick={async () => {
                                  if (confirm("Are you sure you want to withdraw and cancel this modification proposal?")) {
                                    if (isFoodReq) {
                                      await handleCancelFoodRequest(req.id);
                                    } else {
                                      await handleCancelCatalogProposal(req.id);
                                    }
                                  }
                                }}
                                style={{ 
                                  background: "none", 
                                  color: "#dc2626", 
                                  border: "1px solid #fca5a5", 
                                  padding: "4px 10px", 
                                  borderRadius: "6px", 
                                  fontSize: "11px", 
                                  fontWeight: "bold", 
                                  cursor: "pointer",
                                  transition: "all 0.1s"
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                              >
                                🗑️ Cancel Request
                              </button>
                            </div>
                          )}

                          {/* TIMELINE STEPS */}
                          {req.approvalHistory && req.approvalHistory.length > 0 && (
                            <div style={{ marginTop: "12px", borderTop: "1px solid #cbd5e1", paddingTop: "8px" }}>
                              <span style={{ fontSize: "10.5px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "4px" }}>Timeline Logs:</span>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {req.approvalHistory.map((step: any, sIdx: number) => (
                                  <div key={sIdx} style={{ fontSize: "10.5px", color: "#475569", paddingLeft: "8px", borderLeft: "2px solid #e2e8f0" }}>
                                    · <strong style={{ textTransform: "uppercase" }}>{step.status}</strong> by {step.actor} - <span style={{ color: "#64748b" }}>{step.details}</span> <span style={{ color: "#94a3b8", fontSize: "9.5px" }}>({new Date(step.timestamp).toLocaleTimeString()})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        )}

        {/* ==========================================
            TAB 4: ACTIVE STORE ORDERS
            ========================================== */}
        {sellerActiveTab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div style={S.sec}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <ClipboardList size={18} style={{ color: "#ec4899" }} /> Incoming Store Orders Tracker
              </h3>
              <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
                Track and prepare customer orders. Setting items as ready updates the dispatch terminal for our local motorcycle couriers.
              </p>

              {sellerOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  <Clock size={36} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                  <p style={{ fontSize: "12px", fontWeight: "bold" }}>No Active Store Orders Found</p>
                  <p style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>New client orders will stream here automatically.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {sellerOrders.map(o => (
                    <div key={o.id} style={{ 
                      padding: "14px", 
                      background: o.status === "preparing" ? "#fffbeb" : o.status === "ready" ? "#f0fdf4" : "#fff5f7", 
                      borderRadius: "10px", 
                      border: o.status === "preparing" ? "1px solid #fde68a" : o.status === "ready" ? "1px solid #bbf7d0" : "1px solid #fbcfe8" 
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", fontWeight: "bold", borderBottom: "1px dashed rgba(0,0,0,0.1)", paddingBottom: "6px", marginBottom: "8px" }}>
                        <span>ORDER #{o.id}</span>
                        <span style={{ color: "#db2777" }}>GHS {o.total?.toFixed(2)}</span>
                      </div>
                      
                      <div style={{ fontSize: "12px", color: "#475569" }}>
                        <strong>Customer:</strong> {o.recipientName} (Tel: {o.recipientPhone})<br />
                        <strong>Items Ordered:</strong>
                        <div style={{ background: "rgba(255,255,255,0.4)", padding: "6px", borderRadius: "4px", margin: "4px 0" }}>
                          {o.items?.map((it, idx) => (
                            <div key={idx} style={{ fontSize: "11.5px", color: "#0f172a" }}>
                              🍟 {it.name} <strong style={{ color: "#ec4899" }}>x{it.qty}</strong> · GHS {(it.price * it.qty).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                        <span style={{ 
                          fontSize: "10.5px", 
                          background: o.status === "ready" ? "#10b981" : o.status === "preparing" ? "#f59e0b" : "#ec4899", 
                          color: "white", 
                          padding: "3px 8px", 
                          borderRadius: "4px", 
                          fontWeight: "black",
                          textTransform: "uppercase"
                        }}>
                          Status: {o.status}
                        </span>

                        <div style={{ display: "flex", gap: "6px" }}>
                          {o.status === "pending" && (
                            <button 
                              onClick={async () => {
                                const updated = orders.map(ord => ord.id === o.id ? { ...ord, status: "preparing" as const } : ord);
                                await syncDBKey("elx_orders", updated);
                                notify("Order status updated to: PREPARING", "ok");
                              }}
                              style={{ background: "#f59e0b", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              🍳 Start Preparing
                            </button>
                          )}
                          {o.status !== "ready" && o.status !== "delivered" && o.status !== "canceled" && (
                            <button 
                              onClick={async () => {
                                const updated = orders.map(ord => ord.id === o.id ? { ...ord, status: "ready" as const } : ord);
                                await syncDBKey("elx_orders", updated);
                                
                                // Create corresponding dispatch job in elx_dispatch
                                const currentJobs = await DB.get("elx_dispatch") || dispatchJobs;
                                const alreadyExists = currentJobs.some((j: any) => j.orderId === o.id || j.id === "DISP-FOOD-" + o.id);
                                if (!alreadyExists) {
                                  const restaurantName = o.restaurantName || (o.items && o.items[0]?.shop) || "Local Restaurant";
                                  const newJob = {
                                    id: "DISP-FOOD-" + o.id,
                                    orderId: o.id,
                                    service: "sameDay" as const,
                                    size: `${o.items?.length || 1} Items`,
                                    type: "food_delivery",
                                    pickup: restaurantName,
                                    pickupAddr: restaurantName + ", Tarkwa",
                                    destination: o.deliveryLocation || "Tarkwa Center",
                                    name: o.recipientName || "Customer",
                                    phone: o.recipientPhone || "",
                                    status: "pending" as const,
                                    date: o.date || new Date().toISOString().split("T")[0],
                                    fee: o.delivFee || 15.0,
                                    recipientName: o.recipientName,
                                    recipientPhone: o.recipientPhone,
                                    recipientIsSelf: o.recipientIsSelf,
                                    recipientPin: o.recipientPin || "4491"
                                  };
                                  const updatedJobs = [newJob, ...currentJobs];
                                  await syncDBKey("elx_dispatch", updatedJobs);
                                  setDispatchJobs(updatedJobs);
                                }
                                
                                notify("Order is ready for Courier pickup!", "ok");
                              }}
                              style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              📦 Mark Ready
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // MANAGER & FULL ADMIN TABS DECLARATION
  // ==========================================
  const loggedInStaffRecord = staffAccounts.find((s: any) => s.id === user?.id);
  const customAllowedTabs: string[] = loggedInStaffRecord?.allowedTabs || [];
  const hasDirectEditing: boolean = loggedInStaffRecord?.directEditing || false;

  const renderLimitedTabs = () => {
    const list = [
      { id: "dashboard", l: "📊 Logistics Console" },
      { id: "dispatch", l: `🚚 Dispatch Jobs (${filteredDispatchJobs.length})` },
      { id: "orders", l: `🛍️ Orders & Prep (${filteredOrders.length})` },
      { id: "handyman", l: `🛠️ Repairs/Handyman (${filteredHandymanBookings.length})` },
      { id: "riders", l: `🏍️ Rider Dispatch Fleet` }
    ];

    if (user?.role === "primary_admin") {
      list.push({ id: "gemini_copilot", l: "✨ Gemini Admin Copilot" });
      list.push({ id: "approvals", l: `🔔 Approvals Queue (${pendingApprovals.length + catalogProposals.length + applications.length})` });
      list.push({ id: "coupons", l: `🎁 Promo Coupons (${couponsSetting.length})` });
      list.push({ id: "users", l: `👥 Client & Staff` });
      list.push({ id: "food_requests", l: `🍔 Food Adjustments (${foodRequests.filter(r => r.status === "pending").length})` });
      list.push({ id: "settings", l: "⚙️ Global Configs" });
    } else if (user?.role === "sub_admin") {
      list.push({ id: "gemini_copilot", l: "✨ Gemini Admin Copilot" });
      list.push({ id: "users", l: `👥 Oversee Staff` });
      list.push({ id: "coupons", l: "🎁 Promo Coupons" });
      list.push({ id: "food_requests", l: "🍔 Food Adjustments" });
      list.push({ id: "settings", l: "⚙️ Limited Configs" });
    } else if (user?.role === "manager") {
      list.push({ id: "users", l: `👥 Oversee Staff` });
      list.push({ id: "food_requests", l: "🍔 Food Adjustments" });
      list.push({ id: "settings", l: "⚙️ Limited Configs" });
    }

    if (["primary_admin", "sub_admin", "manager"].includes(user?.role || "")) {
      list.push({ id: "cross_sell", l: "🛒 Cross-Sell Recommendations" });
      list.push({ id: "catalog_manager", l: "📦 Catalog Inventory" });
      list.push({ id: "food_catalog_manager", l: "🍔 Food Menu Inventory and customizer" });
      list.push({ id: "malls_manager", l: "🏪 Malls & Retailers" });
      list.push({ id: "image_verification", l: "🔍 Image Verification" });
      list.push({ id: "management_chat", l: `💬 Management Memos & Chat (${managementMemos.length})` });
    }

    // Dynamic definitions for all tabs to check custom allowed ones
    const tabDefinitions: Record<string, string> = {
      gemini_copilot: "✨ Gemini Admin Copilot",
      approvals: `🔔 Approvals Queue (${pendingApprovals.length + catalogProposals.length + applications.length})`,
      coupons: `🎁 Promo Coupons (${couponsSetting.length})`,
      users: "👥 Client & Staff",
      food_requests: `🍔 Food Adjustments (${foodRequests.filter(r => r.status === "pending").length})`,
      settings: "⚙️ Settings Configuration",
      cross_sell: "🛒 Cross-Sell Recommendations",
      catalog_manager: "📦 Catalog Inventory",
      food_catalog_manager: "🍔 Food Menu Inventory and customizer",
      malls_manager: "🏪 Malls & Retailers",
      image_verification: "🔍 Image Verification",
      management_chat: `💬 Management Memos & Chat (${managementMemos.length})`,
      dashboard: "📊 Logistics Console",
      dispatch: `🚚 Dispatch Jobs (${filteredDispatchJobs.length})`,
      orders: `🛍️ Orders & Prep (${filteredOrders.length})`,
      handyman: `🛠️ Repairs/Handyman (${filteredHandymanBookings.length})`,
      riders: `🏍️ Rider Dispatch Fleet`
    };

    // Append any extra custom-allowed tabs that the user was granted
    customAllowedTabs.forEach((tabId: string) => {
      if (tabDefinitions[tabId] && !list.some(t => t.id === tabId)) {
        list.push({ id: tabId, l: tabDefinitions[tabId] });
      }
    });

    return list;
  };

  const tabs = renderLimitedTabs();

  // Primary Admin Approval Handlers
  const handleApproveProposal = async (proposalId: string) => {
    const prop = pendingApprovals.find(p => p.id === proposalId);
    if (!prop) return;

    try {
      if (prop.actionType === "CREATE_COUPON") {
        const updatedCoupons = [...couponsSetting, prop.payload];
        await syncDBKey("elx_coupons", updatedCoupons);
        setCouponsSetting(updatedCoupons);
      } else if (prop.actionType === "ASSIGN_DISPATCH") {
        const { jobId, driverId, driverName } = prop.payload;
        const updatedJobs = dispatchJobs.map(j => {
          if (j.id === jobId) return { ...j, status: "assigned" as const, driverId, driverName };
          return j;
        });
        await syncDBKey("elx_dispatch", updatedJobs);
      } else if (prop.actionType === "UPDATE_SETTINGS") {
        const updatedSettings = { ...settings, ...prop.payload };
        await syncDBKey("elx_settings", updatedSettings);
        setSettings(updatedSettings);
      } else if (prop.actionType === "CUSTOMIZE_REST") {
        const { restaurantId, ...updates } = prop.payload;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            return { ...p, ...updates };
          }
          return p;
        });
        await syncDBKey("elx_food_places", updatedPlaces);
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "UPDATE_MARKETPLACE_CATEGORIES") {
        const { categories } = prop.payload;
        await syncDBKey("elx_food_categories", categories);
      } else if (prop.actionType === "UPDATE_CATALOG_PRODUCT") {
        const { productId, updates } = prop.payload;
        const currentCatalog = await DB.get("elx_custom_catalog") || {};
        const updatedCatalog = { ...currentCatalog };
        if (productId.startsWith("cust-")) {
          const added = updatedCatalog.addedProducts || [];
          updatedCatalog.addedProducts = added.map((p: any) => {
            if (p.id === productId) {
              return { ...p, ...updates };
            }
            return p;
          });
        } else {
          const existing = updatedCatalog[productId] || {};
          updatedCatalog[productId] = { ...existing, ...updates };
        }
        await syncDBKey("elx_custom_catalog", updatedCatalog);
        setCustomCatalog(updatedCatalog);
      } else if (prop.actionType === "ADD_CATALOG_PRODUCT") {
        const { product, section } = prop.payload;
        const currentCatalog = await DB.get("elx_custom_catalog") || {};
        const updatedCatalog = { ...currentCatalog };
        const added = updatedCatalog.addedProducts || [];
        updatedCatalog.addedProducts = [
          ...added.filter((p: any) => p && p.id !== product.id),
          product
        ];
        await syncDBKey("elx_custom_catalog", updatedCatalog);
        setCustomCatalog(updatedCatalog);
      } else if (prop.actionType === "ADD_FOOD_ITEM") {
        const { restaurantId, item, price, description, imgUrl, onSale } = prop.payload;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            const updatedMenu = [...(p.menu || [])];
            updatedMenu.push({ item, price, description, imgUrl, onSale });
            return { ...p, menu: updatedMenu };
          }
          return p;
        });
        await syncDBKey("elx_food_places", updatedPlaces);
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "UPDATE_FOOD_ITEM") {
        const { restaurantId, originalName, updates } = prop.payload;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            const updatedMenu = (p.menu || []).map((m: any) => {
              if (m.item === originalName) {
                return { ...m, ...updates };
              }
              return m;
            });
            return { ...p, menu: updatedMenu };
          }
          return p;
        });
        await syncDBKey("elx_food_places", updatedPlaces);
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "REMOVE_FOOD_ITEM") {
        const { restaurantId, itemName, dishName, dishId } = prop.payload;
        const nameToUse = itemName || dishName;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            const updatedMenu = (p.menu || []).filter((m: any) => m.item !== nameToUse && m.id !== dishId);
            return { ...p, menu: updatedMenu };
          }
          return p;
        });
        await syncDBKey("elx_food_places", updatedPlaces);
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "UPDATE_FOOD_MENU") {
        const { restaurantId, dish, isEdit } = prop.payload;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            let updatedMenu = [...(p.menu || [])];
            if (isEdit) {
              updatedMenu = updatedMenu.map((m: any) => (m.id === dish.id || m.item === dish.item) ? { ...m, ...dish } : m);
            } else {
              updatedMenu.push(dish);
            }
            return { ...p, menu: updatedMenu };
          }
          return p;
        });
        await syncDBKey("elx_food_places", updatedPlaces);
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "TOGGLE_FOOD_ITEM") {
        const { restaurantId, dishId, updates } = prop.payload;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            const updatedMenu = (p.menu || []).map((m: any) => (m.id === dishId) ? { ...m, ...updates } : m);
            return { ...p, menu: updatedMenu };
          }
          return p;
        });
        await syncDBKey("elx_food_places", updatedPlaces);
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "UPDATE_ELEXTRA_ADDONS") {
        const { addon } = prop.payload;
        const currentAddons = await DB.get("elx_elextra_addons") || [];
        let updatedAddons = [...currentAddons];
        const isEdit = currentAddons.some((ad: any) => ad.id === addon.id);
        if (isEdit) {
          updatedAddons = updatedAddons.map((ad: any) => ad.id === addon.id ? { ...ad, ...addon } : ad);
        } else {
          updatedAddons.push(addon);
        }
        await syncDBKey("elx_elextra_addons", updatedAddons);
      } else if (prop.actionType === "REMOVE_ELEXTRA_ADDON") {
        const { addonId } = prop.payload;
        const currentAddons = await DB.get("elx_elextra_addons") || [];
        const updatedAddons = currentAddons.filter((ad: any) => ad.id !== addonId);
        await syncDBKey("elx_elextra_addons", updatedAddons);
      } else if (prop.actionType === "UPDATE_DISH_ADDON") {
        const { restaurantId, dishId, addonId, addon, updates } = prop.payload;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            const updatedMenu = (p.menu || []).map((m: any) => {
              if (m.id === dishId) {
                let currentAddons = [...(m.addons || [])];
                const isEdit = currentAddons.some((ad: any) => ad.id === addonId);
                if (isEdit) {
                  currentAddons = currentAddons.map((ad: any) => ad.id === addonId ? { ...ad, ...(addon || {}), ...(updates || {}) } : ad);
                } else {
                  currentAddons.push(addon);
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
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "REMOVE_DISH_ADDON") {
        const { restaurantId, dishId, addonId } = prop.payload;
        const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
        const updatedPlaces = currentPlaces.map((p: any) => {
          if (p.id === restaurantId) {
            const updatedMenu = (p.menu || []).map((m: any) => {
              if (m.id === dishId) {
                const currentAddons = (m.addons || []).filter((ad: any) => ad.id !== addonId);
                return { ...m, addons: currentAddons };
              }
              return m;
            });
            return { ...p, menu: updatedMenu };
          }
          return p;
        });
        await syncDBKey("elx_food_places", updatedPlaces);
        setFoodPlaces(updatedPlaces);
      } else if (prop.actionType === "UPDATE_MALL_LIST") {
        const { updatedList } = prop.payload;
        await syncDBKey("elx_malls", updatedList);
        setMalls(updatedList);
      } else if (prop.actionType === "SUGGEST_PLACE") {
        const { placeType, name, location, cuisineOrType, googleMapsUrl } = prop.payload;
        if (placeType === "vendor") {
          const currentPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
          const newPlace = {
            id: "f_" + Date.now(),
            name,
            location,
            type: cuisineOrType || "Fast Food Joint",
            hours: "8:00 AM - 10:00 PM",
            rating: 4.5,
            menu: [],
            imgUrl: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
            googleMapsUrl,
            city: (location || "").toLowerCase().includes("bogoso") ? ("bogoso" as const) : ("tarkwa" as const)
          };
          const updatedPlaces = [...currentPlaces, newPlace];
          await syncDBKey("elx_food_places", updatedPlaces);
          setFoodPlaces(updatedPlaces);
        } else {
          const currentMalls = await DB.get("elx_malls") || MALLS_SHOPS;
          const newMall = {
            id: "m_" + Date.now(),
            name,
            location,
            type: cuisineOrType || "Shopping Mall",
            hours: "8:00 AM - 9:00 PM",
            rating: 4.5,
            sells: ["Groceries", "Household Items"],
            googleMapsUrl
          };
          const updatedMalls = [...currentMalls, newMall];
          await syncDBKey("elx_malls", updatedMalls);
          setMalls(updatedMalls);
        }
      }

      const cleanApprovals = pendingApprovals.filter(p => p.id !== proposalId);
      await syncDBKey("elx_pending_approvals", cleanApprovals);
      setPendingApprovals(cleanApprovals);

      // Dispatch push notification to proposer
      sendPushNotification(
        "⚡ Proposal APPROVED!",
        `Your requested change: "${prop.description}" has been approved and executed.`,
        {
          targetUserEmail: prop.proposerEmail
        }
      ).catch(e => console.error(e));

      notify(`Proposal approved and executed successfully!`, "ok");
    } catch (err) {
      notify("Failed to execute approved action.", "err");
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    const prop = pendingApprovals.find(p => p.id === proposalId);
    const cleanApprovals = pendingApprovals.filter(p => p.id !== proposalId);
    await syncDBKey("elx_pending_approvals", cleanApprovals);
    setPendingApprovals(cleanApprovals);

    if (prop) {
      // Dispatch push notification to proposer
      sendPushNotification(
        "❌ Proposal Rejected",
        `Your requested change: "${prop.description}" has been rejected.`,
        {
          targetUserEmail: prop.proposerEmail
        }
      ).catch(e => console.error(e));
    }

    notify("Proposal rejected and cleared from queue.", "err");
  };

  const handleApproveCatalogProposal = async (proposalId: string) => {
    const prop = catalogProposals.find(p => p.id === proposalId);
    if (!prop) return;

    const updatedCatalog = { ...customCatalog, [prop.productId]: { price: prop.proposedPrice } };
    await syncDBKey("elx_custom_catalog", updatedCatalog);
    setCustomCatalog(updatedCatalog);

    const clean = catalogProposals.filter(p => p.id !== proposalId);
    await syncDBKey("elx_catalog_proposals", clean);
    setCatalogProposals(clean);
    notify(`Approved price update for product: ${prop.productName}`, "ok");
  };

  const handleRejectCatalogProposal = async (proposalId: string) => {
    const clean = catalogProposals.filter(p => p.id !== proposalId);
    await syncDBKey("elx_catalog_proposals", clean);
    setCatalogProposals(clean);
    notify("Catalog price change proposal rejected.", "err");
  };

  const handleApproveApplication = async (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const finalPassword = app.password || "Elextra" + Math.floor(100 + Math.random() * 900);
    let dynamicShopId = app.category || "provisions";

    // If candidate is a seller, automatically provision a fast food joint in elx_food_places
    if (app.type === "seller") {
      dynamicShopId = "rest-" + Date.now();
      const currentFoodPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
      const cuisineStr = app.category === "provisions" ? "Provisions Store" : (app.category || "Ghanaian local cuisine");
      const locationStr = app.location || "Tarkwa";
      const newPlace = {
        id: dynamicShopId,
        name: app.shopName || app.name || "Fast Food Joint",
        hours: "8:00 AM - 10:00 PM",
        cuisine: cuisineStr,
        type: cuisineStr,
        rating: 4.8,
        reviewsCount: 12,
        address: locationStr,
        location: locationStr,
        imgUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400",
        status: "active",
        city: locationStr.toLowerCase().includes("bogoso") ? ("bogoso" as const) : ("tarkwa" as const),
        menu: []
      };
      const updatedPlaces = [...currentFoodPlaces, newPlace];
      await syncDBKey("elx_food_places", updatedPlaces);
      setFoodPlaces(updatedPlaces);
    }

    const newStaffAccount = {
      id: "STAFF-" + Math.floor(1000 + Math.random() * 9000),
      email: app.email,
      phone: app.phone,
      name: app.name || app.shopName,
      role: app.type === "rider" ? "rider" : "seller",
      password: finalPassword,
      status: "active",
      approved: true,
      ...(app.type === "rider" ? {
        plateNumber: app.plateNumber || "GW-RIDER-26",
        vehicleType: app.vehicleType || "Motorcycle",
        earnings: 0,
        completedJobsCount: 0
      } : {
        shopId: dynamicShopId,
        shopName: app.shopName || app.name || "Tarkwa Merchant Joint"
      })
    };

    const updatedStaff = [...staffAccounts, newStaffAccount];
    await syncDBKey("elx_staff_accounts", updatedStaff);
    setStaffAccounts(updatedStaff);

    const clean = applications.filter(a => a.id !== appId);
    await syncDBKey("elx_applications", clean);
    setApplications(clean);

    notify(`Candidate approved! Created account for ${newStaffAccount.name}. Login Passcode: ${finalPassword}`, "ok");
  };

  const handleRejectApplication = async (appId: string) => {
    const clean = applications.filter(a => a.id !== appId);
    await syncDBKey("elx_applications", clean);
    setApplications(clean);
    notify("Onboarding application rejected.", "err");
  };

  const handleApproveFoodRequest = async (requestId: string) => {
    const req = foodRequests.find(r => r.id === requestId);
    if (!req) return;

    try {
      // 1. Update the request status and history
      const updatedRequests = foodRequests.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: "approved" as const,
            approver: user.name,
            approvalHistory: [
              ...(r.approvalHistory || []),
              {
                status: "approved",
                timestamp: new Date().toISOString(),
                actor: user.name,
                details: `Approved and published by Admin ${user.name}`
              }
            ]
          };
        }
        return r;
      });

      // 2. Load food places and apply actual modifications to the directory
      const loadedFoodPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
      const payload = req.payload;

      const updatedPlaces = loadedFoodPlaces.map((place: any) => {
        if (place.id === payload.restaurantId) {
          let updatedMenu = [...place.menu];

          if (req.type === "ADD_ITEM") {
            updatedMenu.push({
              item: payload.itemName,
              price: Number(payload.proposedPrice || payload.itemPrice || 10),
              description: payload.description || "",
              imgUrl: payload.imgUrl || "",
              onSale: !!payload.isOnSale
            });
          } else if (req.type === "PRICE_ADJUSTMENT") {
            updatedMenu = updatedMenu.map(item => {
              if (item.item === payload.itemName) {
                return { ...item, price: Number(payload.proposedPrice || item.price) };
              }
              return item;
            });
          } else if (req.type === "REMOVE_ITEM") {
            updatedMenu = updatedMenu.filter(item => item.item !== payload.itemName);
          } else if (req.type === "MARK_ON_SALE") {
            updatedMenu = updatedMenu.map(item => {
              if (item.item === payload.itemName) {
                return { ...item, onSale: payload.isOnSale !== undefined ? !!payload.isOnSale : true };
              }
              return item;
            });
          } else if (req.type === "EDIT_DETAILS") {
            updatedMenu = updatedMenu.map(item => {
              if (item.item === payload.itemName) {
                return {
                  ...item,
                  description: payload.description !== undefined ? payload.description : item.description,
                  imgUrl: payload.imgUrl !== undefined ? payload.imgUrl : item.imgUrl
                };
              }
              return item;
            });
          }

          return { ...place, menu: updatedMenu };
        }
        return place;
      });

      // 3. Persist and sync both keys
      await syncDBKey("elx_food_places", updatedPlaces);
      setFoodPlaces(updatedPlaces);

      await syncDBKey("elx_food_requests", updatedRequests);
      setFoodRequests(updatedRequests);

      notify(`Approved & published changes for "${payload.itemName}"!`, "ok");
    } catch (err) {
      notify("Failed to process food request approval.", "err");
    }
  };

  const handleRejectFoodRequest = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      notify("Please provide a rejection reason.", "err");
      return;
    }

    try {
      const updatedRequests = foodRequests.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: "rejected" as const,
            approver: user.name,
            rejectionReason: reason,
            approvalHistory: [
              ...(r.approvalHistory || []),
              {
                status: "rejected",
                timestamp: new Date().toISOString(),
                actor: user.name,
                details: `Rejected by Admin ${user.name}. Reason: ${reason}`
              }
            ]
          };
        }
        return r;
      });

      await syncDBKey("elx_food_requests", updatedRequests);
      setFoodRequests(updatedRequests);
      setRejectionInputId(null);
      setRejectionReasonText("");
      notify("Food request rejected and logged.", "ok");
    } catch (err) {
      notify("Failed to reject food request.", "err");
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      
      {/* PUSH NOTIFICATIONS BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", padding: "4px 8px", background: "#111827", borderRadius: "8px", border: "1px solid #1e293b" }}>
        <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "bold" }}>
          ⚡ Fleet, Inventory & Operations Console Active Mode
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PushNotificationManager user={user} setTab={setActiveTab} isAdminPanel={true} />
        </div>
      </div>
      
      {/* TABS SELECTOR ROW */}
      <div style={{ display: "flex", gap: "4px", background: "#1f2937", padding: "6px", borderRadius: "12px", marginBottom: "20px", overflowX: "auto" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === t.id ? "#ef4444" : "transparent",
              color: activeTab === t.id ? "white" : "#94a3b8",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12.5px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease"
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* OPERATIONAL LOCATION HUB SELECTOR */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b, #0f172a)",
        border: "1.5px solid #334155",
        borderRadius: "12px",
        padding: "12px 18px",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>📍</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "900", color: "white" }}>Operational Hub Filter</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              {user?.designatedLocation && (user.designatedLocation || "").toLowerCase() !== "all" ? (
                <span style={{ color: "#facc15", fontWeight: "bold" }}>
                  ⚠️ Your access is hard-locked to {(user.designatedLocation || "").toUpperCase()} by Primary Admin
                </span>
              ) : (
                "Select active region to filter orders, dispatches, handymen, and merchant joints"
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {/* If the user is hard-restricted to Tarkwa/Bogoso, only let them see their location */}
          {(user?.designatedLocation && (user.designatedLocation || "").toLowerCase() !== "all") ? (
            <button
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "not-allowed"
              }}
              disabled
            >
              {((user && user.designatedLocation) || "").toLowerCase() === "tarkwa" ? "🏙️ Tarkwa Only (Restricted)" : "🏘️ Bogoso Only (Restricted)"}
            </button>
          ) : (
            <>
              {[
                { id: "all", name: "All Areas", label: "🌐 All Areas", emoji: "🌐" },
                { id: "tarkwa", name: "Tarkwa Only", label: "🏙️ Tarkwa Only", emoji: "🏙️" },
                { id: "bogoso", name: "Bogoso Only", label: "🏘️ Bogoso Only", emoji: "🏘️" }
              ].map(opt => {
                const isActive = cityFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setCityFilter(opt.id);
                      if (notify) notify(`Operational filter changed to: ${opt.name}`, "ok");
                    }}
                    style={{
                      background: isActive ? "#ef4444" : "#1f2937",
                      color: isActive ? "white" : "#94a3b8",
                      border: "1.5px solid " + (isActive ? "#f87171" : "#374151"),
                      borderRadius: "8px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.name}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ==========================================
          TAB: DASHBOARD
          ========================================== */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* STATS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div style={{ ...S.sec, display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px", borderRadius: "10px" }}><TrendingUp size={20} /></div>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>TOTAL CHANNEL TURNOVER</span>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>GHS {grossSales.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ ...S.sec, display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ background: "#ecfdf5", color: "#10b981", padding: "10px", borderRadius: "10px" }}><Truck size={20} /></div>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>DISPATCH DELIVERIES</span>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>{dispatchJobs.length} Operations</div>
              </div>
            </div>

            <div style={{ ...S.sec, display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ background: "#eff6ff", color: "#3b82f6", padding: "10px", borderRadius: "10px" }}><ClipboardList size={20} /></div>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "bold" }}>CUSTOMER STORE ORDERS</span>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>{orders.length} Handled</div>
              </div>
            </div>
          </div>

          {/* CHART */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              📊 Real-time Channel Revenue Index
            </h3>
            <div style={{ height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip formatter={(value) => [`GHS ${value}`, "Sales"]} />
                  <Area type="monotone" dataKey="Sales" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* REAL-TIME INCOMING FEED PANEL */}
          <div style={{ ...S.sec, borderLeft: "4px solid #ef4444" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "10px", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⚡ Live Delivery Requests & Orders Feed
                </h3>
                <p style={{ fontSize: "11.5px", color: "#64748b", margin: 0 }}>
                  Real-time incoming client requests & courier dispatches. Updated automatically in real-time.
                </p>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f1f5f9", padding: "4px 10px", borderRadius: "20px" }}>
                <span 
                  className="animate-pulse"
                  style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: isLiveConnected ? "#10b981" : "#ef4444", 
                    display: "inline-block"
                  }} 
                />
                <span style={{ fontSize: "10.5px", fontWeight: "bold", color: "#475569" }}>
                  {isLiveConnected ? "LIVE CONNECTION ACTIVE" : "CONNECTION OFFLINE"}
                </span>
                {lastPollTime && (
                  <span style={{ fontSize: "9.5px", color: "#94a3b8", borderLeft: "1px solid #cbd5e1", paddingLeft: "6px" }}>
                    Last sync: {lastPollTime}
                  </span>
                )}
                {isPolling && <RefreshCw size={11} className="animate-spin text-slate-400" style={{ marginLeft: "4px" }} />}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Left Column: Client Orders (Active) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    🛍️ Active Client Orders ({filteredOrders.filter(o => o.status !== "delivered" && o.status !== "canceled" && o.status !== "completed").length})
                  </h4>
                  <button 
                    onClick={() => setActiveTab("orders")}
                    style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
                  >
                    View All Orders
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
                  {filteredOrders.filter(o => o.status !== "delivered" && o.status !== "canceled" && o.status !== "completed").length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                        🎉 No active pending client orders. All requests are currently fulfilled!
                      </p>
                    </div>
                  ) : (
                    filteredOrders.filter(o => o.status !== "delivered" && o.status !== "canceled" && o.status !== "completed").map(o => (
                      <div 
                        key={o.id}
                        style={{ 
                          padding: "12px", 
                          background: "#f8fafc", 
                          borderRadius: "8px", 
                          border: "1px solid #e2e8f0",
                          position: "relative"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b" }}>Order #{o.id}</span>
                          <span style={{ 
                            fontSize: "9px", 
                            background: o.status === "pending" ? "#fef3c7" : "#dbeafe", 
                            color: o.status === "pending" ? "#d97706" : "#2563eb", 
                            padding: "2px 6px", 
                            borderRadius: "10px", 
                            fontWeight: "bold",
                            textTransform: "uppercase"
                          }}>
                            {o.status}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 8px 0", lineHeight: "1.4" }}>
                          <strong>Client:</strong> {o.recipientName || "Guest User"} · {o.recipientPhone || "No Phone"}<br />
                          <strong>Delivery location:</strong> {o.delivery || o.deliveryLocation || "Standard pickup"}<br />
                          <strong>Total price:</strong> GHS {o.total?.toFixed(2)} · 
                          <span style={{ color: o.isPaid ? "#16a34a" : "#dc2626", fontWeight: "bold", marginLeft: "4px" }}>
                            {o.isPaid ? "PAID ✓" : "UNPAID ⏳"}
                          </span>
                        </p>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {o.status === "pending" && (
                            <button
                              onClick={async () => {
                                const updated = orders.map(ord => ord.id === o.id ? { ...ord, status: "preparing" as const } : ord);
                                await syncDBKey("elx_orders", updated);
                                notify(`Order #${o.id} accepted & marked as PREPARING!`, "ok");
                              }}
                              style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "bold", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Accept & Prepare
                            </button>
                          )}
                          {o.status === "preparing" && (
                            <button
                              onClick={async () => {
                                const updated = orders.map(ord => ord.id === o.id ? { ...ord, status: "ready" as const } : ord);
                                await syncDBKey("elx_orders", updated);
                                notify(`Order #${o.id} marked as READY for courier pickup!`, "ok");
                              }}
                              style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "bold", background: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Mark Ready for Courier
                            </button>
                          )}
                          {!o.isPaid && (
                            <button
                              onClick={async () => {
                                const updated = orders.map(ord => ord.id === o.id ? { ...ord, isPaid: true } : ord);
                                await syncDBKey("elx_orders", updated);
                                notify(`Order #${o.id} payment confirmed!`, "ok");
                              }}
                              style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "bold", background: "#10b981", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Confirm Payment
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Dispatch Logistics Jobs (Active) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    🚚 Active Dispatch Operations ({filteredDispatchJobs.filter(j => j.status !== "delivered" && j.status !== "canceled").length})
                  </h4>
                  <button 
                    onClick={() => setActiveTab("dispatch")}
                    style={{ fontSize: "11px", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
                  >
                    View All Dispatch
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
                  {filteredDispatchJobs.filter(j => j.status !== "delivered" && j.status !== "canceled").length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                        🚚 No active dispatch operations. Logged riders are standing by.
                      </p>
                    </div>
                  ) : (
                    filteredDispatchJobs.filter(j => j.status !== "delivered" && j.status !== "canceled").map(j => (
                      <div 
                        key={j.id}
                        style={{ 
                          padding: "12px", 
                          background: "#f8fafc", 
                          borderRadius: "8px", 
                          border: "1px solid #e2e8f0"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b" }}>Logistics Job #{j.id}</span>
                          <span style={{ 
                            fontSize: "9px", 
                            background: j.status === "pending" ? "#fee2e2" : "#d1fae5", 
                            color: j.status === "pending" ? "#b91c1c" : "#047857", 
                            padding: "2px 6px", 
                            borderRadius: "10px", 
                            fontWeight: "bold",
                            textTransform: "uppercase"
                          }}>
                            {j.status}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 8px 0", lineHeight: "1.4" }}>
                          <strong>Route:</strong> {j.pickup} ➔ {j.destination}<br />
                          <strong>Service Mode:</strong> {j.service.toUpperCase()} ({j.size})<br />
                          <strong>Assigned Courier:</strong> <span style={{ color: "#b91c1c", fontWeight: "bold" }}>{j.driverName || "Waiting for dispatcher assignment"}</span>
                        </p>

                        {j.status === "pending" && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => {
                                setSelectedDispatch(j);
                                setActiveTab("dispatch");
                                notify(`Routing to Dispatch panel to assign rider for Job #${j.id}`, "ok");
                              }}
                              style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "bold", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Assign Motorcycle Rider
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB: DISPATCH
          ========================================== */}
      {activeTab === "dispatch" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
          
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px" }}>
              🚚 Active Logistics Dispatch Directory
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredDispatchJobs.map(j => (
                <div 
                  key={j.id} 
                  onClick={() => setSelectedDispatch(j)}
                  style={{ 
                    padding: "12px", 
                    background: selectedDispatch?.id === j.id ? "#fef2f2" : "#f8fafc", 
                    borderRadius: "8px", 
                    border: "1.5px solid",
                    borderColor: selectedDispatch?.id === j.id ? "#ef4444" : "#cbd5e1",
                    cursor: "pointer" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px" }}>Job ID: #{j.id}</strong>
                    <span style={{ fontSize: "10px", background: j.status === "delivered" ? "#d1fae5" : "#fee2e2", color: j.status === "delivered" ? "#065f46" : "#991b1b", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                      {j.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    Route: {j.pickup} ➔ {j.destination}<br />
                    Courier: <strong style={{ color: "#ef4444" }}>{j.driverName || "Unassigned"}</strong> · Price: GHS {j.fee}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px" }}>
              📦 Assign Logistics Courier & Details
            </h3>

            {selectedDispatch ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <strong style={{ fontSize: "14px" }}>Job Details #{selectedDispatch.id}</strong>
                  <p style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                    Service Mode: {selectedDispatch.service.toUpperCase()}<br />
                    Parcel Size: {selectedDispatch.size} ({selectedDispatch.type})<br />
                    Sender: {selectedDispatch.name} ({selectedDispatch.phone})<br />
                    Pickup Address: {selectedDispatch.pickupAddr}
                  </p>
                </div>

                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "10px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Select Online Fleet Courier</label>
                  <select 
                    style={{ ...S.inp, padding: "8px" }}
                    onChange={async (e) => {
                      const rId = e.target.value;
                      const rObj = staffAccounts.find(s => s.id === rId);
                      if (!rObj) return;

                      await handleRoleAction(
                        "ASSIGN_DISPATCH",
                        `Assign Rider ${rObj.name} to Dispatch Job #${selectedDispatch.id}`,
                        { jobId: selectedDispatch.id, driverId: rObj.id, driverName: rObj.name },
                        async () => {
                          const updated = dispatchJobs.map(j => {
                            if (j.id === selectedDispatch.id) {
                              return { ...j, driverId: rObj.id, driverName: rObj.name, status: "assigned" as const };
                            }
                            return j;
                          });
                          await syncDBKey("elx_dispatch", updated);
                          setSelectedDispatch({ ...selectedDispatch, driverId: rObj.id, driverName: rObj.name, status: "assigned" });

                          // Push rider notification
                          const notifs = await DB.get("elx_rider_notifications") || [];
                          const newNotif = {
                            id: "NOTIF-" + Date.now(),
                            recipientId: rObj.id,
                            message: `New same-day delivery dispatch assigned: Job #${selectedDispatch.id} (GHS ${selectedDispatch.fee})`,
                            timestamp: new Date().toISOString()
                          };
                          await syncDBKey("elx_rider_notifications", [...notifs, newNotif]);
                          notify(`Courier assignment saved and notified!`, "ok");
                        }
                      );
                    }}
                  >
                    <option value="">-- Choose Rider --</option>
                    {staffAccounts.filter(s => s.role === "rider" && s.status === "active").map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.vehicleType} - {r.plateNumber})</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "20px" }}>
                Select a logistics dispatch job from the left listing to assign an active courier.
              </p>
            )}
          </div>

        </div>
      )}

      {/* ==========================================
          TAB: ORDERS & PREP
          ========================================== */}
      {activeTab === "orders" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
          
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px" }}>
              🛒 Client Orders Directory
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredOrders.map(o => (
                <div 
                  key={o.id} 
                  onClick={() => setSelectedOrder(o)}
                  style={{ 
                    padding: "12px", 
                    background: selectedOrder?.id === o.id ? "#fef2f2" : "#f8fafc", 
                    borderRadius: "8px", 
                    border: "1.5px solid",
                    borderColor: selectedOrder?.id === o.id ? "#ef4444" : "#cbd5e1",
                    cursor: "pointer" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px" }}>Order: #{o.id}</strong>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", background: o.isPaid ? "#d1fae5" : "#fee2e2", color: o.isPaid ? "#065f46" : "#991b1b", padding: "1px 6px", borderRadius: "8px", fontWeight: "bold" }}>
                        {o.isPaid ? "PAID ✓" : "UNPAID ⏳"}
                      </span>
                      <span style={{ fontSize: "9px", background: "#fecdd3", color: "#9f1239", padding: "1px 6px", borderRadius: "8px", fontWeight: "bold" }}>
                        {o.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                    Client: {o.recipientName} ({o.recipientPhone}) · Value: GHS {o.total?.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px" }}>
              🛍️ Order Fulfillment Status Panel
            </h3>

            {selectedOrder ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <strong style={{ fontSize: "14px" }}>Order Content Details:</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
                    {selectedOrder.items?.map(it => (
                      <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                        <span>{it.name} (x{it.quantity})</span>
                        <span>GHS {((it.price || 0) * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "6px", paddingTop: "6px", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
                      <span>Total Invoice</span>
                      <span>GHS {selectedOrder.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* PAID/NOT PAID TOGGLE BUTTON SYSTEM */}
                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "10px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "6px" }}>
                    💳 Payment Status Toggle
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={async () => {
                        const updated = orders.map(ord => ord.id === selectedOrder.id ? { ...ord, isPaid: true } : ord);
                        await syncDBKey("elx_orders", updated);
                        setSelectedOrder({ ...selectedOrder, isPaid: true });
                        notify(`Order #${selectedOrder.id} payment verified & marked as PAID!`, "ok");
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "11.5px",
                        fontWeight: "bold",
                        borderRadius: "6px",
                        border: "1.5px solid #10b981",
                        background: selectedOrder.isPaid ? "#10b981" : "transparent",
                        color: selectedOrder.isPaid ? "white" : "#10b981",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        transition: "all 0.2s"
                      }}
                    >
                      <Check size={14} /> Paid
                    </button>
                    <button
                      onClick={async () => {
                        const updated = orders.map(ord => ord.id === selectedOrder.id ? { ...ord, isPaid: false } : ord);
                        await syncDBKey("elx_orders", updated);
                        setSelectedOrder({ ...selectedOrder, isPaid: false });
                        notify(`Order #${selectedOrder.id} payment reversed & marked as NOT PAID.`, "ok");
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "11.5px",
                        fontWeight: "bold",
                        borderRadius: "6px",
                        border: "1.5px solid #ef4444",
                        background: !selectedOrder.isPaid ? "#ef4444" : "transparent",
                        color: !selectedOrder.isPaid ? "white" : "#ef4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        transition: "all 0.2s"
                      }}
                    >
                      <X size={14} /> Not Paid
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "10px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Update Order Status</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["preparing", "ready", "completed"].map(st => (
                      <button
                        key={st}
                        onClick={async () => {
                          const updated = orders.map(ord => ord.id === selectedOrder.id ? { ...ord, status: st as any } : ord);
                          await syncDBKey("elx_orders", updated);
                          setSelectedOrder({ ...selectedOrder, status: st as any });

                          if (st === "ready") {
                            // Create corresponding dispatch job in elx_dispatch
                            const currentJobs = await DB.get("elx_dispatch") || dispatchJobs;
                            const alreadyExists = currentJobs.some((j: any) => j.orderId === selectedOrder.id || j.id === "DISP-FOOD-" + selectedOrder.id);
                            if (!alreadyExists) {
                              const restaurantName = selectedOrder.restaurantName || (selectedOrder.items && selectedOrder.items[0]?.shop) || "Local Restaurant";
                              const newJob = {
                                id: "DISP-FOOD-" + selectedOrder.id,
                                orderId: selectedOrder.id,
                                service: "sameDay" as const,
                                size: `${selectedOrder.items?.length || 1} Items`,
                                type: "food_delivery",
                                pickup: restaurantName,
                                pickupAddr: restaurantName + ", Tarkwa",
                                destination: selectedOrder.deliveryLocation || "Tarkwa Center",
                                name: selectedOrder.recipientName || "Customer",
                                phone: selectedOrder.recipientPhone || "",
                                status: "pending" as const,
                                date: selectedOrder.date || new Date().toISOString().split("T")[0],
                                fee: selectedOrder.delivFee || 15.0,
                                recipientName: selectedOrder.recipientName,
                                recipientPhone: selectedOrder.recipientPhone,
                                recipientIsSelf: selectedOrder.recipientIsSelf,
                                recipientPin: selectedOrder.recipientPin || "4491"
                              };
                              const updatedJobs = [newJob, ...currentJobs];
                              await syncDBKey("elx_dispatch", updatedJobs);
                              setDispatchJobs(updatedJobs);
                            }
                          }

                          notify(`Order status updated to: ${st.toUpperCase()}`, "ok");
                        }}
                        style={{ flex: 1, padding: "6px", fontSize: "11px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        {st.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "20px" }}>
                Select an order from the list to view items and adjust prep status.
              </p>
            )}
          </div>

        </div>
      )}

      {/* ==========================================
          TAB: HANDYMAN
          ========================================== */}
      {activeTab === "handyman" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Handyman Personnel Directory & Management */}
          {(user?.role === "primary_admin" || user?.role === "sub_admin") && (
            <div style={S.sec}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#4f46e5" }}>
                👷 Handyman Registry & Personnel Management
              </h3>
              
              {/* Add New Handyman Form */}
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px", color: "#1e293b" }}>
                  ➕ Register New Handyman Personnel
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Kofi Manu" 
                      style={S.inp} 
                      value={newHmName} 
                      onChange={e => setNewHmName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Contact Phone</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +233245556666" 
                      style={S.inp} 
                      value={newHmPhone} 
                      onChange={e => setNewHmPhone(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Specialty / Skill</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Plumbing, Carpentry" 
                      style={S.inp} 
                      value={newHmSkill} 
                      onChange={e => setNewHmSkill(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>City Coverage</label>
                    <select 
                      style={S.inp} 
                      value={newHmCity} 
                      onChange={e => setNewHmCity(e.target.value)}
                    >
                      <option value="Tarkwa">Tarkwa</option>
                      <option value="Bogoso">Bogoso</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (!newHmName || !newHmPhone || !newHmSkill) {
                      notify("Please fill all fields to register a handyman.", "err");
                      return;
                    }
                    const newHm = {
                      id: "hm-" + Date.now(),
                      name: newHmName,
                      phone: newHmPhone,
                      skill: newHmSkill,
                      city: newHmCity
                    };
                    const updated = [...handymenRegistry, newHm];
                    await syncDBKey("elx_handyman_registry", updated);
                    setHandymenRegistry(updated);
                    setNewHmName("");
                    setNewHmPhone("");
                    setNewHmSkill("");
                    notify(`Successfully registered handyman ${newHmName}!`, "ok");
                  }}
                  style={{ ...S.cta, marginTop: "12px", background: "#4f46e5" }}
                >
                  Register Handyman Personnel
                </button>
              </div>

              {/* Handymen List */}
              <h4 style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px", color: "#1e293b" }}>
                👥 Active Handyman Fleet ({handymenRegistry.length})
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
                {handymenRegistry.map((hm: any) => (
                  <div key={hm.id} style={{ padding: "10px", background: "white", borderRadius: "8px", border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>{hm.name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        Skill: {hm.skill} · City: {hm.city}<br />
                        Phone: {hm.phone}
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        const updated = handymenRegistry.filter(h => h.id !== hm.id);
                        await syncDBKey("elx_handyman_registry", updated);
                        setHandymenRegistry(updated);
                        notify("Handyman personnel removed successfully.", "ok");
                      }}
                      style={{ background: "#ef4444", color: "white", border: "none", padding: "3px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#f59e0b" }}>
              📋 Active Handyman Repair Bookings & Tasks
            </h3>

            {filteredHandymanBookings.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "20px" }}>No Handyman requests scheduled.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredHandymanBookings.map((bk: any) => (
                  <div key={bk.id} style={{ padding: "12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "13px" }}>{bk.category?.toUpperCase()} Booking #{bk.id}</strong>
                        <span style={{ fontSize: "9px", background: bk.status === "completed" ? "#d1fae5" : "#fef3c7", color: bk.status === "completed" ? "#065f46" : "#d97706", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                          {bk.status?.toUpperCase() || "PENDING"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                        Client: <strong>{bk.name}</strong> · Contact: {bk.phone} · Address: {bk.address}<br />
                        Scheduled: {bk.scheduleDate} at {bk.scheduleTime} · Problem Details: "{bk.details}"
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button 
                        onClick={async () => {
                          const updated = handymanBookings.map((h: any) => h.id === bk.id ? { ...h, status: "in-progress" } : h);
                          await syncDBKey("elx_handyman_bookings", updated);
                          notify("Handyman marked in progress", "ok");
                        }}
                        style={{ background: "#f59e0b", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Dispatched
                      </button>
                      <button 
                        onClick={async () => {
                          const updated = handymanBookings.map((h: any) => h.id === bk.id ? { ...h, status: "completed" } : h);
                          await syncDBKey("elx_handyman_bookings", updated);
                          notify("Handyman marked completed", "ok");
                        }}
                        style={{ background: "#10b981", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB: RIDERS DIRECTORY & WALLET SYSTEM
          ========================================== */}
      {activeTab === "riders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Main Title Banner */}
          <div style={{ ...S.sec, background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)", color: "white", padding: "16px 20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              🏍️ Synced Rider Fleet Wallet & Payout Dashboard
            </h2>
            <p style={{ fontSize: "12px", opacity: 0.9, margin: "4px 0 0 0" }}>
              Monitor logistics riders, process mobile money (MoMo) cashouts, and manually adjust wallet ledgers with instant real-time synchronization.
            </p>
          </div>

          {/* Sub-Tab Navigation */}
          <div style={{ display: "flex", gap: "10px", background: "#f1f5f9", padding: "6px", borderRadius: "8px" }}>
            <button
              onClick={() => setRiderSubTab("fleet")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: riderSubTab === "fleet" ? "#ffffff" : "transparent",
                color: riderSubTab === "fleet" ? "#4f46e5" : "#64748b",
                boxShadow: riderSubTab === "fleet" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              🏍️ Rider Fleet & Wallets
            </button>
            <button
              onClick={() => setRiderSubTab("payouts")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: riderSubTab === "payouts" ? "#ffffff" : "transparent",
                color: riderSubTab === "payouts" ? "#4f46e5" : "#64748b",
                boxShadow: riderSubTab === "payouts" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <span>💸 MoMo Payout Clearance</span>
              {payoutRequests.filter(p => p.status === "pending").length > 0 && (
                <span style={{
                  background: "#ef4444",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: "bold",
                  borderRadius: "10px",
                  padding: "1px 6px"
                }}>
                  {payoutRequests.filter(p => p.status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRiderSubTab("ledger")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "bold",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: riderSubTab === "ledger" ? "#ffffff" : "transparent",
                color: riderSubTab === "ledger" ? "#4f46e5" : "#64748b",
                boxShadow: riderSubTab === "ledger" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              📜 Synced Audit Ledger
            </button>
          </div>

          {/* WALLET MANAGEMENT OVERVIEW STATS GRID */}
          {(() => {
            const deliveredDispatches = dispatchJobs.filter(j => j.status === "delivered");
            const deliveredOrders = orders.filter(o => o.status === "delivered");

            const totalDispatchesFee = deliveredDispatches.reduce((sum, j) => sum + (Number(j.fee) || 0), 0);
            const totalOrdersFee = deliveredOrders.reduce((sum, o) => sum + (Number(o.delivFee) || 15), 0);

            const totalDeliveryFeeRevenue = totalDispatchesFee + totalOrdersFee;
            const totalElextraCommission = Number((totalDeliveryFeeRevenue * 0.30).toFixed(2));
            const totalRidersShare = Number((totalDeliveryFeeRevenue * 0.70).toFixed(2));

            const totalRiderLiabilities = staffAccounts
              .filter((s: any) => s.role === "rider")
              .reduce((sum: number, r: any) => sum + (Number(r.earnings) || 0), 0);

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div style={{ ...S.sec, background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                  <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>💰 Delivery Revenue Pool</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#1e293b", marginTop: "4px" }}>GHS {totalDeliveryFeeRevenue.toFixed(2)}</div>
                  <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "2px" }}>Total gross delivery fees</div>
                </div>
                <div style={{ ...S.sec, background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                  <div style={{ fontSize: "10.5px", color: "#6b21a8", fontWeight: "bold", textTransform: "uppercase" }}>🏛️ Elextra Share (30%)</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#6b21a8", marginTop: "4px" }}>GHS {totalElextraCommission.toFixed(2)}</div>
                  <div style={{ fontSize: "10.5px", color: "#a855f7", marginTop: "2px" }}>Platform commission earned</div>
                </div>
                <div style={{ ...S.sec, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "10.5px", color: "#166534", fontWeight: "bold", textTransform: "uppercase" }}>🏍️ Riders Share (70%)</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#166534", marginTop: "4px" }}>GHS {totalRidersShare.toFixed(2)}</div>
                  <div style={{ fontSize: "10.5px", color: "#22c55e", marginTop: "2px" }}>Total generated riders share</div>
                </div>
                <div style={{ ...S.sec, background: "#fffbeb", border: "1px solid #fef08a" }}>
                  <div style={{ fontSize: "10.5px", color: "#92400e", fontWeight: "bold", textTransform: "uppercase" }}>💳 Current Upload Balance</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#92400e", marginTop: "4px" }}>GHS {totalRiderLiabilities.toFixed(2)}</div>
                  <div style={{ fontSize: "10.5px", color: "#b45309", marginTop: "2px" }}>Pending cashout payouts</div>
                </div>
              </div>
            );
          })()}

          {/* ==========================================
              SUB-TAB 1: FLEET DIRECTORY & WALLET MANAGEMENT
              ========================================== */}
          {riderSubTab === "fleet" && (
            <div style={S.sec}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "10px", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>
                  🏍️ Rider Directory & Quick Balance Controls
                </h3>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>
                  Active Riders: {staffAccounts.filter(s => s.role === "rider").length}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {staffAccounts.filter(s => s.role === "rider").map((rider: any) => {
                  const isAdjusting = adjustingRiderId === rider.id;
                  return (
                    <div key={rider.id} style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      
                      {/* Name & Status Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "15px", color: "#1e293b" }}>{rider.name}</strong>
                          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 500 }}>ID: {rider.id}</div>
                        </div>
                        <span style={{
                          fontSize: "10px",
                          background: rider.status === "active" ? "#10b981" : "#cbd5e1",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          fontWeight: "bold"
                        }}>
                          {rider.status === "active" ? "● ONLINE" : "OFFLINE"}
                        </span>
                      </div>

                      {/* Ride Details & Unpaid Balance */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", background: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", color: "#475569", lineHeight: "1.5" }}>
                          Plate: <strong style={{ color: "#1e293b" }}>{rider.plateNumber || "N/A"}</strong><br />
                          Type: <span>{rider.vehicleType || "Motorcycle"}</span><br />
                          Email: <span style={{ textTransform: "lowercase" }}>{rider.email}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>UNPAID WALLET</div>
                          <div style={{ fontSize: "16px", fontWeight: 800, color: (rider.earnings || 0) > 0 ? "#10b981" : "#64748b" }}>
                            GHS {(rider.earnings || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Toggle Adjustments Button */}
                      {!isAdjusting ? (
                        <button
                          onClick={() => {
                            setAdjustingRiderId(rider.id);
                            setAdjType("credit");
                            setAdjAmount("");
                            setAdjReason("");
                          }}
                          style={{
                            background: "#4f46e5",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            textAlign: "center",
                            width: "100%"
                          }}
                        >
                          💳 Adjust Wallet Balance
                        </button>
                      ) : (
                        <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <h4 style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 4px 0", color: "#1e293b" }}>
                            ⚙️ Adjust {rider.name}'s Wallet
                          </h4>
                          
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => setAdjType("credit")}
                              style={{
                                flex: 1,
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                background: adjType === "credit" ? "#10b981" : "#e2e8f0",
                                color: adjType === "credit" ? "white" : "#475569"
                              }}
                            >
                              ➕ Credit (Add / Bonus)
                            </button>
                            <button
                              onClick={() => setAdjType("debit")}
                              style={{
                                flex: 1,
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                background: adjType === "debit" ? "#ef4444" : "#e2e8f0",
                                color: adjType === "debit" ? "white" : "#475569"
                              }}
                            >
                              ➖ Debit (Deduct)
                            </button>
                          </div>

                          <div style={{ display: "flex", gap: "4px", flexDirection: "column" }}>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Amount (GHS) *</label>
                            <input
                              type="number"
                              placeholder="e.g. 50.00"
                              value={adjAmount}
                              onChange={e => setAdjAmount(e.target.value)}
                              style={{ ...S.inp, background: "white", padding: "6px" }}
                            />
                          </div>

                          <div style={{ display: "flex", gap: "4px", flexDirection: "column" }}>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Reason / Memo *</label>
                            <input
                              type="text"
                              placeholder="e.g. Weekly dispatch performance bonus"
                              value={adjReason}
                              onChange={e => setAdjReason(e.target.value)}
                              style={{ ...S.inp, background: "white", padding: "6px" }}
                            />
                          </div>

                          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                            <button
                              onClick={() => setAdjustingRiderId(null)}
                              style={{
                                flex: 1,
                                padding: "6px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                color: "#475569",
                                cursor: "pointer"
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                const numAmount = Number(adjAmount);
                                if (!numAmount || numAmount <= 0) {
                                  notify("Please enter a valid numeric amount greater than 0.", "err");
                                  return;
                                }
                                if (!adjReason.trim()) {
                                  notify("Please specify a reason/memo for this adjustment.", "err");
                                  return;
                                }

                                const adjustmentVal = adjType === "credit" ? numAmount : -numAmount;
                                const currentEarnings = rider.earnings || 0;
                                const targetEarnings = currentEarnings + adjustmentVal;

                                const updatedStaff = staffAccounts.map((s: any) => {
                                  if (s.id === rider.id) {
                                    return { ...s, earnings: targetEarnings };
                                  }
                                  return s;
                                });

                                await syncDBKey("elx_staff_accounts", updatedStaff);
                                setStaffAccounts(updatedStaff);

                                await logLedgerEntry(
                                  rider.id,
                                  rider.name,
                                  adjType === "credit" ? "manual_credit" : "manual_debit",
                                  numAmount,
                                  adjReason.trim(),
                                  user.name || "Manager"
                                );

                                setAdjustingRiderId(null);
                                setAdjAmount("");
                                setAdjReason("");

                                notify(`Success! GHS ${numAmount.toFixed(2)} ${adjType === "credit" ? "credited to" : "deducted from"} ${rider.name}'s wallet. Synced with rider.`, "ok");
                              }}
                              style={{
                                flex: 1,
                                padding: "6px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                borderRadius: "4px",
                                border: "none",
                                background: adjType === "credit" ? "#10b981" : "#ef4444",
                                color: "white",
                                cursor: "pointer"
                              }}
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================
              SUB-TAB 2: MOMO PAYOUT CLEARANCE QUEUE
              ========================================== */}
          {riderSubTab === "payouts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Financial Metrics Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div style={{ ...S.sec, background: "#fef3c7", padding: "14px" }}>
                  <div style={{ fontSize: "10px", color: "#b45309", fontWeight: "bold" }}>PENDING CASH CLEARANCES</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#92400e", marginTop: "4px" }}>
                    GHS {payoutRequests.filter(p => p.status === "pending").reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#b45309", marginTop: "2px" }}>
                    {payoutRequests.filter(p => p.status === "pending").length} active requests pending
                  </div>
                </div>
                <div style={{ ...S.sec, background: "#d1fae5", padding: "14px" }}>
                  <div style={{ fontSize: "10px", color: "#065f46", fontWeight: "bold" }}>TOTAL DISBURSED (PAID)</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#065f46", marginTop: "4px" }}>
                    GHS {payoutRequests.filter(p => p.status === "approved").reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#047857", marginTop: "2px" }}>
                    {payoutRequests.filter(p => p.status === "approved").length} requests cleared & settled
                  </div>
                </div>
                <div style={{ ...S.sec, background: "#fee2e2", padding: "14px" }}>
                  <div style={{ fontSize: "10px", color: "#991b1b", fontWeight: "bold" }}>TOTAL REJECTED & REFUNDED</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#991b1b", marginTop: "4px" }}>
                    GHS {payoutRequests.filter(p => p.status === "rejected").reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "2px" }}>
                    {payoutRequests.filter(p => p.status === "rejected").length} requests returned to wallets
                  </div>
                </div>
              </div>

              {/* Clearance Queue Panel */}
              <div style={S.sec}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "10px", marginBottom: "16px" }}>
                  💸 Active Cash Payout Clearing & Dispatch Queue
                </h3>

                {payoutRequests.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "20px" }}>
                    No payout logs found in shared history.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {payoutRequests.map((p: any) => (
                      <div key={p.id} style={{ padding: "14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        
                        {/* Header metadata */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <span style={{ fontSize: "9px", background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                              REF: {p.id}
                            </span>
                            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b", marginTop: "4px" }}>
                              {p.riderName} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>(Rider ID: {p.riderId})</span>
                            </div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                              Requested at: {new Date(p.requestedAt).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>
                              GHS {Number(p.amount).toFixed(2)}
                            </div>
                            <span style={{
                              fontSize: "10px",
                              fontWeight: "bold",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              display: "inline-block",
                              marginTop: "4px",
                              background: p.status === "approved" ? "#d1fae5" : p.status === "pending" ? "#fef3c7" : "#fee2e2",
                              color: p.status === "approved" ? "#065f46" : p.status === "pending" ? "#b45309" : "#991b1b"
                            }}>
                              {p.status?.toUpperCase() || "PENDING"}
                            </span>
                          </div>
                        </div>

                        {/* MoMo Provider & Phone */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>MoMo Provider</span>
                            <div style={{ fontWeight: "bold", color: "#475569", marginTop: "2px" }}>{p.provider}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>Phone & Wallet Name</span>
                            <div style={{ fontWeight: "bold", color: "#475569", marginTop: "2px" }}>
                              {p.walletPhone} <span style={{ color: "#64748b", fontWeight: "normal" }}>({p.walletName})</span>
                            </div>
                          </div>
                        </div>

                        {p.rejectionReason && (
                          <div style={{ background: "#fef2f2", padding: "8px", borderRadius: "6px", border: "1px solid #fca5a5", fontSize: "11px", color: "#b91c1c" }}>
                            <strong>Rejection Reason:</strong> "{p.rejectionReason}"
                          </div>
                        )}

                        {p.status === "approved" && (
                          <div style={{
                            background: p.riderConfirmedReceived ? "#ecfdf5" : "#f1f5f9",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: p.riderConfirmedReceived ? "1.5px solid #10b981" : "1px dashed #cbd5e1",
                            fontSize: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                            <span style={{ fontWeight: "bold", color: p.riderConfirmedReceived ? "#047857" : "#475569" }}>
                              {p.riderConfirmedReceived ? "✅ Rider Confirmed Payment Received" : "⏳ Pending Rider Receipt Confirmation"}
                            </span>
                            {p.riderConfirmedAt && (
                              <span style={{ fontSize: "10px", color: "#64748b" }}>
                                Confirmed: {new Date(p.riderConfirmedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Admin Action Buttons (if pending) */}
                        {p.status === "pending" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px dashed #cbd5e1", paddingTop: "10px", marginTop: "4px" }}>
                            
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <input
                                type="text"
                                placeholder="Enter rejection reason if declining request..."
                                value={rejectionReasonInput[p.id] || ""}
                                onChange={e => setRejectionReasonInput({ ...rejectionReasonInput, [p.id]: e.target.value })}
                                style={{ ...S.inp, background: "#ffffff", flex: 1, padding: "8px", fontSize: "12px" }}
                              />
                            </div>

                            <div style={{ display: "flex", gap: "10px" }}>
                              <button
                                onClick={async () => {
                                  const reason = rejectionReasonInput[p.id]?.trim() || "Details did not match system records.";
                                  
                                  // Revert money to rider's wallet
                                  const updatedStaff = staffAccounts.map((s: any) => {
                                    if (s.id === p.riderId) {
                                      return { ...s, earnings: (s.earnings || 0) + Number(p.amount) };
                                    }
                                    return s;
                                  });

                                  // Change status to rejected
                                  const updatedPayouts = payoutRequests.map((r: any) => {
                                    if (r.id === p.id) {
                                      return { ...r, status: "rejected" as const, rejectionReason: reason, processedAt: new Date().toISOString() };
                                    }
                                    return r;
                                  });

                                  await syncDBKey("elx_payout_requests", updatedPayouts);
                                  await syncDBKey("elx_staff_accounts", updatedStaff);

                                  setPayoutRequests(updatedPayouts);
                                  setStaffAccounts(updatedStaff);

                                  await logLedgerEntry(
                                    p.riderId,
                                    p.riderName,
                                    "payout_rejected",
                                    Number(p.amount),
                                    `MoMo Payout Rejected & Wallet Refunded: ${reason}`,
                                    user.name || "Manager"
                                  );

                                  // Clear input
                                  setRejectionReasonInput({ ...rejectionReasonInput, [p.id]: "" });

                                  notify(`Payout request rejected. GHS ${Number(p.amount).toFixed(2)} refunded to ${p.riderName}'s wallet immediately.`, "ok");
                                }}
                                style={{
                                  flex: 1,
                                  background: "#fee2e2",
                                  color: "#b91c1c",
                                  border: "1px solid #fca5a5",
                                  padding: "8px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  cursor: "pointer"
                                }}
                              >
                                🔴 Reject & Refund Wallet
                              </button>

                              <button
                                onClick={async () => {
                                  // Change status to approved
                                  const updatedPayouts = payoutRequests.map((r: any) => {
                                    if (r.id === p.id) {
                                      return { ...r, status: "approved" as const, processedAt: new Date().toISOString() };
                                    }
                                    return r;
                                  });

                                  await syncDBKey("elx_payout_requests", updatedPayouts);
                                  setPayoutRequests(updatedPayouts);

                                  await logLedgerEntry(
                                    p.riderId,
                                    p.riderName,
                                    "payout_approved",
                                    Number(p.amount),
                                    `Disbursed MoMo Payout GHS ${Number(p.amount).toFixed(2)} via ${p.provider} to ${p.walletPhone}`,
                                    user.name || "Manager"
                                  );

                                  notify(`Payout Approved! GHS ${Number(p.amount).toFixed(2)} payout cleared successfully. Rider synced. 🚀`, "ok");
                                }}
                                style={{
                                  flex: 2,
                                  background: "#10b981",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  cursor: "pointer"
                                }}
                              >
                                🟢 Approve & Mark Disbursed via MoMo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              SUB-TAB 3: AUDIT TRANSACTION LEDGER
              ========================================== */}
          {riderSubTab === "ledger" && (
            <div style={S.sec}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "10px", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>
                  📜 Global Synced Audit Transaction Logs
                </h3>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>
                  Logs Recorded: {riderLedger.length}
                </span>
              </div>

              {/* CSV Export Toggle & Action Buttons */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>CSV Export Scope:</span>
                  <button
                    onClick={() => setExportDailyOnly(true)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      borderRadius: "6px",
                      border: "none",
                      background: exportDailyOnly ? "#10b981" : "#e2e8f0",
                      color: exportDailyOnly ? "white" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    📅 Today Only
                  </button>
                  <button
                    onClick={() => setExportDailyOnly(false)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      borderRadius: "6px",
                      border: "none",
                      background: !exportDailyOnly ? "#10b981" : "#e2e8f0",
                      color: !exportDailyOnly ? "white" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    🌐 All Historical
                  </button>
                </div>

                <button
                  onClick={() => handleExportCSV(exportDailyOnly)}
                  style={{
                    background: "#4f46e5",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginLeft: "auto"
                  }}
                >
                  📥 Export to CSV
                </button>
              </div>

              {riderLedger.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "20px" }}>
                  No wallet transaction ledger logs registered in DB.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "500px", overflowY: "auto" }}>
                  {riderLedger.map((l: any) => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <div style={{ flex: 1, paddingRight: "12px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: "9px",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: l.type?.includes("credit") || l.type === "delivery_earnings" ? "#ecfdf5" : "#fef2f2",
                            color: l.type?.includes("credit") || l.type === "delivery_earnings" ? "#059669" : "#dc2626"
                          }}>
                            {l.type?.replace("_", " ").toUpperCase()}
                          </span>
                          <strong style={{ fontSize: "12px", color: "#1e293b" }}>{l.riderName}</strong>
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                            {new Date(l.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#334155", margin: "6px 0 0 0", fontWeight: 500 }}>
                          {l.description}
                        </p>
                        <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "4px" }}>
                          ID: <span style={{ fontFamily: "monospace" }}>{l.id}</span> · Performed By: <strong style={{ color: "#4f46e5" }}>{l.performedBy}</strong>
                        </div>
                      </div>
                      <div style={{
                        fontSize: "15px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        color: l.type?.includes("credit") || l.type === "delivery_earnings" ? "#10b981" : "#ef4444"
                      }}>
                        {l.type?.includes("credit") || l.type === "delivery_earnings" ? "+" : "-"} GHS {Number(l.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          TAB: APPROVALS QUEUE (Admin Only)
          ========================================== */}
      {activeTab === "approvals" && (user?.role === "primary_admin" || customAllowedTabs.includes("approvals")) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Sub-Admin Actions queue */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={18} style={{ color: "#10b981" }} /> Pending Sub-Admin Actions Clearing Queue ({pendingApprovals.length})
            </h3>
            {pendingApprovals.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "10px" }}>No action clearance logs in queue.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {pendingApprovals.map(prop => (
                  <div key={prop.id} style={{ padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "13px" }}>{prop.description}</strong>
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                        Submitted by Sub-Admin: {prop.proposer} ({prop.proposerEmail}) at {new Date(prop.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => handleApproveProposal(prop.id)} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Approve
                      </button>
                      <button onClick={() => handleRejectProposal(prop.id)} style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catalog Proposals queue */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Store size={18} style={{ color: "#ec4899" }} /> Pending Seller Price Proposals Queue ({catalogProposals.length})
            </h3>
            {catalogProposals.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "10px" }}>No catalog adjustment proposals pending.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {catalogProposals.map(prop => (
                  <div key={prop.id} style={{ padding: "12px", background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "13px" }}>Merchant: "{prop.shopName}" Proposed Price Change</strong>
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                        Item: <strong>{prop.productName}</strong> · From: GHS {prop.originalPrice.toFixed(2)} ➔ <strong style={{ color: "#db2777" }}>GHS {prop.proposedPrice.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => handleApproveCatalogProposal(prop.id)} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Clear
                      </button>
                      <button onClick={() => handleRejectCatalogProposal(prop.id)} style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Onboarding Applications queue */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={18} style={{ color: "#3b82f6" }} /> Pending Partner & Rider Onboarding Applications ({applications.length})
            </h3>
            {applications.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "10px" }}>No candidate registration applications in queue.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {applications.map(app => (
                  <div key={app.id} style={{ padding: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "13px" }}>Onboard Candidate: {app.name || app.shopName} ({app.type?.toUpperCase()})</strong>
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                        Email: {app.email} · Phone: {app.phone}<br />
                        {app.type === "rider" ? (
                          <>Vehicle: {app.vehicleType} · Plate: {app.plateNumber}</>
                        ) : (
                          <>Shop Category: {app.category?.toUpperCase()} · Physical Landmark: {app.address}</>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => handleApproveApplication(app.id)} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Authorize Credentials
                      </button>
                      <button onClick={() => handleRejectApplication(app.id)} style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==========================================
          TAB: COUPONS
          ========================================== */}
      {activeTab === "coupons" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
          
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px" }}>
              🎁 Active Promo Coupons List
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {couponsSetting.map((c, idx) => (
                <div key={idx} style={{ padding: "10px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#ef4444" }}>Code: {c.code}</span>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Value: GHS {c.discount} off · {c.desc}</div>
                  </div>
                  <button 
                    onClick={async () => {
                      await handleRoleAction(
                        "DELETE_COUPON",
                        `Delete promo coupon "${c.code}"`,
                        { code: c.code },
                        async () => {
                          const updated = couponsSetting.filter((x, i) => i !== idx);
                          await syncDBKey("elx_coupons", updated);
                          setCouponsSetting(updated);
                          notify("Coupon cleared successfully.", "ok");
                        }
                      );
                    }}
                    style={{ background: "#dc2626", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px" }}>
              ➕ Create New Promo Coupon
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Promo Code Name</label>
                <input style={S.inp} placeholder="e.g. TARKWA_PRO" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Flat Discount Value (GHS)</label>
                <input style={S.inp} type="number" placeholder="e.g. 25" value={newCouponValue} onChange={e => setNewCouponValue(e.target.value)} />
              </div>

              <button 
                onClick={async () => {
                  if (!newCouponCode || !newCouponValue) {
                    notify("Please specify both Coupon Code and GHS value.", "err");
                    return;
                  }

                  const newC = {
                    code: newCouponCode.trim().toUpperCase(),
                    discount: Number(newCouponValue),
                    desc: `GHS ${newCouponValue} off promo coupon code`
                  };

                  await handleRoleAction(
                    "CREATE_COUPON",
                    `Create Promo Coupon "${newC.code}" with value GHS ${newC.discount}`,
                    newC,
                    async () => {
                      const updated = [...couponsSetting, newC];
                      await syncDBKey("elx_coupons", updated);
                      setCouponsSetting(updated);
                      setNewCouponCode("");
                      setNewCouponValue("");
                      notify("New promo coupon registered!", "ok");
                    }
                  );
                }}
                style={S.cta}
              >
                Add Promo Coupon
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ==========================================
          TAB: USERS DIRECTORY (Admin & Managers Oversee)
          ========================================== */}
      {activeTab === "users" && (user?.role === "primary_admin" || user?.role === "sub_admin" || user?.role === "manager" || customAllowedTabs.includes("users")) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Sub-navigation segments */}
          <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
            {user?.role === "primary_admin" && (
              <button
                onClick={() => setUsersSubTab("customers")}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  fontSize: "11.5px",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  background: usersSubTab === "customers" ? "#1e293b" : "transparent",
                  color: usersSubTab === "customers" ? "white" : "#475569",
                  transition: "all 0.2s"
                }}
              >
                👥 Registered Customers ({usersList.length})
              </button>
            )}
            <button
              onClick={() => setUsersSubTab("staff")}
              style={{
                flex: 1,
                padding: "6px 12px",
                fontSize: "11.5px",
                fontWeight: "bold",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: usersSubTab === "staff" ? "#1e293b" : "transparent",
                color: usersSubTab === "staff" ? "white" : "#475569",
                transition: "all 0.2s"
              }}
            >
              🛡️ Staff & Operations Fleet Directory
            </button>
            <button
              onClick={() => setUsersSubTab("sellers")}
              style={{
                flex: 1,
                padding: "6px 12px",
                fontSize: "11.5px",
                fontWeight: "bold",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: usersSubTab === "sellers" ? "#1e293b" : "transparent",
                color: usersSubTab === "sellers" ? "white" : "#475569",
                transition: "all 0.2s"
              }}
            >
              🏬 Fast Food Joints & Sellers ({foodPlaces.length})
            </button>
          </div>

          {/* Registered Customers View */}
          {user?.role === "primary_admin" && usersSubTab === "customers" && (
            <div style={S.sec}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#1e293b" }}>
                👥 Registered Customer Accounts
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "500px", overflowY: "auto" }}>
                {usersList.map((u: any) => (
                  <div key={u.id} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1", display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ fontSize: "13px" }}>{u.name}</strong>
                        <span style={{ fontSize: "9px", background: "#3b82f6", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                          CUSTOMER
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        Email: {u.email} · Phone: {u.phone} · Landmark: {u.location || "N/A"}
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        const updated = usersList.filter(x => x.id !== u.id);
                        await syncDBKey("elx_users", updated);
                        setUsersList(updated);
                        notify("User profile removed from registries.", "err");
                      }}
                      style={{ background: "#dc2626", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Directory View */}
          {(usersSubTab === "staff" || (user?.role !== "primary_admin" && usersSubTab !== "sellers")) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Register New Candidate (Manager or Sub Admin propose candidate to Admins for review) */}
              {(user?.role === "manager" || user?.role === "sub_admin") && (
                <div style={S.sec}>
                  <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "6px", marginBottom: "10px", color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>➕</span> Register New Candidate (Seller / Rider Onboarding)
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Onboard Role</label>
                      <select
                        style={S.inp}
                        value={onboardType}
                        onChange={(e: any) => setOnboardType(e.target.value)}
                      >
                        <option value="seller">Seller Partner</option>
                        <option value="rider">Rider / Dispatch Courier</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Candidate Full Name / Brand Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Kofi Mensah / Pizzaman" 
                        style={S.inp} 
                        value={onboardName} 
                        onChange={e => setOnboardName(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Email Address</label>
                      <input 
                        type="email" 
                        placeholder="e.g. kofi@gmail.com" 
                        style={S.inp} 
                        value={onboardEmail} 
                        onChange={e => setOnboardEmail(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Phone Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. +233 24 000 0000" 
                        style={S.inp} 
                        value={onboardPhone} 
                        onChange={e => setOnboardPhone(e.target.value)} 
                      />
                    </div>
                  </div>

                  {onboardType === "seller" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Restaurant/Store Cuisine Category</label>
                        <select
                          style={S.inp}
                          value={onboardCategory}
                          onChange={(e: any) => setOnboardCategory(e.target.value)}
                        >
                          <option value="provisions">Provisions Mall</option>
                          <option value="local_dishes">Ghanaian Local Dishes</option>
                          <option value="pizza_burgers">Pizza & Burger Joints</option>
                          <option value="pastries">Pastries & Dessert</option>
                          <option value="extra_fast_food">Elextra Fast Food Customizer</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Store Address / Landmark</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Tarkwa Central St, near Bank of Ghana" 
                          style={S.inp} 
                          value={onboardAddress} 
                          onChange={e => setOnboardAddress(e.target.value)} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Vehicle Mode</label>
                        <select
                          style={S.inp}
                          value={onboardVehicleType}
                          onChange={(e: any) => setOnboardVehicleType(e.target.value)}
                        >
                          <option value="Motorcycle">Motorcycle / Motorbike</option>
                          <option value="Bicycle">Bicycle / e-Bike</option>
                          <option value="Car">Courier Dispatch Car</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>License Plate Registration Number</label>
                        <input 
                          type="text" 
                          placeholder="e.g. GW-8392-26" 
                          style={S.inp} 
                          value={onboardPlateNumber} 
                          onChange={e => setOnboardPlateNumber(e.target.value)} 
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "10px" }}>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Set Login Passcode / Password for this Account</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Pass1234 or MoMoSecure99" 
                      style={S.inp} 
                      value={onboardPassword} 
                      onChange={e => setOnboardPassword(e.target.value)} 
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                    <button 
                      onClick={async () => {
                        if (!onboardName || !onboardEmail || !onboardPhone) {
                          notify("Please complete all candidate registration fields.", "err");
                          return;
                        }
                        const newApp = {
                          id: "APP-" + Date.now(),
                          type: onboardType,
                          name: onboardName,
                          email: onboardEmail.trim(),
                          phone: onboardPhone,
                          password: onboardPassword || "Elextra99",
                          status: "pending",
                          submittedAt: new Date().toISOString(),
                          submittedBy: user.name,
                          ...(onboardType === "rider" ? {
                            vehicleType: onboardVehicleType,
                            plateNumber: onboardPlateNumber || "GW-PENDING-26"
                          } : {
                            category: onboardCategory,
                            shopName: onboardName,
                            shopId: onboardCategory,
                            location: onboardAddress || "Tarkwa Central"
                          })
                        };

                        const updatedApps = [...applications, newApp];
                        await syncDBKey("elx_applications", updatedApps);
                        setApplications(updatedApps);

                        // Clear inputs
                        setOnboardName("");
                        setOnboardEmail("");
                        setOnboardPhone("");
                        setOnboardAddress("");
                        setOnboardPlateNumber("");
                        setOnboardPassword("");

                        notify("Onboarding application submitted to Admin clearance queue! 🚀", "ok");
                      }}
                      style={{ ...S.cta, background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
                    >
                      🚀 Submit Application to Admin Clearance
                    </button>
                  </div>
                </div>
              )}

              {/* Add New Staff (Primary Admin only) */}
              {user?.role === "primary_admin" && (
                <div style={S.sec}>
                  <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "6px", marginBottom: "10px", color: "#10b981" }}>
                    ➕ Add Manager or Staff Member Straight from Page
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Kwame Appiah" 
                        style={S.inp} 
                        value={newStaffName} 
                        onChange={e => setNewStaffName(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Email Address</label>
                      <input 
                        type="email" 
                        placeholder="e.g. appiah@elextra.xyz" 
                        style={S.inp} 
                        value={newStaffEmail} 
                        onChange={e => setNewStaffEmail(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Phone Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 0244444444" 
                        style={S.inp} 
                        value={newStaffPhone} 
                        onChange={e => setNewStaffPhone(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Role Option</label>
                      <select 
                        style={S.inp} 
                        value={newStaffRole} 
                        onChange={e => setNewStaffRole(e.target.value)}
                      >
                        <option value="manager">Manager</option>
                        <option value="sub_admin">Sub Admin</option>
                        <option value="rider">Rider</option>
                        <option value="seller">Seller</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Login Passcode/Password</label>
                      <input 
                        type="text" 
                        placeholder="Set password" 
                        style={S.inp} 
                        value={newStaffPassword} 
                        onChange={e => setNewStaffPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!newStaffName || !newStaffEmail || !newStaffPassword || !newStaffPhone) {
                        notify("Please fill all fields (Name, Email, Phone, Passcode) to onboard staff.", "err");
                        return;
                      }
                      let dynamicShopId = "provisions";
                      if (newStaffRole === "seller") {
                        dynamicShopId = "rest-" + Date.now();
                        const currentFoodPlaces = await DB.get("elx_food_places") || FOOD_PLACES;
                        const newPlace = {
                          id: dynamicShopId,
                          name: newStaffName + " Joint",
                          hours: "8:00 AM - 10:00 PM",
                          cuisine: "Ghanaian Fast Food",
                          type: "Ghanaian Fast Food",
                          rating: 4.8,
                          reviewsCount: 15,
                          address: "Tarkwa",
                          location: "Tarkwa",
                          imgUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400",
                          status: "active",
                          city: "tarkwa" as const,
                          menu: []
                        };
                        const updatedPlaces = [...currentFoodPlaces, newPlace];
                        await syncDBKey("elx_food_places", updatedPlaces);
                        setFoodPlaces(updatedPlaces);
                      }

                      const newStaff = {
                        id: "STAFF-" + Date.now(),
                        name: newStaffName,
                        email: newStaffEmail,
                        phone: newStaffPhone,
                        role: newStaffRole,
                        password: newStaffPassword,
                        approved: true,
                        status: "active",
                        ...(newStaffRole === "seller" ? {
                          shopId: dynamicShopId,
                          shopName: newStaffName + " Joint"
                        } : {})
                      };
                      const updated = [...staffAccounts, newStaff];
                      await syncDBKey("elx_staff_accounts", updated);
                      setStaffAccounts(updated);
                      setNewStaffName("");
                      setNewStaffEmail("");
                      setNewStaffPhone("");
                      setNewStaffPassword("");
                      notify(`Successfully added ${newStaffName} as ${newStaffRole.toUpperCase()}!`, "ok");
                    }}
                    style={{ ...S.cta, marginTop: "12px", background: "#10b981" }}
                  >
                    Add Staff Member
                  </button>
                </div>
              )}

              {/* Staff Oversight List */}
              <div style={S.sec}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "6px", marginBottom: "10px", color: "#4f46e5" }}>
                  🛡️ Active System Staff Oversight Panel
                </h3>
                <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
                  {user?.role === "primary_admin" && "Showing all active logistics, management, and seller personnel. Lock or unlock credentials on the fly."}
                  {user?.role === "sub_admin" && "Oversight Access: Displaying managers, riders, and sellers."}
                  {user?.role === "manager" && "Oversight Access: Displaying riders and sellers."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "500px", overflowY: "auto" }}>
                  {staffAccounts
                    .filter((s: any) => {
                      if (user?.role === "primary_admin") return s.id !== user.id; // See all other staff
                      if (user?.role === "sub_admin") return ["manager", "rider", "seller"].includes(s.role);
                      if (user?.role === "manager") return ["rider", "seller"].includes(s.role);
                      return false;
                    })
                    .map((staff: any) => {
                      const isLocked = staff.status === "locked";
                      return (
                        <div key={staff.id} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong style={{ fontSize: "13.5px" }}>{staff.name}</strong>
                                <span style={{ fontSize: "9px", background: "#6366f1", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                  {staff.role?.toUpperCase()}
                                </span>
                                <span style={{ fontSize: "9px", background: isLocked ? "#fee2e2" : "#d1fae5", color: isLocked ? "#ef4444" : "#10b981", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                  {staff.status?.toUpperCase() || "ACTIVE"}
                                </span>
                                {staff.designatedLocation && (
                                  <span style={{ fontSize: "9px", background: "#f59e0b", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                    📍 {staff.designatedLocation.toUpperCase() === "ALL" ? "ALL LOCATIONS" : staff.designatedLocation.toUpperCase()}
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setMemoRecipientId(staff.id);
                                    setActiveTab("management_chat");
                                    notify(`Switched to Memo board! You can now send a private direct message to ${staff.name}.`, "ok");
                                  }}
                                  style={{
                                    padding: "2px 8px",
                                    background: "#e0e7ff",
                                    color: "#4338ca",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3.5px",
                                    transition: "all 0.15s"
                                  }}
                                  title={`Send private direct message to ${staff.name}`}
                                >
                                  ✉️ Send DM
                                </button>
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                Staff ID: {staff.id} {staff.phone ? `· Phone: ${staff.phone}` : ""} {staff.plateNumber ? `· Plate: ${staff.plateNumber}` : ""}
                              </div>
                            </div>

                            {/* Lock/Unlock actions - Only for Primary Admin */}
                            {user?.role === "primary_admin" && (
                              <button
                                onClick={async () => {
                                  const newStatus = isLocked ? "active" : "locked";
                                  const updated = staffAccounts.map((s: any) => s.id === staff.id ? { ...s, status: newStatus } : s);
                                  await syncDBKey("elx_staff_accounts", updated);
                                  setStaffAccounts(updated);
                                  notify(`Staff account ${staff.name} is now ${newStatus.toUpperCase()}!`, "ok");
                                }}
                                style={{
                                  background: isLocked ? "#10b981" : "#ef4444",
                                  color: "white",
                                  border: "none",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "bold",
                                  cursor: "pointer"
                                }}
                              >
                                {isLocked ? "🔑 Unlock" : "🔒 Lock"}
                              </button>
                            )}
                          </div>

                          {/* Sensitive Info & Edit Form - Only for Primary Admin */}
                          {user?.role === "primary_admin" ? (
                            <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Staff Email</label>
                                  <input 
                                    type="text" 
                                    defaultValue={staff.email}
                                    onBlur={async (e) => {
                                      const newEmail = e.target.value.trim();
                                      if (newEmail) {
                                        const updated = staffAccounts.map((s: any) => s.id === staff.id ? { ...s, email: newEmail } : s);
                                        await syncDBKey("elx_staff_accounts", updated);
                                        setStaffAccounts(updated);
                                        notify(`Email updated for ${staff.name}!`, "ok");
                                      }
                                    }}
                                    style={{ width: "100%", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "white" }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Phone Number</label>
                                  <input 
                                    type="text" 
                                    defaultValue={staff.phone || ""}
                                    onBlur={async (e) => {
                                      const newPhone = e.target.value.trim();
                                      const updated = staffAccounts.map((s: any) => s.id === staff.id ? { ...s, phone: newPhone } : s);
                                      await syncDBKey("elx_staff_accounts", updated);
                                      setStaffAccounts(updated);
                                      notify(`Phone number updated for ${staff.name}!`, "ok");
                                    }}
                                    style={{ width: "100%", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "white" }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Passcode / Password</label>
                                  <input 
                                    type="text" 
                                    defaultValue={staff.password}
                                    onBlur={async (e) => {
                                      const newPass = e.target.value.trim();
                                      if (newPass) {
                                        const updated = staffAccounts.map((s: any) => s.id === staff.id ? { ...s, password: newPass } : s);
                                        await syncDBKey("elx_staff_accounts", updated);
                                        setStaffAccounts(updated);
                                        notify(`Password updated for ${staff.name}!`, "ok");
                                      }
                                    }}
                                    style={{ width: "100%", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "white" }}
                                  />
                                </div>
                              </div>
                              {/* Designated Location Setting */}
                              <div style={{ marginTop: "6px" }}>
                                <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Designate Hub Location (Tarkwa only, Bogoso only, or All)</label>
                                <select 
                                  defaultValue={staff.designatedLocation || "all"}
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    const updated = staffAccounts.map((s: any) => s.id === staff.id ? { ...s, designatedLocation: val } : s);
                                    await syncDBKey("elx_staff_accounts", updated);
                                    setStaffAccounts(updated);
                                    notify(`Designated location for ${staff.name} set to ${val.toUpperCase()}!`, "ok");
                                  }}
                                  style={{ width: "100%", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "white" }}
                                >
                                  <option value="all">All Locations (Global Access)</option>
                                  <option value="Tarkwa">Tarkwa</option>
                                  <option value="Bogoso">Bogoso</option>
                                </select>
                              </div>
                              <span style={{ fontSize: "9px", color: "#64748b", fontStyle: "italic" }}>* Editing email/password automatically updates instantly on blur.</span>

                              {/* Custom Permissions & Tab Access - Only for Admin Main */}
                              <div style={{ marginTop: "10px", borderTop: "1.5px dashed #cbd5e1", paddingTop: "8px" }}>
                                <div style={{ fontSize: "11.5px", fontWeight: "bold", color: "#1e293b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "12px" }}>🔑</span> 
                                  <span>Manage Custom Tab Access & Live Editing Privileges</span>
                                </div>
                                <p style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px" }}>
                                  Grant custom authorization to other dashboard tabs. Giving <strong>Direct Editing</strong> bypasses the clearance approvals queue.
                                </p>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {[
                                    { id: "gemini_copilot", label: "✨ Gemini Copilot" },
                                    { id: "approvals", label: "🔔 Approvals Queue" },
                                    { id: "coupons", label: "🎁 Promo Coupons" },
                                    { id: "users", label: "👥 Oversee Staff" },
                                    { id: "food_requests", label: "🍔 Food Adjustments" },
                                    { id: "catalog_manager", label: "📦 Catalog Inventory" },
                                    { id: "food_catalog_manager", label: "🍔 Menu Inventory" },
                                    { id: "image_verification", label: "🔍 Verification" },
                                    { id: "settings", label: "⚙️ Settings Config" },
                                    { id: "management_chat", label: "💬 Memos & Chat" }
                                  ].map(tab => {
                                    const hasAccess = (staff.allowedTabs || []).includes(tab.id);
                                    return (
                                      <button
                                        key={tab.id}
                                        onClick={async () => {
                                          const currentAllowed = staff.allowedTabs || [];
                                          const newAllowed = currentAllowed.includes(tab.id)
                                            ? currentAllowed.filter((t: string) => t !== tab.id)
                                            : [...currentAllowed, tab.id];
                                          
                                          const updated = staffAccounts.map((s: any) =>
                                            s.id === staff.id ? { ...s, allowedTabs: newAllowed } : s
                                          );
                                          await syncDBKey("elx_staff_accounts", updated);
                                          setStaffAccounts(updated);
                                          notify(`Updated tab access for ${staff.name}!`, "ok");
                                        }}
                                        style={{
                                          padding: "4px 8px",
                                          fontSize: "10px",
                                          borderRadius: "6px",
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          border: `1px solid ${hasAccess ? "#10b981" : "#cbd5e1"}`,
                                          background: hasAccess ? "#d1fae5" : "white",
                                          color: hasAccess ? "#065f46" : "#475569",
                                          transition: "all 0.15s",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px"
                                        }}
                                      >
                                        <span style={{ fontSize: "10px" }}>{hasAccess ? "●" : "○"}</span>
                                        <span>{tab.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <button
                                    onClick={async () => {
                                      const isDirect = !!staff.directEditing;
                                      const updated = staffAccounts.map((s: any) =>
                                        s.id === staff.id ? { ...s, directEditing: !isDirect } : s
                                      );
                                      await syncDBKey("elx_staff_accounts", updated);
                                      setStaffAccounts(updated);
                                      notify(`Direct editing updated for ${staff.name}!`, "ok");
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "10.5px",
                                      borderRadius: "6px",
                                      fontWeight: "bold",
                                      cursor: "pointer",
                                      border: `1px solid ${staff.directEditing ? "#d97706" : "#cbd5e1"}`,
                                      background: staff.directEditing ? "#fef3c7" : "white",
                                      color: staff.directEditing ? "#92400e" : "#475569",
                                      transition: "all 0.15s",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px"
                                    }}
                                  >
                                    <span>{staff.directEditing ? "⚡ Direct Live Editing Active" : "🔒 Propose-Only Mode (Needs Admin Approval)"}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Hidden for sub_admins and managers
                            <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", background: "#f1f5f9", padding: "6px", borderRadius: "4px" }}>
                              🔒 Credentials and security settings hidden from view (Admin Main only).
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          )}

          {/* Sellers & Food Places View */}
          {usersSubTab === "sellers" && (
            <div style={S.sec}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#1e293b" }}>
                🏬 Fast Food Joints & Merchant Shops
              </h3>
              <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "16px" }}>
                Showing all registered fast food joints and active sellers in Tarkwa and Bogoso. Admins can edit details directly; Managers' modifications are sent to Admin for clearance.
              </p>

              {/* Add New Fast Food Joint Form */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "20px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>➕</span> Register New Fast Food Joint / Seller Vendor
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Joint Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Auntie Mary's Fufu Joint" 
                      style={S.inp} 
                      value={directJointName} 
                      onChange={e => setDirectJointName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Cuisine Style *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ghanaian Local Dishes" 
                      style={S.inp} 
                      value={directJointCuisine} 
                      onChange={e => setDirectJointCuisine(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Hub Location *</label>
                    <select 
                      style={S.inp} 
                      value={directJointCity} 
                      onChange={e => setDirectJointCity(e.target.value)}
                    >
                      <option value="Tarkwa">Tarkwa</option>
                      <option value="Bogoso">Bogoso</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Operating Hours</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 8:00 AM - 10:00 PM" 
                      style={S.inp} 
                      value={directJointHours} 
                      onChange={e => setDirectJointHours(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Image URL (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Custom photo URL" 
                      style={S.inp} 
                      value={directJointImgUrl} 
                      onChange={e => setDirectJointImgUrl(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Seller Login Email *</label>
                    <input 
                      type="email" 
                      placeholder="mary@elextra.xyz" 
                      style={S.inp} 
                      value={directJointEmail} 
                      onChange={e => setDirectJointEmail(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Seller Login Passcode *</label>
                    <input 
                      type="text" 
                      placeholder="Passcode" 
                      style={S.inp} 
                      value={directJointPassword} 
                      onChange={e => setDirectJointPassword(e.target.value)} 
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={async () => {
                      if (!directJointName.trim() || !directJointCuisine.trim()) {
                        notify("Please fill in the Joint Name and Cuisine Style.", "err");
                        return;
                      }
                      if (!directJointEmail.trim() || !directJointPassword.trim()) {
                        notify("Please provide a Seller login email and passcode.", "err");
                        return;
                      }
                      
                      const newId = "f_" + Date.now();
                      const nextJoint = {
                        id: newId,
                        name: directJointName.trim(),
                        hours: directJointHours.trim() || "8:00 AM - 10:00 PM",
                        cuisine: directJointCuisine.trim(),
                        type: directJointCuisine.trim(),
                        rating: 4.8,
                        reviewsCount: 1,
                        address: directJointCity,
                        location: directJointCity,
                        imgUrl: directJointImgUrl.trim() || "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
                        status: "active",
                        city: directJointCity.toLowerCase() as "tarkwa" | "bogoso",
                        menu: []
                      };
 
                      const executeAdd = async () => {
                        const currentFP = await DB.get("elx_food_places") || FOOD_PLACES;
                        const updated = [nextJoint, ...currentFP];
                        await syncDBKey("elx_food_places", updated);
                        setFoodPlaces(updated);

                        // Create corresponding seller staff account
                        const nextStaff = {
                          id: "seller-" + Date.now(),
                          name: directJointName.trim(),
                          email: directJointEmail.trim().toLowerCase(),
                          password: directJointPassword.trim(),
                          role: "seller",
                          shopId: newId,
                          shopName: directJointName.trim(),
                          status: "active",
                          approved: true,
                          allowedTabs: ["orders", "food_catalog_manager"]
                        };
                        const updatedStaff = [...staffAccounts, nextStaff];
                        await syncDBKey("elx_staff_accounts", updatedStaff);
                        setStaffAccounts(updatedStaff);

                        notify(`Authorized! ${directJointName} is now LIVE on Elextra with a linked Seller Account! 🎉`, "ok");
                        setDirectJointName("");
                        setDirectJointCuisine("");
                        setDirectJointHours("8:00 AM - 10:00 PM");
                        setDirectJointImgUrl("");
                        setDirectJointEmail("");
                        setDirectJointPassword("");
                      };
 
                      const hasDirectEdit = user?.directEditing || user?.role === "primary_admin" || user?.role === "sub_admin";
                      if (hasDirectEdit) {
                        await executeAdd();
                      } else {
                        await handleRoleAction(
                          "SUGGEST_PLACE",
                          `Register brand new Fast Food Joint: ${directJointName.trim()} (${directJointCity})`,
                          {
                            placeType: "vendor",
                            name: directJointName.trim(),
                            location: directJointCity,
                            cuisineOrType: directJointCuisine.trim(),
                            googleMapsUrl: ""
                          },
                          executeAdd
                        );
                        // Also link pending credentials in a mock or prompt
                        setDirectJointName("");
                        setDirectJointCuisine("");
                        setDirectJointHours("8:00 AM - 10:00 PM");
                        setDirectJointImgUrl("");
                        setDirectJointEmail("");
                        setDirectJointPassword("");
                      }
                    }}
                    style={{ ...S.cta, width: "auto", background: "linear-gradient(135deg, #10b981, #059669)" }}
                  >
                    🚀 {(user?.directEditing || user?.role === "primary_admin" || user?.role === "sub_admin") ? "Add Food Joint Instantly" : "Submit Joint Proposal"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                {filteredFoodPlaces.map((place: any) => {
                  return (
                    <div key={place.id} style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                      <div style={{ display: "flex", gap: "14px" }}>
                        <img 
                          src={place.imgUrl || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400"} 
                          alt={place.name} 
                          style={{ width: "70px", height: "70px", borderRadius: "8px", objectFit: "cover" }}
                          referrerPolicy="no-referrer"
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong style={{ fontSize: "15px", color: "#1e293b" }}>{place.name}</strong>
                            <span style={{ fontSize: "10px", background: place.status === "active" ? "#d1fae5" : "#fee2e2", color: place.status === "active" ? "#065f46" : "#991b1b", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                              {place.status?.toUpperCase() || "ACTIVE"}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>
                            <strong>Cuisine Style:</strong> {place.cuisine} · <strong>City:</strong> {place.address || "Tarkwa"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            Hours: {place.hours || "8:00 AM - 10:00 PM"} · Rating: ⭐ {place.rating} ({place.reviewsCount || 0} reviews) · ID: {place.id}
                          </div>
                        </div>

                        {/* Direct Toggles / Actions */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <button
                            onClick={async () => {
                              const newStatus = place.status === "active" ? "paused" : "active";
                              const executeToggle = async () => {
                                const updated = foodPlaces.map((p: any) => p.id === place.id ? { ...p, status: newStatus } : p);
                                  await syncDBKey("elx_food_places", updated);
                                  setFoodPlaces(updated);
                                  notify(`${place.name} status updated to: ${newStatus.toUpperCase()}`, "ok");
                              };
                              
                              if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                await executeToggle();
                              } else {
                                await handleRoleAction("CUSTOMIZE_REST", `Toggle status of ${place.name} to ${newStatus}`, { restaurantId: place.id, status: newStatus }, executeToggle);
                              }
                            }}
                            style={{
                              background: place.status === "active" ? "#f59e0b" : "#10b981",
                              color: "white",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                          >
                            {place.status === "active" ? "⏸️ Pause Store" : "▶️ Activate"}
                          </button>

                          <button
                            onClick={async () => {
                              if (!window.confirm(`Are you sure you want to permanently delete "${place.name}"? This will remove the joint from the consumer marketplace and its associated seller accounts.`)) return;
                              const executeDelete = async () => {
                                const updated = foodPlaces.filter((p: any) => p.id !== place.id);
                                await syncDBKey("elx_food_places", updated);
                                setFoodPlaces(updated);

                                // Delete linked seller staff account
                                const updatedStaff = staffAccounts.filter((s: any) => s.shopId !== place.id && !(s.role === "seller" && String(s.shopName).toLowerCase() === String(place.name).toLowerCase()));
                                await syncDBKey("elx_staff_accounts", updatedStaff);
                                setStaffAccounts(updatedStaff);

                                notify(`Removed "${place.name}" food joint and its associated seller accounts entirely! 🗑️`, "ok");
                              };

                              if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                await executeDelete();
                              } else {
                                await handleRoleAction("CUSTOMIZE_REST", `Remove food joint ${place.name}`, { restaurantId: place.id, remove: true }, executeDelete);
                              }
                            }}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                          >
                            🗑️ Delete Joint
                          </button>
                        </div>
                      </div>

                      {/* Linked Seller Account details - Tying Food Joints and Sellers */}
                      {(() => {
                        const linkedSeller = staffAccounts.find((s: any) => s.shopId === place.id || (s.role === "seller" && String(s.shopName).toLowerCase() === String(place.name).toLowerCase()));
                        return linkedSeller ? (
                          <div style={{ 
                            marginTop: "12px", 
                            padding: "10px 12px", 
                            background: "#f0fdf4", 
                            borderRadius: "8px", 
                            border: "1px solid #bbf7d0", 
                            fontSize: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px"
                          }}>
                            <div>
                              <div style={{ fontWeight: "bold", color: "#166534", display: "flex", alignItems: "center", gap: "4px" }}>
                                👥 <strong>Linked Seller Partner:</strong> <span style={{ color: "#1e293b", fontWeight: "normal" }}>{linkedSeller.name}</span>
                              </div>
                              <div style={{ color: "#475569", fontSize: "11px", marginTop: "2px" }}>
                                ✉️ <strong>Email:</strong> {linkedSeller.email} | 📞 <strong>Phone:</strong> {linkedSeller.phone || "N/A"} | 🔑 <strong>Passcode:</strong> {linkedSeller.password}
                              </div>
                              <div style={{ color: "#64748b", fontSize: "10px", marginTop: "2px" }}>
                                Status: <span style={{ color: linkedSeller.status === "locked" ? "#dc2626" : "#16a34a", fontWeight: "bold" }}>{linkedSeller.status?.toUpperCase() || "ACTIVE"}</span> | Permitted Tabs: {linkedSeller.allowedTabs?.join(", ") || "orders, food_catalog_manager"}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {/* Direct Live Editing Toggle for this Seller */}
                              <button
                                onClick={async () => {
                                  const updated = staffAccounts.map((s: any) =>
                                    s.id === linkedSeller.id ? { ...s, directEditing: !s.directEditing } : s
                                  );
                                  await syncDBKey("elx_staff_accounts", updated);
                                  setStaffAccounts(updated);
                                  notify(`Direct editing updated for seller account ${linkedSeller.name}!`, "ok");
                                }}
                                style={{
                                  background: linkedSeller.directEditing ? "#fef3c7" : "#cbd5e1",
                                  color: linkedSeller.directEditing ? "#92400e" : "#475569",
                                  border: "none",
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  cursor: "pointer",
                                  fontWeight: "bold"
                                }}
                              >
                                {linkedSeller.directEditing ? "⚡ Direct Live Editing Active" : "🔒 Propose-Only Mode"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ 
                            marginTop: "12px", 
                            padding: "10px 12px", 
                            background: "#fffbeb", 
                            borderRadius: "8px", 
                            border: "1px solid #fef08a", 
                            fontSize: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px"
                          }}>
                            <div>
                              <span style={{ fontWeight: "bold", color: "#854d0e" }}>⚠️ No Linked Seller Account Found.</span>
                              <div style={{ fontSize: "11px", color: "#71717a", marginTop: "2px" }}>
                                Without a seller account, the merchant cannot log in to manage orders or update menus.
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const emailVal = place.name.toLowerCase().replace(/[^a-z0-9]/g, "") + "@elextra.xyz";
                                const passVal = "Elextra" + Math.floor(100 + Math.random() * 900);
                                const nextStaff = {
                                  id: "seller-" + Date.now(),
                                  name: place.name,
                                  email: emailVal,
                                  password: passVal,
                                  role: "seller",
                                  shopId: place.id,
                                  shopName: place.name,
                                  status: "active",
                                  approved: true,
                                  allowedTabs: ["orders", "food_catalog_manager"]
                                };
                                const updatedStaff = [...staffAccounts, nextStaff];
                                await syncDBKey("elx_staff_accounts", updatedStaff);
                                setStaffAccounts(updatedStaff);
                                notify(`Created linked Seller Account for ${place.name}! 🔑`, "ok");
                              }}
                              style={{
                                background: "#d97706",
                                color: "white",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                cursor: "pointer"
                              }}
                            >
                              ➕ Auto-Create Seller Login
                            </button>
                          </div>
                        );
                      })()}

                      {/* Profile Customizer Form for Admins & Managers */}
                      <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px", marginTop: "12px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "8px" }}>
                          ⚙️ Customize Joint Aspects
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Restaurant Name</label>
                            <input 
                              type="text" 
                              defaultValue={place.name}
                              placeholder="Store Name"
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== place.name) {
                                  const executeUpdate = async () => {
                                    const updated = foodPlaces.map((p: any) => p.id === place.id ? { ...p, name: val } : p);
                                    await syncDBKey("elx_food_places", updated);
                                    setFoodPlaces(updated);
                                    notify(`Store Name updated to: ${val}`, "ok");
                                  };
                                  if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                    await executeUpdate();
                                  } else {
                                    await handleRoleAction("CUSTOMIZE_REST", `Change store name of ${place.name} to ${val}`, { restaurantId: place.id, name: val }, executeUpdate);
                                  }
                                }
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Cuisine Style</label>
                            <input 
                              type="text" 
                              defaultValue={place.cuisine}
                              placeholder="e.g. Italian Pizza"
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== place.cuisine) {
                                  const executeUpdate = async () => {
                                    const updated = foodPlaces.map((p: any) => p.id === place.id ? { ...p, cuisine: val, type: val } : p);
                                    await syncDBKey("elx_food_places", updated);
                                    setFoodPlaces(updated);
                                    notify(`Cuisine style updated to: ${val}`, "ok");
                                  };
                                  if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                    await executeUpdate();
                                  } else {
                                    await handleRoleAction("CUSTOMIZE_REST", `Change cuisine of ${place.name} to ${val}`, { restaurantId: place.id, cuisine: val }, executeUpdate);
                                  }
                                }
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Operating City/Location</label>
                            <select 
                              defaultValue={place.address || (place.city ? (place.city.charAt(0).toUpperCase() + place.city.slice(1)) : "Tarkwa")}
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onChange={async (e) => {
                                const val = e.target.value;
                                const executeUpdate = async () => {
                                  const updated = foodPlaces.map((p: any) => p.id === place.id ? { ...p, address: val, location: val, city: val.toLowerCase() } : p);
                                  await syncDBKey("elx_food_places", updated);
                                  setFoodPlaces(updated);
                                  notify(`Operational city updated to: ${val}`, "ok");
                                };
                                if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                  await executeUpdate();
                                } else {
                                  await handleRoleAction("CUSTOMIZE_REST", `Change city of ${place.name} to ${val}`, { restaurantId: place.id, address: val, city: val.toLowerCase() }, executeUpdate);
                                }
                              }}
                            >
                              <option value="Tarkwa">Tarkwa</option>
                              <option value="Bogoso">Bogoso</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Operating Hours</label>
                            <input 
                              type="text" 
                              defaultValue={place.hours || "8:00 AM - 10:00 PM"}
                              placeholder="Hours"
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== place.hours) {
                                  const executeUpdate = async () => {
                                    const updated = foodPlaces.map((p: any) => p.id === place.id ? { ...p, hours: val } : p);
                                    await syncDBKey("elx_food_places", updated);
                                    setFoodPlaces(updated);
                                    notify(`Hours updated to: ${val}`, "ok");
                                  };
                                  if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                    await executeUpdate();
                                  } else {
                                    await handleRoleAction("CUSTOMIZE_REST", `Change hours of ${place.name} to ${val}`, { restaurantId: place.id, hours: val }, executeUpdate);
                                  }
                                }
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Image URL</label>
                            <input 
                              type="text" 
                              defaultValue={place.imgUrl}
                              placeholder="Img URL"
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== place.imgUrl) {
                                  const executeUpdate = async () => {
                                    const updated = foodPlaces.map((p: any) => p.id === place.id ? { ...p, imgUrl: val } : p);
                                    await syncDBKey("elx_food_places", updated);
                                    setFoodPlaces(updated);
                                    notify(`Image URL updated!`, "ok");
                                  };
                                  if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                    await executeUpdate();
                                  } else {
                                    await handleRoleAction("CUSTOMIZE_REST", `Change image of ${place.name}`, { restaurantId: place.id, imgUrl: val }, executeUpdate);
                                  }
                                }
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Google Maps URL</label>
                            <input 
                              type="text" 
                              defaultValue={place.googleMapsUrl || ""}
                              placeholder="https://maps.google.com/..."
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val !== (place.googleMapsUrl || "")) {
                                  const executeUpdate = async () => {
                                    const updated = foodPlaces.map((p: any) => p.id === place.id ? { ...p, googleMapsUrl: val } : p);
                                    await syncDBKey("elx_food_places", updated);
                                    setFoodPlaces(updated);
                                    notify(`Google Maps URL updated!`, "ok");
                                  };
                                  if (user?.role === "primary_admin" || user?.role === "sub_admin" || hasDirectEditing) {
                                    await executeUpdate();
                                  } else {
                                    await handleRoleAction("CUSTOMIZE_REST", `Change Google Maps URL of ${place.name}`, { restaurantId: place.id, googleMapsUrl: val }, executeUpdate);
                                  }
                                }
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Seller Login Email</label>
                            <input 
                              type="email" 
                              defaultValue={staffAccounts.find((s: any) => s.shopId === place.id || (s.role === "seller" && s.shopName === place.name))?.email || ""}
                              placeholder="seller@elextra.xyz"
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim().toLowerCase();
                                if (val) {
                                  let updated = [...staffAccounts];
                                  const idx = updated.findIndex((s: any) => s.shopId === place.id || (s.role === "seller" && s.shopName === place.name));
                                  if (idx !== -1) {
                                    if (updated[idx].email !== val) {
                                      updated[idx] = { ...updated[idx], email: val };
                                      await syncDBKey("elx_staff_accounts", updated);
                                      setStaffAccounts(updated);
                                      notify(`Seller login email updated to: ${val}`, "ok");
                                    }
                                  } else {
                                    const newStaff = {
                                      id: "seller-" + Date.now(),
                                      name: place.name,
                                      email: val,
                                      password: "Seller123",
                                      role: "seller",
                                      shopId: place.id,
                                      shopName: place.name,
                                      status: "active",
                                      approved: true,
                                      allowedTabs: ["orders", "food_catalog_manager"]
                                    };
                                    updated.push(newStaff);
                                    await syncDBKey("elx_staff_accounts", updated);
                                    setStaffAccounts(updated);
                                    notify(`New Seller staff account created with email: ${val}`, "ok");
                                  }
                                }
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#475569" }}>Seller Login Passcode</label>
                            <input 
                              type="text" 
                              defaultValue={staffAccounts.find((s: any) => s.shopId === place.id || (s.role === "seller" && s.shopName === place.name))?.password || ""}
                              placeholder="Passcode"
                              style={{ ...S.inp, background: "white", padding: "4px" }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val) {
                                  let updated = [...staffAccounts];
                                  const idx = updated.findIndex((s: any) => s.shopId === place.id || (s.role === "seller" && s.shopName === place.name));
                                  if (idx !== -1) {
                                    if (updated[idx].password !== val) {
                                      updated[idx] = { ...updated[idx], password: val };
                                      await syncDBKey("elx_staff_accounts", updated);
                                      setStaffAccounts(updated);
                                      notify(`Seller login passcode updated successfully!`, "ok");
                                    }
                                  } else {
                                    const newStaff = {
                                      id: "seller-" + Date.now(),
                                      name: place.name,
                                      email: `${place.id}@elextra.xyz`,
                                      password: val,
                                      role: "seller",
                                      shopId: place.id,
                                      shopName: place.name,
                                      status: "active",
                                      approved: true,
                                      allowedTabs: ["orders", "food_catalog_manager"]
                                    };
                                    updated.push(newStaff);
                                    await syncDBKey("elx_staff_accounts", updated);
                                    setStaffAccounts(updated);
                                    notify(`New Seller staff account created with passcode: ${val}`, "ok");
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ fontSize: "9px", color: "#64748b", marginTop: "6px", fontStyle: "italic" }}>
                          * Direct updates trigger instantly for Admin, and submit requests for Managers.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          TAB: FOOD ADJUSTMENTS (🍔)
          ========================================== */}
      {activeTab === "food_requests" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", padding: "18px", borderRadius: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              🍔 Food Catalog Adjustments Clearance Console
            </h2>
            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              Submit, review, and authorize fast food adjustments, price modifications, item removals, or on-sale additions.
            </p>
          </div>

          {/* MANAGER & ADMIN FORM: SUBMIT NEW REQUEST OR DIRECT UPDATE */}
          {(user?.role === "manager" || user?.role === "primary_admin" || user?.role === "sub_admin") && (
            <div style={S.sec}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#3b82f6", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>➕</span> {user?.role === "manager" ? "Submit New Catalog Adjustment Proposal (Approval Required)" : "Directly Modify Shop Menu on Behalf of Seller (Instant)"}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>1. Select Target Eatery/Restaurant</label>
                  <select
                    style={S.inp}
                    value={selectedRestaurantId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setSelectedRestaurantId(rId);
                      setSelectedFoodItemIndex(-1);
                      setReqItemName("");
                      setReqItemPrice("");
                      setReqItemDesc("");
                      setReqItemImg("");
                      setReqItemOnSale(false);
                    }}
                  >
                    <option value="">-- Choose Restaurant --</option>
                    {(foodPlaces.length > 0 ? foodPlaces : FOOD_PLACES).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.cuisine})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>2. Select Adjustment Action Type</label>
                  <select
                    style={S.inp}
                    value={managerFoodReqType}
                    onChange={(e) => {
                      setManagerFoodReqType(e.target.value);
                      setSelectedFoodItemIndex(-1);
                      setReqItemName("");
                      setReqItemPrice("");
                      setReqItemDesc("");
                      setReqItemImg("");
                      setReqItemOnSale(false);
                    }}
                  >
                    <option value="ADD_ITEM">Add New Menu Item</option>
                    <option value="PRICE_ADJUSTMENT">Price Adjustment</option>
                    <option value="MARK_ON_SALE">Mark as On Sale / Discount</option>
                    <option value="EDIT_DETAILS">Edit Description or Image</option>
                    <option value="REMOVE_ITEM">Remove Menu Item</option>
                  </select>
                </div>
              </div>

              {selectedRestaurantId && (
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px dashed #cbd5e1", marginBottom: "16px" }}>
                  {managerFoodReqType !== "ADD_ITEM" ? (
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Choose Existing Food Item to Modify</label>
                      <select
                        style={S.inp}
                        value={selectedFoodItemIndex}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          setSelectedFoodItemIndex(idx);
                          const place = (foodPlaces.length > 0 ? foodPlaces : FOOD_PLACES).find((p: any) => p.id === selectedRestaurantId);
                          if (place && place.menu[idx]) {
                            const item = place.menu[idx];
                            setReqItemName(item.item);
                            setReqItemPrice(String(item.price));
                            setReqItemDesc(item.description || "");
                            setReqItemImg(item.imgUrl || "");
                            setReqItemOnSale(!!item.onSale);
                          }
                        }}
                      >
                        <option value={-1}>-- Choose Food Item --</option>
                        {((foodPlaces.length > 0 ? foodPlaces : FOOD_PLACES).find((p: any) => p.id === selectedRestaurantId)?.menu || []).map((item: any, idx: number) => (
                          <option key={idx} value={idx}>{item.item} (GHS {item.price})</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "10px" }}>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Food Item Name</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. Royal Fried Rice Combo"
                        value={reqItemName}
                        onChange={(e) => setReqItemName(e.target.value)}
                        disabled={managerFoodReqType !== "ADD_ITEM"}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>
                        {managerFoodReqType === "PRICE_ADJUSTMENT" ? "Proposed New Price (GHS)" : "Price (GHS)"}
                      </label>
                      <input
                        type="number"
                        style={S.inp}
                        placeholder="e.g. 45"
                        value={reqItemPrice}
                        onChange={(e) => setReqItemPrice(e.target.value)}
                        disabled={managerFoodReqType === "REMOVE_ITEM"}
                      />
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Item Description</label>
                      <textarea
                        style={{ ...S.inp, minHeight: "60px", resize: "vertical" }}
                        placeholder="Describe the fast food portion, ingredients, or bundle packages..."
                        value={reqItemDesc}
                        onChange={(e) => setReqItemDesc(e.target.value)}
                        disabled={managerFoodReqType === "REMOVE_ITEM" || managerFoodReqType === "MARK_ON_SALE"}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "#475569" }}>Photo Image URL (Optional)</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="https://image-url.com/rice.jpg"
                        value={reqItemImg}
                        onChange={(e) => setReqItemImg(e.target.value)}
                        disabled={managerFoodReqType === "REMOVE_ITEM" || managerFoodReqType === "MARK_ON_SALE"}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px" }}>
                      <input
                        type="checkbox"
                        id="onSaleCheck"
                        checked={reqItemOnSale}
                        onChange={(e) => setReqItemOnSale(e.target.checked)}
                        disabled={managerFoodReqType === "REMOVE_ITEM"}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor="onSaleCheck" style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b", cursor: "pointer" }}>
                        Mark on Special Sale/Discount
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                    <button
                      onClick={async () => {
                        if (!selectedRestaurantId) {
                          notify("Please select a target restaurant.", "err");
                          return;
                        }
                        if (!reqItemName) {
                          notify("Please provide a valid food item name.", "err");
                          return;
                        }
                        if (managerFoodReqType !== "REMOVE_ITEM" && (!reqItemPrice || Number(reqItemPrice) <= 0)) {
                          notify("Please specify a valid price.", "err");
                          return;
                        }

                        const targetRest = (foodPlaces.length > 0 ? foodPlaces : FOOD_PLACES).find((p: any) => p.id === selectedRestaurantId);
                        if (!targetRest) {
                          notify("Target eatery not found.", "err");
                          return;
                        }
                        const restName = targetRest.name;
                        const isAdmin = user?.role === "primary_admin" || user?.role === "sub_admin";

                        if (isAdmin) {
                          // DIRECT INSTANT MODIFICATION!
                          let updatedMenu = [...targetRest.menu];
                          if (managerFoodReqType === "ADD_ITEM") {
                            updatedMenu.push({
                              item: reqItemName,
                              price: Number(reqItemPrice || 10),
                              description: reqItemDesc || "",
                              imgUrl: reqItemImg || "",
                              onSale: !!reqItemOnSale
                            });
                          } else if (managerFoodReqType === "PRICE_ADJUSTMENT") {
                            updatedMenu = updatedMenu.map(item => {
                              if (item.item === reqItemName) {
                                return { ...item, price: Number(reqItemPrice || item.price) };
                              }
                              return item;
                            });
                          } else if (managerFoodReqType === "REMOVE_ITEM") {
                            updatedMenu = updatedMenu.filter(item => item.item !== reqItemName);
                          } else if (managerFoodReqType === "MARK_ON_SALE") {
                            updatedMenu = updatedMenu.map(item => {
                              if (item.item === reqItemName) {
                                return { ...item, onSale: reqItemOnSale };
                              }
                              return item;
                            });
                          } else if (managerFoodReqType === "EDIT_DETAILS") {
                            updatedMenu = updatedMenu.map(item => {
                              if (item.item === reqItemName) {
                                return {
                                  ...item,
                                  description: reqItemDesc !== undefined ? reqItemDesc : item.description,
                                  imgUrl: reqItemImg !== undefined ? reqItemImg : item.imgUrl,
                                  onSale: !!reqItemOnSale
                                };
                              }
                              return item;
                            });
                          }

                          // Save to DB
                          const updatedPlaces = (await DB.get("elx_food_places") || FOOD_PLACES).map((place: any) => {
                            if (place.id === selectedRestaurantId) {
                              return { ...place, menu: updatedMenu };
                            }
                            return place;
                          });
                          await syncDBKey("elx_food_places", updatedPlaces);
                          setFoodPlaces(updatedPlaces);

                          // Also log in foodRequests as instantly approved for record tracking
                          const newReq = {
                            id: "FREQ-" + Date.now(),
                            type: managerFoodReqType,
                            status: "approved" as const,
                            dateSubmitted: new Date().toISOString(),
                            proposer: `${user.name} (Admin Direct Update)`,
                            restaurantId: selectedRestaurantId,
                            restaurantName: restName,
                            approver: user.name,
                            payload: {
                              restaurantId: selectedRestaurantId,
                              itemName: reqItemName,
                              proposedPrice: Number(reqItemPrice) || 0,
                              description: reqItemDesc,
                              imgUrl: reqItemImg,
                              isOnSale: reqItemOnSale
                            },
                            approvalHistory: [
                              {
                                status: "approved",
                                timestamp: new Date().toISOString(),
                                actor: user.name,
                                details: `Directly executed and published to the live platform on behalf of eatery by Admin ${user.name}`
                              }
                            ]
                          };

                          const updatedReqs = [newReq, ...foodRequests];
                          await syncDBKey("elx_food_requests", updatedReqs);
                          setFoodRequests(updatedReqs);

                          notify(`Instantly updated menu of "${restName}" directly! ✨`, "ok");
                        } else {
                          // SUBMIT PENDING PROPOSAL FOR MANAGERS
                          const newReq = {
                            id: "FREQ-" + Date.now(),
                            type: managerFoodReqType,
                            status: "pending",
                            dateSubmitted: new Date().toISOString(),
                            proposer: `${user.name} (Fleet Manager)`,
                            restaurantId: selectedRestaurantId,
                            restaurantName: restName,
                            payload: {
                              restaurantId: selectedRestaurantId,
                              itemName: reqItemName,
                              proposedPrice: Number(reqItemPrice) || 0,
                              description: reqItemDesc,
                              imgUrl: reqItemImg,
                              isOnSale: reqItemOnSale
                            },
                            approvalHistory: [
                              {
                                status: "pending",
                                timestamp: new Date().toISOString(),
                                actor: user.name,
                                details: `Proposed fast food adjustment submitted by Fleet Manager ${user.name}`
                              }
                            ]
                          };

                          const updatedReqs = [newReq, ...foodRequests];
                          await syncDBKey("elx_food_requests", updatedReqs);
                          setFoodRequests(updatedReqs);

                          notify("Adjustment proposal successfully submitted to Admins! 🚀", "ok");
                        }

                        // Reset fields
                        setSelectedFoodItemIndex(-1);
                        setReqItemName("");
                        setReqItemPrice("");
                        setReqItemDesc("");
                        setReqItemImg("");
                        setReqItemOnSale(false);
                      }}
                      style={{ ...S.cta, background: user?.role === "manager" ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      {user?.role === "manager" ? "🚀 Submit Proposal for Admin Approval" : "⚡ Instantly Update Live Menu on Behalf of Eatery"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REQUESTS QUEUE & HISTORIES */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#0f172a" }}>
              📋 Active Clearance Queue & Historical Logs
            </h3>

            {foodRequests.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                🍃 No fast food adjustment requests logged in the system yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {foodRequests.map((req: any) => {
                  const isPending = req.status === "pending";
                  const statusColor = req.status === "approved" ? "#10b981" : req.status === "rejected" ? "#ef4444" : "#f59e0b";
                  
                  return (
                    <div key={req.id} style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "14px", background: "white" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "bold", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#475569" }}>
                              {req.id}
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#dc2626" }}>
                              {req.restaurantName}
                            </span>
                            <span style={{ fontSize: "10px", color: "#64748b" }}>
                              Submitted {new Date(req.dateSubmitted).toLocaleString()}
                            </span>
                          </div>

                          <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
                            {req.type === "ADD_ITEM" && "➕ Add: "}
                            {req.type === "PRICE_ADJUSTMENT" && "💵 Adjust Price: "}
                            {req.type === "REMOVE_ITEM" && "❌ Remove: "}
                            {req.type === "MARK_ON_SALE" && "🏷️ Mark On Sale: "}
                            {req.type === "EDIT_DETAILS" && "📝 Edit Info: "}
                            "{req.payload?.itemName || ""}"
                          </h4>

                          <p style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                            {req.payload?.description && `Description: "${req.payload.description}"`}
                            {req.payload?.proposedPrice > 0 && ` · Proposed Price: GHS ${req.payload.proposedPrice}`}
                            {req.payload?.isOnSale !== undefined && ` · On Sale: ${req.payload.isOnSale ? "Yes" : "No"}`}
                          </p>

                          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                            <span>Proposer: <strong>{req.proposer}</strong></span>
                            {req.approver && (
                              <>
                                <span>·</span>
                                <span>Authorized by: <strong>{req.approver}</strong></span>
                              </>
                            )}
                          </div>

                          {req.rejectionReason && (
                            <div style={{ marginTop: "6px", background: "#fef2f2", border: "1px solid #fee2e2", padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", color: "#991b1b" }}>
                              <strong>❌ Rejection Reason:</strong> {req.rejectionReason}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                          <span style={{ fontSize: "10px", fontWeight: "bold", background: statusColor, color: "white", padding: "3px 8px", borderRadius: "12px", textTransform: "uppercase" }}>
                            {req.status}
                          </span>

                          {/* Approval Actions for Admins */}
                          {isPending && (user?.role === "primary_admin" || user?.role === "sub_admin") && (
                            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                              <button
                                onClick={() => handleApproveFoodRequest(req.id)}
                                style={{ background: "#10b981", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                              >
                                ✔ Approve
                              </button>
                              <button
                                onClick={() => setRejectionInputId(req.id)}
                                style={{ background: "#dc2626", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rejection input inline prompt */}
                      {rejectionInputId === req.id && (
                        <div style={{ marginTop: "12px", borderTop: "1px solid #cbd5e1", paddingTop: "10px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#dc2626", display: "block", marginBottom: "4px" }}>
                            Reason for Rejecting Food Catalog Proposal
                          </label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input
                              type="text"
                              placeholder="e.g. Price too high, inaccurate description, duplicate item..."
                              style={{ ...S.inp, flex: 1 }}
                              value={rejectionReasonText}
                              onChange={(e) => setRejectionReasonText(e.target.value)}
                            />
                            <button
                              onClick={() => handleRejectFoodRequest(req.id, rejectionReasonText)}
                              style={{ background: "#dc2626", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              Confirm Rejection
                            </button>
                            <button
                              onClick={() => {
                                setRejectionInputId(null);
                                setRejectionReasonText("");
                              }}
                              style={{ background: "#64748b", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Approval History Logs */}
                      {req.approvalHistory && req.approvalHistory.length > 0 && (
                        <div style={{ marginTop: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                          <span style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b" }}>🔒 Verification & History Logs:</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                            {req.approvalHistory.map((h: any, hIdx: number) => (
                              <div key={hIdx} style={{ fontSize: "10.5px", color: "#475569", display: "flex", justifyContent: "space-between" }}>
                                <span>· {h.details}</span>
                                <span style={{ color: "#94a3b8" }}>{new Date(h.timestamp).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==========================================
          TAB: MANAGEMENT CHAT & MEMOS (💬)
          ========================================== */}
      {activeTab === "management_chat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ background: "linear-gradient(135deg, #4f46e5, #3730a3)", color: "white", padding: "18px", borderRadius: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              💬 Management Communication & Memo Board
            </h2>
            <p style={{ fontSize: "11px", color: "#e0e7ff", marginTop: "4px" }}>
              Secure internal channel for Admins, Sub-Admins, and Fleet Managers to broadcast logistics directives, coordinate rider dispatching, and share shift notes.
            </p>
          </div>

          {/* POST NEW MEMO FORM */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#4f46e5", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>✍️</span> Publish New Directive or Private Staff Memo
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>
                    Message Distribution Scope
                  </label>
                  <select
                    value={memoRecipientId}
                    onChange={(e) => setMemoRecipientId(e.target.value)}
                    style={{ ...S.inp, cursor: "pointer" }}
                  >
                    <option value="">📢 Public Broadcast (Visible to All Management & Staff)</option>
                    <optgroup label="🔒 Send Private Direct Message (DM) to Selected Staff">
                      {staffAccounts
                        .filter((s: any) => s && s.id && s.id !== user?.id && s.name !== user?.name && s.email !== user?.email)
                        .map((s: any) => (
                          <option key={s.id} value={s.id}>
                            💬 {s.name} ({s.role?.toUpperCase() || "staff"}) - {s.email || "No Email"}
                          </option>
                        ))
                      }
                    </optgroup>
                  </select>
                </div>

                {memoRecipientId && (
                  <div style={{ display: "flex", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#166534" }}>
                      🔒 Direct Message Mode: This message will only be visible to you and <strong>{staffAccounts.find((s: any) => s.id === memoRecipientId)?.name || "the recipient"}</strong>.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>
                  {memoRecipientId ? "Direct Message Body" : "Memo Message Body"}
                </label>
                <textarea
                  style={{ ...S.inp, minHeight: "100px", resize: "vertical" }}
                  placeholder={memoRecipientId ? "Type a private direct message to this staff member..." : "Type important logistics updates, driver notices, or operational reminders..."}
                  value={newMemoText}
                  onChange={(e) => setNewMemoText(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {!memoRecipientId && (
                    <>
                      <input
                        type="checkbox"
                        id="memoUrgentCheck"
                        checked={memoUrgent}
                        onChange={(e) => setMemoUrgent(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor="memoUrgentCheck" style={{ fontSize: "12px", fontWeight: "bold", color: "#b91c1c", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                        🚨 Mark as Urgent Logistics Directive
                      </label>
                    </>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (!newMemoText.trim()) {
                      notify("Message cannot be empty.", "err");
                      return;
                    }

                    const recId = memoRecipientId || null;
                    const recName = recId ? (staffAccounts.find((s: any) => s.id === recId)?.name || "Selected Staff") : null;

                    const newMemo = {
                      id: "MEMO-" + Date.now(),
                      sender: user.name,
                      senderId: user.id || user.email,
                      senderEmail: user.email,
                      role: user.role,
                      text: newMemoText.trim(),
                      isUrgent: recId ? false : memoUrgent,
                      recipientId: recId,
                      recipientName: recName,
                      timestamp: new Date().toISOString()
                    };

                    const updatedMemos = [newMemo, ...managementMemos];
                    await syncDBKey("elx_management_memos", updatedMemos);
                    setManagementMemos(updatedMemos);

                    // Reset form
                    setNewMemoText("");
                    setMemoUrgent(false);
                    setMemoRecipientId("");

                    if (recId) {
                      notify(`Direct message successfully sent to ${recName}! 🔒`, "ok");
                    } else {
                      notify("Memo successfully published to all management panels! 📢", "ok");
                    }
                  }}
                  style={{ ...S.cta, background: memoRecipientId ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #4f46e5, #4338ca)", padding: "8px 16px" }}
                >
                  {memoRecipientId ? "✉️ Send Direct Message" : "📢 Broadcast Memo"}
                </button>
              </div>
            </div>
          </div>

          {/* MEMOS QUEUE */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#1e293b" }}>
              📋 Internal Memos & Communications History
            </h3>

            {managementMemos.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                🕊️ No internal management messages or notices posted yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {managementMemos
                  .filter((memo: any) => {
                    // Show if it's a public broadcast (no recipientId)
                    if (!memo.recipientId) return true;
                    
                    // Otherwise it's a DM: show only if current user is sender OR recipient
                    const isSender = memo.senderId === user?.id || memo.senderEmail === user?.email || memo.sender === user?.name;
                    const isRecipient = memo.recipientId === user?.id || memo.recipientId === user?.email;
                    return isSender || isRecipient;
                  })
                  .map((memo: any) => {
                    const roleBadgeColor = memo.role === "primary_admin" ? "#dc2626" : memo.role === "sub_admin" ? "#f59e0b" : "#2563eb";
                    const isDm = !!memo.recipientId;
                    
                    return (
                      <div
                        key={memo.id}
                        style={{
                          border: memo.isUrgent 
                            ? "1.5px solid #ef4444" 
                            : isDm 
                            ? "1.5px dashed #10b981" 
                            : "1.5px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "14px",
                          background: memo.isUrgent 
                            ? "#fff5f5" 
                            : isDm 
                            ? "#f0fdf4" 
                            : "white",
                          boxShadow: memo.isUrgent ? "0 4px 6px -1px rgba(239, 68, 68, 0.05)" : "none"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              {memo.isUrgent && (
                                <span style={{ fontSize: "10px", fontWeight: "bold", background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "4px" }}>
                                  🚨 URGENT DIRECTIVE
                                </span>
                              )}
                              {isDm && (
                                <span style={{ fontSize: "10px", fontWeight: "bold", background: "#10b981", color: "white", padding: "2px 6px", borderRadius: "4px" }}>
                                  🔒 PRIVATE DIRECT MESSAGE
                                </span>
                              )}
                              <span style={{ fontSize: "12px", fontWeight: "900", color: "#1e293b" }}>
                                {memo.sender}
                              </span>
                              <span style={{ fontSize: "10px", fontWeight: "bold", background: roleBadgeColor, color: "white", padding: "1px 6px", borderRadius: "10px", textTransform: "uppercase" }}>
                                {memo.role}
                              </span>
                              
                              {isDm && (
                                <span style={{ fontSize: "11px", fontWeight: "bold", color: "#065f46" }}>
                                  ➡️ to {memo.recipientName || "Staff"}
                                </span>
                              )}

                              <span style={{ fontSize: "10px", color: "#64748b" }}>
                                • {new Date(memo.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <p style={{ fontSize: "13px", color: "#334155", marginTop: "8px", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                              {memo.text}
                            </p>
                          </div>

                          {/* Delete Memo */}
                          {(user?.role === "primary_admin" || memo.sender === user?.name || memo.senderEmail === user?.email) && (
                            <button
                              onClick={async () => {
                                if (confirm("Are you sure you want to delete this memo?")) {
                                  const updated = managementMemos.filter((m: any) => m.id !== memo.id);
                                  await syncDBKey("elx_management_memos", updated);
                                  setManagementMemos(updated);
                                  notify("Message deleted successfully.", "ok");
                                }
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                fontSize: "13px"
                              }}
                              title="Delete Message"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==========================================
          TAB: SETTINGS
          ========================================== */}
      {activeTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* GENERAL ROUTING DETAILS */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px" }}>
              📡 Core API Systems & Sync Configuration
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Primary API Gateway Host URL</label>
                <input 
                  style={S.inp} 
                  value={settings.apiEndpoint} 
                  onChange={e => setSettings({ ...settings, apiEndpoint: e.target.value })} 
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button 
                  onClick={async () => {
                    await handleRoleAction(
                      "UPDATE_SETTINGS",
                      "Update Primary API Gateway Address",
                      { apiEndpoint: settings.apiEndpoint },
                      async () => {
                        await syncDBKey("elx_settings", settings);
                        notify("Core API Gateway Endpoint saved!", "ok");
                      }
                    );
                  }}
                  style={{ ...S.cta, width: "100%" }}
                >
                  Save API Config
                </button>
              </div>
            </div>
          </div>

          {/* ABOUT APP BRANDING CONFIGURATION */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
              ℹ️ About App Branding Configuration
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>About Title</label>
                  <input 
                    style={S.inp} 
                    value={settings.aboutTitle || ""} 
                    onChange={e => setSettings({ ...settings, aboutTitle: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>App Build Version</label>
                  <input 
                    style={S.inp} 
                    value={settings.aboutVersion || ""} 
                    onChange={e => setSettings({ ...settings, aboutVersion: e.target.value })} 
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>About Narrative / Content Text</label>
                <textarea 
                  style={{ ...S.inp, height: "80px", fontFamily: "inherit", resize: "none" }} 
                  value={settings.aboutContent || ""} 
                  onChange={e => setSettings({ ...settings, aboutContent: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Footer Compliance / License Text</label>
                <input 
                  style={S.inp} 
                  value={settings.aboutFooter || ""} 
                  onChange={e => setSettings({ ...settings, aboutFooter: e.target.value })} 
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={async () => {
                    await syncDBKey("elx_settings", settings);
                    notify("Branding details successfully updated!", "ok");
                  }}
                  style={{ ...S.cta, width: "200px" }}
                >
                  Save About Config
                </button>
              </div>
            </div>
          </div>

          {/* ELEXTRA PLUS PREMIUM SUBSCRIPTION TERMS */}
          <div style={S.sec}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#8b5cf6", display: "flex", alignItems: "center", gap: "6px" }}>
              👑 Elextra Plus Premium Pricing & Membership Terms
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Subscription Tier Title</label>
                  <input 
                    style={S.inp} 
                    value={settings.plusTitle || ""} 
                    onChange={e => setSettings({ ...settings, plusTitle: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Monthly Pricing (GHS)</label>
                  <input 
                    type="number"
                    style={S.inp} 
                    value={settings.plusPrice || ""} 
                    onChange={e => setSettings({ ...settings, plusPrice: e.target.value })} 
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Short Description Tagline</label>
                <input 
                  style={S.inp} 
                  value={settings.plusDescription || ""} 
                  onChange={e => setSettings({ ...settings, plusDescription: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Detailed Plus Membership Benefits Narrative</label>
                <textarea 
                  style={{ ...S.inp, height: "80px", fontFamily: "inherit", resize: "none" }} 
                  value={settings.plusBenefits || ""} 
                  onChange={e => setSettings({ ...settings, plusBenefits: e.target.value })} 
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button 
                  onClick={async () => {
                    await syncDBKey("elx_settings", settings);
                    notify("Elextra Plus Subscription parameters updated!", "ok");
                  }}
                  style={{ ...S.cta, width: "200px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                >
                  Save Plus Config
                </button>
              </div>
            </div>
          </div>

          {/* HIDE THESE CONFIGURATIONS FROM LIMITED STAFF (SUB-ADMINS) */}
          {user?.role === "primary_admin" && (
            <>
              {/* MOBILE MONEY GATEWAY SECTION */}
              <div style={S.sec}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5://cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#e11d48", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CreditCard size={18} /> Mobile Money Configuration Lines (Owner Secured)
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>MTN MoMo Gateway Fee (%)</label>
                    <input 
                      style={S.inp} 
                      value={settings.mtnFee} 
                      onChange={e => setSettings({ ...settings, mtnFee: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Telecel Cash Fee (%)</label>
                    <input 
                      style={S.inp} 
                      value={settings.telecelFee} 
                      onChange={e => setSettings({ ...settings, telecelFee: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Primary Merchant Number</label>
                    <input 
                      style={S.inp} 
                      value={settings.primaryMomoNumber} 
                      onChange={e => setSettings({ ...settings, primaryMomoNumber: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Registered Merchant Name</label>
                    <input 
                      style={S.inp} 
                      value={settings.primaryMomoName} 
                      onChange={e => setSettings({ ...settings, primaryMomoName: e.target.value })} 
                    />
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    await syncDBKey("elx_settings", settings);
                    notify("Mobile Money configurations successfully synced!", "ok");
                  }}
                  style={{ ...S.cta, marginTop: "14px", background: "#e11d48" }}
                >
                  Save Secure Payment Configurations
                </button>
              </div>

              {/* ADMIN GATE CREDENTIAL CONFIGURATION */}
              <div style={S.sec}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#d97706", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldAlert size={18} /> Admin Gate Credentials Configuration (Owner Secured)
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Super Admin ID (Email)</label>
                    <input 
                      style={S.inp} 
                      value={settings.adminGateUser} 
                      onChange={e => setSettings({ ...settings, adminGateUser: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Root Gate Key (Passcode)</label>
                    <input 
                      style={S.inp} 
                      value={settings.adminGatePass} 
                      onChange={e => setSettings({ ...settings, adminGatePass: e.target.value })} 
                    />
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    await syncDBKey("elx_settings", settings);
                    notify("Admin gateway root keys successfully updated!", "ok");
                  }}
                  style={{ ...S.cta, marginTop: "14px", background: "#d97706" }}
                >
                  Save Core Credentials
                </button>
              </div>

              {/* DYNAMIC SERVICE LOCATIONS MANAGER */}
              <div style={S.sec}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #cbd5e1", paddingBottom: "8px", marginBottom: "12px", color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
                  🌐 Expandable Service Locations Manager
                </h3>
                <p style={{ fontSize: "12px", color: "var(--elextra-subtext, #64748b)", margin: "0 0 16px" }}>
                  Add, edit, or expand service locations at any time. New locations will instantly integrate across client apps, registration wizards, and dispatcher terminals.
                </p>

                {/* List of active locations */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-text, #475569)" }}>Active Service Locations</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                    {(settings.locations || [
                      { id: "all", name: "All Areas", label: "🌐 All Areas (Tarkwa & Bogoso)", emoji: "🌐" },
                      { id: "tarkwa", name: "Tarkwa", label: "🏙️ Tarkwa Only", emoji: "🏙️" },
                      { id: "bogoso", name: "Bogoso", label: "🏘️ Bogoso Only", emoji: "🏘️" }
                    ]).map((loc: any) => (
                      <div key={loc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--elextra-input-bg, #1e293b)", color: "var(--elextra-text, #f8fafc)", borderRadius: "10px", border: "1px solid var(--elextra-border, #334155)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px" }}>{loc.emoji || "📍"}</span>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: "bold" }}>{loc.name}</div>
                            <div style={{ fontSize: "10px", color: "var(--elextra-subtext, #94a3b8)" }}>ID: {loc.id}</div>
                          </div>
                        </div>
                        {loc.id !== "all" && loc.id !== "tarkwa" && loc.id !== "bogoso" && (
                          <button
                            onClick={async () => {
                              const filteredLocs = (settings.locations || []).filter((l: any) => l.id !== loc.id);
                              const updatedSettings = { ...settings, locations: filteredLocs };
                              setSettings(updatedSettings);
                              await syncDBKey("elx_settings", updatedSettings);
                              notify(`Location "${loc.name}" removed!`, "ok");
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "14px" }}
                            title="Delete Location"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add new location form */}
                <div style={{ background: "rgba(37,99,235,0.05)", border: "1.5px dashed rgba(37,99,235,0.2)", borderRadius: "12px", padding: "14px" }}>
                  <h4 style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2563eb", marginBottom: "12px" }}>➕ Add New Service Location</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "10px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "var(--elextra-text, #475569)" }}>Location ID (lowercase, e.g., prestea)</label>
                      <input
                        style={S.inp}
                        placeholder="prestea"
                        value={newLocId}
                        onChange={e => setNewLocId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "var(--elextra-text, #475569)" }}>Location Name (e.g., Prestea)</label>
                      <input
                        style={S.inp}
                        placeholder="Prestea"
                        value={newLocName}
                        onChange={e => setNewLocName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: "bold", color: "var(--elextra-text, #475569)" }}>Emoji</label>
                      <input
                        style={S.inp}
                        placeholder="📍"
                        value={newLocEmoji}
                        onChange={e => setNewLocEmoji(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!newLocId || !newLocName) {
                        notify("Please specify both Location ID and Name!", "err");
                        return;
                      }
                      const existing = (settings.locations || []).find((l: any) => l.id === newLocId);
                      if (existing) {
                        notify("A location with this ID already exists!", "err");
                        return;
                      }

                      const newLoc = {
                        id: newLocId,
                        name: newLocName,
                        emoji: newLocEmoji,
                        label: `${newLocEmoji} ${newLocName} Only`
                      };

                      const updatedLocs = [...(settings.locations || []), newLoc];
                      const updatedSettings = { ...settings, locations: updatedLocs };
                      
                      setSettings(updatedSettings);
                      await syncDBKey("elx_settings", updatedSettings);
                      
                      // Reset fields
                      setNewLocId("");
                      setNewLocName("");
                      setNewLocEmoji("📍");
                      
                      notify(`Expanded service region successfully to include ${newLocName}!`, "ok");
                    }}
                    style={{ ...S.cta, background: "#2563eb", width: "auto", padding: "8px 16px" }}
                  >
                    🚀 Deploy Location to Network
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {activeTab === "gemini_copilot" && (
        <GeminiCopilotTab user={user} notify={notify} />
      )}

      {activeTab === "image_verification" && (
        <ImageVerificationTab user={user} notify={notify} />
      )}

      {activeTab === "cross_sell" && (
        <CrossSellManagerTab 
          user={user} 
          notify={notify} 
          syncDBKey={syncDBKey} 
        />
      )}

      {activeTab === "catalog_manager" && (
        <CatalogManagerTab 
          user={user} 
          notify={notify} 
          customCatalog={customCatalog} 
          syncDBKey={syncDBKey} 
          handleRoleAction={handleRoleAction}
          pendingApprovals={pendingApprovals}
        />
      )}

      {activeTab === "food_catalog_manager" && (
        <FoodCatalogManagerTab
          user={user}
          notify={notify}
          foodPlaces={foodPlaces}
          setFoodPlaces={setFoodPlaces}
          syncDBKey={syncDBKey}
          handleRoleAction={handleRoleAction}
          pendingApprovals={pendingApprovals}
        />
      )}

      {activeTab === "malls_manager" && (
        <MallsManagerTab
          user={user}
          notify={notify}
          syncDBKey={syncDBKey}
          handleRoleAction={handleRoleAction}
        />
      )}

    </div>
  );
}

// Sub-component: Uber driver style interactive map with real-time GPS telemetry
function RiderUberMap({
  job,
  onUpdateProgress
}: {
  job: any;
  onUpdateProgress: (id: string, isDispatch: boolean, progress: number) => any;
}) {
  const [progress, setProgress] = useState(job.progress !== undefined ? Number(job.progress) : 25);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = React.useRef<any>(null);

  useEffect(() => {
    setProgress(job.progress !== undefined ? Number(job.progress) : 25);
  }, [job.progress]);

  // Handle auto-simulation of the ride (Uber-style)
  useEffect(() => {
    if (isSimulating) {
      simulationIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const next = Math.min(100, prev + 2);
          onUpdateProgress(job.id, !!job.isDispatchJob, next);
          if (next >= 100) {
            setIsSimulating(false);
            clearInterval(simulationIntervalRef.current);
          }
          return next;
        });
      }, 1000);
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    }
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isSimulating, job.id, job.isDispatchJob]);

  // Compute Bezier coordinates for high-fidelity route tracking
  const fra = progress / 100;
  const markerX = (1 - fra) * (1 - fra) * 45 + 2 * (1 - fra) * fra * 250 + fra * fra * 455;
  const markerY = (1 - fra) * (1 - fra) * 115 + 2 * (1 - fra) * fra * 35 + fra * fra * 115;
  const percentX = (markerX / 500) * 100;
  const percentY = (markerY / 160) * 100;

  const baseLat = 5.303;
  const baseLng = -1.984;
  const mockLat = baseLat + (markerY - 115) * 0.0005;
  const mockLng = baseLng + (markerX - 45) * 0.0008;

  return (
    <div style={{ marginTop: "12px", border: "1.5px solid #0f172a", borderRadius: "12px", overflow: "hidden", background: "#0f172a" }}>
      {/* MAP HEADER HUD */}
      <div style={{ padding: "8px 12px", background: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f8fafc" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
          <span style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "1px", color: "#10b981" }}>ELEXTRA NAVIGATION CO-PILOT</span>
        </div>
        <span style={{ fontSize: "10px", color: "#94a3b8" }}>ETA: {progress >= 100 ? "Arrived" : `${Math.max(1, Math.round((100 - progress) * 0.15))} mins`}</span>
      </div>

      {/* REAL HIGH-EFFICIENCY INTERACTIVE MAP */}
      <div style={{ height: "220px", background: "#0b0f19", position: "relative", overflow: "hidden" }}>
        <InteractiveMap
          riderCoords={{ lat: mockLat, lng: mockLng }}
          pickupCoords={{ lat: 5.303, lng: -1.984 }}
          dropoffCoords={{ lat: 5.303, lng: -1.656 }}
          status={job.status}
          progress={progress}
          pickupName={job.pickup || "Store Depot"}
          dropoffName={job.destination || "Destination"}
          driverName="You (Courier)"
        />

        {/* Uber Live Telemetry Hud Overlays */}
        <div style={{ position: "absolute", left: "10px", top: "10px", background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "9px", zIndex: 50 }}>
          <div style={{ color: "#94a3b8", fontSize: "7px", fontWeight: "bold" }}>NAVIGATING TO CLIENT</div>
          <div style={{ fontSize: "11px", fontWeight: "900", color: "#38bdf8", marginTop: "2px" }}>
            {progress >= 100 ? "0.0" : (3.5 - (progress * 0.035)).toFixed(1)} km left
          </div>
        </div>

        <div style={{ position: "absolute", right: "10px", top: "10px", background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "9px", textAlign: "right", zIndex: 50 }}>
          <div style={{ color: "#94a3b8", fontSize: "7px", fontWeight: "bold" }}>CURRENT SPEED</div>
          <div style={{ fontSize: "11px", fontWeight: "900", color: "#f59e0b", marginTop: "2px", fontFamily: "monospace" }}>
            {progress >= 100 || !isSimulating ? "0" : Math.round(42 + Math.sin(Date.now() / 1500) * 3)} km/h
          </div>
        </div>
      </div>

      {/* GPS CONTROL CONSOLE */}
      <div style={{ padding: "12px", background: "#1e293b", borderTop: "1px solid #334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#cbd5e1" }}>📍 Drag Slider to Manually Move Route</span>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#10b981" }}>{progress}% Done</span>
        </div>

        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress}
          onChange={(e) => {
            const nextVal = Number(e.target.value);
            setProgress(nextVal);
            onUpdateProgress(job.id, !!job.isDispatchJob, nextVal);
          }}
          style={{ width: "100%", height: "6px", borderRadius: "3px", background: "#334155", accentColor: "#10b981", cursor: "pointer", marginBottom: "12px" }}
        />

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "6px",
              border: "none",
              color: "white",
              background: isSimulating ? "#ef4444" : "linear-gradient(135deg, #3b82f6, #2563eb)",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px"
            }}
          >
            {isSimulating ? "⏸️ Pause Auto" : "🚀 Auto-Drive (Simulate)"}
          </button>
          
          <button
            onClick={() => {
              setProgress(100);
              onUpdateProgress(job.id, !!job.isDispatchJob, 100);
            }}
            disabled={progress >= 100}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #475569",
              color: progress >= 100 ? "#64748b" : "white",
              background: progress >= 100 ? "rgba(255,255,255,0.05)" : "#334155",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: progress >= 100 ? "not-allowed" : "pointer"
            }}
          >
            📍 Arrived
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Rider active Job card with customer verification PIN completion
function RiderJobCard({ 
  job, 
  onAccept, 
  onDecline, 
  onComplete,
  onUpdateProgress,
  foodPlaces = [],
  malls = [],
  showPin = false
}: { 
  job: any; 
  key?: string; 
  onAccept: (id: string, isDispatch: boolean) => any; 
  onDecline: (id: string, isDispatch: boolean) => any; 
  onComplete: (id: string, isDispatch: boolean, pin: string) => any; 
  onUpdateProgress: (id: string, isDispatch: boolean, progress: number) => any;
  foodPlaces?: any[];
  malls?: any[];
  showPin?: boolean;
}) {
  const [pinVal, setPinVal] = useState("");
  if (!job) return null;
  const isDispatch = !!job.isDispatchJob;

  const jobPickup = (job?.pickup || "").toLowerCase();

  const matchedVendor = foodPlaces?.find((fp: any) => {
    const name = (fp?.name || "").toLowerCase();
    return name && jobPickup && (
      name === jobPickup ||
      jobPickup.includes(name) ||
      name.includes(jobPickup)
    );
  });
  
  const matchedMall = malls?.find((m: any) => {
    const name = (m?.name || "").toLowerCase();
    return name && jobPickup && (
      name === jobPickup ||
      jobPickup.includes(name) ||
      name.includes(jobPickup)
    );
  });

  const googleMapsUrl = matchedVendor?.googleMapsUrl || matchedMall?.googleMapsUrl;

  return (
    <div style={{ ...S.sec, border: "1.5px solid #cbd5e1", background: "white", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "10px" }}>
        <div>
          <span style={{ fontSize: "10px", color: isDispatch ? "#ef4444" : "#3b82f6", fontWeight: "bold" }}>
            {isDispatch ? "LOGISTICS JOB ROUTING" : "STORE ORDER DELIVERY"}
          </span>
          <h4 style={{ fontSize: "14px", fontWeight: 900 }}>ID: {job.id}</h4>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {!isDispatch && (
            <span style={{
              background: job.isPaid ? "#d1fae5" : "#fffbeb",
              color: job.isPaid ? "#065f46" : "#b45309",
              border: job.isPaid ? "1px solid #10b981" : "1px solid #f59e0b",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "bold"
            }}>
              {job.isPaid ? "💳 PAID" : "⏳ UNPAID"}
            </span>
          )}
          <span style={{ background: job.status === "in-transit" || job.status === "out-for-delivery" || job.status === "collected" ? "#3b82f6" : "#f59e0b", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>
            {job.status.toUpperCase()}
          </span>
        </div>
      </div>

      {!isDispatch && (
        <div style={{
          marginBottom: "12px",
          padding: "8px 12px",
          background: job.isPaid ? "#f0fdf4" : "#fff7ed",
          border: job.isPaid ? "1px solid #bbf7d0" : "1px solid #ffedd5",
          borderRadius: "6px",
          fontSize: "11px",
          color: job.isPaid ? "#166534" : "#9a3412"
        }}>
          {job.isPaid ? (
            <span>✅ <strong>Payment Verified:</strong> This order is PAID. You can safely handover this package upon verification PIN check.</span>
          ) : (
            <span>⚠️ <strong>Unpaid Order Warning:</strong> Payment verification pending. Do NOT handover package until marked as PAID.</span>
          )}
        </div>
      )}

      {googleMapsUrl ? (
        <div style={{ marginTop: "12px", marginBottom: "12px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "10px", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#166534", fontWeight: "bold" }}>🗺️ GOOGLE MAPS NAVIGATION REDIRECT</div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#14532d", marginTop: "2px" }}>
                Directions to {job.pickup}
              </div>
            </div>
            <a 
              href={googleMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                background: "#10b981",
                color: "white",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: "bold",
                padding: "6px 12px",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              Get Directions ➔
            </a>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "12px", marginBottom: "12px", background: "#f8fafc", border: "1.5px solid #e2e8f0", padding: "8px", borderRadius: "8px", fontSize: "11px", color: "#64748b" }}>
          ℹ️ No custom Google Maps route set for <strong>{job.pickup}</strong> by Admins/Managers yet. Standard routing co-pilot active below.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", color: "#475569" }}>
        <div>
          <strong style={{ color: "#1e293b" }}>Pickup Venue:</strong><br />
          📌 {job.pickup} ({job.pickupAddr})
        </div>
        <div>
          <strong style={{ color: "#1e293b" }}>Destination:</strong><br />
          📍 {job.destination}
        </div>
      </div>

      <div style={{ marginTop: "10px", fontSize: "12px", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
        Client: <strong>{job.name}</strong> · Tel: {job.phone}<br />
        Cargo Scale: {job.size} ({job.type}) · Earnings Fee: <strong style={{ color: "#10b981" }}>GHS {job.fee.toFixed(2)}</strong>
      </div>

      {job.status === "assigned" || job.status === "confirmed" || job.status === "pending" || job.status === "preparing" ? (
        <div style={{ display: "flex", gap: "6px", marginTop: "14px" }}>
          <button 
            onClick={() => onDecline(job.id, isDispatch)} 
            style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1.5px solid #dc2626", color: "#dc2626", background: "white", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
          >
            ❌ Decline & Return
          </button>
          <button 
            onClick={() => onAccept(job.id, isDispatch)} 
            style={{ flex: 2, padding: "8px", borderRadius: "6px", border: "none", color: "white", background: "#10b981", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
          >
            ✔ Accept & transit
          </button>
        </div>
      ) : (
        <>
          {/* Uber Interactive Map inside job card */}
          <RiderUberMap job={job} onUpdateProgress={onUpdateProgress} />

          <div style={{ marginTop: "14px", borderTop: "1.5px dashed #e2e8f0", paddingTop: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#ef4444", display: "block", marginBottom: "4px" }}>
              🔒 Customer Delivery Verification PIN
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input 
                type="text" 
                placeholder="Enter 4-digit PIN (e.g. 4491)" 
                value={pinVal}
                onChange={e => setPinVal(e.target.value)}
                style={{ ...S.inp, flex: 2, padding: "8px" }}
              />
              <button 
                onClick={() => onComplete(job.id, isDispatch, pinVal)} 
                style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", color: "white", background: "#10b981", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                Verify & Handover
              </button>
            </div>
            {showPin && (
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                💡 Recipient PIN is: <strong style={{ color: "#0f172a" }}>{job.recipientPin || "4491"}</strong> (Provided for administrator convenience)
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Sub-component: Form for riders to suggest new food joints or shops
function RiderSuggestionForm({
  user,
  notify,
  handleRoleAction
}: {
  user: any;
  notify: (msg: string, type?: "ok" | "err") => void;
  handleRoleAction: any;
}) {
  const [placeType, setPlaceType] = useState<"vendor" | "shop">("vendor");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Tarkwa");
  const [cuisineOrType, setCuisineOrType] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify("Please enter the name of the place", "err");
      return;
    }
    setSubmitting(true);
    try {
      const desc = `Rider suggestion: Add ${placeType === "vendor" ? "Food Vendor" : "Retail Shop"} "${name.trim()}" at ${location}`;
      await handleRoleAction(
        "SUGGEST_PLACE",
        desc,
        {
          placeType,
          name: name.trim(),
          location,
          cuisineOrType: cuisineOrType.trim(),
          googleMapsUrl: googleMapsUrl.trim(),
          notes: notes.trim()
        },
        async () => {
          // Direct execution placeholder (won't be called for riders because they are not admins)
        }
      );
      notify("💡 Thank you! Suggestion submitted successfully for Admin approval.", "ok");
      setName("");
      setCuisineOrType("");
      setGoogleMapsUrl("");
      setNotes("");
    } catch (err) {
      notify("Failed to submit suggestion", "err");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...S.sec, background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
        💡 Suggest New Vendor or Shop
      </h3>
      <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
        Found a popular local food joint, restaurant, or provision store that is not currently listed? Suggest it here so admins/managers can onboard them.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Place Type</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <label style={{ flex: 1, padding: "8px", border: `1.5px solid ${placeType === "vendor" ? "#10b981" : "#cbd5e1"}`, background: placeType === "vendor" ? "#f0fdf4" : "white", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", color: placeType === "vendor" ? "#166534" : "#475569" }}>
              <input type="radio" checked={placeType === "vendor"} onChange={() => setPlaceType("vendor")} style={{ accentColor: "#10b981" }} />
              🍔 Food Vendor / Joint
            </label>
            <label style={{ flex: 1, padding: "8px", border: `1.5px solid ${placeType === "shop" ? "#10b981" : "#cbd5e1"}`, background: placeType === "shop" ? "#f0fdf4" : "white", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", color: placeType === "shop" ? "#166534" : "#475569" }}>
              <input type="radio" checked={placeType === "shop"} onChange={() => setPlaceType("shop")} style={{ accentColor: "#10b981" }} />
              🏪 Retail Store / Mall
            </label>
          </div>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Place Name</label>
          <input 
            type="text" 
            placeholder="e.g. Auntie Mary's Fufu Joint or Kwaku Grocery Shop" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            style={S.inp} 
            required 
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Operational Hub</label>
            <select value={location} onChange={e => setLocation(e.target.value)} style={S.inp}>
              <option value="Tarkwa">Tarkwa</option>
              <option value="Bogoso">Bogoso</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Category / Cuisine</label>
            <input 
              type="text" 
              placeholder="e.g. Local Chop Bar, Grocery, Supermarket" 
              value={cuisineOrType} 
              onChange={e => setCuisineOrType(e.target.value)} 
              style={S.inp} 
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Google Maps Link (Optional)</label>
          <input 
            type="url" 
            placeholder="e.g. https://maps.google.com/?q=..." 
            value={googleMapsUrl} 
            onChange={e => setGoogleMapsUrl(e.target.value)} 
            style={S.inp} 
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Notes / Remarks (Optional)</label>
          <textarea 
            placeholder="e.g. Very popular among students, gets around 10 orders per day." 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            style={{ ...S.inp, height: "60px", resize: "none" }} 
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          style={{
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "10px",
            fontSize: "13px",
            fontWeight: "bold",
            cursor: "pointer",
            marginTop: "6px",
            boxShadow: "0 2px 4px rgba(16, 185, 129, 0.15)",
            transition: "all 0.2s"
          }}
        >
          {submitting ? "Submitting..." : "Submit Suggestion"}
        </button>
      </form>
    </div>
  );
}
