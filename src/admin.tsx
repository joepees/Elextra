/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { AdminPage, DispatchJob } from "./components/AdminPage";
import { Order, User, Notif } from "./types";
import { DB } from "./db";
import { S } from "./styles";
import "./index.css";
import { Shield, Key, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

const SEED_STAFF_ACCOUNTS = [
  {
    id: "STAFF-001",
    email: "enyam66@gmail.com",
    phone: "0241111111",
    name: "Enyam Admin (Me)",
    role: "primary_admin",
    password: "Coded6123@",
    approved: true,
    status: "active"
  },
  {
    id: "STAFF-002",
    email: "subadmin@elextra.com",
    phone: "0242222222",
    name: "Limited Operator Admin",
    role: "sub_admin",
    password: "Subpass123",
    approved: true,
    status: "active"
  },
  {
    id: "STAFF-003",
    email: "manager@elextra.com",
    phone: "0243333333",
    name: "Fleet & App Manager",
    role: "manager",
    password: "Manager123",
    approved: true,
    status: "active"
  },
  {
    id: "STAFF-004",
    email: "rider@elextra.com",
    phone: "0244444444",
    name: "Kofi Rider",
    role: "rider",
    password: "Rider123",
    approved: true,
    status: "active",
    plateNumber: "GW-1234-26",
    vehicleType: "Motorcycle",
    earnings: 0,
    completedJobsCount: 0
  },
  {
    id: "STAFF-005",
    email: "seller@elextra.com",
    phone: "0245555555",
    name: "Tarkwa Joint Seller",
    role: "seller",
    password: "Seller123",
    approved: true,
    status: "active",
    shopId: "provisions",
    shopName: "Tarkwa Central Provisions"
  },
  {
    id: "STAFF-006",
    email: "abena@elextra.com",
    phone: "0246666666",
    name: "Mama Abena Seller",
    role: "seller",
    password: "Abena123",
    approved: true,
    status: "active",
    shopId: "f_abena",
    shopName: "Mama Abena's Local Food Joint"
  },
  {
    id: "STAFF-007",
    email: "efua@elextra.com",
    phone: "0247777777",
    name: "Auntie Efua Seller",
    role: "seller",
    password: "Efua123",
    approved: true,
    status: "active",
    shopId: "f1",
    shopName: "Auntie Efua's Fast Food"
  },
  {
    id: "STAFF-008",
    email: "golden@elextra.com",
    phone: "0248888888",
    name: "Golden Fork Seller",
    role: "seller",
    password: "Golden123",
    approved: true,
    status: "active",
    shopId: "f2",
    shopName: "Golden Fork Restaurant"
  }
];

function AdminRoot() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dispatchJobs, setDispatchJobs] = useState<DispatchJob[]>([]);
  const [user, setUser] = useState<any | null>(null);
  const [notif, setNotif] = useState<Notif | null>(null);
  const lastSyncedStateRef = useRef<Record<string, string>>({});

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Load persistent records on mount
  useEffect(() => {
    const initAndLoadRecords = async () => {
      // 1. Load logged staff first (non-sensitive check)
      const loggedStaff = await DB.get("elx_logged_staff");
      if (loggedStaff) {
        setUser(loggedStaff);
        
        // 2. Load and seed staff accounts securely only when logged in
        let existingStaff = await DB.get("elx_staff_accounts");
        if (!existingStaff || existingStaff.length === 0) {
          await DB.set("elx_staff_accounts", SEED_STAFF_ACCOUNTS);
          existingStaff = SEED_STAFF_ACCOUNTS;
        } else {
          // If the old mock earnings of 140 exist for STAFF-004, reset them to 0 as requested
          let migrated = false;
          const updated = existingStaff.map((s: any) => {
            if (s.id === "STAFF-004" && s.earnings === 140) {
              migrated = true;
              return { ...s, earnings: 0, completedJobsCount: 0 };
            }
            return s;
          });
          if (migrated) {
            await DB.set("elx_staff_accounts", updated);
          }
        }

        // 3. Load other sensitive staff keys
        const o = await DB.get("elx_orders") || [];
        setOrders(o);
      }

      // 4. Load non-sensitive keys
      const d = await DB.get("elx_dispatch") || [];
      setDispatchJobs(d);
    };

    initAndLoadRecords();

    // Custom Sync Event listener for real-time local updates
    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_orders") {
        setOrders(value || []);
      } else if (key === "elx_dispatch") {
        setDispatchJobs(value || []);
      } else if (key === "elx_logged_staff") {
        setUser(value);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);

    // Background polling sync for shared DB key-values (enables real-time cross-tab updates)
    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/db/sync");
        if (res.ok) {
          const data = await res.json();
          Object.entries(data).forEach(([key, value]) => {
            const stringified = JSON.stringify(value);
            if (lastSyncedStateRef.current[key] !== stringified) {
              lastSyncedStateRef.current[key] = stringified;
              window.dispatchEvent(new CustomEvent("elx_db_sync", { detail: { key, value } }));
            }
          });
        }
      } catch (err) {
        console.warn("[admin.tsx] Shared DB polling failed:", err);
      }
    }, 1500);

    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
      clearInterval(syncInterval);
    };
  }, []);

  const notify = (msg: string, type: "ok" | "err" = "ok") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3200);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter both email address and password code.");
      return;
    }

    setLoginLoading(true);
    try {
      const response = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store in DB and state
        const staffObj = { ...data.staff, password: loginPassword };
        await DB.set("elx_logged_staff", staffObj);
        setUser(staffObj);
        notify(`Welcome to the command node, ${data.staff.name}!`, "ok");
      } else {
        setLoginError(data.error || "Invalid staff email credentials or passcode.");
      }
    } catch (err) {
      setLoginError("An error occurred during staff node authentication.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await DB.set("elx_logged_staff", null);
    setUser(null);
    notify("Secure logout complete. Returning to main portal...", "ok");
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "primary_admin": return "PRIMARY ADMIN (OWNER)";
      case "sub_admin": return "LIMITED CO-ADMIN";
      case "manager": return "FLEET & APP MANAGER";
      case "rider": return "DISPATCH RIDER CONTROL";
      case "seller": return "VERIFIED PARTNER SELLER";
      default: return "STAFF DEPLOYEE";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "primary_admin": return "#ef4444";
      case "sub_admin": return "#f97316";
      case "manager": return "#3b82f6";
      case "rider": return "#10b981";
      case "seller": return "#ec4899";
      default: return "#64748b";
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
      {/* Toast notifications */}
      {notif && (
        <div style={{ ...S.notif, background: notif.type === "ok" ? "#10b981" : "#dc2626", zIndex: 9999 }}>
          {notif.type === "ok" ? "✔ " : "⚠️ "} {notif.msg}
        </div>
      )}

      {/* LOGIN TERMINAL FOR UNAUTHENTICATED USERS */}
      {!user ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "16px" }}>
          <div style={{ background: "#111827", border: "2px solid #1e293b", borderRadius: "16px", width: "100%", maxWidth: "420px", padding: "28px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}>
            
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", width: "54px", height: "54px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Shield size={28} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "white", letterSpacing: "0.5px" }}>ELEXTRA COMMAND NODE</h2>
              <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Authorized Staff & Operator Security Gateway</p>
            </div>

            {loginError && (
              <div style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px 12px", fontSize: "11.5px", color: "#fca5a5", marginBottom: "16px", fontWeight: "bold" }}>
                ⚠️ {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Staff Account Email Address or Phone Number</label>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    placeholder="e.g. 0244444444 or kofi@elextra.com" 
                    style={{ ...S.inp, background: "#1f2937", border: "1.5px solid #374151", color: "white", paddingLeft: "12px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Secret Node Access Passcode</label>
                <div style={{ position: "relative" }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)} 
                    placeholder="••••••••" 
                    style={{ ...S.inp, background: "#1f2937", border: "1.5px solid #374151", color: "white", paddingRight: "40px" }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loginLoading}
                style={{ ...S.cta, width: "100%", marginTop: "10px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {loginLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Authenticating Node Security...
                  </>
                ) : (
                  <>
                    Authenticating Terminal <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>



          </div>
        </div>
      ) : (
        /* LOGGED IN TERMINAL */
        <>
          <header style={{ background: "#111827", borderBottom: "1.5px solid #1f2937", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img 
                src="https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg" 
                alt="ELEXTRA" 
                style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover" }} 
              />
              <div>
                <span style={{ fontWeight: 900, fontSize: "16px", color: "white", letterSpacing: "1px" }}>ELEXTRA CONTROL NODE</span>
                <span style={{ marginLeft: "10px", padding: "3px 8px", background: getRoleColor(user.role), color: "white", fontSize: "10px", fontWeight: "bold", borderRadius: "12px" }}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ color: "#f1f5f9", fontWeight: "bold" }}>{user.name}</span>
                <span style={{ fontSize: "10px", color: getRoleColor(user.role) }}>{user.email}</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                🔒 Log Out
              </button>
            </div>
          </header>

          <main style={{ padding: "0" }}>
            <AdminPage 
              orders={orders} 
              setOrders={setOrders} 
              dispatchJobs={dispatchJobs} 
              setDispatchJobs={setDispatchJobs} 
              user={user} 
              notify={notify} 
            />
          </main>
        </>
      )}
    </div>
  );
}

// Render root element
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <AdminRoot />
    </React.StrictMode>
  );
}
