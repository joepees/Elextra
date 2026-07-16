/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { resizeImageToThumbnail } from "../lib/imageUtils";
import { MessageSquare, Send, X, Sparkles, Brain, Smartphone, AlertTriangle, Undo, UploadCloud, Image as ImageIcon, Trash2, CheckCircle } from "lucide-react";
import { S } from "../styles";
import { GROCERY_ITEMS, ELECTRONICS, CONSTRUCTION } from "../data";
import { DB } from "../db";

interface GeminiChatBoxProps {
  cityFilter: string;
  onAddToCart?: (item: any) => void;
  notify?: (msg: string, type?: "ok" | "err") => void;
  desktopMode?: boolean;
  setCityFilter?: (city: string) => void;
  setPage?: (page: string) => void;
  setSearch?: (query: string) => void;
}

export function GeminiChatBox({ 
  cityFilter, 
  onAddToCart, 
  notify, 
  desktopMode,
  setCityFilter,
  setPage,
  setSearch
}: GeminiChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Hello! I am your Elextra AI Shopping & Logistics assistant. 🇬🇭 How can I help you find meals, check electronics/construction supplies in Tarkwa & Bogoso, explain dispatch fees, or verify your MoMo payment? Ask me anything!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States for requested toggles
  const [undoLoading, setUndoLoading] = useState(false);
  const [uploadActive, setUploadActive] = useState(false);
  const [uploadedImgUrl, setUploadedImgUrl] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on message updates
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Prestigious test chips specifically matching user instructions
  const presetChips = [
    { label: "🛍️ Melcom Sugar Lookup", text: "Look up the price of Sugar g3 on Melcom Ghana and update our store catalog" },
    { label: "📺 Hisense Smart TV Lookup", text: "Find and automatically update the price and image of Smart TV e2 from Hisense Ghana or Jumia Ghana" },
    { label: "🍚 Ofada Jumia Image", text: "Update Ofada Rice g1 with a real product image from Jumia Ghana" },
    { label: "💳 Momo Pay Info", text: "Explain the active Mobile Money payment number and fee schedule" }
  ];

  // Undo/Reversal post-trigger
  const handleUndo = async () => {
    setUndoLoading(true);
    setLoading(true);
    try {
      const res = await fetch("/api/gemini/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", text: `🔄 **System Reversal Action:** ${data.message || "Previous catalog override undone successfully!"}` }
        ]);
        if (notify) notify(data.message || "Previous action successfully reversed!", "ok");
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", text: `⚠️ **System Reversal Alert:** ${data.error || "No actions found in memory stack to reverse."}` }
        ]);
        if (notify) notify(data.error || "No previous action to undo.", "err");
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "⚠️ **System Reversal Alert:** Failed to communicate with the reversal system." }
      ]);
    } finally {
      setUndoLoading(false);
      setLoading(false);
    }
  };

  // Convert uploaded image file to Base64
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (notify) notify("Converting image to compact thumbnail for fast upload...", "ok");
    try {
      const compressedBase64 = await resizeImageToThumbnail(file, 600, 0.8);
      setUploadedImgUrl(compressedBase64);
      if (notify) notify("Image loaded and compressed successfully! Now ask me to update an item's image.", "ok");
    } catch (err: any) {
      console.error("[Thumbnail Conversion Error]:", err);
      // Fallback
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setUploadedImgUrl(reader.result);
          if (notify) notify("Image uploaded successfully! Now ask me to update an item's image.", "ok");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setErrorMessage(null);
    let messageText = textToSend;
    
    // If there is an uploaded image and image upload mode is active, append indicator context
    if (uploadedImgUrl && uploadActive) {
      messageText += " (I have provided a custom base64 uploaded image. Please use imageUrl: 'uploaded' to update the product)";
    }

    const userMessage = { role: "user" as const, text: messageText };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          uploadedImgUrl: (uploadedImgUrl && uploadActive) ? uploadedImgUrl : undefined,
          userLocation: cityFilter === "all" ? "Tarkwa & Bogoso (All Areas)" : cityFilter === "tarkwa" ? "Tarkwa Only" : "Bogoso Only"
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 || data.isQuota) {
          setMessages(prev => [
            ...prev,
            {
              role: "assistant",
              text: data.text || "⚡ ELEXTRA AI is currently experiencing extremely high demand on its free tier. Rest assured, our same-day logistics, express couriers, and professional runners remain 100% active and ready!\n\n👉 Feel free to use our premium **Elextra Restaurant customizer** blocks and interactive shop items above to configure and assemble your perfect meal manually, or try sending your message again in a few seconds!"
            }
          ]);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "A connection network glitch occurred.");
      }

      setMessages(prev => [...prev, { role: "assistant", text: data.text }]);
      
      // Execute any intelligent background actions identified by Gemini
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          if (action.type === "ADD_TO_CART") {
            const { productId, quantity = 1 } = action;
            const product = [...GROCERY_ITEMS, ...ELECTRONICS, ...CONSTRUCTION].find(p => p.id === productId);
            if (product && onAddToCart) {
              for (let i = 0; i < quantity; i++) {
                onAddToCart(product);
              }
              if (notify) notify(`AI background: Added ${quantity}x ${product.name} to cart! 🛒`, "ok");
            } else {
              try {
                const custom = await DB.get("elx_custom_catalog") || {};
                const customProd = custom[productId];
                if (customProd && onAddToCart) {
                  for (let i = 0; i < quantity; i++) {
                    onAddToCart(customProd);
                  }
                  if (notify) notify(`AI background: Added ${quantity}x ${customProd.name} to cart! 🛒`, "ok");
                }
              } catch (e) {
                console.warn("[AI Action add to cart custom lookup error]:", e);
              }
            }
          } else if (action.type === "APPLY_COUPON") {
            const { code } = action;
            await DB.set("elx_applied_coupon", code);
            if (notify) notify(`AI background: Applied promo code "${code}"! Checkout discount ready! 🎫`, "ok");
          } else if (action.type === "CHANGE_CITY") {
            const { city } = action;
            if (setCityFilter) {
              setCityFilter(city);
              if (notify) notify(`AI background: Switched area to ${city.toUpperCase()}! 🌐`, "ok");
            }
          } else if (action.type === "SET_SEARCH") {
            const { query } = action;
            if (setSearch) {
              setSearch(query);
            }
          } else if (action.type === "NAVIGATE") {
            const { tab } = action;
            if (setPage) {
              setPage(tab);
            }
          }
        }
      }
      
      // If we just successfully updated an image using our uploaded image, we can clear it
      if (uploadedImgUrl && uploadActive) {
        setUploadedImgUrl(null);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failure communicating with ELEXTRA AI.");
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: "⚠️ ELEXTRA AI was unable to establish a secure line. Please check that your GEMINI_API_KEY is saved in the Secrets / Settings panel."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Sparkly Button */}
      <button
        style={{
          position: "fixed",
          bottom: desktopMode ? "20px" : "84px",
          right: "20px",
          zIndex: 999,
          background: "linear-gradient(135deg, #2563eb, #1e40af)",
          border: "2px solid rgba(255,255,255,0.35)",
          color: "white",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          boxShadow: "0 6px 16px rgba(37, 99, 235, 0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Elextra AI chat"
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {isOpen ? <X size={26} /> : <Brain size={26} />}
      </button>

      {/* Interactive Chat Panel Drawer */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: desktopMode ? "88px" : "152px",
            right: "20px",
            width: "calc(100vw - 40px)",
            maxWidth: "380px",
            height: "540px",
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1.5px solid #cbd5e1",
            fontFamily: "Inter, sans-serif"
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b, #0f172a)",
              color: "white",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1.5px solid #1e293b"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex"
                }}
              >
                <Sparkles size={16} style={{ color: "white" }} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: "14px", letterSpacing: "0.02em" }}>ELEXTRA AI Copilot</div>
                <div style={{ fontSize: "10px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                  Local Expert · {cityFilter === "all" ? "Tarkwa & Bogoso" : cityFilter === "tarkwa" ? "Tarkwa" : "Bogoso"}
                </div>
              </div>
            </div>
            <button
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Interactive Toggle Control Bar (Requested Features) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              padding: "8px 12px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0"
            }}
          >
            {/* Reverse Actions Toggle Button */}
            <button
              onClick={handleUndo}
              disabled={undoLoading || loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                padding: "6px 8px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: undoLoading ? "#eff6ff" : "white",
                color: undoLoading ? "#2563eb" : "#334155",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title="Reverse/undo the previous database changes"
            >
              <Undo size={13} style={{ animation: undoLoading ? "spin 1s linear infinite" : "none" }} />
              <span>{undoLoading ? "Reversing..." : "Reverse Last Action"}</span>
            </button>

            {/* Upload Image Toggle Switch */}
            <button
              onClick={() => setUploadActive(!uploadActive)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                padding: "6px 8px",
                borderRadius: "8px",
                border: uploadActive ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                background: uploadActive ? "#eff6ff" : "white",
                color: uploadActive ? "#2563eb" : "#334155",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title="Toggle to upload your custom image for catalog items"
            >
              <UploadCloud size={13} />
              <span>{uploadActive ? "Upload Enabled" : "Upload Image"}</span>
            </button>
          </div>

          {/* Image Upload Area (Shown when Upload toggle is active) */}
          {uploadActive && (
            <div
              style={{
                padding: "10px 12px",
                background: "#f0fdf4",
                borderBottom: "1px solid #bbf7d0",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534" }}>Custom Catalog Image Source</span>
                {uploadedImgUrl && (
                  <button
                    onClick={() => setUploadedImgUrl(null)}
                    style={{ background: "none", border: "none", color: "#b91c1c", fontSize: "10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                )}
              </div>
              
              {!uploadedImgUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "1.5px dashed #16a34a",
                    borderRadius: "8px",
                    padding: "8px",
                    textAlign: "center",
                    cursor: "pointer",
                    fontSize: "11px",
                    color: "#166534",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <ImageIcon size={14} />
                  <span>Click to select or drop product image file</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", padding: "6px", borderRadius: "8px", border: "1px solid #dcfce7" }}>
                  <img
                    src={uploadedImgUrl}
                    alt="Uploaded thumbnail"
                    style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover" }}
                    referrerPolicy="no-referrer"
                  />
                  <div style={{ flex: 1, fontSize: "10px", color: "#166534" }}>
                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={10} style={{ color: "#16a34a" }} />
                      Image asset staged in cache!
                    </div>
                    <div>Say "change image of c1 to this" to apply</div>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageFileChange}
              />
            </div>
          )}

          {/* Messages Body */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {messages.map((m, idx) => {
              const isAssistant = m.role === "assistant";
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isAssistant ? "flex-start" : "flex-end",
                    maxWidth: "85%",
                    background: isAssistant ? "white" : "#2563eb",
                    color: isAssistant ? "#1e293b" : "white",
                    padding: "10px 14px",
                    borderRadius: isAssistant ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    boxShadow: isAssistant ? "0 2px 5px rgba(0,0,0,0.03)" : "none",
                    border: isAssistant ? "1px solid #e2e8f0" : "none",
                    whiteSpace: "pre-line"
                  }}
                >
                  {m.text}
                </div>
              );
            })}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "white",
                  color: "#64748b",
                  padding: "10px 14px",
                  borderRadius: "12px 12px 12px 2px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
                  border: "1px solid #e2e8f0"
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6", animation: "pulse 1.2s infinite ease-in-out" }} />
                <span>AI analyzing catalog request...</span>
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  background: "#fff5f5",
                  border: "1px solid #fee2e2",
                  color: "#991b1b",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px"
                }}
              >
                <AlertTriangle size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <strong>AI Handshake Alert:</strong>
                  <div style={{ marginTop: "2px" }}>{errorMessage}</div>
                  <div style={{ fontSize: "10px", opacity: 0.85, marginTop: "4px" }}>
                    👉 Add <strong>GEMINI_API_KEY</strong> in the Secrets menu to fully test in-depth AI capabilities.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preset Action Chips */}
          <div
            style={{
              padding: "10px 12px",
              background: "#f1f5f9",
              borderTop: "1px solid #e2e8f0",
              overflowX: "auto",
              display: "flex",
              gap: "8px",
              whiteSpace: "nowrap"
            }}
          >
            {presetChips.map((chip, idx) => (
              <button
                key={idx}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#475569",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}
                onClick={() => handleSend(chip.text)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #e2e8f0",
              background: "white",
              display: "flex",
              gap: "8px"
            }}
          >
            <input
              style={{
                ...S.inp,
                flex: 1,
                fontSize: "13px",
                borderRadius: "10px",
                padding: "8px 12px"
              }}
              placeholder="Ask about food, yards, or MoMo gateway..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend(input)}
              disabled={loading}
            />
            <button
              style={{
                background: "linear-gradient(135deg, #2563eb, #1e40af)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                width: "38px",
                height: "38px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
