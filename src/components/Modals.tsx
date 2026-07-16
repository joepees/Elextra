/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Minus, Trash2, Shield, CreditCard, Smartphone, CheckCircle, SmartphoneIcon } from "lucide-react";
import { CartItem, Product, User, Order } from "../types";
import { FEES, today, FOOD_PLACES, MALLS_SHOPS } from "../data";
import { S } from "../styles";
import { DB } from "../db";
import { PRODUCT_IMAGES } from "../productImages";
import { loginWithGoogle } from "../lib/firestoreSync";

// ─── UTILS ───────────────────────────────────────────────────────────────────
import { FeeRow, OptionBtn } from "./Pages";

interface OverlayProps {
  children: React.ReactNode;
  onClose?: () => void;
  scrollable?: boolean;
  wide?: boolean;
}

function Overlay({ children, onClose, scrollable, wide }: OverlayProps) {
  return (
    <div style={S.mBg} onClick={onClose}>
      <div 
        style={{ 
          ...S.mBox, 
          maxWidth: wide ? "850px" : "420px",
          maxHeight: "calc(100vh - 40px)", 
          overflowY: "auto" as const,
          paddingBottom: "28px", // Clean spacing for bottom action buttons
          display: "flex",
          flexDirection: "column" as const
        }} 
        onClick={e => e.stopPropagation()}
      >
        {onClose && (
          <button style={S.closeBtn} onClick={onClose}>
            ✕
          </button>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, width: "100%" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN MODAL ─────────────────────────────────────────────────────────────
interface LoginModalProps {
  onClose: () => void;
  onLogin: (u: User) => void;
  setModal: (m: string | null) => void;
}

export function LoginModal({ onClose, onLogin, setModal }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [adminCreds, setAdminCreds] = useState({ email: "enyam66@gmail.com", code: "Coded6123@" });

  // Password reset flow states
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [generatedPass, setGeneratedPass] = useState("");

  useEffect(() => {
    (async () => {
      const stored = await DB.get("elx_admin_credentials");
      if (stored && stored.email && stored.code) {
        setAdminCreds(stored);
      }
    })();
  }, []);

  const handlePasswordReset = async () => {
    setResetErr("");
    setResetSuccess("");
    setGeneratedPass("");

    if (!resetEmail.trim()) {
      setResetErr("Please enter your registered email address.");
      return;
    }

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        setResetErr(data.error || "Failed to reset password.");
      } else {
        setResetSuccess(data.message);
        if (data.tempPass) {
          setGeneratedPass(data.tempPass);
        }
      }
    } catch (e) {
      setResetErr("A communication error occurred. Please try again.");
    }
  };

  const submit = async () => {
    if (!email || !pass) {
      setErr("Please supply all values to sign in.");
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check Staff/Admin Accounts First via server-side secure authentication API
    try {
      const response = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password: pass })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Save staff session
        const staffObj = { ...data.staff, password: pass };
        await DB.set("elx_logged_staff", staffObj);
        
        // Ensure staff do NOT stay logged in on user interface
        await DB.set("elx_user", null);
        
        setErr("Staff authorized! Redirecting to command console...");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 800);
        return;
      } else if (response.status === 403) {
        setErr(data.error || "This account has been locked by the main Administrator.");
        return;
      }
    } catch (e) {
      console.warn("Staff node authentication exception:", e);
    }

    // 2. Check Registered Customers via server-side secure authentication API
    try {
      const response = await fetch("/api/auth/customer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password: pass })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        onLogin(data.user);
        return;
      } else {
        setErr(data.error || "Incorrect access password or account not found.");
        return;
      }
    } catch (e) {
      setErr("Failed to communicate with the authentication server. Please try again.");
    }
  };

  if (forgotMode) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "40px" }}>🔑</div>
          <div style={{ fontSize: "20px", fontWeight: 900, marginTop: "8px", color: "#0f172a" }}>Forgot Password</div>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", padding: "0 10px", lineHeight: "1.4" }}>
            Enter your registered email address. We will verify the account and generate a new temporary password sent from <strong>elextra.de@gmail.com</strong>.
          </p>
        </div>

        <input 
          placeholder="Enter your email address" 
          type="email"
          value={resetEmail} 
          onChange={e => setResetEmail(e.target.value)} 
          style={S.inp} 
        />

        {resetErr && (
          <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "10px", fontWeight: 700, background: "#fef2f2", border: "1px solid #fee2e2", padding: "8px", borderRadius: "8px" }}>
            ⚠️ {resetErr}
          </div>
        )}

        {resetSuccess && (
          <div style={{ color: "#16a34a", fontSize: "12px", marginTop: "10px", fontWeight: 700, background: "#f0fdf4", border: "1px solid #dcfce7", padding: "8px", borderRadius: "8px" }}>
            ✓ {resetSuccess}
          </div>
        )}

        {generatedPass && (
          <div style={{ marginTop: "12px", background: "#0f172a", border: "1.5px dashed #10b981", borderRadius: "10px", padding: "12px", textAlign: "center", color: "white" }}>
            <div style={{ fontSize: "10px", color: "#34d399", fontWeight: "bold", letterSpacing: "1px" }}>🔑 TEMPORARY CODE GENERATED</div>
            <div style={{ fontSize: "22px", fontWeight: 900, marginTop: "6px", fontFamily: "monospace", letterSpacing: "2px", color: "#10b981" }}>{generatedPass}</div>
            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "6px" }}>Use this code to sign in on the main panel.</div>
          </div>
        )}

        <button style={{ ...S.cta, width: "100%", marginTop: "16px" }} onClick={handlePasswordReset}>
          Generate New Password
        </button>

        <div style={{ textAlign: "center", marginTop: "14px", fontSize: "13px" }}>
          <button 
            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 700 }} 
            onClick={() => {
              setForgotMode(false);
              setResetErr("");
              setResetSuccess("");
              setGeneratedPass("");
            }}
          >
            ← Back to Sign In
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "40px" }}>🔐</div>
        <div style={{ fontSize: "20px", fontWeight: 900, marginTop: "8px", color: "#0f172a" }}>Client Authentication</div>
      </div>
      <input 
        placeholder="Enter Email Address" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        style={S.inp} 
      />
      <input 
        placeholder="Enter Secret Pass" 
        type="password" 
        value={pass} 
        onChange={e => setPass(e.target.value)} 
        style={{ ...S.inp, marginTop: "10px" }} 
      />
      {err && (
        <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "8px", fontWeight: 700 }}>
          ⚠️ {err}
        </div>
      )}
      
      <div style={{ textAlign: "right", marginTop: "8px" }}>
        <button 
          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "12.5px", fontWeight: "600" }}
          onClick={() => {
            setForgotMode(true);
            setResetEmail(email); // prepopulate if they typed it
            setErr("");
          }}
        >
          Forgot password?
        </button>
      </div>

      <button style={{ ...S.cta, width: "100%", marginTop: "12px" }} onClick={submit}>
        Sign In Account
      </button>

      <div style={{ display: "flex", alignItems: "center", margin: "16px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
        <div style={{ padding: "0 10px", fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>or</div>
        <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
      </div>

      <button 
        type="button"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          background: "white",
          color: "#1e293b",
          border: "2px solid #e2e8f0",
          borderRadius: "12px",
          padding: "12px 16px",
          fontSize: "13.5px",
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        onClick={async () => {
          setErr("");
          try {
            const u = await loginWithGoogle();
            if (u) {
              onLogin(u);
            } else {
              setErr("Failed to sign in with Google.");
            }
          } catch (e: any) {
            setErr(e.message || "An error occurred during Google Sign-In.");
          }
        }}
      >
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "18px", height: "18px" }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
        Sign in with Google
      </button>

      <div style={{ textAlign: "center", marginTop: "14px", fontSize: "13px", color: "#64748b" }}>
        First dispatch run here?{" "}
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 700 }} onClick={() => setModal("signup")}>
          Sign Up
        </button>
      </div>
    </Overlay>
  );
}

// ─── SIGNUP MODAL ────────────────────────────────────────────────────────────
interface SignupModalProps {
  onClose: () => void;
  onSignup: (u: User) => void;
  setModal: (m: string | null) => void;
  tcAccepted: boolean;
}

export function SignupModal({ onClose, onSignup, setModal, tcAccepted }: SignupModalProps) {
  const [type, setType] = useState("ind");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", location: "", password: "", confirm: ""
  });
  const [err, setErr] = useState("");

  // T&C toggle states
  const [showTcDetail, setShowTcDetail] = useState(false);
  const [localTc, setLocalTc] = useState(tcAccepted);

  const setVal = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name || !form.email || !form.phone || !form.location || !form.password) {
      setErr("All starred * fields are mandatory.");
      return;
    }

    const emailStr = form.email.trim().toLowerCase();
    
    // Strict domain ending validation as requested by the user
    // (ends with @gmail.com, @outlook.com, @outlook com, @yahoo.com, @ymail.com, @live.com, @hotmail.com, @cloud.com)
    const allowedEndings = [
      "@gmail.com",
      "@outlook.com",
      "@outlook com",
      "@yahoo.com",
      "@ymail.com",
      "@live.com",
      "@hotmail.com",
      "@cloud.com"
    ];

    const isValidEnding = allowedEndings.some(ending => {
      const spaceVariant = ending.toLowerCase();
      const dotVariant = ending.replace(/\s+/g, ".").toLowerCase();
      return emailStr.endsWith(spaceVariant) || emailStr.endsWith(dotVariant);
    });

    if (!isValidEnding) {
      setErr("Invalid email domain. Must end with one of: @gmail.com, @outlook.com, @yahoo.com, @ymail.com, @live.com, @hotmail.com, @cloud.com");
      return;
    }

    if (form.password !== form.confirm) {
      setErr("Entered passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setErr("Key password length must exceed 6 signs.");
      return;
    }
    if (!localTc) {
      setErr("You must review and check accept to the Terms & Conditions.");
      return;
    }

    const u: User = {
      id: Date.now(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      location: form.location,
      type,
      password: form.password
    };
    onSignup(u);
  };

  return (
    <Overlay onClose={onClose} scrollable>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", margin: 0 }}>🔑 Create Account</h2>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>Register a new Elextra secure dispatch node</p>
        </div>

        {err && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "10px", color: "#991b1b", fontSize: "11.5px" }}>
            ⚠️ {err}
          </div>
        )}

        {/* Type selector */}
        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Account Type</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setType("ind")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: type === "ind" ? "#FF5A1F" : "#cbd5e1",
                background: type === "ind" ? "#fff5f2" : "#fff",
                color: type === "ind" ? "#FF5A1F" : "#475569",
                fontWeight: "bold",
                fontSize: "11.5px",
                cursor: "pointer"
              }}
            >
              👤 Individual
            </button>
            <button
              type="button"
              onClick={() => setType("biz")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: type === "biz" ? "#FF5A1F" : "#cbd5e1",
                background: type === "biz" ? "#fff5f2" : "#fff",
                color: type === "biz" ? "#FF5A1F" : "#475569",
                fontWeight: "bold",
                fontSize: "11.5px",
                cursor: "pointer"
              }}
            >
              🏢 Merchant / Partner
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Full Name *</label>
          <input 
            style={S.inp} 
            value={form.name} 
            onChange={e => setVal("name", e.target.value)} 
            placeholder="e.g. Ama Serwaa" 
          />
        </div>

        {/* Email */}
        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Email Address *</label>
          <input 
            type="email" 
            style={S.inp} 
            value={form.email} 
            onChange={e => setVal("email", e.target.value)} 
            placeholder="e.g. ama@gmail.com" 
          />
        </div>

        {/* Phone */}
        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Phone Number *</label>
          <input 
            style={S.inp} 
            value={form.phone} 
            onChange={e => setVal("phone", e.target.value)} 
            placeholder="e.g. 0244123456" 
          />
        </div>

        {/* Default Hub Location */}
        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Default Hub / City *</label>
          <select 
            style={S.inp} 
            value={form.location} 
            onChange={e => setVal("location", e.target.value)}
          >
            <option value="">-- Choose Local Hub --</option>
            <option value="Tarkwa">Tarkwa</option>
            <option value="Bogoso">Bogoso</option>
            <option value="Aboso">Aboso</option>
          </select>
        </div>

        {/* Password */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Password *</label>
            <input 
              type="password" 
              style={S.inp} 
              value={form.password} 
              onChange={e => setVal("password", e.target.value)} 
              placeholder="••••••••" 
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Confirm *</label>
            <input 
              type="password" 
              style={S.inp} 
              value={form.confirm} 
              onChange={e => setVal("confirm", e.target.value)} 
              placeholder="••••••••" 
            />
          </div>
        </div>

        {/* T&C */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "4px" }}>
          <input 
            type="checkbox" 
            id="signup_tc_check" 
            checked={localTc} 
            onChange={e => setLocalTc(e.target.checked)} 
            style={{ marginTop: "3px", cursor: "pointer" }}
          />
          <label htmlFor="signup_tc_check" style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.4", cursor: "pointer" }}>
            I agree to the Elextra partner charter and authorize coordinate routing.
          </label>
        </div>

        {/* Submit */}
        <button 
          onClick={submit} 
          style={{ ...S.cta, background: "#FF5A1F", color: "white", marginTop: "8px" }}
        >
          🚀 Register Account
        </button>

        {/* Footer switch */}
        <div style={{ textAlign: "center", fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
          Already have an account?{" "}
          <button 
            onClick={() => setModal("login")} 
            style={{ background: "none", border: "none", color: "#FF5A1F", fontWeight: "bold", cursor: "pointer", padding: 0 }}
          >
            Login here
          </button>
        </div>
      </div>
    </Overlay>
  );
}


// ─── CHECKOUT MODAL ──────────────────────────────────────────────────────────
interface CheckoutModalProps {
  cart: CartItem[];
  subtotal: number;
  platformFee: number;
  onClose: () => void;
  onOrder: (
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
  ) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, d: number) => void;
  user: User | null;
  setModal: (m: string | null) => void;
  heavyInCart: boolean;
  tcAccepted: boolean;
  setPage: (p: string) => void;
  notify: (msg: string, type?: "ok" | "err") => void;
  cityFilter?: string;
  addToCart?: (product: Product) => void;
}

const getItemImage = (item: CartItem): string | undefined => {
  if (item.img && (item.img.startsWith("http://") || item.img.startsWith("https://"))) {
    return item.img;
  }
  // Extract direct lookup or match product ID pattern
  const itemId = item.id || "";
  const cleanId = itemId.split("-")[0];
  if (PRODUCT_IMAGES[cleanId]) {
    return PRODUCT_IMAGES[cleanId];
  }
  if (PRODUCT_IMAGES[itemId]) {
    return PRODUCT_IMAGES[itemId];
  }
  // Check parts of product ID (e.g. other-g1-timestamp -> g1)
  const parts = itemId.split("-");
  for (const part of parts) {
    if (PRODUCT_IMAGES[part]) {
      return PRODUCT_IMAGES[part];
    }
  }

  // Look up by shop name / restaurant name
  if (item.shop) {
    const shopLower = (item.shop || "").toLowerCase();
    const matchedPlace = FOOD_PLACES.find(fp => {
      if (!fp) return false;
      const fpName = (fp.name || "").toLowerCase();
      const fpId = (fp.id || "").toLowerCase();
      return fpName.includes(shopLower) || shopLower.includes(fpName) || fpId === shopLower;
    });
    if (matchedPlace && matchedPlace.imgUrl) {
      return matchedPlace.imgUrl;
    }
    // Hardcoded fallback URLs based on keywords
    if (shopLower.includes("abena")) {
      return "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("efua")) {
      return "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("golden fork")) {
      return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("mama's kitchen") || shopLower.includes("mama")) {
      return "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("crown plaza") || shopLower.includes("hotel")) {
      return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("tarkwa fast")) {
      return "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("miners") || shopLower.includes("canteen")) {
      return "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("kfc")) {
      return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80";
    }
    if (shopLower.includes("elextra")) {
      return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";
    }
  }

  return undefined;
};

export function CheckoutModal({ 
  cart, subtotal, platformFee, onClose, onOrder, removeFromCart, 
  updateQty, user, setModal, heavyInCart, tcAccepted, setPage, notify, cityFilter, addToCart 
}: CheckoutModalProps) {
  const isFoodOnly = cart.length > 0 && cart.every(item => 
    item && (
      (item.id || "").toLowerCase().startsWith("food") || 
      (item.cat && (item.cat || "").toLowerCase().includes("food"))
    )
  );

  const [step, _setStep] = useState<"cart" | "delivery" | "payment">("cart");
  const setStep = (newStep: "cart" | "delivery" | "payment") => {
    if (newStep !== step) {
      if (typeof window !== "undefined") {
        (window as any).elx_modal_history_count = ((window as any).elx_modal_history_count || 0) + 1;
        window.history.pushState({ type: "checkoutStep", value: newStep }, "");
      }
    }
    _setStep(newStep);
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state && state.type === "checkoutStep") {
        _setStep(state.value);
      } else if (state && state.type === "modal" && state.value === "checkout") {
        _setStep("cart");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  const [delivery, setDelivery] = useState("standard");
  const [foodDeliveryMode, setFoodDeliveryMode] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState("momo");
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    if (user?.location) return user.location;
    if (cityFilter === "bogoso") return "Bogoso Town Center";
    return "Tarkwa Town Center";
  });

  // Recipient details
  const [recipientIsSelf, setRecipientIsSelf] = useState<boolean | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientPin, setRecipientPin] = useState("");

  // Coupon States
  const [couponCode, setCouponCode] = useState("");
  const [localQrMode, setLocalQrMode] = useState<string | null>(null);
  const [localTc, setLocalTc] = useState(tcAccepted);

  // High-fidelity checkout additions (matching video reference in style)
  const [orderComment, setOrderComment] = useState("");
  const [courierTip, setCourierTip] = useState<number>(0);
  const [dropoffInstruction, setDropoffInstruction] = useState("door"); // "door" | "leave" | "outside"
  const [deliveryTypeSegment, setDeliveryTypeSegment] = useState<"delivery" | "pickup" | "schedule">("delivery");
  const [showTimeSlotSelector, setShowTimeSlotSelector] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("14:45-15:15");
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today");
  const [isProcessingOrderAnimation, setIsProcessingOrderAnimation] = useState(false);
  const [crossSellRules, setCrossSellRules] = useState<any[]>([]);

  useEffect(() => {
    const loadRules = async () => {
      const val = await DB.get("elx_cross_sell_rules");
      if (val && val.length > 0) {
        setCrossSellRules(val);
      } else {
        const defaults = [
          {
            id: "rule-1",
            targetId: "waakye",
            targetName: "Special Waakye plate",
            category: "specific_item",
            suggestions: [
              { id: "cs-w1", name: "Shito Pepper Sauce", price: 4.0, img: "🌶️", cat: "Extras" },
              { id: "cs-w2", name: "Extra Boiled Egg", price: 3.0, img: "🥚", cat: "Extras" },
              { id: "cs-w3", name: "Avocado Pear Slice", price: 5.0, img: "🥑", cat: "Extras" },
              { id: "cs-w4", name: "Fried Fish Addon", price: 8.0, img: "🐟", cat: "Extras" }
            ]
          },
          {
            id: "rule-2",
            targetId: "plain_rice",
            targetName: "Plain Rice plate",
            category: "specific_item",
            suggestions: [
              { id: "cs-r1", name: "Fried Chicken Drumstick", price: 12.0, img: "🍗", cat: "Extras" },
              { id: "cs-r2", name: "Zesty Coleslaw", price: 5.0, img: "🥗", cat: "Extras" },
              { id: "cs-r3", name: "Spaghetti Addon", price: 4.0, img: "🍝", cat: "Extras" }
            ]
          },
          {
            id: "rule-3",
            targetId: "jollof_rice",
            targetName: "Spiced Jollof Rice plate",
            category: "specific_item",
            suggestions: [
              { id: "cs-j1", name: "Grilled Chicken Quarter", price: 15.0, img: "🍗", cat: "Extras" },
              { id: "cs-j2", name: "Coleslaw Portion", price: 5.0, img: "🥗", cat: "Extras" },
              { id: "cs-j3", name: "Boiled Egg", price: 3.0, img: "🥚", cat: "Extras" }
            ]
          },
          {
            id: "rule-4",
            targetId: "food",
            targetName: "General Food Category",
            category: "food",
            suggestions: [
              { id: "sug-1", name: "Coca-Cola Original 450ml", price: 8.5, img: "🥤", cat: "Grocery" },
              { id: "sug-2", name: "Red Bull Energy Drink", price: 22.0, img: "⚡", cat: "Grocery" },
              { id: "sug-3", name: "Bel-Aqua Mineral Water", price: 2.6, img: "💧", cat: "Grocery" }
            ]
          },
          {
            id: "rule-5",
            targetId: "grocery",
            targetName: "General Grocery Category",
            category: "grocery",
            suggestions: [
              { id: "sug-4", name: "Chaddas Chips Classic", price: 19.9, img: "🍟", cat: "Grocery" },
              { id: "sug-6", name: "India Gate Rozana Rice", price: 139.0, img: "🌾", cat: "Grocery" },
              { id: "cs-g1", name: "Detol Hygiene Liquid", price: 24.0, img: "🧼", cat: "Grocery" }
            ]
          }
        ];
        setCrossSellRules(defaults);
        await DB.set("elx_cross_sell_rules", defaults);
      }
    };
    loadRules();

    const handleSync = (e: any) => {
      if (e.detail?.key === "elx_cross_sell_rules" && Array.isArray(e.detail.value)) {
        setCrossSellRules(e.detail.value);
      }
    };
    window.addEventListener("elx_db_sync" as any, handleSync);
    return () => window.removeEventListener("elx_db_sync" as any, handleSync);
  }, []);

  useEffect(() => {
    const loadAppliedCoupon = async () => {
      try {
        const applied = await DB.get("elx_applied_coupon");
        if (applied) {
          setCouponCode(applied);
        }
      } catch (err) {
        console.warn("[Checkout loadAppliedCoupon error]:", err);
      }
    };
    loadAppliedCoupon();
  }, []);

  const SUGGESTED_ITEMS = useMemo<Product[]>(() => {
    let resolved: any[] = [];
    
    // 1. Gather specific item suggestion matches from cart
    cart.forEach(cartItem => {
      const match = crossSellRules.find(r => r.targetId === cartItem.id && r.category === "specific_item");
      if (match && match.suggestions) {
        resolved.push(...match.suggestions);
      }
    });

    // 2. Gather category-level suggestion matches
    const hasFood = cart.some(item => (item.id || "").toLowerCase().startsWith("food") || (item.cat || "").toLowerCase().includes("food") || ((item as any).category || "").toLowerCase().includes("food"));
    const hasGrocery = cart.some(item => (item.cat || "").toLowerCase().includes("grocery") || ((item as any).category || "").toLowerCase().includes("grocery") || ((item as any).section || "").toLowerCase().includes("grocery") || (item.id || "").toLowerCase().startsWith("grocery") || (item.id || "").toLowerCase().startsWith("sug-"));

    if (hasFood) {
      const foodRule = crossSellRules.find(r => r.category === "food" || r.targetId === "food");
      if (foodRule && foodRule.suggestions) {
        resolved.push(...foodRule.suggestions);
      }
    }
    if (hasGrocery) {
      const groceryRule = crossSellRules.find(r => r.category === "grocery" || r.targetId === "grocery");
      if (groceryRule && groceryRule.suggestions) {
        resolved.push(...groceryRule.suggestions);
      }
    }

    // 3. Fallback to general suggestions if we still have nothing
    if (resolved.length === 0) {
      const defaultRule = crossSellRules.find(r => r.targetId === "all");
      if (defaultRule && defaultRule.suggestions) {
        resolved.push(...defaultRule.suggestions);
      } else {
        // hardcoded safe fallback
        resolved = [
          { id: "sug-1", name: "Coca-Cola Original 450ml", price: 8.5, img: "🥤", cat: "Grocery" },
          { id: "sug-2", name: "Red Bull Energy Drink", price: 22.0, img: "⚡", cat: "Grocery" },
          { id: "sug-3", name: "Bel-Aqua Mineral Water 750ml", price: 2.6, img: "💧", cat: "Grocery" },
          { id: "sug-4", name: "Chaddas Chips Classic Salted", price: 19.9, img: "🍟", cat: "Grocery" }
        ];
      }
    }

    // De-duplicate by id to avoid showing the same suggestion twice
    const seen = new Set();
    return resolved.filter(item => {
      if (!item || !item.id) return false;
      const dup = seen.has(item.id);
      seen.add(item.id);
      return !dup;
    });
  }, [cart, crossSellRules]);

  const triggerOrderWithAnimation = (
    effectiveDeliveryVal: string,
    effectivePaymentVal: string,
    finalDelivFeeVal: number,
    deliveryLocationVal: string,
    recipientNameVal: string,
    recipientPhoneVal: string,
    recipientIsSelfVal: boolean,
    recipientPinVal: string,
    platformFeeVal: number,
    finalTransportFeeVal: number,
    payFeeVal: number,
    totalVal: number,
    couponCodeVal: string,
    totalDiscountVal: number
  ) => {
    // strict validation on Recipient Identification Setup
    if (recipientIsSelf === null) {
      notify("Please complete the Recipient Identification Setup (Are you receiving yourself or handing over?)", "err");
      setStep("delivery");
      return;
    }
    const rName = (recipientName || "").trim();
    const rPhone = (recipientPhone || "").trim();
    if (!rName) {
      notify("Please provide a valid Recipient Name in the Identification Setup.", "err");
      setStep("delivery");
      return;
    }
    if (!rPhone) {
      notify("Please provide a valid Recipient Telephone in the Identification Setup.", "err");
      setStep("delivery");
      return;
    }

    setIsProcessingOrderAnimation(true);
    let logsIndex = 0;
    const processLogsList = [
      "Contacting secure bank servers...",
      "Simulating 3D secure pin checkout...",
      "Authorizing Escrow Lock protocols...",
      "Mapping GPS location for runners...",
      "Broadcasting delivery ticket to active fleets..."
    ];
    setPosLogs([processLogsList[0]]);
    const interval = setInterval(() => {
      logsIndex++;
      if (logsIndex < processLogsList.length) {
        setPosLogs(prev => [...prev, processLogsList[logsIndex]]);
      }
    }, 450);

    setTimeout(() => {
      clearInterval(interval);
      setIsProcessingOrderAnimation(false);
      onOrder(
        effectiveDeliveryVal,
        effectivePaymentVal,
        finalDelivFeeVal,
        deliveryLocationVal,
        recipientNameVal,
        recipientPhoneVal,
        recipientIsSelfVal,
        recipientPinVal,
        platformFeeVal,
        finalTransportFeeVal,
        payFeeVal,
        totalVal,
        couponCodeVal,
        totalDiscountVal,
        arrivalTimeRangeString,
        realTimeEstimateMinutes?.total
      );
    }, 2400);
  };

  useEffect(() => {
    DB.get("elx_qrm").then(val => {
      if (val) {
        setLocalQrMode(val);
        setDeliveryLocation(val);
      }
    });
  }, []);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [couponError, setCouponError] = useState("");

  const applyCoupon = async () => {
    setCouponError("");
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    const coupons = await DB.get("elx_coupons") || [
      { id: "coupon-1", code: "ELEXTRANEW", type: "percent", value: 10, minSubtotal: 20, maxUses: 100, usedCount: 14, active: true, expiry: "2026-12-31" },
      { id: "coupon-2", code: "TARKWAFOOD", type: "flat", value: 15, minSubtotal: 50, maxUses: 50, usedCount: 8, active: true, expiry: "2026-08-31" },
      { id: "coupon-3", code: "BOGOSOFREE", type: "percent", value: 15, minSubtotal: 40, maxUses: 80, usedCount: 32, active: true, expiry: "2026-10-30" }
    ];
    const match = coupons.find((c: any) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (!match) {
      setCouponError("Invalid coupon code.");
      return;
    }
    if (!match.active) {
      setCouponError("This coupon is inactive.");
      return;
    }
    if (subtotal < match.minSubtotal) {
      setCouponError(`Min order subtotal required is ₵${match.minSubtotal}.`);
      return;
    }
    let disc = 0;
    if (match.type === "percent") {
      disc = Math.round((subtotal * match.value) / 100);
    } else {
      disc = match.value;
    }
    setAppliedCoupon(match);
    setDiscountValue(disc);
    notify(`Coupon ${match.code} applied! Saved ₵${disc}`, "ok");
  };

  const [minOrderSubtotal, setMinOrderSubtotal] = useState<number>(30);
  const [configuredMomoLines, setConfiguredMomoLines] = useState({ mtn: "0246263123", telecel: "0503531153" });
  const [riderBaseFees, setRiderBaseFees] = useState({ standard: 10, express: 20, sameDay: 30 });

  const loadDynamicCheckoutParameters = async () => {
    const storedMomo = await DB.get("elx_momo_lines");
    if (storedMomo && storedMomo.mtn && storedMomo.telecel) {
      setConfiguredMomoLines(storedMomo);
    }
    const storedMin = await DB.get("elx_min_order_amount");
    if (storedMin !== undefined && storedMin !== null) {
      setMinOrderSubtotal(Number(storedMin));
    }
    const storedFees = await DB.get("elx_rider_fees");
    if (storedFees) {
      setRiderBaseFees({
        standard: storedFees.standard !== undefined ? storedFees.standard : 10,
        express: storedFees.express !== undefined ? storedFees.express : 20,
        sameDay: storedFees.sameDay !== undefined ? storedFees.sameDay : 30
      });
    }
  };

  useEffect(() => {
    loadDynamicCheckoutParameters();

    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_min_order_amount") {
        setMinOrderSubtotal(Number(value));
      } else if (key === "elx_momo_lines" && value) {
        setConfiguredMomoLines(value);
      } else if (key === "elx_rider_fees" && value) {
        setRiderBaseFees({
          standard: value.standard !== undefined ? value.standard : 10,
          express: value.express !== undefined ? value.express : 20,
          sameDay: value.sameDay !== undefined ? value.sameDay : 30
        });
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    window.addEventListener("storage", loadDynamicCheckoutParameters);

    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
      window.removeEventListener("storage", loadDynamicCheckoutParameters);
    };
  }, []);

  // Generate Recipient PIN Code
  useEffect(() => {
    if (!recipientPin) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      setRecipientPin(pin);
    }
  }, [recipientPin]);

  const formatCardNum = (val: string) => {
    const v = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const parts = [];
    for (let i = 0; i < v.length && i < 16; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.length > 0 ? parts.join(" ") : v;
  };

  const formatCardExp = (val: string) => {
    const v = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length > 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handlePlaceOrder = () => {
    const rName = (recipientName || "").trim();
    const rPhone = (recipientPhone || "").trim();
    if (foodDeliveryMode === "delivery" && !(deliveryLocation || "").trim()) {
      notify("Please enter a delivery address or landmark", "err");
      return;
    }
    if (!rName) {
      notify("Please provide a recipient name", "err");
      return;
    }
    if (!rPhone) {
      notify("Please provide a recipient phone number", "err");
      return;
    }
    if (!localTc) {
      notify("Please accept the terms and conditions to proceed", "err");
      return;
    }

    triggerOrderWithAnimation(
      effectiveDelivery,
      effectivePayment,
      finalDelivFee,
      deliveryLocation,
      rName,
      rPhone,
      recipientIsSelf === null ? true : recipientIsSelf,
      recipientPin,
      platformFee,
      finalTransportFee,
      payFee,
      total,
      appliedCoupon?.code || "",
      totalDiscount
    );
  };

  // Adjust name and phone based on self receive
  useEffect(() => {
    if (recipientIsSelf === true) {
      setRecipientName(user?.name || "Me");
      setRecipientPhone(user?.phone || "");
    } else if (recipientIsSelf === false) {
      setRecipientName("");
      setRecipientPhone("");
    }
  }, [recipientIsSelf, user]);

  // MoMo/Card POS payment terminal simulation state
  const [showPOS, setShowPOS] = useState(false);
  const [posStep, setPosStep] = useState<"input" | "processing" | "confirm" | "success">("input");
  const [momoNumber, setMomoNumber] = useState(user?.phone || "");
  const [momoProvider, setMomoProvider] = useState<"mtn" | "telecel">("mtn");
  const [posLogs, setPosLogs] = useState<string[]>([]);
  const [posPin, setPosPin] = useState("");
  const [showUssdPopup, setShowUssdPopup] = useState(false);
  const [ussdPin, setUssdPin] = useState("");

  // Uber / Yango style Card Payment simulation states
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState(user?.name || "");
  const [cardSave, setCardSave] = useState(true);
  const [cardOtp, setCardOtp] = useState("");

  // GPS Sensor States
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [useGpsSim, setUseGpsSim] = useState(true);

  // Ghanaian landmarks database serving the Tarkwa & Bogoso municipalities
  const LANDMARKS = useMemo(() => [
    { name: "Tarkwa Cyanide", lat: 5.308, lng: -1.987, hub: "Tarkwa" },
    { name: "Tarkwa Town Center", lat: 5.303, lng: -1.984, hub: "Tarkwa" },
    { name: "Tarkwa Tamso", lat: 5.285, lng: -1.981, hub: "Tarkwa" },
    { name: "Bogoso Junction", lat: 5.548, lng: -2.068, hub: "Bogoso" },
    { name: "Bogoso Town Center", lat: 5.542, lng: -2.072, hub: "Bogoso" },
    { name: "Tarkwa Railway Station", lat: 5.301, lng: -1.985, hub: "Tarkwa" },
    { name: "Brahaboboom", lat: 5.315, lng: -1.976, hub: "Tarkwa" },
    { name: "Tarkwa Na Aboso", lat: 5.325, lng: -1.968, hub: "Tarkwa" },
  ], []);

  // Distance calculations
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

  const getDistanceInKm = (loc: string): number => {
    const trimmed = (loc || "").trim().toLowerCase();
    if (!trimmed) return 2.0;
    if (trimmed.includes("town center") || trimmed.includes("cyanide")) return 2.5;
    if (trimmed.includes("tamso")) return 4.5;
    if (trimmed.includes("junction")) return 6.0;
    if (trimmed.includes("depot")) return 3.2;
    if (trimmed.includes("market")) return 1.8;
    const len = trimmed.length;
    return 2.0 + (len % 6) * 1.1;
  };

  const activeGps = useMemo(() => {
    if (!gpsCoords) return null;
    const distTarkwa = getHaversineInKm(gpsCoords.lat, gpsCoords.lng, 5.303, -1.984);
    const distBogoso = getHaversineInKm(gpsCoords.lat, gpsCoords.lng, 5.542, -2.072);
    const realDist = Math.min(distTarkwa, distBogoso);
    // If user is faraway (e.g. Europe or US during preview test), map it to Tarkwa Cyanide for smooth local testing
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
    return getDistanceInKm(deliveryLocation);
  }, [activeGps, deliveryLocation]);

  // Real-time delivery time estimator based on distance between store and delivery address
  const getStoreDetails = () => {
    const firstItem = cart[0];
    const shopName = firstItem?.shop || "Elextra Hub";
    const shopLower = shopName.toLowerCase();

    let name = shopName;
    let lat = 5.308; // default to Tarkwa Cyanide (Elextra Hub)
    let lng = -1.987;
    let location = "Tarkwa Cyanide";

    const matchedFP = FOOD_PLACES.find(fp => 
      fp && ((fp.name || "").toLowerCase().includes(shopLower) || shopLower.includes((fp.name || "").toLowerCase()) || (fp.id || "").toLowerCase() === shopLower)
    );

    const matchedMall = MALLS_SHOPS.find(m => 
      m && ((m.name || "").toLowerCase().includes(shopLower) || shopLower.includes((m.name || "").toLowerCase()) || (m.id || "").toLowerCase() === shopLower)
    );

    if (matchedFP) {
      name = matchedFP.name;
      location = matchedFP.location || "Tarkwa";
      if (matchedFP.id === "f_abena") { lat = 5.315; lng = -1.990; }
      else if (matchedFP.id === "f1") { lat = 5.302; lng = -1.986; }
      else if (matchedFP.id === "f2") { lat = 5.305; lng = -1.983; }
      else if (matchedFP.id === "f3") { lat = 5.548; lng = -2.068; }
      else if (matchedFP.id === "f4") { lat = 5.310; lng = -1.975; }
      else if (matchedFP.id === "pinocchio_osu") { lat = 5.303; lng = -1.984; }
      else if (matchedFP.id === "elextra") { lat = 5.308; lng = -1.987; }
      else if (matchedFP.id === "kfc_circle") { lat = 5.295; lng = -1.981; }
      else if (matchedFP.id === "cheezzy_pizza") { lat = 5.312; lng = -1.979; }
      else {
        let hash = 0;
        for (let i = 0; i < matchedFP.id.length; i++) {
          hash = matchedFP.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        lat = 5.300 + (Math.abs(hash % 30) / 1000);
        lng = -1.980 - (Math.abs(hash % 20) / 1000);
      }
    } else if (matchedMall) {
      name = matchedMall.name;
      location = matchedMall.location || "Tarkwa";
      if (matchedMall.id === "m1") { lat = 5.303; lng = -1.984; }
      else if (matchedMall.id === "m2") { lat = 5.542; lng = -2.072; }
      else if (matchedMall.id === "m3") { lat = 5.318; lng = -1.972; }
      else if (matchedMall.id === "m4") { lat = 5.301; lng = -1.986; }
      else {
        let hash = 0;
        for (let i = 0; i < matchedMall.id.length; i++) {
          hash = matchedMall.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        lat = 5.300 + (Math.abs(hash % 30) / 1000);
        lng = -1.980 - (Math.abs(hash % 20) / 1000);
      }
    } else {
      if (shopLower.includes("abena")) { name = "Mama Abena's Local Food Joint"; location = "Atuabo, Tarkwa Bypass"; lat = 5.315; lng = -1.990; }
      else if (shopLower.includes("efua")) { name = "Auntie Efua's Fast Food"; location = "Tarkwa Market Area"; lat = 5.302; lng = -1.986; }
      else if (shopLower.includes("golden fork")) { name = "Golden Fork Restaurant"; location = "Tarkwa Main Street"; lat = 5.305; lng = -1.983; }
      else if (shopLower.includes("mama")) { name = "Bogoso Mama's Kitchen"; location = "Bogoso Junction"; lat = 5.548; lng = -2.068; }
      else if (shopLower.includes("crown") || shopLower.includes("hotel")) { name = "Crown Plaza Hotel Restaurant"; location = "Tarkwa, Near Mining Area"; lat = 5.310; lng = -1.975; }
      else if (shopLower.includes("kfc")) { name = "KFC Circle"; location = "Tarkwa Circle"; lat = 5.295; lng = -1.981; }
      else if (shopLower.includes("elextra")) { name = "Elextra Hub"; location = "Tarkwa Cyanide"; lat = 5.308; lng = -1.987; }
    }
    return { name, location, lat, lng };
  };

  const storeDetails = useMemo(() => getStoreDetails(), [cart]);

  const userCoordinates = useMemo(() => {
    let userLat = 5.303;
    let userLng = -1.984;
    if (activeGps) {
      userLat = activeGps.lat;
      userLng = activeGps.lng;
    } else {
      const matchedLandmark = LANDMARKS.find(l => 
        l && (deliveryLocation.toLowerCase().includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(deliveryLocation.toLowerCase()))
      );
      if (matchedLandmark) {
        userLat = matchedLandmark.lat;
        userLng = matchedLandmark.lng;
      } else if (deliveryLocation.toLowerCase().includes("bogoso")) {
        userLat = 5.542;
        userLng = -2.072;
      } else {
        let hash = 0;
        for (let i = 0; i < deliveryLocation.length; i++) {
          hash = deliveryLocation.charCodeAt(i) + ((hash << 5) - hash);
        }
        userLat = 5.303 + (Math.abs(hash % 30) / 1000) * (hash % 2 === 0 ? 1 : -1);
        userLng = -1.984 + (Math.abs(hash % 20) / 1000) * (hash % 3 === 0 ? 1 : -1);
      }
    }
    return { lat: userLat, lng: userLng };
  }, [activeGps, deliveryLocation, LANDMARKS]);

  const realStoreToUserDistance = useMemo(() => {
    return getHaversineInKm(
      storeDetails.lat,
      storeDetails.lng,
      userCoordinates.lat,
      userCoordinates.lng
    );
  }, [storeDetails, userCoordinates]);

  const realTimeEstimateMinutes = useMemo(() => {
    const prepMinutes = isFoodOnly ? 15 : 10;
    const transitSpeedFactor = 4.0; // minutes per km
    const trafficBuffer = 5;
    const computedMinutes = prepMinutes + (realStoreToUserDistance * transitSpeedFactor) + trafficBuffer;
    
    if (foodDeliveryMode === "pickup") {
      return { min: prepMinutes, max: prepMinutes + 5, total: prepMinutes, isPickup: true };
    }
    if (!isFoodOnly && delivery === "standard") {
      return { min: 120, max: 180, total: 150, isLongRange: true };
    }
    if (!isFoodOnly && delivery === "express") {
      return { min: 60, max: 90, total: 75, isLongRange: true };
    }
    return {
      min: Math.max(15, Math.round(computedMinutes - 5)),
      max: Math.max(20, Math.round(computedMinutes + 5)),
      total: Math.round(computedMinutes),
      isPickup: false
    };
  }, [realStoreToUserDistance, isFoodOnly, foodDeliveryMode, delivery]);

  const arrivalTimeRangeString = useMemo(() => {
    if (!realTimeEstimateMinutes) return "";
    if (realTimeEstimateMinutes.isLongRange) {
      if (delivery === "standard") return "2-3 business days";
      if (delivery === "express") return "Tomorrow before 6 PM";
    }
    const now = new Date();
    const minTime = new Date(now.getTime() + realTimeEstimateMinutes.min * 60 * 1000);
    const maxTime = new Date(now.getTime() + realTimeEstimateMinutes.max * 60 * 1000);
    const formatTime = (d: Date) => {
      let hours = d.getHours();
      let minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minStr} ${ampm}`;
    };
    return `${formatTime(minTime)} - ${formatTime(maxTime)}`;
  }, [realTimeEstimateMinutes, delivery]);

  // Fair dispatcher food delivery fee (usually between GHS 10 and GHS 25) configured based on GPS/address
  const foodFairRate = useMemo(() => {
    if (isFoodOnly) {
      const baseFare = 10;
      const perKmPrice = 1.6;
      const calculated = Math.round(baseFare + deliveryDistance * perKmPrice);
      return Math.max(10, Math.min(25, calculated));
    }
    return 10;
  }, [isFoodOnly, deliveryDistance]);

  const effectiveDelivery = isFoodOnly ? (foodDeliveryMode === "pickup" ? "pickup" : "sameDay") : delivery;
  const effectivePayment = (isFoodOnly && payment === "cash") ? "momo" : payment;

  // Dynamic dispatch fee based on GPS-tracked coordinates if enabled
  const delivFee = useMemo(() => {
    if (isFoodOnly) {
      if (foodDeliveryMode === "pickup") return 0;
      return foodFairRate;
    }
    if (activeGps) {
      if (effectiveDelivery === "sameDay") {
        return Math.max(12, Math.min(50, Math.round(12 + deliveryDistance * 4.0)));
      } else if (effectiveDelivery === "express") {
        return Math.max(10, Math.min(40, Math.round(10 + deliveryDistance * 2.5)));
      } else {
        return Math.max(8, Math.min(30, Math.round(6 + deliveryDistance * 1.5)));
      }
    } else {
      return effectiveDelivery === "sameDay" 
        ? FEES.deliverySameDay 
        : (effectiveDelivery === "express" ? FEES.deliveryExpress : FEES.deliveryStandard);
    }
  }, [activeGps, effectiveDelivery, deliveryDistance, isFoodOnly, foodFairRate, foodDeliveryMode]);

  // Geolocation trigger handler
  const handleGeolocate = () => {
    setGpsStatus("loading");
    if (!navigator || !navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setGpsStatus("success");

        const distTarkwa = getHaversineInKm(latitude, longitude, 5.303, -1.984);
        const distBogoso = getHaversineInKm(latitude, longitude, 5.542, -2.072);
        const closestHubName = distBogoso < distTarkwa ? "Bogoso" : "Tarkwa";
        const realDist = Math.min(distTarkwa, distBogoso);

        let resolvedName = "";
        if (realDist > 100 && useGpsSim) {
          resolvedName = "GPS Spot near Tarkwa Cyanide (Simulated GPS for local area tests)";
        } else {
          // Find closest physical landmark
          let closestL = LANDMARKS[0];
          let minD = Infinity;
          LANDMARKS.forEach(l => {
            const d = getHaversineInKm(latitude, longitude, l.lat, l.lng);
            if (d < minD) {
              minD = d;
              closestL = l;
            }
          });
          resolvedName = `GPS: near ${closestL.name} (${realDist.toFixed(1)} km from ${closestHubName} Center)`;
        }
        setDeliveryLocation(resolvedName);
      },
      (error) => {
        setGpsStatus("error");
        console.error("GPS telemetry access error:", error);
      }
    );
  };
  
  const hasSubscription = user?.subscription === "plus";
  
  // 5% QR in-dining discount if scanned
  const qrDiscount = localQrMode ? Math.round(subtotal * 0.05) : 0;
  const totalDiscount = discountValue + qrDiscount;

  const finalDelivFee = (hasSubscription || localQrMode) ? 0 : delivFee;
  const finalTransportFee = hasSubscription ? 0 : (heavyInCart 
    ? (effectiveDelivery === "standard" ? FEES.transportAboboya : FEES.transportPickup) 
    : 0);

  const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount);

  const payFee = effectivePayment === "momo" 
    ? Math.max(1, Math.floor(subtotalAfterDiscount / 100)) 
    : effectivePayment === "card" 
      ? Math.round(subtotalAfterDiscount * FEES.paymentCard * 100) / 100 
      : 0;

  const total = subtotalAfterDiscount + platformFee + finalDelivFee + finalTransportFee + payFee + courierTip;

  if (showPOS) {
    const itemsSummary = cart.map(i => `${i.name} (x${i.qty})`).join(", ");

    // Custom Card formatting helpers
    const formatCardNum = (val: string) => {
      const v = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
      const parts = [];
      for (let i = 0; i < v.length && i < 16; i += 4) {
        parts.push(v.substring(i, i + 4));
      }
      return parts.length > 0 ? parts.join(" ") : v;
    };

    const formatCardExp = (val: string) => {
      const v = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
      if (v.length > 2) {
        return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
      }
      return v;
    };

    const triggerProcessing = () => {
      setPosStep("processing");
      if (effectivePayment === "card") {
        setPosLogs([
          "[SECURE] Handshaking secure card processor tunnel (PCI-DSS SLA)...",
          "[GATEWAY] Generating tokenized cryptogram for card number...",
          "[ROUTER] Securing live clearance connection with card Acquiring Network..."
        ]);

        setTimeout(() => {
          setPosLogs(prev => [...prev, `[INFO] Transmitting debit request clearance of GHS ${Math.round(total)}.00`]);
        }, 500);

        setTimeout(() => {
          setPosLogs(prev => [...prev, "[GATEWAY] Handshaking Verified-by-Visa / Mastercard Identity protection..."]);
        }, 1100);

        setTimeout(() => {
          setPosLogs(prev => [
            ...prev,
            "[ALERT] Secure SMS/Email 3D-Secure challenge page mapped successfully. Awaiting challenge OTP entry passcode..."
          ]);
          setPosStep("confirm");
        }, 1800);
      } else {
        setPosLogs([
          "[SECURE] POS Terminal handshake initialized...",
          "[ROUTER] Mapping merchant connection terminal...",
          "[INFRA] Active route identified via Ghana Interbank Payment System..."
        ]);

        setTimeout(() => {
          setPosLogs(prev => [...prev, `[INFO] Requesting token for GHS ${Math.round(total)}.00`]);
        }, 500);

        setTimeout(() => {
          setPosLogs(prev => [...prev, `[GATEWAY] Dispatching USSD prompt callback request to ${momoNumber}...`]);
        }, 1000);

        setTimeout(() => {
          setPosLogs(prev => [...prev, "[ALERT] MoMo subscriber channel connected successfully. Awaiting terminal pin..."]);
          setPosStep("confirm");
          setShowUssdPopup(true);
          setUssdPin("");
          setPosPin("");
        }, 1800);
      }
    };

    const triggerSuccess = () => {
      setPosStep("success");
      notify(
        effectivePayment === "card"
          ? "Debit Card authorization complete!"
          : "Mobile Money POS Payment Authorized successfully!",
        "ok"
      );
    };

    const handleConfirmPaymentAndContinue = () => {
      triggerOrderWithAnimation(
        effectiveDelivery, 
        effectivePayment, 
        finalDelivFee, 
        deliveryLocation || "Tarkwa Center",
        recipientName || user?.name || "Customer",
        recipientPhone || user?.phone || "",
        recipientIsSelf === null ? true : recipientIsSelf,
        recipientPin,
        platformFee,
        finalTransportFee,
        payFee,
        total,
        appliedCoupon?.code || "",
        totalDiscount
      );
      setShowPOS(false);
      setPosPin("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setCardOtp("");
    };

    const cleanCardNum = cardNumber.replace(/\s/g, "");
    const isVisa = cleanCardNum.startsWith("4");
    const isMC = cleanCardNum.startsWith("5");

    return (
      <Overlay onClose={onClose} scrollable>
        <div style={{ background: "#0b0f19", color: "white", padding: "18px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", fontFamily: "monospace", border: "2px solid #1e293b", margin: "10px 0" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px double #334155", paddingBottom: "10px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px" }}>📟</span>
              <span style={{ fontWeight: 900, color: "#cbd5e1", letterSpacing: "1.5px" }}>
                {effectivePayment === "card" ? "ELEXTRA CARD-PAY GATEWAY" : "ELEXTRA MOBI-POS"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "#64748b" }}>
              <span style={{ color: "#22c55e" }}>📶 SECURE HTTPS</span>
              <span style={{ background: "#22c55e", width: "16px", height: "10px", borderRadius: "1px", color: "black", fontSize: "7px", fontWeight: "bold", textAlign: "center", display: "inline-block" }}>100%</span>
            </div>
          </div>

          {posStep === "input" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "16px", background: "#111827", padding: "12px", borderRadius: "10px", border: "1px solid #1f2937" }}>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>TOTAL CONSOLIDATED TRANSACTION AMOUNT</div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#22c55e", marginTop: "4px" }}>₵{Math.round(total)}.00</div>
              </div>

              {effectivePayment === "card" ? (
                /* Interactive Yango/Uber Credit Card Display */
                <div>
                  <div style={{
                    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                    borderRadius: "14px",
                    padding: "18px",
                    color: "white",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                    marginBottom: "16px",
                    height: "160px"
                  }}>
                    <div style={{ position: "absolute", right: "-30px", top: "-30px", width: "125px", height: "125px", borderRadius: "50%", background: isVisa ? "rgba(37,99,235,0.18)" : isMC ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)", filter: "blur(12px)" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", letterSpacing: "1px" }}>DEBIT / CREDIT TERMINAL</div>
                      <div style={{ fontSize: "14px", fontWeight: "black", fontStyle: "italic" }}>
                        {isVisa ? (
                          <span style={{ color: "#3b82f6", fontWeight: 900 }}>VISA</span>
                        ) : isMC ? (
                          <span style={{ color: "#ef4444", fontWeight: 900 }}>Mastercard</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>CARD</span>
                        )}
                      </div>
                    </div>

                    <div style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", width: "32px", height: "22px", borderRadius: "4px", margin: "14px 0 8px", position: "relative" }}>
                      <div style={{ borderRight: "1px solid #78350f", position: "absolute", left: "10px", top: 0, bottom: 0, width: "1px" }} />
                      <div style={{ borderBottom: "1px solid #78350f", position: "absolute", left: 0, right: 0, top: "7px", height: "1px" }} />
                      <div style={{ borderBottom: "1px solid #78350f", position: "absolute", left: 0, right: 0, top: "14px", height: "1px" }} />
                    </div>

                    <div style={{ fontSize: "17px", letterSpacing: "3.2px", fontFamily: "monospace", margin: "6px 0", color: cardNumber ? "#f8fafc" : "#475569" }}>
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "12px" }}>
                      <div>
                        <div style={{ fontSize: "7px", color: "#64748b", letterSpacing: "0.5px" }}>CARD HOLDER</div>
                        <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px", whiteSpace: "nowrap" }}>
                          {cardName || "YOUR NAME"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "7px", color: "#64748b", letterSpacing: "0.5px" }}>EXPIRES</div>
                        <div style={{ fontSize: "10px", fontWeight: "bold", color: "#cbd5e1" }}>
                          {cardExpiry || "MM/YY"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Form Inputs */}
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>CARD NUMBER</label>
                  <input
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    maxLength={19}
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNum(e.target.value))}
                    style={{ width: "100%", background: "#111827", border: "1px solid #334155", borderRadius: "8px", padding: "10px 12px", color: "white", fontSize: "14px", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "12px" }}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>EXPIRY DATE</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatCardExp(e.target.value))}
                        style={{ width: "100%", background: "#111827", border: "1px solid #334155", borderRadius: "8px", padding: "10px 12px", color: "white", fontSize: "14px", fontFamily: "monospace", letterSpacing: "1px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>CVV / SECURE CODE</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={3}
                        value={cardCvv}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          setCardCvv(v);
                        }}
                        style={{ width: "100%", background: "#111827", border: "1px solid #334155", borderRadius: "8px", padding: "10px 12px", color: "white", fontSize: "14px", fontFamily: "monospace", letterSpacing: "1.5px" }}
                      />
                    </div>
                  </div>

                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>CARDHOLDER NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Michael Enyam"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    style={{ width: "100%", background: "#111827", border: "1px solid #334155", borderRadius: "8px", padding: "10px 12px", color: "white", fontSize: "14px", marginBottom: "16px" }}
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "#94a3b8", marginBottom: "16px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={cardSave} 
                      onChange={e => setCardSave(e.target.checked)} 
                    />
                    <span>Save this card for seamless future checkouts (just like Uber/Yango)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (cleanCardNum.length < 16) {
                        notify("Please enter a valid 16-digit card number", "err");
                        return;
                      }
                      if (cardExpiry.length < 5 || !cardExpiry.includes("/")) {
                        notify("Please enter expiry in MM/YY format", "err");
                        return;
                      }
                      if (cardCvv.length < 3) {
                        notify("Please enter correct 3-digit CVV", "err");
                        return;
                      }
                      if (!cardName.trim()) {
                        notify("Please specify cardholder full name", "err");
                        return;
                      }
                      triggerProcessing();
                    }}
                    style={{ width: "100%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none", color: "white", borderRadius: "10px", padding: "14px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1.5px" }}
                  >
                    🔒 Authorized Secure Card Deposit
                  </button>
                </div>
              ) : (
                /* Mobile Money Provider Interface */
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>1. SELECT PROVIDER PORTAL</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                    <button
                      type="button"
                      onClick={() => setMomoProvider("mtn")}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: momoProvider === "mtn" ? "2px solid #eab308" : "1px solid #334155",
                        background: momoProvider === "mtn" ? "rgba(234, 179, 8, 0.12)" : "#1e293b",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                        textAlign: "center"
                      }}
                    >
                      🟡 MTN Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setMomoProvider("telecel")}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: momoProvider === "telecel" ? "2px solid #ef4444" : "1px solid #334155",
                        background: momoProvider === "telecel" ? "rgba(239, 68, 68, 0.12)" : "#1e293b",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                        textAlign: "center"
                      }}
                    >
                      🔴 Telecel Cash
                    </button>
                  </div>

                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>2. SUBSCRIBER WALLET NUMBER</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0244123456"
                    value={momoNumber}
                    onChange={e => setMomoNumber(e.target.value)}
                    style={{ width: "100%", background: "#111827", border: "1px solid #334155", borderRadius: "8px", padding: "10px 12px", color: "white", fontSize: "14px", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "16px" }}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (!momoNumber || momoNumber.length < 9) {
                        notify("Please supply a valid Mobile Money wallet number", "err");
                        return;
                      }
                      triggerProcessing();
                    }}
                    style={{ width: "100%", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "white", borderRadius: "10px", padding: "14px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1.5px" }}
                  >
                    🔐 Click to Activate POS Payment Prompt
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPOS(false)}
                style={{ width: "100%", background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", padding: "10px", fontWeight: "bold", fontSize: "11px", cursor: "pointer", marginTop: "10px" }}
              >
                Cancel & Close POS Hardware
              </button>
            </div>
          )}

          {posStep === "processing" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ display: "inline-block", border: "4px solid #111827", borderTop: "4px solid #10b981", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "14px", color: "#10b981", letterSpacing: "1px" }}>COMMUNICATION WITH GATEWAY CORE ESTABLISHED...</div>

              <div style={{ marginTop: "20px", background: "#020617", borderRadius: "10px", padding: "12px", fontSize: "10.5px", fontFamily: "monospace", color: "#38bdf8", border: "1px solid #1e293b", height: "130px", overflowY: "auto", textAlign: "left", lineHeight: "1.4" }}>
                {posLogs.map((log, index) => (
                  <div key={index} style={{ marginBottom: "4px" }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {posStep === "confirm" && (
            <div>
              {effectivePayment === "card" ? (
                /* Card 3D Secure Simulation Challenge */
                <div>
                  <div style={{ background: "#111827", borderRadius: "12px", padding: "16px", border: "1.5px solid #3b82f6", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "20px" }}>💳</span>
                      <div style={{ fontWeight: "bold", fontSize: "12px", color: "#93c5fd" }}>
                        3D-SECURE 2.0 IDENTIFICATION CHALLENGE
                      </div>
                    </div>
                    <p style={{ fontSize: "11px", color: "#cbd5e1", lineHeight: "1.4", fontFamily: "sans-serif", marginBottom: "10px" }}>
                      ELEXTRA payment network requires verification. An SMS passcode (OTP) has been sent to the cardholder phone associated with card ending in <strong>{cardNumber.slice(-4) || "XXXX"}</strong>.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
                      <label style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold" }}>ENTER SECURE PASSCODE (OTP)</label>
                      <input
                        type="text"
                        placeholder="e.g. 129302"
                        maxLength={6}
                        value={cardOtp}
                        onChange={e => setCardOtp(e.target.value.replace(/[^0-9]/g, ""))}
                        style={{ width: "100%", background: "#020617", border: "1px dashed #3b82f6", borderRadius: "6px", padding: "8px 12px", color: "#38bdf8", fontSize: "15px", textAlign: "center", fontFamily: "monospace", letterSpacing: "4px" }}
                      />
                    </div>
                    <div style={{ fontSize: "10px", color: "#22c55e", marginTop: "8px", fontWeight: "bold" }}>
                      🔒 Testing Bypass: You can leave empty or type any numbers, then submit to authorize.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={triggerSuccess}
                    style={{ width: "100%", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "white", borderRadius: "10px", padding: "14px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1.5px" }}
                  >
                    🔒 Verify & Authorize ₵{Math.round(total)}
                  </button>
                </div>
              ) : (
                /* MoMo Secure USSD Terminal */
                <div>
                  <div style={{ background: "#111827", borderRadius: "12px", padding: "16px", border: "1.5px solid #10b981", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "20px" }}>📱</span>
                      <div style={{ fontWeight: "bold", fontSize: "12.5px", color: "#a7f3d0" }}>
                        SECURE CARRIER SIMULATION PROMPT
                      </div>
                    </div>
                    <p style={{ fontSize: "11px", color: "#cbd5e1", lineHeight: "1.4", fontFamily: "sans-serif", marginBottom: "8px" }}>
                      A USSD push has been simulated to <strong>{momoNumber}</strong> {momoProvider === "mtn" ? "(MTN)" : "(Telecel)"}.
                    </p>
                    <div style={{ borderTop: "1px dashed #1e293b", paddingTop: "8px", color: "#10b981", fontSize: "11px", fontWeight: "bold", marginBottom: "8px" }}>
                      📡 Awaiting your secure Mobile Money PIN verification on the carrier prompt.
                    </div>
                    {posPin ? (
                      <div style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "8px 12px", borderRadius: "8px", fontSize: "11.5px", marginTop: "6px", fontWeight: "bold", border: "1px solid rgba(34,197,94,0.3)" }}>
                        ✓ Secret PIN Code (••••) entered successfully! Complete authorization below.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUssdPopup(true);
                          setUssdPin("");
                        }}
                        style={{ width: "100%", background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", color: "#34d399", borderRadius: "8px", padding: "10px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", marginTop: "6px" }}
                      >
                        📲 Open / Re-trigger USSD PIN Prompt Pop-up
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={triggerSuccess}
                    disabled={!posPin}
                    style={{ width: "100%", background: posPin ? "linear-gradient(135deg, #10b981, #059669)" : "#334155", color: posPin ? "white" : "#64748b", border: "none", borderRadius: "10px", padding: "14px", fontWeight: "bold", fontSize: "13px", cursor: posPin ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", textTransform: "uppercase" }}
                  >
                    🔒 Authorize & Pay ₵{Math.round(total)}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setPosStep("input")}
                style={{ width: "100%", background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", padding: "10px", fontWeight: "bold", fontSize: "11px", cursor: "pointer", marginTop: "10px" }}
              >
                ← Back to provider select
              </button>
            </div>
          )}

          {posStep === "success" && (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ background: "rgba(34, 197, 94, 0.15)", width: "56px", height: "56px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  <CheckCircle size={32} style={{ color: "#22c55e" }} />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: "#22c55e", letterSpacing: "1px" }}>
                  ✓ {effectivePayment === "card" ? "DEBIT AUTHORIZED & ESCROWED" : "CONFIRMED POS DEPOSIT COMPLETE"}
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                  Ref: TXN-ELX-{Math.floor(10000000 + Math.random() * 90000000)}
                </div>
              </div>

              <div style={{ background: "#111827", borderLeft: "4px solid #22c55e", padding: "12px", borderRadius: "8px", margin: "16px 0", fontSize: "11.5px", color: "#e2e8f0", lineHeight: "1.4" }}>
                <div style={{ fontWeight: "bold", color: "#22c55e", marginBottom: "4px", fontSize: "10px", display: "flex", justifyContent: "space-between", letterSpacing: "0.5px" }}>
                  <span>📬 TRANSACTION RECEIPT SMS</span>
                  <span>JUST NOW</span>
                </div>
                <div style={{ fontFamily: "sans-serif" }}>
                  Payment of <strong>₵{Math.round(total)}.00</strong> has been completed successfully via {effectivePayment === "card" ? `Bank Card ending in ${cardNumber.slice(-4) || "XXXX"}` : momoProvider === "mtn" ? "MTN MoMo" : "Telecel Cash"}. <br />
                  <div style={{ marginTop: "6px", borderTop: "1px solid #1f2937", paddingTop: "6px" }}>
                    • <strong>Ordered Items:</strong> {itemsSummary}<br />
                    • <strong>Escrow Protected:</strong> ₵{Math.round(total)}.00 securely logged and pending recipient confirmation.
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)", padding: "10px", borderRadius: "8px", fontSize: "10.5px", color: "#a7f3d0", marginBottom: "16px", lineHeight: "1.4" }}>
                🛡️ Your money is 100% money-back protected under safe transit guarantees inside the platform commission node.
              </div>

              <button
                type="button"
                onClick={handleConfirmPaymentAndContinue}
                style={{ width: "100%", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "white", borderRadius: "10px", padding: "14px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                ✅ Finalize Order & Run Tracking
              </button>
            </div>
          )}

          {showUssdPopup && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              backdropFilter: "blur(4px)"
            }}>
              <div style={{
                background: "#f3f4f6",
                color: "#1f2937",
                width: "100%",
                maxWidth: "340px",
                borderRadius: "16px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                overflow: "hidden",
                border: "1px solid #d1d5db"
              }}>
                <div style={{
                  background: momoProvider === "mtn" ? "#facc15" : "#ef4444",
                  color: momoProvider === "mtn" ? "#1e293b" : "#ffffff",
                  padding: "14px 16px",
                  fontWeight: "900",
                  fontSize: "13px",
                  letterSpacing: "0.5px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span>{momoProvider === "mtn" ? "🟡 MTN MoMo" : "🔴 Telecel Cash"}</span>
                  <span style={{ fontSize: "10px", background: "rgba(0,0,0,0.12)", padding: "2px 6px", borderRadius: "4px" }}>SIM 1</span>
                </div>

                <div style={{ padding: "20px 16px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}>
                    Authorize Transaction
                  </div>
                  <p style={{ fontSize: "13px", color: "#374151", margin: 0, lineHeight: "1.4" }}>
                    Enter MoMo PIN to pay GHS <strong>₵{Math.round(total)}.00</strong> to <strong>ELEXTRA COMMERCE</strong>.
                  </p>

                  <input
                    type="password"
                    placeholder="••••"
                    maxLength={4}
                    value={ussdPin}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setUssdPin(val);
                    }}
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "1.5px solid #9ca3af",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "#111827",
                      fontSize: "20px",
                      textAlign: "center",
                      fontFamily: "monospace",
                      letterSpacing: "8px",
                      outline: "none",
                      marginTop: "16px",
                      marginBottom: "6px"
                    }}
                    autoFocus
                  />
                  
                  <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center", marginTop: "4px" }}>
                    🔐 PIN is securely simulated and never saved.
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  borderTop: "1px solid #e5e7eb",
                  background: "#f9fafb"
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUssdPopup(false);
                      setUssdPin("");
                      notify("Payment authorization canceled.", "err");
                    }}
                    style={{
                      flex: 1,
                      padding: "14px",
                      border: "none",
                      background: "transparent",
                      color: "#4b5563",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      borderRight: "1px solid #e5e7eb"
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled={ussdPin.length !== 4}
                    onClick={() => {
                      setShowUssdPopup(false);
                      setPosPin(ussdPin);
                      notify("PIN successfully entered and validated! Click Authorize to complete.", "ok");
                    }}
                    style={{
                      flex: 1,
                      padding: "14px",
                      border: "none",
                      background: "transparent",
                      color: ussdPin.length === 4 ? (momoProvider === "mtn" ? "#ca8a04" : "#dc2626") : "#9ca3af",
                      fontSize: "13px",
                      fontWeight: "bold",
                      cursor: ussdPin.length === 4 ? "pointer" : "default"
                    }}
                  >
                    SEND / APPROVE
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </Overlay>
    );
  }

  if (isProcessingOrderAnimation) {
    return (
      <Overlay onClose={() => {}} scrollable={false}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          textAlign: "center",
          minHeight: "350px",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          {/* Gorgeous Green Circular Spinner */}
          <div style={{
            position: "relative",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "6px solid #e2e8f0",
            borderTop: "6px solid #10b981",
            animation: "spin 1s linear infinite",
            marginBottom: "24px"
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          
          <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", margin: "0 0 8px" }}>
            Processing Your Order
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px", maxWidth: "260px" }}>
            Securing dispatch and escrow link. Please wait...
          </p>

          {/* Staggered process logs matching terminal simulation */}
          <div style={{
            background: "#f1f5f9",
            borderRadius: "12px",
            padding: "12px 16px",
            width: "100%",
            maxWidth: "320px",
            textAlign: "left",
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#334155",
            border: "1px solid #e2e8f0",
            maxHeight: "150px",
            overflowY: "auto"
          }}>
            {posLogs.map((log, i) => (
              <div key={i} style={{ marginBottom: "4px", color: i === posLogs.length - 1 ? "#10b981" : "#475569" }}>
                🔑 {log}
              </div>
            ))}
          </div>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} scrollable wide>
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "12px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", margin: 0 }}>🛒 Unified Checkout</h2>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>Minimalist Single-Page Order Placement Index</p>
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: "10.5px", fontWeight: "bold", color: "#166534" }}>Secure Node Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* LEFT COLUMN: Input Details & Basket (3 cols on md) */}
        <div className="md:col-span-3 space-y-4">
          
          {/* Section 1: Basket Review */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              📦 Basket Review ({cart.length} items)
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "190px", overflowY: "auto", paddingRight: "4px" }}>
              {cart.map(item => {
                const resolvedImg = getItemImage(item);
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9", gap: "12px" }}>
                    {resolvedImg ? (
                      <div style={{ width: "40px", height: "40px", borderRadius: "8px", overflow: "hidden", background: "#f1f5f9", flexShrink: 0 }}>
                        <img 
                          src={resolvedImg} 
                          alt={item.name} 
                          referrerPolicy="no-referrer"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: "28px", flexShrink: 0 }}>{item.img || "📦"}</span>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#1e293b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>₵{Math.round(item.price)} each • From {item.shop || "Partner Shop"}</div>
                    </div>

                    {/* Quantity Selector & Delete Button */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", height: "28px" }}>
                        <button 
                          type="button" 
                          onClick={() => updateQty(item.id, -1)} 
                          style={{ width: "24px", height: "100%", background: "#f8fafc", border: "none", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
                        >
                          -
                        </button>
                        <span style={{ padding: "0 8px", fontSize: "11px", fontWeight: "bold" }}>{item.qty}</span>
                        <button 
                          type="button" 
                          onClick={() => updateQty(item.id, 1)} 
                          style={{ width: "24px", height: "100%", background: "#f8fafc", border: "none", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFromCart(item.id)} 
                        style={{ border: "none", background: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Handover Mode & Delivery Logistics */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px" }}>
              🚚 Handover Mode & Logistics
            </h3>

            {/* Mode Selector Tab */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <button
                type="button"
                onClick={() => setFoodDeliveryMode("delivery")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: foodDeliveryMode === "delivery" ? "#FF5A1F" : "#cbd5e1",
                  background: foodDeliveryMode === "delivery" ? "#fff5f2" : "#fff",
                  color: foodDeliveryMode === "delivery" ? "#FF5A1F" : "#475569",
                  fontWeight: "bold",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                🏍️ Courier Delivery
              </button>
              <button
                type="button"
                onClick={() => setFoodDeliveryMode("pickup")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: foodDeliveryMode === "pickup" ? "#FF5A1F" : "#cbd5e1",
                  background: foodDeliveryMode === "pickup" ? "#fff5f2" : "#fff",
                  color: foodDeliveryMode === "pickup" ? "#FF5A1F" : "#475569",
                  fontWeight: "bold",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                🎒 Store Self-Pickup
              </button>
            </div>

            {foodDeliveryMode === "delivery" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Speed selection */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Courier Transport Level</label>
                  <select 
                    style={{ ...S.inp, padding: "8px", fontSize: "12px" }} 
                    value={delivery} 
                    onChange={e => setDelivery(e.target.value)}
                  >
                    <option value="standard">⚡ Standard Moto Dispatch (Fast & Insured)</option>
                    {heavyInCart && <option value="cargo">🛺 Heavy Load (Aboboya Cargo Carrier)</option>}
                  </select>
                </div>

                {/* Delivery Location Input with GPS sensor */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Delivery Hub Address / Landmark *</label>
                    <button
                      type="button"
                      onClick={handleGeolocate}
                      disabled={gpsStatus === "loading"}
                      style={{ border: "none", background: "none", color: "#FF5A1F", fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      📡 {gpsStatus === "loading" ? "Scanning..." : "Sync GPS Coordinates"}
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input 
                      style={{ ...S.inp, paddingRight: "40px" }} 
                      value={deliveryLocation} 
                      onChange={e => setDeliveryLocation(e.target.value)}
                      placeholder="e.g. Near Cyanide Roundabout, Tarkwa"
                    />
                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>📍</span>
                  </div>

                  {/* Preset Landmarks Helper */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                    {LANDMARKS.filter(l => l.hub.toLowerCase() === (cityFilter || "tarkwa")).map(l => (
                      <button
                        key={l.name}
                        type="button"
                        onClick={() => setDeliveryLocation(l.name)}
                        style={{ background: "#f1f5f9", border: "none", borderRadius: "12px", padding: "4px 10px", fontSize: "10px", color: "#475569", cursor: "pointer" }}
                      >
                        📍 {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "11px", color: "#166534" }}>
                ℹ️ <strong>Self-Pickup Selected:</strong> You will pick up your fresh order directly at <strong>{storeDetails.name}</strong>. No delivery fee or transport fee will be charged.
              </div>
            )}
          </div>

          {/* Section 3: Recipient & Security Setup */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px" }}>
              👤 Recipient Handover Clearance
            </h3>

            {/* Recipient self-toggle buttons */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => setRecipientIsSelf(true)}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: recipientIsSelf === true ? "#FF5A1F" : "#cbd5e1",
                  background: recipientIsSelf === true ? "#fff5f2" : "#fff",
                  color: recipientIsSelf === true ? "#FF5A1F" : "#475569",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Me (Self Reception)
              </button>
              <button
                type="button"
                onClick={() => setRecipientIsSelf(false)}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: recipientIsSelf === false ? "#FF5A1F" : "#cbd5e1",
                  background: recipientIsSelf === false ? "#fff5f2" : "#fff",
                  color: recipientIsSelf === false ? "#FF5A1F" : "#475569",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Send to Friend / Partner
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Recipient Name *</label>
                <input 
                  style={S.inp} 
                  value={recipientName} 
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="e.g. Ama"
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Handover Contact Phone *</label>
                <input 
                  style={S.inp} 
                  value={recipientPhone} 
                  onChange={e => setRecipientPhone(e.target.value)}
                  placeholder="e.g. 050..."
                />
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Security Handover Pin Code (Optional)</label>
              <input 
                style={S.inp} 
                value={recipientPin} 
                onChange={e => setRecipientPin(e.target.value)}
                placeholder="4-Digit code for courier validation"
                maxLength={4}
              />
            </div>
          </div>

          {/* Section 4: Payment Instrument Integration */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px" }}>
              💳 Payment Method Index
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => setPayment("momo")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: payment === "momo" ? "#FF5A1F" : "#cbd5e1",
                  background: payment === "momo" ? "#fff5f2" : "#fff",
                  color: payment === "momo" ? "#FF5A1F" : "#475569",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                📱 Mobile Money (MTN / Telecel)
              </button>
              <button
                type="button"
                onClick={() => setPayment("card")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: payment === "card" ? "#FF5A1F" : "#cbd5e1",
                  background: payment === "card" ? "#fff5f2" : "#fff",
                  color: payment === "card" ? "#FF5A1F" : "#475569",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                💳 Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPayment("cod")}
                style={{
                  gridColumn: "span 2",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: payment === "cod" ? "#FF5A1F" : "#cbd5e1",
                  background: payment === "cod" ? "#fff5f2" : "#fff",
                  color: payment === "cod" ? "#FF5A1F" : "#475569",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                💵 Cash on Delivery (COD)
              </button>
            </div>

            {payment === "momo" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Mobile Money Operator</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer" }}>
                      <input type="radio" checked={momoProvider === "mtn"} onChange={() => setMomoProvider("mtn")} /> MTN MoMo 🟡
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer" }}>
                      <input type="radio" checked={momoProvider === "telecel"} onChange={() => setMomoProvider("telecel")} /> Telecel Cash 🔴
                    </label>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Mobile Money Registered Number *</label>
                  <input 
                    style={S.inp} 
                    value={momoNumber} 
                    onChange={e => setMomoNumber(e.target.value)}
                    placeholder="e.g. 0244123456"
                  />
                </div>
              </div>
            )}

            {payment === "card" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Cardholder Name *</label>
                  <input style={S.inp} value={cardName} onChange={e => setCardName(e.target.value)} placeholder="e.g. Ama" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Card Number *</label>
                    <input style={S.inp} value={cardNumber} onChange={e => setCardNumber(formatCardNum(e.target.value))} placeholder="4111 2222 3333 4444" maxLength={19} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", display: "block", marginBottom: "4px" }}>Expiry (MM/YY) *</label>
                    <input style={S.inp} value={cardExpiry} onChange={e => setCardExpiry(formatCardExp(e.target.value))} placeholder="MM/YY" maxLength={5} />
                  </div>
                </div>
              </div>
            )}

            {payment === "cod" && (
              <div style={{ padding: "10px", background: "#fef9c3", border: "1px solid #fef08a", borderRadius: "8px", fontSize: "11px", color: "#713f12" }}>
                👍 <strong>Cash on Delivery:</strong> Please prepare exact change of <strong>₵{Math.round(total)}.00</strong> to pay our dispatch runner on handover clearance.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Ledger, Pricing, Distance Telemetry, Checkout Actions (2 cols on md) */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Section 5: Real-time Telemetry Block */}
          <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: "12px", padding: "16px", color: "#fff" }}>
            <h4 style={{ fontSize: "12.5px", fontWeight: "bold", color: "#21F1A8", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
              📡 Telemetry Delivery Estimate
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span style={{ opacity: 0.8 }}>Dispatch Point:</span>
                <span style={{ fontWeight: "bold", color: "#fbbf24" }}>{storeDetails.name}</span>
              </div>
              
              {foodDeliveryMode === "delivery" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ opacity: 0.8 }}>Direct Distance:</span>
                    <span style={{ fontWeight: "bold" }}>{realStoreToUserDistance.toFixed(1)} km</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                    <span style={{ opacity: 0.8 }}>Arrival Estimate:</span>
                    <span style={{ fontWeight: "black", color: "#21F1A8" }}>
                      {arrivalTimeRangeString} ({realTimeEstimateMinutes?.total} mins)
                    </span>
                  </div>
                </>
              )}

              {foodDeliveryMode === "pickup" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                  <span style={{ opacity: 0.8 }}>Ready for Pickup in:</span>
                  <span style={{ fontWeight: "black", color: "#21F1A8" }}>{realTimeEstimateMinutes?.min} mins</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Promo Coupons */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <label style={{ fontSize: "11.5px", fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "6px" }}>🏷️ Apply Promo Coupon</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                style={{ ...S.inp, flex: 1, padding: "6px 10px", fontSize: "12px" }}
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="ELEXTRA50, GOLD5"
              />
              <button
                type="button"
                onClick={applyCoupon}
                style={{ background: "#FF5A1F", color: "white", border: "none", borderRadius: "8px", padding: "0 14px", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer" }}
              >
                Apply
              </button>
            </div>
            {couponError && <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "6px", margin: 0 }}>⚠️ {couponError}</p>}
            {appliedCoupon && <p style={{ color: "#10b981", fontSize: "11px", marginTop: "6px", margin: 0 }}>✓ Promo "{appliedCoupon.code}" applied successfully!</p>}
          </div>

          {/* Section 7: Ledger & Accounting Panel */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <h3 style={{ fontSize: "13.5px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              💳 Consolidated Accounting Ledger
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Basket Subtotal:</span>
                <span style={{ fontWeight: "bold" }}>₵{Math.round(subtotal)}.00</span>
              </div>

              {foodDeliveryMode === "delivery" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Courier Speed Fee:</span>
                    <span>₵{Math.round(finalDelivFee)}.00</span>
                  </div>
                  {finalTransportFee > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Aboboya Heavy Cargo:</span>
                      <span>₵{Math.round(finalTransportFee)}.00</span>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>System Platform Fee:</span>
                <span>₵{Math.round(platformFee)}.00</span>
              </div>

              {payFee > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Secure Payment Fee:</span>
                  <span>₵{Math.round(payFee)}.00</span>
                </div>
              )}

              {totalDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981", fontWeight: "bold" }}>
                  <span>Coupon Discounts:</span>
                  <span>-₵{Math.round(totalDiscount)}.00</span>
                </div>
              )}

              {/* Terms and Conditions Acceptance */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "12px", borderTop: "1.5px solid #f1f5f9", paddingTop: "12px" }}>
                <input 
                  type="checkbox" 
                  id="checkout_tc_check" 
                  checked={localTc} 
                  onChange={e => setLocalTc(e.target.checked)}
                  style={{ marginTop: "3px", cursor: "pointer" }}
                />
                <label htmlFor="checkout_tc_check" style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.4", cursor: "pointer" }}>
                  I accept the Elextra Handover Charter. I acknowledge real-time GPS telemetry routing and active fleet coordination.
                </label>
              </div>

              {/* Total Row */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 900, borderTop: "1.5px solid #1e293b", paddingTop: "12px", marginTop: "4px", color: "#0f172a" }}>
                <span>Amount Due:</span>
                <span style={{ color: "#FF5A1F" }}>₵{Math.round(total)}.00</span>
              </div>
            </div>
          </div>

          {/* Place Order CTA Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            style={{
              width: "100%",
              background: "#FF5A1F",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(255,90,31,0.25)",
              transition: "transform 0.15s ease",
              textAlign: "center"
            }}
          >
            🚀 Place Order & Pay (₵{Math.round(total)}.00)
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── ORDER PLACED CONFIRMATION SCREEN ─────────────────────────────────────────
interface SuccessModalProps {
  order: Order | null;
  onClose: () => void;
}

export function SuccessModal({ order, onClose }: SuccessModalProps) {
  const [whatsappReceipts, setWhatsappReceipts] = useState<any[]>([]);
  const [configuredMomoLines, setConfiguredMomoLines] = useState({ mtn: "0246263123", telecel: "0503531153" });

  useEffect(() => {
    if (!order) return;
    (async () => {
      const logs = await DB.get("elx_whatsapp_logs") || [];
      const matched = logs.filter((l: any) => l.orderId === order.id);
      setWhatsappReceipts(matched);

      const storedMomo = await DB.get("elx_momo_lines");
      if (storedMomo && storedMomo.mtn && storedMomo.telecel) {
        setConfiguredMomoLines(storedMomo);
      }
    })();
  }, [order]);

  return (
    <Overlay onClose={onClose} scrollable>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <CheckCircle size={54} style={{ color: "#10b981", margin: "0 auto" }} />
        <div style={{ fontSize: "22px", fontWeight: 900, color: "#10b981", marginTop: "12px" }}>Dispatch Order Registered!</div>
        <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
          Reference Tracking ID: <strong style={{ color: "#2563eb" }}>{order?.id}</strong>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px", marginTop: "16px", border: "1px solid #e2e8f0" }}>
          <FeeRow l="Subtotal" v={`₵${Math.round(order?.subtotal || 0)}`} />
          <FeeRow l="Platform fee" v={`₵${Math.round(order?.platformFee || 0)}`} />
          <FeeRow l="Rider fee" v={`₵${Math.round(order?.delivFee || 0)}`} />
          {(order?.transportFee || 0) > 0 && <FeeRow l="Heavy Surcharge" v={`₵${Math.round(order?.transportFee || 0)}`} warn />}
          {(order?.payFee || 0) > 0 && <FeeRow l="Gateway charge" v={`₵${Math.round(order?.payFee || 0)}`} />}
          <div style={{ borderTop: "1.5px solid #cbd5e1", marginTop: "6px", paddingTop: "6px", display: "flex", justifySelf: "stretch", justifyContent: "space-between", fontWeight: 900, color: "#0f172a" }}>
            <span>Disbursed Total</span>
            <span style={{ color: "#dc2626" }}>₵{Math.round(order?.total || 0)}</span>
          </div>
        </div>

        {order?.delivery === "pickup" ? (
          <div style={{ marginTop: "10px", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", color: "#1e40af", textAlign: "left" }}>
            🛍️ <strong>Self Pick-up Selected:</strong> Please collect your order directly from the restaurant.
          </div>
        ) : order?.deliveryLocation ? (
          <div style={{ marginTop: "10px", background: "#fffbeb", border: "1px solid #fef3c7", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", color: "#b45309", textAlign: "left" }}>
            📍 <strong>Deliver Spot Ordered:</strong> {order.deliveryLocation}
          </div>
        ) : null}

        {order?.estimatedTimeRange && (
          <div style={{ marginTop: "10px", background: "#f0f9ff", border: "1.5px solid #bae6fd", padding: "8px 10px", borderRadius: "8px", fontSize: "11px", color: "#0369a1", textAlign: "left" }}>
            ⏱️ <strong>Estimated Arrival Window:</strong> {order.estimatedTimeRange} {order.estimatedMinutes ? `(~${order.estimatedMinutes} mins)` : ""}
          </div>
        )}

        {/* Dynamic WhatsApp Integration Feedback */}
        {whatsappReceipts.length > 0 && (
          <div style={{ marginTop: "10px", border: "1px solid #86efac", background: "#f0fdf4", borderRadius: "8px", padding: "10px", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid #bbf7d0", paddingBottom: "4px", marginBottom: "6px" }}>
              <span style={{ fontSize: "14px" }}>💬</span>
              <strong style={{ fontSize: "11.5px", color: "#166534" }}>WhatsApp Seller Alerts Transmitted</strong>
            </div>
            <p style={{ fontSize: "10px", color: "#14532d", margin: "0 0 6px 0", lineHeight: "1.3" }}>
              Receipt was auto-transmitted to the active food seller lines configured by the system:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {whatsappReceipts.map((receipt) => (
                <div key={receipt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bbf7d0", fontSize: "10.5px" }}>
                  <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: "700", color: "#166534" }}>{receipt.recipientName}</span>
                    <span style={{ color: "#475569", marginLeft: "4px", fontFamily: "monospace", fontSize: "9.5px" }}>({receipt.phone})</span>
                  </div>
                  <a
                    href={`https://wa.me/${receipt.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(receipt.messageText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#25d366",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center"
                    }}
                  >
                    Chat ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Admin Contact Instructions */}
        <div style={{ marginTop: "10px", background: "#eff6ff", border: "1.5px solid #bfdbfe", padding: "10px 12px", borderRadius: "8px", fontSize: "11px", color: "#1e3a8a", textAlign: "left" }}>
          💳 <strong>Official Payment Verification:</strong>
          <p style={{ margin: "4px 0 6px", lineHeight: "1.4" }}>
            Your dispatch run has been registered in the system (Ref: {order?.id}). An official <strong>Elextra Logistics</strong> administrator will contact you shortly via phone or WhatsApp to verify and secure payment.
          </p>
          <div style={{ borderTop: "1px dashed #bfdbfe", paddingTop: "6px", fontSize: "10.5px" }}>
            📱 <strong>Admin Payment Lines:</strong>
            <ul style={{ margin: "2px 0 0 14px", padding: 0 }}>
              <li>MTN Mobile Money: <strong>{configuredMomoLines.mtn}</strong></li>
              <li>Telecel Cash: <strong>{configuredMomoLines.telecel}</strong></li>
            </ul>
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", fontStyle: "italic" }}>
              ⚠️ Official numbers are strictly provided only by the main admin. Do not pay to any other lines.
            </div>
          </div>
        </div>

        {order?.driver && (
          <div style={{ marginTop: "14px", fontSize: "13px", color: "#475569" }}>
            🏍️ Courier <strong>{order.driver.name}</strong> is associated with this run.<br />
            Estimated arrival to collection: <strong>{order.driver.eta} mins</strong>
          </div>
        )}

        <button style={{ ...S.cta, width: "100%", marginTop: "16px" }} onClick={onClose}>
          Begin Live Map Tracker 📍
        </button>
      </div>
    </Overlay>
  );
}

function AlertTriangleIcon() {
  return (
    <span style={{ fontSize: "16px", color: "#d97706" }}>⚠️</span>
  );
}

interface ProposeEditModalProps {
  p: Product;
  onClose: () => void;
  user: User | null;
  notify: (msg: string, type?: "ok" | "err") => void;
}

export function ProposeEditModal({ p, onClose, user, notify }: ProposeEditModalProps) {
  const [name, setName] = useState(p.name);
  const [price, setPrice] = useState(String(p.price));
  const [cat, setCat] = useState(p.cat || "");
  const [tag, setTag] = useState(p.tag || "");
  const [unit, setUnit] = useState(p.unit || "");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !price) {
      notify("Name and Price are required.", "err");
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      notify("Please enter a valid positive price.", "err");
      return;
    }

    setLoading(true);
    try {
      const proposal = {
        id: "PROP-" + Math.floor(100000 + Math.random() * 900000),
        type: "catalog_edit" as const,
        submittedBy: user?.name ? `${user.name} (${user.email || user.role || "staff"})` : "Partner / Seller Portal",
        date: new Date().toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + " " + new Date().toLocaleTimeString(),
        status: "pending" as const,
        details: {
          productId: p.id,
          original: {
            name: p.name,
            price: p.price,
            cat: p.cat || "",
            tag: p.tag || "",
            unit: p.unit || ""
          },
          proposed: {
            name,
            price: numPrice,
            cat,
            tag,
            unit
          }
        }
      };

      // If proposer is the primary admin, apply instantly!
      const isAdmin = (user?.email || "").toLowerCase().trim() === "enyam66@gmail.com";
      if (isAdmin) {
        // Direct apply to the DB key
        const catKey = p.id.startsWith("g") ? "elx_grocery_items" : p.id.startsWith("e") ? "elx_electronics_items" : "elx_construction_items";
        const items = await DB.get(catKey) || [];
        const updated = items.map((item: any) => {
          if (item.id === p.id) {
            return { ...item, name, price: numPrice, cat, tag, unit };
          }
          return item;
        });
        await DB.set(catKey, updated);
        window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: catKey, value: updated } }));
        notify(`Catalog updated instantly! ${p.name} updated. ✏️`, "ok");
      } else {
        // Queue as pending proposal
        const existingApprovals = await DB.get("elx_pending_approvals") || [];
        const updatedApprovals = [proposal, ...existingApprovals];
        await DB.set("elx_pending_approvals", updatedApprovals);
        // Sync real-time
        window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key: "elx_pending_approvals", value: updatedApprovals } }));
        notify("Edit proposal submitted successfully! Pending Primary Admin review. 📝", "ok");
      }
      onClose();
    } catch (err) {
      notify("Failed to save edit proposal.", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "36px" }}>✏️</div>
        <div style={{ fontSize: "18px", fontWeight: 900, marginTop: "6px", color: "#0f172a" }}>Propose Catalog Edit</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
          Suggested edits are placed into an approval queue and only visible upon Primary Admin authorization.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Product Name</label>
          <input style={S.inp} value={name} onChange={e => setName(e.target.value)} placeholder="Product Name" />
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Price (₵)</label>
          <input style={S.inp} type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price in GHS" />
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Category</label>
          <input style={S.inp} value={cat} onChange={e => setCat(e.target.value)} placeholder="e.g. Staples, Vegetables" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Tag / Promo Label</label>
            <input style={S.inp} value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. Flash Deal, Hot" />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "bold", color: "#475569" }}>Unit of Measurement</label>
            <input style={S.inp} value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. Sack, Kilogram, Pack" />
          </div>
        </div>

        <button 
          style={{ ...S.cta, width: "100%", marginTop: "16px", background: "linear-gradient(135deg, #ea580c, #c2410c)" }} 
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Submitting Proposal..." : "Submit Proposal for Approval 🚀"}
        </button>
      </div>
    </Overlay>
  );
}

