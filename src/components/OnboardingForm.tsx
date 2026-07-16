/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { DB } from "../db";
import { S } from "../styles";
import { ClipboardList, Truck, Store, ArrowRight, CheckCircle2, ShieldAlert, Camera, Trash2, RotateCcw } from "lucide-react";

export function OnboardingForm({ notify }: { notify: (msg: string, type?: "ok" | "err") => void }) {
  const [roleType, setRoleType] = useState<"rider" | "seller">("rider");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Rider Form Fields
  const [riderName, setRiderName] = useState("");
  const [riderEmail, setRiderEmail] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [riderVehicle, setRiderVehicle] = useState("Motorcycle");
  const [riderPlate, setRiderPlate] = useState("");

  // Seller Form Fields
  const [sellerShopName, setSellerShopName] = useState("");
  const [sellerOwnerName, setSellerOwnerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerCategory, setSellerCategory] = useState("provisions");
  const [sellerAddress, setSellerAddress] = useState("");

  // Live Camera Capture States
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Clear photo and stop camera if changing roles
  useEffect(() => {
    setPhoto(null);
    stopCamera();
  }, [roleType]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: roleType === "rider" ? "user" : "environment", width: 640, height: 480 }
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      // Wait a tiny tick for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      notify("Could not access camera. Please check your system/browser permissions.", "err");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setPhoto(dataUrl);
        stopCamera();
        notify("Photo captured successfully! 📸", "ok");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (roleType === "rider") {
        if (!riderName || !riderEmail || !riderPhone || !riderPlate) {
          notify("Please complete all rider fields including your plate number.", "err");
          setLoading(false);
          return;
        }

        const appPayload = {
          id: "APP-RID-" + Date.now(),
          type: "rider",
          name: riderName,
          email: riderEmail,
          phone: riderPhone,
          vehicleType: riderVehicle,
          plateNumber: riderPlate,
          photo: photo, // Live capture photo URL (Base64)
          status: "pending",
          submittedAt: new Date().toISOString()
        };

        const existingApps = await DB.get("elx_applications") || [];
        const updated = [...existingApps, appPayload];
        await DB.set("elx_applications", updated);

        // Dispatch sync event for real-time update
        window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_applications", value: updated } }));
      } else {
        if (!sellerShopName || !sellerOwnerName || !sellerEmail || !sellerPhone || !sellerAddress) {
          notify("Please complete all business details including your address.", "err");
          setLoading(false);
          return;
        }

        const appPayload = {
          id: "APP-SEL-" + Date.now(),
          type: "seller",
          shopName: sellerShopName,
          name: sellerOwnerName,
          email: sellerEmail,
          phone: sellerPhone,
          category: sellerCategory,
          address: sellerAddress,
          photo: photo, // Live capture storefront photo URL (Base64)
          status: "pending",
          submittedAt: new Date().toISOString()
        };

        const existingApps = await DB.get("elx_applications") || [];
        const updated = [...existingApps, appPayload];
        await DB.set("elx_applications", updated);

        // Dispatch sync
        window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_applications", value: updated } }));
      }

      setSuccess(true);
      notify("Your application has been submitted and is syncing with the admin node!", "ok");
    } catch (err) {
      notify("Failed to submit onboarding application.", "err");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setRiderName("");
    setRiderEmail("");
    setRiderPhone("");
    setRiderPlate("");
    setSellerShopName("");
    setSellerOwnerName("");
    setSellerEmail("");
    setSellerPhone("");
    setSellerAddress("");
    setPhoto(null);
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        style={{ ...S.sec, textAlign: "center", padding: "40px 20px", maxWidth: "550px", margin: "20px auto" }}
      >
        <div style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle2 size={36} />
        </div>
        <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#1e293b" }}>Application Submitted!</h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px", lineHeight: "1.6" }}>
          Your application was registered in the secure cloud node. The Primary Administrator is reviewing candidates in real-time. 
          Upon approval, you will receive login credentials to access the <strong>ELEXTRA Staff Command Center</strong>.
        </p>
        <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px dashed #cbd5e1", margin: "20px 0", fontSize: "11px", color: "#475569" }}>
          📡 <strong>Real-time Node Status:</strong> Pending Verification Clearance
        </div>
        <button onClick={handleReset} style={{ ...S.cta, background: "#1e293b", color: "white" }}>
          Submit Another Application
        </button>
      </motion.div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "24px", borderRadius: "16px", color: "white", marginBottom: "20px", textAlign: "center" }}>
        <ClipboardList size={32} style={{ color: "#21F1A8", marginBottom: "8px", display: "inline-block" }} />
        <h2 style={{ fontSize: "22px", fontWeight: 900 }}>Join ELEXTRA Local Fleet</h2>
        <p style={{ fontSize: "12.5px", opacity: 0.85, marginTop: "4px" }}>
          Apply to become a verified dispatch rider or register your retail/food outlet to reach thousands of customers in Tarkwa-Bogoso.
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button 
          onClick={() => setRoleType("rider")}
          style={{ 
            flex: 1, 
            padding: "12px", 
            borderRadius: "10px", 
            border: "1.5px solid", 
            borderColor: roleType === "rider" ? "#ef4444" : "#cbd5e1",
            background: roleType === "rider" ? "#fef2f2" : "white",
            color: roleType === "rider" ? "#ef4444" : "#475569",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "13px",
            transition: "all 0.15s ease"
          }}
        >
          <Truck size={18} />
          Become a Rider
        </button>

        <button 
          onClick={() => setRoleType("seller")}
          style={{ 
            flex: 1, 
            padding: "12px", 
            borderRadius: "10px", 
            border: "1.5px solid", 
            borderColor: roleType === "seller" ? "#ef4444" : "#cbd5e1",
            background: roleType === "seller" ? "#fef2f2" : "white",
            color: roleType === "seller" ? "#ef4444" : "#475569",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "13px",
            transition: "all 0.15s ease"
          }}
        >
          <Store size={18} />
          Register as Merchant
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ ...S.sec, display: "flex", flexDirection: "column", gap: "14px" }}>
        <h4 style={{ fontSize: "15px", fontWeight: "bold", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "6px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
          {roleType === "rider" ? "🏍️ Rider Recruitment Form" : "🏪 Merchant Onboarding Form"}
        </h4>

        {roleType === "rider" ? (
          <>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Full Name *</label>
              <input style={S.inp} placeholder="e.g. John Mensah" value={riderName} onChange={e => setRiderName(e.target.value)} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Email Address *</label>
                <input style={S.inp} type="email" placeholder="e.g. john@example.com" value={riderEmail} onChange={e => setRiderEmail(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Telephone *</label>
                <input style={S.inp} placeholder="e.g. +233 54 123 4567" value={riderPhone} onChange={e => setRiderPhone(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Vehicle Category</label>
                <select style={{ ...S.inp, padding: "8px" }} value={riderVehicle} onChange={e => setRiderVehicle(e.target.value)}>
                  <option value="Motorcycle">Motorcycle (Fast Courier)</option>
                  <option value="Tricycle">Tricycle (Cargo hauling)</option>
                  <option value="Bicycle">Bicycle (Eco delivery)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>License Plate Number *</label>
                <input style={S.inp} placeholder="e.g. GW-1234-26" value={riderPlate} onChange={e => setRiderPlate(e.target.value)} required />
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Business / Shop Name *</label>
                <input style={S.inp} placeholder="e.g. Tarkwa Central Provisions" value={sellerShopName} onChange={e => setSellerShopName(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Category Type</label>
                <select style={{ ...S.inp, padding: "8px" }} value={sellerCategory} onChange={e => setSellerCategory(e.target.value)}>
                  <option value="provisions">🥬 Groceries & Fresh Produce</option>
                  <option value="electronics">📺 Electronics & Appliances</option>
                  <option value="construction">🧱 Building & Structural Supplies</option>
                  <option value="food">🍽️ Ready-to-Eat Fast Food</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Merchant Owner Full Name *</label>
              <input style={S.inp} placeholder="e.g. Ama Serwaa" value={sellerOwnerName} onChange={e => setSellerOwnerName(e.target.value)} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Merchant Email *</label>
                <input style={S.inp} type="email" placeholder="e.g. ama@serwaa.com" value={sellerEmail} onChange={e => setSellerEmail(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Contact Number *</label>
                <input style={S.inp} placeholder="e.g. +233 24 987 6543" value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} required />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Physical Business Address / Landmark *</label>
              <input style={S.inp} placeholder="e.g. Near Cyanide Roundabout, Tarkwa" value={sellerAddress} onChange={e => setSellerAddress(e.target.value)} required />
            </div>
          </>
        )}

        {/* Live Camera Capture Section */}
        <div style={{ border: "1.5px dashed #cbd5e1", borderRadius: "12px", padding: "16px", background: "#f8fafc", marginTop: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "8px" }}>
            {roleType === "rider" ? "📷 Profile Photo (Live Camera Capture) *" : "📷 Business Store Front Photo (Live Camera Capture) *"}
          </label>
          
          {!isCameraActive && !photo && (
            <button
              type="button"
              onClick={startCamera}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#FF5A1F",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            >
              <Camera size={16} /> Open Web Camera
            </button>
          )}

          {isCameraActive && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "320px", height: "240px", borderRadius: "8px", overflow: "hidden", background: "#000", border: "2px solid #FF5A1F" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(0,0,0,0.6)", color: "#21F1A8", fontSize: "10px", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#21F1A8", display: "inline-block" }} /> LIVE STREAM
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={capturePhoto}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  📸 Capture Snap
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#64748b",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {photo && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "320px", height: "240px", borderRadius: "8px", overflow: "hidden", border: "2px solid #10b981" }}>
                <img
                  src={photo}
                  alt="Captured Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", top: "10px", left: "10px", background: "#10b981", color: "white", fontSize: "10px", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px" }}>
                  ✓ CAPTURED
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  <RotateCcw size={14} /> Retake Photo
                </button>
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  <Trash2 size={14} /> Delete Photo
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ ...S.cta, marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          {loading ? "Submitting Application Details..." : "Submit Application to Command Node"} <ArrowRight size={16} />
        </button>

        <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "6px" }}>
          <ShieldAlert size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "10.5px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
            ELEXTRA protects candidate safety. Submitted profiles sync instantly to the Primary Administrator. 
            Approval produces verified credentials. There are no automatic activations without admin vetting.
          </p>
        </div>
      </form>
    </div>
  );
}
