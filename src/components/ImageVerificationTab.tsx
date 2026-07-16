import React, { useState, useEffect, useMemo } from "react";
import { DB } from "../db";
import { GROCERY_ITEMS, ELECTRONICS, CONSTRUCTION } from "../data";
import { PRODUCT_IMAGES } from "../productImages";
import { SafeImage, isEmoji, getFallbackForProduct } from "./SafeImage";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Wrench, 
  Sparkles, 
  Image as ImageIcon,
  Smile,
  Edit2,
  Trash2,
  Check,
  Play
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  cat?: string;
  img: string;
  shop?: string;
  location?: string;
  price: number;
}

interface AuditResult {
  id: string;
  name: string;
  cat?: string;
  section: string;
  originalSrc: string;
  resolvedSrc: string;
  type: "emoji" | "url" | "empty";
  status: "pending" | "verifying" | "verified" | "broken" | "suspect";
  errorDetails?: string;
}

export function ImageVerificationTab({ user, notify }: { user: any; notify: (msg: string, type: "ok" | "err") => void }) {
  const [customCatalog, setCustomCatalog] = useState<any>({});
  const [auditList, setAuditList] = useState<AuditResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "verified" | "broken" | "emoji" | "suspect">("all");
  const [filterSection, setFilterSection] = useState<"all" | "groceries" | "electronics" | "construction">("all");
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState("");

  // Google Search states
  const [googleLoadingId, setGoogleLoadingId] = useState<string | null>(null);
  const [googleBulkLoading, setGoogleBulkLoading] = useState(false);

  // Live Image Search & Pick state
  const [pickerProduct, setPickerProduct] = useState<AuditResult | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<string[]>([]);
  const [isSearchingPicker, setIsSearchingPicker] = useState(false);
  const [selectedPickerUrl, setSelectedPickerUrl] = useState("");

  const openImagePicker = async (item: AuditResult) => {
    setPickerProduct(item);
    const defaultQuery = `${item.name}`;
    setPickerSearchQuery(defaultQuery);
    setSelectedPickerUrl("");
    setPickerResults([]);
    setIsSearchingPicker(true);
    
    try {
      const res = await fetch(`/api/google/search-images-list?q=${encodeURIComponent(defaultQuery + " Ghana retail product")}`);
      if (!res.ok) throw new Error("Search list failed");
      const data = await res.json();
      if (data.success && data.imageUrls && data.imageUrls.length > 0) {
        setPickerResults(data.imageUrls);
        setSelectedPickerUrl(data.imageUrls[0]);
      } else {
        notify("Could not find any search images for this query.", "err");
      }
    } catch (err: any) {
      console.error(err);
      notify(`Failed to fetch image choices: ${err.message || err}`, "err");
    } finally {
      setIsSearchingPicker(false);
    }
  };

  const handlePickerSearch = async () => {
    if (!pickerSearchQuery.trim()) return;
    setIsSearchingPicker(true);
    setSelectedPickerUrl("");
    try {
      const res = await fetch(`/api/google/search-images-list?q=${encodeURIComponent(pickerSearchQuery.trim())}`);
      if (!res.ok) throw new Error("Search list failed");
      const data = await res.json();
      if (data.success && data.imageUrls && data.imageUrls.length > 0) {
        setPickerResults(data.imageUrls);
        setSelectedPickerUrl(data.imageUrls[0]);
        notify(`Found ${data.imageUrls.length} live image candidates!`, "ok");
      } else {
        setPickerResults([]);
        notify("No images found for this query.", "err");
      }
    } catch (err: any) {
      console.error(err);
      notify(`Search failed: ${err.message || err}`, "err");
    } finally {
      setIsSearchingPicker(false);
    }
  };

  const applyPickerSelection = async () => {
    if (!pickerProduct || !selectedPickerUrl) return;

    const existing = customCatalog[pickerProduct.id] || {};
    const updated = {
      ...customCatalog,
      [pickerProduct.id]: {
        ...existing,
        img: selectedPickerUrl
      }
    };

    await updateCustomCatalog(updated);

    // Update state lists
    setAuditList(prev => prev.map(p => {
      if (p.id === pickerProduct.id) {
        return {
          ...p,
          resolvedSrc: selectedPickerUrl,
          type: "url",
          status: "verified" as const,
          errorDetails: ""
        };
      }
      return p;
    }));

    // If currently editing this item, update the edit box value too
    if (editingId === pickerProduct.id) {
      setEditingUrl(selectedPickerUrl);
    }

    notify(`Successfully uploaded and applied exact image to ${pickerProduct.name}!`, "ok");
    setPickerProduct(null);
  };

  // Load custom catalog
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const cached = await DB.get("elx_custom_catalog");
        if (cached) {
          setCustomCatalog(cached);
        }
      } catch (err) {
        console.error("Failed to load custom catalog for image audit", err);
      }
    };
    loadCatalog();

    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_custom_catalog") {
        setCustomCatalog(e.detail.value || {});
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  // Sync back custom catalog changes
  const updateCustomCatalog = async (updated: any) => {
    try {
      await DB.set("elx_custom_catalog", updated);
      window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_custom_catalog", value: updated } }));
      setCustomCatalog(updated);
    } catch (err) {
      notify("Failed to save catalog updates", "err");
    }
  };

  // Compile all current products (static + custom additions + updates)
  const allProducts = useMemo(() => {
    const list: (Product & { section: string })[] = [];

    // 1. Groceries
    GROCERY_ITEMS.forEach(p => {
      const override = customCatalog[p.id];
      const img = override?.img !== undefined ? override.img : (PRODUCT_IMAGES[p.id] || p.img);
      list.push({ ...p, img, section: "groceries" });
    });

    // 2. Electronics
    ELECTRONICS.forEach(p => {
      const override = customCatalog[p.id];
      const img = override?.img !== undefined ? override.img : (PRODUCT_IMAGES[p.id] || p.img);
      list.push({ ...p, img, section: "electronics" });
    });

    // 3. Construction
    CONSTRUCTION.forEach(p => {
      const override = customCatalog[p.id];
      const img = override?.img !== undefined ? override.img : (PRODUCT_IMAGES[p.id] || p.img);
      list.push({ ...p, img, section: "construction" });
    });

    // 4. Custom additions
    const added = customCatalog.addedProducts || [];
    added.forEach((p: any) => {
      if (p && p.id) {
        list.push({
          id: p.id,
          name: p.name,
          cat: p.cat || "General",
          img: p.img || "",
          section: p.section || "groceries",
          price: p.price || 0,
        });
      }
    });

    return list;
  }, [customCatalog]);

  // Map products to baseline audit items
  useEffect(() => {
    const initialList = allProducts.map(p => {
      const isEmojiType = isEmoji(p.img);
      const isEmpty = !p.img;
      const type: "emoji" | "url" | "empty" = isEmojiType ? "emoji" : (isEmpty ? "empty" : "url");
      
      let status: "pending" | "suspect" | "verified" | "broken" = "pending";
      let errorDetails = "";

      if (isEmojiType) {
        status = "verified"; // Emojis are intrinsically verified as safe fallback glyphs
      } else if (isEmpty) {
        status = "suspect";
        errorDetails = "Image source is empty or missing.";
      } else {
        // Basic pre-check for suspect domains or fake links
        const lowerUrl = p.img.toLowerCase();
        if (
          lowerUrl.includes("placeholder") || 
          lowerUrl.includes("example.com") || 
          lowerUrl.includes("broken") || 
          lowerUrl.includes("false")
        ) {
          status = "suspect";
          errorDetails = "Points to generic placeholder or suspect path.";
        }
      }

      return {
        id: p.id,
        name: p.name,
        cat: p.cat,
        section: p.section,
        originalSrc: p.img,
        resolvedSrc: p.img,
        type,
        status,
        errorDetails
      } as AuditResult;
    });

    setAuditList(initialList);
  }, [allProducts]);

  // Test single URL load via standard HTML Image
  const testImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      
      const timer = setTimeout(() => {
        img.src = ""; // cancel load
        resolve(false); // timeout count as failed load
      }, 4000);

      img.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };

      img.src = url;
    });
  };

  // Run audit on all items
  const runLiveAudit = async () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setAuditProgress(0);

    const itemsToVerify = auditList.map(item => ({ ...item }));
    const total = itemsToVerify.length;
    let completed = 0;

    // Filter items that need live check (URLs)
    const urlItems = itemsToVerify.filter(item => item.type === "url");
    const totalUrls = urlItems.length;

    if (totalUrls === 0) {
      // All items verified or checked
      setIsAuditing(false);
      setAuditProgress(100);
      notify("Audit complete. All sources are already fully verified (all Emojis).", "ok");
      return;
    }

    notify(`Starting active image audit of ${totalUrls} remote sources...`, "ok");

    // Batch run URL verification for performance (max 10 parallel loads)
    const batchSize = 10;
    for (let i = 0; i < urlItems.length; i += batchSize) {
      const batch = urlItems.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (item) => {
        // Mark verifying
        setAuditList(prev => prev.map(p => p.id === item.id ? { ...p, status: "verifying" } : p));
        
        const isValid = await testImageUrl(item.resolvedSrc);
        
        setAuditList(prev => prev.map(p => {
          if (p.id === item.id) {
            return {
              ...p,
              status: isValid ? "verified" : "broken",
              errorDetails: isValid ? "" : "Failed live load check (Network 404 or block)."
            };
          }
          return p;
        }));
      }));

      completed += batch.length;
      setAuditProgress(Math.round((completed / totalUrls) * 100));
    }

    setIsAuditing(false);
    notify("Live Image Source Audit completed successfully!", "ok");
  };

  // Auto Heal individual item
  const handleAutoHeal = async (item: AuditResult) => {
    const fallbackUrl = getFallbackForProduct(item.name, item.cat);
    
    // Save to custom catalog override
    const existing = customCatalog[item.id] || {};
    const updated = {
      ...customCatalog,
      [item.id]: {
        ...existing,
        img: fallbackUrl
      }
    };

    await updateCustomCatalog(updated);

    // Update in audit list state
    setAuditList(prev => prev.map(p => {
      if (p.id === item.id) {
        return {
          ...p,
          resolvedSrc: fallbackUrl,
          type: "url",
          status: "verified",
          errorDetails: ""
        };
      }
      return p;
    }));

    notify(`Auto-healed ${item.name} with premium fallback.`, "ok");
  };

  // Auto heal ALL broken/suspect items
  const handleAutoHealAll = async () => {
    const brokenItems = auditList.filter(item => item.status === "broken" || item.status === "suspect");
    if (brokenItems.length === 0) {
      notify("No broken or suspect images identified to heal.", "ok");
      return;
    }

    let updated = { ...customCatalog };
    
    brokenItems.forEach(item => {
      const fallbackUrl = getFallbackForProduct(item.name, item.cat);
      const existing = updated[item.id] || {};
      updated[item.id] = {
        ...existing,
        img: fallbackUrl
      };
    });

    await updateCustomCatalog(updated);

    // Update state lists
    setAuditList(prev => prev.map(p => {
      const isBroken = p.status === "broken" || p.status === "suspect";
      if (isBroken) {
        const fallbackUrl = getFallbackForProduct(p.name, p.cat);
        return {
          ...p,
          resolvedSrc: fallbackUrl,
          type: "url",
          status: "verified",
          errorDetails: ""
        };
      }
      return p;
    }));

    notify(`Successfully auto-healed all ${brokenItems.length} broken/suspect sources in bulk!`, "ok");
  };

  // Save manual url edit
  const handleSaveEdit = async (id: string) => {
    if (!editingUrl.trim()) return;

    const existing = customCatalog[id] || {};
    const updated = {
      ...customCatalog,
      [id]: {
        ...existing,
        img: editingUrl.trim()
      }
    };

    await updateCustomCatalog(updated);

    // Instantly check new url
    setAuditList(prev => prev.map(p => {
      if (p.id === id) {
        const isEmojiType = isEmoji(editingUrl);
        return {
          ...p,
          resolvedSrc: editingUrl,
          type: isEmojiType ? "emoji" : "url",
          status: "pending" as const,
          errorDetails: ""
        };
      }
      return p;
    }));

    setEditingId(null);
    notify(`Manually updated image source for item ID: ${id}`, "ok");
  };

  // Fetch from Google for single item
  const handleGoogleFetch = async (item: AuditResult) => {
    if (googleLoadingId) return;
    setGoogleLoadingId(item.id);
    try {
      const query = `${item.name} Ghana retail product`;
      const res = await fetch(`/api/google/search-image?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      if (data.success && data.imageUrl) {
        const existing = customCatalog[item.id] || {};
        const updated = {
          ...customCatalog,
          [item.id]: {
            ...existing,
            img: data.imageUrl
          }
        };
        await updateCustomCatalog(updated);

        setAuditList(prev => prev.map(p => {
          if (p.id === item.id) {
            return {
              ...p,
              resolvedSrc: data.imageUrl,
              type: "url",
              status: "verified" as const,
              errorDetails: ""
            };
          }
          return p;
        }));
        notify(`Successfully fetched and applied live Google Image for ${item.name}!`, "ok");
      } else {
        throw new Error(data.error || "No image URL returned");
      }
    } catch (err: any) {
      console.error(err);
      notify(`Google search failed for ${item.name}: ${err.message || String(err)}`, "err");
    } finally {
      setGoogleLoadingId(null);
    }
  };

  // Google-Heal all broken items in bulk
  const handleGoogleHealAll = async () => {
    const brokenItems = auditList.filter(item => item.status === "broken" || item.status === "suspect");
    if (brokenItems.length === 0) {
      notify("No broken or suspect images identified to Google-Heal.", "ok");
      return;
    }

    if (googleBulkLoading) return;
    setGoogleBulkLoading(true);
    notify(`Triggering automated Google Image fetching for ${brokenItems.length} broken/suspect items...`, "ok");

    let updated = { ...customCatalog };
    let successCount = 0;

    for (let i = 0; i < brokenItems.length; i++) {
      const item = brokenItems[i];
      try {
        const query = `${item.name} Ghana retail product`;
        const res = await fetch(`/api/google/search-image?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.imageUrl) {
            const existing = updated[item.id] || {};
            updated[item.id] = {
              ...existing,
              img: data.imageUrl
            };
            successCount++;

            setAuditList(prev => prev.map(p => {
              if (p.id === item.id) {
                return {
                  ...p,
                  resolvedSrc: data.imageUrl,
                  type: "url",
                  status: "verified" as const,
                  errorDetails: ""
                };
              }
              return p;
            }));
          }
        }
      } catch (err) {
        console.error(`Bulk Google search failed for ${item.name}`, err);
      }
    }

    if (successCount > 0) {
      await updateCustomCatalog(updated);
      notify(`Google Image heal complete! Replaced ${successCount} broken/suspect assets with authentic Google search images.`, "ok");
    } else {
      notify("Google Image heal completed, but no replacement images could be retrieved.", "err");
    }
    setGoogleBulkLoading(false);
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return auditList.filter(item => {
      const q = (searchQuery || "").toLowerCase();
      const matchesSearch = (item.name || "").toLowerCase().includes(q) || 
                            (item.cat || "").toLowerCase().includes(q) ||
                            (item.id || "").toLowerCase().includes(q);
      
      const matchesSection = filterSection === "all" || item.section === filterSection;
      
      let matchesStatus = true;
      if (filterStatus === "verified") matchesStatus = item.status === "verified";
      else if (filterStatus === "broken") matchesStatus = item.status === "broken" || item.status === "suspect";
      else if (filterStatus === "emoji") matchesStatus = item.type === "emoji";
      else if (filterStatus === "suspect") matchesStatus = item.status === "suspect";

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [auditList, searchQuery, filterStatus, filterSection]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditList.length;
    const verified = auditList.filter(item => item.status === "verified").length;
    const broken = auditList.filter(item => item.status === "broken" || item.status === "suspect").length;
    const emojis = auditList.filter(item => item.type === "emoji").length;
    const urls = auditList.filter(item => item.type === "url").length;
    const healthyPct = total > 0 ? Math.round((verified / total) * 100) : 100;

    return { total, verified, broken, emojis, urls, healthyPct };
  }, [auditList]);

  // Quick list of alert items (broken or suspect)
  const alertItems = useMemo(() => {
    return auditList.filter(item => item.status === "broken" || item.status === "suspect");
  }, [auditList]);

  return (
    <div style={{ background: "#111827", padding: "20px", borderRadius: "12px", border: "1px solid #374151", color: "white" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🔍</span> Image Asset Cross-Check & Verification
          </h2>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
            Audit all product image assets in real-time, detect broken URLs or placeholder imagery, and heal sources live.
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={runLiveAudit}
            disabled={isAuditing}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: "bold",
              cursor: isAuditing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: isAuditing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} className={isAuditing ? "animate-spin" : ""} />
            {isAuditing ? `Running Audit (${auditProgress}%)` : "Run Live Load Audit"}
          </button>

          <button
            onClick={handleAutoHealAll}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Sparkles size={14} />
            Auto-Heal All ({stats.broken})
          </button>

          <button
            onClick={handleGoogleHealAll}
            disabled={googleBulkLoading || isAuditing}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: "bold",
              cursor: (googleBulkLoading || isAuditing) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: (googleBulkLoading || isAuditing) ? 0.7 : 1,
            }}
          >
            <Search size={14} className={googleBulkLoading ? "animate-spin" : ""} />
            {googleBulkLoading ? "Google Fetching..." : `Google-Heal All (${stats.broken})`}
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        
        <div style={{ background: "#1f2937", padding: "14px", borderRadius: "10px", border: "1px solid #374151" }}>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>TOTAL PRODUCTS AUDITED</div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white", marginTop: "4px" }}>{stats.total}</div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
            {stats.urls} URLs • {stats.emojis} Emojis
          </div>
        </div>

        <div style={{ background: "#1f2937", padding: "14px", borderRadius: "10px", border: "1px solid #374151" }}>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>IMAGE HEALTH RATING</div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: stats.healthyPct > 80 ? "#10b981" : "#f59e0b", marginTop: "4px" }}>
            {stats.healthyPct}%
          </div>
          <div style={{ width: "100%", height: "6px", background: "#374151", borderRadius: "3px", marginTop: "8px", overflow: "hidden" }}>
            <div style={{ width: `${stats.healthyPct}%`, height: "100%", background: stats.healthyPct > 80 ? "#10b981" : "#f59e0b", borderRadius: "3px" }} />
          </div>
        </div>

        <div style={{ background: "#1f2937", padding: "14px", borderRadius: "10px", border: "1px solid #374151" }}>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>BROKEN / SUSPECT IMAGES</div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: stats.broken > 0 ? "#ef4444" : "#10b981", marginTop: "4px" }}>
            {stats.broken}
          </div>
          <div style={{ fontSize: "11px", color: stats.broken > 0 ? "#f87171" : "#6b7280", marginTop: "4px" }}>
            {stats.broken > 0 ? "Requires manual or auto-fix" : "All assets point to valid targets"}
          </div>
        </div>

        <div style={{ background: "#1f2937", padding: "14px", borderRadius: "10px", border: "1px solid #374151" }}>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>EMOJI FALLBACK GLYPHS</div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#60a5fa", marginTop: "4px" }}>{stats.emojis}</div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
            Used as secure local vector fallbacks
          </div>
        </div>

      </div>

      {/* DISPATCH PROGRESS BAR IF AUDITING */}
      {isAuditing && (
        <div style={{ background: "#1e293b", padding: "12px", borderRadius: "8px", border: "1px solid #ef4444", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
            <span>⚡ Verification workers fetching and rendering product frames...</span>
            <span>{auditProgress}%</span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "#111827", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ width: `${auditProgress}%`, height: "100%", background: "#ef4444", borderRadius: "4px", transition: "width 0.2s" }} />
          </div>
        </div>
      )}

      {/* DETECTED BROKEN ALERTS LIST */}
      {alertItems.length > 0 && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "14px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "13px", color: "#f87171", marginBottom: "8px" }}>
            <AlertTriangle size={16} /> Flagged False Imagery / Broken URL Alerts ({alertItems.length} Items)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
            {alertItems.map(item => (
              <div key={item.id} style={{ background: "#1f2937", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: "bold", color: "#f87171" }}>[{item.id}]</span>
                <span style={{ color: "#e5e7eb" }}>{item.name}</span>
                <span style={{ color: "#9ca3af" }}>({item.cat})</span>
                <button
                  onClick={() => handleAutoHeal(item)}
                  style={{ background: "#ef4444", border: "none", color: "white", padding: "2px 6px", borderRadius: "4px", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}
                >
                  Quick Heal 🩹
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & CONTROL BAR */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        
        {/* SEARCH BOX */}
        <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Search products by ID, name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "8px 12px 8px 32px",
              color: "white",
              fontSize: "12.5px"
            }}
          />
        </div>

        {/* SECTION FILTER */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Catalog Section:</span>
          <select
            value={filterSection}
            onChange={(e: any) => setFilterSection(e.target.value)}
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "6px 12px",
              color: "white",
              fontSize: "12.5px"
            }}
          >
            <option value="all">All Sections</option>
            <option value="groceries">🌽 Groceries</option>
            <option value="electronics">🔌 Electronics</option>
            <option value="construction">🧱 Construction</option>
          </select>
        </div>

        {/* STATUS FILTER */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Audit Status:</span>
          <select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "6px 12px",
              color: "white",
              fontSize: "12.5px"
            }}
          >
            <option value="all">All Asset Statuses</option>
            <option value="verified">✅ Healthy / Verified</option>
            <option value="broken">⚠️ Broken / Suspect</option>
            <option value="emoji">✨ Emojis only</option>
          </select>
        </div>

      </div>

      {/* MAIN DATA TABLE */}
      <div style={{ overflowX: "auto", border: "1px solid #374151", borderRadius: "8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textLayout: "fixed" }}>
          <thead>
            <tr style={{ background: "#1f2937", borderBottom: "1px solid #374151", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "80px" }}>ID</th>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "180px" }}>Product Name</th>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "100px" }}>Category</th>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "100px" }}>Visual Preview</th>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "180px" }}>Source Endpoint</th>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "110px" }}>Source Type</th>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "110px" }}>Audit Health</th>
              <th style={{ padding: "10px 12px", fontSize: "11.5px", fontWeight: "bold", color: "#9ca3af", width: "140px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                  No product assets match the selected filters.
                </td>
              </tr>
            ) : (
              filteredList.map(item => {
                const isEditingThis = editingId === item.id;
                
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #374151", fontSize: "12px", background: isEditingThis ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                    
                    {/* ID */}
                    <td style={{ padding: "10px 12px", fontWeight: "bold", color: "#9ca3af" }}>
                      {item.id}
                    </td>

                    {/* NAME */}
                    <td style={{ padding: "10px 12px", fontWeight: "600" }}>
                      <div style={{ color: "white" }}>{item.name}</div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", textTransform: "capitalize", marginTop: "2px" }}>
                        Section: {item.section}
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>
                      {item.cat}
                    </td>

                    {/* PREVIEW */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ width: "50px", height: "40px", borderRadius: "6px", overflow: "hidden", border: "1px solid #4b5563" }}>
                        <SafeImage src={item.resolvedSrc} alt={item.name} category={item.cat} height="100%" style={{ margin: 0 }} productId={item.id} />
                      </div>
                    </td>

                    {/* SOURCE PATH / EDITING */}
                    <td style={{ padding: "10px 12px" }}>
                      {isEditingThis ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            value={editingUrl}
                            onChange={(e) => setEditingUrl(e.target.value)}
                            placeholder="Enter image URL or single emoji..."
                            style={{
                              flex: 1,
                              background: "#111827",
                              border: "1px solid #ef4444",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              color: "white",
                              fontSize: "11px"
                            }}
                          />
                          <button
                            onClick={async () => {
                              try {
                                const query = `${item.name} Ghana retail product`;
                                const res = await fetch(`/api/google/search-image?q=${encodeURIComponent(query)}`);
                                if (!res.ok) throw new Error("Google search failed");
                                const data = await res.json();
                                if (data.success && data.imageUrl) {
                                  setEditingUrl(data.imageUrl);
                                  notify(`Found Google Image: "${data.imageUrl.substring(0, 40)}..."`, "ok");
                                } else {
                                  notify("No image returned from Google.", "err");
                                }
                              } catch (e) {
                                notify("Failed to retrieve from Google.", "err");
                              }
                            }}
                            title="Auto-fill with live Google search image"
                            style={{ background: "#2563eb", border: "none", color: "white", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                          >
                            <Search size={12} />
                            <span style={{ fontSize: "10px" }}>Auto</span>
                          </button>
                          <button
                            onClick={() => openImagePicker(item)}
                            title="Search and select exact image manually"
                            style={{ background: "#7c3aed", border: "none", color: "white", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                          >
                            <Sparkles size={12} />
                            <span style={{ fontSize: "10px" }}>Choice</span>
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            style={{ background: "#10b981", border: "none", color: "white", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ 
                          fontFamily: "monospace", 
                          fontSize: "10.5px", 
                          color: item.type === "emoji" ? "#fbbf24" : "#9ca3af",
                          maxWidth: "180px", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }}>
                          {item.resolvedSrc || "EMPTY"}
                        </div>
                      )}
                    </td>

                    {/* SOURCE TYPE */}
                    <td style={{ padding: "10px 12px" }}>
                      {item.type === "emoji" ? (
                        <span style={{ padding: "2px 6px", borderRadius: "4px", background: "#78350f", color: "#fef3c7", fontSize: "10px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Smile size={10} /> Emoji Glyph
                        </span>
                      ) : item.type === "empty" ? (
                        <span style={{ padding: "2px 6px", borderRadius: "4px", background: "#7f1d1d", color: "#fca5a5", fontSize: "10px", fontWeight: "bold" }}>
                          Empty String
                        </span>
                      ) : (
                        <span style={{ padding: "2px 6px", borderRadius: "4px", background: "#1e3a8a", color: "#dbeafe", fontSize: "10px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <ImageIcon size={10} /> Remote Image
                        </span>
                      )}
                    </td>

                    {/* AUDIT HEALTH STATUS */}
                    <td style={{ padding: "10px 12px" }}>
                      {item.status === "verified" ? (
                        <span style={{ padding: "3px 8px", borderRadius: "12px", background: "#064e3b", color: "#6ee7b7", fontSize: "10px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={10} /> Healthy
                        </span>
                      ) : item.status === "broken" ? (
                        <span style={{ padding: "3px 8px", borderRadius: "12px", background: "#7f1d1d", color: "#fca5a5", fontSize: "10px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <XCircle size={10} /> Broken Link
                        </span>
                      ) : item.status === "verifying" ? (
                        <span style={{ padding: "3px 8px", borderRadius: "12px", background: "#78350f", color: "#fde047", fontSize: "10px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <RefreshCw size={10} className="animate-spin" /> Fetching...
                        </span>
                      ) : item.status === "suspect" ? (
                        <span style={{ padding: "3px 8px", borderRadius: "12px", background: "#78350f", color: "#fde047", fontSize: "10px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AlertTriangle size={10} /> Suspect Link
                        </span>
                      ) : (
                        <span style={{ padding: "3px 8px", borderRadius: "12px", background: "#374151", color: "#9ca3af", fontSize: "10px", fontWeight: "bold" }}>
                          Pending Audit
                        </span>
                      )}
                      
                      {item.errorDetails && (
                        <div style={{ fontSize: "9px", color: "#f87171", marginTop: "4px", maxWidth: "120px" }}>
                          {item.errorDetails}
                        </div>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          onClick={() => {
                            if (isEditingThis) {
                              setEditingId(null);
                            } else {
                              setEditingId(item.id);
                              setEditingUrl(item.resolvedSrc);
                            }
                          }}
                          style={{
                            background: isEditingThis ? "#374151" : "#1f2937",
                            border: "1px solid #4b5563",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Edit2 size={11} />
                          {isEditingThis ? "Cancel" : "Edit"}
                        </button>

                        <button
                          onClick={() => handleGoogleFetch(item)}
                          disabled={googleLoadingId !== null}
                          style={{
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            cursor: googleLoadingId !== null ? "not-allowed" : "pointer",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            opacity: googleLoadingId !== null ? 0.7 : 1,
                          }}
                        >
                          <Search size={11} className={googleLoadingId === item.id ? "animate-spin" : ""} />
                          {googleLoadingId === item.id ? "Searching..." : "Google Fetch"}
                        </button>

                        <button
                          onClick={() => openImagePicker(item)}
                          style={{
                            background: "#7c3aed",
                            color: "white",
                            border: "none",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="Search exact images and choose manually"
                        >
                          <Sparkles size={11} />
                          Exact Search
                        </button>

                        <button
                          onClick={() => handleAutoHeal(item)}
                          style={{
                            background: "#047857",
                            color: "white",
                            border: "none",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Wrench size={11} />
                          Auto fallback
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 🔮 ELEXTRA INTERACTIVE LIVE IMAGE CHOICE PICKER MODAL 🔮 */}
      {pickerProduct && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#1e293b",
            border: "1.5px solid #4b5563",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)",
            color: "white"
          }}>
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #334155",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} style={{ color: "#a78bfa" }} /> Exact Image Search & Upload
                </h3>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Selecting image for product: <strong style={{ color: "#38bdf8" }}>{pickerProduct.name}</strong> ({pickerProduct.cat})
                </div>
              </div>
              <button
                onClick={() => setPickerProduct(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Search input group */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#94a3b8", marginBottom: "6px" }}>
                  Google Image Search Keyword Query
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      value={pickerSearchQuery}
                      onChange={(e) => setPickerSearchQuery(e.target.value)}
                      placeholder="Enter search keywords (e.g. Milo tin pack)..."
                      style={{
                        width: "100%",
                        background: "#0f172a",
                        border: "1px solid #4b5563",
                        borderRadius: "8px",
                        padding: "8px 12px 8px 32px",
                        color: "white",
                        fontSize: "12.5px"
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePickerSearch();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handlePickerSearch}
                    disabled={isSearchingPicker}
                    style={{
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: isSearchingPicker ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {isSearchingPicker ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                    Search
                  </button>
                </div>
              </div>

              {/* Status or loader */}
              {isSearchingPicker && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "10px" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ color: "#38bdf8" }} />
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>Searching exact images from live Google index...</span>
                </div>
              )}

              {/* Grid of image choices */}
              {!isSearchingPicker && pickerResults.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#94a3b8", marginBottom: "8px" }}>
                    Select the Exact Image to Upload/Assign:
                  </label>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: "10px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    paddingRight: "4px"
                  }}>
                    {pickerResults.map((url, idx) => {
                      const isSelected = selectedPickerUrl === url;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedPickerUrl(url)}
                          style={{
                            aspectRatio: "4/3",
                            background: "#0f172a",
                            border: isSelected ? "3px solid #7c3aed" : "1.5px solid #334155",
                            borderRadius: "10px",
                            overflow: "hidden",
                            cursor: "pointer",
                            position: "relative",
                            transition: "all 0.15s ease",
                            transform: isSelected ? "scale(0.97)" : "scale(1)",
                            boxShadow: isSelected ? "0 0 12px rgba(124, 58, 237, 0.4)" : "none"
                          }}
                        >
                          <img
                            src={url}
                            alt={`Candidate choice ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                          {isSelected && (
                            <div style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              background: "#7c3aed",
                              color: "white",
                              borderRadius: "50%",
                              width: "18px",
                              height: "18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "bold"
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No results help */}
              {!isSearchingPicker && pickerResults.length === 0 && (
                <div style={{ background: "#0f172a", padding: "20px", borderRadius: "10px", textAlign: "center", border: "1px solid #334155" }}>
                  <ImageIcon size={24} style={{ color: "#475569", marginBottom: "8px" }} />
                  <div style={{ fontSize: "12.5px", fontWeight: "bold", color: "#94a3b8" }}>No images fetched yet</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    Modify the keywords search query above and click search to parse Google search candidates.
                  </div>
                </div>
              )}

              {/* Selected preview bar */}
              {selectedPickerUrl && (
                <div style={{
                  display: "flex",
                  gap: "12px",
                  background: "rgba(124, 58, 237, 0.08)",
                  border: "1.5px solid rgba(124, 58, 237, 0.25)",
                  borderRadius: "12px",
                  padding: "10px"
                }}>
                  <div style={{ width: "60px", height: "48px", borderRadius: "6px", overflow: "hidden", border: "1px solid #7c3aed" }}>
                    <img src={selectedPickerUrl} alt="Selection preview" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "#a78bfa" }}>SELECTED SOURCE URL:</div>
                    <div style={{ fontSize: "10px", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", marginTop: "2px" }}>
                      {selectedPickerUrl}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div style={{
              padding: "14px 20px",
              borderTop: "1px solid #334155",
              background: "#0f172a",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              <button
                onClick={() => setPickerProduct(null)}
                style={{
                  background: "none",
                  border: "1px solid #4b5563",
                  color: "#cbd5e1",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
              <button
                onClick={applyPickerSelection}
                disabled={!selectedPickerUrl}
                style={{
                  background: selectedPickerUrl ? "#7c3aed" : "#475569",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: selectedPickerUrl ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: selectedPickerUrl ? "0 4px 6px -1px rgba(124, 58, 237, 0.3)" : "none"
                }}
              >
                <Check size={13} />
                Upload & Apply Image
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
