import React, { useState, useEffect } from "react";
import { DB } from "../db";
import { resizeImageToThumbnail } from "../lib/imageUtils";
import { 
  Sparkles, 
  Wand2, 
  Check, 
  Loader2, 
  Play, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FileText,
  Tag,
  ShoppingBag,
  Bell,
  Upload,
  Undo2
} from "lucide-react";

interface GeminiCopilotTabProps {
  user: any;
  notify: (msg: string, type?: "ok" | "err") => void;
}

export default function GeminiCopilotTab({ user, notify }: GeminiCopilotTabProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [aiProposal, setAiProposal] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States for Image Upload and Undo/Reverse Action
  const [showUploadToggle, setShowUploadToggle] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isReversed, setIsReversed] = useState(false);
  const [hasUndoHistory, setHasUndoHistory] = useState(false);
  const [isReversing, setIsReversing] = useState(false);

  const suggestionTemplates = [
    {
      title: "Discount TVs & Fans",
      text: "Draft a flash promo discount: cut the prices of all electronics in TV and Fans categories by 10% to celebrate our Bogoso local anniversary!"
    },
    {
      title: "Add Tarkwa Yam",
      text: "Add a brand new Staples grocery item called 'Tarkwa Yam' priced at 18 GHS, sourced from Tarkwa Central Market."
    },
    {
      title: "Weekend Coupon",
      text: "Create a new coupon code WEEKEND15 that gives a 15% discount for orders placed this week, valid until the end of this month."
    },
    {
      title: "Rider Payout Notice",
      text: "Create a memo announcement informing Bogoso and Tarkwa riders that we are adding a 5 GHS safety bonus for night-shift couriers."
    }
  ];

  // Load initial undo history availability
  useEffect(() => {
    const checkUndo = async () => {
      const before = await DB.get("elx_copilot_before_last_apply");
      if (before) {
        setHasUndoHistory(true);
      }
    };
    checkUndo();
  }, []);

  const handleImageFile = async (file: File) => {
    try {
      notify("Converting image to compact thumbnail for fast upload...", "ok");
      const compressedBase64 = await resizeImageToThumbnail(file, 600, 0.8);
      setUploadedImage(compressedBase64);
      notify("Image loaded and compressed successfully!", "ok");
    } catch (err: any) {
      console.error("[Thumbnail Conversion Error]:", err);
      // Fallback to standard reading if thumbnail converter fails
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          setUploadedImage(result);
          notify("Image loaded successfully (without compression)!", "ok");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleReverse = async () => {
    setIsReversing(true);
    try {
      const targetStateKey = isReversed ? "elx_copilot_after_last_apply" : "elx_copilot_before_last_apply";
      const targetState = await DB.get(targetStateKey);
      if (targetState) {
        if (targetState.customCatalog) {
          await DB.set("elx_custom_catalog", targetState.customCatalog);
        }
        if (targetState.coupons) {
          await DB.set("elx_coupons", targetState.coupons);
        }
        if (targetState.memos) {
          await DB.set("elx_management_memos", targetState.memos);
        }
        if (targetState.foodPlaces) {
          await DB.set("elx_food_places", targetState.foodPlaces);
        }
        
        const newReversedState = !isReversed;
        setIsReversed(newReversedState);
        if (newReversedState) {
          notify("↩️ Reversed previous copilot action successfully!", "ok");
        } else {
          notify("🔁 Restored previous copilot action!", "ok");
        }
      } else {
        notify("No previous action record found to toggle", "err");
      }
    } catch (err: any) {
      notify("Failed to toggle reverse action: " + err.message, "err");
    } finally {
      setIsReversing(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setAiProposal(null);
    try {
      const payload: any = { prompt };
      if (showUploadToggle && uploadedImage) {
        payload.imageUrl = uploadedImage;
      }

      const res = await fetch("/api/gemini/admin-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        let errorMsg = "Failed to get suggestions from Gemini API. Please make sure your Gemini API Key is configured.";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (data && data.explanation && data.actions) {
        setAiProposal(data);
      } else {
        throw new Error("Gemini returned an invalid response schema. Try refining your request.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      notify(err.message || "Gemini Generation Failed", "err");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyActions = async () => {
    if (!aiProposal || !aiProposal.actions || aiProposal.actions.length === 0) return;
    setIsApplying(true);
    try {
      // Fetch fresh DB records to merge with
      const currentCatalog = await DB.get("elx_custom_catalog") || {};
      const currentCoupons = await DB.get("elx_coupons") || [];
      const currentMemos = await DB.get("elx_management_memos") || [];
      const currentFoodPlaces = await DB.get("elx_food_places") || [];

      // Save pre-apply state for undo
      const beforeState = {
        customCatalog: JSON.parse(JSON.stringify(currentCatalog)),
        coupons: JSON.parse(JSON.stringify(currentCoupons)),
        memos: JSON.parse(JSON.stringify(currentMemos)),
        foodPlaces: JSON.parse(JSON.stringify(currentFoodPlaces))
      };
      await DB.set("elx_copilot_before_last_apply", beforeState);

      let updatedCatalog = { ...currentCatalog };
      let updatedCoupons = [...currentCoupons];
      let updatedMemos = [...currentMemos];
      let updatedFoodPlaces = [...currentFoodPlaces];

      let catalogChanged = false;
      let couponsChanged = false;
      let memosChanged = false;
      let foodPlacesChanged = false;

      for (const act of aiProposal.actions) {
        if (act.type === "UPDATE_PRODUCT" && act.productId) {
          const existing = updatedCatalog[act.productId] || {};
          updatedCatalog[act.productId] = {
            ...existing,
            ...act.updates
          };
          catalogChanged = true;
        } else if (act.type === "ADD_PRODUCT" && act.product) {
          const addedProductsList = updatedCatalog.addedProducts || [];
          const newProd = {
            id: act.product.id || "cust-" + Date.now() + Math.floor(Math.random() * 100),
            name: act.product.name,
            price: Number(act.product.price),
            cat: act.product.category || act.product.cat || "Staples",
            section: act.section || "groceries",
            img: act.product.img || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
            location: act.product.location || "Sourced from Tarkwa Central",
            activeSelling: true
          };
          updatedCatalog.addedProducts = [
            ...addedProductsList.filter((p: any) => p && p.id !== newProd.id),
            newProd
          ];
          catalogChanged = true;
        } else if (act.type === "ADD_COUPON" && act.coupon) {
          const newCoupon = {
            id: "cp-" + Date.now() + Math.floor(Math.random() * 100),
            code: String(act.coupon.code).toUpperCase().trim(),
            discount: Number(act.coupon.discount),
            expires: act.coupon.expires || "2026-12-31",
            desc: act.coupon.description || "Copilot promo"
          };
          updatedCoupons = [
            ...updatedCoupons.filter((c: any) => c.code !== newCoupon.code),
            newCoupon
          ];
          couponsChanged = true;
        } else if (act.type === "ADD_MEMO" && act.memo) {
          const newMemo = {
            id: "memo-" + Date.now() + Math.floor(Math.random() * 100),
            title: act.memo.title || "Announcement",
            text: act.memo.text,
            category: act.memo.category || "General",
            priority: act.memo.priority || "normal",
            timestamp: new Date().toISOString(),
            author: user?.name || "Admin Gemini Copilot"
          };
          updatedMemos = [newMemo, ...updatedMemos];
          memosChanged = true;
        } else if (act.type === "ADD_FOOD_PLACE" && act.foodPlace) {
          const newPlace = {
            id: act.foodPlace.id || "fp-" + Date.now() + Math.floor(Math.random() * 100),
            name: act.foodPlace.name,
            cuisine: act.foodPlace.cuisine || "Local Eatery",
            type: act.foodPlace.cuisine || "Local Eatery",
            hours: act.foodPlace.hours || "8:00 AM - 10:00 PM",
            rating: act.foodPlace.rating || 4.5,
            reviewsCount: act.foodPlace.reviewsCount || 12,
            imgUrl: act.foodPlace.imgUrl || act.foodPlace.img || "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
            address: act.foodPlace.address || act.foodPlace.location || "Tarkwa",
            location: act.foodPlace.address || act.foodPlace.location || "Tarkwa",
            city: (act.foodPlace.city || "tarkwa").toLowerCase() as "tarkwa" | "bogoso",
            status: "active"
          };
          updatedFoodPlaces = [
            newPlace,
            ...updatedFoodPlaces.filter((f: any) => f.id !== newPlace.id && f.name.toLowerCase() !== newPlace.name.toLowerCase())
          ];
          foodPlacesChanged = true;
        } else if (act.type === "REMOVE_FOOD_PLACE" && act.restaurantId) {
          updatedFoodPlaces = updatedFoodPlaces.filter((f: any) => f.id !== act.restaurantId && String(f.name).toLowerCase() !== String(act.restaurantId).toLowerCase());
          foodPlacesChanged = true;
        }
      }

      if (catalogChanged) {
        await DB.set("elx_custom_catalog", updatedCatalog);
      }
      if (couponsChanged) {
        await DB.set("elx_coupons", updatedCoupons);
      }
      if (memosChanged) {
        await DB.set("elx_management_memos", updatedMemos);
      }
      if (foodPlacesChanged) {
        await DB.set("elx_food_places", updatedFoodPlaces);
      }

      // Save post-apply state for undo toggling back and forth
      const afterState = {
        customCatalog: JSON.parse(JSON.stringify(updatedCatalog)),
        coupons: JSON.parse(JSON.stringify(updatedCoupons)),
        memos: JSON.parse(JSON.stringify(updatedMemos)),
        foodPlaces: JSON.parse(JSON.stringify(updatedFoodPlaces))
      };
      await DB.set("elx_copilot_after_last_apply", afterState);
      setHasUndoHistory(true);
      setIsReversed(false); // Reset toggle state since we applied a new action

      notify("✨ Gemini suggestions successfully executed & published live!", "ok");
      setAiProposal(null);
      setPrompt("");
    } catch (err: any) {
      notify("Failed to apply suggestions: " + err.message, "err");
    } finally {
      setIsApplying(false);
    }
  };

  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any | null>(null);
  const [diagnosticsExecuting, setDiagnosticsExecuting] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsError(null);
    setDiagnosticsReport(null);
    try {
      const res = await fetch("/api/gemini/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        throw new Error("Diagnostics endpoint returned an error status.");
      }
      const data = await res.json();
      setDiagnosticsReport(data);
      notify("🔍 Diagnostics audit completed successfully!", "ok");
    } catch (err: any) {
      console.error(err);
      setDiagnosticsError(err.message || "Failed to run diagnostics.");
      notify("Diagnostics failed: " + (err.message || ""), "err");
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const executeDiagnosticsRepairs = async () => {
    if (!diagnosticsReport || !diagnosticsReport.actions || diagnosticsReport.actions.length === 0) return;
    setDiagnosticsExecuting(true);
    try {
      const currentCatalog = await DB.get("elx_custom_catalog") || {};
      const currentCoupons = await DB.get("elx_coupons") || [];
      const currentMemos = await DB.get("elx_management_memos") || [];
      const currentFoodPlaces = await DB.get("elx_food_places") || [];

      const beforeState = {
        customCatalog: JSON.parse(JSON.stringify(currentCatalog)),
        coupons: JSON.parse(JSON.stringify(currentCoupons)),
        memos: JSON.parse(JSON.stringify(currentMemos)),
        foodPlaces: JSON.parse(JSON.stringify(currentFoodPlaces))
      };
      await DB.set("elx_copilot_before_last_apply", beforeState);

      let updatedCatalog = { ...currentCatalog };
      let updatedCoupons = [...currentCoupons];
      let updatedMemos = [...currentMemos];
      let updatedFoodPlaces = [...currentFoodPlaces];

      let catalogChanged = false;
      let couponsChanged = false;
      let memosChanged = false;
      let foodPlacesChanged = false;

      for (const act of diagnosticsReport.actions) {
        if (act.type === "UPDATE_PRODUCT" && act.productId) {
          const existing = updatedCatalog[act.productId] || {};
          updatedCatalog[act.productId] = {
            ...existing,
            ...act.updates
          };
          catalogChanged = true;
        } else if (act.type === "ADD_PRODUCT" && act.product) {
          const addedProductsList = updatedCatalog.addedProducts || [];
          const newProd = {
            id: act.product.id || "cust-" + Date.now() + Math.floor(Math.random() * 100),
            name: act.product.name,
            price: Number(act.product.price),
            cat: act.product.category || act.product.cat || "Staples",
            section: act.section || "groceries",
            img: act.product.img || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
            location: act.product.location || "Sourced from Tarkwa Central",
            activeSelling: true
          };
          updatedCatalog.addedProducts = [
            ...addedProductsList.filter((p: any) => p && p.id !== newProd.id),
            newProd
          ];
          catalogChanged = true;
        } else if (act.type === "ADD_COUPON" && act.coupon) {
          const newCoupon = {
            id: "cp-" + Date.now() + Math.floor(Math.random() * 100),
            code: String(act.coupon.code).toUpperCase().trim(),
            discount: Number(act.coupon.discount),
            expires: act.coupon.expires || "2026-12-31",
            desc: act.coupon.description || "Copilot promo"
          };
          updatedCoupons = [
            ...updatedCoupons.filter((c: any) => c.code !== newCoupon.code),
            newCoupon
          ];
          couponsChanged = true;
        } else if (act.type === "ADD_FOOD_PLACE" && act.foodPlace) {
          const newPlace = {
            id: act.foodPlace.id || "fp-" + Date.now() + Math.floor(Math.random() * 100),
            name: act.foodPlace.name,
            cuisine: act.foodPlace.cuisine || "Local Eatery",
            type: act.foodPlace.cuisine || "Local Eatery",
            hours: act.foodPlace.hours || "8:00 AM - 10:00 PM",
            rating: act.foodPlace.rating || 4.5,
            reviewsCount: act.foodPlace.reviewsCount || 12,
            imgUrl: act.foodPlace.imgUrl || act.foodPlace.img || "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
            address: act.foodPlace.address || act.foodPlace.location || "Tarkwa",
            location: act.foodPlace.address || act.foodPlace.location || "Tarkwa",
            city: (act.foodPlace.city || "tarkwa").toLowerCase() as "tarkwa" | "bogoso",
            status: "active"
          };
          updatedFoodPlaces = [
            newPlace,
            ...updatedFoodPlaces.filter((f: any) => f.id !== newPlace.id && f.name.toLowerCase() !== newPlace.name.toLowerCase())
          ];
          foodPlacesChanged = true;
        } else if (act.type === "REMOVE_FOOD_PLACE" && act.restaurantId) {
          updatedFoodPlaces = updatedFoodPlaces.filter((f: any) => f.id !== act.restaurantId && String(f.name).toLowerCase() !== String(act.restaurantId).toLowerCase());
          foodPlacesChanged = true;
        }
      }

      if (catalogChanged) await DB.set("elx_custom_catalog", updatedCatalog);
      if (couponsChanged) await DB.set("elx_coupons", updatedCoupons);
      if (memosChanged) await DB.set("elx_management_memos", updatedMemos);
      if (foodPlacesChanged) await DB.set("elx_food_places", updatedFoodPlaces);

      const afterState = {
        customCatalog: JSON.parse(JSON.stringify(updatedCatalog)),
        coupons: JSON.parse(JSON.stringify(updatedCoupons)),
        memos: JSON.parse(JSON.stringify(updatedMemos)),
        foodPlaces: JSON.parse(JSON.stringify(updatedFoodPlaces))
      };
      await DB.set("elx_copilot_after_last_apply", afterState);
      setHasUndoHistory(true);
      setIsReversed(false);

      notify(`✨ Auto-heal: ${diagnosticsReport.actions.length} repairs successfully applied!`, "ok");
      setDiagnosticsReport(null);
    } catch (err: any) {
      notify("Diagnostics auto-heal failed: " + err.message, "err");
    } finally {
      setDiagnosticsExecuting(false);
    }
  };

  return (
    <div style={{ background: "#111827", color: "white", padding: "24px", borderRadius: "16px", border: "1px solid #374151" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", gap: "12px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "900", color: "white", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Sparkles style={{ color: "#ef4444" }} size={24} />
            Gemini Admin Copilot
          </h2>
          <p style={{ fontSize: "12.5px", color: "#9ca3af", marginTop: "4px" }}>
            Make Gemini available for admins to securely tweak prices, append new catalog items, issue coupons, and post staff memos using natural language.
          </p>
        </div>
      </div>

      {/* AI AUTO-HEAL & INTEGRITY DIAGNOSTICS COMMAND PANEL */}
      <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ flex: "1 1 300px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "white", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              🛡️ AI Auto-Heal & Catalog Integrity Diagnostics
            </h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px", marginBottom: 0 }}>
              Deep-scan store databases, pricing schedules, catalog metadata, and coupon expirations using background intelligence to identify issues and prepare self-healing repairs.
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={diagnosticsLoading}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 10px rgba(239, 68, 68, 0.2)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
          >
            {diagnosticsLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} style={{ display: "inline" }} />
                Scanning database...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Run Integrity Scan
              </>
            )}
          </button>
        </div>

        {diagnosticsError && (
          <div style={{ marginTop: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", color: "#f87171" }}>
            ⚠️ <strong>Diagnostics error:</strong> {diagnosticsError}
          </div>
        )}

        {diagnosticsReport && (
          <div style={{ marginTop: "16px", background: "#111827", border: "1px solid #374151", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontSize: "13px", color: "#e5e7eb", lineHeight: "1.6", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {diagnosticsReport.explanation}
            </div>

            {diagnosticsReport.actions && diagnosticsReport.actions.length > 0 && (
              <div style={{ marginTop: "14px", borderTop: "1px solid #374151", paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold" }}>
                  💡 {diagnosticsReport.actions.length} repair remedies recommended
                </span>
                <button
                  onClick={executeDiagnosticsRepairs}
                  disabled={diagnosticsExecuting}
                  style={{
                    background: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  {diagnosticsExecuting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} style={{ display: "inline" }} />
                      Applying repairs...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Execute auto-repairs
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REVERSE PREVIOUS ACTION TOGGLE */}
      {hasUndoHistory && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1f2937", border: "1px solid #ef4444", borderRadius: "12px", padding: "14px 16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: isReversed ? "#ef4444" : "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Undo2 size={18} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "white" }}>Reverse Previous Copilot Action</div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                {isReversed ? "🔄 Toggle is ON: Changes are currently reversed (undone)" : "Toggle to undo the last set of Copilot updates instantly"}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleToggleReverse}
            disabled={isReversing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: isReversed ? "#ef4444" : "#374151",
              color: "white",
              border: "none",
              borderRadius: "20px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s ease",
              opacity: isReversing ? 0.7 : 1
            }}
          >
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              transform: isReversed ? "translateX(4px)" : "translateX(-4px)",
              transition: "transform 0.2s"
            }} />
            {isReversed ? "Undo ON (Reversed)" : "Undo OFF (Applied)"}
          </button>
        </div>
      )}

      {/* DETAILED SUGGESTIONS LIST / PROMPT CONSOLE */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "20px" }}>
        
        {/* TEMPLATE QUICK CHOICES */}
        <div style={{ background: "#1f2937", padding: "16px", borderRadius: "12px", border: "1px solid #374151" }}>
          <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#9ca3af", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            💡 Quick Prompt Ideas
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            {suggestionTemplates.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(t.text)}
                style={{
                  textAlign: "left",
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#f3f4f6",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#ef4444";
                  e.currentTarget.style.background = "#181e2e";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#374151";
                  e.currentTarget.style.background = "#111827";
                }}
              >
                <div style={{ fontWeight: "bold", color: "#ef4444", marginBottom: "4px" }}>{t.title}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {t.text}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PROMPT CONTAINER */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type what you want to change, e.g.: Add a Staples item named 'Bogoso Rice' priced at 25 GHS..."
            style={{
              width: "100%",
              height: "100px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "13px",
              color: "white",
              outline: "none",
              resize: "none"
            }}
          />

          {/* IMAGE UPLOAD TOGGLE & CONTROL */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#111827", padding: "14px", borderRadius: "12px", border: "1px solid #374151" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", color: "#f3f4f6" }}>
                <input
                  type="checkbox"
                  checked={showUploadToggle}
                  onChange={(e) => setShowUploadToggle(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                Upload custom product image to be used
              </label>
              {showUploadToggle && uploadedImage && (
                <button
                  onClick={() => setUploadedImage(null)}
                  style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <X size={12} /> Clear Image
                </button>
              )}
            </div>

            {showUploadToggle && (
              <div style={{ marginTop: "6px" }}>
                {!uploadedImage ? (
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                    style={{
                      border: "2px dashed #4b5563",
                      borderRadius: "8px",
                      padding: "16px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#1f2937",
                      transition: "border-color 0.15s ease",
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                      };
                      input.click();
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      📥 <strong style={{ color: "#ef4444" }}>Click to select</strong> or drag & drop an image
                    </div>
                    <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>
                      PNG, JPG, or GIF (max 4MB)
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#1f2937", padding: "10px", borderRadius: "8px", border: "1px solid #4b5563" }}>
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded Preview" 
                      style={{ width: "48px", height: "48px", borderRadius: "6px", objectFit: "cover" }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "#f3f4f6" }}>Custom Image Selected</div>
                      <div style={{ fontSize: "10px", color: "#9ca3af" }}>Ready to be sent with your next prompt action</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleGenerateProposal}
              disabled={isLoading || !prompt.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: prompt.trim() ? "pointer" : "not-allowed",
                opacity: prompt.trim() ? 1 : 0.6,
                transition: "all 0.15s ease"
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Gemini thinking...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Analyze & Suggest Changes
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ERROR MSG CONTAINER */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "12.5px" }}>
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* AI SUGGESTION PREVIEW & APPLY ACTIONS */}
      {aiProposal && (
        <div style={{ marginTop: "24px", padding: "20px", background: "#1f2937", borderRadius: "12px", border: "1px solid #ef4444" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #374151", paddingBottom: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} style={{ color: "#ef4444" }} />
              <h3 style={{ fontSize: "14px", fontWeight: "900", color: "white", margin: 0 }}>Gemini Change Proposal</h3>
            </div>
            <button 
              onClick={() => setAiProposal(null)}
              style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* AI EXPLANATION */}
          <div style={{ background: "#111827", padding: "14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#d1d5db" }}>
            <div style={{ fontWeight: "bold", color: "#ef4444", marginBottom: "6px" }}>Proposed Change Summary:</div>
            <p style={{ margin: 0, lineHeight: "1.5" }}>{aiProposal.explanation}</p>
          </div>

          {/* ACTIONS CHECKLIST */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#9ca3af", marginBottom: "10px", textTransform: "uppercase" }}>
              📋 Database Operations to Apply ({aiProposal.actions?.length || 0}):
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {aiProposal.actions?.map((act: any, index: number) => (
                <div 
                  key={index} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px", 
                    background: "#111827", 
                    padding: "10px 14px", 
                    borderRadius: "8px", 
                    border: "1px solid #374151" 
                  }}
                >
                  <div style={{ 
                    padding: "6px", 
                    borderRadius: "6px", 
                    background: act.type === "UPDATE_PRODUCT" ? "#3b82f6" : act.type === "ADD_PRODUCT" ? "#10b981" : act.type === "ADD_COUPON" ? "#8b5cf6" : "#ec4899" 
                  }}>
                    {act.type === "UPDATE_PRODUCT" ? <ShoppingBag size={14} style={{ color: "white" }} /> : 
                     act.type === "ADD_PRODUCT" ? <ShoppingBag size={14} style={{ color: "white" }} /> :
                     act.type === "ADD_COUPON" ? <Tag size={14} style={{ color: "white" }} /> : 
                     <Bell size={14} style={{ color: "white" }} />}
                  </div>
                  <div style={{ flex: 1, fontSize: "12.5px" }}>
                    {act.type === "UPDATE_PRODUCT" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>
                          Update product <strong style={{ color: "#ef4444" }}>{act.productId}</strong>:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "11.5px", color: "#9ca3af", marginTop: "2px", alignItems: "center" }}>
                          {act.updates?.price !== undefined && (
                            <span>💰 Price: <strong style={{ color: "white" }}>{act.updates.price} GHS</strong></span>
                          )}
                          {act.updates?.name && (
                            <span>🏷️ Name: <strong style={{ color: "white" }}>{act.updates.name}</strong></span>
                          )}
                          {act.updates?.activeSelling !== undefined && (
                            <span>👁️ Visibility: <strong style={{ color: "white" }}>{act.updates.activeSelling ? "Active" : "Hidden"}</strong></span>
                          )}
                          {act.updates?.img && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              🖼️ Image: 
                              {act.updates.img.startsWith("data:") ? (
                                <img src={act.updates.img} alt="Preview" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "cover", border: "1px solid #ef4444" }} />
                              ) : (
                                <a href={act.updates.img} target="_blank" rel="noreferrer" style={{ color: "#ef4444", textDecoration: "underline" }}>View Link</a>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {act.type === "ADD_PRODUCT" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>
                          Add new product <strong style={{ color: "#ef4444" }}>{act.product?.name}</strong> to <strong style={{ color: "#ef4444" }}>{act.section}</strong>: <strong style={{ color: "#ef4444" }}>{act.product?.price} GHS</strong> (Category: {act.product?.category || act.product?.cat})
                        </div>
                        {act.product?.img && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#9ca3af", marginTop: "2px" }}>
                            <span>🖼️ Image:</span>
                            {act.product.img.startsWith("data:") ? (
                              <img src={act.product.img} alt="Preview" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "cover", border: "1px solid #ef4444" }} />
                            ) : (
                              <a href={act.product.img} target="_blank" rel="noreferrer" style={{ color: "#ef4444", textDecoration: "underline" }}>View Link</a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {act.type === "ADD_COUPON" && (
                      <div>
                        Create coupon code <strong style={{ color: "#ef4444" }}>{act.coupon?.code}</strong>: <strong style={{ color: "#ef4444" }}>{act.coupon?.discount}% off</strong> (Expires: {act.coupon?.expires})
                      </div>
                    )}
                    {act.type === "ADD_MEMO" && (
                      <div>
                        Post management memo announcement: <strong style={{ color: "#ef4444" }}>{act.memo?.title}</strong> ({act.memo?.priority} priority)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CONFIRMATION BUTTONS */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              onClick={() => setAiProposal(null)}
              style={{
                background: "transparent",
                color: "#9ca3af",
                border: "1px solid #374151",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "12.5px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Discard Proposal
            </button>
            <button
              onClick={handleApplyActions}
              disabled={isApplying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "12.5px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(239, 68, 68, 0.4)"
              }}
            >
              {isApplying ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Applying updates...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Approve & Execute All Changes
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
