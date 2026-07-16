/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Store, Bike, ShieldAlert, TrendingUp, Upload, Plus, Check, X, 
  AlertTriangle, Play, FileText, Camera, Key, DollarSign, Award, 
  PhoneCall, MessageSquare, MapPin, RotateCcw, Sparkles, Share2, 
  HelpCircle, Activity, CloudRain, ThumbsUp, Users, Sliders
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DB } from "../db";
import { FoodPlace, Driver, Order } from "../types";
import { S } from "../styles";

interface PartnerHubProps {
  user: any;
  notify: (msg: string, type?: "ok" | "err") => void;
  cityFilter: string;
}

export function PartnerHub({ user, notify, cityFilter }: PartnerHubProps) {
  const [activeTab, setActiveTab] = useState<"restaurant" | "rider" | "ops">("restaurant");

  // State persists inside indexed storage or falls back to simulated lists
  const [restaurants, setRestaurants] = useState<FoodPlace[]>([]);
  const [approvedRiders, setApprovedRiders] = useState<any[]>([]);
  const [activeSimOrders, setActiveSimOrders] = useState<any[]>([]);

  // ─── A. RESTAURANT PORTAL STATE ─────────────────────────────────────────────
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCategory, setRegCategory] = useState("Local Fast Food");
  const [regCity, setRegCity] = useState("tarkwa");
  const [regBranchCount, setRegBranchCount] = useState(1);
  const [regSubPlan, setRegSubPlan] = useState("premium_grow");
  const [regCommission, setRegCommission] = useState(15);
  const [regDocs, setRegDocs] = useState<{ license: string; health: string }>({ license: "", health: "" });
  const [registrationStatus, setRegistrationStatus] = useState<"none" | "submitted" | "approved">("none");
  const [registeredRestDetails, setRegisteredRestDetails] = useState<any | null>(null);

  // Active Restaurant Dashboard state
  const [selectedMyRestId, setSelectedMyRestId] = useState<string>("");
  const [isOverloaded, setIsOverloaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [menuSchedule, setMenuSchedule] = useState<"all" | "breakfast" | "lunch_dinner">("all");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [sponsoredListing, setSponsoredListing] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newDishPrice, setNewDishPrice] = useState("");

  // AI & Analytics simulations
  const [aiDescription, setAiDescription] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [fakeReviewsDetected, setFakeReviewsDetected] = useState<string[]>([]);
  const [customerComplaintsSummary, setCustomerComplaintsSummary] = useState<string>("");
  const [aiComplaintsGenerating, setAiComplaintsGenerating] = useState(false);

  // ─── B. RIDER PORTAL STATE ──────────────────────────────────────────────────
  const [riderName, setRiderName] = useState("");
  const [riderVehicle, setRiderVehicle] = useState("Motorcycle");
  const [riderPlate, setRiderPlate] = useState("");
  const [riderRegistered, setRiderRegistered] = useState(false);
  const [riderStatus, setRiderStatus] = useState<"offline" | "online">("offline");
  const [riderEarnings, setRiderEarnings] = useState<number>(0);
  const [riderJobsCompleted, setRiderJobsCompleted] = useState<number>(0);
  const [activeRiderJob, setActiveRiderJob] = useState<any | null>(null);

  // Delivery Proof fields
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofSignature, setProofSignature] = useState<string>("");
  const [proofPin, setProofPin] = useState<string>("");
  const [podStep, setPodStep] = useState<"idle" | "verifying" | "success">("idle");

  // Live Chat Simulator
  const [riderChatMessages, setRiderChatMessages] = useState<any[]>([]);
  const [riderChatInput, setRiderChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ─── C. OPERATIONS TOWER STATE ──────────────────────────────────────────────
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.0);
  const [weatherCondition, setWeatherCondition] = useState<"clear" | "rainy" | "stormy">("clear");
  const [deliveryBaseFee, setDeliveryBaseFee] = useState<number>(10);
  const [campaignName, setCampaignName] = useState("");
  const [campaignActive, setCampaignActive] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [riderMapPosition, setRiderMapPosition] = useState<{ x: number; y: number }>({ x: 120, y: 150 });
  const [targetMapPosition, setTargetMapPosition] = useState<{ x: number; y: number }>({ x: 280, y: 80 });
  const [routingPoints, setRoutingPoints] = useState<Array<{x: number, y: number, name: string}>>([
    { x: 120, y: 150, name: "Tarkwa Depot" },
    { x: 200, y: 120, name: "Auntie Efua Jollof Joint" },
    { x: 280, y: 80, name: "Cyanide Estate" }
  ]);
  const [isMapInTransit, setIsMapInTransit] = useState(false);
  const [trafficDensity, setTrafficDensity] = useState<"light" | "medium" | "heavy">("light");
  const [geofenceAlert, setGeofenceAlert] = useState<string | null>(null);

  // Load state and simulated DB records
  useEffect(() => {
    (async () => {
      // Load Food Places
      const storedFP = await DB.get("elx_food_places");
      if (storedFP && Array.isArray(storedFP)) {
        setRestaurants(storedFP);
        if (storedFP.length > 0) {
          setSelectedMyRestId(storedFP[0].id);
          setMenuItems(storedFP[0].menu || []);
        }
      }

      // Load or Mock Partners Registration
      const rReg = await DB.get("elx_rest_registration");
      if (rReg) {
        setRegistrationStatus(rReg.status || "none");
        setRegisteredRestDetails(rReg.details || null);
      }

      // Mock riders if not present
      const storedRiders = await DB.get("elx_registered_riders") || [
        { id: "rd-1", name: "Kwame Mensah", vehicle: "Motorcycle (KTM)", plate: "GW-1202-26", status: "online", rating: 4.9, earnings: 185 },
        { id: "rd-2", name: "Prince Osei", vehicle: "Motorcycle (Royal)", plate: "GT-995-26", status: "online", rating: 4.8, earnings: 120 },
        { id: "rd-3", name: "Blessing Arthur", vehicle: "Aboboya Tricycle", plate: "WR-234-26", status: "offline", rating: 4.7, earnings: 250 }
      ];
      setApprovedRiders(storedRiders);
      await DB.set("elx_registered_riders", storedRiders);

      // Create an active mock order in pipeline for Rider/Ops interaction
      const simOrder = {
        id: "SIM-8821",
        customerName: "Abena Serwaa",
        customerPhone: "0245671122",
        restaurantName: "Mama Abena's Local Joint",
        items: "2x Red Red with Avocado & Fish",
        pickupLocation: "Tarkwa Bypass, Tarkwa",
        deliveryLocation: "Bogoso Junction Outskirts",
        prepTimeLeft: 12,
        totalPrice: 48,
        riderFee: 16,
        status: "preparing", // preparing, rider_assigned, in_transit, completed
        securityPin: "4491"
      };
      setActiveSimOrders([simOrder]);
    })();
  }, []);

  // Update menu list whenever selected restaurant changes
  const handleSelectMyRest = (id: string) => {
    setSelectedMyRestId(id);
    const r = restaurants.find(x => x.id === id);
    if (r) {
      setMenuItems(r.menu || []);
      setSponsoredListing(!!r.imgUrl?.includes("sponsor"));
    }
  };

  // ─── AI SIMULATIONS ────────────────────────────────────────────────────────
  const generateAIDescription = () => {
    setAiGenerating(true);
    const currentRest = restaurants.find(x => x.id === selectedMyRestId);
    const name = currentRest?.name || "Elextra Partner Joint";
    const cat = currentRest?.type || "Local Delicacy";
    const loc = currentRest?.location || "Tarkwa-Bogoso";

    setTimeout(() => {
      setAiDescription(
        `✨ Powered by Gemini AI: Welcome to ${name}! The undisputed home of premium, freshly cooked ${cat} in ${loc}. Famously known for authentic rich flavors, strict kitchen hygiene standards, and instant dispatch handoff to our active motorcycle couriers. Try our signature recipes with stacked double-meat toppings!`
      );
      setAiGenerating(false);
      notify("AI Restaurant description generated successfully!", "ok");
    }, 1200);
  };

  const runFakeReviewDetector = () => {
    setFakeReviewsDetected([
      "❌ Suspicious Review from ID 'user_9921': 'This fufu saved my life. Extremely fast!' (Flagged: Repeated text patterns from same IP block)",
      "❌ Suspicious Review from ID 'bot_test_23': 'Best electronics in Tarkwa.' posted under a Local Chopbar. (Flagged: Category mismatch)"
    ]);
    notify("AI Fraud engine detected 2 suspicious reviews!", "err");
  };

  const runComplaintsSummarizer = () => {
    setAiComplaintsGenerating(true);
    setTimeout(() => {
      setCustomerComplaintsSummary(
        "📊 AI Feedback Summary (Last 30 days):\n• 78% of customers praised Gari & Spaghetti quantities on Rice.\n• 12% complained about delivery delays during heavy downpours.\n👉 Recommendation: Offer a 'Rainy Hour Care' coupon and equip riders with insulated thermo-bags."
      );
      setAiComplaintsGenerating(false);
      notify("AI Sentiment Analysis compiled!", "ok");
    }, 1400);
  };

  // ─── PARTNER REGISTRATION ──────────────────────────────────────────────────
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone) {
      notify("Please provide a business brand name and telephone contact.", "err");
      return;
    }

    const regData = {
      status: "submitted",
      details: {
        id: "joint-self-" + Math.floor(100 + Math.random() * 900),
        name: regName,
        location: `${regCity === "tarkwa" ? "Tarkwa Central" : "Bogoso Town"}, Ghana`,
        type: regCategory,
        hours: "8:00 AM - 10:00 PM",
        rating: 4.8,
        city: regCity as any,
        menu: [
          { item: "Classic Gari Fortified Waakye Plate", price: 25 },
          { item: "Assorted Rice Platter with Fried Egg", price: 30 }
        ],
        verificationDocs: {
          licenseName: regDocs.license || "TarkwaMunicipalLic_Draft.pdf",
          healthPermit: regDocs.health || "GhanaHealthCert_Pending.png"
        },
        branches: regBranchCount,
        subPlan: regSubPlan,
        commission: regSubPlan === "basic_starter" ? 18 : regSubPlan === "premium_grow" ? 15 : 12
      }
    };

    setRegistrationStatus("submitted");
    setRegisteredRestDetails(regData.details);
    await DB.set("elx_rest_registration", regData);
    notify("Self-registration submitted successfully! Awaiting Admin verification.", "ok");
  };

  // ─── ADDING DISH TO MENU ───────────────────────────────────────────────────
  const handleAddNewDish = async () => {
    if (!newDishName || !newDishPrice) {
      notify("Please complete dish name and GHS price.", "err");
      return;
    }
    const updatedMenu = [...menuItems, { item: newDishName, price: Number(newDishPrice) || 15 }];
    setMenuItems(updatedMenu);

    const updatedRestaurants = restaurants.map(r => {
      if (r.id === selectedMyRestId) {
        return { ...r, menu: updatedMenu };
      }
      return r;
    });

    setRestaurants(updatedRestaurants);
    await DB.set("elx_food_places", updatedRestaurants);
    notify(`Added ${newDishName} to your menu!`, "ok");
    setNewDishName("");
    setNewDishPrice("");
  };

  // ─── ADMIN ACTIONS ON PORTAL ────────────────────────────────────────────────
  const approveMyOwnRegistration = async () => {
    if (!registeredRestDetails) return;
    const nextList = [registeredRestDetails, ...restaurants];
    setRestaurants(nextList);
    await DB.set("elx_food_places", nextList);

    const nextReg = { status: "approved", details: registeredRestDetails };
    setRegistrationStatus("approved");
    await DB.set("elx_rest_registration", nextReg);

    setSelectedMyRestId(registeredRestDetails.id);
    setMenuItems(registeredRestDetails.menu);

    notify(`Authorized! ${registeredRestDetails.name} is now LIVE on Elextra! 🎉`, "ok");
  };

  // ─── RIDER SIMULATIONS & REAL-TIME GPS SYNC ──────────────────────────────────
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [dbDispatch, setDbDispatch] = useState<any[]>([]);

  useEffect(() => {
    const loadRealData = async () => {
      const o = await DB.get("elx_orders") || [];
      const d = await DB.get("elx_dispatch") || [];
      setDbOrders(o);
      setDbDispatch(d);
    };
    loadRealData();

    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_orders") {
        setDbOrders(e.detail.value || []);
      } else if (e.detail?.key === "elx_dispatch") {
        setDbDispatch(e.detail.value || []);
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
    };
  }, []);

  const updateRealOrderStatus = async (orderId: string, fields: any) => {
    const allOrders = await DB.get("elx_orders") || [];
    const updated = allOrders.map((o: any) => {
      if (o.id === orderId) {
        return { ...o, ...fields };
      }
      return o;
    });
    setDbOrders(updated);
    await DB.set("elx_orders", updated);
  };

  const updateRealDispatchStatus = async (jobId: string, fields: any) => {
    const allJobs = await DB.get("elx_dispatch") || [];
    const updated = allJobs.map((j: any) => {
      if (j.id === jobId) {
        return { ...j, ...fields };
      }
      return j;
    });
    setDbDispatch(updated);
    await DB.set("elx_dispatch", updated);
  };

  // Automatic incremental GPS/progress progression for active riders in-transit
  useEffect(() => {
    if (activeRiderJob && activeRiderJob.status === "in_transit") {
      let currentProgress = activeRiderJob.progress !== undefined ? Number(activeRiderJob.progress) : 60;
      
      const interval = setInterval(async () => {
        currentProgress += 5;
        if (currentProgress >= 95) {
          currentProgress = 95; // Wait for final PIN release before reaching 100%
          clearInterval(interval);
        }
        
        const updatedJob = { ...activeRiderJob, progress: currentProgress };
        setActiveRiderJob(updatedJob);
        
        if (activeRiderJob.id.startsWith("SIM-")) {
          setActiveSimOrders([updatedJob]);
        } else if (activeRiderJob.id.startsWith("DISP-")) {
          await updateRealDispatchStatus(activeRiderJob.id, { progress: currentProgress });
        } else {
          await updateRealOrderStatus(activeRiderJob.id, { progress: currentProgress });
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [activeRiderJob?.id, activeRiderJob?.status]);

  const handleRiderOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderName || !riderPlate) {
      notify("Please insert rider name and plate number.", "err");
      return;
    }
    setRiderRegistered(true);
    setRiderStatus("online");
    notify(`Rider account approved! Welcome online, ${riderName}! 🏍️`, "ok");

    // Check for real orders or fall back to simulation
    const realOffer = dbOrders.find(o => o.status === "confirmed" || o.status === "preparing");
    if (realOffer) {
      setActiveRiderJob({
        id: realOffer.id,
        restaurantName: realOffer.items?.[0]?.name ? `Store Order: ${realOffer.items[0].name}` : "Gourmet Chopbar Dinner",
        items: realOffer.items?.map((it: any) => `${it.name} x${it.qty}`).join(", ") || "Fresh Provisions",
        pickupLocation: realOffer.restaurantName || "Tarkwa Food Hub",
        deliveryLocation: realOffer.deliveryLocation || "Customer Address",
        riderFee: 15,
        status: "rider_assigned",
        recipientPin: realOffer.recipientPin
      });
    } else if (activeSimOrders.length > 0) {
      setActiveRiderJob({ ...activeSimOrders[0], status: "rider_assigned" });
    }
  };

  const handleRiderAcceptDecline = async (accept: boolean) => {
    if (accept) {
      if (activeRiderJob) {
        const job = { ...activeRiderJob, status: "in_transit", progress: 60 };
        setActiveRiderJob(job);
        notify("Job Accepted! Heading to merchant point immediately.", "ok");
        setIsMapInTransit(true);

        if (activeRiderJob.id.startsWith("SIM-")) {
          setActiveSimOrders([job]);
        } else if (activeRiderJob.id.startsWith("DISP-")) {
          await updateRealDispatchStatus(activeRiderJob.id, { status: "in-transit", progress: 60 });
        } else {
          await updateRealOrderStatus(activeRiderJob.id, { status: "in-transit", progress: 60 });
        }
      }
    } else {
      setActiveRiderJob(null);
      notify("Job declined. Your driver matching score decreased slightly.", "err");
    }
  };

  // Verification Step
  const runDeliveryProofVerification = async () => {
    setPodStep("verifying");
    const expectedPin = activeRiderJob?.recipientPin || "4491";

    setTimeout(async () => {
      if (proofPin && proofPin !== expectedPin && proofPin !== "4491") {
        notify("Invalid Customer Verification Escrow PIN!", "err");
        setPodStep("idle");
        return;
      }
      setPodStep("success");
      const deliveryFee = activeRiderJob?.fee || activeRiderJob?.riderFee || 15;
      const riderPortion = Number((deliveryFee * 0.70).toFixed(2));
      setRiderEarnings(prev => prev + riderPortion);
      setRiderJobsCompleted(prev => prev + 1);
      
      const completedJob = { ...activeRiderJob, status: "completed", progress: 100 };
      setActiveRiderJob(completedJob);
      
      if (activeRiderJob.id.startsWith("SIM-")) {
        setActiveSimOrders([completedJob]);
      } else if (activeRiderJob.id.startsWith("DISP-")) {
        await updateRealDispatchStatus(activeRiderJob.id, { status: "delivered", progress: 100 });
      } else {
        await updateRealOrderStatus(activeRiderJob.id, { status: "delivered", progress: 100 });
      }
      setIsMapInTransit(false);
      notify("Safe Handover Confirmed! Escrow released to your GHS wallet instantly! 💳", "ok");
    }, 1200);
  };

  // Payout Earnings to MoMo Wallet
  const handleMomoPayout = () => {
    if (riderEarnings <= 0) {
      notify("Your GHS balance is empty.", "err");
      return;
    }
    notify(`Withdrawing GHS ${riderEarnings.toFixed(2)} to your Mobile Money line autonomously!`, "ok");
    setRiderEarnings(0);
  };

  // Emergency SOS trigger
  const triggerSOS = () => {
    notify("🚨 EMERGENCY SOS INITIATED! Geolocation sent to Tarkwa Dispatch Control & Ghana Police.", "err");
  };

  // Rider chat simulation
  const handleRiderSendChat = () => {
    if (!riderChatInput.trim()) return;
    const newMsg = { sender: "driver", text: riderChatInput, time: "Now" };
    setRiderChatMessages(prev => [...prev, newMsg]);
    setRiderChatInput("");

    setTimeout(() => {
      const responses = [
        "Please bring extra green pepper sauce if possible! Thanks.",
        "Auntie, I am standing near the blue gate. Call me when you exit.",
        "Perfect, thank you! I've typed in the escrow code.",
        "Is the Jollof spicy? Please tell the chef not to put too much pepper."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setRiderChatMessages(prev => [...prev, { sender: "customer", text: randomResponse, time: "Now" }]);
    }, 1000);
  };

  // Live Map Simulation Step
  useEffect(() => {
    if (isMapInTransit) {
      const interval = setInterval(() => {
        setRiderMapPosition(prev => {
          const dx = targetMapPosition.x - prev.x;
          const dy = targetMapPosition.y - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 4) {
            // Arrived at destination
            setIsMapInTransit(false);
            setGeofenceAlert("🔔 Geofence: Rider arrived at Cyanide customer coordinates!");
            return targetMapPosition;
          }
          const step = 2 * simulationSpeed;
          return {
            x: prev.x + (dx / distance) * step,
            y: prev.y + (dy / distance) * step
          };
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isMapInTransit, targetMapPosition, simulationSpeed]);

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Visual Hub Header */}
      <div style={{ background: "linear-gradient(135deg, #111827, #1f2937)", border: "1.5px solid #374151", borderRadius: "16px", padding: "18px 20px", marginBottom: "18px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "24px" }}>🤝</span>
              <strong style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "-0.01em" }}>Elextra Partner & Operations Hub</strong>
            </div>
            <p style={{ fontSize: "11.5px", color: "#9ca3af", marginTop: "4px" }}>
              Comprehensive terminal for restaurant self-registration, rider logistics verification, and traffic-aware dispatch tools.
            </p>
          </div>
          <span style={{ background: "rgba(33,241,168,0.12)", color: "#21F1A8", fontSize: "11px", fontWeight: "bold", padding: "6px 12px", borderRadius: "12px", border: "1.5px solid rgba(33,241,168,0.25)" }}>
            ⚡ PARTNER PORTALS v3.5
          </span>
        </div>

        {/* Tab Selection Row */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", background: "#111827", padding: "4px", borderRadius: "10px" }}>
          {[
            { id: "restaurant", label: "🏪 Restaurant Portal", color: "#f97316" },
            { id: "rider", label: "🏍️ Driver / Rider App", color: "#3b82f6" },
            { id: "ops", label: "👑 Admin Operations Tower", color: "#8b5cf6" }
          ].map(t => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  notify(`Loaded ${t.label}!`);
                }}
                style={{
                  flex: 1,
                  background: isSelected ? t.color : "transparent",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "12.5px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* 1. RESTAURANT PARTNER PORTAL                                              */}
        {/* ========================================================================= */}
        {activeTab === "restaurant" && (
          <motion.div
            key="restaurant"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Split layout: Setup Wizard & Real-time Operations */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              
              {/* Wizard Section */}
              <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px", height: "fit-content" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "10px", marginBottom: "14px" }}>
                  <Store size={18} style={{ color: "#f97316" }} />
                  <strong style={{ fontSize: "14px", color: "var(--elextra-text)" }}>Restaurant Self-Registration Wizard</strong>
                </div>

                {registrationStatus === "none" ? (
                  <form onSubmit={handleSubmitRegistration} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Brand Name *</label>
                      <input style={S.inp} placeholder="e.g. Auntie Mansah's Royal TZ & Jollof" value={regName} onChange={e => setRegName(e.target.value)} required />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Operational City *</label>
                        <select style={{ ...S.inp, height: "42px", padding: "8px" }} value={regCity} onChange={e => setRegCity(e.target.value)}>
                          <option value="tarkwa">Tarkwa City</option>
                          <option value="bogoso">Bogoso Junction</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Category Type</label>
                        <input style={S.inp} placeholder="Chopbar / Pizzeria" value={regCategory} onChange={e => setRegCategory(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Branch Count</label>
                        <input type="number" min={1} style={S.inp} value={regBranchCount} onChange={e => setRegBranchCount(Math.max(1, Number(e.target.value)))} />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Contact Telephone *</label>
                        <input style={S.inp} placeholder="024XXXXXXX" value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Vendor Subscription Tier</label>
                      <select style={{ ...S.inp, height: "42px", padding: "8px" }} value={regSubPlan} onChange={e => setRegSubPlan(e.target.value)}>
                        <option value="basic_starter">Starter Basic (18% Commission · Free Listings)</option>
                        <option value="premium_grow">Premium Expansion (15% Commission · Geofence Pro)</option>
                        <option value="enterprise_master">Elite Enterprise (12% Commission · 24/7 Priority Rider Standby)</option>
                      </select>
                    </div>

                    {/* Verification Documents Upload Simulator */}
                    <div style={{ background: "var(--elextra-soft-bg)", border: "1px dashed var(--elextra-border)", borderRadius: "10px", padding: "10px", marginTop: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-text)", display: "block", marginBottom: "6px" }}>📑 Regulatory Document Upload Verification:</span>
                      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--elextra-card-bg)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--elextra-border)" }}>
                          <span style={{ fontSize: "11.5px" }}>Business Certificate of Incorporation:</span>
                          <button type="button" onClick={() => setRegDocs(prev => ({ ...prev, license: "incorporation_certified_tarkwa.pdf" }))} style={{ border: "none", background: "#f97316", color: "white", fontSize: "10.5px", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                            {regDocs.license ? "✓ Attached" : "Attach 📤"}
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--elextra-card-bg)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--elextra-border)" }}>
                          <span style={{ fontSize: "11.5px" }}>Sanitary & Health Permit (Municipal):</span>
                          <button type="button" onClick={() => setRegDocs(prev => ({ ...prev, health: "food_grade_sanitation_permit.png" }))} style={{ border: "none", background: "#f97316", color: "white", fontSize: "10.5px", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                            {regDocs.health ? "✓ Attached" : "Attach 📤"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button type="submit" style={{ ...S.cta, background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white", marginTop: "8px" }}>
                      Submit Self-Registration Application 🚀
                    </button>
                  </form>
                ) : registrationStatus === "submitted" ? (
                  <div style={{ background: "#eff6ff", border: "2.5px solid #3b82f6", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: "36px" }}>🛡️</div>
                    <strong style={{ fontSize: "14px", color: "#1e3a8a", display: "block", marginTop: "8px" }}>Application Pending Approval</strong>
                    <p style={{ fontSize: "11.5px", color: "#475569", margin: "8px 0 12px", lineHeight: "1.4em" }}>
                      Your brand <strong>{registeredRestDetails?.name}</strong> has been saved. We are verifying incorporation documents and health permits.
                    </p>

                    <div style={{ background: "white", border: "1.5px solid #bfdbfe", padding: "10px", borderRadius: "8px", textAlign: "left", fontSize: "11px", marginBottom: "14px" }}>
                      <div>• <strong>City Hub:</strong> {registeredRestDetails?.city?.toUpperCase()}</div>
                      <div>• <strong>Branches requested:</strong> {registeredRestDetails?.branches} active coordinates</div>
                      <div>• <strong>Uploaded documents:</strong> {registeredRestDetails?.verificationDocs?.licenseName}</div>
                    </div>

                    {/* Developer Shortcut to bypass verification */}
                    <button 
                      onClick={approveMyOwnRegistration}
                      style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", width: "100%" }}
                    >
                      ⚡ Bypass Approved autonomously (Admin simulation)
                    </button>
                  </div>
                ) : (
                  <div style={{ background: "#f0fdf4", border: "2.5px solid #22c55e", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: "36px" }}>🏆</div>
                    <strong style={{ fontSize: "14px", color: "#166534", display: "block", marginTop: "8px" }}>Verified Elextra Partner Joint!</strong>
                    <p style={{ fontSize: "11.5px", color: "#475569", margin: "8px 0" }}>
                      Congratulations! <strong>{registeredRestDetails?.name}</strong> is completely verified with certified GHS licensing!
                    </p>
                    <button 
                      onClick={() => setRegistrationStatus("none")}
                      style={{ background: "transparent", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "10px", padding: "4px 8px", marginTop: "10px", cursor: "pointer" }}
                    >
                      Register another restaurant branch ➕
                    </button>
                  </div>
                )}
              </div>

              {/* Live Operations Panel */}
              <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "10px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sliders size={18} style={{ color: "#f97316" }} />
                    <strong style={{ fontSize: "14px", color: "var(--elextra-text)" }}>Joint Operations & Menu Scheduling</strong>
                  </div>
                </div>

                {/* Restaurant selector if multiple */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Select Store Branch:</label>
                  <select 
                    style={{ ...S.inp, height: "38px", padding: "6px 8px" }} 
                    value={selectedMyRestId} 
                    onChange={e => handleSelectMyRest(e.target.value)}
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.location})</option>
                    ))}
                  </select>
                </div>

                {/* Pause Orders and overload buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  <button
                    onClick={() => {
                      setIsPaused(!isPaused);
                      notify(isPaused ? "Store online! Accepting dispatch invitations." : "Store paused temporarily.", isPaused ? "ok" : "err");
                    }}
                    style={{
                      background: isPaused ? "#ef4444" : "var(--elextra-soft-bg)",
                      border: "1.5px solid",
                      borderColor: isPaused ? "#ef4444" : "var(--elextra-border)",
                      color: isPaused ? "white" : "var(--elextra-text)",
                      padding: "8px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    {isPaused ? "🔴 PAUSED (Incoming Closed)" : "🟢 ONLINE (Accepting)"}
                  </button>

                  <button
                    onClick={() => {
                      setIsOverloaded(!isOverloaded);
                      notify(isOverloaded ? "Store cleared. Queue open." : "Store overloaded! Autoclose triggered.", "err");
                    }}
                    style={{
                      background: isOverloaded ? "#ea580c" : "var(--elextra-soft-bg)",
                      border: "1.5px solid",
                      borderColor: isOverloaded ? "#ea580c" : "var(--elextra-border)",
                      color: isOverloaded ? "white" : "var(--elextra-text)",
                      padding: "8px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    {isOverloaded ? "⚠️ OVERLOADED AUTOCLOSE" : "🛡️ MARK OVERLOADED"}
                  </button>
                </div>

                {/* Menu scheduling switcher */}
                <div style={{ marginBottom: "14px", background: "var(--elextra-soft-bg)", padding: "10px", borderRadius: "10px", border: "1.5px solid var(--elextra-border)" }}>
                  <strong style={{ fontSize: "11px", display: "block", color: "var(--elextra-text)", marginBottom: "4px" }}>📅 Menu Timing Schedule:</strong>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[
                      { id: "all", l: "⏰ 24h Full Menu" },
                      { id: "breakfast", l: "🍳 Breakfast Only" },
                      { id: "lunch_dinner", l: "🍲 Lunch/Dinner" }
                    ].map(sched => (
                      <button
                        key={sched.id}
                        onClick={() => {
                          setMenuSchedule(sched.id as any);
                          notify(`Timing schedule adjusted to ${sched.l}`);
                        }}
                        style={{
                          flex: 1,
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "6px",
                          borderRadius: "6px",
                          border: "none",
                          background: menuSchedule === sched.id ? "#f97316" : "var(--elextra-card-bg)",
                          color: menuSchedule === sched.id ? "white" : "var(--elextra-text)",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                        }}
                      >
                        {sched.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adding Menu Dishes */}
                <div style={{ background: "var(--elextra-soft-bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--elextra-border)", marginBottom: "14px" }}>
                  <strong style={{ fontSize: "11.5px", display: "block", color: "var(--elextra-text)", marginBottom: "6px" }}>➕ Add Dish to Active Store Menu:</strong>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input style={{ ...S.inp, flex: 2, height: "34px", fontSize: "12px" }} placeholder="Dish Name (e.g., Fufu + Smoked Salmon)" value={newDishName} onChange={e => setNewDishName(e.target.value)} />
                    <input type="number" style={{ ...S.inp, flex: 1, height: "34px", fontSize: "12px" }} placeholder="GHS Price" value={newDishPrice} onChange={e => setNewDishPrice(e.target.value)} />
                    <button onClick={handleAddNewDish} style={{ background: "#f97316", color: "white", border: "none", borderRadius: "6px", padding: "0 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Add</button>
                  </div>
                </div>

                {/* Active Menu items display */}
                <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--elextra-border)", borderRadius: "8px", padding: "8px", marginBottom: "12px" }}>
                  <strong style={{ fontSize: "11.5px", display: "block", color: "var(--elextra-text)", borderBottom: "1px solid var(--elextra-border)", paddingBottom: "4px", marginBottom: "6px" }}>📋 Current Branch Catalog Dishes:</strong>
                  {menuItems.map((m, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", padding: "4px 0", borderBottom: "1px dashed var(--elextra-border)" }}>
                      <span>{m.item}</span>
                      <strong style={{ color: "#f97316" }}>₵{m.price.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>

                {/* Sponsoring dynamic placement toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "11px", color: "#ea580c", display: "block" }}>⭐ Sponsored Fast Food Listings placements</strong>
                    <span style={{ fontSize: "9px", color: "var(--elextra-subtext)" }}>Pay ₵10/day to place your joint at the absolute top of the index.</span>
                  </div>
                  <button
                    onClick={async () => {
                      const nextSponsor = !sponsoredListing;
                      setSponsoredListing(nextSponsor);
                      const updated = restaurants.map(r => r.id === selectedMyRestId ? { ...r, imgUrl: nextSponsor ? "https://sponsor-logo.png" : undefined } : r);
                      setRestaurants(updated);
                      await DB.set("elx_food_places", updated);
                      notify(nextSponsor ? "Sponsored placement activated at peak coordinates!" : "Sponsored placement disabled.", "ok");
                    }}
                    style={{
                      background: sponsoredListing ? "#ea580c" : "transparent",
                      color: sponsoredListing ? "white" : "#ea580c",
                      border: "1px solid #ea580c",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "10.5px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    {sponsoredListing ? "★ Sponsored Active" : "Promote Joint"}
                  </button>
                </div>
              </div>

            </div>

            {/* AI FEATURES TABS FOR RESTAURANTS */}
            <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px", marginTop: "16px" }}>
              <div style={{ borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "8px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={18} style={{ color: "#ec4899" }} />
                <strong style={{ fontSize: "13.5px", color: "var(--elextra-text)" }}>Gemini AI Operations Co-Pilot (Restaurant optimization tools)</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                
                {/* AI Generator Description */}
                <div style={{ border: "1px solid var(--elextra-border)", borderRadius: "10px", padding: "12px", background: "var(--elextra-soft-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <Award size={16} style={{ color: "#ec4899" }} />
                    <strong style={{ fontSize: "12px" }}>AI Description Generator</strong>
                  </div>
                  <p style={{ fontSize: "10.5px", color: "var(--elextra-subtext)", lineHeight: "1.4em", marginBottom: "10px" }}>
                    Analyze active menu categories, locations, and ratings to yield a high-converting, localized bio for your storefront!
                  </p>
                  <button 
                    onClick={generateAIDescription} 
                    disabled={aiGenerating} 
                    style={{ background: "#ec4899", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", padding: "6px 12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    {aiGenerating ? "Generating..." : "✨ Auto-Generate Description"}
                  </button>
                  {aiDescription && (
                    <div style={{ background: "var(--elextra-card-bg)", padding: "10px", border: "1px solid var(--elextra-border)", borderRadius: "8px", marginTop: "10px", fontSize: "11.5px", lineHeight: "1.45em", fontStyle: "italic", borderLeft: "3.5px solid #ec4899" }}>
                      {aiDescription}
                    </div>
                  )}
                </div>

                {/* AI Fake Review Detector */}
                <div style={{ border: "1px solid var(--elextra-border)", borderRadius: "10px", padding: "12px", background: "var(--elextra-soft-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <ShieldAlert size={16} style={{ color: "#ef4444" }} />
                    <strong style={{ fontSize: "12px" }}>Fake Reviews & Fraud Detector</strong>
                  </div>
                  <p style={{ fontSize: "10.5px", color: "var(--elextra-subtext)", lineHeight: "1.4em", marginBottom: "10px" }}>
                    Monitor local ratings submissions and screen for spam bots, repeated IP coordinate loops, or fake competitor reviews automatically!
                  </p>
                  <button 
                    onClick={runFakeReviewDetector} 
                    style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", padding: "6px 12px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    🔍 Inspect Branch Review Feeds
                  </button>
                  {fakeReviewsDetected.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                      {fakeReviewsDetected.map((f, i) => (
                        <div key={i} style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "6px 8px", borderRadius: "6px", fontSize: "10.5px" }}>
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI complaints analyzer */}
                <div style={{ border: "1px solid var(--elextra-border)", borderRadius: "10px", padding: "12px", background: "var(--elextra-soft-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <MessageSquare size={16} style={{ color: "#3b82f6" }} />
                    <strong style={{ fontSize: "12px" }}>AI Complaints & Feedback Analyzer</strong>
                  </div>
                  <p style={{ fontSize: "10.5px", color: "var(--elextra-subtext)", lineHeight: "1.4em", marginBottom: "10px" }}>
                    Consolidate anonymous client chats and dispatch comments into scannable operational complaints and menu suggestions.
                  </p>
                  <button 
                    onClick={runComplaintsSummarizer} 
                    disabled={aiComplaintsGenerating}
                    style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", padding: "6px 12px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {aiComplaintsGenerating ? "Summarizing..." : "📊 Compile Feedback Summaries"}
                  </button>
                  {customerComplaintsSummary && (
                    <pre style={{ background: "var(--elextra-card-bg)", padding: "10px", border: "1px solid var(--elextra-border)", borderRadius: "8px", marginTop: "10px", fontSize: "10.5px", fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap", color: "var(--elextra-text)", lineHeight: "1.4em" }}>
                      {customerComplaintsSummary}
                    </pre>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 2. DRIVER / RIDER PORTAL                                                  */}
        {/* ========================================================================= */}
        {activeTab === "rider" && (
          <motion.div
            key="rider"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {!riderRegistered ? (
              <div style={{ maxWidth: "480px", margin: "20px auto", background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "40px" }}>🏍️</span>
                  <strong style={{ display: "block", fontSize: "17px", color: "var(--elextra-text)", marginTop: "10px" }}>Elextra On-Demand Rider Registry</strong>
                  <p style={{ fontSize: "11.5px", color: "var(--elextra-subtext)", marginTop: "4px" }}>Register your motorcycle, Aboboya, or pickup. Subject to instant identity background verification.</p>
                </div>

                <form onSubmit={handleRiderOnboard} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Rider Legal Name *</label>
                    <input style={S.inp} placeholder="e.g. Samuel Kojo Boadi" value={riderName} onChange={e => setRiderName(e.target.value)} required />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Vehicle Category</label>
                      <select style={{ ...S.inp, height: "42px", padding: "8px" }} value={riderVehicle} onChange={e => setRiderVehicle(e.target.value)}>
                        <option value="Motorcycle">🛵 Motorcycle (Standard Runner)</option>
                        <option value="Aboboya">🛺 Aboboya Tricycle (Heavy / Wood)</option>
                        <option value="Pickup">🛻 Flatbed Truck (Construction / Bulk)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--elextra-subtext)", display: "block", marginBottom: "4px" }}>Plate Registration *</label>
                      <input style={S.inp} placeholder="e.g. WR-1209-26" value={riderPlate} onChange={e => setRiderPlate(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ background: "var(--elextra-soft-bg)", padding: "10px", borderRadius: "10px", border: "1px dashed var(--elextra-border)", fontSize: "11px", color: "var(--elextra-text)", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={14} style={{ color: "#22c55e" }} />
                      <span>National Ghana Card Identification Attached (Automatic background clearance check complete)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={14} style={{ color: "#22c55e" }} />
                      <span>DVLA Motorcycle Rider License endorsement validated</span>
                    </div>
                  </div>

                  <button type="submit" style={{ ...S.cta, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "white", marginTop: "10px" }}>
                    Submit Rider Credentials & Go Live 🏍️
                  </button>
                </form>
              </div>
            ) : (
              <div>
                {/* Rider App Interface */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                  
                  {/* Rider Wallet & Control Dashboard */}
                  <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px", height: "fit-content" }}>
                    
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "10px", marginBottom: "14px" }}>
                      <div>
                        <strong style={{ fontSize: "14px", color: "var(--elextra-text)", display: "block" }}>🧑‍✈️ Rider Console: {riderName}</strong>
                        <span style={{ fontSize: "11px", color: "var(--elextra-subtext)" }}>Vehicle: <strong>{riderVehicle} ({riderPlate})</strong></span>
                      </div>
                      <button
                        onClick={() => {
                          const nextStatus = riderStatus === "online" ? "offline" : "online";
                          setRiderStatus(nextStatus);
                          notify(nextStatus === "online" ? "Status: Live! Standby for orders." : "Status: Offline.", nextStatus === "online" ? "ok" : "err");
                        }}
                        style={{
                          background: riderStatus === "online" ? "#22c55e" : "#64748b",
                          border: "none",
                          color: "white",
                          borderRadius: "12px",
                          padding: "6px 12px",
                          fontSize: "11.5px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        {riderStatus === "online" ? "🟢 Online" : "⚫ Offline"}
                      </button>
                    </div>

                    {/* Earnings widget */}
                    <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
                      <span style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#38bdf8", fontWeight: "bold" }}>GHS Logistics Wallet Balance</span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "4px" }}>
                        <span style={{ fontSize: "28px", fontWeight: "900", color: "#21F1A8" }}>₵{riderEarnings.toFixed(2)}</span>
                        <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>{riderJobsCompleted} Jobs Finished</span>
                      </div>

                      <div style={{ borderTop: "1px solid #334155", paddingTop: "8px", marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                        <span>Performance Bonus: +₵15.00</span>
                        <span>MoMo Tariff Covered</span>
                      </div>

                      <button
                        onClick={handleMomoPayout}
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #21F1A8, #059669)",
                          color: "#111827",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px",
                          fontWeight: "bold",
                          fontSize: "12px",
                          cursor: "pointer",
                          marginTop: "12px",
                          boxShadow: "0 3px 10px rgba(33,241,168,0.2)"
                        }}
                      >
                        💸 Instant Withdrawal to Mobile Money Wallet
                      </button>
                    </div>

                    {/* Active assigned job offer */}
                    {activeRiderJob && activeRiderJob.status !== "completed" ? (
                      <div style={{ border: "2.5px solid #2563eb", background: "#f8fafc", borderRadius: "12px", padding: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold", background: "#2563eb", color: "white", padding: "2px 8px", borderRadius: "8px" }}>
                            🚨 ACTIVE JOB ASSIGNED
                          </span>
                          <strong style={{ fontSize: "13px", color: "#2563eb" }}>₵{activeRiderJob.riderFee}.00</strong>
                        </div>

                        <strong style={{ fontSize: "14px", display: "block", color: "#1e293b" }}>{activeRiderJob.restaurantName}</strong>
                        <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}><strong>Order items:</strong> {activeRiderJob.items}</div>

                        <div style={{ marginTop: "10px", padding: "8px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px" }}>
                          <div>📍 <strong>Pick-up:</strong> {activeRiderJob.pickupLocation}</div>
                          <div style={{ marginTop: "4px" }}>🏁 <strong>Deliver to:</strong> {activeRiderJob.deliveryLocation}</div>
                        </div>

                        {activeRiderJob.status === "rider_assigned" ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                            <button
                              onClick={() => handleRiderAcceptDecline(true)}
                              style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "6px", padding: "8px", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              Accept Run ✓
                            </button>
                            <button
                              onClick={() => handleRiderAcceptDecline(false)}
                              style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "6px", padding: "8px", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              Decline Run ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ marginTop: "12px" }}>
                            <div style={{ fontSize: "11.5px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "8px" }}>📋 Secure Escrow Handover Proof (POD)</div>
                            
                            {/* Signature simulation */}
                            <div style={{ marginBottom: "10px" }}>
                              <label style={{ fontSize: "10.5px", color: "#475569", display: "block", marginBottom: "3px" }}>A. Customer Handover Digital Signature:</label>
                              <input 
                                style={{ ...S.inp, height: "32px", fontSize: "11.5px" }} 
                                placeholder="Type recipient full signature..." 
                                value={proofSignature} 
                                onChange={e => setProofSignature(e.target.value)} 
                              />
                            </div>

                            {/* Camera proof simulation */}
                            <div style={{ marginBottom: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setProofPhoto("https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=120");
                                  notify("Proof of Delivery photo uploaded!", "ok");
                                }}
                                style={{ background: "#111827", color: "white", border: "none", borderRadius: "6px", fontSize: "10.5px", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                              >
                                <Camera size={12} /> Take Handover Photo
                              </button>
                              {proofPhoto && <span style={{ fontSize: "10px", color: "#166534" }}>📷 HandoffPhoto_Signed.jpg Attached</span>}
                            </div>

                            {/* Escrow code */}
                            <div style={{ marginBottom: "12px" }}>
                              <label style={{ fontSize: "10.5px", color: "#475569", display: "block", marginBottom: "3px" }}>B. Secure Escrow Escort PIN (Client displays on dispatch slip):</label>
                              <input 
                                type="password"
                                maxLength={4}
                                style={{ ...S.inp, height: "32px", fontSize: "11.5px", letterSpacing: "0.2em", fontWeight: "bold" }} 
                                placeholder="Enter 4-Digit Escrow PIN" 
                                value={proofPin} 
                                onChange={e => setProofPin(e.target.value)} 
                              />
                              <span style={{ fontSize: "9px", color: "#64748b" }}>* Simulation code: 4491</span>
                            </div>

                            <button
                              onClick={runDeliveryProofVerification}
                              disabled={podStep === "verifying" || !proofSignature || !proofPin}
                              style={{
                                width: "100%",
                                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "8px",
                                fontWeight: "bold",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                            >
                              {podStep === "verifying" ? "Verifying Handover..." : "🏁 Finalize Handover & Release GHS"}
                            </button>

                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
                              <button 
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                style={{ flex: 1, marginRight: "4px", background: "white", border: "1px solid #cbd5e1", color: "#334155", padding: "6px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                              >
                                <MessageSquare size={13} /> Chat with Client
                              </button>
                              <button 
                                onClick={triggerSOS}
                                style={{ flex: 1, marginLeft: "4px", background: "#ef4444", border: "none", color: "white", padding: "6px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                              >
                                <ShieldAlert size={13} /> Emergency SOS 🚨
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ border: "1.5px dashed var(--elextra-border)", borderRadius: "12px", padding: "16px", textShadow: "none", textAlign: "center", color: "var(--elextra-subtext)", background: "var(--elextra-card-bg)" }}>
                          <span>📭 Standby. No active logistics dispatch associated. Keep Online status enabled to prompt near-matching requests.</span>
                        </div>

                        {/* List of pending runs */}
                        <div style={{ background: "var(--elextra-card-bg)", border: "1.5px solid var(--elextra-border)", borderRadius: "14px", padding: "16px" }}>
                          <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "var(--elextra-text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "var(--elextra-primary)" }}>●</span> Real-Time Available Deliveries ({dbOrders.filter(o => o.status === "confirmed" || o.status === "preparing" || o.status === "pending").length + dbDispatch.filter(d => d.status === "pending").length})
                          </h4>

                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {dbOrders.filter(o => o.status === "confirmed" || o.status === "preparing" || o.status === "pending").map((order: any) => (
                              <div key={order.id} style={{ border: "1px solid var(--elextra-border)", borderRadius: "10px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                <div style={{ textShadow: "none" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontWeight: "bold", fontSize: "12.5px", color: "#0f172a" }}>{order.id}</span>
                                    <span style={{ fontSize: "10px", background: "rgba(34,197,94,0.15)", color: "#16a34a", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold" }}>Store Order</span>
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                                    📍 <strong>Pick-up:</strong> {order.restaurantName || "Tarkwa Merchant Food Hub"}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                                    🏁 <strong>Deliver:</strong> {order.deliveryLocation || "Customer Address"}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                                    🥡 <strong>Items:</strong> {order.items?.map((it: any) => `${it.name} x${it.qty}`).join(", ") || "Fresh Meal"}
                                  </div>
                                </div>
                                <button
                                  onClick={async () => {
                                    const job = {
                                      id: order.id,
                                      restaurantName: order.restaurantName || "Tarkwa Merchant Food Hub",
                                      items: order.items?.map((it: any) => `${it.name} x${it.qty}`).join(", ") || "Gourmet Dinner",
                                      pickupLocation: order.restaurantName || "Tarkwa Food Hub",
                                      deliveryLocation: order.deliveryLocation || "Customer Address",
                                      riderFee: 15,
                                      status: "rider_assigned",
                                      recipientPin: order.recipientPin
                                    };
                                    setActiveRiderJob(job);
                                    await updateRealOrderStatus(order.id, { status: "assigned", driver: { name: riderName || "Prince Osei", plate: riderPlate || "GT-995-26" } });
                                    notify(`Claimed Order ${order.id}! Heading to pick up.`, "ok");
                                  }}
                                  style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer" }}
                                >
                                  Claim Job
                                </button>
                              </div>
                            ))}

                            {dbDispatch.filter(d => d.status === "pending").map((disp: any) => (
                              <div key={disp.id} style={{ border: "1px solid var(--elextra-border)", borderRadius: "10px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                <div style={{ textShadow: "none" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontWeight: "bold", fontSize: "12.5px", color: "#0f172a" }}>{disp.id}</span>
                                    <span style={{ fontSize: "10px", background: "rgba(59,130,246,0.15)", color: "#3b82f6", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold" }}>Private Cargo Run</span>
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                                    📍 <strong>Pick-up:</strong> {disp.pickupAddress}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                                    🏁 <strong>Deliver:</strong> {disp.deliveryAddress}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                                    📦 <strong>Weight:</strong> {disp.cargoWeight || "Standard Package"}
                                  </div>
                                </div>
                                <button
                                  onClick={async () => {
                                    const job = {
                                      id: disp.id,
                                      restaurantName: `Cargo Run: ${disp.cargoType || "Parcel"}`,
                                      items: `${disp.cargoWeight || "Standard weight"} package`,
                                      pickupLocation: disp.pickupAddress,
                                      deliveryLocation: disp.deliveryAddress,
                                      riderFee: disp.estimatedFee || 20,
                                      status: "rider_assigned",
                                      recipientPin: disp.recipientPin || "4491"
                                    };
                                    setActiveRiderJob(job);
                                    await updateRealDispatchStatus(disp.id, { status: "assigned", driver: { name: riderName || "Prince Osei", plate: riderPlate || "GT-995-26" } });
                                    notify(`Claimed Dispatch ${disp.id}!`, "ok");
                                  }}
                                  style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer" }}
                                >
                                  Claim Job
                                </button>
                              </div>
                            ))}

                            {dbOrders.filter(o => o.status === "confirmed" || o.status === "preparing" || o.status === "pending").length === 0 &&
                             dbDispatch.filter(d => d.status === "pending").length === 0 && (
                              <div style={{ textAlign: "center", padding: "12px", fontSize: "11px", color: "var(--elextra-subtext)" }}>
                                ☕ No live orders are currently awaiting dispatch. Placing a store order on the website will display here in real-time instantly!
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rider Chat & Heat map widgets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    
                    {/* Live Rider Customer Chat Drawer */}
                    {isChatOpen && (
                      <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "8px", marginBottom: "10px" }}>
                          <strong style={{ fontSize: "12.5px" }}>💬 Rider & Customer Secure Chat Line</strong>
                          <button onClick={() => setIsChatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
                        </div>

                        <div style={{ height: "140px", overflowY: "auto", border: "1px solid var(--elextra-border)", borderRadius: "8px", padding: "8px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                          {riderChatMessages.map((m, i) => (
                            <div key={i} style={{ alignSelf: m.sender === "driver" ? "flex-end" : "flex-start", background: m.sender === "driver" ? "#3b82f6" : "white", color: m.sender === "driver" ? "white" : "#1f2937", border: m.sender === "driver" ? "none" : "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "11.5px", maxWidth: "80%" }}>
                              <div>{m.text}</div>
                            </div>
                          ))}
                          {riderChatMessages.length === 0 && <span style={{ fontSize: "11px", color: "#64748b", margin: "auto", textAlign: "center" }}>Send a secure message to the customer regarding meal temperature or coordinates.</span>}
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <input style={{ ...S.inp, height: "32px", fontSize: "11.5px" }} placeholder="Type message..." value={riderChatInput} onChange={e => setRiderChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRiderSendChat()} />
                          <button onClick={handleRiderSendChat} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", padding: "0 12px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Send</button>
                        </div>
                      </div>
                    )}

                    {/* Rider Heat Map Simulator */}
                    <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px" }}>
                      <div style={{ borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "8px", marginBottom: "12px" }}>
                        <strong style={{ fontSize: "13px", color: "var(--elextra-text)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>🔥</span> Demand Heat Map Coordinates
                        </strong>
                      </div>

                      <div style={{ position: "relative", height: "120px", background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: "10px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {/* Simulation circles for heatmap */}
                        <div style={{ position: "absolute", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(239,68,68,0.5)", filter: "blur(8px)", left: "30px", top: "20px" }} />
                        <div style={{ position: "absolute", width: "60px", height: "60px", borderRadius: "50%", background: "rgba(249,115,22,0.45)", filter: "blur(12px)", right: "40px", bottom: "10px" }} />
                        
                        <div style={{ position: "absolute", top: "10px", left: "10px", color: "white", fontSize: "10px", fontWeight: "bold" }}>Tarkwa-Bogoso Sector</div>
                        <div style={{ zIndex: 5, textAlign: "center", padding: "10px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#fca5a5" }}>🚨 Tarkwa Market Center & Post Office area</span>
                          <p style={{ fontSize: "9.5px", color: "#e2e8f0", marginTop: "4px" }}>High order frequency! <strong>+₵8.50 Peak Surge Bonus active.</strong> Position here for near-matching.</p>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 3. ADMIN OPERATIONS TOWER                                                 */}
        {/* ========================================================================= */}
        {activeTab === "ops" && (
          <motion.div
            key="ops"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Tower Dashboard */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              
              {/* Maps & Route Optimization Simulator */}
              <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px" }}>
                <div style={{ borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "8px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13.5px", color: "var(--elextra-text)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📍</span> Multi-Stop Route Optimization & Mapping
                  </strong>
                  <span style={{ fontSize: "10px", background: "var(--elextra-soft-bg)", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                    {isMapInTransit ? "🏃 MOVING" : "⏸ STANDBY"}
                  </span>
                </div>

                {/* Routing information */}
                <div style={{ background: "var(--elextra-soft-bg)", padding: "10px", borderRadius: "8px", border: "1px solid var(--elextra-border)", fontSize: "11px", marginBottom: "12px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>📍 Optimize Multi-Stop Sequence:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {routingPoints.map((pt, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#2563eb", fontWeight: "900" }}>{idx + 1}.</span>
                        <span>{pt.name}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                    <button
                      onClick={() => {
                        // Re-order sequence for optimal routing
                        const optimized = [
                          { x: 120, y: 150, name: "1. Tarkwa Depot (Start)" },
                          { x: 280, y: 80, name: "2. Cyanide Customer (Same-Route Batch)" },
                          { x: 200, y: 120, name: "3. Auntie Efua Jollof Joint (Food Pickup)" }
                        ];
                        setRoutingPoints(optimized);
                        notify("Optimized delivery sequence based on traffic-density data!", "ok");
                      }}
                      style={{ flex: 1, border: "none", background: "#2563eb", color: "white", padding: "5px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      🗺️ Run Traffic Routing Auto-Optimization
                    </button>
                    <button
                      onClick={() => {
                        setIsMapInTransit(true);
                        setRiderMapPosition({ x: 120, y: 150 });
                        notify("Live dispatch simulator started!", "ok");
                      }}
                      style={{ border: "none", background: "#22c55e", color: "white", padding: "5px 10px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      ▶ Run Sim
                    </button>
                  </div>
                </div>

                {/* Simulated Map Canvas */}
                <div style={{ position: "relative", height: "200px", background: "#e2e8f0", border: "1.5px solid var(--elextra-border)", borderRadius: "12px", overflow: "hidden" }}>
                  {/* Grid Lines resembling city layout */}
                  <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.15 }}>
                    <line x1="40" y1="0" x2="40" y2="200" stroke="black" strokeWidth="2" />
                    <line x1="120" y1="0" x2="120" y2="200" stroke="black" strokeWidth="2" />
                    <line x1="200" y1="0" x2="200" y2="200" stroke="black" strokeWidth="2" />
                    <line x1="280" y1="0" x2="280" y2="200" stroke="black" strokeWidth="2" />
                    <line x1="0" y1="50" x2="400" y2="50" stroke="black" strokeWidth="2" />
                    <line x1="0" y1="110" x2="400" y2="110" stroke="black" strokeWidth="2" />
                    <line x1="0" y1="160" x2="400" y2="160" stroke="black" strokeWidth="2" />
                  </svg>

                  {/* Highlighted geofences */}
                  <div style={{ position: "absolute", width: "70px", height: "70px", borderRadius: "50%", background: "rgba(37,99,235,0.08)", border: "1.5px dashed #3b82f6", left: "80px", top: "110px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "8px", color: "#3b82f6", fontWeight: "bold", textTransform: "uppercase" }}>Geofence A</span>
                  </div>

                  {/* Map marker pins */}
                  <div style={{ position: "absolute", left: "120px", top: "150px", transform: "translate(-50%, -100%)", textAlign: "center" }}>
                    <span style={{ fontSize: "16px" }}>🏢</span>
                    <span style={{ display: "block", fontSize: "7px", background: "white", padding: "1px 3px", borderRadius: "3px", fontWeight: "bold" }}>Depot</span>
                  </div>

                  <div style={{ position: "absolute", left: "200px", top: "120px", transform: "translate(-50%, -100%)", textAlign: "center" }}>
                    <span style={{ fontSize: "16px" }}>🍲</span>
                    <span style={{ display: "block", fontSize: "7px", background: "white", padding: "1px 3px", borderRadius: "3px", fontWeight: "bold" }}>Chopbar</span>
                  </div>

                  <div style={{ position: "absolute", left: "280px", top: "80px", transform: "translate(-50%, -100%)", textAlign: "center" }}>
                    <span style={{ fontSize: "16px" }}>🏠</span>
                    <span style={{ display: "block", fontSize: "7px", background: "white", padding: "1px 3px", borderRadius: "3px", fontWeight: "bold" }}>Customer</span>
                  </div>

                  {/* Animated rider pin */}
                  <div style={{ position: "absolute", left: `${riderMapPosition.x}px`, top: `${riderMapPosition.y}px`, transform: "translate(-50%, -50%)", transition: "transform 0.1s" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#ef4444", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.2)" }}>
                      <span style={{ fontSize: "12px" }}>🏍️</span>
                    </div>
                  </div>

                  {/* Traffic settings banner overlay */}
                  <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(17,24,39,0.85)", color: "white", padding: "4px 8px", borderRadius: "6px", fontSize: "9px" }}>
                    Traffic: {trafficDensity.toUpperCase()} · Speed: {simulationSpeed}x
                  </div>
                </div>

                {/* Controls for map */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                  <div>
                    <label style={{ fontSize: "10px", color: "var(--elextra-subtext)", display: "block", marginBottom: "3px" }}>Traffic density:</label>
                    <select 
                      style={{ ...S.inp, height: "30px", fontSize: "11px", padding: "4px" }} 
                      value={trafficDensity} 
                      onChange={e => {
                        const val = e.target.value;
                        setTrafficDensity(val as any);
                        setSimulationSpeed(val === "heavy" ? 0.4 : val === "medium" ? 1.0 : 1.8);
                        notify(`Simulation updated for ${val} traffic parameters.`);
                      }}
                    >
                      <option value="light">Light traffic (1.8x travel speed)</option>
                      <option value="medium">Medium traffic (1.0x travel speed)</option>
                      <option value="heavy">Heavy bottlenecks (0.4x travel speed)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "10px", color: "var(--elextra-subtext)", display: "block", marginBottom: "3px" }}>Tracking link sharing:</label>
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin || "https://elextra.xyz"}/live-share/SIM-8821`;
                        navigator.clipboard.writeText(shareUrl);
                        notify("Live tracking link copied to clipboard!", "ok");
                      }}
                      style={{ width: "100%", height: "30px", background: "var(--elextra-soft-bg)", border: "1px dashed var(--elextra-border)", color: "var(--elextra-text)", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                    >
                      <Share2 size={12} /> Copy Shareable Link 📋
                    </button>
                  </div>
                </div>

                {geofenceAlert && (
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#166534", padding: "8px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", marginTop: "10px", textAlign: "center" }}>
                    {geofenceAlert}
                  </div>
                )}
              </div>

              {/* Dynamic Pricing Engine & Surge Controller */}
              <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px", height: "fit-content" }}>
                <div style={{ borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "8px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <TrendingUp size={18} style={{ color: "#8b5cf6" }} />
                  <strong style={{ fontSize: "13.5px", color: "var(--elextra-text)" }}>Pricing, Surge & Free Campaigns Engine</strong>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  
                  {/* Weather conditions multiplier */}
                  <div style={{ background: "var(--elextra-soft-bg)", padding: "10px", borderRadius: "10px", border: "1px solid var(--elextra-border)" }}>
                    <strong style={{ fontSize: "11px", color: "var(--elextra-text)", display: "block", marginBottom: "6px" }}>⛈️ Dynamic Weather Surcharges:</strong>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[
                        { id: "clear", l: "☀️ Dry Clear", fee: 10, mult: 1.0 },
                        { id: "rainy", l: "🌧️ Heavy Rain (+₵12)", fee: 22, mult: 1.4 },
                        { id: "stormy", l: "⛈️ Monsoon Gale (+₵25)", fee: 35, mult: 1.8 }
                      ].map(cond => (
                        <button
                          key={cond.id}
                          onClick={() => {
                            setWeatherCondition(cond.id as any);
                            setDeliveryBaseFee(cond.fee);
                            setSurgeMultiplier(cond.mult);
                            notify(`Weather state adjusted to ${cond.l}. Base fee updated GHS ${cond.fee}.`, "ok");
                          }}
                          style={{
                            flex: 1,
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "6px",
                            borderRadius: "6px",
                            border: "none",
                            background: weatherCondition === cond.id ? "#8b5cf6" : "var(--elextra-card-bg)",
                            color: weatherCondition === cond.id ? "white" : "var(--elextra-text)",
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                          }}
                        >
                          {cond.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Surge Multiplier Slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "11.5px", color: "var(--elextra-text)" }}>🔥 Peak-Hour Demand Surge Factor:</strong>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: "#8b5cf6" }}>{surgeMultiplier.toFixed(1)}x Multiplier</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.0" 
                      max="3.0" 
                      step="0.2" 
                      value={surgeMultiplier} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setSurgeMultiplier(val);
                        notify(`Peak hours demand surge shifted to ${val.toFixed(1)}x!`);
                      }}
                      style={{ width: "100%", accentColor: "#8b5cf6" }} 
                    />
                  </div>

                  {/* Distance and Zone parameters overview */}
                  <div style={{ background: "var(--elextra-soft-bg)", padding: "10px", borderRadius: "10px", border: "1px solid var(--elextra-border)", fontSize: "11px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>📏 Sector Pricing Zone Grid Config:</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span>Zone 1 (Tarkwa Municipal Radius 3km):</span>
                      <strong style={{ color: "var(--elextra-text)" }}>GHS 10.00 Base</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span>Zone 2 (Tarkwa Bypass to Cyanide 8km):</span>
                      <strong style={{ color: "var(--elextra-text)" }}>GHS 18.00 Base</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Zone 3 (Inter-city Bogoso Highway 15km):</span>
                      <strong style={{ color: "var(--elextra-text)" }}>GHS 35.00 Base</strong>
                    </div>
                  </div>

                  {/* Free Delivery Campaign Builder */}
                  <div style={{ border: "1.5px solid var(--elextra-border)", borderRadius: "10px", padding: "10px", background: "var(--elextra-card-bg)" }}>
                    <strong style={{ fontSize: "11px", display: "block", color: "var(--elextra-text)", marginBottom: "6px" }}>🎁 Marketing Promotion Campaigns Creator:</strong>
                    
                    <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                      <input 
                        style={{ ...S.inp, height: "32px", fontSize: "11px" }} 
                        placeholder="Promo Name (e.g., JOLLOFFREE)" 
                        value={campaignName} 
                        onChange={e => setCampaignName(e.target.value)} 
                      />
                      <button
                        onClick={() => {
                          if (!campaignName) return;
                          setCampaignActive(true);
                          notify(`Promotional code "${campaignName}" launched to all subscribers!`, "ok");
                        }}
                        style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "6px", padding: "0 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                      >
                        Launch Code
                      </button>
                    </div>

                    {campaignActive && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 8px", borderRadius: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#166534", fontWeight: "bold" }}>🟢 Active Code: {campaignName} (₵10 Off Delivery)</span>
                        <button 
                          onClick={() => {
                            setCampaignActive(false);
                            setCampaignName("");
                            notify("Promotion stopped.");
                          }} 
                          style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}
                        >
                          Deactivate
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* AI SYSTEM DEMAND FORECASTING */}
            <div style={{ background: "var(--elextra-card-bg, white)", border: "1.5px solid var(--elextra-border, #cbd5e1)", borderRadius: "14px", padding: "16px", marginTop: "16px" }}>
              <div style={{ borderBottom: "1.5px solid var(--elextra-border, #cbd5e1)", paddingBottom: "8px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={18} style={{ color: "#ec4899" }} />
                <strong style={{ fontSize: "13px", color: "var(--elextra-text)" }}>Elextra AI Demand Forecasting & Fleet Positioning</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", fontSize: "11.5px" }}>
                
                <div style={{ border: "1px solid var(--elextra-border)", borderRadius: "8px", padding: "10px", background: "var(--elextra-soft-bg)" }}>
                  <strong style={{ display: "block", color: "var(--elextra-text)", marginBottom: "4px" }}>📈 Predict Busy Period Spike Forecasts:</strong>
                  <p style={{ color: "var(--elextra-subtext)", lineHeight: "1.4em", margin: 0 }}>
                    AI algorithm projects **180% surge in dinner deliveries tomorrow** between 5pm and 8pm near Atuabo residential grid due to weekend municipal holidays.
                  </p>
                  <div style={{ background: "rgba(34,197,94,0.1)", color: "#166534", border: "1px solid rgba(34,197,94,0.25)", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", marginTop: "8px", display: "inline-block" }}>
                    ⭐ Optimal fleet positioning suggested: 5 riders near Tarkwa Main
                  </div>
                </div>

                <div style={{ border: "1px solid var(--elextra-border)", borderRadius: "8px", padding: "10px", background: "var(--elextra-soft-bg)" }}>
                  <strong style={{ display: "block", color: "var(--elextra-text)", marginBottom: "4px" }}>🎁 Automated Promos AI Recommendations:</strong>
                  <p style={{ color: "var(--elextra-subtext)", lineHeight: "1.4em", margin: 0 }}>
                    Logistics velocity is currently **slow during the 2pm lull**. AI recommends firing an automated WhatsApp promotion campaign: **'HAPPYHOUR'** offering GHS 5 off waakye lunch.
                  </p>
                  <button
                    onClick={() => {
                      setCampaignName("HAPPYHOUR");
                      setCampaignActive(true);
                      notify("AI-recommended campaign deployed successfully!", "ok");
                    }}
                    style={{ background: "#ec4899", color: "white", border: "none", borderRadius: "6px", fontSize: "10px", padding: "4px 8px", fontWeight: "bold", cursor: "pointer", marginTop: "8px" }}
                  >
                    Accept AI Recommendation
                  </button>
                </div>

                <div style={{ border: "1px solid var(--elextra-border)", borderRadius: "8px", padding: "10px", background: "var(--elextra-soft-bg)" }}>
                  <strong style={{ display: "block", color: "var(--elextra-text)", marginBottom: "4px" }}>🤖 Automated Customer Support Ticket Chatbot:</strong>
                  <p style={{ color: "var(--elextra-subtext)", lineHeight: "1.4em", margin: 0 }}>
                    Answering customer questions, validating receipt numbers and routing delivery issues autonomously using simulated RAG.
                  </p>
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    <span style={{ fontSize: "10px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>Active Tickets Resolved today: 41</span>
                    <span style={{ fontSize: "10px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>Accuracy: 98.2%</span>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
